import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckSquare, User } from './Icons';
import { Tab } from '../types';
import { triggerHaptic } from '../utils/uiSprings';

const ITEMS: { tab: Tab; label: string; Icon: typeof BookOpen }[] = [
  { tab: Tab.TODO, label: 'Tasks', Icon: CheckSquare },
  { tab: Tab.JOURNAL, label: 'Journal', Icon: BookOpen },
  { tab: Tab.PROFILE, label: 'Account', Icon: User },
];

// One dock for every breakpoint: same pill, same item, same active state.
export const ExpressiveDock: React.FC<{ activeTab: Tab; onTabChange: (tab: Tab) => void }> = ({ activeTab, onTabChange }) => (
  <nav
    aria-label="Primary"
    className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-6 pointer-events-none"
  >
    <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-surface/90 backdrop-blur-xl border border-surface-highlight/70 shadow-lg shadow-black/5">
      {ITEMS.map(({ tab, label, Icon }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => { triggerHaptic(8); onTabChange(tab); }}
            className={`relative flex items-center gap-2 h-11 px-4 sm:px-5 rounded-full text-sm font-medium transition-colors duration-200 active:scale-95 select-none ${
              active ? 'text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                className="absolute inset-0 rounded-full bg-accent/12 border border-accent/20"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className="relative w-5 h-5" weight={active ? 'fill' : 'regular'} />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
