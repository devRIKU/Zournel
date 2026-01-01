import React, { useState, useEffect } from 'react';
import { Settings, Plus, Sparkles, Key, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';
import { Tab, Task, JournalEntry, AppSettings } from './types';
import { BottomNav } from './components/BottomNav';
import { TodoView } from './components/TodoView';
import { JournalView } from './components/JournalView';
import { JournalEditor } from './components/JournalEditor';
import { SettingsModal } from './components/SettingsModal';
import { generateJournalInsight, extractTasksFromJournal } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TODO);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusInputSignal, setFocusInputSignal] = useState(0); 
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isStudioEnv, setIsStudioEnv] = useState(false);
  const [manualKey, setManualKey] = useState('');
  
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    completionAnimation: 'confetti',
    deleteAnimation: 'shrink',
    model: 'gemini-3-pro-preview'
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        setIsStudioEnv(true);
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          if (selected) {
            setHasKey(true);
            return;
          }
        } catch (e) {}
      } else {
        setIsStudioEnv(false);
      }

      if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
        setHasKey(true);
        return;
      }

      const cookieMatch = document.cookie.match(/GEMINI_API_KEY=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) {
        setHasKey(true);
        return;
      }

      setHasKey(false);
    };
    checkKey();
  }, []);

  const handleSaveManualKey = () => {
    if (manualKey.trim()) {
      document.cookie = `GEMINI_API_KEY=${manualKey.trim()};path=/;max-age=31536000`;
      setHasKey(true);
    }
  };

  const handleOpenKeyDialog = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); 
    }
  };

  useEffect(() => {
    const savedTasks = localStorage.getItem('mf_tasks');
    const savedJournal = localStorage.getItem('mf_journal');
    const savedSettings = localStorage.getItem('mf_settings');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
    if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('mf_tasks', JSON.stringify(tasks));
      localStorage.setItem('mf_journal', JSON.stringify(journalEntries));
      localStorage.setItem('mf_settings', JSON.stringify(settings));
    }
  }, [tasks, journalEntries, settings, loaded]);

  useEffect(() => {
    // Correctly apply the current theme class to HTML element for full propagation
    const themeClasses = ['theme-light', 'theme-nord', 'theme-cyberpunk', 'theme-botanist', 'theme-glass', 'theme-midnight'];
    document.documentElement.classList.remove(...themeClasses);
    if (settings.theme && settings.theme !== 'light') {
      document.documentElement.classList.add(`theme-${settings.theme}`);
    } else {
      document.documentElement.classList.add('theme-light');
    }
  }, [settings.theme]);

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
    if (entryId) {
      setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, content, image } : e));
    } else {
      entryId = Math.random().toString(36).substr(2, 9);
      const newEntry: JournalEntry = { id: entryId, content, image, createdAt: Date.now() };
      setJournalEntries(prev => [newEntry, ...prev]);
    }

    if (entryId && hasKey) {
        generateJournalInsight(content, settings.model).then(insight => {
            if (insight) setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, aiInsight: insight } : e));
        });
        extractTasksFromJournal(content, settings.model).then(newAIItems => {
            if (newAIItems?.length > 0) {
                const tasksToAdd = newAIItems.map(item => ({
                    id: Math.random().toString(36).substr(2, 9),
                    text: item.text,
                    priority: item.priority,
                    completed: false,
                    createdAt: Date.now(),
                    aiAnalysis: "Generated from Journal"
                }));
                setTasks(prev => [...tasksToAdd, ...prev]);
            }
        });
    }
    setEditingEntry(null);
  };

  if (hasKey === false) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-bg text-primary transition-colors duration-500 overflow-hidden">
        <div className="max-w-md w-full text-center space-y-8 animate-scale-in">
          <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-accent" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold">Zournel</h1>
            <p className="text-secondary font-sans leading-relaxed">
              Unlock intelligent planning and artistic journaling by connecting your Gemini API Key.
            </p>
          </div>

          <div className="bg-surface p-6 rounded-[2rem] border border-surface-highlight shadow-xl space-y-6">
            {isStudioEnv ? (
              <button 
                type="button"
                onClick={handleOpenKeyDialog}
                className="w-full py-4 bg-accent text-accent-fg rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-accent/20 transition-all cursor-pointer active:scale-95"
              >
                <Key className="w-5 h-5" />
                Select Project Key
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="password"
                    placeholder="Enter your Gemini API Key"
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    className="w-full px-5 py-4 bg-bg border-2 border-surface-highlight focus:border-accent rounded-2xl outline-none text-primary transition-all font-mono text-sm"
                  />
                  <button 
                    onClick={handleSaveManualKey}
                    disabled={!manualKey.trim()}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-accent text-accent-fg rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-start gap-2 px-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <p className="text-[11px] text-secondary text-left italic leading-tight">
                    Disclaimer: API keys are not stored by us. They are kept locally in your browser's cookies.
                  </p>
                </div>
              </div>
            )}
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-grotesk text-secondary hover:text-accent transition-colors"
            >
              Learn about API keys & billing <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-primary font-sans transition-colors duration-500">
      <header className="pt-12 px-8 pb-6 flex justify-between items-start">
        <div>
           <h1 className="text-4xl leading-tight font-display font-bold text-primary">Zournel</h1>
           <span className="text-accent italic font-grotesk text-sm">Reflect & Execute</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-full hover:bg-surface-highlight text-primary transition-all">
          <Settings className="w-6 h-6" />
        </button>
      </header>
      <main className="relative flex-grow min-h-[80vh] w-full max-w-4xl mx-auto">
        <div className={`transition-all duration-500 ${activeTab === Tab.TODO ? 'opacity-100' : 'opacity-0 absolute top-0 w-full pointer-events-none'}`}>
           <TodoView 
              tasks={tasks} onToggleTask={t => setTasks(prev => prev.map(tk => tk.id === t ? {...tk, completed: !tk.completed} : tk))} 
              onDeleteTask={t => setTasks(prev => prev.filter(tk => tk.id !== t))} 
              onUpdateTask={t => setTasks(prev => prev.map(tk => tk.id === t.id ? t : tk))}
              onAddTask={addTask} focusInputSignal={focusInputSignal}
              completionAnim={settings.completionAnimation} deleteAnim={settings.deleteAnimation}
              selectedModel={settings.model}
            />
        </div>
        <div className={`transition-all duration-500 ${activeTab === Tab.JOURNAL ? 'opacity-100' : 'opacity-0 absolute top-0 w-full pointer-events-none'}`}>
           <JournalView entries={journalEntries} onEdit={e => {setEditingEntry(e); setIsEditorOpen(true);}} />
        </div>
      </main>
      <div className="fixed bottom-24 right-6 z-50">
        <button onClick={handlePlusClick} className="w-16 h-16 bg-accent text-accent-fg rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <Plus className="w-8 h-8" />
        </button>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <JournalEditor isOpen={isEditorOpen} onClose={() => {setIsEditorOpen(false); setEditingEntry(null);}} onSave={saveJournalEntry} initialContent={editingEntry?.content} initialImage={editingEntry?.image} selectedModel={settings.model} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} />
    </div>
  );
};

export default App;