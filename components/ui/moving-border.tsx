import React from 'react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '../../utils/uiSprings';

export const ShimmerButton: React.FC<{
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  shimmerColor?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}> = ({
  children,
  onClick,
  className,
  shimmerColor = '#ffffff',
  size = 'md',
  disabled = false,
  type = 'button',
  title,
}) => {
  const sizeClasses = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-14 px-8 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        triggerHaptic(10);
        onClick?.(e);
      }}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-2xl p-[1px] font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group shadow-lg shadow-accent/20',
        className
      )}
    >
      {/* Animated gradient beam */}
      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--color-accent)_0%,#F59E0B_50%,var(--color-accent)_100%)] opacity-80 group-hover:opacity-100 transition-opacity" />
      <span
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent text-accent-fg font-semibold backdrop-blur-3xl transition-colors hover:bg-accent/95',
          sizeClasses[size]
        )}
      >
        {children}
      </span>
    </button>
  );
};
