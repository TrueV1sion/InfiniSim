import React from 'react';
import { HistoryItem } from '../../types';
import HeroSearch from './HeroSearch';
import CategoryGrid from './CategoryGrid';
import RecentlyVisited from './RecentlyVisited';
import FeatureDiscovery from './FeatureDiscovery';
import RandomExplore from './RandomExplore';

interface HomePageProps {
  onNavigate: (url: string) => void;
  history: HistoryItem[];
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, history }) => {
  return (
    <div className="flex-1 flex flex-col items-center bg-[#050505] text-white overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="pt-8">
          <HeroSearch onNavigate={onNavigate} />
        </div>

        <div className="flex justify-center">
          <RandomExplore onNavigate={onNavigate} />
        </div>

        <RecentlyVisited history={history} onNavigate={onNavigate} />

        <CategoryGrid onNavigate={onNavigate} />

        <FeatureDiscovery />

        <div className="flex justify-center gap-8 opacity-30 pt-4 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></div>
            <span className="text-[10px] font-mono tracking-widest uppercase">Gemini Flash</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.5)]"></div>
            <span className="text-[10px] font-mono tracking-widest uppercase">Gemini Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]"></div>
            <span className="text-[10px] font-mono tracking-widest uppercase">PlayCanvas</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
