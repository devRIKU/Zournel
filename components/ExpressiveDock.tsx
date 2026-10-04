import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckSquare } from './Icons';
import { Tab } from '../types';
import { springPlayful, springPress, triggerHaptic } from '../utils/uiSprings';

const ITEMS: { tab: Tab; label: string; Icon: typeof BookOpen }[] = [
  { tab: Tab.TODO, label: 'Tasks', Icon: CheckSquare },
  { tab: Tab.JOURNAL, label: 'Journal', Icon: BookOpen },
];

/**
 * Native-feeling tab navigation on touch screens; a compact floating dock on desktop.
 * The bottom safe-area is part of the material surface, so it never crowds the content.
 */
export const ExpressiveDock: React.FC<{ activeTab: Tab; onTabChange: (tab: Tab) => void }> = ({ activeTab, onTabChange }) => (
  <nav
    aria-label="Primary"
    className="fixed inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-5"
  >
    <div className="pointer-events-auto flex w-full max-w-lg items-stretch gap-1 border-t border-surface-highlight/70 bg-surface/90 px-3 pt-1 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-2xl sm:w-auto sm:max-w-none sm:items-center sm:gap-1.5 sm:rounded-full sm:border sm:border-surface-highlight/70 sm:bg-surface/90 sm:p-1.5 sm:shadow-lg sm:shadow-black/5">
      {ITEMS.map(({ tab, label, Icon }) => {
        const active = activeTab === tab;
        return (
          <motion.button
            key={tab}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            whileTap={{ scale: 0.94, transition: springPress }}
            onClick={() => { triggerHaptic(8); onTabChange(tab); }}
            className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 text-[11px] font-medium transition-colors duration-200 select-none sm:min-h-11 sm:flex-row sm:flex-none sm:gap-2 sm:rounded-full sm:px-6 sm:text-sm ${
              active ? 'text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                className="absolute inset-x-1 top-1 bottom-1 rounded-2xl bg-accent/[0.08] sm:inset-0 sm:rounded-full sm:border sm:border-accent/20 sm:bg-accent/12"
                transition={springPlayful}
              />
            )}
            <motion.span
              animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
              transition={springPlayful}
              className="relative flex"
            >
              <Icon className="h-[21px] w-[21px]" weight={active ? 'fill' : 'regular'} />
            </motion.span>
            <span className="relative leading-none">{label}</span>
          </motion.button>
        );
      })}
    </div>
  </nav>
);
