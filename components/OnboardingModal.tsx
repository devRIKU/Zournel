
import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink } from 'lucide-react';

interface OnboardingModalProps {
  onSave: (apiKey: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-surface rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-surface-highlight relative animate-scale-in">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent/30 mx-auto">
             <Key className="w-8 h-8 text-accent-fg" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-center text-primary mb-2">Welcome to Zournel</h2>
          <p className="text-center text-secondary text-sm leading-relaxed mb-8">
            To power the AI features like task analysis and journaling insights, Zournel connects directly to Google Gemini. Please enter your API key to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <input 
                 type="password" 
                 value={key}
                 onChange={(e) => setKey(e.target.value)}
                 placeholder="Paste your Gemini API Key here"
                 className="w-full bg-surface-highlight p-4 rounded-xl border-2 border-transparent focus:border-accent outline-none text-primary font-mono text-center transition-all placeholder:text-secondary/40"
                 autoFocus
               />
             </div>

             <button 
               type="submit"
               disabled={!key.trim()}
               className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                 key.trim() 
                 ? 'bg-accent text-accent-fg hover:bg-accent/90 hover:scale-[1.02] active:scale-95 shadow-accent/25' 
                 : 'bg-surface-highlight text-secondary cursor-not-allowed shadow-none opacity-50'
               }`}
             >
               <span>Start Journaling</span>
               <ArrowRight className="w-4 h-4" />
             </button>
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
      </div>
    </div>
  );
};
