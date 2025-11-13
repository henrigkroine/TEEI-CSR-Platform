import { FastifyRequest, FastifyReply } from 'fastify';
import { get, set } from '../cache/redis.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('cache-middleware');

/**
 * Cache key generator function type
 */
export type CacheKeyGenerator = (request: FastifyRequest) => string;

/**
 * Cache middleware options
 */
export interface CacheMiddlewareOptions {
  /**
   * Function to generate cache key from request
   */
  keyGenerator: CacheKeyGenerator;

  /**
   * Time to live in seconds
   */
  ttl: number;

  /**
   * Whether to cache the response (can be a function for conditional caching)
   * Default: Always cache successful responses (status 200)
   */
  shouldCache?: boolean | ((request: FastifyRequest, reply: FastifyReply, data: any) => boolean);
}

/**
 * Create a cache middleware for Fastify routes
 *
 * This middleware will:
 * 1. Generate a cache key from the request
 * 2. Check if the key exists in cache
 * 3. If HIT: Return cached response with X-Cache: HIT header
 * 4. If MISS: Proceed to route handler, cache response before sending with X-Cache: MISS header
 *
 * @param options - Cache middleware options
 * @returns Fastify preHandler hook
 *
 * @example
 * ```ts
 * fastify.get('/metrics/:id', {
 *   preHandler: cacheMiddleware({
 *     keyGenerator: (req) => `metrics:${req.params.id}`,
 *     ttl: 3600,
 *   })
 * }, async (req, reply) => {
 *   // Handler logic
 * });
 * ```
 */
export function cacheMiddleware(options: CacheMiddlewareOptions) {
  const { keyGenerator, ttl, shouldCache } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Generate cache key
      const cacheKey = keyGenerator(request);

      // Try to get cached response
      const cached = await get(cacheKey);

      if (cached !== null) {
        // Cache HIT
        logger.debug({ cacheKey }, 'Cache HIT');

        reply.header('X-Cache', 'HIT');
        reply.header('Content-Type', 'application/json');

        // Send cached response
        reply.send(cached);
        return;
      }

      // Cache MISS - continue to route handler
      logger.debug({ cacheKey }, 'Cache MISS');

      // Intercept the response to cache it
      reply.header('X-Cache', 'MISS');

      // Hook into the response serialization
      const originalSend = reply.send.bind(reply);

      reply.send = function (data: any) {
        // Check if we should cache this response
        const statusCode = reply.statusCode;
        let doCache = statusCode === 200;

        if (typeof shouldCache === 'boolean') {
          doCache = shouldCache;
        } else if (typeof shouldCache === 'function') {
          doCache = shouldCache(request, reply, data);
        }

        // Cache the response asynchronously (don't block the response)
        if (doCache) {
          set(cacheKey, data, ttl).catch((err) => {
            logger.error({ error: err, cacheKey }, 'Failed to cache response');
          });
        }

        // Send the original response
        return originalSend(data);
      } as any;
    } catch (error) {
      // Cache errors should not break the request
      logger.error({ error }, 'Cache middleware error');
      // Continue to route handler
    }
  };
}

/**
 * Cache key generators for common patterns
 */
export const cacheKeyGenerators = {
  /**
   * Generate key for company period metrics
   * Pattern: metrics:company:{companyId}:period:{period}
   */
  companyPeriod: (request: FastifyRequest): string => {
    const { companyId, period } = request.params as { companyId: string; period: string };
    return `metrics:company:${companyId}:period:${period}`;
  },

  /**
   * Generate key for SROI metrics
   * Pattern: metrics:sroi:{companyId}
   * Note: Includes query params in key for different date ranges
   */
  sroi: (request: FastifyRequest): string => {
    const { companyId } = request.params as { companyId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    // Include date range in key if specified
    if (startDate || endDate) {
      const start = startDate || 'inception';
      const end = endDate || 'now';
      return `metrics:sroi:${companyId}:${start}:${end}`;
    }

    return `metrics:sroi:${companyId}`;
  },

  /**
   * Generate key for VIS metrics
   * Pattern: metrics:vis:{companyId}
   * Note: Includes query params in key for different date ranges
   */
  vis: (request: FastifyRequest): string => {
    const { companyId } = request.params as { companyId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    // Include date range in key if specified
    if (startDate || endDate) {
      const start = startDate || 'inception';
      const end = endDate || 'now';
      return `metrics:vis:${companyId}:${start}:${end}`;
    }

    return `metrics:vis:${companyId}`;
  },

  /**
   * Generate key for Q2Q feed
   * Pattern: metrics:q2q-feed:{companyId}:page:{page}
   */
  q2qFeed: (request: FastifyRequest): string => {
    const { companyId } = request.params as { companyId: string };
    const { page = '1' } = request.query as { page?: string };
    return `metrics:q2q-feed:${companyId}:page:${page}`;
  },

  /**
   * Generate key for metric evidence
   * Pattern: metrics:evidence:{metricId}
   */
  evidence: (request: FastifyRequest): string => {
    const { metricId } = request.params as { metricId: string };
    return `metrics:evidence:${metricId}`;
  },
};

/**
 * TTL constants (in seconds)
 */
export const TTL = {
  /** 1 hour - for time-series metrics */
  ONE_HOUR: 3600,

  /** 24 hours - for SROI and VIS calculations */
  ONE_DAY: 86400,

  /** 5 minutes - for frequently updated data like Q2Q feeds */
  FIVE_MINUTES: 300,

  /** 10 minutes - for evidence and supporting data */
  TEN_MINUTES: 600,
} as const;
