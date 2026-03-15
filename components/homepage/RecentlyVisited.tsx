import React from 'react';
import { HistoryItem } from '../../types';

interface RecentlyVisitedProps {
  history: HistoryItem[];
  onNavigate: (url: string) => void;
  disabled: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getCleanDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

const RecentlyVisited: React.FC<RecentlyVisitedProps> = ({ history, onNavigate, disabled }) => {
  if (history.length === 0) return null;

  const unique = new Map<string, HistoryItem>();
  for (const item of [...history].reverse()) {
    const domain = getCleanDomain(item.url);
    if (!unique.has(domain) && unique.size < 6) {
      unique.set(domain, item);
    }
  }
  const recent = Array.from(unique.values());

  if (recent.length === 0) return null;

  return (
    <div className={`animate-fadeInUp animation-delay-200 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest mb-4 px-1">Recently Visited</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recent.map((item) => (
          <button
            key={item.url + item.timestamp}
            onClick={() => onNavigate(item.url)}
            className="group flex-shrink-0 w-48 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 text-left"
          >
            <div className="text-sm text-white/60 group-hover:text-white/80 truncate mb-1 transition-colors font-medium">
              {getCleanDomain(item.url)}
            </div>
            <div className="text-[10px] text-white/20 font-mono truncate mb-3">
              {item.url}
            </div>
            <div className="text-[10px] text-white/15">
              {formatRelativeTime(item.timestamp)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentlyVisited;
