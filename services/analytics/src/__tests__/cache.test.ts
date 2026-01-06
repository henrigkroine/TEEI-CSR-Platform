import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Redis from 'ioredis';

/**
 * Cache Unit Tests
 *
 * These tests verify the functionality of the Redis caching layer:
 * - get/set/del operations
 * - TTL expiration
 * - Cache middleware
 * - Invalidation logic
 *
 * Note: Tests use a mock Redis client to avoid requiring a real Redis instance
 */

// Mock Redis client
vi.mock('ioredis', () => {
  const mockData = new Map<string, { value: string; ttl: number; setAt: number }>();

  class MockRedis {
    constructor() {}

    async get(key: string): Promise<string | null> {
      const item = mockData.get(key);
      if (!item) return null;

      // Check if TTL expired
      const now = Date.now();
      if (item.ttl > 0 && now - item.setAt > item.ttl * 1000) {
        mockData.delete(key);
        return null;
      }

      return item.value;
    }

    async setex(key: string, ttl: number, value: string): Promise<'OK'> {
      mockData.set(key, { value, ttl, setAt: Date.now() });
      return 'OK';
    }

    async del(...keys: string[]): Promise<number> {
      let deleted = 0;
      for (const key of keys) {
        if (mockData.delete(key)) {
          deleted++;
        }
      }
      return deleted;
    }

    async exists(key: string): Promise<number> {
      return mockData.has(key) ? 1 : 0;
    }

    async scan(
      cursor: string,
      ...args: any[]
    ): Promise<[string, string[]]> {
      // Simple mock for SCAN - return all keys matching pattern
      const pattern = args[args.indexOf('MATCH') + 1];
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const keys = Array.from(mockData.keys()).filter((k) => regex.test(k));
      return ['0', keys];
    }

    async ping(): Promise<'PONG'> {
      return 'PONG';
    }

    async quit(): Promise<'OK'> {
      mockData.clear();
      return 'OK';
    }

    on(event: string, handler: Function) {
      // Mock event handlers
      if (event === 'ready') {
        setTimeout(() => handler(), 0);
      }
      return this;
    }
  }

  return {
    default: MockRedis,
  };
});

// Import cache functions after mocking Redis
import {
  initRedis,
  get,
  set,
  del,
  delPattern,
  exists,
  getCacheStats,
  resetCacheStats,
  healthCheck,
  disconnect,
} from '../cache/redis.js';

describe('Redis Cache', () => {
  beforeAll(() => {
    initRedis();
  });

  afterAll(async () => {
    await disconnect();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key1';
      const value = { foo: 'bar', num: 123 };

      await set(key, value, 60);
      const retrieved = await get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await get('test:nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should delete a value', async () => {
      const key = 'test:key2';
      const value = { data: 'to-delete' };

      await set(key, value, 60);
      await del(key);
      const retrieved = await get(key);

      expect(retrieved).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:key3';
      const value = { data: 'exists' };

      await set(key, value, 60);
      const doesExist = await exists(key);
      expect(doesExist).toBe(true);

      await del(key);
      const doesNotExist = await exists(key);
      expect(doesNotExist).toBe(false);
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete all keys matching a pattern', async () => {
      // Set multiple keys
      await set('metrics:company:123:period:2024-01', { data: 'a' }, 60);
      await set('metrics:company:123:period:2024-02', { data: 'b' }, 60);
      await set('metrics:company:123:sroi', { data: 'c' }, 60);
      await set('metrics:company:456:period:2024-01', { data: 'd' }, 60);

      // Delete all keys for company 123
      await delPattern('metrics:company:123:*');

      // Check that company 123 keys are gone
      expect(await exists('metrics:company:123:period:2024-01')).toBe(false);
      expect(await exists('metrics:company:123:period:2024-02')).toBe(false);
      expect(await exists('metrics:company:123:sroi')).toBe(false);

      // Check that company 456 key still exists
      expect(await exists('metrics:company:456:period:2024-01')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      resetCacheStats();

      const key = 'test:stats';
      const value = { data: 'stats-test' };

      // First get - should be a miss
      await get(key);
      let stats = getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Set the value
      await set(key, value, 60);

      // Second get - should be a hit
      await get(key);
      stats = getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50); // 1 hit out of 2 operations

      // Third get - another hit
      await get(key);
      stats = getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1); // 2 hits out of 3 operations
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Redis is healthy');
    });
  });

  describe('Cache Middleware', () => {
    it('should generate correct cache keys', () => {
      const { cacheKeyGenerators } = require('../middleware/cache.js');

      // Test companyPeriod key generator
      const companyPeriodKey = cacheKeyGenerators.companyPeriod({
        params: { companyId: '123', period: '2024-01' },
      } as any);
      expect(companyPeriodKey).toBe('metrics:company:123:period:2024-01');

      // Test SROI key generator
      const sroiKey = cacheKeyGenerators.sroi({
        params: { companyId: '456' },
        query: {},
      } as any);
      expect(sroiKey).toBe('metrics:sroi:456');

      // Test SROI with date range
      const sroiWithDatesKey = cacheKeyGenerators.sroi({
        params: { companyId: '456' },
        query: { startDate: '2024-01-01', endDate: '2024-12-31' },
      } as any);
      expect(sroiWithDatesKey).toBe('metrics:sroi:456:2024-01-01:2024-12-31');

      // Test VIS key generator
      const visKey = cacheKeyGenerators.vis({
        params: { companyId: '789' },
        query: {},
      } as any);
      expect(visKey).toBe('metrics:vis:789');

      // Test evidence key generator
      const evidenceKey = cacheKeyGenerators.evidence({
        params: { metricId: 'metric-123' },
      } as any);
      expect(evidenceKey).toBe('metrics:evidence:metric-123');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate company cache', async () => {
      const { invalidateCompanyCache } = require('../cache/invalidation.js');

      // Set up test data
      await set('metrics:company:123:period:2024-01', { data: 'a' }, 60);
      await set('metrics:sroi:123', { data: 'b' }, 60);
      await set('metrics:vis:123', { data: 'c' }, 60);

      // Invalidate
      await invalidateCompanyCache('123');

      // Verify all are gone
      expect(await exists('metrics:company:123:period:2024-01')).toBe(false);
      expect(await exists('metrics:sroi:123')).toBe(false);
      expect(await exists('metrics:vis:123')).toBe(false);
    });

    it('should invalidate period cache', async () => {
      const { invalidatePeriodCache } = require('../cache/invalidation.js');

      const key = 'metrics:company:123:period:2024-01';
      await set(key, { data: 'test' }, 60);

      await invalidatePeriodCache('123', '2024-01');

      expect(await exists(key)).toBe(false);
    });

    it('should invalidate SROI cache', async () => {
      const { invalidateSROICache } = require('../cache/invalidation.js');

      await set('metrics:sroi:123', { data: 'a' }, 60);
      await set('metrics:sroi:123:2024-01-01:2024-12-31', { data: 'b' }, 60);

      await invalidateSROICache('123');

      expect(await exists('metrics:sroi:123')).toBe(false);
      expect(await exists('metrics:sroi:123:2024-01-01:2024-12-31')).toBe(false);
    });

    it('should invalidate VIS cache', async () => {
      const { invalidateVISCache } = require('../cache/invalidation.js');

      await set('metrics:vis:123', { data: 'a' }, 60);
      await set('metrics:vis:123:2024-01-01:2024-12-31', { data: 'b' }, 60);

      await invalidateVISCache('123');

      expect(await exists('metrics:vis:123')).toBe(false);
      expect(await exists('metrics:vis:123:2024-01-01:2024-12-31')).toBe(false);
    });
  });

  describe('TTL Behavior', () => {
    it('should respect TTL constants', () => {
      const { TTL } = require('../middleware/cache.js');

      expect(TTL.ONE_HOUR).toBe(3600);
      expect(TTL.ONE_DAY).toBe(86400);
      expect(TTL.FIVE_MINUTES).toBe(300);
      expect(TTL.TEN_MINUTES).toBe(600);
    });
  });
});
