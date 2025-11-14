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
export {
  initializeOTel,
  getTracer,
  startSpan,
  traceAsync,
  traceSync,
  addSpanAttributes,
  addSpanEvent,
  recordException,
  getActiveSpan,
  getTraceContext,
  injectTraceContext,
  extractTraceContext,
  withExtractedContext,
  traced,
  shutdownOTel,
  addCorrelationIds,
  getCorrelationIdFromSpan,
  traceWithCorrelation,
  type OTelConfig,
  type CorrelationContext,
} from './otel.js';

// Sentry exports
export {
  initializeSentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
  setTags,
  setContext,
  setCorrelationIds as setSentryCorrelationIds,
  setRequestContext,
  startTransaction,
  withErrorTracking,
  errorHandler,
  fastifyErrorHandler,
  natsErrorHandler,
  flush as flushSentry,
  closeSentry,
  isInitialized as isSentryInitialized,
  type SentryConfig,
} from './sentry.js';

// Metrics exports
export {
  initializeMetrics,
  getRegistry,
  getMetrics,
  getMetricsJSON,
  resetMetrics,
  recordHttpRequest,
  recordDbQuery,
  recordEventProcessing,
  recordEventPublish,
  setActiveConnections,
  incrementActiveConnections,
  decrementActiveConnections,
  setQueueSize,
  recordError,
  createCounter,
  createGauge,
  createHistogram,
  createSummary,
  fastifyMetrics,
  createDbTimer,
  createEventTimer,
  promClient,
  type MetricsConfig,
} from './metrics.js';

// Logging exports
export {
  createLogger,
  createChildLogger,
  createFastifyLogger,
  StructuredLogger,
  LogLevel,
  LOG_PATTERNS,
  CONTEXT_KEYS,
  type LoggerConfig,
  type LogContext,
  type LogEntry,
} from './logging.js';

// Health check exports
export {
  HealthCheckManager,
  HealthStatus,
  registerHealthRoutes,
  createDatabaseHealthCheck,
  createNatsHealthCheck,
  createHttpHealthCheck,
  createRedisHealthCheck,
  type HealthResponse,
  type DependencyHealth,
  type HealthCheckFn,
} from './health.js';
