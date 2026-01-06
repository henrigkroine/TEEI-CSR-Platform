/**
 * ETag Middleware for Conditional Requests with Redis Caching
 *
 * Implements HTTP caching with ETag support:
 * - Generates ETags based on response content hash (SHA-256)
 * - Returns 304 Not Modified when content unchanged
 * - Reduces bandwidth and improves performance
 * - Redis caching for ETag mappings (TTL: 5 minutes)
 * - Support for weak ETags (W/"...")
 * - Cache invalidation on data updates
 *
 * @module middleware/etag
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { createClient, type RedisClientType } from 'redis';

/**
 * Redis client for ETag caching
 */
let redisClient: RedisClientType | null = null;

/**
 * Cache statistics
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  invalidations: 0,
};

/**
 * Initialize Redis client for ETag caching
 */
export async function initializeETagCache(redisUrl?: string): Promise<void> {
  try {
    redisClient = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('[ETag Cache] Redis error:', err);
    });

    await redisClient.connect();
    console.log('[ETag Cache] Redis connected');
  } catch (error) {
    console.warn('[ETag Cache] Redis initialization failed, falling back to in-memory:', error);
    redisClient = null;
  }
}

/**
 * Get cache statistics
 */
export function getETagCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? (cacheStats.hits / total) * 100 : 0;

  return {
    ...cacheStats,
    total,
    hitRate: `${hitRate.toFixed(2)}%`,
  };
}

/**
 * Generate ETag from content (SHA-256 for security)
 * @param content - Content to hash
 * @param weak - Generate weak ETag (W/"...")
 */
export function generateETag(content: string | Buffer, weak: boolean = true): string {
  const hash = createHash('sha256').update(content).digest('hex').substring(0, 16);
  return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Check if ETag matches (supports both weak and strong ETags)
 */
export function isETagMatch(etag: string, ifNoneMatch?: string): boolean {
  if (!ifNoneMatch) {
    return false;
  }

  // Handle multiple ETags in If-None-Match header
  const etags = ifNoneMatch.split(',').map((tag) => tag.trim());

  // Exact match
  if (etags.includes(etag) || etags.includes('*')) {
    return true;
  }

  // Weak comparison: strip W/ prefix and compare
  const normalizedETag = etag.replace(/^W\//, '');
  return etags.some((tag) => tag.replace(/^W\//, '') === normalizedETag);
}

/**
 * Store ETag in Redis cache
 */
async function storeETagInCache(
  key: string,
  etag: string,
  ttl: number = 300
): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.setEx(`etag:${key}`, ttl, etag);
  } catch (error) {
    console.error('[ETag Cache] Failed to store ETag:', error);
  }
}

/**
 * Get ETag from Redis cache
 */
async function getETagFromCache(key: string): Promise<string | null> {
  if (!redisClient) {
    return null;
  }

  try {
    const etag = await redisClient.get(`etag:${key}`);
    if (etag) {
      cacheStats.hits++;
    } else {
      cacheStats.misses++;
    }
    return etag;
  } catch (error) {
    console.error('[ETag Cache] Failed to get ETag:', error);
    cacheStats.misses++;
    return null;
  }
}

/**
 * Invalidate ETags by pattern (e.g., company ID)
 */
export async function invalidateETagCache(pattern: string): Promise<number> {
  if (!redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(`etag:*${pattern}*`);
    if (keys.length === 0) {
      return 0;
    }

    await redisClient.del(keys);
    cacheStats.invalidations += keys.length;

    console.log(`[ETag Cache] Invalidated ${keys.length} entries matching pattern: ${pattern}`);
    return keys.length;
  } catch (error) {
    console.error('[ETag Cache] Failed to invalidate cache:', error);
    return 0;
  }
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request: FastifyRequest): string {
  const { method, url } = request;
  const queryString = new URLSearchParams(request.query as Record<string, string>).toString();
  return `${method}:${url}${queryString ? '?' + queryString : ''}`;
}

/**
 * ETag middleware hook with Redis caching
 *
 * Automatically adds ETag headers and handles 304 responses
 *
 * Usage:
 * fastify.addHook('onSend', etagHook);
 */
export async function etagHook(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): Promise<unknown> {
  // Only apply to GET requests
  if (request.method !== 'GET') {
    return payload;
  }

  // Skip if already has ETag header
  if (reply.getHeader('etag')) {
    return payload;
  }

  // Skip for SSE streams
  const contentType = reply.getHeader('content-type');
  if (contentType === 'text/event-stream') {
    return payload;
  }

  // Generate cache key
  const cacheKey = generateCacheKey(request);

  // Try to get cached ETag
  const cachedETag = await getETagFromCache(cacheKey);

  let etag: string;
  if (cachedETag) {
    etag = cachedETag;
    reply.header('X-ETag-Cache', 'HIT');
  } else {
    // Generate ETag from payload
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    etag = generateETag(content);

    // Store in cache (5 minutes TTL)
    await storeETagInCache(cacheKey, etag, 300);
    reply.header('X-ETag-Cache', 'MISS');
  }

  // Set ETag header
  reply.header('ETag', etag);

  // Check If-None-Match header
  const ifNoneMatch = request.headers['if-none-match'];
  if (isETagMatch(etag, ifNoneMatch)) {
    // Content hasn't changed, return 304
    reply.code(304);
    return ''; // Empty response body for 304
  }

  return payload;
}

/**
 * Manual ETag checking for custom routes
 */
export function checkETag(
  request: FastifyRequest,
  reply: FastifyReply,
  data: unknown
): boolean {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const etag = generateETag(content);

  reply.header('ETag', etag);

  const ifNoneMatch = request.headers['if-none-match'];
  if (isETagMatch(etag, ifNoneMatch)) {
    reply.code(304).send();
    return true; // ETag matched, 304 sent
  }

  return false; // ETag didn't match, send full response
}

/**
 * Cache-Control headers for different scenarios
 */
export const CACHE_CONTROL = {
  /** No caching (for sensitive data) */
  NO_CACHE: 'no-store, no-cache, must-revalidate, proxy-revalidate',

  /** Cache with revalidation (for dynamic data) */
  REVALIDATE: 'public, max-age=0, must-revalidate',

  /** Short cache (5 minutes, for frequently updated data) */
  SHORT: 'public, max-age=300, stale-while-revalidate=60',

  /** Medium cache (1 hour, for semi-static data) */
  MEDIUM: 'public, max-age=3600, stale-while-revalidate=600',

  /** Long cache (24 hours, for static data) */
  LONG: 'public, max-age=86400, stale-while-revalidate=3600',

  /** Immutable (for versioned assets) */
  IMMUTABLE: 'public, max-age=31536000, immutable',
} as const;

/**
 * Set cache headers based on data type
 */
export function setCacheHeaders(
  reply: FastifyReply,
  cacheType: keyof typeof CACHE_CONTROL
): void {
  reply.header('Cache-Control', CACHE_CONTROL[cacheType]);
}

/**
 * Invalidation hook for POST/PUT/DELETE requests
 *
 * Automatically invalidates ETags when data is modified
 */
export async function etagInvalidationHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Only apply to mutating requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return;
  }

  // Extract company ID from URL (pattern: /companies/:id/...)
  const companyIdMatch = request.url.match(/\/companies\/([^\/]+)/);
  if (companyIdMatch) {
    const companyId = companyIdMatch[1];
    await invalidateETagCache(companyId);

    reply.header('X-ETag-Invalidated', companyId);
    console.log(`[ETag Cache] Invalidated cache for company: ${companyId}`);
  }
}

/**
 * Plugin to register ETag middleware
 */
export async function etagPlugin(fastify: any) {
  // Initialize Redis cache
  await initializeETagCache();

  // Add ETag generation hook
  fastify.addHook('onSend', etagHook);

  // Add cache invalidation hook for mutations
  fastify.addHook('onRequest', etagInvalidationHook);

  // Expose cache stats endpoint
  fastify.get('/internal/etag-stats', async () => {
    return getETagCacheStats();
  });
}
