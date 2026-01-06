# @teei/observability

Comprehensive observability toolkit for TEEI CSR Platform services.

## Features

- **OpenTelemetry**: Distributed tracing with automatic instrumentation
- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection and exporters
- **Structured Logging**: JSON logging with correlation IDs
- **Health Checks**: Liveness, readiness, and startup probes

## Installation

```bash
pnpm add @teei/observability
```

## Quick Start

### Initialize Observability

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
  environment: 'production',
  exporterType: 'otlp',
  sampleRate: 0.1,
});

// Initialize Sentry
initializeSentry({
  dsn: process.env.SENTRY_DSN!,
  serviceName: 'my-service',
  environment: 'production',
});

// Initialize Prometheus metrics
initializeMetrics({
  serviceName: 'my-service',
  enableDefaultMetrics: true,
});

// Create structured logger
const logger = new StructuredLogger({
  serviceName: 'my-service',
});

// Create health check manager
const healthManager = new HealthCheckManager('my-service', '1.0.0');

// Register health routes with Fastify
registerHealthRoutes(fastify, healthManager);
```

## Usage

See `/docs/Observability_Overview.md` for complete documentation.

## License

Proprietary - TEEI CSR Platform
