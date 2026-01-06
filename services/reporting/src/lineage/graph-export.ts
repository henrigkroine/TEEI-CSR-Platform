/**
 * Lineage Graph Export
 * Exports report lineage as DOT/JSON for visualization and audit
 */

import { db } from '@teei/shared-schema/db';
import { reportLineage, reportSections, reportCitations } from '@teei/shared-schema/schema/report_lineage';
import { evidenceSnippets, outcomeScores } from '@teei/shared-schema/schema/q2q';
import { eq } from 'drizzle-orm';

export interface LineageNode {
  id: string;
  type: 'report' | 'section' | 'citation' | 'evidence' | 'outcome';
  label: string;
  metadata: Record<string, any>;
}

export interface LineageEdge {
  from: string;
  to: string;
  type: 'contains' | 'cites' | 'derives_from' | 'supports';
  label?: string;
}

export interface LineageGraph {
  reportId: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
  metadata: {
    generatedAt: string;
    reportDate: string;
    model: string;
    provider: string;
    totalCost: number;
  };
}

/**
 * Lineage Graph Exporter
 */
export class LineageGraphExporter {
  /**
   * Build complete lineage graph for a report
   */
  async buildGraph(reportId: string): Promise<LineageGraph> {
    // 1. Fetch report lineage
    const [report] = await db
      .select()
      .from(reportLineage)
      .where(eq(reportLineage.reportId, reportId))
      .limit(1);

    if (!report) {
      throw new Error(`Report lineage not found for ${reportId}`);
    }

    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];

    // 2. Add report node
    const reportNode: LineageNode = {
      id: reportId,
      type: 'report',
      label: `Report ${reportId.slice(0, 8)}`,
      metadata: {
        model: report.modelUsed,
        provider: report.providerUsed,
        promptVersion: report.promptVersion,
        tokenCount: report.tokenCount,
        cost: parseFloat(report.cost || '0'),
        duration: report.durationMs,
        generatedAt: report.createdAt?.toISOString()
      }
    };
    nodes.push(reportNode);

    // 3. Fetch and add section nodes
    const sections = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportLineageId, report.id));

    for (const section of sections) {
      const sectionNode: LineageNode = {
        id: section.id,
        type: 'section',
        label: section.sectionName || 'Section',
        metadata: {
          wordCount: section.wordCount,
          charCount: section.charCount
        }
      };
      nodes.push(sectionNode);

      // Edge: report contains section
      edges.push({
        from: reportId,
        to: section.id,
        type: 'contains',
        label: section.sectionName || undefined
      });
    }

    // 4. Fetch and add citation nodes
    const citations = await db
      .select()
      .from(reportCitations)
      .where(eq(reportCitations.reportLineageId, report.id));

    for (const citation of citations) {
      const citationNode: LineageNode = {
        id: citation.id,
        type: 'citation',
        label: citation.citationId || 'Citation',
        metadata: {
          relevanceScore: parseFloat(citation.relevanceScore || '0'),
          position: citation.positionInText
        }
      };
      nodes.push(citationNode);

      // Edge: section cites citation (if sectionId available)
      if (citation.sectionId) {
        edges.push({
          from: citation.sectionId,
          to: citation.id,
          type: 'cites',
          label: citation.citationId || undefined
        });
      } else {
        // Fall back to report-level citation
        edges.push({
          from: reportId,
          to: citation.id,
          type: 'cites',
          label: citation.citationId || undefined
        });
      }

      // 5. Fetch evidence snippet for this citation
      if (citation.snippetId) {
        const [snippet] = await db
          .select()
          .from(evidenceSnippets)
          .where(eq(evidenceSnippets.id, citation.snippetId))
          .limit(1);

        if (snippet) {
          const evidenceNode: LineageNode = {
            id: snippet.id,
            type: 'evidence',
            label: snippet.snippetText?.slice(0, 50) + '...' || 'Evidence',
            metadata: {
              hash: snippet.snippetHash,
              sourceRef: snippet.sourceRef
            }
          };

          // Only add if not already added
          if (!nodes.some(n => n.id === snippet.id)) {
            nodes.push(evidenceNode);
          }

          // Edge: citation derives from evidence
          edges.push({
            from: citation.id,
            to: snippet.id,
            type: 'derives_from'
          });

          // 6. Fetch outcome score for evidence
          if (snippet.outcomeScoreId) {
            const [outcome] = await db
              .select()
              .from(outcomeScores)
              .where(eq(outcomeScores.id, snippet.outcomeScoreId))
              .limit(1);

            if (outcome) {
              const outcomeNode: LineageNode = {
                id: outcome.id,
                type: 'outcome',
                label: `${outcome.dimension} (${outcome.score})`,
                metadata: {
                  dimension: outcome.dimension,
                  score: parseFloat(outcome.score),
                  confidence: outcome.confidence ? parseFloat(outcome.confidence) : undefined,
                  method: outcome.method,
                  language: outcome.language,
                  modelVersion: outcome.modelVersion
                }
              };

              // Only add if not already added
              if (!nodes.some(n => n.id === outcome.id)) {
                nodes.push(outcomeNode);
              }

              // Edge: evidence supports outcome
              edges.push({
                from: snippet.id,
                to: outcome.id,
                type: 'supports'
              });
            }
          }
        }
      }
    }

    return {
      reportId,
      nodes,
      edges,
      metadata: {
        generatedAt: new Date().toISOString(),
        reportDate: report.createdAt?.toISOString() || '',
        model: report.modelUsed || '',
        provider: report.providerUsed || '',
        totalCost: parseFloat(report.cost || '0')
      }
    };
  }

  /**
   * Export graph to DOT format (Graphviz)
   */
  exportToDOT(graph: LineageGraph): string {
    const lines: string[] = [];

    lines.push('digraph lineage {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Node styles by type
    const nodeStyles: Record<string, string> = {
      report: 'fillcolor=lightblue, style=filled',
      section: 'fillcolor=lightgreen, style=filled',
      citation: 'fillcolor=lightyellow, style=filled',
      evidence: 'fillcolor=lightcoral, style=filled',
      outcome: 'fillcolor=lightgray, style=filled'
    };

    // Add nodes
    lines.push('  // Nodes');
    for (const node of graph.nodes) {
      const style = nodeStyles[node.type] || '';
      const label = node.label.replace(/"/g, '\\"');
      lines.push(`  "${node.id}" [label="${label}", ${style}];`);
    }

    lines.push('');
    lines.push('  // Edges');

    // Edge styles by type
    const edgeStyles: Record<string, string> = {
      contains: 'color=blue',
      cites: 'color=green',
      derives_from: 'color=orange',
      supports: 'color=red'
    };

    // Add edges
    for (const edge of graph.edges) {
      const style = edgeStyles[edge.type] || '';
      const label = edge.label ? ` label="${edge.label.replace(/"/g, '\\"')}"` : '';
      lines.push(`  "${edge.from}" -> "${edge.to}" [${style}${label}];`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Export graph to JSON format
   */
  exportToJSON(graph: LineageGraph): string {
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Export graph to Cytoscape.js format (for web visualization)
   */
  exportToCytoscape(graph: LineageGraph): string {
    const elements = {
      nodes: graph.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          ...node.metadata
        }
      })),
      edges: graph.edges.map(edge => ({
        data: {
          source: edge.from,
          target: edge.to,
          type: edge.type,
          label: edge.label
        }
      }))
    };

    return JSON.stringify(elements, null, 2);
  }

  /**
   * Export graph to Mermaid diagram format
   */
  exportToMermaid(graph: LineageGraph): string {
    const lines: string[] = [];

    lines.push('graph LR');
    lines.push('');

    // Create node ID mapping (Mermaid needs alphanumeric IDs)
    const idMap = new Map<string, string>();
    graph.nodes.forEach((node, idx) => {
      idMap.set(node.id, `N${idx}`);
    });

    // Add nodes with labels
    lines.push('  %% Nodes');
    for (const node of graph.nodes) {
      const nodeId = idMap.get(node.id)!;
      const label = node.label.replace(/"/g, "'");

      // Node shape by type
      const shapes: Record<string, [string, string]> = {
        report: ['{{', '}}'], // Hexagon
        section: ['[', ']'],   // Rectangle
        citation: ['([', '])'], // Stadium
        evidence: ['[(', ')]'], // Cylinder
        outcome: ['[[', ']]']   // Subroutine
      };

      const [open, close] = shapes[node.type] || ['[', ']'];
      lines.push(`  ${nodeId}${open}"${label}"${close}`);
    }

    lines.push('');
    lines.push('  %% Edges');

    // Add edges
    for (const edge of graph.edges) {
      const fromId = idMap.get(edge.from);
      const toId = idMap.get(edge.to);

      if (!fromId || !toId) continue;

      const label = edge.label ? `|${edge.label}|` : '';

      // Arrow style by type
      const arrows: Record<string, string> = {
        contains: '-->',
        cites: '-.->',
        derives_from: '==>',
        supports: '-->'
      };

      const arrow = arrows[edge.type] || '-->';
      lines.push(`  ${fromId} ${arrow}${label} ${toId}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate audit report with lineage summary
   */
  async generateAuditReport(reportId: string): Promise<string> {
    const graph = await this.buildGraph(reportId);

    const lines: string[] = [];

    lines.push('# Report Lineage Audit');
    lines.push('');
    lines.push(`**Report ID:** ${reportId}`);
    lines.push(`**Generated:** ${graph.metadata.generatedAt}`);
    lines.push(`**Model:** ${graph.metadata.model} (${graph.metadata.provider})`);
    lines.push(`**Total Cost:** $${graph.metadata.totalCost.toFixed(4)}`);
    lines.push('');

    lines.push('## Lineage Summary');
    lines.push('');

    const nodesByType = graph.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    lines.push('| Node Type | Count |');
    lines.push('|-----------|-------|');
    for (const [type, count] of Object.entries(nodesByType)) {
      lines.push(`| ${type} | ${count} |`);
    }

    lines.push('');
    lines.push('## Sections');
    lines.push('');

    const sections = graph.nodes.filter(n => n.type === 'section');
    for (const section of sections) {
      lines.push(`- **${section.label}** (${section.metadata.wordCount} words)`);

      // Find citations for this section
      const sectionCitations = graph.edges
        .filter(e => e.from === section.id && e.type === 'cites')
        .map(e => graph.nodes.find(n => n.id === e.to))
        .filter(Boolean);

      if (sectionCitations.length > 0) {
        lines.push(`  - Citations: ${sectionCitations.length}`);
      }
    }

    lines.push('');
    lines.push('## Evidence Chain');
    lines.push('');

    const citations = graph.nodes.filter(n => n.type === 'citation');
    for (const citation of citations) {
      lines.push(`- **${citation.label}** (relevance: ${citation.metadata.relevanceScore})`);

      // Find evidence for this citation
      const evidence = graph.edges
        .filter(e => e.from === citation.id && e.type === 'derives_from')
        .map(e => graph.nodes.find(n => n.id === e.to))
        .filter(Boolean);

      if (evidence.length > 0) {
        for (const ev of evidence) {
          lines.push(`  - Evidence: ${ev!.label}`);

          // Find outcome for this evidence
          const outcomes = graph.edges
            .filter(e => e.from === ev!.id && e.type === 'supports')
            .map(e => graph.nodes.find(n => n.id === e.to))
            .filter(Boolean);

          if (outcomes.length > 0) {
            for (const outcome of outcomes) {
              lines.push(`    - Outcome: ${outcome!.label} (confidence: ${outcome!.metadata.confidence})`);
            }
          }
        }
      }
    }

    lines.push('');
    lines.push('---');
    lines.push(`*Generated on ${new Date().toISOString()}*`);

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let exporterInstance: LineageGraphExporter | null = null;

export function getLineageExporter(): LineageGraphExporter {
  if (!exporterInstance) {
    exporterInstance = new LineageGraphExporter();
  }
  return exporterInstance;
}
