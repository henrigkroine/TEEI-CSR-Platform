import { describe, it, expect } from 'vitest';
import {
  categorizeError,
  ErrorCategory,
  ErrorSeverity,
  createErrorResponse,
} from '../utils/error-handling';

describe('Error Handling', () => {
  describe('categorizeError', () => {
    it('should categorize network errors as transient', () => {
      const error = new Error('Network timeout');
      (error as any).code = 'ETIMEDOUT';

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.shouldRetry).toBe(true);
      expect(result.retryDelayMs).toBeGreaterThan(0);
    });

    it('should categorize rate limit errors as transient', () => {
      const error = new Error('Too many requests');
      (error as any).statusCode = 429;

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.shouldRetry).toBe(true);
      expect(result.statusCode).toBe(429);
    });

    it('should categorize validation errors as permanent', () => {
      const error = new Error('Invalid data');
      (error as any).name = 'ValidationError';

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.PERMANENT);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.shouldRetry).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it('should categorize auth errors as permanent', () => {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 401;

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.PERMANENT);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.shouldRetry).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should categorize database errors as critical', () => {
      const error = new Error('Connection pool exhausted');
      (error as any).code = 'PGPOOL';

      const result = categorizeError(error, { database: true });

      expect(result.category).toBe(ErrorCategory.CRITICAL);
      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
      expect(result.shouldRetry).toBe(true);
    });

    it('should categorize service unavailable as transient', () => {
      const error = new Error('Service unavailable');
      (error as any).statusCode = 503;

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.shouldRetry).toBe(true);
      expect(result.statusCode).toBe(503);
    });

    it('should categorize unknown errors as unknown with retry', () => {
      const error = new Error('Something weird happened');

      const result = categorizeError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.shouldRetry).toBe(true);
    });

    it('should preserve error context', () => {
      const error = new Error('Test error');
      const context = { deliveryId: 'test-123', eventType: 'test.event' };

      const result = categorizeError(error, context);

      expect(result.context).toMatchObject(context);
    });
  });

  describe('createErrorResponse', () => {
    it('should create user-friendly error response', () => {
      const error = new Error('Network timeout');
      (error as any).code = 'ETIMEDOUT';

      const categorized = categorizeError(error);
      const response = createErrorResponse(categorized, 'delivery-123');

      expect(response).toMatchObject({
        status: 'error',
        deliveryId: 'delivery-123',
        category: ErrorCategory.TRANSIENT,
        shouldRetry: true,
      });
      expect(response.message).toContain('Network connection issue');
    });

    it('should include retry delay for retryable errors', () => {
      const error = new Error('Service unavailable');
      (error as any).statusCode = 503;

      const categorized = categorizeError(error);
      const response = createErrorResponse(categorized, 'delivery-123');

      expect(response.shouldRetry).toBe(true);
      expect(response.retryAfter).toBeGreaterThan(0);
    });

    it('should not include retry delay for permanent errors', () => {
      const error = new Error('Invalid data');
      (error as any).name = 'ValidationError';

      const categorized = categorizeError(error);
      const response = createErrorResponse(categorized, 'delivery-123');

      expect(response.shouldRetry).toBe(false);
      expect(response.retryAfter).toBeUndefined();
    });
  });
});
