/**
 * Redis Cache Client for Insights NLQ Service
 *
 * Provides caching layer for query results and rate limiting.
 */

import Redis from 'ioredis';
import { config } from '../config.js';

let redis: Redis | null = null;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<void> {
  if (redis) {
    return; // Already initialized
  }

  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  // Connect and test
  await redis.connect();
  await redis.ping();

  // Error handling
  redis.on('error', (error) => {
    console.error('Redis error:', error);
  });

  redis.on('reconnecting', () => {
    console.log('Redis reconnecting...');
  });
}

/**
 * Get Redis client
 */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Health check for Redis
 */
export async function healthCheck(): Promise<boolean> {
  if (!redis) {
    return false;
  }

  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  keys: number;
  memory: string;
}> {
  if (!redis) {
    throw new Error('Redis not initialized');
  }

  const prefix = config.redis.keyPrefix;
  const pattern = `${prefix}*`;

  // Get key count
  const keys = await redis.keys(pattern);
  const keyCount = keys.length;

  // Get memory usage
  const info = await redis.info('memory');
  const memoryMatch = info.match(/used_memory_human:(.+)/);
  const memory = memoryMatch ? memoryMatch[1].trim() : '0B';

  // Get hit/miss stats from separate counters
  const hits = parseInt(await redis.get(`${prefix}stats:hits`) || '0', 10);
  const misses = parseInt(await redis.get(`${prefix}stats:misses`) || '0', 10);

  return {
    hits,
    misses,
    keys: keyCount,
    memory,
  };
}

/**
 * Increment cache hit counter
 */
export async function incrementHits(): Promise<void> {
  if (redis) {
    await redis.incr(`${config.redis.keyPrefix}stats:hits`);
  }
}

/**
 * Increment cache miss counter
 */
export async function incrementMisses(): Promise<void> {
  if (redis) {
    await redis.incr(`${config.redis.keyPrefix}stats:misses`);
  }
}

/**
 * Clear all cache keys
 */
export async function clearCache(): Promise<number> {
  if (!redis) {
    throw new Error('Redis not initialized');
  }

  const prefix = config.redis.keyPrefix;
  const pattern = `${prefix}*`;
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return 0;
  }

  await redis.del(...keys);
  return keys.length;
}
