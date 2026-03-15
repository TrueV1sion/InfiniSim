import React from 'react';
import { TrendingPage } from '../../services/cacheService';

interface TrendingSectionProps {
  trending: TrendingPage[];
  onNavigate: (url: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

function getCleanDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('?')[0];
}

const SkeletonCard: React.FC = () => (
  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
    <div className="h-4 bg-white/[0.05] rounded w-3/4 mb-3" />
    <div className="h-3 bg-white/[0.03] rounded w-1/2 mb-2" />
    <div className="h-3 bg-white/[0.03] rounded w-1/4" />
  </div>
);

const TrendingSection: React.FC<TrendingSectionProps> = ({ trending, onNavigate, isLoading, disabled }) => {
  if (!isLoading && trending.length === 0) return null;

  return (
    <div className={`animate-fadeInUp animation-delay-300 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-4 px-1">
        <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest">Trending on InfiniteWeb</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-[10px] text-teal-500/60 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trending.map((page, idx) => (
            <button
              key={page.url + idx}
              onClick={() => onNavigate(page.url)}
              className="group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-teal-500/20 transition-all duration-300 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/70 group-hover:text-white/90 font-medium truncate transition-colors mb-1">
                    {page.title || getCleanDomain(page.url)}
                  </div>
                  <div className="text-[10px] text-white/20 font-mono truncate">
                    {getCleanDomain(page.url)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-teal-500/[0.08] text-teal-400/70 text-[10px] font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {page.hit_count}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingSection;
