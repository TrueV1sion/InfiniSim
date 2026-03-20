import React, { useState, useEffect } from 'react';

interface Tip {
  title: string;
  description: string;
  example?: string;
}

const TIPS: Tip[] = [
  {
    title: 'Deep Research Mode',
    description: 'Enable in the toolbar for multi-agent generation: a Designer creates the UI, then an Engineer wires the logic.',
  },
  {
    title: 'WebContainer Apps',
    description: 'Prefix URLs with wc:// to generate full-stack Node.js/React apps that run entirely in your browser.',
    example: 'wc://react-todo-app',
  },
  {
    title: 'Browser Era Simulation',
    description: 'Use the era selector to generate sites styled like any period from 1990 to 2035.',
  },
  {
    title: 'InfiniteAPI',
    description: 'Generated pages can fetch live data, store persistent state, and show notifications via the InfiniteAPI bridge.',
  },
  {
    title: 'Voice Copilot',
    description: 'Click the floating microphone to chat with an AI copilot that can navigate, scroll, and read pages for you.',
  },
  {
    title: 'AI Image Generation',
    description: 'Pages can include AI-generated images and videos using data-ai-prompt attributes on media tags.',
  },
  {
    title: 'Architect Console',
    description: 'Open DevTools to edit generated source code, chat with an AI architect, or refine designs with natural language.',
  },
];

const FeatureDiscovery: React.FC = () => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[currentTip];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-300 mb-0.5">{tip.title}</div>
          <div className="text-[11px] text-gray-500 leading-relaxed">{tip.description}</div>
          {tip.example && (
            <code className="text-[10px] text-cyan-500 font-mono mt-1 block">{tip.example}</code>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTip(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentTip ? 'bg-blue-400 w-3' : 'bg-gray-700 hover:bg-gray-600'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureDiscovery;
