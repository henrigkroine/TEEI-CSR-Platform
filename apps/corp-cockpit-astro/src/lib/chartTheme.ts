/**
 * TEEI Corporate Cockpit — Premium Chart Theme
 * 
 * Centralized chart styling for world-class data visualization.
 * Designed for Recharts with teal primary + gold accent color system.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const chartColors = {
  // Primary series colors (teal spectrum)
  primary: '#0a5961',
  primaryLight: '#0f7a85',
  primaryDark: '#00393f',
  
  // Accent/highlight colors (gold spectrum)
  accent: '#BA8F5A',
  accentLight: '#d4a96e',
  accentDark: '#9a7548',
  
  // Status colors
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  
  // Neutral palette
  grid: '#e2e8f0',
  gridDark: '#334155',
  axis: '#94a3b8',
  axisDark: '#64748b',
  text: '#475569',
  textDark: '#cbd5e1',
  textMuted: '#94a3b8',
  
  // Background for tooltips/legends
  surface: '#ffffff',
  surfaceDark: '#1e293b',
  
  // Gradient stops
  gradientStart: 'rgba(10, 89, 97, 0.25)',
  gradientEnd: 'rgba(10, 89, 97, 0)',
  accentGradientStart: 'rgba(186, 143, 90, 0.25)',
  accentGradientEnd: 'rgba(186, 143, 90, 0)',
};

// Series colors for multiple data series
export const seriesColors = [
  chartColors.primary,
  chartColors.accent,
  chartColors.success,
  chartColors.info,
  chartColors.warning,
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal-light
];

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const chartTypography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  
  // Axis labels
  axisLabel: {
    fontSize: 11,
    fontWeight: 500,
    fill: chartColors.text,
  },
  
  // Tick labels
  tickLabel: {
    fontSize: 10,
    fontWeight: 400,
    fill: chartColors.textMuted,
  },
  
  // Legend
  legend: {
    fontSize: 12,
    fontWeight: 500,
  },
  
  // Tooltip
  tooltip: {
    titleSize: 13,
    titleWeight: 600,
    valueSize: 14,
    valueWeight: 700,
    labelSize: 12,
    labelWeight: 400,
  },
};

// =============================================================================
// SPACING & SIZING
// =============================================================================

export const chartSpacing = {
  // Chart margins
  margin: {
    top: 20,
    right: 30,
    bottom: 30,
    left: 40,
  },
  
  // Compact margins for small charts
  marginCompact: {
    top: 10,
    right: 10,
    bottom: 20,
    left: 30,
  },
  
  // Dot/point sizes
  dotRadius: 4,
  dotRadiusHover: 6,
  dotRadiusSmall: 3,
  
  // Line widths
  lineWidth: 2.5,
  lineWidthThin: 1.5,
  lineWidthThick: 3,
  
  // Grid
  gridStrokeDasharray: '3 3',
  
  // Bar chart
  barRadius: [6, 6, 0, 0],
  barGap: 4,
  barCategoryGap: '20%',
};

// =============================================================================
// ANIMATION
// =============================================================================

export const chartAnimation = {
  // Entry animations
  duration: 800,
  durationFast: 400,
  durationSlow: 1200,
  
  // Easing functions
  easing: 'ease-out',
  easingSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // Stagger delay for multiple series
  staggerDelay: 100,
  
  // Hover transitions (applied via CSS)
  hoverDuration: 150,
};

// =============================================================================
// TOOLTIP STYLES
// =============================================================================

export const tooltipStyle = {
  backgroundColor: chartColors.surface,
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 4px 24px rgba(0, 57, 63, 0.15), 0 0 0 1px rgba(0, 57, 63, 0.05)',
  padding: '12px 16px',
  
  // Dark mode
  dark: {
    backgroundColor: chartColors.surfaceDark,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  },
};

export const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: tooltipStyle.backgroundColor,
  border: tooltipStyle.border,
  borderRadius: tooltipStyle.borderRadius,
  boxShadow: tooltipStyle.boxShadow,
  padding: tooltipStyle.padding,
};

export const tooltipLabelStyle: React.CSSProperties = {
  color: chartColors.text,
  fontSize: chartTypography.tooltip.titleSize,
  fontWeight: chartTypography.tooltip.titleWeight,
  marginBottom: 8,
};

export const tooltipItemStyle: React.CSSProperties = {
  color: chartColors.text,
  fontSize: chartTypography.tooltip.labelSize,
  fontWeight: chartTypography.tooltip.labelWeight,
  padding: '4px 0',
};

// =============================================================================
// LEGEND STYLES
// =============================================================================

export const legendStyle = {
  wrapperStyle: {
    paddingTop: 16,
  },
  
  itemStyle: {
    color: chartColors.text,
    fontSize: chartTypography.legend.fontSize,
    fontWeight: chartTypography.legend.fontWeight,
    cursor: 'pointer',
  },
  
  iconSize: 12,
  iconType: 'circle' as const,
};

// =============================================================================
// AXIS CONFIGURATION
// =============================================================================

export const xAxisConfig = {
  axisLine: { stroke: chartColors.grid, strokeWidth: 1 },
  tickLine: false,
  tick: {
    fill: chartColors.textMuted,
    fontSize: chartTypography.tickLabel.fontSize,
  },
  dy: 10,
};

export const yAxisConfig = {
  axisLine: false,
  tickLine: false,
  tick: {
    fill: chartColors.textMuted,
    fontSize: chartTypography.tickLabel.fontSize,
  },
  dx: -10,
  width: 50,
};

export const gridConfig = {
  stroke: chartColors.grid,
  strokeDasharray: chartSpacing.gridStrokeDasharray,
  vertical: false,
};

// =============================================================================
// REFERENCE LINE THRESHOLDS
// =============================================================================

export const thresholdLines = {
  excellent: { value: 80, color: chartColors.success, label: 'Excellent' },
  good: { value: 65, color: chartColors.accent, label: 'Good' },
  baseline: { value: 50, color: chartColors.textMuted, label: 'Baseline' },
};

export const referenceLineStyle = {
  stroke: chartColors.accent,
  strokeWidth: 1,
  strokeDasharray: '6 4',
  opacity: 0.6,
};

export const referenceLabelStyle = {
  fill: chartColors.textMuted,
  fontSize: 10,
  fontWeight: 500,
};

// =============================================================================
// GRADIENT DEFINITIONS
// =============================================================================

export const createGradientDef = (id: string, color: string, opacity = 0.25) => ({
  id,
  x1: '0',
  y1: '0',
  x2: '0',
  y2: '1',
  stops: [
    { offset: '0%', stopColor: color, stopOpacity: opacity },
    { offset: '100%', stopColor: color, stopOpacity: 0 },
  ],
});

export const gradientDefs = {
  primary: createGradientDef('primaryGradient', chartColors.primary, 0.25),
  accent: createGradientDef('accentGradient', chartColors.accent, 0.25),
  success: createGradientDef('successGradient', chartColors.success, 0.2),
  warning: createGradientDef('warningGradient', chartColors.warning, 0.2),
  error: createGradientDef('errorGradient', chartColors.error, 0.2),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get color for a specific series index
 */
export function getSeriesColor(index: number): string {
  return seriesColors[index % seriesColors.length];
}

/**
 * Format number for chart display
 */
export function formatChartValue(value: number, options?: {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}): string {
  const { decimals = 0, prefix = '', suffix = '', compact = false } = options || {};
  
  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return `${prefix}${formatter.format(value)}${suffix}`;
  }
  
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  return `${prefix}${formatted}${suffix}`;
}

/**
 * Format percentage for chart display
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency for chart display
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Get status color based on value against thresholds
 */
export function getStatusColor(value: number): string {
  if (value >= thresholdLines.excellent.value) return chartColors.success;
  if (value >= thresholdLines.good.value) return chartColors.accent;
  if (value >= thresholdLines.baseline.value) return chartColors.warning;
  return chartColors.error;
}

/**
 * Calculate tick values for nice axis formatting
 */
export function getNiceTicks(min: number, max: number, count = 5): number[] {
  const range = max - min;
  const step = range / (count - 1);
  const ticks: number[] = [];
  
  for (let i = 0; i < count; i++) {
    ticks.push(Math.round(min + step * i));
  }
  
  return ticks;
}

// =============================================================================
// DARK MODE HELPERS
// =============================================================================

export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );
}

export function getThemedColor(lightColor: string, darkColor: string): string {
  return isDarkMode() ? darkColor : lightColor;
}

export function getThemedTooltipStyle(): React.CSSProperties {
  const dark = isDarkMode();
  return {
    backgroundColor: dark ? tooltipStyle.dark.backgroundColor : tooltipStyle.backgroundColor,
    boxShadow: dark ? tooltipStyle.dark.boxShadow : tooltipStyle.boxShadow,
    border: tooltipStyle.border,
    borderRadius: tooltipStyle.borderRadius,
    padding: tooltipStyle.padding,
  };
}



