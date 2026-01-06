# Observability Overview

**Version:** 1.0.0
**Last Updated:** Phase B Hardening
**Owner:** Reliability Lead

## Executive Summary

This document describes the comprehensive observability stack implemented for the TEEI CSR Platform, providing production-grade monitoring, tracing, error tracking, and health checks across all 7 microservices.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [Implementation Guide](#implementation-guide)
4. [Health Checks](#health-checks)
5. [Distributed Tracing](#distributed-tracing)
6. [Metrics Collection](#metrics-collection)
7. [Error Tracking](#error-tracking)
8. [Structured Logging](#structured-logging)
9. [Dashboards](#dashboards)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

### Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    TEEI CSR Platform                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Service │ │  Service │ │  Service │ │  Service │ ... │
│  │    1     │ │    2     │ │    3     │ │    N     │     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │
│       │            │            │            │             │
│       └────────────┴────────────┴────────────┘             │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼───┐  ┌────▼────┐  ┌───▼────┐
    │ OTel   │  │ Sentry  │  │Prometheus│
    │ Traces │  │ Errors  │  │ Metrics  │
    └────┬───┘  └────┬────┘  └────┬────┘
         │           │            │
    ┌────▼───┐  ┌───▼────┐  ┌────▼────┐
    │ Jaeger │  │ Sentry │  │ Grafana │
    │  UI    │  │   UI   │  │Dashboards│
    └────────┘  └────────┘  └─────────┘
```

### Components Overview

| Component | Purpose | Port | Status |
|-----------|---------|------|--------|
| **OpenTelemetry** | Distributed tracing | 4318 | Production Ready |
| **Sentry** | Error tracking & profiling | - | Production Ready |
| **Prometheus** | Metrics collection | 9090 | Production Ready |
| **Grafana** | Visualization dashboards | 3000 | Production Ready |
| **Jaeger** | Trace visualization | 16686 | Optional |

---

## Components

### 1. OpenTelemetry (Distributed Tracing)

**Purpose:** End-to-end request tracing with correlation IDs across all services.

**Key Features:**
- Automatic instrumentation for HTTP, Fastify, Postgres
- Correlation ID propagation
- Context-aware spans
- W3C Trace Context propagation
- Configurable sampling rates (10% in production)

**Package:** `@teei/observability`

**Initialization:**
```typescript
import { initializeOTel } from '@teei/observability';

initializeOTel({
  serviceName: 'my-service',
  environment: 'production',
  exporterType: 'otlp',
  otlpEndpoint: 'http://localhost:4318',
  sampleRate: 0.1, // 10% sampling
});
```

### 2. Sentry (Error Tracking)

**Purpose:** Centralized error tracking with context enrichment.

**Key Features:**
- Automatic error capture
- User and request context
- Performance profiling
- Release tracking
- Breadcrumbs for debugging
- Source map support

**Initialization:**
```typescript
import { initializeSentry } from '@teei/observability';

initializeSentry({
  dsn: process.env.SENTRY_DSN!,
  serviceName: 'my-service',
  environment: 'production',
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.05,
});
```

### 3. Prometheus (Metrics)

**Purpose:** Time-series metrics for monitoring service health.

**Key Metrics:**
- HTTP request/response metrics (duration, size, count)
- Database query metrics (duration, count, errors)
- Event processing metrics (count, duration, errors)
- Node.js runtime metrics (memory, CPU, event loop)
- Custom business metrics

**Initialization:**
```typescript
import { initializeMetrics } from '@teei/observability';

initializeMetrics({
  serviceName: 'my-service',
  enableDefaultMetrics: true,
});
```

**Metrics Endpoint:** `GET /metrics`

### 4. Structured Logging

**Purpose:** JSON-formatted logs with correlation context.

**Key Features:**
- Correlation ID integration
- Log level management
- Request/response logging
- PII redaction
- Pretty printing in development

**Initialization:**
```typescript
import { StructuredLogger } from '@teei/observability';

const logger = new StructuredLogger({
  serviceName: 'my-service',
  level: 'info',
});

logger.info('User action completed', {
  userId: '123',
  action: 'profile.update',
}, { changes: { name: 'John' } });
```

---

## Implementation Guide

### Step 1: Install Package

Add to your service's `package.json`:
```json
{
  "dependencies": {
    "@teei/observability": "workspace:*"
  }
}
```

### Step 2: Initialize Observability

```typescript
import {
  initializeOTel,
  initializeSentry,
  initializeMetrics,
  StructuredLogger,
  HealthCheckManager,
  registerHealthRoutes,
} from '@teei/observability';

// Initialize OpenTelemetry
initializeOTel({
  serviceName: 'my-service',
  environment: process.env.NODE_ENV || 'development',
  exporterType: 'otlp',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Initialize Sentry (if DSN provided)
if (process.env.SENTRY_DSN) {
  initializeSentry({
    dsn: process.env.SENTRY_DSN,
    serviceName: 'my-service',
    environment: process.env.NODE_ENV || 'development',
  });
}

// Initialize Prometheus metrics
initializeMetrics({
  serviceName: 'my-service',
  enableDefaultMetrics: true,
});

// Create structured logger
const logger = new StructuredLogger({ serviceName: 'my-service' });
```

### Step 3: Setup Health Checks

```typescript
import { HealthCheckManager, registerHealthRoutes } from '@teei/observability';

const healthManager = new HealthCheckManager('my-service', '1.0.0');

// Register dependency checks
healthManager.registerCheck('database', async () => {
  // Check database connectivity
  return { name: 'database', status: 'healthy', latency: 10 };
});

// Register health routes
registerHealthRoutes(fastify, healthManager);

// Mark as ready after initialization
healthManager.setReady(true);
```

### Step 4: Add Metrics Endpoints

```typescript
import { getMetrics } from '@teei/observability';

fastify.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', 'text/plain');
  return getMetrics();
});
```

---

## Health Checks

### Available Endpoints

All services expose the following health check endpoints:

| Endpoint | Purpose | Success Code |
|----------|---------|--------------|
| `GET /health` | Detailed health with dependencies | 200/503 |
| `GET /health/liveness` | Is service running? | 200/503 |
| `GET /health/readiness` | Can accept traffic? | 200/503 |
| `GET /health/startup` | Finished initializing? | 200/503 |

### Example Response

```json
{
  "status": "healthy",
  "service": "unified-profile",
  "version": "1.0.0",
  "timestamp": "2025-11-13T12:00:00.000Z",
  "uptime": 3600,
  "dependencies": [
    {
      "name": "database",
      "status": "healthy",
      "latency": 15,
      "message": "Database connection OK"
    },
    {
      "name": "nats",
      "status": "healthy",
      "latency": 5,
      "message": "NATS connection OK"
    }
  ]
}
```

### Kubernetes Integration

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/startup
    port: 3001
  initialDelaySeconds: 0
  periodSeconds: 5
  failureThreshold: 30
```

---

## Distributed Tracing

### Trace Propagation

OpenTelemetry automatically propagates traces across service boundaries using W3C Trace Context headers:
- `traceparent`: Contains trace ID, span ID, and flags
- `tracestate`: Vendor-specific trace data

### Manual Instrumentation

```typescript
import { traceAsync, addSpanAttributes } from '@teei/observability';

// Wrap async operations
await traceAsync('processPayment', async (span) => {
  span.setAttribute('payment.amount', amount);
  span.setAttribute('payment.currency', 'USD');

  const result = await paymentGateway.charge(amount);

  span.addEvent('payment.completed', {
    transactionId: result.id,
  });

  return result;
});
```

### Correlation IDs

All services maintain correlation IDs throughout the request lifecycle:

```typescript
import { addCorrelationIds } from '@teei/observability';

// Add correlation context to span
addCorrelationIds({
  correlationId: request.headers['x-correlation-id'],
  causationId: request.headers['x-causation-id'],
});
```

---

## Metrics Collection

### Standard Metrics

All services expose these standard metrics:

**HTTP Metrics:**
- `http_requests_total` - Counter of all HTTP requests
- `http_request_duration_seconds` - Histogram of request duration
- `http_request_size_bytes` - Histogram of request body size
- `http_response_size_bytes` - Histogram of response body size

**Database Metrics:**
- `db_queries_total` - Counter of database queries
- `db_query_duration_seconds` - Histogram of query duration

**Event Metrics:**
- `events_processed_total` - Counter of processed events
- `events_published_total` - Counter of published events
- `event_processing_duration_seconds` - Histogram of processing duration

**Node.js Metrics:**
- `nodejs_heap_size_used_bytes` - Heap memory used
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `process_cpu_seconds_total` - CPU usage

### Custom Metrics

```typescript
import { createCounter, createHistogram } from '@teei/observability';

// Create custom counter
const orderCounter = createCounter(
  'orders_created_total',
  'Total number of orders created',
  ['order_type']
);

orderCounter.inc({ order_type: 'subscription' });

// Create custom histogram
const paymentDuration = createHistogram(
  'payment_processing_duration_seconds',
  'Duration of payment processing',
  ['payment_method'],
  [0.1, 0.5, 1, 2, 5, 10]
);

paymentDuration.observe({ payment_method: 'credit_card' }, 1.25);
```

---

## Error Tracking

### Automatic Error Capture

Sentry automatically captures:
- Unhandled exceptions
- Unhandled promise rejections
- HTTP errors (4xx, 5xx)
- Database errors

### Manual Error Capture

```typescript
import { captureException, addBreadcrumb } from '@teei/observability';

try {
  // Risky operation
  await processOrder(orderId);
} catch (error) {
  captureException(error, {
    tags: {
      component: 'order-processing',
      orderId,
    },
    extra: {
      orderData: order,
    },
    level: 'error',
  });
  throw error;
}
```

### Context Enrichment

```typescript
import { setUserContext, setRequestContext } from '@teei/observability';

// Set user context
setUserContext({
  id: user.id,
  email: user.email,
  companyId: user.companyId,
});

// Set request context
setRequestContext({
  id: request.id,
  method: request.method,
  url: request.url,
  ip: request.ip,
});
```

---

## Structured Logging

### Log Levels

```typescript
logger.trace('Detailed debugging');
logger.debug('Development debugging');
logger.info('Normal operation');
logger.warn('Warning condition');
logger.error('Error occurred', error);
logger.fatal('System failure', error);
```

### Specialized Logging

```typescript
// HTTP request logging
logger.logRequest('GET', '/api/users', 200, 150);

// Database query logging
logger.logQuery('SELECT', 'users', 25, 10);

// Event logging
logger.logEvent('user.created', { userId: '123' });

// Security event logging
logger.logSecurityEvent('unauthorized_access', 'high', {
  userId: '123',
  resource: '/admin',
});

// Audit logging
logger.logAudit('user.delete', 'admin@example.com', 'user:123', 'success');
```

---

## Dashboards

### Available Dashboards

Located in `/docker/grafana/dashboards/`:

1. **service-overview.json** - Platform-wide service health
2. **api-gateway.json** - Gateway-specific metrics
3. **database-metrics.json** - Database performance
4. **event-bus.json** - NATS event processing
5. **nodejs-metrics.json** - Node.js runtime metrics

### Importing Dashboards

1. Access Grafana at `http://localhost:3000`
2. Navigate to Dashboards → Import
3. Upload JSON file from `/docker/grafana/dashboards/`
4. Select Prometheus data source
5. Click Import

### Key Dashboard Panels

**Service Overview:**
- Services Up count
- Total requests/second
- Error rate percentage
- Average response time

**API Gateway:**
- Request rate by route
- Response time percentiles (p50, p95, p99)
- Error rate by status code
- Downstream service latency

**Database:**
- Query rate by operation
- Query duration (p95)
- Success vs error counts
- Queries by table

**Event Bus:**
- Events processed/published per second
- Event processing duration
- Queue sizes
- Success vs error counts

---

## Troubleshooting

### Common Issues

#### 1. Missing Traces

**Problem:** No traces appearing in Jaeger

**Solutions:**
- Verify OpenTelemetry initialization
- Check OTLP endpoint configuration
- Verify sampling rate (increase for testing)
- Check network connectivity to collector

```bash
# Test OTLP endpoint
curl http://localhost:4318/v1/traces
```

#### 2. High Memory Usage

**Problem:** Service memory growing continuously

**Solutions:**
- Check for memory leaks in application code
- Review Prometheus metrics: `nodejs_heap_size_used_bytes`
- Analyze heap dumps
- Adjust GC settings if needed

#### 3. Missing Metrics

**Problem:** Metrics not appearing in Prometheus

**Solutions:**
- Verify `/metrics` endpoint is accessible
- Check Prometheus scrape configuration
- Verify metrics are being recorded
- Check for metric name collisions

```bash
# Test metrics endpoint
curl http://localhost:3001/metrics
```

#### 4. Sentry Errors Not Captured

**Problem:** Errors not appearing in Sentry

**Solutions:**
- Verify Sentry DSN is configured
- Check network connectivity
- Verify error is being thrown/captured
- Check beforeSend filter logic

### Debug Mode

Enable debug logging for observability components:

```typescript
// OpenTelemetry debug
process.env.OTEL_LOG_LEVEL = 'debug';

// Sentry debug
initializeSentry({
  dsn: process.env.SENTRY_DSN!,
  serviceName: 'my-service',
  debug: true,
});
```

---

## Environment Variables

### Required

```bash
# Service identification
SERVICE_NAME=unified-profile
NODE_ENV=production

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
RELEASE_VERSION=1.0.0

# Logging
LOG_LEVEL=info
```

### Optional

```bash
# Sampling rates
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Metrics
PROMETHEUS_PORT=9090

# Jaeger (alternative to OTLP)
JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

---

## Performance Impact

### OpenTelemetry

- **CPU Overhead:** ~1-3% at 10% sampling
- **Memory Overhead:** ~50-100 MB per service
- **Latency Impact:** ~1-2ms per traced request

### Sentry

- **CPU Overhead:** ~0.5-1% with profiling disabled
- **Memory Overhead:** ~30-50 MB per service
- **Latency Impact:** Minimal (async error capture)

### Prometheus

- **CPU Overhead:** ~0.5-1%
- **Memory Overhead:** ~20-40 MB per service
- **Scrape Impact:** Negligible (15s default interval)

---

## Best Practices

### 1. Sampling Strategy

- **Development:** 100% sampling for full visibility
- **Staging:** 50% sampling for thorough testing
- **Production:** 10% sampling to reduce overhead

### 2. Metric Naming

Follow Prometheus conventions:
- Use lowercase with underscores: `http_requests_total`
- Include unit suffix: `_seconds`, `_bytes`, `_total`
- Use descriptive names: `payment_processing_duration_seconds`

### 3. Log Levels

- **TRACE:** Ultra-detailed debugging (disable in production)
- **DEBUG:** Development debugging
- **INFO:** Normal operation (default in production)
- **WARN:** Warning conditions
- **ERROR:** Error conditions
- **FATAL:** System failures

### 4. Error Context

Always provide context when capturing errors:
```typescript
captureException(error, {
  tags: { component: 'payment' },
  extra: { orderId, amount },
  user: { id: userId },
});
```

### 5. Health Checks

- Keep health checks lightweight (<100ms)
- Include critical dependencies only
- Use timeouts to prevent hanging
- Return detailed status for debugging

---

## Support

### Documentation

- **Architecture:** `/docs/Platform_Architecture.md`
- **SRE Runbooks:** `/docs/SRE_Dashboards.md`
- **API Docs:** `/packages/openapi/merged.yaml`

### Resources

- **OpenTelemetry:** https://opentelemetry.io/docs/
- **Sentry:** https://docs.sentry.io/
- **Prometheus:** https://prometheus.io/docs/
- **Grafana:** https://grafana.com/docs/

### Contacts

- **Reliability Lead:** Phase B Hardening Team
- **Platform Team:** Worker 2 Backend Services
- **On-Call:** See `/docs/SRE_Dashboards.md`

---

**Last Updated:** Phase B Hardening
**Version:** 1.0.0
**Status:** Production Ready
