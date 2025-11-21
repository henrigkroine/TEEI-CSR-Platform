/**
 * Data Trust Catalog Types
 *
 * Types for the Data Trust Catalog feature including datasets, lineage,
 * data quality metrics, and semantic layer definitions.
 */

/**
 * Data freshness status levels
 */
export type FreshnessStatus = 'ok' | 'warn' | 'critical' | 'unknown';

/**
 * Data quality status
 */
export type QualityStatus = 'pass' | 'warn' | 'fail' | 'unknown';

/**
 * GDPR data classification categories
 */
export type GDPRCategory = 'public' | 'internal' | 'confidential' | 'pii' | 'sensitive';

/**
 * Data residency regions
 */
export type DataResidency = 'EU' | 'US' | 'UK' | 'NO' | 'GLOBAL';

/**
 * Dataset domains for logical grouping
 */
export type DatasetDomain =
  | 'impact'
  | 'reporting'
  | 'analytics'
  | 'identity'
  | 'buddy'
  | 'kintell'
  | 'compliance'
  | 'financials';

/**
 * Lineage edge types
 */
export type LineageEdgeType =
  | 'derives_from'    // Dataset A derives from Dataset B
  | 'depends_on'      // Dataset A depends on Dataset B
  | 'feeds_into'      // Dataset A feeds into Dataset B
  | 'transforms_to';  // Dataset A transforms to Dataset B

/**
 * Catalog dataset record
 */
export interface CatalogDataset {
  id: string;
  name: string;
  description: string | null;
  domain: DatasetDomain;
  owner: string;
  ownerEmail: string | null;

  // Classification
  gdprCategory: GDPRCategory;
  residency: DataResidency;

  // Schema info
  schemaVersion: string | null;
  columnCount: number | null;
  rowCountEstimate: number | null;

  // Freshness
  lastLoadedAt: Date | null;
  freshnessStatus: FreshnessStatus;
  freshnessThresholdHours: number;

  // Quality
  qualityStatus: QualityStatus;
  qualityPassRate: number | null; // 0-100
  lastQualityRunAt: Date | null;

  // Lineage
  upstreamCount: number;
  downstreamCount: number;
  lineageCoverage: number | null; // 0-100, percentage of columns with lineage

  // Metadata
  tags: string[];
  tenantId: string | null; // null for tenant-agnostic datasets
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lightweight dataset card for list views
 */
export interface DatasetCard {
  id: string;
  name: string;
  domain: DatasetDomain;
  owner: string;
  gdprCategory: GDPRCategory;
  freshnessStatus: FreshnessStatus;
  qualityStatus: QualityStatus;
  qualityPassRate: number | null;
  lastLoadedAt: Date | null;
  lastQualityRunAt: Date | null;
  tags: string[];
}

/**
 * Lineage edge representing a relationship between datasets
 */
export interface LineageEdge {
  id: string;
  sourceDatasetId: string;
  sourceDatasetName: string;
  targetDatasetId: string;
  targetDatasetName: string;
  edgeType: LineageEdgeType;

  // Column-level lineage (optional)
  sourceColumns: string[] | null;
  targetColumns: string[] | null;

  // Transformation info
  transformationType: string | null; // e.g., 'dbt_model', 'sql_query', 'python_script'
  transformationCode: string | null;

  // Metadata
  confidence: number; // 0-100, confidence in lineage accuracy
  method: 'manual' | 'inferred' | 'openlineage' | 'dbt';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lineage graph for visualization
 */
export interface LineageGraph {
  datasetId: string;
  datasetName: string;
  direction: 'upstream' | 'downstream' | 'both';
  maxDepth: number;
  nodes: LineageNode[];
  edges: LineageEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    computedAt: Date;
  };
}

/**
 * Node in lineage graph
 */
export interface LineageNode {
  id: string;
  name: string;
  domain: DatasetDomain;
  type: 'dataset' | 'metric' | 'report';
  depth: number; // Distance from root node
  freshnessStatus: FreshnessStatus;
  qualityStatus: QualityStatus;
}

/**
 * Data quality run result
 */
export interface QualityRun {
  id: string;
  datasetId: string;
  datasetName: string;

  // Run metadata
  runId: string; // Great Expectations run_id
  runAt: Date;
  runDurationMs: number;

  // Results
  status: QualityStatus;
  expectationsTotal: number;
  expectationsPassed: number;
  expectationsFailed: number;
  expectationsWarned: number;
  passRate: number; // 0-100

  // Failing expectations
  failedExpectations: FailedExpectation[];

  // Metadata
  geVersion: string | null;
  checkpointName: string | null;
  batchIdentifier: string | null;
}

/**
 * Failed expectation detail
 */
export interface FailedExpectation {
  expectationType: string;
  column: string | null;
  expectationConfig: Record<string, any>;
  result: {
    observed_value?: any;
    expected_value?: any;
    unexpected_count?: number;
    unexpected_percent?: number;
    partial_unexpected_list?: any[];
  };
  severity: 'error' | 'warning';
}

/**
 * Quality run history for charts
 */
export interface QualityRunHistory {
  datasetId: string;
  datasetName: string;
  runs: QualityRunSummary[];
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
}

/**
 * Quality run summary for time series
 */
export interface QualityRunSummary {
  runId: string;
  runAt: Date;
  status: QualityStatus;
  passRate: number;
  expectationsTotal: number;
  expectationsFailed: number;
}

/**
 * Semantic metric definition
 */
export interface SemanticMetric {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Metric metadata
  metricType: 'ratio' | 'count' | 'sum' | 'average' | 'derived';
  category: 'impact' | 'engagement' | 'financial' | 'operational';

  // Formula
  formula: string;
  formulaReadable: string; // Human-readable version

  // Data sources
  baseDatasets: string[]; // Dataset IDs this metric depends on
  baseColumns: MetricColumn[];

  // Freshness
  lastRefreshedAt: Date | null;
  refreshFrequency: string; // e.g., 'daily', 'hourly', 'on_demand'
  freshnessStatus: FreshnessStatus;

  // Exposures
  exposures: MetricExposure[];

  // Quality
  goldStandardValue: number | null;
  goldStandardTolerance: number | null; // Percentage deviation allowed
  lastValidationAt: Date | null;
  validationStatus: 'pass' | 'fail' | 'unknown';

  // dbt metadata
  dbtModelName: string | null;
  dbtMetricName: string | null;

  // Metadata
  owner: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Column used in metric calculation
 */
export interface MetricColumn {
  datasetId: string;
  datasetName: string;
  columnName: string;
  aggregation: string | null; // e.g., 'sum', 'avg', 'count'
  filter: string | null; // e.g., 'WHERE status = "active"'
}

/**
 * Where a metric is exposed/used
 */
export interface MetricExposure {
  type: 'dashboard' | 'report' | 'api' | 'export';
  name: string;
  url: string | null;
  lastAccessedAt: Date | null;
}

/**
 * Freshness SLA configuration
 */
export interface FreshnessSLA {
  datasetId: string;
  warnThresholdHours: number;
  criticalThresholdHours: number;
  timezone: string;
  schedule: string | null; // Cron expression for expected refresh
}

/**
 * Catalog summary statistics
 */
export interface CatalogSummary {
  totalDatasets: number;
  totalMetrics: number;
  lineageCoveragePercent: number;
  qualityPassRateAverage: number;
  freshnessStats: {
    ok: number;
    warn: number;
    critical: number;
    unknown: number;
  };
  qualityStats: {
    pass: number;
    warn: number;
    fail: number;
    unknown: number;
  };
  lastUpdatedAt: Date;
}

/**
 * Dataset profile for catalog detail view
 */
export interface DatasetProfile {
  dataset: CatalogDataset;
  lineageGraph: LineageGraph;
  qualityRunHistory: QualityRunHistory;
  relatedMetrics: SemanticMetric[];
  schemaDetails: ColumnSchema[] | null;
  sampleData: Record<string, any>[] | null;
  freshnessHistory: FreshnessDataPoint[];
}

/**
 * Column schema information
 */
export interface ColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  description: string | null;
  hasPII: boolean;
  hasLineage: boolean;
}

/**
 * Freshness time series data point
 */
export interface FreshnessDataPoint {
  timestamp: Date;
  hoursSinceLastLoad: number;
  status: FreshnessStatus;
}

/**
 * Export request for catalog data
 */
export interface CatalogExport {
  format: 'json' | 'csv' | 'png';
  entity: 'datasets' | 'metrics' | 'lineage' | 'quality';
  entityIds: string[];
  requestedBy: string;
  requestedAt: Date;
  tenantId: string | null;
}

/**
 * Audit log entry for catalog exports
 */
export interface CatalogAuditLog {
  id: string;
  action: 'export' | 'view' | 'update' | 'delete';
  entityType: 'dataset' | 'metric' | 'lineage' | 'quality';
  entityId: string;
  userId: string;
  tenantId: string | null;
  metadata: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

/**
 * Pagination parameters
 */
export interface CatalogPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: CatalogFilters;
}

/**
 * Filter parameters for catalog queries
 */
export interface CatalogFilters {
  domain?: DatasetDomain[];
  gdprCategory?: GDPRCategory[];
  freshnessStatus?: FreshnessStatus[];
  qualityStatus?: QualityStatus[];
  tags?: string[];
  owner?: string;
  search?: string;
}

/**
 * Paginated catalog response
 */
export interface CatalogPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: CatalogFilters;
}
