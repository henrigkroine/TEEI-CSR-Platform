/**
 * Real User Monitoring (RUM) for TEEI CSR Platform
 *
 * Collects and reports real user performance metrics:
 * - Core Web Vitals (LCP, FID, CLS, INP, TTFB)
 * - Custom business metrics
 * - Error tracking
 * - User journey analytics
 *
 * Integration points:
 * - OpenTelemetry (metrics export)
 * - Google Analytics 4 (user behavior)
 * - Custom backend API (detailed analytics)
 *
 * @module monitoring/rum
 */

import {
  initWebVitals,
  onMetricReport,
  type Metric,
  type WebVitalsReport,
} from '../utils/webVitals';

/**
 * RUM Configuration
 */
export interface RUMConfig {
  /** Enable RUM tracking */
  enabled: boolean;
  /** API endpoint for metric reporting */
  endpoint?: string;
  /** Sample rate (0-1, where 1 = 100% of users) */
  sampleRate: number;
  /** Enable debug logging */
  debug: boolean;
  /** Custom dimensions */
  dimensions?: Record<string, string | number | boolean>;
}

const DEFAULT_CONFIG: RUMConfig = {
  enabled: true,
  endpoint: '/api/analytics/rum',
  sampleRate: 1.0,
  debug: false,
};

/**
 * Business metric types
 */
export enum BusinessMetric {
  /** Dashboard load time */
  DASHBOARD_LOAD = 'dashboard_load',
  /** Widget render time */
  WIDGET_RENDER = 'widget_render',
  /** API request duration */
  API_REQUEST = 'api_request',
  /** Export generation time */
  EXPORT_GENERATION = 'export_generation',
  /** Chart interaction delay */
  CHART_INTERACTION = 'chart_interaction',
  /** Search query time */
  SEARCH_QUERY = 'search_query',
  /** Filter application time */
  FILTER_APPLICATION = 'filter_application',
}

/**
 * Custom metric data
 */
export interface CustomMetric {
  name: BusinessMetric | string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent';
  tags?: Record<string, string | number>;
  timestamp?: number;
}

/**
 * Error tracking data
 */
export interface ErrorReport {
  message: string;
  stack?: string;
  source: 'script' | 'api' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: number;
  url: string;
  userAgent: string;
}

/**
 * User journey event
 */
export interface JourneyEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  timestamp: number;
}

/**
 * RUM Data Store
 */
class RUMDataStore {
  private metrics: CustomMetric[] = [];
  private errors: ErrorReport[] = [];
  private journey: JourneyEvent[] = [];
  private sessionStart: number = Date.now();
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  addMetric(metric: CustomMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    });
  }

  addError(error: ErrorReport): void {
    this.errors.push(error);
  }

  addJourneyEvent(event: JourneyEvent): void {
    this.journey.push(event);
  }

  getMetrics(): CustomMetric[] {
    return [...this.metrics];
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getJourney(): JourneyEvent[] {
    return [...this.journey];
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStart;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clear(): void {
    this.metrics = [];
    this.errors = [];
    this.journey = [];
  }
}

/**
 * Real User Monitoring Service
 */
export class RUMService {
  private config: RUMConfig;
  private store: RUMDataStore;
  private isInitialized: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RUMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new RUMDataStore();
  }

  /**
   * Initialize RUM tracking
   */
  initialize(): void {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    // Check if user should be sampled
    if (Math.random() > this.config.sampleRate) {
      if (this.config.debug) {
        console.log('[RUM] User not sampled, skipping initialization');
      }
      return;
    }

    // Initialize Web Vitals tracking
    initWebVitals();

    // Listen for Web Vitals metrics
    onMetricReport((metric, report) => {
      this.reportWebVital(metric, report);
    });

    // Track page visibility changes
    this.setupVisibilityTracking();

    // Track errors
    this.setupErrorTracking();

    // Track resource timing
    this.setupResourceTiming();

    // Track long tasks
    this.setupLongTaskTracking();

    // Flush metrics periodically
    this.startAutoFlush(30000); // 30 seconds

    // Flush on page unload
    this.setupUnloadHandler();

    this.isInitialized = true;

    if (this.config.debug) {
      console.log('[RUM] Initialized with session ID:', this.store.getSessionId());
    }
  }

  /**
   * Report Web Vital metric
   */
  private reportWebVital(metric: Metric, report: WebVitalsReport): void {
    const customMetric: CustomMetric = {
      name: `web_vital_${metric.name.toLowerCase()}`,
      value: metric.value,
      unit: 'ms',
      tags: {
        rating: metric.rating,
        navigation_type: metric.navigationType,
        device_type: report.deviceType,
      },
    };

    this.store.addMetric(customMetric);

    if (this.config.debug) {
      console.log('[RUM] Web Vital:', metric.name, metric.value, metric.rating);
    }
  }

  /**
   * Track custom business metric
   */
  trackMetric(metric: CustomMetric): void {
    if (!this.isInitialized) return;

    this.store.addMetric(metric);

    if (this.config.debug) {
      console.log('[RUM] Custom metric:', metric.name, metric.value, metric.unit);
    }
  }

  /**
   * Track API request performance
   */
  trackAPIRequest(
    endpoint: string,
    duration: number,
    status: number,
    cached: boolean = false
  ): void {
    this.trackMetric({
      name: BusinessMetric.API_REQUEST,
      value: duration,
      unit: 'ms',
      tags: {
        endpoint,
        status,
        cached: cached ? 'true' : 'false',
      },
    });
  }

  /**
   * Track dashboard load time
   */
  trackDashboardLoad(duration: number, widgetCount: number): void {
    this.trackMetric({
      name: BusinessMetric.DASHBOARD_LOAD,
      value: duration,
      unit: 'ms',
      tags: {
        widget_count: widgetCount,
      },
    });
  }

  /**
   * Track widget render time
   */
  trackWidgetRender(widgetName: string, duration: number): void {
    this.trackMetric({
      name: BusinessMetric.WIDGET_RENDER,
      value: duration,
      unit: 'ms',
      tags: {
        widget: widgetName,
      },
    });
  }

  /**
   * Track user journey event
   */
  trackEvent(
    action: string,
    category: string,
    label?: string,
    value?: number
  ): void {
    if (!this.isInitialized) return;

    this.store.addJourneyEvent({
      action,
      category,
      label,
      value,
      timestamp: Date.now(),
    });

    if (this.config.debug) {
      console.log('[RUM] Journey event:', category, action, label);
    }
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    source: ErrorReport['source'] = 'script',
    severity: ErrorReport['severity'] = 'medium',
    metadata?: Record<string, any>
  ): void {
    if (!this.isInitialized) return;

    const errorReport: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      source,
      severity,
      metadata,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.store.addError(errorReport);

    if (this.config.debug) {
      console.error('[RUM] Error tracked:', errorReport);
    }

    // Flush immediately for critical errors
    if (severity === 'critical') {
      this.flush();
    }
  }

  /**
   * Setup visibility tracking
   */
  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackEvent('page_hidden', 'engagement');
        this.flush(); // Flush metrics when user leaves
      } else {
        this.trackEvent('page_visible', 'engagement');
      }
    });
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError(
        event.error || event.message,
        'script',
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        event.reason || 'Unhandled promise rejection',
        'script',
        'high',
        {
          promise: event.promise,
        }
      );
    });
  }

  /**
   * Setup resource timing tracking
   */
  private setupResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        // Track slow resources (>1s)
        if (entry.duration > 1000) {
          this.trackMetric({
            name: 'slow_resource',
            value: entry.duration,
            unit: 'ms',
            tags: {
              resource: entry.name,
              type: entry.initiatorType,
            },
          });
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Setup long task tracking
   */
  private setupLongTaskTracking(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.trackMetric({
            name: 'long_task',
            value: entry.duration,
            unit: 'ms',
            tags: {
              attribution: entry.attribution?.[0]?.name || 'unknown',
            },
          });
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long task API not supported
      if (this.config.debug) {
        console.warn('[RUM] Long task tracking not supported');
      }
    }
  }

  /**
   * Setup unload handler to flush remaining metrics
   */
  private setupUnloadHandler(): void {
    // Use sendBeacon for reliable delivery on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Also flush on page hide (for mobile browsers)
    window.addEventListener('pagehide', () => {
      this.flush(true);
    });
  }

  /**
   * Start automatic periodic flushing
   */
  private startAutoFlush(intervalMs: number): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  /**
   * Stop automatic flushing
   */
  private stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Flush collected metrics to backend
   */
  async flush(useBeacon: boolean = false): Promise<void> {
    if (!this.config.enabled || !this.config.endpoint) {
      if (this.config.debug) {
        console.log('[RUM] Flushing disabled or no endpoint configured');
      }
      return;
    }

    const metrics = this.store.getMetrics();
    const errors = this.store.getErrors();
    const journey = this.store.getJourney();

    if (metrics.length === 0 && errors.length === 0 && journey.length === 0) {
      return; // Nothing to flush
    }

    const payload = {
      sessionId: this.store.getSessionId(),
      sessionDuration: this.store.getSessionDuration(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      dimensions: this.config.dimensions,
      metrics,
      errors,
      journey,
      timestamp: Date.now(),
    };

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliable delivery
        const success = navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify(payload)
        );

        if (this.config.debug) {
          console.log('[RUM] Beacon sent:', success);
        }
      } else {
        // Use fetch for regular delivery
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });

        if (this.config.debug) {
          console.log('[RUM] Metrics flushed:', metrics.length, 'metrics');
        }
      }

      // Clear store after successful flush
      this.store.clear();
    } catch (error) {
      console.error('[RUM] Failed to flush metrics:', error);
    }
  }

  /**
   * Destroy RUM service
   */
  destroy(): void {
    this.stopAutoFlush();
    this.flush(true);
    this.isInitialized = false;
  }
}

// Singleton instance
let rumInstance: RUMService | null = null;

/**
 * Get RUM service singleton
 */
export function getRUM(): RUMService {
  if (!rumInstance) {
    rumInstance = new RUMService();
  }
  return rumInstance;
}

/**
 * Initialize RUM with configuration
 */
export function initializeRUM(config?: Partial<RUMConfig>): RUMService {
  const rum = config ? new RUMService(config) : getRUM();
  rum.initialize();
  return rum;
}

/**
 * Export convenience functions
 */
export const trackMetric = (metric: CustomMetric) => getRUM().trackMetric(metric);
export const trackEvent = (action: string, category: string, label?: string, value?: number) =>
  getRUM().trackEvent(action, category, label, value);
export const trackError = (
  error: Error | string,
  source?: ErrorReport['source'],
  severity?: ErrorReport['severity'],
  metadata?: Record<string, any>
) => getRUM().trackError(error, source, severity, metadata);
export const trackAPIRequest = (
  endpoint: string,
  duration: number,
  status: number,
  cached?: boolean
) => getRUM().trackAPIRequest(endpoint, duration, status, cached);
export const trackDashboardLoad = (duration: number, widgetCount: number) =>
  getRUM().trackDashboardLoad(duration, widgetCount);
export const trackWidgetRender = (widgetName: string, duration: number) =>
  getRUM().trackWidgetRender(widgetName, duration);
