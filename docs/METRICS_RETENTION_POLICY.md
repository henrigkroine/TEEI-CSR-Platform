# Campaign Metrics Retention Policy

**Version**: 1.0.0
**Last Updated**: 2025-11-22
**Owner**: Agent 1.6 (metrics-snapshot-designer)
**Related Schema**: `packages/shared-schema/src/schema/campaign-metrics-snapshots.ts`

---

## 📋 Overview

This document defines the **snapshot frequency**, **retention policies**, and **storage optimization strategies** for campaign metrics snapshots. These policies balance:

- **Query Performance**: Fast time-series queries for dashboards
- **Storage Efficiency**: Minimize database bloat
- **Historical Analysis**: Preserve data for trend analysis
- **Compliance**: Meet audit and reporting requirements

---

## ⏰ Snapshot Frequency Recommendations

### Default Frequency Strategy

| Campaign Status | Activity Level | Snapshot Frequency | Rationale |
|----------------|---------------|-------------------|-----------|
| **Draft** | N/A | No snapshots | No metrics to track |
| **Planned** | N/A | Daily (00:00 UTC) | Track pre-launch preparation |
| **Recruiting** | Low | Daily (00:00 UTC) | Monitor enrollment progress |
| **Active (Low)** | <25 sessions/week | Daily (00:00 UTC) | Standard tracking |
| **Active (Medium)** | 25-100 sessions/week | Every 6 hours | Catch intra-day trends |
| **Active (High)** | >100 sessions/week | Every 1 hour | Real-time monitoring |
| **Paused** | N/A | Daily (00:00 UTC) | Minimal tracking |
| **Completed** | N/A | Final snapshot only | Archive state |
| **Closed** | N/A | No snapshots | Terminal state |

### Activity-Based Auto-Scaling

**Logic** (implemented in snapshot cron job):
```typescript
function determineSnapshotFrequency(campaign: Campaign): string {
  if (campaign.status === 'active') {
    const sessionsLastWeek = campaign.currentSessions; // fetch from DB

    if (sessionsLastWeek > 100) return '1h';
    if (sessionsLastWeek > 25) return '6h';
    return '24h';
  }

  if (['planned', 'recruiting', 'paused'].includes(campaign.status)) {
    return '24h';
  }

  return 'none'; // draft, completed, closed
}
```

---

## 🗄️ Retention Policies

### Retention Tiers

| Data Age | Granularity | Storage Location | Purpose |
|----------|-------------|-----------------|---------|
| **0-30 days** | Original (hourly/daily) | PostgreSQL | Real-time dashboards, upsell analysis |
| **31-90 days** | Daily aggregation | PostgreSQL | Recent trends, capacity planning |
| **91-365 days** | Weekly aggregation | PostgreSQL | Quarterly reports, year-over-year |
| **1-3 years** | Monthly aggregation | PostgreSQL (compressed) | Historical analysis, compliance |
| **3+ years** | Quarterly aggregation | S3/Archive (Parquet) | Audit trail, long-term research |

### Retention Rules

**Rule 1: Hot Data (0-30 days)**
- **Keep**: All snapshots at original frequency
- **Location**: PostgreSQL `campaign_metrics_snapshots` table
- **Access**: Sub-second query performance via indexes

**Rule 2: Warm Data (31-90 days)**
- **Aggregation**: Consolidate hourly snapshots → 1 daily snapshot (end-of-day)
- **Logic**: Keep midnight snapshot, delete intra-day snapshots
- **Retention Job**: Weekly cleanup (Sundays at 02:00 UTC)

**Rule 3: Cool Data (91-365 days)**
- **Aggregation**: Consolidate daily snapshots → 1 weekly snapshot (Sunday)
- **Logic**: Keep Sunday snapshot, delete Mon-Sat
- **Retention Job**: Monthly cleanup (1st of month at 03:00 UTC)

**Rule 4: Cold Data (1-3 years)**
- **Aggregation**: Consolidate weekly snapshots → 1 monthly snapshot (last day of month)
- **Logic**: Keep month-end snapshot, delete mid-month
- **Retention Job**: Quarterly cleanup (1st of Q1/Q2/Q3/Q4 at 04:00 UTC)

**Rule 5: Archive Data (3+ years)**
- **Export**: Export monthly snapshots to S3 as Parquet files
- **Compression**: Snappy compression, partitioned by year/quarter
- **Deletion**: Delete from PostgreSQL after successful S3 upload
- **Access**: Query via Athena/Presto (slower, but cost-effective)

### Special Cases

**High-Value Campaigns** (SROI > 5, VIS > 80, budget > $100k):
- **Extended Retention**: Keep daily granularity for 180 days (instead of 90)
- **Rationale**: Used for case studies, sales demos, upsell analysis

**Failed/Cancelled Campaigns**:
- **Accelerated Archive**: Aggregate to weekly after 30 days, monthly after 90 days
- **Rationale**: Lower business value, free up storage

**Legal Hold Campaigns** (flagged for audit/compliance):
- **No Deletion**: Preserve all snapshots until hold lifted
- **Location**: Separate `campaign_metrics_snapshots_legal_hold` table

---

## 📊 Aggregation vs Raw Data Strategy

### When to Aggregate

✅ **Aggregate** when:
- Data older than retention tier boundary (e.g., hourly → daily after 30 days)
- Query patterns don't require granular data (e.g., quarterly reports)
- Storage costs exceed query value

❌ **Keep Raw** when:
- Investigating anomalies (need fine-grained timestamps)
- Legal/compliance requirements (audit trail)
- High-value campaigns (extended retention policy)

### Aggregation Logic

**Daily Aggregation** (from hourly snapshots):
```sql
-- Keep the midnight snapshot, delete the rest
DELETE FROM campaign_metrics_snapshots
WHERE snapshot_date >= NOW() - INTERVAL '31 days'
  AND snapshot_date < NOW() - INTERVAL '30 days'
  AND EXTRACT(HOUR FROM snapshot_date) != 0;
```

**Weekly Aggregation** (from daily snapshots):
```sql
-- Keep Sunday snapshots, delete Mon-Sat
DELETE FROM campaign_metrics_snapshots
WHERE snapshot_date >= NOW() - INTERVAL '91 days'
  AND snapshot_date < NOW() - INTERVAL '90 days'
  AND EXTRACT(DOW FROM snapshot_date) != 0; -- 0 = Sunday
```

**Monthly Aggregation** (from weekly snapshots):
```sql
-- Keep last day of month, delete others
DELETE FROM campaign_metrics_snapshots
WHERE snapshot_date >= NOW() - INTERVAL '366 days'
  AND snapshot_date < NOW() - INTERVAL '365 days'
  AND snapshot_date != DATE_TRUNC('month', snapshot_date) + INTERVAL '1 month' - INTERVAL '1 day';
```

### Aggregation Job Schedule

| Job | Frequency | Retention Window | Snapshot Reduction |
|-----|-----------|-----------------|-------------------|
| `aggregate-to-daily` | Weekly (Sun 02:00 UTC) | 31-90 days | ~80% (24 hourly → 1 daily) |
| `aggregate-to-weekly` | Monthly (1st, 03:00 UTC) | 91-365 days | ~85% (7 daily → 1 weekly) |
| `aggregate-to-monthly` | Quarterly (1st of Q, 04:00 UTC) | 1-3 years | ~75% (4 weekly → 1 monthly) |
| `archive-to-s3` | Quarterly (1st of Q, 05:00 UTC) | 3+ years | 100% (delete after upload) |

---

## 📈 Time-Series Query Examples

### Example 1: Campaign Dashboard (Last 30 Days, Hourly/Daily)

**Use Case**: Real-time capacity monitoring for active campaign

```sql
-- Get hourly/daily snapshots for last 30 days
SELECT
  snapshot_date,
  volunteers_utilization,
  beneficiaries_utilization,
  budget_utilization,
  sroi_score,
  average_vis_score,
  total_hours_logged
FROM campaign_metrics_snapshots
WHERE campaign_id = '123e4567-e89b-12d3-a456-426614174000'
  AND snapshot_date >= NOW() - INTERVAL '30 days'
ORDER BY snapshot_date ASC;
```

**Performance**: <50ms (uses `campaign_metrics_snapshots_campaign_date_idx` index)

**Expected Rows**: 30-720 (daily to hourly snapshots)

---

### Example 2: Quarterly Trend (Last 90 Days, Daily)

**Use Case**: Executive report showing campaign progress over quarter

```sql
-- Get daily snapshots for Q4 2024
SELECT
  DATE(snapshot_date) as day,
  volunteers_current,
  beneficiaries_current,
  budget_spent,
  sroi_score,
  total_sessions_completed
FROM campaign_metrics_snapshots
WHERE campaign_id = '123e4567-e89b-12d3-a456-426614174000'
  AND snapshot_date >= '2024-10-01'
  AND snapshot_date < '2025-01-01'
  AND EXTRACT(HOUR FROM snapshot_date) = 0 -- Midnight snapshots only
ORDER BY snapshot_date ASC;
```

**Performance**: <100ms

**Expected Rows**: ~90 (daily snapshots)

---

### Example 3: Year-Over-Year Comparison (Weekly Aggregation)

**Use Case**: Compare campaign performance 2024 vs 2025

```sql
-- Get weekly snapshots for YoY comparison
WITH weekly_2024 AS (
  SELECT
    EXTRACT(WEEK FROM snapshot_date) as week_num,
    AVG(sroi_score) as avg_sroi,
    AVG(volunteers_utilization) as avg_vol_util
  FROM campaign_metrics_snapshots
  WHERE campaign_id = '123e4567-e89b-12d3-a456-426614174000'
    AND snapshot_date >= '2024-01-01'
    AND snapshot_date < '2025-01-01'
    AND EXTRACT(DOW FROM snapshot_date) = 0 -- Sundays only
  GROUP BY EXTRACT(WEEK FROM snapshot_date)
),
weekly_2025 AS (
  SELECT
    EXTRACT(WEEK FROM snapshot_date) as week_num,
    AVG(sroi_score) as avg_sroi,
    AVG(volunteers_utilization) as avg_vol_util
  FROM campaign_metrics_snapshots
  WHERE campaign_id = '456e7890-e89b-12d3-a456-426614174000'
    AND snapshot_date >= '2025-01-01'
    AND snapshot_date < '2026-01-01'
    AND EXTRACT(DOW FROM snapshot_date) = 0
  GROUP BY EXTRACT(WEEK FROM snapshot_date)
)
SELECT
  w24.week_num,
  w24.avg_sroi as sroi_2024,
  w25.avg_sroi as sroi_2025,
  (w25.avg_sroi - w24.avg_sroi) as sroi_delta
FROM weekly_2024 w24
FULL OUTER JOIN weekly_2025 w25 ON w24.week_num = w25.week_num
ORDER BY w24.week_num;
```

**Performance**: <200ms

**Expected Rows**: ~52 (weekly snapshots)

---

### Example 4: Capacity Alert Query (All Campaigns Near Capacity)

**Use Case**: Upsell opportunity identification (campaigns >80% utilization)

```sql
-- Find campaigns near capacity in last snapshot
WITH latest_snapshots AS (
  SELECT DISTINCT ON (campaign_id)
    campaign_id,
    snapshot_date,
    volunteers_utilization,
    beneficiaries_utilization,
    budget_utilization,
    full_snapshot->>'campaignName' as campaign_name,
    full_snapshot->>'status' as status
  FROM campaign_metrics_snapshots
  WHERE snapshot_date >= NOW() - INTERVAL '7 days'
  ORDER BY campaign_id, snapshot_date DESC
)
SELECT
  campaign_id,
  campaign_name,
  status,
  volunteers_utilization,
  beneficiaries_utilization,
  budget_utilization
FROM latest_snapshots
WHERE status = 'active'
  AND (
    volunteers_utilization >= 0.80
    OR beneficiaries_utilization >= 0.80
    OR budget_utilization >= 0.80
  )
ORDER BY volunteers_utilization DESC;
```

**Performance**: <300ms (uses `campaign_metrics_snapshots_volunteers_util_idx` index)

**Expected Rows**: 10-50 (campaigns near capacity)

---

### Example 5: Grafana Time-Series Dashboard

**Use Case**: Real-time campaign monitoring dashboard

```sql
-- Grafana query with $__timeFilter and variables
SELECT
  snapshot_date as time,
  volunteers_current as "Volunteers",
  beneficiaries_current as "Beneficiaries",
  sessions_current as "Sessions",
  budget_spent / budget_allocated * 100 as "Budget %"
FROM campaign_metrics_snapshots
WHERE campaign_id = '$campaign_id'
  AND $__timeFilter(snapshot_date)
ORDER BY snapshot_date ASC;
```

**Grafana Variables**:
- `$campaign_id`: Campaign UUID (dropdown)
- `$__timeFilter`: Auto-generated time range filter

**Panel Type**: Time-series graph with multi-axis (left: counts, right: percentages)

---

### Example 6: Impact Metrics Trend (SROI/VIS Over Time)

**Use Case**: Prove campaign effectiveness over time

```sql
-- Get SROI and VIS trends for last 90 days
SELECT
  DATE_TRUNC('day', snapshot_date) as day,
  AVG(sroi_score) as avg_sroi,
  AVG(average_vis_score) as avg_vis,
  SUM(total_hours_logged) as total_hours,
  SUM(total_sessions_completed) as total_sessions
FROM campaign_metrics_snapshots
WHERE campaign_id = '123e4567-e89b-12d3-a456-426614174000'
  AND snapshot_date >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', snapshot_date)
ORDER BY day ASC;
```

**Performance**: <150ms

**Expected Rows**: ~90 (daily aggregates)

---

## 💾 Storage Size Estimates

### Assumptions

| Parameter | Value |
|-----------|-------|
| **Average Campaigns** | 500 active campaigns |
| **Snapshot Frequency** | Daily (24h) for 80%, Hourly (1h) for 20% |
| **Row Size** | ~2 KB (including JSONB fullSnapshot) |
| **Indexes** | ~40% overhead |

### Storage Calculations

**Daily Snapshots (80% of campaigns)**:
- Campaigns: 400
- Snapshots/day: 400 × 1 = 400
- Data/day: 400 × 2 KB = 800 KB
- Data/month: 800 KB × 30 = 24 MB
- Data/year: 24 MB × 12 = 288 MB

**Hourly Snapshots (20% of campaigns)**:
- Campaigns: 100
- Snapshots/day: 100 × 24 = 2,400
- Data/day: 2,400 × 2 KB = 4.8 MB
- Data/month: 4.8 MB × 30 = 144 MB
- Data/year: 144 MB × 12 = 1,728 MB (~1.7 GB)

**Total Raw Data (1 Year, No Retention)**:
- Daily: 288 MB
- Hourly: 1,728 MB
- **Total**: ~2 GB/year (raw data)
- **With Indexes**: ~2.8 GB/year

### Post-Retention Storage

**With Retention Policies Applied**:

| Tier | Age | Granularity | Snapshots/Campaign/Year | Total Snapshots (500 campaigns) | Storage |
|------|-----|------------|------------------------|--------------------------------|---------|
| Hot | 0-30d | Hourly/Daily | ~240 (daily) or ~720 (hourly) | 120,000 (mixed) | ~240 MB |
| Warm | 31-90d | Daily | ~60 | 30,000 | ~60 MB |
| Cool | 91-365d | Weekly | ~40 | 20,000 | ~40 MB |
| Cold | 1-3y | Monthly | ~24/year × 2 years = 48 | 24,000 | ~48 MB |
| Archive | 3+y | Quarterly (S3) | ~4/year × N years | N/A (S3) | ~8 MB/year (S3) |

**Total PostgreSQL Storage (Active)**:
- Hot + Warm + Cool + Cold: ~388 MB
- With Indexes (40% overhead): ~543 MB
- **Grand Total**: <1 GB (for 500 campaigns, 3 years retention)

**S3 Archive Storage (3+ years)**:
- Parquet compressed: ~2 MB/year (Snappy compression)
- Cost: $0.023/GB/month × 0.002 GB = **$0.00005/month** (negligible)

### Storage Cost Projection

**PostgreSQL (RDS)**:
- Storage: 1 GB @ $0.115/GB/month = **$0.12/month**
- IOPS: Minimal (time-series queries are sequential reads)

**S3 Archive (Glacier Deep Archive)**:
- Storage: 10 GB @ $0.00099/GB/month = **$0.01/month**
- Total Archive Cost: **$0.01/month**

**Total Monthly Storage Cost**: **~$0.13/month** (for 500 campaigns, 3+ years data)

---

## 🔧 Implementation Checklist

### Phase 1: Snapshot Generation (Agent 3.5)
- [ ] Implement snapshot generation cron job (`services/campaigns/src/jobs/generate-campaign-snapshots.ts`)
- [ ] Activity-based frequency auto-scaling
- [ ] Error handling and retry logic
- [ ] Logging and monitoring (track snapshot duration, failures)

### Phase 2: Retention Jobs (Agent 3.5)
- [ ] Weekly aggregation job (hourly → daily)
- [ ] Monthly aggregation job (daily → weekly)
- [ ] Quarterly aggregation job (weekly → monthly)
- [ ] Quarterly S3 archive job (monthly → S3 Parquet)
- [ ] Dry-run mode for testing

### Phase 3: Query Optimization (Agent 4.5)
- [ ] Create materialized views for common queries
- [ ] Add partial indexes for high-value campaigns
- [ ] Implement query result caching (Redis)
- [ ] Monitor slow queries and optimize

### Phase 4: Monitoring & Alerting (Agent 4.5)
- [ ] Grafana dashboard: "Campaign Metrics Snapshots Health"
- [ ] Alerts: Snapshot job failures, storage growth >10%/week
- [ ] Metrics: Snapshot generation duration, retention job deletions/week
- [ ] SLO: 99.5% snapshot generation success rate

### Phase 5: Documentation & Runbooks (All Agents)
- [ ] Update this document with production learnings
- [ ] Create runbook: "How to Investigate Missing Snapshots"
- [ ] Create runbook: "How to Manually Trigger Retention Jobs"
- [ ] Create runbook: "How to Restore Archived Snapshots from S3"

---

## 🚨 Alerts & Monitoring

### Critical Alerts

**Alert 1: Snapshot Generation Failure**
- **Trigger**: >5% of snapshots fail in 1 hour
- **Action**: Page on-call engineer
- **Runbook**: `/docs/runbooks/campaign-snapshots-failure.md`

**Alert 2: Storage Growth Anomaly**
- **Trigger**: Table size grows >10% week-over-week
- **Action**: Investigate retention job health
- **Runbook**: Check if retention jobs are running

**Alert 3: Retention Job Failure**
- **Trigger**: Retention job fails 2 consecutive runs
- **Action**: Alert data team
- **Runbook**: Manual retention cleanup if needed

### Warning Alerts

**Alert 4: Slow Snapshot Queries**
- **Trigger**: P95 query latency >500ms
- **Action**: Review indexes and query patterns
- **Runbook**: Optimize slow queries

**Alert 5: Missing Snapshots**
- **Trigger**: Active campaign has no snapshot in 36 hours
- **Action**: Backfill missing snapshots
- **Runbook**: Run backfill job for campaign

---

## 📚 Related Documentation

- **Schema**: `/packages/shared-schema/src/schema/campaign-metrics-snapshots.ts`
- **Campaign Lifecycle**: `/docs/CAMPAIGN_LIFECYCLE.md` (created by Agent 1.2)
- **Metrics Aggregation**: `/services/campaigns/src/lib/metrics-aggregator.ts` (created by Agent 3.5)
- **Dashboard Data Provider**: `/services/reporting/src/routes/campaign-dashboard.ts` (created by Agent 4.5)
- **Retention Jobs**: `/services/campaigns/src/jobs/` (created by Agent 3.5)

---

## ✅ Success Criteria

- ✅ Snapshot generation <2 seconds per campaign (99th percentile)
- ✅ Dashboard queries <300ms for 30-day time range
- ✅ Storage <1 GB for 500 campaigns, 3 years retention
- ✅ 99.5% snapshot generation success rate
- ✅ Zero data loss during retention cleanup
- ✅ S3 archive retrieval <5 minutes for quarterly data

---

**Document Status**: ✅ Complete
**Next Steps**:
1. Agent 2.1 (drizzle-schema-engineer) implements schema in migration
2. Agent 3.5 (metrics-aggregator) implements snapshot generation job
3. Agent 3.5 implements retention jobs
4. Agent 4.5 (dashboard-data-provider) implements dashboard queries
5. Agent 5.4 (upsell-opportunity-analyzer) uses capacity alert queries

---

**Changelog**:
- **2025-11-22**: Initial version (Agent 1.6)
