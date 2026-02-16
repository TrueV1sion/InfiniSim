export enum ModelTier {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}

export interface HistoryItem {
  url: string;
  timestamp: number;
}

export interface Bookmark {
  url: string;
  title: string;
  timestamp: number;
}

export interface WebPage {
  url: string;
  content: string; // The full HTML string
  title: string;
  isLoading: boolean;
  error?: string;
  generatedBy: ModelTier;
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