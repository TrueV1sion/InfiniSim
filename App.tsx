import React, { useState, useEffect, useCallback, useRef } from 'react';
import AddressBar from './components/AddressBar';
import BrowserViewport from './components/BrowserViewport';
import EmptyState from './components/EmptyState';
import HistoryPanel from './components/HistoryPanel';
import DevToolsPanel from './components/DevToolsPanel';
import { ModelTier, WebPage, HistoryItem, Bookmark } from './types';
import { generatePageContent, refinePageContent } from './services/geminiService';

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
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage error:', e);
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
  
  const [historyIndex, setHistoryIndex] = useState<number>(() => 
    getStored('index', -1)
  );
  
  const [model, setModel] = useState<ModelTier>(() => 
    getStored('model', ModelTier.FLASH)
  );

  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    // Restore current URL from history if available
    if (historyIndex >= 0 && history[historyIndex]) {
      return history[historyIndex].url;
    }
    return '';
  });

  // Init loading state if we are about to resume a session
  const [loading, setLoading] = useState<boolean>(() => {
     return historyIndex >= 0 && !!history[historyIndex];
  });
  
  const [pageData, setPageData] = useState<WebPage | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Persistence Effects
  useEffect(() => {
    setStored('history', history);
  }, [history]);

  useEffect(() => {
    setStored('bookmarks', bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    setStored('index', historyIndex);
  }, [historyIndex]);

  useEffect(() => {
    setStored('model', model);
  }, [model]);

  // Core navigation logic
  const navigateTo = useCallback(async (url: string, isHistoryNav = false) => {
    setLoading(true);
    setCurrentUrl(url);

    // Update history only if it's a new navigation event
    if (!isHistoryNav) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ url, timestamp: Date.now() });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    try {
      // Generate content
      const html = await generatePageContent(url, model);
      
      setPageData({
        url,
        content: html,
        title: url,
        isLoading: false,
        generatedBy: model
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [history, historyIndex, model]);

  // Handle iframe navigation requests (relative URL resolution)
  const handleIframeNavigate = (targetUrl: string) => {
    let finalUrl = targetUrl;
    
    if (targetUrl.startsWith('/')) {
       try {
         const currentObj = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
         finalUrl = currentObj.origin + targetUrl;
       } catch (e) {
         finalUrl = targetUrl;
       }
    }
    
    navigateTo(finalUrl);
  };

  // Resume Session Effect
  const hasResumed = useRef(false);
  useEffect(() => {
    if (!hasResumed.current && currentUrl && !pageData) {
      hasResumed.current = true;
      // Re-generate the page content for the restored URL
      navigateTo(currentUrl, true);
    } else if (!currentUrl && loading) {
        // Edge case: Loading was true but no URL (e.g. corrupt history), stop loading
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

  const handleReload = () => {
    if (currentUrl) {
      navigateTo(currentUrl, true);
    }
  };

  const handleDownload = () => {
    if (!pageData) return;
    
    // Create filename from title or URL
    let filename = (pageData.title || 'page').replace(/^https?:\/\//, '').replace(/[^a-z0-9\.\-_]/gi, '_');
    if (!filename.toLowerCase().endsWith('.html')) {
        filename += '.html';
    }

    const blob = new Blob([pageData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      const newHtml = await refinePageContent(pageData.content, instruction, model);
      setPageData({
        ...pageData,
        content: newHtml
      });
    } catch (e) {
      console.error(e);
      throw e; // Propagate to DevTools component to show error
    } finally {
      setIsRefining(false);
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505]">
      <AddressBar 
        currentUrl={currentUrl}
        isLoading={loading}
        model={model}
        onNavigate={(url) => navigateTo(url)}
        onBack={handleBack}
        onReload={handleReload}
        onDownload={handleDownload}
        canDownload={!!pageData && !loading}
        onSetModel={setModel}
        canGoBack={historyIndex > 0}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onToggleDevTools={() => setIsDevToolsOpen(!isDevToolsOpen)}
        isDevToolsOpen={isDevToolsOpen}
        isBookmarked={bookmarks.some(b => b.url === currentUrl)}
        onToggleBookmark={handleToggleBookmark}
      />

      <div className="flex-1 relative overflow-hidden flex flex-row">
        {/* Main Viewport Container */}
        <div className="flex-1 relative flex flex-col h-full overflow-hidden">
          {loading && (
            <div className="absolute top-0 left-0 w-full z-10 h-full pointer-events-none">
              <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse-slow w-full"></div>
              <div className="absolute inset-0 h-full bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col gap-4 pointer-events-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
                  </div>
                  <div className="font-mono text-sm text-white/80 animate-pulse">
                    {model === ModelTier.PRO ? 'Restoring Reality...' : 'Resuming Dream...'}
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
          />

          {pageData && !loading ? (
            <BrowserViewport 
              htmlContent={pageData.content} 
              title={pageData.title}
              onNavigate={handleIframeNavigate}
            />
          ) : !loading && (
            <EmptyState onNavigate={(url) => navigateTo(url)} />
          )}
        </div>

        {/* DevTools Panel */}
        {isDevToolsOpen && pageData && (
          <DevToolsPanel 
            isOpen={isDevToolsOpen}
            code={pageData.content}
            model={model}
            onApplyCode={handleManualCodeUpdate}
            onAiRefine={handleAiRefine}
            isGenerating={isRefining}
          />
        )}
      </div>
    </div>
  );
};

export default App;