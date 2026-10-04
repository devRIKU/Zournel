
export enum Tab {
  SANCTUARY = 'SANCTUARY',
  TODO = 'TODO',
  JOURNAL = 'JOURNAL',
  PROFILE = 'PROFILE'
}

export type Theme = 'cozy-light' | 'cozy-dark' | 'evergreen-light' | 'evergreen-dark' | 'catppuccin-light' | 'catppuccin-dark' | 'gruvbox-light' | 'gruvbox-dark';

export type CompletionAnimation = 'none' | 'confetti' | 'bounce' | 'slide-right';
export type DeleteAnimation = 'none' | 'shrink' | 'slide-left';

export type Priority = 'high' | 'medium' | 'low';

export interface UserProfile {
  name: string;
  bio: string;
  picture: string; 
  thought: string;
  sharedEntries?: JournalEntry[];
  username?: string;
  isSingleEntry?: boolean;
}

export type ModelTier = 'ember' | 'lantern' | 'beacon';
export type AiProvider = 'gemini' | 'openrouter';
export type DecisionProvider = 'zen' | 'openrouter';

/** One tier = a provider plus whatever model id that provider understands. */
export interface ModelSlot {
  provider: AiProvider;
  model: string;
}

export interface AppSettings {
  theme: Theme;
  fontFamily?: string;
  headingFontFamily?: string;
  completionAnimation: CompletionAnimation;
  deleteAnimation: DeleteAnimation;
  /** @deprecated — the active tier + `modelTiers` replaced this. Kept only to migrate existing devices. */
  model: string;
  apiKey: string;
  /** Which tier the app uses by default. */
  activeTier?: ModelTier;
  modelTiers?: Record<ModelTier, ModelSlot>;
  openrouterApiKey?: string;
  decisionProvider?: DecisionProvider;
  /** Decision model id — e.g. `inception/mercury-decide:free` or `jev-1.13-free`. */
  decisionModel?: string;
  /** OpenCode Zen key — enables Jev (fast structured decisions: mood, priority, intent). */
  opencodeApiKey?: string;
  profile?: UserProfile;
  autoBackupEnabled?: boolean;
  autoBackupIntervalMinutes?: number;
  lastAutoBackupTime?: number;
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  priority: Priority;
  subtasks?: SubTask[];
  aiAnalysis?: string; 
  /** Set by Jev when priority was predicted rather than chosen. */
  predicted?: { priorityConfidence: number; isCompound: number };
}

export interface AttachedSong {
  title: string;
  artist?: string;
  url?: string;
  album?: string;
  coverArt?: string;
  previewUrl?: string;
  lyrics?: string;
  favoriteExcerpt?: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number;
  title?: string;
  mood?: string;
  image?: string; 
  aiInsight?: string; 
  tags?: string[];
  tasksExtracted?: boolean;
  scribble?: string;
  song?: AttachedSong;
  lyrics?: string;
  /** Bidirectional links to other JournalEntry IDs. */
  linkedEntryIds?: string[];
  /** Bidirectional links to Task IDs. */
  linkedTaskIds?: string[];
}

export interface AIProcessedInput {
  tasks: string[];
  journalContent: string | null;
  mood: string | null;
}

export interface AiMemory {
  id: string;
  category: 'core_fact' | 'preference' | 'goal' | 'relationship' | 'theme';
  text: string;
  createdAt: number;
  source?: 'manual' | 'learned';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string | Date;
  extractedTasks?: string[];
  extractedJournal?: string | null;
  extractedMood?: string | null;
  retrievedMemoriesCount?: number;
  referencedMemories?: Array<{
    title: string;
    date: string;
    snippet: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
