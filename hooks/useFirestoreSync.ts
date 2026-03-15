import { useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HistoryItem, Bookmark, DownloadItem } from '../types';

interface SyncData {
  history: HistoryItem[];
  bookmarks: Bookmark[];
  downloads: DownloadItem[];
  virtualState: any;
}

export function useFirestoreSync(
  user: User | null,
  isAuthReady: boolean,
  data: SyncData
) {
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          history: data.history,
          bookmarks: data.bookmarks,
          downloads: data.downloads,
          virtualState: data.virtualState,
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (error) {
        console.error('Error syncing to Firestore:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data.history, data.bookmarks, data.downloads, data.virtualState, user, isAuthReady]);
}
