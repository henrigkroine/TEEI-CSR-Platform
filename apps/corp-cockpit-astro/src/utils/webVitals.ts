/**
 * Web Vitals Collection and OpenTelemetry Integration
 *
 * This module collects Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and sends them
 * to an OpenTelemetry collector for real-user monitoring (RUM).
 *
 * Features:
 * - Automatic collection of all Core Web Vitals
 * - Batching of metrics to reduce network overhead
 * - Context enrichment (URL, tenant ID, user role)
 * - Performance budget validation and warnings
 * - Graceful degradation if OTel collector is unavailable
 * - Privacy-first: no PII collection
 * - Minimal performance overhead (< 10KB)
 *
 * @module webVitals
 */

import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Performance budget thresholds aligned with enterprise standards
 * Based on Core Web Vitals "Good" thresholds
 */
export const PERFORMANCE_BUDGETS = {
  LCP: 2000,  // Largest Contentful Paint: ≤ 2.0s
  INP: 200,   // Interaction to Next Paint: ≤ 200ms
  CLS: 0.1,   // Cumulative Layout Shift: ≤ 0.1
  FCP: 1800,  // First Contentful Paint: ≤ 1.8s (recommended)
  TTFB: 800,  // Time to First Byte: ≤ 800ms (recommended)
} as const;

/**
 * Configuration for RUM collection
 * Loaded from environment variables at runtime
 */
interface RUMConfig {
  /** Whether RUM collection is enabled */
  enabled: boolean;
  /** OpenTelemetry collector endpoint URL */
  otelCollectorUrl: string;
  /** Batch size before sending to collector */
  batchSize: number;
  /** Maximum time to wait before flushing batch (ms) */
  flushInterval: number;
}

/**
 * Context information attached to each web vital metric
 */
interface MetricContext {
  /** Current page URL (pathname only, no query params for privacy) */
  url: string;
  /** Tenant/company ID if available in URL or context */
  tenantId?: string;
  /** User role if available (e.g., 'admin', 'viewer') */
  userRole?: string;
  /** Browser viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Connection info (for context, not PII) */
  connection?: {
    effectiveType?: string;
    rtt?: number;
  };
  /** Session ID for correlating metrics (generated client-side) */
  sessionId: string;
}

/**
 * Enriched web vital metric with context and OTel metadata
 */
interface EnrichedMetric {
  /** Metric name (LCP, INP, CLS, FCP, TTFB) */
  name: string;
  /** Metric value */
  value: number;
  /** Rating (good, needs-improvement, poor) */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** Unique metric ID from web-vitals library */
  id: string;
  /** Navigation type (navigate, reload, back-forward, prerender) */
  navigationType: string;
  /** Timestamp when metric was collected */
  timestamp: number;
  /** Page context information */
  context: MetricContext;
  /** Performance budget status */
  budgetStatus: {
    withinBudget: boolean;
    budget: number;
    overage?: number;
  };
}

/**
 * OpenTelemetry metric payload format
 * Follows OTel metrics data model
 */
interface OTelMetricPayload {
  /** Resource attributes (app/environment info) */
  resource: {
    attributes: {
      'service.name': string;
      'service.version': string;
      'deployment.environment': string;
    };
  };
  /** Scope/instrumentation info */
  scope: {
    name: string;
    version: string;
  };
  /** Metrics array */
  metrics: Array<{
    name: string;
    description: string;
    unit: string;
    data: {
      dataPoints: Array<{
        attributes: Record<string, string | number | boolean>;
        timeUnixNano: string;
        value: number;
      }>;
    };
  }>;
}

/**
 * In-memory batch of collected metrics
 */
class MetricBatch {
  private metrics: EnrichedMetric[] = [];
  private flushTimer: number | null = null;

  constructor(
    private config: RUMConfig,
    private onFlush: (metrics: EnrichedMetric[]) => Promise<void>
  ) {}

  /**
   * Add a metric to the batch
   * Triggers flush if batch size reached
   */
  add(metric: EnrichedMetric): void {
    this.metrics.push(metric);

    // Log budget violations immediately
    if (!metric.budgetStatus.withinBudget) {
      console.warn(
        `[RUM] Performance budget exceeded for ${metric.name}:`,
        `${metric.value}${metric.name === 'CLS' ? '' : 'ms'} (budget: ${metric.budgetStatus.budget}${metric.name === 'CLS' ? '' : 'ms'})`,
        `Overage: ${metric.budgetStatus.overage}${metric.name === 'CLS' ? '' : 'ms'}`
      );
    }

    // Flush if batch size reached
    if (this.metrics.length >= this.config.batchSize) {
      this.flush();
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush();
    }
  }

  /**
   * Schedule automatic flush after configured interval
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;

    this.flushTimer = window.setTimeout(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Immediately flush all metrics to OTel collector
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    // Clear scheduled flush
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Get metrics and clear batch
    const metricsToSend = [...this.metrics];
    this.metrics = [];

    // Send to OTel collector
    try {
      await this.onFlush(metricsToSend);
    } catch (error) {
      console.error('[RUM] Failed to flush metrics:', error);
      // Don't retry - gracefully degrade
    }
  }

  /**
   * Get current batch size
   */
  size(): number {
    return this.metrics.length;
  }
}

/**
 * Web Vitals collector class
 * Singleton pattern to ensure only one instance
 */
class WebVitalsCollector {
  private config: RUMConfig;
  private batch: MetricBatch;
  private sessionId: string;
  private context: Omit<MetricContext, 'url'>;
  private initialized = false;

  constructor() {
    this.config = this.loadConfig();
    this.sessionId = this.generateSessionId();
    this.context = this.buildContext();
    this.batch = new MetricBatch(this.config, this.sendToOTel.bind(this));
  }

  /**
   * Load configuration from environment and window
   */
  private loadConfig(): RUMConfig {
    // Check if RUM is enabled via env var or meta tag
    const enabled = this.isRUMEnabled();

    // Get OTel collector URL from meta tag or default
    const otelCollectorUrl = this.getOTelCollectorUrl();

    return {
      enabled,
      otelCollectorUrl,
      batchSize: 10, // Send after 10 metrics
      flushInterval: 30000, // Or after 30 seconds
    };
  }

  /**
   * Check if RUM collection is enabled
   */
  private isRUMEnabled(): boolean {
    // Check meta tag first (set by server)
    const metaTag = document.querySelector('meta[name="rum-enabled"]');
    if (metaTag) {
      return metaTag.getAttribute('content') === 'true';
    }

    // Check production environment
    return import.meta.env.PROD;
  }

  /**
   * Get OTel collector URL from meta tag
   */
  private getOTelCollectorUrl(): string {
    const metaTag = document.querySelector('meta[name="otel-collector-url"]');
    if (metaTag) {
      return metaTag.getAttribute('content') || '';
    }
    return '';
  }

  /**
   * Generate a client-side session ID
   * Used for correlating metrics within a user session
   */
  private generateSessionId(): string {
    // Try to get existing session ID from sessionStorage
    const existingId = sessionStorage.getItem('rum-session-id');
    if (existingId) return existingId;

    // Generate new session ID
    const newId = `rum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('rum-session-id', newId);
    return newId;
  }

  /**
   * Build metric context from current page and environment
   */
  private buildContext(): Omit<MetricContext, 'url'> {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Extract tenant ID from URL if present
    // Pattern: /en/cockpit/{companyId}/...
    const tenantIdMatch = window.location.pathname.match(/\/cockpit\/([^/]+)/);
    const tenantId = tenantIdMatch ? tenantIdMatch[1] : undefined;

    // Get user role from sessionStorage (if set by auth)
    const userRole = sessionStorage.getItem('user-role') || undefined;

    // Get connection info if available
    const nav = navigator as Navigator & { connection?: any };
    const connection = nav.connection
      ? {
          effectiveType: nav.connection.effectiveType,
          rtt: nav.connection.rtt,
        }
      : undefined;

    return {
      tenantId,
      userRole,
      viewport,
      connection,
      sessionId: this.sessionId,
    };
  }

  /**
   * Enrich a web-vitals metric with context and budget info
   */
  private enrichMetric(metric: Metric): EnrichedMetric {
    const budget = PERFORMANCE_BUDGETS[metric.name as keyof typeof PERFORMANCE_BUDGETS];
    const withinBudget = metric.value <= budget;
    const overage = withinBudget ? undefined : metric.value - budget;

    return {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      context: {
        ...this.context,
        url: window.location.pathname, // pathname only, no query params
      },
      budgetStatus: {
        withinBudget,
        budget,
        overage,
      },
    };
  }

  /**
   * Convert enriched metrics to OTel payload format
   */
  private createOTelPayload(metrics: EnrichedMetric[]): OTelMetricPayload {
    return {
      resource: {
        attributes: {
          'service.name': 'corp-cockpit-frontend',
          'service.version': '0.1.0',
          'deployment.environment': import.meta.env.PROD ? 'production' : 'development',
        },
      },
      scope: {
        name: 'web-vitals-collector',
        version: '1.0.0',
      },
      metrics: metrics.map((metric) => ({
        name: `web.vitals.${metric.name.toLowerCase()}`,
        description: `${metric.name} metric from real user monitoring`,
        unit: metric.name === 'CLS' ? '1' : 'ms',
        data: {
          dataPoints: [
            {
              attributes: {
                'metric.rating': metric.rating,
                'metric.navigation_type': metric.navigationType,
                'page.url': metric.context.url,
                'page.tenant_id': metric.context.tenantId || 'unknown',
                'user.role': metric.context.userRole || 'unknown',
                'viewport.width': metric.context.viewport.width,
                'viewport.height': metric.context.viewport.height,
                'session.id': metric.context.sessionId,
                'budget.within': metric.budgetStatus.withinBudget,
                'budget.threshold': metric.budgetStatus.budget,
                ...(metric.context.connection && {
                  'connection.effective_type': metric.context.connection.effectiveType || 'unknown',
                  'connection.rtt': metric.context.connection.rtt || 0,
                }),
              },
              timeUnixNano: (metric.timestamp * 1_000_000).toString(),
              value: metric.value,
            },
          ],
        },
      })),
    };
  }

  /**
   * Send metrics to OTel collector
   */
  private async sendToOTel(metrics: EnrichedMetric[]): Promise<void> {
    if (!this.config.otelCollectorUrl) {
      console.debug('[RUM] OTel collector URL not configured, skipping send');
      return;
    }

    const payload = this.createOTelPayload(metrics);

    try {
      const response = await fetch(this.config.otelCollectorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Use keepalive to ensure request completes even if page unloads
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`OTel collector responded with ${response.status}`);
      }

      console.debug(`[RUM] Sent ${metrics.length} metrics to OTel collector`);
    } catch (error) {
      // Gracefully degrade - log but don't throw
      console.error('[RUM] Failed to send metrics to OTel collector:', error);
      throw error; // Re-throw for batch error handling
    }
  }

  /**
   * Handle a web-vitals metric
   */
  private handleMetric(metric: Metric): void {
    const enriched = this.enrichMetric(metric);
    this.batch.add(enriched);
  }

  /**
   * Initialize web vitals collection
   * Call this once per page load
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[RUM] Web vitals collection already initialized');
      return;
    }

    if (!this.config.enabled) {
      console.debug('[RUM] Web vitals collection disabled');
      return;
    }

    console.debug('[RUM] Initializing web vitals collection');

    // Register handlers for all Core Web Vitals
    onLCP((metric) => this.handleMetric(metric));
    onINP((metric) => this.handleMetric(metric));
    onCLS((metric) => this.handleMetric(metric));
    onFCP((metric) => this.handleMetric(metric));
    onTTFB((metric) => this.handleMetric(metric));

    // Flush batch on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.batch.flush();
      }
    });

    // Also flush on beforeunload as backup
    window.addEventListener('beforeunload', () => {
      this.batch.flush();
    });

    this.initialized = true;
  }

  /**
   * Manually flush any pending metrics
   * Useful for testing
   */
  async flush(): Promise<void> {
    await this.batch.flush();
  }

  /**
   * Get current batch size
   * Useful for testing
   */
  getBatchSize(): number {
    return this.batch.size();
  }

  /**
   * Check if collector is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Singleton instance
let collector: WebVitalsCollector | null = null;

/**
 * Initialize web vitals collection
 * Safe to call multiple times - will only initialize once
 *
 * @example
 * ```typescript
 * // In your main layout or client entry point:
 * initWebVitals();
 * ```
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') {
    // Skip in SSR
    return;
  }

  if (!collector) {
    collector = new WebVitalsCollector();
  }

  collector.initialize();
}

/**
 * Manually flush any pending metrics
 * Useful for testing or before navigation
 *
 * @example
 * ```typescript
 * await flushWebVitals();
 * ```
 */
export async function flushWebVitals(): Promise<void> {
  if (!collector) return;
  await collector.flush();
}

/**
 * Get current batch size
 * Useful for testing
 */
export function getWebVitalsBatchSize(): number {
  if (!collector) return 0;
  return collector.getBatchSize();
}

/**
 * Check if web vitals collection is enabled
 */
export function isWebVitalsEnabled(): boolean {
  if (!collector) return false;
  return collector.isEnabled();
}

/**
 * Compare a metric value against performance budget
 * Returns detailed budget comparison
 *
 * @example
 * ```typescript
 * const status = checkPerformanceBudget('LCP', 2500);
 * if (!status.withinBudget) {
 *   console.warn('LCP exceeded budget by', status.overage, 'ms');
 * }
 * ```
 */
export function checkPerformanceBudget(
  metricName: keyof typeof PERFORMANCE_BUDGETS,
  value: number
): {
  withinBudget: boolean;
  budget: number;
  overage: number | null;
  percentage: number;
} {
  const budget = PERFORMANCE_BUDGETS[metricName];
  const withinBudget = value <= budget;
  const overage = withinBudget ? null : value - budget;
  const percentage = (value / budget) * 100;

  return {
    withinBudget,
    budget,
    overage,
    percentage,
  };
}

/**
 * Export types for external use
 */
export type {
  EnrichedMetric,
  MetricContext,
  OTelMetricPayload,
  RUMConfig,
};
