import React from 'react';
import { Bookmark } from '../../types';

interface QuickAccessGridProps {
  bookmarks: Bookmark[];
  onNavigate: (url: string) => void;
  disabled: boolean;
}

function getDomainInitial(url: string): string {
  const cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return cleaned.charAt(0).toUpperCase();
}

function getDomainColor(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-blue-600/30 to-blue-800/20',
    'from-teal-600/30 to-teal-800/20',
    'from-cyan-600/30 to-cyan-800/20',
    'from-emerald-600/30 to-emerald-800/20',
    'from-sky-600/30 to-sky-800/20',
    'from-rose-600/30 to-rose-800/20',
    'from-amber-600/30 to-amber-800/20',
    'from-orange-600/30 to-orange-800/20',
  ];
  return colors[Math.abs(hash) % colors.length];
}

const QuickAccessGrid: React.FC<QuickAccessGridProps> = ({ bookmarks, onNavigate, disabled }) => {
  if (bookmarks.length === 0) return null;

  const displayed = bookmarks.slice(-8).reverse();

  return (
    <div className={`animate-fadeInUp animation-delay-100 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest">Saved Sites</h2>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {displayed.map((b) => (
          <button
            key={b.url}
            onClick={() => onNavigate(b.url)}
            className="group flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-white/[0.04] transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getDomainColor(b.url)} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
              <span className="text-lg font-bold text-white/70">{getDomainInitial(b.url)}</span>
            </div>
            <span className="text-[11px] text-white/40 group-hover:text-white/60 truncate w-full text-center transition-colors">
              {b.title || b.url.replace(/^https?:\/\//, '').split('/')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessGrid;
