import React from 'react';
import { PublishedSite } from '../../hooks/useHomepageData';

interface CommunitySectionProps {
  sites: PublishedSite[];
  onNavigate: (url: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const SkeletonCard: React.FC = () => (
  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse flex-shrink-0 w-56">
    <div className="h-4 bg-white/[0.05] rounded w-3/4 mb-3" />
    <div className="h-3 bg-white/[0.03] rounded w-full mb-2" />
    <div className="h-3 bg-white/[0.03] rounded w-1/3" />
  </div>
);

const CommunitySection: React.FC<CommunitySectionProps> = ({ sites, onNavigate, isLoading, disabled }) => {
  if (!isLoading && sites.length === 0) return null;

  return (
    <div className={`animate-fadeInUp animation-delay-400 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest">Community Creations</h2>
        </div>
        <button
          onClick={() => onNavigate('infinite://directory')}
          className="text-[10px] text-white/20 hover:text-white/40 uppercase tracking-wider transition-colors"
        >
          View All
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {sites.map((site, idx) => (
            <button
              key={site.url + idx}
              onClick={() => onNavigate(site.url)}
              className="group flex-shrink-0 w-56 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all duration-300 text-left"
            >
              <div className="text-sm text-white/70 group-hover:text-white/90 font-medium truncate mb-1 transition-colors">
                {site.title}
              </div>
              <div className="text-[10px] text-white/20 font-mono truncate mb-3">
                {site.url}
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/15">
                <span>{site.publisherName}</span>
                <span>{formatDate(site.publishedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunitySection;
