import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, Settings, LogOut } from './Icons';
import { UserProfile } from '../types';
import { press, springPlayful, springPress, triggerHaptic } from '../utils/uiSprings';

interface AccountMenuProps {
  profile?: UserProfile;
  googleUser: { displayName?: string | null; email?: string | null } | null;
  isActive: boolean;
  onOpenAccount: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const itemIn = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: springPlayful }
};

// Grows out of the avatar, then drops its rows in.
const menuIn = {
  hidden: { opacity: 0, scale: 0.94, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { ...springPlayful, staggerChildren: 0.035, delayChildren: 0.02 } },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.14, ease: 'easeIn' } }
};

/**
 * The single entry point for everything account-related: the page, settings
 * and sign-out live here so the top bar and the dock never fight over it.
 */
export const AccountMenu: React.FC<AccountMenuProps> = ({
  profile,
  googleUser,
  isActive,
  onOpenAccount,
  onOpenSettings,
  onSignOut
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const run = (fn: () => void) => () => {
    triggerHaptic(8);
    setIsOpen(false);
    fn();
  };

  const name = profile?.name || googleUser?.displayName || '';

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <motion.button
        type="button"
        {...press}
        onClick={() => { triggerHaptic(8); setIsOpen(v => !v); }}
        title={name || 'Account & Settings'}
        aria-label={name || 'Account & Settings'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors overflow-hidden shrink-0 ${
          isActive || isOpen
            ? 'border-accent ring-2 ring-accent/25 bg-accent/15 text-accent'
            : 'border-surface-highlight bg-surface/80 text-secondary hover:text-primary hover:bg-surface-highlight/60'
        }`}
      >
        {profile?.picture ? (
          <img src={profile.picture} alt={name || 'Account'} className="w-full h-full object-cover" />
        ) : name ? (
          <span className="text-sm font-bold text-primary uppercase">{name.charAt(0)}</span>
        ) : (
          <User className="w-5 h-5" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            variants={menuIn}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="absolute right-0 top-full mt-2.5 w-[calc(100vw-1.5rem)] max-w-[15rem] sm:w-60 origin-top-right bg-surface/95 backdrop-blur-xl border border-surface-highlight shadow-2xl rounded-2xl p-2 z-50"
          >
            <div className="px-3 py-2.5 mb-1 border-b border-surface-highlight/60 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{name || 'Guest journaler'}</p>
              <p className="text-[11px] font-mono text-secondary truncate">
                {googleUser?.email || (profile?.username ? `@${profile.username}` : 'Local device key')}
              </p>
            </div>

            <motion.button
              type="button"
              role="menuitem"
              variants={itemIn}
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={run(onOpenAccount)}
              className="w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-primary hover:bg-surface-highlight/60 transition-colors text-left"
            >
              <User className="w-4 h-4 text-accent shrink-0" weight={isActive ? 'fill' : 'regular'} />
              <span>Account</span>
            </motion.button>

            <motion.button
              type="button"
              role="menuitem"
              variants={itemIn}
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={run(onOpenSettings)}
              className="w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-primary hover:bg-surface-highlight/60 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-secondary shrink-0" />
              <span>Settings</span>
            </motion.button>

            {googleUser && (
              <motion.button
                type="button"
                role="menuitem"
                variants={itemIn}
                whileTap={{ scale: 0.97, transition: springPress }}
                onClick={run(onSignOut)}
                className="w-full h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
