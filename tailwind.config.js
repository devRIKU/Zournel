/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Newsreader"', '"Playfair Display"', 'serif'],
        sans: ['"Inter"', '"Outfit"', 'sans-serif'],
      },
      colors: {
        surface: {
          lowest: 'var(--surface-lowest)',
          low: 'var(--surface-low)',
          DEFAULT: 'var(--surface-default)',
          high: 'var(--surface-high)',
          highest: 'var(--surface-highest)',
        },
      },
      boxShadow: {
        // Multi-layered skeuomorphic card shadow with specular top rim
        'tactile-card': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.45), 0 2px 4px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.06)',
        'tactile-card-dark': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0,0,0,0.4)',
        // Carved/debossed inset shadow for text inputs
        'debossed': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'debossed-dark': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
