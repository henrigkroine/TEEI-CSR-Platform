/**
 * Query Generator Test Suite
 *
 * Tests for the complete NLQ query generation pipeline:
 * - Template rendering
 * - Parameter validation
 * - Safety checks
 * - Query preview generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateQuery, validateQuery, estimateQueryCost } from './query-generator.js';
import { IntentClassification } from '../types/intent.js';

describe('Query Generator', () => {
  const mockCompanyId = '12345678-1234-1234-1234-123456789012';

  describe('generateQuery()', () => {
    it('should generate valid SQL for SROI query', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.95,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'last_30d',
        },
        originalQuery: 'What is our SROI for last month?',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.sql).toBeTruthy();
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM metrics_company_period');
      expect(result.sql).toContain(`company_id = '${mockCompanyId}'`);
      expect(result.sql).toContain('LIMIT');
      expect(result.templateId).toBe('sroi_ratio');
      expect(result.estimatedComplexity).toBe('low');
    });

    it('should generate CHQL when template has CHQL variant', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.95,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'last_quarter',
        },
        originalQuery: 'Show SROI for last quarter',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.chql).toBeTruthy();
      expect(result.chql).toContain('FROM analytics.metrics_company_period_mv');
    });

    it('should enforce tenant isolation with companyId filter', async () => {
      const intent: IntentClassification = {
        intent: 'get_vis',
        confidence: 0.92,
        templateId: 'vis_score',
        slots: [],
        timeRange: {
          type: 'last_90d',
        },
        originalQuery: 'What is our VIS score?',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.sql).toContain(`company_id = '${mockCompanyId}'`);
      expect(result.safetyValidation.passed).toBe(true);
    });

    it('should respect custom date ranges', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.90,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'custom',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
        },
        originalQuery: 'SROI from January to March 2025',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.sql).toContain("'2025-01-01'");
      expect(result.sql).toContain("'2025-03-31'");
      expect(result.parameters.startDate).toBe('2025-01-01');
      expect(result.parameters.endDate).toBe('2025-03-31');
    });

    it('should apply result limit from intent or default', async () => {
      const intent: IntentClassification = {
        intent: 'get_engagement',
        confidence: 0.88,
        templateId: 'participant_engagement',
        slots: [],
        limit: 50,
        timeRange: {
          type: 'last_30d',
        },
        originalQuery: 'Show top 50 engagement metrics',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.sql).toContain('LIMIT 50');
      expect(result.parameters.limit).toBe(50);
    });

    it('should throw error for unknown template ID', async () => {
      const intent: IntentClassification = {
        intent: 'unknown',
        confidence: 0.5,
        templateId: 'invalid_template_id',
        slots: [],
        originalQuery: 'Invalid query',
        classifiedAt: new Date().toISOString(),
      };

      await expect(
        generateQuery(intent, { companyId: mockCompanyId })
      ).rejects.toThrow('Unknown template ID');
    });

    it('should throw error when time window exceeds template limit', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.90,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'custom',
          startDate: '2020-01-01',
          endDate: '2025-12-31',
        },
        originalQuery: 'SROI over 5 years',
        classifiedAt: new Date().toISOString(),
      };

      await expect(
        generateQuery(intent, { companyId: mockCompanyId })
      ).rejects.toThrow('Time window exceeds template limit');
    });

    it('should throw error when result limit exceeds template max', async () => {
      const intent: IntentClassification = {
        intent: 'get_outcome_scores',
        confidence: 0.85,
        templateId: 'outcome_scores_by_dimension',
        slots: [],
        limit: 1000, // Template max is 10
        timeRange: {
          type: 'last_30d',
        },
        originalQuery: 'Get 1000 outcome scores',
        classifiedAt: new Date().toISOString(),
      };

      await expect(
        generateQuery(intent, { companyId: mockCompanyId })
      ).rejects.toThrow('Result limit exceeds template limit');
    });

    it('should generate query preview with human-readable description', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.95,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'last_quarter',
        },
        originalQuery: 'SROI for last quarter',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.preview).toBeTruthy();
      expect(result.preview).toContain('SROI');
      expect(result.detailedPreview.description).toBeTruthy();
      expect(result.detailedPreview.timeRange).toBeTruthy();
      expect(result.detailedPreview.filters.length).toBeGreaterThan(0);
    });

    it('should validate filters against template allowed filters', async () => {
      const intent: IntentClassification = {
        intent: 'get_benchmark',
        confidence: 0.90,
        templateId: 'cohort_sroi_benchmark',
        slots: [
          { name: 'cohortType', value: 'invalid_cohort', confidence: 0.8 },
        ],
        filters: {
          cohortType: 'invalid_cohort',
        },
        timeRange: {
          type: 'last_quarter',
        },
        originalQuery: 'Compare to invalid cohort',
        classifiedAt: new Date().toISOString(),
      };

      await expect(
        generateQuery(intent, { companyId: mockCompanyId })
      ).rejects.toThrow();
    });
  });

  describe('validateQuery()', () => {
    it('should validate query without executing', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.95,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'last_30d',
        },
        originalQuery: 'SROI last month',
        classifiedAt: new Date().toISOString(),
      };

      const result = await validateQuery(intent, { companyId: mockCompanyId });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid query', async () => {
      const intent: IntentClassification = {
        intent: 'invalid',
        confidence: 0.5,
        templateId: 'non_existent_template',
        slots: [],
        originalQuery: 'Invalid',
        classifiedAt: new Date().toISOString(),
      };

      const result = await validateQuery(intent, { companyId: mockCompanyId });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('estimateQueryCost()', () => {
    it('should estimate query cost for simple queries', () => {
      const template = {
        id: 'sroi_ratio',
        estimatedComplexity: 'low' as const,
        maxResultRows: 100,
      } as any;

      const parameters = {
        companyId: mockCompanyId,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 100,
      };

      const cost = estimateQueryCost(template, parameters);

      expect(cost.estimatedRows).toBeGreaterThan(0);
      expect(cost.estimatedBytes).toBeGreaterThan(0);
      expect(cost.estimatedTimeMs).toBeGreaterThan(0);
    });

    it('should scale cost estimate with complexity', () => {
      const lowTemplate = {
        id: 'test1',
        estimatedComplexity: 'low' as const,
      } as any;

      const highTemplate = {
        id: 'test2',
        estimatedComplexity: 'high' as const,
      } as any;

      const parameters = {
        companyId: mockCompanyId,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        limit: 10000, // Higher limit to show complexity difference
      };

      const lowCost = estimateQueryCost(lowTemplate, parameters);
      const highCost = estimateQueryCost(highTemplate, parameters);

      expect(highCost.estimatedTimeMs).toBeGreaterThan(lowCost.estimatedTimeMs);
      expect(highCost.estimatedRows).toBeGreaterThan(lowCost.estimatedRows);
    });
  });

  describe('Safety Integration', () => {
    it('should pass all 12 safety checks for valid query', async () => {
      const intent: IntentClassification = {
        intent: 'get_sroi',
        confidence: 0.95,
        templateId: 'sroi_ratio',
        slots: [],
        timeRange: {
          type: 'last_30d',
        },
        originalQuery: 'SROI last 30 days',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, {
        companyId: mockCompanyId,
        validateSafety: true,
      });

      expect(result.safetyValidation.passed).toBe(true);
      expect(result.safetyValidation.violations).toHaveLength(0);
    });

    it('should include safety validation results in response', async () => {
      const intent: IntentClassification = {
        intent: 'get_vis',
        confidence: 0.90,
        templateId: 'vis_score',
        slots: [],
        timeRange: {
          type: 'last_90d',
        },
        originalQuery: 'VIS score trend',
        classifiedAt: new Date().toISOString(),
      };

      const result = await generateQuery(intent, { companyId: mockCompanyId });

      expect(result.safetyValidation).toBeDefined();
      expect(result.safetyValidation.passed).toBe(true);
    });
  });
});
