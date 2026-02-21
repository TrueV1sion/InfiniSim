import React, { useState } from 'react';
import { HistoryItem, Bookmark } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  onNavigate: (url: string) => void;
  onClose: () => void;
  onClearHistory: () => void;
  onClearBookmarks: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, history, bookmarks, onNavigate, onClose, onClearHistory, onClearBookmarks }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history');

  return (
    <div 
      className={`absolute top-0 right-0 bottom-0 w-80 bg-[#0f0f0f]/95 backdrop-blur-md border-l border-glassBorder z-40 transform transition-transform duration-300 shadow-2xl flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-glassBorder bg-[#0f0f0f] pb-0">
        <div className="flex gap-4">
             <button 
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
             >
                History
             </button>
             <button 
                onClick={() => setActiveTab('bookmarks')}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'bookmarks' ? 'text-white border-yellow-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
             >
                Saved
             </button>
        </div>
        <div className="flex items-center gap-2 mb-2">
            {activeTab === 'history' && history.length > 0 && (
                <button onClick={onClearHistory} className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10">Clear</button>
            )}
            {activeTab === 'bookmarks' && bookmarks.length > 0 && (
                <button onClick={onClearBookmarks} className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10">Clear</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'history' && (
            <>
                {history.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 text-xs font-mono">No history available</div>
                ) : (
                <div className="space-y-1">
                    {[...history].reverse().map((item, idx) => (
                    <button
                        key={`${item.timestamp}-${idx}`}
                        onClick={() => {
                        onNavigate(item.url);
                        onClose();
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-white/5 group transition-all flex flex-col gap-1 border border-transparent hover:border-white/10"
                    >
                        <div className="text-sm text-gray-200 truncate font-mono w-full group-hover:text-blue-400 transition-colors">{item.url}</div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wide">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                        </div>
                    </button>
                    ))}
                </div>
                )}
            </>
        )}

        {activeTab === 'bookmarks' && (
            <>
                {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-10 text-gray-500 gap-2">
                    <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    <div className="text-xs font-mono">No saved pages</div>
                </div>
                ) : (
                <div className="space-y-1">
                    {[...bookmarks].reverse().map((item, idx) => (
                    <button
                        key={`${item.timestamp}-${idx}`}
                        onClick={() => {
                        onNavigate(item.url);
                        onClose();
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-white/5 group transition-all flex flex-col gap-1 border border-transparent hover:border-yellow-500/20"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-200 truncate w-full group-hover:text-yellow-400 transition-colors">{item.title || item.url}</div>
                            <svg className="w-3 h-3 text-yellow-500 shrink-0 opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono truncate opacity-60">
                            {item.url}
                        </div>
                    </button>
                    ))}
                </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;