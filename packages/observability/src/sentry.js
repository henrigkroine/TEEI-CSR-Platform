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
import { ProfilingIntegration } from '@sentry/profiling-node';
let initialized = false;
/**
 * Initialize Sentry SDK for error tracking
 */
export function initializeSentry(config) {
    if (initialized) {
        console.warn('Sentry already initialized');
        return;
    }
    const { dsn, serviceName, environment = process.env.NODE_ENV || 'development', release = process.env.RELEASE_VERSION || 'development', sampleRate = 1.0, tracesSampleRate = environment === 'production' ? 0.1 : 1.0, profilesSampleRate = environment === 'production' ? 0.05 : 0.5, enableProfiling = true, enableTracing = true, debug = environment === 'development' } = config;
    const integrations = [
    // Default integrations
    ];
    // Add profiling integration if enabled
    if (enableProfiling) {
        integrations.push(new ProfilingIntegration());
    }
    Sentry.init({
        dsn,
        environment,
        release,
        serverName: serviceName,
        // Sampling configuration
        sampleRate,
        tracesSampleRate: enableTracing ? tracesSampleRate : 0,
        profilesSampleRate: enableProfiling ? profilesSampleRate : 0,
        // Integrations
        integrations,
        // Debug mode
        debug,
        // Attach stack traces
        attachStacktrace: true,
        // Normalize depth for error serialization
        normalizeDepth: 10,
        // Maximum breadcrumbs
        maxBreadcrumbs: 50,
        // Before send hook for filtering/enrichment
        beforeSend(event, hint) {
            // Filter out certain errors in development
            if (environment === 'development') {
                const error = hint.originalException;
                if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                    // Don't send connection errors in development
                    return null;
                }
            }
            // Add custom tags
            event.tags = {
                ...event.tags,
                service: serviceName,
            };
            return event;
        },
        // Before breadcrumb hook for filtering
        beforeBreadcrumb(breadcrumb, _hint) {
            // Filter out noisy breadcrumbs
            if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
                return null;
            }
            return breadcrumb;
        },
    });
    initialized = true;
    console.log(`Sentry initialized for service: ${serviceName}`);
    console.log(`  - Environment: ${environment}`);
    console.log(`  - Release: ${release}`);
    console.log(`  - Sample Rate: ${sampleRate * 100}%`);
    console.log(`  - Traces Sample Rate: ${tracesSampleRate * 100}%`);
    console.log(`  - Profiling: ${enableProfiling ? 'enabled' : 'disabled'}`);
}
/**
 * Capture an exception with Sentry
 */
export function captureException(error, context) {
    if (!initialized) {
        console.error('Sentry not initialized. Call initializeSentry() first.');
        return '';
    }
    return Sentry.captureException(error, {
        level: context?.level || 'error',
        tags: context?.tags,
        extra: context?.extra,
        user: context?.user,
        contexts: {
            ...(context?.request && {
                request: context.request,
            }),
        },
    });
}
/**
 * Capture a message with Sentry
 */
export function captureMessage(message, level = 'info', context) {
    if (!initialized) {
        console.error('Sentry not initialized. Call initializeSentry() first.');
        return '';
    }
    return Sentry.captureMessage(message, {
        level,
        tags: context?.tags,
        extra: context?.extra,
    });
}
/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(message, category, level, data) {
    if (!initialized)
        return;
    Sentry.addBreadcrumb({
        message,
        category: category || 'default',
        level: level || 'info',
        data,
        timestamp: Date.now() / 1000,
    });
}
/**
 * Set user context for error tracking
 */
export function setUserContext(user) {
    if (!initialized)
        return;
    Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        // Custom fields
        companyId: user.companyId,
        role: user.role,
    });
}
/**
 * Clear user context
 */
export function clearUserContext() {
    if (!initialized)
        return;
    Sentry.setUser(null);
}
/**
 * Set custom tags for all subsequent events
 */
export function setTags(tags) {
    if (!initialized)
        return;
    Object.entries(tags).forEach(([key, value]) => {
        Sentry.setTag(key, value);
    });
}
/**
 * Set custom context for all subsequent events
 */
export function setContext(name, context) {
    if (!initialized)
        return;
    Sentry.setContext(name, context);
}
/**
 * Set correlation IDs in Sentry context
 */
export function setCorrelationIds(correlationId, causationId) {
    if (!initialized)
        return;
    setTags({
        correlation_id: correlationId,
        ...(causationId && { causation_id: causationId }),
    });
    setContext('correlation', {
        correlationId,
        causationId,
    });
}
/**
 * Set request context for error tracking
 */
export function setRequestContext(request) {
    if (!initialized)
        return;
    // Filter sensitive headers
    const safeHeaders = request.headers ? { ...request.headers } : {};
    delete safeHeaders['authorization'];
    delete safeHeaders['cookie'];
    setContext('request', {
        id: request.id,
        method: request.method,
        url: request.url,
        headers: safeHeaders,
        query: request.query,
        ip: request.ip,
        userAgent: request.userAgent,
    });
    // Add breadcrumb for request
    addBreadcrumb(`${request.method} ${request.url}`, 'http.request', 'info', {
        method: request.method,
        url: request.url,
    });
}
/**
 * Start a new Sentry transaction for performance monitoring
 */
export function startTransaction(name, op, description) {
    if (!initialized) {
        throw new Error('Sentry not initialized');
    }
    return Sentry.startTransaction({
        name,
        op,
        description,
    });
}
/**
 * Wrap a function with error tracking
 */
export function withErrorTracking(fn, context) {
    return ((...args) => {
        try {
            const result = fn(...args);
            // Handle async functions
            if (result instanceof Promise) {
                return result.catch((error) => {
                    captureException(error, context);
                    throw error;
                });
            }
            return result;
        }
        catch (error) {
            captureException(error, context);
            throw error;
        }
    });
}
/**
 * Express/Fastify error handler middleware
 */
export function errorHandler(error, request) {
    if (!initialized)
        return;
    // Set request context
    setRequestContext({
        id: request.id,
        method: request.method,
        url: request.url,
        headers: request.headers,
        ip: request.ip,
    });
    // Set user context if available
    if (request.user) {
        setUserContext({
            id: request.user.userId || request.user.id,
            email: request.user.email,
            username: request.user.username,
            companyId: request.user.companyId,
            role: request.user.role,
        });
    }
    // Capture the exception
    captureException(error, {
        tags: {
            handler: 'errorHandler',
        },
    });
}
/**
 * Flush all pending events to Sentry
 */
export async function flush(timeout) {
    if (!initialized)
        return false;
    return Sentry.flush(timeout);
}
/**
 * Close Sentry SDK gracefully
 */
export async function closeSentry(timeout) {
    if (!initialized)
        return false;
    const result = await Sentry.close(timeout);
    initialized = false;
    console.log('Sentry SDK closed');
    return result;
}
/**
 * Check if Sentry is initialized
 */
export function isInitialized() {
    return initialized;
}
/**
 * Integration helpers
 */
/**
 * Fastify error handler plugin
 */
export function fastifyErrorHandler(fastifyRequest, error) {
    errorHandler(error, {
        id: fastifyRequest.id,
        method: fastifyRequest.method,
        url: fastifyRequest.url,
        headers: fastifyRequest.headers,
        user: fastifyRequest.user,
        ip: fastifyRequest.ip,
    });
}
/**
 * NATS event error handler
 */
export function natsErrorHandler(error, eventType, eventData, correlationId) {
    if (!initialized)
        return;
    setContext('nats', {
        eventType,
        eventData: JSON.stringify(eventData).substring(0, 500), // Limit size
    });
    if (correlationId) {
        setCorrelationIds(correlationId);
    }
    captureException(error, {
        tags: {
            handler: 'nats',
            eventType,
        },
    });
}
//# sourceMappingURL=sentry.js.map