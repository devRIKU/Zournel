import React, { useState, useEffect } from 'react';
import { Settings, Plus, Sparkles, Key, ExternalLink } from 'lucide-react';
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
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    completionAnimation: 'confetti',
    deleteAnimation: 'shrink'
  });

  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for environments without the studio bridge
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success per instructions
    }
  };

  // Load data & settings
  useEffect(() => {
    const savedTasks = localStorage.getItem('mf_tasks');
    const savedJournal = localStorage.getItem('mf_journal');
    const savedSettings = localStorage.getItem('mf_settings');
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    
    setLoaded(true);
  }, []);

  // Save data & settings
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('mf_tasks', JSON.stringify(tasks));
      localStorage.setItem('mf_journal', JSON.stringify(journalEntries));
      localStorage.setItem('mf_settings', JSON.stringify(settings));
    }
  }, [tasks, journalEntries, settings, loaded]);

  // Apply Theme
  useEffect(() => {
    const themes = ['theme-light', 'theme-midnight', 'theme-dawn', 'theme-paper', 'theme-obsidian', 'theme-terminal'];
    document.body.classList.remove(...themes);
    if (settings.theme) {
      document.body.classList.add(`theme-${settings.theme}`);
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

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setIsEditorOpen(true);
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
      const newEntry: JournalEntry = {
        id: entryId,
        content,
        image,
        createdAt: Date.now(),
      };
      setJournalEntries(prev => [newEntry, ...prev]);
    }

    if (entryId && hasKey) {
        generateJournalInsight(content).then(insight => {
            if (insight) {
              setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, aiInsight: insight } : e));
            }
        });

        extractTasksFromJournal(content).then(newAIItems => {
            if (newAIItems && newAIItems.length > 0) {
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

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  // Connection Gate Overlay
  if (hasKey === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-bg text-primary transition-colors duration-500">
        <div className="max-w-md w-full text-center space-y-8 animate-scale-in">
          <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-accent" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold">Welcome to Zournel</h1>
            <p className="text-secondary font-sans leading-relaxed">
              To activate intelligent task extraction, reflective insights, and artistic covers, please connect your Gemini API Key.
            </p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={handleOpenKeyDialog}
              className="w-full py-4 bg-accent text-accent-fg rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Key className="w-5 h-5" />
              Connect Gemini API
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-grotesk text-secondary hover:text-accent transition-colors"
            >
              Learn about billing & API keys <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-primary font-sans transition-colors duration-500">
      
      {/* Header */}
      <header className="pt-12 px-8 pb-6 flex justify-between items-start">
        <div>
           <h1 className="text-4xl leading-tight font-display font-bold text-primary">
            Zournel<br/>
           </h1>
           <span className="text-accent italic font-grotesk text-sm">Reflect & Execute</span>
        </div>
        
        {/* Settings Button (Top Right) */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 rounded-full hover:bg-surface-highlight text-primary transition-all duration-300"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-grow min-h-[80vh] w-full max-w-4xl mx-auto">
        <div className={`transition-all duration-500 ease-in-out ${activeTab === Tab.TODO ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute top-0 w-full pointer-events-none'}`}>
           <TodoView 
              tasks={tasks} 
              onToggleTask={toggleTask} 
              onDeleteTask={deleteTask} 
              onUpdateTask={updateTask}
              onAddTask={addTask}
              focusInputSignal={focusInputSignal}
              completionAnim={settings.completionAnimation}
              deleteAnim={settings.deleteAnimation}
            />
        </div>
        <div className={`transition-all duration-500 ease-in-out ${activeTab === Tab.JOURNAL ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 absolute top-0 w-full pointer-events-none'}`}>
           <JournalView 
            entries={journalEntries} 
            onEdit={handleEditEntry}
           />
        </div>
      </main>

      <div className="fixed bottom-24 right-6 z-50">
        <button 
          onClick={handlePlusClick}
          className="w-16 h-16 bg-accent text-accent-fg rounded-full shadow-2xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300 hover:shadow-accent/40"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <JournalEditor 
        isOpen={isEditorOpen} 
        onClose={() => { setIsEditorOpen(false); setEditingEntry(null); }}
        onSave={saveJournalEntry}
        initialContent={editingEntry?.content}
        initialImage={editingEntry?.image}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
      
    </div>
  );
};

export default App;