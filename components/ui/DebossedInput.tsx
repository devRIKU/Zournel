import React from 'react';

export const DebossedInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-2xl bg-surface-lowest border border-neutral-300/40 dark:border-neutral-800 px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-debossed dark:shadow-debossed-dark ${className}`}
        {...props}
      />
    );
  }
);
DebossedInput.displayName = 'DebossedInput';
