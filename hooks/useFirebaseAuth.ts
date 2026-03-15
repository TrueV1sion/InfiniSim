import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { HistoryItem, Bookmark, DownloadItem } from '../types';

interface AuthData {
  history?: HistoryItem[];
  bookmarks?: Bookmark[];
  downloads?: DownloadItem[];
  virtualState?: any;
}

interface UseFirebaseAuthResult {
  user: User | null;
  isAuthReady: boolean;
}

export function useFirebaseAuth(
  onDataLoaded: (data: AuthData) => void
): UseFirebaseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            onDataLoaded({
              history: data.history,
              bookmarks: data.bookmarks,
              downloads: data.downloads,
              virtualState: data.virtualState,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return { user, isAuthReady };
}
