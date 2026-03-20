import React from 'react';
import { CATEGORY_META, getSuggestionsByCategory, SuggestionCategory, Suggestion } from '../../config/suggestions';

interface CategoryGridProps {
  onNavigate: (url: string) => void;
}

const CATEGORY_ORDER: SuggestionCategory[] = ['apps', 'connected', 'experiences', 'creative', 'webcontainer'];

const FEATURE_COLORS: Record<string, string> = {
  'InfiniteAPI': 'text-cyan-400 bg-cyan-500/10',
  '3D': 'text-orange-400 bg-orange-500/10',
  'Audio': 'text-pink-400 bg-pink-500/10',
  'WebContainer': 'text-emerald-400 bg-emerald-500/10',
  'Dashboard': 'text-blue-400 bg-blue-500/10',
  'VR': 'text-teal-400 bg-teal-500/10',
};

const SuggestionCard: React.FC<{ suggestion: Suggestion; onNavigate: (url: string) => void }> = ({ suggestion, onNavigate }) => {
  return (
    <button
      onClick={() => onNavigate(suggestion.url)}
      className="flex-shrink-0 w-56 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 text-left group"
    >
      <div className="flex items-start justify-between mb-2.5">
        <span className="text-xl grayscale group-hover:grayscale-0 transition-all duration-300">{suggestion.icon}</span>
        <svg className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-all transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
      </div>
      <div className="font-medium text-gray-200 text-sm mb-1 group-hover:text-white transition-colors">{suggestion.label}</div>
      <div className="text-[11px] text-gray-600 leading-relaxed mb-2.5 line-clamp-2">{suggestion.description}</div>
      <div className="font-mono text-[9px] text-gray-700 truncate mb-2">{suggestion.url}</div>
      {suggestion.features && suggestion.features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestion.features.map((f) => (
            <span key={f} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${FEATURE_COLORS[f] || 'text-gray-400 bg-white/5'}`}>
              {f}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

const CategoryGrid: React.FC<CategoryGridProps> = ({ onNavigate }) => {
  return (
    <div className="w-full space-y-6">
      {CATEGORY_ORDER.map((catKey) => {
        const meta = CATEGORY_META[catKey];
        const items = getSuggestionsByCategory(catKey);
        if (items.length === 0) return null;

        return (
          <div key={catKey}>
            <div className="flex items-baseline gap-2 mb-3 px-1">
              <h3 className="text-sm font-semibold text-gray-300">{meta.label}</h3>
              <span className="text-[11px] text-gray-600">{meta.description}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {items.map((s) => (
                <SuggestionCard key={s.url} suggestion={s} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryGrid;
