export type ContentType = 'words' | 'phrases' | 'sentences';
export type WordStatus = 'new' | 'review' | 'known';

export interface WordItem {
  id: string;
  english: string;
  russian: string;
  translation?: string;
  audio?: string[];
  status?: WordStatus;
}

export interface WordList {
  id: string;
  name: string;
  theme: string;
  level: string;
  type: ContentType;
  items: WordItem[];
  fullPath?: string;
}

export interface UserStats {
  totalLearned: number;
  streak: number;
  lastActive: string;
}

export interface AppState {
  lists: Record<ContentType, WordList[]>;
  progress: Record<string, WordStatus>; // key: listId_wordId
  selectedContentType: ContentType;
  selectedLevel: string;
  selectedTheme: string;
  voice: string;
  isAuthReady: boolean;
  homeScrollPos: number;
}
