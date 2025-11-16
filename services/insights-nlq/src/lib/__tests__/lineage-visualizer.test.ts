/**
 * Unit tests for LineageVisualizer
 */

import { describe, it, expect } from 'vitest';
import { LineageVisualizer } from '../lineage-visualizer.js';
import type { AnswerLineage } from '../lineage-resolver.js';
import type { IntentClassification } from '../../types/intent.js';
import type { LineageGraphInput } from '../lineage-visualizer.js';

describe('LineageVisualizer', () => {
  const createMockLineage = (): AnswerLineage => ({
    queryId: 'query-123',
    executedAt: new Date('2024-01-15T10:30:00Z'),
    sources: [
      {
        type: 'table',
        source: 'metrics_company_period',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        sampleSize: 42,
      },
    ],
    transformations: ['GROUP BY period_start', 'ORDER BY period_start DESC'],
    aggregations: ['AVG(sroi_ratio)', 'SUM(participants_count)'],
    joins: [],
    filters: {
      companyId: 'company-456',
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
    },
    rowCount: 12,
    executionTimeMs: 234,
    templateId: 'sroi_ratio',
    templateName: 'Social Return on Investment (SROI)',
    tenantIsolationEnforced: true,
    piiColumnsAccessed: [],
    safetyChecksPassed: true,
  });

  const createMockIntent = (): IntentClassification => ({
    intent: 'get_metric',
    confidence: 0.95,
    templateId: 'sroi_ratio',
    slots: [
      { name: 'metric', value: 'sroi', confidence: 0.98 },
      { name: 'timeRange', value: 'ytd', confidence: 0.92 },
    ],
    timeRange: {
      type: 'ytd',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
    originalQuery: 'What is our SROI for this year?',
    classifiedAt: '2024-01-15T10:30:00Z',
  });

  describe('generateGraph', () => {
    it('should generate complete lineage graph', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
        intentClassification: createMockIntent(),
      };

      const graph = LineageVisualizer.generateGraph(input);

      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(graph.metadata).toBeDefined();

      // Should have nodes for question, intent, template, source, transformations, answer
      expect(graph.nodes.length).toBeGreaterThanOrEqual(6);

      // Check metadata
      expect(graph.metadata.queryId).toBe('query-123');
      expect(graph.metadata.rowCount).toBe(12);
      expect(graph.metadata.executionTimeMs).toBe(234);
      // Complexity is 'medium' because: 1 source + 2 aggregations + 2 transformations = 5 points
      expect(graph.metadata.complexity).toBe('medium');
    });

    it('should create question node at level 0', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const questionNode = graph.nodes.find(n => n.type === 'question');
      expect(questionNode).toBeDefined();
      expect(questionNode?.level).toBe(0);
      expect(questionNode?.label).toContain('What is our SROI');
    });

    it('should create intent node when classification provided', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
        intentClassification: createMockIntent(),
      };

      const graph = LineageVisualizer.generateGraph(input);

      const intentNode = graph.nodes.find(n => n.type === 'intent');
      expect(intentNode).toBeDefined();
      expect(intentNode?.level).toBe(1);
      expect(intentNode?.label).toContain('get_metric');
    });

    it('should create template node', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const templateNode = graph.nodes.find(n => n.type === 'template');
      expect(templateNode).toBeDefined();
      expect(templateNode?.level).toBe(2);
      expect(templateNode?.label).toBe('Social Return on Investment (SROI)');
    });

    it('should create source nodes', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const sourceNodes = graph.nodes.filter(n => n.type === 'source');
      expect(sourceNodes).toHaveLength(1);
      expect(sourceNodes[0].level).toBe(3);
      expect(sourceNodes[0].label).toContain('metrics_company_period');
    });

    it('should create transformation nodes', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const transformNodes = graph.nodes.filter(n => n.type === 'transformation');
      expect(transformNodes.length).toBeGreaterThan(0);
      expect(transformNodes[0].level).toBe(4);
    });

    it('should create answer node', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const answerNode = graph.nodes.find(n => n.type === 'answer');
      expect(answerNode).toBeDefined();
      expect(answerNode?.level).toBe(5);
      expect(answerNode?.label).toContain('12 rows');
    });

    it('should create evidence nodes for Q2Q data', () => {
      const lineage = createMockLineage();
      lineage.sources.push({
        type: 'evidence_snippet',
        source: 'outcome_scores',
        evidenceSnippetIds: ['ev-1', 'ev-2', 'ev-3'],
        sampleSize: 3,
        metadata: { q2qDerived: true },
      });

      const input: LineageGraphInput = {
        answerLineage: lineage,
        originalQuestion: 'What are our outcome scores?',
      };

      const graph = LineageVisualizer.generateGraph(input);

      const evidenceNodes = graph.nodes.filter(n => n.type === 'evidence');
      expect(evidenceNodes).toHaveLength(1);
      expect(evidenceNodes[0].label).toContain('Evidence Snippets');
      expect(evidenceNodes[0].metadata.evidenceSnippetIds).toHaveLength(3);
    });

    it('should connect nodes with edges', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
        intentClassification: createMockIntent(),
      };

      const graph = LineageVisualizer.generateGraph(input);

      // Should have edges connecting all levels
      expect(graph.edges.length).toBeGreaterThan(0);

      // Check edge types
      const dataFlowEdges = graph.edges.filter(e => e.type === 'data_flow');
      expect(dataFlowEdges.length).toBeGreaterThan(0);
    });

    it('should calculate complexity correctly', () => {
      // Low complexity (1 source, no joins, 2 aggs)
      const lowComplexityInput: LineageGraphInput = {
        answerLineage: {
          ...createMockLineage(),
          sources: [{ type: 'table', source: 'metrics_company_period' }],
          joins: [],
          aggregations: ['AVG(score)'],
          transformations: [],
        },
        originalQuestion: 'Simple query',
      };

      const lowGraph = LineageVisualizer.generateGraph(lowComplexityInput);
      expect(lowGraph.metadata.complexity).toBe('low');

      // High complexity (multiple sources, joins, many aggs)
      const highComplexityInput: LineageGraphInput = {
        answerLineage: {
          ...createMockLineage(),
          sources: [
            { type: 'table', source: 'metrics_company_period' },
            { type: 'table', source: 'outcome_scores' },
            { type: 'table', source: 'users' },
          ],
          joins: ['INNER JOIN users', 'LEFT JOIN outcome_scores'],
          aggregations: ['AVG(score)', 'SUM(count)', 'STDDEV(value)'],
          transformations: ['GROUP BY dimension', 'ORDER BY score', 'HAVING count > 10'],
        },
        originalQuestion: 'Complex query',
      };

      const highGraph = LineageVisualizer.generateGraph(highComplexityInput);
      expect(highGraph.metadata.complexity).toBe('high');
    });
  });

  describe('toMermaidDiagram', () => {
    it('should generate valid Mermaid diagram', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const mermaid = LineageVisualizer.toMermaidDiagram(graph);

      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('node_question');
      expect(mermaid).toContain('node_template');
      expect(mermaid).toContain('node_answer');
      expect(mermaid).toContain('classDef question');
      expect(mermaid).toContain('classDef answer');
    });

    it('should include styling classes', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const mermaid = LineageVisualizer.toMermaidDiagram(graph);

      expect(mermaid).toContain('classDef question');
      expect(mermaid).toContain('classDef template');
      expect(mermaid).toContain('classDef source');
      expect(mermaid).toContain('classDef transformation');
      expect(mermaid).toContain('classDef answer');
    });
  });

  describe('toD3Format', () => {
    it('should generate D3-compatible format', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const d3Format = LineageVisualizer.toD3Format(graph);

      expect(d3Format.nodes).toBeDefined();
      expect(d3Format.links).toBeDefined();
      expect(d3Format.nodes.length).toBeGreaterThan(0);
      expect(d3Format.links.length).toBeGreaterThan(0);

      // Check node structure
      const firstNode = d3Format.nodes[0];
      expect(firstNode.id).toBeDefined();
      expect(firstNode.group).toBeDefined();
      expect(firstNode.label).toBeDefined();

      // Check link structure
      const firstLink = d3Format.links[0];
      expect(firstLink.source).toBeDefined();
      expect(firstLink.target).toBeDefined();
      expect(firstLink.value).toBe(1);
    });

    it('should assign correct groups to node types', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const d3Format = LineageVisualizer.toD3Format(graph);

      const questionNode = d3Format.nodes.find(n => n.id === 'node_question');
      expect(questionNode?.group).toBe(1);

      const answerNode = d3Format.nodes.find(n => n.id === 'node_answer');
      expect(answerNode?.group).toBe(6);
    });
  });

  describe('toCytoscapeFormat', () => {
    it('should generate Cytoscape-compatible format', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const cytoFormat = LineageVisualizer.toCytoscapeFormat(graph);

      expect(cytoFormat.elements).toBeDefined();
      expect(cytoFormat.elements.length).toBeGreaterThan(0);

      // Check that nodes and edges are included
      const nodes = cytoFormat.elements.filter(e => !e.data.source);
      const edges = cytoFormat.elements.filter(e => e.data.source);

      expect(nodes.length).toBeGreaterThan(0);
      expect(edges.length).toBeGreaterThan(0);
    });

    it('should include classes for styling', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const cytoFormat = LineageVisualizer.toCytoscapeFormat(graph);

      const questionNode = cytoFormat.elements.find(e => e.data.id === 'node_question');
      expect(questionNode?.classes).toBe('question');
    });
  });

  describe('generateTextSummary', () => {
    it('should generate readable text summary', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
        intentClassification: createMockIntent(),
      };

      const graph = LineageVisualizer.generateGraph(input);
      const summary = LineageVisualizer.generateTextSummary(graph);

      expect(summary).toContain('LINEAGE SUMMARY');
      expect(summary).toContain('What is our SROI for this year?');
      expect(summary).toContain('Intent: get_metric');
      expect(summary).toContain('Template: Social Return on Investment (SROI)');
      expect(summary).toContain('Data Sources:');
      expect(summary).toContain('metrics_company_period');
      expect(summary).toContain('Transformations:');
      expect(summary).toContain('Answer:');
      expect(summary).toContain('Rows: 12');
      expect(summary).toContain('Execution Time: 234ms');
      expect(summary).toContain('Query ID: query-123');
      // Complexity is 'medium' due to aggregations + transformations
      expect(summary).toContain('Complexity: medium');
    });

    it('should include evidence snippets in summary', () => {
      const lineage = createMockLineage();
      lineage.sources.push({
        type: 'evidence_snippet',
        source: 'outcome_scores',
        evidenceSnippetIds: ['ev-1', 'ev-2'],
        sampleSize: 2,
        metadata: { q2qDerived: true },
      });

      const input: LineageGraphInput = {
        answerLineage: lineage,
        originalQuestion: 'What are our outcome scores?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const summary = LineageVisualizer.generateTextSummary(graph);

      expect(summary).toContain('Evidence Snippets:');
      expect(summary).toContain('outcome_scores');
    });

    it('should show tenant isolation status', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const summary = LineageVisualizer.generateTextSummary(graph);

      expect(summary).toContain('Tenant Isolation: ✓');
    });

    it('should show safety check status', () => {
      const input: LineageGraphInput = {
        answerLineage: createMockLineage(),
        originalQuestion: 'What is our SROI for this year?',
      };

      const graph = LineageVisualizer.generateGraph(input);
      const summary = LineageVisualizer.generateTextSummary(graph);

      expect(summary).toContain('Safety Checks: ✓');
    });
  });
});
