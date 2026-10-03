import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserProfile, JournalEntry, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/uiSprings';
import { 
  Camera, Copy, Check, Share, User, Key, Eye, EyeOff, 
  Sparkles, Lock, Globe, Calendar, ArrowRight, Cloud, Compass,
  MessageSquare, BookOpen, X, Upload, Download,
  CloudUpload, CloudDownload, LogOut, RefreshCw, CheckCircle2
} from './Icons';
import { PageHeader } from './ui/PageHeader';
import { DraggableSegmentedToggle } from './ui/DraggableToggle';
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
    <div className="absolute -top-8 sm:-top-9 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ type: 'spring', damping: 20, stiffness: 220 }}
        onClick={onEditClick}
        className={`relative group bg-surface/95 border border-accent/35 shadow-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl max-w-[190px] text-center backdrop-blur-md cursor-pointer transition hover:scale-105 active:scale-95 ${
          !thought ? 'border-dashed border-accent/40 bg-accent/5' : ''
        }`}
        title={isEditable ? 'Tap to edit status note' : undefined}
      >
        <span className="text-[11px] sm:text-xs font-semibold text-primary line-clamp-1 leading-tight block select-none">
          {thought ? `"${thought}"` : '+ Add status note'}
        </span>
        
        {isEditable && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-accent-fg rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs font-bold">
            ✎
          </div>
        )}

        <div className="absolute -bottom-2.5 left-3 pointer-events-none flex items-center">
          <div className="w-1.5 h-1.5 bg-surface border border-accent/35 rounded-full shadow-2xs -translate-x-1.5 translate-y-1" />
          <div className="w-2 h-2 bg-surface border border-accent/35 rounded-full shadow-2xs -translate-x-0.5 translate-y-0" />
        </div>
      </motion.button>
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
  const [activeSection, setActiveSection] = useState<'identity' | 'showcase' | 'sync'>('identity');
  const [showcaseFilter, setShowcaseFilter] = useState<'all' | 'shared'>('all');
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [thought, setThought] = useState(profile?.thought || '');
  const [picture, setPicture] = useState(profile?.picture || '');
  const [sharedEntryIds, setSharedEntryIds] = useState<string[]>(profile?.sharedEntries?.map(e => e.id) || []);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedMemoryId, setCopiedMemoryId] = useState<string | null>(null);
  const [previewBlogEntry, setPreviewBlogEntry] = useState<JournalEntry | null>(null);
  const [showPublicProfilePreview, setShowPublicProfilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thoughtInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

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
        if (u.displayName && !name) setName(u.displayName);
        if (u.photoURL && !picture) setPicture(u.photoURL);
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
      if (u.displayName) setName(u.displayName);
      if (u.photoURL) setPicture(u.photoURL);
      setSyncStatusMsg(`Connected Google Account (${u.email})! Pulling cloud data…`);
      
      const remote = await fetchMemoriesFromCloud(u.uid);
      if (remote) {
        let msg = '';
        if (remote.entries && remote.entries.length > 0 && onImportEntries) {
          onImportEntries(remote.entries, false);
          msg += `Pulled ${remote.entries.length} memories. `;
        }
        if (remote.config && onUpdateSettings) {
          onUpdateSettings((prev: any) => {
            const updated = { ...prev, ...remote.config };
            updated.theme = prev.theme;
            if (prev.fontFamily) updated.fontFamily = prev.fontFamily;
            if (prev.headingFontFamily) updated.headingFontFamily = prev.headingFontFamily;
            return updated;
          });
          msg += 'Synced preferences. ';
        }
        if (remote.profile) {
          if (remote.profile.name) setName(remote.profile.name);
          if (remote.profile.bio) setBio(remote.profile.bio);
          if (remote.profile.thought) setThought(remote.profile.thought);
          if (remote.profile.picture) setPicture(remote.profile.picture);
        }
        setSyncStatusMsg(msg ? `Connected & ${msg}` : `Connected as ${u.displayName || u.email}!`);
      } else {
        setSyncStatusMsg(`Connected as ${u.displayName || u.email}! Ready to sync.`);
      }
    } catch (err: any) {
      console.error('Google sign-in error', err);
      setSyncStatusMsg(`Sign-in notice: ${err.message || 'Cancelled or popup closed'}`);
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
      setSyncStatusMsg(`Synced ${journalEntries.length} memories to Cloud at ${timeStr}.`);
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
          onUpdateSettings((prev: any) => {
            const updated = { ...prev, ...remote.config };
            updated.theme = prev.theme;
            if (prev.fontFamily) updated.fontFamily = prev.fontFamily;
            if (prev.headingFontFamily) updated.headingFontFamily = prev.headingFontFamily;
            return updated;
          });
          msg += 'Restored preferences. ';
        }
        setSyncStatusMsg(msg ? msg.trim() : 'No remote data found on Cloud.');
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
      alert('Please enter a device key.');
      return;
    }
    if (confirm('Restore this session? Your current device key will be updated and the app will reload.')) {
      setLocalUserId(inputKey.trim());
      window.location.reload();
    }
  };

  const handleCopyKey = () => {
    triggerHaptic(8);
    navigator.clipboard.writeText(currentKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePublish = async () => {
    if (!username) {
      setActiveSection('identity');
      setTimeout(() => usernameInputRef.current?.focus(), 100);
      return;
    }
    triggerHaptic(12);
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
      setTimeout(() => setCopiedProfileLink(false), 2500);
    } catch (error: any) {
      alert(error.message || 'Failed to publish profile.');
    } finally {
      setIsPublishing(false);
    }
  };

  const copySingleMemoryLink = async (entryId: string) => {
    triggerHaptic(8);
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
      alert('Failed to create direct share link.');
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
    triggerHaptic(6);
    setSharedEntryIds(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  // Stats calculation
  const { totalWords, activeDays } = useMemo(() => {
    let words = 0;
    const daySet = new Set<string>();
    journalEntries.forEach((curr) => {
      if (curr.content) {
        words += curr.content.trim().split(/\s+/).filter(Boolean).length;
      }
      if (curr.createdAt) {
        const d = new Date(curr.createdAt);
        if (!isNaN(d.getTime())) {
          daySet.add(d.toISOString().slice(0, 10));
        }
      }
    });
    return { totalWords: words, activeDays: daySet.size };
  }, [journalEntries]);

  const displayedShowcaseEntries = useMemo(() => {
    if (showcaseFilter === 'shared') {
      return journalEntries.filter(e => sharedEntryIds.includes(e.id));
    }
    return journalEntries;
  }, [journalEntries, sharedEntryIds, showcaseFilter]);

  const currentProfileSnapshot: UserProfile = useMemo(() => ({
    name,
    bio,
    thought,
    picture,
    username,
    sharedEntries: journalEntries.filter(e => sharedEntryIds.includes(e.id)),
  }), [name, bio, thought, picture, username, journalEntries, sharedEntryIds]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Account"
        subtitle="Sanctuary identity, showcase & cloud sync"
        actions={
          <DraggableSegmentedToggle
            options={[
              { value: 'identity', label: 'Identity' },
              { value: 'showcase', label: `Showcase (${sharedEntryIds.length})` },
              { value: 'sync', label: 'Sync & Data' },
            ]}
            value={activeSection}
            onChange={(val) => {
              triggerHaptic(6);
              setActiveSection(val as 'identity' | 'showcase' | 'sync');
            }}
          />
        }
      />

      {/* Cohesive Hero Identity Card */}
      <section className="bg-surface border border-surface-highlight rounded-3xl shadow-sm overflow-hidden relative">
        {/* Atmospheric Banner */}
        <div className="h-24 sm:h-28 bg-gradient-to-br from-accent/20 via-surface-highlight/60 to-accent/5 border-b border-surface-highlight/50 relative px-4 sm:px-6 pt-3.5 flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/85 backdrop-blur-md border border-surface-highlight text-[10px] font-mono uppercase tracking-wider text-secondary">
            <Compass className="w-3 h-3 text-accent" />
            <span>Sanctuary Pass</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {googleUser ? (
              <button
                type="button"
                onClick={() => setActiveSection('sync')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Cloud Connected</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('sync')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/85 text-secondary hover:text-primary border border-surface-highlight text-[10px] font-mono uppercase tracking-wider backdrop-blur-md transition"
              >
                <Key className="w-3 h-3 text-accent" />
                <span>Device Key Active</span>
              </button>
            )}
          </div>
        </div>

        {/* Avatar, Identity Info, Bento Metrics & Primary Actions */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-5">
            {/* Avatar + Thought Bubble */}
            <div className="relative self-center sm:self-auto pt-4 sm:pt-0">
              <AnimateThoughtBubble 
                thought={thought} 
                onEditClick={() => {
                  setActiveSection('identity');
                  setTimeout(() => thoughtInputRef.current?.focus(), 80);
                }} 
              />
              
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-bg border-4 border-surface shadow-xl overflow-hidden relative group cursor-pointer flex items-center justify-center transition-transform active:scale-95"
                onClick={() => fileInputRef.current?.click()}
              >
                {picture ? (
                  <img src={picture} alt="Profile avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-secondary/60">
                    <User className="w-9 h-9" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-2xs">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0.5 right-0.5 p-2 bg-accent text-accent-fg rounded-full shadow-md hover:scale-105 active:scale-95 transition"
                title="Upload Avatar Photo"
                aria-label="Upload Avatar Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>

            {/* Action Pills (Publish & Preview) */}
            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPublicProfilePreview(true)}
                className="h-10 px-4 rounded-full bg-surface-highlight/60 hover:bg-surface-highlight text-primary border border-surface-highlight text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5 text-accent" />
                <span>Preview Page</span>
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className={`h-10 px-4 sm:px-5 rounded-full font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                  copiedProfileLink
                    ? 'bg-emerald-600 text-white'
                    : username
                    ? 'bg-accent text-accent-fg hover:opacity-90'
                    : 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
                }`}
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing…</span>
                  </>
                ) : copiedProfileLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Link Copied!</span>
                  </>
                ) : username ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Publish &amp; Copy Link</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Claim @username</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Name, Handle & Bio */}
          <div className="text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-primary tracking-tight">
                {name || 'Digital Creator'}
              </h2>
              {username ? (
                <span className="self-center sm:self-auto text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
                  @{username}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('identity');
                    setTimeout(() => usernameInputRef.current?.focus(), 80);
                  }}
                  className="self-center sm:self-auto text-[11px] font-mono text-secondary/70 hover:text-accent underline underline-offset-2 transition"
                >
                  + Set public @username
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-secondary mt-2 max-w-xl leading-relaxed">
              {bio || 'Add a short bio below to introduce your personal sanctuary and reflections.'}
            </p>
          </div>

          {/* 4-Column Tactile Metrics Bento Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-5 border-t border-surface-highlight/60">
            <div className="p-3 rounded-2xl bg-bg/60 border border-surface-highlight/80 text-center sm:text-left">
              <span className="block text-lg sm:text-xl font-bold font-mono text-primary leading-tight">{journalEntries.length}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Memories</span>
            </div>
            <div className="p-3 rounded-2xl bg-bg/60 border border-surface-highlight/80 text-center sm:text-left">
              <span className="block text-lg sm:text-xl font-bold font-mono text-accent leading-tight">{totalWords.toLocaleString()}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Words Written</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('showcase')}
              className="p-3 rounded-2xl bg-bg/60 hover:bg-surface-highlight/40 border border-surface-highlight/80 text-center sm:text-left transition active:scale-[0.98]"
            >
              <span className="block text-lg sm:text-xl font-bold font-mono text-primary leading-tight">{sharedEntryIds.length}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Public Showcase →</span>
            </button>
            <div className="p-3 rounded-2xl bg-bg/60 border border-surface-highlight/80 text-center sm:text-left">
              <span className="block text-lg sm:text-xl font-bold font-mono text-primary leading-tight">{activeDays}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Active Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Content Switcher */}
      <AnimatePresence mode="wait">
        {activeSection === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4 sm:space-y-5"
          >
            {/* Card 1: Name & Public Handle */}
            <div className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm sm:text-base font-display font-bold text-primary">Identity &amp; Public Handle</h3>
                <p className="text-xs text-secondary mt-0.5">Customize how your name and URL appear when sharing memories.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-secondary mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 bg-surface-lowest border border-surface-highlight rounded-2xl px-4 text-sm text-primary placeholder:text-secondary/45 focus:outline-none focus:border-accent transition-colors"
                    placeholder="What should we call you?"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-secondary mb-1.5">Public Handle</label>
                  <div className="flex items-center h-11 bg-surface-lowest border border-surface-highlight rounded-2xl px-3.5 focus-within:border-accent transition-colors">
                    <span className="text-xs font-mono text-secondary/60 select-none shrink-0">/p/</span>
                    <input 
                      ref={usernameInputRef}
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      className="w-full bg-transparent pl-1 text-sm font-mono text-primary placeholder:text-secondary/45 focus:outline-none"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-secondary mb-1.5">Bio &amp; Introduction</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-surface-lowest border border-surface-highlight rounded-2xl p-3.5 text-sm text-primary placeholder:text-secondary/45 focus:outline-none focus:border-accent transition-colors resize-none min-h-[84px]"
                  placeholder="A gentle narrative about who you are and what you write about…"
                />
              </div>
            </div>

            {/* Card 2: Status Note / Thought Bubble */}
            <div className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent/12 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-primary">Current Thought Bubble</h3>
                    <p className="text-xs text-secondary">Floats above your avatar and in the top bar</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-secondary/60">{thought.length}/60</span>
              </div>

              <div className="relative">
                <input 
                  ref={thoughtInputRef}
                  type="text" 
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  className="w-full h-11 bg-surface-lowest border border-surface-highlight rounded-2xl pl-4 pr-16 text-sm text-primary placeholder:text-secondary/45 focus:outline-none focus:border-accent transition-colors"
                  placeholder="Post a short status note above your avatar…"
                  maxLength={60}
                />
                {thought && (
                  <button
                    type="button"
                    onClick={() => setThought('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-secondary hover:text-primary px-2 py-0.5 rounded bg-surface-highlight/60"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 mr-1">Quick vibes:</span>
                {QUICK_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { triggerHaptic(6); setThought(preset); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition active:scale-95 border ${
                      thought === preset
                        ? 'bg-accent/15 border-accent/35 text-accent font-semibold'
                        : 'bg-surface-highlight/45 hover:bg-surface-highlight border-transparent text-secondary hover:text-primary'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'showcase' && (
          <motion.div
            key="showcase"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-highlight/60">
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-primary">Public Memories Showcase</h3>
                <p className="text-xs text-secondary mt-0.5">Choose which journal entries appear on your public page or share direct links.</p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowcaseFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    showcaseFilter === 'all'
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-highlight/50 text-secondary hover:text-primary'
                  }`}
                >
                  All ({journalEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowcaseFilter('shared')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    showcaseFilter === 'shared'
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-highlight/50 text-secondary hover:text-primary'
                  }`}
                >
                  Public ({sharedEntryIds.length})
                </button>
              </div>
            </div>

            {journalEntries.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-surface-highlight rounded-2xl p-6">
                <BookOpen className="w-8 h-8 text-accent/40 mx-auto" />
                <p className="text-sm font-semibold text-primary">No memories in your archive yet</p>
                <p className="text-xs text-secondary max-w-xs mx-auto">Write a memory in the Journal tab or import a starter archive to curate your public showcase.</p>
                {onOpenImportModal && (
                  <button
                    type="button"
                    onClick={onOpenImportModal}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-fg text-xs font-bold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Memories</span>
                  </button>
                )}
              </div>
            ) : displayedShowcaseEntries.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-surface-highlight rounded-2xl p-6">
                <Lock className="w-6 h-6 text-secondary/40 mx-auto" />
                <p className="text-sm font-semibold text-primary">No public memories selected yet</p>
                <p className="text-xs text-secondary">Switch to "All" and tap any memory to make it visible on your sanctuary page.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedShowcaseEntries.map(entry => {
                  const isSharedOnProfile = sharedEntryIds.includes(entry.id);
                  const isCopied = copiedMemoryId === entry.id;
                  const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

                  return (
                    <div 
                      key={entry.id} 
                      className={`p-4 rounded-2xl border transition duration-200 ${
                        isSharedOnProfile ? 'bg-accent/[0.05] border-accent/35' : 'bg-bg/40 border-surface-highlight hover:border-surface-highlight/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-start gap-3 cursor-pointer select-none min-w-0 flex-1"
                          onClick={() => toggleShareEntry(entry.id)}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSharedOnProfile ? 'bg-accent border-accent text-accent-fg' : 'border-secondary/40 bg-surface'
                          }`}>
                            {isSharedOnProfile && <Check className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-primary truncate">
                                {entry.title || extractAutoTitle(entry.content)}
                              </span>
                              {dateStr && (
                                <span className="text-[10px] font-mono text-secondary/60">{dateStr}</span>
                              )}
                              {entry.mood && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-surface-highlight text-secondary">
                                  {entry.mood}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-secondary line-clamp-2 mt-1 leading-relaxed">
                              {entry.content}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mobile-friendly action bar */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-surface-highlight/40 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleShareEntry(entry.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5 ${
                            isSharedOnProfile
                              ? 'bg-accent/12 border-accent/30 text-accent'
                              : 'bg-surface-highlight/60 border-transparent text-secondary hover:text-primary'
                          }`}
                        >
                          {isSharedOnProfile ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isSharedOnProfile ? 'Public' : 'Private'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewBlogEntry(entry)}
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight/60 transition flex items-center gap-1.5"
                          title="Preview as Blog Article"
                        >
                          <BookOpen className="w-3 h-3 text-accent" />
                          <span>Article View</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => copySingleMemoryLink(entry.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition flex items-center gap-1.5 ${
                            isCopied
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-surface border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight/60'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Share className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied!' : 'Share Link'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeSection === 'sync' && (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4 sm:space-y-5"
          >
            {/* Card 1: Google Account & Cloud Sync */}
            <div className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/12 border border-accent/20 text-accent flex items-center justify-center shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-primary">Google Account &amp; Cloud Sync</h3>
                    <p className="text-xs text-secondary">Sync memories &amp; preferences across all your devices</p>
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
                <div className="bg-bg/60 border border-surface-highlight/80 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {googleUser.photoURL ? (
                        <img src={googleUser.photoURL} alt={googleUser.displayName || 'Google user'} className="w-10 h-10 rounded-full object-cover border border-accent/30 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                          {googleUser.displayName?.charAt(0) || 'G'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-primary truncate">{googleUser.displayName || 'Google Account'}</h4>
                        <p className="text-xs text-secondary font-mono truncate">{googleUser.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-surface-highlight/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleCloudSyncNow}
                      disabled={isSyncingCloud}
                      className="h-11 px-4 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-xs disabled:opacity-50"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>{isSyncingCloud ? 'Syncing…' : 'Push to Cloud Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePullCloudMemories}
                      disabled={isSyncingCloud}
                      className="h-11 px-4 bg-surface hover:bg-surface-highlight text-primary rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] border border-surface-highlight disabled:opacity-50"
                    >
                      <CloudDownload className="w-4 h-4 text-accent" />
                      <span>Pull from Cloud</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-bg/45 border border-surface-highlight/80 rounded-2xl p-5 text-center space-y-4">
                  <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
                    Connect your Google Account to back up your memories in Firestore, or use the anonymous Cloud Sync buttons below with your Device Key.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningInGoogle}
                      className="w-full sm:w-auto h-11 px-6 bg-surface hover:bg-surface-highlight text-primary border border-surface-highlight rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>{isSigningInGoogle ? 'Connecting…' : 'Sign in with Google'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloudSyncNow}
                      disabled={isSyncingCloud}
                      className="w-full sm:w-auto h-11 px-5 bg-accent/12 hover:bg-accent/20 text-accent border border-accent/25 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>{isSyncingCloud ? 'Syncing…' : 'Sync with Device Key'}</span>
                    </button>
                  </div>
                </div>
              )}

              {syncStatusMsg && (
                <p className="text-xs text-accent font-medium bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 animate-fade-in flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{syncStatusMsg}</span>
                </p>
              )}
            </div>

            {/* Card 2: Anonymous Device Key & Recovery */}
            <div className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-bg border border-surface-highlight text-accent flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary">Device Key &amp; Recovery</h3>
                  <p className="text-xs text-secondary">Zero-knowledge recovery key for anonymous cloud sync</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-secondary mb-1.5">Your Active Device Key</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow bg-surface-lowest border border-surface-highlight rounded-2xl px-4 h-11 flex items-center justify-between font-mono text-xs overflow-x-auto">
                    {showKey ? (
                      <span className="text-primary break-all select-all font-semibold">{currentKey}</span>
                    ) : (
                      <span className="text-secondary/45 select-none tracking-wider">••••••••-••••-••••-••••-••••••••••••</span>
                    )}
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)} 
                      className="ml-2 text-secondary hover:text-accent transition-colors shrink-0 p-1"
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={handleCopyKey}
                    className="h-11 px-5 bg-surface-highlight/70 text-primary hover:bg-surface-highlight rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-xs shrink-0"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-highlight/60">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-secondary mb-1.5">Restore Existing Key</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value.trim())}
                    placeholder="Paste a saved Device Key to restore session…"
                    className="flex-grow h-11 bg-surface-lowest border border-surface-highlight rounded-2xl px-4 text-primary placeholder:text-secondary/45 focus:outline-none focus:border-accent transition-colors font-mono text-xs"
                  />
                  <button 
                    type="button"
                    onClick={handleRestoreSession}
                    disabled={!inputKey.trim()}
                    className="h-11 px-5 bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-xs shrink-0"
                  >
                    Restore Session
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Offline JSON Archive & Backup */}
            <div className="bg-surface border border-surface-highlight rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-bg border border-surface-highlight text-accent flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-primary">Offline Archive &amp; Portability</h3>
                  <p className="text-xs text-secondary">Import past backups or download a portable JSON archive</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {onOpenImportModal && (
                  <button
                    type="button"
                    onClick={onOpenImportModal}
                    className="h-11 px-5 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Memories</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => exportMemoriesAsJSON(journalEntries)}
                  className="h-11 px-5 bg-surface-highlight/70 hover:bg-surface-highlight text-primary border border-surface-highlight rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-accent" />
                  <span>Export JSON ({journalEntries.length})</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Public Profile Sanctuary Preview Modal */}
      <AnimatePresence>
        {showPublicProfilePreview && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-start p-2 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-bg w-full max-w-2xl rounded-3xl overflow-hidden relative shadow-2xl border border-surface-highlight my-auto"
            >
              <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-surface-highlight px-4 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-accent truncate">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate">{window.location.host}/p/{username || 'your-handle'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublicProfilePreview(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-highlight/60 active:scale-95 transition shrink-0"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[82vh] overflow-y-auto">
                <PublicProfileView profile={currentProfileSnapshot} isPreview />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blog Post Modal Preview */}
      <AnimatePresence>
        {previewBlogEntry && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-start py-4 sm:py-10 px-2 sm:px-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#FAF9F6] dark:bg-[#0E0E10] w-full max-w-3xl rounded-3xl overflow-hidden relative shadow-2xl border border-surface-highlight my-auto"
            >
              <div className="sticky top-0 z-50 bg-[#FAF9F6]/95 dark:bg-[#0E0E10]/95 backdrop-blur-md border-b border-[#E7E5E4] dark:border-neutral-800 px-5 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-accent truncate">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate">{window.location.host}/share/{previewBlogEntry.id.slice(0, 8)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewBlogEntry(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-highlight/60 active:scale-95 transition"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BlogView 
                entry={previewBlogEntry} 
                profile={currentProfileSnapshot} 
                allSharedEntries={currentProfileSnapshot.sharedEntries || []}
                isStandalonePage={false}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PublicProfileView = ({ profile, isPreview = false }: { profile: UserProfile; isPreview?: boolean }) => {
  const isSingle = profile.isSingleEntry;
  const singleEntry = profile.sharedEntries?.[0];
  const [copied, setCopied] = useState(false);
  const [activeBlogEntry, setActiveBlogEntry] = useState<JournalEntry | null>(null);

  const handleShareCurrentPage = () => {
    const shareUrl = profile.username
      ? `${window.location.origin}/p/${profile.username}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSingle && singleEntry) {
    return <BlogView entry={singleEntry} profile={profile} allSharedEntries={profile.sharedEntries} />;
  }

  if (activeBlogEntry) {
    return (
      <div className="relative">
        <button
          type="button"
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

  return (
    <div className={`${isPreview ? 'p-4 sm:p-6' : 'min-h-screen p-4 sm:p-6 flex items-center justify-center'} bg-bg text-primary font-sans transition duration-300 animate-fade-in relative overflow-hidden`}>
      <div className="w-full max-w-xl mx-auto bg-surface border border-surface-highlight rounded-3xl p-6 sm:p-10 shadow-lg relative flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight/70 border border-surface-highlight text-[10px] font-bold uppercase tracking-wider text-secondary mb-10">
          <Compass className="w-3.5 h-3.5 text-accent" />
          <span>Zournel Sanctuary</span>
        </div>
        
        <div className="relative mb-6 pt-3">
          <AnimateThoughtBubble thought={profile.thought} isEditable={false} />
          
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-surface-highlight border-4 border-surface shadow-xl overflow-hidden flex items-center justify-center">
            {profile.picture ? (
              <img src={profile.picture} alt={`${profile.name}'s avatar`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-highlight">
                 <User className="w-11 h-11 text-secondary opacity-40" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary mb-1.5 tracking-tight text-center break-words">
          {profile.name || 'Anonymous Creator'}
        </h1>
        
        {profile.username && (
          <span className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-3 py-0.5 rounded-full mb-4">
            @{profile.username}
          </span>
        )}

        {profile.bio && (
          <p className="text-secondary text-xs sm:text-sm leading-relaxed mb-6 max-w-sm text-center">
            {profile.bio}
          </p>
        )}

        {profile.sharedEntries && profile.sharedEntries.length > 0 ? (
          <div className="w-full text-left mt-2 pt-6 border-t border-surface-highlight/60">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Calendar className="w-3.5 h-3.5 text-secondary/60" />
              <h3 className="text-[11px] font-mono font-bold text-secondary tracking-wider uppercase text-center">
                Shared Memories ({profile.sharedEntries.length})
              </h3>
            </div>
            
            <div className="space-y-4">
              {profile.sharedEntries.map(entry => (
                <div 
                  key={entry.id} 
                  onClick={() => setActiveBlogEntry(entry)}
                  className="bg-bg/50 hover:bg-bg/90 p-5 rounded-2xl border border-surface-highlight hover:border-accent/40 shadow-2xs transition duration-200 cursor-pointer group"
                >
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="font-bold text-primary group-hover:text-accent transition-colors text-sm sm:text-base truncate">
                      {entry.title || extractAutoTitle(entry.content)}
                    </span>
                    <span className="px-2.5 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1 shrink-0">
                      <BookOpen className="w-3 h-3" />
                      <span>Read</span>
                    </span>
                  </div>
                  <p className="text-secondary text-xs sm:text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {entry.content}
                  </p>
                  
                  {entry.image && (
                    <div className="mt-3 rounded-xl overflow-hidden max-h-44 border border-surface-highlight/40">
                      <img src={entry.image} alt="Memory illustration" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {entry.aiInsight && (
                    <div className="mt-3 pt-3 border-t border-surface-highlight/40 flex items-start gap-2">
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
          <div className="w-full text-center mt-2 py-8 border-t border-surface-highlight/60">
            <p className="text-xs text-secondary/60 font-medium">This sanctuary is resting. No public memories shared yet.</p>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-2.5 w-full justify-center">
          <button
            type="button"
            onClick={handleShareCurrentPage}
            className="h-11 px-5 bg-surface-highlight/70 text-primary hover:bg-surface-highlight rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-xs"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Profile Link Copied!' : 'Copy Page Link'}</span>
          </button>
          
          {!isPreview && (
            <button 
              type="button"
              onClick={() => window.location.href = window.location.origin}
              className="h-11 px-5 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition active:scale-95 text-xs"
            >
              <span>Create your own Zournel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
