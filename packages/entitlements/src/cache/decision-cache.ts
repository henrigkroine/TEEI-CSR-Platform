/**
 * Decision Cache
 * Redis-based caching for entitlement decisions
 */

import Redis from 'ioredis';
import { createServiceLogger } from '@teei/shared-utils';
import {
  EntitlementCheckRequest,
  EntitlementDecision,
  CacheConfig,
} from '../types/index.js';

const logger = createServiceLogger('entitlements:cache');

export class DecisionCache {
  private redis: Redis;
  private ttl: number;
  private keyPrefix: string;

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.ttl = config.ttl;
    this.keyPrefix = config.keyPrefix;

    this.redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err });
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: EntitlementCheckRequest): string {
    const parts = [
      this.keyPrefix,
      request.companyId,
      request.userId || 'company',
      request.feature,
      request.action,
      request.resource || 'default',
    ];

    return parts.join(':');
  }

  /**
   * Get cached decision
   */
  async get(request: EntitlementCheckRequest): Promise<EntitlementDecision | null> {
    try {
      const key = this.getCacheKey(request);
      const cached = await this.redis.get(key);

      if (!cached) {
        return null;
      }

      const decision = JSON.parse(cached) as EntitlementDecision;

      // Check if decision has expired
      if (decision.expiresAt && new Date(decision.expiresAt) < new Date()) {
        await this.redis.del(key);
        return null;
      }

      logger.debug('Cache hit', { key });
      return decision;
    } catch (error) {
      logger.error('Cache get error', { error, request });
      return null;
    }
  }

  /**
   * Set cached decision
   */
  async set(
    request: EntitlementCheckRequest,
    decision: EntitlementDecision
  ): Promise<void> {
    try {
      const key = this.getCacheKey(request);
      const value = JSON.stringify(decision);

      // Use shorter TTL if decision has an expiration
      let ttl = this.ttl;
      if (decision.expiresAt) {
        const expiresIn = Math.floor(
          (new Date(decision.expiresAt).getTime() - Date.now()) / 1000
        );
        ttl = Math.min(ttl, Math.max(expiresIn, 0));
      }

      await this.redis.setex(key, ttl, value);
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set error', { error, request });
    }
  }

  /**
   * Invalidate cache for company
   */
  async invalidateCompany(companyId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:${companyId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache invalidated', { companyId, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', { error, companyId });
    }
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUser(companyId: string, userId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:${companyId}:${userId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache invalidated', { companyId, userId, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', { error, companyId, userId });
    }
  }

  /**
   * Invalidate cache for feature
   */
  async invalidateFeature(companyId: string, feature: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:${companyId}:*:${feature}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache invalidated', { companyId, feature, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache invalidation error', { error, companyId, feature });
    }
  }

  /**
   * Clear all cached decisions
   */
  async clear(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('All cache cleared', { count: keys.length });
      }
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      const info = await this.redis.info('memory');

      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch?.[1] ?? 'unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }
}
