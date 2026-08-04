import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, JournalEntry, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Copy, Check, Share, ExternalLink, User, Key, Eye, EyeOff, 
  Sparkles, Lock, Globe, Calendar, ArrowRight, Heart, Cloud, Compass,
  MessageSquare, Edit3, Shield, BookOpen, Layers, Zap, X, Upload, Download,
  CloudUpload, CloudDownload, LogOut, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  getLocalUserId, setLocalUserId, signInWithGoogleAccount, signOutGoogleAccount, 
  getSavedGoogleUser, listenToAuthChanges, GoogleAccountUser 
} from '../services/authService';
import { syncMemoriesToCloud, fetchMemoriesFromCloud, exportMemoriesAsJSON } from '../services/dbService';
import { extractAutoTitle } from '../services/geminiService';
import { BlogView } from './BlogView';

interface ProfileViewProps {
  profile: UserProfile | undefined;
  journalEntries: JournalEntry[];
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenImportModal?: () => void;
  onImportEntries?: (entries: JournalEntry[], replaceExisting?: boolean) => void;
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
}

const QUICK_NOTE_PRESETS = [
  '☕ Quiet morning',
  '🌧️ Rain & focus',
  '⚡ Deep work mode',
  '✨ Feeling peaceful',
  '📚 Reading & writing',
  '🌿 Nature break'
];

export const AnimateThoughtBubble: React.FC<{ 
  thought: string; 
  onEditClick?: () => void;
  isEditable?: boolean;
}> = ({ thought, onEditClick, isEditable = true }) => {
  return (
    <div className="absolute -top-9 sm:-top-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ type: 'spring', damping: 20, stiffness: 220 }}
        onClick={onEditClick}
        className={`relative group bg-surface/95 dark:bg-surface/95 border border-accent/35 shadow-lg px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl max-w-[210px] text-center backdrop-blur-md cursor-pointer transition hover:scale-105 active:scale-[0.97] ${
          !thought ? 'border-dashed border-accent/40 bg-accent/5' : ''
        }`}
        title={isEditable ? "Click to edit note" : undefined}
      >
        <span className="text-xs font-semibold text-primary line-clamp-2 leading-tight block select-none">
          {thought ? `"${thought}"` : '+ Note'}
        </span>
        
        {isEditable && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-accent-fg rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs font-bold">
            ✎
          </div>
        )}

        {/* Instagram Notes style tail dots starting from top-left of PFP leading up to big bubble */}
        <div className="absolute -bottom-3 left-2 sm:left-3 pointer-events-none flex items-center">
          {/* Smallest dot near top-left of PFP */}
          <div className="w-1.5 h-1.5 bg-surface border border-accent/35 rounded-full shadow-2xs -translate-x-2 translate-y-1.5" />
          {/* Medium dot ascending towards main bubble */}
          <div className="w-2.5 h-2.5 bg-surface border border-accent/35 rounded-full shadow-2xs -translate-x-1 translate-y-0.5" />
        </div>
      </motion.div>
    </div>
  );
};

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  profile, 
  journalEntries, 
  onUpdateProfile,
  onOpenImportModal,
  onImportEntries,
  settings,
  onUpdateSettings
}) => {
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [thought, setThought] = useState(profile?.thought || '');
  const [picture, setPicture] = useState(profile?.picture || '');
  const [sharedEntryIds, setSharedEntryIds] = useState<string[]>(profile?.sharedEntries?.map(e => e.id) || []);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedMemoryId, setCopiedMemoryId] = useState<string | null>(null);
  const [previewBlogEntry, setPreviewBlogEntry] = useState<JournalEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thoughtInputRef = useRef<HTMLInputElement>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const currentKey = getLocalUserId();

  const [isPublishing, setIsPublishing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');

  // Google Sync & Auth State
  const [googleUser, setGoogleUser] = useState<GoogleAccountUser | null>(() => getSavedGoogleUser());
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToAuthChanges((u) => {
      setGoogleUser(u);
      if (u) {
        setName(prev => prev || u.displayName || 'Google Member');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setSyncStatusMsg('');
    try {
      const u = await signInWithGoogleAccount();
      setGoogleUser(u);
      if (!name) setName(u.displayName);
      if (!picture && u.photoURL) setPicture(u.photoURL);
      setSyncStatusMsg(`Connected Google Account (${u.email})!`);
    } catch (err: any) {
      console.error("Google sign-in error", err);
      setSyncStatusMsg(`Google sign-in notice: ${err.message || 'Cancelled or popup closed'}`);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleAccount();
    setGoogleUser(null);
    setSyncStatusMsg('Signed out of Google Account.');
  };

  const handleCloudSyncNow = async () => {
    const targetId = googleUser?.uid || currentKey;
    setIsSyncingCloud(true);
    setSyncStatusMsg('');
    try {
      await syncMemoriesToCloud(targetId, journalEntries, {
        googleEmail: googleUser?.email,
        deviceKey: currentKey,
        config: settings,
        profile: profile
      });
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
      setSyncStatusMsg(`Synced ${journalEntries.length} memories & config to Cloud at ${timeStr}!`);
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message || 'Failed to sync'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullCloudMemories = async () => {
    const targetId = googleUser?.uid || currentKey;
    setIsSyncingCloud(true);
    setSyncStatusMsg('');
    try {
      const remote = await fetchMemoriesFromCloud(targetId);
      if (remote) {
        let msg = '';
        if (remote.entries && remote.entries.length > 0 && onImportEntries) {
          onImportEntries(remote.entries, false);
          msg += `Pulled ${remote.entries.length} memories. `;
        }
        if (remote.config && onUpdateSettings) {
           onUpdateSettings(remote.config);
           msg += 'Pulled config. ';
        }
        if (msg) {
           setSyncStatusMsg(msg.trim());
        } else {
           setSyncStatusMsg('No remote data found on Cloud.');
        }
      } else {
        setSyncStatusMsg('No remote memories found on Cloud.');
      }
    } catch (err: any) {
      setSyncStatusMsg(`Pull error: ${err.message || 'Failed to fetch cloud data'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Keep settings and profile synchronized
  useEffect(() => {
    const sharedEntries = journalEntries.filter(e => sharedEntryIds.includes(e.id));
    onUpdateProfile({ name, bio, thought, picture, sharedEntries, username });
  }, [name, bio, thought, picture, sharedEntryIds, journalEntries, username]);

  const handleRestoreSession = () => {
    if (!inputKey.trim()) {
      alert("Please enter a device key.");
      return;
    }
    if (confirm("Are you sure you want to restore this session? This will replace your current session credentials and reload the application.")) {
      setLocalUserId(inputKey.trim());
      window.location.reload();
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(currentKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePublish = async () => {
    if (!username) {
      alert("Please enter a username to publish your profile.");
      return;
    }
    setIsPublishing(true);
    try {
      const { claimPublicProfile, shareJournalEntry } = await import('../services/dbService');
      const sharedEntries = journalEntries.filter(e => sharedEntryIds.includes(e.id));
      await claimPublicProfile(username, { name, bio, thought, picture, sharedEntries, username });
      
      for (const entry of sharedEntries) {
        await shareJournalEntry(entry, username);
      }
      
      const link = `${window.location.origin}/p/${username}`;
      await navigator.clipboard.writeText(link);
      setCopiedProfileLink(true);
      setTimeout(() => setCopiedProfileLink(false), 2000);
    } catch (error: any) {
      alert(error.message || "Failed to publish profile.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copySingleMemoryLink = async (entryId: string) => {
    try {
      const { shareJournalEntry } = await import('../services/dbService');
      const entry = journalEntries.find(e => e.id === entryId);
      if (entry) {
        await shareJournalEntry(entry, username || undefined);
        const link = `${window.location.origin}/share/${entryId}`;
        await navigator.clipboard.writeText(link);
        setCopiedMemoryId(entryId);
        setTimeout(() => setCopiedMemoryId(null), 2000);
      }
    } catch (e) {
      alert("Failed to create direct share link.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleShareEntry = (id: string) => {
    setSharedEntryIds(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  // Stats calculation
  const totalWords = journalEntries.reduce((acc, curr) => acc + (curr.content ? curr.content.trim().split(/\s+/).length : 0), 0);

  return (
    <div className="w-full max-w-3xl mx-auto pb-32 pt-6 px-4 sm:px-6">
      
      {/* Primary Creator Profile Card */}
      <div className="bg-surface border border-surface-highlight rounded-[2.5rem] p-6 sm:p-10 shadow-sm relative overflow-hidden mb-8">
        
        {/* Soft decorative background radial glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8 relative z-10 pt-8">
          
          {/* Avatar Container with Instagram Notes Thought Bubble */}
          <div className="relative mb-6">
            <AnimateThoughtBubble 
              thought={thought} 
              onEditClick={() => thoughtInputRef.current?.focus()} 
            />
            
            <div 
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-bg border-4 border-surface shadow-2xl overflow-hidden relative group cursor-pointer flex items-center justify-center transition-transform hover:scale-[1.02]"
              onClick={() => fileInputRef.current?.click()}
            >
              {picture ? (
                <img src={picture} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-secondary opacity-60">
                  <User className="w-10 h-10 stroke-[1.5]" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-1 p-2.5 bg-accent text-accent-fg rounded-full shadow-lg hover:scale-105 active:scale-[0.97] transition"
              title="Upload Avatar Photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight text-center">
            {name || 'Digital Creator'}
          </h2>
          
          {username ? (
            <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mt-2">
              @{username}
            </span>
          ) : (
            <span className="text-xs text-secondary/60 mt-1">Set a username to share your public page</span>
          )}

          {bio && (
            <p className="text-xs sm:text-sm text-secondary text-center mt-3 max-w-md font-light leading-relaxed">
              {bio}
            </p>
          )}
        </div>

        {/* Quick Analytics Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-bg/50 border border-surface-highlight rounded-2xl mb-8 text-center">
          <div>
            <span className="block text-lg sm:text-2xl font-bold font-mono text-primary">{journalEntries.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70">Memories</span>
          </div>
          <div className="border-x border-surface-highlight/60">
            <span className="block text-lg sm:text-2xl font-bold font-mono text-accent">{totalWords}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70">Words</span>
          </div>
          <div>
            <span className="block text-lg sm:text-2xl font-bold font-mono text-primary">{sharedEntryIds.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/70">Shared</span>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-6">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Display Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="What should we call you?"
            />
          </div>
          
          {/* Note Status (Instagram Notes style) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold tracking-[0.15em] uppercase text-secondary flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                <span>Instagram Note / Current Status</span>
              </label>
              <span className="text-[10px] font-mono text-secondary/60">{thought.length}/60</span>
            </div>
            
            <input 
              ref={thoughtInputRef}
              type="text" 
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="Post a short thought note above your avatar..."
              maxLength={60}
            />

            {/* Note Presets */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 self-center mr-1">Presets:</span>
              {QUICK_NOTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setThought(preset)}
                  className="px-2.5 py-1 bg-surface-highlight/60 hover:bg-surface-highlight rounded-lg text-[10px] font-medium text-secondary hover:text-primary transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent/50 transition-colors resize-none min-h-[90px]"
              placeholder="A gentle narrative about who you are..."
            />
          </div>

          {/* Public Username */}
          <div className="pt-2">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Public Username</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <span className="bg-bg text-secondary/70 px-4 py-3 rounded-2xl flex items-center justify-center border border-surface-highlight text-xs font-mono shrink-0">
                {window.location.host}/p/
              </span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                className="flex-grow bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-primary focus:outline-none focus:border-accent/50 transition-colors text-center sm:text-left font-mono text-sm"
                placeholder="username"
              />
            </div>
            <p className="text-[10px] text-secondary mt-2 opacity-70">Letters, numbers, hyphens, and underscores only. Used for your public URL.</p>
          </div>

          {/* Fine-Grained Memories Sharing controls */}
          {journalEntries.length > 0 && (
            <div className="pt-6 border-t border-surface-highlight/60">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-primary tracking-tight">Memories Sharing Showcase</h3>
                <p className="text-xs text-secondary mt-0.5">Toggle which memories are visible on your public sanctuary page.</p>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {journalEntries.map(entry => {
                  const isSharedOnProfile = sharedEntryIds.includes(entry.id);
                  const isCopied = copiedMemoryId === entry.id;

                  return (
                    <div 
                      key={entry.id} 
                      className={`p-4 rounded-2xl border transition duration-300 relative group overflow-hidden ${
                        isSharedOnProfile ? 'bg-accent/[0.04] border-accent/30' : 'bg-bg/50 border-surface-highlight hover:border-surface-highlight/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleShareEntry(entry.id)}>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                            isSharedOnProfile ? 'bg-accent border-accent text-accent-fg' : 'border-secondary/30 bg-bg'
                          }`}>
                            {isSharedOnProfile && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-primary truncate max-w-[220px]">
                            {entry.title || extractAutoTitle(entry.content)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => toggleShareEntry(entry.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5 ${
                              isSharedOnProfile ? 'bg-accent/10 border-accent/25 text-accent' : 'bg-surface-highlight border-transparent text-secondary hover:text-primary'
                            }`}
                          >
                            {isSharedOnProfile ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            <span>{isSharedOnProfile ? 'Visible' : 'Private'}</span>
                          </button>

                          {isSharedOnProfile && (
                            <button
                              onClick={() => setPreviewBlogEntry(entry)}
                              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition flex items-center gap-1.5"
                              title="Preview as Blog Article"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Blog Page</span>
                            </button>
                          )}

                          <button 
                             onClick={() => copySingleMemoryLink(entry.id)}
                             className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5 ${
                               isCopied ? 'bg-accent border-accent text-accent-fg' : 'bg-bg border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight'
                             }`}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Share className="w-3 h-3" />}
                            <span>{isCopied ? "Copied!" : "Share Link"}</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-secondary line-clamp-2 ml-8 cursor-pointer opacity-80" onClick={() => toggleShareEntry(entry.id)}>
                        {entry.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Publish Action Section */}
        <div className="pt-8 mt-8 border-t border-surface-highlight/60">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-primary text-sm sm:text-base">Publish Sanctuary Profile</h3>
              <p className="text-xs text-secondary">Sync your profile & memories to your custom public link.</p>
            </div>
            
            <button
              onClick={handlePublish}
              disabled={isPublishing || !username}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-[0.97] text-xs sm:text-sm shadow-sm ${
                 (isPublishing || !username) ? 'bg-bg text-secondary/50 cursor-not-allowed border border-surface-highlight' : 'bg-accent text-accent-fg hover:opacity-90'
              }`}
            >
              {isPublishing ? (
                <span>Publishing...</span>
              ) : copiedProfileLink ? (
                <>
                  <Check className="w-4 h-4 text-accent-fg" />
                  <span>Profile Link Copied!</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Publish Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Google Account & Cloud Sync Card */}
      <div className="bg-surface border border-surface-highlight rounded-[2.5rem] p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 rounded-2xl text-accent border border-accent/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">Google Account & Cloud Sync</h3>
              <p className="text-xs text-secondary">Sync your memories automatically across all devices alongside your Device Key</p>
            </div>
          </div>
          {googleUser && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          )}
        </div>

        {googleUser ? (
          <div className="bg-bg/60 border border-surface-highlight/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt={googleUser.displayName || 'Google user'} className="w-10 h-10 rounded-full object-cover border border-accent/30" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-primary">{googleUser.displayName || 'Google Account'}</h4>
                  <p className="text-xs text-secondary font-mono">{googleUser.email}</p>
                </div>
              </div>

              <button
                onClick={handleGoogleSignOut}
                className="px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>

            <div className="pt-3 border-t border-surface-highlight/60 flex flex-wrap gap-3 items-center">
              <button
                onClick={handleCloudSyncNow}
                disabled={isSyncingCloud}
                className="px-5 py-2.5 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold text-xs flex items-center gap-2 transition active:scale-[0.97] shadow-xs disabled:opacity-50"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{isSyncingCloud ? 'Syncing...' : 'Sync Memories to Cloud'}</span>
              </button>

              <button
                onClick={handlePullCloudMemories}
                disabled={isSyncingCloud}
                className="px-5 py-2.5 bg-surface-highlight hover:bg-surface-highlight/80 text-primary rounded-2xl font-bold text-xs flex items-center gap-2 transition active:scale-[0.97] border border-surface-highlight disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4 text-accent" />
                <span>Pull Cloud Memories</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-bg/40 border border-surface-highlight/80 rounded-2xl p-6 text-center space-y-4">
            <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
              Connect your Google Account to back up your memories seamlessly in Firestore and sync them effortlessly whenever you sign in on a new device.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningInGoogle}
              className="px-6 py-3 bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 mx-auto shadow-sm transition active:scale-[0.97] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isSigningInGoogle ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <p className="text-xs text-accent font-medium bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncStatusMsg}</span>
          </p>
        )}
      </div>

      {/* Access & Device Recovery Card */}
      <div className="bg-surface border border-surface-highlight rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-bg rounded-2xl text-accent border border-surface-highlight">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">Device Credentials & Recovery</h3>
            <p className="text-xs text-secondary">Anonymous device key authentication</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Your Device Key</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-grow bg-bg border border-surface-highlight rounded-2xl px-4 py-3 flex items-center justify-between font-mono text-xs overflow-x-auto min-h-[46px]">
                {showKey ? (
                  <span className="text-primary break-all select-all font-semibold">{currentKey}</span>
                ) : (
                  <span className="text-secondary/40 select-none tracking-widest">••••••••-••••-••••-••••-••••••••••••</span>
                )}
                <button 
                  onClick={() => setShowKey(!showKey)} 
                  className="ml-2 text-secondary hover:text-accent transition-colors shrink-0 p-1"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button 
                onClick={handleCopyKey}
                className="px-6 py-3 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.97] text-xs sm:text-sm shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? "Copied!" : "Copy Key"}</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-highlight/60">
            <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Restore Existing Session</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value.trim())}
                placeholder="Paste your saved Device Key here"
                className="flex-grow bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors font-mono text-xs text-center sm:text-left"
              />
              <button 
                onClick={handleRestoreSession}
                className="px-6 py-3 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition-opacity active:scale-[0.97] text-xs sm:text-sm shrink-0"
              >
                Restore Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Import & Backup Management Card */}
      <div className="bg-surface border border-surface-highlight rounded-[2.5rem] p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-bg rounded-2xl text-accent border border-surface-highlight">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">Memory Archive & Backup</h3>
            <p className="text-xs text-secondary">Import past memories from JSON files, cloud keys, or download a full offline archive</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-5 py-3 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-[0.97] shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Import Old Memories</span>
            </button>
          )}

          <button
            onClick={() => exportMemoriesAsJSON(journalEntries)}
            className="px-5 py-3 bg-surface-highlight hover:bg-surface-highlight/80 text-primary border border-surface-highlight rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-[0.97]"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>Export JSON Archive ({journalEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Blog Post Modal Preview */}
      <AnimatePresence>
        {previewBlogEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#FAF9F6] w-full max-w-4xl max-h-[92vh] rounded-3xl overflow-y-auto relative shadow-2xl border border-surface-highlight"
            >
              <div className="sticky top-0 z-50 bg-[#FAF9F6]/95 border-b border-[#E7E5E4] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-accent">
                  <Globe className="w-4 h-4" />
                  <span>blog-sanniva.vercel.app/friends</span>
                </div>
                <button
                  onClick={() => setPreviewBlogEntry(null)}
                  className="p-2 rounded-full bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#44403C] transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BlogView 
                entry={previewBlogEntry} 
                profile={{ name, bio, thought, picture, username, sharedEntries: journalEntries.filter(e => sharedEntryIds.includes(e.id)) }} 
                allSharedEntries={journalEntries.filter(e => sharedEntryIds.includes(e.id))}
                isStandalonePage={false}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PublicProfileView = ({ profile }: { profile: UserProfile }) => {
  const isSingle = profile.isSingleEntry;
  const singleEntry = profile.sharedEntries?.[0];
  const [copied, setCopied] = useState(false);
  const [activeBlogEntry, setActiveBlogEntry] = useState<JournalEntry | null>(null);

  const handleShareCurrentPage = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. STANDALONE SINGLE MEMORY BLOG VIEW
  if (isSingle && singleEntry) {
    return <BlogView entry={singleEntry} profile={profile} allSharedEntries={profile.sharedEntries} />;
  }

  // If a visitor clicked a specific entry to read as a blog post
  if (activeBlogEntry) {
    return (
      <div className="relative">
        <button
          onClick={() => setActiveBlogEntry(null)}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-surface text-primary border border-surface-highlight rounded-full text-xs font-bold shadow-md hover:bg-surface-highlight transition flex items-center gap-1.5"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Back to {profile.name || 'Profile'}</span>
        </button>
        <BlogView 
          entry={activeBlogEntry} 
          profile={profile} 
          allSharedEntries={profile.sharedEntries}
          onSelectEntry={(entry) => setActiveBlogEntry(entry)}
        />
      </div>
    );
  }

  // 2. ENTIRE USER PUBLIC PROFILE VIEW
  return (
    <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center p-4 sm:p-6 transition duration-500 animate-fade-in relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-12 shadow-lg relative flex flex-col items-center my-8 backdrop-blur-md">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight border border-surface-highlight text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-12">
          <Compass className="w-3.5 h-3.5 text-accent" />
          <span>Zournel Profile</span>
        </div>
        
        {/* Profile Picture with Instagram Notes Thought Bubble */}
        <div className="relative mb-8 pt-4">
          <AnimateThoughtBubble thought={profile.thought} isEditable={false} />
          
          <div className="w-32 h-32 rounded-full bg-surface-highlight border-4 border-surface shadow-xl overflow-hidden flex items-center justify-center">
            {profile.picture ? (
              <img src={profile.picture} alt={`${profile.name}'s avatar`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-highlight">
                 <User className="w-12 h-12 text-secondary opacity-40 stroke-[1.5]" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary mb-2 tracking-tight text-center break-words">{profile.name || 'Anonymous Creator'}</h1>
        
        {profile.username && (
          <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mb-6">
            @{profile.username}
          </span>
        )}

        {profile.bio && (
          <p className="text-secondary text-sm sm:text-base leading-relaxed mb-8 max-w-sm text-center font-light opacity-90">
            {profile.bio}
          </p>
        )}

        {profile.sharedEntries && profile.sharedEntries.length > 0 ? (
          <div className="w-full text-left mt-4 pt-8 border-t border-surface-highlight/60">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Calendar className="w-4 h-4 text-secondary/60" />
              <h3 className="text-xs font-bold text-secondary tracking-widest uppercase text-center">Shared Blog Entries</h3>
            </div>
            
            <div className="space-y-5">
              {profile.sharedEntries.map(entry => (
                <div 
                  key={entry.id} 
                  onClick={() => setActiveBlogEntry(entry)}
                  className="bg-bg/40 hover:bg-bg/80 p-6 rounded-[2rem] border border-surface-highlight hover:border-accent/40 shadow-xs hover:shadow-md transition duration-300 cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary group-hover:text-accent transition-colors text-sm sm:text-base">
                      {entry.title || extractAutoTitle(entry.content)}
                    </span>
                    <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Read Article</span>
                    </span>
                  </div>
                  <p className="text-secondary text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-light opacity-95 line-clamp-3">{entry.content}</p>
                  
                  {entry.image && (
                    <div className="mt-4 rounded-2xl overflow-hidden max-h-52 border border-surface-highlight/40">
                       <img src={entry.image} alt="Memory illustration" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {entry.aiInsight && (
                    <div className="mt-4 pt-4 border-t border-surface-highlight/40 flex items-start gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <p className="text-[11px] text-secondary/80 italic leading-normal">
                        {entry.aiInsight}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full text-center mt-4 py-8 border-t border-surface-highlight/60">
            <p className="text-xs text-secondary/60 font-medium">This profile is resting. No shared memories yet.</p>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={handleShareCurrentPage}
            className="px-6 py-3 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-[0.97] text-xs sm:text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Profile Link Copied!" : "Copy Page Link"}</span>
          </button>
          
          <button 
            onClick={() => window.location.href = window.location.origin}
            className="px-6 py-3 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-[0.97] text-xs sm:text-sm"
          >
            <span>Create your own Zournel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
