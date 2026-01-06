/**
 * Chart Optimizations Tests
 *
 * Tests for LTTB algorithm, data downsampling, and performance utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  lttb,
  averageDownsample,
  minMaxDownsample,
  adaptiveDownsample,
  calculateOptimalThreshold,
  measureDownsamplingPerformance,
  formatDataForPerformance,
  getOptimizedChartConfig,
  type DataPoint,
} from './chartOptimizations';

describe('LTTB Algorithm', () => {
  it('should return all points if data length <= threshold', () => {
    const data: DataPoint[] = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];

    const result = lttb(data, 5);
    expect(result).toEqual(data);
  });

  it('should always include first and last points', () => {
    const data: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 10) * 50 + 50,
    }));

    const result = lttb(data, 20);

    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });

  it('should return correct number of points', () => {
    const data: DataPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: Math.random() * 100,
    }));

    const threshold = 50;
    const result = lttb(data, threshold);

    expect(result.length).toBe(threshold);
  });

  it('should preserve visual characteristics of sine wave', () => {
    const data: DataPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 50) * 100 + 100,
    }));

    const result = lttb(data, 100);

    // Check that peaks are relatively preserved
    const originalMax = Math.max(...data.map(d => d.y));
    const sampledMax = Math.max(...result.map(d => d.y));

    expect(Math.abs(originalMax - sampledMax)).toBeLessThan(10);
  });

  it('should throw error for threshold <= 0', () => {
    const data: DataPoint[] = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ];

    expect(() => lttb(data, 0)).toThrow('Threshold must be positive');
    expect(() => lttb(data, -1)).toThrow('Threshold must be positive');
  });

  it('should handle minimum threshold of 3', () => {
    const data: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: i * 2,
    }));

    const result = lttb(data, 2);
    expect(result.length).toBe(3);
  });
});

describe('Average Downsampling', () => {
  it('should calculate correct averages', () => {
    const data: DataPoint[] = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
      { x: 4, y: 40 },
    ];

    const result = averageDownsample(data, 2);

    expect(result.length).toBe(2);
    expect(result[0].y).toBeCloseTo(15); // Average of 10, 20
    expect(result[1].y).toBeCloseTo(35); // Average of 30, 40
  });

  it('should return all points if threshold >= data length', () => {
    const data: DataPoint[] = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ];

    const result = averageDownsample(data, 5);
    expect(result).toEqual(data);
  });
});

describe('Min/Max Downsampling', () => {
  it('should preserve maximum values in max mode', () => {
    const data: DataPoint[] = [
      { x: 1, y: 10 },
      { x: 2, y: 50 }, // Max in first bucket
      { x: 3, y: 20 },
      { x: 4, y: 80 }, // Max in second bucket
    ];

    const result = minMaxDownsample(data, 2, 'max');

    expect(result.length).toBe(2);
    expect(result[0].y).toBe(50);
    expect(result[1].y).toBe(80);
  });

  it('should preserve minimum values in min mode', () => {
    const data: DataPoint[] = [
      { x: 1, y: 50 },
      { x: 2, y: 10 }, // Min in first bucket
      { x: 3, y: 80 },
      { x: 4, y: 20 }, // Min in second bucket
    ];

    const result = minMaxDownsample(data, 2, 'min');

    expect(result.length).toBe(2);
    expect(result[0].y).toBe(10);
    expect(result[1].y).toBe(20);
  });
});

describe('Adaptive Downsampling', () => {
  it('should return original data for small datasets', () => {
    const data: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
      x: i,
      y: i * 2,
    }));

    const result = adaptiveDownsample(data);
    expect(result).toEqual(data);
  });

  it('should use LTTB for large datasets by default', () => {
    const data: DataPoint[] = Array.from({ length: 2000 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 100) * 50 + 50,
    }));

    const result = adaptiveDownsample(data, { maxPoints: 500 });

    expect(result.length).toBe(500);
    // LTTB should preserve first and last points
    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });

  it('should respect custom algorithm selection', () => {
    const data: DataPoint[] = Array.from({ length: 500 }, (_, i) => ({
      x: i,
      y: i,
    }));

    const resultAvg = adaptiveDownsample(data, {
      maxPoints: 100,
      algorithm: 'average',
    });

    expect(resultAvg.length).toBeLessThanOrEqual(100);
  });
});

describe('Calculate Optimal Threshold', () => {
  it('should calculate threshold based on chart width', () => {
    const threshold = calculateOptimalThreshold(800, 2);
    expect(threshold).toBe(1600); // 800 * 2
  });

  it('should enforce minimum threshold', () => {
    const threshold = calculateOptimalThreshold(10, 2);
    expect(threshold).toBe(50); // Minimum
  });

  it('should enforce maximum threshold', () => {
    const threshold = calculateOptimalThreshold(2000, 2);
    expect(threshold).toBe(2000); // Maximum
  });

  it('should use default points per pixel', () => {
    const threshold1 = calculateOptimalThreshold(500);
    const threshold2 = calculateOptimalThreshold(500, 2);
    expect(threshold1).toBe(threshold2);
  });
});

describe('Measure Downsampling Performance', () => {
  it('should measure LTTB performance', () => {
    const data: DataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      x: i,
      y: Math.random() * 100,
    }));

    const metrics = measureDownsamplingPerformance(data, 500, 'lttb');

    expect(metrics.originalDataPoints).toBe(10000);
    expect(metrics.downsampledDataPoints).toBe(500);
    expect(metrics.reductionPercentage).toBeCloseTo(95, 0); // 95% reduction
    expect(metrics.downsamplingTime).toBeGreaterThan(0);
    expect(metrics.estimatedImprovement).toBeGreaterThan(0);
  });

  it('should calculate correct reduction percentage', () => {
    const data: DataPoint[] = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: i,
    }));

    const metrics = measureDownsamplingPerformance(data, 100, 'lttb');

    expect(metrics.reductionPercentage).toBeCloseTo(90, 0); // 90% reduction
  });
});

describe('Format Data for Performance', () => {
  it('should convert arrays to DataPoint format', () => {
    const labels = ['Jan', 'Feb', 'Mar'];
    const values = [100, 200, 300];

    const result = formatDataForPerformance(labels, values);

    expect(result).toEqual([
      { x: 'Jan', y: 100 },
      { x: 'Feb', y: 200 },
      { x: 'Mar', y: 300 },
    ]);
  });

  it('should handle numeric labels', () => {
    const labels = [1, 2, 3];
    const values = [10, 20, 30];

    const result = formatDataForPerformance(labels, values);

    expect(result).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]);
  });

  it('should handle Date labels', () => {
    const labels = [new Date('2024-01-01'), new Date('2024-01-02')];
    const values = [100, 200];

    const result = formatDataForPerformance(labels, values);

    expect(result.length).toBe(2);
    expect(result[0].x).toEqual(labels[0]);
    expect(result[0].y).toBe(100);
  });

  it('should throw error for mismatched lengths', () => {
    const labels = ['A', 'B'];
    const values = [1, 2, 3];

    expect(() => formatDataForPerformance(labels, values)).toThrow(
      'Labels and values must have same length'
    );
  });
});

describe('Get Optimized Chart Config', () => {
  it('should return production config by default', () => {
    const config = getOptimizedChartConfig(100);

    expect(config.animation).toBe(false);
    expect(config.responsive).toBe(true);
  });

  it('should return development config when specified', () => {
    const config = getOptimizedChartConfig(100, 'development');

    expect(config.animation).toBeDefined();
    expect(config.responsive).toBe(true);
  });

  it('should return minimal config when specified', () => {
    const config = getOptimizedChartConfig(100, 'minimal');

    expect(config.animation).toBe(false);
    expect(config.plugins?.legend?.display).toBe(false);
  });

  it('should add decimation for large datasets', () => {
    const config = getOptimizedChartConfig(2000);

    expect(config.plugins?.decimation).toBeDefined();
    expect(config.plugins?.decimation?.enabled).toBe(true);
  });

  it('should not add decimation for small datasets', () => {
    const config = getOptimizedChartConfig(500);

    expect(config.plugins?.decimation).toBeUndefined();
  });

  it('should merge custom options', () => {
    const customOptions = {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    };

    const config = getOptimizedChartConfig(100, 'production', customOptions);

    expect(config.scales?.y?.beginAtZero).toBe(true);
    expect(config.animation).toBe(false); // Base config preserved
  });
});

describe('Performance Benchmarks', () => {
  it('LTTB should complete in < 100ms for 10k points', () => {
    const data: DataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      x: i,
      y: Math.random() * 100,
    }));

    const startTime = performance.now();
    lttb(data, 500);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
  });

  it('Average downsampling should be faster than LTTB', () => {
    const data: DataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      x: i,
      y: Math.random() * 100,
    }));

    const startLttb = performance.now();
    lttb(data, 500);
    const lttbTime = performance.now() - startLttb;

    const startAvg = performance.now();
    averageDownsample(data, 500);
    const avgTime = performance.now() - startAvg;

    expect(avgTime).toBeLessThan(lttbTime);
  });
});

describe('Edge Cases', () => {
  it('should handle empty data arrays', () => {
    const data: DataPoint[] = [];

    expect(lttb(data, 10)).toEqual([]);
    expect(averageDownsample(data, 10)).toEqual([]);
    expect(minMaxDownsample(data, 10)).toEqual([]);
  });

  it('should handle single data point', () => {
    const data: DataPoint[] = [{ x: 1, y: 10 }];

    expect(lttb(data, 10)).toEqual(data);
    expect(averageDownsample(data, 10)).toEqual(data);
    expect(minMaxDownsample(data, 10)).toEqual(data);
  });

  it('should handle data with same y values', () => {
    const data: DataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: 50, // All same value
    }));

    const result = lttb(data, 20);
    expect(result.length).toBe(20);
    expect(result.every(p => p.y === 50)).toBe(true);
  });

  it('should handle negative values', () => {
    const data: DataPoint[] = [
      { x: 1, y: -10 },
      { x: 2, y: -50 },
      { x: 3, y: -20 },
    ];

    const result = minMaxDownsample(data, 1, 'min');
    expect(result[0].y).toBe(-50);
  });
});
