/**
 * Unit tests for k-anonymity enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enforceKAnonymity,
  enforceKAnonymityOnMetrics,
  checkCohortSize,
  checkCohortMetricsSize,
} from '../k-anonymity.js';

describe('k-anonymity enforcement', () => {
  describe('enforceKAnonymity', () => {
    it('should return data when cohort size meets threshold', () => {
      const data = [1, 2, 3, 4, 5];
      const result = enforceKAnonymity(data, 5);

      expect(result.data).toEqual(data);
      expect(result.suppressed).toBe(false);
      expect(result.cohortSize).toBe(5);
      expect(result.threshold).toBe(5);
    });

    it('should suppress data when cohort size below threshold', () => {
      const data = [1, 2, 3];
      const result = enforceKAnonymity(data, 5);

      expect(result.data).toEqual([]);
      expect(result.suppressed).toBe(true);
      expect(result.cohortSize).toBe(3);
      expect(result.threshold).toBe(5);
    });

    it('should use default k=5 when not specified', () => {
      const data = [1, 2, 3, 4, 5, 6];
      const result = enforceKAnonymity(data);

      expect(result.data).toEqual(data);
      expect(result.suppressed).toBe(false);
      expect(result.threshold).toBe(5);
    });

    it('should handle empty data array', () => {
      const data: number[] = [];
      const result = enforceKAnonymity(data, 5);

      expect(result.data).toEqual([]);
      expect(result.suppressed).toBe(true);
      expect(result.cohortSize).toBe(0);
    });

    it('should work with custom k values', () => {
      const data = [1, 2, 3];
      const result = enforceKAnonymity(data, 3);

      expect(result.data).toEqual(data);
      expect(result.suppressed).toBe(false);
      expect(result.threshold).toBe(3);
    });

    it('should handle objects in data array', () => {
      const data = [
        { id: 1, value: 100 },
        { id: 2, value: 200 },
        { id: 3, value: 300 },
        { id: 4, value: 400 },
        { id: 5, value: 500 },
      ];
      const result = enforceKAnonymity(data, 5);

      expect(result.data).toEqual(data);
      expect(result.suppressed).toBe(false);
    });
  });

  describe('enforceKAnonymityOnMetrics', () => {
    it('should filter metrics with company_count below threshold', () => {
      const metrics = [
        { cohort: 'A', company_count: 10, avg_score: 80 },
        { cohort: 'B', company_count: 3, avg_score: 85 }, // Below k=5
        { cohort: 'C', company_count: 7, avg_score: 90 },
      ];

      const result = enforceKAnonymityOnMetrics(metrics, 5);

      expect(result.data).toHaveLength(2);
      expect(result.data.map(m => m.cohort)).toEqual(['A', 'C']);
      expect(result.suppressed).toBe(true);
      expect(result.cohortSize).toBe(2);
    });

    it('should not suppress when all metrics meet threshold', () => {
      const metrics = [
        { cohort: 'A', company_count: 10, avg_score: 80 },
        { cohort: 'B', company_count: 8, avg_score: 85 },
        { cohort: 'C', company_count: 15, avg_score: 90 },
      ];

      const result = enforceKAnonymityOnMetrics(metrics, 5);

      expect(result.data).toHaveLength(3);
      expect(result.suppressed).toBe(false);
    });

    it('should handle empty metrics array', () => {
      const metrics: Array<{ company_count: number }> = [];
      const result = enforceKAnonymityOnMetrics(metrics, 5);

      expect(result.data).toEqual([]);
      expect(result.suppressed).toBe(false); // No suppression needed
      expect(result.cohortSize).toBe(0);
    });

    it('should suppress all metrics if all below threshold', () => {
      const metrics = [
        { cohort: 'A', company_count: 2, avg_score: 80 },
        { cohort: 'B', company_count: 3, avg_score: 85 },
        { cohort: 'C', company_count: 4, avg_score: 90 },
      ];

      const result = enforceKAnonymityOnMetrics(metrics, 5);

      expect(result.data).toEqual([]);
      expect(result.suppressed).toBe(true);
    });

    it('should work with custom k values', () => {
      const metrics = [
        { cohort: 'A', company_count: 10, avg_score: 80 },
        { cohort: 'B', company_count: 8, avg_score: 85 },
      ];

      const result = enforceKAnonymityOnMetrics(metrics, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].cohort).toBe('A');
      expect(result.suppressed).toBe(true);
    });
  });

  describe('checkCohortSize', () => {
    it('should validate cohort meets k-anonymity threshold', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ size: '10' }]),
        }),
      };

      const result = await checkCohortSize(mockClient, 'cohort-123', 5);

      expect(result.valid).toBe(true);
      expect(result.size).toBe(10);
      expect(result.threshold).toBe(5);
      expect(result.suppressed).toBe(false);

      expect(mockClient.query).toHaveBeenCalledWith({
        query: expect.stringContaining('SELECT count(*) AS size'),
        query_params: { cohortId: 'cohort-123' },
        format: 'JSONEachRow',
      });
    });

    it('should detect cohort below k-anonymity threshold', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ size: '3' }]),
        }),
      };

      const result = await checkCohortSize(mockClient, 'cohort-456', 5);

      expect(result.valid).toBe(false);
      expect(result.size).toBe(3);
      expect(result.threshold).toBe(5);
      expect(result.suppressed).toBe(true);
    });

    it('should handle empty cohort', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ size: '0' }]),
        }),
      };

      const result = await checkCohortSize(mockClient, 'cohort-789', 5);

      expect(result.valid).toBe(false);
      expect(result.size).toBe(0);
      expect(result.suppressed).toBe(true);
    });

    it('should handle missing result', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await checkCohortSize(mockClient, 'cohort-empty', 5);

      expect(result.valid).toBe(false);
      expect(result.size).toBe(0);
      expect(result.suppressed).toBe(true);
    });

    it('should use default k=5 when not specified', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ size: '6' }]),
        }),
      };

      const result = await checkCohortSize(mockClient, 'cohort-default');

      expect(result.threshold).toBe(5);
      expect(result.valid).toBe(true);
    });
  });

  describe('checkCohortMetricsSize', () => {
    it('should validate cohort metrics meet k-anonymity threshold', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ distinct_companies: '12' }]),
        }),
      };

      const result = await checkCohortMetricsSize(
        mockClient,
        'cohort-abc',
        '2025-01-01',
        '2025-11-15',
        5
      );

      expect(result.valid).toBe(true);
      expect(result.size).toBe(12);
      expect(result.threshold).toBe(5);
      expect(result.suppressed).toBe(false);

      expect(mockClient.query).toHaveBeenCalledWith({
        query: expect.stringContaining('uniq(company_id) AS distinct_companies'),
        query_params: {
          cohortId: 'cohort-abc',
          startDate: '2025-01-01 00:00:00',
          endDate: '2025-11-15 00:00:00',
        },
        format: 'JSONEachRow',
      });
    });

    it('should detect insufficient distinct companies in date range', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ distinct_companies: '2' }]),
        }),
      };

      const result = await checkCohortMetricsSize(
        mockClient,
        'cohort-xyz',
        '2025-01-01',
        '2025-01-31',
        5
      );

      expect(result.valid).toBe(false);
      expect(result.size).toBe(2);
      expect(result.suppressed).toBe(true);
    });

    it('should handle missing result', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await checkCohortMetricsSize(
        mockClient,
        'cohort-missing',
        '2025-01-01',
        '2025-11-15',
        5
      );

      expect(result.valid).toBe(false);
      expect(result.size).toBe(0);
    });

    it('should format dates correctly for ClickHouse', async () => {
      const mockClient: any = {
        query: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue([{ distinct_companies: '10' }]),
        }),
      };

      await checkCohortMetricsSize(
        mockClient,
        'cohort-dates',
        '2025-11-15T10:30:00Z',
        '2025-11-15T23:59:59Z',
        5
      );

      expect(mockClient.query).toHaveBeenCalledWith({
        query: expect.any(String),
        query_params: {
          cohortId: 'cohort-dates',
          startDate: expect.stringMatching(/2025-11-15 \d{2}:\d{2}:\d{2}/),
          endDate: expect.stringMatching(/2025-11-15 \d{2}:\d{2}:\d{2}/),
        },
        format: 'JSONEachRow',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle exactly k members (boundary condition)', () => {
      const data = [1, 2, 3, 4, 5];
      const result = enforceKAnonymity(data, 5);

      expect(result.suppressed).toBe(false);
      expect(result.data).toEqual(data);
    });

    it('should handle k=1 (no anonymity)', () => {
      const data = [1];
      const result = enforceKAnonymity(data, 1);

      expect(result.suppressed).toBe(false);
      expect(result.data).toEqual(data);
    });

    it('should handle large k values', () => {
      const data = Array.from({ length: 50 }, (_, i) => i);
      const result = enforceKAnonymity(data, 100);

      expect(result.suppressed).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should preserve data types in enforceKAnonymity', () => {
      const data = [
        { id: 'a', value: 1.5 },
        { id: 'b', value: 2.7 },
        { id: 'c', value: 3.2 },
        { id: 'd', value: 4.9 },
        { id: 'e', value: 5.1 },
      ];
      const result = enforceKAnonymity(data, 5);

      expect(result.data[0].value).toBe(1.5);
      expect(typeof result.data[0].id).toBe('string');
    });
  });
});
