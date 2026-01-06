# Data Trust Catalog

The Data Trust Catalog provides end-to-end visibility into data governance, lineage, quality metrics, and semantic layer definitions for the TEEI CSR Platform.

## Overview

The catalog exposes:
- **Dataset Metadata**: Ownership, classification, freshness, quality status
- **Lineage Graphs**: Upstream/downstream dependencies with column-level tracking
- **Data Quality**: Great Expectations test results and trends
- **Semantic Metrics**: dbt-defined business metrics with exposures
- **Governance**: GDPR classification, residency, and audit logging

## Architecture

### Backend Services

**Analytics Service** (`services/analytics`)
- **Base URL**: `http://localhost:3008/v1/analytics/catalog`
- **Endpoints**: See [OpenAPI Spec](../../packages/openapi/trust-catalog.yaml)

**API Gateway** (Future)
- **Proxied URL**: `http://localhost:3000/trust/catalog`
- **Auth**: JWT bearer token with tenant scoping

### Data Sources

- **PostgreSQL**: Dataset metadata, lineage tables (`metric_lineage`, `report_lineage`)
- **ClickHouse**: OpenLineage events (`lineage_events`, `dataset_profiles`)
- **Great Expectations**: Quality run results (JSON artifacts, future: dedicated tables)
- **dbt**: Semantic layer (`dbt_metrics`, exposures from manifest.json)

## API Endpoints

### GET /catalog/datasets
List catalog datasets with filters and pagination.

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Page size (default: 20, max: 100)
- `domain` (string[]): Filter by domain (impact, reporting, analytics, etc.)
- `gdprCategory` (string[]): Filter by GDPR category (public, internal, pii, etc.)
- `freshnessStatus` (string[]): Filter by freshness (ok, warn, critical)
- `qualityStatus` (string[]): Filter by quality (pass, warn, fail)
- `search` (string): Search by name or description
- `sortBy` (string): Sort field (name, lastLoadedAt, qualityPassRate)
- `sortOrder` (string): asc | desc

**Response**: Paginated `DatasetCard[]`

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/datasets?domain=impact&freshnessStatus=ok&limit=10
```

### GET /catalog/datasets/:datasetId
Get detailed dataset profile with lineage, quality history, and schema.

**Path Parameters**:
- `datasetId` (uuid): Dataset ID

**Query Parameters**:
- `includeLineage` (bool): Include lineage graph (default: true)
- `includeQualityHistory` (bool): Include quality runs (default: true)
- `includeSchema` (bool): Include column schema (default: false)

**Response**: `DatasetProfile` with ETag caching

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/datasets/550e8400-e29b-41d4-a716-446655440000
```

### GET /catalog/lineage/:datasetId
Get lineage graph for a dataset.

**Path Parameters**:
- `datasetId` (uuid): Dataset ID

**Query Parameters**:
- `direction` (string): upstream | downstream | both (default: both)
- `maxDepth` (int): Max traversal depth (default: 3, max: 10)

**Response**: `LineageGraph` with nodes and edges

**Caching**: ETag support, Cache-Control: max-age=300

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/lineage/550e8400-e29b-41d4-a716-446655440000?direction=downstream&maxDepth=5
```

### GET /catalog/quality/:datasetId
Get quality run history for a dataset.

**Path Parameters**:
- `datasetId` (uuid): Dataset ID

**Query Parameters**:
- `days` (int): Days of history (default: 7, max: 90)

**Response**: `QualityRunHistory` with trend analysis

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/quality/550e8400-e29b-41d4-a716-446655440000?days=30
```

### GET /catalog/metrics
List semantic metrics from dbt semantic layer.

**Query Parameters**:
- `page` (int): Page number
- `limit` (int): Page size
- `category` (string[]): Filter by category (impact, engagement, financial)
- `metricType` (string[]): Filter by type (ratio, count, sum, average)
- `search` (string): Search by name or description

**Response**: Paginated `SemanticMetric[]`

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/metrics?category=impact
```

### GET /catalog/summary
Get catalog summary statistics.

**Response**: `CatalogSummary` with counts and aggregates

**Example**:
```bash
curl http://localhost:3008/v1/analytics/catalog/summary
```

### POST /catalog/export
Export catalog data in JSON, CSV, or PNG format.

**Body**:
```json
{
  "format": "json" | "csv" | "png",
  "entity": "datasets" | "metrics" | "lineage" | "quality",
  "entityIds": ["uuid1", "uuid2"]
}
```

**Response**: Exported data in requested format

**Audit**: Logs export action to audit log

### GET /catalog/quality-events
Server-Sent Events stream for real-time quality run completions.

**Response**: SSE stream with `quality_run_complete` and `quality_run_failed` events

**Example**:
```javascript
const eventSource = new EventSource('/v1/analytics/catalog/quality-events');
eventSource.addEventListener('quality_run_complete', (e) => {
  const data = JSON.parse(e.data);
  console.log('Quality run completed:', data);
});
```

## Security & Tenancy

### Tenant Scoping
All catalog queries are automatically scoped to the authenticated user's tenant via the `tenantScopingMiddleware`.

- **Tenant Users**: See only datasets for their tenant + tenant-agnostic datasets (`tenantId: null`)
- **Platform Admins**: See all datasets across all tenants

### Audit Logging
All catalog access is logged:
- Action: view, export, update, delete
- Entity: dataset, metric, lineage, quality
- User, tenant, IP address, timestamp
- Metadata: export format, entity count, etc.

**Audit logs** are written to stdout (future: dedicated audit service).

## Data Governance

### GDPR Classification
Datasets are tagged with GDPR categories:
- `public`: Publicly accessible data
- `internal`: Internal company data
- `confidential`: Restricted access
- `pii`: Personal Identifiable Information
- `sensitive`: Highly sensitive (health, financial, etc.)

### Data Residency
Datasets track residency regions:
- `EU`: Europe
- `US`: United States
- `UK`: United Kingdom
- `NO`: Norway
- `GLOBAL`: Multi-region

### Retention Policies
(TODO: Implement TTL policies per GDPR category)

## Freshness SLAs

Freshness status is computed server-side based on `lastLoadedAt` and domain-specific thresholds:

| Domain | Warn Threshold | Critical Threshold |
|--------|---------------|-------------------|
| impact | 24h | 72h |
| reporting | 12h | 48h |
| analytics | 6h | 24h |
| identity | 1h | 6h |
| buddy | 12h | 48h |
| kintell | 24h | 72h |
| compliance | 6h | 24h |
| financials | 24h | 168h (1 week) |

**Status Levels**:
- `ok`: Data is fresh
- `warn`: Data is approaching staleness
- `critical`: Data is stale
- `unknown`: No load timestamp available

## Quality Thresholds

Quality status is computed from Great Expectations pass rates:

- **Pass**: ≥95% pass rate
- **Warn**: 90-95% pass rate
- **Fail**: <90% pass rate
- **Unknown**: No quality run results

## Implementation Status

### ✅ Completed (Worker 9 - Phase 1)

- [x] TypeScript types (`packages/shared-types/src/catalog.ts`)
- [x] OpenAPI spec (`packages/openapi/trust-catalog.yaml`)
- [x] Catalog API routes (`services/analytics/src/catalog/routes/catalog.ts`)
- [x] Freshness SLA computation (`services/analytics/src/catalog/utils/freshness.ts`)
- [x] Quality status computation (`services/analytics/src/catalog/utils/quality.ts`)
- [x] Tenant scoping middleware (`services/analytics/src/catalog/middleware/tenant-scoping.ts`)
- [x] Mock query builders (datasets, lineage, quality, metrics)
- [x] ETag caching for lineage/dataset endpoints
- [x] SSE endpoint for quality events
- [x] Export endpoint (JSON/CSV/PNG stubs)

### 🚧 TODO (Phase 2)

#### Backend
- [ ] Replace mock query builders with actual DB queries:
  - [ ] Query PostgreSQL for dataset metadata
  - [ ] Query ClickHouse for OpenLineage events
  - [ ] Query Great Expectations results (JSON or DB)
  - [ ] Query dbt manifest.json for semantic metrics
- [ ] Implement lineage graph computation from OpenLineage events
- [ ] Implement PNG export for lineage graphs (use mermaid or D3)
- [ ] Wire API gateway proxy routes (`services/api-gateway/src/routes/trust/`)
- [ ] Add Redis read-through cache for lineage graphs
- [ ] Subscribe to quality run completion events (NATS/Redis pub-sub)

#### Frontend
- [ ] Cockpit UI: Dataset Cards grid (`apps/corp-cockpit-astro/src/features/data-trust/`)
  - [ ] DatasetCard component with badges
  - [ ] Filters (domain, GDPR, freshness, quality)
  - [ ] Pagination
- [ ] Cockpit UI: Lineage view
  - [ ] Interactive graph with D3/Cytoscape
  - [ ] Collapse/expand nodes
  - [ ] Click-through to dataset details
- [ ] Cockpit UI: Quality tab
  - [ ] Test suite table
  - [ ] Failed expectations list
  - [ ] 7-day trend chart
- [ ] Cockpit UI: Metrics tab
  - [ ] Semantic metric cards
  - [ ] Last refresh time
  - [ ] Exposures list
- [ ] Trust Center public pages (`apps/trust-center/src/pages/data-trust/`)
  - [ ] Public summary with redacted names
  - [ ] Lineage viewer with publicId

#### Tests
- [ ] Unit tests for catalog resolvers (≥90% coverage)
- [ ] Contract tests for all endpoints
- [ ] Playwright E2E tests for UI flows
- [ ] Performance tests (p95 API ≤200ms list, ≤600ms lineage)
- [ ] A11y tests for keyboard navigation and WCAG AA

#### Infrastructure
- [ ] Update `k8s/services/analytics.yaml` to expose catalog endpoints
- [ ] Create `.github/workflows/data-trust-ci.yml` workflow
- [ ] Set up Grafana dashboard for catalog metrics

#### TypeScript Client
- [ ] Generate client from OpenAPI spec:
  ```bash
  pnpm -w codegen:trust-catalog
  ```

## Development

### Running Locally

1. Start analytics service:
   ```bash
   cd services/analytics
   pnpm dev
   ```

2. Service runs on `http://localhost:3008`

3. Test endpoints:
   ```bash
   curl http://localhost:3008/v1/analytics/catalog/summary
   ```

### Adding New Datasets

To add a dataset to the catalog:

1. Add metadata to `services/analytics/src/catalog/queries/datasets.ts` (MOCK_DATASETS)
2. (Future) Insert into `catalog_datasets` table via migration

### Adding Quality Suites

To add Great Expectations suite for a dataset:

1. Create GE suite in `data_quality/great_expectations/expectations/`
2. Add checkpoint in `data_quality/great_expectations/checkpoints/`
3. Run suite:
   ```bash
   pnpm dq:ci
   ```
4. Results will appear in catalog quality history

### Lineage Instrumentation

To emit OpenLineage events from a service:

1. Add `@teei/observability` dependency
2. Emit START_RUN, COMPLETE_RUN events with dataset IN/OUT:
   ```typescript
   import { emitLineageEvent } from '@teei/observability';

   await emitLineageEvent({
     eventType: 'COMPLETE',
     job: { namespace: 'teei', name: 'sroi_calculation' },
     inputs: [{ namespace: 'postgres', name: 'outcome_scores' }],
     outputs: [{ namespace: 'postgres', name: 'metrics_company_period' }],
   });
   ```
3. Lineage will appear in catalog

## Troubleshooting

### Dataset not appearing in catalog
- Check if metadata exists in `catalog_datasets` table (or MOCK_DATASETS)
- Verify tenant scoping (dataset must belong to your tenant or be tenant-agnostic)

### Lineage graph empty
- Check if OpenLineage events are being emitted by services
- Verify ClickHouse `lineage_events` table has data
- Check `maxDepth` parameter (increase if needed)

### Quality status unknown
- Verify Great Expectations suite exists for the dataset
- Run GE checkpoint manually: `pnpm dq:ci`
- Check quality results are being written to DB

### Freshness status always critical
- Check `lastLoadedAt` timestamp in dataset metadata
- Verify ingestion jobs are running and updating timestamps
- Adjust freshness thresholds if defaults are too aggressive

## References

- [OpenAPI Spec](../../packages/openapi/trust-catalog.yaml)
- [TypeScript Types](../../packages/shared-types/src/catalog.ts)
- [Great Expectations Docs](https://docs.greatexpectations.io/)
- [OpenLineage Spec](https://openlineage.io/docs/spec/)
- [dbt Semantic Layer](https://docs.getdbt.com/docs/build/metrics)
- [Worker 5 Plan](../../reports/j1_openlineage_plan.md) - OpenLineage instrumentation
- [AGENTS.md](../../AGENTS.md) - Multi-agent orchestration plan

## Support

For questions or issues:
- File issue at: https://github.com/anthropics/claude-code/issues
- Contact: platform@teei.io
