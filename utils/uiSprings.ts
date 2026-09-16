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

export const triggerHaptic = (ms: number = 8) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore
    }
  }
};
