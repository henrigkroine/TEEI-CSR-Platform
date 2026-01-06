/**
 * Unit tests for LineageResolver
 */

import { describe, it, expect } from 'vitest';
import { LineageResolver } from '../lineage-resolver.js';
import type { LineageResolutionInput, AnswerLineage } from '../lineage-resolver.js';

describe('LineageResolver', () => {
  describe('resolveLineage', () => {
    it('should resolve lineage for a simple SROI query', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-123',
        generatedSql: `
          SELECT
            company_id,
            period_start,
            period_end,
            sroi_ratio,
            participants_count
          FROM metrics_company_period
          WHERE company_id = 'company-456'
            AND period_start >= '2024-01-01'
            AND period_end <= '2024-12-31'
          ORDER BY period_start DESC
          LIMIT 100
        `,
        templateId: 'sroi_ratio',
        templateName: 'Social Return on Investment (SROI)',
        queryParams: {
          companyId: 'company-456',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        },
        resultData: [
          { sroi_ratio: 4.2, participants_count: 150 },
          { sroi_ratio: 3.8, participants_count: 142 },
        ],
        executionTimeMs: 234,
        safetyChecksPassed: true,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.queryId).toBe('query-123');
      expect(lineage.sources).toHaveLength(1);
      expect(lineage.sources[0].source).toBe('metrics_company_period');
      expect(lineage.sources[0].type).toBe('table');
      expect(lineage.rowCount).toBe(2);
      expect(lineage.executionTimeMs).toBe(234);
      expect(lineage.tenantIsolationEnforced).toBe(true);
      expect(lineage.piiColumnsAccessed).toHaveLength(0);
      expect(lineage.safetyChecksPassed).toBe(true);
      expect(lineage.templateId).toBe('sroi_ratio');
    });

    it('should detect PII columns if accessed', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-bad',
        generatedSql: `
          SELECT email, phone, first_name FROM users WHERE company_id = 'company-123'
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        },
        resultData: [],
        executionTimeMs: 100,
        safetyChecksPassed: false,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.piiColumnsAccessed).toContain('email');
      expect(lineage.piiColumnsAccessed).toContain('phone');
      expect(lineage.piiColumnsAccessed).toContain('first_name');
      expect(lineage.safetyChecksPassed).toBe(false);
    });

    it('should detect missing tenant isolation', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-insecure',
        generatedSql: `
          SELECT sroi_ratio FROM metrics_company_period LIMIT 100
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        },
        resultData: [],
        executionTimeMs: 100,
        safetyChecksPassed: false,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.tenantIsolationEnforced).toBe(false);
    });

    it('should extract aggregations correctly', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-agg',
        generatedSql: `
          SELECT
            AVG(score) as avg_score,
            COUNT(*) as sample_size,
            STDDEV(score) as std_dev
          FROM outcome_scores
          WHERE company_id = 'company-123'
          GROUP BY dimension
          LIMIT 10
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 10,
        },
        resultData: [],
        executionTimeMs: 150,
        safetyChecksPassed: true,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.aggregations).toContain('AVG(score)');
      expect(lineage.aggregations).toContain('COUNT(*)');
      expect(lineage.aggregations).toContain('STDDEV(score)');
      // Check that transformations contains GROUP BY (separate from aggregations)
      const hasGroupBy = lineage.transformations.some(t => t.includes('GROUP BY'));
      expect(hasGroupBy).toBe(true);
    });

    it('should identify evidence snippets for Q2Q data', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-q2q',
        generatedSql: `
          SELECT dimension, AVG(score) FROM outcome_scores
          WHERE company_id = 'company-123' AND text_type = 'feedback'
          GROUP BY dimension
          LIMIT 10
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 10,
        },
        resultData: [],
        executionTimeMs: 200,
        safetyChecksPassed: true,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      const evidenceSource = lineage.sources.find(s => s.type === 'evidence_snippet');
      expect(evidenceSource).toBeDefined();
      expect(evidenceSource?.source).toBe('outcome_scores');
      expect(evidenceSource?.metadata?.q2qDerived).toBe(true);
    });

    it('should extract JOIN operations', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-join',
        generatedSql: `
          SELECT o.dimension, u.company_id
          FROM outcome_scores o
          INNER JOIN users u ON u.id = o.user_id
          WHERE u.company_id = 'company-123'
          LIMIT 100
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        },
        resultData: [],
        executionTimeMs: 300,
        safetyChecksPassed: true,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.joins).toHaveLength(1);
      expect(lineage.joins[0]).toContain('INNER JOIN users');
      // Sources: outcome_scores table + users table + evidence_snippet (because outcome_scores triggers Q2Q detection)
      expect(lineage.sources.length).toBeGreaterThanOrEqual(2);
      const tableNames = lineage.sources.filter(s => s.type === 'table').map(s => s.source);
      expect(tableNames).toContain('outcome_scores');
      expect(tableNames).toContain('users');
    });

    it('should identify materialized views', async () => {
      const input: LineageResolutionInput = {
        queryId: 'query-mv',
        generatedSql: `
          SELECT * FROM metrics_company_period_mv
          WHERE company_id = 'company-123'
          LIMIT 100
        `,
        queryParams: {
          companyId: 'company-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 100,
        },
        resultData: [],
        executionTimeMs: 50,
        safetyChecksPassed: true,
      };

      const lineage = await LineageResolver.resolveLineage(input);

      expect(lineage.sources[0].type).toBe('materialized_view');
      expect(lineage.sources[0].source).toBe('metrics_company_period_mv');
    });
  });

  describe('linkToReport', () => {
    it('should link lineage to report', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const linked = LineageResolver.linkToReport(lineage, 'report-456');

      expect(linked.exportedToReports).toContain('report-456');

      const linkedAgain = LineageResolver.linkToReport(linked, 'report-789');
      expect(linkedAgain.exportedToReports).toContain('report-456');
      expect(linkedAgain.exportedToReports).toContain('report-789');
    });
  });

  describe('linkToMetric', () => {
    it('should link lineage to metric', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const linked = LineageResolver.linkToMetric(lineage, 'metric-lineage-456');

      expect(linked.linkedToMetrics).toContain('metric-lineage-456');
    });
  });

  describe('enrichWithEvidenceSnippets', () => {
    it('should enrich evidence snippet sources with IDs', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [
          {
            type: 'evidence_snippet',
            source: 'outcome_scores',
            metadata: { q2qDerived: true },
          },
          {
            type: 'table',
            source: 'metrics_company_period',
          },
        ],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const evidenceIds = ['evidence-1', 'evidence-2', 'evidence-3'];
      const enriched = LineageResolver.enrichWithEvidenceSnippets(lineage, evidenceIds);

      const evidenceSource = enriched.sources.find(s => s.type === 'evidence_snippet');
      expect(evidenceSource?.evidenceSnippetIds).toEqual(evidenceIds);
      expect(evidenceSource?.sampleSize).toBe(3);
    });
  });

  describe('summarizeLineage', () => {
    it('should generate concise summary', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [
          { type: 'table', source: 'metrics_company_period' },
          { type: 'table', source: 'users' },
        ],
        transformations: ['GROUP BY dimension'],
        aggregations: ['AVG(score)', 'COUNT(*)'],
        joins: ['INNER JOIN users ON ...'],
        filters: { companyId: 'company-123' },
        rowCount: 42,
        executionTimeMs: 234,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const summary = LineageResolver.summarizeLineage(lineage);

      expect(summary).toContain('query-123');
      expect(summary).toContain('metrics_company_period');
      expect(summary).toContain('users');
      expect(summary).toContain('Aggregations: 2');
      expect(summary).toContain('Joins: 1');
      expect(summary).toContain('Rows: 42');
      expect(summary).toContain('234ms');
    });

    it('should flag PII access in summary', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-bad',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'users' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: ['email', 'phone'],
        safetyChecksPassed: false,
      };

      const summary = LineageResolver.summarizeLineage(lineage);

      expect(summary).toContain('⚠️ PII ACCESSED: email, phone');
    });
  });

  describe('validateLineage', () => {
    it('should validate compliant lineage', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'metrics_company_period' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const validation = LineageResolver.validateLineage(lineage);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing tenant isolation', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'metrics_company_period' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: false,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const validation = LineageResolver.validateLineage(lineage);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Tenant isolation not enforced - critical security violation');
    });

    it('should detect PII access', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'users' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: ['email'],
        safetyChecksPassed: false,
      };

      const validation = LineageResolver.validateLineage(lineage);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('PII columns accessed: email');
    });

    it('should warn about slow queries', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'metrics_company_period' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 10,
        executionTimeMs: 6000, // 6 seconds
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const validation = LineageResolver.validateLineage(lineage);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Slow query execution: 6000ms');
    });

    it('should warn about large result sets', () => {
      const lineage: AnswerLineage = {
        queryId: 'query-123',
        executedAt: new Date(),
        sources: [{ type: 'table', source: 'metrics_company_period' }],
        transformations: [],
        aggregations: [],
        joins: [],
        filters: {},
        rowCount: 15000,
        executionTimeMs: 100,
        tenantIsolationEnforced: true,
        piiColumnsAccessed: [],
        safetyChecksPassed: true,
      };

      const validation = LineageResolver.validateLineage(lineage);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Large result set: 15000 rows');
    });
  });
});
