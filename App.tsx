import React, { useState, useEffect, useCallback, useRef } from 'react';
import AddressBar from './components/AddressBar';
import BrowserViewport from './components/BrowserViewport';
import EmptyState from './components/EmptyState';
import HistoryPanel from './components/HistoryPanel';
import DevToolsPanel from './components/DevToolsPanel';
import DownloadsPanel from './components/DownloadsPanel';
import { LiveCopilot } from './components/LiveCopilot';
import { ModelTier, WebPage, HistoryItem, Bookmark, DownloadItem, BrowserEra } from './types';
import { refinePageContent, generatePageContentStream, processAiImages, cleanHtml, PRELOADED_SCRIPTS, generateApiResponse, generateWebContainerApp } from './services/geminiService';
import { mountFiles, startDevServer } from './services/webContainerService';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Storage Helpers
const STORAGE_PREFIX = 'infiniteWeb_';

const getStored = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = (key: string, value: any) => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch (e: any) {
    const isQuotaExceeded = e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014
    );

    if (isQuotaExceeded) {
      if (key === 'virtualState') {
        console.warn('Virtual state too large for localStorage, clearing stored state.');
        try {
          localStorage.removeItem(STORAGE_PREFIX + key);
        } catch (removeErr) {
          // Ignore
        }
      } else if (key === 'history' && Array.isArray(value) && value.length > 10) {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value.slice(-10)));
        } catch (e2) {
          console.error('Still too large after trimming history.');
        }
      } else {
        console.error('Local storage quota exceeded for key:', key);
      }
    } else {
      console.error('Local storage error:', e);
    }
  }
};

const App: React.FC = () => {
  // State initialization with localStorage fallback
  const [history, setHistory] = useState<HistoryItem[]>(() => 
    getStored('history', [])
  );
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() =>
    getStored('bookmarks', [])
  );
  
  const [downloads, setDownloads] = useState<DownloadItem[]>(() =>
    getStored('downloads', [])
  );
  
  const [historyIndex, setHistoryIndex] = useState<number>(() => 
    getStored('index', -1)
  );
  
  const [model, setModel] = useState<ModelTier>(() => 
    getStored('model', ModelTier.FLASH)
  );

  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar'>(() => 
    getStored('deviceType', 'desktop')
  );

  const [browserEra, setBrowserEra] = useState<BrowserEra>(() => 
    getStored('browserEra', 'default')
  );

  const [virtualState, setVirtualState] = useState<any>(() =>
    getStored('virtualState', {})
  );

  const [deepResearch, setDeepResearch] = useState<boolean>(() =>
    getStored('deepResearch', false)
  );

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    getStored('soundEnabled', false)
  );

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const currentRequestRef = useRef<number>(0);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [webContainerOutput, setWebContainerOutput] = useState<string>('');

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Persistence Effects
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.history) setHistory(data.history);
            if (data.bookmarks) setBookmarks(data.bookmarks);
            if (data.downloads) setDownloads(data.downloads);
            if (data.virtualState) setVirtualState(data.virtualState);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync to Firestore when data changes
  useEffect(() => {
    if (user && isAuthReady) {
      const syncData = async () => {
        try {
          let stateToSync = virtualState;
          try {
            if (JSON.stringify(virtualState).length > 500000) {
              console.warn("Virtual state too large for Firestore, clearing it.");
              stateToSync = {};
            }
          } catch (e) {
            stateToSync = {};
          }

          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            history: history.slice(-50),
            bookmarks: bookmarks.slice(-100),
            downloads: downloads.slice(-50),
            virtualState: stateToSync,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing to Firestore:", error);
        }
      };
      // Debounce sync slightly
      const timeoutId = setTimeout(syncData, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [history, bookmarks, downloads, virtualState, user, isAuthReady]);

  useEffect(() => {
    setStored('history', history);
  }, [history]);

  useEffect(() => {
    setStored('bookmarks', bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    setStored('downloads', downloads);
  }, [downloads]);

  useEffect(() => {
    setStored('index', historyIndex);
  }, [historyIndex]);

  useEffect(() => {
    setStored('model', model);
  }, [model]);

  useEffect(() => {
    setStored('deviceType', deviceType);
  }, [deviceType]);

  useEffect(() => {
    setStored('browserEra', browserEra);
  }, [browserEra]);

  useEffect(() => {
    setStored('deepResearch', deepResearch);
  }, [deepResearch]);

  useEffect(() => {
    setStored('soundEnabled', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    setStored('virtualState', virtualState);
  }, [virtualState]);

  // Core navigation logic
  const navigateTo = useCallback(async (url: string, isHistoryNav = false, incomingState?: any) => {
    const requestId = Date.now();
    currentRequestRef.current = requestId;

    setLoading(true);
    setLoadingProgress(0);
    setCurrentUrl(url);

    const stateToUse = incomingState || virtualState;
    if (incomingState) {
      setVirtualState(incomingState);
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
        const sites = querySnapshot.docs.map(doc => doc.data());
        
        const directoryHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <title>Infinite Directory</title>
          </head>
          <body class="bg-[#050505] text-white min-h-screen p-10 font-sans">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Infinite Directory</h1>
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
            generatedBy: model
          });
        }
        return;
      }

      if (url.startsWith('wc://')) {
        setWebContainerOutput('Booting WebContainer...\n');
        
        // 1. Generate file tree
        setWebContainerOutput(prev => prev + 'Generating application files...\n');
        const fileTree = await generateWebContainerApp(url, model, deviceType);
        
        // 2. Mount files
        setWebContainerOutput(prev => prev + 'Mounting files to virtual file system...\n');
        await mountFiles(fileTree);
        
        // 3. Start dev server
        setWebContainerOutput(prev => prev + 'Starting development server...\n');
        await startDevServer(
          (data) => setWebContainerOutput(prev => prev + data),
          (wcUrl) => {
            if (currentRequestRef.current === requestId) {
              setPageData({
                url,
                content: '<html><body>WebContainer App Loading...</body></html>',
                title: url,
                isLoading: false,
                generatedBy: model,
                webContainerUrl: wcUrl
              });
            }
          }
        );
        return;
      }

      // Generate content with deep research flag
      const stream = await generatePageContentStream(url, model, deepResearch, stateToUse, deviceType, soundEnabled, browserEra);
      
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
          generatedBy: model
        });
      }

      if (currentRequestRef.current === requestId) {
        // Post-process images after stream is complete
        const finalHtml = await processAiImages(cleanHtml(accumulatedHtml));
        setPageData({
          url,
          content: finalHtml,
          title: url,
          isLoading: false,
          generatedBy: model
        });
      }
    } catch (err) {
      if (currentRequestRef.current === requestId) {
        console.error(err);
        let errorMessage = '';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          try {
            errorMessage = JSON.stringify(err);
          } catch {
            errorMessage = String(err);
          }
        } else {
          errorMessage = String(err);
        }
        
        let displayMessage = errorMessage;
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error && parsed.error.message) {
            displayMessage = parsed.error.message;
            try {
              const innerParsed = JSON.parse(displayMessage);
              if (innerParsed.error && innerParsed.error.message) {
                displayMessage = innerParsed.error.message;
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        
        if (displayMessage.includes('Requested entity was not found')) {
            setHasKey(false);
        } else if (displayMessage.includes('429') || displayMessage.includes('quota') || displayMessage.includes('RESOURCE_EXHAUSTED')) {
            const errorHtml = `
              <!DOCTYPE html>
              <html>
              <head><script src="https://cdn.tailwindcss.com"></script></head>
              <body class="bg-[#050505] text-white flex items-center justify-center min-h-screen p-10 font-sans">
                <div class="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                    <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h1 class="text-2xl font-bold mb-2">Quota Exceeded</h1>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">You have exceeded the quota for the current model (${model}). Please switch to the Flash model in the top right, or provide your own API key.</p>
                    <div class="flex flex-col gap-3">
                        <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_SELECT_KEY' }, '*')" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-semibold shadow-lg shadow-blue-600/20">Provide API Key</button>
                        <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-semibold">Retry</button>
                    </div>
                </div>
              </body>
              </html>
            `;
            setPageData({
              url,
              content: errorHtml,
              title: 'Quota Exceeded',
              isLoading: false,
              generatedBy: model
            });
        } else if (displayMessage.includes('token count exceeds') || displayMessage.includes('400')) {
            const errorHtml = `
              <!DOCTYPE html>
              <html>
              <head><script src="https://cdn.tailwindcss.com"></script></head>
              <body class="bg-[#050505] text-white flex items-center justify-center min-h-screen p-10 font-sans">
                <div class="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                    <div class="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h1 class="text-2xl font-bold mb-2">Context Limit Reached</h1>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">The page state or history has grown too large for the AI to process. Please clear your history or start a new session.</p>
                    <div class="flex flex-col gap-3">
                        <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-semibold">Retry</button>
                    </div>
                </div>
              </body>
              </html>
            `;
            setPageData({
              url,
              content: errorHtml,
              title: 'Context Limit Reached',
              isLoading: false,
              generatedBy: model
            });
        } else {
            const errorHtml = `
              <!DOCTYPE html>
              <html>
              <head><script src="https://cdn.tailwindcss.com"></script></head>
              <body class="bg-[#050505] text-white flex items-center justify-center min-h-screen p-10 font-sans">
                <div class="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                    <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h1 class="text-2xl font-bold mb-2">Simulated Reality Halted</h1>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">${displayMessage}</p>
                    <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl transition-all font-semibold shadow-lg shadow-red-600/20">Sync Reality</button>
                </div>
              </body>
              </html>
            `;
            setPageData({
              url,
              content: errorHtml,
              title: 'Error',
              isLoading: false,
              generatedBy: model
            });
        }
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
  }, [history, historyIndex, model, deepResearch, virtualState]);

  // Handle iframe navigation requests (relative URL resolution)
  const handleIframeNavigate = (targetUrl: string, state?: any) => {
    let finalUrl = targetUrl;
    if (targetUrl.startsWith('/')) {
       try {
         const currentObj = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
         finalUrl = currentObj.origin + targetUrl;
       } catch (e) {
         finalUrl = targetUrl;
       }
    }
    navigateTo(finalUrl, false, state);
  };

  const handleIframeUrlUpdate = (targetUrl: string, state?: any) => {
    let finalUrl = targetUrl;
    if (targetUrl.startsWith('/')) {
       try {
         const currentObj = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
         finalUrl = currentObj.origin + targetUrl;
       } catch (e) {
         finalUrl = targetUrl;
       }
    }
    setCurrentUrl(finalUrl);
    if (state) {
      setVirtualState(state);
    }
  };

  const handleStateUpdate = (state: any) => {
    setVirtualState(state);
  };

  const hasResumed = useRef(false);
  useEffect(() => {
    if (!hasResumed.current && currentUrl && !pageData) {
      hasResumed.current = true;
      navigateTo(currentUrl, true);
    } else if (!currentUrl && loading) {
        setLoading(false);
    }
  }, [currentUrl, navigateTo, pageData, loading]);

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevItem = history[newIndex];
      navigateTo(prevItem.url, true);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextItem = history[newIndex];
      navigateTo(nextItem.url, true);
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

  const handleDownload = () => {
    if (!pageData) return;
    let filename = (pageData.title || 'page').replace(/^https?:\/\//, '').replace(/[^a-z0-9\.\-_]/gi, '_');
    if (!filename.toLowerCase().endsWith('.html')) filename += '.html';
    const blob = new Blob([pageData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      filename,
      url: currentUrl,
      timestamp: Date.now(),
      size: blob.size,
      status: 'completed',
      blobUrl: url
    };
    
    setDownloads(prev => [newDownload, ...prev]);
    setIsDownloadsOpen(true);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearDownloads = () => {
    downloads.forEach(d => {
      if (d.blobUrl) URL.revokeObjectURL(d.blobUrl);
    });
    setDownloads([]);
  };

  const handleOpenDownload = (download: DownloadItem) => {
    if (download.blobUrl) {
      const a = document.createElement('a');
      a.href = download.blobUrl;
      a.download = download.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleManualCodeUpdate = (newCode: string) => {
    if (pageData) {
      setPageData({
        ...pageData,
        content: newCode
      });
    }
  };

  const handleAiRefine = async (instruction: string) => {
    if (!pageData) return;
    setIsRefining(true);
    try {
      const newHtml = await refinePageContent(pageData.content, instruction, model, deviceType, soundEnabled, browserEra);
      setPageData({
        ...pageData,
        content: newHtml
      });
    } catch (e) {
      console.error(e);
      let errorMessage = '';
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'object' && e !== null) {
        try {
          errorMessage = JSON.stringify(e);
        } catch {
          errorMessage = String(e);
        }
      } else {
        errorMessage = String(e);
      }
      let displayMessage = errorMessage;
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.error.message) {
          displayMessage = parsed.error.message;
          try {
            const innerParsed = JSON.parse(displayMessage);
            if (innerParsed.error && innerParsed.error.message) {
              displayMessage = innerParsed.error.message;
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
      
      if (displayMessage.includes('Requested entity was not found')) {
          setHasKey(false);
      } else if (displayMessage.includes('429') || displayMessage.includes('quota') || displayMessage.includes('RESOURCE_EXHAUSTED')) {
          // Do not block the UI, just throw so DevToolsPanel can catch it
      } else if (displayMessage.includes('token count exceeds') || displayMessage.includes('400')) {
          // Do not block the UI, just throw so DevToolsPanel can catch it
      }
      throw new Error(displayMessage);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApiCall = async (url: string, method: string, body: any, state: any, requestId: string, source?: MessageEventSource) => {
    try {
      let responseBody: any;
      let status = 200;

      if (url === 'infinite://api/proxy') {
        // Proxy fetch request to bypass CORS
        const proxyUrl = body.url;
        const proxyOptions = body.options || {};
        
        try {
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: proxyUrl, ...proxyOptions })
          });
          responseBody = await res.text();
          status = res.status;
        } catch (e: any) {
          responseBody = { error: e.message };
          status = 500;
        }
      } else if (url === 'infinite://api/notify') {
        // Show a notification (using standard browser notification or just alert for now)
        if (Notification.permission === 'granted') {
          new Notification(body.title || 'InfiniteWeb', { body: body.message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(body.title || 'InfiniteWeb', { body: body.message });
            }
          });
        }
        responseBody = { success: true };
      } else if (url === 'infinite://api/store/set') {
        // Store data globally
        setStored(`shared_${body.key}`, body.value);
        responseBody = { success: true };
      } else if (url === 'infinite://api/store/get') {
        // Retrieve global data
        responseBody = { value: getStored(`shared_${body.key}`, null) };
      } else {
        // Fallback to AI generated API response
        responseBody = await generateApiResponse(url, method, body, state, model);
      }
      
      // Send the response back to the iframe
      if (source && 'postMessage' in source) {
        (source as Window).postMessage({
          type: 'INFINITE_WEB_API_RESPONSE',
          requestId,
          body: responseBody,
          status
        }, '*');
      } else {
        const iframes = document.getElementsByTagName('iframe');
        if (iframes.length > 0 && iframes[0].contentWindow) {
          iframes[0].contentWindow.postMessage({
            type: 'INFINITE_WEB_API_RESPONSE',
            requestId,
            body: responseBody,
            status
          }, '*');
        }
      }
    } catch (e) {
      console.error("API Call Error:", e);
      if (source && 'postMessage' in source) {
        (source as Window).postMessage({
          type: 'INFINITE_WEB_API_RESPONSE',
          requestId,
          body: JSON.stringify({ error: "Internal Server Error" }),
          status: 500
        }, '*');
      } else {
        const iframes = document.getElementsByTagName('iframe');
        if (iframes.length > 0 && iframes[0].contentWindow) {
          iframes[0].contentWindow.postMessage({
            type: 'INFINITE_WEB_API_RESPONSE',
            requestId,
            body: JSON.stringify({ error: "Internal Server Error" }),
            status: 500
          }, '*');
        }
      }
    }
  };

  const handleToggleBookmark = () => {
    if (!currentUrl) return;
    const exists = bookmarks.some(b => b.url === currentUrl);
    if (exists) {
        setBookmarks(prev => prev.filter(b => b.url !== currentUrl));
    } else {
        const newBookmark: Bookmark = {
            url: currentUrl,
            title: pageData?.title || currentUrl,
            timestamp: Date.now()
        };
        setBookmarks(prev => [...prev, newBookmark]);
    }
  };

  const handlePublish = async () => {
    if (!user || !pageData || !currentUrl) return;
    try {
      await addDoc(collection(db, 'published_sites'), {
        url: currentUrl,
        title: pageData.title || currentUrl,
        content: pageData.content,
        publisherUid: user.uid,
        publisherName: user.displayName || 'Anonymous',
        publishedAt: Date.now()
      });
      alert('Site published successfully to the Infinite Directory!');
    } catch (error) {
      console.error("Error publishing site:", error);
      alert('Failed to publish site.');
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentUrl('');
    setPageData(null);
  };

  const handleClearBookmarks = () => {
    setBookmarks([]);
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const loadingMessages = [
    "Synthesizing latent reality...",
    "Injecting architectural logic...",
    "Synchronizing interactive nodes...",
    "Simulating physics engine...",
    "Polishing creative facets...",
    "Deep Researching context..."
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    let interval: any;
    let progressInterval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
      
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          const increment = Math.random() * 15;
          return Math.min(90, prev + increment);
        });
      }, 500);
    }
    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#050505] text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl text-center shadow-[0_0_50px_rgba(59,130,246,0.1)]">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">API Key Required</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            To use InfiniteWeb and avoid rate limits, please select your Google Cloud API key.
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4">Learn more about billing</a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-semibold shadow-lg shadow-blue-600/20"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505]">
      <AddressBar 
        currentUrl={currentUrl}
        isLoading={loading}
        model={model}
        deviceType={deviceType}
        browserEra={browserEra}
        onNavigate={(url) => navigateTo(url)}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onStop={handleStop}
        onDownload={handleDownload}
        canDownload={!!pageData && !loading}
        onSetModel={setModel}
        onSetDeviceType={setDeviceType}
        onSetBrowserEra={setBrowserEra}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onToggleDevTools={() => setIsDevToolsOpen(!isDevToolsOpen)}
        isDevToolsOpen={isDevToolsOpen}
        isBookmarked={bookmarks.some(b => b.url === currentUrl)}
        onToggleBookmark={handleToggleBookmark}
        isDeepResearch={deepResearch}
        onToggleDeepResearch={() => setDeepResearch(!deepResearch)}
        isSoundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        history={history}
        bookmarks={bookmarks}
        onHome={handleHome}
        onToggleDownloads={() => setIsDownloadsOpen(!isDownloadsOpen)}
        isDownloadsOpen={isDownloadsOpen}
        user={user}
        onLogin={signInWithGoogle}
        onLogout={logout}
        onPublish={handlePublish}
        canPublish={!!user && !!pageData && currentUrl !== 'infinite://directory'}
      />

      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative flex flex-col h-full overflow-hidden">
          {loading && !pageData && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl">
              <div className="relative w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-mono text-white/60 tracking-widest uppercase animate-pulse">
                  {loadingMessages[loadingMsgIdx]}
                </p>
                {deepResearch && (
                    <p className="text-[10px] font-mono text-purple-400 uppercase tracking-tighter">Deep Thinking Enabled (+ Latency)</p>
                )}
              </div>
            </div>
          )}

          {loading && pageData && (
            <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
              <div className="h-1 bg-white/10 w-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="absolute top-4 right-4 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
                 <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <div className="flex flex-col">
                    <span className="text-xs font-mono text-white/80">{loadingMessages[loadingMsgIdx]}</span>
                    {deepResearch && <span className="text-[9px] text-purple-400 uppercase tracking-wider">Deep Research Active</span>}
                 </div>
              </div>
            </div>
          )}

          <HistoryPanel 
            isOpen={isHistoryOpen}
            history={history}
            bookmarks={bookmarks}
            onNavigate={navigateTo}
            onClose={() => setIsHistoryOpen(false)}
            onClearHistory={handleClearHistory}
            onClearBookmarks={handleClearBookmarks}
          />

          {isDownloadsOpen && (
            <div className="absolute top-0 right-0 bottom-0 z-40">
              <DownloadsPanel
                downloads={downloads}
                onClose={() => setIsDownloadsOpen(false)}
                onClear={handleClearDownloads}
                onOpen={handleOpenDownload}
              />
            </div>
          )}

          {pageData ? (
            <BrowserViewport 
              htmlContent={pageData.content} 
              title={pageData.title}
              isLoading={loading}
              deviceType={deviceType}
              webContainerUrl={pageData.webContainerUrl}
              onNavigate={handleIframeNavigate}
              onUrlUpdate={handleIframeUrlUpdate}
              onSelectKey={handleSelectKey}
              onStateUpdate={handleStateUpdate}
              onApiCall={handleApiCall}
            />
          ) : !loading && (
            <EmptyState onNavigate={(url) => navigateTo(url)} />
          )}
        </div>

        {isDevToolsOpen && pageData && (
          <DevToolsPanel 
            isOpen={isDevToolsOpen}
            code={pageData.content}
            model={model}
            onApplyCode={handleManualCodeUpdate}
            onAiRefine={handleAiRefine}
            onClearCache={() => setVirtualState({})}
            isGenerating={isRefining}
            onClose={() => setIsDevToolsOpen(false)}
            webContainerOutput={webContainerOutput}
          />
        )}
      </div>
      <LiveCopilot 
        onNavigate={navigateTo}
        onScroll={(direction) => {
          const iframe = document.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'INFINITE_WEB_SCROLL', direction }, '*');
          }
        }}
        onReadPage={() => {
          if (!pageData) return "The page is empty.";
          const parser = new DOMParser();
          const doc = parser.parseFromString(pageData.content, 'text/html');
          return doc.body.textContent || "The page has no text.";
        }}
      />
      <style>{`
        @keyframes loading-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;