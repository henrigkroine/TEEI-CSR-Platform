import Redis from 'ioredis';
import { createServiceLogger } from '@teei/shared-utils';
import crypto from 'crypto';

const logger = createServiceLogger('analytics:cache');

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (error) => {
      logger.error('Redis error', { error });
    });

    logger.info('Redis client initialized', { redisUrl });
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis client closed');
  }
}

export interface CacheOptions {
  ttl?: number; // TTL in seconds
  prefix?: string;
}

/**
 * Generate cache key from endpoint and parameters
 */
export function generateCacheKey(
  endpoint: string,
  companyId: string,
  params: Record<string, any>
): string {
  // Sort params for consistent hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedParams))
    .digest('hex')
    .substring(0, 16);

  return `analytics:${endpoint}:${companyId}:${paramsHash}`;
}

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const cached = await client.get(key);

    if (!cached) {
      return null;
    }

    const data = JSON.parse(cached);
    logger.debug('Cache hit', { key });
    return data as T;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

/**
 * Set data in cache with TTL
 */
export async function setInCache(
  key: string,
  data: any,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(data));
    logger.debug('Cache set', { key, ttl: ttlSeconds });
  } catch (error) {
    logger.error('Cache set error', { key, error });
  }
}

/**
 * Invalidate cache for a specific pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await client.del(...keys);
    logger.info('Cache invalidated', { pattern, keysDeleted: deleted });
    return deleted;
  } catch (error) {
    logger.error('Cache invalidation error', { pattern, error });
    return 0;
  }
}

/**
 * Invalidate all analytics cache for a company
 */
export async function invalidateCompanyCache(companyId: string): Promise<number> {
  return invalidateCache(`analytics:*:${companyId}:*`);
}

/**
 * Invalidate all analytics cache
 */
export async function invalidateAllAnalyticsCache(): Promise<number> {
  return invalidateCache('analytics:*');
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
  try {
    const client = getRedisClient();
    const info = await client.info('stats');
    const memory = await client.info('memory');

    // Parse Redis INFO output
    const parseInfo = (infoStr: string): Record<string, string> => {
      const lines = infoStr.split('\r\n');
      return lines.reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);
    };

    const stats = parseInfo(info);
    const memStats = parseInfo(memory);

    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const keys = await client.dbsize();

    return {
      hits,
      misses,
      keys,
      memory: memStats.used_memory_human || '0B',
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error });
    return { hits: 0, misses: 0, keys: 0, memory: '0B' };
  }
}

/**
 * Cache middleware for query execution
 */
export async function withCache<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; cached: boolean }> {
  const { ttl = 3600 } = options;

  // Try to get from cache
  const cached = await getFromCache<T>(cacheKey);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // Execute query
  const data = await queryFn();

  // Store in cache
  await setInCache(cacheKey, data, ttl);

  return { data, cached: false };
}

/**
 * Health check for Redis
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}
