/**
 * Event Subscribers Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initializeSubscribers,
  shutdownSubscribers,
  checkSubscribersHealth,
  getEventStats,
  resetEventStats,
} from '../subscribers.js';

// Mock dependencies
vi.mock('@teei/shared-utils', () => ({
  getEventBus: vi.fn(),
  createServiceLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../cache-invalidation.js', () => ({
  handleMetricsUpdated: vi.fn().mockResolvedValue(undefined),
  handleOutcomesClassified: vi.fn().mockResolvedValue(undefined),
  handleReportsGenerated: vi.fn().mockResolvedValue(undefined),
}));

describe('Event Subscribers', () => {
  let mockEventBus: any;

  beforeEach(() => {
    mockEventBus = {
      nc: { status: 'connected' },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      subscriptions: new Map([
        ['metrics.updated', {}],
        ['outcomes.classified', {}],
        ['reports.generated', {}],
      ]),
    };

    const { getEventBus } = require('@teei/shared-utils');
    vi.mocked(getEventBus).mockReturnValue(mockEventBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetEventStats();
  });

  describe('initializeSubscribers', () => {
    it('should initialize all event subscribers', async () => {
      await initializeSubscribers();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3);

      // Check metrics.updated subscription
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'metrics.updated',
        expect.any(Function),
        { queue: 'insights-nlq-metrics' }
      );

      // Check outcomes.classified subscription
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'outcomes.classified',
        expect.any(Function),
        { queue: 'insights-nlq-outcomes' }
      );

      // Check reports.generated subscription
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'reports.generated',
        expect.any(Function),
        { queue: 'insights-nlq-reports' }
      );
    });

    it('should connect to event bus if not connected', async () => {
      mockEventBus.nc = null;

      await initializeSubscribers();

      expect(mockEventBus.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      mockEventBus.subscribe.mockRejectedValueOnce(new Error('Subscription failed'));

      await expect(initializeSubscribers()).rejects.toThrow('Subscription failed');
    });
  });

  describe('shutdownSubscribers', () => {
    it('should disconnect from event bus', async () => {
      await shutdownSubscribers();

      expect(mockEventBus.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown errors gracefully', async () => {
      mockEventBus.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'));

      // Should not throw
      await expect(shutdownSubscribers()).resolves.not.toThrow();
    });
  });

  describe('checkSubscribersHealth', () => {
    it('should return healthy status when connected with subscriptions', async () => {
      const health = await checkSubscribersHealth();

      expect(health).toEqual({
        healthy: true,
        connected: true,
        subscriptions: 3,
      });
    });

    it('should return unhealthy status when not connected', async () => {
      mockEventBus.nc = null;

      const health = await checkSubscribersHealth();

      expect(health).toEqual({
        healthy: false,
        connected: false,
        subscriptions: 0,
      });
    });

    it('should return unhealthy status with insufficient subscriptions', async () => {
      mockEventBus.subscriptions = new Map([['metrics.updated', {}]]);

      const health = await checkSubscribersHealth();

      expect(health.healthy).toBe(false);
      expect(health.subscriptions).toBe(1);
    });

    it('should handle health check errors', async () => {
      const { getEventBus } = require('@teei/shared-utils');
      vi.mocked(getEventBus).mockImplementationOnce(() => {
        throw new Error('EventBus error');
      });

      const health = await checkSubscribersHealth();

      expect(health).toEqual({
        healthy: false,
        connected: false,
        subscriptions: 0,
      });
    });
  });

  describe('Event Statistics', () => {
    it('should track event statistics', () => {
      resetEventStats();

      const stats = getEventStats();

      expect(stats).toEqual({
        metricsUpdated: 0,
        outcomesClassified: 0,
        reportsGenerated: 0,
        totalProcessed: 0,
        totalErrors: 0,
        lastEventAt: null,
      });
    });

    it('should reset event statistics', () => {
      resetEventStats();

      const stats = getEventStats();

      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });
  });
});

describe('Event Handler Integration', () => {
  let mockEventBus: any;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();

    mockEventBus = {
      nc: { status: 'connected' },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockImplementation(async (subject, handler, options) => {
        eventHandlers.set(subject, handler);
      }),
      subscriptions: new Map(),
    };

    const { getEventBus } = require('@teei/shared-utils');
    vi.mocked(getEventBus).mockReturnValue(mockEventBus);
  });

  it('should call handleMetricsUpdated when metrics.updated event received', async () => {
    const { handleMetricsUpdated } = await import('../cache-invalidation.js');
    vi.mocked(handleMetricsUpdated).mockClear();

    await initializeSubscribers();

    const handler = eventHandlers.get('metrics.updated');
    expect(handler).toBeDefined();

    const mockEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'metrics.updated',
      version: 'v1',
      timestamp: new Date().toISOString(),
      data: {
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        metricType: 'sroi',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    };

    await handler!(mockEvent);

    expect(handleMetricsUpdated).toHaveBeenCalledWith({
      companyId: mockEvent.data.companyId,
      metricType: mockEvent.data.metricType,
      period: mockEvent.data.period,
      updatedAt: mockEvent.data.updatedAt,
    });
  });

  it('should call handleOutcomesClassified when outcomes.classified event received', async () => {
    const { handleOutcomesClassified } = await import('../cache-invalidation.js');
    vi.mocked(handleOutcomesClassified).mockClear();

    await initializeSubscribers();

    const handler = eventHandlers.get('outcomes.classified');
    expect(handler).toBeDefined();

    const mockEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'outcomes.classified',
      version: 'v1',
      timestamp: new Date().toISOString(),
      data: {
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        feedbackId: '123e4567-e89b-12d3-a456-426614174002',
        outcomeScores: {
          confidence: 0.85,
          belonging: 0.72,
        },
        classifiedAt: '2024-01-15T10:00:00Z',
      },
    };

    await handler!(mockEvent);

    expect(handleOutcomesClassified).toHaveBeenCalledWith({
      companyId: mockEvent.data.companyId,
      feedbackId: mockEvent.data.feedbackId,
      outcomeScores: mockEvent.data.outcomeScores,
      classifiedAt: mockEvent.data.classifiedAt,
    });
  });

  it('should handle errors in event handlers gracefully', async () => {
    const { handleMetricsUpdated } = await import('../cache-invalidation.js');
    vi.mocked(handleMetricsUpdated).mockRejectedValueOnce(new Error('Handler error'));

    await initializeSubscribers();

    const handler = eventHandlers.get('metrics.updated');

    const mockEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'metrics.updated',
      version: 'v1',
      timestamp: new Date().toISOString(),
      data: {
        companyId: '123e4567-e89b-12d3-a456-426614174001',
        metricType: 'sroi',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    };

    // Should not throw
    await expect(handler!(mockEvent)).resolves.not.toThrow();
  });
});
