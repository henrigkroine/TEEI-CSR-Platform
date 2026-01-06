/**
 * Rate Limit Middleware Integration Tests
 *
 * Tests for rate limiting middleware with Fastify integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Mock the rate limiter module
const mockCheckLimit = vi.fn();
const mockIncrementUsage = vi.fn();
const mockDecrementConcurrent = vi.fn();

vi.mock('../../lib/rate-limiter.js', () => {
  return {
    getNLQRateLimiter: vi.fn(() => ({
      checkLimit: mockCheckLimit,
      incrementUsage: mockIncrementUsage,
      decrementConcurrent: mockDecrementConcurrent,
    })),
    RateLimitExceededError: class RateLimitExceededError extends Error {
      constructor(
        message: string,
        public limitType: 'daily' | 'hourly' | 'concurrent',
        public resetAt?: Date,
        public remaining: number = 0
      ) {
        super(message);
        this.name = 'RateLimitExceededError';
      }
    },
  };
});

// Now import middleware after mock is set up
import {
  createRateLimitMiddleware,
  createAdminBypassMiddleware,
  cleanupAllActiveRequests,
  getActiveRequestsCount,
} from '../rate-limit.js';

import { createErrorHandler, RateLimitError } from '../error-handler.js';

describe('Rate Limit Middleware', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    fastify = Fastify({ logger: false });

    // Register error handler
    fastify.setErrorHandler(createErrorHandler());

    // Setup default mock returns
    mockCheckLimit.mockResolvedValue({
      allowed: true,
      remainingDaily: 490,
      remainingHourly: 48,
      remainingConcurrent: 4,
    });

    mockIncrementUsage.mockResolvedValue(undefined);
    mockDecrementConcurrent.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('createRateLimitMiddleware', () => {
    it('should allow request when within limits', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).toHaveBeenCalledWith('test-company-id');
      expect(mockIncrementUsage).toHaveBeenCalledWith('test-company-id');
      expect(response.headers['x-ratelimit-remaining-daily']).toBe('490');
      expect(response.headers['x-ratelimit-remaining-hourly']).toBe('48');
    });

    it('should reject request when daily limit exceeded', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        reason: 'Daily query limit exceeded (500 queries/day)',
        resetAt: new Date('2024-12-31T23:59:59Z'),
        remainingDaily: 0,
        remainingHourly: 48,
        remainingConcurrent: 4,
      });

      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
      expect(mockCheckLimit).toHaveBeenCalled();
      expect(mockIncrementUsage).not.toHaveBeenCalled();

      const body = JSON.parse(response.body);
      expect(body.error).toBe('RateLimitError');
      expect(body.retryable).toBe(true);
    });

    it('should reject request when hourly limit exceeded', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        reason: 'Hourly query limit exceeded (50 queries/hour)',
        resetAt: new Date(Date.now() + 3600000), // 1 hour from now
        remainingDaily: 400,
        remainingHourly: 0,
        remainingConcurrent: 4,
      });

      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Hourly query limit exceeded');
    });

    it('should reject request when concurrent limit exceeded', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        reason: 'Concurrent query limit exceeded (5 simultaneous queries)',
        remainingDaily: 400,
        remainingHourly: 40,
        remainingConcurrent: 0,
      });

      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Concurrent query limit exceeded');
    });

    it('should extract company ID from request body', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.post('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'POST',
        url: '/test',
        payload: {
          companyId: 'body-company-id',
          question: 'test question',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).toHaveBeenCalledWith('body-company-id');
    });

    it('should extract company ID from query parameter', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test?companyId=query-company-id',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).toHaveBeenCalledWith('query-company-id');
    });

    it('should skip paths specified in options', async () => {
      const middleware = createRateLimitMiddleware({
        skipPaths: ['/health', '/metrics'],
      });
      fastify.addHook('preHandler', middleware);

      fastify.get('/health', async (request, reply) => {
        return { status: 'ok' };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).not.toHaveBeenCalled();
      expect(mockIncrementUsage).not.toHaveBeenCalled();
    });

    it('should allow request when no company ID found (auth will handle)', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).not.toHaveBeenCalled();
    });

    it('should decrement concurrent counter on request completion', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(200);

      // Wait for hooks to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDecrementConcurrent).toHaveBeenCalledWith('test-company-id');
    });

    it('should fail open when rate limiter errors', async () => {
      mockCheckLimit.mockRejectedValue(new Error('Redis connection failed'));

      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      // Should allow request even if rate limiter fails
      expect(response.statusCode).toBe(200);
    });

    it('should use custom company ID extractor if provided', async () => {
      const customExtractor = vi.fn(() => 'custom-company-id');

      const middleware = createRateLimitMiddleware({
        extractCompanyIdFn: customExtractor,
      });
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(customExtractor).toHaveBeenCalled();
      expect(mockCheckLimit).toHaveBeenCalledWith('custom-company-id');
    });
  });

  describe('createAdminBypassMiddleware', () => {
    it('should bypass rate limiting for admin users', async () => {
      const middleware = createAdminBypassMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.decorateRequest('user', null);

      fastify.get('/test', async (request, reply) => {
        // Mock admin user
        (request as any).user = { isAdmin: true, companyId: 'admin-company' };
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).not.toHaveBeenCalled();
    });

    it('should bypass rate limiting for internal services', async () => {
      const middleware = createAdminBypassMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        return { success: true };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-internal-service': 'true',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockCheckLimit).not.toHaveBeenCalled();
    });
  });

  describe('Active request tracking', () => {
    it('should track active requests per company', async () => {
      const middleware = createRateLimitMiddleware();
      fastify.addHook('preHandler', middleware);

      fastify.get('/test', async (request, reply) => {
        // Check active requests during request
        const activeRequests = getActiveRequestsCount();
        return { success: true, activeRequests };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-company-id': 'test-company-id',
        },
      });

      expect(response.statusCode).toBe(200);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      const activeRequests = getActiveRequestsCount();
      expect(activeRequests['test-company-id']).toBeUndefined();
    });
  });

  describe('cleanupAllActiveRequests', () => {
    it('should cleanup all active requests', async () => {
      // This would be called on shutdown
      await cleanupAllActiveRequests();

      const activeRequests = getActiveRequestsCount();
      expect(Object.keys(activeRequests)).toHaveLength(0);
    });
  });
});

describe('Rate Limit Headers', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    fastify = Fastify({ logger: false });
    fastify.setErrorHandler(createErrorHandler());

    mockCheckLimit.mockResolvedValue({
      allowed: true,
      remainingDaily: 250,
      remainingHourly: 25,
      remainingConcurrent: 3,
    });

    mockIncrementUsage.mockResolvedValue(undefined);
    mockDecrementConcurrent.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should include rate limit headers in response', async () => {
    const middleware = createRateLimitMiddleware();
    fastify.addHook('preHandler', middleware);

    fastify.get('/test', async (request, reply) => {
      return { success: true };
    });

    const response = await fastify.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-company-id': 'test-company-id',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit-daily']).toBe('500');
    expect(response.headers['x-ratelimit-remaining-daily']).toBe('250');
    expect(response.headers['x-ratelimit-limit-hourly']).toBe('50');
    expect(response.headers['x-ratelimit-remaining-hourly']).toBe('25');
    expect(response.headers['x-ratelimit-limit-concurrent']).toBe('5');
    expect(response.headers['x-ratelimit-remaining-concurrent']).toBe('3');
  });

  it('should include retry-after header when rate limited', async () => {
    const resetAt = new Date(Date.now() + 3600000); // 1 hour from now

    mockCheckLimit.mockResolvedValue({
      allowed: false,
      reason: 'Daily limit exceeded',
      resetAt,
      remainingDaily: 0,
      remainingHourly: 10,
      remainingConcurrent: 2,
    });

    const middleware = createRateLimitMiddleware();
    fastify.addHook('preHandler', middleware);

    fastify.get('/test', async (request, reply) => {
      return { success: true };
    });

    const response = await fastify.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-company-id': 'test-company-id',
      },
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'] as string, 10)).toBeGreaterThan(0);
  });
});
