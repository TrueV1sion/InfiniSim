import React from 'react';
import { motion } from 'motion/react';

const SUGGESTIONS = [
  { url: "cyberpunk-arena-3d.play", label: "3D Cyberpunk Arena", icon: "G", color: "from-blue-500 to-cyan-500" },
  { url: "mars-colony-dashboard.org", label: "Mars Base Control", icon: "M", color: "from-orange-500 to-red-500" },
  { url: "interdimensional-travel-agency.com", label: "Travel Agency", icon: "T", color: "from-teal-500 to-emerald-500" },
  { url: "retro-90s-geocities.net", label: "90s Personal Site", icon: "R", color: "from-yellow-500 to-amber-500" },
  { url: "quantum-weather-forecast.io", label: "Quantum Weather", icon: "Q", color: "from-sky-500 to-blue-500" },
  { url: "ai-civilization-simulator.gov", label: "Civ Sim Dashboard", icon: "C", color: "from-green-500 to-teal-500" }
];

interface EmptyStateProps {
  onNavigate: (url: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-white p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-2xl w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="space-y-4"
        >
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
            InfiniteWeb
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 font-light leading-relaxed">
            The browser for the latent space. <br className="hidden sm:block" />
            Powered by Gemini 3.0 & PlayCanvas Architect.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-left"
        >
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s.url}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(s.url)}
              className="group p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/15 transition-all duration-300 flex items-center justify-between shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white font-bold text-sm opacity-80 group-hover:opacity-100 transition-opacity`}>
                  {s.icon}
                </div>
                <div>
                  <div className="font-mono text-[10px] text-blue-400/60 mb-1 uppercase tracking-widest">{s.url}</div>
                  <div className="font-medium text-gray-100 text-base sm:text-lg">{s.label}</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="pt-8 sm:pt-12 flex flex-wrap justify-center gap-4 sm:gap-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-xs font-mono tracking-widest uppercase">Gemini Flash</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
            <span className="text-xs font-mono tracking-widest uppercase">Gemini Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="text-xs font-mono tracking-widest uppercase">PlayCanvas</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-xs text-gray-600 font-mono"
        >
          Press Ctrl+K to open command palette
        </motion.p>
      </div>
    </div>
  );
};

export default EmptyState;
