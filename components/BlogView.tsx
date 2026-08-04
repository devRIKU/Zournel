import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Globe, Copy, Check, ArrowRight, User, Calendar, Clock, BookOpen, Share2, Heart, ExternalLink, Bookmark } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] font-sans transition duration-500 selection:bg-accent/20 selection:text-accent">
      {/* Top Simulated Blog Address Bar / Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#E7E5E4] px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-fg flex items-center justify-center font-display font-bold text-sm shadow-xs">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-[#1C1917] block leading-tight">
                {authorName}'s Journal Blog
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#78716C]">
                <Globe className="w-2.5 h-2.5 text-accent" />
                <span>{domainPath}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#E7E5E4] hover:border-accent text-xs font-semibold text-[#44403C] hover:text-accent transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-accent" />}
              <span>{copied ? 'Copied!' : 'Share Article'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Blog Post Wrapper */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono text-[#78716C] mb-8">
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
                <span className="px-3 py-1 bg-[#F5F5F4] border border-[#E7E5E4] rounded-full text-[10px] font-bold uppercase tracking-wider text-[#57534E]">
                  {entry.mood}
                </span>
              )}
              <span className="text-xs text-[#78716C] font-mono flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                <span>{readTimeMinutes} min read</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#1C1917] tracking-tight leading-[1.15] mb-6">
              {displayTitle}
            </h1>

            {/* Author Profile Row */}
            <div className="flex items-center justify-between border-y border-[#E7E5E4] py-4 my-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-[#E7E5E4] bg-[#F5F5F4] flex items-center justify-center shrink-0">
                  {authorPic ? (
                    <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-[#A8A29E]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1C1917]">{authorName}</span>
                    <span className="text-xs text-accent font-mono">@{authorUsername}</span>
                  </div>
                  <span className="text-xs text-[#78716C] block font-mono">{formattedDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleLike}
                  className={`p-2.5 rounded-full border transition flex items-center gap-1.5 text-xs font-bold ${
                    hasLiked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]'
                  }`}
                  title="Appreciate this entry"
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current text-red-500' : ''}`} />
                  <span>{likesCount}</span>
                </button>
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`p-2.5 rounded-full border transition ${
                    bookmarked ? 'bg-accent/15 border-accent text-accent' : 'bg-white border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917]'
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
            <div className="mb-10 rounded-3xl overflow-hidden border border-[#E7E5E4] shadow-md bg-[#F5F5F4]">
              <img 
                src={entry.image} 
                alt={displayTitle} 
                className="w-full max-h-[480px] object-cover hover:scale-[1.01] transition duration-700" 
              />
              <div className="px-5 py-2.5 bg-white border-t border-[#E7E5E4] text-[11px] font-mono text-[#78716C] italic text-center">
                Visual memory capture attached to this entry
              </div>
            </div>
          )}

          {/* Article Main Text Body */}
          <div className="prose prose-stone max-w-none text-[#292524] text-lg leading-[1.85] font-serif select-text whitespace-pre-wrap mb-10">
            {entry.content}
          </div>

          {/* AI Insight Editorial Box */}
          {entry.aiInsight && (
            <div className="my-10 p-6 sm:p-8 bg-gradient-to-br from-accent/5 via-accent/10 to-transparent border-l-4 border-accent rounded-r-3xl shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-accent font-bold text-xs uppercase tracking-widest font-mono">
                <Sparkles className="w-4 h-4" />
                <span>AI Editorial Reflection</span>
              </div>
              <p className="font-display italic text-base sm:text-lg text-[#1C1917] leading-relaxed">
                "{entry.aiInsight}"
              </p>
            </div>
          )}

          {/* Author Sign-Off Card */}
          <footer className="mt-14 pt-8 border-t border-[#E7E5E4]">
            <div className="p-6 sm:p-8 bg-white border border-[#E7E5E4] rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xs">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent/30 bg-[#F5F5F4] flex items-center justify-center shrink-0 shadow-sm">
                {authorPic ? (
                  <img src={authorPic} alt={authorName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-[#A8A29E]" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-accent block mb-1">
                  Written by
                </span>
                <h3 className="text-xl font-display font-bold text-[#1C1917]">
                  {authorName}
                </h3>
                <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
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
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#78716C] font-mono mb-6 text-center">
                  More Stories from {authorName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allSharedEntries.filter(e => e.id !== entry.id).map(other => (
                    <div 
                      key={other.id} 
                      onClick={() => onSelectEntry && onSelectEntry(other)}
                      className="p-5 bg-white border border-[#E7E5E4] hover:border-accent/50 rounded-2xl cursor-pointer hover:shadow-md transition duration-300 group"
                    >
                      <span className="text-[10px] font-mono text-[#78716C] block mb-1">
                        {new Date(other.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <h5 className="font-display font-bold text-[#1C1917] group-hover:text-accent transition-colors line-clamp-2 text-base">
                        {other.title || extractAutoTitle(other.content)}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Brand Link */}
            <div className="mt-12 text-center text-xs text-[#A8A29E] font-mono flex items-center justify-center gap-2">
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
