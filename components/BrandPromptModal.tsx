import { useState, useEffect, useRef } from 'react';

interface BrandPromptModalProps {
  isOpen: boolean;
  brandDomain: string;
  onSubmit: (preference: string) => void;
  onSkip: () => void;
}

export default function BrandPromptModal({ isOpen, brandDomain, onSubmit, onSkip }: BrandPromptModalProps) {
  const [preference, setPreference] = useState('');
  const [remember, setRemember] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPreference('');
      setRemember(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const text = preference.trim();
    if (remember && text) {
      try {
        const stored = JSON.parse(localStorage.getItem('infiniteWeb_brandPrefs') || '{}');
        stored[brandDomain] = text;
        localStorage.setItem('infiniteWeb_brandPrefs', JSON.stringify(stored));
      } catch {}
    }
    onSubmit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onSkip();
    }
  };

  const displayDomain = brandDomain.replace(/^www\./, '');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div
        className="relative w-full max-w-md mx-4"
        style={{ animation: 'brandModalIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes brandModalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Recognized Site</h2>
                  <p className="text-sm text-white/40">{displayDomain}</p>
                </div>
              </div>
              <button
                onClick={onSkip}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-white/60 mb-4 leading-relaxed">
              Any specific details you'd like for this version? (e.g. "dark mode", "show trending topics", "holiday theme")
            </p>

            <textarea
              ref={inputRef}
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Optional: describe your preferences..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all text-sm resize-none"
            />

            <label className="flex items-center gap-2.5 mt-3 mb-4 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                  remember
                    ? 'bg-sky-500 border-sky-500'
                    : 'border-white/20 group-hover:border-white/40'
                }`}
                onClick={() => setRemember(!remember)}
              >
                {remember && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className="text-xs text-white/40 group-hover:text-white/60 transition-colors"
                onClick={() => setRemember(!remember)}
              >
                Remember for this domain
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
