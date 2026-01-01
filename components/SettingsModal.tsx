import React from 'react';
import { X, Moon, Sun, Leaf, CheckCircle2, Trash2, Smartphone, Terminal, Palette, Cpu } from 'lucide-react';
import { AppSettings, Theme, CompletionAnimation, DeleteAnimation } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const MODELS = [
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', badge: 'Power', desc: 'Complex reasoning' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', badge: 'Fast', desc: 'Quick responses' },
  { id: 'gemma-3-27b-it', label: 'Gemma 3 27B', badge: 'Expert', desc: 'Advanced open model' },
  { id: 'gemma-3-4b-it', label: 'Gemma 3 4B', badge: 'Efficient', desc: 'Fast & responsive open model' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', badge: 'Lite', desc: 'Optimized efficiency' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const ThemeButton = ({ theme, icon: Icon, label, colorClass }: { theme: Theme, icon: any, label: string, colorClass: string }) => (
    <button 
      onClick={() => onUpdateSettings({ ...settings, theme })}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${settings.theme === theme ? 'border-accent bg-accent/10 text-primary scale-105' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
    >
      <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-[2rem] w-full max-w-md shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh] overflow-hidden border border-white/5">
        
        <div className="flex justify-between items-center p-6 border-b border-surface-highlight bg-surface z-10">
          <h2 className="text-2xl font-display font-bold text-primary">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-highlight rounded-full transition-colors text-secondary">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          <section>
            <h3 className="text-xs font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Visual Theme
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <ThemeButton theme="light" icon={Sun} label="Light" colorClass="bg-gray-400" />
              <ThemeButton theme="dawn" icon={Sun} label="Dawn" colorClass="bg-orange-300" />
              <ThemeButton theme="paper" icon={Leaf} label="Paper" colorClass="bg-stone-400" />
              <ThemeButton theme="midnight" icon={Moon} label="Midnight" colorClass="bg-indigo-500" />
              <ThemeButton theme="obsidian" icon={Smartphone} label="Obsidian" colorClass="bg-purple-900" />
              <ThemeButton theme="terminal" icon={Terminal} label="Terminal" colorClass="bg-green-600" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> AI Model
            </h3>
            <div className="space-y-2">
               {MODELS.map((m) => (
                 <button 
                  key={m.id}
                  onClick={() => onUpdateSettings({ ...settings, model: m.id })}
                  className={`w-full flex items-center justify-between p-3 px-4 rounded-xl transition-all border ${settings.model === m.id ? 'border-accent bg-accent/5' : 'border-surface-highlight hover:border-accent/30 bg-surface'}`}
                 >
                   <div className="text-left">
                     <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${settings.model === m.id ? 'text-accent' : 'text-primary'}`}>{m.label}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${settings.model === m.id ? 'bg-accent text-accent-fg border-accent' : 'bg-surface-highlight text-secondary border-surface-highlight'}`}>{m.badge}</span>
                     </div>
                     <p className="text-[10px] text-secondary">{m.desc}</p>
                   </div>
                   {settings.model === m.id && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                 </button>
               ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Completion Style
            </h3>
            <div className="space-y-2">
               {[
                 { id: 'confetti', label: 'Confetti Pop', desc: 'Celebratory burst' },
                 { id: 'bounce', label: 'Rubber Bounce', desc: 'Tactile feel' },
                 { id: 'none', label: 'None', desc: 'Silent' },
               ].map((opt) => (
                 <button 
                  key={opt.id}
                  onClick={() => onUpdateSettings({ ...settings, completionAnimation: opt.id as CompletionAnimation })}
                  className={`w-full flex items-center justify-between p-3 px-4 rounded-xl transition-all border ${settings.completionAnimation === opt.id ? 'border-accent bg-accent/5' : 'border-surface-highlight hover:border-accent/30 bg-surface'}`}
                 >
                   <div className="text-left">
                     <p className={`text-sm font-bold ${settings.completionAnimation === opt.id ? 'text-accent' : 'text-primary'}`}>{opt.label}</p>
                     <p className="text-[10px] text-secondary">{opt.desc}</p>
                   </div>
                   {settings.completionAnimation === opt.id && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                 </button>
               ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};