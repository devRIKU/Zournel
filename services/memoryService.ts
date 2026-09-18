import { AiMemory, JournalEntry } from '../types';

const STORAGE_KEY = 'zournel_ai_memories';

const DEFAULT_MEMORIES: Omit<AiMemory, 'id' | 'createdAt'>[] = [
  {
    category: 'preference',
    text: 'Values reflective, thoughtful conversations with deep empathy and no clinical robotic jargon.',
    source: 'manual'
  },
  {
    category: 'goal',
    text: 'Developing mindful daily journaling habits and balancing creative pursuits with personal calm.',
    source: 'manual'
  }
];

export const getStoredMemories = (): AiMemory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded: AiMemory[] = DEFAULT_MEMORIES.map((m, idx) => ({
        ...m,
        id: `mem_seed_${idx}_${Date.now()}`,
        createdAt: Date.now() - (idx * 86400000)
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse AI memories:', e);
    return [];
  }
};

export const saveStoredMemories = (memories: AiMemory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to save AI memories:', e);
  }
};

export const addMemory = (
  text: string, 
  category: AiMemory['category'] = 'core_fact', 
  source: 'manual' | 'learned' = 'manual'
): AiMemory => {
  const current = getStoredMemories();
  const newMemory: AiMemory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    text: text.trim(),
    category,
    createdAt: Date.now(),
    source
  };
  const updated = [newMemory, ...current];
  saveStoredMemories(updated);
  return newMemory;
};

export const deleteMemory = (id: string): AiMemory[] => {
  const current = getStoredMemories();
  const updated = current.filter(m => m.id !== id);
  saveStoredMemories(updated);
  return updated;
};

export const updateMemory = (
  id: string, 
  text: string, 
  category: AiMemory['category']
): AiMemory[] => {
  const current = getStoredMemories();
  const updated = current.map(m => m.id === id ? { ...m, text: text.trim(), category } : m);
  saveStoredMemories(updated);
  return updated;
};

// Common English stop words to filter out for keyword search
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface RetrievedContextResult {
  formattedContext: string;
  referencedMemories: Array<{
    title: string;
    date: string;
    snippet: string;
    id: string;
  }>;
  retrievedCount: number;
}

/**
 * Intelligent RAG Memory Retrieval Engine:
 * Analyzes the user's latest query + recent conversation to select ONLY relevant entries,
 * preventing massive token dumps and noisy hallucinations.
 */
export const retrieveOptimizedContext = ({
  query,
  recentHistory = [],
  journalEntries = [],
  maxEntries = 4
}: {
  query: string;
  recentHistory?: string[];
  journalEntries: JournalEntry[];
  maxEntries?: number;
}): RetrievedContextResult => {
  const explicitMemories = getStoredMemories();

  // Combine query with recent user queries for broader contextual relevance
  const combinedText = [query, ...recentHistory.slice(-2)].join(' ').toLowerCase();

  // Extract search tokens
  const rawTokens = combinedText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const uniqueTokens = Array.from(new Set(rawTokens));

  // If no journal entries exist, return just explicit memories
  if (journalEntries.length === 0) {
    const explicitSection = explicitMemories.length > 0
      ? `--- CORE PERSONAL KNOWLEDGE & MEMORIES ---\n${explicitMemories.map(m => `• [${m.category.toUpperCase()}]: ${m.text}`).join('\n')}\n`
      : '';
    return {
      formattedContext: explicitSection || 'No prior journal memories available.',
      referencedMemories: [],
      retrievedCount: 0
    };
  }

  // Score each journal entry
  const now = Date.now();
  const scoredEntries = journalEntries.map(entry => {
    let score = 0;
    const contentLower = (entry.content || '').toLowerCase();
    const titleLower = (entry.title || '').toLowerCase();
    const moodLower = (entry.mood || '').toLowerCase();
    const tagsLower = (entry.tags || []).join(' ').toLowerCase();

    // Check token matches
    for (const token of uniqueTokens) {
      if (titleLower.includes(token)) score += 6;
      if (moodLower.includes(token)) score += 4;
      if (tagsLower.includes(token)) score += 4;
      if (contentLower.includes(token)) score += 2;
    }

    // Recency weight: Entries within the last 7 days get a recency boost
    const ageDays = (now - entry.createdAt) / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) score += 2.5;
    else if (ageDays <= 7) score += 1.5;
    else if (ageDays <= 30) score += 0.5;

    return { entry, score };
  });

  // Sort descending by score
  scoredEntries.sort((a, b) => b.score - a.score);

  // Filter top relevant entries
  let selected = scoredEntries
    .filter(item => item.score > 1.5)
    .slice(0, maxEntries)
    .map(item => item.entry);

  // If no specific topic matches were found (e.g. general greeting or open chat),
  // fallback to the 2 most recent entries to provide immediate freshness without overload
  if (selected.length === 0) {
    selected = [...journalEntries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2);
  }

  // Build concise snippets rather than massive walls of text
  const referencedMemories = selected.map(entry => {
    const dateStr = new Date(entry.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const title = entry.title || (entry.content.slice(0, 32).trim() + '...');
    
    // Extract a focused snippet around the first matching keyword, or first 160 chars
    let snippet = entry.content.slice(0, 180).trim();
    if (uniqueTokens.length > 0) {
      for (const token of uniqueTokens) {
        const idx = entry.content.toLowerCase().indexOf(token);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(entry.content.length, idx + 140);
          snippet = (start > 0 ? '...' : '') + entry.content.slice(start, end).trim() + (end < entry.content.length ? '...' : '');
          break;
        }
      }
    }

    return {
      id: entry.id,
      title,
      date: dateStr,
      snippet
    };
  });

  // Build formatted context
  const explicitSection = explicitMemories.length > 0
    ? `--- CORE PERSONAL KNOWLEDGE & MEMORIES (${explicitMemories.length} saved) ---\n${explicitMemories.map(m => `• [${m.category.toUpperCase()}]: ${m.text}`).join('\n')}\n`
    : '';

  const journalSection = selected.length > 0
    ? `--- RELEVANT JOURNAL MEMORIES (${selected.length} of ${journalEntries.length} entries indexed) ---\n` +
      selected.map(e => {
        const dateStr = new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const moodStr = e.mood ? ` | Mood: ${e.mood}` : '';
        const titleStr = e.title ? ` | Title: ${e.title}` : '';
        const preview = e.content.length > 250 ? e.content.slice(0, 250) + '...' : e.content;
        return `• [${dateStr}${moodStr}${titleStr}]: "${preview.replace(/\n+/g, ' ')}"`;
      }).join('\n')
    : 'No relevant past journal memories matched this query.';

  return {
    formattedContext: `${explicitSection}\n${journalSection}`,
    referencedMemories,
    retrievedCount: selected.length
  };
};
