
export enum Tab {
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

export interface AppSettings {
  theme: Theme;
  fontFamily?: string;
  completionAnimation: CompletionAnimation;
  deleteAnimation: DeleteAnimation;
  model: string;
  apiKey: string;
  profile?: UserProfile;
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
}

export interface AIProcessedInput {
  tasks: string[];
  journalContent: string | null;
  mood: string | null;
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
