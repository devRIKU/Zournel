import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Camera, Copy, Check, Share, ExternalLink, User } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');

  useEffect(() => {
    const sharedEntries = journalEntries.filter(e => sharedEntryIds.includes(e.id));
    onUpdateProfile({ name, bio, thought, picture, sharedEntries, username });
  }, [name, bio, thought, picture, sharedEntryIds, journalEntries, username]);

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
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: any) {
      alert(error.message || "Failed to publish profile.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyShareLink = async (entryId: string) => {
    try {
      const { shareJournalEntry } = await import('../services/dbService');
      const entry = journalEntries.find(e => e.id === entryId);
      if (entry) {
        await shareJournalEntry(entry, username || undefined);
        const link = `${window.location.origin}/share/${entryId}`;
        navigator.clipboard.writeText(link);
        alert("Share link copied to clipboard!");
      }
    } catch (e) {
      alert("Failed to create share link.");
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

  const getShareableLink = () => {
    const sharedEntries = journalEntries.filter(e => sharedEntryIds.includes(e.id));
    const payload = btoa(encodeURIComponent(JSON.stringify({ name, bio, thought, picture, sharedEntries })));
    return `${window.location.origin}${window.location.pathname}?profile=${payload}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareableLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-32 pt-8">
      <div className="bg-surface border border-surface-highlight rounded-[2rem] p-8 sm:p-12 shadow-sm">
        <h2 className="text-xl font-bold text-primary mb-8 text-center tracking-tight">Your Profile</h2>
        
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <AnimateThoughtBubble thought={thought} />
            
            <div 
              className="w-32 h-32 rounded-full bg-surface-highlight border-4 border-surface shadow-lg overflow-hidden relative group cursor-pointer flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {picture ? (
                <img src={picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-secondary opacity-50" />
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>

          <div className="w-full space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors"
                placeholder="What should we call you?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Current Thought</label>
              <input 
                type="text" 
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors"
                placeholder="What's on your mind right now?"
                maxLength={60}
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-bg border border-surface-highlight rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors resize-none min-h-[100px]"
                placeholder="A little about yourself..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Public Username</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <span className="bg-surface-highlight text-secondary px-4 py-3 rounded-xl flex items-center justify-center border border-transparent text-xs sm:text-sm shrink-0">zournel.vercel.app/p/</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="flex-grow bg-bg border border-surface-highlight rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-accent transition-colors text-center sm:text-left"
                  placeholder="username"
                />
              </div>
              <p className="text-[10px] text-secondary mt-2 text-center sm:text-left">Used for your public profile URL. Alphanumeric only.</p>
            </div>

            {journalEntries.length > 0 && (
              <div>
                <label className="block text-xs font-bold tracking-[0.15em] uppercase text-secondary mb-2">Share Memories</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {journalEntries.map(entry => (
                    <div 
                      key={entry.id} 
                      className={`p-4 rounded-xl border transition-all ${sharedEntryIds.includes(entry.id) ? 'bg-accent/10 border-accent' : 'bg-bg border-surface-highlight hover:border-accent/50'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleShareEntry(entry.id)}>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${sharedEntryIds.includes(entry.id) ? 'bg-accent border-accent text-accent-fg' : 'border-secondary/30'}`}>
                            {sharedEntryIds.includes(entry.id) && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-bold truncate">{entry.title || new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button 
                           onClick={(e) => { e.stopPropagation(); copyShareLink(entry.id); }}
                           className="text-xs font-bold uppercase tracking-widest text-secondary hover:text-accent transition-colors"
                        >
                           Link
                        </button>
                      </div>
                      <p className="text-xs text-secondary line-clamp-2 ml-8 cursor-pointer" onClick={() => toggleShareEntry(entry.id)}>{entry.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-surface-highlight">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-primary mb-1">Publish Profile</h3>
              <p className="text-sm text-secondary">Save and get your public share link.</p>
            </div>
            
            <button
              onClick={handlePublish}
              disabled={isPublishing || !username}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                 (isPublishing || !username) ? 'bg-surface-highlight text-secondary cursor-not-allowed' : 'bg-accent text-accent-fg hover:opacity-90'
              }`}
            >
              {isPublishing ? (
                <span>Publishing...</span>
              ) : copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share className="w-4 h-4" />
                  <span>Publish Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimateThoughtBubble = ({ thought }: { thought: string }) => {
  if (!thought) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="absolute bottom-[calc(100%+1rem)] left-1/2 -translate-x-1/2 min-w-[120px] max-w-[200px] bg-primary text-bg px-4 py-2 rounded-2xl shadow-lg z-10 text-center text-sm font-medium"
    >
      {thought}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
    </motion.div>
  );
};

export const PublicProfileView = ({ profile }: { profile: UserProfile }) => {
  return (
    <div className="min-h-screen bg-bg text-primary font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-surface-highlight rounded-[2.5rem] p-8 sm:p-12 shadow-lg relative flex flex-col items-center text-center">
        <h2 className="absolute top-8 text-xs font-bold uppercase tracking-[0.2em] text-secondary">Zournel Profile</h2>
        
        <div className="mt-12 relative mb-6">
          <AnimateThoughtBubble thought={profile.thought} />
          
          <div className="w-40 h-40 rounded-full bg-surface-highlight border-4 border-surface shadow-xl overflow-hidden">
            {profile.picture ? (
              <img src={profile.picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                 <User className="w-12 h-12 text-secondary opacity-50" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold text-primary mb-4">{profile.name || 'Anonymous'}</h1>
        
        {profile.bio && (
          <p className="text-secondary leading-relaxed mb-8 max-w-sm">
            {profile.bio}
          </p>
        )}

        {profile.sharedEntries && profile.sharedEntries.length > 0 && (
          <div className="w-full text-left mt-8 pt-8 border-t border-surface-highlight">
            <h3 className="text-sm font-bold text-primary mb-6 tracking-wide uppercase text-center">Shared Memories</h3>
            <div className="space-y-4">
              {profile.sharedEntries.map(entry => (
                <div key={entry.id} className="bg-bg p-5 rounded-2xl border border-surface-highlight shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary text-sm">{entry.title || new Date(entry.createdAt).toLocaleDateString()}</span>
                    {entry.mood && <span className="px-2 py-1 bg-surface rounded-md text-[10px] font-bold uppercase tracking-widest text-secondary">{entry.mood}</span>}
                  </div>
                  <p className="text-secondary text-sm leading-relaxed">{entry.content}</p>
                  {entry.image && (
                    <div className="mt-4 rounded-xl overflow-hidden">
                       <img src={entry.image} alt="Memory" className="w-full object-cover max-h-48" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={() => window.location.href = window.location.origin}
          className="mt-12 px-6 py-3 bg-surface-highlight text-primary rounded-xl font-bold hover:opacity-90 transition-opacity active:scale-95 text-sm"
        >
          Create your own Zournel
        </button>
      </div>
    </div>
  );
};
