import React, { useState, useRef, useEffect } from 'react';
import { ModelTier } from '../../types';
import { DeviceType } from '../BrowserViewport';

interface OverflowMenuProps {
  model: ModelTier;
  onSetModel: (model: ModelTier) => void;
  deviceType: DeviceType;
  onSetDeviceType: (deviceType: DeviceType) => void;
  isDeepResearch: boolean;
  onToggleDeepResearch: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  onPublish: () => void;
  canPublish: boolean;
  onOpenApiKeySettings?: () => void;
  hasApiKey?: boolean;
  onNavigateDirectory: () => void;
}

const deviceOptions: { type: DeviceType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'desktop',
    label: 'Desktop',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'tablet',
    label: 'Tablet',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'mobile',
    label: 'Mobile',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'vr',
    label: 'VR',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
  {
    type: 'ar',
    label: 'AR',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

const OverflowMenu: React.FC<OverflowMenuProps> = ({
  model,
  onSetModel,
  deviceType,
  onSetDeviceType,
  isDeepResearch,
  onToggleDeepResearch,
  isSoundEnabled,
  onToggleSound,
  onPublish,
  canPublish,
  onOpenApiKeySettings,
  hasApiKey,
  onNavigateDirectory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all duration-150 ${
          isOpen
            ? 'bg-white/10 text-white'
            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
        }`}
        aria-label="More options"
        title="More options"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-72 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2"
          style={{ animation: 'menuFadeIn 150ms ease-out' }}
        >
          <div className="p-3 border-b border-white/5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-2">Model</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => { onSetModel(ModelTier.FLASH); }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  model === ModelTier.FLASH
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                Flash
              </button>
              <button
                onClick={() => { onSetModel(ModelTier.PRO); }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
                  model === ModelTier.PRO
                    ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                Pro
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-current rounded-full animate-pulse" />
                  <span className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                </span>
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-white/5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-2">Viewport</p>
            <div className="flex gap-1">
              {deviceOptions.map((d) => (
                <button
                  key={d.type}
                  onClick={() => { onSetDeviceType(d.type); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-150 ${
                    deviceType === d.type
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                  title={d.label}
                >
                  {d.icon}
                  <span className="text-[9px] font-medium">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-1.5 border-b border-white/5">
            <button
              onClick={() => { onToggleDeepResearch(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-colors ${isDeepResearch ? 'bg-amber-500/15 text-amber-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-gray-200">Deep Research</p>
                  <p className="text-[10px] text-gray-500">Higher quality, slower generation</p>
                </div>
              </div>
              <div className={`w-8 h-[18px] rounded-full transition-all duration-200 relative ${isDeepResearch ? 'bg-amber-500' : 'bg-white/10'}`}>
                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200 ${isDeepResearch ? 'left-[16px]' : 'left-[2px]'}`} />
              </div>
            </button>

            <button
              onClick={() => { onToggleSound(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-colors ${isSoundEnabled ? 'bg-sky-500/15 text-sky-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-gray-200">Audio & Music</p>
                  <p className="text-[10px] text-gray-500">Enable page sound effects</p>
                </div>
              </div>
              <div className={`w-8 h-[18px] rounded-full transition-all duration-200 relative ${isSoundEnabled ? 'bg-sky-500' : 'bg-white/10'}`}>
                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all duration-200 ${isSoundEnabled ? 'left-[16px]' : 'left-[2px]'}`} />
              </div>
            </button>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => { onNavigateDirectory(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
            >
              <div className="p-1.5 rounded-lg text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-xs font-medium text-gray-200">Browse Directory</p>
            </button>

            {canPublish && (
              <button
                onClick={() => { onPublish(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
              >
                <div className="p-1.5 rounded-lg text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <p className="text-xs font-medium text-gray-200">Publish to Directory</p>
              </button>
            )}

            <button
              onClick={() => { onOpenApiKeySettings?.(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
            >
              <div className={`p-1.5 rounded-lg transition-colors ${!hasApiKey ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500 group-hover:text-gray-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-200">API Key</p>
                {!hasApiKey && <p className="text-[10px] text-amber-400">Not configured</p>}
              </div>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default OverflowMenu;
