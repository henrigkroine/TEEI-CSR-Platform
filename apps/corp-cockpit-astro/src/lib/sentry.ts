/**
 * Sentry Integration for Analytics Observability
 *
 * Provides error tracking and performance monitoring for analytics pages.
 * Respects privacy by not logging PII in tags or breadcrumbs.
 */

/**
 * Sentry configuration interface
 */
export interface SentryConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  enabled: boolean;
}

/**
 * Context data for Sentry events
 */
export interface SentryContext {
  page?: string;
  featureFlags?: Record<string, boolean>;
  userId?: string; // Should be hashed/anonymized
  sessionId?: string;
}

/**
 * Breadcrumb data
 */
export interface BreadcrumbData {
  message: string;
  category: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

/**
 * Mock Sentry implementation (placeholder until @sentry/browser is installed)
 *
 * In production, replace this with actual Sentry SDK:
 * ```
 * import * as Sentry from '@sentry/browser';
 * import { BrowserTracing } from '@sentry/tracing';
 * ```
 */
class SentryMock {
  private config: SentryConfig;
  private context: SentryContext = {};
  private breadcrumbs: BreadcrumbData[] = [];

  constructor(config: SentryConfig) {
    this.config = config;
  }

  init() {
    if (!this.config.enabled || !this.config.dsn) {
      console.warn('[Sentry] Disabled or DSN not configured');
      return;
    }

    console.log('[Sentry] Initialized (mock mode)', {
      environment: this.config.environment,
      tracesSampleRate: this.config.tracesSampleRate,
    });
  }

  setContext(key: string, data: any) {
    this.context = { ...this.context, ...data };
    console.log('[Sentry] Context set:', key, data);
  }

  addBreadcrumb(breadcrumb: BreadcrumbData) {
    this.breadcrumbs.push({
      ...breadcrumb,
      level: breadcrumb.level || 'info',
    });

    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift();
    }

    console.log('[Sentry] Breadcrumb added:', breadcrumb);
  }

  captureException(error: Error, context?: Record<string, any>) {
    console.error('[Sentry] Exception captured:', {
      error: error.message,
      stack: error.stack,
      context,
      breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
      appContext: this.context,
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[Sentry] Message captured (${level}):`, message, {
      context: this.context,
    });
  }
}

// Singleton instance
let sentryInstance: SentryMock | null = null;

/**
 * Initialize Sentry
 *
 * @param config - Optional configuration (uses env vars by default)
 */
export function initSentry(config?: Partial<SentryConfig>): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip initialization
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN || config?.dsn;
  const environment = import.meta.env.VITE_ENVIRONMENT || config?.environment || 'development';
  const enabled = dsn !== undefined && dsn !== '';

  const finalConfig: SentryConfig = {
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    enabled,
    ...config,
  };

  sentryInstance = new SentryMock(finalConfig);
  sentryInstance.init();
}

/**
 * Get Sentry instance
 */
function getSentry(): SentryMock {
  if (!sentryInstance) {
    initSentry();
  }
  return sentryInstance!;
}

/**
 * Set Sentry context for analytics pages
 *
 * @param context - Context data (page, feature flags, user ID)
 */
export function setSentryContext(context: SentryContext): void {
  const sentry = getSentry();

  // Anonymize user ID if provided (hash it in production)
  const sanitizedContext = {
    ...context,
    userId: context.userId ? hashUserId(context.userId) : undefined,
  };

  sentry.setContext('analytics', sanitizedContext);
}

/**
 * Add breadcrumb for user actions
 *
 * @param message - Breadcrumb message
 * @param category - Category (e.g., 'analytics', 'navigation', 'interaction')
 * @param data - Additional data (ensure no PII)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  const sentry = getSentry();
  sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data: sanitizeData(data),
  });
}

/**
 * Capture exception with context
 *
 * @param error - Error object
 * @param context - Additional context (ensure no PII)
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  const sentry = getSentry();
  sentry.captureException(error, sanitizeData(context));
}

/**
 * Capture message
 *
 * @param message - Message to log
 * @param level - Severity level
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  const sentry = getSentry();
  sentry.captureMessage(message, level);
}

/**
 * Analytics-specific convenience functions
 */

/**
 * Track period change (breadcrumb)
 */
export function trackPeriodChange(period: string, page: string): void {
  addBreadcrumb(`Changed period to ${period}`, 'analytics', { page, period });
}

/**
 * Track severity filter change (breadcrumb)
 */
export function trackSeverityFilter(severity: string, page: string): void {
  addBreadcrumb(`Filtered to ${severity} severity`, 'analytics', { page, severity });
}

/**
 * Track feature flag toggle (breadcrumb)
 */
export function trackFeatureFlagToggle(flag: string, enabled: boolean, page: string): void {
  addBreadcrumb(`Feature flag ${flag} ${enabled ? 'enabled' : 'disabled'}`, 'feature-flag', {
    page,
    flag,
    enabled,
  });
}

/**
 * Track analytics API error
 */
export function trackAnalyticsAPIError(
  endpoint: string,
  error: Error,
  statusCode?: number
): void {
  captureException(error, {
    endpoint,
    statusCode,
    category: 'analytics-api',
  });
}

/**
 * Helper: Hash user ID for anonymization
 */
function hashUserId(userId: string): string {
  // Simple hash for demo (use crypto.subtle.digest in production)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash).toString(16)}`;
}

/**
 * Helper: Sanitize data to remove PII
 */
function sanitizeData(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined;

  const sanitized: Record<string, any> = {};
  const piiKeys = ['email', 'phone', 'address', 'ssn', 'credit_card'];

  for (const [key, value] of Object.entries(data)) {
    if (piiKeys.some((piiKey) => key.toLowerCase().includes(piiKey))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * React Error Boundary component (to be used in React components)
 */
export class SentryErrorBoundary extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SentryErrorBoundary';
  }
}

/**
 * Higher-order function to wrap async functions with error tracking
 */
export function withSentryErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error as Error, context);
      throw error;
    }
  }) as T;
}
