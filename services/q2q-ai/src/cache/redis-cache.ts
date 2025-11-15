/**
 * Redis Caching Layer for Q2Q Classifications
 * Reduces cost and latency for repeated classifications
 */

import { createHash } from 'crypto';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  maxKeyLength: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  evictions: number;
  costSaved: number; // Estimated $ saved
}

const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600 * 24, // 24 hours
  keyPrefix: 'q2q:classification:',
  maxKeyLength: 250
};

/**
 * Redis-backed cache for Q2Q classifications
 * Falls back to in-memory cache if Redis unavailable
 */
export class Q2QCache {
  private config: CacheConfig;
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    evictions: 0,
    costSaved: 0
  };

  // Redis client (would be initialized with actual Redis connection)
  private redisClient: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // In production, initialize Redis client here:
    // this.redisClient = createClient({ url: process.env.REDIS_URL });
  }

  /**
   * Generate cache key from text and configuration
   */
  private generateKey(text: string, provider: string, model: string, promptVersion?: string): string {
    const input = `${text}:${provider}:${model}:${promptVersion || 'default'}`;

    // Hash to keep key size reasonable
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 16);

    return `${this.config.keyPrefix}${hash}`;
  }

  /**
   * Get cached classification
   */
  async get(
    text: string,
    provider: string,
    model: string,
    promptVersion?: string
  ): Promise<any | null> {
    if (!this.config.enabled) return null;

    const key = this.generateKey(text, provider, model, promptVersion);

    this.stats.totalRequests++;

    try {
      // Try Redis first
      if (this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.stats.hits++;
          this.updateHitRate();
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        this.stats.hits++;
        this.updateHitRate();
        return cached.value;
      }

      // Cache miss
      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      console.error('[Q2QCache] Error retrieving from cache:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Store classification in cache
   */
  async set(
    text: string,
    provider: string,
    model: string,
    classification: any,
    promptVersion?: string,
    cost?: number
  ): Promise<void> {
    if (!this.config.enabled) return;

    const key = this.generateKey(text, provider, model, promptVersion);

    try {
      const value = JSON.stringify(classification);

      // Store in Redis
      if (this.redisClient) {
        await this.redisClient.setex(key, this.config.ttl, value);
      }

      // Store in memory cache as fallback
      this.memoryCache.set(key, {
        value: classification,
        expiresAt: Date.now() + this.config.ttl * 1000
      });

      // Track cost saved for future cache hits
      if (cost) {
        // Each cache hit will save this cost
        // Track this in metadata for cost savings calculation
      }
    } catch (error) {
      console.error('[Q2QCache] Error storing in cache:', error);
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(text: string, provider: string, model: string, promptVersion?: string): Promise<void> {
    const key = this.generateKey(text, provider, model, promptVersion);

    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      }

      this.memoryCache.delete(key);
      this.stats.evictions++;
    } catch (error) {
      console.error('[Q2QCache] Error invalidating cache:', error);
    }
  }

  /**
   * Flush all cache entries
   */
  async flush(): Promise<void> {
    try {
      if (this.redisClient) {
        // Delete all keys with our prefix
        const keys = await this.redisClient.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      this.memoryCache.clear();
      console.info('[Q2QCache] Cache flushed');
    } catch (error) {
      console.error('[Q2QCache] Error flushing cache:', error);
    }
  }

  /**
   * Clean up expired entries from memory cache
   */
  cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.info(`[Q2QCache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      evictions: 0,
      costSaved: 0
    };
  }

  /**
   * Estimate cost saved by caching
   */
  estimateCostSaved(avgCostPerRequest: number): number {
    return this.stats.hits * avgCostPerRequest;
  }
}

/**
 * Singleton instance
 */
let cacheInstance: Q2QCache | null = null;

export function getCache(): Q2QCache {
  if (!cacheInstance) {
    cacheInstance = new Q2QCache();

    // Start periodic cleanup of expired entries
    setInterval(() => {
      cacheInstance!.cleanupExpired();
    }, 60000); // Every minute
  }

  return cacheInstance;
}

/**
 * Cache middleware for classification requests
 */
export async function withCache<T>(
  cacheKey: { text: string; provider: string; model: string; promptVersion?: string },
  fn: () => Promise<{ result: T; cost: number }>,
  cache: Q2QCache = getCache()
): Promise<T> {
  // Try cache first
  const cached = await cache.get(
    cacheKey.text,
    cacheKey.provider,
    cacheKey.model,
    cacheKey.promptVersion
  );

  if (cached) {
    console.info('[Q2QCache] Cache hit');
    return cached;
  }

  // Cache miss - execute function
  console.info('[Q2QCache] Cache miss - executing request');
  const { result, cost } = await fn();

  // Store in cache
  await cache.set(
    cacheKey.text,
    cacheKey.provider,
    cacheKey.model,
    result,
    cacheKey.promptVersion,
    cost
  );

  return result;
}
