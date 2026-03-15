import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { ModelTier, WebPage, HistoryItem } from '../types';
import { generatePageContentStream, processAiImages, cleanHtml, PRELOADED_SCRIPTS } from '../services/geminiService';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { parseGeminiError, categorizeError, ErrorCategory } from '../utils/errorParser';
import { pruneVirtualState } from '../utils/statePruner';
import { getCachedPage, setCachedPage, generateCacheKey } from '../services/cacheService';

const LOADING_MESSAGES = [
  'Synthesizing latent reality...',
  'Injecting architectural logic...',
  'Synchronizing interactive nodes...',
  'Simulating physics engine...',
  'Polishing creative facets...',
  'Deep Researching context...',
];

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

  const navigateTo = useCallback(async (url: string, isHistoryNav = false, incomingState?: any) => {
    const requestId = Date.now();
    currentRequestRef.current = requestId;

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
          setPageData({
            url,
            content: cleanHtml(directoryHtml),
            title: 'Infinite Directory',
            isLoading: false,
            generatedBy: model,
          });
        }
        return;
      }

      if (!deepResearch) {
        const cacheKey = generateCacheKey(url, model);
        const cached = await getCachedPage(cacheKey);
        if (cached && currentRequestRef.current === requestId) {
          setPageData({
            url,
            content: cached,
            title: url,
            isLoading: false,
            generatedBy: model,
          });
          return;
        }
      }

      const prunedState = pruneVirtualState(stateToUse);
      const stream = await generatePageContentStream(url, model, deepResearch, prunedState, deviceType, soundEnabled, userId);

      let accumulatedHtml = '';
      for await (const chunk of stream) {
        if (currentRequestRef.current !== requestId) break;
        accumulatedHtml += chunk;

        let displayHtml = accumulatedHtml.replace(/^\s*```html\n?/i, '');
        if (!displayHtml.includes('cdn.tailwindcss.com')) {
          displayHtml = PRELOADED_SCRIPTS + '\n' + displayHtml;
        }

        setPageData({
          url,
          content: displayHtml,
          title: url,
          isLoading: true,
          generatedBy: model,
        });
      }

      if (currentRequestRef.current === requestId) {
        const cleanedHtml = cleanHtml(accumulatedHtml);

        setImageProgress({ completed: 0, total: 0 });
        const finalHtml = await processAiImages(cleanedHtml, (completed, total) => {
          if (currentRequestRef.current === requestId) {
            setImageProgress({ completed, total });
          }
        });
        setImageProgress(null);

        setPageData({
          url,
          content: finalHtml,
          title: url,
          isLoading: false,
          generatedBy: model,
        });

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

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex].url, true);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex].url, true);
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
  };

  const handleIframeNavigate = (targetUrl: string, state?: any) => {
    let finalUrl = targetUrl;
    if (targetUrl.startsWith('/')) {
      try {
        const currentObj = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
        finalUrl = currentObj.origin + targetUrl;
      } catch {
        finalUrl = targetUrl;
      }
    }
    navigateTo(finalUrl, false, state);
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
