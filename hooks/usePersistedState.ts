import { useState, useEffect, Dispatch, SetStateAction } from 'react';

const STORAGE_PREFIX = 'infiniteWeb_';

export function usePersistedState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Local storage error:', e);
    }
  }, [key, value]);

  return [value, setValue];
}
