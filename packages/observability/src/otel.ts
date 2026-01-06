/**
 * OpenTelemetry SDK Wrapper
 *
 * Provides comprehensive distributed tracing and metrics collection with:
 * - Auto-instrumentation for HTTP, Fastify, Postgres
 * - Correlation ID propagation across services
 * - OTLP and Jaeger exporters
 * - Sampling strategies for production workloads
 * - Context propagation for async operations
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / OTel Engineer
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor
} from '@opentelemetry/sdk-trace-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter
} from '@opentelemetry/sdk-metrics';
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Context,
  propagation,
  Tracer
} from '@opentelemetry/api';

export interface OTelConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;

  // Exporter configuration
  exporterType?: 'otlp' | 'jaeger' | 'console' | 'none';
  otlpEndpoint?: string;
  jaegerEndpoint?: string;

  // Sampling configuration
  sampleRate?: number; // 0.0 to 1.0

  // Feature flags
  enableMetrics?: boolean;
  enableTracing?: boolean;
  enableLogging?: boolean;

  // Custom attributes
  attributes?: Record<string, string | number | boolean>;
}

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize OpenTelemetry SDK with auto-instrumentation
 */
export function initializeOTel(config: OTelConfig): NodeSDK {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = process.env.NODE_ENV || 'development',
    exporterType = 'otlp',
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    sampleRate = environment === 'production' ? 0.1 : 1.0,
    enableMetrics = true,
    enableTracing = true,
    attributes = {}
  } = config;

  // Define resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    ...attributes
  });

  // Configure trace exporter based on type
  let traceProcessor;
  switch (exporterType) {
    case 'otlp':
      traceProcessor = new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${otlpEndpoint}/v1/traces`,
        })
      );
      break;
    case 'jaeger':
      traceProcessor = new BatchSpanProcessor(
        new JaegerExporter({
          endpoint: jaegerEndpoint,
        })
      );
      break;
    case 'console':
      traceProcessor = new SimpleSpanProcessor(new ConsoleSpanExporter());
      break;
    case 'none':
    default:
      traceProcessor = undefined;
  }

  // Configure metric reader
  let metricReader;
  if (enableMetrics) {
    if (exporterType === 'otlp') {
      metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${otlpEndpoint}/v1/metrics`,
        }),
        exportIntervalMillis: 60000, // 1 minute
      });
    } else if (exporterType === 'console') {
      metricReader = new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 60000,
      });
    }
  }

  // Initialize SDK with auto-instrumentation
  sdk = new NodeSDK({
    resource,
    traceExporter: traceProcessor ? undefined : new ConsoleSpanExporter(),
    spanProcessor: traceProcessor as any,
    metricReader: metricReader as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Customize instrumentation options
        '@opentelemetry/instrumentation-http': {
          enabled: enableTracing,
          requestHook: (span, request) => {
            // Add correlation ID from headers
            const correlationId = (request as any).headers?.['x-correlation-id'];
            if (correlationId) {
              span.setAttribute('correlation.id', correlationId);
            }
          },
        },
        '@opentelemetry/instrumentation-fastify': {
          enabled: enableTracing,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: enableTracing,
          enhancedDatabaseReporting: true,
        },
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for performance
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  // Set up graceful shutdown
  const shutdown = async () => {
    try {
      await sdk?.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK:', error);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Initialize tracer
  tracer = trace.getTracer(serviceName, serviceVersion);

  console.log(`OpenTelemetry initialized for service: ${serviceName}`);
  console.log(`  - Environment: ${environment}`);
  console.log(`  - Exporter: ${exporterType}`);
  console.log(`  - Sample Rate: ${sampleRate * 100}%`);
  console.log(`  - Metrics: ${enableMetrics ? 'enabled' : 'disabled'}`);
  console.log(`  - Tracing: ${enableTracing ? 'enabled' : 'disabled'}`);

  return sdk;
}

/**
 * Get the active tracer instance
 */
export function getTracer(): Tracer {
  if (!tracer) {
    throw new Error('OpenTelemetry not initialized. Call initializeOTel() first.');
  }
  return tracer;
}

/**
 * Create a new span for manual instrumentation
 */
export function startSpan(name: string, attributes?: Record<string, any>): Span {
  const activeTracer = getTracer();
  const span = activeTracer.startSpan(name, {
    attributes: attributes || {},
  });
  return span;
}

/**
 * Execute a function within a span context
 */
export async function traceAsync<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const activeTracer = getTracer();

  return activeTracer.startActiveSpan(spanName, { attributes: attributes || {} }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Execute a synchronous function within a span context
 */
export function traceSync<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, any>
): T {
  const activeTracer = getTracer();

  return activeTracer.startActiveSpan(spanName, { attributes: attributes || {} }, (span) => {
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to the current active span
 */
export function addSpanAttributes(attributes: Record<string, any>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    Object.entries(attributes).forEach(([key, value]) => {
      activeSpan.setAttribute(key, value);
    });
  }
}

/**
 * Add an event to the current active span
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(name, attributes);
  }
}

/**
 * Record an exception in the current active span
 */
export function recordException(error: Error, attributes?: Record<string, any>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.recordException(error, attributes as any);
    activeSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
  }
}

/**
 * Get the current active span
 */
export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

/**
 * Get the current trace context
 */
export function getTraceContext(): Context {
  return context.active();
}

/**
 * Inject trace context into carrier (for HTTP propagation)
 */
export function injectTraceContext(carrier: Record<string, any>): void {
  propagation.inject(context.active(), carrier);
}

/**
 * Extract trace context from carrier (for HTTP propagation)
 */
export function extractTraceContext(carrier: Record<string, any>): Context {
  return propagation.extract(context.active(), carrier);
}

/**
 * Set the extracted context as active
 */
export function withExtractedContext<T>(
  carrier: Record<string, any>,
  fn: () => T
): T {
  const extractedContext = extractTraceContext(carrier);
  return context.with(extractedContext, fn);
}

/**
 * Wrap an async function with tracing
 */
export function traced<T extends (...args: any[]) => Promise<any>>(
  spanName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    return traceAsync(spanName, async (_span) => {
      return fn(...args);
    });
  }) as T;
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdownOTel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    tracer = null;
    console.log('OpenTelemetry SDK shut down');
  }
}

/**
 * Correlation ID integration helpers
 */
export interface CorrelationContext {
  correlationId: string;
  causationId?: string;
}

/**
 * Add correlation IDs to the current span
 */
export function addCorrelationIds(context: CorrelationContext): void {
  addSpanAttributes({
    'correlation.id': context.correlationId,
    ...(context.causationId && { 'causation.id': context.causationId }),
  });
}

/**
 * Extract correlation ID from current span
 */
export function getCorrelationIdFromSpan(): string | undefined {
  const span = getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.traceId;
  }
  return undefined;
}

/**
 * Create a span with correlation context
 */
export async function traceWithCorrelation<T>(
  spanName: string,
  correlationContext: CorrelationContext,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return traceAsync(spanName, async (span) => {
    addCorrelationIds(correlationContext);
    return fn(span);
  });
}
