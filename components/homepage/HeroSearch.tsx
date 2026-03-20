import React, { useState, useEffect, useRef } from 'react';
import { normalizeUrl } from '../../utils/urlUtils';
import { HERO_PLACEHOLDERS } from '../../config/suggestions';

interface HeroSearchProps {
  onNavigate: (url: string) => void;
}

const HeroSearch: React.FC<HeroSearchProps> = ({ onNavigate }) => {
  const [inputVal, setInputVal] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const target = HERO_PLACEHOLDERS[placeholderIdx];
    let charIdx = 0;
    let timeout: any;

    if (isTyping) {
      const typeChar = () => {
        if (charIdx <= target.length) {
          setDisplayedPlaceholder(target.slice(0, charIdx));
          charIdx++;
          timeout = setTimeout(typeChar, 40 + Math.random() * 30);
        } else {
          timeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeChar();
    } else {
      const eraseChar = () => {
        const current = target.slice(0, charIdx);
        if (charIdx >= 0) {
          setDisplayedPlaceholder(current);
          charIdx--;
          timeout = setTimeout(eraseChar, 20);
        } else {
          setPlaceholderIdx((prev) => (prev + 1) % HERO_PLACEHOLDERS.length);
          setIsTyping(true);
        }
      };
      charIdx = target.length;
      eraseChar();
    }

    return () => clearTimeout(timeout);
  }, [placeholderIdx, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(inputVal);
    if (!url) return;
    onNavigate(url);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div className="space-y-3 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400">
          InfiniteWeb
        </h1>
        <p className="text-base text-gray-500 font-light leading-relaxed max-w-md mx-auto">
          The generative browser. Type any URL, concept, or idea to bring it to life.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-600 group-focus-within:text-blue-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={displayedPlaceholder || '...'}
          className="w-full bg-white/[0.04] text-white text-base rounded-2xl pl-14 pr-16 py-4 outline-none border border-white/[0.08] focus:border-blue-500/30 focus:bg-white/[0.06] transition-all shadow-[0_0_40px_rgba(0,0,0,0.3)] font-mono tracking-tight placeholder:text-gray-600"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </form>
    </div>
  );
};

export default HeroSearch;
