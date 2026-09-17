import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, Copy, Check, ArrowRight, User, Calendar, Clock, BookOpen, Share2, Heart, ExternalLink, Bookmark, Sun, Moon } from './Icons';
import { JournalEntry, UserProfile } from '../types';
import { extractAutoTitle } from '../services/geminiService';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';

interface BlogViewProps {
  entry: JournalEntry;
  profile?: UserProfile;
  allSharedEntries?: JournalEntry[];
  onSelectEntry?: (entry: JournalEntry) => void;
  isStandalonePage?: boolean;
}

export const BlogView: React.FC<BlogViewProps> = ({ 
  entry, 
  profile, 
  allSharedEntries = [], 
  onSelectEntry,
  isStandalonePage = true 
}) => {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(12);
  const [hasLiked, setHasLiked] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
      (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const authorName = profile?.name || 'Sanniva';
  const authorUsername = profile?.username || 'sanniva';
  const authorPic = profile?.picture;
  const authorBio = profile?.bio || 'Documenting life, thoughts, and memories.';

  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const displayTitle = entry.title || extractAutoTitle(entry.content);
  const domainPath = `${authorUsername.toLowerCase()}.journal.blog`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(20); } catch (e) {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleLike = () => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(15); } catch (e) {}
    }
    if (hasLiked) {
      setLikesCount(prev => prev - 1);
      setHasLiked(false);
    } else {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
    }
  };

  return (
    <div className={`min-h-screen font-sans transition duration-300 selection:bg-accent/20 selection:text-accent ${
      isDarkMode ? 'bg-[#0E0E10] text-slate-100' : 'bg-[#FAFAFA] text-[#111]'
    }`}>
      {/* Minimal Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 transition duration-300 ${
        isDarkMode ? 'bg-[#0E0E10]/80 border-neutral-800/80' : 'bg-[#FAFAFA]/80 border-neutral-200/80'
      }`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent text-accent-fg flex items-center justify-center font-display font-bold text-xs shadow-2xs">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <span className={`text-xs font-semibold tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-neutral-900'}`}>
              {authorName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`p-2 rounded-full border text-xs transition flex items-center justify-center shadow-2xs active:scale-95 ${
                isDarkMode 
                  ? 'bg-neutral-900 border-neutral-800 text-amber-300 hover:bg-neutral-800' 
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                isDarkMode 
                  ? 'bg-neutral-900 border-neutral-800 text-slate-200 hover:border-neutral-700' 
                  : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Article Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <article className="space-y-8">
          {/* Article Header */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono opacity-70">
              <time dateTime={entry.createdAt}>{formattedDate}</time>
              <span>•</span>
              <span>{readTimeMinutes} min read</span>
              {entry.mood && (
                <>
                  <span>•</span>
                  <span>{entry.mood}</span>
                </>
              )}
            </div>

            <h1 className={`text-2xl sm:text-4xl font-display font-bold tracking-tight leading-snug sm:leading-tight ${
              isDarkMode ? 'text-slate-100' : 'text-neutral-900'
            }`}>
              {displayTitle}
            </h1>

            {/* Author Row */}
            <div className={`flex items-center justify-between py-4 border-y ${
              isDarkMode ? 'border-neutral-800/80' : 'border-neutral-200/80'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full overflow-hidden border flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
                }`}>
                  {authorPic ? (
                    <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-neutral-400'}`} />
                  )}
                </div>
                <div>
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-neutral-900'}`}>
                    {authorName}
                  </div>
                  <div className="text-[11px] font-mono opacity-60">
                    @{authorUsername}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleLike}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition flex items-center gap-1.5 ${
                    hasLiked 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                      : isDarkMode 
                      ? 'bg-neutral-900 border-neutral-800 text-slate-300 hover:text-slate-100' 
                      : 'bg-white border-neutral-200 text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current text-red-500' : ''}`} />
                  <span>{likesCount}</span>
                </button>

                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`p-2 rounded-full border transition ${
                    bookmarked 
                      ? 'bg-accent/15 border-accent text-accent' 
                      : isDarkMode 
                      ? 'bg-neutral-900 border-neutral-800 text-slate-300' 
                      : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                  title="Bookmark"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>

          {/* Optional Media */}
          {entry.image && (
            <div className={`rounded-2xl overflow-hidden border ${
              isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
            }`}>
              <img 
                src={entry.image} 
                alt={displayTitle} 
                className="w-full max-h-[400px] object-cover" 
              />
            </div>
          )}

          {/* Article Body */}
          <div className={`text-base sm:text-lg leading-[1.85] font-serif select-text whitespace-pre-wrap space-y-6 ${
            isDarkMode ? 'text-slate-200' : 'text-neutral-800'
          }`}>
            {entry.content}
          </div>

          {/* Author Footer */}
          <footer className={`pt-8 border-t space-y-8 ${
            isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
          }`}>
            <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left ${
              isDarkMode ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className={`w-14 h-14 rounded-full overflow-hidden border flex items-center justify-center shrink-0 ${
                isDarkMode ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
              }`}>
                {authorPic ? (
                  <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                  <User className={`w-6 h-6 ${isDarkMode ? 'text-slate-500' : 'text-neutral-400'}`} />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-neutral-900'}`}>
                  {authorName}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed opacity-70`}>
                  {authorBio}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-accent text-accent-fg font-medium text-xs hover:opacity-90 transition shrink-0 active:scale-95"
              >
                {copied ? 'Link Copied' : 'Share Story'}
              </button>
            </div>

            {/* Other Stories */}
            {allSharedEntries.length > 1 && (
              <div className="space-y-4 pt-4">
                <h4 className={`text-xs font-mono uppercase tracking-wider opacity-60`}>
                  More Stories
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allSharedEntries.filter(e => e.id !== entry.id).slice(0, 4).map(other => (
                    <div 
                      key={other.id} 
                      onClick={() => onSelectEntry && onSelectEntry(other)}
                      className={`p-4 border rounded-xl cursor-pointer hover:border-accent transition group ${
                        isDarkMode 
                          ? 'bg-neutral-900/40 border-neutral-800' 
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-50 block mb-1">
                        {new Date(other.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <h5 className={`font-display font-semibold text-sm group-hover:text-accent transition line-clamp-2 ${
                        isDarkMode ? 'text-slate-200' : 'text-neutral-900'
                      }`}>
                        {other.title || extractAutoTitle(other.content)}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subtle Brand Footer */}
            <div className="text-center pt-8 pb-4 text-xs font-mono opacity-40">
              <span>Zournel Journal</span>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
};
