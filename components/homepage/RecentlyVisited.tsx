import React from 'react';
import { HistoryItem } from '../../types';

interface RecentlyVisitedProps {
  history: HistoryItem[];
  onNavigate: (url: string) => void;
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 50%, 25%)`;
}

function getUniqueRecent(history: HistoryItem[], count: number): HistoryItem[] {
  const seen = new Set<string>();
  const result: HistoryItem[] = [];
  for (let i = history.length - 1; i >= 0 && result.length < count; i--) {
    const item = history[i];
    if (!seen.has(item.url) && !item.url.startsWith('infinite://')) {
      seen.add(item.url);
      result.push(item);
    }
  }
  return result;
}

const RecentlyVisited: React.FC<RecentlyVisitedProps> = ({ history, onNavigate }) => {
  const recent = getUniqueRecent(history, 6);
  if (recent.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 px-1">Recently Visited</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {recent.map((item, i) => {
          const color = hashColor(item.url);
          const displayUrl = item.url.replace(/^https?:\/\//, '').replace(/^wc:\/\//, 'wc://');
          return (
            <button
              key={`${item.url}-${i}`}
              onClick={() => onNavigate(item.url)}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left group overflow-hidden"
            >
              <div
                className="w-full h-8 rounded-md mb-2 opacity-60 group-hover:opacity-80 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
              />
              <div className="font-mono text-[10px] text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                {displayUrl}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyVisited;
