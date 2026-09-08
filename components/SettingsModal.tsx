
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Cpu, Palette, Key, Grid, TreePine, Cat, CheckCircle, Coffee, Type, CloudCheck, ShieldCheck, RefreshCw } from './Icons';
import { AppSettings, Theme, CompletionAnimation } from '../types';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', badge: 'Default', desc: 'Default for Tasks, Subtasks & Extraction' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', badge: 'Fast', desc: 'Lightweight & instant response model' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', badge: 'Recommended', desc: 'Default for Polishing, Summaries & Insights' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B', badge: 'Open Model', desc: 'Open-weights reasoning model' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const handleUpdate = (updated: AppSettings) => {
    triggerHaptic(6);
    onUpdateSettings(updated);
  };

  const handleClose = () => {
    triggerHaptic(8);
    onClose();
  };

  const ThemeButton = ({ theme, icon: Icon, label, colorClass }: { theme: Theme, icon: any, label: string, colorClass: string }) => (
    <button 
      onClick={() => handleUpdate({ ...settings, theme })}
      className={`flex flex-col items-center gap-2 p-3.5 rounded-[1.8rem] border-2 transition duration-200 active:scale-[0.96] w-full ${settings.theme === theme ? 'border-accent bg-accent/5 text-primary scale-[1.02] font-semibold' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
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
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={iosSpring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                handleClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[2rem] sm:rounded-[3rem] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden border border-white/10"
          >
            {/* Gesture Handle Bar */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-surface-highlight/80" />
            </div>
            
            <div className="flex justify-between items-center px-6 sm:px-8 py-4 sm:py-5 border-b border-surface-highlight shrink-0">
              <div>
                <h2 className="text-3xl font-display font-bold text-primary">Preferences</h2>
                <p className="text-secondary text-[10px] font-grotesk tracking-widest uppercase mt-0.5">Refine your environment</p>
              </div>
              <button onClick={handleClose} className="p-3 bg-surface-highlight hover:bg-accent hover:text-accent-fg rounded-2xl transition active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 sm:p-8 space-y-10 no-scrollbar overscroll-contain">
              
              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Key className="w-4 h-4" /> API Configuration
                </h3>
                <div className="p-5 bg-surface-highlight/50 rounded-[1.5rem] border border-surface-highlight">
                   <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-2">Gemini API Key</label>
                   <input 
                     type="password" 
                     value={settings.apiKey}
                     onChange={(e) => handleUpdate({ ...settings, apiKey: e.target.value })}
                     placeholder="Enter your API Key..."
                     className="w-full bg-surface p-4 rounded-xl border-none outline-none text-primary font-mono text-sm focus:ring-2 focus:ring-accent/50 transition"
                   />
                   <p className="mt-3 text-[10px] text-secondary/60 leading-relaxed">
                     Your key is stored locally on this device. We use it to communicate directly with Google's Gemini API for task analysis and journaling insights.
                   </p>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" /> Cloud & Auto-Backup
                </h3>
                <div className="p-5 bg-surface-highlight/50 rounded-[1.5rem] border border-surface-highlight space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-primary">Automatic Background Backup</h4>
                      <p className="text-[11px] text-secondary/70">Sync memories and app config seamlessly to cloud storage</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ ...settings, autoBackupEnabled: !(settings.autoBackupEnabled ?? true) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:scale-95 ${
                        (settings.autoBackupEnabled ?? true) ? 'bg-emerald-500' : 'bg-surface-highlight/80'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (settings.autoBackupEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {(settings.autoBackupEnabled ?? true) && (
                    <div className="pt-3 border-t border-surface-highlight/50 space-y-3">
                      <label className="block text-xs font-bold text-secondary uppercase tracking-wider">Sync Frequency</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { val: 0, label: 'Instant' },
                          { val: 5, label: '5 Mins' },
                          { val: 15, label: '15 Mins' },
                          { val: 60, label: '1 Hour' },
                        ].map(freq => (
                          <button
                            key={freq.val}
                            type="button"
                            onClick={() => handleUpdate({ ...settings, autoBackupIntervalMinutes: freq.val })}
                            className={`py-2 rounded-xl text-xs font-bold transition border active:scale-95 ${
                              (settings.autoBackupIntervalMinutes ?? 5) === freq.val
                                ? 'bg-surface text-accent border-accent/40 shadow-xs'
                                : 'bg-surface-highlight/40 text-secondary hover:text-primary border-transparent'
                            }`}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <Palette className="w-4 h-4" /> Aesthetics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Cozy (Warm Amber)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="cozy-light" icon={Coffee} label="Light" colorClass="bg-[#B86B1E] text-white" />
                      <ThemeButton theme="cozy-dark" icon={Coffee} label="Dark" colorClass="bg-[#110D0A] text-[#F59E0B]" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Evergreen (Emerald Forest)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="evergreen-light" icon={TreePine} label="Light" colorClass="bg-[#059669] text-white" />
                      <ThemeButton theme="evergreen-dark" icon={TreePine} label="Dark" colorClass="bg-[#071209] text-[#10B981]" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Catppuccin (Vibrant Violet)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="catppuccin-light" icon={Cat} label="Light" colorClass="bg-[#7C3AED] text-white" />
                      <ThemeButton theme="catppuccin-dark" icon={Cat} label="Dark" colorClass="bg-[#0F0F17] text-[#C084FC]" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 bg-surface-highlight/30 p-4 rounded-[2rem] border border-surface-highlight/50">
                    <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.15em] block px-1">Gruvbox (Retro Flame)</span>
                    <div className="flex gap-2">
                      <ThemeButton theme="gruvbox-light" icon={Palette} label="Light" colorClass="bg-[#AF3A03] text-[#FFF9E0]" />
                      <ThemeButton theme="gruvbox-dark" icon={Palette} label="Dark" colorClass="bg-[#121415] text-[#FF8700]" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] flex items-center gap-3">
                    <Type className="w-4 h-4" /> Typography &amp; Fonts
                  </h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                    Compact Controls
                  </span>
                </div>
                <p className="text-[11px] text-secondary/70 leading-relaxed mb-4">
                  Select clean typography preferences using compact dropdown inputs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Heading Font Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-primary">Headings &amp; UI Font</label>
                    <select
                      value={settings.headingFontFamily || 'outfit'}
                      onChange={(e) => handleUpdate({ ...settings, headingFontFamily: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-2xl bg-surface border border-surface-highlight text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition cursor-pointer"
                    >
                      {[
                        { id: 'syncopate', name: 'Syncopate (Wide Display)' },
                        { id: 'syne', name: 'Syne (Avant-Garde)' },
                        { id: 'outfit', name: 'Outfit (Modern Display)' },
                        { id: 'playfair', name: 'Playfair (Editorial Serif)' },
                        { id: 'space-grotesk', name: 'Space Grotesk (Tech Display)' },
                        { id: 'cormorant', name: 'Cormorant (Graceful Serif)' },
                        { id: 'cinzel', name: 'Cinzel (Cinematic Display)' },
                      ].map((hf) => (
                        <option key={hf.id} value={hf.id} className="bg-surface text-primary py-1">
                          {hf.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Body Font Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-primary">Body &amp; Editor Font</label>
                    <select
                      value={settings.fontFamily || 'inter'}
                      onChange={(e) => handleUpdate({ ...settings, fontFamily: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-2xl bg-surface border border-surface-highlight text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition cursor-pointer"
                    >
                      {[
                        { id: 'inter', name: 'Inter (Modern Sans)' },
                        { id: 'plus-jakarta', name: 'Plus Jakarta (Geometric Sans)' },
                        { id: 'lora', name: 'Lora (Warm Serif)' },
                        { id: 'merriweather', name: 'Merriweather (Book Serif)' },
                        { id: 'space-grotesk', name: 'Space Grotesk (Tech Minimalist)' },
                        { id: 'jetbrains-mono', name: 'JetBrains Mono (Monospace)' },
                      ].map((f) => (
                        <option key={f.id} value={f.id} className="bg-surface text-primary py-1">
                          {f.name}
                        </option>
                      ))}
                    </select>
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
                      onClick={() => handleUpdate({ ...settings, model: m.id })}
                      className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] transition border-2 active:scale-[0.97] ${settings.model === m.id ? 'border-accent bg-accent/5' : 'border-surface-highlight bg-surface'}`}
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
                      onClick={() => handleUpdate({ ...settings, completionAnimation: opt as CompletionAnimation })}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition active:scale-95 ${settings.completionAnimation === opt ? 'bg-surface text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
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
