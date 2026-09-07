import React from 'react';
import { motion } from 'motion/react';

export const TactileCheckbox: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${
        checked
          ? 'bg-amber-600 border-amber-600 shadow-sm'
          : 'bg-surface-lowest border-neutral-400/50 dark:border-neutral-600 shadow-inner'
      }`}
    >
      <motion.svg
        viewBox="0 0 14 14"
        className="w-3.5 h-3.5 text-white stroke-current stroke-2 fill-none"
        initial={false}
        animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <motion.path
          d="M2.5 7.5L5.5 10.5L11.5 3.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </motion.svg>
    </button>
  );
};
