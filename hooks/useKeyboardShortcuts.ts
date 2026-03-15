import { useEffect } from 'react';

interface ShortcutHandlers {
  onFocusAddressBar: () => void;
  onBookmark: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isMod && e.key === 'l') {
        e.preventDefault();
        handlers.onFocusAddressBar();
        return;
      }

      if (isMod && e.key === 'd') {
        e.preventDefault();
        handlers.onBookmark();
        return;
      }

      if (isMod && e.key === 'r') {
        e.preventDefault();
        handlers.onReload();
        return;
      }

      if (isInput) return;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlers.onBack();
        return;
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handlers.onForward();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
