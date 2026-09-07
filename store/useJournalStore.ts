import { create } from 'zustand';
import { JournalEntry } from '../types';
import { extractAutoTitle, generateAutoTitle, generateJournalInsight } from '../services/geminiService';

interface JournalState {
  entries: JournalEntry[];
  editingEntry: JournalEntry | null;
  isEditorOpen: boolean;
  setEditingEntry: (entry: JournalEntry | null) => void;
  setIsEditorOpen: (open: boolean) => void;
  setEntries: (entries: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => void;
  saveEntry: (
    content: string, 
    image?: string, 
    mood?: string, 
    isAutoSave?: boolean, 
    title?: string, 
    model?: string,
    scribble?: string,
    song?: JournalEntry['song'],
    lyrics?: string
  ) => void;
  deleteEntry: (id: string) => void;
  renameEntry: (id: string, newTitle: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  importEntries: (newEntries: JournalEntry[], replace?: boolean) => void;
}

const getInitialEntries = (): JournalEntry[] => {
  try {
    const saved = localStorage.getItem('mf_journal');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved journal entries', e);
  }
  return [];
};

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: getInitialEntries(),
  editingEntry: null,
  isEditorOpen: false,

  setEditingEntry: (entry) => set({ editingEntry: entry }),
  setIsEditorOpen: (open) => set({ isEditorOpen: open }),

  setEntries: (updater) => {
    set((state) => {
      const nextEntries = typeof updater === 'function' ? updater(state.entries) : updater;
      try {
        localStorage.setItem('mf_journal', JSON.stringify(nextEntries));
      } catch (e) {
        console.error('Failed to save journal to localStorage', e);
      }
      return { entries: nextEntries };
    });
  },

  saveEntry: (content, image, mood, isAutoSave = false, title, model = 'gemini-3.5-flash-lite', scribble, song, lyrics) => {
    const { editingEntry, entries, setEntries } = get();
    let entryId = editingEntry?.id;
    let isNew = false;
    const computedTitle = title?.trim() || extractAutoTitle(content);
    const resolvedLyrics = lyrics !== undefined ? lyrics : (song?.lyrics || undefined);

    if (entryId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                content,
                image: image !== undefined ? image : e.image,
                title: computedTitle,
                mood: mood !== undefined ? mood : e.mood,
                scribble: scribble !== undefined ? scribble : e.scribble,
                song: song !== undefined ? song : e.song,
                lyrics: resolvedLyrics !== undefined ? resolvedLyrics : e.lyrics,
              }
            : e
        )
      );
    } else {
      isNew = true;
      entryId = crypto.randomUUID
        ? crypto.randomUUID()
        : `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newEntry: JournalEntry = {
        id: entryId,
        content,
        title: computedTitle,
        image,
        mood,
        scribble,
        song,
        lyrics: resolvedLyrics,
        createdAt: Date.now(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    }

    if (!isAutoSave) {
      set({ isEditorOpen: false, editingEntry: null });
    }

    // Background Title & Insights generation
    const currentId = entryId;
    if (content.trim().length > 30) {
      if (isNew || !title?.trim()) {
        generateAutoTitle(content, model).then((aiTitle) => {
          if (aiTitle) {
            get().renameEntry(currentId, aiTitle);
          }
        });
      }
      generateJournalInsight(content, model).then((insight) => {
        if (insight) {
          get().setEntries((prev) =>
            prev.map((e) => (e.id === currentId ? { ...e, aiInsight: insight } : e))
          );
        }
      });
    }
  },

  deleteEntry: (id) => {
    get().setEntries((prev) => prev.filter((e) => e.id !== id));
  },

  renameEntry: (id, newTitle) => {
    get().setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e))
    );
  },

  updateEntry: (updatedEntry) => {
    get().setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
    );
  },

  importEntries: (newEntries, replace = false) => {
    if (replace) {
      get().setEntries(newEntries);
    } else {
      get().setEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const filteredNew = newEntries.filter((e) => !existingIds.has(e.id));
        return [...filteredNew, ...prev];
      });
    }
  },
}));
