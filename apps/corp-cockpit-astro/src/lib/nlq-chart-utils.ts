/**
 * NLQ Chart Utilities
 *
 * Shared utilities for NLQ chart components including:
 * - Color palettes (color-blind friendly)
 * - Data formatting helpers
 * - Export functionality
 * - Common chart configurations
 *
 * @module nlq-chart-utils
 */

import type { ChartOptions } from 'chart.js';

/**
 * Color-blind friendly palette
 * Based on Paul Tol's color schemes
 * https://personal.sron.nl/~pault/
 */
export const COLOR_PALETTE = {
  // Primary palette (6 colors)
  primary: [
    '#4477AA', // Blue
    '#EE6677', // Red
    '#228833', // Green
    '#CCBB44', // Yellow
    '#66CCEE', // Cyan
    '#AA3377', // Purple
  ],

  // Extended palette (12 colors)
  extended: [
    '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377',
    '#BBBBBB', '#99DDFF', '#44BB99', '#FFAABB', '#EEDD88', '#9988CC',
  ],

  // Sequential palette (for gradients)
  sequential: [
    '#FFFFE5', '#FFF7BC', '#FEE391', '#FEC44F',
    '#FB9A29', '#EC7014', '#CC4C02', '#8C2D04',
  ],

  // Diverging palette (for positive/negative)
  diverging: [
    '#CA0020', '#F4A582', '#FFFFFF', '#92C5DE', '#0571B0',
  ],
} as const;

/**
 * Dark mode compatible color palette
 */
export const DARK_MODE_PALETTE = {
  primary: [
    '#6699CC', '#FF8899', '#44AA55', '#DDCC66', '#88DDFF', '#CC5599',
  ],
  background: '#1F2937',
  text: '#F9FAFB',
  grid: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.2)',
} as const;

/**
 * Get color from palette with optional dark mode
 */
export function getColor(index: number, darkMode: boolean = false): string {
  const palette = darkMode ? DARK_MODE_PALETTE.primary : COLOR_PALETTE.primary;
  return palette[index % palette.length];
}

/**
 * Get multiple colors from palette
 */
export function getColors(count: number, darkMode: boolean = false): string[] {
  const palette = darkMode ? DARK_MODE_PALETTE.primary : COLOR_PALETTE.extended;
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }

  return colors;
}

/**
 * Convert hex to rgba
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Format number with appropriate units
 */
export function formatNumber(
  value: number,
  options?: {
    decimals?: number;
    unit?: string;
    compact?: boolean;
  }
): string {
  const { decimals = 0, unit = '', compact = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${unit}`;
    }
    return `${(value / 1000).toFixed(1)}K${unit}`;
  }

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return unit ? `${formatted}${unit}` : formatted;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  // If value is between 0-1, convert to percentage
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format date for chart labels
 */
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    case 'long':
      return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    default:
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Export chart as PNG
 */
export function exportChartAsPNG(chartElement: HTMLCanvasElement, filename: string): void {
  const url = chartElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = url;
  link.click();
}

/**
 * Export chart as SVG (requires additional library)
 * Placeholder for future implementation
 */
export function exportChartAsSVG(chartElement: HTMLCanvasElement, filename: string): void {
  console.warn('SVG export not yet implemented');
  // TODO: Implement using chart2svg or similar library
}

/**
 * Common responsive chart options
 */
export function getResponsiveOptions(darkMode: boolean = false): Partial<ChartOptions> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: darkMode ? DARK_MODE_PALETTE.text : '#1F2937',
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#F9FAFB' : '#1F2937',
        bodyColor: darkMode ? '#F9FAFB' : '#1F2937',
        borderColor: darkMode ? DARK_MODE_PALETTE.border : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: darkMode ? DARK_MODE_PALETTE.grid : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: darkMode ? DARK_MODE_PALETTE.text : '#6B7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: darkMode ? DARK_MODE_PALETTE.grid : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: darkMode ? DARK_MODE_PALETTE.text : '#6B7280',
          font: {
            size: 11,
          },
        },
      },
    },
  };
}

/**
 * Truncate long labels
 */
export function truncateLabel(label: string, maxLength: number = 20): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3)}...`;
}

/**
 * Calculate chart container height based on data
 */
export function calculateChartHeight(dataPoints: number, chartType: string): number {
  if (chartType === 'pie' || chartType === 'doughnut') {
    return 400;
  }

  if (chartType === 'bar' && dataPoints > 10) {
    // Horizontal bar chart with many items needs more height
    return Math.min(600, 300 + dataPoints * 15);
  }

  // Default height
  return 400;
}

/**
 * Prepare data for Chart.js from generic row data
 */
export function prepareChartData(
  data: any[],
  xColumn: string,
  yColumns: string[],
  darkMode: boolean = false
) {
  const labels = data.map((row) => row[xColumn]);
  const colors = getColors(yColumns.length, darkMode);

  const datasets = yColumns.map((column, index) => ({
    label: column,
    data: data.map((row) => row[column]),
    backgroundColor: hexToRgba(colors[index], 0.7),
    borderColor: colors[index],
    borderWidth: 2,
  }));

  return { labels, datasets };
}

/**
 * Detect if user prefers dark mode
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for dark class on html element (Tailwind approach)
  if (document.documentElement.classList.contains('dark')) {
    return true;
  }

  // Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Add confidence bands to line chart data
 */
export function addConfidenceBands(
  data: number[],
  confidence: number = 0.95
): { upper: number[]; lower: number[] } {
  // Simple implementation using standard deviation
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for 95% confidence interval ≈ 1.96
  const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const margin = zScore * stdDev;

  return {
    upper: data.map((value) => value + margin),
    lower: data.map((value) => value - margin),
  };
}
