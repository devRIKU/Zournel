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

export const triggerHaptic = (ms: number = 8) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore
    }
  }
};
