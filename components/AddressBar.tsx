import React, { useState, useEffect, useRef } from 'react';
import { ModelTier, HistoryItem, Bookmark } from '../types';

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  model: ModelTier;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onDownload: () => void;
  canDownload: boolean;
  onSetModel: (model: ModelTier) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onToggleHistory: () => void;
  onToggleDevTools: () => void;
  isDevToolsOpen: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isDeepResearch: boolean;
  onToggleDeepResearch: () => void;
  history: HistoryItem[];
  bookmarks: Bookmark[];
}

const AddressBar: React.FC<AddressBarProps> = ({
  currentUrl,
  isLoading,
  model,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onDownload,
  canDownload,
  onSetModel,
  canGoBack,
  canGoForward,
  onToggleHistory,
  onToggleDevTools,
  isDevToolsOpen,
  isBookmarked,
  onToggleBookmark,
  isDeepResearch,
  onToggleDeepResearch,
  history,
  bookmarks
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{url: string, title?: string, type: 'history'|'bookmark'}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
      .map(h => ({ url: h.url, type: 'history' as const }));

    // Deduplicate by URL, preferring bookmarks
    const uniqueSuggestions = [...matchedBookmarks];
    for (const h of matchedHistory) {
      if (!uniqueSuggestions.some(s => s.url === h.url)) {
        uniqueSuggestions.push(h);
      }
    }

    setSuggestions(uniqueSuggestions.slice(0, 5));
  }, [inputVal, history, bookmarks, currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputVal.trim();
    if (!url) return;
    if (!url.startsWith('http') && !url.includes('.')) {
      url = `search://${encodeURIComponent(url)}`;
    } else if (!url.startsWith('http') && !url.startsWith('search://')) {
       url = `https://${url}`;
    }
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.blur();
    onNavigate(url);
  };

  const handleSuggestionClick = (url: string) => {
    setInputVal(url);
    setShowSuggestions(false);
    onNavigate(url);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        // Delay hiding slightly to allow click event on suggestion to fire
        setTimeout(() => setShowSuggestions(false), 150);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-[#0a0a0a] border-b border-white/5 text-white sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-0.5">
        <button
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward || isLoading}
          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
          aria-label="Forward"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        {isLoading ? (
          <button
            onClick={onStop}
            className="p-2 rounded-lg hover:bg-white/5 transition-all active:scale-95 text-red-500"
            aria-label="Stop"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        ) : (
          <button
            onClick={onReload}
            disabled={!currentUrl}
            className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
            aria-label="Reload"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-600">
          {inputVal.startsWith('search://') ? (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          className="w-full bg-[#111] text-gray-200 text-sm rounded-xl pl-10 pr-36 py-2.5 outline-none border border-white/5 focus:border-blue-500/40 focus:bg-[#151515] transition-all shadow-inner font-mono tracking-tight"
          placeholder="Imagine a URL or a concept..."
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(s.url)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
              >
                {s.type === 'bookmark' ? (
                  <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                <div className="flex flex-col overflow-hidden">
                  {s.title && <span className="text-sm text-gray-200 truncate">{s.title}</span>}
                  <span className={`text-xs font-mono truncate ${s.title ? 'text-gray-500' : 'text-gray-300'}`}>{s.url}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inputVal)}
                className="p-1.5 rounded-md transition-colors text-gray-600 hover:text-gray-400 hover:bg-white/5"
                title="Copy URL"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            <button
                type="button"
                onClick={onToggleDeepResearch}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${isDeepResearch ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'}`}
                title="Deep Research Mode (Slower but higher quality)"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">Deep</span>
            </button>
            <button
                type="button"
                onClick={onToggleBookmark}
                className={`p-1.5 rounded-md transition-colors ${isBookmarked ? 'text-yellow-500 hover:text-yellow-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
            >
                <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            </button>
            <button
                type="submit"
                className="p-1.5 rounded-md transition-colors text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                title="Go"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-[#111] rounded-xl p-1 border border-white/5">
          <button
            onClick={() => onSetModel(ModelTier.FLASH)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              model === ModelTier.FLASH ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Flash
          </button>
          <button
            onClick={() => onSetModel(ModelTier.PRO)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              model === ModelTier.PRO ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Pro
            <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
                <span className="w-1 h-1 bg-current rounded-full animate-pulse delay-75"></span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
            <button
            onClick={onDownload}
            disabled={!canDownload}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all disabled:opacity-10"
            title="Download Offline HTML"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>

            <button
            onClick={onToggleDevTools}
            className={`p-2 rounded-xl transition-all ${
                isDevToolsOpen ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 text-gray-500 hover:text-white'
            }`}
            title="Architect Console"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </button>

            <button
            onClick={onToggleHistory}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
            title="Nexus History"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddressBar;