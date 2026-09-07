import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '../../utils/uiSprings';

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export const FloatingDock: React.FC<{
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}> = ({ items, desktopClassName, mobileClassName }) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile: React.FC<{
  items: FloatingDockItem[];
  className?: string;
}> = ({ items, className }) => {
  return (
    <div
      className={cn(
        'fixed bottom-5 inset-x-0 z-50 flex items-center justify-center md:hidden pointer-events-auto px-4 pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface/90 backdrop-blur-2xl border border-surface-highlight/70 shadow-2xl shadow-black/10">
        {items.map((item, idx) => (
          <button
            key={item.title + idx}
            onClick={() => {
              triggerHaptic(10);
              item.onClick?.();
            }}
            className={cn(
              'relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1.5 px-2.5 rounded-full transition-all duration-200 select-none active:scale-95',
              item.active
                ? 'text-primary font-semibold'
                : 'text-secondary hover:text-primary opacity-80 hover:opacity-100'
            )}
          >
            {item.active && (
              <motion.div
                layoutId="floating-dock-active-pill"
                className="absolute inset-0 bg-accent/15 border border-accent/25 rounded-full -z-10 shadow-xs"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <div className="flex items-center justify-center w-5 h-5 mb-0.5">
              {item.icon}
            </div>
            <span className="text-[10px] tracking-tight leading-tight whitespace-nowrap">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const FloatingDockDesktop: React.FC<{
  items: FloatingDockItem[];
  className?: string;
}> = ({ items, className }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-end gap-3 px-4 py-2.5 rounded-3xl bg-surface/85 backdrop-blur-2xl border border-surface-highlight/80 shadow-2xl shadow-black/15 pointer-events-auto',
        className
      )}
    >
      {items.map((item, idx) => (
        <IconContainer
          key={item.title + idx}
          mouseX={mouseX}
          {...item}
        />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  onClick,
  active,
}: FloatingDockItem & { mouseX: any }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [44, 60, 44]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [44, 60, 44]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      onClick={() => {
        triggerHaptic(8);
        onClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer select-none"
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 2, x: '-50%' }}
            className="px-2.5 py-1 whitespace-nowrap rounded-md bg-primary text-surface text-xs font-medium absolute left-1/2 -top-9 w-fit shadow-md border border-surface-highlight pointer-events-none z-50"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width, height }}
        className={cn(
          'flex items-center justify-center rounded-2xl transition-colors active:scale-95',
          active
            ? 'bg-accent text-accent-fg shadow-lg shadow-accent/25 ring-2 ring-accent/30'
            : 'bg-surface-highlight/60 text-secondary hover:text-primary hover:bg-surface-highlight'
        )}
      >
        <div className="flex items-center justify-center w-5 h-5">
          {icon}
        </div>
      </motion.div>
    </div>
  );
}
