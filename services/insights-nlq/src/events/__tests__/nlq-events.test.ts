/**
 * NLQ Events Integration Tests
 *
 * Tests event publishing and subscription functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EventBus } from '@teei/shared-utils';
import {
  publishQueryStarted,
  publishQueryCompleted,
  publishQueryFailed,
  publishQueryRejected,
  publishCacheInvalidated,
  subscribeToQueryCompleted,
} from '../nlq-events.js';

// Mock the EventBus
vi.mock('@teei/shared-utils', () => ({
  getEventBus: vi.fn(),
  createServiceLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('NLQ Event Publishers', () => {
  let mockEventBus: Partial<EventBus>;
  let publishMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    publishMock = vi.fn().mockResolvedValue(undefined);
    mockEventBus = {
      publish: publishMock,
    };

    const { getEventBus } = await import('@teei/shared-utils');
    vi.mocked(getEventBus).mockReturnValue(mockEventBus as EventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('publishQueryStarted', () => {
    it('should publish query started event with correct payload', async () => {
      const payload = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        userId: '123e4567-e89b-12d3-a456-426614174002',
        normalizedQuestion: 'What is our SROI?',
        templateId: 'sroi_ratio',
      };

      await publishQueryStarted(payload);

      expect(publishMock).toHaveBeenCalledTimes(1);
      const publishedEvent = publishMock.mock.calls[0][0];

      expect(publishedEvent.type).toBe('nlq.query.started');
      expect(publishedEvent.data.queryId).toBe(payload.queryId);
      expect(publishedEvent.data.companyId).toBe(payload.companyId);
      expect(publishedEvent.data.normalizedQuestion).toBe(payload.normalizedQuestion);
      expect(publishedEvent.data.startedAt).toBeDefined();
    });

    it('should handle publish errors gracefully', async () => {
      publishMock.mockRejectedValueOnce(new Error('NATS connection failed'));

      const payload = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        normalizedQuestion: 'What is our SROI?',
      };

      // Should not throw
      await expect(publishQueryStarted(payload)).resolves.not.toThrow();
    });
  });

  describe('publishQueryCompleted', () => {
    it('should publish query completed event with metrics', async () => {
      const payload = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        templateId: 'sroi_ratio',
        executionTimeMs: 1250,
        cached: false,
        resultRowCount: 42,
        confidence: 0.95,
        safetyPassed: true,
      };

      await publishQueryCompleted(payload);

      expect(publishMock).toHaveBeenCalledTimes(1);
      const publishedEvent = publishMock.mock.calls[0][0];

      expect(publishedEvent.type).toBe('nlq.query.completed');
      expect(publishedEvent.data.executionTimeMs).toBe(1250);
      expect(publishedEvent.data.cached).toBe(false);
      expect(publishedEvent.data.confidence).toBe(0.95);
      expect(publishedEvent.data.completedAt).toBeDefined();
    });
  });

  describe('publishQueryFailed', () => {
    it('should publish query failed event with error details', async () => {
      const payload = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        normalizedQuestion: 'Invalid query',
        errorMessage: 'Validation failed',
        errorType: 'validation' as const,
        executionTimeMs: 50,
      };

      await publishQueryFailed(payload);

      expect(publishMock).toHaveBeenCalledTimes(1);
      const publishedEvent = publishMock.mock.calls[0][0];

      expect(publishedEvent.type).toBe('nlq.query.failed');
      expect(publishedEvent.data.errorType).toBe('validation');
      expect(publishedEvent.data.errorMessage).toBe('Validation failed');
      expect(publishedEvent.data.failedAt).toBeDefined();
    });
  });

  describe('publishQueryRejected', () => {
    it('should publish query rejected event with safety details', async () => {
      const payload = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        normalizedQuestion: 'Unsafe query with PII',
        rejectionReason: 'pii_detected' as const,
        safetyScore: 0.15,
      };

      await publishQueryRejected(payload);

      expect(publishMock).toHaveBeenCalledTimes(1);
      const publishedEvent = publishMock.mock.calls[0][0];

      expect(publishedEvent.type).toBe('nlq.query.rejected');
      expect(publishedEvent.data.rejectionReason).toBe('pii_detected');
      expect(publishedEvent.data.safetyScore).toBe(0.15);
      expect(publishedEvent.data.rejectedAt).toBeDefined();
    });
  });

  describe('publishCacheInvalidated', () => {
    it('should publish cache invalidated event', async () => {
      const payload = {
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        keysInvalidated: 42,
        reason: 'metrics_updated' as const,
      };

      await publishCacheInvalidated(payload);

      expect(publishMock).toHaveBeenCalledTimes(1);
      const publishedEvent = publishMock.mock.calls[0][0];

      expect(publishedEvent.type).toBe('nlq.cache.invalidated');
      expect(publishedEvent.data.keysInvalidated).toBe(42);
      expect(publishedEvent.data.reason).toBe('metrics_updated');
      expect(publishedEvent.data.invalidatedAt).toBeDefined();
    });

    it('should support template-scoped invalidation', async () => {
      const payload = {
        templateId: 'sroi_ratio',
        keysInvalidated: 15,
        reason: 'manual' as const,
      };

      await publishCacheInvalidated(payload);

      const publishedEvent = publishMock.mock.calls[0][0];
      expect(publishedEvent.data.templateId).toBe('sroi_ratio');
      expect(publishedEvent.data.companyId).toBeUndefined();
    });
  });
});

describe('NLQ Event Subscribers', () => {
  let mockEventBus: Partial<EventBus>;
  let subscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    subscribeMock = vi.fn().mockResolvedValue(undefined);
    mockEventBus = {
      subscribe: subscribeMock,
    };

    const { getEventBus } = await import('@teei/shared-utils');
    vi.mocked(getEventBus).mockReturnValue(mockEventBus as EventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToQueryCompleted', () => {
    it('should subscribe to query completed events with queue group', async () => {
      const handler = vi.fn();

      await subscribeToQueryCompleted(handler);

      expect(subscribeMock).toHaveBeenCalledTimes(1);
      expect(subscribeMock).toHaveBeenCalledWith(
        'nlq.query.completed',
        expect.any(Function),
        { queue: 'nlq-query-completed' }
      );
    });

    it('should call handler when event is received', async () => {
      const handler = vi.fn();
      let eventHandler: (event: any) => void;

      subscribeMock.mockImplementationOnce(async (eventType, callback) => {
        eventHandler = callback;
      });

      await subscribeToQueryCompleted(handler);

      const mockEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'nlq.query.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          queryId: '123e4567-e89b-12d3-a456-426614174001',
          companyId: '123e4567-e89b-12d3-a456-426614174002',
          templateId: 'sroi_ratio',
          executionTimeMs: 1000,
          cached: true,
          resultRowCount: 10,
          confidence: 0.9,
          safetyPassed: true,
          completedAt: new Date().toISOString(),
        },
      };

      await eventHandler!(mockEvent);

      expect(handler).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle errors in event handler gracefully', async () => {
      const handler = vi.fn().mockRejectedValueOnce(new Error('Handler error'));
      let eventHandler: (event: any) => void;

      subscribeMock.mockImplementationOnce(async (eventType, callback) => {
        eventHandler = callback;
      });

      await subscribeToQueryCompleted(handler);

      const mockEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'nlq.query.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          queryId: '123e4567-e89b-12d3-a456-426614174001',
          companyId: '123e4567-e89b-12d3-a456-426614174002',
          templateId: 'sroi_ratio',
          executionTimeMs: 1000,
          cached: true,
          resultRowCount: 10,
          confidence: 0.9,
          safetyPassed: true,
          completedAt: new Date().toISOString(),
        },
      };

      // Should not throw
      await expect(eventHandler!(mockEvent)).resolves.not.toThrow();
    });
  });
});

describe('Event Payload Validation', () => {
  it('should include all required fields in query started event', async () => {
    const { getEventBus } = await import('@teei/shared-utils');
    const publishMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getEventBus).mockReturnValue({ publish: publishMock } as any);

    await publishQueryStarted({
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      companyId: '123e4567-e89b-12d3-a456-426614174001',
      normalizedQuestion: 'Test question',
    });

    const event = publishMock.mock.calls[0][0];
    expect(event).toHaveProperty('id');
    expect(event).toHaveProperty('type');
    expect(event).toHaveProperty('version');
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('data');
    expect(event.data).toHaveProperty('queryId');
    expect(event.data).toHaveProperty('companyId');
    expect(event.data).toHaveProperty('normalizedQuestion');
    expect(event.data).toHaveProperty('startedAt');
  });

  it('should include optional userId when provided', async () => {
    const { getEventBus } = await import('@teei/shared-utils');
    const publishMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getEventBus).mockReturnValue({ publish: publishMock } as any);

    await publishQueryStarted({
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      companyId: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174002',
      normalizedQuestion: 'Test question',
    });

    const event = publishMock.mock.calls[0][0];
    expect(event.data.userId).toBe('123e4567-e89b-12d3-a456-426614174002');
  });
});
