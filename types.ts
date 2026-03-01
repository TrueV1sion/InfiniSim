export enum ModelTier {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface HistoryItem {
  id?: string;
  url: string;
  timestamp: number;
  thumbnail?: string;
}

export interface Bookmark {
  id?: string;
  url: string;
  title: string;
  timestamp: number;
  thumbnail?: string;
}

export interface WebPage {
  url: string;
  content: string;
  title: string;
  isLoading: boolean;
  error?: string;
  generatedBy: ModelTier;
}

export interface CachedPage {
  id?: string;
  url: string;
  content: string;
  model: ModelTier;
  deep_research: boolean;
  created_at: number;
}

export interface GenerationConfig {
  model: ModelTier;
  deepResearch: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type NavigationAction =
  | { type: 'NAVIGATE'; url: string }
  | { type: 'BACK' }
  | { type: 'FORWARD' }
  | { type: 'RELOAD' }
  | { type: 'SET_MODEL'; model: ModelTier }
  | { type: 'TOGGLE_RESEARCH' };
