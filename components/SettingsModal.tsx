import React from 'react';
import { X, Moon, Sun, Leaf, CheckCircle2, Cpu, Palette, Zap, Box, Wind, Droplets } from 'lucide-react';
import { AppSettings, Theme, CompletionAnimation } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const MODELS = [
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', badge: 'Ultra', desc: 'Expert reasoning' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', badge: 'Lite', desc: 'Fast & responsive' },
  { id: 'gemma-3-27b-it', label: 'Gemma 3', badge: 'Open', desc: 'High performance' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const ThemeButton = ({ theme, icon: Icon, label, colorClass }: { theme: Theme, icon: any, label: string, colorClass: string }) => (
    <button 
      onClick={() => onUpdateSettings({ ...settings, theme })}
      className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all duration-300 ${settings.theme === theme ? 'border-accent bg-accent/5 text-primary scale-105' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
    >
      <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center shadow-lg shadow-black/5`}>
          <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-[3rem] w-full max-w-xl shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh] overflow-hidden border border-white/10">
        
        <div className="flex justify-between items-center p-10 border-b border-surface-highlight">
          <div>
            <h2 className="text-4xl font-display font-bold text-primary">Preferences</h2>
            <p className="text-secondary text-sm font-grotesk tracking-widest uppercase mt-1">Configure your experience</p>
          </div>
          <button onClick={onClose} className="p-4 bg-surface-highlight hover:bg-accent hover:text-accent-fg rounded-2xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-10 space-y-12 no-scrollbar">
          
          <section>
            <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <Palette className="w-4 h-4" /> Aesthetics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ThemeButton theme="light" icon={Sun} label="Default" colorClass="bg-gray-400" />
              <ThemeButton theme="nord" icon={Wind} label="Nord" colorClass="bg-blue-400" />
              <ThemeButton theme="cyberpunk" icon={Zap} label="Cyber" colorClass="bg-yellow-400" />
              <ThemeButton theme="botanist" icon={Leaf} label="Flora" colorClass="bg-emerald-600" />
              <ThemeButton theme="glass" icon={Droplets} label="Glass" colorClass="bg-sky-400" />
              <ThemeButton theme="midnight" icon={Moon} label="Void" colorClass="bg-indigo-900" />
            </div>
          </section>

          <section>
             <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <Cpu className="w-4 h-4" /> AI Configuration
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
            <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4" /> Completion Style
            </h3>
            <div className="flex gap-2 bg-surface-highlight p-2 rounded-2xl">
               {['confetti', 'bounce', 'none'].map((opt) => (
                 <button 
                  key={opt}
                  onClick={() => onUpdateSettings({ ...settings, completionAnimation: opt as CompletionAnimation })}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settings.completionAnimation === opt ? 'bg-surface text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
                 >
                   {opt}
                 </button>
               ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};