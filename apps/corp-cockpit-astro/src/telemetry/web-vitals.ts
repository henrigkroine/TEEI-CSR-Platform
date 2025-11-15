/**
 * Web Vitals Collection and Real User Monitoring (RUM)
 *
 * Collects Core Web Vitals and sends to OpenTelemetry collector (Worker 1).
 * Implements performance budgets and alerts for production monitoring.
 *
 * Target Budgets:
 * - LCP (Largest Contentful Paint): ≤ 2.0s
 * - INP (Interaction to Next Paint): ≤ 200ms
 * - CLS (Cumulative Layout Shift): ≤ 0.1
 */

import type { Metric } from 'web-vitals';

/**
 * Web Vitals thresholds
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2000, // 2.0s
    needsImprovement: 4000, // 4.0s
    poor: Infinity,
  },
  INP: {
    good: 200, // 200ms
    needsImprovement: 500, // 500ms
    poor: Infinity,
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: Infinity,
  },
  FID: {
    good: 100, // 100ms
    needsImprovement: 300, // 300ms
    poor: Infinity,
  },
  TTFB: {
    good: 800, // 800ms
    needsImprovement: 1800, // 1.8s
    poor: Infinity,
  },
  FCP: {
    good: 1800, // 1.8s
    needsImprovement: 3000, // 3.0s
    poor: Infinity,
  },
} as const;

/**
 * Metric rating
 */
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Web Vitals data interface
 */
export interface WebVitalsData {
  name: string;
  value: number;
  rating: MetricRating;
  delta: number;
  id: string;
  navigationType: string;
  route: string;
  routeGroup: string; // NEW: 'analytics' | 'admin' | 'core'
  featureFlags?: Record<string, boolean>; // NEW: Active feature flags
  timestamp: number;
}

/**
 * OpenTelemetry exporter configuration
 */
export interface OTelConfig {
  endpoint: string;
  serviceName: string;
  environment: string;
  enabled: boolean;
}

/**
 * Default OTel configuration
 */
const DEFAULT_OTEL_CONFIG: OTelConfig = {
  endpoint: process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318/v1/metrics',
  serviceName: 'corp-cockpit-astro',
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.ENABLE_OTEL === 'true' || process.env.NODE_ENV === 'production',
};

/**
 * Get route group from path
 */
export function getRouteGroup(path: string): string {
  if (path.startsWith('/analytics')) return 'analytics';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/analytics-ops')) return 'analytics';
  return 'core';
}

/**
 * Get active feature flags
 */
export function getActiveFeatureFlags(): Record<string, boolean> {
  return {
    analytics_trends: import.meta.env.VITE_FEATURE_ANALYTICS_TRENDS === 'true',
    analytics_engagement: import.meta.env.VITE_FEATURE_ANALYTICS_ENGAGEMENT === 'true',
  };
}

/**
 * Web Vitals Collector
 */
export class WebVitalsCollector {
  private config: OTelConfig;
  private metrics: Map<string, WebVitalsData> = new Map();
  private sendQueue: WebVitalsData[] = [];
  private isSending = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT_MS = 5000; // Send batch every 5 seconds

  constructor(config?: Partial<OTelConfig>) {
    this.config = { ...DEFAULT_OTEL_CONFIG, ...config };
  }

  /**
   * Get current route
   */
  private getCurrentRoute(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
  }

  /**
   * Get navigation type
   */
  private getNavigationType(): string {
    if (typeof window === 'undefined') return 'unknown';

    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navEntry?.type || 'unknown';
  }

  /**
   * Get metric rating
   */
  private getMetricRating(name: string, value: number): MetricRating {
    const thresholds = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Handle metric
   */
  handleMetric(metric: Metric): void {
    const route = this.getCurrentRoute();
    const data: WebVitalsData = {
      name: metric.name,
      value: metric.value,
      rating: this.getMetricRating(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      navigationType: this.getNavigationType(),
      route,
      routeGroup: getRouteGroup(route), // NEW: Add route grouping
      featureFlags: getActiveFeatureFlags(), // NEW: Add feature flag context
      timestamp: Date.now(),
    };

    // Store metric
    this.metrics.set(metric.name, data);

    // Send to OTel if enabled
    if (this.config.enabled) {
      this.queueMetric(data);
    }

    // Log to console in development
    if (this.config.environment === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: data.rating,
        route: data.route,
      });
    }

    // Send to analytics (if available)
    this.sendToAnalytics(data);
  }

  /**
   * Queue metric for batch sending
   */
  private queueMetric(data: WebVitalsData): void {
    this.sendQueue.push(data);

    // Send immediately if batch size reached
    if (this.sendQueue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    } else {
      // Schedule batch send
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      this.batchTimeout = setTimeout(() => this.flushQueue(), this.BATCH_TIMEOUT_MS);
    }
  }

  /**
   * Flush queue and send to OTel
   */
  private async flushQueue(): Promise<void> {
    if (this.isSending || this.sendQueue.length === 0) return;

    this.isSending = true;
    const metricsToSend = [...this.sendQueue];
    this.sendQueue = [];

    try {
      await this.sendToOTel(metricsToSend);
    } catch (error) {
      console.error('[Web Vitals] Failed to send metrics to OTel:', error);
      // Re-queue failed metrics
      this.sendQueue.unshift(...metricsToSend);
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Send metrics to OpenTelemetry collector
   */
  private async sendToOTel(metrics: WebVitalsData[]): Promise<void> {
    if (!this.config.enabled) return;

    const payload = {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.config.serviceName } },
            { key: 'deployment.environment', value: { stringValue: this.config.environment } },
          ],
        },
        scopeMetrics: [{
          scope: {
            name: 'web-vitals',
            version: '1.0.0',
          },
          metrics: metrics.map(metric => ({
            name: `web.vitals.${metric.name.toLowerCase()}`,
            description: `Core Web Vital: ${metric.name}`,
            unit: metric.name === 'CLS' ? '1' : 'ms',
            gauge: {
              dataPoints: [{
                asDouble: metric.value,
                timeUnixNano: metric.timestamp * 1000000, // Convert to nanoseconds
                attributes: [
                  { key: 'rating', value: { stringValue: metric.rating } },
                  { key: 'route', value: { stringValue: metric.route } },
                  { key: 'route_group', value: { stringValue: metric.routeGroup } }, // NEW
                  { key: 'navigation_type', value: { stringValue: metric.navigationType } },
                  { key: 'metric_id', value: { stringValue: metric.id } },
                  // Add feature flag attributes
                  ...(metric.featureFlags ? Object.entries(metric.featureFlags).map(([key, val]) => ({
                    key: `feature.${key}.enabled`,
                    value: { boolValue: val },
                  })) : []),
                ],
              }],
            },
          })),
        }],
      }],
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true, // Important: allows beacon to complete even if page unloads
    });

    if (!response.ok) {
      throw new Error(`OTel export failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send to analytics (Google Analytics, Segment, etc.)
   */
  private sendToAnalytics(data: WebVitalsData): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', data.name, {
        value: Math.round(data.name === 'CLS' ? data.value * 1000 : data.value),
        metric_id: data.id,
        metric_value: data.value,
        metric_delta: data.delta,
        metric_rating: data.rating,
        event_category: 'Web Vitals',
        event_label: data.route,
        non_interaction: true,
      });
    }

    // Segment Analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Web Vitals', {
        metric: data.name,
        value: data.value,
        rating: data.rating,
        route: data.route,
        navigationType: data.navigationType,
      });
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): Map<string, WebVitalsData> {
    return new Map(this.metrics);
  }

  /**
   * Get specific metric
   */
  getMetric(name: string): WebVitalsData | undefined {
    return this.metrics.get(name);
  }

  /**
   * Check if metrics meet budgets
   */
  checkBudgets(): { passed: boolean; violations: Array<{ metric: string; value: number; budget: number }> } {
    const violations: Array<{ metric: string; value: number; budget: number }> = [];

    const lcp = this.metrics.get('LCP');
    if (lcp && lcp.value > WEB_VITALS_THRESHOLDS.LCP.good) {
      violations.push({ metric: 'LCP', value: lcp.value, budget: WEB_VITALS_THRESHOLDS.LCP.good });
    }

    const inp = this.metrics.get('INP');
    if (inp && inp.value > WEB_VITALS_THRESHOLDS.INP.good) {
      violations.push({ metric: 'INP', value: inp.value, budget: WEB_VITALS_THRESHOLDS.INP.good });
    }

    const cls = this.metrics.get('CLS');
    if (cls && cls.value > WEB_VITALS_THRESHOLDS.CLS.good) {
      violations.push({ metric: 'CLS', value: cls.value, budget: WEB_VITALS_THRESHOLDS.CLS.good });
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Destroy collector
   */
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.flushQueue();
  }
}

/**
 * Global collector instance
 */
let globalCollector: WebVitalsCollector | null = null;

/**
 * Initialize Web Vitals collection
 */
export async function initWebVitals(config?: Partial<OTelConfig>): Promise<void> {
  if (typeof window === 'undefined') return;

  // Create collector
  globalCollector = new WebVitalsCollector(config);

  // Dynamic import to reduce bundle size
  const { onLCP, onINP, onCLS, onFID, onTTFB, onFCP } = await import('web-vitals');

  // Collect Core Web Vitals
  onLCP((metric) => globalCollector?.handleMetric(metric));
  onINP((metric) => globalCollector?.handleMetric(metric));
  onCLS((metric) => globalCollector?.handleMetric(metric));

  // Collect additional metrics
  onFID((metric) => globalCollector?.handleMetric(metric));
  onTTFB((metric) => globalCollector?.handleMetric(metric));
  onFCP((metric) => globalCollector?.handleMetric(metric));

  // Flush on page unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      globalCollector?.destroy();
    }
  });
}

/**
 * Get global collector
 */
export function getWebVitalsCollector(): WebVitalsCollector | null {
  return globalCollector;
}

/**
 * Measure custom performance metric
 */
export function measureCustomMetric(name: string, value: number, attributes?: Record<string, string>): void {
  if (!globalCollector) return;

  const data: WebVitalsData = {
    name,
    value,
    rating: 'good',
    delta: value,
    id: `custom-${Date.now()}`,
    navigationType: globalCollector['getNavigationType'](),
    route: globalCollector['getCurrentRoute'](),
    timestamp: Date.now(),
  };

  if (globalCollector['config'].enabled) {
    globalCollector['queueMetric'](data);
  }
}

/**
 * Measure LCP manually
 */
export function measureLCP(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
      resolve(lastEntry?.startTime || null);
      observer.disconnect();
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * Measure INP manually
 */
export function measureINP(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    let maxDuration = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEventTiming[];
      entries.forEach((entry) => {
        // INP considers the processing time + presentation delay
        const duration = entry.processingStart > 0
          ? entry.duration - (entry.processingStart - entry.startTime)
          : entry.duration;
        maxDuration = Math.max(maxDuration, duration);
      });
    });

    try {
      observer.observe({ type: 'event', buffered: true });

      // Return max INP after 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(maxDuration || null);
      }, 5000);
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * Measure CLS manually
 */
export function measureCLS(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShift[]) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });

      // Return CLS after 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 5000);
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * React hook for Web Vitals
 */
export function useWebVitals() {
  const collector = getWebVitalsCollector();

  return {
    metrics: collector?.getMetrics() || new Map(),
    getMetric: (name: string) => collector?.getMetric(name),
    checkBudgets: () => collector?.checkBudgets() || { passed: true, violations: [] },
    measureCustom: (name: string, value: number) => measureCustomMetric(name, value),
  };
}

/**
 * Performance mark helper
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined') {
    performance.mark(name);
  }
}

/**
 * Performance measure helper
 */
export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof performance === 'undefined') return null;

  try {
    const measureEntry = performance.measure(name, startMark, endMark);
    const duration = measureEntry.duration;

    // Send custom metric
    measureCustomMetric(name, duration);

    return duration;
  } catch (error) {
    console.error(`[Performance] Failed to measure ${name}:`, error);
    return null;
  }
}

/**
 * Route change performance tracking
 */
export function trackRouteChange(route: string): void {
  mark(`route-change-start-${route}`);

  // Measure when route is complete (next frame)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const duration = measure(`route-change-${route}`, `route-change-start-${route}`);
      if (duration) {
        console.log(`[Performance] Route change to ${route}: ${duration.toFixed(2)}ms`);
      }
    });
  });
}

/**
 * Component render performance tracking
 */
export function trackComponentRender(componentName: string): () => void {
  const startMark = `component-render-start-${componentName}-${Date.now()}`;
  mark(startMark);

  return () => {
    const endMark = `component-render-end-${componentName}-${Date.now()}`;
    mark(endMark);
    const duration = measure(`component-render-${componentName}`, startMark, endMark);

    if (duration && duration > 100) {
      console.warn(`[Performance] Slow component render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
}

/**
 * Export utilities
 */
export { type Metric } from 'web-vitals';
