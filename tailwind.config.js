/** @type {import('tailwindcss').Config} */
const themeColor = (v) => ({ opacityValue }) =>
  opacityValue === undefined ? `var(${v})` : `color-mix(in srgb, var(${v}) calc(${opacityValue} * 100%), transparent)`;
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './store/**/*.ts', './utils/**/*.ts'],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        xs: ['clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem)', { lineHeight: '1rem' }],
        sm: ['clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem)', { lineHeight: '1.25rem' }],
        base: ['clamp(0.9375rem, 0.875rem + 0.3125vw, 1rem)', { lineHeight: '1.5rem' }],
        lg: ['clamp(1.0625rem, 1rem + 0.3125vw, 1.125rem)', { lineHeight: '1.75rem' }],
        xl: ['clamp(1.1875rem, 1.125rem + 0.3125vw, 1.25rem)', { lineHeight: '1.75rem' }],
        '2xl': ['clamp(1.375rem, 1.25rem + 0.625vw, 1.5rem)', { lineHeight: '2rem' }],
        '3xl': ['clamp(1.625rem, 1.5rem + 0.625vw, 1.875rem)', { lineHeight: '2.25rem' }],
        '4xl': ['clamp(2rem, 1.875rem + 1.25vw, 2.5rem)', { lineHeight: '2.5rem' }],
        '5xl': ['clamp(2.5rem, 2.25rem + 1.25vw, 3rem)', { lineHeight: '1.1' }],
        '6xl': ['clamp(3rem, 2.75rem + 1.5vw, 4rem)', { lineHeight: '1.1' }],
        '7xl': ['clamp(3.75rem, 3.25rem + 2vw, 5rem)', { lineHeight: '1.1' }],
        '8xl': ['clamp(4.5rem, 4rem + 2.5vw, 6rem)', { lineHeight: '1.1' }],
        '9xl': ['clamp(5.5rem, 5rem + 3vw, 8rem)', { lineHeight: '1.1' }],
      },
      fontFamily: {
        serif: ['"Newsreader"', '"Playfair Display"', 'serif'],
        sans: ['var(--font-body)', 'Inter', '"Outfit"', 'sans-serif'],
        display: ['var(--font-heading)', 'Outfit', 'Playfair Display', 'sans-serif'],
        
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: themeColor('--color-bg'),
        surface: {
          lowest: themeColor('--surface-lowest'),
          low: themeColor('--surface-low'),
          DEFAULT: themeColor('--surface-default'),
          high: themeColor('--surface-high'),
          highest: themeColor('--surface-highest'),
        },
        'surface-highlight': themeColor('--color-surface-highlight'),
        primary: themeColor('--color-primary'),
        secondary: themeColor('--color-secondary'),
        accent: themeColor('--color-accent'),
        'accent-fg': themeColor('--color-accent-fg'),
        'accent-dim': themeColor('--color-accent-dim'),
      },
      boxShadow: {
        'tactile-card': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.45), 0 2px 4px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.06)',
        'tactile-card-dark': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0,0,0,0.4)',
        'debossed': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'debossed-dark': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(15px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      }
    },
  },
}
