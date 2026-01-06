/**
 * Rate Limiter Unit Tests
 *
 * Tests for NLQRateLimiter with mocked Redis and PostgreSQL
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Redis before importing rate-limiter
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  incr: vi.fn(),
  decr: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  expire: vi.fn(),
  pipeline: vi.fn(),
  on: vi.fn(),
  quit: vi.fn(),
  config: vi.fn(() => ({
    catch: vi.fn(),
  })),
};

const mockPipeline = {
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  exec: vi.fn(async () => [
    [null, 1], // incr result
    [null, 1], // expire result
  ]),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedis),
  };
});

// Mock postgres
const mockPostgres = vi.fn(() => {
  const queryFn: any = vi.fn(async () => []);
  queryFn.end = vi.fn(async () => {});
  return queryFn;
});

vi.mock('postgres', () => {
  return { default: mockPostgres };
});

// Mock drizzle
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [
        {
          id: 'test-id',
          companyId: 'test-company',
          dailyQueryLimit: 500,
          hourlyQueryLimit: 50,
          concurrentQueryLimit: 5,
          queriesUsedToday: 0,
          queriesUsedThisHour: 0,
          currentConcurrent: 0,
          dailyResetAt: new Date(),
          hourlyResetAt: new Date(),
          limitExceededCount: 0,
        },
      ]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(async () => ({})),
    })),
  })),
};

vi.mock('drizzle-orm/postgres-js', () => {
  return {
    drizzle: vi.fn(() => mockDb),
  };
});

vi.mock('drizzle-orm', () => {
  return {
    eq: vi.fn(() => ({})),
  };
});

// Now import the module under test
import {
  NLQRateLimiter,
  getNLQRateLimiter,
  RateLimitExceededError,
  shutdownRateLimiter,
} from '../rate-limiter.js';

describe('NLQRateLimiter', () => {
  let rateLimiter: NLQRateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter = new NLQRateLimiter();

    // Setup default mock returns
    mockRedis.pipeline.mockReturnValue(mockPipeline);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.decr.mockResolvedValue(0);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.keys.mockResolvedValue([]);
  });

  afterEach(async () => {
    vi.clearAllTimers();
  });

  describe('checkLimit', () => {
    it('should allow request when within all limits', async () => {
      // Mock Redis counters showing usage within limits
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '10'; // 10 used out of 500
        if (key.includes('hourly')) return '2'; // 2 used out of 50
        if (key.includes('concurrent')) return '1'; // 1 out of 5
        if (key.includes('config')) {
          return JSON.stringify({
            dailyQueryLimit: 500,
            hourlyQueryLimit: 50,
            concurrentQueryLimit: 5,
          });
        }
        return null;
      });

      const result = await rateLimiter.checkLimit('test-company-id');

      expect(result.allowed).toBe(true);
      expect(result.remainingDaily).toBe(490);
      expect(result.remainingHourly).toBe(48);
      expect(result.remainingConcurrent).toBe(4);
    });

    it('should deny request when daily limit exceeded', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '500'; // Daily limit reached
        if (key.includes('hourly')) return '2';
        if (key.includes('concurrent')) return '1';
        if (key.includes('config')) {
          return JSON.stringify({
            dailyQueryLimit: 500,
            hourlyQueryLimit: 50,
            concurrentQueryLimit: 5,
          });
        }
        return null;
      });

      const result = await rateLimiter.checkLimit('test-company-id');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily query limit exceeded');
      expect(result.resetAt).toBeDefined();
      expect(result.remainingDaily).toBe(0);
    });

    it('should deny request when hourly limit exceeded', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '10';
        if (key.includes('hourly')) return '50'; // Hourly limit reached
        if (key.includes('concurrent')) return '1';
        if (key.includes('config')) {
          return JSON.stringify({
            dailyQueryLimit: 500,
            hourlyQueryLimit: 50,
            concurrentQueryLimit: 5,
          });
        }
        return null;
      });

      const result = await rateLimiter.checkLimit('test-company-id');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hourly query limit exceeded');
      expect(result.resetAt).toBeDefined();
      expect(result.remainingHourly).toBe(0);
    });

    it('should deny request when concurrent limit exceeded', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '10';
        if (key.includes('hourly')) return '2';
        if (key.includes('concurrent')) return '5'; // Concurrent limit reached
        if (key.includes('config')) {
          return JSON.stringify({
            dailyQueryLimit: 500,
            hourlyQueryLimit: 50,
            concurrentQueryLimit: 5,
          });
        }
        return null;
      });

      const result = await rateLimiter.checkLimit('test-company-id');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Concurrent query limit exceeded');
      expect(result.remainingConcurrent).toBe(0);
    });

    it('should create default config if not exists', async () => {
      // No cached config
      mockRedis.get.mockResolvedValue(null);

      // Mock DB returning no record, then returning created record
      const mockDbSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      }));

      mockDb.select.mockImplementation(mockDbSelect);

      await rateLimiter.checkLimit('new-company-id');

      // Should have tried to insert new config
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should fail open on errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await rateLimiter.checkLimit('test-company-id');

      // Should allow request when rate limiter is down
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Rate limiter error');
    });
  });

  describe('incrementUsage', () => {
    it('should increment daily, hourly, and concurrent counters', async () => {
      await rateLimiter.incrementUsage('test-company-id');

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.incr).toHaveBeenCalledTimes(3); // daily, hourly, concurrent
      expect(mockPipeline.expire).toHaveBeenCalledTimes(2); // daily, hourly (not concurrent)
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should not throw on errors', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline failed'));

      await expect(
        rateLimiter.incrementUsage('test-company-id')
      ).resolves.not.toThrow();
    });
  });

  describe('decrementConcurrent', () => {
    it('should decrement concurrent counter when positive', async () => {
      mockRedis.get.mockResolvedValue('3');

      await rateLimiter.decrementConcurrent('test-company-id');

      expect(mockRedis.decr).toHaveBeenCalled();
    });

    it('should not decrement when counter is zero', async () => {
      mockRedis.get.mockResolvedValue('0');

      await rateLimiter.decrementConcurrent('test-company-id');

      expect(mockRedis.decr).not.toHaveBeenCalled();
    });

    it('should not decrement when counter is null', async () => {
      mockRedis.get.mockResolvedValue(null);

      await rateLimiter.decrementConcurrent('test-company-id');

      expect(mockRedis.decr).not.toHaveBeenCalled();
    });
  });

  describe('getRemainingQuota', () => {
    it('should return complete quota information', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '100';
        if (key.includes('hourly')) return '10';
        if (key.includes('concurrent')) return '2';
        if (key.includes('config')) {
          return JSON.stringify({
            dailyQueryLimit: 500,
            hourlyQueryLimit: 50,
            concurrentQueryLimit: 5,
          });
        }
        return null;
      });

      // Mock DB record
      mockDb.select.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                limitExceededCount: 3,
                lastLimitExceededAt: new Date('2024-01-01'),
              },
            ]),
          })),
        })),
      }));

      const quota = await rateLimiter.getRemainingQuota('test-company-id');

      expect(quota.companyId).toBe('test-company-id');
      expect(quota.dailyLimit).toBe(500);
      expect(quota.dailyUsed).toBe(100);
      expect(quota.dailyRemaining).toBe(400);
      expect(quota.hourlyLimit).toBe(50);
      expect(quota.hourlyUsed).toBe(10);
      expect(quota.hourlyRemaining).toBe(40);
      expect(quota.concurrentLimit).toBe(5);
      expect(quota.concurrentUsed).toBe(2);
      expect(quota.concurrentRemaining).toBe(3);
      expect(quota.limitExceededCount).toBe(3);
      expect(quota.lastLimitExceededAt).toBeDefined();
    });
  });

  describe('resetDailyQuota', () => {
    it('should delete all daily counter keys', async () => {
      mockRedis.keys.mockResolvedValue([
        'nlq:ratelimit:daily:company1',
        'nlq:ratelimit:daily:company2',
      ]);

      await rateLimiter.resetDailyQuota();

      expect(mockRedis.keys).toHaveBeenCalledWith('nlq:ratelimit:daily:*');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'nlq:ratelimit:daily:company1',
        'nlq:ratelimit:daily:company2'
      );
    });

    it('should handle no keys to reset', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await rateLimiter.resetDailyQuota();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('resetHourlyQuota', () => {
    it('should delete all hourly counter keys', async () => {
      mockRedis.keys.mockResolvedValue([
        'nlq:ratelimit:hourly:company1',
        'nlq:ratelimit:hourly:company2',
      ]);

      await rateLimiter.resetHourlyQuota();

      expect(mockRedis.keys).toHaveBeenCalledWith('nlq:ratelimit:hourly:*');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'nlq:ratelimit:hourly:company1',
        'nlq:ratelimit:hourly:company2'
      );
    });
  });

  describe('updateQuotaLimits', () => {
    it('should update quota limits in database and clear cache', async () => {
      const update = {
        companyId: 'test-company-id',
        dailyQueryLimit: 1000,
        hourlyQueryLimit: 100,
        concurrentQueryLimit: 10,
        reason: 'Demo account',
      };

      await rateLimiter.updateQuotaLimits(update);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith(
        'nlq:ratelimit:config:test-company-id'
      );
    });
  });

  describe('resetCompanyQuota', () => {
    it('should delete all counters for a company', async () => {
      await rateLimiter.resetCompanyQuota('test-company-id');

      expect(mockPipeline.del).toHaveBeenCalledTimes(3); // daily, hourly, concurrent
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('syncToDatabase', () => {
    it('should sync Redis counters to PostgreSQL', async () => {
      mockRedis.keys.mockImplementation(async (pattern: string) => {
        if (pattern.includes('daily')) return ['nlq:ratelimit:daily:company1'];
        if (pattern.includes('hourly')) return ['nlq:ratelimit:hourly:company1'];
        if (pattern.includes('concurrent')) return ['nlq:ratelimit:concurrent:company1'];
        return [];
      });

      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.includes('daily')) return '100';
        if (key.includes('hourly')) return '10';
        if (key.includes('concurrent')) return '2';
        return null;
      });

      await rateLimiter.syncToDatabase();

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle no counters to sync', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await rateLimiter.syncToDatabase();

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should not throw on sync errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await expect(rateLimiter.syncToDatabase()).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should sync to database and close Redis', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await rateLimiter.shutdown();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

describe('getNLQRateLimiter', () => {
  it('should return singleton instance', () => {
    const instance1 = getNLQRateLimiter();
    const instance2 = getNLQRateLimiter();

    expect(instance1).toBeDefined();
    expect(instance1).toBe(instance2);
  });
});

describe('RateLimitExceededError', () => {
  it('should create error with proper properties', () => {
    const resetAt = new Date();
    const error = new RateLimitExceededError(
      'Daily limit exceeded',
      'daily',
      resetAt,
      0
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Daily limit exceeded');
    expect(error.limitType).toBe('daily');
    expect(error.resetAt).toBe(resetAt);
    expect(error.remaining).toBe(0);
    expect(error.name).toBe('RateLimitExceededError');
  });
});
