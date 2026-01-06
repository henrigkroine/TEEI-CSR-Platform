/**
 * Chart Renderer Service
 *
 * Server-side chart rendering for PDF exports
 * Converts chart data to base64-encoded PNG images
 *
 * @module chartRenderer
 */
import type { ChartData } from '../types';
/**
 * Render chart to base64-encoded PNG
 * Uses Playwright to screenshot a chart component
 */
export declare function renderChartToBase64(chart: ChartData): Promise<string>;
/**
 * Alternative: Render chart using Chart.js + node-canvas (if QuickChart unavailable)
 * This requires installing canvas package: npm install canvas chart.js
 */
export declare function renderChartWithNodeCanvas(chart: ChartData): Promise<string>;
//# sourceMappingURL=chartRenderer.d.ts.map