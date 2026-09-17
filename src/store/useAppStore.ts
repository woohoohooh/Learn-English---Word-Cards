import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, ContentType, WordList, WordStatus } from '../types';

interface AppActions {
  setLists: (type: ContentType, lists: WordList[]) => void;
  updateWordStatus: (listId: string, wordId: string, status: WordStatus) => void;
  setContentType: (type: ContentType) => void;
  setFilters: (level: string, theme: string) => void;
  setVoice: (voice: string) => void;
  resetListProgress: (listId: string) => void;
  setHomeScrollPos: (pos: number) => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      lists: {
        words: [],
        phrases: [],
        sentences: [],
      },
      progress: {},
      selectedContentType: 'words',
      selectedLevel: '',
      selectedTheme: '',
      voice: 'kore',
      isAuthReady: true,
      homeScrollPos: 0,

      setLists: (type, lists) => 
        set((state) => ({
          lists: { ...state.lists, [type]: lists }
        })),

      updateWordStatus: (listId, wordId, status) =>
        set((state) => ({
          progress: { ...state.progress, [`${listId}_${wordId}`]: status }
        })),

      setContentType: (type) => set({ selectedContentType: type }),

      setFilters: (level, theme) => set({ selectedLevel: level, selectedTheme: theme }),

      setVoice: (voice) => set({ voice }),

      setHomeScrollPos: (pos) => set({ homeScrollPos: pos }),

      resetListProgress: (listId) => 
        set((state) => {
          const newProgress = { ...state.progress };
          Object.keys(newProgress).forEach((key) => {
            if (key.startsWith(`${listId}_`)) {
              delete newProgress[key];
            }
          });
          return { progress: newProgress };
        }),
    }),
    {
      name: 'languageek-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Handle migration if needed
        }
        return persistedState as AppState & AppActions;
      },
    }
  )
);
