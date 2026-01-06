/**
 * Retry Logic with Exponential Backoff and Jitter
 * Handles transient failures for external API calls
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead
 */

export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryableErrors?: string[];
}

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalDelayMs: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitterFactor } = config;

  // Calculate exponential backoff
  const baseDelay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);

  // Add jitter (random variation to prevent thundering herd)
  const jitter = baseDelay * jitterFactor * (Math.random() * 2 - 1);
  const delay = Math.max(0, baseDelay + jitter);

  return Math.floor(delay);
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: any, config: Required<RetryConfig>): boolean {
  // Network errors
  if (error.code && config.retryableErrors.includes(error.code)) {
    return true;
  }

  // HTTP status codes (429 = rate limit, 5xx = server errors)
  if (error.statusCode) {
    const status = error.statusCode;
    if (status === 429 || status === 503 || status === 504) {
      return true;
    }
  }

  // Check for specific error messages
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @param onRetry - Optional callback on each retry
 * @returns Result of successful function execution
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt >= finalConfig.maxAttempts || !isRetryableError(error, finalConfig)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, finalConfig);
      totalDelayMs += delay;

      // Notify retry callback
      if (onRetry) {
        onRetry({
          attempt,
          lastError,
          totalDelayMs,
        });
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed with no error');
}

/**
 * Retry with custom error classification
 * Allows caller to determine which errors are retryable
 */
export async function retryWithClassifier<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any, attempt: number) => boolean,
  config: RetryConfig = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry using custom classifier
      if (attempt >= finalConfig.maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, finalConfig);
      totalDelayMs += delay;

      // Notify retry callback
      if (onRetry) {
        onRetry({
          attempt,
          lastError,
          totalDelayMs,
        });
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with no error');
}

/**
 * Parse Retry-After header from response
 * Returns delay in milliseconds
 */
export function parseRetryAfter(retryAfterHeader: string | undefined): number | undefined {
  if (!retryAfterHeader) {
    return undefined;
  }

  // Try parsing as seconds
  const seconds = parseInt(retryAfterHeader, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfterHeader);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}

/**
 * Retry with respect to Retry-After header
 * Useful for rate-limited APIs
 */
export async function retryWithRateLimitRespect<T>(
  fn: () => Promise<{ data: T; headers?: Record<string, string> }>,
  config: RetryConfig = {},
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result.data;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt >= finalConfig.maxAttempts || !isRetryableError(error, finalConfig)) {
        throw error;
      }

      // Check for Retry-After header
      let delay = calculateDelay(attempt, finalConfig);
      if (error.headers?.['retry-after']) {
        const retryAfterMs = parseRetryAfter(error.headers['retry-after']);
        if (retryAfterMs !== undefined) {
          delay = Math.min(retryAfterMs, finalConfig.maxDelayMs);
        }
      }

      totalDelayMs += delay;

      // Notify retry callback
      if (onRetry) {
        onRetry({
          attempt,
          lastError,
          totalDelayMs,
        });
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with no error');
}
