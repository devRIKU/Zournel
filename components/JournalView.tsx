import React, { useMemo } from 'react';
import { Clock, Sparkles, Feather, Image as ImageIcon } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalViewProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
}

const TRUNCATE_LIMIT = 140;

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit }) => {
  
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    
    sorted.forEach(entry => {
      const date = new Date(entry.createdAt);
      const dateKey = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    
    return Object.entries(groups);
  }, [entries]);

  const stripMarkdownAndTruncate = (text: string) => {
    const stripped = text.replace(/[#*`_~[\]()]/g, '').trim();
    if (stripped.length <= TRUNCATE_LIMIT) return stripped;
    return stripped.slice(0, TRUNCATE_LIMIT) + '...';
  };

  return (
    <div className="pb-40 px-6 max-w-6xl mx-auto w-full">
      <div className="mb-20 mt-8 flex flex-col gap-2">
        <h2 className="text-6xl font-display font-bold text-primary tracking-tighter">Archives</h2>
        <div className="flex items-center gap-3">
            <div className="h-0.5 w-12 bg-accent rounded-full"></div>
            <p className="font-grotesk text-secondary text-xs uppercase tracking-[0.4em]">Visual Temporal Grid</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
           <div className="w-24 h-24 bg-surface-highlight rounded-full flex items-center justify-center mb-8 border border-accent/10">
             <Feather className="w-10 h-10 text-accent/40" />
           </div>
           <p className="font-display text-4xl text-primary font-bold">The page is waiting</p>
           <p className="font-sans text-secondary mt-4 max-w-xs mx-auto leading-relaxed opacity-60">
             Your thoughts deserve a home. Tap the action button to begin.
           </p>
        </div>
      ) : (
        <div className="space-y-32 animate-fade-in">
          {groupedEntries.map(([dateLabel, dayEntries]) => (
            <section key={dateLabel} className="group/section">
              <div className="flex items-baseline gap-6 mb-12">
                <span className="text-3xl font-display font-bold text-primary group-hover/section:text-accent transition-colors">{dateLabel}</span>
                <div className="h-px flex-grow bg-surface-highlight"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {dayEntries.map((entry, idx) => {
                  const isHero = dayEntries.length === 1 || (dayEntries.length > 2 && idx === 0);
                  return (
                    <button 
                      key={entry.id} 
                      onClick={() => onEdit(entry)}
                      className={`group relative flex flex-col text-left bg-surface rounded-[2rem] border border-surface-highlight shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] transition-all duration-700 overflow-hidden outline-none ${
                        isHero ? 'md:col-span-2' : ''
                      }`}
                    >
                      {entry.image ? (
                        <div className={`${isHero ? 'h-80' : 'h-52'} w-full overflow-hidden relative`}>
                          <img 
                            src={entry.image} 
                            alt="cover" 
                            className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                          <div className="absolute top-6 left-6 flex gap-2">
                             <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase">
                               {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 pb-0">
                           <div className="flex items-center gap-2 mb-4">
                              <ImageIcon className="w-4 h-4 text-accent/20" />
                              <span className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-secondary">
                                {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        </div>
                      )}

                      <div className="p-10 flex-1 flex flex-col">
                        <div className="mb-8">
                           {entry.mood && (
                             <span className="inline-block text-[10px] font-grotesk font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/5 rounded-lg border border-accent/10">
                               {entry.mood}
                             </span>
                           )}
                           <p className="font-sans text-xl leading-relaxed text-primary/80 line-clamp-3">
                             {stripMarkdownAndTruncate(entry.content)}
                           </p>
                        </div>

                        {entry.aiInsight && (
                          <div className="mt-auto pt-8 border-t border-surface-highlight flex gap-4">
                            <Sparkles className="w-5 h-5 text-accent shrink-0 mt-1" />
                            <p className="font-display text-lg text-secondary leading-relaxed italic opacity-80">
                              {entry.aiInsight}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};