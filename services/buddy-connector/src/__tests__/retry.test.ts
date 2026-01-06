import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateBackoffDelay,
  retryWithBackoff,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_CONFIG,
} from '../utils/retry';

describe('Retry Mechanisms', () => {
  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      const delay1 = calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG);
      const delay2 = calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG);
      const delay3 = calculateBackoffDelay(2, DEFAULT_RETRY_CONFIG);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should cap at max delay', () => {
      const delay = calculateBackoffDelay(10, DEFAULT_RETRY_CONFIG);

      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs * 1.1); // Allow for jitter
    });

    it('should add jitter to delays', () => {
      const delays = Array.from({ length: 10 }, () =>
        calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG)
      );

      // Check that not all delays are identical (jitter is working)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(
        fn,
        {
          operationName: 'test',
          deliveryId: 'test-123',
          eventType: 'test.event',
        },
        { ...DEFAULT_RETRY_CONFIG, maxRetries: 3 }
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' })
        )
        .mockResolvedValue('success');

      const result = await retryWithBackoff(
        fn,
        {
          operationName: 'test',
          deliveryId: 'test-123',
          eventType: 'test.event',
        },
        { ...DEFAULT_RETRY_CONFIG, maxRetries: 3, initialDelayMs: 10 }
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent errors', async () => {
      const error = Object.assign(new Error('Invalid data'), {
        name: 'ValidationError',
      });

      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(
          fn,
          {
            operationName: 'test',
            deliveryId: 'test-123',
            eventType: 'test.event',
          },
          { ...DEFAULT_RETRY_CONFIG, maxRetries: 3 }
        )
      ).rejects.toThrow('Invalid data');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw', async () => {
      const error = Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' });
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        retryWithBackoff(
          fn,
          {
            operationName: 'test',
            deliveryId: 'test-123',
            eventType: 'test.event',
          },
          { ...DEFAULT_RETRY_CONFIG, maxRetries: 2, initialDelayMs: 10 }
        )
      ).rejects.toThrow('Timeout');

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow requests when closed', async () => {
      const breaker = new CircuitBreaker('test', DEFAULT_CIRCUIT_CONFIG);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState().state).toBe('closed');
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker('test', {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 3,
      });

      const fn = vi.fn().mockRejectedValue(new Error('Failed'));

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe('open');

      // Next request should fail fast
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker');
      expect(fn).toHaveBeenCalledTimes(3); // Not called on 4th attempt
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker('test', {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 2,
        resetTimeoutMs: 100,
      });

      const fn = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState().state).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should enter half-open
      fn.mockResolvedValue('success');
      await breaker.execute(fn);

      expect(breaker.getState().state).toBe('half_open');
    });

    it('should close after success threshold in half-open', async () => {
      const breaker = new CircuitBreaker('test', {
        ...DEFAULT_CIRCUIT_CONFIG,
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeoutMs: 100,
      });

      const fn = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed twice
      fn.mockResolvedValue('success');
      await breaker.execute(fn);
      await breaker.execute(fn);

      expect(breaker.getState().state).toBe('closed');
    });

    it('should reset circuit breaker', () => {
      const breaker = new CircuitBreaker('test', DEFAULT_CIRCUIT_CONFIG);

      breaker.reset();

      const state = breaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });
  });
});
