import React from 'react';
import { Quote, Edit2 } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalViewProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ entries, onEdit }) => {
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  const formatYear = (timestamp: number) => {
     return new Date(timestamp).getFullYear();
  }

  return (
    <div className="pb-32 px-6 max-w-3xl mx-auto w-full">
      <div className="mb-12 mt-4">
        <h2 className="text-5xl font-display font-bold text-primary tracking-tight">Journal</h2>
        <p className="font-grotesk text-secondary mt-2 text-sm uppercase tracking-widest">Your Story</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
           <Quote className="w-16 h-16 text-secondary mb-4 stroke-[1]" />
           <p className="font-display text-2xl text-secondary">Write your first entry</p>
           <p className="font-grotesk text-sm text-secondary mt-2">Capture the moment</p>
        </div>
      ) : (
        <div className="space-y-12 animate-fade-in">
          {entries.map((entry, index) => (
            <div key={entry.id} className="relative group">
               {/* Timeline Connector */}
               {index !== entries.length - 1 && (
                  <div className="absolute left-[1.15rem] top-12 bottom-[-3rem] w-[1px] bg-secondary opacity-10"></div>
               )}

               <div className="flex gap-8">
                  {/* Date Column */}
                  <div className="flex flex-col items-center min-w-[3rem] pt-2">
                     <span className="font-grotesk font-bold text-2xl text-primary">{new Date(entry.createdAt).getDate()}</span>
                     <span className="font-grotesk text-xs text-secondary uppercase tracking-wider">{new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 bg-surface rounded-[2rem] shadow-sm overflow-hidden border border-surface-highlight hover:shadow-lg transition-all duration-500 relative group/card">
                    
                    {/* Edit Button - Always Visible */}
                    <button 
                        onClick={() => onEdit(entry)}
                        className="absolute top-4 right-4 z-20 p-3 bg-surface/60 backdrop-blur-md rounded-full text-secondary hover:text-accent hover:bg-surface shadow-sm border border-surface-highlight/50 transition-all duration-300"
                        title="Edit Entry"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>

                    {entry.image && (
                        <div className="h-56 w-full overflow-hidden relative">
                            <img src={entry.image} alt="cover" className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105" />
                            {entry.mood && (
                                <div className="absolute bottom-4 left-4">
                                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white font-grotesk text-xs uppercase tracking-widest rounded-full">
                                        {entry.mood}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-8">
                        {!entry.image && entry.mood && (
                             <span className="inline-block px-3 py-1 bg-surface-highlight text-secondary font-grotesk text-xs uppercase tracking-widest rounded-full mb-4">
                                {entry.mood}
                             </span>
                        )}
                        
                        <div className="prose prose-lg max-w-none">
                            <p className="font-sans text-lg leading-8 text-primary opacity-90 whitespace-pre-line">
                                {entry.content}
                            </p>
                        </div>

                        {entry.aiInsight && (
                            <div className="mt-8 pt-6 border-t border-surface-highlight">
                                <p className="font-display italic text-xl text-secondary leading-relaxed">
                                    "{entry.aiInsight}"
                                </p>
                            </div>
                        )}
                    </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};