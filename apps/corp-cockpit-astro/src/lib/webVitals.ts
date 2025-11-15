/**
 * Web Vitals Client
 *
 * Collects Core Web Vitals metrics and sends them to analytics:
 * - LCP (Largest Contentful Paint): ≤2.5s (good)
 * - FID (First Input Delay): ≤100ms (good) - deprecated in favor of INP
 * - INP (Interaction to Next Paint): ≤200ms (good)
 * - CLS (Cumulative Layout Shift): ≤0.1 (good)
 * - TTFB (Time to First Byte): ≤800ms (good)
 * - FCP (First Contentful Paint): ≤1.8s (good)
 *
 * Features:
 * - Production-only collection (skip in dev)
 * - Configurable sampling rate (default: 10%)
 * - Route attribution for per-page analysis
 * - Session correlation
 * - Sends to analytics endpoint or OpenTelemetry
 *
 * @module lib/webVitals
 */

import type { Metric } from 'web-vitals';

export interface WebVitalsConfig {
  /** Analytics endpoint URL */
  endpoint?: string;
  /** Sampling rate (0-1, default: 0.1 = 10%) */
  sampleRate?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom attributes to include with metrics */
  customAttributes?: Record<string, string | number>;
}

export interface WebVitalsMetric {
  /** Metric name (LCP, FID, INP, CLS, TTFB, FCP) */
  name: string;
  /** Metric value */
  value: number;
  /** Rating: good, needs-improvement, poor */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** Metric delta (change from previous value) */
  delta: number;
  /** Metric ID (unique per page load) */
  id: string;
  /** Current route/page */
  route: string;
  /** Session ID for correlation */
  sessionId: string;
  /** Timestamp (ISO 8601) */
  timestamp: string;
  /** User agent */
  userAgent: string;
  /** Custom attributes */
  attributes?: Record<string, string | number>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<WebVitalsConfig> = {
  endpoint: '/api/analytics/web-vitals',
  sampleRate: 0.1, // 10% sampling
  debug: false,
  customAttributes: {},
};

/**
 * Session ID (persists for page session)
 */
let sessionId: string | null = null;

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (!sessionId) {
    // Try to get from sessionStorage
    try {
      sessionId = sessionStorage.getItem('webVitalsSessionId');
      if (!sessionId) {
        sessionId = generateId();
        sessionStorage.setItem('webVitalsSessionId', sessionId);
      }
    } catch {
      // Fallback if sessionStorage is unavailable
      sessionId = generateId();
    }
  }
  return sessionId;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current route
 */
function getCurrentRoute(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  return window.location.pathname;
}

/**
 * Determine if we should sample this session
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

/**
 * Send metric to analytics endpoint
 */
async function sendMetric(
  metric: WebVitalsMetric,
  endpoint: string,
  debug: boolean
): Promise<void> {
  if (debug) {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  }

  try {
    // Use sendBeacon for reliability (survives page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(metric)], {
        type: 'application/json',
      });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback to fetch
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
        keepalive: true, // Keep request alive even if page unloads
      });
    }
  } catch (error) {
    if (debug) {
      console.error('[Web Vitals] Failed to send metric:', error);
    }
  }
}

/**
 * Convert web-vitals Metric to our WebVitalsMetric format
 */
function formatMetric(
  metric: Metric,
  customAttributes: Record<string, string | number>
): WebVitalsMetric {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    route: getCurrentRoute(),
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    attributes: customAttributes,
  };
}

/**
 * Initialize web vitals collection
 *
 * This should be called once when the app loads, typically in the main layout.
 *
 * @param config - Configuration options
 *
 * @example
 * ```typescript
 * import { initWebVitals } from './lib/webVitals';
 *
 * if (import.meta.env.PROD) {
 *   initWebVitals({
 *     endpoint: '/api/analytics/web-vitals',
 *     sampleRate: 0.1,
 *     debug: false,
 *   });
 * }
 * ```
 */
export async function initWebVitals(config: WebVitalsConfig = {}): Promise<void> {
  // Skip in non-browser environments
  if (typeof window === 'undefined') {
    return;
  }

  // Skip in development mode (unless explicitly enabled)
  if (import.meta.env.DEV && !import.meta.env.PUBLIC_WEB_VITALS_DEV) {
    console.log('[Web Vitals] Skipped (development mode)');
    return;
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Check sampling
  if (!shouldSample(finalConfig.sampleRate)) {
    if (finalConfig.debug) {
      console.log('[Web Vitals] Skipped (not sampled)');
    }
    return;
  }

  if (finalConfig.debug) {
    console.log('[Web Vitals] Initialized', {
      endpoint: finalConfig.endpoint,
      sampleRate: finalConfig.sampleRate,
      sessionId: getSessionId(),
    });
  }

  try {
    // Dynamically import web-vitals (only in browser)
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

    // Collect CLS (Cumulative Layout Shift)
    onCLS((metric) => {
      sendMetric(
        formatMetric(metric, finalConfig.customAttributes),
        finalConfig.endpoint,
        finalConfig.debug
      );
    });

    // Collect FCP (First Contentful Paint)
    onFCP((metric) => {
      sendMetric(
        formatMetric(metric, finalConfig.customAttributes),
        finalConfig.endpoint,
        finalConfig.debug
      );
    });

    // Collect INP (Interaction to Next Paint) - replaces FID
    onINP((metric) => {
      sendMetric(
        formatMetric(metric, finalConfig.customAttributes),
        finalConfig.endpoint,
        finalConfig.debug
      );
    });

    // Collect LCP (Largest Contentful Paint)
    onLCP((metric) => {
      sendMetric(
        formatMetric(metric, finalConfig.customAttributes),
        finalConfig.endpoint,
        finalConfig.debug
      );
    });

    // Collect TTFB (Time to First Byte)
    onTTFB((metric) => {
      sendMetric(
        formatMetric(metric, finalConfig.customAttributes),
        finalConfig.endpoint,
        finalConfig.debug
      );
    });
  } catch (error) {
    console.error('[Web Vitals] Initialization failed:', error);
  }
}

/**
 * Get Web Vitals thresholds for performance budgets
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500, // 2.5s
    poor: 4000, // 4.0s
  },
  FID: {
    good: 100, // 100ms (deprecated, use INP)
    poor: 300, // 300ms
  },
  INP: {
    good: 200, // 200ms
    poor: 500, // 500ms
  },
  CLS: {
    good: 0.1,
    poor: 0.25,
  },
  TTFB: {
    good: 800, // 800ms
    poor: 1800, // 1.8s
  },
  FCP: {
    good: 1800, // 1.8s
    poor: 3000, // 3.0s
  },
} as const;

/**
 * Manually report a custom metric
 *
 * Useful for tracking application-specific metrics
 */
export async function reportCustomMetric(
  name: string,
  value: number,
  config: WebVitalsConfig = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const metric: WebVitalsMetric = {
    name: `custom.${name}`,
    value,
    rating: 'good', // Custom metrics don't have ratings
    delta: 0,
    id: generateId(),
    route: getCurrentRoute(),
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    attributes: finalConfig.customAttributes,
  };

  await sendMetric(metric, finalConfig.endpoint, finalConfig.debug);
}
