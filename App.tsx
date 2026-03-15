import React, { useState, useCallback } from 'react';
import AddressBar from './components/AddressBar';
import BrowserViewport from './components/BrowserViewport';
import EmptyState from './components/EmptyState';
import HistoryPanel from './components/HistoryPanel';
import DevToolsPanel from './components/DevToolsPanel';
import DownloadsPanel from './components/DownloadsPanel';
import ApiKeyModal from './components/ApiKeyModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ModelTier, HistoryItem, Bookmark, DownloadItem } from './types';
import { refinePageContent } from './services/geminiService';
import { signInWithGoogle, logout } from './firebase';
import { usePersistedState } from './hooks/usePersistedState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useNavigation } from './hooks/useNavigation';
import { useApiKey } from './hooks/useApiKey';
import { useDownloads } from './hooks/useDownloads';
import { parseGeminiError, categorizeError, ErrorCategory } from './utils/errorParser';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

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

  const { user, isAuthReady, userHasApiKey, setUserHasApiKey } = useFirebaseAuth(
    (data) => {
      if (data.history) setHistory(data.history);
      if (data.bookmarks) setBookmarks(data.bookmarks);
      if (data.downloads) setDownloads(data.downloads);
      if (data.virtualState) setVirtualState(data.virtualState);
    },
    () => apiKey.setHasKey(true)
  );

  const apiKey = useApiKey(user, userHasApiKey, setUserHasApiKey);

  useFirestoreSync(user, isAuthReady, { history, bookmarks, downloads, virtualState });

  const buildErrorHtml = useCallback((category: ErrorCategory, displayMessage: string, url: string, currentModel: ModelTier) => {
    const templates: Record<ErrorCategory, { title: string; msg: string; color: string; buttons: string }> = {
      api_key_missing: {
        title: 'API Key Required',
        msg: 'Your API key was not found or is invalid. Please provide a valid key to continue.',
        color: 'blue',
        buttons: `<button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_SELECT_KEY' }, '*')" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-semibold shadow-lg shadow-blue-600/20">Provide API Key</button>`,
      },
      quota_exceeded: {
        title: 'Quota Exceeded',
        msg: `You have exceeded the quota for the current model (${currentModel}). Please switch to the Flash model or provide your own API key.`,
        color: 'red',
        buttons: `
          <button onclick="window.parent.postMessage({ type: 'INFINITE_WEB_SELECT_KEY' }, '*')" class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-semibold shadow-lg shadow-blue-600/20">Provide API Key</button>
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
    if (category === 'api_key_missing') {
      if (user && !userHasApiKey) {
        apiKey.setShowApiKeyModal(true);
      } else {
        apiKey.setHasKey(false);
      }
      return;
    }

    nav.setPageData({
      url,
      content: buildErrorHtml(category, displayMessage, url, model),
      title: category === 'quota_exceeded' ? 'Quota Exceeded' : category === 'context_limit' ? 'Context Limit Reached' : 'Error',
      isLoading: false,
      generatedBy: model,
    });
  }, [user, userHasApiKey, model, buildErrorHtml]);

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
      const category = categorizeError(displayMessage);
      if (category === 'api_key_missing') {
        if (user && !userHasApiKey) {
          apiKey.setShowApiKeyModal(true);
        } else {
          apiKey.setHasKey(false);
        }
      }
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

  if (!apiKey.hasKey) {
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
            onClick={apiKey.handleSelectKey}
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
        onOpenApiKeySettings={apiKey.handleOpenApiKeySettings}
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
                onSelectKey={apiKey.handleSelectKey}
                onStateUpdate={nav.handleStateUpdate}
              />
            ) : !nav.loading && (
              <EmptyState onNavigate={(url) => nav.navigateTo(url)} />
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

      {user && (
        <ApiKeyModal
          isOpen={apiKey.showApiKeyModal}
          onClose={() => apiKey.setShowApiKeyModal(false)}
          onSuccess={apiKey.handleApiKeySuccess}
          userId={user.uid}
        />
      )}
    </div>
  );
};

export default App;
