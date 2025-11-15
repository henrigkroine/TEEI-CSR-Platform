/**
 * Shared Idempotency Cache Utility
 * Extracted from Benevity client for reuse across all connectors
 *
 * Purpose: Prevent duplicate deliveries by caching responses for 24 hours
 * Storage: Redis-backed with automatic TTL expiry
 * Usage: All external API connectors (Benevity, Goodera, Workday)
 *
 * Ref: reports/worker-integrations/integration-audit-findings.md § Finding 5
 */

import crypto from 'crypto';
import type { Redis } from 'ioredis';

export interface IdempotencyCacheConfig {
  redis?: Redis;
  ttlSeconds?: number; // Default: 24 hours
  keyPrefix?: string;  // Default: 'idempotency'
}

export interface CachedResponse<T = any> {
  data: T;
  fromCache: boolean;
  cachedAt?: Date;
}

/**
 * Idempotency Cache Manager
 * Handles idempotency key generation, cache lookup, and storage
 */
export class IdempotencyCache {
  private redis?: Redis;
  private ttlSeconds: number;
  private keyPrefix: string;

  constructor(config: IdempotencyCacheConfig = {}) {
    this.redis = config.redis;
    this.ttlSeconds = config.ttlSeconds ?? 86400; // 24 hours default
    this.keyPrefix = config.keyPrefix ?? 'idempotency';
  }

  /**
   * Generate deterministic idempotency key from payload
   * Uses SHA-256 hash of payload for consistent key generation
   *
   * @param platform Platform name (benevity, goodera, workday)
   * @param payload Payload object to hash
   * @param salt Optional salt for additional uniqueness
   * @returns 64-character hex string (SHA-256)
   */
  generateKey(platform: string, payload: any, salt?: string): string {
    // Normalize payload for consistent hashing
    const normalizedPayload = this.normalizePayload(payload);
    const dataToHash = salt
      ? `${platform}:${normalizedPayload}:${salt}`
      : `${platform}:${normalizedPayload}`;

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Normalize payload for consistent hashing
   * Sorts object keys and stringifies to ensure identical payloads produce same hash
   */
  private normalizePayload(payload: any): string {
    if (typeof payload === 'string') {
      return payload;
    }

    // Sort keys recursively for stable stringification
    const sortObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sortObject);
      }

      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = sortObject(obj[key]);
          return sorted;
        }, {} as any);
    };

    return JSON.stringify(sortObject(payload));
  }

  /**
   * Check cache for existing response
   * Returns cached response if exists, null otherwise
   *
   * @param platform Platform name (benevity, goodera, workday)
   * @param idempotencyKey Idempotency key (use generateKey() to create)
   * @returns Cached response or null
   */
  async checkCache<T = any>(platform: string, idempotencyKey: string): Promise<CachedResponse<T> | null> {
    if (!this.redis) {
      return null; // Cache disabled
    }

    try {
      const cacheKey = this.buildCacheKey(platform, idempotencyKey);
      const cached = await this.redis.get(cacheKey);

      if (!cached) {
        return null; // Cache miss
      }

      const parsedCache = JSON.parse(cached);

      return {
        data: parsedCache.data,
        fromCache: true,
        cachedAt: new Date(parsedCache.cachedAt),
      };
    } catch (error) {
      console.warn(`[Idempotency] Cache read failed for ${platform}:`, error);
      return null; // Graceful degradation on cache errors
    }
  }

  /**
   * Store response in cache for idempotency
   * Only caches successful responses (failures should be retried)
   *
   * @param platform Platform name (benevity, goodera, workday)
   * @param idempotencyKey Idempotency key (use generateKey() to create)
   * @param response Response data to cache
   */
  async storeCache<T = any>(
    platform: string,
    idempotencyKey: string,
    response: T
  ): Promise<void> {
    if (!this.redis) {
      return; // Cache disabled
    }

    try {
      const cacheKey = this.buildCacheKey(platform, idempotencyKey);
      const cacheValue = JSON.stringify({
        data: response,
        cachedAt: new Date().toISOString(),
      });

      await this.redis.setex(cacheKey, this.ttlSeconds, cacheValue);

      console.log(
        `[Idempotency] Cached response for ${platform} (TTL: ${this.ttlSeconds}s, key: ${idempotencyKey.substring(0, 12)}...)`
      );
    } catch (error) {
      console.warn(`[Idempotency] Cache write failed for ${platform} (non-fatal):`, error);
      // Don't throw - cache failures should not break delivery
    }
  }

  /**
   * Invalidate cache entry (for manual override or error recovery)
   *
   * @param platform Platform name (benevity, goodera, workday)
   * @param idempotencyKey Idempotency key to invalidate
   */
  async invalidateCache(platform: string, idempotencyKey: string): Promise<void> {
    if (!this.redis) {
      return; // Cache disabled
    }

    try {
      const cacheKey = this.buildCacheKey(platform, idempotencyKey);
      await this.redis.del(cacheKey);

      console.log(`[Idempotency] Invalidated cache for ${platform} (key: ${idempotencyKey.substring(0, 12)}...)`);
    } catch (error) {
      console.warn(`[Idempotency] Cache invalidation failed for ${platform}:`, error);
    }
  }

  /**
   * Get cache statistics for monitoring
   *
   * @param platform Platform name (benevity, goodera, workday)
   * @returns Cache stats (keys, memory usage)
   */
  async getCacheStats(platform: string): Promise<{
    keyCount: number;
    memorySizeBytes?: number;
  }> {
    if (!this.redis) {
      return { keyCount: 0 };
    }

    try {
      const pattern = this.buildCacheKey(platform, '*');
      const keys = await this.redis.keys(pattern);

      let totalMemory = 0;
      for (const key of keys) {
        const memoryUsage = await this.redis.memory('USAGE', key);
        if (typeof memoryUsage === 'number') {
          totalMemory += memoryUsage;
        }
      }

      return {
        keyCount: keys.length,
        memorySizeBytes: totalMemory > 0 ? totalMemory : undefined,
      };
    } catch (error) {
      console.warn(`[Idempotency] Cache stats failed for ${platform}:`, error);
      return { keyCount: 0 };
    }
  }

  /**
   * Build cache key with namespace
   * Format: {prefix}:{platform}:{idempotencyKey}
   * Example: idempotency:goodera:a1b2c3d4e5f6...
   */
  private buildCacheKey(platform: string, idempotencyKey: string): string {
    return `${this.keyPrefix}:${platform}:${idempotencyKey}`;
  }
}

/**
 * Create idempotency cache from environment variables
 * Convenience factory for common use case
 */
export function createIdempotencyCache(redis?: Redis): IdempotencyCache {
  return new IdempotencyCache({
    redis,
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_CACHE_TTL || '86400'),
    keyPrefix: process.env.IDEMPOTENCY_CACHE_PREFIX || 'idempotency',
  });
}
