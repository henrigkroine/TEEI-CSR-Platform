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
let correlationId: string | undefined;
let causationId: string | undefined;

const getCorrelationId = (): string | undefined => correlationId;
const getCausationId = (): string | undefined => causationId;

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  prettyPrint?: boolean;
  destination?: string; // File path or 'stdout'
  redact?: string[]; // Fields to redact from logs
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
export function createLogger(config: LoggerConfig): pino.Logger {
  const {
    serviceName,
    level = process.env.LOG_LEVEL || 'info',
    prettyPrint = process.env.NODE_ENV === 'development',
    redact = [
      'password',
      'token',
      'authorization',
      'cookie',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
    ],
  } = config;

  const baseConfig: pino.LoggerOptions = {
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
export function createChildLogger(
  logger: pino.Logger,
  context: LogContext
): pino.Logger {
  return logger.child(context);
}

/**
 * Log levels enum for type safety
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
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
export class StructuredLogger {
  private logger: pino.Logger;

  constructor(config: LoggerConfig) {
    this.logger = createLogger(config);
  }

  /**
   * Get the underlying Pino logger
   */
  getLogger(): pino.Logger {
    return this.logger;
  }

  /**
   * Create a child logger with context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger({
      serviceName: (this.logger.bindings() as any).service,
    });
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Log with correlation context
   */
  private logWithContext(entry: LogEntry): void {
    const { message, level = LogLevel.INFO, context = {}, error, data } = entry;

    const logContext = {
      ...context,
      ...(data && { data }),
    };

    if (error) {
      this.logger[level]({ ...logContext, err: error }, message);
    } else {
      this.logger[level](logContext, message);
    }
  }

  /**
   * Log helpers
   */
  trace(message: string, context?: LogContext, data?: any): void {
    this.logWithContext({ message, level: LogLevel.TRACE, context, data });
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.logWithContext({ message, level: LogLevel.DEBUG, context, data });
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.logWithContext({ message, level: LogLevel.INFO, context, data });
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.logWithContext({ message, level: LogLevel.WARN, context, data });
  }

  error(message: string, error?: Error, context?: LogContext, data?: any): void {
    this.logWithContext({
      message,
      level: LogLevel.ERROR,
      context,
      error,
      data,
    });
  }

  fatal(message: string, error?: Error, context?: LogContext, data?: any): void {
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
  logEvent(
    eventType: string,
    eventData: any,
    context?: LogContext
  ): void {
    this.info('Event processed', {
      ...context,
      eventType,
    }, eventData);
  }

  /**
   * Request logging
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
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
  logQuery(
    operation: string,
    table: string,
    duration: number,
    rowCount?: number,
    context?: LogContext
  ): void {
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
  logExternalCall(
    service: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
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
  logPerformance(
    operation: string,
    duration: number,
    metadata?: any,
    context?: LogContext
  ): void {
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
  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    context?: LogContext
  ): void {
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
  logAudit(
    action: string,
    actor: string,
    resource: string,
    result: 'success' | 'failure',
    details?: any,
    context?: LogContext
  ): void {
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
export function createFastifyLogger(serviceName: string): any {
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
      req(request: any) {
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
      res(reply: any) {
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
