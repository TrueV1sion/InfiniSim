import React from 'react';

interface UserMenuProps {
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogin, onLogout }) => {
  if (user) {
    return (
      <button
        onClick={onLogout}
        className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all flex items-center gap-2"
        title="Sign Out"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onLogin}
      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold transition-all tracking-wide"
      title="Sign In with Google"
    >
      Sign In
    </button>
  );
};

export default UserMenu;
