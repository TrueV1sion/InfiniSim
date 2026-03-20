import React, { useState, useEffect, useRef } from 'react';
import { ModelTier, HistoryItem, Bookmark, BrowserEra } from '../types';
import { DeviceType } from './BrowserViewport';

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  model: ModelTier;
  deviceType: DeviceType;
  browserEra: BrowserEra;
  onNavigate: (url: string, imageBase64?: string | null) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onDownload: () => void;
  canDownload: boolean;
  onSetModel: (model: ModelTier) => void;
  onSetDeviceType: (deviceType: DeviceType) => void;
  onSetBrowserEra: (browserEra: BrowserEra) => void;
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
}

const AddressBar: React.FC<AddressBarProps> = ({
  currentUrl,
  isLoading,
  model,
  deviceType,
  browserEra,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStop,
  onDownload,
  canDownload,
  onSetModel,
  onSetDeviceType,
  onSetBrowserEra,
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
  canPublish
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{url: string, title?: string, type: 'history'|'bookmark'}[]>([]);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImageBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

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
    onNavigate(url, imageBase64);
    setImageBase64(null); // Clear after navigation
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
        <button
          onClick={onHome}
          className="p-2 rounded-lg hover:bg-white/5 transition-all active:scale-95 ml-1"
          aria-label="Home"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </button>
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
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button
                type="button"
                onClick={() => {
                    if (imageBase64) {
                        setImageBase64(null);
                    } else {
                        fileInputRef.current?.click();
                    }
                }}
                className={`p-1.5 rounded-md transition-colors ${imageBase64 ? 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-blue-400 hover:bg-white/5'}`}
                title={imageBase64 ? "Remove Image" : "Upload Image for Generation"}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <button
                type="button"
                onClick={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream);
                    const audioChunks: BlobPart[] = [];
                    
                    mediaRecorder.addEventListener("dataavailable", event => {
                      audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener("stop", async () => {
                      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                      const reader = new FileReader();
                      reader.readAsDataURL(audioBlob);
                      reader.onloadend = async () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        const { transcribeAudio } = await import('../services/geminiService');
                        const transcription = await transcribeAudio(base64Audio, 'audio/webm');
                        if (transcription) {
                          setInputVal(transcription);
                          onNavigate(transcription);
                        }
                      };
                    });

                    mediaRecorder.start();
                    setTimeout(() => {
                      mediaRecorder.stop();
                      stream.getTracks().forEach(track => track.stop());
                    }, 5000); // Record for 5 seconds
                  } catch (e) {
                    console.error("Microphone error", e);
                  }
                }}
                className="p-1.5 rounded-md transition-colors text-gray-600 hover:text-blue-400 hover:bg-white/5"
                title="Voice Navigation (Hold to speak)"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
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
                onClick={onToggleSound}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${isSoundEnabled ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'}`}
                title="Enable Audio & Music (Tone.js / Howler.js)"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">Audio</span>
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
                title="Bookmark"
            >
                <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            </button>
            <button
                type="button"
                onClick={onPublish}
                disabled={!canPublish}
                className="p-1.5 rounded-md transition-colors text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-emerald-500"
                title="Publish to Directory"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
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
            onClick={() => onSetDeviceType('desktop')}
            className={`p-1.5 rounded-lg transition-all ${
              deviceType === 'desktop' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Desktop View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={() => onSetDeviceType('tablet')}
            className={`p-1.5 rounded-lg transition-all ${
              deviceType === 'tablet' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Tablet View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={() => onSetDeviceType('mobile')}
            className={`p-1.5 rounded-lg transition-all ${
              deviceType === 'mobile' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Mobile View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={() => onSetDeviceType('vr')}
            className={`p-1.5 rounded-lg transition-all ${
              deviceType === 'vr' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="VR View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={() => onSetDeviceType('ar')}
            className={`p-1.5 rounded-lg transition-all ${
              deviceType === 'ar' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="AR View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <div className="flex items-center bg-[#111] rounded-xl p-1 border border-white/5">
          <select
            value={browserEra}
            onChange={(e) => onSetBrowserEra(e.target.value as BrowserEra)}
            className="bg-transparent text-xs font-bold text-gray-400 hover:text-white outline-none cursor-pointer px-2 py-1.5"
            title="Browser Era"
          >
            <option value="default">Modern</option>
            <option value="1990">1990 (WorldWideWeb)</option>
            <option value="1995">1995 (Netscape)</option>
            <option value="1999">1999 (IE 5)</option>
            <option value="2001">2001 (IE 6)</option>
            <option value="2005">2005 (Firefox 1.5)</option>
            <option value="2010">2010 (Chrome 5)</option>
            <option value="2015">2015 (Chrome 40)</option>
            <option value="2020">2020 (Modern)</option>
            <option value="2025">2025 (AI Era)</option>
            <option value="2030">2030 (Spatial)</option>
            <option value="2035">2035 (Neural)</option>
          </select>
        </div>

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
              onClick={() => onNavigate('infinite://directory')}
              className="p-2 rounded-xl hover:bg-white/5 text-emerald-500 hover:text-emerald-400 transition-all font-bold text-xs uppercase tracking-wider"
              title="Infinite Directory"
            >
              Directory
            </button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>

            <button
            onClick={onDownload}
            disabled={!canDownload}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all disabled:opacity-10"
            title="Download Offline HTML"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>

            <button
            onClick={onToggleDownloads}
            className={`p-2 rounded-xl transition-all ${
                isDownloadsOpen ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 text-gray-500 hover:text-white'
            }`}
            title="Downloads"
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

            {user ? (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all flex items-center gap-2 ml-2 border-l border-white/10 pl-4"
                title="Sign Out"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all ml-2"
                title="Sign In with Google"
              >
                Sign In
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddressBar;