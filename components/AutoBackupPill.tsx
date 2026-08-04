import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudCheck, CloudUpload, RefreshCw, ShieldCheck, Clock, ArrowUpRight } from 'lucide-react';

interface AutoBackupPillProps {
  isBackingUp: boolean;
  lastBackupTime: number | null;
  autoBackupEnabled: boolean;
  onManualBackup: () => Promise<void>;
  onOpenSettings?: () => void;
}

export const AutoBackupPill: React.FC<AutoBackupPillProps> = ({
  isBackingUp,
  lastBackupTime,
  autoBackupEnabled,
  onManualBackup,
  onOpenSettings
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justBackedUp, setJustBackedUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualClick = async () => {
    await onManualBackup();
    setJustBackedUp(true);
    setTimeout(() => setJustBackedUp(false), 3500);
  };

  const formattedTime = lastBackupTime
    ? new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border text-xs font-medium transition-all duration-300 shadow-xs ${
          isBackingUp
            ? 'bg-accent/10 border-accent/40 text-accent'
            : autoBackupEnabled
            ? 'bg-surface border-surface-highlight/70 text-secondary hover:text-primary hover:border-accent/30'
            : 'bg-surface-highlight/30 border-surface-highlight/50 text-secondary/60'
        }`}
        title="Cloud Auto-Backup Status"
      >
        {isBackingUp ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
            <span className="hidden md:inline font-grotesk text-[11px] font-bold uppercase tracking-wider text-accent">
              Syncing...
            </span>
          </>
        ) : autoBackupEnabled ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CloudCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden md:inline font-sans text-xs font-semibold text-secondary">
              {formattedTime ? `Auto-backed up ${formattedTime}` : 'Auto-Backup Active'}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-secondary/40 shrink-0"></span>
            <span className="hidden md:inline font-sans text-xs text-secondary/70">
              Auto-Backup Off
            </span>
          </>
        )}
      </motion.button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-2 w-72 bg-surface border border-surface-highlight shadow-2xl rounded-2xl p-4 z-50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-highlight/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-grotesk">
                  Cloud Auto-Backup
                </h4>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                autoBackupEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-surface-highlight text-secondary'
              }`}>
                {autoBackupEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-2.5 mb-4 text-xs text-secondary">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 opacity-80">
                  <Clock className="w-3.5 h-3.5 text-accent" /> Last Cloud Sync:
                </span>
                <span className="font-semibold text-primary font-mono">
                  {formattedTime ? formattedTime : 'Not synced yet'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-80">Backup Mode:</span>
                <span className="font-medium text-primary">Cloud Firestore + Snapshot</span>
              </div>

              <p className="text-[10px] text-secondary/70 leading-relaxed bg-surface-highlight/30 p-2.5 rounded-xl border border-surface-highlight/40">
                {autoBackupEnabled 
                  ? 'Your journal memories and preferences are automatically synced to cloud storage when updated.'
                  : 'Automatic background syncing is paused. You can trigger a manual backup anytime.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleManualClick}
                disabled={isBackingUp}
                className="flex-1 py-2 px-3 bg-accent text-accent-fg font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.97] transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isBackingUp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : justBackedUp ? (
                  <CloudCheck className="w-3.5 h-3.5" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>{isBackingUp ? 'Syncing...' : justBackedUp ? 'Backed up!' : 'Backup Now'}</span>
              </button>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onOpenSettings(); }}
                  className="py-2 px-3 bg-surface-highlight text-secondary hover:text-primary font-semibold text-xs rounded-xl hover:bg-surface-highlight/80 transition flex items-center justify-center gap-1"
                  title="Configure Backup Settings"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
