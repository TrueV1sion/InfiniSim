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

export type BrowserEra = '1990' | '1995' | '1999' | '2001' | '2005' | '2010' | '2015' | '2020' | '2025' | '2030' | '2035' | 'default';

export interface HistoryItem {
  url: string;
  timestamp: number;
}

export interface Bookmark {
  url: string;
  title: string;
  timestamp: number;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  timestamp: number;
  size?: number;
  status: 'completed' | 'failed' | 'downloading';
  blobUrl?: string;
}

export interface WebPage {
  url: string;
  content: string; // The full HTML string
  title: string;
  isLoading: boolean;
  error?: string;
  generatedBy: ModelTier;
  webContainerUrl?: string;
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