import React from 'react';

interface NavigationControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  currentUrl: string;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onHome: () => void;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  canGoBack,
  canGoForward,
  isLoading,
  currentUrl,
  onBack,
  onForward,
  onReload,
  onStop,
  onHome,
}) => {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onBack}
        disabled={!canGoBack || isLoading}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
        aria-label="Back"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward || isLoading}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
        aria-label="Forward"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isLoading ? (
        <button
          onClick={onStop}
          className="p-2 rounded-lg hover:bg-white/5 transition-all active:scale-95 text-red-500"
          aria-label="Stop"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onReload}
          disabled={!currentUrl}
          className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
          aria-label="Reload"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
      <button
        onClick={onHome}
        className="p-2 rounded-lg hover:bg-white/5 transition-all active:scale-95 ml-0.5"
        aria-label="Home"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>
  );
};

export default NavigationControls;
