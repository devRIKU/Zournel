import React from 'react';
import { cn } from '@/lib/utils';

export const DotBackground: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-surface-lowest text-primary [background-size:24px_24px] [background-image:radial-gradient(var(--color-primary)_1px,transparent_1px)] [background-position:0_0] opacity-95',
        className
      )}
    >
      {/* Radial vignette mask for subtle falloff */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-lowest [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const GridBackground: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-surface-lowest text-primary [background-size:32px_32px] [background-image:linear-gradient(to_right,rgba(120,108,96,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,108,96,0.06)_1px,transparent_1px)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-surface-lowest [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const SpotlightGlow: React.FC<{
  className?: string;
  fill?: string;
}> = ({ className, fill = 'rgba(198, 156, 109, 0.15)' }) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] sm:w-[900px] sm:h-[450px] rounded-full blur-3xl opacity-60 transform-gpu',
        className
      )}
      style={{
        background: `radial-gradient(circle, ${fill} 0%, transparent 70%)`,
      }}
    />
  );
};
