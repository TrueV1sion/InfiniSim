import React from 'react';
import { HistoryItem, Bookmark, ModelTier } from '../types';
import { TrendingPage } from '../services/cacheService';
import { PublishedSite } from '../hooks/useHomepageData';
import HeroSection from './homepage/HeroSection';
import QuickAccessGrid from './homepage/QuickAccessGrid';
import RecentlyVisited from './homepage/RecentlyVisited';
import TrendingSection from './homepage/TrendingSection';
import CommunitySection from './homepage/CommunitySection';
import ExploreSection from './homepage/ExploreSection';

interface HomepageProps {
  onNavigate: (url: string) => void;
  hasApiKey: boolean;
  onSetupApiKey: () => void;
  history: HistoryItem[];
  bookmarks: Bookmark[];
  userName?: string;
  model: ModelTier;
  deviceType: string;
  deepResearch: boolean;
  trending: TrendingPage[];
  community: PublishedSite[];
  isDataLoading: boolean;
}

const Homepage: React.FC<HomepageProps> = ({
  onNavigate,
  hasApiKey,
  onSetupApiKey,
  history,
  bookmarks,
  userName,
  model,
  deviceType,
  deepResearch,
  trending,
  community,
  isDataLoading,
}) => {
  const disabled = !hasApiKey;

  return (
    <div className="flex-1 flex flex-col bg-[#050505] text-white overflow-y-auto scrollbar-hide">
      <div className="max-w-3xl w-full mx-auto px-6 pb-16 flex flex-col gap-8">
        <HeroSection
          onNavigate={onNavigate}
          hasApiKey={hasApiKey}
          onSetupApiKey={onSetupApiKey}
          userName={userName}
        />

        <QuickAccessGrid
          bookmarks={bookmarks}
          onNavigate={onNavigate}
          disabled={disabled}
        />

        <RecentlyVisited
          history={history}
          onNavigate={onNavigate}
          disabled={disabled}
        />

        <TrendingSection
          trending={trending}
          onNavigate={onNavigate}
          isLoading={isDataLoading}
          disabled={disabled}
        />

        <CommunitySection
          sites={community}
          onNavigate={onNavigate}
          isLoading={isDataLoading}
          disabled={disabled}
        />

        <ExploreSection
          onNavigate={onNavigate}
          disabled={disabled}
        />

        <div className="pt-4 pb-8 flex flex-wrap justify-center gap-6 opacity-25">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${model === ModelTier.FLASH ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono tracking-widest uppercase">Flash</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${model === ModelTier.PRO ? 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)]' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono tracking-widest uppercase">Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${deviceType !== 'desktop' ? 'bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.5)]' : 'bg-white/20'}`} />
            <span className="text-[10px] font-mono tracking-widest uppercase capitalize">{deviceType}</span>
          </div>
          {deepResearch && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              <span className="text-[10px] font-mono tracking-widest uppercase">Deep Research</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Homepage;
