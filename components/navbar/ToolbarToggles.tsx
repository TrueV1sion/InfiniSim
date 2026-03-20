import React from 'react';

interface ToolbarTogglesProps {
  isDeepResearch: boolean;
  isSoundEnabled: boolean;
  onToggleDeepResearch: () => void;
  onToggleSound: () => void;
}

const ToolbarToggles: React.FC<ToolbarTogglesProps> = ({
  isDeepResearch,
  isSoundEnabled,
  onToggleDeepResearch,
  onToggleSound,
}) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onToggleSound}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-[10px] font-bold tracking-wider uppercase border ${
          isSoundEnabled
            ? 'bg-sky-600/15 border-sky-500/40 text-sky-400'
            : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400 hover:bg-white/5'
        }`}
        title="Enable audio and music generation"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        Audio
      </button>
      <button
        onClick={onToggleDeepResearch}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-[10px] font-bold tracking-wider uppercase border ${
          isDeepResearch
            ? 'bg-amber-600/15 border-amber-500/40 text-amber-400'
            : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400 hover:bg-white/5'
        }`}
        title="Deep Research mode (multi-agent, slower)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
        Deep
      </button>
    </div>
  );
};

export default ToolbarToggles;
