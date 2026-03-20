import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, Bookmark } from '../../types';
import { normalizeUrl, getUrlDisplayIcon } from '../../utils/urlUtils';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface UrlInputProps {
  currentUrl: string;
  isBookmarked: boolean;
  canPublish: boolean;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  onNavigate: (url: string) => void;
  onToggleBookmark: () => void;
  onPublish: () => void;
}

const UrlInput: React.FC<UrlInputProps> = ({
  currentUrl,
  isBookmarked,
  canPublish,
  history,
  bookmarks,
  onNavigate,
  onToggleBookmark,
  onPublish,
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ url: string; title?: string; type: 'history' | 'bookmark' }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { startRecording, isRecording } = useVoiceInput({
    onResult: (transcription) => {
      setInputVal(transcription);
      onNavigate(normalizeUrl(transcription));
    },
  });

  useEffect(() => {
    setInputVal(currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    if (!inputVal.trim() || inputVal === currentUrl) {
      setSuggestions([]);
      return;
    }

    const q = inputVal.toLowerCase();
    const matchedBookmarks = bookmarks
      .filter(b => b.url.toLowerCase().includes(q) || (b.title && b.title.toLowerCase().includes(q)))
      .map(b => ({ url: b.url, title: b.title, type: 'bookmark' as const }));

    const matchedHistory = history
      .filter(h => h.url.toLowerCase().includes(q))
      .map(h => ({ url: h.url, type: 'history' as const }));

    const unique = [...matchedBookmarks];
    for (const h of matchedHistory) {
      if (!unique.some(s => s.url === h.url)) {
        unique.push(h);
      }
    }

    setSuggestions(unique.slice(0, 6));
  }, [inputVal, history, bookmarks, currentUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTimeout(() => setShowSuggestions(false), 150);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(inputVal);
    if (!url) return;
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.blur();
    onNavigate(url);
  };

  const handleSuggestionClick = (url: string) => {
    setInputVal(url);
    setShowSuggestions(false);
    onNavigate(url);
  };

  const iconType = getUrlDisplayIcon(inputVal);

  return (
    <form onSubmit={handleSubmit} className="flex-1 relative group" ref={wrapperRef}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400 text-gray-600">
        {iconType === 'search' ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        ) : iconType === 'container' ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        ) : iconType === 'directory' ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        className="w-full bg-[#111] text-gray-200 text-sm rounded-xl pl-9 pr-32 py-2 outline-none border border-white/5 focus:border-blue-500/40 focus:bg-[#151515] transition-all shadow-inner font-mono tracking-tight"
        placeholder="Enter a URL, search, or imagine..."
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestionClick(s.url)}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
            >
              {s.type === 'bookmark' ? (
                <svg className="w-3.5 h-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              <div className="flex flex-col overflow-hidden">
                {s.title && <span className="text-sm text-gray-200 truncate">{s.title}</span>}
                <span className={`text-xs font-mono truncate ${s.title ? 'text-gray-500' : 'text-gray-300'}`}>{s.url}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        <button
          type="button"
          onClick={startRecording}
          className={`p-1.5 rounded-md transition-all ${isRecording ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-gray-600 hover:text-blue-400 hover:bg-white/5'}`}
          title={isRecording ? 'Recording...' : 'Voice input (5s)'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          className={`p-1.5 rounded-md transition-colors ${isBookmarked ? 'text-yellow-500 hover:text-yellow-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
          title="Bookmark"
        >
          <svg className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish}
          className="p-1.5 rounded-md transition-colors text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-20 disabled:hover:bg-transparent"
          title="Publish to Directory"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </button>
        <button
          type="submit"
          className="p-1.5 rounded-md transition-colors text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
          title="Go"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </form>
  );
};

export default UrlInput;
