import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface DraggableSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const DraggableSwitch: React.FC<DraggableSwitchProps> = ({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
}) => {
  const isSm = size === 'sm';
  const trackWidth = isSm ? 44 : 54;
  const trackHeight = isSm ? 24 : 30;
  const knobSize = isSm ? 18 : 24;
  const padding = 3;
  const maxDrag = trackWidth - knobSize - padding * 2;

  const x = useMotionValue(checked ? maxDrag : 0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    animate(x, checked ? maxDrag : 0, {
      type: 'spring',
      stiffness: 500,
      damping: 32,
    });
  }, [checked, maxDrag]);

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    const currentX = x.get();
    const shouldCheck = currentX > maxDrag / 2 || info.velocity.x > 80;
    if (shouldCheck !== checked) {
      onChange(shouldCheck);
    } else {
      animate(x, checked ? maxDrag : 0, {
        type: 'spring',
        stiffness: 500,
        damping: 32,
      });
    }
  };

  const handleClick = () => {
    if (disabled || isDragging) return;
    onChange(!checked);
  };

  return (
    <div
      className={`inline-flex items-center gap-2 select-none cursor-pointer ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div
        className={`relative rounded-full transition-colors duration-200 border ${
          checked
            ? 'bg-accent border-accent text-accent-fg'
            : 'bg-surface-highlight/70 border-surface-highlight text-secondary'
        }`}
        style={{
          width: trackWidth,
          height: trackHeight,
          padding,
        }}
      >
        <motion.div
          drag={disabled ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={`rounded-full bg-surface shadow-md border border-black/5 dark:border-white/10 cursor-grab active:cursor-grabbing flex items-center justify-center`}
          style={{
            x,
            width: knobSize,
            height: knobSize,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
        </motion.div>
      </div>
      {label && <span className="text-xs font-medium text-primary">{label}</span>}
    </div>
  );
};

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface DraggableSegmentedToggleProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export const DraggableSegmentedToggle = <T extends string = string>({
  options,
  value,
  onChange,
  className = '',
}: DraggableSegmentedToggleProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center bg-surface-highlight/40 p-1 rounded-2xl border border-surface-highlight/30 shadow-inner select-none ${className}`}
    >
      {options.map((option, idx) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors duration-200 z-10 touch-manipulation cursor-pointer ${
              isSelected ? 'text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="draggableSegmentPill"
                drag="x"
                dragConstraints={containerRef}
                dragElastic={0.12}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 35 && selectedIndex < options.length - 1) {
                    onChange(options[selectedIndex + 1].value);
                  } else if (info.offset.x < -35 && selectedIndex > 0) {
                    onChange(options[selectedIndex - 1].value);
                  }
                }}
                className="absolute inset-0 bg-surface rounded-xl shadow-md border border-accent/15 -z-10 cursor-grab active:cursor-grabbing"
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              />
            )}
            {option.icon}
            <span className="text-[11px] sm:text-xs">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
