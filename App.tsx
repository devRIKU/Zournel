
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Sparkles } from 'lucide-react';
import { Tab, Task, JournalEntry, AppSettings, UserProfile } from './types';
import { BottomNav } from './components/BottomNav';
import { TodoView } from './components/TodoView';
import { JournalView } from './components/JournalView';
import { JournalEditor } from './components/JournalEditor';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingPage } from './components/LandingPage';
import { AddModal } from './components/AddModal';
import { ProfileView, PublicProfileView } from './components/ProfileView';
import { generateJournalInsight, extractTasksFromJournal } from './services/geminiService';

const ALL_THEME_CLASSES = [
  'theme-cozy-light', 'theme-cozy-dark', 'theme-evergreen-light', 'theme-evergreen-dark', 
  'theme-catppuccin-light', 'theme-catppuccin-dark', 'theme-gruvbox-light', 'theme-gruvbox-dark'
];

const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TODO);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [focusInputSignal, setFocusInputSignal] = useState(0); 
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'cozy-light',
    fontFamily: 'inter',
    headingFontFamily: 'outfit',
    completionAnimation: 'confetti',
    deleteAnimation: 'shrink',
    model: 'gemini-3.5-flash-lite',
    apiKey: ''
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);

  const [isPublicRoute] = useState(() => {
    const path = window.location.pathname;
    return path.startsWith('/p/') || path.startsWith('/share/') || new URLSearchParams(window.location.search).has('profile');
  });
  const [isRouteLoading, setIsRouteLoading] = useState(isPublicRoute);

  // Initial load and settings hydration
  useEffect(() => {
    const path = window.location.pathname;
    
    const finishRouteLoading = () => {
      setIsRouteLoading(false);
    };

    // Check for share link (e.g., /share/entry_uuid)
    if (path.startsWith('/share/')) {
      const entryId = path.split('/share/')[1];
      if (entryId) {
        import('./services/dbService').then(({ getSharedEntry }) => {
          getSharedEntry(entryId).then(entry => {
            if (entry) {
              setPublicProfile({ name: 'Shared Memory', bio: '', picture: '', thought: '', sharedEntries: [entry], isSingleEntry: true });
            }
            finishRouteLoading();
          }).catch((err) => {
            console.error("Failed to load shared entry", err);
            finishRouteLoading();
          });
        }).catch((err) => {
          console.error("Failed to load dbService", err);
          finishRouteLoading();
        });
      } else {
        finishRouteLoading();
      }
    }
    
    // Check for public profile (e.g., /p/username)
    else if (path.startsWith('/p/')) {
      const username = path.split('/p/')[1];
      if (username) {
        import('./services/dbService').then(({ getPublicProfile, getSharedEntriesForUsername }) => {
          Promise.all([getPublicProfile(username), getSharedEntriesForUsername(username)]).then(([profile, entries]) => {
            if (profile) {
              setPublicProfile({ ...profile, sharedEntries: entries });
            }
            finishRouteLoading();
          }).catch((err) => {
            console.error("Failed to load public profile", err);
            finishRouteLoading();
          });
        }).catch((err) => {
          console.error("Failed to load dbService", err);
          finishRouteLoading();
        });
      } else {
        finishRouteLoading();
      }
    }

    // Fallback for old base64 encoded URL parameters
    else {
      const urlParams = new URLSearchParams(window.location.search);
      const profileData = urlParams.get('profile');
      if (profileData) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(profileData)));
          setPublicProfile(decoded);
        } catch (e) {
          console.error("Failed to parse public profile", e);
        }
      }
      finishRouteLoading();
    }

    const savedTasks = localStorage.getItem('mf_tasks');
    const savedJournal = localStorage.getItem('mf_journal');
    const savedSettings = localStorage.getItem('mf_settings');
    
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
        const parsedSettings = JSON.parse(savedSettings);
        const validModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemma-4-31b-it'];
        if (!validModels.includes(parsedSettings.model)) {
          parsedSettings.model = 'gemini-3.5-flash-lite';
        }
        
        // Migrate older theme preferences gracefully to new premium options
        const validThemes = ['cozy-light', 'cozy-dark', 'evergreen-light', 'evergreen-dark', 'catppuccin-light', 'catppuccin-dark', 'gruvbox-light', 'gruvbox-dark'];
        if (!validThemes.includes(parsedSettings.theme)) {
          parsedSettings.theme = 'cozy-light';
        }
        
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (e) {
        console.error("Failed to parse settings", e);
        setShowOnboarding(true);
      }
    } else {
      setShowOnboarding(true);
    }
    setLoaded(true);
  }, []);

  // System theme detection listener (only if user hasn't set a custom theme scheme, auto-switches default cozy theme)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (['cozy-light', 'cozy-dark'].includes(settings.theme)) {
        setSettings(prev => ({ ...prev, theme: e.matches ? 'cozy-dark' : 'cozy-light' }));
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

  // Theme Applier
  useEffect(() => {
    document.documentElement.classList.remove(...ALL_THEME_CLASSES);
    const themeClass = `theme-${settings.theme}`;
    document.documentElement.classList.add(themeClass);
    
    // Also toggle dark mode attribute for Tailwind
    const darkThemes = ['cozy-dark', 'evergreen-dark', 'catppuccin-dark', 'gruvbox-dark'];
    if (darkThemes.includes(settings.theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Font Applier (Body & Heading fonts updated dynamically)
  useEffect(() => {
    const bodyFontMap: Record<string, string> = {
      'inter': "'Inter', sans-serif",
      'plus-jakarta': "'Plus Jakarta Sans', sans-serif",
      'lora': "'Lora', serif",
      'merriweather': "'Merriweather', serif",
      'space-grotesk': "'Space Grotesk', sans-serif",
      'jetbrains-mono': "'JetBrains Mono', monospace"
    };
    const headingFontMap: Record<string, string> = {
      'syncopate': "'Syncopate', sans-serif",
      'playfair': "'Playfair Display', serif",
      'space-grotesk': "'Space Grotesk', sans-serif",
      'outfit': "'Outfit', sans-serif",
      'cormorant': "'Cormorant Garamond', serif",
      'cinzel': "'Cinzel', serif"
    };
    const selectedBodyFont = bodyFontMap[settings.fontFamily || 'inter'] || "'Inter', sans-serif";
    const selectedHeadingFont = headingFontMap[settings.headingFontFamily || 'outfit'] || "'Outfit', sans-serif";
    document.documentElement.style.setProperty('--font-body', selectedBodyFont);
    document.documentElement.style.setProperty('--font-heading', selectedHeadingFont);
  }, [settings.fontFamily, settings.headingFontFamily]);

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

  const handleAddDataFromAI = (newTasks: string[], journal: string | null, mood: string | null) => {
    if (newTasks.length > 0) {
       const taskObjects = newTasks.map(t => ({
          id: Math.random().toString(36).substr(2, 9),
          text: t,
          completed: false,
          priority: 'medium' as const,
          createdAt: Date.now(),
          aiAnalysis: 'AI Generated'
       }));
       setTasks(prev => [...taskObjects, ...prev]);
       if (activeTab !== Tab.TODO) setActiveTab(Tab.TODO);
    }
    
    if (journal) {
       const entryId = Math.random().toString(36).substr(2, 9);
       const newEntry: JournalEntry = {
          id: entryId,
          content: journal,
          mood: mood || undefined,
          createdAt: Date.now(),
          aiInsight: mood ? `Feeling ${mood}` : undefined
       };
       setJournalEntries(prev => [newEntry, ...prev]);
       // Generate better insight in background
       generateJournalInsight(journal, settings.model).then(insight => {
         if (insight) setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, aiInsight: insight } : e));
       });
    }
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  };

  const saveJournalEntry = (content: string, image: string | undefined, mood?: string, isAutoSave?: boolean) => {
    let entryId = editingEntry?.id;
    let isNew = false;
    
    if (entryId) {
      setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, content, image, mood: mood !== undefined ? mood : e.mood } : e));
    } else {
      isNew = true;
      entryId = Math.random().toString(36).substr(2, 9);
      const newEntry: JournalEntry = { id: entryId, content, image, mood, createdAt: Date.now(), tasksExtracted: false };
      setJournalEntries(prev => [newEntry, ...prev]);
      if (isAutoSave) {
        setEditingEntry(newEntry);
      }
    }

    if (entryId && !isAutoSave) {
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
    if (!isAutoSave) {
      setEditingEntry(null);
    }
  };

  if (isRouteLoading) {
    return (
      <div className="min-h-screen bg-bg text-primary flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
          <span className="text-xs font-grotesk tracking-[0.2em] uppercase text-secondary/60 animate-pulse">Entering Sanctuary...</span>
        </div>
      </div>
    );
  }

  if (publicProfile) {
    return <PublicProfileView profile={publicProfile} />;
  }

  if (!hasEntered) {
    return <LandingPage onEnter={() => setHasEntered(true)} tasks={tasks} journalEntries={journalEntries} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-primary font-sans transition-colors duration-500 animate-fade-in">
      <header className="pt-12 px-8 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary">Zournel</h1>
          <span className="text-accent italic font-grotesk text-sm">Reflect & Execute</span>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsAddModalOpen(true)} title="AI Brain Dump" className="p-3 rounded-full hover:bg-surface-highlight transition-all active:scale-90 text-accent">
            <Sparkles className="w-6 h-6" />
           </button>
           <button onClick={() => setIsSettingsOpen(true)} title="Preferences & Themes" className="p-3 rounded-full hover:bg-surface-highlight transition-all active:scale-90">
            <Settings className="w-6 h-6" />
           </button>
        </div>
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
           <JournalView entries={journalEntries} onEdit={e => {setEditingEntry(e); setIsEditorOpen(true);}} onDeleteEntry={deleteJournalEntry} />
        </div>
        <div className={`transition-all duration-300 ${activeTab === Tab.PROFILE ? 'opacity-100' : 'opacity-0 absolute top-0 w-full pointer-events-none'}`}>
           <ProfileView profile={settings.profile} journalEntries={journalEntries} onUpdateProfile={(p) => setSettings(prev => ({...prev, profile: p}))} />
        </div>
      </main>
      <div className={`fixed bottom-24 right-6 z-50 transition-opacity duration-300 ${activeTab === Tab.PROFILE ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={handlePlusClick} title={activeTab === Tab.TODO ? "Add new task" : "Write new memory"} className="w-16 h-16 bg-accent text-accent-fg rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"><Plus className="w-8 h-8" /></button>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <JournalEditor 
        key={editingEntry ? editingEntry.id : 'new-entry'}
        isOpen={isEditorOpen} 
        onClose={() => {setIsEditorOpen(false); setEditingEntry(null);}} 
        onSave={saveJournalEntry} 
        onDelete={deleteJournalEntry}
        initialId={editingEntry?.id}
        initialContent={editingEntry?.content} 
        initialImage={editingEntry?.image} 
        initialMood={editingEntry?.mood}
        selectedModel={settings.model} 
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings} 
      />

      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddData={handleAddDataFromAI}
      />

      {showOnboarding && (
        <OnboardingModal 
          onSave={(key) => {
            setSettings(prev => ({ ...prev, apiKey: key }));
            setShowOnboarding(false);
          }} 
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

export default App;
