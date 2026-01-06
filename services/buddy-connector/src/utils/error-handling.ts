import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-connector:error-handling');

/**
 * Error categories for webhook processing
 */
export enum ErrorCategory {
  /** Transient errors that should be retried (network, timeout, rate limit) */
  TRANSIENT = 'transient',

  /** Permanent errors that should not be retried (validation, not found, unauthorized) */
  PERMANENT = 'permanent',

  /** Critical errors requiring immediate attention (database down, service unavailable) */
  CRITICAL = 'critical',

  /** Unknown errors that need investigation */
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels for monitoring and alerting
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Categorized error with context
 */
export interface CategorizedError {
  /** Original error */
  error: Error;

  /** Error category */
  category: ErrorCategory;

  /** Error severity */
  severity: ErrorSeverity;

  /** Whether this error should be retried */
  shouldRetry: boolean;

  /** User-friendly error message */
  userMessage: string;

  /** Technical error context */
  context: Record<string, any>;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** Suggested retry delay in milliseconds */
  retryDelayMs?: number;
}

/**
 * Categorize an error based on its type and properties
 */
export function categorizeError(
  error: any,
  context: Record<string, any> = {}
): CategorizedError {
  // Network and timeout errors - TRANSIENT
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'EAI_AGAIN' ||
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('network')
  ) {
    return {
      error,
      category: ErrorCategory.TRANSIENT,
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true,
      userMessage: 'Network connection issue. Please try again.',
      context: { ...context, errorCode: error.code },
      retryDelayMs: 5000, // 5 seconds
    };
  }

  // Rate limiting - TRANSIENT
  if (
    error.statusCode === 429 ||
    error.status === 429 ||
    error.message?.toLowerCase().includes('rate limit') ||
    error.message?.toLowerCase().includes('too many requests')
  ) {
    const retryAfter = error.headers?.['retry-after']
      ? parseInt(error.headers['retry-after']) * 1000
      : 60000;

    return {
      error,
      category: ErrorCategory.TRANSIENT,
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true,
      userMessage: 'Service is temporarily busy. Will retry shortly.',
      context: { ...context, retryAfter },
      statusCode: 429,
      retryDelayMs: retryAfter,
    };
  }

  // Service unavailable / Gateway errors - TRANSIENT
  if (
    error.statusCode === 502 ||
    error.statusCode === 503 ||
    error.statusCode === 504 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  ) {
    return {
      error,
      category: ErrorCategory.TRANSIENT,
      severity: ErrorSeverity.HIGH,
      shouldRetry: true,
      userMessage: 'Service temporarily unavailable. Will retry.',
      context: { ...context, statusCode: error.statusCode || error.status },
      statusCode: error.statusCode || error.status,
      retryDelayMs: 10000, // 10 seconds
    };
  }

  // Database errors - CRITICAL
  if (
    error.code?.startsWith('PG') || // PostgreSQL errors
    error.code === 'ECONNREFUSED' && context.database ||
    error.message?.toLowerCase().includes('database') ||
    error.message?.toLowerCase().includes('connection pool')
  ) {
    return {
      error,
      category: ErrorCategory.CRITICAL,
      severity: ErrorSeverity.CRITICAL,
      shouldRetry: true, // Retry with backoff, but alert immediately
      userMessage: 'Database connection issue. Our team has been notified.',
      context: { ...context, errorCode: error.code },
      retryDelayMs: 30000, // 30 seconds
    };
  }

  // Validation errors - PERMANENT
  if (
    error.statusCode === 400 ||
    error.status === 400 ||
    error.name === 'ValidationError' ||
    error.name === 'ZodError' ||
    error.message?.toLowerCase().includes('validation') ||
    error.message?.toLowerCase().includes('invalid')
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.LOW,
      shouldRetry: false,
      userMessage: 'Invalid data received. Manual review required.',
      context: { ...context, validationErrors: error.errors },
      statusCode: 400,
    };
  }

  // Authentication errors - PERMANENT
  if (
    error.statusCode === 401 ||
    error.status === 401 ||
    error.message?.toLowerCase().includes('unauthorized') ||
    error.message?.toLowerCase().includes('authentication')
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.HIGH,
      shouldRetry: false,
      userMessage: 'Authentication failed. Please check credentials.',
      context: { ...context },
      statusCode: 401,
    };
  }

  // Authorization errors - PERMANENT
  if (
    error.statusCode === 403 ||
    error.status === 403 ||
    error.message?.toLowerCase().includes('forbidden') ||
    error.message?.toLowerCase().includes('permission')
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.HIGH,
      shouldRetry: false,
      userMessage: 'Access forbidden. Please check permissions.',
      context: { ...context },
      statusCode: 403,
    };
  }

  // Not found errors - PERMANENT
  if (
    error.statusCode === 404 ||
    error.status === 404 ||
    error.message?.toLowerCase().includes('not found')
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.LOW,
      shouldRetry: false,
      userMessage: 'Resource not found.',
      context: { ...context },
      statusCode: 404,
    };
  }

  // Conflict errors - PERMANENT (might be idempotency)
  if (
    error.statusCode === 409 ||
    error.status === 409 ||
    error.message?.toLowerCase().includes('conflict') ||
    error.message?.toLowerCase().includes('duplicate')
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.LOW,
      shouldRetry: false,
      userMessage: 'Resource conflict or duplicate.',
      context: { ...context },
      statusCode: 409,
    };
  }

  // Unprocessable entity - PERMANENT
  if (
    error.statusCode === 422 ||
    error.status === 422
  ) {
    return {
      error,
      category: ErrorCategory.PERMANENT,
      severity: ErrorSeverity.LOW,
      shouldRetry: false,
      userMessage: 'Data could not be processed. Manual review required.',
      context: { ...context },
      statusCode: 422,
    };
  }

  // Internal server errors - TRANSIENT (might be temporary)
  if (
    error.statusCode === 500 ||
    error.status === 500 ||
    error.message?.toLowerCase().includes('internal server error')
  ) {
    return {
      error,
      category: ErrorCategory.TRANSIENT,
      severity: ErrorSeverity.HIGH,
      shouldRetry: true,
      userMessage: 'Internal server error. Will retry.',
      context: { ...context },
      statusCode: 500,
      retryDelayMs: 15000, // 15 seconds
    };
  }

  // Default: UNKNOWN
  logger.warn(
    { error, context },
    'Unknown error type encountered, categorizing as UNKNOWN'
  );

  return {
    error,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    shouldRetry: true, // Default to retry for unknown errors
    userMessage: 'An unexpected error occurred. Our team has been notified.',
    context: { ...context, errorType: error.constructor.name },
    retryDelayMs: 20000, // 20 seconds
  };
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(
  categorizedError: CategorizedError,
  deliveryId: string
): {
  status: string;
  message: string;
  deliveryId: string;
  category: ErrorCategory;
  shouldRetry: boolean;
  retryAfter?: number;
} {
  return {
    status: 'error',
    message: categorizedError.userMessage,
    deliveryId,
    category: categorizedError.category,
    shouldRetry: categorizedError.shouldRetry,
    retryAfter: categorizedError.retryDelayMs
      ? Math.floor(categorizedError.retryDelayMs / 1000)
      : undefined,
  };
}

/**
 * Log error with appropriate level based on severity
 */
export function logError(
  categorizedError: CategorizedError,
  deliveryId: string,
  eventType: string
): void {
  const logContext = {
    deliveryId,
    eventType,
    category: categorizedError.category,
    severity: categorizedError.severity,
    shouldRetry: categorizedError.shouldRetry,
    statusCode: categorizedError.statusCode,
    ...categorizedError.context,
  };

  switch (categorizedError.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(
        { error: categorizedError.error, ...logContext },
        `CRITICAL ERROR: ${categorizedError.userMessage}`
      );
      break;

    case ErrorSeverity.HIGH:
      logger.error(
        { error: categorizedError.error, ...logContext },
        `High severity error: ${categorizedError.userMessage}`
      );
      break;

    case ErrorSeverity.MEDIUM:
      logger.warn(
        { error: categorizedError.error, ...logContext },
        `Medium severity error: ${categorizedError.userMessage}`
      );
      break;

    case ErrorSeverity.LOW:
      logger.info(
        { error: categorizedError.error, ...logContext },
        `Low severity error: ${categorizedError.userMessage}`
      );
      break;
  }
}
