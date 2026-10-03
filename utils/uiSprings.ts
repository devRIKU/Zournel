import type { Transition, Variants } from 'motion/react';

export const iosSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8
};

export const iosSpringSnappy = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 26,
  mass: 0.6
};

export const iosSpringGentle = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 28,
  mass: 1.0
};

export const mechanicalSpring = {
  type: 'spring' as const,
  stiffness: 550,
  damping: 28,
  mass: 0.5
};

export const tactileEase = [0.32, 0.72, 0, 1] as const;
export const mechanicalSnap = [0.16, 1, 0.3, 1] as const;

/**
 * Shared motion vocabulary: 150–450ms, enter ease-out / exit ease-in,
 * transform + opacity only, bounce scaled to the size of the surface.
 * `MotionConfig` in App.tsx makes these the default for every motion element.
 */
export const DEFAULT_TRANSITION: Transition = { type: 'spring', duration: 0.38, bounce: 0.2 };

/** Pills, toggles, dock, FAB — small surfaces, obvious bounce. */
export const springPlayful: Transition = { type: 'spring', duration: 0.4, bounce: 0.3 };

/** Cards, sections, page swaps — big surfaces must not wobble. */
export const springSoft: Transition = { type: 'spring', duration: 0.42, bounce: 0.12 };

/** Sheets and modals. */
export const springSheet: Transition = { type: 'spring', duration: 0.45, bounce: 0.18 };

/** Press feedback for motion.* buttons. */
export const springPress: Transition = { type: 'spring', duration: 0.3, bounce: 0.45 };

/** Spread onto any motion.button: `<motion.button {...press} />`. */
export const press = {
  whileTap: { scale: 0.94 },
  transition: springPress
} as const;

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } }
};

export const sheet: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSheet },
  exit: { opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.16, ease: 'easeIn' } }
};

export const cardIn: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.14, ease: 'easeIn' } }
};

export const triggerHaptic = (ms: number = 8) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore
    }
  }
};
