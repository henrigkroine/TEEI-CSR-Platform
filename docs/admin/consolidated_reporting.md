# Enterprise Hierarchies & Consolidated Reporting

## Overview

The Enterprise Hierarchies & Consolidated Reporting system enables organizations to:

- **Model group structures**: parent → subsidiaries → business units
- **Roll up metrics**: SROI, VIS, SDG, usage, costs across organizational hierarchy
- **Handle eliminations**: prevent double-counting in inter-company transactions
- **Apply adjustments**: manual corrections with audit trails
- **Generate reports**: consolidated annual/quarterly reports and executive decks

## Architecture

### Components

1. **Database Schema** (`packages/shared-schema/src/schema/hierarchies.ts`)
   - `orgs`: Top-level organizations
   - `org_units`: Hierarchical organizational units
   - `org_unit_members`: Tenant memberships in org units
   - `elimination_rules`: Rules to prevent double-counting
   - `consol_adjustments`: Manual adjustments with versioning
   - `fx_rates`: Foreign exchange rates
   - `consol_facts`: Rolled-up consolidated metrics
   - `consol_runs`: Audit trail of consolidation executions

2. **Consolidation Engine** (`services/analytics/src/consolidation/`)
   - `engine.ts`: Main orchestrator
   - `collectors/metric-collector.ts`: Collects metrics from tenants
   - `fx-converter.ts`: Currency conversion
   - `elimination-engine.ts`: Applies elimination rules
   - `adjustment-engine.ts`: Applies manual adjustments
   - `rollup-engine.ts`: Hierarchical metric aggregation
   - `hierarchy-validator.ts`: Data integrity validation

3. **REST APIs** (`services/api-gateway/src/routes/hierarchies/`)
   - Org CRUD: `/api/hierarchies/orgs`
   - Consolidation runs: `/api/consolidation/runs`
   - Facts queries: `/api/consolidation/facts`

4. **Report Builders** (`services/reporting/src/consolidated/`)
   - Consolidated report generation
   - PDF watermarking
   - PPTX deck export

## Data Model

### Organization Hierarchy

```
Org (ACME Group, USD)
├── Org Unit: ACME North America (USD)
│   ├── Member: ACME US Inc. (100%)
│   └── Member: ACME Canada Ltd. (100%)
├── Org Unit: ACME Europe (EUR)
│   ├── Member: ACME UK Ltd. (100%)
│   └── Member: ACME France SAS (100%)
└── Org Unit: ACME Asia-Pacific (JPY)
    └── Member: ACME Japan KK (100%)
```

### Percent Shares

- Each org unit can have multiple tenant members
- Percent shares must sum to 100% per org unit
- Supports partial ownership (e.g., 60% ACME, 40% Partner)
- Time-bound memberships (startDate, endDate)

### Metrics Consolidation Flow

1. **Collect**: Gather metrics from all tenants in scope
2. **Convert**: Apply FX rates to normalize to org base currency
3. **Eliminate**: Remove double-counted transactions
4. **Adjust**: Apply manual corrections
5. **Rollup**: Aggregate metrics up the hierarchy

## Elimination Rules

### Types

1. **EVENT_SOURCE**: Eliminate events from specific source
   ```json
   {
     "source": "benevity",
     "tenantId": "acme-us-123"
   }
   ```

2. **TENANT_PAIR**: Eliminate inter-company transactions
   ```json
   {
     "pairs": [
       { "tenantA": "acme-us-123", "tenantB": "acme-uk-456" }
     ],
     "metric": "volunteer_hours"
   }
   ```

3. **TAG_BASED**: Eliminate based on event tags
   ```json
   {
     "tags": ["internal_transfer", "duplicate"],
     "metric": "donation_amount"
   }
   ```

4. **MANUAL**: Custom elimination pattern
   ```json
   {
     "tenantId": "acme-us-123",
     "metric": "sroi",
     "percentage": 50
   }
   ```

## Manual Adjustments

### Workflow

1. **Create**: Admin creates adjustment with note
2. **Review**: Finance reviews and validates
3. **Publish**: Once published, adjustment is immutable (versioned)
4. **Apply**: Published adjustments are applied in consolidation runs

### Audit Trail

All changes tracked in `consol_adjustment_audit`:
- Who created/published/modified
- What changed (before/after)
- When it happened
- Why (mandatory note)

## FX Rate Management

### Sources

- **Manual**: Entered by admin
- **External APIs**: ECB, Fed, etc. (future)

### Usage

- Rates stored as `base/quote` pairs (e.g., EUR/USD = 1.08)
- Consolidation uses period-end rates by default
- Supports cross-rates (EUR → GBP via USD)
- Inverse rates automatically calculated

## API Examples

### Create Organization

```bash
POST /api/hierarchies/orgs
{
  "name": "ACME Group",
  "currency": "USD",
  "logoUrl": "https://example.com/logo.png"
}
```

### Run Consolidation

```bash
POST /api/consolidation/runs
{
  "orgId": "org-123",
  "period": "2024-01-01",
  "scope": {
    "orgUnitIds": ["unit-1", "unit-2"],
    "includeDescendants": true
  }
}
```

### Query Facts

```bash
GET /api/consolidation/facts?orgId=org-123&period=2024-01-01&metric=sroi
```

## Security & Tenancy

- **Org-scoped**: All endpoints check org ownership
- **RBAC**: Only org owners/admins can mutate
- **Audit**: Every hierarchy change logged
- **Immutable**: Published adjustments cannot be modified

## Performance Targets

- **Consolidation run p95**: ≤8s for 100 units × 12 months
- **Facts query p95**: ≤250ms
- **Hierarchical rollup**: O(n) where n = number of units

### Optimization Strategies

1. **Indexing**: All foreign keys and commonly queried fields
2. **Caching**: Hierarchy trees cached (invalidate on change)
3. **Batch processing**: Bulk insert for facts
4. **Parallel queries**: Collect metrics from multiple tenants concurrently

## Data Integrity

### Validation Rules

- ✅ No orphan units (parent must exist or be null for root)
- ✅ Percent shares sum to 100% per org unit
- ✅ No circular references in hierarchy
- ✅ Adjustments have mandatory notes
- ✅ Published adjustments are immutable

### Enforcement

- **Schema constraints**: Foreign keys, NOT NULL, CHECK
- **Application logic**: `HierarchyValidator` runs before consolidation
- **Pre-publish checks**: Validate adjustments before publishing

## Report Generation

### Templates

1. **Annual Consolidated Report**
   - Full year rollup
   - Eliminations appendix
   - Adjustments appendix
   - Evidence hashes

2. **Quarterly Consolidated Report**
   - 3-month rollup
   - Quarter-over-quarter comparison

3. **Investor Update**
   - Executive summary
   - Key metrics only
   - Trends and forecasts

### Output Formats

- **PDF**: Watermarked with org name + report ID
- **PPTX**: Branded deck with org theme
- **JSON/CSV**: Raw data export

## Troubleshooting

### Common Issues

1. **Missing FX rates**
   - **Symptom**: Consolidation fails with "FX rate not found"
   - **Fix**: Add missing rates via admin UI or API

2. **Percent shares don't sum to 100%**
   - **Symptom**: Hierarchy validation fails
   - **Fix**: Adjust member percent shares

3. **Circular reference in hierarchy**
   - **Symptom**: Hierarchy validation fails
   - **Fix**: Break circular parent-child relationships

4. **Consolidation run takes too long**
   - **Symptom**: Run exceeds p95 target (8s)
   - **Fix**: Reduce scope or optimize metric collection queries

## Future Enhancements

- [ ] Real-time FX rate integration (ECB, Fed APIs)
- [ ] Multi-currency reporting (show in local + base)
- [ ] Predictive consolidation (forecast next period)
- [ ] Advanced eliminations (ML-based duplicate detection)
- [ ] Blockchain-based immutable audit trail
- [ ] Multi-org comparisons (benchmarking)

## References

- [Database Schema](../../packages/shared-schema/src/schema/hierarchies.ts)
- [Consolidation Engine](../../services/analytics/src/consolidation/engine.ts)
- [API Routes](../../services/api-gateway/src/routes/hierarchies/)
- [Type Definitions](../../packages/shared-types/src/hierarchy.ts)
