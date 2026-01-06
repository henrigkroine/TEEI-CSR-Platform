/**
 * Redis Cache Service for TEEI CSR Platform
 *
 * Provides distributed caching for:
 * - SROI calculations
 * - VIS scores
 * - At-a-Glance metrics
 * - Q2Q feed data
 *
 * Features:
 * - Automatic cache warming
 * - Pattern-based invalidation
 * - TTL-based expiration
 * - Cache statistics and monitoring
 *
 * @module cache/redis-cache
 */

import { createClient, RedisClientType } from 'redis';
import type { SROIResponse, VISResponse, AtAGlanceResponse } from '../db/types.js';

export interface CacheConfig {
  url: string;
  ttl: {
    sroi: number;      // Default: 5 minutes
    vis: number;       // Default: 5 minutes
    atAGlance: number; // Default: 3 minutes
    q2qFeed: number;   // Default: 2 minutes
    default: number;   // Default: 1 minute
  };
  keyPrefix: string;
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  ttl: {
    sroi: 300,       // 5 minutes
    vis: 300,        // 5 minutes
    atAGlance: 180,  // 3 minutes
    q2qFeed: 120,    // 2 minutes
    default: 60,     // 1 minute
  },
  keyPrefix: 'teei:csr:',
  maxRetries: 3,
  retryDelay: 1000,
};

export class RedisCache {
  private client: RedisClientType | null = null;
  private config: CacheConfig;
  private isConnected: boolean = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      this.client = createClient({
        url: this.config.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.config.maxRetries) {
              console.error('[Redis] Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return this.config.retryDelay * retries;
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('[Redis] Client error:', err);
        this.stats.errors++;
      });

      this.client.on('connect', () => {
        console.log('[Redis] Connected to Redis server');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('[Redis] Disconnected from Redis server');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('[Redis] Connection failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('[Redis] Disconnected gracefully');
    }
  }

  /**
   * Generate cache key with prefix
   */
  private getCacheKey(namespace: string, key: string): string {
    return `${this.config.keyPrefix}${namespace}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache get');
      this.stats.misses++;
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(namespace, key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[Redis] Get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache set');
      return;
    }

    try {
      const cacheKey = this.getCacheKey(namespace, key);
      const expirationTime = ttl || this.getTTLForNamespace(namespace);

      await this.client.setEx(
        cacheKey,
        expirationTime,
        JSON.stringify(value)
      );

      this.stats.sets++;
    } catch (error) {
      console.error('[Redis] Set error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(namespace: string, key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('[Redis] Not connected, skipping cache delete');
      return;
    }

    try {
      const cacheKey = this.getCacheKey(namespace, key);
      await this.client.del(cacheKey);
      this.stats.deletes++;
    } catch (error) {
      console.error('[Redis] Delete error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('[Redis] Not connected, skipping pattern invalidation');
      return 0;
    }

    try {
      const searchPattern = `${this.config.keyPrefix}${pattern}`;
      const keys = await this.client.keys(searchPattern);

      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      this.stats.deletes += keys.length;

      console.log(`[Redis] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      console.error('[Redis] Pattern invalidation error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a company
   */
  async invalidateCompany(companyId: string): Promise<number> {
    return this.invalidatePattern(`*:${companyId}:*`);
  }

  /**
   * Invalidate specific metric type for a company
   */
  async invalidateCompanyMetric(
    companyId: string,
    metric: 'sroi' | 'vis' | 'at-a-glance' | 'q2q-feed'
  ): Promise<number> {
    return this.invalidatePattern(`${metric}:${companyId}:*`);
  }

  /**
   * Get TTL for namespace
   */
  private getTTLForNamespace(namespace: string): number {
    const ttlMap: Record<string, number> = {
      'sroi': this.config.ttl.sroi,
      'vis': this.config.ttl.vis,
      'at-a-glance': this.config.ttl.atAGlance,
      'q2q-feed': this.config.ttl.q2qFeed,
    };

    return ttlMap[namespace] || this.config.ttl.default;
  }

  /**
   * Cache SROI data
   */
  async getSROI(companyId: string, period: string | null): Promise<SROIResponse | null> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.get<SROIResponse>('sroi', key);
  }

  async setSROI(companyId: string, period: string | null, data: SROIResponse): Promise<void> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.set('sroi', key, data);
  }

  /**
   * Cache VIS data
   */
  async getVIS(companyId: string, period: string | null): Promise<VISResponse | null> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.get<VISResponse>('vis', key);
  }

  async setVIS(companyId: string, period: string | null, data: VISResponse): Promise<void> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.set('vis', key, data);
  }

  /**
   * Cache At-a-Glance data
   */
  async getAtAGlance(companyId: string, period: string | null): Promise<AtAGlanceResponse | null> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.get<AtAGlanceResponse>('at-a-glance', key);
  }

  async setAtAGlance(companyId: string, period: string | null, data: AtAGlanceResponse): Promise<void> {
    const key = `${companyId}:${period || 'all-time'}`;
    return this.set('at-a-glance', key, data);
  }

  /**
   * Cache Q2Q feed data
   */
  async getQ2QFeed(companyId: string, filters: Record<string, any>): Promise<any | null> {
    const key = `${companyId}:${JSON.stringify(filters)}`;
    return this.get<any>('q2q-feed', key);
  }

  async setQ2QFeed(companyId: string, filters: Record<string, any>, data: any): Promise<void> {
    const key = `${companyId}:${JSON.stringify(filters)}`;
    return this.set('q2q-feed', key, data);
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(
    companyIds: string[],
    fetchers: {
      sroi?: (companyId: string) => Promise<SROIResponse>;
      vis?: (companyId: string) => Promise<VISResponse>;
      atAGlance?: (companyId: string) => Promise<AtAGlanceResponse>;
    }
  ): Promise<void> {
    console.log(`[Redis] Warming cache for ${companyIds.length} companies`);

    for (const companyId of companyIds) {
      try {
        // Warm SROI cache
        if (fetchers.sroi) {
          const sroiData = await fetchers.sroi(companyId);
          await this.setSROI(companyId, null, sroiData);
        }

        // Warm VIS cache
        if (fetchers.vis) {
          const visData = await fetchers.vis(companyId);
          await this.setVIS(companyId, null, visData);
        }

        // Warm At-a-Glance cache
        if (fetchers.atAGlance) {
          const atAGlanceData = await fetchers.atAGlance(companyId);
          await this.setAtAGlance(companyId, null, atAGlanceData);
        }
      } catch (error) {
        console.error(`[Redis] Cache warming failed for company ${companyId}:`, error);
      }
    }

    console.log('[Redis] Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      total,
      hitRate: hitRate.toFixed(2) + '%',
      isConnected: this.isConnected,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Flush all cache entries (use with caution)
   */
  async flushAll(): Promise<void> {
    if (!this.client || !this.isConnected) {
      console.warn('[Redis] Not connected, skipping flush');
      return;
    }

    try {
      await this.client.flushAll();
      console.log('[Redis] All cache entries flushed');
    } catch (error) {
      console.error('[Redis] Flush error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('[Redis] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let redisCacheInstance: RedisCache | null = null;

/**
 * Get Redis cache singleton instance
 */
export function getRedisCache(): RedisCache {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCache();
  }
  return redisCacheInstance;
}

/**
 * Initialize Redis cache with configuration
 */
export async function initializeRedisCache(config?: Partial<CacheConfig>): Promise<RedisCache> {
  const cache = config ? new RedisCache(config) : getRedisCache();
  await cache.connect();
  return cache;
}
