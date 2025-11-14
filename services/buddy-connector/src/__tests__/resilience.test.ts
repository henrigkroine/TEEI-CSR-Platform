import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Bulkhead,
  RateLimiter,
  withTimeout,
  withFallback,
} from '../utils/resilience';

describe('Resilience Patterns', () => {
  describe('Bulkhead', () => {
    it('should execute requests under capacity', async () => {
      const bulkhead = new Bulkhead('test', 2, 10);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await bulkhead.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should queue requests when at capacity', async () => {
      const bulkhead = new Bulkhead('test', 1, 10);
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const fn1 = vi.fn().mockImplementation(() => delay(100).then(() => 'first'));
      const fn2 = vi.fn().mockResolvedValue('second');

      // Start first request
      const promise1 = bulkhead.execute(fn1);

      // Start second request (should be queued)
      const promise2 = bulkhead.execute(fn2);

      const stats1 = bulkhead.getStats();
      expect(stats1.activeCount).toBe(1);
      expect(stats1.queueSize).toBeGreaterThan(0);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('first');
      expect(result2).toBe('second');
    });

    it('should reject when queue is full', async () => {
      const bulkhead = new Bulkhead('test', 1, 1);
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const fn1 = vi.fn().mockImplementation(() => delay(100).then(() => 'first'));
      const fn2 = vi.fn().mockResolvedValue('second');
      const fn3 = vi.fn().mockResolvedValue('third');

      // Start first request (active)
      const promise1 = bulkhead.execute(fn1);

      // Start second request (queued)
      const promise2 = bulkhead.execute(fn2);

      // Start third request (should be rejected - queue full)
      await expect(bulkhead.execute(fn3)).rejects.toThrow('at capacity');

      await promise1;
      await promise2;
    });

    it('should track bulkhead stats', async () => {
      const bulkhead = new Bulkhead('test', 5, 20);

      const stats = bulkhead.getStats();

      expect(stats.name).toBe('test');
      expect(stats.maxConcurrent).toBe(5);
      expect(stats.maxQueueSize).toBe(20);
      expect(stats.activeCount).toBe(0);
      expect(stats.queueSize).toBe(0);
      expect(stats.utilization).toBe(0);
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests under limit', () => {
      const limiter = new RateLimiter('test', 10, 10);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should reject requests over limit', () => {
      const limiter = new RateLimiter('test', 2, 10);

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false); // Over limit
    });

    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter('test', 2, 10, 100); // Refill every 100ms

      // Exhaust tokens
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // Wait for refill
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have tokens again
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should wait and acquire with acquire method', async () => {
      const limiter = new RateLimiter('test', 1, 10, 50);

      // Exhaust token
      expect(limiter.tryAcquire()).toBe(true);

      // This should wait for refill
      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some margin
    });

    it('should reset rate limiter', () => {
      const limiter = new RateLimiter('test', 2, 10);

      // Exhaust tokens
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.tryAcquire()).toBe(false);

      // Reset
      limiter.reset();

      // Should have tokens again
      expect(limiter.tryAcquire()).toBe(true);
    });

    it('should track rate limiter stats', () => {
      const limiter = new RateLimiter('test', 10, 5);

      limiter.tryAcquire(3);

      const stats = limiter.getStats();

      expect(stats.name).toBe('test');
      expect(stats.maxTokens).toBe(10);
      expect(stats.refillRate).toBe(5);
      expect(stats.tokensAvailable).toBe(7);
      expect(stats.utilization).toBeCloseTo(0.3);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if function completes in time', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withTimeout(fn, 1000, 'test');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reject if function times out', async () => {
      const fn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('late'), 200))
        );

      await expect(withTimeout(fn, 50, 'test operation')).rejects.toThrow(
        'test operation timed out'
      );
    });
  });

  describe('withFallback', () => {
    it('should return main function result on success', async () => {
      const main = vi.fn().mockResolvedValue('main');
      const fallback = vi.fn().mockResolvedValue('fallback');

      const result = await withFallback(main, fallback, 'test');

      expect(result).toBe('main');
      expect(main).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback on main function failure', async () => {
      const main = vi.fn().mockRejectedValue(new Error('Main failed'));
      const fallback = vi.fn().mockResolvedValue('fallback');

      const result = await withFallback(main, fallback, 'test');

      expect(result).toBe('fallback');
      expect(main).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should throw if both main and fallback fail', async () => {
      const main = vi.fn().mockRejectedValue(new Error('Main failed'));
      const fallback = vi.fn().mockRejectedValue(new Error('Fallback failed'));

      await expect(withFallback(main, fallback, 'test')).rejects.toThrow(
        'Fallback failed'
      );

      expect(main).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });
  });
});
