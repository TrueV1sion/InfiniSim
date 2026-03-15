import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserApiKey } from '../supabase';
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
  userHasApiKey: boolean;
  setUserHasApiKey: Dispatch<SetStateAction<boolean>>;
}

export function useFirebaseAuth(
  onDataLoaded: (data: AuthData) => void,
  onApiKeyFound: () => void
): UseFirebaseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userHasApiKey, setUserHasApiKey] = useState(false);

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

          const apiKey = await getUserApiKey(currentUser.uid);
          setUserHasApiKey(!!apiKey);
          if (apiKey) {
            onApiKeyFound();
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return { user, isAuthReady, userHasApiKey, setUserHasApiKey };
}
