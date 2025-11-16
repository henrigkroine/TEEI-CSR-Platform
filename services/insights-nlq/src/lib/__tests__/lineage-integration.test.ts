/**
 * Integration tests for Lineage Resolver + Visualizer
 * Demonstrates end-to-end lineage tracking workflow
 */

import { describe, it, expect } from 'vitest';
import { LineageResolver } from '../lineage-resolver.js';
import { LineageVisualizer } from '../lineage-visualizer.js';
import type { LineageResolutionInput } from '../lineage-resolver.js';
import type { IntentClassification } from '../../types/intent.js';

describe('Lineage Integration', () => {
  it('should track complete lineage for SROI query with visualization', async () => {
    // 1. User asks a question
    const userQuestion = 'What is our SROI for Q1 2024?';

    // 2. Intent classifier extracts intent and parameters
    const intentClassification: IntentClassification = {
      intent: 'get_metric',
      confidence: 0.95,
      templateId: 'sroi_ratio',
      slots: [
        { name: 'metric', value: 'sroi', confidence: 0.98 },
        { name: 'timeRange', value: 'Q1 2024', confidence: 0.92, rawValue: 'Q1 2024' },
      ],
      timeRange: {
        type: 'custom',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      },
      originalQuery: userQuestion,
      classifiedAt: new Date().toISOString(),
    };

    // 3. SQL query is generated from template
    const generatedSql = `
      SELECT
        company_id,
        period_start,
        period_end,
        sroi_ratio,
        participants_count,
        volunteers_count
      FROM metrics_company_period
      WHERE company_id = 'company-123'
        AND period_start >= '2024-01-01'
        AND period_end <= '2024-03-31'
      ORDER BY period_start DESC
      LIMIT 100
    `;

    // 4. Query is executed (mock results)
    const queryResults = [
      {
        company_id: 'company-123',
        period_start: '2024-03-01',
        period_end: '2024-03-31',
        sroi_ratio: 4.2,
        participants_count: 150,
        volunteers_count: 45,
      },
      {
        company_id: 'company-123',
        period_start: '2024-02-01',
        period_end: '2024-02-29',
        sroi_ratio: 3.8,
        participants_count: 142,
        volunteers_count: 38,
      },
      {
        company_id: 'company-123',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        sroi_ratio: 4.1,
        participants_count: 138,
        volunteers_count: 42,
      },
    ];

    // 5. Resolve lineage for the query
    const lineageInput: LineageResolutionInput = {
      queryId: 'query-sroi-q1-2024',
      generatedSql,
      templateId: 'sroi_ratio',
      templateName: 'Social Return on Investment (SROI)',
      queryParams: {
        companyId: 'company-123',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        limit: 100,
      },
      resultData: queryResults,
      executionTimeMs: 234,
      safetyChecksPassed: true,
    };

    const answerLineage = await LineageResolver.resolveLineage(lineageInput);

    // 6. Validate lineage compliance
    const validation = LineageResolver.validateLineage(answerLineage);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // 7. Generate visualizations
    const lineageGraph = LineageVisualizer.generateGraph({
      answerLineage,
      originalQuestion: userQuestion,
      intentClassification,
      resultPreview: queryResults.slice(0, 2),
    });

    // Verify graph structure
    expect(lineageGraph.nodes).toHaveLength(6); // question, intent, template, source, transform (ORDER BY), answer
    expect(lineageGraph.edges.length).toBeGreaterThan(0);
    expect(lineageGraph.metadata.queryId).toBe('query-sroi-q1-2024');

    // 8. Export to different formats
    const mermaidDiagram = LineageVisualizer.toMermaidDiagram(lineageGraph);
    expect(mermaidDiagram).toContain('graph TD');
    expect(mermaidDiagram).toContain('What is our SROI for Q1 2024?');

    const d3Format = LineageVisualizer.toD3Format(lineageGraph);
    expect(d3Format.nodes.length).toBe(lineageGraph.nodes.length);
    expect(d3Format.links.length).toBe(lineageGraph.edges.length);

    const cytoscapeFormat = LineageVisualizer.toCytoscapeFormat(lineageGraph);
    expect(cytoscapeFormat.elements.length).toBe(lineageGraph.nodes.length + lineageGraph.edges.length);

    const textSummary = LineageVisualizer.generateTextSummary(lineageGraph);
    expect(textSummary).toContain('LINEAGE SUMMARY');
    expect(textSummary).toContain('metrics_company_period');
    expect(textSummary).toContain('Rows: 3');

    // 9. Link to report export (if answer is exported)
    const linkedLineage = LineageResolver.linkToReport(answerLineage, 'report-annual-2024');
    expect(linkedLineage.exportedToReports).toContain('report-annual-2024');
  });

  it('should track lineage for Q2Q outcome scores query with evidence snippets', async () => {
    // 1. User asks about outcome scores
    const userQuestion = 'What are our outcome scores by dimension for the last month?';

    // 2. Generated query uses Q2Q-derived data
    const generatedSql = `
      SELECT
        dimension,
        AVG(score) as avg_score,
        COUNT(*) as sample_size,
        STDDEV(score) as std_dev
      FROM outcome_scores
      WHERE text_type = 'feedback'
        AND created_at >= '2024-12-01'
        AND created_at <= '2024-12-31'
        AND EXISTS (
          SELECT 1 FROM users WHERE users.id = outcome_scores.user_id AND users.company_id = 'company-123'
        )
      GROUP BY dimension
      ORDER BY avg_score DESC
      LIMIT 10
    `;

    // 3. Query results
    const queryResults = [
      { dimension: 'confidence', avg_score: 7.8, sample_size: 45, std_dev: 1.2 },
      { dimension: 'belonging', avg_score: 7.5, sample_size: 45, std_dev: 1.4 },
      { dimension: 'autonomy', avg_score: 7.2, sample_size: 45, std_dev: 1.3 },
    ];

    // 4. Resolve lineage
    const lineageInput: LineageResolutionInput = {
      queryId: 'query-outcomes-dec-2024',
      generatedSql,
      templateId: 'outcome_scores_by_dimension',
      templateName: 'Outcome Scores by Dimension',
      queryParams: {
        companyId: 'company-123',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        limit: 10,
      },
      resultData: queryResults,
      executionTimeMs: 456,
      safetyChecksPassed: true,
    };

    let answerLineage = await LineageResolver.resolveLineage(lineageInput);

    // 5. Verify Q2Q evidence snippet lineage was detected
    const evidenceSource = answerLineage.sources.find(s => s.type === 'evidence_snippet');
    expect(evidenceSource).toBeDefined();
    expect(evidenceSource?.source).toBe('outcome_scores');
    expect(evidenceSource?.metadata?.q2qDerived).toBe(true);

    // 6. Enrich with actual evidence snippet IDs (would come from database)
    const evidenceSnippetIds = [
      'evidence-snippet-1',
      'evidence-snippet-2',
      'evidence-snippet-3',
    ];
    answerLineage = LineageResolver.enrichWithEvidenceSnippets(answerLineage, evidenceSnippetIds);

    const enrichedEvidence = answerLineage.sources.find(s => s.type === 'evidence_snippet');
    expect(enrichedEvidence?.evidenceSnippetIds).toEqual(evidenceSnippetIds);
    expect(enrichedEvidence?.sampleSize).toBe(3);

    // 7. Generate visualization with evidence nodes
    const lineageGraph = LineageVisualizer.generateGraph({
      answerLineage,
      originalQuestion: userQuestion,
      resultPreview: queryResults,
    });

    const evidenceNodes = lineageGraph.nodes.filter(n => n.type === 'evidence');
    expect(evidenceNodes.length).toBeGreaterThan(0);
    expect(evidenceNodes[0].metadata.evidenceSnippetIds).toHaveLength(3);

    // 8. Generate text summary showing evidence trail
    const textSummary = LineageVisualizer.generateTextSummary(lineageGraph);
    expect(textSummary).toContain('Evidence Snippets:');
    expect(textSummary).toContain('outcome_scores');
  });

  it('should track lineage for complex query with joins and aggregations', async () => {
    // Complex query with multiple sources, joins, and transformations
    const generatedSql = `
      SELECT
        DATE_TRUNC('month', o.created_at) as month,
        o.dimension,
        AVG(o.score) as avg_score,
        COUNT(*) as sample_size
      FROM outcome_scores o
      INNER JOIN users u ON u.id = o.user_id
      WHERE o.text_type = 'feedback'
        AND o.created_at >= '2024-01-01'
        AND o.created_at <= '2024-12-31'
        AND u.company_id = 'company-123'
      GROUP BY DATE_TRUNC('month', o.created_at), o.dimension
      ORDER BY month DESC, dimension
      LIMIT 60
    `;

    const queryResults = [
      { month: '2024-12-01', dimension: 'confidence', avg_score: 7.8, sample_size: 45 },
      { month: '2024-12-01', dimension: 'belonging', avg_score: 7.5, sample_size: 45 },
      // ... more results
    ];

    const lineageInput: LineageResolutionInput = {
      queryId: 'query-outcomes-monthly-2024',
      generatedSql,
      templateId: 'outcome_trends_monthly',
      templateName: 'Monthly Outcome Trends',
      queryParams: {
        companyId: 'company-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 60,
      },
      resultData: queryResults,
      executionTimeMs: 678,
      safetyChecksPassed: true,
    };

    const answerLineage = await LineageResolver.resolveLineage(lineageInput);

    // Verify multiple sources detected
    expect(answerLineage.sources.length).toBeGreaterThanOrEqual(2);
    const sourceNames = answerLineage.sources.map(s => s.source);
    expect(sourceNames).toContain('outcome_scores');
    expect(sourceNames).toContain('users');

    // Verify joins detected
    expect(answerLineage.joins).toHaveLength(1);
    expect(answerLineage.joins[0]).toContain('INNER JOIN users');

    // Verify aggregations detected
    expect(answerLineage.aggregations.length).toBeGreaterThan(0);
    const aggFunctions = answerLineage.aggregations.join(' ');
    expect(aggFunctions).toContain('AVG');
    expect(aggFunctions).toContain('COUNT');

    // Verify transformations detected
    expect(answerLineage.transformations.length).toBeGreaterThan(0);
    const transformations = answerLineage.transformations.join(' ');
    expect(transformations).toContain('GROUP BY');
    expect(transformations).toContain('ORDER BY');
    expect(transformations).toContain('DATE_TRUNC');

    // Generate visualization
    const lineageGraph = LineageVisualizer.generateGraph({
      answerLineage,
      originalQuestion: 'Show monthly outcome trends for 2024',
    });

    // Should have high complexity due to joins and aggregations
    expect(lineageGraph.metadata.complexity).toMatch(/medium|high/);

    // Should have transformation nodes
    const transformNodes = lineageGraph.nodes.filter(n => n.type === 'transformation');
    expect(transformNodes.length).toBeGreaterThan(0);
  });

  it('should detect and flag security violations in lineage', async () => {
    // Query without tenant isolation (security violation)
    const insecureSql = `
      SELECT email, phone, sroi_ratio
      FROM metrics_company_period
      WHERE period_start >= '2024-01-01'
      LIMIT 100
    `;

    const lineageInput: LineageResolutionInput = {
      queryId: 'query-insecure',
      generatedSql: insecureSql,
      queryParams: {
        companyId: 'company-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 100,
      },
      resultData: [],
      executionTimeMs: 100,
      safetyChecksPassed: false, // Safety checks should have caught this
    };

    const answerLineage = await LineageResolver.resolveLineage(lineageInput);

    // Validate lineage - should fail
    const validation = LineageResolver.validateLineage(answerLineage);
    expect(validation.valid).toBe(false);

    // Should detect missing tenant isolation
    expect(validation.errors).toContain('Tenant isolation not enforced - critical security violation');

    // Should detect PII access
    expect(answerLineage.piiColumnsAccessed).toContain('email');
    expect(answerLineage.piiColumnsAccessed).toContain('phone');
    expect(validation.errors.some(e => e.includes('PII columns accessed'))).toBe(true);

    // Should detect failed safety checks
    expect(validation.errors).toContain('Safety checks did not pass');

    // Generate summary with warnings
    const summary = LineageResolver.summarizeLineage(answerLineage);
    expect(summary).toContain('⚠️ PII ACCESSED');
    expect(summary).toContain('⚠️ TENANT ISOLATION NOT ENFORCED');
  });

  it('should support linking NLQ answers to reports and metrics', async () => {
    const lineageInput: LineageResolutionInput = {
      queryId: 'query-123',
      generatedSql: 'SELECT * FROM metrics_company_period WHERE company_id = \'company-123\' LIMIT 10',
      queryParams: {
        companyId: 'company-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 10,
      },
      resultData: [{ sroi_ratio: 4.2 }],
      executionTimeMs: 100,
      safetyChecksPassed: true,
    };

    let answerLineage = await LineageResolver.resolveLineage(lineageInput);

    // Link to multiple reports
    answerLineage = LineageResolver.linkToReport(answerLineage, 'report-quarterly-q1');
    answerLineage = LineageResolver.linkToReport(answerLineage, 'report-annual-2024');

    expect(answerLineage.exportedToReports).toContain('report-quarterly-q1');
    expect(answerLineage.exportedToReports).toContain('report-annual-2024');

    // Link to metric lineage
    answerLineage = LineageResolver.linkToMetric(answerLineage, 'metric-lineage-sroi-456');

    expect(answerLineage.linkedToMetrics).toContain('metric-lineage-sroi-456');

    // This creates full audit trail for compliance
    const validation = LineageResolver.validateLineage(answerLineage);
    expect(validation.valid).toBe(true);
  });
});
