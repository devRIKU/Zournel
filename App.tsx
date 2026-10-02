import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Plus, Sparkles, BookOpen } from './components/Icons';
import { Tab, Task, JournalEntry, AppSettings, UserProfile } from './types';
import { ExpressiveDock } from './components/ExpressiveDock';
import { TodoView } from './components/TodoView';
import { getLocalUserId, getSavedGoogleUser } from './services/localIdentity';
import { AutoBackupPill } from './components/AutoBackupPill';
import { useTaskStore } from './store/useTaskStore';
import { useJournalStore } from './store/useJournalStore';
import { SpotlightGlow } from './components/ui/background-beams';
import { ensureFontLoaded } from './utils/fonts';

// Only the Tasks tab is in the boot bundle. Everything else (Milkdown editor, recharts,
// Firebase-heavy profile, AI chat) loads on first use so low-end devices paint fast.
const JournalView = lazy(() => import('./components/JournalView').then(m => ({ default: m.JournalView })));
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const PublicProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.PublicProfileView })));
const JournalEditor = lazy(() => import('./components/JournalEditor').then(m => ({ default: m.JournalEditor })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AiChatbotModal = lazy(() => import('./components/AiChatbotModal').then(m => ({ default: m.AiChatbotModal })));
const ImportModal = lazy(() => import('./components/ImportModal').then(m => ({ default: m.ImportModal })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));

const ViewFallback = () => (
  <div className="w-full max-w-3xl mx-auto animate-pulse" aria-hidden>
    <div className="h-8 w-40 rounded-lg bg-surface-highlight/60 mb-2" />
    <div className="h-3 w-24 rounded bg-surface-highlight/40 mb-8" />
    <div className="space-y-2">
      <div className="h-16 rounded-2xl bg-surface-highlight/30" />
      <div className="h-16 rounded-2xl bg-surface-highlight/30" />
    </div>
  </div>
);

const ALL_THEME_CLASSES = [
  'theme-cozy-light', 'theme-cozy-dark', 'theme-evergreen-light', 'theme-evergreen-dark', 
  'theme-catppuccin-light', 'theme-catppuccin-dark', 'theme-gruvbox-light', 'theme-gruvbox-dark'
];

// Shared 40px round icon button used across the top bar.
const ICON_BUTTON = 'w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-highlight/60 active:scale-95 transition';

export const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TODO);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [focusInputSignal, setFocusInputSignal] = useState(0); 

  // Zustand stores
  const { tasks, addTask, toggleTask, deleteTask, updateTask, setTasks } = useTaskStore();
  const { 
    entries: journalEntries, 
    editingEntry, 
    isEditorOpen, 
    setEditingEntry, 
    setIsEditorOpen, 
    saveEntry: saveJournalEntryStore, 
    deleteEntry: deleteJournalEntryStore, 
    deleteEntries: deleteJournalEntriesStore,
    renameEntry: renameJournalEntryStore, 
    importEntries: handleImportEntriesStore,
    setEntries: setJournalEntries
  } = useJournalStore();
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mf_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      theme: 'cozy-light',
      fontFamily: 'inter',
      headingFontFamily: 'outfit',
      completionAnimation: 'confetti',
      deleteAnimation: 'shrink',
      model: 'gemini-3.5-flash-lite',
      apiKey: ''
    };
  });

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
    } else if (path.startsWith('/p/')) {
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
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const profileData = urlParams.get('profile');
      if (profileData) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(profileData)));
          setPublicProfile(decoded);
        } catch (e) {
          console.error("Failed to parse base64 profile:", e);
        }
      }
      finishRouteLoading();
    }

    setLoaded(true);
  }, []);

  // Firebase auth & cloud state sync
  useEffect(() => {
    if (!loaded) return;
    // Firebase (~670 KB) loads after first paint, not before it.
    let unsubscribe = () => {};
    let cancelled = false;
    Promise.all([import('./services/authService'), import('./services/dbService')]).then(([{ listenToAuthChanges }, { fetchMemoriesFromCloud }]) => {
      if (cancelled) return;
      unsubscribe = listenToAuthChanges(async (googleUser) => {
      if (googleUser) {
        setSettings(prev => ({
          ...prev,
          profile: {
            name: googleUser.displayName || prev.profile?.name || '',
            bio: prev.profile?.bio || '',
            picture: googleUser.photoURL || prev.profile?.picture || '',
            thought: prev.profile?.thought || '',
            sharedEntries: prev.profile?.sharedEntries || [],
            username: prev.profile?.username || ''
          }
        }));

        try {
          const remote = await fetchMemoriesFromCloud(googleUser.uid);
          if (remote) {
            if (remote.entries && Array.isArray(remote.entries) && remote.entries.length > 0) {
              setJournalEntries(prev => {
                const existingIds = new Set(prev.map(e => e.id));
                const newEntries = remote.entries!.filter(e => !existingIds.has(e.id));
                return [...newEntries, ...prev];
              });
            }
            if (remote.config) {
              setSettings(prev => {
                const updated = { ...prev, ...remote.config };
                updated.theme = prev.theme;
                if (prev.fontFamily) updated.fontFamily = prev.fontFamily;
                if (prev.headingFontFamily) updated.headingFontFamily = prev.headingFontFamily;
                return updated;
              });
            }
          }
        } catch (err) {
          console.warn("Auto pull memories failed on Google login:", err);
        }
      }
      });
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [loaded, setJournalEntries]);

  // System theme detection listener
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
      localStorage.setItem('mf_settings', JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const latestDataRef = React.useRef({ journalEntries, settings });
  useEffect(() => {
    latestDataRef.current = { journalEntries, settings };
  }, [journalEntries, settings]);

  // Auto-backup state and cloud sync engine
  const [isAutoBackingUp, setIsAutoBackingUp] = useState(false);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<number | null>(() => {
    return settings.lastAutoBackupTime || null;
  });
  const isBackingUpRef = React.useRef(false);

  const performAutoBackup = React.useCallback(async () => {
    if (!loaded || isBackingUpRef.current) return;
    isBackingUpRef.current = true;
    setIsAutoBackingUp(true);
    try {
      const { journalEntries: currentEntries, settings: currentSettings } = latestDataRef.current;
      const savedUser = getSavedGoogleUser();
      const targetId = savedUser?.uid || getLocalUserId();
      const { syncMemoriesToCloud } = await import('./services/dbService');
      await syncMemoriesToCloud(targetId, currentEntries, {
        googleEmail: savedUser?.email,
        deviceKey: getLocalUserId(),
        config: currentSettings,
        profile: currentSettings.profile
      });
      const now = Date.now();
      setLastAutoBackupTime(now);
    } catch (e) {
      console.warn("Auto-backup failed gracefully:", e);
    } finally {
      isBackingUpRef.current = false;
      setIsAutoBackingUp(false);
    }
  }, [loaded]);

  // Debounced Auto Backup Effect
  useEffect(() => {
    if (!loaded) return;
    if (settings.autoBackupEnabled === false) return;

    localStorage.setItem('mf_auto_backup_snapshot', JSON.stringify({
      timestamp: Date.now(),
      entries: journalEntries,
      settings: settings
    }));

    const intervalMin = settings.autoBackupIntervalMinutes ?? 5;
    if (intervalMin === 0) {
      const timer = setTimeout(() => {
        performAutoBackup();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [journalEntries, settings.profile, settings.autoBackupEnabled, loaded, performAutoBackup]);

  // Periodic Auto-Backup Interval
  useEffect(() => {
    if (!loaded || settings.autoBackupEnabled === false) return;
    const intervalMin = settings.autoBackupIntervalMinutes ?? 5;
    if (intervalMin <= 0) return;

    const intervalMs = intervalMin * 60 * 1000;
    const intervalId = setInterval(() => {
      performAutoBackup();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [loaded, settings.autoBackupEnabled, settings.autoBackupIntervalMinutes, performAutoBackup]);

  // Theme Applier
  useEffect(() => {
    document.documentElement.classList.remove(...ALL_THEME_CLASSES);
    const themeClass = `theme-${settings.theme}`;
    document.documentElement.classList.add(themeClass);
    
    const darkThemes = ['cozy-dark', 'evergreen-dark', 'catppuccin-dark', 'gruvbox-dark'];
    if (darkThemes.includes(settings.theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Font Applier
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
      'syne': "'Syne', sans-serif",
      'playfair': "'Playfair Display', serif",
      'space-grotesk': "'Space Grotesk', sans-serif",
      'outfit': "'Outfit', sans-serif",
      'cormorant': "'Cormorant Garamond', serif",
      'cinzel': "'Cinzel', serif"
    };
    const selectedBodyFont = bodyFontMap[settings.fontFamily || 'inter'] || "'Inter', sans-serif";
    const selectedHeadingFont = headingFontMap[settings.headingFontFamily || 'outfit'] || "'Outfit', sans-serif";

    ensureFontLoaded(settings.fontFamily || 'inter');
    ensureFontLoaded(settings.headingFontFamily || 'outfit');
    document.documentElement.style.setProperty('--font-body', selectedBodyFont);
    document.documentElement.style.setProperty('--font-heading', selectedHeadingFont);
    document.documentElement.setAttribute('data-heading-font', settings.headingFontFamily || 'outfit');
  }, [settings.fontFamily, settings.headingFontFamily]);

  const handlePlusClick = () => {
    if (activeTab === Tab.JOURNAL) {
      setEditingEntry(null);
      setIsEditorOpen(true);
    } else {
      setFocusInputSignal(prev => prev + 1);
    }
  };

  const handleAddDataFromAI = (newTasks: string[], journal: string | null, mood: string | null) => {
    if (newTasks.length > 0) {
       newTasks.forEach(t => addTask(t));
       if (activeTab !== Tab.TODO) setActiveTab(Tab.TODO);
    }
    
    if (journal) {
       saveJournalEntryStore(journal, undefined, mood || undefined, false, undefined, settings.model);
    }
  };

  const saveJournalEntry = (
    content: string, 
    image: string | undefined, 
    mood?: string, 
    isAutoSave?: boolean, 
    title?: string, 
    scribble?: string, 
    song?: JournalEntry['song'],
    lyrics?: string,
    id?: string
  ) => {
    saveJournalEntryStore(content, image, mood, isAutoSave, title, settings.model, scribble, song, lyrics, id);
  };

  if (isRouteLoading) {
    return (
      <div className="min-h-screen bg-surface-lowest text-primary flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
          <span className="text-xs font-mono tracking-wider uppercase text-secondary/60 animate-pulse">Entering Zournel...</span>
        </div>
      </div>
    );
  }

  if (publicProfile) {
    return <Suspense fallback={null}><PublicProfileView profile={publicProfile} /></Suspense>;
  }

  if (!hasEntered) {
    return (
      <Suspense fallback={null}>
        <LandingPage 
          onEnter={() => {
            setHasEntered(true);
            setActiveTab(Tab.TODO);
          }} 
          tasks={tasks} 
          journalEntries={journalEntries} 
        />
      </Suspense>
    );
  }

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-y-contain flex flex-col bg-surface-lowest text-primary font-sans transition-colors duration-200 animate-fade-in paper-texture relative">
      <SpotlightGlow className="opacity-40 pointer-events-none" />
      
      {/* Top bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between border-b border-surface-highlight/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/12 border border-accent/20 text-accent flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" weight="fill" />
          </div>
          <div className="leading-none">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-primary tracking-tight">Zournel</h1>
            <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-secondary/70">Reflect &amp; Execute</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block mr-1">
            <AutoBackupPill
              isBackingUp={isAutoBackingUp}
              lastBackupTime={lastAutoBackupTime}
              autoBackupEnabled={settings.autoBackupEnabled ?? true}
              onManualBackup={performAutoBackup}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
          <button type="button" onClick={() => setIsAddModalOpen(true)} title="AI Companion" aria-label="AI Companion" className={ICON_BUTTON}>
            <Sparkles className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => setIsSettingsOpen(true)} title="Settings" aria-label="Settings" className={ICON_BUTTON}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Zone 2: Flexible Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+7rem)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<ViewFallback />}>
              {activeTab === Tab.TODO && (
                <TodoView 
                  tasks={tasks} 
                  onToggleTask={toggleTask} 
                  onDeleteTask={deleteTask} 
                  onUpdateTask={updateTask}
                  onAddTask={addTask} 
                  onSaveAsMemory={(text) => { saveJournalEntryStore(text, undefined, undefined, false, undefined, settings.model); setActiveTab(Tab.JOURNAL); }}
                  focusInputSignal={focusInputSignal}
                  completionAnim={settings.completionAnimation} 
                  deleteAnim={settings.deleteAnimation}
                  selectedModel={settings.model}
                />
              )}
              {activeTab === Tab.JOURNAL && (
                <JournalView 
                  entries={journalEntries} 
                  onEdit={e => { setEditingEntry(e); setIsEditorOpen(true); }} 
                  onDeleteEntry={deleteJournalEntryStore} 
                  onDeleteEntries={deleteJournalEntriesStore}
                  onRenameEntry={renameJournalEntryStore}
                  onImportClick={() => setIsImportModalOpen(true)}
                  onImportEntries={handleImportEntriesStore}
                  selectedModel={settings.model}
                />
              )}
              {activeTab === Tab.PROFILE && (
                <ProfileView 
                  profile={settings.profile} 
                  journalEntries={journalEntries} 
                  onUpdateProfile={(p) => setSettings(prev => ({...prev, profile: p}))}
                  onOpenImportModal={() => setIsImportModalOpen(true)}
                  onImportEntries={handleImportEntriesStore}
                  settings={settings}
                  onUpdateSettings={setSettings}
                />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating action button — sits one step above the dock on both breakpoints */}
      <div className={`fixed right-4 sm:right-6 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:bottom-24 z-40 transition-all duration-200 ${activeTab === Tab.PROFILE || isEditorOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}>
        <button
          type="button"
          onClick={handlePlusClick}
          title={activeTab === Tab.TODO ? 'Add task' : 'New memory'}
          aria-label={activeTab === Tab.TODO ? 'Add task' : 'New memory'}
          className="w-14 h-14 rounded-full bg-accent text-accent-fg shadow-lg shadow-accent/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" weight="bold" />
        </button>
      </div>

      {!isEditorOpen && <ExpressiveDock activeTab={activeTab} onTabChange={setActiveTab} />}

      {isEditorOpen && (
      <Suspense fallback={null}>
      <JournalEditor 
        key={editingEntry ? editingEntry.id : 'new-entry'}
        isOpen={isEditorOpen} 
        onClose={() => { setIsEditorOpen(false); setEditingEntry(null); }} 
        onSave={saveJournalEntry} 
        onDelete={deleteJournalEntryStore}
        initialId={editingEntry?.id}
        initialTitle={editingEntry?.title}
        initialContent={editingEntry?.content} 
        initialImage={editingEntry?.image} 
        initialMood={editingEntry?.mood}
        initialScribble={editingEntry?.scribble}
        initialSong={editingEntry?.song}
        initialLyrics={editingEntry?.lyrics || editingEntry?.song?.lyrics}
        selectedModel={settings.model} 
      />
      </Suspense>
      )}
      
      {isSettingsOpen && (
      <Suspense fallback={null}>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings} 
      />
      </Suspense>
      )}

      {isAddModalOpen && (
      <Suspense fallback={null}>
      <AiChatbotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddData={handleAddDataFromAI}
        journalEntries={journalEntries}
        userName={settings.profile?.name || ''}
        apiKey={settings.apiKey}
        onUpdateApiKey={(key) => setSettings(prev => ({ ...prev, apiKey: key }))}
      />
      </Suspense>
      )}

      {isImportModalOpen && (
      <Suspense fallback={null}>
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportEntries={handleImportEntriesStore}
        currentDeviceKey={getLocalUserId()}
      />
      </Suspense>
      )}
    </div>
  );
};

export default App;
