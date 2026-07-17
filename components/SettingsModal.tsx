
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Cpu, Palette, Key, Grid, TreePine, Cat, CheckCircle } from 'lucide-react';
import { AppSettings, Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const MODELS = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', badge: 'Recommended', desc: 'Default for Polishing & Summarizing' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', badge: 'Fast', desc: 'Default for Todo & Extraction' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', badge: 'Ultra', desc: 'Expert reasoning & coding' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const ThemeButton = ({ theme, icon: Icon, label, colorClass }: { theme: Theme, icon: any, label: string, colorClass: string }) => (
    <button 
      onClick={() => onUpdateSettings({ ...settings, theme })}
      className={`flex flex-col items-center gap-2 p-3.5 rounded-[1.8rem] border-2 transition-all duration-300 w-full ${settings.theme === theme ? 'border-accent bg-accent/5 text-primary scale-[1.02] font-semibold' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
    >
      <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center shadow-md`}>
          <Icon className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{label}</span>
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="bg-surface rounded-[3rem] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden border border-white/10"
          >
            
            <div className="flex justify-between items-center p-8 border-b border-surface-highlight shrink-0">
              <div>
                <h2 className="text-3xl font-display font-bold text-primary">Preferences</h2>
                <p className="text-secondary text-[10px] font-grotesk tracking-widest uppercase mt-1">Refine your environment</p>
              </div>
              <button onClick={onClose} className="p-4 bg-surface-highlight hover:bg-accent hover:text-accent-fg rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-8 space-y-10 no-scrollbar">
              
              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Key className="w-4 h-4" /> API Configuration
                </h3>
                <div className="p-5 bg-surface-highlight rounded-[1.5rem] border border-surface-highlight">
                   <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Gemini API Key</label>
                   <input 
                     type="password" 
                     value={settings.apiKey}
                     onChange={(e) => onUpdateSettings({ ...settings, apiKey: e.target.value })}
                     placeholder="Enter your API Key..."
                     className="w-full bg-surface p-4 rounded-xl border-none outline-none text-primary font-mono text-sm focus:ring-2 focus:ring-accent/50 transition-all"
                   />
                   <p className="mt-3 text-[10px] text-secondary/60 leading-relaxed">
                     Your key is stored locally on this device. We use it to communicate directly with Google's Gemini API for task analysis and journaling insights.
                   </p>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Palette className="w-4 h-4" /> Aesthetics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Minimal (Apple / Google)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="apple-light" icon={Sun} label="Light" colorClass="bg-zinc-200 text-zinc-800" />
                      <ThemeButton theme="apple-dark" icon={Moon} label="Dark" colorClass="bg-zinc-950 text-zinc-100" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Graph Box (GitHub)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="graph-light" icon={Grid} label="Light" colorClass="bg-emerald-100 text-emerald-800" />
                      <ThemeButton theme="graph-dark" icon={Grid} label="Dark" colorClass="bg-emerald-950 text-emerald-300" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Evergreen (Botanical)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="evergreen-light" icon={TreePine} label="Light" colorClass="bg-green-100 text-green-800" />
                      <ThemeButton theme="evergreen-dark" icon={TreePine} label="Dark" colorClass="bg-green-950 text-emerald-300" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Cat Watching (Cozy stars)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="cat-light" icon={Cat} label="Light" colorClass="bg-amber-100 text-amber-800" />
                      <ThemeButton theme="cat-dark" icon={Cat} label="Dark" colorClass="bg-amber-950 text-amber-300" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                 <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Cpu className="w-4 h-4" /> AI Model
                </h3>
                <div className="space-y-3">
                   {MODELS.map((m) => (
                     <button 
                      key={m.id}
                      onClick={() => onUpdateSettings({ ...settings, model: m.id })}
                      className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all border-2 ${settings.model === m.id ? 'border-accent bg-accent/5' : 'border-surface-highlight bg-surface'}`}
                     >
                       <div className="text-left">
                         <div className="flex items-center gap-3 mb-1">
                            <p className={`text-lg font-bold ${settings.model === m.id ? 'text-accent' : 'text-primary'}`}>{m.label}</p>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-surface-highlight text-secondary border border-surface-highlight">{m.badge}</span>
                         </div>
                         <p className="text-xs text-secondary opacity-70">{m.desc}</p>
                       </div>
                       {settings.model === m.id && <div className="w-3 h-3 rounded-full bg-accent animate-pulse"></div>}
                     </button>
                   ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4" /> Completion
                </h3>
                <div className="flex gap-2 bg-surface-highlight p-2 rounded-2xl">
                   {['confetti', 'bounce', 'none'].map((opt) => (
                     <button 
                      key={opt}
                      onClick={() => onUpdateSettings({ ...settings, completionAnimation: opt as CompletionAnimation })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${settings.completionAnimation === opt ? 'bg-surface text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
                     >
                       {opt}
                     </button>
                   ))}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
