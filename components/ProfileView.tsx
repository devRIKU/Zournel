import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, JournalEntry } from '../types';
import { motion } from 'motion/react';
import { 
  Camera, Copy, Check, Share, ExternalLink, User, Key, Eye, EyeOff, 
  Sparkles, Lock, Globe, Calendar, ArrowRight, Heart, Cloud, Compass
} from 'lucide-react';
import { getLocalUserId, setLocalUserId } from '../services/authService';

interface ProfileViewProps {
  profile: UserProfile | undefined;
  journalEntries: JournalEntry[];
  onUpdateProfile: (profile: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, journalEntries, onUpdateProfile }) => {
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [thought, setThought] = useState(profile?.thought || '');
  const [picture, setPicture] = useState(profile?.picture || '');
  const [sharedEntryIds, setSharedEntryIds] = useState<string[]>(profile?.sharedEntries?.map(e => e.id) || []);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [copiedMemoryId, setCopiedMemoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const currentKey = getLocalUserId();

  const [isPublishing, setIsPublishing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');

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
      
      // Persist any entries that are checked as shared
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
        // Upload the shared memory to firestore as shared
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

  return (
    <div className="w-full max-w-2xl mx-auto pb-32 pt-8 px-4 sm:px-0">
      <div className="bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-12 shadow-sm relative overflow-hidden">
        
        {/* Soft atmospheric glow inside editor */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-10">
          <h2 className="text-2xl font-display font-bold text-primary tracking-tight">Digital Sanctuary Identity</h2>
          <p className="text-xs sm:text-sm text-secondary mt-1">Customize how your thoughts and memories look to others.</p>
        </div>
        
        <div className="flex flex-col items-center mb-12">
          {/* Avatar Container with Thought Bubble */}
          <div className="relative mb-12">
            <AnimateThoughtBubble thought={thought} />
            
            <div 
              className="w-32 h-32 rounded-full bg-bg border-4 border-surface shadow-xl overflow-hidden relative group cursor-pointer flex items-center justify-center transition-transform hover:scale-[1.02]"
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
              className="absolute bottom-0 right-1 p-2.5 bg-accent text-accent-fg rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
              title="Upload Photo"
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

          <div className="w-full space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-primary focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="What should we call you?"
              />
            </div>
            
            {/* Current Thought */}
            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2 flex items-center justify-between">
                <span>Current Thought</span>
                <span className="text-[10px] font-mono font-medium lowercase tracking-normal text-secondary/55">floats as a cloud bubble above your avatar</span>
              </label>
              <input 
                type="text" 
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-primary focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="What is drifting through your mind right now?"
                maxLength={60}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-2xl px-4 py-3 text-primary focus:outline-none focus:border-accent/50 transition-colors resize-none min-h-[100px]"
                placeholder="A gentle narrative about who you are..."
              />
            </div>

            {/* Public Username */}
            <div className="pt-2">
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Public Username</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <span className="bg-bg text-secondary/70 px-4 py-3 rounded-2xl flex items-center justify-center border border-surface-highlight text-xs sm:text-sm shrink-0">
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
              <p className="text-[10px] text-secondary mt-2 text-center sm:text-left opacity-70">Used for your public sanctuary profile page URL. Letters, numbers, hyphens, and underscores only.</p>
            </div>

            {/* Fine-Grained Memories Sharing controls */}
            {journalEntries.length > 0 && (
              <div className="pt-6 border-t border-surface-highlight/60">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-primary tracking-tight">Memories Sharing Controls</h3>
                  <p className="text-xs text-secondary mt-0.5">Configure who gets to see individual elements of your journey.</p>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {journalEntries.map(entry => {
                    const isSharedOnProfile = sharedEntryIds.includes(entry.id);
                    const isCopied = copiedMemoryId === entry.id;

                    return (
                      <div 
                        key={entry.id} 
                        className={`p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${isSharedOnProfile ? 'bg-accent/[0.03] border-accent/30' : 'bg-bg/50 border-surface-highlight hover:border-surface-highlight/80'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleShareEntry(entry.id)}>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSharedOnProfile ? 'bg-accent border-accent text-accent-fg' : 'border-secondary/30 bg-bg'}`}>
                              {isSharedOnProfile && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-primary truncate max-w-[200px]">
                              {entry.title || new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Toggle visibility badge */}
                            <button
                              onClick={() => toggleShareEntry(entry.id)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${isSharedOnProfile ? 'bg-accent/10 border-accent/25 text-accent' : 'bg-surface-highlight border-transparent text-secondary hover:text-primary'}`}
                              title={isSharedOnProfile ? "Visible on Public Profile" : "Hidden from Public Profile"}
                            >
                              {isSharedOnProfile ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              <span>{isSharedOnProfile ? 'Visible' : 'Private'}</span>
                            </button>

                            {/* Copy direct link */}
                            <button 
                               onClick={() => copySingleMemoryLink(entry.id)}
                               className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${isCopied ? 'bg-accent border-accent text-accent-fg' : 'bg-bg border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight'}`}
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Share className="w-3 h-3" />}
                              <span>{isCopied ? "Copied!" : "Direct Link"}</span>
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
        </div>

        {/* Publish Action Section */}
        <div className="pt-8 border-t border-surface-highlight/60">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-primary">Publish Entire Profile</h3>
              <p className="text-xs sm:text-sm text-secondary">Make your profile and all selected memories accessible via your public URL.</p>
            </div>
            
            <button
              onClick={handlePublish}
              disabled={isPublishing || !username}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm shadow-sm ${
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

      {/* Access & Session Recovery */}
      <div className="mt-8 bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-bg rounded-2xl text-accent border border-surface-highlight">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-primary tracking-tight">Access & Session Recovery</h3>
        </div>
        <p className="text-xs sm:text-sm text-secondary leading-relaxed mb-6 opacity-90">
          Zournel is completely anonymous and does not use passwords. Your claimed username and shared entries are secured using a unique, random <strong>Device Key</strong>. Save your key in a secure place so you can recover your session on another browser or device.
        </p>

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
                className="px-6 py-3 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 text-xs sm:text-sm shrink-0"
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
                className="px-6 py-3 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition-opacity active:scale-95 text-xs sm:text-sm shrink-0"
              >
                Restore Session
              </button>
            </div>
            <p className="text-[10px] text-secondary mt-2 text-center sm:text-left opacity-70">
              Warning: This will reload the page and overwrite your current browser session. Ensure your current key is backed up first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimateThoughtBubble = ({ thought }: { thought: string }) => {
  if (!thought) return null;
  
  return (
    <div className="absolute bottom-[calc(100%+1.5rem)] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="bg-accent/10 border border-accent/25 text-primary px-5 py-3 rounded-[2rem] shadow-sm text-center text-xs sm:text-sm font-medium leading-relaxed max-w-[240px] break-words backdrop-blur-md"
      >
        "{thought}"
      </motion.div>
      {/* Cloud-inspired thought bubbles/dots */}
      <motion.div 
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-3.5 h-3.5 bg-accent/15 border border-accent/25 rounded-full mt-2.5 shadow-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-2 h-2 bg-accent/15 border border-accent/25 rounded-full mt-1.5 shadow-sm"
      />
    </div>
  );
};

export const PublicProfileView = ({ profile }: { profile: UserProfile }) => {
  const isSingle = profile.isSingleEntry;
  const singleEntry = profile.sharedEntries?.[0];
  const [copied, setCopied] = useState(false);

  const handleShareCurrentPage = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. STANDALONE SINGLE MEMORY VIEW
  if (isSingle && singleEntry) {
    return (
      <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center p-4 sm:p-6 transition-all duration-500 animate-fade-in relative overflow-hidden">
        {/* Soft decorative blur background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="w-full max-w-lg relative z-10 my-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-semibold uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shared Memory</span>
            </div>
            <h1 className="text-xs font-grotesk font-medium tracking-[0.2em] text-secondary uppercase">
              A private moment shared from Zournel
            </h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-10 shadow-lg relative overflow-hidden backdrop-blur-md"
          >
            {/* Header of card */}
            <div className="flex justify-between items-start border-b border-surface-highlight pb-6 mb-6">
              <div>
                <span className="text-xs font-mono text-secondary tracking-wider block mb-1">
                  {new Date(singleEntry.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <h2 className="text-2xl font-display font-bold text-primary tracking-tight">
                  {singleEntry.title || 'Memory'}
                </h2>
              </div>
              {singleEntry.mood && (
                <span className="px-3 py-1 bg-accent/15 border border-accent/25 text-accent text-xs font-semibold uppercase tracking-wider rounded-full">
                  {singleEntry.mood}
                </span>
              )}
            </div>

            {/* Main image (if any) */}
            {singleEntry.image && (
              <div className="mb-6 rounded-2xl overflow-hidden shadow-sm max-h-64 border border-surface-highlight">
                <img src={singleEntry.image} alt="Memory illustration" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Content text */}
            <p className="text-primary text-base sm:text-lg leading-relaxed italic opacity-95 mb-8 font-light select-text whitespace-pre-wrap">
              "{singleEntry.content}"
            </p>

            {/* AI Insight (if any) */}
            {singleEntry.aiInsight && (
              <div className="bg-accent/5 border border-accent/15 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-accent">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">AI Reflection</span>
                </div>
                <p className="text-secondary text-xs sm:text-sm leading-relaxed italic">
                  {singleEntry.aiInsight}
                </p>
              </div>
            )}
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              onClick={handleShareCurrentPage}
              className="px-6 py-3.5 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm shrink-0 w-full sm:w-auto"
            >
              {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied Link!" : "Copy Memory Link"}</span>
            </button>
            <button
              onClick={() => window.location.href = window.location.origin}
              className="px-6 py-3.5 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm w-full sm:w-auto flex-grow"
            >
              <span>Create Your Own Zournel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ENTIRE USER PROFILE VIEW
  return (
    <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center p-4 sm:p-6 transition-all duration-500 animate-fade-in relative overflow-hidden">
      {/* Soft atmospheric background blur */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-12 shadow-lg relative flex flex-col items-center my-8 backdrop-blur-md">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight border border-surface-highlight text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-10">
          <Compass className="w-3.5 h-3.5 text-accent" />
          <span>Zournel Profile</span>
        </div>
        
        {/* Profile Picture with Cloud Thought Bubble */}
        <div className="relative mb-8">
          <AnimateThoughtBubble thought={profile.thought} />
          
          <div className="w-36 h-36 rounded-full bg-surface-highlight border-4 border-surface shadow-xl overflow-hidden flex items-center justify-center">
            {profile.picture ? (
              <img src={profile.picture} alt={`${profile.name}'s avatar`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-highlight">
                 <User className="w-12 h-12 text-secondary opacity-40 stroke-[1.5]" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-primary mb-3 tracking-tight text-center">{profile.name || 'Anonymous Creator'}</h1>
        
        {profile.username && (
          <span className="text-xs font-mono text-accent bg-accent/5 border border-accent/15 px-3 py-1 rounded-full mb-6">
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
              <h3 className="text-xs font-bold text-secondary tracking-widest uppercase text-center">Shared Memories</h3>
            </div>
            
            <div className="space-y-5">
              {profile.sharedEntries.map(entry => (
                <div key={entry.id} className="bg-bg/40 p-6 rounded-[2rem] border border-surface-highlight shadow-xs hover:shadow-sm transition-all duration-300">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary text-xs sm:text-sm">
                      {entry.title || new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    {entry.mood && (
                      <span className="px-2.5 py-1 bg-accent/10 border border-accent/15 rounded-full text-[9px] font-bold uppercase tracking-wider text-accent">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-secondary text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-light opacity-95">{entry.content}</p>
                  
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

        <div className="mt-12 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={handleShareCurrentPage}
            className="px-6 py-3 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Profile Link Copied!" : "Copy Page Link"}</span>
          </button>
          
          <button 
            onClick={() => window.location.href = window.location.origin}
            className="px-6 py-3 bg-accent text-accent-fg hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
          >
            <span>Create your own Zournel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
