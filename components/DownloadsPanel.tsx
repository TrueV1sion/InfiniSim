import React from 'react';
import { DownloadItem } from '../types';

interface DownloadsPanelProps {
  downloads: DownloadItem[];
  onClose: () => void;
  onClear: () => void;
  onOpen: (download: DownloadItem) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const DownloadsPanel: React.FC<DownloadsPanelProps> = ({ downloads, onClose, onClear, onOpen }) => {
  return (
    <div className="w-80 bg-[#0a0a0a] border-l border-white/10 flex flex-col h-full shadow-2xl z-40 relative">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111]">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <h2 className="font-semibold text-white">Downloads</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
            disabled={downloads.length === 0}
          >
            Clear All
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <p className="text-sm">No downloads yet</p>
          </div>
        ) : (
          downloads.map((item) => (
            <div key={item.id} className="p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-200 truncate" title={item.filename}>{item.filename}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.url}</p>
                </div>
                <div className="shrink-0 pt-0.5">
                  {item.status === 'completed' && (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {item.status === 'downloading' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {item.status === 'failed' && (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] font-mono text-gray-500">
                  {item.size ? formatBytes(item.size) : 'Unknown size'} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                
                {item.status === 'completed' && (
                  <button 
                    onClick={() => onOpen(item)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100 font-medium"
                  >
                    Open File
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DownloadsPanel;
