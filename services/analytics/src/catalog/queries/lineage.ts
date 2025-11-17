/**
 * Lineage query builders - Mock implementation
 * TODO: Replace with actual OpenLineage/dbt queries
 */

import type { LineageGraph, LineageNode, LineageEdge } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('catalog:queries:lineage');

export async function getLineageGraph(
  datasetId: string,
  direction: 'upstream' | 'downstream' | 'both',
  maxDepth: number
): Promise<LineageGraph> {
  logger.info({ datasetId, direction, maxDepth }, 'Getting lineage graph');

  // Mock lineage data
  const nodes: LineageNode[] = [
    { id: datasetId, name: 'users', domain: 'identity', type: 'dataset', depth: 0, freshnessStatus: 'ok', qualityStatus: 'pass' },
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'user_enrollments', domain: 'impact', type: 'dataset', depth: 1, freshnessStatus: 'ok', qualityStatus: 'pass' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'outcome_scores', domain: 'impact', type: 'dataset', depth: 2, freshnessStatus: 'warn', qualityStatus: 'warn' },
  ];

  const edges: LineageEdge[] = [
    {
      id: 'edge-1',
      sourceDatasetId: datasetId,
      sourceDatasetName: 'users',
      targetDatasetId: '550e8400-e29b-41d4-a716-446655440001',
      targetDatasetName: 'user_enrollments',
      edgeType: 'feeds_into',
      sourceColumns: ['id', 'created_at'],
      targetColumns: ['user_id', 'enrollment_date'],
      transformationType: 'dbt_model',
      transformationCode: null,
      confidence: 100,
      method: 'dbt',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return {
    datasetId,
    datasetName: 'users',
    direction,
    maxDepth,
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      computedAt: new Date(),
    },
  };
}
