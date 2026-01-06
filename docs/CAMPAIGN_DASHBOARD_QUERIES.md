# Campaign Dashboard Queries

**Purpose**: Ready-to-use SQL queries for Campaign Dashboard implementation
**Target Audience**: Agent 4.5 (dashboard-data-provider), Agent 6.2 (campaign-detail-dashboard)
**Schema**: `campaign_metrics_snapshots`
**Version**: 1.0.0

---

## 📊 Dashboard Component Queries

### 1. Campaign Overview Metrics (Top KPI Cards)

**Use Case**: Display current state of campaign in 4 KPI cards

```typescript
// Query: Get latest snapshot for campaign
interface CampaignOverviewMetrics {
  volunteersUtilization: number;
  beneficiariesUtilization: number;
  budgetUtilization: number;
  impactScore: number; // (SROI + VIS/20) / 2 = normalized 0-10 scale
}
```

```sql
-- Get most recent snapshot for campaign
SELECT
  volunteers_utilization,
  volunteers_current,
  volunteers_target,
  beneficiaries_utilization,
  beneficiaries_current,
  beneficiaries_target,
  budget_utilization,
  budget_spent,
  budget_allocated,
  sroi_score,
  average_vis_score,
  total_hours_logged,
  total_sessions_completed,
  snapshot_date,
  full_snapshot->>'status' as status,
  full_snapshot->>'campaignName' as campaign_name
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**API Endpoint**: `GET /api/campaigns/:campaignId/overview`

**Response Shape**:
```json
{
  "campaignId": "uuid",
  "campaignName": "Mentors for Syrian Refugees - Q1 2025",
  "status": "active",
  "snapshotDate": "2025-11-22T00:00:00Z",
  "capacity": {
    "volunteers": {
      "current": 45,
      "target": 50,
      "utilization": 0.90,
      "status": "warning"
    },
    "beneficiaries": {
      "current": 38,
      "target": 50,
      "utilization": 0.76,
      "status": "healthy"
    },
    "budget": {
      "spent": 18500.00,
      "allocated": 25000.00,
      "utilization": 0.74,
      "currency": "EUR",
      "status": "healthy"
    }
  },
  "impact": {
    "sroi": 5.67,
    "vis": 82.3,
    "hoursLogged": 1245.5,
    "sessionsCompleted": 243,
    "impactScore": 8.45
  }
}
```

---

### 2. Capacity Utilization Gauge

**Use Case**: Visual gauge showing % utilization with thresholds

```sql
-- Get capacity metrics for gauge visualization
SELECT
  'volunteers' as metric_type,
  volunteers_current as current_value,
  volunteers_target as target_value,
  volunteers_utilization as utilization,
  CASE
    WHEN volunteers_utilization >= 1.0 THEN 'critical'
    WHEN volunteers_utilization >= 0.8 THEN 'warning'
    WHEN volunteers_utilization >= 0.5 THEN 'healthy'
    ELSE 'low'
  END as status
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1

UNION ALL

SELECT
  'beneficiaries' as metric_type,
  beneficiaries_current as current_value,
  beneficiaries_target as target_value,
  beneficiaries_utilization as utilization,
  CASE
    WHEN beneficiaries_utilization >= 1.0 THEN 'critical'
    WHEN beneficiaries_utilization >= 0.8 THEN 'warning'
    WHEN beneficiaries_utilization >= 0.5 THEN 'healthy'
    ELSE 'low'
  END as status
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1

UNION ALL

SELECT
  'budget' as metric_type,
  budget_spent as current_value,
  budget_allocated as target_value,
  budget_utilization as utilization,
  CASE
    WHEN budget_utilization >= 1.0 THEN 'critical'
    WHEN budget_utilization >= 0.8 THEN 'warning'
    WHEN budget_utilization >= 0.5 THEN 'healthy'
    ELSE 'low'
  END as status
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**UI Component**: Semi-circular gauge with color bands
- 0-50%: Green (low)
- 50-80%: Blue (healthy)
- 80-100%: Yellow (warning)
- 100%+: Red (critical)

---

### 3. Impact Metrics Time-Series Chart

**Use Case**: Line chart showing SROI and VIS trends over campaign period

```sql
-- Get daily SROI/VIS trends for last 90 days
SELECT
  DATE_TRUNC('day', snapshot_date) as date,
  AVG(sroi_score) as sroi,
  AVG(average_vis_score) as vis,
  SUM(total_hours_logged) as hours,
  SUM(total_sessions_completed) as sessions
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
  AND snapshot_date >= COALESCE($2, NOW() - INTERVAL '90 days')
  AND snapshot_date <= COALESCE($3, NOW())
GROUP BY DATE_TRUNC('day', snapshot_date)
ORDER BY date ASC;
```

**Chart Config**:
- **Type**: Dual-axis line chart
- **Left Y-Axis**: SROI (scale: 0-10)
- **Right Y-Axis**: VIS (scale: 0-100)
- **X-Axis**: Date
- **Lines**:
  - SROI: Blue, solid, 2px
  - VIS: Green, dashed, 2px

**Interactive Features**:
- Hover tooltip shows exact values + date
- Click data point to drill into evidence for that day
- Date range selector (7d, 30d, 90d, All)

---

### 4. Capacity Trend (Stacked Area Chart)

**Use Case**: Show volunteers and beneficiaries growth over time vs targets

```sql
-- Get capacity trends for stacked area chart
SELECT
  snapshot_date as date,
  volunteers_current,
  volunteers_target,
  beneficiaries_current,
  beneficiaries_target,
  sessions_current,
  sessions_target
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
  AND snapshot_date >= $2
  AND snapshot_date <= $3
ORDER BY snapshot_date ASC;
```

**Chart Config**:
- **Type**: Stacked area chart with target lines
- **Areas** (stacked):
  - Beneficiaries (bottom): Light blue, 60% opacity
  - Volunteers (top): Dark blue, 60% opacity
- **Lines** (overlaid):
  - Beneficiaries Target: Dashed red line
  - Volunteers Target: Dashed orange line

---

### 5. Budget Burn-Rate Chart

**Use Case**: Track budget spending rate vs linear projection

```sql
-- Get budget burn-rate with linear projection
WITH campaign_dates AS (
  SELECT
    (full_snapshot->>'startDate')::date as start_date,
    (full_snapshot->>'endDate')::date as end_date,
    budget_allocated
  FROM campaign_metrics_snapshots
  WHERE campaign_id = $1
  ORDER BY snapshot_date DESC
  LIMIT 1
),
actual_spend AS (
  SELECT
    snapshot_date::date as date,
    budget_spent,
    budget_allocated,
    budget_spent / NULLIF(budget_allocated, 0) as burn_rate
  FROM campaign_metrics_snapshots
  WHERE campaign_id = $1
    AND snapshot_date >= (SELECT start_date FROM campaign_dates)
  ORDER BY snapshot_date ASC
)
SELECT
  a.date,
  a.budget_spent as actual_spent,
  a.budget_allocated as total_budget,
  -- Linear projection: (days_elapsed / total_days) * budget
  (
    EXTRACT(EPOCH FROM (a.date - c.start_date)) /
    EXTRACT(EPOCH FROM (c.end_date - c.start_date))
  ) * c.budget_allocated as projected_spend,
  a.burn_rate,
  CASE
    WHEN a.burn_rate > (
      EXTRACT(EPOCH FROM (a.date - c.start_date)) /
      EXTRACT(EPOCH FROM (c.end_date - c.start_date))
    ) THEN 'over_budget'
    ELSE 'on_track'
  END as status
FROM actual_spend a
CROSS JOIN campaign_dates c
ORDER BY a.date ASC;
```

**Chart Config**:
- **Type**: Dual-line chart
- **Lines**:
  - Actual Spend: Solid blue line
  - Projected Spend: Dashed gray line (linear projection)
  - Total Budget: Horizontal red line (budget ceiling)
- **Shading**: Fill area between actual and projected (green if under, red if over)

---

### 6. Activity Heatmap (Sessions by Day of Week)

**Use Case**: Identify peak activity days for volunteer/beneficiary engagement

```sql
-- Get session counts by day of week for heatmap
SELECT
  EXTRACT(DOW FROM snapshot_date) as day_of_week, -- 0=Sun, 6=Sat
  EXTRACT(HOUR FROM snapshot_date) as hour_of_day,
  AVG(
    (full_snapshot->'engagement'->>'avgSessionsPerVolunteer')::numeric
  ) as avg_sessions_per_volunteer,
  COUNT(*) as data_points
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
  AND snapshot_date >= NOW() - INTERVAL '90 days'
  AND (full_snapshot->'engagement'->>'avgSessionsPerVolunteer') IS NOT NULL
GROUP BY
  EXTRACT(DOW FROM snapshot_date),
  EXTRACT(HOUR FROM snapshot_date)
ORDER BY day_of_week, hour_of_day;
```

**Chart Config**:
- **Type**: Heatmap (7 rows × 24 columns)
- **X-Axis**: Hour of day (0-23)
- **Y-Axis**: Day of week (Sun-Sat)
- **Color Scale**: White (0 sessions) → Dark blue (max sessions)

---

### 7. Outcome Scores Radar Chart

**Use Case**: Show multi-dimensional impact across outcome categories

```sql
-- Get latest outcome scores for radar chart
SELECT
  full_snapshot->'outcomeScores'->>'integration' as integration,
  full_snapshot->'outcomeScores'->>'language' as language,
  full_snapshot->'outcomeScores'->>'jobReadiness' as job_readiness,
  full_snapshot->'outcomeScores'->>'wellbeing' as wellbeing,
  sroi_score,
  average_vis_score
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**Chart Config**:
- **Type**: Radar chart (6 dimensions)
- **Dimensions**:
  - Integration (0-1 scale)
  - Language (0-1 scale)
  - Job Readiness (0-1 scale)
  - Wellbeing (0-1 scale)
  - SROI (normalized to 0-1: sroi/10)
  - VIS (normalized to 0-1: vis/100)
- **Colors**: Fill area with semi-transparent blue

---

### 8. Capacity Alerts Widget

**Use Case**: Show actionable alerts for campaigns near capacity

```sql
-- Get active alerts from latest snapshot
SELECT
  alert->>'type' as alert_type,
  alert->>'message' as message,
  (alert->>'threshold')::numeric as threshold,
  (alert->>'currentValue')::numeric as current_value,
  snapshot_date
FROM campaign_metrics_snapshots,
  jsonb_array_elements(full_snapshot->'alerts') as alert
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**UI Component**: Alert card with icons
- **capacity_warning**: Yellow triangle icon, "Approaching Capacity"
- **capacity_critical**: Red exclamation icon, "At Capacity - Upsell Opportunity"
- **budget_warning**: Orange coin icon, "Budget 80% Spent"
- **performance_low**: Blue info icon, "SROI Below Target"

---

### 9. Top Evidence Snippets

**Use Case**: Link to evidence supporting campaign impact claims

```sql
-- Get top evidence IDs from latest snapshot
WITH latest_snapshot AS (
  SELECT
    full_snapshot->'topEvidenceIds' as evidence_ids,
    snapshot_date
  FROM campaign_metrics_snapshots
  WHERE campaign_id = $1
  ORDER BY snapshot_date DESC
  LIMIT 1
)
SELECT
  evidence_id::text,
  snapshot_date
FROM latest_snapshot,
  jsonb_array_elements_text(evidence_ids) as evidence_id;
```

**Follow-up Query**: Join with `evidence_snippets` table to get full text

```sql
-- Get evidence details (join with evidence_ledger)
SELECT
  e.id,
  e.snippet,
  e.outcome_type,
  e.sroi_contribution,
  e.created_at
FROM evidence_snippets e
WHERE e.id = ANY($1::uuid[]) -- Array of evidence IDs from above
ORDER BY e.sroi_contribution DESC
LIMIT 5;
```

**UI Component**: Evidence cards with:
- Snippet text (truncated to 200 chars)
- Outcome type badge
- SROI contribution
- "View Full Evidence" link → Evidence Explorer

---

### 10. Campaign Comparison Table

**Use Case**: Compare multiple campaigns side-by-side for benchmarking

```sql
-- Get latest metrics for multiple campaigns
WITH latest_snapshots AS (
  SELECT DISTINCT ON (campaign_id)
    campaign_id,
    full_snapshot->>'campaignName' as campaign_name,
    full_snapshot->>'status' as status,
    volunteers_utilization,
    beneficiaries_utilization,
    budget_utilization,
    sroi_score,
    average_vis_score,
    total_hours_logged,
    snapshot_date
  FROM campaign_metrics_snapshots
  WHERE campaign_id = ANY($1::uuid[]) -- Array of campaign IDs
    AND snapshot_date >= NOW() - INTERVAL '7 days'
  ORDER BY campaign_id, snapshot_date DESC
)
SELECT
  campaign_id,
  campaign_name,
  status,
  volunteers_utilization,
  beneficiaries_utilization,
  budget_utilization,
  sroi_score,
  average_vis_score,
  total_hours_logged,
  -- Rank campaigns by SROI
  RANK() OVER (ORDER BY sroi_score DESC) as sroi_rank,
  -- Percentile for capacity utilization
  PERCENT_RANK() OVER (ORDER BY volunteers_utilization) as capacity_percentile
FROM latest_snapshots
ORDER BY sroi_rank;
```

**Table Columns**:
- Campaign Name
- Status (badge)
- Volunteers (utilization %)
- Beneficiaries (utilization %)
- Budget (utilization %)
- SROI (with rank badge)
- VIS
- Hours Logged

---

### 11. Forecast Projection (Linear Regression)

**Use Case**: Predict when campaign will hit capacity based on current trends

```sql
-- Get data points for linear regression (last 30 days)
WITH daily_snapshots AS (
  SELECT
    EXTRACT(EPOCH FROM snapshot_date - (
      SELECT MIN(snapshot_date)
      FROM campaign_metrics_snapshots
      WHERE campaign_id = $1
    )) / 86400 as days_since_start,
    volunteers_current,
    beneficiaries_current,
    volunteers_target,
    beneficiaries_target
  FROM campaign_metrics_snapshots
  WHERE campaign_id = $1
    AND snapshot_date >= NOW() - INTERVAL '30 days'
    AND EXTRACT(HOUR FROM snapshot_date) = 0 -- Daily snapshots only
  ORDER BY snapshot_date ASC
),
linear_regression AS (
  SELECT
    -- Linear regression for volunteers: y = mx + b
    REGR_SLOPE(volunteers_current, days_since_start) as vol_slope,
    REGR_INTERCEPT(volunteers_current, days_since_start) as vol_intercept,
    MAX(volunteers_target) as vol_target,
    -- Linear regression for beneficiaries
    REGR_SLOPE(beneficiaries_current, days_since_start) as ben_slope,
    REGR_INTERCEPT(beneficiaries_current, days_since_start) as ben_intercept,
    MAX(beneficiaries_target) as ben_target,
    MAX(days_since_start) as current_day
  FROM daily_snapshots
)
SELECT
  -- Days until volunteers hit target
  CASE
    WHEN vol_slope > 0 THEN
      CEIL((vol_target - vol_intercept) / vol_slope) - current_day
    ELSE NULL -- Not growing, won't hit target
  END as days_to_volunteer_capacity,
  -- Days until beneficiaries hit target
  CASE
    WHEN ben_slope > 0 THEN
      CEIL((ben_target - ben_intercept) / ben_slope) - current_day
    ELSE NULL
  END as days_to_beneficiary_capacity,
  vol_slope,
  ben_slope
FROM linear_regression;
```

**UI Component**: Forecast card
- "At current growth rate, campaign will hit capacity in **X days**"
- "Projected capacity date: **YYYY-MM-DD**"
- Show confidence interval based on R² (future enhancement)

---

### 12. Engagement Metrics Table

**Use Case**: Detailed engagement breakdown for program managers

```sql
-- Get latest engagement metrics from fullSnapshot
SELECT
  snapshot_date,
  full_snapshot->'engagement'->>'volunteerRetentionRate' as volunteer_retention,
  full_snapshot->'engagement'->>'beneficiaryDropoutRate' as beneficiary_dropout,
  full_snapshot->'engagement'->>'avgSessionsPerVolunteer' as avg_sessions_per_vol,
  full_snapshot->'engagement'->>'avgSessionsPerBeneficiary' as avg_sessions_per_ben,
  full_snapshot->'programInstances'->>'activeCount' as active_instances,
  full_snapshot->'programInstances'->>'totalCount' as total_instances
FROM campaign_metrics_snapshots
WHERE campaign_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**Table Display**:
- Volunteer Retention Rate: 87% ↑
- Beneficiary Dropout Rate: 12% ↓
- Avg Sessions/Volunteer: 5.4
- Avg Sessions/Beneficiary: 4.8
- Active Program Instances: 3 / 5

---

## 🎨 Dashboard Layout Recommendation

### Top Row (Overview KPIs)
1. **Volunteers Card**: Current / Target, Utilization %
2. **Beneficiaries Card**: Current / Target, Utilization %
3. **Budget Card**: Spent / Allocated, Utilization %
4. **Impact Card**: SROI + VIS combined score

### Middle Row (Time-Series Charts)
1. **Left Half**: Impact Metrics Chart (SROI/VIS trends)
2. **Right Half**: Capacity Trend Chart (volunteers + beneficiaries)

### Bottom Row (Detailed Insights)
1. **Left Third**: Budget Burn-Rate Chart
2. **Middle Third**: Outcome Scores Radar Chart
3. **Right Third**: Capacity Alerts + Top Evidence

---

## 🔧 Implementation Notes

### Query Performance

**Optimization Tips**:
1. Use `DISTINCT ON (campaign_id)` for latest snapshot queries (faster than `ROW_NUMBER()`)
2. Always filter by `campaign_id` first (uses primary index)
3. Use `DATE_TRUNC` for daily aggregation (index-friendly)
4. Avoid `JSONB` extraction in WHERE clauses (use GIN indexes if needed)
5. Cache frequently-accessed queries (Redis, 5-minute TTL)

### Caching Strategy

**Cache Keys**:
- `campaign:${campaignId}:overview` - TTL: 5 minutes
- `campaign:${campaignId}:timeseries:${period}` - TTL: 10 minutes
- `campaign:${campaignId}:forecast` - TTL: 1 hour

**Invalidation**:
- On new snapshot creation
- On campaign update

### Error Handling

**Handle Missing Data**:
- No snapshots: Show "No data yet" state
- Null SROI/VIS: Show "Calculating..." (campaigns < 7 days old)
- Incomplete fullSnapshot: Use top-level columns as fallback

---

## 📦 Reusable Query Functions

### TypeScript Helper Functions

```typescript
// Helper: Get latest snapshot
export async function getLatestSnapshot(
  db: Database,
  campaignId: string
): Promise<CampaignMetricsSnapshot | null> {
  const result = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(1);

  return result[0] || null;
}

// Helper: Get time-series data
export async function getTimeSeriesData(
  db: Database,
  campaignId: string,
  startDate: Date,
  endDate: Date
): Promise<CampaignTimeSeriesPoint[]> {
  return db
    .select({
      snapshotDate: campaignMetricsSnapshots.snapshotDate,
      volunteersUtilization: campaignMetricsSnapshots.volunteersUtilization,
      beneficiariesUtilization: campaignMetricsSnapshots.beneficiariesUtilization,
      budgetUtilization: campaignMetricsSnapshots.budgetUtilization,
      sroiScore: campaignMetricsSnapshots.sroiScore,
      averageVISScore: campaignMetricsSnapshots.averageVISScore,
      totalHoursLogged: campaignMetricsSnapshots.totalHoursLogged,
    })
    .from(campaignMetricsSnapshots)
    .where(
      and(
        eq(campaignMetricsSnapshots.campaignId, campaignId),
        gte(campaignMetricsSnapshots.snapshotDate, startDate),
        lte(campaignMetricsSnapshots.snapshotDate, endDate)
      )
    )
    .orderBy(asc(campaignMetricsSnapshots.snapshotDate));
}

// Helper: Get capacity alerts
export async function getCapacityAlerts(
  db: Database,
  companyId: string,
  threshold: number = 0.8
): Promise<CampaignCapacityAlert[]> {
  const result = await db.execute(sql`
    WITH latest_snapshots AS (
      SELECT DISTINCT ON (campaign_id)
        campaign_id,
        snapshot_date,
        volunteers_utilization,
        beneficiaries_utilization,
        budget_utilization,
        full_snapshot->>'campaignName' as campaign_name,
        full_snapshot->>'status' as status,
        full_snapshot->'alerts' as alerts
      FROM campaign_metrics_snapshots cms
      JOIN campaigns c ON c.id = cms.campaign_id
      WHERE c.company_id = ${companyId}
        AND snapshot_date >= NOW() - INTERVAL '7 days'
      ORDER BY campaign_id, snapshot_date DESC
    )
    SELECT *
    FROM latest_snapshots
    WHERE status = 'active'
      AND (
        volunteers_utilization >= ${threshold}
        OR beneficiaries_utilization >= ${threshold}
        OR budget_utilization >= ${threshold}
      )
    ORDER BY volunteers_utilization DESC
  `);

  return result.rows as CampaignCapacityAlert[];
}
```

---

## ✅ Testing Queries

### Seed Test Data

```sql
-- Insert test snapshots for campaign (30 days)
DO $$
DECLARE
  campaign_uuid uuid := '123e4567-e89b-12d3-a456-426614174000';
  day_offset int;
BEGIN
  FOR day_offset IN 0..29 LOOP
    INSERT INTO campaign_metrics_snapshots (
      campaign_id,
      snapshot_date,
      volunteers_target, volunteers_current, volunteers_utilization,
      beneficiaries_target, beneficiaries_current, beneficiaries_utilization,
      sessions_target, sessions_current, sessions_utilization,
      budget_allocated, budget_spent, budget_remaining, budget_utilization,
      sroi_score, average_vis_score,
      total_hours_logged, total_sessions_completed,
      full_snapshot
    ) VALUES (
      campaign_uuid,
      NOW() - INTERVAL '1 day' * day_offset,
      50, 30 + day_offset, (30.0 + day_offset) / 50.0,
      50, 25 + day_offset, (25.0 + day_offset) / 50.0,
      500, 100 + (day_offset * 10), (100.0 + day_offset * 10) / 500.0,
      25000.00, 5000.00 + (day_offset * 500), 25000.00 - (5000.00 + day_offset * 500),
      (5000.00 + day_offset * 500) / 25000.00,
      3.5 + (day_offset * 0.1), 65.0 + (day_offset * 0.5),
      100.0 + (day_offset * 50), 10 + (day_offset * 5),
      jsonb_build_object(
        'campaignName', 'Test Campaign',
        'status', 'active',
        'alerts', '[]'::jsonb
      )
    );
  END LOOP;
END $$;
```

---

**Next Steps**:
1. Agent 4.5 implements these queries in `/services/reporting/src/routes/campaign-dashboard.ts`
2. Agent 6.2 integrates queries into dashboard UI components
3. Add caching layer (Redis) for frequently-accessed queries
4. Add Grafana dashboard using these queries

---

**Document Status**: ✅ Complete
