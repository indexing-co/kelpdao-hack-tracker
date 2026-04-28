'use client';

import { ThemeProvider } from '@indexing-co/charts-core';
import { indexingCoChartTheme } from '@/lib/chart-theme';
import type { ReactNode } from 'react';

/**
 * Wraps the dashboard so all charting library components inherit the
 * Indexing Co brand theme. Use at the layout level — every chart inside
 * the tree picks it up via React context.
 */
export function BrandThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={indexingCoChartTheme}>{children}</ThemeProvider>;
}
