import { create } from 'zustand';
import { JournalEntry } from '../types';
import { extractAutoTitle, generateAutoTitle, generateJournalInsight } from '../services/geminiService';

interface JournalState {
  entries: JournalEntry[];
  editingEntry: JournalEntry | null;
  isEditorOpen: boolean;
  generatingTitleIds: Record<string, boolean>;
  setGeneratingTitleId: (id: string, isGenerating: boolean) => void;
  generateAiTitleForEntry: (id: string, model?: string) => Promise<string | null>;
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
    lyrics?: string,
    id?: string
  ) => string;
  deleteEntry: (id: string) => void;
  deleteEntries: (ids: string[]) => void;
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
  generatingTitleIds: {},

  setGeneratingTitleId: (id, isGenerating) => {
    set((state) => ({
      generatingTitleIds: {
        ...state.generatingTitleIds,
        [id]: isGenerating,
      },
    }));
  },

  generateAiTitleForEntry: async (id, model = 'gemini-3.8-flash') => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry || !entry.content?.trim()) return null;
    get().setGeneratingTitleId(id, true);
    try {
      const aiTitle = await generateAutoTitle(entry.content, model);
      if (aiTitle) {
        get().renameEntry(id, aiTitle);
        return aiTitle;
      }
    } catch (err) {
      console.warn('Failed AI title generation for entry', id, err);
    } finally {
      get().setGeneratingTitleId(id, false);
    }
    return null;
  },

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

  saveEntry: (content, image, mood, isAutoSave = false, title, model = 'gemini-3.8-flash', scribble, song, lyrics, id) => {
    const { editingEntry, entries, setEntries } = get();
    let entryId = id || editingEntry?.id;
    let isNew = false;
    const computedTitle = title?.trim() || extractAutoTitle(content);
    const resolvedLyrics = lyrics !== undefined ? lyrics : (song?.lyrics || undefined);

    const exists = Boolean(entryId && entries.some((e) => e.id === entryId));

    if (exists && entryId) {
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
      if (!entryId) {
        entryId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
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
    } else if (get().editingEntry) {
      // Keep store's existing editingEntry synced without converting null to non-null
      set((state) => ({
        editingEntry: state.editingEntry ? {
          ...state.editingEntry,
          content,
          title: computedTitle,
          image: image !== undefined ? image : state.editingEntry.image,
          mood: mood !== undefined ? mood : state.editingEntry.mood,
          scribble: scribble !== undefined ? scribble : state.editingEntry.scribble,
          song: song !== undefined ? song : state.editingEntry.song,
          lyrics: resolvedLyrics !== undefined ? resolvedLyrics : state.editingEntry.lyrics,
        } : null
      }));
    }

    // Background Title & Insights generation
    const currentId = entryId!;
    if (content.trim().length >= 10) {
      const existingEntry = entries.find((e) => e.id === currentId);
      const isAutoTitleCandidate = isNew || !title?.trim() || title.trim() === extractAutoTitle(content) || (existingEntry && (!existingEntry.title || existingEntry.title === extractAutoTitle(existingEntry.content)));

      if (isAutoTitleCandidate) {
        get().setGeneratingTitleId(currentId, true);
        generateAutoTitle(content, model)
          .then((aiTitle) => {
            if (aiTitle) {
              get().renameEntry(currentId, aiTitle);
            }
          })
          .catch((e) => console.warn('Auto title generation warning:', e))
          .finally(() => {
            get().setGeneratingTitleId(currentId, false);
          });
      }

      generateJournalInsight(content, model).then((insight) => {
        if (insight) {
          get().setEntries((prev) =>
            prev.map((e) => (e.id === currentId ? { ...e, aiInsight: insight } : e))
          );
        }
      }).catch((e) => console.warn('Insight generation warning:', e));
    }

    return currentId;
  },

  deleteEntry: (id) => {
    get().setEntries((prev) => prev.filter((e) => e.id !== id));
  },

  deleteEntries: (ids) => {
    const idSet = new Set(ids);
    get().setEntries((prev) => prev.filter((e) => !idSet.has(e.id)));
  },

  renameEntry: (id, newTitle) => {
    get().setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, title: newTitle } : e))
    );
    const currentEditing = get().editingEntry;
    if (currentEditing && currentEditing.id === id) {
      set({ editingEntry: { ...currentEditing, title: newTitle } });
    }
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
