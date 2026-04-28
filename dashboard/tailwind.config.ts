import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0A0A0B',
          900: '#111113',
          800: '#1a1a1d',
          700: '#27272a',
          500: '#71717a',
          300: '#d4d4d8',
          100: '#fafafa',
        },
        accent: {
          DEFAULT: '#22d3ee',
          warn: '#f59e0b',
          danger: '#ef4444',
          ok: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
