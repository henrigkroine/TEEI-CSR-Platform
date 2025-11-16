/**
 * Lineage Visualizer - Generate Visual Lineage Graphs for NLQ Queries
 *
 * This module generates lineage graphs in JSON format compatible with frontend
 * visualization libraries (D3.js, Cytoscape, Mermaid, etc.)
 *
 * The graph shows the complete data flow:
 * Question → Intent → Template → Query → Sources → Transformations → Answer
 *
 * Output Format:
 * - Nodes: Each step in the lineage pipeline
 * - Edges: Data flow relationships
 * - Compatible with common graph visualization libraries
 */

import type { AnswerLineage, LineagePointer } from './lineage-resolver.js';
import type { IntentClassification } from '../types/intent.js';

/**
 * Node in the lineage graph
 */
export interface LineageNode {
  id: string;
  type: 'question' | 'intent' | 'template' | 'source' | 'transformation' | 'answer' | 'evidence';
  label: string;
  metadata: Record<string, unknown>;
  level: number; // Horizontal position in graph (0=question, 5=answer)
}

/**
 * Edge in the lineage graph
 */
export interface LineageEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  label?: string;
  type: 'data_flow' | 'transformation' | 'aggregation' | 'filter' | 'join';
  metadata?: Record<string, unknown>;
}

/**
 * Complete lineage graph
 */
export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  metadata: {
    queryId: string;
    generatedAt: string;
    rowCount: number;
    executionTimeMs: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

/**
 * Input for lineage graph generation
 */
export interface LineageGraphInput {
  answerLineage: AnswerLineage;
  originalQuestion: string;
  intentClassification?: IntentClassification;
  resultPreview?: unknown[]; // First few rows of results
}

/**
 * Lineage Visualizer Service
 */
export class LineageVisualizer {
  /**
   * Generate a complete lineage graph
   */
  static generateGraph(input: LineageGraphInput): LineageGraph {
    const { answerLineage, originalQuestion, intentClassification, resultPreview } = input;

    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];

    // Level 0: User Question
    const questionNode = this.createQuestionNode(originalQuestion);
    nodes.push(questionNode);

    // Level 1: Intent Classification
    let intentNode: LineageNode | undefined;
    if (intentClassification) {
      intentNode = this.createIntentNode(intentClassification);
      nodes.push(intentNode);
      edges.push(this.createEdge(questionNode.id, intentNode.id, 'intent_classification', 'data_flow'));
    }

    // Level 2: Template Selection
    const templateNode = this.createTemplateNode(answerLineage);
    nodes.push(templateNode);
    edges.push(
      this.createEdge(
        intentNode?.id || questionNode.id,
        templateNode.id,
        'template_match',
        'data_flow'
      )
    );

    // Level 3: Data Sources
    const sourceNodes = this.createSourceNodes(answerLineage.sources);
    nodes.push(...sourceNodes);
    sourceNodes.forEach(sourceNode => {
      edges.push(this.createEdge(templateNode.id, sourceNode.id, 'query_execution', 'data_flow'));
    });

    // Level 4: Transformations & Aggregations
    const transformationNodes = this.createTransformationNodes(answerLineage);
    nodes.push(...transformationNodes);

    // Connect sources to transformations
    if (transformationNodes.length > 0) {
      sourceNodes.forEach(sourceNode => {
        transformationNodes.forEach(transNode => {
          edges.push(this.createEdge(sourceNode.id, transNode.id, '', transNode.type as any));
        });
      });
    }

    // Level 5: Answer
    const answerNode = this.createAnswerNode(answerLineage, resultPreview);
    nodes.push(answerNode);

    // Connect transformations to answer (or sources directly if no transformations)
    if (transformationNodes.length > 0) {
      transformationNodes.forEach(transNode => {
        edges.push(this.createEdge(transNode.id, answerNode.id, 'result', 'data_flow'));
      });
    } else {
      sourceNodes.forEach(sourceNode => {
        edges.push(this.createEdge(sourceNode.id, answerNode.id, 'result', 'data_flow'));
      });
    }

    // Add evidence snippet nodes if present
    const evidenceNodes = this.createEvidenceNodes(answerLineage.sources);
    if (evidenceNodes.length > 0) {
      nodes.push(...evidenceNodes);
      evidenceNodes.forEach(evidenceNode => {
        // Link evidence to corresponding source node
        const sourceNode = sourceNodes.find(s => s.metadata.sourceName === evidenceNode.metadata.linkedSource);
        if (sourceNode) {
          edges.push(this.createEdge(evidenceNode.id, sourceNode.id, 'evidence_link', 'data_flow'));
        }
      });
    }

    return {
      nodes,
      edges,
      metadata: {
        queryId: answerLineage.queryId,
        generatedAt: new Date().toISOString(),
        rowCount: answerLineage.rowCount,
        executionTimeMs: answerLineage.executionTimeMs,
        complexity: this.calculateComplexity(answerLineage),
      },
    };
  }

  /**
   * Create question node (Level 0)
   */
  private static createQuestionNode(question: string): LineageNode {
    return {
      id: 'node_question',
      type: 'question',
      label: question.length > 50 ? question.substring(0, 47) + '...' : question,
      level: 0,
      metadata: {
        fullQuestion: question,
        questionLength: question.length,
      },
    };
  }

  /**
   * Create intent classification node (Level 1)
   */
  private static createIntentNode(intent: IntentClassification): LineageNode {
    return {
      id: 'node_intent',
      type: 'intent',
      label: `Intent: ${intent.intent}`,
      level: 1,
      metadata: {
        intent: intent.intent,
        confidence: intent.confidence,
        slots: intent.slots,
        timeRange: intent.timeRange,
        groupBy: intent.groupBy,
      },
    };
  }

  /**
   * Create template node (Level 2)
   */
  private static createTemplateNode(lineage: AnswerLineage): LineageNode {
    return {
      id: 'node_template',
      type: 'template',
      label: lineage.templateName || lineage.templateId || 'Custom Query',
      level: 2,
      metadata: {
        templateId: lineage.templateId,
        templateName: lineage.templateName,
        tenantIsolationEnforced: lineage.tenantIsolationEnforced,
        safetyChecksPassed: lineage.safetyChecksPassed,
      },
    };
  }

  /**
   * Create source nodes (Level 3)
   */
  private static createSourceNodes(sources: LineagePointer[]): LineageNode[] {
    return sources
      .filter(s => s.type !== 'evidence_snippet') // Evidence handled separately
      .map((source, index) => ({
        id: `node_source_${index}`,
        type: 'source' as const,
        label: this.formatSourceLabel(source),
        level: 3,
        metadata: {
          sourceName: source.source,
          sourceType: source.type,
          dateRange: source.dateRange,
          sampleSize: source.sampleSize,
          recordIds: source.recordIds,
        },
      }));
  }

  /**
   * Create transformation nodes (Level 4)
   */
  private static createTransformationNodes(lineage: AnswerLineage): LineageNode[] {
    const nodes: LineageNode[] = [];
    let index = 0;

    // Add aggregation nodes
    lineage.aggregations.forEach(agg => {
      nodes.push({
        id: `node_transform_agg_${index}`,
        type: 'transformation',
        label: agg.length > 40 ? agg.substring(0, 37) + '...' : agg,
        level: 4,
        metadata: {
          transformationType: 'aggregation',
          expression: agg,
        },
      });
      index++;
    });

    // Add join nodes
    lineage.joins.forEach(join => {
      nodes.push({
        id: `node_transform_join_${index}`,
        type: 'transformation',
        label: join.length > 40 ? join.substring(0, 37) + '...' : join,
        level: 4,
        metadata: {
          transformationType: 'join',
          expression: join,
        },
      });
      index++;
    });

    // Add other transformation nodes (GROUP BY, ORDER BY, etc.)
    lineage.transformations.forEach(trans => {
      nodes.push({
        id: `node_transform_other_${index}`,
        type: 'transformation',
        label: trans.length > 40 ? trans.substring(0, 37) + '...' : trans,
        level: 4,
        metadata: {
          transformationType: 'other',
          expression: trans,
        },
      });
      index++;
    });

    return nodes;
  }

  /**
   * Create answer node (Level 5)
   */
  private static createAnswerNode(lineage: AnswerLineage, resultPreview?: unknown[]): LineageNode {
    return {
      id: 'node_answer',
      type: 'answer',
      label: `Answer (${lineage.rowCount} rows)`,
      level: 5,
      metadata: {
        rowCount: lineage.rowCount,
        executionTimeMs: lineage.executionTimeMs,
        resultPreview: resultPreview?.slice(0, 3), // First 3 rows
        exportedToReports: lineage.exportedToReports,
        linkedToMetrics: lineage.linkedToMetrics,
      },
    };
  }

  /**
   * Create evidence snippet nodes (Level 2.5 - between template and sources)
   */
  private static createEvidenceNodes(sources: LineagePointer[]): LineageNode[] {
    return sources
      .filter(s => s.type === 'evidence_snippet' && s.evidenceSnippetIds)
      .map((source, index) => ({
        id: `node_evidence_${index}`,
        type: 'evidence' as const,
        label: `Evidence Snippets (${source.evidenceSnippetIds?.length || 0})`,
        level: 2.5,
        metadata: {
          linkedSource: source.source,
          evidenceSnippetIds: source.evidenceSnippetIds,
          sampleSize: source.sampleSize,
          q2qDerived: source.metadata?.q2qDerived,
        },
      }));
  }

  /**
   * Create an edge between two nodes
   */
  private static createEdge(
    sourceId: string,
    targetId: string,
    label: string,
    type: LineageEdge['type']
  ): LineageEdge {
    return {
      id: `edge_${sourceId}_${targetId}`,
      source: sourceId,
      target: targetId,
      label,
      type,
    };
  }

  /**
   * Format source label for display
   */
  private static formatSourceLabel(source: LineagePointer): string {
    let label = source.source;

    if (source.type === 'materialized_view') {
      label += ' (MV)';
    } else if (source.type === 'view') {
      label += ' (View)';
    }

    if (source.sampleSize) {
      label += ` [${source.sampleSize}]`;
    }

    return label;
  }

  /**
   * Calculate query complexity
   */
  private static calculateComplexity(lineage: AnswerLineage): 'low' | 'medium' | 'high' {
    let score = 0;

    // More sources = more complex
    score += lineage.sources.length;

    // Joins add complexity
    score += lineage.joins.length * 2;

    // Aggregations add complexity
    score += lineage.aggregations.length;

    // Transformations add complexity
    score += lineage.transformations.length;

    if (score <= 3) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
  }

  /**
   * Export graph to Mermaid diagram format
   * Useful for documentation and markdown rendering
   */
  static toMermaidDiagram(graph: LineageGraph): string {
    const lines: string[] = [];
    lines.push('graph TD');

    // Add nodes with custom styling based on type
    graph.nodes.forEach(node => {
      const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeLabel = node.label.replace(/"/g, "'");

      switch (node.type) {
        case 'question':
          lines.push(`  ${safeId}["${safeLabel}"]:::question`);
          break;
        case 'intent':
          lines.push(`  ${safeId}{"${safeLabel}"}:::intent`);
          break;
        case 'template':
          lines.push(`  ${safeId}[/"${safeLabel}"\\]:::template`);
          break;
        case 'source':
          lines.push(`  ${safeId}[("${safeLabel}")]:::source`);
          break;
        case 'transformation':
          lines.push(`  ${safeId}>"${safeLabel}"]:::transformation`);
          break;
        case 'answer':
          lines.push(`  ${safeId}[["${safeLabel}"]]:::answer`);
          break;
        case 'evidence':
          lines.push(`  ${safeId}[("${safeLabel}")]:::evidence`);
          break;
      }
    });

    // Add edges
    graph.edges.forEach(edge => {
      const safeSource = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeTarget = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`  ${safeSource} --${label}--> ${safeTarget}`);
    });

    // Add styling classes
    lines.push('');
    lines.push('  classDef question fill:#e1f5ff,stroke:#0288d1,stroke-width:2px');
    lines.push('  classDef intent fill:#fff3e0,stroke:#f57c00,stroke-width:2px');
    lines.push('  classDef template fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px');
    lines.push('  classDef source fill:#e8f5e9,stroke:#388e3c,stroke-width:2px');
    lines.push('  classDef transformation fill:#fff9c4,stroke:#f9a825,stroke-width:2px');
    lines.push('  classDef answer fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px');
    lines.push('  classDef evidence fill:#ede7f6,stroke:#5e35b1,stroke-width:2px');

    return lines.join('\n');
  }

  /**
   * Export graph to D3.js-compatible format
   */
  static toD3Format(graph: LineageGraph): {
    nodes: Array<{ id: string; group: number; label: string; [key: string]: unknown }>;
    links: Array<{ source: string; target: string; value: number; label?: string }>;
  } {
    const typeToGroup: Record<LineageNode['type'], number> = {
      question: 1,
      intent: 2,
      template: 3,
      source: 4,
      transformation: 5,
      answer: 6,
      evidence: 7,
    };

    return {
      nodes: graph.nodes.map(node => ({
        id: node.id,
        group: typeToGroup[node.type],
        label: node.label,
        ...node.metadata,
      })),
      links: graph.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: 1,
        label: edge.label,
      })),
    };
  }

  /**
   * Export graph to Cytoscape.js format
   */
  static toCytoscapeFormat(graph: LineageGraph): {
    elements: Array<{ data: Record<string, unknown>; classes?: string }>;
  } {
    const elements: Array<{ data: Record<string, unknown>; classes?: string }> = [];

    // Add nodes
    graph.nodes.forEach(node => {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          level: node.level,
          ...node.metadata,
        },
        classes: node.type,
      });
    });

    // Add edges
    graph.edges.forEach(edge => {
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: edge.type,
          ...edge.metadata,
        },
        classes: edge.type,
      });
    });

    return { elements };
  }

  /**
   * Generate text-based lineage summary
   * Useful for logging and debugging
   */
  static generateTextSummary(graph: LineageGraph): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('LINEAGE SUMMARY');
    lines.push('='.repeat(60));
    lines.push('');

    // Question
    const questionNode = graph.nodes.find(n => n.type === 'question');
    if (questionNode) {
      lines.push(`Question: ${questionNode.metadata.fullQuestion}`);
      lines.push('');
    }

    // Intent
    const intentNode = graph.nodes.find(n => n.type === 'intent');
    if (intentNode) {
      lines.push(`Intent: ${intentNode.metadata.intent} (confidence: ${intentNode.metadata.confidence})`);
      lines.push('');
    }

    // Template
    const templateNode = graph.nodes.find(n => n.type === 'template');
    if (templateNode) {
      lines.push(`Template: ${templateNode.label}`);
      lines.push(`  - Tenant Isolation: ${templateNode.metadata.tenantIsolationEnforced ? '✓' : '✗'}`);
      lines.push(`  - Safety Checks: ${templateNode.metadata.safetyChecksPassed ? '✓' : '✗'}`);
      lines.push('');
    }

    // Sources
    const sourceNodes = graph.nodes.filter(n => n.type === 'source');
    if (sourceNodes.length > 0) {
      lines.push('Data Sources:');
      sourceNodes.forEach(node => {
        lines.push(`  - ${node.label} (${node.metadata.sourceType})`);
        if (node.metadata.sampleSize) {
          lines.push(`    Sample Size: ${node.metadata.sampleSize}`);
        }
      });
      lines.push('');
    }

    // Evidence
    const evidenceNodes = graph.nodes.filter(n => n.type === 'evidence');
    if (evidenceNodes.length > 0) {
      lines.push('Evidence Snippets:');
      evidenceNodes.forEach(node => {
        lines.push(`  - ${node.label}`);
        lines.push(`    Linked to: ${node.metadata.linkedSource}`);
      });
      lines.push('');
    }

    // Transformations
    const transformNodes = graph.nodes.filter(n => n.type === 'transformation');
    if (transformNodes.length > 0) {
      lines.push('Transformations:');
      transformNodes.forEach(node => {
        lines.push(`  - ${node.label}`);
      });
      lines.push('');
    }

    // Answer
    const answerNode = graph.nodes.find(n => n.type === 'answer');
    if (answerNode) {
      lines.push('Answer:');
      lines.push(`  - Rows: ${answerNode.metadata.rowCount}`);
      lines.push(`  - Execution Time: ${answerNode.metadata.executionTimeMs}ms`);
      lines.push('');
    }

    // Metadata
    lines.push('Metadata:');
    lines.push(`  - Query ID: ${graph.metadata.queryId}`);
    lines.push(`  - Complexity: ${graph.metadata.complexity}`);
    lines.push(`  - Generated: ${graph.metadata.generatedAt}`);

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}
