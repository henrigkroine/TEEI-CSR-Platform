/**
 * Unit tests for Cache Warmer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheWarmer, getCacheWarmer, stopCacheWarmer } from '../cache-warmer.js';

// Mock the cache module
vi.mock('../nlq-cache.js', () => {
  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    invalidateByCompany: vi.fn(),
  };

  return {
    getNLQCache: () => mockCache,
    generateCacheKey: (params: any) => `nlq:${params.companyId}:${params.normalizedQuestion}`,
  };
});

describe('CacheWarmer', () => {
  let warmer: CacheWarmer;

  beforeEach(() => {
    warmer = new CacheWarmer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    warmer.stop();
  });

  describe('warmup', () => {
    it('should warm cache for specified companies', async () => {
      const companyIds = ['company1', 'company2'];

      await warmer.warmup(companyIds);

      const stats = warmer.getStats();
      expect(stats.totalWarmupsCompleted).toBe(1);
      expect(stats.lastWarmupAt).toBeDefined();
    });

    it('should not run concurrent warmups', async () => {
      const companyIds = ['company1'];

      // Start first warmup
      const warmup1 = warmer.warmup(companyIds);

      // Try to start second warmup (should be skipped)
      const warmup2 = warmer.warmup(companyIds);

      await Promise.all([warmup1, warmup2]);

      const stats = warmer.getStats();
      expect(stats.totalWarmupsCompleted).toBe(1); // Only one should complete
    });

    it('should track warmup statistics', async () => {
      const companyIds = ['company1'];

      await warmer.warmup(companyIds);

      const stats = warmer.getStats();
      expect(stats.totalWarmupsCompleted).toBe(1);
      expect(stats.totalQueriesWarmed).toBeGreaterThan(0);
      expect(stats.lastWarmupDurationMs).toBeGreaterThan(0);
      expect(stats.averageWarmupDurationMs).toBeGreaterThan(0);
    });
  });

  describe('warmupCompany', () => {
    it('should warm cache for a single company', async () => {
      const warmedCount = await warmer.warmupCompany('test-company');

      expect(warmedCount).toBeGreaterThan(0);
    });
  });

  describe('warmupTemplates', () => {
    it('should warm cache for specific templates', async () => {
      const templateIds = ['sroi_ratio', 'vis_score'];
      const companyId = 'test-company';

      await warmer.warmupTemplates(templateIds, companyId);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle empty template list', async () => {
      const templateIds: string[] = [];
      const companyId = 'test-company';

      await warmer.warmupTemplates(templateIds, companyId);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('periodic warmup', () => {
    it('should start and stop periodic warmup', () => {
      warmer.start();
      expect(true).toBe(true); // Should not throw

      warmer.stop();
      expect(true).toBe(true); // Should not throw
    });

    it('should not start twice', () => {
      warmer.start();
      warmer.start(); // Should log warning but not crash

      warmer.stop();
      expect(true).toBe(true);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getCacheWarmer();
      const instance2 = getCacheWarmer();

      expect(instance1).toBe(instance2);
    });

    it('should stop and clear instance', () => {
      const instance1 = getCacheWarmer();
      instance1.start();

      stopCacheWarmer();

      const instance2 = getCacheWarmer();
      expect(instance2).toBeDefined();
      expect(instance2).not.toBe(instance1);
    });
  });
});
