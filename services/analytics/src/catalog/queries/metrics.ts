/**
 * Semantic metrics query builders - Mock implementation
 * TODO: Replace with actual dbt semantic layer queries
 */

import type { SemanticMetric, CatalogPaginatedResponse } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('catalog:queries:metrics');

const MOCK_METRICS: SemanticMetric[] = [
  {
    id: 'metric-sroi',
    name: 'sroi_ratio',
    displayName: 'Social Return on Investment (SROI)',
    description: 'Ratio of social value generated to investment',
    metricType: 'ratio',
    category: 'impact',
    formula: 'total_social_value / total_investment',
    formulaReadable: 'Total Social Value ÷ Total Investment',
    baseDatasets: ['550e8400-e29b-41d4-a716-446655440003'],
    baseColumns: [
      { datasetId: '550e8400-e29b-41d4-a716-446655440003', datasetName: 'outcome_scores', columnName: 'social_value', aggregation: 'sum', filter: null },
    ],
    lastRefreshedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    refreshFrequency: 'daily',
    freshnessStatus: 'ok',
    exposures: [
      { type: 'dashboard', name: 'Corporate Cockpit', url: '/cockpit', lastAccessedAt: new Date() },
      { type: 'report', name: 'Impact Report', url: null, lastAccessedAt: new Date() },
    ],
    goldStandardValue: 3.5,
    goldStandardTolerance: 10,
    lastValidationAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    validationStatus: 'pass',
    dbtModelName: 'fct_sroi',
    dbtMetricName: 'sroi_ratio',
    owner: 'Impact Team',
    tags: ['sroi', 'impact', 'kpi'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
];

export async function queryMetrics(
  page: number,
  limit: number,
  filters: any
): Promise<CatalogPaginatedResponse<SemanticMetric>> {
  logger.info({ page, limit, filters }, 'Querying metrics');

  const total = MOCK_METRICS.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: MOCK_METRICS,
    pagination: { page, limit, total, totalPages },
    filters,
  };
}
