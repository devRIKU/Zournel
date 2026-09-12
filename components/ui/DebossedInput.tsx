import React from 'react';

export const DebossedInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-2xl bg-surface-lowest border border-surface-highlight px-4 py-3 text-sm text-primary placeholder:text-secondary/60 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-debossed dark:shadow-debossed-dark ${className}`}
        {...props}
      />
    );
  }
);
DebossedInput.displayName = 'DebossedInput';
