import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, Bookmark } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onToggleDevTools: () => void;
  onToggleHistory: () => void;
  onDownload: () => void;
  onReload: () => void;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  canDownload: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  action: () => void;
  category: 'action' | 'history' | 'bookmark';
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, onNavigate, onToggleDevTools, onToggleHistory,
  onDownload, onReload, history, bookmarks, canDownload
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const actions: CommandItem[] = [
    { id: 'devtools', label: 'Toggle DevTools', icon: 'code', action: () => { onToggleDevTools(); onClose(); }, category: 'action' },
    { id: 'history', label: 'Toggle History Panel', icon: 'clock', action: () => { onToggleHistory(); onClose(); }, category: 'action' },
    { id: 'reload', label: 'Reload Page', icon: 'refresh', action: () => { onReload(); onClose(); }, category: 'action' },
    ...(canDownload ? [{ id: 'download', label: 'Download HTML', icon: 'download', action: () => { onDownload(); onClose(); }, category: 'action' as const }] : []),
  ];

  const bookmarkItems: CommandItem[] = bookmarks.map(b => ({
    id: `bk-${b.url}`,
    label: b.title || b.url,
    sublabel: b.url,
    icon: 'star',
    action: () => { onNavigate(b.url); onClose(); },
    category: 'bookmark'
  }));

  const historyItems: CommandItem[] = [...history].reverse().slice(0, 10).map(h => ({
    id: `hi-${h.url}-${h.timestamp}`,
    label: h.url,
    icon: 'clock',
    action: () => { onNavigate(h.url); onClose(); },
    category: 'history'
  }));

  const allItems = [...actions, ...bookmarkItems, ...historyItems];

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const iconMap: Record<string, React.ReactNode> = {
    code: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    clock: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    refresh: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    download: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    star: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/5">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
            placeholder="Type a command or search..."
          />
          <kbd className="hidden sm:inline-flex text-[10px] text-gray-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">No results found</div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              data-selected={i === selectedIndex}
              onClick={item.action}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/[0.03]'
              }`}
            >
              <span className={`shrink-0 ${item.category === 'bookmark' ? 'text-yellow-500' : 'text-gray-500'}`}>
                {iconMap[item.icon]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{item.label}</div>
                {item.sublabel && <div className="text-[10px] text-gray-600 font-mono truncate">{item.sublabel}</div>}
              </div>
              <span className="text-[10px] text-gray-600 uppercase tracking-wider shrink-0">
                {item.category}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><kbd className="bg-white/5 rounded px-1 py-0.5 border border-white/10">Up/Down</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/5 rounded px-1 py-0.5 border border-white/10">Enter</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/5 rounded px-1 py-0.5 border border-white/10">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
