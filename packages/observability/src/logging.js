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
// Correlation ID helpers (inline to avoid dependency issues)
// These should be replaced with @teei/shared-utils when available
let correlationId;
let causationId;
const getCorrelationId = () => correlationId;
const getCausationId = () => causationId;
/**
 * Create a structured logger for a service
 */
export function createLogger(config) {
    const { serviceName, level = process.env.LOG_LEVEL || 'info', prettyPrint = process.env.NODE_ENV === 'development', redact = [
        'password',
        'token',
        'authorization',
        'cookie',
        'secret',
        'apiKey',
        'api_key',
        'accessToken',
        'refreshToken',
    ], } = config;
    const baseConfig = {
        name: serviceName,
        level,
        // Add timestamp
        timestamp: pino.stdTimeFunctions.isoTime,
        // Redact sensitive fields
        redact: {
            paths: redact,
            remove: true,
        },
        // Format errors properly
        serializers: {
            err: pino.stdSerializers.err,
            error: pino.stdSerializers.err,
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res,
        },
        // Base context
        base: {
            service: serviceName,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.SERVICE_VERSION || '1.0.0',
        },
        // Custom formatters
        formatters: {
            level(label, _number) {
                return { level: label };
            },
            bindings(bindings) {
                return {
                    pid: bindings.pid,
                    hostname: bindings.hostname,
                };
            },
        },
        // Mixin for adding correlation context
        mixin() {
            const correlationId = getCorrelationId();
            const causationId = getCausationId();
            return {
                ...(correlationId && { correlationId }),
                ...(causationId && { causationId }),
            };
        },
    };
    // Add pretty printing for development
    if (prettyPrint) {
        return pino({
            ...baseConfig,
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    messageFormat: '{service} [{correlationId}] {msg}',
                },
            },
        });
    }
    return pino(baseConfig);
}
/**
 * Create a child logger with additional context
 */
export function createChildLogger(logger, context) {
    return logger.child(context);
}
/**
 * Log levels enum for type safety
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["TRACE"] = "trace";
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (LogLevel = {}));
/**
 * Enhanced logger wrapper with helper methods
 */
export class StructuredLogger {
    logger;
    constructor(config) {
        this.logger = createLogger(config);
    }
    /**
     * Get the underlying Pino logger
     */
    getLogger() {
        return this.logger;
    }
    /**
     * Create a child logger with context
     */
    child(context) {
        const childLogger = new StructuredLogger({
            serviceName: this.logger.bindings().service,
        });
        childLogger.logger = this.logger.child(context);
        return childLogger;
    }
    /**
     * Log with correlation context
     */
    logWithContext(entry) {
        const { message, level = LogLevel.INFO, context = {}, error, data } = entry;
        const logContext = {
            ...context,
            ...(data && { data }),
        };
        if (error) {
            this.logger[level]({ ...logContext, err: error }, message);
        }
        else {
            this.logger[level](logContext, message);
        }
    }
    /**
     * Log helpers
     */
    trace(message, context, data) {
        this.logWithContext({ message, level: LogLevel.TRACE, context, data });
    }
    debug(message, context, data) {
        this.logWithContext({ message, level: LogLevel.DEBUG, context, data });
    }
    info(message, context, data) {
        this.logWithContext({ message, level: LogLevel.INFO, context, data });
    }
    warn(message, context, data) {
        this.logWithContext({ message, level: LogLevel.WARN, context, data });
    }
    error(message, error, context, data) {
        this.logWithContext({
            message,
            level: LogLevel.ERROR,
            context,
            error,
            data,
        });
    }
    fatal(message, error, context, data) {
        this.logWithContext({
            message,
            level: LogLevel.FATAL,
            context,
            error,
            data,
        });
    }
    /**
     * Business event logging
     */
    logEvent(eventType, eventData, context) {
        this.info('Event processed', {
            ...context,
            eventType,
        }, eventData);
    }
    /**
     * Request logging
     */
    logRequest(method, url, statusCode, duration, context) {
        this.info('HTTP Request', {
            ...context,
            method,
            url,
            statusCode,
            duration,
            type: 'http.request',
        });
    }
    /**
     * Database query logging
     */
    logQuery(operation, table, duration, rowCount, context) {
        this.debug('Database Query', {
            ...context,
            operation,
            table,
            duration,
            rowCount,
            type: 'db.query',
        });
    }
    /**
     * External API call logging
     */
    logExternalCall(service, method, url, statusCode, duration, context) {
        this.info('External API Call', {
            ...context,
            service,
            method,
            url,
            statusCode,
            duration,
            type: 'external.call',
        });
    }
    /**
     * Performance logging
     */
    logPerformance(operation, duration, metadata, context) {
        const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
        this.logWithContext({
            message: 'Performance Metric',
            level,
            context: {
                ...context,
                operation,
                duration,
                type: 'performance',
            },
            data: metadata,
        });
    }
    /**
     * Security event logging
     */
    logSecurityEvent(eventType, severity, details, context) {
        const level = severity === 'critical' || severity === 'high'
            ? LogLevel.WARN
            : LogLevel.INFO;
        this.logWithContext({
            message: 'Security Event',
            level,
            context: {
                ...context,
                eventType,
                severity,
                type: 'security',
            },
            data: details,
        });
    }
    /**
     * Audit logging
     */
    logAudit(action, actor, resource, result, details, context) {
        this.info('Audit Event', {
            ...context,
            action,
            actor,
            resource,
            result,
            type: 'audit',
        }, details);
    }
}
/**
 * Fastify logger plugin
 */
export function createFastifyLogger(serviceName) {
    const logger = createLogger({
        serviceName,
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: process.env.NODE_ENV === 'development',
    });
    return {
        logger,
        disableRequestLogging: false,
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'reqId',
        serializers: {
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    path: request.routerPath,
                    parameters: request.params,
                    headers: {
                        host: request.headers.host,
                        'user-agent': request.headers['user-agent'],
                        'content-type': request.headers['content-type'],
                    },
                    correlationId: request.headers['x-correlation-id'],
                    requestId: request.id,
                };
            },
            res(reply) {
                return {
                    statusCode: reply.statusCode,
                    responseTime: reply.getResponseTime?.(),
                };
            },
        },
    };
}
/**
 * Log aggregation patterns
 */
export const LOG_PATTERNS = {
    HTTP_REQUEST: 'http.request',
    HTTP_RESPONSE: 'http.response',
    DB_QUERY: 'db.query',
    EVENT_RECEIVED: 'event.received',
    EVENT_PUBLISHED: 'event.published',
    EXTERNAL_CALL: 'external.call',
    PERFORMANCE: 'performance',
    SECURITY: 'security',
    AUDIT: 'audit',
    ERROR: 'error',
};
/**
 * Standard log context keys
 */
export const CONTEXT_KEYS = {
    CORRELATION_ID: 'correlationId',
    CAUSATION_ID: 'causationId',
    USER_ID: 'userId',
    COMPANY_ID: 'companyId',
    REQUEST_ID: 'requestId',
    TRACE_ID: 'traceId',
    SPAN_ID: 'spanId',
    EVENT_TYPE: 'eventType',
    OPERATION: 'operation',
    DURATION: 'duration',
    STATUS: 'status',
};
//# sourceMappingURL=logging.js.map