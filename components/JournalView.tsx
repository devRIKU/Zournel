import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Feather, Image as ImageIcon, Library, LineChart, TrendingUp, Calendar, Heart, Smile, Activity, Trash2, BookOpen, ArrowRight, Pencil, X, Loader2, Search, Upload } from 'lucide-react';
import { JournalEntry } from '../types';
import { extractAutoTitle, generateAutoTitle } from '../services/geminiService';
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

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit, onDeleteEntry, onRenameEntry, onImportClick, selectedModel }) => {
  const [subTab, setSubTab] = useState<'timeline' | 'reflections'>('timeline');
  const [renamingEntry, setRenamingEntry] = useState<JournalEntry | null>(null);
  const [renamingTitleInput, setRenamingTitleInput] = useState('');
  const [isGeneratingAutoTitle, setIsGeneratingAutoTitle] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openRenameModal = (entry: JournalEntry) => {
    setRenamingEntry(entry);
    setRenamingTitleInput(entry.title || extractAutoTitle(entry.content));
  };

  const handleAutoTitleForRenaming = async () => {
    if (!renamingEntry) return;
    setIsGeneratingAutoTitle(true);
    try {
      const aiTitle = await generateAutoTitle(renamingEntry.content, selectedModel);
      if (aiTitle) {
        setRenamingTitleInput(aiTitle);
      } else {
        setRenamingTitleInput(extractAutoTitle(renamingEntry.content));
      }
    } catch (err) {
      setRenamingTitleInput(extractAutoTitle(renamingEntry.content));
    } finally {
      setIsGeneratingAutoTitle(false);
    }
  };

  const handleSaveRename = () => {
    if (!renamingEntry) return;
    const finalTitle = renamingTitleInput.trim() || extractAutoTitle(renamingEntry.content);
    if (onRenameEntry) {
      onRenameEntry(renamingEntry.id, finalTitle);
    }
    setRenamingEntry(null);
  };

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

  const trendData = useMemo(() => {
    return moodEntries.map(entry => {
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
    });
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
    <div className="pb-40 px-6 max-w-6xl mx-auto w-full animate-fade-in">
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
             <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary tracking-tight break-words">
               {subTab === 'timeline' ? 'Memories' : 'Reflections'}
             </h2>
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
              onClick={() => setSubTab('timeline')}
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
              onClick={() => setSubTab('reflections')}
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
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onImportClick}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-surface-highlight/30 hover:bg-surface-highlight border border-surface-highlight/40 text-secondary hover:text-accent rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0"
              title="Import old memories"
            >
              <Upload className="w-4 h-4 text-accent shrink-0" />
              <span className="hidden sm:inline">Import</span>
            </motion.button>
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
                        whileHover={{ y: -6, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`group relative flex flex-col text-left bg-surface rounded-[2rem] sm:rounded-[2.5rem] border border-surface-highlight shadow-sm hover:shadow-2xl hover:border-accent/30 transition duration-300 overflow-hidden outline-none cursor-pointer ${
                          isHero ? 'md:col-span-2' : ''
                        }`}
                      >
                        {onDeleteEntry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to delete this memory?")) {
                                onDeleteEntry(entry.id);
                              }
                            }}
                            title="Delete Memory"
                            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/50 hover:bg-red-600/90 text-white/90 hover:text-white backdrop-blur-md transition active:scale-[0.97] opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-md"
                          >
                            <Trash2 className="w-4 h-4" />
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
                             {/* Auto Title & Rename Option */}
                             <div className="flex items-start justify-between gap-3 mb-3">
                               <h3 className="text-xl sm:text-2xl font-display font-bold text-primary group-hover:text-accent transition-colors duration-300 leading-snug tracking-tight line-clamp-2">
                                 {displayTitle}
                               </h3>
                               {onRenameEntry && (
                                 <button
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openRenameModal(entry);
                                   }}
                                   title="Rename Title"
                                   className="p-2 text-secondary/70 hover:text-accent hover:bg-accent/15 rounded-xl transition shrink-0 active:scale-[0.97]"
                                 >
                                   <Pencil className="w-4 h-4" />
                                 </button>
                               )}
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

            {/* Main Trend Line Chart */}
            <div className="p-8 bg-surface border border-surface-highlight rounded-[2.5rem] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-display font-bold text-primary">Emotional Journey Over Time</h3>
                  <p className="text-xs text-secondary">A continuous visual flow mapping your emotional changes</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 bg-accent/5 text-accent rounded-full border border-accent/10 select-none">
                  {trendData.length} data point{trendData.length !== 1 ? 's' : ''} mapped
                </span>
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

      {/* Rename Memory Title Modal */}
      <AnimatePresence>
        {renamingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface rounded-3xl border border-surface-highlight shadow-2xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-accent/15 text-accent rounded-xl border border-accent/20">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-primary">Rename Memory</h3>
                    <p className="text-xs text-secondary">Custom title (or Auto Title with AI)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setRenamingEntry(null)} 
                  className="p-2 rounded-full hover:bg-surface-highlight text-secondary hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary mb-2">Memory Title</label>
                  <input 
                    type="text" 
                    value={renamingTitleInput} 
                    onChange={(e) => setRenamingTitleInput(e.target.value)} 
                    placeholder="Enter memory title..."
                    className="w-full px-4 py-3 bg-bg border border-surface-highlight rounded-2xl text-primary font-display font-bold text-base outline-none focus:border-accent transition"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveRename();
                      }
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAutoTitleForRenaming}
                  disabled={isGeneratingAutoTitle}
                  className="w-full py-2.5 px-4 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition disabled:opacity-50 active:scale-98"
                >
                  {isGeneratingAutoTitle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Auto Title with AI</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-highlight/50">
                <button
                  type="button"
                  onClick={() => setRenamingEntry(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRename}
                  className="px-6 py-2.5 rounded-full bg-accent text-accent-fg text-xs font-bold hover:bg-accent/90 shadow-md transition active:scale-[0.97]"
                >
                  Save Title
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
