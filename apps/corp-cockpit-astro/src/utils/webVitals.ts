/**
 * Web Vitals Tracker
 * Real User Monitoring (RUM) for Core Web Vitals with OpenTelemetry integration
 * Tracks LCP, FID, CLS, TTFB, INP for WCAG 2.2 performance compliance
 */

/**
 * Core Web Vitals thresholds (Google's recommended values)
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint (seconds)
  LCP: {
    good: 2.5,
    needsImprovement: 4.0,
  },
  // First Input Delay (milliseconds)
  FID: {
    good: 100,
    needsImprovement: 300,
  },
  // Cumulative Layout Shift (score)
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
  },
  // Time to First Byte (milliseconds)
  TTFB: {
    good: 800,
    needsImprovement: 1800,
  },
  // Interaction to Next Paint (milliseconds)
  INP: {
    good: 200,
    needsImprovement: 500,
  },
} as const;

export type MetricName = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface Metric {
  /**
   * The name of the metric
   */
  name: MetricName;

  /**
   * The current value of the metric
   */
  value: number;

  /**
   * The rating of the metric
   */
  rating: MetricRating;

  /**
   * The delta since the last report
   */
  delta: number;

  /**
   * A unique ID for the metric
   */
  id: string;

  /**
   * The navigation type (navigate, reload, back-forward, prerender)
   */
  navigationType: string;
}

export interface WebVitalsReport {
  metrics: Partial<Record<MetricName, Metric>>;
  timestamp: number;
  url: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
}

/**
 * Determines the rating for a metric based on its value
 */
function getRating(
  name: MetricName,
  value: number
): MetricRating {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Detects device type based on user agent and screen size
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /tablet|ipad/i.test(ua);

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

/**
 * Gets the connection type from Navigator
 */
function getConnectionType(): string | undefined {
  const nav = navigator as any;
  if (nav.connection) {
    return nav.connection.effectiveType || nav.connection.type;
  }
  return undefined;
}

/**
 * In-memory storage for collected metrics
 */
const metricsStore: WebVitalsReport = {
  metrics: {},
  timestamp: Date.now(),
  url: typeof window !== 'undefined' ? window.location.href : '',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  deviceType: typeof navigator !== 'undefined' ? getDeviceType() : 'desktop',
  connectionType: typeof navigator !== 'undefined' ? getConnectionType() : undefined,
};

/**
 * Callback type for metric reporting
 */
export type MetricReportCallback = (metric: Metric, report: WebVitalsReport) => void;

const reportCallbacks: MetricReportCallback[] = [];

/**
 * Registers a callback to be called when metrics are reported
 */
export function onMetricReport(callback: MetricReportCallback): () => void {
  reportCallbacks.push(callback);
  return () => {
    const index = reportCallbacks.indexOf(callback);
    if (index > -1) {
      reportCallbacks.splice(index, 1);
    }
  };
}

/**
 * Reports a metric to all registered callbacks
 */
function reportMetric(metric: Metric): void {
  metricsStore.metrics[metric.name] = metric;
  reportCallbacks.forEach((callback) => {
    try {
      callback(metric, metricsStore);
    } catch (error) {
      console.error('Error in metric report callback:', error);
    }
  });
}

/**
 * Measures Largest Contentful Paint (LCP)
 */
function measureLCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;

      if (lastEntry) {
        const metric: Metric = {
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: getRating('LCP', (lastEntry.renderTime || lastEntry.loadTime) / 1000),
          delta: lastEntry.renderTime || lastEntry.loadTime,
          id: `lcp-${Date.now()}`,
          navigationType: (performance as any).navigation?.type || 'navigate',
        };
        reportMetric(metric);
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.error('Error measuring LCP:', error);
  }
}

/**
 * Measures First Input Delay (FID)
 */
function measureFID(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const metric: Metric = {
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: getRating('FID', entry.processingStart - entry.startTime),
          delta: entry.processingStart - entry.startTime,
          id: `fid-${Date.now()}`,
          navigationType: (performance as any).navigation?.type || 'navigate',
        };
        reportMetric(metric);
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    console.error('Error measuring FID:', error);
  }
}

/**
 * Measures Cumulative Layout Shift (CLS)
 */
function measureCLS(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    let clsValue = 0;
    let clsEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      const metric: Metric = {
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: `cls-${Date.now()}`,
        navigationType: (performance as any).navigation?.type || 'navigate',
      };
      reportMetric(metric);
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    // Report final CLS on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        observer.takeRecords();
        observer.disconnect();
      }
    });
  } catch (error) {
    console.error('Error measuring CLS:', error);
  }
}

/**
 * Measures Time to First Byte (TTFB)
 */
function measureTTFB(): void {
  try {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as any;
    if (navigationTiming) {
      const ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
      const metric: Metric = {
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb,
        id: `ttfb-${Date.now()}`,
        navigationType: navigationTiming.type || 'navigate',
      };
      reportMetric(metric);
    }
  } catch (error) {
    console.error('Error measuring TTFB:', error);
  }
}

/**
 * Measures Interaction to Next Paint (INP)
 */
function measureINP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    let maxDuration = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.duration > maxDuration) {
          maxDuration = entry.duration;
          const metric: Metric = {
            name: 'INP',
            value: entry.duration,
            rating: getRating('INP', entry.duration),
            delta: entry.duration,
            id: `inp-${Date.now()}`,
            navigationType: (performance as any).navigation?.type || 'navigate',
          };
          reportMetric(metric);
        }
      });
    });

    // Observe event timing for interactions
    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any);
  } catch (error) {
    console.error('Error measuring INP:', error);
  }
}

/**
 * Measures First Contentful Paint (FCP)
 */
function measureFCP(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        // FCP (First Contentful Paint) is not tracked as it lacks official thresholds
        // Uncomment if FCP is added back to MetricName type
        // if (entry.name === 'first-contentful-paint') {
        //   const metric: Metric = {
        //     name: 'FCP',
        //     value: entry.startTime,
        //     rating: 'good', // FCP doesn't have official thresholds
        //     delta: entry.startTime,
        //     id: `fcp-${Date.now()}`,
        //     navigationType: (performance as any).navigation?.type || 'navigate',
        //   };
        //   reportMetric(metric);
        // }
      });
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (error) {
    console.error('Error measuring FCP:', error);
  }
}

/**
 * Initializes Web Vitals tracking
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Wait for page load to start measuring
  if (document.readyState === 'complete') {
    startMeasurements();
  } else {
    window.addEventListener('load', startMeasurements, { once: true });
  }
}

function startMeasurements(): void {
  measureLCP();
  measureFID();
  measureCLS();
  measureTTFB();
  measureINP();
  measureFCP();
}

/**
 * Gets the current metrics report
 */
export function getMetricsReport(): WebVitalsReport {
  return { ...metricsStore };
}

/**
 * OpenTelemetry Integration (Stub)
 * In production, this would send metrics to an OpenTelemetry collector
 */
interface OpenTelemetryConfig {
  endpoint: string;
  serviceName: string;
  environment: string;
}

let otelConfig: OpenTelemetryConfig | null = null;

/**
 * Configures OpenTelemetry integration
 */
export function configureOpenTelemetry(config: OpenTelemetryConfig): void {
  otelConfig = config;
}

/**
 * Sends metrics to OpenTelemetry collector
 * This is a stub implementation - in production, use @opentelemetry/api
 */
async function sendToOpenTelemetry(metric: Metric, report: WebVitalsReport): Promise<void> {
  if (!otelConfig) return;

  try {
    // In production, use OpenTelemetry SDK to send metrics
    // For now, this is a stub that logs to console
    console.log('[OpenTelemetry] Sending metric:', {
      service: otelConfig.serviceName,
      environment: otelConfig.environment,
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: report.timestamp,
      url: report.url,
      deviceType: report.deviceType,
      connectionType: report.connectionType,
    });

    // Stub: In production, send to OpenTelemetry collector endpoint
    // await fetch(otelConfig.endpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ ...metric, ...report }),
    // });
  } catch (error) {
    console.error('[OpenTelemetry] Error sending metric:', error);
  }
}

/**
 * Enables OpenTelemetry reporting
 */
export function enableOpenTelemetryReporting(config: OpenTelemetryConfig): () => void {
  configureOpenTelemetry(config);
  return onMetricReport(sendToOpenTelemetry);
}

/**
 * Console reporter for development
 */
export function enableConsoleReporting(): () => void {
  return onMetricReport((metric, report) => {
    console.log('[Web Vitals]', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      deviceType: report.deviceType,
      url: report.url,
    });
  });
}

/**
 * Analytics integration (for Google Analytics, Mixpanel, etc.)
 */
export function sendToAnalytics(metric: Metric): void {
  // Send to Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }

  // Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    const endpoint = '/api/analytics/web-vitals';
    navigator.sendBeacon?.(
      endpoint,
      JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
      })
    );
  }
}

/**
 * Performance marks and measures
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      return entries.length > 0 ? (entries[0] as PerformanceMeasure).duration : null;
    } catch (error) {
      console.error('Error measuring performance:', error);
      return null;
    }
  }
  return null;
}

/**
 * Resource timing analysis
 */
export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

export function getResourceTimings(): ResourceTiming[] {
  if (typeof performance === 'undefined') return [];

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return resources.map((resource) => ({
    name: resource.name,
    duration: resource.duration,
    size: resource.transferSize || 0,
    type: resource.initiatorType,
  }));
}

/**
 * Gets slow resources (>1s load time)
 */
export function getSlowResources(): ResourceTiming[] {
  return getResourceTimings().filter((resource) => resource.duration > 1000);
}

/**
 * Export default initialization function
 */
export default function initializeWebVitals() {
  initWebVitals();

  // Enable console reporting in development
  if (import.meta.env.DEV) {
    enableConsoleReporting();
  }

  // Enable analytics reporting in production
  if (import.meta.env.PROD) {
    onMetricReport(sendToAnalytics);
  }
}
