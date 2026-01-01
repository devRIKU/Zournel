import React from 'react';
import { X, Moon, Sun, Leaf, CheckCircle2, Trash2, Smartphone, Terminal, Palette, Droplets } from 'lucide-react';
import { AppSettings, Theme, CompletionAnimation, DeleteAnimation } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleThemeChange = (theme: Theme) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleCompletionAnimChange = (completionAnimation: CompletionAnimation) => {
    onUpdateSettings({ ...settings, completionAnimation });
  };

  const handleDeleteAnimChange = (deleteAnimation: DeleteAnimation) => {
    onUpdateSettings({ ...settings, deleteAnimation });
  };

  const ThemeButton = ({ theme, icon: Icon, label, colorClass }: { theme: Theme, icon: any, label: string, colorClass: string }) => (
    <button 
      onClick={() => handleThemeChange(theme)}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${settings.theme === theme ? 'border-accent bg-accent/10 text-primary scale-105' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
    >
      <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-[2rem] w-full max-w-md shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh] overflow-hidden border border-white/5">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-surface-highlight bg-surface z-10">
          <h2 className="text-2xl font-display font-bold text-primary">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-highlight rounded-full transition-colors text-secondary">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Theme Section */}
          <section>
            <h3 className="text-sm font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Theme
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

          {/* Completion Animation Section */}
          <section>
            <h3 className="text-sm font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Task Completion
            </h3>
            <div className="space-y-2">
               {[
                 { id: 'confetti', label: 'Confetti Pop', desc: 'A burst of joy' },
                 { id: 'bounce', label: 'Rubber Bounce', desc: 'Playful feedback' },
                 { id: 'slide-right', label: 'Slide Away', desc: 'Smooth dismissal' },
                 { id: 'none', label: 'None', desc: 'Minimalist' },
               ].map((opt) => (
                 <button 
                  key={opt.id}
                  onClick={() => handleCompletionAnimChange(opt.id as CompletionAnimation)}
                  className={`w-full flex items-center justify-between p-3 px-4 rounded-xl transition-all border ${settings.completionAnimation === opt.id ? 'border-accent bg-accent/5' : 'border-surface-highlight hover:border-accent/30 bg-surface'}`}
                 >
                   <div className="text-left">
                     <p className={`text-sm font-bold ${settings.completionAnimation === opt.id ? 'text-accent' : 'text-primary'}`}>{opt.label}</p>
                     <p className="text-xs text-secondary">{opt.desc}</p>
                   </div>
                   {settings.completionAnimation === opt.id && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                 </button>
               ))}
            </div>
          </section>

          {/* Delete Animation Section */}
          <section>
            <h3 className="text-sm font-grotesk font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Task Deletion
            </h3>
             <div className="space-y-2">
               {[
                 { id: 'shrink', label: 'Shrink', desc: 'Collapse into nothing' },
                 { id: 'slide-left', label: 'Swipe Left', desc: 'Discard aside' },
                 { id: 'none', label: 'Instant', desc: 'Disappear immediately' },
               ].map((opt) => (
                 <button 
                  key={opt.id}
                  onClick={() => handleDeleteAnimChange(opt.id as DeleteAnimation)}
                  className={`w-full flex items-center justify-between p-3 px-4 rounded-xl transition-all border ${settings.deleteAnimation === opt.id ? 'border-accent bg-accent/5' : 'border-surface-highlight hover:border-accent/30 bg-surface'}`}
                 >
                   <div className="text-left">
                     <p className={`text-sm font-bold ${settings.deleteAnimation === opt.id ? 'text-accent' : 'text-primary'}`}>{opt.label}</p>
                     <p className="text-xs text-secondary">{opt.desc}</p>
                   </div>
                   {settings.deleteAnimation === opt.id && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                 </button>
               ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};