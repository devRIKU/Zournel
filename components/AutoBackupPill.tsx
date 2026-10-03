import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudCheck, CloudUpload, RefreshCw, ShieldCheck, Clock, ArrowUpRight } from './Icons';
import { press, springPlayful } from '../utils/uiSprings';

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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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
        type="button"
        {...press}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-1.5 h-11 w-11 lg:w-auto lg:px-3.5 rounded-full border text-xs font-medium transition-colors duration-200 ${
          isBackingUp
            ? 'bg-accent/10 border-accent/40 text-accent'
            : autoBackupEnabled
            ? 'bg-surface/80 border-surface-highlight text-secondary hover:text-primary hover:bg-surface-highlight/60'
            : 'bg-surface/60 border-surface-highlight text-secondary/60'
        }`}
        title="Cloud Auto-Backup Status"
        aria-label="Cloud Auto-Backup Status"
      >
        {isBackingUp ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
            <span className="hidden lg:inline text-xs font-medium text-accent">Syncing…</span>
          </>
        ) : autoBackupEnabled ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CloudCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="hidden lg:inline text-xs font-medium">
              {formattedTime ? `Backed up ${formattedTime}` : 'Backup on'}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-secondary/40 shrink-0"></span>
            <CloudUpload className="w-4 h-4 text-secondary/60 shrink-0 lg:hidden" />
            <span className="hidden lg:inline text-xs font-medium">
              Backup off
            </span>
          </>
        )}
      </motion.button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.94, transition: { duration: 0.14, ease: 'easeIn' } }}
            transition={springPlayful}
            className="absolute right-0 top-full mt-2.5 origin-top-right w-[calc(100vw-1.5rem)] max-w-72 bg-surface/95 backdrop-blur-xl border border-surface-highlight shadow-2xl rounded-2xl p-4 z-[90]"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-highlight/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-semibold text-primary">
                  Cloud Auto-Backup
                </h4>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
