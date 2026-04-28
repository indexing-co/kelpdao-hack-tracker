/**
 * Indexing Co charting library theme.
 *
 * Maps brand tokens (lib/brand.ts) onto the charting library's
 * DesignSystemTheme shape. Pass via <ThemeProvider theme={indexingCoChartTheme}>.
 */

import { createDesignSystemTheme } from '@indexing-co/charts-core';
import { colors, seriesColors } from './brand';

export const indexingCoChartTheme = createDesignSystemTheme({
  name: 'indexing-co',
  mode: 'dark',
  colors: {
    primary: colors.green, // signature accent
    secondary: colors.pink,
    gray: colors.gray,
    positive: colors.success,
    negative: colors.danger,
    warning: colors.warning,
    info: colors.info,
  },
  series: seriesColors,
});
