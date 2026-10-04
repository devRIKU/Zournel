import React from 'react';
import { motion } from 'motion/react';
import { springSoft } from '../../utils/uiSprings';

/** A large, quiet page title with an independently scrollable action row on mobile. */
export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0, transition: { ...springSoft, delay: 0.04 } }}
    className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
  >
    <div className="min-w-0">
      <h2 className="text-[32px] sm:text-4xl font-semibold text-primary tracking-[-0.04em] leading-[1.08]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-sm text-secondary/80">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex max-w-full items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:overflow-visible sm:pb-0">
        {actions}
      </div>
    )}
  </motion.div>
);
