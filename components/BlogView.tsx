import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Copy, Check, ArrowRight, User, Calendar, Clock, BookOpen, Share2, Heart, ExternalLink, Bookmark, Sun, Moon } from 'lucide-react';
import { JournalEntry, UserProfile } from '../types';
import { extractAutoTitle } from '../services/geminiService';

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
  const authorBio = profile?.bio || 'Documenting life, thoughts, and memories on Zournel.';

  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const displayTitle = entry.title || extractAutoTitle(entry.content);
  const domainPath = `blog-${authorUsername.toLowerCase()}.vercel.app/friends`;

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
    <div className={`min-h-screen font-sans transition duration-500 selection:bg-accent/20 selection:text-accent ${
      isDarkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-[#FAF9F6] text-[#1C1917]'
    }`}>
      {/* Top Simulated Blog Address Bar / Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 transition duration-500 ${
        isDarkMode ? 'bg-[#0F172A]/90 border-slate-800' : 'bg-[#FAF9F6]/90 border-[#E7E5E4]'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-fg flex items-center justify-center font-display font-bold text-sm shadow-xs">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className={`text-xs font-bold tracking-tight block leading-tight ${
                isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'
              }`}>
                {authorName}'s Journal Blog
              </span>
              <div className={`flex items-center gap-1.5 text-[10px] font-mono ${
                isDarkMode ? 'text-slate-400' : 'text-[#78716C]'
              }`}>
                <Globe className="w-2.5 h-2.5 text-accent" />
                <span>{domainPath}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`p-2 rounded-full border text-xs font-semibold transition flex items-center justify-center shadow-xs active:scale-95 ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                  : 'bg-white border-[#E7E5E4] text-[#44403C] hover:border-accent'
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition flex items-center gap-1.5 shadow-xs active:scale-95 ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-accent hover:text-accent' 
                  : 'bg-white border-[#E7E5E4] text-[#44403C] hover:border-accent hover:text-accent'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-accent" />}
              <span>{copied ? 'Copied!' : 'Share Article'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Blog Post Wrapper */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Breadcrumb Navigation */}
        <nav className={`flex items-center gap-2 text-xs font-mono mb-8 ${
          isDarkMode ? 'text-slate-400' : 'text-[#78716C]'
        }`}>
          <span>Home</span>
          <span>/</span>
          <span className="text-accent font-semibold">Friends & Personal</span>
          <span>/</span>
          <span className="truncate max-w-[150px]">{displayTitle}</span>
        </nav>

        {/* Article Meta Header */}
        <article>
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Personal Memory</span>
              </span>
              {entry.mood && (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-[#F5F5F4] border-[#E7E5E4] text-[#57534E]'
                }`}>
                  {entry.mood}
                </span>
              )}
              <span className={`text-xs font-mono flex items-center gap-1 ml-auto ${
                isDarkMode ? 'text-slate-400' : 'text-[#78716C]'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{readTimeMinutes} min read</span>
              </span>
            </div>

            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-[1.15] mb-6 ${
              isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'
            }`}>
              {displayTitle}
            </h1>

            {/* Author Profile Row */}
            <div className={`flex items-center justify-between border-y py-4 my-6 ${
              isDarkMode ? 'border-slate-800' : 'border-[#E7E5E4]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full overflow-hidden border flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-[#E7E5E4] bg-[#F5F5F4]'
                }`}>
                  {authorPic ? (
                    <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-6 h-6 ${isDarkMode ? 'text-slate-500' : 'text-[#A8A29E]'}`} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'}`}>{authorName}</span>
                    <span className="text-xs text-accent font-mono">@{authorUsername}</span>
                  </div>
                  <span className={`text-xs block font-mono ${isDarkMode ? 'text-slate-400' : 'text-[#78716C]'}`}>{formattedDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleLike}
                  className={`p-2.5 rounded-full border transition flex items-center gap-1.5 text-xs font-bold ${
                    hasLiked 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                      : isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100' 
                      : 'bg-white border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]'
                  }`}
                  title="Appreciate this entry"
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-red-500' : ''}`} />
                  <span>{likesCount}</span>
                </button>
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`p-2.5 rounded-full border transition ${
                    bookmarked 
                      ? 'bg-accent/15 border-accent text-accent' 
                      : isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100' 
                      : 'bg-white border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]'
                  }`}
                  title="Save article"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Cover Photo Image */}
          {entry.image && (
            <div className={`mb-10 rounded-3xl overflow-hidden border shadow-md ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-[#E7E5E4] bg-[#F5F5F4]'
            }`}>
              <img 
                src={entry.image} 
                alt={displayTitle} 
                className="w-full max-h-[480px] object-cover hover:scale-[1.01] transition duration-700" 
              />
              <div className={`px-5 py-2.5 border-t text-[11px] font-mono italic text-center ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-[#E7E5E4] text-[#78716C]'
              }`}>
                Visual memory capture attached to this entry
              </div>
            </div>
          )}

          {/* Article Main Text Body */}
          <div className={`max-w-none text-lg leading-[1.85] font-serif select-text whitespace-pre-wrap mb-10 ${
            isDarkMode ? 'text-slate-200' : 'text-[#292524]'
          }`}>
            {entry.content}
          </div>

          {/* AI Insight Editorial Box */}
          {entry.aiInsight && (
            <div className={`my-10 p-6 sm:p-8 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-l-4 border-accent rounded-r-3xl shadow-xs relative overflow-hidden`}>
              <div className="flex items-center gap-2 mb-3 text-accent font-bold text-xs uppercase tracking-widest font-mono">
                <Sparkles className="w-4 h-4" />
                <span>AI Editorial Reflection</span>
              </div>
              <p className={`font-display italic text-base sm:text-lg leading-relaxed ${
                isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'
              }`}>
                "{entry.aiInsight}"
              </p>
            </div>
          )}

          {/* Author Sign-Off Card */}
          <footer className={`mt-14 pt-8 border-t ${
            isDarkMode ? 'border-slate-800' : 'border-[#E7E5E4]'
          }`}>
            <div className={`p-6 sm:p-8 border rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xs ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-[#E7E5E4]'
            }`}>
              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-accent/30 flex items-center justify-center shrink-0 shadow-sm ${
                isDarkMode ? 'bg-slate-800' : 'bg-[#F5F5F4]'
              }`}>
                {authorPic ? (
                  <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                  <User className={`w-8 h-8 ${isDarkMode ? 'text-slate-500' : 'text-[#A8A29E]'}`} />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-accent block mb-1">
                  Written by
                </span>
                <h3 className={`text-xl font-display font-bold ${isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'}`}>
                  {authorName}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#78716C]'}`}>
                  {authorBio}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-5 py-3 rounded-2xl bg-accent text-accent-fg font-bold text-xs hover:opacity-90 transition shadow-sm shrink-0 flex items-center gap-2 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{copied ? 'Link Copied!' : 'Share Entry'}</span>
              </button>
            </div>

            {/* Other Shared Articles from Same Blog */}
            {allSharedEntries.length > 1 && (
              <div className="mt-12">
                <h4 className={`text-xs font-bold uppercase tracking-widest font-mono mb-6 text-center ${
                  isDarkMode ? 'text-slate-400' : 'text-[#78716C]'
                }`}>
                  More Stories from {authorName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allSharedEntries.filter(e => e.id !== entry.id).map(other => (
                    <div 
                      key={other.id} 
                      onClick={() => onSelectEntry && onSelectEntry(other)}
                      className={`p-5 border rounded-2xl cursor-pointer hover:shadow-md transition duration-300 group ${
                        isDarkMode 
                          ? 'bg-slate-900/60 border-slate-800 hover:border-accent/50' 
                          : 'bg-white border-[#E7E5E4] hover:border-accent/50'
                      }`}
                    >
                      <span className={`text-[10px] font-mono block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-[#78716C]'
                      }`}>
                        {new Date(other.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <h5 className={`font-display font-bold group-hover:text-accent transition-colors line-clamp-2 text-base ${
                        isDarkMode ? 'text-slate-100' : 'text-[#1C1917]'
                      }`}>
                        {other.title || extractAutoTitle(other.content)}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Brand Link */}
            <div className={`mt-12 text-center text-xs font-mono flex items-center justify-center gap-2 ${
              isDarkMode ? 'text-slate-500' : 'text-[#A8A29E]'
            }`}>
              <span>Published via Zournel Blog Engine</span>
              <span>•</span>
              <a href={window.location.origin} className="text-accent hover:underline flex items-center gap-1">
                <span>Create Your Own</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
};

