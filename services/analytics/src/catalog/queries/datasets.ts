/**
 * Dataset catalog query builders
 *
 * Queries for retrieving dataset metadata, freshness, quality, and lineage.
 * Sources: PostgreSQL (dataset metadata), ClickHouse (OpenLineage events),
 * Great Expectations (quality results), dbt (semantic layer).
 */

import type {
  CatalogDataset,
  DatasetCard,
  CatalogFilters,
  CatalogPaginatedResponse,
  ColumnSchema,
} from '@teei/shared-types';
import { calculateFreshnessStatus, DEFAULT_FRESHNESS_THRESHOLDS } from '../utils/freshness.js';
import { calculateQualityStatus } from '../utils/quality.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('catalog:queries:datasets');

/**
 * Mock dataset records for development
 * TODO: Replace with actual database queries
 */
const MOCK_DATASETS: CatalogDataset[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'users',
    description: 'Platform user accounts with profile information',
    domain: 'identity',
    owner: 'Platform Team',
    ownerEmail: 'platform@teei.io',
    gdprCategory: 'pii',
    residency: 'EU',
    schemaVersion: '2.1.0',
    columnCount: 15,
    rowCountEstimate: 125000,
    lastLoadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    freshnessStatus: 'ok',
    freshnessThresholdHours: 6,
    qualityStatus: 'pass',
    qualityPassRate: 98.5,
    lastQualityRunAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    upstreamCount: 0,
    downstreamCount: 8,
    lineageCoverage: 85,
    tags: ['core', 'identity', 'gdpr'],
    tenantId: null, // Tenant-agnostic
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'companies',
    description: 'Corporate client accounts and program sponsors',
    domain: 'identity',
    owner: 'Platform Team',
    ownerEmail: 'platform@teei.io',
    gdprCategory: 'internal',
    residency: 'EU',
    schemaVersion: '2.0.0',
    columnCount: 22,
    rowCountEstimate: 1500,
    lastLoadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    freshnessStatus: 'ok',
    freshnessThresholdHours: 6,
    qualityStatus: 'pass',
    qualityPassRate: 96.2,
    lastQualityRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    upstreamCount: 0,
    downstreamCount: 12,
    lineageCoverage: 90,
    tags: ['core', 'identity'],
    tenantId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'buddy_matches',
    description: 'Buddy system pairing records',
    domain: 'buddy',
    owner: 'Buddy Team',
    ownerEmail: 'buddy@teei.io',
    gdprCategory: 'confidential',
    residency: 'EU',
    schemaVersion: '1.5.0',
    columnCount: 18,
    rowCountEstimate: 45000,
    lastLoadedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    freshnessStatus: 'ok',
    freshnessThresholdHours: 12,
    qualityStatus: 'pass',
    qualityPassRate: 99.1,
    lastQualityRunAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    upstreamCount: 2,
    downstreamCount: 5,
    lineageCoverage: 75,
    tags: ['buddy', 'engagement'],
    tenantId: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'outcome_scores',
    description: 'Calculated impact outcomes (integration, language, employment)',
    domain: 'impact',
    owner: 'Impact Team',
    ownerEmail: 'impact@teei.io',
    gdprCategory: 'confidential',
    residency: 'EU',
    schemaVersion: '3.2.0',
    columnCount: 12,
    rowCountEstimate: 80000,
    lastLoadedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    freshnessStatus: 'warn',
    freshnessThresholdHours: 24,
    qualityStatus: 'warn',
    qualityPassRate: 92.8,
    lastQualityRunAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    upstreamCount: 6,
    downstreamCount: 10,
    lineageCoverage: 95,
    tags: ['impact', 'metrics', 'sroi'],
    tenantId: null,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'evidence_snippets',
    description: 'Qualitative evidence text for Q2Q pipeline',
    domain: 'analytics',
    owner: 'AI Team',
    ownerEmail: 'ai@teei.io',
    gdprCategory: 'sensitive',
    residency: 'EU',
    schemaVersion: '2.5.0',
    columnCount: 10,
    rowCountEstimate: 250000,
    lastLoadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    freshnessStatus: 'ok',
    freshnessThresholdHours: 6,
    qualityStatus: 'pass',
    qualityPassRate: 97.3,
    lastQualityRunAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    upstreamCount: 4,
    downstreamCount: 8,
    lineageCoverage: 88,
    tags: ['q2q', 'evidence', 'nlp'],
    tenantId: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'metrics_company_period',
    description: 'Aggregated SROI/VIS metrics by company and period',
    domain: 'reporting',
    owner: 'Reporting Team',
    ownerEmail: 'reporting@teei.io',
    gdprCategory: 'confidential',
    residency: 'EU',
    schemaVersion: '4.0.0',
    columnCount: 20,
    rowCountEstimate: 18000,
    lastLoadedAt: new Date(Date.now() - 15 * 60 * 60 * 1000), // 15 hours ago
    freshnessStatus: 'warn',
    freshnessThresholdHours: 12,
    qualityStatus: 'pass',
    qualityPassRate: 98.9,
    lastQualityRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    upstreamCount: 10,
    downstreamCount: 6,
    lineageCoverage: 100,
    tags: ['reporting', 'metrics', 'aggregates'],
    tenantId: null,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'kintell_sessions',
    description: 'Learning session records from Kintell platform',
    domain: 'kintell',
    owner: 'Kintell Team',
    ownerEmail: 'kintell@teei.io',
    gdprCategory: 'pii',
    residency: 'NO',
    schemaVersion: '1.8.0',
    columnCount: 16,
    rowCountEstimate: 95000,
    lastLoadedAt: new Date(Date.now() - 90 * 60 * 60 * 1000), // 90 hours ago
    freshnessStatus: 'critical',
    freshnessThresholdHours: 24,
    qualityStatus: 'fail',
    qualityPassRate: 85.2,
    lastQualityRunAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    upstreamCount: 1,
    downstreamCount: 4,
    lineageCoverage: 60,
    tags: ['kintell', 'learning', 'integration'],
    tenantId: null,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'report_lineage',
    description: 'Report generation lineage and citations',
    domain: 'compliance',
    owner: 'Compliance Team',
    ownerEmail: 'compliance@teei.io',
    gdprCategory: 'internal',
    residency: 'EU',
    schemaVersion: '2.3.0',
    columnCount: 14,
    rowCountEstimate: 12000,
    lastLoadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    freshnessStatus: 'ok',
    freshnessThresholdHours: 6,
    qualityStatus: 'pass',
    qualityPassRate: 100,
    lastQualityRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    upstreamCount: 8,
    downstreamCount: 2,
    lineageCoverage: 100,
    tags: ['compliance', 'audit', 'lineage'],
    tenantId: null,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
];

/**
 * Query datasets with filters and pagination
 *
 * @param filters - Catalog filters
 * @param page - Page number
 * @param limit - Page size
 * @param sortBy - Sort field
 * @param sortOrder - Sort order
 * @param tenantId - Tenant filter (null = all tenants for platform admin)
 * @returns Paginated dataset cards
 */
export async function queryDatasets(
  filters: CatalogFilters,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  tenantId: string | null
): Promise<CatalogPaginatedResponse<DatasetCard>> {
  logger.info({ filters, page, limit, sortBy, sortOrder, tenantId }, 'Querying datasets');

  try {
    // TODO: Replace with actual database query
    // For now, filter mock data

    let filtered = [...MOCK_DATASETS];

    // Apply tenant filter
    if (tenantId !== null) {
      filtered = filtered.filter((d) => d.tenantId === tenantId || d.tenantId === null);
    }

    // Apply domain filter
    if (filters.domain && filters.domain.length > 0) {
      filtered = filtered.filter((d) => filters.domain!.includes(d.domain));
    }

    // Apply GDPR category filter
    if (filters.gdprCategory && filters.gdprCategory.length > 0) {
      filtered = filtered.filter((d) => filters.gdprCategory!.includes(d.gdprCategory));
    }

    // Apply freshness status filter
    if (filters.freshnessStatus && filters.freshnessStatus.length > 0) {
      filtered = filtered.filter((d) => filters.freshnessStatus!.includes(d.freshnessStatus));
    }

    // Apply quality status filter
    if (filters.qualityStatus && filters.qualityStatus.length > 0) {
      filtered = filtered.filter((d) => filters.qualityStatus!.includes(d.qualityStatus));
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(searchLower) ||
          (d.description && d.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((d) => filters.tags!.some((tag) => d.tags.includes(tag)));
    }

    // Apply owner filter
    if (filters.owner) {
      filtered = filtered.filter((d) => d.owner === filters.owner);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = filtered.slice(start, end);

    // Convert to DatasetCard format
    const cards: DatasetCard[] = data.map((d) => ({
      id: d.id,
      name: d.name,
      domain: d.domain,
      owner: d.owner,
      gdprCategory: d.gdprCategory,
      freshnessStatus: d.freshnessStatus,
      qualityStatus: d.qualityStatus,
      qualityPassRate: d.qualityPassRate,
      lastLoadedAt: d.lastLoadedAt,
      lastQualityRunAt: d.lastQualityRunAt,
      tags: d.tags,
    }));

    return {
      data: cards,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters,
    };
  } catch (error) {
    logger.error({ error }, 'Error querying datasets');
    throw error;
  }
}

/**
 * Get dataset by ID
 *
 * @param datasetId - Dataset ID
 * @param tenantId - Tenant filter
 * @returns Dataset or null if not found
 */
export async function getDatasetById(
  datasetId: string,
  tenantId: string | null
): Promise<CatalogDataset | null> {
  logger.info({ datasetId, tenantId }, 'Getting dataset by ID');

  try {
    // TODO: Replace with actual database query
    const dataset = MOCK_DATASETS.find((d) => d.id === datasetId);

    if (!dataset) {
      return null;
    }

    // Check tenant access
    if (tenantId !== null && dataset.tenantId !== null && dataset.tenantId !== tenantId) {
      logger.warn({ datasetId, tenantId, datasetTenantId: dataset.tenantId }, 'Tenant access denied');
      return null;
    }

    return dataset;
  } catch (error) {
    logger.error({ error, datasetId }, 'Error getting dataset by ID');
    throw error;
  }
}

/**
 * Get column schema for dataset
 *
 * @param datasetId - Dataset ID
 * @returns Column schema array
 */
export async function getDatasetSchema(datasetId: string): Promise<ColumnSchema[]> {
  logger.info({ datasetId }, 'Getting dataset schema');

  try {
    // TODO: Query actual schema from information_schema or dbt
    // For now, return mock schema

    if (datasetId === '550e8400-e29b-41d4-a716-446655440000') {
      // users table
      return [
        { name: 'id', dataType: 'uuid', nullable: false, description: 'User ID', hasPII: false, hasLineage: true },
        { name: 'email', dataType: 'varchar', nullable: false, description: 'Email address', hasPII: true, hasLineage: true },
        { name: 'full_name', dataType: 'varchar', nullable: false, description: 'Full name', hasPII: true, hasLineage: false },
        { name: 'date_of_birth', dataType: 'date', nullable: true, description: 'Date of birth', hasPII: true, hasLineage: false },
        { name: 'created_at', dataType: 'timestamp', nullable: false, description: 'Account creation time', hasPII: false, hasLineage: true },
      ];
    }

    return [];
  } catch (error) {
    logger.error({ error, datasetId }, 'Error getting dataset schema');
    throw error;
  }
}

/**
 * Get catalog summary statistics
 *
 * @param tenantId - Tenant filter
 * @returns Summary statistics
 */
export async function getCatalogSummary(tenantId: string | null): Promise<any> {
  logger.info({ tenantId }, 'Getting catalog summary');

  try {
    // TODO: Query actual aggregates from database
    let filtered = MOCK_DATASETS;

    if (tenantId !== null) {
      filtered = MOCK_DATASETS.filter((d) => d.tenantId === tenantId || d.tenantId === null);
    }

    const freshnessStats = {
      ok: filtered.filter((d) => d.freshnessStatus === 'ok').length,
      warn: filtered.filter((d) => d.freshnessStatus === 'warn').length,
      critical: filtered.filter((d) => d.freshnessStatus === 'critical').length,
      unknown: filtered.filter((d) => d.freshnessStatus === 'unknown').length,
    };

    const qualityStats = {
      pass: filtered.filter((d) => d.qualityStatus === 'pass').length,
      warn: filtered.filter((d) => d.qualityStatus === 'warn').length,
      fail: filtered.filter((d) => d.qualityStatus === 'fail').length,
      unknown: filtered.filter((d) => d.qualityStatus === 'unknown').length,
    };

    const avgLineageCoverage =
      filtered.reduce((sum, d) => sum + (d.lineageCoverage || 0), 0) / filtered.length;

    const avgQualityPassRate =
      filtered.reduce((sum, d) => sum + (d.qualityPassRate || 0), 0) / filtered.length;

    return {
      totalDatasets: filtered.length,
      totalMetrics: 12, // TODO: Query actual metrics count
      lineageCoveragePercent: avgLineageCoverage,
      qualityPassRateAverage: avgQualityPassRate,
      freshnessStats,
      qualityStats,
      lastUpdatedAt: new Date(),
    };
  } catch (error) {
    logger.error({ error }, 'Error getting catalog summary');
    throw error;
  }
}
