/**
 * Cache Invalidation Event Handlers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleMetricsUpdated,
  handleOutcomesClassified,
  handleReportsGenerated,
  manuallyInvalidateCompany,
  invalidateTemplateGlobally,
} from '../cache-invalidation.js';

// Mock dependencies
vi.mock('../nlq-events.js', () => ({
  publishCacheInvalidated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache/nlq-cache.js', () => ({
  getNLQCache: vi.fn(() => ({
    invalidateByCompany: vi.fn().mockResolvedValue(42),
    invalidateByTemplate: vi.fn().mockResolvedValue(15),
    invalidateAll: vi.fn().mockResolvedValue(100),
  })),
}));

vi.mock('../../cache/cache-warmer.js', () => ({
  getCacheWarmer: vi.fn(() => ({
    warmupTemplates: vi.fn().mockResolvedValue(undefined),
    warmup: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@teei/shared-utils', () => ({
  createServiceLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Cache Invalidation Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMetricsUpdated', () => {
    it('should invalidate cache and warm affected templates on metrics update', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metricType: 'sroi',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      await handleMetricsUpdated(event);

      const { getNLQCache } = await import('../../cache/nlq-cache.js');
      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const { publishCacheInvalidated } = await import('../nlq-events.js');

      const cache = getNLQCache();
      const warmer = getCacheWarmer();

      expect(cache.invalidateByCompany).toHaveBeenCalledWith(event.companyId);
      expect(publishCacheInvalidated).toHaveBeenCalledWith({
        companyId: event.companyId,
        keysInvalidated: 42,
        reason: 'metrics_updated',
      });
      expect(warmer.warmupTemplates).toHaveBeenCalledWith(
        expect.arrayContaining(['sroi_ratio', 'sroi_quarterly_comparison', 'cohort_sroi_benchmark']),
        event.companyId
      );
    });

    it('should handle VIS metric updates', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metricType: 'vis',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      await handleMetricsUpdated(event);

      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const warmer = getCacheWarmer();

      expect(warmer.warmupTemplates).toHaveBeenCalledWith(['vis_score'], event.companyId);
    });

    it('should handle unknown metric types gracefully', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metricType: 'unknown_metric',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      // Should not throw
      await expect(handleMetricsUpdated(event)).resolves.not.toThrow();
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const { getNLQCache } = await import('../../cache/nlq-cache.js');
      vi.mocked(getNLQCache).mockReturnValueOnce({
        invalidateByCompany: vi.fn().mockRejectedValueOnce(new Error('Redis error')),
      } as any);

      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metricType: 'sroi',
        period: '2024-Q1',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      // Should not throw
      await expect(handleMetricsUpdated(event)).resolves.not.toThrow();
    });
  });

  describe('handleOutcomesClassified', () => {
    it('should invalidate cache and warm outcome templates', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        feedbackId: '123e4567-e89b-12d3-a456-426614174001',
        outcomeScores: {
          confidence: 0.85,
          belonging: 0.72,
        },
        classifiedAt: '2024-01-15T10:00:00Z',
      };

      await handleOutcomesClassified(event);

      const { getNLQCache } = await import('../../cache/nlq-cache.js');
      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const { publishCacheInvalidated } = await import('../nlq-events.js');

      const cache = getNLQCache();
      const warmer = getCacheWarmer();

      expect(cache.invalidateByCompany).toHaveBeenCalledWith(event.companyId);
      expect(publishCacheInvalidated).toHaveBeenCalledWith({
        companyId: event.companyId,
        keysInvalidated: 42,
        reason: 'data_update',
      });
      expect(warmer.warmupTemplates).toHaveBeenCalledWith(
        expect.arrayContaining(['outcome_scores_by_dimension', 'outcome_trends_monthly']),
        event.companyId
      );
    });
  });

  describe('handleReportsGenerated', () => {
    it('should warm relevant queries for quarterly report', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        reportId: '123e4567-e89b-12d3-a456-426614174001',
        reportType: 'quarterly',
        generatedAt: '2024-01-15T10:00:00Z',
      };

      await handleReportsGenerated(event);

      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const warmer = getCacheWarmer();

      expect(warmer.warmupTemplates).toHaveBeenCalledWith(
        expect.arrayContaining(['sroi_ratio', 'vis_score', 'outcome_scores_by_dimension', 'participant_engagement']),
        event.companyId
      );
    });

    it('should warm investor-specific queries for investor report', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        reportId: '123e4567-e89b-12d3-a456-426614174001',
        reportType: 'investor',
        generatedAt: '2024-01-15T10:00:00Z',
      };

      await handleReportsGenerated(event);

      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const warmer = getCacheWarmer();

      expect(warmer.warmupTemplates).toHaveBeenCalledWith(
        expect.arrayContaining(['sroi_ratio', 'sroi_quarterly_comparison', 'cohort_sroi_benchmark']),
        event.companyId
      );
    });

    it('should not warm queries for unknown report types', async () => {
      const event = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        reportId: '123e4567-e89b-12d3-a456-426614174001',
        reportType: 'unknown',
        generatedAt: '2024-01-15T10:00:00Z',
      };

      await handleReportsGenerated(event);

      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const warmer = getCacheWarmer();

      // Should still be called but with empty array
      expect(warmer.warmupTemplates).toHaveBeenCalledWith([], event.companyId);
    });
  });

  describe('manuallyInvalidateCompany', () => {
    it('should invalidate all cache for company and warm queries', async () => {
      const companyId = '123e4567-e89b-12d3-a456-426614174000';

      const keysInvalidated = await manuallyInvalidateCompany(companyId);

      expect(keysInvalidated).toBe(42);

      const { getNLQCache } = await import('../../cache/nlq-cache.js');
      const { getCacheWarmer } = await import('../../cache/cache-warmer.js');
      const { publishCacheInvalidated } = await import('../nlq-events.js');

      const cache = getNLQCache();
      const warmer = getCacheWarmer();

      expect(cache.invalidateByCompany).toHaveBeenCalledWith(companyId);
      expect(publishCacheInvalidated).toHaveBeenCalledWith({
        companyId,
        keysInvalidated: 42,
        reason: 'manual',
      });
      expect(warmer.warmup).toHaveBeenCalledWith([companyId]);
    });
  });

  describe('invalidateTemplateGlobally', () => {
    it('should invalidate template across all companies', async () => {
      const templateId = 'sroi_ratio';

      const keysInvalidated = await invalidateTemplateGlobally(templateId);

      expect(keysInvalidated).toBe(15);

      const { getNLQCache } = await import('../../cache/nlq-cache.js');
      const { publishCacheInvalidated } = await import('../nlq-events.js');

      const cache = getNLQCache();

      expect(cache.invalidateByTemplate).toHaveBeenCalledWith(templateId);
      expect(publishCacheInvalidated).toHaveBeenCalledWith({
        templateId,
        keysInvalidated: 15,
        reason: 'manual',
      });
    });
  });
});
