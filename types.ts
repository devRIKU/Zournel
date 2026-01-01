

export enum Tab {
  TODO = 'TODO',
  JOURNAL = 'JOURNAL'
}

export type Theme = 'light' | 'dawn' | 'paper' | 'midnight' | 'obsidian' | 'terminal';

export type CompletionAnimation = 'none' | 'confetti' | 'bounce' | 'slide-right';
export type DeleteAnimation = 'none' | 'shrink' | 'slide-left';

export type Priority = 'high' | 'medium' | 'low';

export interface AppSettings {
  theme: Theme;
  completionAnimation: CompletionAnimation;
  deleteAnimation: DeleteAnimation;
  model: string;
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
    // Fixed error: All declarations of 'aistudio' must have identical modifiers.
    aistudio: AIStudio;
  }
}
