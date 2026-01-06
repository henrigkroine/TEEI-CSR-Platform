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
export { initializeOTel, getTracer, startSpan, traceAsync, traceSync, addSpanAttributes, addSpanEvent, recordException, getActiveSpan, getTraceContext, injectTraceContext, extractTraceContext, withExtractedContext, traced, shutdownOTel, addCorrelationIds, getCorrelationIdFromSpan, traceWithCorrelation, type OTelConfig, type CorrelationContext, } from './otel.js';
export { initializeSentry, captureException, captureMessage, addBreadcrumb, setUserContext, clearUserContext, setTags, setContext, setCorrelationIds as setSentryCorrelationIds, setRequestContext, startTransaction, withErrorTracking, errorHandler, fastifyErrorHandler, natsErrorHandler, flush as flushSentry, closeSentry, isInitialized as isSentryInitialized, type SentryConfig, } from './sentry.js';
export { initializeMetrics, getRegistry, getMetrics, getMetricsJSON, resetMetrics, recordHttpRequest, recordDbQuery, recordEventProcessing, recordEventPublish, setActiveConnections, incrementActiveConnections, decrementActiveConnections, setQueueSize, recordError, createCounter, createGauge, createHistogram, createSummary, fastifyMetrics, createDbTimer, createEventTimer, promClient, type MetricsConfig, } from './metrics.js';
export { createLogger, createChildLogger, createFastifyLogger, StructuredLogger, LogLevel, LOG_PATTERNS, CONTEXT_KEYS, type LoggerConfig, type LogContext, type LogEntry, } from './logging.js';
export { HealthCheckManager, HealthStatus, registerHealthRoutes, createDatabaseHealthCheck, createNatsHealthCheck, createHttpHealthCheck, createRedisHealthCheck, type HealthResponse, type DependencyHealth, type HealthCheckFn, } from './health.js';
export { OpenLineageEmitter, createOpenLineageEmitter, type Dataset, type Job, type Run, type OpenLineageEvent, } from './openlineage.js';
export { SLOManager, getSLOManager, calculateErrorBudget, evaluateSLO, calculateBurnRateAlerts, PLATFORM_SLOS, type SLODefinition, type SLOStatus, type ErrorBudget, type BurnRateAlert, } from './slo.js';
export { SLOMetrics, getSLOMetrics, registerSLOMetricsEndpoint, generatePrometheusAlertRules, } from './slo-metrics.js';
//# sourceMappingURL=index.d.ts.map