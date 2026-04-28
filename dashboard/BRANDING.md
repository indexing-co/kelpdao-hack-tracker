# Brand enforcement

This dashboard is a public marketing surface for Indexing Co. Brand consistency is required, not optional.

**Brand source of truth**: [indexing.co/assets/brandbook](https://www.indexing.co/assets/brandbook)

## How tokens flow

```
                    indexing.co/assets/brandbook
                              │
                              │  (manually mirrored, update when brand changes)
                              ▼
                       lib/brand.ts   ← single source in code
                       /     |     \
                      /      |      \
       tailwind.config.ts  app/globals.css  lib/chart-theme.ts
              │                │                  │
              ▼                ▼                  ▼
        Tailwind utils    CSS variables    Charts ThemeProvider
       (text-brand-green) (--brand-green)  (KPICard, Sparkline,
                                             all chart series)
```

**One file changes when brand changes**: `lib/brand.ts`. Every other system reads from it.

## What gets enforced

| Surface | Enforced via | Example |
|---|---|---|
| Tailwind utility classes | `tailwind.config.ts` extends colors from `lib/brand.ts` | `text-brand-green`, `bg-ink-900`, `rounded-card`, `rounded-pill` |
| CSS custom properties | `app/globals.css` `:root` block | `var(--brand-green)`, used by `.btn-brand` |
| Charting library theme | `lib/chart-theme.ts` → `<ThemeProvider>` in `app/layout.tsx` | All `KPICard`, `Sparkline`, `Chart` series colors |
| Inline component styles | Import from `lib/brand.ts` directly | `KPICard styles={{ value: { color: colors.ink100 } }}` |

## Charting library specifically

The library uses a `ThemeProvider` (React context) that every chart component reads from. Two layers of brand enforcement:

1. **The `<ThemeProvider theme={indexingCoChartTheme}>`** in `app/layout.tsx` (via `BrandThemeProvider`) — sets the global series palette, semantic colors (positive/negative/warning), and dark mode.
2. **Per-component `styles` prop** — for cases where a single chart needs to override (e.g. monospace numerics on a KPI value), pass tokens from `lib/brand.ts` directly. Never hard-code hex.

## Banned in code

- Hard-coded hex colors (use `colors.green` from `lib/brand.ts` or a Tailwind utility).
- `text-cyan-*`, `text-blue-*` etc. for accents — only `text-brand-green` is the accent.
- Tailwind defaults like `rounded-md`, `rounded-lg` for cards/buttons. Use `rounded-card` (8px) and `rounded-pill` (100px).
- Any font that isn't Inter (body) or Fira Code (code).

## CTA pattern

Every primary CTA on the dashboard uses the `.btn-brand` class:

```tsx
<a href="https://indexing.co/contact" className="btn-brand inline-block px-6 py-2.5">
  Contact us →
</a>
```

This applies: brand green background, ink-950 text, pill border-radius (100px), opacity-0.8 hover. Per the brandbook's button spec.

## When the brand changes

1. Re-fetch the brandbook from `indexing.co/assets/brandbook`.
2. Update `lib/brand.ts` to match the new tokens.
3. Run `pnpm build` — TypeScript will flag any direct hex usage that drifted.
4. Visually verify the dashboard hasn't broken (especially WCAG: brand green requires dark backgrounds).

## Accessibility note

The brand green (`#4AF120`) only meets WCAG AA contrast on **dark backgrounds** (~13.9:1 on black, ~1.5:1 on white). The dashboard is dark-only by design. Don't introduce a light theme without a contrast plan.
