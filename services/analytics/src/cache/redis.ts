import Redis from 'ioredis';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('redis-cache');

/**
 * Cache Key Patterns
 *
 * These patterns define the structure of cache keys used throughout the analytics service:
 *
 * - metrics:company:{companyId}:period:{period} - TTL: 1 hour (3600s)
 *   Time-series metrics for a company over a specific period
 *
 * - metrics:sroi:{companyId} - TTL: 24 hours (86400s)
 *   SROI calculation results for a company
 *
 * - metrics:vis:{companyId} - TTL: 24 hours (86400s)
 *   VIS calculation results for a company
 *
 * - metrics:q2q-feed:{companyId}:page:{page} - TTL: 5 minutes (300s)
 *   Q2Q feed data for pagination
 *
 * - metrics:evidence:{metricId} - TTL: 10 minutes (600s)
 *   Evidence data for specific metrics
 */

let redisClient: Redis | null = null;
let isConnected = false;

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Initialize Redis client with connection handling and retry logic
 */
export function initRedis(): Redis {
  if (redisClient && isConnected) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(redisUrl, {
    // Connection retry strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection failed. Retrying in ${delay}ms... (attempt ${times})`);
      return delay;
    },
    // Reconnect on error
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect when Redis is in readonly mode
        return true;
      }
      return false;
    },
    // Max retry attempts
    maxRetriesPerRequest: 3,
    // Enable keep alive
    enableReadyCheck: true,
    // Enable offline queue
    enableOfflineQueue: true,
  });

  // Connection event handlers
  redisClient.on('connect', () => {
    logger.info('Redis client connecting...');
  });

  redisClient.on('ready', () => {
    isConnected = true;
    logger.info('Redis client connected and ready');
  });

  redisClient.on('error', (err: Error) => {
    logger.error({ error: err }, 'Redis client error');
  });

  redisClient.on('close', () => {
    isConnected = false;
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  return redisClient;
}

/**
 * Get the Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is connected and healthy
 */
export async function healthCheck(): Promise<{ healthy: boolean; message: string }> {
  try {
    if (!redisClient || !isConnected) {
      return { healthy: false, message: 'Redis client not connected' };
    }

    // Try to ping Redis
    const result = await redisClient.ping();
    if (result === 'PONG') {
      return { healthy: true, message: 'Redis is healthy' };
    }

    return { healthy: false, message: 'Redis ping failed' };
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get cached value by key
 * @param key - Cache key
 * @returns Parsed JSON value or null if not found
 */
export async function get(key: string): Promise<any | null> {
  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (value === null) {
      cacheMisses++;
      return null;
    }

    cacheHits++;
    return JSON.parse(value);
  } catch (error) {
    logger.error({ error, key }, 'Error getting cached value');
    cacheMisses++;
    return null;
  }
}

/**
 * Set cached value with TTL
 * @param key - Cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttlSeconds - Time to live in seconds
 */
export async function set(key: string, value: any, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (error) {
    logger.error({ error, key }, 'Error setting cached value');
    // Don't throw - cache failures should not break the service
  }
}

/**
 * Delete cached value by key
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
    logger.debug({ key }, 'Cache key deleted');
  } catch (error) {
    logger.error({ error, key }, 'Error deleting cached value');
  }
}

/**
 * Delete all keys matching a pattern
 * @param pattern - Key pattern (e.g., "metrics:company:123:*")
 */
export async function delPattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();

    // Use SCAN to find all matching keys (safer than KEYS for production)
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await client.del(...keys);
      logger.info({ pattern, count: keys.length }, 'Cache keys deleted by pattern');
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Error deleting cached values by pattern');
  }
}

/**
 * Check if key exists in cache
 * @param key - Cache key
 * @returns True if key exists, false otherwise
 */
export async function exists(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error({ error, key }, 'Error checking key existence');
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  hits: number;
  misses: number;
  hitRate: number;
  total: number;
} {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? cacheHits / total : 0;

  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimal places
    total,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get count of keys matching a pattern
 * @param pattern - Key pattern (default: "metrics:*" for all analytics cache keys)
 */
export async function getKeyCount(pattern = 'metrics:*'): Promise<number> {
  try {
    const client = getRedisClient();

    let count = 0;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');

    return count;
  } catch (error) {
    logger.error({ error, pattern }, 'Error getting key count');
    return 0;
  }
}

/**
 * Gracefully disconnect Redis client
 */
export async function disconnect(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      isConnected = false;
      logger.info('Redis client disconnected');
    }
  } catch (error) {
    logger.error({ error }, 'Error disconnecting Redis client');
  }
}
