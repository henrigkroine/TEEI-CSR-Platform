/**
 * Chart Renderer Tests
 *
 * Comprehensive test suite for server-side chart rendering
 * Tests all chart types, caching, error handling, and performance
 *
 * @module utils/chartRenderer.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  renderChart,
  renderChartToBase64,
  renderChartsBatch,
  getRenderStats,
  resetRenderStats,
  clearChartCache,
  warmCache,
  cleanup,
  type ChartConfig,
  type ChartRenderOptions,
} from './chartRenderer.js';

// Sample chart configurations for testing
const lineChartConfig: ChartConfig = {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Monthly Revenue',
      },
    },
  },
};

const barChartConfig: ChartConfig = {
  type: 'bar',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Impact Score',
        data: [65, 72, 81, 88],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Quarterly Impact Scores',
      },
    },
  },
};

const pieChartConfig: ChartConfig = {
  type: 'pie',
  data: {
    labels: ['Integration', 'Language', 'Job Readiness', 'Community'],
    datasets: [
      {
        label: 'Outcome Distribution',
        data: [30, 25, 25, 20],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Outcome Distribution',
      },
      legend: {
        display: true,
        position: 'bottom',
      },
    },
  },
};

const doughnutChartConfig: ChartConfig = {
  type: 'doughnut',
  data: {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        label: 'Project Status',
        data: [45, 35, 20],
        backgroundColor: ['#10b981', '#f59e0b', '#6b7280'],
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Project Status',
      },
    },
  },
};

const radarChartConfig: ChartConfig = {
  type: 'radar',
  data: {
    labels: ['Communication', 'Technical', 'Leadership', 'Teamwork', 'Problem Solving'],
    datasets: [
      {
        label: 'Skills Assessment',
        data: [85, 75, 80, 90, 88],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointRadius: 4,
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Skills Assessment Radar',
      },
    },
  },
};

const areaChartConfig: ChartConfig = {
  type: 'area',
  data: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Volunteer Hours',
        data: [120, 145, 160, 180],
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderColor: '#10b981',
        fill: true,
      },
    ],
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Weekly Volunteer Hours Trend',
      },
    },
  },
};

describe('ChartRenderer', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await clearChartCache();
    resetRenderStats();
  });

  afterAll(async () => {
    // Cleanup resources
    await cleanup();
  });

  beforeEach(() => {
    // Reset stats before each test
    resetRenderStats();
  });

  describe('Basic Rendering', () => {
    it('should render a line chart to PNG', async () => {
      const result = await renderChart(lineChartConfig, {
        format: 'png',
        width: 600,
        height: 400,
      });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.format).toBe('png');
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
      expect(result.renderTime).toBeGreaterThan(0);
    }, 15000); // 15s timeout for browser launch

    it('should render a bar chart to PNG', async () => {
      const result = await renderChart(barChartConfig, {
        format: 'png',
        width: 800,
        height: 500,
      });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.format).toBe('png');
    }, 15000);

    it('should render a pie chart', async () => {
      const result = await renderChart(pieChartConfig);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should render a doughnut chart', async () => {
      const result = await renderChart(doughnutChartConfig);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should render a radar chart', async () => {
      const result = await renderChart(radarChartConfig);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should render an area chart', async () => {
      const result = await renderChart(areaChartConfig);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Chart Options', () => {
    it('should respect custom dimensions', async () => {
      const result = await renderChart(lineChartConfig, {
        width: 1200,
        height: 800,
      });

      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);
    }, 15000);

    it('should apply custom background color', async () => {
      const result = await renderChart(lineChartConfig, {
        backgroundColor: '#f3f4f6',
      });

      expect(result).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should support high-DPI rendering', async () => {
      const result = await renderChart(lineChartConfig, {
        deviceScaleFactor: 2,
      });

      expect(result).toBeDefined();
      // High-DPI images should be larger
      expect(result.buffer.length).toBeGreaterThan(10000);
    }, 15000);
  });

  describe('Caching', () => {
    it('should cache rendered charts', async () => {
      await clearChartCache();
      resetRenderStats();

      // First render - cache miss
      const result1 = await renderChart(lineChartConfig, {
        useCache: true,
      });

      expect(result1.cacheHit).toBe(false);
      expect(result1.renderTime).toBeGreaterThan(0);

      // Second render - cache hit
      const result2 = await renderChart(lineChartConfig, {
        useCache: true,
      });

      expect(result2.cacheHit).toBe(true);
      expect(result2.renderTime).toBe(0);
      expect(result2.buffer).toEqual(result1.buffer);

      const stats = getRenderStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    }, 20000);

    it('should generate different cache keys for different configs', async () => {
      await clearChartCache();

      const result1 = await renderChart(lineChartConfig);
      const result2 = await renderChart(barChartConfig);

      expect(result1.cacheKey).not.toBe(result2.cacheKey);
    }, 15000);

    it('should generate different cache keys for different options', async () => {
      await clearChartCache();

      const result1 = await renderChart(lineChartConfig, { width: 600 });
      const result2 = await renderChart(lineChartConfig, { width: 800 });

      expect(result1.cacheKey).not.toBe(result2.cacheKey);
    }, 15000);

    it('should respect useCache=false option', async () => {
      await clearChartCache();
      resetRenderStats();

      const result1 = await renderChart(lineChartConfig, {
        useCache: false,
      });

      const result2 = await renderChart(lineChartConfig, {
        useCache: false,
      });

      expect(result1.cacheHit).toBe(false);
      expect(result2.cacheHit).toBe(false);

      const stats = getRenderStats();
      expect(stats.cacheHits).toBe(0);
    }, 20000);
  });

  describe('Base64 Encoding', () => {
    it('should render chart to base64 data URL', async () => {
      const base64 = await renderChartToBase64(lineChartConfig);

      expect(base64).toMatch(/^data:image\/(png|svg\+xml);base64,/);
      expect(base64.length).toBeGreaterThan(100);

      // Verify it's valid base64
      const [, data] = base64.split(',');
      const buffer = Buffer.from(data, 'base64');
      expect(buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should produce valid base64 for all chart types', async () => {
      const configs = [
        lineChartConfig,
        barChartConfig,
        pieChartConfig,
        doughnutChartConfig,
        radarChartConfig,
      ];

      for (const config of configs) {
        const base64 = await renderChartToBase64(config);
        expect(base64).toMatch(/^data:image\/png;base64,/);
      }
    }, 30000);
  });

  describe('Batch Rendering', () => {
    it('should render multiple charts in batch', async () => {
      const configs = [lineChartConfig, barChartConfig, pieChartConfig];

      const results = await renderChartsBatch(configs);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.buffer.length).toBeGreaterThan(0);
      });
    }, 30000);

    it('should handle empty batch', async () => {
      const results = await renderChartsBatch([]);
      expect(results).toHaveLength(0);
    }, 5000);

    it('should batch render with custom options', async () => {
      const configs = [lineChartConfig, barChartConfig];

      const results = await renderChartsBatch(configs, {
        width: 600,
        height: 400,
      });

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.width).toBe(600);
        expect(result.height).toBe(400);
      });
    }, 20000);
  });

  describe('Statistics', () => {
    it('should track rendering statistics', async () => {
      await clearChartCache();
      resetRenderStats();

      await renderChart(lineChartConfig);
      await renderChart(lineChartConfig); // Cache hit

      const stats = getRenderStats();

      expect(stats.totalRenders).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.totalRenderTime).toBeGreaterThan(0);
      expect(stats.averageRenderTime).toBeGreaterThan(0);
      expect(stats.errors).toBe(0);
    }, 20000);

    it('should reset statistics', async () => {
      await renderChart(lineChartConfig);

      resetRenderStats();

      const stats = getRenderStats();
      expect(stats.totalRenders).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid chart configuration gracefully', async () => {
      const invalidConfig: ChartConfig = {
        type: 'line',
        data: {
          labels: [],
          datasets: [],
        },
      };

      // Should still render (ChartJS handles empty data)
      const result = await renderChart(invalidConfig);
      expect(result).toBeDefined();
    }, 15000);

    it('should handle timeout errors', async () => {
      const config = lineChartConfig;

      // Very short timeout should cause failure
      await expect(
        renderChart(config, {
          timeout: 1, // 1ms - too short
          useCache: false,
        })
      ).rejects.toThrow();

      const stats = getRenderStats();
      expect(stats.errors).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Performance', () => {
    it('should render charts within reasonable time', async () => {
      const startTime = Date.now();

      await renderChart(lineChartConfig, {
        useCache: false,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render within 5 seconds
      expect(duration).toBeLessThan(5000);
    }, 15000);

    it('should cache warming improve performance', async () => {
      await clearChartCache();
      resetRenderStats();

      const configs = [lineChartConfig, barChartConfig, pieChartConfig];

      // Warm cache
      await warmCache(configs);

      // These should all be cache hits
      const results = await renderChartsBatch(configs);

      const stats = getRenderStats();

      // At least some should be cache hits after warming
      expect(stats.cacheHits).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Cache Management', () => {
    it('should clear all cached charts', async () => {
      // Render and cache a chart
      await renderChart(lineChartConfig, { useCache: true });

      // Clear cache
      await clearChartCache();

      resetRenderStats();

      // Next render should be cache miss
      const result = await renderChart(lineChartConfig, { useCache: true });

      expect(result.cacheHit).toBe(false);
    }, 20000);
  });

  describe('Integration with PDF Renderer', () => {
    it('should produce buffers compatible with PDF embedding', async () => {
      const result = await renderChart(lineChartConfig);

      // Verify PNG header
      const header = result.buffer.slice(0, 8);
      expect(header[0]).toBe(0x89);
      expect(header[1]).toBe(0x50); // 'P'
      expect(header[2]).toBe(0x4e); // 'N'
      expect(header[3]).toBe(0x47); // 'G'
    }, 15000);

    it('should render charts suitable for all report templates', async () => {
      // Test standard report dimensions
      const dimensions = [
        { width: 760, height: 460 }, // Standard
        { width: 600, height: 400 }, // Compact
        { width: 1200, height: 800 }, // Large
      ];

      for (const dim of dimensions) {
        const result = await renderChart(lineChartConfig, dim);
        expect(result.width).toBe(dim.width);
        expect(result.height).toBe(dim.height);
        expect(result.buffer.length).toBeGreaterThan(0);
      }
    }, 30000);
  });
});

describe('Chart Type Specific Tests', () => {
  describe('Line Charts', () => {
    it('should render line chart with multiple datasets', async () => {
      const config: ChartConfig = {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [
            {
              label: 'Series 1',
              data: [10, 20, 30, 25, 35],
              borderColor: '#3b82f6',
            },
            {
              label: 'Series 2',
              data: [15, 25, 20, 30, 28],
              borderColor: '#10b981',
            },
          ],
        },
      };

      const result = await renderChart(config);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle line chart with tension', async () => {
      const config: ChartConfig = {
        ...lineChartConfig,
        data: {
          ...lineChartConfig.data,
          datasets: lineChartConfig.data.datasets.map(ds => ({
            ...ds,
            tension: 0.4,
          })),
        },
      };

      const result = await renderChart(config);
      expect(result).toBeDefined();
    }, 15000);
  });

  describe('Bar Charts', () => {
    it('should render stacked bar chart', async () => {
      const config: ChartConfig = {
        type: 'bar',
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [
            {
              label: 'Product A',
              data: [30, 40, 35, 50],
              backgroundColor: '#3b82f6',
            },
            {
              label: 'Product B',
              data: [20, 30, 25, 40],
              backgroundColor: '#10b981',
            },
          ],
        },
        options: {
          scales: {
            x: { stacked: true },
            y: { stacked: true },
          },
        },
      };

      const result = await renderChart(config);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Pie and Doughnut Charts', () => {
    it('should render pie chart with custom colors', async () => {
      const config: ChartConfig = {
        type: 'pie',
        data: {
          labels: ['Red', 'Blue', 'Yellow', 'Green'],
          datasets: [
            {
              data: [30, 25, 25, 20],
              backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'],
            },
          ],
        },
      };

      const result = await renderChart(config);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 15000);
  });
});
