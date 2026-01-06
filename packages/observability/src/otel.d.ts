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
import { Span, Context, Tracer } from '@opentelemetry/api';
export interface OTelConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    exporterType?: 'otlp' | 'jaeger' | 'console' | 'none';
    otlpEndpoint?: string;
    jaegerEndpoint?: string;
    sampleRate?: number;
    enableMetrics?: boolean;
    enableTracing?: boolean;
    enableLogging?: boolean;
    attributes?: Record<string, string | number | boolean>;
}
/**
 * Initialize OpenTelemetry SDK with auto-instrumentation
 */
export declare function initializeOTel(config: OTelConfig): NodeSDK;
/**
 * Get the active tracer instance
 */
export declare function getTracer(): Tracer;
/**
 * Create a new span for manual instrumentation
 */
export declare function startSpan(name: string, attributes?: Record<string, any>): Span;
/**
 * Execute a function within a span context
 */
export declare function traceAsync<T>(spanName: string, fn: (span: Span) => Promise<T>, attributes?: Record<string, any>): Promise<T>;
/**
 * Execute a synchronous function within a span context
 */
export declare function traceSync<T>(spanName: string, fn: (span: Span) => T, attributes?: Record<string, any>): T;
/**
 * Add attributes to the current active span
 */
export declare function addSpanAttributes(attributes: Record<string, any>): void;
/**
 * Add an event to the current active span
 */
export declare function addSpanEvent(name: string, attributes?: Record<string, any>): void;
/**
 * Record an exception in the current active span
 */
export declare function recordException(error: Error, attributes?: Record<string, any>): void;
/**
 * Get the current active span
 */
export declare function getActiveSpan(): Span | undefined;
/**
 * Get the current trace context
 */
export declare function getTraceContext(): Context;
/**
 * Inject trace context into carrier (for HTTP propagation)
 */
export declare function injectTraceContext(carrier: Record<string, any>): void;
/**
 * Extract trace context from carrier (for HTTP propagation)
 */
export declare function extractTraceContext(carrier: Record<string, any>): Context;
/**
 * Set the extracted context as active
 */
export declare function withExtractedContext<T>(carrier: Record<string, any>, fn: () => T): T;
/**
 * Wrap an async function with tracing
 */
export declare function traced<T extends (...args: any[]) => Promise<any>>(spanName: string, fn: T): T;
/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export declare function shutdownOTel(): Promise<void>;
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
export declare function addCorrelationIds(context: CorrelationContext): void;
/**
 * Extract correlation ID from current span
 */
export declare function getCorrelationIdFromSpan(): string | undefined;
/**
 * Create a span with correlation context
 */
export declare function traceWithCorrelation<T>(spanName: string, correlationContext: CorrelationContext, fn: (span: Span) => Promise<T>): Promise<T>;
//# sourceMappingURL=otel.d.ts.map