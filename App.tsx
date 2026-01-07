import React, { useState, useEffect } from 'react';
import { Settings, Plus, Sparkles, Key, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';
import { Tab, Task, JournalEntry, AppSettings, Theme } from './types';
import { BottomNav } from './components/BottomNav';
import { TodoView } from './components/TodoView';
import { JournalView } from './components/JournalView';
import { JournalEditor } from './components/JournalEditor';
import { SettingsModal } from './components/SettingsModal';
import { generateJournalInsight, extractTasksFromJournal } from './services/geminiService';

const ALL_THEME_CLASSES = [
  'theme-light', 'theme-nord', 'theme-cyberpunk', 'theme-botanist', 
  'theme-glass', 'theme-midnight', 'theme-synthwave', 'theme-solarized', 'theme-material'
];

const STORAGE_KEY_API = 'zournel_api_key';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TODO);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusInputSignal, setFocusInputSignal] = useState(0); 
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  
  // API Key State
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    completionAnimation: 'confetti',
    deleteAnimation: 'shrink',
    model: 'gemini-3-flash-preview'
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load and settings hydration
  useEffect(() => {
    const savedTasks = localStorage.getItem('mf_tasks');
    const savedJournal = localStorage.getItem('mf_journal');
    const savedSettings = localStorage.getItem('mf_settings');
    
    // Check for API Key in Local Storage or Env
    const storedKey = localStorage.getItem(STORAGE_KEY_API);
    const envKey = process.env.API_KEY;
    
    if (storedKey || (envKey && envKey.length > 0)) {
      setHasKey(true);
    }

    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }

    if (savedJournal) {
      try {
        setJournalEntries(JSON.parse(savedJournal));
      } catch (e) {
        console.error("Failed to parse journal", e);
      }
    }
    
    if (savedSettings) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    } else {
      // Auto-detect theme on first run
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSettings(prev => ({ ...prev, theme: isDarkMode ? 'midnight' : 'light' }));
    }
    setLoaded(true);
  }, []);

  // System theme detection listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if the user is on light or midnight (the "default" dark)
      if (settings.theme === 'light' || settings.theme === 'midnight') {
        setSettings(prev => ({ ...prev, theme: e.matches ? 'midnight' : 'light' }));
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  // Persist settings
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('mf_tasks', JSON.stringify(tasks));
      localStorage.setItem('mf_journal', JSON.stringify(journalEntries));
      localStorage.setItem('mf_settings', JSON.stringify(settings));
    }
  }, [tasks, journalEntries, settings, loaded]);

  // Theme Applier - FIXED STICKINESS
  useEffect(() => {
    document.documentElement.classList.remove(...ALL_THEME_CLASSES);
    const themeClass = `theme-${settings.theme}`;
    document.documentElement.classList.add(themeClass);
    
    // Also toggle dark mode attribute for Tailwind
    if (['midnight', 'nord', 'cyberpunk', 'synthwave'].includes(settings.theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem(STORAGE_KEY_API, tempApiKey.trim());
      setHasKey(true);
    }
  };

  const handlePlusClick = () => {
    if (activeTab === Tab.JOURNAL) {
      setEditingEntry(null);
      setIsEditorOpen(true);
    } else {
      setFocusInputSignal(prev => prev + 1);
    }
  };

  const addTask = (text: string) => {
    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        completed: false,
        priority: 'medium',
        createdAt: Date.now()
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const saveJournalEntry = (content: string, image: string | undefined) => {
    let entryId = editingEntry?.id;
    let isNew = false;
    
    if (entryId) {
      setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, content, image } : e));
    } else {
      isNew = true;
      entryId = Math.random().toString(36).substr(2, 9);
      const newEntry: JournalEntry = { id: entryId, content, image, createdAt: Date.now(), tasksExtracted: false };
      setJournalEntries(prev => [newEntry, ...prev]);
    }

    if (entryId && hasKey) {
        generateJournalInsight(content, settings.model).then(insight => {
            if (insight) setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, aiInsight: insight } : e));
        });

        const entry = journalEntries.find(e => e.id === entryId);
        if (isNew || (entry && !entry.tasksExtracted)) {
            extractTasksFromJournal(content, settings.model).then(newAIItems => {
                if (newAIItems?.length > 0) {
                    const tasksToAdd = newAIItems.map(item => ({
                        id: Math.random().toString(36).substr(2, 9),
                        text: item.text,
                        priority: item.priority,
                        completed: false,
                        createdAt: Date.now(),
                        aiAnalysis: "Extracted from your memory"
                    }));
                    setTasks(prev => [...tasksToAdd, ...prev]);
                    setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, tasksExtracted: true } : e));
                }
            });
        }
    }
    setEditingEntry(null);
  };

  // Callback passed to Settings to allow removing the key
  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    // Re-check key status
    const storedKey = localStorage.getItem(STORAGE_KEY_API);
    const envKey = process.env.API_KEY;
    if (!storedKey && (!envKey || envKey.length === 0)) {
        setHasKey(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-bg text-primary transition-colors duration-500 overflow-y-auto">
        <div className="max-w-md w-full text-center space-y-8 animate-scale-in my-auto">
          <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-accent/5">
            <Sparkles className="w-10 h-10 text-accent" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-5xl font-display font-bold text-primary tracking-tight">Zournel</h1>
            <p className="text-secondary font-sans font-medium">Your intelligent companion for thoughts and tasks.</p>
          </div>

          <div className="bg-surface p-8 rounded-[2rem] border border-surface-highlight shadow-2xl space-y-6 text-left">
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-secondary ml-1">Google Gemini API Key</label>
                <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/50 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="password"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Paste your key here (AIza...)"
                        className="w-full bg-surface-highlight/50 border border-surface-highlight focus:border-accent outline-none rounded-xl py-4 pl-12 pr-4 text-sm font-mono transition-all placeholder:text-secondary/30"
                    />
                </div>
            </div>

            <button 
                onClick={handleSaveApiKey}
                disabled={!tempApiKey.trim()}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${!tempApiKey.trim() ? 'bg-surface-highlight text-secondary cursor-not-allowed opacity-50' : 'bg-accent text-accent-fg hover:bg-accent/90'}`}
            >
              <span>Initialize App</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-surface-highlight/50">
               <div className="flex gap-3 items-start p-3 bg-surface-highlight/30 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-secondary leading-relaxed">
                     <span className="font-bold">Privacy Note:</span> Your API key is stored locally on your device and is never sent to our servers.
                  </p>
               </div>
            </div>

            <div className="text-center">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
                  Get a free Gemini API Key <ExternalLink className="w-3 h-3" />
                </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-primary font-sans transition-colors duration-500">
      <header className="pt-12 px-8 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary">Zournel</h1>
          <span className="text-accent italic font-grotesk text-sm">Reflect & Execute</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} title="Preferences & Themes" className="p-3 rounded-full hover:bg-surface-highlight transition-all active:scale-90">
          <Settings className="w-6 h-6" />
        </button>
      </header>
      <main className="relative flex-grow min-h-[80vh] w-full max-w-4xl mx-auto">
        <div className={`transition-all duration-300 ${activeTab === Tab.TODO ? 'opacity-100' : 'opacity-0 absolute top-0 w-full pointer-events-none'}`}>
           <TodoView 
              tasks={tasks} onToggleTask={t => setTasks(prev => prev.map(tk => tk.id === t ? {...tk, completed: !tk.completed} : tk))} 
              onDeleteTask={t => setTasks(prev => prev.filter(tk => tk.id !== t))} 
              onUpdateTask={t => setTasks(prev => prev.map(tk => tk.id === t.id ? t : tk))}
              onAddTask={addTask} focusInputSignal={focusInputSignal}
              completionAnim={settings.completionAnimation} deleteAnim={settings.deleteAnimation}
              selectedModel={settings.model}
            />
        </div>
        <div className={`transition-all duration-300 ${activeTab === Tab.JOURNAL ? 'opacity-100' : 'opacity-0 absolute top-0 w-full pointer-events-none'}`}>
           <JournalView entries={journalEntries} onEdit={e => {setEditingEntry(e); setIsEditorOpen(true);}} />
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50">
        <button onClick={handlePlusClick} title={activeTab === Tab.TODO ? "Add new task" : "Write new memory"} className="w-16 h-16 bg-accent text-accent-fg rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"><Plus className="w-8 h-8" /></button>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <JournalEditor 
        key={editingEntry ? editingEntry.id : 'new-entry'}
        isOpen={isEditorOpen} 
        onClose={() => {setIsEditorOpen(false); setEditingEntry(null);}} 
        onSave={saveJournalEntry} 
        initialId={editingEntry?.id}
        initialContent={editingEntry?.content} 
        initialImage={editingEntry?.image} 
        selectedModel={settings.model} 
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} settings={settings} onUpdateSettings={setSettings} />
    </div>
  );
};

export default App;