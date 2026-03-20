import React from 'react';
import { getRandomSuggestion } from '../../config/suggestions';

interface RandomExploreProps {
  onNavigate: (url: string) => void;
}

const RandomExplore: React.FC<RandomExploreProps> = ({ onNavigate }) => {
  const handleClick = () => {
    const suggestion = getRandomSuggestion();
    onNavigate(suggestion.url);
  };

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-sm text-gray-400 hover:text-white"
    >
      <svg className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Random Explore
    </button>
  );
};

export default RandomExplore;
