/**
 * Sentry Error Tracking Client
 *
 * Provides centralized error tracking and monitoring with:
 * - Automatic error capture and grouping
 * - User and request context enrichment
 * - Performance monitoring integration
 * - Source map support for stack traces
 * - Breadcrumbs for debugging
 * - Release tracking for deployments
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Sentry Engineer
 */
import * as Sentry from '@sentry/node';
export interface SentryConfig {
    dsn: string;
    serviceName: string;
    environment?: string;
    release?: string;
    sampleRate?: number;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
    enableProfiling?: boolean;
    enableTracing?: boolean;
    debug?: boolean;
}
/**
 * Initialize Sentry SDK for error tracking
 */
export declare function initializeSentry(config: SentryConfig): void;
/**
 * Capture an exception with Sentry
 */
export declare function captureException(error: Error, context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
    user?: {
        id?: string;
        email?: string;
        username?: string;
    };
    request?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
        data?: any;
    };
}): string;
/**
 * Capture a message with Sentry
 */
export declare function captureMessage(message: string, level?: Sentry.SeverityLevel, context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
}): string;
/**
 * Add breadcrumb for debugging context
 */
export declare function addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: Record<string, any>): void;
/**
 * Set user context for error tracking
 */
export declare function setUserContext(user: {
    id: string;
    email?: string;
    username?: string;
    companyId?: string;
    role?: string;
}): void;
/**
 * Clear user context
 */
export declare function clearUserContext(): void;
/**
 * Set custom tags for all subsequent events
 */
export declare function setTags(tags: Record<string, string>): void;
/**
 * Set custom context for all subsequent events
 */
export declare function setContext(name: string, context: Record<string, any>): void;
/**
 * Set correlation IDs in Sentry context
 */
export declare function setCorrelationIds(correlationId: string, causationId?: string): void;
/**
 * Set request context for error tracking
 */
export declare function setRequestContext(request: {
    id?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, any>;
    body?: any;
    ip?: string;
    userAgent?: string;
}): void;
/**
 * Start a new Sentry transaction for performance monitoring
 */
export declare function startTransaction(name: string, op: string, description?: string): Sentry.Transaction;
/**
 * Wrap a function with error tracking
 */
export declare function withErrorTracking<T extends (...args: any[]) => any>(fn: T, context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
}): T;
/**
 * Express/Fastify error handler middleware
 */
export declare function errorHandler(error: Error, request: {
    id?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    user?: any;
    ip?: string;
}): void;
/**
 * Flush all pending events to Sentry
 */
export declare function flush(timeout?: number): Promise<boolean>;
/**
 * Close Sentry SDK gracefully
 */
export declare function closeSentry(timeout?: number): Promise<boolean>;
/**
 * Check if Sentry is initialized
 */
export declare function isInitialized(): boolean;
/**
 * Integration helpers
 */
/**
 * Fastify error handler plugin
 */
export declare function fastifyErrorHandler(fastifyRequest: any, error: Error): void;
/**
 * NATS event error handler
 */
export declare function natsErrorHandler(error: Error, eventType: string, eventData: any, correlationId?: string): void;
//# sourceMappingURL=sentry.d.ts.map