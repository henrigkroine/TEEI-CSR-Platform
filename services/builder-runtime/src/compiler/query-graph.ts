/**
 * Query Graph Compiler - builder-compiler
 * Compiles Builder JSON to safe query execution graph
 */

import { z } from 'zod';
import type { Block, BuilderDashboard } from '../schema/builder.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('query-graph-compiler');

/**
 * Query Node - represents a single data fetch operation
 */
export const QueryNodeSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  blockType: z.string(),
  queryType: z.enum(['nlq', 'metric', 'q2q', 'impact-in']),
  dependencies: z.array(z.string()), // IDs of nodes this depends on
  query: z.record(z.any()), // Query configuration
  cache: z.boolean(),
  refreshInterval: z.number().optional(),
  piiFlags: z.object({
    containsPii: z.boolean(),
    redactedFields: z.array(z.string()),
  }),
  rbac: z.object({
    roles: z.array(z.string()),
    users: z.array(z.string()),
    minPermission: z.string(),
  }),
});

export type QueryNode = z.infer<typeof QueryNodeSchema>;

/**
 * Query Graph - execution plan for dashboard
 */
export const QueryGraphSchema = z.object({
  dashboardId: z.string(),
  tenantId: z.string(),
  nodes: z.array(QueryNodeSchema),
  executionOrder: z.array(z.array(z.string())), // Parallel execution stages
  estimatedCost: z.number(),
  estimatedTimeMs: z.number(),
  requiresPii: z.boolean(),
  createdAt: z.string(),
});

export type QueryGraph = z.infer<typeof QueryGraphSchema>;

export class QueryGraphCompiler {
  /**
   * Compile dashboard to query graph
   */
  async compile(dashboard: BuilderDashboard): Promise<QueryGraph> {
    const startTime = Date.now();

    logger.info({ dashboardId: dashboard.id }, 'Compiling dashboard to query graph');

    // 1. Convert each block to query node
    const nodes: QueryNode[] = [];

    for (const block of dashboard.blocks) {
      const node = this.blockToNode(block, dashboard.tenantId);
      nodes.push(node);
    }

    // 2. Build dependency graph
    const dependencyMap = this.buildDependencyMap(nodes);

    // 3. Determine execution order (topological sort)
    const executionOrder = this.topologicalSort(nodes, dependencyMap);

    // 4. Calculate costs
    const estimatedCost = this.calculateCost(nodes);
    const estimatedTimeMs = this.estimateTime(nodes, executionOrder);

    // 5. Check PII requirements
    const requiresPii = nodes.some((n) => n.piiFlags.containsPii);

    const compileTime = Date.now() - startTime;
    logger.info({ compileTime, nodeCount: nodes.length }, 'Query graph compiled');

    const graph: QueryGraph = {
      dashboardId: dashboard.id,
      tenantId: dashboard.tenantId,
      nodes,
      executionOrder,
      estimatedCost,
      estimatedTimeMs,
      requiresPii,
      createdAt: new Date().toISOString(),
    };

    return graph;
  }

  /**
   * Convert block to query node
   */
  private blockToNode(block: Block, tenantId: string): QueryNode {
    const node: QueryNode = {
      id: `node_${block.id}`,
      blockId: block.id,
      blockType: block.type,
      queryType: block.dataSource.type,
      dependencies: [],
      query: this.buildQuery(block),
      cache: block.dataSource.cache,
      refreshInterval: block.dataSource.refreshInterval,
      piiFlags: {
        containsPii: block.piiSensitive,
        redactedFields: this.extractPiiFields(block),
      },
      rbac: block.rbac || { roles: [], users: [], minPermission: 'view' },
    };

    return node;
  }

  /**
   * Build query configuration from block
   */
  private buildQuery(block: Block): Record<string, any> {
    switch (block.type) {
      case 'kpi':
        return {
          metricId: block.metricId,
          aggregation: block.aggregation,
          timeRange: block.timeRange,
          comparison: block.comparison,
        };

      case 'chart':
        return {
          chartType: block.chartType,
          metrics: block.metrics,
          dimensions: block.dimensions,
          timeRange: block.timeRange,
          filters: block.filters,
        };

      case 'q2q_insight':
        return {
          feedbackText: block.feedbackText,
          outcomeFilters: block.outcomeFilters,
          confidenceThreshold: block.confidenceThreshold,
        };

      case 'impact_tile':
        return {
          entityType: block.entityType,
          entityId: block.entityId,
          metrics: block.metrics,
        };

      case 'narrative':
        return {
          template: block.template,
          dataInputs: block.dataInputs,
          tone: block.tone,
          maxLength: block.maxLength,
          locale: block.locale,
        };

      case 'table':
        return {
          columns: block.columns,
          timeRange: block.timeRange,
          filters: block.filters,
          pagination: block.pagination,
        };

      default:
        return {};
    }
  }

  /**
   * Extract PII fields from block
   */
  private extractPiiFields(block: Block): string[] {
    const fields: string[] = [];

    if (block.type === 'q2q_insight') {
      fields.push('feedbackText'); // Feedback may contain names, emails, etc.
    }

    if (block.type === 'table') {
      // Check column names for PII indicators
      for (const col of block.columns) {
        if (this.isPiiFieldName(col.field)) {
          fields.push(col.field);
        }
      }
    }

    return fields;
  }

  /**
   * Check if field name suggests PII
   */
  private isPiiFieldName(name: string): boolean {
    const piiIndicators = ['email', 'name', 'phone', 'address', 'ssn', 'id'];
    const lower = name.toLowerCase();
    return piiIndicators.some((indicator) => lower.includes(indicator));
  }

  /**
   * Build dependency map
   */
  private buildDependencyMap(nodes: QueryNode[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();

    for (const node of nodes) {
      map.set(node.id, new Set(node.dependencies));
    }

    return map;
  }

  /**
   * Topological sort for parallel execution
   */
  private topologicalSort(nodes: QueryNode[], dependencyMap: Map<string, Set<string>>): string[][] {
    const stages: string[][] = [];
    const processed = new Set<string>();
    const remaining = new Set(nodes.map((n) => n.id));

    while (remaining.size > 0) {
      const stage: string[] = [];

      // Find nodes with no unprocessed dependencies
      for (const nodeId of remaining) {
        const deps = dependencyMap.get(nodeId) || new Set();
        const hasUnprocessedDeps = Array.from(deps).some((dep) => !processed.has(dep));

        if (!hasUnprocessedDeps) {
          stage.push(nodeId);
        }
      }

      if (stage.length === 0) {
        // Circular dependency detected
        logger.error({ remaining: Array.from(remaining) }, 'Circular dependency in query graph');
        throw new Error('Circular dependency detected in query graph');
      }

      // Mark as processed
      for (const nodeId of stage) {
        processed.add(nodeId);
        remaining.delete(nodeId);
      }

      stages.push(stage);
    }

    return stages;
  }

  /**
   * Calculate total cost
   */
  private calculateCost(nodes: QueryNode[]): number {
    let cost = 0;

    for (const node of nodes) {
      // Base cost per node
      cost += 10;

      // Type-specific costs
      switch (node.queryType) {
        case 'nlq':
          cost += 50; // NLQ is expensive (LLM + query)
          break;
        case 'metric':
          cost += 20;
          break;
        case 'q2q':
          cost += 40; // Q2Q inference
          break;
        case 'impact-in':
          cost += 15;
          break;
      }

      // Cache reduces cost
      if (node.cache) {
        cost *= 0.5;
      }
    }

    return Math.round(cost);
  }

  /**
   * Estimate execution time
   */
  private estimateTime(nodes: QueryNode[], executionOrder: string[][]): number {
    let timeMs = 0;

    for (const stage of executionOrder) {
      // Stage runs in parallel, so take max time
      let stageTime = 0;

      for (const nodeId of stage) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        let nodeTime = 0;

        switch (node.queryType) {
          case 'nlq':
            nodeTime = 2000; // 2s for NLQ
            break;
          case 'metric':
            nodeTime = 500;
            break;
          case 'q2q':
            nodeTime = 1500;
            break;
          case 'impact-in':
            nodeTime = 800;
            break;
        }

        // Cache speeds up
        if (node.cache) {
          nodeTime *= 0.3;
        }

        stageTime = Math.max(stageTime, nodeTime);
      }

      timeMs += stageTime;
    }

    return Math.round(timeMs);
  }

  /**
   * Validate graph is safe to execute
   */
  validateGraph(graph: QueryGraph): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check cost budget
    if (graph.estimatedCost > 500) {
      violations.push(`Estimated cost too high: ${graph.estimatedCost} (max 500)`);
    }

    // Check time budget
    if (graph.estimatedTimeMs > 30000) {
      // 30s max
      violations.push(`Estimated time too high: ${graph.estimatedTimeMs}ms (max 30s)`);
    }

    // Check for too many nodes
    if (graph.nodes.length > 50) {
      violations.push(`Too many blocks: ${graph.nodes.length} (max 50)`);
    }

    // Check for circular dependencies (should be caught in compile)
    if (graph.executionOrder.length === 0) {
      violations.push('Empty execution order');
    }

    return { valid: violations.length === 0, violations };
  }
}
