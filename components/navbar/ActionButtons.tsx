import React from 'react';

interface ActionButtonsProps {
  canDownload: boolean;
  isDevToolsOpen: boolean;
  isDownloadsOpen: boolean;
  onNavigate: (url: string) => void;
  onDownload: () => void;
  onToggleDownloads: () => void;
  onToggleDevTools: () => void;
  onToggleHistory: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  canDownload,
  isDevToolsOpen,
  isDownloadsOpen,
  onNavigate,
  onDownload,
  onToggleDownloads,
  onToggleDevTools,
  onToggleHistory,
}) => {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onNavigate('infinite://directory')}
        className="px-2 py-1 rounded-md hover:bg-white/5 text-emerald-500 hover:text-emerald-400 transition-all font-bold text-[10px] uppercase tracking-wider"
        title="Infinite Directory"
      >
        Directory
      </button>
      <div className="w-px h-4 bg-white/10 mx-0.5"></div>
      <button
        onClick={() => { onDownload(); }}
        disabled={!canDownload}
        className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white transition-all disabled:opacity-10 relative"
        title="Download HTML"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </button>
      <button
        onClick={onToggleDevTools}
        className={`p-1.5 rounded-md transition-all ${
          isDevToolsOpen ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5 text-gray-500 hover:text-white'
        }`}
        title="Architect Console"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      </button>
      <button
        onClick={onToggleHistory}
        className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white transition-all"
        title="History & Bookmarks"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
      </button>
    </div>
  );
};

export default ActionButtons;
