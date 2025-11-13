import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../inference/retry';
import { RateLimitError } from '../inference/types';
import { AIProvider } from '../inference/types';

describe('retry', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new RateLimitError(AIProvider.CLAUDE))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffMultiplier: 1
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Non-retryable error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('Non-retryable error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const error = new RateLimitError(AIProvider.CLAUDE);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
          backoffMultiplier: 1
        })
      ).rejects.toThrow(RateLimitError);

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle 5xx HTTP errors as retryable', async () => {
      const error = { status: 503, message: 'Service Unavailable' };
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffMultiplier: 1
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle 429 HTTP errors as retryable', async () => {
      const error = { status: 429, message: 'Too Many Requests' };
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        backoffMultiplier: 1
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry 4xx errors (except 429)', async () => {
      const error = { status: 400, message: 'Bad Request' };
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toMatchObject({ status: 400 });

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
