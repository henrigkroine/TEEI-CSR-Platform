# FinOps Cost Explorer & Budgets

**Status**: ✅ Backend Complete | 🚧 Frontend In Progress

**Version**: 1.0.0

**Owner**: Worker 23 - FinOps Team

---

## Overview

The FinOps Cost Explorer & Budgets system provides comprehensive cost tracking, forecasting, budgeting, and policy enforcement for the TEEI CSR Platform. It tracks costs across AI tokens, compute, storage, exports, and network egress with real-time alerting and automated enforcement.

---

## Architecture

### Components

1. **Analytics Service** (`services/analytics/src/finops/`)
   - Cost aggregation from telemetry
   - Time-series cost queries
   - Forecasting algorithms
   - Anomaly detection

2. **AI Budget Service** (`services/ai-budget/`)
   - Budget CRUD operations
   - Policy configuration
   - Enforcement checks
   - Event tracking

3. **ClickHouse** - Cost fact storage and materialized views
4. **PostgreSQL** - Budget configuration and events

### Data Flow

```
Telemetry → ClickHouse → Daily Aggregation → Cost Facts
                ↓
         Cost Queries ← Explorer APIs → UI
                ↓
         Budget Checks → Policy Enforcement → Block/Alert
```

---

## Cost Categories

| Category | Description | Tracked Metrics |
|----------|-------------|-----------------|
| **AI** | LLM token usage | Input/output tokens, model, cost per request |
| **COMPUTE** | Job execution | Runtime, instance type, region |
| **STORAGE** | Data storage | Bytes stored, storage type (S3, RDS, etc.) |
| **EXPORT** | Report exports | File type (PDF, CSV, PPTX), size |
| **EGRESS** | Network transfer | Bytes transferred, source/dest regions |

---

## API Reference

### Cost Explorer APIs

**Base URL**: `/v1/analytics/finops`

#### Query Costs

```bash
GET /costs?tenantId=<id>&from=2025-01-01&to=2025-01-31&groupBy=category,model
```

**Query Parameters**:
- `tenantId` (optional): Filter by tenant
- `from` (required): Start date (ISO format)
- `to` (required): End date (ISO format)
- `groupBy` (optional): Dimensions to group by (comma-separated)
  - Options: `category`, `subcategory`, `model`, `region`, `service`, `day`, `week`, `month`
- `category`: Filter by cost category
- `region`: Filter by cloud region
- `service`: Filter by service name

**Response**:
```json
{
  "tenantId": "tenant-demo",
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "totalAmount": 4523.45,
  "currency": "USD",
  "timeSeries": [
    { "date": "2025-01-01", "amount": 145.23, "currency": "USD" },
    ...
  ],
  "breakdown": [
    { "label": "AI", "amount": 3200.00, "percentage": 70.75, "currency": "USD" },
    { "label": "COMPUTE", "amount": 800.00, "percentage": 17.68, "currency": "USD" },
    ...
  ],
  "metadata": {
    "queryDurationMs": 45,
    "dataPoints": 31
  }
}
```

#### Get Cost Summary

```bash
GET /costs/summary?tenantId=<id>&from=2025-01-01&to=2025-01-31
```

**Response**:
```json
{
  "tenantId": "tenant-demo",
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "totalCost": 4523.45,
  "currency": "USD",
  "byCategory": {
    "AI": 3200.00,
    "COMPUTE": 800.00,
    "STORAGE": 400.00,
    "EXPORT": 100.00,
    "EGRESS": 23.45
  },
  "topDriver": {
    "label": "AI - claude-3-5-sonnet-20241022",
    "amount": 2800.00
  },
  "dailyAverage": 145.92
}
```

#### Top Cost Drivers

```bash
GET /costs/top-drivers?tenantId=<id>&from=2025-01-01&to=2025-01-31&limit=10
```

#### Costs by Model

```bash
GET /costs/by-model?tenantId=<id>&from=2025-01-01&to=2025-01-31
```

#### Costs by Region

```bash
GET /costs/by-region?tenantId=<id>&from=2025-01-01&to=2025-01-31
```

#### Costs by Service

```bash
GET /costs/by-service?tenantId=<id>&from=2025-01-01&to=2025-01-31
```

#### Generate Forecast

```bash
GET /forecast?tenantId=<id>&from=2025-01-01&to=2025-01-31&forecastDays=30&method=simple
```

**Query Parameters**:
- `tenantId` (required): Tenant ID
- `from` (required): Historical start date
- `to` (required): Historical end date
- `forecastDays` (optional): Days to forecast (default: 30)
- `method` (optional): Forecast method
  - `simple`: Linear regression
  - `holtwinters`: Moving average

**Response**:
```json
{
  "tenantId": "tenant-demo",
  "historicalRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "forecastRange": { "from": "2025-02-01", "to": "2025-03-02" },
  "method": "simple",
  "forecast": [
    {
      "date": "2025-02-01",
      "predictedAmount": 150.25,
      "lowerBound": 120.00,
      "upperBound": 180.50,
      "currency": "USD"
    },
    ...
  ],
  "metadata": {
    "accuracy": 85.5,
    "confidence": 95
  }
}
```

#### Detect Anomalies

```bash
GET /anomalies?tenantId=<id>&from=2025-01-01&to=2025-01-31&minSeverity=high
```

**Query Parameters**:
- `tenantId` (required): Tenant ID
- `from` (required): Start date
- `to` (required): End date
- `minSeverity` (optional): Minimum severity (`low`, `medium`, `high`)
- `category` (optional): Filter by cost category

**Response**:
```json
{
  "tenantId": "tenant-demo",
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "anomalies": [
    {
      "id": "tenant-demo-2025-01-15-AI-claude-3-5-sonnet-20241022",
      "tenantId": "tenant-demo",
      "date": "2025-01-15",
      "category": "AI",
      "subcategory": "claude-3-5-sonnet-20241022",
      "expectedAmount": 100.00,
      "actualAmount": 250.00,
      "deviation": 150.00,
      "severity": "high",
      "currency": "USD",
      "detectedAt": "2025-01-16T00:00:00Z"
    },
    ...
  ],
  "summary": {
    "total": 5,
    "high": 2,
    "medium": 2,
    "low": 1
  }
}
```

#### Trigger Aggregation

```bash
POST /aggregate
Content-Type: application/json

{
  "fromDate": "2025-01-01",
  "toDate": "2025-01-31"
}
```

**Response**:
```json
{
  "status": "completed",
  "message": "Cost aggregation completed successfully",
  "dateRange": { "from": "2025-01-01", "to": "2025-01-31" },
  "ai": { "recordsAggregated": 1250 },
  "compute": { "recordsAggregated": 450 },
  "storage": { "recordsAggregated": 31 },
  "export": { "recordsAggregated": 125 },
  "egress": { "recordsAggregated": 89 },
  "totalRecords": 1945,
  "completedAt": "2025-02-01T00:00:00Z"
}
```

---

### Budget Management APIs

**Base URL**: `/api/ai-budget/finops`

#### Create Budget

```bash
POST /budgets
Content-Type: application/json

{
  "tenantId": "tenant-demo",
  "name": "Monthly AI Budget",
  "description": "Budget for AI token usage",
  "amount": 5000,
  "currency": "USD",
  "period": "monthly",
  "categories": ["AI"],
  "policy": {
    "notifyThreshold": 80,
    "enforceThreshold": 100,
    "actions": ["notify", "alert_admins", "block_ai"],
    "notifyEmails": ["admin@demo.com"]
  },
  "startDate": "2025-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Budget created successfully",
  "budget": {
    "id": "uuid-here",
    "tenantId": "tenant-demo",
    "name": "Monthly AI Budget",
    ...
  }
}
```

#### Get Budget

```bash
GET /budgets/:id
```

#### List Budgets

```bash
GET /budgets/tenant/:tenantId?enabledOnly=true
```

#### Update Budget

```bash
PATCH /budgets/:id
Content-Type: application/json

{
  "amount": 6000,
  "policy": {
    "notifyThreshold": 75
  }
}
```

#### Delete Budget

```bash
DELETE /budgets/:id
```

#### Get Budget Status

```bash
GET /budgets/:id/status
```

**Response**:
```json
{
  "budget": { ... },
  "currentSpend": 4200.00,
  "percentageUsed": 84.00,
  "remainingAmount": 800.00,
  "projectedEndOfPeriodSpend": 5200.00,
  "status": "warning",
  "triggeredActions": ["notify", "alert_admins"],
  "lastCheckedAt": "2025-01-25T12:00:00Z"
}
```

#### List Tenant Budget Statuses

```bash
GET /budgets/tenant/:tenantId/status
```

**Response**:
```json
{
  "tenantId": "tenant-demo",
  "budgets": [ ... ],
  "totalBudget": 10000.00,
  "totalSpend": 7500.00,
  "currency": "USD"
}
```

#### Get Budget Events

```bash
GET /budgets/:id/events?limit=50
```

**Response**:
```json
{
  "budgetId": "uuid-here",
  "events": [
    {
      "id": "event-uuid",
      "budgetId": "uuid-here",
      "tenantId": "tenant-demo",
      "eventType": "threshold_reached",
      "threshold": 80,
      "currentSpend": 4000.00,
      "budgetAmount": 5000.00,
      "actions": ["notify", "alert_admins"],
      "triggeredAt": "2025-01-20T15:30:00Z",
      "metadata": {}
    },
    ...
  ],
  "count": 5
}
```

#### Check Enforcement

```bash
POST /budgets/:id/check-enforcement
Content-Type: application/json

{
  "operationType": "ai_generation"
}
```

**Response (Allowed)**:
```json
{
  "allowed": true,
  "currentSpend": 4200.00,
  "budgetAmount": 5000.00,
  "percentageUsed": 84.00,
  "actions": ["notify", "alert_admins"]
}
```

**Response (Blocked)**:
```json
{
  "allowed": false,
  "reason": "Budget Monthly AI Budget has exceeded 100% threshold. Operation blocked by policy.",
  "currentSpend": 5100.00,
  "budgetAmount": 5000.00,
  "percentageUsed": 102.00,
  "actions": ["notify", "alert_admins", "block_ai"]
}
```

**Response (Rate Limited)**:
```json
{
  "allowed": true,
  "rateLimited": true,
  "rateLimitFactor": 0.5,
  "reason": "Budget Monthly AI Budget is in rate limit mode (0.5x factor).",
  ...
}
```

---

## Policy Actions

| Action | Description | When Triggered |
|--------|-------------|----------------|
| `notify` | Send notification to budget owner | `notifyThreshold` reached |
| `alert_admins` | Send alert to admin emails | `notifyThreshold` reached |
| `rate_limit` | Reduce request rate by `rateLimitFactor` | `enforceThreshold` reached |
| `block_ai` | Block AI generation requests | `enforceThreshold` reached |
| `block_export` | Block report export requests | `enforceThreshold` reached |

### Policy Configuration Examples

#### Soft Enforcement (Alerts Only)

```json
{
  "notifyThreshold": 80,
  "enforceThreshold": 100,
  "actions": ["notify", "alert_admins"],
  "notifyEmails": ["finops@company.com"]
}
```

#### Hard Enforcement (Block AI)

```json
{
  "notifyThreshold": 75,
  "enforceThreshold": 95,
  "actions": ["notify", "alert_admins", "block_ai"],
  "notifyEmails": ["finops@company.com", "cto@company.com"]
}
```

#### Rate Limiting

```json
{
  "notifyThreshold": 80,
  "enforceThreshold": 100,
  "actions": ["notify", "rate_limit"],
  "rateLimitFactor": 0.5
}
```

---

## Scheduled Jobs

### Daily Cost Aggregation

Runs daily at 1:00 AM UTC to aggregate previous day's telemetry into cost facts.

**Trigger**: Cron (`0 1 * * *`)

**Process**:
1. Aggregate AI token telemetry → cost_facts
2. Aggregate compute telemetry → cost_facts
3. Aggregate storage telemetry → cost_facts
4. Aggregate export telemetry → cost_facts
5. Aggregate egress telemetry → cost_facts
6. Update sync status

### Daily Budget Check

Runs daily at 2:00 AM UTC to update budget spend and trigger policies.

**Trigger**: Cron (`0 2 * * *`)

**Process**:
1. For each enabled budget:
   - Query current period spend from ClickHouse
   - Update budget `current_spend`
   - Calculate projected end-of-period spend
   - Check thresholds and trigger policy actions
   - Record budget events
   - Send notifications if configured

### Daily Anomaly Detection

Runs daily at 3:00 AM UTC to detect cost anomalies.

**Trigger**: Cron (`0 3 * * *`)

**Process**:
1. For each tenant:
   - Query yesterday's costs by category/subcategory
   - Compare against historical mean and std dev
   - Identify anomalies (>2σ deviation)
   - Classify severity (low, medium, high)
   - Store anomalies for review
   - Send alerts for high-severity anomalies

---

## Database Schemas

### ClickHouse: cost_facts

Primary table for cost data.

```sql
CREATE TABLE cost_facts (
  id UUID,
  tenant_id String,
  day Date,
  category LowCardinality(String), -- AI, COMPUTE, STORAGE, EXPORT, EGRESS
  subcategory String, -- model, instance type, etc.
  region LowCardinality(Nullable(String)),
  service LowCardinality(Nullable(String)),
  amount Decimal(18, 6),
  currency LowCardinality(String),
  metadata String, -- JSON
  created_at DateTime,
  updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, category, subcategory);
```

### PostgreSQL: finops_budgets

Budget configuration table.

```sql
CREATE TABLE finops_budgets (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255),
  name VARCHAR(255),
  description TEXT,
  amount DECIMAL(12, 2),
  currency VARCHAR(3),
  period VARCHAR(20), -- monthly, quarterly, annual
  categories TEXT[],

  -- Policy
  notify_threshold INTEGER,
  enforce_threshold INTEGER,
  actions TEXT[],
  notify_emails TEXT[],
  rate_limit_factor DECIMAL(3, 2),

  -- Period tracking
  start_date DATE,
  end_date DATE,
  current_period_start DATE,
  current_period_end DATE,

  -- Spend tracking
  current_spend DECIMAL(12, 2),
  projected_spend DECIMAL(12, 2),

  -- Status
  enabled BOOLEAN,
  status VARCHAR(20), -- ok, warning, exceeded
  triggered_actions TEXT[],

  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by VARCHAR(255),

  UNIQUE(tenant_id, name)
);
```

---

## Performance Characteristics

### Query Performance Targets

| Endpoint | p95 Latency | Cache TTL |
|----------|-------------|-----------|
| `/costs` | <250ms | 10 minutes |
| `/costs/summary` | <150ms | 10 minutes |
| `/forecast` | <500ms | 1 hour |
| `/anomalies` | <300ms | 10 minutes |
| `/budgets/:id/status` | <100ms | None (real-time) |

### Aggregation Performance

- **Daily aggregation**: <60s for 1,000 tenants
- **Backfill**: ~5s per day for single tenant
- **Idempotent**: Safe to re-run for same date range

---

## Event Catalog

### finops.budget.threshold

Emitted when a budget crosses a threshold (notify or enforce).

**Payload**:
```json
{
  "eventType": "finops.budget.threshold",
  "budgetId": "uuid",
  "tenantId": "tenant-demo",
  "threshold": 80,
  "currentSpend": 4000.00,
  "budgetAmount": 5000.00,
  "percentageUsed": 80.00,
  "actions": ["notify", "alert_admins"],
  "timestamp": "2025-01-20T15:30:00Z"
}
```

### finops.budget.exceeded

Emitted when a budget is exceeded (enforce threshold reached).

**Payload**:
```json
{
  "eventType": "finops.budget.exceeded",
  "budgetId": "uuid",
  "tenantId": "tenant-demo",
  "currentSpend": 5100.00,
  "budgetAmount": 5000.00,
  "percentageUsed": 102.00,
  "actions": ["block_ai"],
  "timestamp": "2025-01-25T18:00:00Z"
}
```

### finops.anomaly.detected

Emitted when a cost anomaly is detected.

**Payload**:
```json
{
  "eventType": "finops.anomaly.detected",
  "tenantId": "tenant-demo",
  "date": "2025-01-15",
  "category": "AI",
  "subcategory": "claude-3-5-sonnet-20241022",
  "expectedAmount": 100.00,
  "actualAmount": 250.00,
  "deviation": 150.00,
  "severity": "high",
  "timestamp": "2025-01-16T00:00:00Z"
}
```

---

## Next Steps (Frontend Implementation)

### UI Components (To Be Built)

1. **FinOps Overview Dashboard** (`apps/corp-cockpit-astro/src/features/finops/`)
   - Cost trend chart (last 30 days)
   - Top drivers list
   - Forecast projection
   - Recent anomalies

2. **Budgets Management UI**
   - Budget list with status indicators
   - Create/edit budget form
   - Policy configuration wizard
   - Budget progress bars
   - Alert thresholds visualization

3. **Drill-Down Views**
   - Costs by model (AI category)
   - Costs by region
   - Costs by service
   - CSV export functionality

4. **Astro Pages**
   - `/cockpit/[companyId]/finops` - Overview
   - `/cockpit/[companyId]/finops/budgets` - Budget list
   - `/cockpit/[companyId]/finops/budgets/[id]` - Budget details
   - `/cockpit/[companyId]/finops/costs` - Drill-down explorer

### Sample UI Implementation

See `/docs/ops/finops-ui-examples.md` for React component examples.

---

## Testing

### Unit Tests (≥90% Coverage Required)

- **Aggregators** (`services/analytics/src/finops/aggregators.test.ts`)
- **Forecast** (`services/analytics/src/finops/forecast.test.ts`)
- **Anomalies** (`services/analytics/src/finops/anomalies.test.ts`)
- **Budget DB** (`services/ai-budget/src/db/finops-budgets.test.ts`)

### Contract Tests

- **Cost APIs** (OpenAPI validation)
- **Budget APIs** (OpenAPI validation)

### E2E Tests (Playwright)

1. Create budget with policy
2. Simulate spend approaching threshold
3. Verify notification triggered
4. Simulate spend exceeding threshold
5. Verify enforcement action triggered
6. Verify operation blocked

---

## Monitoring & Alerts

### Grafana Dashboards

**FinOps Operations Dashboard**
- Daily aggregation success rate
- Query performance (p50, p95, p99)
- Budget check completion rate
- Anomaly detection runs

**FinOps Business Dashboard**
- Total platform costs (all tenants)
- Cost breakdown by category
- Top spending tenants
- Budget utilization (avg across tenants)
- Anomalies detected (count by severity)

### Alerts

1. **Aggregation Failure**: Daily aggregation failed for >5% of tenants
2. **Query Performance Degradation**: p95 latency >500ms for 5 minutes
3. **Budget Exceeded**: High-value budget (>$10k) exceeded
4. **Anomaly Spike**: >10 high-severity anomalies in one day

---

## Security

- **Tenant Isolation**: All queries scoped by `tenant_id`
- **PII Redaction**: Cost metadata does not include PII
- **RBAC**: Budget management requires `finops:admin` role
- **Audit Trail**: All budget changes and policy triggers logged

---

## Support & Troubleshooting

### Common Issues

**Issue**: Costs not updating

**Solution**: Check daily aggregation job status in `finops_sync_status` table.

**Issue**: Budget not triggering alerts

**Solution**: Verify budget is enabled and current period is active.

**Issue**: Forecast accuracy is low

**Solution**: Ensure at least 30 days of historical data exists.

---

## Changelog

### v1.0.0 (2025-01-17)

- Initial release
- Cost Explorer APIs (costs, forecast, anomalies)
- Budget CRUD APIs
- Policy enforcement framework
- ClickHouse schemas and materialized views
- PostgreSQL budget configuration
- Daily aggregation, budget check, and anomaly detection jobs
- Complete API documentation

---

## References

- [OpenAPI Spec](../../packages/openapi/finops.yaml)
- [Shared Types](../../packages/shared-types/src/finops.ts)
- [ClickHouse Schema](../../services/analytics/src/clickhouse/finops-schema.sql)
- [PostgreSQL Schema](../../services/ai-budget/src/db/finops-schema.sql)
