import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-connector:resilience');

/**
 * Bulkhead isolation pattern
 * Limits concurrent execution to prevent resource exhaustion
 */
export class Bulkhead {
  private activeCount = 0;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    private name: string,
    private maxConcurrent: number,
    private maxQueueSize: number = 100
  ) {}

  /**
   * Execute a function with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If under capacity, execute immediately
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;

      logger.debug(
        {
          bulkhead: this.name,
          activeCount: this.activeCount,
          maxConcurrent: this.maxConcurrent,
        },
        'Executing request in bulkhead'
      );

      try {
        const result = await fn();
        return result;
      } finally {
        this.activeCount--;
        this.processQueue();
      }
    }

    // If queue is full, reject immediately
    if (this.queue.length >= this.maxQueueSize) {
      logger.error(
        {
          bulkhead: this.name,
          queueSize: this.queue.length,
          maxQueueSize: this.maxQueueSize,
        },
        'Bulkhead queue is full, rejecting request'
      );

      throw new Error(
        `Bulkhead ${this.name} is at capacity (queue full: ${this.maxQueueSize})`
      );
    }

    // Queue the request
    logger.info(
      {
        bulkhead: this.name,
        queueSize: this.queue.length + 1,
        activeCount: this.activeCount,
      },
      'Queueing request in bulkhead'
    );

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<any>,
        resolve,
        reject,
      });
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    if (this.activeCount >= this.maxConcurrent) {
      return;
    }

    const { fn, resolve, reject } = this.queue.shift()!;

    this.activeCount++;

    logger.debug(
      {
        bulkhead: this.name,
        activeCount: this.activeCount,
        queueSize: this.queue.length,
      },
      'Processing queued request from bulkhead'
    );

    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.activeCount--;
        this.processQueue();
      });
  }

  /**
   * Get current bulkhead stats
   */
  getStats(): {
    name: string;
    activeCount: number;
    queueSize: number;
    maxConcurrent: number;
    maxQueueSize: number;
    utilization: number;
  } {
    return {
      name: this.name,
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      utilization: this.activeCount / this.maxConcurrent,
    };
  }
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private name: string,
    private maxTokens: number,
    private refillRate: number, // tokens per second
    private refillInterval: number = 1000 // ms
  ) {
    this.tokens = maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempt to acquire a token
   * @param count Number of tokens to acquire (default: 1)
   * @returns true if tokens acquired, false if rate limit exceeded
   */
  tryAcquire(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;

      logger.debug(
        {
          rateLimiter: this.name,
          tokensRemaining: this.tokens,
          maxTokens: this.maxTokens,
        },
        `Acquired ${count} token(s)`
      );

      return true;
    }

    logger.warn(
      {
        rateLimiter: this.name,
        tokensRequested: count,
        tokensAvailable: this.tokens,
      },
      'Rate limit exceeded'
    );

    return false;
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(count: number = 1): Promise<void> {
    while (!this.tryAcquire(count)) {
      // Wait for next refill interval
      await new Promise((resolve) => setTimeout(resolve, this.refillInterval));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTime;

    if (elapsedMs >= this.refillInterval) {
      const intervalsElapsed = Math.floor(elapsedMs / this.refillInterval);
      const tokensToAdd =
        intervalsElapsed * (this.refillRate * (this.refillInterval / 1000));

      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;

      logger.debug(
        {
          rateLimiter: this.name,
          tokensAdded: tokensToAdd,
          tokensAvailable: this.tokens,
        },
        'Refilled tokens'
      );
    }
  }

  /**
   * Get current rate limiter stats
   */
  getStats(): {
    name: string;
    tokensAvailable: number;
    maxTokens: number;
    refillRate: number;
    utilization: number;
  } {
    this.refill(); // Ensure tokens are up-to-date

    return {
      name: this.name,
      tokensAvailable: this.tokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      utilization: 1 - this.tokens / this.maxTokens,
    };
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();

    logger.info({ rateLimiter: this.name }, 'Rate limiter reset');
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        logger.error(
          { operationName, timeoutMs },
          `Operation timed out after ${timeoutMs}ms`
        );
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    ),
  ]);
}

/**
 * Global bulkheads for different operation types
 */
export const bulkheads = {
  /**
   * Bulkhead for database operations
   * Limits concurrent DB queries to prevent connection pool exhaustion
   */
  database: new Bulkhead('database', 10, 50),

  /**
   * Bulkhead for external API calls
   * Limits concurrent external requests
   */
  externalApi: new Bulkhead('external-api', 5, 20),

  /**
   * Bulkhead for CPU-intensive operations
   * Limits concurrent heavy computations
   */
  cpuIntensive: new Bulkhead('cpu-intensive', 2, 10),

  /**
   * Bulkhead for webhook processing
   * Limits concurrent webhook handlers
   */
  webhookProcessing: new Bulkhead('webhook-processing', 20, 100),
};

/**
 * Global rate limiters
 */
export const rateLimiters = {
  /**
   * Rate limiter for webhook delivery
   * 100 webhooks per second
   */
  webhookDelivery: new RateLimiter('webhook-delivery', 100, 100),

  /**
   * Rate limiter for external API calls
   * 10 calls per second
   */
  externalApi: new RateLimiter('external-api', 10, 10),

  /**
   * Rate limiter for database writes
   * 50 writes per second
   */
  databaseWrites: new RateLimiter('database-writes', 50, 50),
};

/**
 * Fallback handler
 * Executes a fallback function if the main function fails
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  operationName: string = 'operation'
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    logger.warn(
      { error, operationName },
      `${operationName} failed, executing fallback`
    );

    try {
      return await fallbackFn();
    } catch (fallbackError: any) {
      logger.error(
        { error: fallbackError, originalError: error, operationName },
        `${operationName} fallback also failed`
      );

      throw fallbackError;
    }
  }
}

/**
 * Get stats for all bulkheads and rate limiters
 */
export function getResilienceStats(): {
  bulkheads: Record<string, ReturnType<Bulkhead['getStats']>>;
  rateLimiters: Record<string, ReturnType<RateLimiter['getStats']>>;
} {
  const bulkheadStats: Record<string, ReturnType<Bulkhead['getStats']>> = {};
  const rateLimiterStats: Record<string, ReturnType<RateLimiter['getStats']>> =
    {};

  for (const [name, bulkhead] of Object.entries(bulkheads)) {
    bulkheadStats[name] = bulkhead.getStats();
  }

  for (const [name, rateLimiter] of Object.entries(rateLimiters)) {
    rateLimiterStats[name] = rateLimiter.getStats();
  }

  return {
    bulkheads: bulkheadStats,
    rateLimiters: rateLimiterStats,
  };
}
