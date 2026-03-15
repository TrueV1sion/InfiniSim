import React, { useState, useRef, useEffect } from 'react';
import { getRandomUrl } from '../../utils/suggestions';

interface HeroSectionProps {
  onNavigate: (url: string) => void;
  hasApiKey: boolean;
  onSetupApiKey: () => void;
  userName?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, hasApiKey, onSetupApiKey, userName }) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    onNavigate(trimmed);
    setInputVal('');
  };

  const handleSurprise = () => {
    const url = getRandomUrl();
    onNavigate(url);
  };

  return (
    <div className="flex flex-col items-center text-center pt-8 pb-6 px-4 animate-fadeIn">
      {userName && (
        <p className="text-sm text-white/30 mb-4 tracking-wide">Welcome back, {userName}</p>
      )}

      <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 mb-3 select-none">
        InfiniteWeb
      </h1>
      <p className="text-base text-white/40 font-light mb-8 max-w-md leading-relaxed">
        The browser for the latent space. Type any URL -- real or imaginary -- and watch it materialize.
      </p>

      {!hasApiKey && (
        <button
          onClick={onSetupApiKey}
          className="mb-6 group flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600/15 to-cyan-600/10 border border-blue-500/25 hover:border-blue-400/40 transition-all duration-300"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-white font-medium text-sm">Add your Gemini API key</div>
            <div className="text-white/30 text-xs">Free to get, takes 30 seconds</div>
          </div>
          <svg className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-xl relative group mb-5">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
        <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] group-focus-within:border-white/[0.15] rounded-2xl transition-all duration-300 overflow-hidden">
          <div className="pl-4 pr-2 text-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Enter any URL or describe a website..."
            disabled={!hasApiKey}
            className="flex-1 bg-transparent text-white/90 placeholder:text-white/20 py-4 pr-4 text-base outline-none disabled:opacity-30 disabled:cursor-not-allowed"
          />
          {inputVal.trim() && (
            <button
              type="submit"
              className="mr-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/70 hover:text-white text-sm font-medium transition-all"
            >
              Go
            </button>
          )}
        </div>
      </form>

      <div className={`flex flex-wrap justify-center gap-2 ${!hasApiKey ? 'opacity-30 pointer-events-none' : ''}`}>
        <button
          onClick={handleSurprise}
          disabled={!hasApiKey}
          className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/50 hover:text-white/80 text-xs font-medium transition-all duration-200"
        >
          Surprise Me
        </button>
        <button
          onClick={() => onNavigate('infinite://directory')}
          disabled={!hasApiKey}
          className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/50 hover:text-white/80 text-xs font-medium transition-all duration-200"
        >
          Browse Directory
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
