import React, { useEffect, useId, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const SparklesCore = (props: {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
}) => {
  const {
    className,
    background = 'transparent',
    minSize = 0.6,
    maxSize = 2.4,
    particleDensity = 40,
    particleColor = 'currentColor',
  } = props;

  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      duration: number;
      delay: number;
    }>
  >([]);

  useEffect(() => {
    // Check if mobile screen to reduce particle load
    const isMobile = window.innerWidth < 768;
    const density = isMobile ? Math.min(particleDensity, 20) : particleDensity;

    const newParticles = Array.from({ length: density }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: Math.random() * 2 + 1.5,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, [particleDensity, minSize, maxSize]);

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden pointer-events-none', className)}
      style={{ background }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: particleColor,
          }}
          animate={{
            opacity: [0, 0.9, 0],
            scale: [0.6, 1.2, 0.6],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export const SparklesText: React.FC<{
  text: string;
  className?: string;
  sparklesCount?: number;
  colors?: { first: string; second: string };
}> = ({
  text,
  className,
  sparklesCount = 6,
  colors = { first: 'var(--color-accent)', second: '#FBBF24' },
}) => {
  return (
    <span className={cn('relative inline-block font-bold', className)}>
      <span className="relative z-10">{text}</span>
      <span className="absolute inset-0 pointer-events-none overflow-visible">
        <SparklesCore
          particleDensity={sparklesCount}
          minSize={1}
          maxSize={3}
          particleColor={colors.first}
          className="absolute inset-0"
        />
      </span>
    </span>
  );
};
