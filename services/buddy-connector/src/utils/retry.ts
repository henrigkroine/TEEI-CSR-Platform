import { createServiceLogger } from '@teei/shared-utils';
import { ErrorCategory, categorizeError } from './error-handling.js';

const logger = createServiceLogger('buddy-connector:retry');

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;

  /** Initial delay in milliseconds */
  initialDelayMs: number;

  /** Maximum delay in milliseconds */
  maxDelayMs: number;

  /** Backoff multiplier (2 = exponential) */
  backoffMultiplier: number;

  /** Jitter factor (0-1, adds randomness to delays) */
  jitterFactor: number;

  /** Timeout for each attempt in milliseconds */
  timeoutMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 60 seconds
  backoffMultiplier: 2, // Exponential backoff
  jitterFactor: 0.1, // 10% jitter
  timeoutMs: 30000, // 30 seconds per attempt
};

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attemptNumber)
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter: random value between (1 - jitter) and (1 + jitter)
  const jitterMultiplier =
    1 + (Math.random() * 2 - 1) * config.jitterFactor;

  return Math.floor(cappedDelay * jitterMultiplier);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: {
    operationName: string;
    deliveryId: string;
    eventType: string;
  },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;
  let attemptNumber = 0;

  while (attemptNumber < config.maxRetries) {
    try {
      logger.debug(
        {
          ...context,
          attemptNumber: attemptNumber + 1,
          maxRetries: config.maxRetries,
        },
        `Executing ${context.operationName}`
      );

      // Execute with timeout
      const result = await executeWithTimeout(fn, config.timeoutMs);

      if (attemptNumber > 0) {
        logger.info(
          {
            ...context,
            attemptNumber: attemptNumber + 1,
          },
          `${context.operationName} succeeded after ${attemptNumber + 1} attempts`
        );
      }

      return result;
    } catch (error: any) {
      lastError = error;
      attemptNumber++;

      // Categorize error to determine if we should retry
      const categorizedError = categorizeError(error, context);

      logger.warn(
        {
          ...context,
          error,
          attemptNumber,
          maxRetries: config.maxRetries,
          errorCategory: categorizedError.category,
          shouldRetry: categorizedError.shouldRetry,
        },
        `${context.operationName} failed (attempt ${attemptNumber}/${config.maxRetries})`
      );

      // Don't retry permanent errors
      if (!categorizedError.shouldRetry) {
        logger.error(
          { ...context, error, errorCategory: categorizedError.category },
          `${context.operationName} failed with permanent error, not retrying`
        );
        throw error;
      }

      // If we've exhausted retries, throw
      if (attemptNumber >= config.maxRetries) {
        logger.error(
          { ...context, error, attemptNumber, maxRetries: config.maxRetries },
          `${context.operationName} failed after ${config.maxRetries} retries`
        );
        throw error;
      }

      // Calculate backoff delay
      const delayMs = categorizedError.retryDelayMs
        ? categorizedError.retryDelayMs // Use error-specific delay
        : calculateBackoffDelay(attemptNumber, config);

      logger.info(
        {
          ...context,
          attemptNumber,
          delayMs,
          nextAttempt: attemptNumber + 1,
        },
        `Retrying ${context.operationName} after ${delayMs}ms`
      );

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError;
}

/**
 * Execute a function with timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit is open, requests fail fast
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold before opening circuit */
  failureThreshold: number;

  /** Success threshold in half-open state before closing */
  successThreshold: number;

  /** Time in ms to wait before attempting half-open */
  resetTimeoutMs: number;

  /** Time window in ms for tracking failures */
  windowMs: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  resetTimeoutMs: 60000, // 60 seconds
  windowMs: 120000, // 2 minutes
};

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private failures: number[] = []; // Timestamps of failures

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      // Check if we should attempt half-open
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs
      ) {
        logger.info(
          { circuitBreaker: this.name },
          'Circuit breaker entering HALF_OPEN state'
        );
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        logger.warn(
          {
            circuitBreaker: this.name,
            state: this.state,
            lastFailureTime: this.lastFailureTime,
          },
          'Circuit breaker is OPEN, failing fast'
        );
        throw new Error(
          `Circuit breaker ${this.name} is OPEN - service unavailable`
        );
      }
    }

    try {
      const result = await fn();

      // Success - update state
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure - update state
      this.onFailure();

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        logger.info(
          { circuitBreaker: this.name },
          'Circuit breaker closing after successful recovery'
        );
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.failures = [];
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures.push(this.lastFailureTime);

    // Remove failures outside time window
    this.failures = this.failures.filter(
      (timestamp) => this.lastFailureTime! - timestamp < this.config.windowMs
    );

    // If in half-open, immediately open
    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(
        { circuitBreaker: this.name },
        'Circuit breaker opening from HALF_OPEN after failure'
      );
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      return;
    }

    // Check if we should open circuit
    if (this.failures.length >= this.config.failureThreshold) {
      logger.error(
        {
          circuitBreaker: this.name,
          failureCount: this.failures.length,
          threshold: this.config.failureThreshold,
        },
        'Circuit breaker opening due to failure threshold'
      );
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failures.length,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    logger.info({ circuitBreaker: this.name }, 'Resetting circuit breaker');
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failures = [];
  }
}

/**
 * Global circuit breakers for external services
 */
export const circuitBreakers = {
  buddySystem: new CircuitBreaker('buddy-system', DEFAULT_CIRCUIT_CONFIG),
  database: new CircuitBreaker('database', {
    ...DEFAULT_CIRCUIT_CONFIG,
    failureThreshold: 3, // More sensitive for database
    resetTimeoutMs: 30000, // Faster reset for database
  }),
};
