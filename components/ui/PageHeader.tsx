import React from 'react';

// One header for every tab: same title scale, same eyebrow, same rule, same rhythm.
export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="mb-6 pb-4 border-b border-surface-highlight/60 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-secondary/70">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
