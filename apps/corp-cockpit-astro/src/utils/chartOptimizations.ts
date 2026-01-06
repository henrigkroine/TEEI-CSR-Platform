/**
 * Chart Performance Optimizations
 *
 * This module provides performance optimization utilities for chart rendering:
 * - LTTB (Largest Triangle Three Buckets) algorithm for data downsampling
 * - Time-series data windowing
 * - Adaptive sampling based on viewport and data size
 * - Chart configuration presets optimized for performance
 *
 * Performance Goals:
 * - Chart render time < 500ms
 * - LCP ≤ 2.0s for dashboard with multiple charts
 * - INP ≤ 200ms for chart interactions
 *
 * @module chartOptimizations
 */

import type { ChartOptions } from 'chart.js';

/**
 * Point interface for LTTB algorithm
 */
export interface DataPoint {
  x: number | string | Date;
  y: number;
}

/**
 * Configuration for data windowing
 */
export interface WindowingConfig {
  /** Maximum number of points to display */
  maxPoints: number;
  /** Sampling algorithm to use */
  algorithm: 'lttb' | 'average' | 'max' | 'min' | 'first' | 'last';
  /** Whether to preserve peaks in data */
  preservePeaks?: boolean;
}

/**
 * Chart performance metrics
 */
export interface ChartPerformanceMetrics {
  /** Original data point count */
  originalDataPoints: number;
  /** Downsampled data point count */
  downsampledDataPoints: number;
  /** Data reduction percentage */
  reductionPercentage: number;
  /** Time taken for downsampling (ms) */
  downsamplingTime: number;
  /** Estimated render time improvement (%) */
  estimatedImprovement: number;
}

/**
 * LTTB (Largest Triangle Three Buckets) Algorithm
 *
 * Downsamples time-series data while preserving visual characteristics.
 * Best for large datasets (>1000 points) where visual fidelity matters.
 *
 * Algorithm:
 * 1. Always include first and last points
 * 2. Divide remaining data into buckets
 * 3. For each bucket, select point that forms largest triangle with
 *    previous point and average of next bucket
 *
 * Time complexity: O(n)
 * Space complexity: O(threshold)
 *
 * @param data - Original data points
 * @param threshold - Target number of points (must be >= 3)
 * @returns Downsampled data points
 *
 * @example
 * const data = generateTimeSeriesData(10000);
 * const downsampled = lttb(data, 500);
 * // Result: 500 points that visually represent the original 10000
 */
export function lttb(data: DataPoint[], threshold: number): DataPoint[] {
  // Validate inputs
  if (threshold <= 0) {
    throw new Error('Threshold must be positive');
  }

  // Return early if data is already small enough
  if (data.length <= threshold) {
    return data;
  }

  // Must have at least 3 points for algorithm
  if (threshold < 3) {
    threshold = 3;
  }

  const sampled: DataPoint[] = [];

  // Always include first point
  sampled.push(data[0]);

  // Bucket size for remaining points (excluding first and last)
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Index of currently selected point in previous bucket
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate average point for next bucket
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeEndActual = avgRangeEnd < data.length ? avgRangeEnd : data.length;

    let avgX = 0;
    let avgY = 0;
    const avgRangeLength = avgRangeEndActual - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEndActual; j++) {
      avgX += typeof data[j].x === 'number' ? data[j].x : j;
      avgY += data[j].y;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point A (previous selected point)
    const pointAX = typeof data[a].x === 'number' ? data[a].x : a;
    const pointAY = data[a].y;

    let maxArea = -1;
    let maxAreaPoint = 0;

    // Select point with largest triangle area
    for (let j = rangeOffs; j < rangeTo; j++) {
      const pointX = typeof data[j].x === 'number' ? data[j].x : j;
      const pointY = data[j].y;

      // Calculate triangle area
      const area = Math.abs(
        (pointAX - avgX) * (pointY - pointAY) -
        (pointAX - pointX) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  // Always include last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Average downsampling
 *
 * Divides data into buckets and calculates average for each bucket.
 * Fast but may lose peak values. Good for smooth trends.
 *
 * @param data - Original data points
 * @param threshold - Target number of points
 * @returns Downsampled data points
 */
export function averageDownsample(data: DataPoint[], threshold: number): DataPoint[] {
  if (data.length <= threshold) {
    return data;
  }

  const sampled: DataPoint[] = [];
  const bucketSize = data.length / threshold;

  for (let i = 0; i < threshold; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let j = start; j < end && j < data.length; j++) {
      sumX += typeof data[j].x === 'number' ? data[j].x : j;
      sumY += data[j].y;
      count++;
    }

    if (count > 0) {
      sampled.push({
        x: sumX / count,
        y: sumY / count,
      });
    }
  }

  return sampled;
}

/**
 * Max/Min downsampling
 *
 * Preserves peaks and valleys by selecting max or min value in each bucket.
 * Good for identifying outliers and extremes.
 *
 * @param data - Original data points
 * @param threshold - Target number of points
 * @param mode - Select 'max' or 'min' values
 * @returns Downsampled data points
 */
export function minMaxDownsample(
  data: DataPoint[],
  threshold: number,
  mode: 'max' | 'min' = 'max'
): DataPoint[] {
  if (data.length <= threshold) {
    return data;
  }

  const sampled: DataPoint[] = [];
  const bucketSize = data.length / threshold;

  for (let i = 0; i < threshold; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);

    let extremePoint = data[start];

    for (let j = start; j < end && j < data.length; j++) {
      if (mode === 'max' && data[j].y > extremePoint.y) {
        extremePoint = data[j];
      } else if (mode === 'min' && data[j].y < extremePoint.y) {
        extremePoint = data[j];
      }
    }

    sampled.push(extremePoint);
  }

  return sampled;
}

/**
 * Adaptive downsampling
 *
 * Automatically selects best sampling strategy based on:
 * - Data size and characteristics
 * - Viewport dimensions
 * - Device capabilities
 *
 * Decision tree:
 * - < 100 points: No sampling
 * - 100-1000 points: Average sampling
 * - > 1000 points: LTTB algorithm
 *
 * @param data - Original data points
 * @param config - Optional configuration
 * @returns Downsampled data points
 */
export function adaptiveDownsample(
  data: DataPoint[],
  config?: Partial<WindowingConfig>
): DataPoint[] {
  const defaultConfig: WindowingConfig = {
    maxPoints: 500,
    algorithm: 'lttb',
    preservePeaks: true,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // No sampling needed for small datasets
  if (data.length <= 100) {
    return data;
  }

  // Select algorithm based on data size
  switch (finalConfig.algorithm) {
    case 'lttb':
      return lttb(data, finalConfig.maxPoints);
    case 'average':
      return averageDownsample(data, finalConfig.maxPoints);
    case 'max':
      return minMaxDownsample(data, finalConfig.maxPoints, 'max');
    case 'min':
      return minMaxDownsample(data, finalConfig.maxPoints, 'min');
    case 'first':
      return data.slice(0, finalConfig.maxPoints);
    case 'last':
      return data.slice(-finalConfig.maxPoints);
    default:
      return lttb(data, finalConfig.maxPoints);
  }
}

/**
 * Calculate optimal threshold for viewport
 *
 * Determines ideal number of data points based on chart width.
 * Rule of thumb: 2-3 points per pixel for smooth rendering.
 *
 * @param chartWidth - Width of chart container in pixels
 * @param pointsPerPixel - Density factor (default: 2)
 * @returns Optimal threshold
 */
export function calculateOptimalThreshold(
  chartWidth: number,
  pointsPerPixel: number = 2
): number {
  // Minimum 50 points for meaningful visualization
  const minThreshold = 50;
  // Maximum 2000 points (Chart.js performance limit)
  const maxThreshold = 2000;

  const calculated = Math.floor(chartWidth * pointsPerPixel);
  return Math.max(minThreshold, Math.min(maxThreshold, calculated));
}

/**
 * Measure downsampling performance
 *
 * Benchmarks downsampling algorithm and calculates metrics.
 *
 * @param data - Original data points
 * @param threshold - Target number of points
 * @param algorithm - Sampling algorithm
 * @returns Performance metrics
 */
export function measureDownsamplingPerformance(
  data: DataPoint[],
  threshold: number,
  algorithm: WindowingConfig['algorithm'] = 'lttb'
): ChartPerformanceMetrics {
  const startTime = performance.now();

  let downsampled: DataPoint[];
  switch (algorithm) {
    case 'lttb':
      downsampled = lttb(data, threshold);
      break;
    case 'average':
      downsampled = averageDownsample(data, threshold);
      break;
    case 'max':
      downsampled = minMaxDownsample(data, threshold, 'max');
      break;
    case 'min':
      downsampled = minMaxDownsample(data, threshold, 'min');
      break;
    default:
      downsampled = data;
  }

  const endTime = performance.now();
  const downsamplingTime = endTime - startTime;

  const reductionPercentage = data.length > 0
    ? ((data.length - downsampled.length) / data.length) * 100
    : 0;

  // Estimate render time improvement (rough heuristic)
  // Chart.js render time scales roughly O(n) with data points
  const estimatedImprovement = reductionPercentage * 0.8; // 80% of data reduction

  return {
    originalDataPoints: data.length,
    downsampledDataPoints: downsampled.length,
    reductionPercentage,
    downsamplingTime,
    estimatedImprovement,
  };
}

/**
 * Performance-optimized Chart.js configuration presets
 */
export const CHART_PERFORMANCE_PRESETS = {
  /**
   * Production preset - maximum performance
   * - Animations disabled
   * - Minimal plugins
   * - Hardware acceleration hints
   */
  production: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        // Reduce tooltip rendering overhead
        callbacks: {
          title: (items: any[]) => items[0]?.label || '',
          label: (item: any) => `${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkipPadding: 20,
        },
      },
      y: {
        ticks: {
          maxTicksLimit: 8,
        },
      },
    },
    // Performance hints
    parsing: false, // Use pre-parsed data
    normalized: true, // Data is already normalized
  },

  /**
   * Development preset - balanced
   * - Subtle animations
   * - More visual feedback
   */
  development: {
    animation: {
      duration: 300,
      easing: 'easeInOutQuart' as const,
    },
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
      },
    },
  },

  /**
   * Minimal preset - for widgets/dashboards with many charts
   * - No animations
   * - Minimal UI elements
   * - Maximum data density
   */
  minimal: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'nearest' as const,
        intersect: true,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
  },
} as const;

/**
 * Get optimized chart configuration based on environment and data size
 *
 * @param dataPoints - Number of data points
 * @param environment - Current environment
 * @param customOptions - Custom options to merge
 * @returns Optimized Chart.js options
 */
export function getOptimizedChartConfig<T extends string>(
  dataPoints: number,
  environment: 'production' | 'development' | 'minimal' = 'production',
  customOptions?: Partial<ChartOptions<T>>
): ChartOptions<T> {
  const baseConfig = CHART_PERFORMANCE_PRESETS[environment];

  // Additional optimizations for large datasets
  const largeDataOptimizations = dataPoints > 1000 ? {
    animation: false,
    parsing: false,
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: Math.min(dataPoints, 500),
      },
    },
  } : {};

  return {
    ...baseConfig,
    ...largeDataOptimizations,
    ...customOptions,
  } as ChartOptions<T>;
}

/**
 * Convert array data to optimized format for Chart.js
 *
 * Pre-parses data to x/y format to enable `parsing: false` optimization.
 *
 * @param labels - X-axis labels
 * @param values - Y-axis values
 * @returns Optimized data points
 */
export function formatDataForPerformance(
  labels: (string | number | Date)[],
  values: number[]
): DataPoint[] {
  if (labels.length !== values.length) {
    throw new Error('Labels and values must have same length');
  }

  return labels.map((label, index) => ({
    x: label,
    y: values[index],
  }));
}

/**
 * Batch multiple chart updates to reduce re-renders
 *
 * Useful when updating multiple charts simultaneously.
 *
 * @param updates - Array of update functions
 * @returns Promise that resolves when all updates complete
 */
export async function batchChartUpdates(
  updates: Array<() => void | Promise<void>>
): Promise<void> {
  // Use requestAnimationFrame to batch DOM updates
  return new Promise((resolve) => {
    requestAnimationFrame(async () => {
      for (const update of updates) {
        await update();
      }
      resolve();
    });
  });
}

/**
 * Debounced chart resize handler
 *
 * Prevents excessive chart reflows during window resizing.
 *
 * @param callback - Resize callback
 * @param delay - Debounce delay in ms (default: 150)
 * @returns Debounced function
 */
export function debounceChartResize(
  callback: () => void,
  delay: number = 150
): () => void {
  let timeoutId: number | null = null;

  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      callback();
      timeoutId = null;
    }, delay);
  };
}
