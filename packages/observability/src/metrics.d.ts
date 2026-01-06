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
export interface MetricsConfig {
    serviceName: string;
    enableDefaultMetrics?: boolean;
    defaultMetricsInterval?: number;
    prefix?: string;
}
/**
 * Initialize Prometheus metrics collection
 */
export declare function initializeMetrics(config: MetricsConfig): client.Registry;
/**
 * Get the metrics registry
 */
export declare function getRegistry(): client.Registry;
/**
 * Get metrics in Prometheus format
 */
export declare function getMetrics(): Promise<string>;
/**
 * Get metrics in JSON format
 */
export declare function getMetricsJSON(): Promise<any>;
/**
 * Reset all metrics (useful for testing)
 */
export declare function resetMetrics(): void;
/**
 * HTTP Metrics Helpers
 */
export declare function recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number, requestSize?: number, responseSize?: number): void;
/**
 * Database Metrics Helpers
 */
export declare function recordDbQuery(operation: string, table: string, durationSeconds: number, success: boolean): void;
/**
 * Event Metrics Helpers
 */
export declare function recordEventProcessing(eventType: string, durationSeconds: number, success: boolean): void;
export declare function recordEventPublish(eventType: string, success: boolean): void;
/**
 * Connection Metrics Helpers
 */
export declare function setActiveConnections(connectionType: string, count: number): void;
export declare function incrementActiveConnections(connectionType: string, delta?: number): void;
export declare function decrementActiveConnections(connectionType: string, delta?: number): void;
/**
 * Queue Metrics Helpers
 */
export declare function setQueueSize(queueName: string, size: number): void;
/**
 * Error Metrics Helpers
 */
export declare function recordError(errorType: string, component: string): void;
/**
 * Custom Metrics Helpers
 */
export declare function createCounter(name: string, help: string, labelNames?: string[]): client.Counter<string>;
export declare function createGauge(name: string, help: string, labelNames?: string[]): client.Gauge<string>;
export declare function createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): client.Histogram<string>;
export declare function createSummary(name: string, help: string, labelNames?: string[], percentiles?: number[]): client.Summary<string>;
/**
 * Middleware Helpers
 */
/**
 * Fastify metrics middleware
 */
export declare function fastifyMetrics(): (_request: any, reply: any) => Promise<void>;
/**
 * Database query timer helper
 */
export declare function createDbTimer(operation: string, table: string): {
    end: (success?: boolean) => void;
};
/**
 * Event processing timer helper
 */
export declare function createEventTimer(eventType: string): {
    end: (success?: boolean) => void;
};
/**
 * Export all metric types for custom usage
 */
export { client as promClient };
//# sourceMappingURL=metrics.d.ts.map