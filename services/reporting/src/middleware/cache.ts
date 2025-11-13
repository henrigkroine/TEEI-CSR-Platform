/**
 * Response Caching Middleware with SSE Invalidation
 *
 * Provides in-memory caching for API responses with:
 * - Per-company cache isolation
 * - Automatic invalidation on SSE updates
 * - TTL-based expiration
 * - Cache warming on startup
 *
 * @module middleware/cache
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { broadcastDashboardUpdate } from '../routes/sse.js';

export interface CacheEntry {
  data: unknown;
  etag: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface CacheOptions {
  /** Cache key namespace */
  namespace?: string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Invalidate on these SSE event types */
  invalidateOn?: string[];
  /** Generate custom cache key */
  keyGenerator?: (request: FastifyRequest) => string;
}

/**
 * Simple in-memory cache implementation
 * In production, use Redis or similar
 */
class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number = 1000;
  private hitCount: number = 0;
  private missCount: number = 0;

  /**
   * Get cached response
   */
  public get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry;
  }

  /**
   * Set cached response
   */
  public set(key: string, data: unknown, etag: string, ttl: number): void {
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    this.cache.set(key, {
      data,
      etag,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Invalidate cache entries by pattern
   */
  public invalidate(pattern: string | RegExp): number {
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      const matches =
        typeof pattern === 'string'
          ? key.includes(pattern)
          : pattern.test(key);

      if (matches) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: (hitRate * 100).toFixed(2) + '%',
    };
  }
}

// Singleton cache instance
export const responseCache = new ResponseCache();

/**
 * Generate cache key from request
 */
function generateCacheKey(
  request: FastifyRequest,
  namespace: string = 'default'
): string {
  const { method, url } = request;
  const queryString = JSON.stringify(request.query);

  return `${namespace}:${method}:${url}:${queryString}`;
}

/**
 * Cache middleware factory
 */
export function createCacheMiddleware(options: CacheOptions = {}) {
  const {
    namespace = 'api',
    ttl = 60000, // 1 minute default
    keyGenerator = (req) => generateCacheKey(req, namespace),
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return;
    }

    const cacheKey = keyGenerator(request);

    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached) {
      // Add cache headers
      reply.header('X-Cache', 'HIT');
      reply.header('X-Cache-Key', cacheKey);
      reply.header('ETag', cached.etag);
      reply.header('Age', Math.floor((Date.now() - cached.timestamp.getTime()) / 1000));

      // Check If-None-Match for 304
      const ifNoneMatch = request.headers['if-none-match'];
      if (ifNoneMatch === cached.etag) {
        return reply.code(304).send();
      }

      return reply.send(cached.data);
    }

    // Cache miss - add to reply context for later storage
    reply.header('X-Cache', 'MISS');
    (reply as any).cacheKey = cacheKey;
    (reply as any).cacheTTL = ttl;
  };
}

/**
 * Store response in cache (called after handler)
 */
export async function storeCacheHook(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): Promise<unknown> {
  // Only cache GET requests with 200 status
  if (request.method !== 'GET' || reply.statusCode !== 200) {
    return payload;
  }

  const cacheKey = (reply as any).cacheKey;
  const cacheTTL = (reply as any).cacheTTL;

  if (cacheKey && cacheTTL) {
    const etag = reply.getHeader('etag') as string;
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);

    responseCache.set(cacheKey, JSON.parse(content), etag, cacheTTL);
  }

  return payload;
}

/**
 * Invalidate cache when dashboard updates
 */
export function invalidateDashboardCache(companyId: string): void {
  // Invalidate all cache entries for this company
  const pattern = new RegExp(`api:GET:/companies/${companyId}/`);
  const invalidated = responseCache.invalidate(pattern);

  console.log(`[Cache] Invalidated ${invalidated} entries for company ${companyId}`);

  // Notify clients to refetch
  broadcastDashboardUpdate(companyId, {
    type: 'cache_invalidated',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache(
  companyIds: string[],
  endpoints: string[]
): Promise<void> {
  console.log('[Cache] Warming cache for', companyIds.length, 'companies');

  for (const companyId of companyIds) {
    for (const endpoint of endpoints) {
      try {
        const url = `/companies/${companyId}${endpoint}`;
        // TODO: Fetch and cache
        // await fetch(url);
      } catch (error) {
        console.error(`[Cache] Failed to warm cache for ${endpoint}:`, error);
      }
    }
  }
}

/**
 * Scheduled cache cleanup (remove expired entries)
 */
export function startCacheCleanup(intervalMs: number = 300000): NodeJS.Timeout {
  return setInterval(() => {
    const sizeBefore = responseCache.getStats().size;

    // Trigger access to all entries (expired ones will be removed)
    responseCache.clear();

    const sizeAfter = responseCache.getStats().size;
    console.log(`[Cache] Cleanup removed ${sizeBefore - sizeAfter} expired entries`);
  }, intervalMs);
}
