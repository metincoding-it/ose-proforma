/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        'surface-3': v('surface-3'),
        line: v('line'),
        fg: v('fg'),
        muted: v('muted'),
        primary: v('primary'),
        'primary-fg': v('primary-fg'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      opacity: { 8: '0.08', 12: '0.12' },
      boxShadow: {
        glow: '0 0 24px rgb(var(--primary) / 0.35)',
        card: '0 1px 2px rgb(0 0 0 / 0.06), 0 4px 16px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};
