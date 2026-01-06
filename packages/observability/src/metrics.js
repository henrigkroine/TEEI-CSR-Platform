/**
 * Prometheus Metrics Client
 *
 * Provides comprehensive application metrics collection with:
 * - HTTP request/response metrics
 * - Database query metrics
 * - Event processing metrics
 * - Custom business metrics
 * - Resource utilization tracking
 * - Default Node.js metrics
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Prometheus Engineer
 */
import client from 'prom-client';
let register = null;
let initialized = false;
// Metric instances
let httpRequestDuration = null;
let httpRequestTotal = null;
let httpRequestSize = null;
let httpResponseSize = null;
let dbQueryDuration = null;
let dbQueryTotal = null;
let eventProcessingDuration = null;
let eventProcessingTotal = null;
let eventPublishTotal = null;
let activeConnections = null;
let queueSize = null;
let errorTotal = null;
/**
 * Initialize Prometheus metrics collection
 */
export function initializeMetrics(config) {
    if (initialized) {
        console.warn('Metrics already initialized');
        return register;
    }
    const { serviceName, enableDefaultMetrics = true, defaultMetricsInterval = 10000, prefix = '' } = config;
    // Create a new registry
    register = new client.Registry();
    // Set default labels for all metrics
    register.setDefaultLabels({
        service: serviceName,
    });
    // Enable default Node.js metrics
    if (enableDefaultMetrics) {
        client.collectDefaultMetrics({
            register,
            prefix: prefix ? `${prefix}_` : '',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            eventLoopMonitoringPrecision: defaultMetricsInterval,
        });
    }
    // HTTP Request Duration (histogram)
    httpRequestDuration = new client.Histogram({
        name: `${prefix}http_request_duration_seconds`,
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code', 'service'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [register],
    });
    // HTTP Request Total (counter)
    httpRequestTotal = new client.Counter({
        name: `${prefix}http_requests_total`,
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'service'],
        registers: [register],
    });
    // HTTP Request Size (histogram)
    httpRequestSize = new client.Histogram({
        name: `${prefix}http_request_size_bytes`,
        help: 'Size of HTTP requests in bytes',
        labelNames: ['method', 'route', 'service'],
        buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
        registers: [register],
    });
    // HTTP Response Size (histogram)
    httpResponseSize = new client.Histogram({
        name: `${prefix}http_response_size_bytes`,
        help: 'Size of HTTP responses in bytes',
        labelNames: ['method', 'route', 'status_code', 'service'],
        buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
        registers: [register],
    });
    // Database Query Duration (histogram)
    dbQueryDuration = new client.Histogram({
        name: `${prefix}db_query_duration_seconds`,
        help: 'Duration of database queries in seconds',
        labelNames: ['operation', 'table', 'service'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [register],
    });
    // Database Query Total (counter)
    dbQueryTotal = new client.Counter({
        name: `${prefix}db_queries_total`,
        help: 'Total number of database queries',
        labelNames: ['operation', 'table', 'status', 'service'],
        registers: [register],
    });
    // Event Processing Duration (histogram)
    eventProcessingDuration = new client.Histogram({
        name: `${prefix}event_processing_duration_seconds`,
        help: 'Duration of event processing in seconds',
        labelNames: ['event_type', 'status', 'service'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [register],
    });
    // Event Processing Total (counter)
    eventProcessingTotal = new client.Counter({
        name: `${prefix}events_processed_total`,
        help: 'Total number of events processed',
        labelNames: ['event_type', 'status', 'service'],
        registers: [register],
    });
    // Event Publish Total (counter)
    eventPublishTotal = new client.Counter({
        name: `${prefix}events_published_total`,
        help: 'Total number of events published',
        labelNames: ['event_type', 'status', 'service'],
        registers: [register],
    });
    // Active Connections (gauge)
    activeConnections = new client.Gauge({
        name: `${prefix}active_connections`,
        help: 'Number of active connections',
        labelNames: ['connection_type', 'service'],
        registers: [register],
    });
    // Queue Size (gauge)
    queueSize = new client.Gauge({
        name: `${prefix}queue_size`,
        help: 'Current size of processing queues',
        labelNames: ['queue_name', 'service'],
        registers: [register],
    });
    // Error Total (counter)
    errorTotal = new client.Counter({
        name: `${prefix}errors_total`,
        help: 'Total number of errors',
        labelNames: ['error_type', 'component', 'service'],
        registers: [register],
    });
    initialized = true;
    console.log(`Prometheus metrics initialized for service: ${serviceName}`);
    console.log(`  - Default metrics: ${enableDefaultMetrics ? 'enabled' : 'disabled'}`);
    console.log(`  - Prefix: ${prefix || 'none'}`);
    return register;
}
/**
 * Get the metrics registry
 */
export function getRegistry() {
    if (!register) {
        throw new Error('Metrics not initialized. Call initializeMetrics() first.');
    }
    return register;
}
/**
 * Get metrics in Prometheus format
 */
export async function getMetrics() {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return register.metrics();
}
/**
 * Get metrics in JSON format
 */
export async function getMetricsJSON() {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return register.getMetricsAsJSON();
}
/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
    if (register) {
        register.resetMetrics();
    }
}
/**
 * HTTP Metrics Helpers
 */
export function recordHttpRequest(method, route, statusCode, durationSeconds, requestSize, responseSize) {
    if (!initialized)
        return;
    const labels = {
        method: method.toUpperCase(),
        route,
        status_code: statusCode.toString(),
    };
    httpRequestDuration?.observe(labels, durationSeconds);
    httpRequestTotal?.inc(labels);
    if (requestSize !== undefined) {
        httpRequestSize?.observe({ method: method.toUpperCase(), route }, requestSize);
    }
    if (responseSize !== undefined) {
        httpResponseSize?.observe({ method: method.toUpperCase(), route, status_code: statusCode.toString() }, responseSize);
    }
}
/**
 * Database Metrics Helpers
 */
export function recordDbQuery(operation, table, durationSeconds, success) {
    if (!initialized)
        return;
    dbQueryDuration?.observe({ operation, table }, durationSeconds);
    dbQueryTotal?.inc({
        operation,
        table,
        status: success ? 'success' : 'error',
    });
}
/**
 * Event Metrics Helpers
 */
export function recordEventProcessing(eventType, durationSeconds, success) {
    if (!initialized)
        return;
    eventProcessingDuration?.observe({ event_type: eventType, status: success ? 'success' : 'error' }, durationSeconds);
    eventProcessingTotal?.inc({
        event_type: eventType,
        status: success ? 'success' : 'error',
    });
}
export function recordEventPublish(eventType, success) {
    if (!initialized)
        return;
    eventPublishTotal?.inc({
        event_type: eventType,
        status: success ? 'success' : 'error',
    });
}
/**
 * Connection Metrics Helpers
 */
export function setActiveConnections(connectionType, count) {
    if (!initialized)
        return;
    activeConnections?.set({ connection_type: connectionType }, count);
}
export function incrementActiveConnections(connectionType, delta = 1) {
    if (!initialized)
        return;
    activeConnections?.inc({ connection_type: connectionType }, delta);
}
export function decrementActiveConnections(connectionType, delta = 1) {
    if (!initialized)
        return;
    activeConnections?.dec({ connection_type: connectionType }, delta);
}
/**
 * Queue Metrics Helpers
 */
export function setQueueSize(queueName, size) {
    if (!initialized)
        return;
    queueSize?.set({ queue_name: queueName }, size);
}
/**
 * Error Metrics Helpers
 */
export function recordError(errorType, component) {
    if (!initialized)
        return;
    errorTotal?.inc({ error_type: errorType, component });
}
/**
 * Custom Metrics Helpers
 */
export function createCounter(name, help, labelNames = []) {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return new client.Counter({
        name,
        help,
        labelNames,
        registers: [register],
    });
}
export function createGauge(name, help, labelNames = []) {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return new client.Gauge({
        name,
        help,
        labelNames,
        registers: [register],
    });
}
export function createHistogram(name, help, labelNames = [], buckets) {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return new client.Histogram({
        name,
        help,
        labelNames,
        buckets,
        registers: [register],
    });
}
export function createSummary(name, help, labelNames = [], percentiles) {
    if (!register) {
        throw new Error('Metrics not initialized');
    }
    return new client.Summary({
        name,
        help,
        labelNames,
        percentiles,
        registers: [register],
    });
}
/**
 * Middleware Helpers
 */
/**
 * Fastify metrics middleware
 */
export function fastifyMetrics() {
    return async (_request, reply) => {
        const startTime = Date.now();
        // Track active connections
        incrementActiveConnections('http');
        reply.addHook('onSend', async (request, reply, payload) => {
            const duration = (Date.now() - startTime) / 1000;
            const requestSize = request.headers['content-length']
                ? parseInt(request.headers['content-length'], 10)
                : undefined;
            const responseSize = payload ? Buffer.byteLength(payload) : undefined;
            recordHttpRequest(request.method, request.routerPath || request.url, reply.statusCode, duration, requestSize, responseSize);
            decrementActiveConnections('http');
        });
    };
}
/**
 * Database query timer helper
 */
export function createDbTimer(operation, table) {
    const startTime = Date.now();
    return {
        end: (success = true) => {
            const duration = (Date.now() - startTime) / 1000;
            recordDbQuery(operation, table, duration, success);
        },
    };
}
/**
 * Event processing timer helper
 */
export function createEventTimer(eventType) {
    const startTime = Date.now();
    return {
        end: (success = true) => {
            const duration = (Date.now() - startTime) / 1000;
            recordEventProcessing(eventType, duration, success);
        },
    };
}
/**
 * Export all metric types for custom usage
 */
export { client as promClient };
//# sourceMappingURL=metrics.js.map