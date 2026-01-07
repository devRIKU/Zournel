import React, { useMemo } from 'react';
import { Sparkles, Feather, Image as ImageIcon, Library } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalViewProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
}

const TRUNCATE_LIMIT = 140;

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit }) => {
  
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    // Ensure createdAt exists
    const sorted = [...entries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    sorted.forEach(entry => {
      // Safety check for date
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

  const stripMarkdownAndTruncate = (text: string) => {
    if (!text) return '';
    const stripped = text.replace(/[#*`_~[\]()]/g, '').trim();
    if (stripped.length <= TRUNCATE_LIMIT) return stripped;
    return stripped.slice(0, TRUNCATE_LIMIT) + '...';
  };

  return (
    <div className="pb-40 px-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="mb-20 mt-8 flex flex-col gap-2">
        <div className="flex items-center gap-4 mb-2">
           <div className="p-3 bg-accent/10 rounded-2xl">
              <Library className="w-8 h-8 text-accent" />
           </div>
           <h2 className="text-6xl font-display font-bold text-primary tracking-tighter">Memories</h2>
        </div>
        <div className="flex items-center gap-3">
            <div className="h-0.5 w-12 bg-accent rounded-full"></div>
            <p className="font-grotesk text-secondary text-[10px] uppercase tracking-[0.4em] opacity-60">Visual Journal Timeline</p>
        </div>
      </div>

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
                  // Safe date string
                  const timeString = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  return (
                    <button 
                      key={entry.id} 
                      onClick={() => onEdit(entry)}
                      title="View & Edit Memory"
                      className={`group relative flex flex-col text-left bg-surface rounded-[2.5rem] border border-surface-highlight shadow-sm hover:shadow-2xl hover:-translate-y-2 active:scale-[0.98] transition-all duration-500 overflow-hidden outline-none ${
                        isHero ? 'md:col-span-2' : ''
                      }`}
                    >
                      {entry.image ? (
                        <div className={`${isHero ? 'h-80' : 'h-52'} w-full overflow-hidden relative`}>
                          <img 
                            src={entry.image} 
                            alt="cover" 
                            className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" 
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
                          <div className="mt-auto pt-8 border-t border-surface-highlight flex gap-4 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-1" />
                            <p className="font-display text-lg text-secondary leading-relaxed italic">
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