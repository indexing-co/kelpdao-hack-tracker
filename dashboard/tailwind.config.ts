import type { Config } from 'tailwindcss';
import { colors, typography, radius } from './lib/brand';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: typography.family.primary.split(',').map((s) => s.trim().replace(/['"]/g, '')),
        mono: typography.family.code.split(',').map((s) => s.trim().replace(/['"]/g, '')),
      },
      colors: {
        // Brand primaries
        brand: {
          green: colors.green,
          pink: colors.pink,
          gray: colors.gray,
          whiteSmoke: colors.whiteSmoke,
        },
        // Neutral scale (named by surface intent so component code reads cleanly)
        ink: {
          950: colors.ink950,
          900: colors.ink900,
          800: colors.ink800,
          700: colors.ink700,
          500: colors.ink500,
          300: colors.ink300,
          100: colors.ink100,
        },
        // Status — used sparingly; brand only specifies green as semantic active
        accent: {
          DEFAULT: colors.green,
          warn: colors.warning,
          danger: colors.danger,
          ok: colors.success,
        },
      },
      borderRadius: {
        card: radius.card, // 8px
        pill: radius.pill, // 100px
      },
    },
  },
  plugins: [],
};

export default config;
