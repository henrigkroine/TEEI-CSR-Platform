/**
 * Query Preview Test Suite
 *
 * Tests for human-readable query explanations:
 * - Time range formatting
 * - Filter descriptions
 * - Complexity indicators
 * - Simple vs detailed previews
 */

import { describe, it, expect } from 'vitest';
import {
  generateQueryPreview,
  generateSimplePreview,
  estimateExecutionTime,
} from './query-preview.js';
import { MetricTemplate } from '../templates/metric-catalog.js';
import { QueryParameters } from '../types/intent.js';

describe('Query Preview', () => {
  const mockTemplate: MetricTemplate = {
    id: 'test_metric',
    displayName: 'Test Metric',
    description: 'Test metric description',
    category: 'impact',
    sqlTemplate: 'SELECT * FROM metrics_company_period WHERE company_id = {{companyId}}',
    allowedTimeRanges: ['last_30d', 'last_90d', 'custom'],
    maxTimeWindowDays: 365,
    requiresTenantFilter: true,
    allowedJoins: [],
    deniedColumns: [],
    estimatedComplexity: 'low',
    maxResultRows: 100,
    cacheTtlSeconds: 3600,
    exampleQuestions: ['Test question?'],
    tags: ['test'],
  };

  const mockParameters: QueryParameters = {
    companyId: '12345678-1234-1234-1234-123456789012',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    limit: 100,
  };

  describe('generateQueryPreview()', () => {
    it('should generate complete query preview', () => {
      const preview = generateQueryPreview(mockTemplate, mockParameters);

      expect(preview.description).toBeTruthy();
      expect(preview.dataSource).toBeTruthy();
      expect(preview.timeRange).toBeTruthy();
      expect(preview.filters).toBeInstanceOf(Array);
      expect(preview.resultLimit).toBe(100);
      expect(preview.estimatedComplexity).toBe('low');
      expect(preview.cacheTtl).toBe(3600);
      expect(preview.explanation).toBeTruthy();
    });

    it('should include company filter in preview', () => {
      const preview = generateQueryPreview(mockTemplate, mockParameters);

      expect(preview.filters.some(f => f.includes('Company'))).toBe(true);
    });

    it('should format time range as human-readable', () => {
      const preview = generateQueryPreview(mockTemplate, mockParameters);

      expect(preview.timeRange).toBeTruthy();
      // For Jan 1-31 2025, should detect it as "Last 30 days" or show as date range
      expect(preview.timeRange).toMatch(/Last 30 days|2025/); // Either preset or contains year
    });

    it('should include custom filters in preview', () => {
      const paramsWithFilters: QueryParameters = {
        ...mockParameters,
        filters: {
          region: 'North America',
          industry: 'Technology',
        },
      };

      const preview = generateQueryPreview(mockTemplate, paramsWithFilters);

      expect(preview.filters.some(f => f.includes('Region'))).toBe(true);
      expect(preview.filters.some(f => f.includes('Industry'))).toBe(true);
    });

    it('should include group by in preview', () => {
      const paramsWithGroupBy: QueryParameters = {
        ...mockParameters,
        groupBy: ['program', 'location'],
      };

      const preview = generateQueryPreview(mockTemplate, paramsWithGroupBy);

      expect(preview.filters.some(f => f.includes('Grouped by'))).toBe(true);
      expect(preview.filters.some(f => f.includes('Program'))).toBe(true);
      expect(preview.filters.some(f => f.includes('Location'))).toBe(true);
    });

    it('should generate detailed explanation', () => {
      const preview = generateQueryPreview(mockTemplate, mockParameters);

      expect(preview.explanation).toContain('Test Metric');
      expect(preview.explanation).toContain('tenant isolation');
      expect(preview.explanation).toContain('cached');
    });

    it('should extract data source from template', () => {
      const preview = generateQueryPreview(mockTemplate, mockParameters);

      expect(preview.dataSource).toBeTruthy();
      expect(preview.dataSource).toContain('Company Metrics');
    });
  });

  describe('Time Range Formatting', () => {
    it('should format last 7 days', () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const params: QueryParameters = {
        ...mockParameters,
        startDate: sevenDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };

      const preview = generateQueryPreview(mockTemplate, params);

      expect(preview.timeRange).toBe('Last 7 days');
    });

    it('should format last 30 days', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const params: QueryParameters = {
        ...mockParameters,
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };

      const preview = generateQueryPreview(mockTemplate, params);

      expect(preview.timeRange).toBe('Last 30 days');
    });

    it('should format year-to-date', () => {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const params: QueryParameters = {
        ...mockParameters,
        startDate: yearStart.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };

      const preview = generateQueryPreview(mockTemplate, params);

      expect(preview.timeRange).toContain('Year to date');
      expect(preview.timeRange).toContain(String(now.getFullYear()));
    });

    it('should format custom date range', () => {
      const params: QueryParameters = {
        ...mockParameters,
        startDate: '2025-03-15',
        endDate: '2025-06-20',
      };

      const preview = generateQueryPreview(mockTemplate, params);

      expect(preview.timeRange).toContain('2025');
      // Should show as date range, not preset
      expect(preview.timeRange.toLowerCase()).not.toBe('last 30 days');
    });
  });

  describe('generateSimplePreview()', () => {
    it('should generate concise one-line preview', () => {
      const preview = generateSimplePreview(mockTemplate, mockParameters);

      expect(preview).toBeTruthy();
      expect(preview).toContain('Test Metric');
      expect(preview).toContain('100');
    });

    it('should include bullet separators', () => {
      const preview = generateSimplePreview(mockTemplate, mockParameters);

      expect(preview).toContain('•');
    });

    it('should be shorter than detailed preview', () => {
      const simple = generateSimplePreview(mockTemplate, mockParameters);
      const detailed = generateQueryPreview(mockTemplate, mockParameters);

      expect(simple.length).toBeLessThan(detailed.explanation.length);
    });
  });

  describe('estimateExecutionTime()', () => {
    it('should estimate low complexity execution time', () => {
      const estimate = estimateExecutionTime('low');

      expect(estimate).toBeTruthy();
      expect(estimate).toContain('ms');
    });

    it('should estimate medium complexity execution time', () => {
      const estimate = estimateExecutionTime('medium');

      expect(estimate).toBeTruthy();
      expect(estimate).toContain('ms');
    });

    it('should estimate high complexity execution time', () => {
      const estimate = estimateExecutionTime('high');

      expect(estimate).toBeTruthy();
      expect(estimate).toMatch(/ms|s/); // milliseconds or seconds
    });

    it('should scale estimates with complexity', () => {
      const low = estimateExecutionTime('low');
      const medium = estimateExecutionTime('medium');
      const high = estimateExecutionTime('high');

      // All should be different
      expect(low).not.toBe(medium);
      expect(medium).not.toBe(high);
    });
  });

  describe('Filter Name Formatting', () => {
    it('should format snake_case as Title Case', () => {
      const paramsWithFilters: QueryParameters = {
        ...mockParameters,
        filters: {
          outcome_dimension: 'confidence',
          company_size: 'large',
        },
      };

      const preview = generateQueryPreview(mockTemplate, paramsWithFilters);

      expect(preview.filters.some(f => f.includes('Outcome Dimension'))).toBe(true);
      expect(preview.filters.some(f => f.includes('Company Size'))).toBe(true);
    });
  });

  describe('Duration Formatting', () => {
    it('should format seconds correctly', () => {
      const template: MetricTemplate = {
        ...mockTemplate,
        cacheTtlSeconds: 45,
      };

      const preview = generateQueryPreview(template, mockParameters);

      expect(preview.explanation).toContain('45 seconds');
    });

    it('should format minutes correctly', () => {
      const template: MetricTemplate = {
        ...mockTemplate,
        cacheTtlSeconds: 1800, // 30 minutes
      };

      const preview = generateQueryPreview(template, mockParameters);

      expect(preview.explanation).toContain('30 minutes');
    });

    it('should format hours correctly', () => {
      const template: MetricTemplate = {
        ...mockTemplate,
        cacheTtlSeconds: 7200, // 2 hours
      };

      const preview = generateQueryPreview(template, mockParameters);

      expect(preview.explanation).toContain('2 hours');
    });
  });

  describe('Complexity Indicators', () => {
    it('should indicate low complexity queries', () => {
      const template: MetricTemplate = {
        ...mockTemplate,
        estimatedComplexity: 'low',
      };

      const preview = generateQueryPreview(template, mockParameters);

      expect(preview.estimatedComplexity).toBe('low');
      expect(preview.explanation).toContain('low');
    });

    it('should indicate high complexity queries', () => {
      const template: MetricTemplate = {
        ...mockTemplate,
        estimatedComplexity: 'high',
      };

      const preview = generateQueryPreview(template, mockParameters);

      expect(preview.estimatedComplexity).toBe('high');
      expect(preview.explanation).toContain('high');
    });
  });
});
