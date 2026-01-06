/**
 * Observability Package
 *
 * Comprehensive observability toolkit providing:
 * - OpenTelemetry distributed tracing
 * - Sentry error tracking
 * - Prometheus metrics
 * - Structured logging
 * - Health checks
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead
 */
// OpenTelemetry exports
export { initializeOTel, getTracer, startSpan, traceAsync, traceSync, addSpanAttributes, addSpanEvent, recordException, getActiveSpan, getTraceContext, injectTraceContext, extractTraceContext, withExtractedContext, traced, shutdownOTel, addCorrelationIds, getCorrelationIdFromSpan, traceWithCorrelation, } from './otel.js';
// Sentry exports
export { initializeSentry, captureException, captureMessage, addBreadcrumb, setUserContext, clearUserContext, setTags, setContext, setCorrelationIds as setSentryCorrelationIds, setRequestContext, startTransaction, withErrorTracking, errorHandler, fastifyErrorHandler, natsErrorHandler, flush as flushSentry, closeSentry, isInitialized as isSentryInitialized, } from './sentry.js';
// Metrics exports
export { initializeMetrics, getRegistry, getMetrics, getMetricsJSON, resetMetrics, recordHttpRequest, recordDbQuery, recordEventProcessing, recordEventPublish, setActiveConnections, incrementActiveConnections, decrementActiveConnections, setQueueSize, recordError, createCounter, createGauge, createHistogram, createSummary, fastifyMetrics, createDbTimer, createEventTimer, promClient, } from './metrics.js';
// Logging exports
export { createLogger, createChildLogger, createFastifyLogger, StructuredLogger, LogLevel, LOG_PATTERNS, CONTEXT_KEYS, } from './logging.js';
// Health check exports
export { HealthCheckManager, HealthStatus, registerHealthRoutes, createDatabaseHealthCheck, createNatsHealthCheck, createHttpHealthCheck, createRedisHealthCheck, } from './health.js';
// OpenLineage exports
export { OpenLineageEmitter, createOpenLineageEmitter, } from './openlineage.js';
// SLO and Error Budget exports
export { SLOManager, getSLOManager, calculateErrorBudget, evaluateSLO, calculateBurnRateAlerts, PLATFORM_SLOS, } from './slo.js';
// SLO Metrics exports
export { SLOMetrics, getSLOMetrics, registerSLOMetricsEndpoint, generatePrometheusAlertRules, } from './slo-metrics.js';
//# sourceMappingURL=index.js.map