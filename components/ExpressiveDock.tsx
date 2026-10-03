import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckSquare } from './Icons';
import { Tab } from '../types';
import { springPlayful, springPress, triggerHaptic } from '../utils/uiSprings';

const ITEMS: { tab: Tab; label: string; Icon: typeof BookOpen }[] = [
  { tab: Tab.TODO, label: 'Tasks', Icon: CheckSquare },
  { tab: Tab.JOURNAL, label: 'Journal', Icon: BookOpen },
];

// One dock for every breakpoint: same pill, same item, same active state.
// Account lives in the top-bar avatar menu so there is only ever one door into it.
export const ExpressiveDock: React.FC<{ activeTab: Tab; onTabChange: (tab: Tab) => void }> = ({ activeTab, onTabChange }) => (
  <nav
    aria-label="Primary"
    className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-6 pointer-events-none"
  >
    <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-surface/90 backdrop-blur-xl border border-surface-highlight/70 shadow-lg shadow-black/5">
      {ITEMS.map(({ tab, label, Icon }) => {
        const active = activeTab === tab;
        return (
          <motion.button
            key={tab}
            type="button"
            aria-current={active ? 'page' : undefined}
            whileTap={{ scale: 0.92, transition: springPress }}
            onClick={() => { triggerHaptic(8); onTabChange(tab); }}
            className={`relative flex items-center gap-2 h-12 px-5 sm:px-6 rounded-full text-sm font-medium transition-colors duration-200 select-none ${
              active ? 'text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                className="absolute inset-0 rounded-full bg-accent/12 border border-accent/20"
                transition={springPlayful}
              />
            )}
            <motion.span
              animate={{ scale: active ? 1.15 : 1, y: active ? -1 : 0 }}
              transition={springPlayful}
              className="relative flex"
            >
              <Icon className="w-5 h-5" weight={active ? 'fill' : 'regular'} />
            </motion.span>
            <span className="relative">{label}</span>
          </motion.button>
        );
      })}
    </div>
  </nav>
);
