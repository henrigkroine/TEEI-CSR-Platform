/**
 * Unit tests for NLQ Cache Layer
 * Uses Redis mock to test cache behavior without actual Redis instance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NLQCache, generateCacheKey, type CacheKey } from '../nlq-cache.js';

// ===== REDIS MOCK =====

class RedisMock {
  private store = new Map<string, { value: string; ttl: number; expiresAt: number }>();
  private stats = { hits: 0, misses: 0 };

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string> {
    let ttl = 3600;
    let nx = false;

    // Parse SET arguments (SET key value EX ttl NX)
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && args[i + 1]) {
        ttl = args[i + 1];
        i++;
      } else if (args[i] === 'NX') {
        nx = true;
      }
    }

    // NX mode: only set if not exists
    if (nx && this.store.has(key)) {
      return null as any;
    }

    this.store.set(key, {
      value,
      ttl,
      expiresAt: Date.now() + ttl * 1000,
    });

    return 'OK';
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    this.store.set(key, {
      value,
      ttl,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(key => this.store.has(key)).length;
  }

  async incr(key: string): Promise<number> {
    const current = this.store.get(key);
    const value = current ? parseInt(current.value, 10) + 1 : 1;
    this.store.set(key, {
      value: value.toString(),
      ttl: 0,
      expiresAt: Date.now() + 86400 * 1000,
    });
    return value;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async info(section: string): Promise<string> {
    if (section === 'stats') {
      return `keyspace_hits:${this.stats.hits}\nkeyspace_misses:${this.stats.misses}`;
    } else if (section === 'memory') {
      return 'used_memory:1048576\nused_memory_human:1.00M';
    }
    return '';
  }

  async scan(
    cursor: string,
    ...args: any[]
  ): Promise<[string, string[]]> {
    const match = args[1]; // args[0] is 'MATCH'
    const keys = await this.keys(match);
    return ['0', keys];
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const entry = this.store.get(key);
    if (!entry) return {};
    return JSON.parse(entry.value);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const entry = this.store.get(key);
    const hash = entry ? JSON.parse(entry.value) : {};
    hash[field] = (parseInt(hash[field] || '0', 10) + increment).toString();
    this.store.set(key, {
      value: JSON.stringify(hash),
      ttl: 0,
      expiresAt: Date.now() + 86400 * 1000,
    });
    return parseInt(hash[field], 10);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const entry = this.store.get(key);
    const hash = entry ? JSON.parse(entry.value) : {};
    const isNew = !hash[field];
    hash[field] = value;
    this.store.set(key, {
      value: JSON.stringify(hash),
      ttl: 0,
      expiresAt: Date.now() + 86400 * 1000,
    });
    return isNew ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async config(): Promise<any> {
    return 'OK';
  }

  on(): void {}
  pipeline(): any {
    const commands: Array<() => Promise<any>> = [];

    const self = this;
    return {
      get(key: string) {
        commands.push(() => self.get(key));
        return this;
      },
      set(key: string, value: string, ...args: any[]) {
        commands.push(() => self.set(key, value, ...args));
        return this;
      },
      setex(key: string, ttl: number, value: string) {
        commands.push(() => self.setex(key, ttl, value));
        return this;
      },
      del(...keys: string[]) {
        commands.push(() => self.del(...keys));
        return this;
      },
      hincrby(key: string, field: string, increment: number) {
        commands.push(() => self.hincrby(key, field, increment));
        return this;
      },
      hset(key: string, field: string, value: string) {
        commands.push(() => self.hset(key, field, value));
        return this;
      },
      expire(key: string, seconds: number) {
        commands.push(() => self.expire(key, seconds));
        return this;
      },
      async exec() {
        const results = await Promise.all(
          commands.map(async cmd => {
            try {
              const result = await cmd();
              return [null, result];
            } catch (err) {
              return [err, null];
            }
          })
        );
        return results;
      },
    };
  }
}

// Mock Redis module
vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => new RedisMock()),
  };
});

// ===== TESTS =====

describe('generateCacheKey', () => {
  it('should generate consistent keys for same input', () => {
    const params: CacheKey = {
      normalizedQuestion: 'What is our SROI?',
      companyId: 'test-company',
      timeRange: 'last_quarter',
    };

    const key1 = generateCacheKey(params);
    const key2 = generateCacheKey(params);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^nlq:test-company:[a-f0-9]{64}$/);
  });

  it('should generate different keys for different inputs', () => {
    const params1: CacheKey = {
      normalizedQuestion: 'What is our SROI?',
      companyId: 'test-company',
      timeRange: 'last_quarter',
    };

    const params2: CacheKey = {
      normalizedQuestion: 'What is our VIS?',
      companyId: 'test-company',
      timeRange: 'last_quarter',
    };

    const key1 = generateCacheKey(params1);
    const key2 = generateCacheKey(params2);

    expect(key1).not.toBe(key2);
  });

  it('should normalize question text (case-insensitive, trimmed)', () => {
    const params1: CacheKey = {
      normalizedQuestion: '  What is our SROI?  ',
      companyId: 'test-company',
      timeRange: 'last_quarter',
    };

    const params2: CacheKey = {
      normalizedQuestion: 'what is our sroi?',
      companyId: 'test-company',
      timeRange: 'last_quarter',
    };

    const key1 = generateCacheKey(params1);
    const key2 = generateCacheKey(params2);

    expect(key1).toBe(key2);
  });

  it('should handle filters in deterministic order', () => {
    const params1: CacheKey = {
      normalizedQuestion: 'test',
      companyId: 'test-company',
      timeRange: 'last_quarter',
      filters: { a: 1, b: 2, c: 3 },
    };

    const params2: CacheKey = {
      normalizedQuestion: 'test',
      companyId: 'test-company',
      timeRange: 'last_quarter',
      filters: { c: 3, a: 1, b: 2 }, // Different order
    };

    const key1 = generateCacheKey(params1);
    const key2 = generateCacheKey(params2);

    expect(key1).toBe(key2);
  });
});

describe('NLQCache', () => {
  let cache: NLQCache;

  beforeEach(() => {
    cache = new NLQCache();
  });

  describe('get/set operations', () => {
    it('should return null for cache miss', async () => {
      const result = await cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should store and retrieve data', async () => {
      const key = 'nlq:test:abc123';
      const data = { result: 'test data' };

      await cache.set(key, data, 3600);

      const cached = await cache.get(key);
      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(data);
      expect(cached?.metadata.ttl).toBe(3600);
    });

    it('should increment hit count on cache hit', async () => {
      const key = 'nlq:test:abc123';
      const data = { result: 'test data' };

      await cache.set(key, data, 3600);

      const cached1 = await cache.get(key);
      expect(cached1?.metadata.hitCount).toBe(1);

      const cached2 = await cache.get(key);
      expect(cached2?.metadata.hitCount).toBe(2);
    });

    it('should store template ID with cache entry', async () => {
      const key = 'nlq:test:abc123';
      const data = { result: 'test data' };
      const templateId = 'sroi_ratio';

      await cache.set(key, data, 3600, templateId);

      const cached = await cache.get(key);
      expect(cached?.metadata.templateId).toBe(templateId);
    });
  });

  describe('invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      await cache.set('nlq:company1:abc', { data: 1 }, 3600);
      await cache.set('nlq:company1:def', { data: 2 }, 3600);
      await cache.set('nlq:company2:ghi', { data: 3 }, 3600);

      const deleted = await cache.invalidate('nlq:company1:*');

      expect(deleted).toBe(2);

      const cached1 = await cache.get('nlq:company1:abc');
      const cached2 = await cache.get('nlq:company1:def');
      const cached3 = await cache.get('nlq:company2:ghi');

      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
      expect(cached3).not.toBeNull();
    });

    it('should invalidate by company ID', async () => {
      await cache.set('nlq:company1:abc', { data: 1 }, 3600);
      await cache.set('nlq:company1:def', { data: 2 }, 3600);
      await cache.set('nlq:company2:ghi', { data: 3 }, 3600);

      const deleted = await cache.invalidateByCompany('company1');

      expect(deleted).toBe(2);
    });

    it('should invalidate all cache', async () => {
      await cache.set('nlq:company1:abc', { data: 1 }, 3600);
      await cache.set('nlq:company2:def', { data: 2 }, 3600);

      const deleted = await cache.invalidateAll();

      expect(deleted).toBeGreaterThanOrEqual(2);
    });
  });

  describe('stampede protection', () => {
    it('should acquire and release lock', async () => {
      const key = 'test-key';

      const acquired1 = await cache.acquireLock(key);
      expect(acquired1).toBe(true);

      // Second acquisition should fail
      const acquired2 = await cache.acquireLock(key);
      expect(acquired2).toBe(false);

      // After release, should be able to acquire again
      await cache.releaseLock(key);

      const acquired3 = await cache.acquireLock(key);
      expect(acquired3).toBe(true);
    });

    it('should use stampede protection when fetching data', async () => {
      const cacheKey = 'nlq:test:stampede';
      let queryExecutionCount = 0;

      const queryFn = async () => {
        queryExecutionCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: 'data' };
      };

      // First call - cache miss, should execute query
      const result1 = await cache.withStampedeProtection(cacheKey, queryFn, 3600);

      expect(result1.cached).toBe(false);
      expect(queryExecutionCount).toBe(1);

      // Second call - cache hit, should NOT execute query
      const result2 = await cache.withStampedeProtection(cacheKey, queryFn, 3600);

      expect(result2.cached).toBe(true);
      expect(queryExecutionCount).toBe(1); // Still 1, not incremented
    });
  });

  describe('statistics', () => {
    it('should track cache stats', async () => {
      const key = 'nlq:test:stats';

      // Cache miss
      await cache.get(key);

      // Cache set
      await cache.set(key, { data: 'test' }, 3600);

      // Cache hit
      await cache.get(key);

      const stats = await cache.getStats();

      expect(stats.totalHits).toBeGreaterThanOrEqual(1);
      expect(stats.totalMisses).toBeGreaterThanOrEqual(1);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });

    it('should calculate hit rate correctly', async () => {
      const key = 'nlq:test:hitrate';

      // 1 miss
      await cache.get(key);

      // Set
      await cache.set(key, { data: 'test' }, 3600);

      // 2 hits
      await cache.get(key);
      await cache.get(key);

      const stats = await cache.getStats();

      // Hit rate should be 2/(2+1) = 66.67%
      expect(stats.hitRate).toBeGreaterThan(60);
      expect(stats.hitRate).toBeLessThan(70);
    });
  });

  describe('batch operations', () => {
    it('should get multiple entries in parallel', async () => {
      await cache.set('nlq:test:batch1', { data: 1 }, 3600);
      await cache.set('nlq:test:batch2', { data: 2 }, 3600);
      await cache.set('nlq:test:batch3', { data: 3 }, 3600);

      const results = await cache.getMultiple([
        'nlq:test:batch1',
        'nlq:test:batch2',
        'nlq:test:batch3',
        'nlq:test:batch4', // Non-existent
      ]);

      expect(results.size).toBe(4);
      expect(results.get('nlq:test:batch1')?.data).toEqual({ data: 1 });
      expect(results.get('nlq:test:batch2')?.data).toEqual({ data: 2 });
      expect(results.get('nlq:test:batch3')?.data).toEqual({ data: 3 });
      expect(results.get('nlq:test:batch4')).toBeNull();
    });

    it('should set multiple entries in parallel', async () => {
      const entries = [
        { key: 'nlq:test:multi1', data: { value: 1 }, ttl: 3600 },
        { key: 'nlq:test:multi2', data: { value: 2 }, ttl: 7200 },
        { key: 'nlq:test:multi3', data: { value: 3 }, ttl: 1800 },
      ];

      await cache.setMultiple(entries);

      const cached1 = await cache.get('nlq:test:multi1');
      const cached2 = await cache.get('nlq:test:multi2');
      const cached3 = await cache.get('nlq:test:multi3');

      expect(cached1?.data).toEqual({ value: 1 });
      expect(cached1?.metadata.ttl).toBe(3600);

      expect(cached2?.data).toEqual({ value: 2 });
      expect(cached2?.metadata.ttl).toBe(7200);

      expect(cached3?.data).toEqual({ value: 3 });
      expect(cached3?.metadata.ttl).toBe(1800);
    });
  });

  describe('health check', () => {
    it('should return true for healthy Redis', async () => {
      const healthy = await cache.healthCheck();
      expect(healthy).toBe(true);
    });
  });
});
