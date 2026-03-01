import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import AddressBar from './components/AddressBar';
import BrowserViewport from './components/BrowserViewport';
import EmptyState from './components/EmptyState';
import HistoryPanel from './components/HistoryPanel';
import DevToolsPanel from './components/DevToolsPanel';
import CommandPalette from './components/CommandPalette';
import ExportMenu from './components/ExportMenu';
import { ModelTier } from './types';
import { generatePageContentStreaming, refinePageContent } from './services/geminiService';
import { useNavigationStore } from './stores/navigationStore';

const LOADING_MESSAGES = [
  "Synthesizing latent reality...",
  "Injecting architectural logic...",
  "Synchronizing interactive nodes...",
  "Simulating physics engine...",
  "Polishing creative facets...",
  "Deep Researching context..."
];

const App: React.FC = () => {
  const {
    history, bookmarks, historyIndex, currentUrl, pageData, loading, model,
    deepResearch, isRefining, hasKey, isHistoryOpen, isDevToolsOpen, isCommandPaletteOpen,
    setHistory, pushHistory, setHistoryIndex, setCurrentUrl, setPageData,
    setLoading, setModel, setDeepResearch, setIsRefining, setHasKey,
    setIsHistoryOpen, setIsDevToolsOpen, setIsCommandPaletteOpen,
    addBookmark, removeBookmark, isBookmarked, clearHistory, clearBookmarks,
  } = useNavigationStore();

  const [streamingHtml, setStreamingHtml] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const currentRequestRef = useRef<number>(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, [setHasKey]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('[data-address-input]');
        input?.focus();
        input?.select();
      }
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleToggleBookmark();
      }
      if (e.key === 'i' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setIsDevToolsOpen(!isDevToolsOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isDevToolsOpen, setIsCommandPaletteOpen, setIsDevToolsOpen]);

  const navigateTo = useCallback(async (url: string, isHistoryNav = false) => {
    const requestId = Date.now();
    currentRequestRef.current = requestId;

    setLoading(true);
    setIsStreaming(true);
    setStreamingHtml('');
    setCurrentUrl(url);

    if (!isHistoryNav) {
      pushHistory({ url, timestamp: Date.now() });
    }

    try {
      const finalHtml = await generatePageContentStreaming(
        url,
        model,
        deepResearch,
        (partial) => {
          if (currentRequestRef.current === requestId) {
            setStreamingHtml(partial);
          }
        }
      );

      if (currentRequestRef.current === requestId) {
        setPageData({
          url,
          content: finalHtml,
          title: url,
          isLoading: false,
          generatedBy: model
        });
        setStreamingHtml('');
        setIsStreaming(false);
        toast.success('Page generated', { duration: 2000 });
      }
    } catch (err) {
      if (currentRequestRef.current === requestId) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setIsStreaming(false);
        setStreamingHtml('');

        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Requested entity was not found')) {
          setHasKey(false);
          toast.error('API rate limit reached');
        } else {
          toast.error('Generation failed: ' + errorMessage.slice(0, 80));
          const errorHtml = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-[#050505] text-white flex items-center justify-center min-h-screen p-10 font-sans"><div class="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]"><div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h1 class="text-2xl font-bold mb-2">Simulated Reality Halted</h1><p class="text-gray-400 text-sm mb-6 leading-relaxed">${errorMessage}</p><button onclick="window.parent.postMessage({type:'INFINITE_WEB_NAVIGATE',url:'${url}'},'*')" class="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl transition-all font-semibold shadow-lg shadow-red-600/20">Retry</button></div></body></html>`;
          setPageData({ url, content: errorHtml, title: 'Error', isLoading: false, generatedBy: model });
        }
      }
    } finally {
      if (currentRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [model, deepResearch, pushHistory, setCurrentUrl, setLoading, setPageData, setHasKey]);

  const handleIframeNavigate = useCallback((targetUrl: string) => {
    let finalUrl = targetUrl;
    if (targetUrl.startsWith('/')) {
      try {
        const currentObj = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
        finalUrl = currentObj.origin + targetUrl;
      } catch {
        finalUrl = targetUrl;
      }
    }
    navigateTo(finalUrl);
  }, [currentUrl, navigateTo]);

  const hasResumed = useRef(false);
  useEffect(() => {
    if (!hasResumed.current && currentUrl && !pageData) {
      hasResumed.current = true;
      navigateTo(currentUrl, true);
    } else if (!currentUrl && loading) {
      setLoading(false);
    }
  }, [currentUrl, navigateTo, pageData, loading, setLoading]);

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex].url, true);
    }
  }, [historyIndex, history, setHistoryIndex, navigateTo]);

  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex].url, true);
    }
  }, [historyIndex, history, setHistoryIndex, navigateTo]);

  const handleStop = useCallback(() => {
    currentRequestRef.current = 0;
    setLoading(false);
    setIsStreaming(false);
    setStreamingHtml('');
  }, [setLoading]);

  const handleReload = useCallback(() => {
    if (currentUrl) navigateTo(currentUrl, true);
  }, [currentUrl, navigateTo]);

  const handleDownload = useCallback(() => {
    if (!pageData) return;
    let filename = (pageData.title || 'page').replace(/^https?:\/\//, '').replace(/[^a-z0-9.\-_]/gi, '_');
    if (!filename.toLowerCase().endsWith('.html')) filename += '.html';
    const blob = new Blob([pageData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded ' + filename, { duration: 2000 });
  }, [pageData]);

  const handleManualCodeUpdate = useCallback((newCode: string) => {
    if (pageData) {
      setPageData({ ...pageData, content: newCode });
      toast.success('Code applied', { duration: 1500 });
    }
  }, [pageData, setPageData]);

  const handleAiRefine = useCallback(async (instruction: string) => {
    if (!pageData) return;
    setIsRefining(true);
    try {
      const newHtml = await refinePageContent(pageData.content, instruction, model);
      setPageData({ ...pageData, content: newHtml });
      toast.success('Page refined', { duration: 2000 });
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Requested entity was not found')) {
        setHasKey(false);
      }
      toast.error('Refinement failed');
      throw e;
    } finally {
      setIsRefining(false);
    }
  }, [pageData, model, setPageData, setIsRefining, setHasKey]);

  const handleToggleBookmark = useCallback(() => {
    if (!currentUrl) return;
    if (isBookmarked(currentUrl)) {
      removeBookmark(currentUrl);
      toast('Bookmark removed', { duration: 1500 });
    } else {
      addBookmark({ url: currentUrl, title: pageData?.title || currentUrl, timestamp: Date.now() });
      toast.success('Bookmarked', { duration: 1500 });
    }
  }, [currentUrl, pageData, isBookmarked, addBookmark, removeBookmark]);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const displayContent = isStreaming && streamingHtml ? streamingHtml : pageData?.content || '';
  const hasContent = !!displayContent;

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#050505] text-white">
        <Toaster theme="dark" position="bottom-right" richColors />
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
      <Toaster theme="dark" position="bottom-right" richColors toastOptions={{ className: 'font-sans' }} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigateTo}
        onToggleDevTools={() => setIsDevToolsOpen(!isDevToolsOpen)}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onDownload={handleDownload}
        onReload={handleReload}
        history={history}
        bookmarks={bookmarks}
        canDownload={!!pageData && !loading}
      />

      <AddressBar
        currentUrl={currentUrl}
        isLoading={loading}
        model={model}
        onNavigate={(url) => navigateTo(url)}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onStop={handleStop}
        onDownload={handleDownload}
        canDownload={!!pageData && !loading}
        onSetModel={setModel}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onToggleDevTools={() => setIsDevToolsOpen(!isDevToolsOpen)}
        isDevToolsOpen={isDevToolsOpen}
        isBookmarked={isBookmarked(currentUrl)}
        onToggleBookmark={handleToggleBookmark}
        isDeepResearch={deepResearch}
        onToggleDeepResearch={() => setDeepResearch(!deepResearch)}
        history={history}
        bookmarks={bookmarks}
        onToggleExport={() => setShowExportMenu(!showExportMenu)}
        onToggleCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative flex flex-col h-full overflow-hidden">
          {loading && !hasContent && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl">
              <div className="relative w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-6">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-500 animate-[loading-progress_2s_ease-in-out_infinite] w-full transform -translate-x-full" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-mono text-white/60 tracking-widest uppercase animate-pulse">
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
                {deepResearch && (
                  <p className="text-[10px] font-mono text-teal-400 uppercase tracking-tighter">Deep Thinking Enabled (+ Latency)</p>
                )}
              </div>
            </div>
          )}

          {loading && hasContent && (
            <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
              <div className="h-1 bg-white/10 w-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-500 animate-[loading-progress_2s_ease-in-out_infinite] w-full transform -translate-x-full" />
              </div>
              <div className="absolute top-4 right-4 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-white/80">
                    {isStreaming ? 'Streaming...' : LOADING_MESSAGES[loadingMsgIdx]}
                  </span>
                  {deepResearch && <span className="text-[9px] text-teal-400 uppercase tracking-wider">Deep Research Active</span>}
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
            onClearHistory={clearHistory}
            onClearBookmarks={clearBookmarks}
          />

          {showExportMenu && pageData && (
            <ExportMenu
              html={pageData.content}
              url={pageData.url}
              onClose={() => setShowExportMenu(false)}
            />
          )}

          {hasContent ? (
            <BrowserViewport
              htmlContent={displayContent}
              title={currentUrl}
              onNavigate={handleIframeNavigate}
              isStreaming={isStreaming}
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
            isGenerating={isRefining}
            onClose={() => setIsDevToolsOpen(false)}
          />
        )}
      </div>

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
