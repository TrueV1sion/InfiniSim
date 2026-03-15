import React from 'react';

const SUGGESTIONS = [
  { url: "amazon-quantum.shop", label: "Quantum E-Commerce", icon: "🛒" },
  { url: "nexus-social-feed.net", label: "Holographic Social Media", icon: "🌐" },
  { url: "global-news-stream.live", label: "Real-time News Portal", icon: "📰" },
  { url: "cyberpunk-arena-3d.play", label: "3D Cyberpunk Arena", icon: "🎮" },
  { url: "mars-colony-dashboard.org", label: "Mars Base Control", icon: "🚀" },
  { url: "ai-civilization-simulator.gov", label: "Civ Sim Dashboard", icon: "🤖" }
];

interface EmptyStateProps {
    onNavigate: (url: string) => void;
    hasApiKey?: boolean;
    onSetupApiKey?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onNavigate, hasApiKey, onSetupApiKey }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-white p-8 overflow-y-auto">
        <div className="max-w-2xl w-full text-center space-y-8">
            <div className="space-y-4">
                <h1 className="text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                    InfiniteWeb
                </h1>
                <p className="text-xl text-gray-400 font-light leading-relaxed">
                    The browser for the latent space. <br/>
                    Powered by Gemini 3.0 & PlayCanvas Architect.
                </p>
            </div>

            {!hasApiKey && (
              <div className="mx-auto max-w-md">
                <button
                  onClick={onSetupApiKey}
                  className="w-full group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold text-base">Add your Gemini API key</div>
                      <div className="text-white/40 text-sm">Free to get, takes 30 seconds</div>
                    </div>
                    <svg className="w-5 h-5 text-blue-400/60 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-left ${!hasApiKey ? 'opacity-40 pointer-events-none' : ''}`}>
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s.url}
                        onClick={() => onNavigate(s.url)}
                        disabled={!hasApiKey}
                        className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-500 flex items-center justify-between shadow-lg hover:shadow-blue-500/10 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-300">{s.icon}</span>
                            <div>
                                <div className="font-mono text-[10px] text-blue-400/80 mb-1 uppercase tracking-widest">{s.url}</div>
                                <div className="font-medium text-gray-100 text-lg">{s.label}</div>
                            </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                ))}
            </div>

            <div className="pt-12 flex justify-center gap-8 opacity-40">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-xs font-mono tracking-widest uppercase">Gemini 3.0 Flash</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                    <span className="text-xs font-mono tracking-widest uppercase">Gemini 3.0 Pro</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                    <span className="text-xs font-mono tracking-widest uppercase">PlayCanvas Engine</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default EmptyState;
