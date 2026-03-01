import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem, Bookmark, WebPage, ModelTier } from '../types';

interface NavigationState {
  history: HistoryItem[];
  bookmarks: Bookmark[];
  historyIndex: number;
  currentUrl: string;
  pageData: WebPage | null;
  loading: boolean;
  model: ModelTier;
  deepResearch: boolean;
  isRefining: boolean;
  hasKey: boolean;
  isHistoryOpen: boolean;
  isDevToolsOpen: boolean;
  isCommandPaletteOpen: boolean;

  setHistory: (history: HistoryItem[]) => void;
  pushHistory: (item: HistoryItem) => void;
  setHistoryIndex: (index: number) => void;
  setCurrentUrl: (url: string) => void;
  setPageData: (page: WebPage | null) => void;
  setLoading: (loading: boolean) => void;
  setModel: (model: ModelTier) => void;
  setDeepResearch: (deep: boolean) => void;
  setIsRefining: (refining: boolean) => void;
  setHasKey: (hasKey: boolean) => void;
  setIsHistoryOpen: (open: boolean) => void;
  setIsDevToolsOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;

  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  clearHistory: () => void;
  clearBookmarks: () => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      history: [],
      bookmarks: [],
      historyIndex: -1,
      currentUrl: '',
      pageData: null,
      loading: false,
      model: ModelTier.FLASH,
      deepResearch: false,
      isRefining: false,
      hasKey: true,
      isHistoryOpen: false,
      isDevToolsOpen: false,
      isCommandPaletteOpen: false,

      setHistory: (history) => set({ history }),
      pushHistory: (item) => {
        const { history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(item);
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },
      setHistoryIndex: (historyIndex) => set({ historyIndex }),
      setCurrentUrl: (currentUrl) => set({ currentUrl }),
      setPageData: (pageData) => set({ pageData }),
      setLoading: (loading) => set({ loading }),
      setModel: (model) => set({ model }),
      setDeepResearch: (deepResearch) => set({ deepResearch }),
      setIsRefining: (isRefining) => set({ isRefining }),
      setHasKey: (hasKey) => set({ hasKey }),
      setIsHistoryOpen: (isHistoryOpen) => set({ isHistoryOpen }),
      setIsDevToolsOpen: (isDevToolsOpen) => set({ isDevToolsOpen }),
      setIsCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),

      addBookmark: (bookmark) => set((state) => ({
        bookmarks: [...state.bookmarks, bookmark]
      })),
      removeBookmark: (url) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.url !== url)
      })),
      isBookmarked: (url) => get().bookmarks.some(b => b.url === url),
      clearHistory: () => set({ history: [], historyIndex: -1, currentUrl: '', pageData: null }),
      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    {
      name: 'infiniteWeb_navigation',
      partialize: (state) => ({
        history: state.history,
        bookmarks: state.bookmarks,
        historyIndex: state.historyIndex,
        currentUrl: state.currentUrl,
        model: state.model,
        deepResearch: state.deepResearch,
      }),
    }
  )
);
