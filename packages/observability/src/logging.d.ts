/**
 * Structured Logging Standards
 *
 * Provides consistent structured logging across all services with:
 * - JSON structured output for production
 * - Pretty printing for development
 * - Correlation ID integration
 * - Context enrichment
 * - Log level management
 * - Request/response logging
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Logging Specialist
 */
import pino from 'pino';
export interface LoggerConfig {
    serviceName: string;
    level?: string;
    prettyPrint?: boolean;
    destination?: string;
    redact?: string[];
}
/**
 * Log context interface
 */
export interface LogContext {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    companyId?: string;
    requestId?: string;
    traceId?: string;
    spanId?: string;
    [key: string]: any;
}
/**
 * Create a structured logger for a service
 */
export declare function createLogger(config: LoggerConfig): pino.Logger;
/**
 * Create a child logger with additional context
 */
export declare function createChildLogger(logger: pino.Logger, context: LogContext): pino.Logger;
/**
 * Log levels enum for type safety
 */
export declare enum LogLevel {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    FATAL = "fatal"
}
/**
 * Structured log entry interface
 */
export interface LogEntry {
    message: string;
    level?: LogLevel;
    context?: LogContext;
    error?: Error;
    data?: any;
}
/**
 * Enhanced logger wrapper with helper methods
 */
export declare class StructuredLogger {
    private logger;
    constructor(config: LoggerConfig);
    /**
     * Get the underlying Pino logger
     */
    getLogger(): pino.Logger;
    /**
     * Create a child logger with context
     */
    child(context: LogContext): StructuredLogger;
    /**
     * Log with correlation context
     */
    private logWithContext;
    /**
     * Log helpers
     */
    trace(message: string, context?: LogContext, data?: any): void;
    debug(message: string, context?: LogContext, data?: any): void;
    info(message: string, context?: LogContext, data?: any): void;
    warn(message: string, context?: LogContext, data?: any): void;
    error(message: string, error?: Error, context?: LogContext, data?: any): void;
    fatal(message: string, error?: Error, context?: LogContext, data?: any): void;
    /**
     * Business event logging
     */
    logEvent(eventType: string, eventData: any, context?: LogContext): void;
    /**
     * Request logging
     */
    logRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void;
    /**
     * Database query logging
     */
    logQuery(operation: string, table: string, duration: number, rowCount?: number, context?: LogContext): void;
    /**
     * External API call logging
     */
    logExternalCall(service: string, method: string, url: string, statusCode: number, duration: number, context?: LogContext): void;
    /**
     * Performance logging
     */
    logPerformance(operation: string, duration: number, metadata?: any, context?: LogContext): void;
    /**
     * Security event logging
     */
    logSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any, context?: LogContext): void;
    /**
     * Audit logging
     */
    logAudit(action: string, actor: string, resource: string, result: 'success' | 'failure', details?: any, context?: LogContext): void;
}
/**
 * Fastify logger plugin
 */
export declare function createFastifyLogger(serviceName: string): any;
/**
 * Log aggregation patterns
 */
export declare const LOG_PATTERNS: {
    HTTP_REQUEST: string;
    HTTP_RESPONSE: string;
    DB_QUERY: string;
    EVENT_RECEIVED: string;
    EVENT_PUBLISHED: string;
    EXTERNAL_CALL: string;
    PERFORMANCE: string;
    SECURITY: string;
    AUDIT: string;
    ERROR: string;
};
/**
 * Standard log context keys
 */
export declare const CONTEXT_KEYS: {
    CORRELATION_ID: string;
    CAUSATION_ID: string;
    USER_ID: string;
    COMPANY_ID: string;
    REQUEST_ID: string;
    TRACE_ID: string;
    SPAN_ID: string;
    EVENT_TYPE: string;
    OPERATION: string;
    DURATION: string;
    STATUS: string;
};
//# sourceMappingURL=logging.d.ts.map