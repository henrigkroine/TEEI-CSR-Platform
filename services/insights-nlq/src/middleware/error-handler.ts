/**
 * Error Handling Middleware for Insights NLQ Service
 *
 * Provides consistent error responses and logging across all routes.
 * Implements custom error types for different failure scenarios.
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Custom error types for NLQ service
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SafetyError extends Error {
  constructor(message: string, public violations: string[]) {
    super(message);
    this.name = 'SafetyError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class QueryTimeoutError extends Error {
  constructor(message: string, public timeoutMs: number) {
    super(message);
    this.name = 'QueryTimeoutError';
  }
}

export class LLMProviderError extends Error {
  constructor(message: string, public provider: string, public statusCode?: number) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class CacheError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = 'CacheError';
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  retryable?: boolean;
}

/**
 * Global error handler middleware
 * Catches all errors and returns consistent JSON responses
 */
export function createErrorHandler() {
  return (
    error: Error | FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
  ): void => {
    const requestId = request.id;

    // Log error with context
    request.log.error(
      {
        err: error,
        requestId,
        url: request.url,
        method: request.method,
        errorName: error.name,
      },
      `Error processing request: ${error.message}`
    );

    // Build base error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.name,
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Handle different error types
    if (error instanceof ValidationError) {
      reply.status(400).send({
        ...errorResponse,
        error: 'ValidationError',
        details: error.details,
        retryable: false,
      });
    } else if (error instanceof SafetyError) {
      reply.status(400).send({
        ...errorResponse,
        error: 'SafetyError',
        details: {
          violations: error.violations,
          guidance: 'Query contains unsafe operations or patterns',
        },
        retryable: false,
      });
    } else if (error instanceof RateLimitError) {
      const retryAfter = error.retryAfter || 60;
      reply
        .status(429)
        .header('Retry-After', retryAfter.toString())
        .send({
          ...errorResponse,
          error: 'RateLimitError',
          details: {
            retryAfter,
            retryAfterSeconds: retryAfter,
          },
          retryable: true,
        });
    } else if (error instanceof QueryTimeoutError) {
      reply.status(504).send({
        ...errorResponse,
        error: 'QueryTimeoutError',
        details: {
          timeoutMs: error.timeoutMs,
          guidance: 'Query took too long to execute. Try simplifying your question.',
        },
        retryable: true,
      });
    } else if (error instanceof LLMProviderError) {
      const statusCode = error.statusCode || 503;
      reply.status(statusCode).send({
        ...errorResponse,
        error: 'LLMProviderError',
        details: {
          provider: error.provider,
          statusCode: error.statusCode,
        },
        retryable: statusCode >= 500,
      });
    } else if (error instanceof DatabaseError) {
      reply.status(500).send({
        ...errorResponse,
        error: 'DatabaseError',
        message: 'Database operation failed',
        details: {
          operation: error.operation,
        },
        retryable: true,
      });
    } else if (error instanceof CacheError) {
      // Cache errors are non-critical - log but don't fail request
      request.log.warn({ error }, 'Cache operation failed');
      reply.status(500).send({
        ...errorResponse,
        error: 'CacheError',
        message: 'Cache operation failed',
        details: {
          operation: error.operation,
        },
        retryable: true,
      });
    } else if ('statusCode' in error && typeof error.statusCode === 'number') {
      // Fastify errors with status code
      const fastifyError = error as FastifyError;
      reply.status(fastifyError.statusCode).send({
        ...errorResponse,
        error: fastifyError.code || 'FastifyError',
        retryable: fastifyError.statusCode >= 500,
      });
    } else if (error.name === 'ZodError') {
      // Zod validation errors
      reply.status(400).send({
        ...errorResponse,
        error: 'ValidationError',
        message: 'Request validation failed',
        details: (error as any).errors,
        retryable: false,
      });
    } else {
      // Generic error - don't expose internals in production
      const isProduction = process.env.NODE_ENV === 'production';

      reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: isProduction
          ? 'An unexpected error occurred'
          : error.message,
        details: isProduction ? undefined : {
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
        },
        timestamp: new Date().toISOString(),
        requestId,
        retryable: true,
      });
    }
  };
}

/**
 * Request logging middleware
 * Logs incoming requests with timing information
 */
export function createRequestLogger() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const startTime = Date.now();

    // Log request
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      'Incoming request'
    );

    // Log response when done
    reply.addHook('onSend', async (req, rep, payload) => {
      const duration = Date.now() - startTime;

      req.log.info(
        {
          requestId: req.id,
          method: req.method,
          url: req.url,
          statusCode: rep.statusCode,
          duration,
        },
        `Request completed in ${duration}ms`
      );

      return payload;
    });
  };
}

/**
 * Async error wrapper for route handlers
 * Ensures async errors are caught and passed to error handler
 */
export function asyncHandler<T>(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<T> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      throw error; // Let global error handler catch it
    }
  };
}

/**
 * Validation helper for request body/query
 */
export function validateRequest<T>(
  data: unknown,
  schema: { parse: (data: unknown) => T }
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw new ValidationError('Request validation failed', (error as any).errors);
    }
    throw error;
  }
}
