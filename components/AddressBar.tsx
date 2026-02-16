import React, { useState, useEffect } from 'react';
import { ModelTier } from '../types';

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  model: ModelTier;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onReload: () => void;
  onDownload: () => void;
  canDownload: boolean;
  onSetModel: (model: ModelTier) => void;
  canGoBack: boolean;
  onToggleHistory: () => void;
  onToggleDevTools: () => void;
  isDevToolsOpen: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

const AddressBar: React.FC<AddressBarProps> = ({
  currentUrl,
  isLoading,
  model,
  onNavigate,
  onBack,
  onReload,
  onDownload,
  canDownload,
  onSetModel,
  canGoBack,
  onToggleHistory,
  onToggleDevTools,
  isDevToolsOpen,
  isBookmarked,
  onToggleBookmark
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);

  useEffect(() => {
    setInputVal(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = inputVal.trim();
    if (!url) return;
    if (!url.startsWith('http') && !url.includes('.')) {
      // Treat as search query or "intent"
      url = `search://${encodeURIComponent(url)}`;
    } else if (!url.startsWith('http') && !url.startsWith('search://')) {
       url = `https://${url}`;
    }
    onNavigate(url);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#0f0f0f] border-b border-glassBorder text-white sticky top-0 z-50 shadow-2xl">
      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={onReload}
          disabled={isLoading}
          className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          aria-label="Reload"
        >
           {isLoading ? (
             <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           )}
        </button>
      </div>

      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex-1 relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {inputVal.startsWith('search://') ? (
             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          ) : (
             <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          )}
        </div>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-lg pl-10 pr-24 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-[#202020] transition-all shadow-inner font-mono"
          placeholder="Enter a URL or imagine a place..."
        />
        
        <div className="absolute inset-y-0 right-2 flex items-center gap-2">
            <button
                type="button"
                onClick={onToggleBookmark}
                className={`p-1.5 rounded-md transition-colors ${isBookmarked ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-gray-300 hover:bg-white/10'}`}
                title={isBookmarked ? "Remove Bookmark" : "Bookmark this page"}
            >
                <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            </button>
            <span className="text-xs text-gray-600 bg-[#111] px-2 py-0.5 rounded border border-gray-800 pointer-events-none select-none">
                AI
            </span>
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1 border border-glassBorder">
          <button
            onClick={() => onSetModel(ModelTier.FLASH)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              model === ModelTier.FLASH ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Flash 3.0
          </button>
          <button
            onClick={() => onSetModel(ModelTier.PRO)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
              model === ModelTier.PRO ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Pro 3.0
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
          </button>
        </div>

        {/* Download Button */}
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Download HTML"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>

        {/* DevTools Toggle */}
        <button
          onClick={onToggleDevTools}
          className={`p-2 rounded-lg transition-colors ${
            isDevToolsOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-400 hover:text-white'
          }`}
          title="Developer Tools"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        </button>

        {/* History Toggle */}
        <button
          onClick={onToggleHistory}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Library (History & Bookmarks)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AddressBar;