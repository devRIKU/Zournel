import React from 'react';
import { cn } from '@/lib/utils';

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto auto-rows-[auto]',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  children,
  onClick,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'row-span-1 rounded-3xl group/bento hover:shadow-xl transition-all duration-300 shadow-sm border border-surface-highlight/80 bg-surface/90 backdrop-blur-md p-5 sm:p-6 flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.99] transform-gpu',
        className
      )}
    >
      {header && <div className="w-full">{header}</div>}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          {title && (
            <div className="font-display font-bold text-primary text-base sm:text-lg">
              {title}
            </div>
          )}
        </div>
        {description && (
          <div className="text-secondary text-xs sm:text-sm font-normal line-clamp-3">
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
