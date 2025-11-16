/**
 * NLQ Chart Components
 *
 * Visualization components optimized for Natural Language Query results.
 * Automatically detect and render the best chart type for your data.
 *
 * @module nlq/charts
 */

export { default as AutoChart } from './AutoChart';
export { default as TrendChart } from './TrendChart';
export { default as ComparisonChart } from './ComparisonChart';
export { default as DistributionChart } from './DistributionChart';
export { default as DataTable } from './DataTable';

export type { AutoChartProps } from './AutoChart';
export type { TrendChartProps } from './TrendChart';
export type { ComparisonChartProps } from './ComparisonChart';
export type { DistributionChartProps } from './DistributionChart';
export type { DataTableProps } from './DataTable';

// Re-export chart detection utilities
export {
  detectChartType,
  validateChartType,
  type ChartType,
  type ChartDetectionResult,
  type ColumnMetadata,
} from '../../../lib/chart-detection';
