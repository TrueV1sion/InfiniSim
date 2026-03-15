import React, { useState, useCallback, useEffect } from 'react';
import AddressBar from './components/AddressBar';
import BrowserViewport from './components/BrowserViewport';
import EmptyState from './components/EmptyState';
import HistoryPanel from './components/HistoryPanel';
import DevToolsPanel from './components/DevToolsPanel';
import DownloadsPanel from './components/DownloadsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ApiKeyModal from './components/ApiKeyModal';
import { ModelTier, HistoryItem, Bookmark, DownloadItem } from './types';
import { refinePageContent } from './services/geminiService';
import { signInWithGoogle, logout } from './firebase';
import { usePersistedState } from './hooks/usePersistedState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useNavigation } from './hooks/useNavigation';
import { useDownloads } from './hooks/useDownloads';
import { parseGeminiError, categorizeError, type ErrorCategory } from './utils/errorParser';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getLocalApiKey, syncApiKeyToSupabase, loadApiKeyFromSupabase } from './services/apiKeyService';

const LOADING_MESSAGES = [
  'Synthesizing latent reality...',
  'Injecting architectural logic...',
  'Synchronizing interactive nodes...',
  'Simulating physics engine...',
  'Polishing creative facets...',
  'Deep Researching context...',
];

const App: React.FC = () => {
  const [history, setHistory] = usePersistedState<HistoryItem[]>('history', []);
  const [bookmarks, setBookmarks] = usePersistedState<Bookmark[]>('bookmarks', []);
  const [downloads, setDownloads] = usePersistedState<DownloadItem[]>('downloads', []);
  const [historyIndex, setHistoryIndex] = usePersistedState<number>('index', -1);
  const [model, setModel] = usePersistedState<ModelTier>('model', ModelTier.FLASH);
  const [deviceType, setDeviceType] = usePersistedState<'desktop' | 'tablet' | 'mobile' | 'vr' | 'ar'>('deviceType', 'desktop');
  const [virtualState, setVirtualState] = usePersistedState<any>('virtualState', {});
  const [deepResearch, setDeepResearch] = usePersistedState<boolean>('deepResearch', false);
  const [soundEnabled, setSoundEnabled] = usePersistedState<boolean>('soundEnabled', false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userHasApiKey, setUserHasApiKey] = useState(false);

  const { user, isAuthReady } = useFirebaseAuth(
    (data) => {
      if (data.history) setHistory(data.history);
      if (data.bookmarks) setBookmarks(data.bookmarks);
      if (data.downloads) setDownloads(data.downloads);
      if (data.virtualState) setVirtualState(data.virtualState);
    }
  );

  useFirestoreSync(user, isAuthReady, { history, bookmarks, downloads, virtualState });

  useEffect(() => {
    const localKey = getLocalApiKey();
    setUserHasApiKey(!!localKey);
    if (!localKey) {
      setShowApiKeyModal(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const localKey = getLocalApiKey();
    if (localKey) {
      syncApiKeyToSupabase(user.uid).catch(() => {});
    } else {
      loadApiKeyFromSupabase(user.uid).then((loaded) => {
        if (loaded) {
          setUserHasApiKey(true);
          setShowApiKeyModal(false);
        }
      });
    }
  }, [user]);

  const buildErrorHtml = useCallback((category: ErrorCategory, displayMessage: string, url: string, currentModel: ModelTier) => {
    const templates: Record<ErrorCategory, { title: string; msg: string; color: string; buttons: string }> = {
      api_key_missing: {
        title: 'API Key Required',
        msg: 'Sign in and configure your Google Gemini API key to start browsing the latent web.',
        color: 'amber',
        buttons: `<button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl transition-all font-semibold shadow-lg shadow-amber-600/20">Retry</button>`,
      },
      quota_exceeded: {
        title: 'Quota Exceeded',
        msg: `You have exceeded the quota for the current model (${currentModel}). Please try switching to the Flash model.`,
        color: 'red',
        buttons: `
          <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-semibold">Retry</button>
        `,
      },
      context_limit: {
        title: 'Context Limit Reached',
        msg: 'The page state or history has grown too large for the AI to process. Please clear your history or start a new session.',
        color: 'orange',
        buttons: `<button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-semibold">Retry</button>`,
      },
      generic: {
        title: 'Simulated Reality Halted',
        msg: displayMessage,
        color: 'red',
        buttons: `<button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_NAVIGATE', url: '${url}' }, '*')" class="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl transition-all font-semibold shadow-lg shadow-red-600/20">Sync Reality</button>`,
      },
    };

    const t = templates[category];
    return `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"><\/script></head>
      <body class="bg-[#050505] text-white flex items-center justify-center min-h-screen p-10 font-sans">
        <div class="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <div class="w-16 h-16 bg-${t.color}-500/10 text-${t.color}-500 rounded-2xl flex items-center justify-center mb-6">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 class="text-2xl font-bold mb-2">${t.title}</h1>
          <p class="text-gray-400 text-sm mb-6 leading-relaxed">${t.msg}</p>
          <div class="flex flex-col gap-3">${t.buttons}</div>
        </div>
      </body></html>`;
  }, []);

  const handleNavigationError = useCallback((category: ErrorCategory, displayMessage: string, url: string) => {
    const titleMap: Record<ErrorCategory, string> = {
      api_key_missing: 'Service Unavailable',
      quota_exceeded: 'Quota Exceeded',
      context_limit: 'Context Limit Reached',
      generic: 'Error',
    };

    nav.setPageData({
      url,
      content: buildErrorHtml(category, displayMessage, url, model),
      title: titleMap[category],
      isLoading: false,
      generatedBy: model,
    });
  }, [model, buildErrorHtml]);

  const nav = useNavigation({
    history, setHistory, historyIndex, setHistoryIndex,
    model, deepResearch, virtualState, setVirtualState,
    deviceType, soundEnabled, userId: user?.uid,
    onError: handleNavigationError,
  });

  const { handleDownload, handleClearDownloads, handleOpenDownload } = useDownloads(
    downloads, setDownloads, nav.pageData, nav.currentUrl, setIsDownloadsOpen
  );

  const handleManualCodeUpdate = (newCode: string) => {
    if (nav.pageData) {
      nav.setPageData({ ...nav.pageData, content: newCode });
    }
  };

  const handleAiRefine = async (instruction: string) => {
    if (!nav.pageData) return;
    setIsRefining(true);
    try {
      const newHtml = await refinePageContent(nav.pageData.content, instruction, model, deviceType, soundEnabled, user?.uid);
      nav.setPageData({ ...nav.pageData, content: newHtml });
    } catch (e) {
      const displayMessage = parseGeminiError(e);
      throw new Error(displayMessage);
    } finally {
      setIsRefining(false);
    }
  };

  const handleToggleBookmark = () => {
    if (!nav.currentUrl) return;
    const exists = bookmarks.some(b => b.url === nav.currentUrl);
    if (exists) {
      setBookmarks(prev => prev.filter(b => b.url !== nav.currentUrl));
    } else {
      setBookmarks(prev => [...prev, {
        url: nav.currentUrl,
        title: nav.pageData?.title || nav.currentUrl,
        timestamp: Date.now(),
      }]);
    }
  };

  const handlePublish = async () => {
    if (!user || !nav.pageData || !nav.currentUrl) return;
    try {
      await addDoc(collection(db, 'published_sites'), {
        url: nav.currentUrl,
        title: nav.pageData.title || nav.currentUrl,
        content: nav.pageData.content,
        publisherUid: user.uid,
        publisherName: user.displayName || 'Anonymous',
        publishedAt: Date.now(),
      });
      alert('Site published successfully to the Infinite Directory!');
    } catch (error) {
      console.error('Error publishing site:', error);
      alert('Failed to publish site.');
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setHistoryIndex(-1);
    nav.setPageData(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505]">
      <AddressBar
        currentUrl={nav.currentUrl}
        isLoading={nav.loading}
        model={model}
        deviceType={deviceType}
        onNavigate={(url) => nav.navigateTo(url)}
        onBack={nav.handleBack}
        onForward={nav.handleForward}
        onReload={nav.handleReload}
        onStop={nav.handleStop}
        onDownload={handleDownload}
        canDownload={!!nav.pageData && !nav.loading}
        onSetModel={setModel}
        onSetDeviceType={setDeviceType}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onToggleDevTools={() => setIsDevToolsOpen(!isDevToolsOpen)}
        isDevToolsOpen={isDevToolsOpen}
        isBookmarked={bookmarks.some(b => b.url === nav.currentUrl)}
        onToggleBookmark={handleToggleBookmark}
        isDeepResearch={deepResearch}
        onToggleDeepResearch={() => setDeepResearch(!deepResearch)}
        isSoundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        history={history}
        bookmarks={bookmarks}
        onHome={nav.handleHome}
        onToggleDownloads={() => setIsDownloadsOpen(!isDownloadsOpen)}
        isDownloadsOpen={isDownloadsOpen}
        user={user}
        onLogin={signInWithGoogle}
        onLogout={logout}
        onPublish={handlePublish}
        canPublish={!!user && !!nav.pageData && nav.currentUrl !== 'infinite://directory'}
        onOpenApiKeySettings={() => setShowApiKeyModal(true)}
        hasApiKey={userHasApiKey}
      />

      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative flex flex-col h-full overflow-hidden">
          {nav.loading && !nav.pageData && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl">
              <div className="relative w-64 h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all duration-300 ease-out"
                  style={{ width: `${nav.loadingProgress}%` }}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-mono text-white/60 tracking-widest uppercase animate-pulse">
                  {LOADING_MESSAGES[nav.loadingMsgIdx]}
                </p>
                {deepResearch && (
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-tighter">Deep Thinking Enabled (+ Latency)</p>
                )}
              </div>
            </div>
          )}

          {nav.loading && nav.pageData && (
            <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
              <div className="h-1 bg-white/10 w-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all duration-300 ease-out"
                  style={{ width: `${nav.loadingProgress}%` }}
                />
              </div>
              <div className="absolute top-4 right-4 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-2xl pointer-events-auto">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-white/80">{LOADING_MESSAGES[nav.loadingMsgIdx]}</span>
                  {nav.imageProgress && nav.imageProgress.total > 0 && (
                    <span className="text-[9px] text-teal-400 uppercase tracking-wider">
                      Generating images: {nav.imageProgress.completed}/{nav.imageProgress.total}
                    </span>
                  )}
                  {deepResearch && <span className="text-[9px] text-cyan-400 uppercase tracking-wider">Deep Research Active</span>}
                </div>
              </div>
            </div>
          )}

          <HistoryPanel
            isOpen={isHistoryOpen}
            history={history}
            bookmarks={bookmarks}
            onNavigate={nav.navigateTo}
            onClose={() => setIsHistoryOpen(false)}
            onClearHistory={handleClearHistory}
            onClearBookmarks={() => setBookmarks([])}
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

          <ErrorBoundary onRetry={nav.handleReload} label="Viewport">
            {nav.pageData ? (
              <BrowserViewport
                htmlContent={nav.pageData.content}
                title={nav.pageData.title}
                isLoading={nav.loading}
                deviceType={deviceType}
                onNavigate={nav.handleIframeNavigate}
                onStateUpdate={nav.handleStateUpdate}
              />
            ) : !nav.loading && (
              <EmptyState
                onNavigate={(url) => nav.navigateTo(url)}
                hasApiKey={userHasApiKey}
                onSetupApiKey={() => setShowApiKeyModal(true)}
              />
            )}
          </ErrorBoundary>
        </div>

        {isDevToolsOpen && nav.pageData && (
          <ErrorBoundary onRetry={() => setIsDevToolsOpen(false)} label="DevTools">
            <DevToolsPanel
              isOpen={isDevToolsOpen}
              code={nav.pageData.content}
              model={model}
              onApplyCode={handleManualCodeUpdate}
              onAiRefine={handleAiRefine}
              isGenerating={isRefining}
              onClose={() => setIsDevToolsOpen(false)}
            />
          </ErrorBoundary>
        )}
      </div>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={() => {
          setUserHasApiKey(true);
          setShowApiKeyModal(false);
        }}
        userId={user?.uid}
      />
    </div>
  );
};

export default App;
