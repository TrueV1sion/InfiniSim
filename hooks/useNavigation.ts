import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { ModelTier, WebPage, HistoryItem } from '../types';
import {
  generatePageContentStream,
  processAiImages,
  cleanHtml,
  PRELOADED_SCRIPTS,
  MINIMAL_BRIDGE_SCRIPT,
  NavigationContext,
} from '../services/geminiService';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { parseGeminiError, categorizeError, ErrorCategory } from '../utils/errorParser';
import { pruneVirtualState } from '../utils/statePruner';
import { getCachedPage, setCachedPage, generateCacheKey } from '../services/cacheService';
import { resolveUrl, isSameSite, parseQueryParams } from '../utils/urlUtils';
import { LOADING_MESSAGES, MAX_BREADCRUMB_LENGTH, MAX_PAGE_CACHE_SIZE } from '../utils/constants';

interface BreadcrumbEntry {
  url: string;
  title: string;
}

interface ImageProgress {
  completed: number;
  total: number;
}

interface UseNavigationResult {
  currentUrl: string;
  loading: boolean;
  loadingProgress: number;
  loadingMsgIdx: number;
  pageData: WebPage | null;
  imageProgress: ImageProgress | null;
  setPageData: Dispatch<SetStateAction<WebPage | null>>;
  navigateTo: (url: string, isHistoryNav?: boolean, incomingState?: any) => Promise<void>;
  handleBack: () => void;
  handleForward: () => void;
  handleStop: () => void;
  handleReload: () => void;
  handleHome: () => void;
  handleIframeNavigate: (targetUrl: string, state?: any) => void;
  handleStateUpdate: (state: any) => void;
}

interface NavigationDeps {
  history: HistoryItem[];
  setHistory: Dispatch<SetStateAction<HistoryItem[]>>;
  historyIndex: number;
  setHistoryIndex: Dispatch<SetStateAction<number>>;
  model: ModelTier;
  deepResearch: boolean;
  virtualState: any;
  setVirtualState: Dispatch<SetStateAction<any>>;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar';
  soundEnabled: boolean;
  userId?: string;
  onError: (category: ErrorCategory, displayMessage: string, url: string) => void;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractSiteIdentity(html: string, url: string): Record<string, string> {
  const identity: Record<string, string> = {};

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    const raw = titleMatch[1].trim();
    const cleaned = raw.split(/\s*[|\-–—]\s*/)[0].trim();
    if (cleaned && cleaned.length < 60) {
      identity.brandName = cleaned;
    }
  }

  const navText = html.match(/<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/i);
  if (navText) {
    const logoText = navText[1].match(/<(?:a|span|div|h1|h2|p)[^>]*class="[^"]*(?:logo|brand|site-name)[^"]*"[^>]*>([\s\S]*?)<\/(?:a|span|div|h1|h2|p)>/i);
    if (logoText) {
      const txt = logoText[1].replace(/<[^>]+>/g, '').trim();
      if (txt && txt.length < 40) {
        identity.brandName = txt;
      }
    }
  }

  const bgColorMatch = html.match(/(?:bg-|background[-:])\s*(?:#[0-9a-fA-F]{3,8}|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))/i);
  if (bgColorMatch) {
    identity.colorScheme = bgColorMatch[0];
  }

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    identity.domain = parsed.hostname;
  } catch {}

  return identity;
}

function storeInPageCache(cache: Map<string, WebPage>, url: string, page: WebPage) {
  cache.delete(url);
  cache.set(url, page);
  if (cache.size > MAX_PAGE_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function useNavigation(deps: NavigationDeps): UseNavigationResult {
  const {
    history, setHistory, historyIndex, setHistoryIndex,
    model, deepResearch, virtualState, setVirtualState,
    deviceType, soundEnabled, userId, onError,
  } = deps;

  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      return history[historyIndex].url;
    }
    return '';
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return historyIndex >= 0 && !!history[historyIndex];
  });

  const [pageData, setPageData] = useState<WebPage | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [imageProgress, setImageProgress] = useState<ImageProgress | null>(null);
  const currentRequestRef = useRef<number>(0);
  const hasResumed = useRef(false);
  const breadcrumbRef = useRef<BreadcrumbEntry[]>([]);
  const previousUrlRef = useRef<string>('');
  const pageCache = useRef<Map<string, WebPage>>(new Map());

  const navigateTo = useCallback(async (url: string, isHistoryNav = false, incomingState?: any) => {
    const requestId = Date.now();
    currentRequestRef.current = requestId;

    const referrerUrl = previousUrlRef.current;
    previousUrlRef.current = url;

    setLoading(true);
    setLoadingProgress(0);
    setImageProgress(null);
    setCurrentUrl(url);

    const stateToUse = incomingState || virtualState;
    if (incomingState) {
      setVirtualState(pruneVirtualState(incomingState));
    }

    if (!isHistoryNav) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ url, timestamp: Date.now() });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    const navContext: NavigationContext = {};

    if (referrerUrl) {
      navContext.referrerUrl = referrerUrl;

      if (isSameSite(referrerUrl, url)) {
        const vs = stateToUse || {};
        if (vs.__site_identity) {
          navContext.siteIdentity = vs.__site_identity;
        }
      }
    }

    if (breadcrumbRef.current.length > 0) {
      navContext.breadcrumb = [...breadcrumbRef.current];
    }

    const qp = parseQueryParams(url);
    if (Object.keys(qp).length > 0) {
      navContext.queryParams = qp;
    }

    try {
      if (url === 'infinite://directory') {
        const q = query(collection(db, 'published_sites'), orderBy('publishedAt', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const sites = querySnapshot.docs.map(d => d.data());

        const directoryHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <script src="https://cdn.tailwindcss.com"><\/script>
            <title>Infinite Directory</title>
          </head>
          <body class="bg-[#050505] text-white min-h-screen p-10 font-sans">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">Infinite Directory</h1>
              <p class="text-gray-400 mb-10">Explore the simulated web created by the community.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${sites.map(site => `
                  <div class="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group" onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${site.url}' }, '*')">
                    <h2 class="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">${site.title}</h2>
                    <p class="text-sm text-gray-500 font-mono mb-4">${site.url}</p>
                    <div class="flex items-center justify-between text-xs text-gray-400">
                      <span>By ${site.publisherName}</span>
                      <span>${new Date(site.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                `).join('')}
                ${sites.length === 0 ? '<p class="text-gray-500">No sites published yet. Be the first!</p>' : ''}
              </div>
            </div>
          </body>
          </html>
        `;

        if (currentRequestRef.current === requestId) {
          const dirPage: WebPage = {
            url,
            content: cleanHtml(directoryHtml),
            title: 'Infinite Directory',
            isLoading: false,
            generatedBy: model,
          };
          setPageData(dirPage);
          storeInPageCache(pageCache.current, url, dirPage);
        }
        return;
      }

      if (!deepResearch) {
        const cacheKey = generateCacheKey(url, model);
        const cached = await getCachedPage(cacheKey);
        if (cached && currentRequestRef.current === requestId) {
          const cachedTitle = extractTitle(cached) || url;
          const cachedPage: WebPage = {
            url,
            content: cached,
            title: cachedTitle,
            isLoading: false,
            generatedBy: model,
          };
          setPageData(cachedPage);
          storeInPageCache(pageCache.current, url, cachedPage);

          const cachedIdentity = extractSiteIdentity(cached, url);
          if (Object.keys(cachedIdentity).length > 0) {
            setVirtualState((prev: any) => ({
              ...prev,
              __site_identity: cachedIdentity,
            }));
          }

          breadcrumbRef.current = [
            ...breadcrumbRef.current,
            { url, title: cachedTitle },
          ].slice(-MAX_BREADCRUMB_LENGTH);

          return;
        }
      }

      const prunedState = pruneVirtualState(stateToUse);
      const stream = generatePageContentStream(
        url, model, deepResearch, prunedState, deviceType, soundEnabled, userId, navContext
      );

      let accumulatedHtml = '';
      let streamTitle: string | null = null;

      for await (const chunk of stream) {
        if (currentRequestRef.current !== requestId) break;
        accumulatedHtml += chunk;

        if (!streamTitle) {
          streamTitle = extractTitle(accumulatedHtml);
        }

        let displayHtml = accumulatedHtml.replace(/^\s*```html\n?/i, '');
        if (!displayHtml.includes('cdn.tailwindcss.com')) {
          displayHtml = PRELOADED_SCRIPTS + '\n' + displayHtml;
        }
        if (!displayHtml.includes('__infiniteWebBridge')) {
          displayHtml = MINIMAL_BRIDGE_SCRIPT + '\n' + displayHtml;
        }

        setPageData({
          url,
          content: displayHtml,
          title: streamTitle || url,
          isLoading: true,
          generatedBy: model,
        });
      }

      if (currentRequestRef.current === requestId) {
        const cleanedHtml = cleanHtml(accumulatedHtml);
        const finalTitle = extractTitle(cleanedHtml) || streamTitle || url;

        setImageProgress({ completed: 0, total: 0 });
        const finalHtml = await processAiImages(cleanedHtml, (completed, total) => {
          if (currentRequestRef.current === requestId) {
            setImageProgress({ completed, total });
          }
        });
        setImageProgress(null);

        const finishedPage: WebPage = {
          url,
          content: finalHtml,
          title: finalTitle,
          isLoading: false,
          generatedBy: model,
        };
        setPageData(finishedPage);
        storeInPageCache(pageCache.current, url, finishedPage);

        const identity = extractSiteIdentity(finalHtml, url);
        if (Object.keys(identity).length > 0) {
          setVirtualState((prev: any) => ({
            ...prev,
            __site_identity: identity,
          }));
        }

        breadcrumbRef.current = [
          ...breadcrumbRef.current,
          { url, title: finalTitle },
        ].slice(-MAX_BREADCRUMB_LENGTH);

        if (!deepResearch) {
          const cacheKey = generateCacheKey(url, model);
          setCachedPage(cacheKey, url, model, finalHtml).catch(() => {});
        }
      }
    } catch (err) {
      if (currentRequestRef.current === requestId) {
        console.error(err);
        const displayMessage = parseGeminiError(err);
        const category = categorizeError(displayMessage);
        onError(category, displayMessage, url);
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setLoadingProgress(100);
        setTimeout(() => {
          if (currentRequestRef.current === requestId) {
            setLoading(false);
            setLoadingProgress(0);
          }
        }, 300);
      }
    }
  }, [history, historyIndex, model, deepResearch, virtualState, deviceType, soundEnabled, userId, onError, setHistory, setHistoryIndex, setVirtualState]);

  useEffect(() => {
    if (!hasResumed.current && currentUrl && !pageData) {
      hasResumed.current = true;
      navigateTo(currentUrl, true);
    } else if (!currentUrl && loading) {
      setLoading(false);
    }
  }, [currentUrl, navigateTo, pageData, loading]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let progressInterval: ReturnType<typeof setInterval>;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);

      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return Math.min(90, prev + Math.random() * 15);
        });
      }, 500);
    }
    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  const restoreFromCache = useCallback((url: string) => {
    const cached = pageCache.current.get(url);
    if (cached) {
      pageCache.current.delete(url);
      pageCache.current.set(url, cached);
      currentRequestRef.current = 0;
      setLoading(false);
      setLoadingProgress(0);
      setCurrentUrl(url);
      setPageData(cached);
      previousUrlRef.current = url;
      return true;
    }
    return false;
  }, []);

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetUrl = history[newIndex].url;
      setHistoryIndex(newIndex);
      if (!restoreFromCache(targetUrl)) {
        navigateTo(targetUrl, true);
      }
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const targetUrl = history[newIndex].url;
      setHistoryIndex(newIndex);
      if (!restoreFromCache(targetUrl)) {
        navigateTo(targetUrl, true);
      }
    }
  };

  const handleStop = () => {
    currentRequestRef.current = 0;
    setLoading(false);
    setLoadingProgress(0);
  };

  const handleReload = () => {
    if (currentUrl) {
      navigateTo(currentUrl, true);
    }
  };

  const handleHome = () => {
    currentRequestRef.current = 0;
    setLoading(false);
    setLoadingProgress(0);
    setCurrentUrl('');
    setPageData(null);
    breadcrumbRef.current = [];
    pageCache.current.clear();
  };

  const handleIframeNavigate = (targetUrl: string, state?: any) => {
    const resolved = resolveUrl(targetUrl, currentUrl);
    if (!resolved) return;
    navigateTo(resolved, false, state);
  };

  const handleStateUpdate = (state: any) => {
    setVirtualState(pruneVirtualState(state));
  };

  return {
    currentUrl,
    loading,
    loadingProgress,
    loadingMsgIdx,
    pageData,
    imageProgress,
    setPageData,
    navigateTo,
    handleBack,
    handleForward,
    handleStop,
    handleReload,
    handleHome,
    handleIframeNavigate,
    handleStateUpdate,
  };
}
