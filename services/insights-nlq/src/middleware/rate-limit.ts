/**
 * Rate Limiting Middleware for NLQ Routes
 *
 * Enforces per-tenant rate limits on NLQ query endpoints.
 * Integrates with the NLQRateLimiter service and provides
 * HTTP headers with quota information.
 *
 * Features:
 * - Pre-request quota checking
 * - Automatic usage increment
 * - Concurrent query tracking with cleanup
 * - HTTP headers with remaining quotas
 * - 429 responses with retry-after headers
 *
 * Usage:
 * ```typescript
 * fastify.addHook('preHandler', createRateLimitMiddleware());
 * ```
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getNLQRateLimiter, RateLimitExceededError } from '../lib/rate-limiter.js';
import { RateLimitError } from './error-handler.js';

// Simple logger for now
const logger = {
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  info: (...args: any[]) => console.info('[INFO]', ...args),
};

// Track active requests for concurrent cleanup
const activeRequests = new Map<string, Set<string>>();

/**
 * Extract company ID from request
 * Supports multiple extraction methods:
 * 1. JWT token (preferred)
 * 2. Request body
 * 3. Query parameter
 * 4. Header
 */
function extractCompanyId(request: FastifyRequest): string | null {
  // 1. Try to get from JWT token (most secure)
  if ((request as any).user?.companyId) {
    return (request as any).user.companyId;
  }

  // 2. Try to get from request body
  const body = request.body as any;
  if (body?.companyId) {
    return body.companyId;
  }

  // 3. Try to get from query parameter
  const query = request.query as any;
  if (query?.companyId) {
    return query.companyId;
  }

  // 4. Try to get from header
  const headerCompanyId = request.headers['x-company-id'];
  if (headerCompanyId && typeof headerCompanyId === 'string') {
    return headerCompanyId;
  }

  return null;
}

/**
 * Calculate retry-after seconds based on reset time
 */
function calculateRetryAfter(resetAt?: Date): number {
  if (!resetAt) {
    return 60; // Default 1 minute
  }

  const now = Date.now();
  const reset = resetAt.getTime();
  const seconds = Math.max(1, Math.ceil((reset - now) / 1000));

  return seconds;
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(
  reply: FastifyReply,
  companyId: string,
  remainingDaily?: number,
  remainingHourly?: number,
  remainingConcurrent?: number
): void {
  if (remainingDaily !== undefined) {
    reply.header('X-RateLimit-Limit-Daily', '500'); // Could be dynamic
    reply.header('X-RateLimit-Remaining-Daily', remainingDaily.toString());
  }

  if (remainingHourly !== undefined) {
    reply.header('X-RateLimit-Limit-Hourly', '50'); // Could be dynamic
    reply.header('X-RateLimit-Remaining-Hourly', remainingHourly.toString());
  }

  if (remainingConcurrent !== undefined) {
    reply.header('X-RateLimit-Limit-Concurrent', '5'); // Could be dynamic
    reply.header('X-RateLimit-Remaining-Concurrent', remainingConcurrent.toString());
  }
}

/**
 * Track active request for concurrent cleanup
 */
function trackActiveRequest(companyId: string, requestId: string): void {
  if (!activeRequests.has(companyId)) {
    activeRequests.set(companyId, new Set());
  }
  activeRequests.get(companyId)!.add(requestId);
}

/**
 * Cleanup active request tracking
 */
async function cleanupActiveRequest(companyId: string, requestId: string): Promise<void> {
  const requests = activeRequests.get(companyId);
  if (requests) {
    requests.delete(requestId);
    if (requests.size === 0) {
      activeRequests.delete(companyId);
    }
  }

  // Decrement concurrent counter
  const rateLimiter = getNLQRateLimiter();
  await rateLimiter.decrementConcurrent(companyId);
}

/**
 * Cleanup middleware to run after response is sent
 * This should be registered as an onResponse hook
 */
export function createRateLimitCleanupMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const cleanup = (request as any)._rateLimitCleanup;
    if (cleanup) {
      await cleanupActiveRequest(cleanup.companyId, cleanup.requestId);
    }
  };
}

/**
 * Create rate limit middleware for Fastify preHandler hook
 *
 * Options:
 * - skipPaths: Array of paths to skip rate limiting (e.g., health checks)
 * - extractCompanyIdFn: Custom function to extract company ID from request
 */
export interface RateLimitMiddlewareOptions {
  skipPaths?: string[];
  extractCompanyIdFn?: (request: FastifyRequest) => string | null;
}

export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions = {}
) {
  const { skipPaths = [], extractCompanyIdFn = extractCompanyId } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip paths that don't need rate limiting
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    // Extract company ID
    const companyId = extractCompanyIdFn(request);

    if (!companyId) {
      // No company ID found - this might be an unauthenticated request
      // Log warning but allow request to proceed (auth middleware will handle rejection)
      logger.warn('No company ID found in request for rate limiting', {
        url: request.url,
        method: request.method,
      });
      return;
    }

    const rateLimiter = getNLQRateLimiter();
    const requestId = request.id;

    try {
      // Check rate limits
      const result = await rateLimiter.checkLimit(companyId);

      if (!result.allowed) {
        // Rate limit exceeded
        const retryAfter = calculateRetryAfter(result.resetAt);

        logger.warn('Rate limit exceeded', {
          companyId,
          requestId,
          reason: result.reason,
          resetAt: result.resetAt,
          retryAfter,
        });

        // Add rate limit headers
        addRateLimitHeaders(
          reply,
          companyId,
          result.remainingDaily,
          result.remainingHourly,
          result.remainingConcurrent
        );

        // Add retry-after header
        reply.header('Retry-After', retryAfter.toString());

        // Throw rate limit error
        throw new RateLimitError(
          result.reason || 'Rate limit exceeded',
          retryAfter
        );
      }

      // Increment usage counters
      await rateLimiter.incrementUsage(companyId);

      // Track active request for cleanup
      trackActiveRequest(companyId, requestId);

      // Add success rate limit headers
      addRateLimitHeaders(
        reply,
        companyId,
        result.remainingDaily,
        result.remainingHourly,
        result.remainingConcurrent
      );

      // Store cleanup info in request context for later
      (request as any)._rateLimitCleanup = { companyId, requestId };

      logger.debug('Rate limit check passed', {
        companyId,
        requestId,
        remainingDaily: result.remainingDaily,
        remainingHourly: result.remainingHourly,
        remainingConcurrent: result.remainingConcurrent,
      });
    } catch (error) {
      // If it's already a RateLimitError, re-throw
      if (error instanceof RateLimitError) {
        throw error;
      }

      // Log other errors but fail open (allow request)
      logger.error('Rate limit check failed', {
        companyId,
        requestId,
        error,
      });

      // Fail open - allow request to proceed if rate limiter is down
      // This prevents rate limiter failures from taking down the service
    }
  };
}

/**
 * Create rate limit middleware for specific routes
 * Useful when you want different rate limit behavior per route
 */
export function createRouteRateLimitMiddleware(
  routeOptions: RateLimitMiddlewareOptions & {
    customLimits?: {
      daily?: number;
      hourly?: number;
      concurrent?: number;
    };
  } = {}
) {
  // For now, use the same implementation
  // In the future, could implement per-route limits
  return createRateLimitMiddleware(routeOptions);
}

/**
 * Admin bypass middleware
 * Skips rate limiting for admin/internal requests
 */
export function createAdminBypassMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check for admin token or internal service flag
    const isAdmin = (request as any).user?.isAdmin || false;
    const isInternal = request.headers['x-internal-service'] === 'true';

    if (isAdmin || isInternal) {
      logger.debug('Admin/internal request - bypassing rate limit', {
        requestId: request.id,
        isAdmin,
        isInternal,
      });
      // Skip rate limiting by not calling the rate limiter
      return;
    }

    // Not admin - proceed with normal rate limiting
    return createRateLimitMiddleware()(request, reply);
  };
}

/**
 * Cleanup function for graceful shutdown
 * Decrements all active concurrent counters
 */
export async function cleanupAllActiveRequests(): Promise<void> {
  const rateLimiter = getNLQRateLimiter();
  const cleanupPromises: Promise<void>[] = [];

  activeRequests.forEach((requests, companyId) => {
    // Decrement concurrent counter by the number of active requests
    for (let i = 0; i < requests.size; i++) {
      cleanupPromises.push(rateLimiter.decrementConcurrent(companyId));
    }
  });

  await Promise.all(cleanupPromises);
  activeRequests.clear();

  logger.info('Cleaned up all active requests for rate limiting');
}

/**
 * Get current active requests (for monitoring)
 */
export function getActiveRequestsCount(): { [companyId: string]: number } {
  const counts: { [companyId: string]: number } = {};

  activeRequests.forEach((requests, companyId) => {
    counts[companyId] = requests.size;
  });

  return counts;
}
