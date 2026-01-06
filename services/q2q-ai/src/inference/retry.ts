import { RetryConfig, RateLimitError } from './types.js';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors are always retryable
  if (error instanceof RateLimitError) {
    return true;
  }

  // Check for retryable property
  if (error.retryable === true) {
    return true;
  }

  // Network errors are typically retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (Too Many Requests) is retryable
  if (error.status === 429) {
    return true;
  }

  return false;
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: { correlationId?: string; operation?: string } = {}
): Promise<T> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt >= fullConfig.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        break;
      }

      // Calculate delay
      let delayMs = calculateBackoffDelay(attempt, fullConfig);

      // If rate limit error has a retry-after header, use that
      if (error instanceof RateLimitError && error.message.includes('retry after')) {
        const match = error.message.match(/retry after (\d+)ms/);
        if (match) {
          delayMs = parseInt(match[1], 10);
        }
      }

      // Log retry attempt
      console.warn(
        `[${context.correlationId || 'unknown'}] ${context.operation || 'Operation'} failed (attempt ${attempt + 1}/${fullConfig.maxRetries + 1}), retrying in ${delayMs}ms:`,
        error.message
      );

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Retry decorator for class methods
 */
export function Retry(config?: Partial<RetryConfig>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        config,
        { operation: `${target.constructor.name}.${propertyKey}` }
      );
    };

    return descriptor;
  };
}
