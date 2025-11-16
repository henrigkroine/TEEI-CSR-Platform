/**
 * Chart Color Palettes for Light and Dark Modes
 *
 * Theme-aware color palettes for Chart.js visualizations.
 * All colors meet WCAG AA contrast requirements for their respective backgrounds.
 */

export interface ChartThemeConfig {
  colors: string[];
  gridColor: string;
  textColor: string;
  tooltipBackground: string;
  tooltipText: string;
  legendTextColor: string;
}

/**
 * Light mode chart configuration
 */
export const LIGHT_CHART_THEME: ChartThemeConfig = {
  colors: [
    '#1E40AF', // Deep blue
    '#047857', // Deep green
    '#B45309', // Dark amber
    '#DC2626', // Dark red
    '#7C3AED', // Purple
    '#DB2777', // Dark pink
    '#0D9488', // Dark teal
    '#EA580C', // Dark orange
    '#4F46E5', // Dark indigo
    '#65A30D', // Dark lime
  ],
  gridColor: 'rgba(107, 114, 128, 0.2)', // Gray-500 with opacity
  textColor: '#374151', // Gray-700
  tooltipBackground: 'rgba(17, 24, 39, 0.9)', // Gray-900 with opacity
  tooltipText: '#F9FAFB', // Gray-50
  legendTextColor: '#374151', // Gray-700
};

/**
 * Dark mode chart configuration
 */
export const DARK_CHART_THEME: ChartThemeConfig = {
  colors: [
    '#3B82F6', // Bright blue
    '#10B981', // Bright green
    '#F59E0B', // Bright amber
    '#EF4444', // Bright red
    '#8B5CF6', // Bright purple
    '#EC4899', // Bright pink
    '#14B8A6', // Bright teal
    '#F97316', // Bright orange
    '#6366F1', // Bright indigo
    '#84CC16', // Bright lime
  ],
  gridColor: 'rgba(148, 163, 184, 0.2)', // Slate-400 with opacity
  textColor: '#E5E7EB', // Gray-200
  tooltipBackground: 'rgba(55, 65, 81, 0.95)', // Gray-700 with opacity
  tooltipText: '#F9FAFB', // Gray-50
  legendTextColor: '#E5E7EB', // Gray-200
};

/**
 * Get chart theme configuration based on current theme
 */
export function getChartTheme(isDark: boolean): ChartThemeConfig {
  return isDark ? DARK_CHART_THEME : LIGHT_CHART_THEME;
}

/**
 * Get a single color from the palette by index
 */
export function getChartColor(index: number, isDark: boolean): string {
  const theme = getChartTheme(isDark);
  return theme.colors[index % theme.colors.length];
}

/**
 * Generate a color array for a dataset
 */
export function generateChartColors(count: number, isDark: boolean): string[] {
  const theme = getChartTheme(isDark);
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    colors.push(theme.colors[i % theme.colors.length]);
  }

  return colors;
}

/**
 * Apply theme-aware defaults to Chart.js options
 */
export function applyChartThemeDefaults(
  options: any,
  isDark: boolean
): any {
  const theme = getChartTheme(isDark);

  return {
    ...options,
    plugins: {
      ...options?.plugins,
      legend: {
        ...options?.plugins?.legend,
        labels: {
          ...options?.plugins?.legend?.labels,
          color: theme.legendTextColor,
        },
      },
      tooltip: {
        ...options?.plugins?.tooltip,
        backgroundColor: theme.tooltipBackground,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        borderColor: theme.gridColor,
        borderWidth: 1,
      },
    },
    scales: options?.scales
      ? Object.fromEntries(
          Object.entries(options.scales).map(([key, scale]: [string, any]) => [
            key,
            {
              ...scale,
              grid: {
                ...scale?.grid,
                color: theme.gridColor,
              },
              ticks: {
                ...scale?.ticks,
                color: theme.textColor,
              },
              title: scale?.title
                ? {
                    ...scale.title,
                    color: theme.textColor,
                  }
                : undefined,
            },
          ])
        )
      : undefined,
  };
}

/**
 * Create theme-aware gradient for chart backgrounds
 */
export function createChartGradient(
  ctx: CanvasRenderingContext2D,
  color: string,
  isDark: boolean
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);

  if (isDark) {
    gradient.addColorStop(0, `${color}40`); // 25% opacity at top
    gradient.addColorStop(1, `${color}00`); // 0% opacity at bottom
  } else {
    gradient.addColorStop(0, `${color}60`); // 38% opacity at top
    gradient.addColorStop(1, `${color}10`); // 6% opacity at bottom
  }

  return gradient;
}

/**
 * Get accessible color pairs for dark mode
 * Returns [background, foreground] that meet WCAG AA
 */
export function getAccessibleColorPair(
  index: number,
  isDark: boolean
): [string, string] {
  const theme = getChartTheme(isDark);
  const backgroundColor = theme.colors[index % theme.colors.length];

  // For dark mode, use dark text on bright backgrounds
  // For light mode, use white text on dark backgrounds
  const textColor = isDark ? '#0F172A' : '#FFFFFF';

  return [backgroundColor, textColor];
}
