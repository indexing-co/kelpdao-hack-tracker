/**
 * Indexing Co brand tokens — single source of truth.
 *
 * Source: https://www.indexing.co/assets/brandbook
 *
 * These tokens are consumed by:
 *   - tailwind.config.ts (Tailwind utility classes)
 *   - lib/chart-theme.ts (charting library ThemeProvider)
 *   - direct imports in component styles (e.g. inline KPICard `styles` prop)
 *
 * Update this file when the brandbook changes; everything else inherits.
 */

export const colors = {
  // Primary
  black: '#000000',
  white: '#FFFFFF',
  green: '#4AF120', // Indexing green — the signature accent. WCAG AA only on dark.
  pink: '#DD67AB',

  // Neutrals
  gray: '#8E8E93',
  whiteSmoke: '#EDEDED',
  gray2: '#A3A3B2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',

  // Semantic — derived. Brand only specifies green for "active/primary".
  // Use these consistently for status states across the dashboard.
  success: '#4AF120', // brand green
  warning: '#DD67AB', // brand pink (used for attention, not danger)
  danger: '#FF3B30', // semantic red — not in brandbook, kept minimal
  info: '#8E8E93', // brand gray for neutral states

  // Surfaces (dark mode — required for green WCAG compliance)
  ink950: '#000000', // pure black, primary surface
  ink900: '#0A0A0B', // near-black, card surface
  ink800: '#1a1a1d', // borders on dark
  ink700: '#27272a',
  ink500: '#8E8E93', // brand gray
  ink300: '#C7C7CC', // gray3
  ink100: '#FFFFFF',
} as const;

export const typography = {
  family: {
    primary: 'Inter, system-ui, sans-serif',
    code: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  scale: {
    jumbo: { size: '60px', weight: 300, lineHeight: '110%' },
    display: { size: '48px', weight: 400, lineHeight: '110%' },
    headline: { size: '28px', weight: 500, lineHeight: '120%' },
    subhead: { size: '24px', weight: 400, lineHeight: '130%' },
    bodyLarge: { size: '18px', weight: 400, lineHeight: '140%' },
    body: { size: '16px', weight: 400, lineHeight: '150%' },
    caption: { size: '14px', weight: 400, lineHeight: '140%' },
    code: { size: '16px', weight: 500, lineHeight: '110%' },
  },
} as const;

export const spacing = {
  section: '64px',
  large: '40px',
  card: '24px',
  cardGap: '16px',
  small: '10px',
} as const;

export const radius = {
  card: '8px',
  pill: '100px', // buttons + toggles
} as const;

/**
 * Chart series colors — derived from the brand palette plus harmonious
 * extensions. Keep first 4 strictly brand. Series 5+ are extensions chosen
 * to harmonize on the dark surface.
 */
export const seriesColors = [
  colors.green, // 1 — Indexing green (primary)
  colors.pink, // 2 — brand pink
  colors.whiteSmoke, // 3 — neutral light
  colors.gray2, // 4 — gray
  '#7DEAFF', // 5 — soft cyan, extension
  '#FFB46B', // 6 — soft orange, extension
  '#A56BFF', // 7 — purple, extension
  '#5BFFB0', // 8 — mint, extension
];
