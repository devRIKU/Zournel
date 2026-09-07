import React, { useRef, useState, useCallback } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

export const CardSpotlight = ({
  children,
  radius = 280,
  color = 'rgba(198, 156, 109, 0.14)',
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const handleMouseMove = useCallback(
    ({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    },
    [mouseX, mouseY]
  );

  const handleTouchMove = useCallback(
    ({ currentTarget, touches }: React.TouchEvent<HTMLDivElement>) => {
      if (touches[0]) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(touches[0].clientX - left);
        mouseY.set(touches[0].clientY - top);
      }
    },
    [mouseX, mouseY]
  );

  const handleLeave = useCallback(() => {
    mouseX.set(-1000);
    mouseY.set(-1000);
  }, [mouseX, mouseY]);

  return (
    <div
      className={cn(
        'group/spotlight p-5 sm:p-6 rounded-3xl relative border border-surface-highlight/80 bg-surface text-primary shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden transform-gpu',
        className
      )}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              ${color},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
