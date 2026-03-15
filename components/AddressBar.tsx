import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModelTier, HistoryItem, Bookmark } from '../types';
import { DeviceType } from './BrowserViewport';
import OverflowMenu from './navbar/OverflowMenu';
import UserMenu from './navbar/UserMenu';

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  model: ModelTier;
  deviceType: DeviceType;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onDownload: () => void;
  canDownload: boolean;
  onSetModel: (model: ModelTier) => void;
  onSetDeviceType: (deviceType: DeviceType) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onToggleHistory: () => void;
  onToggleDevTools: () => void;
  isDevToolsOpen: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isDeepResearch: boolean;
  onToggleDeepResearch: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  onHome: () => void;
  onToggleDownloads: () => void;
  isDownloadsOpen: boolean;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  onPublish: () => void;
  canPublish: boolean;
  onOpenApiKeySettings?: () => void;
  hasApiKey?: boolean;
}

const NavButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label: string;
  title: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, disabled, label, title, active, children, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg transition-all duration-150 active:scale-95 ${
      active
        ? 'bg-white/10 text-white shadow-sm'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500'
    } ${className}`}
    aria-label={label}
    title={title}
  >
    {children}
  </button>
);

const AddressBar: React.FC<AddressBarProps> = ({
  currentUrl,
  isLoading,
  model,
  deviceType,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onDownload,
  canDownload,
  onSetModel,
  onSetDeviceType,
  canGoBack,
  canGoForward,
  onToggleHistory,
  onToggleDevTools,
  isDevToolsOpen,
  isBookmarked,
  onToggleBookmark,
  isDeepResearch,
  onToggleDeepResearch,
  isSoundEnabled,
  onToggleSound,
  history,
  bookmarks,
  onHome,
  onToggleDownloads,
  isDownloadsOpen,
  user,
  onLogin,
  onLogout,
  onPublish,
  canPublish,
  onOpenApiKeySettings,
  hasApiKey
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{url: string; title?: string; type: 'history' | 'bookmark'}>>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    if (!inputVal.trim() || inputVal === currentUrl) {
      setSuggestions([]);
      return;
    }

    const query = inputVal.toLowerCase();
    const matchedBookmarks = bookmarks
      .filter(b => b.url.toLowerCase().includes(query) || (b.title && b.title.toLowerCase().includes(query)))
      .map(b => ({ url: b.url, title: b.title, type: 'bookmark' as const }));

    const matchedHistory = history
      .filter(h => h.url.toLowerCase().includes(query))
      .map(h => ({ url: h.url, title: undefined, type: 'history' as const }));

    const uniqueSuggestions: Array<{url: string; title?: string; type: 'history' | 'bookmark'}> = [...matchedBookmarks];
    for (const h of matchedHistory) {
      if (!uniqueSuggestions.some(s => s.url === h.url)) {
        uniqueSuggestions.push(h);
      }
    }

    setSuggestions(uniqueSuggestions.slice(0, 6));
    setSelectedSuggestionIndex(-1);
  }, [inputVal, history, bookmarks, currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputVal.trim();
    if (!url) return;
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      url = suggestions[selectedSuggestionIndex].url;
    }
    if (!url.startsWith('http') && !url.includes('.') && !url.startsWith('search://') && !url.startsWith('infinite://')) {
      url = `search://${encodeURIComponent(url)}`;
    } else if (!url.startsWith('http') && !url.startsWith('search://') && !url.startsWith('infinite://')) {
      url = `https://${url}`;
    }
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (inputRef.current) inputRef.current.blur();
    onNavigate(url);
  };

  const handleSuggestionClick = (url: string) => {
    setInputVal(url);
    setShowSuggestions(false);
    onNavigate(url);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const getUrlIcon = () => {
    if (isLoading) {
      return (
        <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      );
    }
    if (inputVal.startsWith('search://')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    }
    if (inputVal.startsWith('infinite://')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
    );
  };

  const getModelLabel = () => {
    return model === ModelTier.PRO ? 'PRO' : 'FLASH';
  };

  const accentLineClass = isLoading
    ? (model === ModelTier.PRO
        ? 'bg-gradient-to-r from-transparent via-teal-500/50 to-transparent animate-pulse'
        : 'bg-gradient-to-r from-transparent via-sky-500/50 to-transparent animate-pulse')
    : (model === ModelTier.PRO
        ? 'bg-gradient-to-r from-transparent via-teal-500/20 to-transparent'
        : 'bg-gradient-to-r from-transparent via-sky-500/20 to-transparent');

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0c0c0c] border-b border-white/[0.06] text-white sticky top-0 z-50">
        {/* Left: Navigation controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <NavButton
            onClick={onBack}
            disabled={!canGoBack || isLoading}
            label="Back"
            title="Back (Alt+Left)"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </NavButton>
          <NavButton
            onClick={onForward}
            disabled={!canGoForward || isLoading}
            label="Forward"
            title="Forward (Alt+Right)"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </NavButton>
          {isLoading ? (
            <NavButton onClick={onStop} label="Stop" title="Stop loading (Esc)" className="text-red-400 hover:text-red-300">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </NavButton>
          ) : (
            <NavButton
              onClick={onReload}
              disabled={!currentUrl}
              label="Reload"
              title="Reload (Ctrl+R)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </NavButton>
          )}
          <NavButton onClick={onHome} label="Home" title="Home" className="ml-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </NavButton>
        </div>

        {/* Center: URL bar */}
        <form onSubmit={handleSubmit} className="flex-1 relative min-w-0">
          <div className={`flex items-center rounded-xl border transition-all duration-200 ${
            isFocused
              ? 'bg-[#161616] border-sky-500/30 shadow-[0_0_0_1px_rgba(14,165,233,0.1)]'
              : 'bg-[#111] border-white/[0.06] hover:border-white/10'
          }`}>
            <div className={`flex items-center justify-center w-9 shrink-0 transition-colors duration-200 ${
              isFocused ? 'text-sky-500' : 'text-gray-600'
            }`}>
              {getUrlIcon()}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-gray-200 text-[13px] py-2 pr-2 outline-none font-mono tracking-tight placeholder:text-gray-600"
              placeholder="Search or imagine a URL..."
              spellCheck={false}
            />

            <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
              {currentUrl && !isFocused && (
                <button
                  type="button"
                  onClick={onToggleBookmark}
                  className={`p-1.5 rounded-md transition-all duration-150 ${
                    isBookmarked
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                  }`}
                  title="Bookmark (Ctrl+D)"
                >
                  <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              )}

              {!isFocused && (
                <button
                  type="button"
                  onClick={() => {
                    const modelVal = model === ModelTier.PRO ? ModelTier.FLASH : ModelTier.PRO;
                    onSetModel(modelVal);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider transition-all duration-150 border ${
                    model === ModelTier.PRO
                      ? 'bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/15'
                      : 'bg-sky-500/10 border-sky-500/25 text-sky-400 hover:bg-sky-500/15'
                  }`}
                  title={`Switch model (current: ${getModelLabel()})`}
                >
                  {getModelLabel()}
                </button>
              )}
            </div>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1.5 bg-[#141414] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-[100]"
              style={{ animation: 'menuFadeIn 100ms ease-out' }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(s.url)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors border-b border-white/[0.04] last:border-0 ${
                    i === selectedSuggestionIndex
                      ? 'bg-white/[0.06]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {s.type === 'bookmark' ? (
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div className="flex flex-col overflow-hidden min-w-0">
                    {s.title && <span className="text-[13px] text-gray-200 truncate">{s.title}</span>}
                    <span className={`text-xs font-mono truncate ${s.title ? 'text-gray-500' : 'text-gray-300'}`}>{s.url}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <NavButton
            onClick={onDownload}
            disabled={!canDownload}
            label="Download"
            title="Download page (Ctrl+S)"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </NavButton>

          <NavButton
            onClick={onToggleDevTools}
            label="Developer tools"
            title="Code Editor (F12)"
            active={isDevToolsOpen}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </NavButton>

          <NavButton
            onClick={onToggleHistory}
            label="History and bookmarks"
            title="History & Bookmarks"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </NavButton>

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          <OverflowMenu
            model={model}
            onSetModel={onSetModel}
            deviceType={deviceType}
            onSetDeviceType={onSetDeviceType}
            isDeepResearch={isDeepResearch}
            onToggleDeepResearch={onToggleDeepResearch}
            isSoundEnabled={isSoundEnabled}
            onToggleSound={onToggleSound}
            onPublish={onPublish}
            canPublish={canPublish}
            onOpenApiKeySettings={onOpenApiKeySettings}
            hasApiKey={hasApiKey}
            onNavigateDirectory={() => onNavigate('infinite://directory')}
          />

          <UserMenu
            user={user}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Model accent line */}
      <div className={`h-[1px] transition-colors duration-500 ${accentLineClass}`} />

      {/* Indicator badges for active features */}
      {(isDeepResearch || isSoundEnabled) && !isFocused && (
        <div className="absolute top-full right-14 flex items-center gap-1.5 mt-1.5 z-40">
          {isDeepResearch && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-semibold tracking-wider uppercase">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
              Deep
            </span>
          )}
          {isSoundEnabled && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-semibold tracking-wider uppercase">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              Audio
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AddressBar;
