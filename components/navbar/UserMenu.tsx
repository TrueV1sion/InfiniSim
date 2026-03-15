import React, { useState, useRef, useEffect } from 'react';

interface UserMenuProps {
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogin, onLogout }) => {
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

  if (!user) {
    return (
      <button
        onClick={onLogin}
        className="px-3.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-gray-300 hover:text-white text-xs font-medium transition-all duration-150 border border-white/5 hover:border-white/10"
        title="Sign In with Google"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-0.5 rounded-full transition-all duration-150 ${
          isOpen
            ? 'ring-2 ring-sky-500/50'
            : 'ring-2 ring-transparent hover:ring-white/20'
        }`}
        title={user.displayName || 'Account'}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-56 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-[100]"
          style={{ animation: 'menuFadeIn 150ms ease-out' }}
        >
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-9 h-9 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user.displayName || 'User'}
                </p>
                {user.email && (
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => { onLogout(); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 group"
            >
              <div className="p-1.5 rounded-lg text-gray-500 group-hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-300 group-hover:text-red-400 transition-colors">Sign Out</p>
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

export default UserMenu;
