/**
 * Chart Performance Tracking Module
 *
 * Tracks chart rendering performance metrics and sends them to OpenTelemetry.
 * Integrates with the web vitals collection system.
 *
 * @module chartPerformanceTracking
 */

/**
 * Chart performance metric
 */
export interface ChartPerformanceMetric {
  /** Chart identifier (e.g., 'sroi-breakdown', 'vis-leaderboard') */
  chartId: string;
  /** Chart type (line, bar, pie, doughnut) */
  chartType: string;
  /** Render time in milliseconds */
  renderTime: number;
  /** Number of data points rendered */
  dataPoints: number;
  /** Whether data was downsampled */
  downsampled: boolean;
  /** Original data point count (if downsampled) */
  originalDataPoints?: number;
  /** Timestamp when metric was collected */
  timestamp: number;
  /** Page context */
  context: {
    url: string;
    tenantId?: string;
  };
}

/**
 * Performance budget for chart rendering
 */
export const CHART_PERFORMANCE_BUDGET = {
  /** Maximum acceptable render time (ms) */
  maxRenderTime: 500,
  /** Warning threshold (ms) */
  warningThreshold: 300,
  /** Maximum data points before downsampling recommended */
  maxDataPoints: 1000,
} as const;

/**
 * In-memory storage for chart metrics
 */
class ChartPerformanceTracker {
  private metrics: ChartPerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Track a chart render event
   */
  track(metric: Omit<ChartPerformanceMetric, 'timestamp' | 'context'>): void {
    const fullMetric: ChartPerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      context: {
        url: window.location.pathname,
        tenantId: this.extractTenantId(),
      },
    };

    // Add to metrics array
    this.metrics.push(fullMetric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log performance warnings
    this.checkBudget(fullMetric);

    // Send to OTel if available
    this.sendToOTel(fullMetric);
  }

  /**
   * Extract tenant ID from URL
   */
  private extractTenantId(): string | undefined {
    const match = window.location.pathname.match(/\/cockpit\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Check if metric exceeds performance budget
   */
  private checkBudget(metric: ChartPerformanceMetric): void {
    if (metric.renderTime > CHART_PERFORMANCE_BUDGET.maxRenderTime) {
      console.error(
        `[Chart Performance] Budget exceeded for ${metric.chartId}:`,
        `${metric.renderTime.toFixed(2)}ms (budget: ${CHART_PERFORMANCE_BUDGET.maxRenderTime}ms)`,
        `Data points: ${metric.dataPoints}${metric.downsampled ? ` (downsampled from ${metric.originalDataPoints})` : ''}`
      );
    } else if (metric.renderTime > CHART_PERFORMANCE_BUDGET.warningThreshold) {
      console.warn(
        `[Chart Performance] Warning for ${metric.chartId}:`,
        `${metric.renderTime.toFixed(2)}ms (threshold: ${CHART_PERFORMANCE_BUDGET.warningThreshold}ms)`
      );
    }
  }

  /**
   * Send metric to OpenTelemetry collector
   */
  private async sendToOTel(metric: ChartPerformanceMetric): Promise<void> {
    // Get OTel collector URL from meta tag
    const metaTag = document.querySelector('meta[name="otel-collector-url"]');
    const collectorUrl = metaTag?.getAttribute('content');

    if (!collectorUrl) {
      console.debug('[Chart Performance] OTel collector URL not configured');
      return;
    }

    const payload = {
      resource: {
        attributes: {
          'service.name': 'corp-cockpit-frontend',
          'service.version': '0.1.0',
          'deployment.environment': import.meta.env.PROD ? 'production' : 'development',
        },
      },
      scope: {
        name: 'chart-performance-tracker',
        version: '1.0.0',
      },
      metrics: [
        {
          name: 'chart.render.duration',
          description: 'Chart rendering duration in milliseconds',
          unit: 'ms',
          data: {
            dataPoints: [
              {
                attributes: {
                  'chart.id': metric.chartId,
                  'chart.type': metric.chartType,
                  'chart.data_points': metric.dataPoints,
                  'chart.downsampled': metric.downsampled,
                  'chart.original_data_points': metric.originalDataPoints || metric.dataPoints,
                  'page.url': metric.context.url,
                  'page.tenant_id': metric.context.tenantId || 'unknown',
                  'budget.exceeded': metric.renderTime > CHART_PERFORMANCE_BUDGET.maxRenderTime,
                },
                timeUnixNano: (metric.timestamp * 1_000_000).toString(),
                value: metric.renderTime,
              },
            ],
          },
        },
      ],
    };

    try {
      await fetch(collectorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      console.debug(`[Chart Performance] Sent metric to OTel: ${metric.chartId}`);
    } catch (error) {
      console.error('[Chart Performance] Failed to send to OTel:', error);
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): ChartPerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get statistics for a specific chart
   */
  getChartStats(chartId: string): {
    count: number;
    avgRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    budgetViolations: number;
  } | null {
    const chartMetrics = this.metrics.filter((m) => m.chartId === chartId);

    if (chartMetrics.length === 0) {
      return null;
    }

    const renderTimes = chartMetrics.map((m) => m.renderTime);
    const budgetViolations = chartMetrics.filter(
      (m) => m.renderTime > CHART_PERFORMANCE_BUDGET.maxRenderTime
    ).length;

    return {
      count: chartMetrics.length,
      avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      budgetViolations,
    };
  }

  /**
   * Get overall performance statistics
   */
  getOverallStats(): {
    totalCharts: number;
    avgRenderTime: number;
    budgetCompliance: number;
    slowestCharts: Array<{ chartId: string; avgRenderTime: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalCharts: 0,
        avgRenderTime: 0,
        budgetCompliance: 100,
        slowestCharts: [],
      };
    }

    const allRenderTimes = this.metrics.map((m) => m.renderTime);
    const avgRenderTime = allRenderTimes.reduce((a, b) => a + b, 0) / allRenderTimes.length;

    const budgetCompliantCount = this.metrics.filter(
      (m) => m.renderTime <= CHART_PERFORMANCE_BUDGET.maxRenderTime
    ).length;
    const budgetCompliance = (budgetCompliantCount / this.metrics.length) * 100;

    // Get unique chart IDs
    const chartIds = [...new Set(this.metrics.map((m) => m.chartId))];

    // Calculate average render time for each chart
    const chartAvgs = chartIds.map((chartId) => {
      const stats = this.getChartStats(chartId);
      return {
        chartId,
        avgRenderTime: stats?.avgRenderTime || 0,
      };
    });

    // Sort by slowest
    const slowestCharts = chartAvgs.sort((a, b) => b.avgRenderTime - a.avgRenderTime).slice(0, 5);

    return {
      totalCharts: chartIds.length,
      avgRenderTime,
      budgetCompliance,
      slowestCharts,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Singleton instance
const tracker = new ChartPerformanceTracker();

/**
 * Track a chart render event
 *
 * @example
 * ```typescript
 * trackChartRender({
 *   chartId: 'sroi-breakdown',
 *   chartType: 'doughnut',
 *   renderTime: 245,
 *   dataPoints: 4,
 *   downsampled: false,
 * });
 * ```
 */
export function trackChartRender(
  metric: Omit<ChartPerformanceMetric, 'timestamp' | 'context'>
): void {
  tracker.track(metric);
}

/**
 * Get all collected chart metrics
 */
export function getChartMetrics(): ChartPerformanceMetric[] {
  return tracker.getMetrics();
}

/**
 * Get statistics for a specific chart
 */
export function getChartStats(chartId: string) {
  return tracker.getChartStats(chartId);
}

/**
 * Get overall performance statistics
 */
export function getOverallChartStats() {
  return tracker.getOverallStats();
}

/**
 * Clear all chart metrics
 */
export function clearChartMetrics(): void {
  tracker.clear();
}

/**
 * Log performance summary to console
 * Useful for debugging and development
 */
export function logChartPerformanceSummary(): void {
  const stats = tracker.getOverallStats();

  console.group('[Chart Performance Summary]');
  console.log('Total Charts Tracked:', stats.totalCharts);
  console.log('Average Render Time:', `${stats.avgRenderTime.toFixed(2)}ms`);
  console.log('Budget Compliance:', `${stats.budgetCompliance.toFixed(1)}%`);

  if (stats.slowestCharts.length > 0) {
    console.group('Slowest Charts:');
    stats.slowestCharts.forEach((chart, index) => {
      console.log(
        `${index + 1}. ${chart.chartId}: ${chart.avgRenderTime.toFixed(2)}ms`
      );
    });
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Initialize chart performance tracking
 * Sets up global event listeners and dev tools
 */
export function initChartPerformanceTracking(): void {
  if (typeof window === 'undefined') return;

  // Expose to window for debugging in dev mode
  if (import.meta.env.DEV) {
    (window as any).chartPerformance = {
      getMetrics: getChartMetrics,
      getStats: getChartStats,
      getOverallStats: getOverallChartStats,
      logSummary: logChartPerformanceSummary,
      clear: clearChartMetrics,
    };

    console.log(
      '[Chart Performance] Tracking initialized. Use window.chartPerformance for debugging.'
    );
  }

  // Log summary on page unload in dev mode
  if (import.meta.env.DEV) {
    window.addEventListener('beforeunload', () => {
      logChartPerformanceSummary();
    });
  }
}
