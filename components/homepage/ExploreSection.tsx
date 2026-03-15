import React, { useMemo } from 'react';
import { getRandomSuggestions, Suggestion } from '../../utils/suggestions';

interface ExploreSectionProps {
  onNavigate: (url: string) => void;
  disabled: boolean;
}

const ExploreSection: React.FC<ExploreSectionProps> = ({ onNavigate, disabled }) => {
  const suggestions = useMemo(() => getRandomSuggestions(6), []);

  return (
    <div className={`animate-fadeInUp animation-delay-500 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <h2 className="text-xs font-medium text-white/30 uppercase tracking-widest mb-4 px-1">Explore the Latent Web</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((s: Suggestion) => (
          <button
            key={s.url}
            onClick={() => onNavigate(s.url)}
            disabled={disabled}
            className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all duration-300 text-left relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }}
            />

            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  color: s.accent,
                  backgroundColor: `${s.accent}15`,
                }}
              >
                {s.category}
              </span>
            </div>

            <div className="text-sm text-white/70 group-hover:text-white/90 font-medium mb-1 transition-colors">
              {s.label}
            </div>
            <div className="text-xs text-white/25 leading-relaxed mb-3">
              {s.description}
            </div>
            <div className="text-[10px] text-white/15 font-mono flex items-center gap-2">
              <span>{s.url}</span>
              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExploreSection;
