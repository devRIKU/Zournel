
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Cpu, Palette, Key, Grid, TreePine, Cat, CheckCircle, Coffee, Type, CloudCheck, ShieldCheck, RefreshCw } from './Icons';
import { AppSettings, Theme, CompletionAnimation } from '../types';
import { iosSpring, triggerHaptic } from '../utils/uiSprings';
import { DraggableSwitch } from './ui/DraggableToggle';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', badge: 'Recommended', desc: 'Fast, multimodal intelligence for auto titles & insights' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', badge: 'Fastest', desc: 'Ultra lightweight & instant response model' },
  { id: 'gemma-4-31b-it', label: 'Gemma 4-31B-it', badge: 'Open Model', desc: 'Specialized 31B open weights for structured reflection' },
];

const HEADING_FONTS = [
  { id: 'syncopate', name: 'Syncopate', tag: 'Wide Display', sampleFont: "'Syncopate', sans-serif" },
  { id: 'syne', name: 'Syne', tag: 'Avant-Garde', sampleFont: "'Syne', sans-serif" },
  { id: 'outfit', name: 'Outfit', tag: 'Modern Display', sampleFont: "'Outfit', sans-serif" },
  { id: 'playfair', name: 'Playfair', tag: 'Editorial Serif', sampleFont: "'Playfair Display', serif" },
  { id: 'space-grotesk', name: 'Space Grotesk', tag: 'Tech Display', sampleFont: "'Space Grotesk', sans-serif" },
  { id: 'cormorant', name: 'Cormorant', tag: 'Graceful Serif', sampleFont: "'Cormorant Garamond', serif" },
  { id: 'cinzel', name: 'Cinzel', tag: 'Cinematic Display', sampleFont: "'Cinzel', serif" },
];

const BODY_FONTS = [
  { id: 'inter', name: 'Inter', tag: 'Modern Sans', sampleFont: "'Inter', sans-serif" },
  { id: 'plus-jakarta', name: 'Plus Jakarta', tag: 'Geometric Sans', sampleFont: "'Plus Jakarta Sans', sans-serif" },
  { id: 'lora', name: 'Lora', tag: 'Warm Serif', sampleFont: "'Lora', serif" },
  { id: 'merriweather', name: 'Merriweather', tag: 'Book Serif', sampleFont: "'Merriweather', serif" },
  { id: 'space-grotesk', name: 'Space Grotesk', tag: 'Minimalist', sampleFont: "'Space Grotesk', sans-serif" },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', tag: 'Monospace', sampleFont: "'JetBrains Mono', monospace" },
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
      type="button"
      onClick={() => handleUpdate({ ...settings, theme })}
      style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
      className={`flex flex-col items-center gap-2 p-3.5 rounded-[1.8rem] border-2 transition-transform duration-150 active:scale-95 w-full cursor-pointer ${settings.theme === theme ? 'border-accent bg-accent/5 text-primary scale-[1.02] font-semibold' : 'border-transparent bg-surface hover:bg-surface-highlight text-secondary'}`}
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
          style={{ transform: 'translateZ(0)', willChange: 'opacity' }}
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
            style={{ transform: 'translateZ(0)', willChange: 'transform, opacity' }}
            className="bg-surface rounded-[2rem] sm:rounded-[3rem] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[95vh] overflow-hidden border border-white/10"
          >
            {/* Gesture Handle Bar */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 select-none" style={{ touchAction: 'none' }}>
              <div className="w-10 h-1.5 rounded-full bg-surface-highlight/80" />
            </div>
            
            <div className="flex justify-between items-center px-6 sm:px-8 py-4 sm:py-5 border-b border-surface-highlight shrink-0">
              <div>
                <h2 className="text-3xl font-display font-bold text-primary">Preferences</h2>
                <p className="text-secondary text-[10px] font-grotesk tracking-widest uppercase mt-0.5">Refine your environment</p>
              </div>
              <button 
                type="button"
                onClick={handleClose} 
                style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                className="p-3 bg-surface-highlight hover:bg-accent hover:text-accent-fg rounded-2xl transition-transform duration-150 active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="overflow-y-auto p-6 sm:p-8 space-y-10 no-scrollbar overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              
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
                     className="w-full bg-surface-lowest p-4 rounded-xl border border-surface-highlight outline-none text-primary placeholder:text-secondary/40 font-mono text-sm focus:ring-2 focus:ring-accent/50 transition"
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
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-primary">Automatic Background Backup</h4>
                      <p className="text-[11px] text-secondary/70">Sync memories and app config seamlessly to cloud storage</p>
                    </div>
                    <DraggableSwitch
                      checked={settings.autoBackupEnabled ?? true}
                      onChange={(checked) => handleUpdate({ ...settings, autoBackupEnabled: checked })}
                      size="md"
                    />
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
                            style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                            className={`py-2 rounded-xl text-xs font-bold transition-transform duration-150 border active:scale-95 cursor-pointer ${
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

              <section className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] flex items-center gap-3">
                    <Type className="w-4 h-4" /> Typography &amp; Fonts
                  </h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                    Tactile Presets
                  </span>
                </div>

                <div className="bg-surface-highlight/30 p-4 rounded-[1.8rem] border border-surface-highlight/50 space-y-4">
                  {/* Headings Font Compact Card */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Heading &amp; Display</span>
                      <span className="text-[10px] font-mono text-accent font-semibold capitalize">
                        {HEADING_FONTS.find(f => f.id === (settings.headingFontFamily || 'outfit'))?.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {HEADING_FONTS.map(f => {
                        const active = (settings.headingFontFamily || 'outfit') === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleUpdate({ ...settings, headingFontFamily: f.id })}
                            style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                            className={`p-2.5 rounded-xl border text-left transition-transform duration-150 active:scale-95 cursor-pointer ${
                              active
                                ? 'bg-surface border-accent/50 shadow-xs ring-1 ring-accent/20 text-primary'
                                : 'bg-surface/50 hover:bg-surface border-transparent text-secondary'
                            }`}
                          >
                            <div className="text-xs font-bold truncate" style={{ fontFamily: f.sampleFont }}>{f.name}</div>
                            <div className="text-[9px] text-secondary/60 truncate mt-0.5">{f.tag}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-surface-highlight/60" />

                  {/* Body Font Compact Card */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Body &amp; Editor</span>
                      <span className="text-[10px] font-mono text-accent font-semibold capitalize">
                        {BODY_FONTS.find(f => f.id === (settings.fontFamily || 'inter'))?.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {BODY_FONTS.map(f => {
                        const active = (settings.fontFamily || 'inter') === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleUpdate({ ...settings, fontFamily: f.id })}
                            style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                            className={`p-2.5 rounded-xl border text-left transition-transform duration-150 active:scale-95 cursor-pointer ${
                              active
                                ? 'bg-surface border-accent/50 shadow-xs ring-1 ring-accent/20 text-primary'
                                : 'bg-surface/50 hover:bg-surface border-transparent text-secondary'
                            }`}
                          >
                            <div className="text-xs font-bold truncate" style={{ fontFamily: f.sampleFont }}>{f.name}</div>
                            <div className="text-[9px] text-secondary/60 truncate mt-0.5">{f.tag}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-grotesk font-bold text-accent uppercase tracking-[0.3em] flex items-center gap-3">
                    <Cpu className="w-4 h-4" /> AI Model Engine
                  </h3>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-highlight text-accent">
                    {MODELS.find(m => m.id === (settings.model || 'gemini-3.8-flash'))?.badge || 'Active'}
                  </span>
                </div>

                {/* Compact Card for AI Models */}
                <div className="bg-surface-highlight/30 p-3 sm:p-4 rounded-[1.8rem] border border-surface-highlight/50 space-y-2">
                  {MODELS.map((m) => {
                    const isSelected = (settings.model || 'gemini-3.8-flash') === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleUpdate({ ...settings, model: m.id })}
                        style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                        className={`w-full text-left p-3 rounded-2xl border transition-transform duration-150 flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? 'bg-surface border-accent/50 shadow-xs ring-1 ring-accent/20'
                            : 'bg-surface/50 hover:bg-surface border-transparent text-secondary'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-primary' : 'text-primary/90'}`}>
                              {m.label}
                            </span>
                            <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-accent/15 text-accent' : 'bg-surface-highlight text-secondary'
                            }`}>
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary/70 truncate mt-0.5">{m.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-accent bg-accent text-white' : 'border-secondary/40'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
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
                      type="button"
                      onClick={() => handleUpdate({ ...settings, completionAnimation: opt as CompletionAnimation })}
                      style={{ touchAction: 'manipulation', transform: 'translateZ(0)' }}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-transform duration-150 active:scale-95 cursor-pointer ${settings.completionAnimation === opt ? 'bg-surface text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}
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
