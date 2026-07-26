
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ArrowRight, ExternalLink } from 'lucide-react';

interface OnboardingModalProps {
  onSave: (apiKey: string) => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSave, onSkip }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    } else {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        className="bg-surface rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-surface-highlight relative overflow-hidden"
      >
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/30 mx-auto">
             <Key className="w-8 h-8 text-accent-fg" />
          </div>
          
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-center text-primary mb-2 break-words">Welcome to Zournel</h2>
          <p className="text-center text-secondary text-sm leading-relaxed mb-8">
            Zournel can optionally connect to Google Gemini for AI insights. You can enter an API key now, or skip this step and add it later in Preferences.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <input 
                 type="password" 
                 value={key}
                 onChange={(e) => setKey(e.target.value)}
                 placeholder="Paste your Gemini API Key here (Optional)"
                 className="w-full bg-surface-highlight p-4 rounded-xl border-2 border-transparent focus:border-accent outline-none text-primary font-mono text-center transition-all placeholder:text-secondary/40"
                 autoFocus
               />
             </div>

             <div className="flex gap-2">
               <button 
                 type="button"
                 onClick={onSkip}
                 className="flex-1 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-secondary bg-surface-highlight hover:bg-surface-highlight/80 transition-all active:scale-95"
               >
                 Skip
               </button>
               <button 
                 type="submit"
                 disabled={!key.trim()}
                 className={`flex-2 py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                   key.trim() 
                   ? 'bg-accent text-accent-fg hover:bg-accent/90 hover:scale-[1.02] active:scale-95 shadow-accent/25' 
                   : 'bg-surface-highlight text-secondary cursor-not-allowed shadow-none opacity-50'
                 }`}
                 style={{ flex: 2 }}
               >
                 <span>Save</span>
                 <ArrowRight className="w-4 h-4" />
               </button>
             </div>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-highlight/50 text-center">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline decoration-2 underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
            >
              <span>Get a free API Key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
