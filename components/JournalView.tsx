import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Feather, Image as ImageIcon, Library, LineChart, TrendingUp, Calendar, Heart, Smile, Activity, Trash2, BookOpen, ArrowRight, Pencil, X, Loader2, Search, Upload, Code, Edit3 } from './Icons';
import { JournalEntry } from '../types';
import { extractAutoTitle } from '../services/geminiService';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  CartesianGrid 
} from 'recharts';

interface JournalViewProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDeleteEntry?: (id: string) => void;
  onRenameEntry?: (id: string, newTitle: string) => void;
  onImportClick?: () => void;
  onImportEntries?: (entries: JournalEntry[], replaceExisting?: boolean) => void;
  selectedModel?: string;
}

const TRUNCATE_LIMIT = 140;

export const MOOD_PRESETS = [
  { label: 'Happy', emoji: '😊', score: 5, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)' },
  { label: 'Calm', emoji: '😌', score: 4, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  { label: 'Energetic', emoji: '⚡', score: 5, color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { label: 'Grateful', emoji: '🙏', score: 5, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
  { label: 'Inspired', emoji: '💡', score: 4, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  { label: 'Focused', emoji: '🎯', score: 4, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  { label: 'Proud', emoji: '🏆', score: 5, color: '#E11D48', bg: 'rgba(225, 29, 72, 0.1)' },
  { label: 'Cozy', emoji: '☕', score: 4, color: '#D97706', bg: 'rgba(217, 119, 6, 0.1)' },
  { label: 'Reflective', emoji: '💭', score: 3, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
  { label: 'Nostalgic', emoji: '🌊', score: 3, color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
  { label: 'Tired', emoji: '😴', score: 2, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' },
  { label: 'Anxious', emoji: '😰', score: 2, color: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)' },
  { label: 'Stressed', emoji: '🤯', score: 2, color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.1)' },
  { label: 'Sad', emoji: '😢', score: 1, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)' },
  { label: 'Tense', emoji: '😠', score: 1, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
];

const MOOD_MAPPING: Record<string, { score: number; label: string; emoji: string; color: string; bg: string }> = {};
MOOD_PRESETS.forEach(p => {
  MOOD_MAPPING[p.label] = p;
});

export const getMoodData = (moodStr?: string) => {
  if (!moodStr) return null;
  const cleanStr = moodStr.trim();

  // Direct preset check
  for (const preset of MOOD_PRESETS) {
    if (cleanStr.toLowerCase().includes(preset.label.toLowerCase()) || (preset.emoji && cleanStr.includes(preset.emoji))) {
      return preset;
    }
  }

  // Custom mood parser (e.g. "🎨 Creative" or "Peaceful")
  const emojiMatch = cleanStr.match(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
  const emoji = emojiMatch ? emojiMatch[0] : '✨';
  const label = cleanStr.replace(/(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u, '').trim() || cleanStr;

  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue}, 75%, 55%)`;
  const bg = `hsla(${hue}, 75%, 55%, 0.12)`;

  let score = 3.5;
  const lower = label.toLowerCase();
  if (lower.includes('great') || lower.includes('joy') || lower.includes('love') || lower.includes('awesome') || lower.includes('excited') || lower.includes('happy')) score = 5;
  else if (lower.includes('good') || lower.includes('peace') || lower.includes('content') || lower.includes('chill') || lower.includes('calm')) score = 4;
  else if (lower.includes('bad') || lower.includes('down') || lower.includes('angry') || lower.includes('sad')) score = 1;
  else if (lower.includes('worry') || lower.includes('fear') || lower.includes('tired') || lower.includes('stress')) score = 2;

  return {
    score,
    label: label || 'Custom',
    emoji,
    color,
    bg
  };
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface border border-surface-highlight p-4 rounded-2xl shadow-xl backdrop-blur-md max-w-xs animate-scale-in text-left">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-2xl leading-none select-none">{data.emoji}</span>
          <div>
            <p className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-wider">{data.fullDate}</p>
            <p className="text-xs font-semibold text-primary">{data.label} Mood</p>
          </div>
        </div>
        {data.contentSnippet && (
          <p className="text-xs text-primary/70 italic line-clamp-2 border-t border-surface-highlight pt-2 mt-1.5 leading-relaxed">
            "{data.contentSnippet}"
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit, onDeleteEntry, onRenameEntry, onImportClick, onImportEntries, selectedModel }) => {
  const [subTab, setSubTab] = useState<'timeline' | 'reflections'>('timeline');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullBreakdownModal, setShowFullBreakdownModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState(() => localStorage.getItem('journalPageTitle') || 'Memories');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const newTitle = pageTitle.trim() || 'Memories';
    setPageTitle(newTitle);
    localStorage.setItem('journalPageTitle', newTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  // Automatically close search bar when switching subTab or when not in timeline view
  React.useEffect(() => {
    if (subTab !== 'timeline') {
      setIsSearchOpen(false);
    }
  }, [subTab]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(e => {
      const titleMatch = (e.title || '').toLowerCase().includes(q);
      const contentMatch = (e.content || '').toLowerCase().includes(q);
      const moodMatch = (e.mood || '').toLowerCase().includes(q);
      const insightMatch = (e.aiInsight || '').toLowerCase().includes(q);
      return titleMatch || contentMatch || moodMatch || insightMatch;
    });
  }, [entries, searchQuery]);
  
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    const sorted = [...filteredEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    sorted.forEach(entry => {
      const timestamp = entry.createdAt || Date.now();
      const date = new Date(timestamp);
      
      let dateKey = 'Unknown Date';
      if (!isNaN(date.getTime())) {
         dateKey = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    
    return Object.entries(groups);
  }, [filteredEntries]);

  const moodEntries = useMemo(() => {
    return entries
      .filter(entry => !!entry.mood)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [entries]);

  const { trendData, fullTrendData } = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoffTime = threeMonthsAgo.getTime();

    const mapEntryToPoint = (entry: JournalEntry) => {
      const moodInfo = getMoodData(entry.mood);
      const date = new Date(entry.createdAt || Date.now());
      const formattedDate = !isNaN(date.getTime())
        ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'Date';
      
      return {
        date: formattedDate,
        fullDate: !isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date',
        score: moodInfo ? moodInfo.score : 3,
        label: moodInfo ? moodInfo.label : 'Reflective',
        emoji: moodInfo ? moodInfo.emoji : '😊',
        color: moodInfo ? moodInfo.color : '#C69C6D',
        contentSnippet: entry.content.replace(/[#*`_~[\]()]/g, '').trim().slice(0, 60),
        rawEntry: entry,
      };
    };

    const threeMonthEntries = moodEntries.filter(entry => (entry.createdAt || 0) >= cutoffTime);

    return {
      trendData: threeMonthEntries.map(mapEntryToPoint),
      fullTrendData: moodEntries.map(mapEntryToPoint),
    };
  }, [moodEntries]);

  const distributionData = useMemo(() => {
    const counts: Record<string, { count: number; color: string; emoji: string }> = {};
    
    Object.entries(MOOD_MAPPING).forEach(([label, info]) => {
      counts[label] = { count: 0, color: info.color, emoji: info.emoji };
    });

    moodEntries.forEach(entry => {
      const moodInfo = getMoodData(entry.mood);
      if (moodInfo) {
        if (!counts[moodInfo.label]) {
          counts[moodInfo.label] = { count: 0, color: moodInfo.color, emoji: moodInfo.emoji };
        }
        counts[moodInfo.label].count += 1;
      }
    });

    return Object.entries(counts)
      .map(([label, info]) => ({
        name: label,
        value: info.count,
        color: info.color,
        emoji: info.emoji,
      }))
      .filter(item => item.value > 0);
  }, [moodEntries]);

  const averageMoodInfo = useMemo(() => {
    if (moodEntries.length === 0) return null;
    const totalScore = moodEntries.reduce((acc, entry) => acc + (getMoodData(entry.mood)?.score || 3), 0);
    const avg = Math.round((totalScore / moodEntries.length) * 10) / 10;
    
    let closestMood = 'Reflective';
    let closestEmoji = '😌';
    let closestColor = '#06B6D4';
    let minDiff = Infinity;
    
    Object.entries(MOOD_MAPPING).forEach(([label, info]) => {
      const diff = Math.abs(info.score - avg);
      if (diff < minDiff) {
        minDiff = diff;
        closestMood = label;
        closestEmoji = info.emoji;
        closestColor = info.color;
      }
    });
    
    return {
      averageScore: avg,
      label: closestMood,
      emoji: closestEmoji,
      color: closestColor
    };
  }, [moodEntries]);

  const dominantMoodInfo = useMemo(() => {
    if (distributionData.length === 0) return null;
    const sorted = [...distributionData].sort((a, b) => b.value - a.value);
    return sorted[0];
  }, [distributionData]);

  const moodLoggedPercent = useMemo(() => {
    if (entries.length === 0) return 0;
    return Math.round((moodEntries.length / entries.length) * 100);
  }, [entries, moodEntries]);

  const stripMarkdownAndTruncate = (text: string) => {
    if (!text) return '';
    const stripped = text.replace(/^[>\s#*`_~[\]()]+/gm, '').replace(/[#*`_~[\]()]/g, '').trim();
    if (stripped.length <= TRUNCATE_LIMIT) return stripped;
    return stripped.slice(0, TRUNCATE_LIMIT) + '...';
  };

  const getEntryStats = (content: string) => {
    if (!content) return { words: 0, readTime: 1 };
    const clean = content.replace(/[*_~`#]/g, '').trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 180));
    return { words, readTime };
  };

  const yAxisFormatter = (tick: number) => {
    if (tick === 5) return '😊';
    if (tick === 4) return '😌';
    if (tick === 3) return '😢';
    if (tick === 2) return '🤯';
    if (tick === 1) return '😠';
    return '';
  };

  return (
    <div className="pb-40 px-4 sm:px-6 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Header with Switcher Tab Navigation & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 mt-4 sm:mt-8 border-b border-surface-highlight/30 pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="p-2.5 sm:p-3 bg-accent/10 rounded-2xl">
                {subTab === 'timeline' ? (
                   <Library className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                ) : (
                   <LineChart className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                )}
             </div>
             <div className="group/header relative inline-flex items-center">
               {isEditingTitle && subTab === 'timeline' ? (
                 <input
                   ref={titleInputRef}
                   value={pageTitle}
                   onChange={(e) => setPageTitle(e.target.value)}
                   onBlur={handleTitleBlur}
                   onKeyDown={handleTitleKeyDown}
                   className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-primary tracking-tighter bg-transparent outline-none w-full border-b-2 border-accent/50 focus:border-accent p-0 m-0 leading-tight placeholder-primary/30"
                   placeholder="Untitled"
                   style={{ width: `${Math.max(pageTitle.length, 3)}ch` }}
                 />
               ) : (
                 <>
                   <h2 
                     onClick={() => subTab === 'timeline' && setIsEditingTitle(true)}
                     className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-primary tracking-tighter break-words ${subTab === 'timeline' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                   >
                     {subTab === 'timeline' ? pageTitle : 'Reflections'}
                   </h2>
                   {subTab === 'timeline' && (
                     <button 
                       onClick={() => setIsEditingTitle(true)}
                       className="opacity-0 group-hover/header:opacity-100 transition-all duration-300 ml-3 p-1.5 md:p-2 bg-surface-highlight/50 hover:bg-surface-highlight rounded-xl text-secondary hover:text-primary active:scale-95 flex items-center justify-center shadow-sm border border-surface-highlight"
                       title="Edit Title"
                     >
                       <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                     </button>
                   )}
                 </>
               )}
             </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="h-0.5 w-10 sm:w-12 bg-accent rounded-full"></div>
              <p className="font-grotesk text-secondary text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] opacity-60">
                {subTab === 'timeline' ? 'Visual Journal Timeline' : 'Mood Analytics & Trends'}
              </p>
          </div>
        </div>

        {/* Control Cluster: Search (Left) -> Toggle (Center) -> Import (Right) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap self-start lg:self-auto">
          {/* 1. Search button / expanding search input on LEFT of toggle */}
          {subTab === 'timeline' && (
            <AnimatePresence mode="wait">
              {isSearchOpen ? (
                <motion.div
                  key="expanded-search-input"
                  initial={{ width: 100, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ width: 100, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-center gap-2 bg-surface border border-accent/50 rounded-2xl px-3 py-2 shadow-md w-full sm:w-60 md:w-64 overflow-hidden shrink-0"
                >
                  <Search className="w-4 h-4 text-accent shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories..."
                    className="bg-transparent text-xs text-primary outline-none w-full font-medium placeholder:text-secondary/50"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-secondary/70 hover:text-primary transition-colors shrink-0"
                      title="Clear search text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1 rounded-xl bg-surface-highlight/60 text-secondary hover:text-primary transition-colors text-xs font-bold shrink-0"
                    title="Close search input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="search-toggle-btn"
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsSearchOpen(true)}
                  className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border shadow-xs shrink-0 ${
                    searchQuery
                      ? 'bg-accent/15 border-accent/30 text-accent'
                      : 'bg-surface-highlight/30 hover:bg-surface-highlight border-surface-highlight/40 text-secondary hover:text-primary'
                  }`}
                  title="Search memories"
                >
                  <Search className="w-4 h-4 text-accent shrink-0" />
                  <span className="hidden sm:inline">Search</span>
                  {searchQuery && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {/* 2. Switcher Tab Buttons (Memories / Reflections Toggle in CENTER) */}
          <div className="flex bg-surface-highlight/40 p-1.5 rounded-2xl border border-surface-highlight/30 shrink-0 shadow-inner relative z-0">
            <button
              type="button"
              onClick={() => { setSubTab('timeline'); setIsSearchOpen(false); }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors duration-300 z-10 ${
                subTab === 'timeline' ? 'text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              {subTab === 'timeline' && (
                <motion.div
                  layoutId="activeSubTab"
                  className="absolute inset-0 bg-surface rounded-xl shadow-md border border-accent/5 -z-10"
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                />
              )}
              <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] sm:text-xs">Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => { setSubTab('reflections'); setIsSearchOpen(false); }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors duration-300 z-10 ${
                subTab === 'reflections' ? 'text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              {subTab === 'reflections' && (
                <motion.div
                  layoutId="activeSubTab"
                  className="absolute inset-0 bg-surface rounded-xl shadow-md border border-accent/5 -z-10"
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                />
              )}
              <LineChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] sm:text-xs">Reflections</span>
            </button>
          </div>

          {/* 3. Import Button (RIGHT of toggle) */}
          {subTab === 'timeline' && onImportClick && (
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onImportClick}
                className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-surface-highlight/30 hover:bg-surface-highlight border border-surface-highlight/40 text-secondary hover:text-accent rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0"
                title="Import old memories"
              >
                <Upload className="w-4 h-4 text-accent shrink-0" />
                <span className="hidden sm:inline">Import</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Active Search Filter Chip (when closed) */}
      {subTab === 'timeline' && searchQuery && !isSearchOpen && (
        <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-2xl px-4 py-2.5 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <Search className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Active filter: <strong className="text-accent">"{searchQuery}"</strong></span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
          >
            Clear <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {subTab === 'timeline' ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                 <div className="w-24 h-24 bg-surface-highlight rounded-[2rem] flex items-center justify-center mb-8 border border-accent/5 animate-scale-in">
                   <Sparkles className="w-10 h-10 text-accent/20" />
                 </div>
                 <p className="font-display text-2xl sm:text-3xl md:text-4xl text-primary font-bold break-words">A Clean Page</p>
                 <p className="font-sans text-secondary mt-4 max-w-xs mx-auto leading-relaxed opacity-40 mb-6">
                   Your story begins here. Capture a thought or a moment to build your archive of memories.
                 </p>
                 {onImportClick && (
                   <button
                     onClick={onImportClick}
                     className="px-6 py-3 bg-accent text-accent-fg rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-90 active:scale-[0.97] transition"
                   >
                     <Upload className="w-4 h-4" />
                     <span>Import Old Memories</span>
                   </button>
                 )}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-surface border border-surface-highlight rounded-3xl p-8">
                <Search className="w-12 h-12 text-accent/40 mb-4 animate-bounce" />
                <h3 className="text-xl font-display font-bold text-primary mb-2">No matching memories found</h3>
                <p className="text-xs text-secondary max-w-xs mb-6">
                  No memories match <span className="font-semibold text-accent">"{searchQuery}"</span>. Try searching with different keywords or clear search filters.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-2.5 bg-surface-highlight text-primary hover:bg-surface-highlight/80 rounded-2xl text-xs font-bold transition active:scale-[0.97]"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
          <div className="space-y-32">
            {groupedEntries.map(([dateLabel, dayEntries]) => (
              <section key={dateLabel} className="group/section animate-slide-up">
                <div className="flex items-baseline gap-4 sm:gap-6 mb-8 sm:mb-12">
                  <span className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-primary group-hover/section:text-accent transition-colors duration-500 break-words">{dateLabel}</span>
                  <div className="h-px flex-grow bg-surface-highlight opacity-50"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {dayEntries.map((entry, idx) => {
                    const isHero = dayEntries.length === 1 || (dayEntries.length > 2 && idx === 0);
                    const timeString = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const displayTitle = entry.title || extractAutoTitle(entry.content);
                    const { words, readTime } = getEntryStats(entry.content);
                    
                    return (
                      <motion.div 
                        key={entry.id} 
                        onClick={() => onEdit(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEdit(entry);
                          }
                        }}
                        title="View & Edit Memory"
                        whileHover={{ y: -8, scale: 1.015 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        className={`group relative flex flex-col text-left bg-surface rounded-[2rem] sm:rounded-[2.5rem] border border-surface-highlight/60 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.15)] hover:border-accent/50 transition-all duration-500 overflow-hidden outline-none cursor-pointer ${
                          isHero ? 'md:col-span-2' : ''
                        }`}
                      >
                        {onDeleteEntry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteConfirmId === entry.id) {
                                onDeleteEntry(entry.id);
                                setDeleteConfirmId(null);
                              } else {
                                setDeleteConfirmId(entry.id);
                                setTimeout(() => setDeleteConfirmId(null), 3000);
                              }
                            }}
                            title="Delete Memory"
                            className={`absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full backdrop-blur-md transition active:scale-[0.97] shadow-md flex items-center gap-2 ${deleteConfirmId === entry.id ? 'bg-red-600 text-white opacity-100' : 'bg-black/50 hover:bg-red-600/90 text-white/90 hover:text-white opacity-100 sm:opacity-0 group-hover:opacity-100'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteConfirmId === entry.id && <span className="text-xs font-bold uppercase tracking-wider">Confirm</span>}
                          </button>
                        )}

                        {entry.image ? (
                          <div className={`${isHero ? 'h-64 sm:h-80' : 'h-52'} w-full overflow-hidden relative bg-surface-highlight`}>
                            <img 
                              src={entry.image} 
                              alt="cover" 
                              className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-108" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
                            
                            <div className="absolute top-5 left-5 right-14 flex items-center justify-between gap-2 z-10 flex-wrap">
                               <div className="flex items-center gap-2">
                                 <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase">
                                   {timeString}
                                 </div>
                                 <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/20 text-white/90 text-[10px] font-mono">
                                   {readTime} min read
                                 </div>
                               </div>

                               {entry.mood && (
                                 <div className="px-3 py-1 bg-accent/90 backdrop-blur-md text-accent-fg font-bold text-[10px] uppercase tracking-wider rounded-full shadow-md">
                                   {entry.mood}
                                 </div>
                               )}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-6 px-6 sm:px-8 flex items-center justify-between gap-2 border-b border-surface-highlight/40 pb-4">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-secondary">
                                  {timeString} • {readTime} min read
                                </span>
                             </div>

                             {entry.mood && (
                               <span className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-accent px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
                                 {entry.mood}
                               </span>
                             )}
                          </div>
                        )}

                        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                          <div>
                             {/* Auto Title */}
                             <div className="mb-3">
                               <h3 className="text-xl sm:text-2xl font-display font-bold text-primary group-hover:text-accent transition-colors duration-300 leading-snug tracking-tight line-clamp-2">
                                 {displayTitle}
                               </h3>
                             </div>

                             {/* Content Excerpt */}
                             <p className="font-sans text-sm sm:text-base leading-relaxed text-primary/75 line-clamp-3 mb-6">
                               {stripMarkdownAndTruncate(entry.content)}
                             </p>
                          </div>

                          <div>
                            {entry.aiInsight && (
                              <div className="mb-4 p-3.5 sm:p-4 bg-accent/5 group-hover:bg-accent/10 rounded-2xl border border-accent/15 flex items-start gap-3 transition-colors duration-300">
                                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                <p className="font-display text-xs sm:text-sm text-primary/85 leading-relaxed italic text-left">
                                  "{entry.aiInsight}"
                                </p>
                              </div>
                            )}

                            <div className="pt-3 border-t border-surface-highlight/60 flex items-center justify-between text-xs text-secondary/70">
                              <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                                {words} words
                              </span>
                              <div className="flex items-center gap-1 font-bold text-accent text-xs group-hover:translate-x-1 transition-transform">
                                <span>Read Memory</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
          </motion.div>
        ) : (
          <motion.div
            key="reflections"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="w-full"
          >
            {moodEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
             <div className="w-24 h-24 bg-surface-highlight rounded-[2rem] flex items-center justify-center mb-8 border border-accent/5 animate-scale-in">
               <Smile className="w-10 h-10 text-accent/20" />
             </div>
             <p className="font-display text-3xl text-primary font-bold">No Mood Logs Yet</p>
             <p className="font-sans text-secondary mt-4 leading-relaxed opacity-60">
               To view emotional patterns, log your emotions inside your journal entries by clicking on the mood emoji button in the editor toolbar. Over time, your trends will map here.
             </p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Average Mood Card */}
              {averageMoodInfo && (
                <div className="p-8 bg-surface border border-surface-highlight rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="font-grotesk text-[10px] uppercase tracking-wider text-secondary font-bold">Average Vibe</span>
                    <span className="p-2 bg-accent/5 rounded-xl border border-accent/10 text-accent">
                      <Heart className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="my-6 flex items-center gap-4">
                    <span className="text-5xl select-none">{averageMoodInfo.emoji}</span>
                    <div>
                      <span className="text-3xl font-display font-bold text-primary">{averageMoodInfo.label}</span>
                      <p className="text-xs text-secondary/70">Score: {averageMoodInfo.averageScore} / 5.0</p>
                    </div>
                  </div>
                  <div className="text-xs text-secondary leading-relaxed pt-4 border-t border-surface-highlight/50">
                    Your average feeling across all your tracked memories.
                  </div>
                </div>
              )}

              {/* Dominant Emotion Card */}
              {dominantMoodInfo && (
                <div className="p-8 bg-surface border border-surface-highlight rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="font-grotesk text-[10px] uppercase tracking-wider text-secondary font-bold">Dominant State</span>
                    <span className="p-2 bg-accent/5 rounded-xl border border-accent/10 text-accent">
                      <Activity className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="my-6 flex items-center gap-4">
                    <span className="text-5xl select-none">{dominantMoodInfo.emoji}</span>
                    <div>
                      <span className="text-3xl font-display font-bold text-primary">{dominantMoodInfo.name}</span>
                      <p className="text-xs text-secondary/70">Logged {dominantMoodInfo.value} time{dominantMoodInfo.value > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-xs text-secondary leading-relaxed pt-4 border-t border-surface-highlight/50">
                    This emotional state has been present in most of your writings.
                  </div>
                </div>
              )}

              {/* Log Rate Card */}
              <div className="p-8 bg-surface border border-surface-highlight rounded-[2rem] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="font-grotesk text-[10px] uppercase tracking-wider text-secondary font-bold">Mindful Engagement</span>
                  <span className="p-2 bg-accent/5 rounded-xl border border-accent/10 text-accent">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <div className="my-6 flex items-center gap-4">
                  <span className="text-4xl font-display font-bold text-primary">{moodLoggedPercent}%</span>
                  <div>
                    <span className="text-lg font-semibold text-primary">Logged Ratio</span>
                    <p className="text-xs text-secondary/70">{moodEntries.length} of {entries.length} entries</p>
                  </div>
                </div>
                <div className="text-xs text-secondary leading-relaxed pt-4 border-t border-surface-highlight/50">
                  Percentage of written memories enriched with emotional tracking.
                </div>
              </div>
            </div>

            {/* Main Trend Line Chart (Last 3 Months View) */}
            <div 
              onClick={() => setShowFullBreakdownModal(true)}
              className="p-8 bg-surface border border-surface-highlight rounded-[2.5rem] shadow-sm cursor-pointer transition-all hover:border-accent/40 hover:shadow-md group relative overflow-hidden"
              title="Click to open full emotional breakdown through time"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-display font-bold text-primary">Emotional Journey Over Time</h3>
                    <span className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                      Last 3 Months
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1">A visual flow mapping your emotional changes. Click to view full breakdown.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-accent/5 text-accent rounded-full border border-accent/10 select-none">
                    {trendData.length} data point{trendData.length !== 1 ? 's' : ''}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullBreakdownModal(true);
                    }}
                    className="p-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition flex items-center gap-1.5 text-xs font-bold"
                  >
                    <span>Full Breakdown</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-highlight)" opacity={0.6} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-secondary)" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="var(--color-secondary)" 
                      fontSize={14}
                      tickLine={false}
                      axisLine={false}
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={yAxisFormatter}
                      dx={-5}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="var(--color-accent)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMood)" 
                      activeDot={{ r: 7, strokeWidth: 0, fill: 'var(--color-accent)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Section: Distribution Breakdown and Recent Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Distribution Chart */}
              <div className="p-8 bg-surface border border-surface-highlight rounded-[2.5rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-primary mb-1">Emotion Frequencies</h3>
                  <p className="text-xs text-secondary mb-6">Distribution of your logged emotional states</p>
                </div>

                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributionData}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="var(--color-secondary)" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-surface border border-surface-highlight px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold text-primary">
                                {payload[0].value} entry/ies
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-surface-highlight/50">
                  {distributionData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-sm select-none">{item.emoji}</span>
                      <span className="text-primary">{item.name}</span>
                      <span className="text-secondary/60">({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Growth Insights */}
              <div className="p-8 bg-surface border border-surface-highlight rounded-[2.5rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-primary mb-1">Mindful Insights</h3>
                  <p className="text-xs text-secondary mb-6">Empathic feedback extracted from your logs</p>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-72">
                  {moodEntries.filter(e => !!e.aiInsight).slice(-3).reverse().map((entry) => {
                    const moodInfo = getMoodData(entry.mood);
                    const formattedDate = entry.createdAt 
                      ? new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
                      : '';
                    return (
                      <div 
                        key={entry.id} 
                        onClick={() => onEdit(entry)}
                        className="p-5 rounded-2xl bg-surface-highlight/20 border border-surface-highlight/30 hover:border-accent/20 cursor-pointer transition duration-300 flex flex-col text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg select-none">{moodInfo?.emoji || '😌'}</span>
                            <span className="text-xs font-semibold text-primary">{moodInfo?.label || 'Reflective'}</span>
                          </div>
                          <span className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-widest">{formattedDate}</span>
                        </div>
                        <p className="font-display text-sm text-primary/80 group-hover:text-primary italic leading-relaxed">
                          "{entry.aiInsight}"
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] font-grotesk text-secondary uppercase tracking-[0.2em] pt-4 mt-4 border-t border-surface-highlight/50 flex items-center gap-1.5 opacity-60">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Powered by Gemini
                </div>
              </div>
            </div>
          </div>
        )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Emotional Breakdown Modal / Full View */}
      <AnimatePresence>
        {showFullBreakdownModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg/90 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-surface border border-surface-highlight rounded-[2.5rem] shadow-2xl p-6 sm:p-10 w-full max-w-5xl my-auto flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-surface-highlight/50 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <LineChart className="w-6 h-6 text-accent" />
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary">Full Emotional Breakdown Through Time</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-secondary">A complete historical timeline of every emotional state logged in your memories.</p>
                </div>
                <button 
                  onClick={() => setShowFullBreakdownModal(false)}
                  className="p-2.5 rounded-full bg-surface-highlight/50 text-secondary hover:text-primary hover:bg-surface-highlight transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-surface-highlight/20 border border-surface-highlight/30 rounded-2xl">
                  <span className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-wider block mb-1">Total Points</span>
                  <span className="text-2xl font-display font-bold text-primary">{fullTrendData.length}</span>
                </div>
                <div className="p-4 bg-surface-highlight/20 border border-surface-highlight/30 rounded-2xl">
                  <span className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-wider block mb-1">3-Month Points</span>
                  <span className="text-2xl font-display font-bold text-primary">{trendData.length}</span>
                </div>
                <div className="p-4 bg-surface-highlight/20 border border-surface-highlight/30 rounded-2xl">
                  <span className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-wider block mb-1">First Log</span>
                  <span className="text-sm font-semibold text-primary">{fullTrendData[0]?.fullDate || 'N/A'}</span>
                </div>
                <div className="p-4 bg-surface-highlight/20 border border-surface-highlight/30 rounded-2xl">
                  <span className="text-[10px] font-grotesk font-bold text-secondary uppercase tracking-wider block mb-1">Latest Log</span>
                  <span className="text-sm font-semibold text-primary">{fullTrendData[fullTrendData.length - 1]?.fullDate || 'N/A'}</span>
                </div>
              </div>

              {/* Full Timeline Area Chart */}
              <div className="w-full h-96 mb-8 p-4 bg-surface-highlight/10 rounded-2xl border border-surface-highlight/20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={fullTrendData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorMoodFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-highlight)" opacity={0.6} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-secondary)" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="var(--color-secondary)" 
                      fontSize={14}
                      tickLine={false}
                      axisLine={false}
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={yAxisFormatter}
                      dx={-5}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="var(--color-accent)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMoodFull)" 
                      activeDot={{ r: 8, strokeWidth: 0, fill: 'var(--color-accent)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Footer action */}
              <div className="flex justify-end pt-4 border-t border-surface-highlight/40">
                <button 
                  onClick={() => setShowFullBreakdownModal(false)}
                  className="px-6 py-2.5 rounded-full bg-accent text-accent-fg font-bold text-xs uppercase tracking-wider hover:opacity-90 transition"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
