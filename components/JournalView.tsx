import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Feather, Image as ImageIcon, Library, LineChart, TrendingUp, Calendar, Heart, Smile, Activity } from 'lucide-react';
import { JournalEntry } from '../types';
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
}

const TRUNCATE_LIMIT = 140;

const MOOD_MAPPING: Record<string, { score: number; label: string; emoji: string; color: string; bg: string }> = {
  'Happy': { score: 5, label: 'Happy', emoji: '😊', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)' },
  'Calm': { score: 4, label: 'Calm', emoji: '😌', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  'Energetic': { score: 5, label: 'Energetic', emoji: '⚡', color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
  'Reflective': { score: 3, label: 'Reflective', emoji: '😢', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
  'Stressed': { score: 2, label: 'Stressed', emoji: '🤯', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  'Tense': { score: 1, label: 'Tense', emoji: '😠', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

const getMoodData = (moodStr?: string) => {
  if (!moodStr) return null;
  const cleanStr = moodStr.toLowerCase();
  
  for (const [key, val] of Object.entries(MOOD_MAPPING)) {
    if (cleanStr.includes(key.toLowerCase()) || cleanStr.includes(val.emoji)) {
      return val;
    }
  }
  return { score: 3, label: moodStr, emoji: '💭', color: '#C69C6D', bg: 'rgba(198, 156, 109, 0.1)' };
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

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit }) => {
  const [subTab, setSubTab] = useState<'timeline' | 'reflections'>('timeline');
  
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    const sorted = [...entries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
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
  }, [entries]);

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
      {/* Header with Switcher Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-16 mt-8 border-b border-surface-highlight/30 pb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-accent/10 rounded-2xl">
                {subTab === 'timeline' ? (
                   <Library className="w-8 h-8 text-accent" />
                ) : (
                   <LineChart className="w-8 h-8 text-accent" />
                )}
             </div>
             <h2 className="text-5xl md:text-6xl font-display font-bold text-primary tracking-tighter">
               {subTab === 'timeline' ? 'Memories' : 'Reflections'}
             </h2>
          </div>
          <div className="flex items-center gap-3">
              <div className="h-0.5 w-12 bg-accent rounded-full"></div>
              <p className="font-grotesk text-secondary text-[10px] uppercase tracking-[0.4em] opacity-60">
                {subTab === 'timeline' ? 'Visual Journal Timeline' : 'Mood Analytics & Trends'}
              </p>
          </div>
        </div>

        {/* Switcher Tab Buttons */}
        <div className="flex bg-surface-highlight/40 p-1.5 rounded-2xl border border-surface-highlight/30 max-w-sm shrink-0 shadow-inner relative z-0">
          <button
            onClick={() => setSubTab('timeline')}
            className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors duration-300 z-10 ${
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
            <Library className="w-4 h-4" />
            Timeline
          </button>
          <button
            onClick={() => setSubTab('reflections')}
            className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors duration-300 z-10 ${
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
            <LineChart className="w-4 h-4" />
            Reflections
          </button>
        </div>
      </div>

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
             <p className="font-display text-4xl text-primary font-bold">A Clean Page</p>
             <p className="font-sans text-secondary mt-4 max-w-xs mx-auto leading-relaxed opacity-40">
               Your story begins here. Capture a thought or a moment to build your archive of memories.
             </p>
          </div>
        ) : (
          <div className="space-y-32">
            {groupedEntries.map(([dateLabel, dayEntries]) => (
              <section key={dateLabel} className="group/section animate-slide-up">
                <div className="flex items-baseline gap-6 mb-12">
                  <span className="text-3xl font-display font-bold text-primary group-hover/section:text-accent transition-colors duration-500">{dateLabel}</span>
                  <div className="h-px flex-grow bg-surface-highlight opacity-50"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {dayEntries.map((entry, idx) => {
                    const isHero = dayEntries.length === 1 || (dayEntries.length > 2 && idx === 0);
                    const timeString = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    return (
                      <motion.button 
                        key={entry.id} 
                        onClick={() => onEdit(entry)}
                        title="View & Edit Memory"
                        whileHover={{ y: -6, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`group relative flex flex-col text-left bg-surface rounded-[2.5rem] border border-surface-highlight shadow-sm hover:shadow-2xl overflow-hidden outline-none ${
                          isHero ? 'md:col-span-2' : ''
                        }`}
                      >
                        {entry.image ? (
                          <div className={`${isHero ? 'h-80' : 'h-52'} w-full overflow-hidden relative`}>
                            <img 
                              src={entry.image} 
                              alt="cover" 
                              className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            <div className="absolute top-6 left-6 flex gap-2">
                               <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[9px] font-bold tracking-widest uppercase">
                                 {timeString}
                               </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 pb-0">
                             <div className="flex items-center gap-2 mb-4 opacity-50">
                                <ImageIcon className="w-3 h-3 text-accent" />
                                <span className="text-[9px] font-grotesk font-bold uppercase tracking-wider text-secondary">
                                  {timeString}
                                </span>
                             </div>
                          </div>
                        )}

                        <div className="p-10 flex-1 flex flex-col">
                          <div className="mb-8">
                             {entry.mood && (
                               <span className="inline-block text-[9px] font-grotesk font-bold uppercase tracking-widest text-accent mb-4 px-2.5 py-0.5 bg-accent/5 rounded-lg border border-accent/10 transition-colors group-hover:bg-accent/10">
                                 {entry.mood}
                               </span>
                             )}
                             <p className="font-sans text-xl leading-relaxed text-primary/70 line-clamp-3 group-hover:text-primary transition-colors duration-300">
                               {stripMarkdownAndTruncate(entry.content)}
                             </p>
                          </div>

                          {entry.aiInsight && (
                            <div className="mt-auto pt-8 border-t border-surface-highlight flex gap-4 transition-all duration-300">
                              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-1" />
                              <p className="font-display text-[15px] text-primary/80 leading-relaxed italic text-left">
                                {entry.aiInsight}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.button>
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
                        className="p-5 rounded-2xl bg-surface-highlight/20 border border-surface-highlight/30 hover:border-accent/20 cursor-pointer transition-all duration-300 flex flex-col text-left group"
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
    </div>
  );
};
