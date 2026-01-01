
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

// Global Type Definitions for Gemini Studio Bridge
declare global {
  // Fix: Explicitly defining AIStudio to match existing environment expectations
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fix: Adding readonly modifier and using the named AIStudio type to resolve declaration conflicts
    readonly aistudio: AIStudio;
  }
}
