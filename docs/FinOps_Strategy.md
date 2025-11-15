# FinOps Strategy & Implementation Guide

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Worker 3 - FinOps Team
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Cost Optimization Strategy](#cost-optimization-strategy)
3. [AI Token Budget Enforcement](#ai-token-budget-enforcement)
4. [Cloud Cost Tracking](#cloud-cost-tracking)
5. [Autoscaling Best Practices](#autoscaling-best-practices)
6. [Storage Retention Policies](#storage-retention-policies)
7. [Monthly Cost Review Process](#monthly-cost-review-process)
8. [How to Set Tenant Budgets](#how-to-set-tenant-budgets)
9. [Troubleshooting Over-Budget Tenants](#troubleshooting-over-budget-tenants)
10. [Dashboards & Monitoring](#dashboards--monitoring)
11. [Alerts & Escalation](#alerts--escalation)

---

## Overview

### Mission

Implement comprehensive Financial Operations (FinOps) to:
- **Track and control cloud costs** across multi-region AWS deployment
- **Enforce AI token budgets** per tenant to prevent cost overruns
- **Optimize autoscaling** to balance performance and cost (<10% waste)
- **Automate storage lifecycle** to minimize storage costs
- **Provide real-time visibility** into cost metrics for exec team

### Key Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Monthly cloud budget adherence | <100% | TBD | 🟢 |
| AI token budget enforcement | 100% | 100% | ✅ |
| Storage lifecycle automation | 100% automated | 100% | ✅ |
| Autoscaling waste | <10% | TBD | 🟡 |
| Cost per customer visibility | Real-time | Real-time | ✅ |
| Budget alert latency | <1 hour | <1 hour | ✅ |

---

## Cost Optimization Strategy

### Principles

1. **Visibility First**: You can't optimize what you don't measure
2. **Automate Enforcement**: Manual budget tracking fails
3. **Fail-Safe Defaults**: Deny AI requests on budget exceed (don't overspend)
4. **Right-Size Continuously**: Weekly cost recommendations, quarterly reviews
5. **Unit Economics Matter**: Cost per customer > total cost

### Cost Optimization Hierarchy

```
┌─────────────────────────────────────────┐
│ 1. Prevent Waste (AI budgets, HPA)     │  ← Highest Priority
├─────────────────────────────────────────┤
│ 2. Reduce Storage (Lifecycle policies)  │
├─────────────────────────────────────────┤
│ 3. Right-Size Resources (Weekly reports)│
├─────────────────────────────────────────┤
│ 4. Use Spot Instances (Non-critical)    │
├─────────────────────────────────────────┤
│ 5. Consolidate Low-Traffic Services     │
└─────────────────────────────────────────┘
```

### Monthly Savings Targets

| Initiative | Est. Monthly Savings |
|------------|---------------------|
| AI token budgets (prevent overuse) | $2,000 - $5,000 |
| Storage lifecycle (S3, Loki, ClickHouse) | $800 - $1,500 |
| Right-sized pods (CPU/mem optimization) | $1,000 - $3,000 |
| Spot instances (non-critical workloads) | $1,500 - $4,000 |
| Consolidated services | $500 - $1,000 |
| **Total Potential Savings** | **$5,800 - $14,500/month** |

---

## AI Token Budget Enforcement

### Architecture

```
┌─────────────┐
│ User Request│
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────┐
│ Reporting Service                  │
│ ┌────────────────────────────────┐ │
│ │ AI Budget Middleware           │ │
│ │ - Check budget (pre-flight)    │ │
│ │ - Cache status (Redis, 1 min)  │ │
│ │ - Track usage (async)          │ │
│ └────────────────────────────────┘ │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ AI Budget Service (Fastify)        │
│ - GET /tenant/:id (status)         │
│ - POST /check (pre-flight)         │
│ - POST /track (usage logging)      │
│ - POST /set (admin: set budgets)   │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ PostgreSQL                         │
│ - ai_token_budgets                 │
│ - ai_token_usage (audit log)       │
└────────────────────────────────────┘
```

### Pricing (Claude API)

| Model | Input ($/MTok) | Output ($/MTok) | Best For |
|-------|----------------|-----------------|----------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | Production reports |
| Claude 3 Opus | $15.00 | $75.00 | Complex analysis |
| Claude 3 Haiku | $0.25 | $1.25 | Draft/previews |

### Budget Enforcement Flow

1. **Pre-flight Check** (before API call)
   - Middleware calls `/api/ai-budget/check`
   - Estimates cost based on expected tokens
   - Returns `429 Too Many Requests` if over budget
   - Adds `X-AI-Budget-Warning: true` header if >80%

2. **API Call** (if allowed)
   - Report generation proceeds with Claude API
   - Actual token counts returned in response

3. **Post-tracking** (async)
   - Middleware calls `/api/ai-budget/track` (fire-and-forget)
   - Usage logged to `ai_token_usage` table
   - Budget updated in `ai_token_budgets` table
   - Cache invalidated for fresh check on next request

4. **Limit Enforcement**
   - **Soft limit (80%)**: Email notification to tenant admin
   - **Hard limit (100%)**: Deny AI requests, fallback to cached templates
   - **Reset**: First day of next month (automated cron job)

### Example: Setting a Tenant Budget

```bash
# Set $5,000/month budget for tenant-enterprise
curl -X POST http://ai-budget:3010/api/ai-budget/set \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant-enterprise",
    "model": "claude-3-5-sonnet-20241022",
    "monthly_limit_usd": 5000.00
  }'
```

### Example: Checking Budget Status

```bash
# Get budget status for a tenant
curl http://ai-budget:3010/api/ai-budget/tenant/tenant-enterprise | jq
```

**Response:**
```json
{
  "tenant_id": "tenant-enterprise",
  "budgets": [
    {
      "model": "claude-3-5-sonnet-20241022",
      "monthly_limit_usd": 5000.0,
      "current_usage_usd": 3250.45,
      "percentage_used": 65.01,
      "token_count_input": 1250000,
      "token_count_output": 625000,
      "reset_date": "2025-12-01T00:00:00Z",
      "status": "ok",
      "soft_limit_notified": false,
      "hard_limit_reached": false
    }
  ],
  "total_usage_usd": 3250.45,
  "total_limit_usd": 5000.0
}
```

---

## Cloud Cost Tracking

### AWS Cost Metrics

We track cloud costs using AWS Cost Explorer API and Kubecost for K8s cost allocation.

**Metrics Exported to Prometheus:**
- `aws_cost_monthly_usd{month, region, service}` - Monthly spend breakdown
- `aws_cost_daily_usd{region, service}` - Daily spend
- `aws_cost_forecast_usd` - End-of-month forecast
- `aws_budget_monthly_limit_usd` - Budget limit

### Cost Breakdown

| Service Category | Typical % of Total | Example Monthly Cost |
|------------------|-------------------|---------------------|
| EKS (compute) | 45% | $45,000 |
| RDS (databases) | 20% | $20,000 |
| S3 (storage) | 10% | $10,000 |
| Data transfer | 10% | $10,000 |
| Load balancers | 8% | $8,000 |
| CloudWatch/logs | 5% | $5,000 |
| Other (IAM, KMS, etc.) | 2% | $2,000 |
| **Total** | **100%** | **$100,000** |

### Budget Thresholds

| Alert Level | % of Budget | Action | Escalation |
|-------------|-------------|--------|------------|
| **Green** | 0-70% | None | - |
| **Warning** | 80% | Email to engineering lead | Engineering team |
| **Critical** | 100% | Immediate review + escalate | CFO + CTO |
| **Over Budget** | >100% | Emergency cost reduction | Executive team |

---

## Autoscaling Best Practices

### HPA Configuration (Updated for FinOps)

| Service | Min Replicas | Max Replicas | CPU Target | Rationale |
|---------|--------------|--------------|------------|-----------|
| API Gateway | 3 | 10 | 70% | High availability (entry point) |
| Reporting | 2 | 20 | 60% | GenAI workload (spiky) |
| Q2Q AI | 2 | 15 | 65% | AI processing bursts |
| Data Residency | 2 | 10 | 70% | Critical service |
| Analytics | 2 | 8 | 70% | Standard workload |
| Other services | 2 | 6 | 70% | Default |

### KEDA ScaledObject (Queue-Based Scaling)

**Reporting Service Example:**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: teei-reporting-nats-scaler
spec:
  scaleTargetRef:
    name: teei-reporting
  minReplicaCount: 2
  maxReplicaCount: 20
  cooldownPeriod: 300  # 5 min to prevent flapping
  triggers:
  - type: nats-jetstream
    metadata:
      stream: "reporting-requests"
      consumer: "reporting-service"
      lagThreshold: "100"  # Scale up if >100 messages
```

**Benefits:**
- **React to actual workload** (queue depth) vs. just CPU
- **Prevent over-scaling** with cooldown period
- **Cost-efficient** during low-traffic periods

### Autoscaling Cost Impact

| Scenario | Old Config | New Config | Monthly Savings |
|----------|-----------|-----------|-----------------|
| Reporting (idle nights) | Always 5 pods | 2-20 dynamic | $800 |
| Q2Q AI (burst workload) | 10 pods fixed | 2-15 dynamic | $1,200 |
| API Gateway (traffic patterns) | 5 pods | 3-10 dynamic | $600 |
| **Total** | - | - | **$2,600** |

---

## Storage Retention Policies

### Loki (Logs)

**Policy:**
- **Hot storage**: 30 days (local SSD)
- **Cold storage**: 90 days total (S3 Standard-IA)
- **Deletion**: After 90 days
- **Compression**: gzip for cold storage

**Implementation:**
```yaml
# Loki config
limits_config:
  retention_period: 720h  # 30 days

compactor:
  retention_enabled: true
  retention_delete_delay: 2h
```

**Cost Savings**: ~$400/month (vs. keeping all logs hot)

### ClickHouse (Analytics Events)

**Policy:**
- **TTL**: 90 days on raw events
- **Partitioning**: Monthly partitions
- **Compression**: ZSTD for old partitions
- **Cleanup**: Automated via TTL + OPTIMIZE TABLE

**Implementation:**
```sql
ALTER TABLE analytics.events
  MODIFY TTL timestamp + INTERVAL 90 DAY;

-- Apply compression
OPTIMIZE TABLE analytics.events FINAL;
```

**Cost Savings**: ~$600/month (vs. infinite retention)

### S3 (Exports & Backups)

**Exports Policy:**
- **Retention**: 90 days, then delete
- **Lifecycle**: Transition to Standard-IA after 30 days
- **Versioning**: Max 5 versions, delete after 30 days

**Backups Policy:**
- **Hot**: 30 days (Standard)
- **Warm**: 90 days (Glacier Instant Retrieval)
- **Cold**: 2 years (Deep Archive)
- **Deletion**: After 2 years

**Implementation:**
```bash
# Run automated retention script
./scripts/infra/storage-retention.sh apply
```

**Cost Savings**: ~$1,200/month (vs. no lifecycle rules)

### Postgres WAL (Write-Ahead Logs)

**Policy:**
- **Local retention**: 7 days
- **S3 archive**: Immediate
- **Local deletion**: After 24 hours (post-archive)
- **Compression**: ZSTD

**Implementation:**
```sql
ALTER SYSTEM SET wal_keep_size = '10GB';
ALTER SYSTEM SET archive_command = 'aws s3 cp %p s3://teei-csr-backups/wal/%f && rm %p';
```

**Cost Savings**: ~$200/month (vs. keeping WAL indefinitely)

### Total Storage Savings

| Category | Monthly Savings |
|----------|----------------|
| Loki logs | $400 |
| ClickHouse | $600 |
| S3 lifecycle | $1,200 |
| Postgres WAL | $200 |
| **Total** | **$2,400** |

---

## Monthly Cost Review Process

### Schedule

- **Weekly**: Automated cost recommendation report (every Monday)
- **Monthly**: FinOps review meeting (1st of each month)
- **Quarterly**: Executive cost review with CFO

### Weekly Cost Recommendations

**Run automated script:**
```bash
# Generate CSV report
./scripts/finops/cost-recommendations.sh --format=csv

# Output: /tmp/finops-reports/cost-recommendations-YYYYMMDD.csv
```

**Review recommendations for:**
- Overprovisioned pods (CPU/mem <40% utilization)
- Unused PVCs (not mounted for 7+ days)
- Idle load balancers (no traffic)
- Spot instance candidates (non-critical workloads)
- Service consolidation opportunities

### Monthly Review Agenda

1. **Budget Status** (15 min)
   - Review current vs. budget
   - Forecast for end-of-month
   - Identify variances

2. **Cost Drivers** (15 min)
   - Top 10 services by cost
   - Month-over-month changes
   - Regional breakdown (US vs. EU)

3. **AI Token Usage** (10 min)
   - Total AI spend
   - Top 10 token consumers
   - Tenants at risk of exceeding budget

4. **Optimization Actions** (15 min)
   - Review weekly recommendations
   - Prioritize top 5 actions
   - Assign owners and deadlines

5. **Storage Health** (5 min)
   - S3 bucket sizes
   - ClickHouse disk usage
   - Retention policy compliance

**Deliverables:**
- Cost review slide deck
- Action items tracker
- Updated quarterly forecast

### Quarterly Executive Review

**Present to CFO + CTO:**
- Total cloud spend trend (12 months)
- Cost per customer (unit economics)
- Budget adherence rate
- Cost optimization wins
- Forecast for next quarter
- Strategic recommendations (e.g., reserved instances, savings plans)

---

## How to Set Tenant Budgets

### Default Budget

New tenants automatically get a **$1,000/month** AI budget for Claude 3.5 Sonnet.

### Setting Custom Budgets

**Via API:**
```bash
curl -X POST http://ai-budget:3010/api/ai-budget/set \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "tenant_id": "tenant-acme-corp",
    "model": "claude-3-5-sonnet-20241022",
    "monthly_limit_usd": 10000.00
  }'
```

**Via SQL (for bulk updates):**
```sql
-- Set budget for multiple tenants
INSERT INTO ai_token_budgets (tenant_id, model, monthly_limit_usd, reset_date)
VALUES
  ('tenant-startup-a', 'claude-3-5-sonnet-20241022', 500.00, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  ('tenant-enterprise-b', 'claude-3-5-sonnet-20241022', 50000.00, DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
ON CONFLICT (tenant_id, model)
DO UPDATE SET
  monthly_limit_usd = EXCLUDED.monthly_limit_usd,
  updated_at = NOW();
```

### Budget Tiers (Suggested)

| Tier | Monthly Limit | Typical Use Case | # Reports/Month |
|------|--------------|------------------|-----------------|
| **Starter** | $500 | Small NGOs, pilots | ~50-100 |
| **Professional** | $2,000 | Mid-size orgs | ~200-400 |
| **Enterprise** | $10,000 | Large corporations | ~1,000-2,000 |
| **Custom** | $50,000+ | Multi-division enterprises | 5,000+ |

---

## Troubleshooting Over-Budget Tenants

### Symptoms

- Tenant reports error: `429 Too Many Requests: AI Budget Exceeded`
- Dashboard shows `hard_limit_reached = true`
- Alert: `AIBudgetExceeded` firing

### Diagnosis Steps

1. **Check budget status:**
   ```bash
   curl http://ai-budget:3010/api/ai-budget/tenant/TENANT_ID | jq
   ```

2. **Review usage patterns:**
   ```sql
   SELECT
     DATE_TRUNC('day', timestamp) AS date,
     COUNT(*) AS requests,
     SUM(prompt_tokens + completion_tokens) AS total_tokens,
     SUM(cost_usd) AS total_cost,
     report_type
   FROM ai_token_usage
   WHERE tenant_id = 'TENANT_ID'
     AND timestamp >= NOW() - INTERVAL '30 days'
   GROUP BY date, report_type
   ORDER BY date DESC;
   ```

3. **Check for anomalies:**
   - Unusual request spikes (e.g., runaway script)
   - High-cost report types (e.g., using Opus instead of Sonnet)
   - Repeated regenerations of same report

### Resolution Options

**Option 1: Increase Budget** (if legitimate use)
```bash
curl -X POST http://ai-budget:3010/api/ai-budget/set \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "TENANT_ID",
    "model": "claude-3-5-sonnet-20241022",
    "monthly_limit_usd": 15000.00
  }'
```

**Option 2: Switch to Cheaper Model** (for drafts)
```sql
-- Update report template to use Haiku for drafts
UPDATE report_templates
SET model = 'claude-3-haiku-20240307'
WHERE report_type = 'quarterly-report-draft';
```

**Option 3: Optimize Prompts** (reduce token usage)
- Review prompt templates for unnecessary verbosity
- Use citation validation to avoid regenerations
- Implement client-side caching for repeated queries

**Option 4: Manual Reset** (emergency only)
```sql
-- Reset budget mid-month (admin only)
UPDATE ai_token_budgets
SET
  current_usage_usd = 0,
  token_count_input = 0,
  token_count_output = 0,
  hard_limit_reached = false,
  soft_limit_notified = false
WHERE tenant_id = 'TENANT_ID';
```

---

## Dashboards & Monitoring

### Grafana Dashboards

**1. Cloud Cost Dashboard**
- **URL**: `/d/finops-cloud-cost`
- **Metrics**:
  - Monthly spend vs. budget
  - Cost by region (US-East-1 vs. EU-Central-1)
  - Cost by service (EKS, RDS, S3, etc.)
  - Top 10 cost drivers
  - Month-over-month growth %
  - Cost per customer (unit economics)
- **Alerts**: Budget >80%, spend spike >20% day-over-day

**2. AI Budget Dashboard**
- **URL**: `/d/finops-ai-budget`
- **Metrics**:
  - Total AI spend (MTD)
  - Spend by tenant (top 10 consumers)
  - Spend by model (Sonnet vs. Opus vs. Haiku)
  - Tenant budget status (at-risk tenants)
  - Token efficiency (cost per 1M tokens)
  - Anomaly detection (usage spikes)
- **Alerts**: Tenant >80% budget, total spend >$10k/month

### Prometheus Metrics

**AI Budget Metrics:**
```promql
# Total AI spend (last 30 days)
sum(increase(ai_token_usage_cost_usd[30d]))

# Tenants over budget
count(ai_budget_hard_limit_reached == 1)

# Average cost per report
avg(ai_token_usage_cost_usd{report_type!=""}) by (report_type)
```

**Cloud Cost Metrics:**
```promql
# Monthly spend
sum(aws_cost_monthly_usd{month="current"})

# Budget utilization %
(sum(aws_cost_monthly_usd{month="current"}) / sum(aws_budget_monthly_limit_usd)) * 100

# Cost per customer
sum(aws_cost_monthly_usd{month="current"}) / count(count by (tenant_id) (http_requests_total))
```

---

## Alerts & Escalation

### Alert Matrix

| Alert | Severity | Threshold | Escalation | Response Time |
|-------|----------|-----------|------------|---------------|
| `BudgetExceeded80Percent` | Warning | >80% of monthly budget | Engineering lead | 4 hours |
| `BudgetExceededCritical` | Critical | >100% of budget | CFO + CTO | 1 hour |
| `AIBudgetWarning` | Warning | Tenant >80% AI budget | Tenant admin | 2 hours |
| `AIBudgetExceeded` | Critical | Tenant >100% AI budget | Account manager | 30 minutes |
| `TotalAISpendHigh` | Warning | >$10k/month AI spend | Engineering lead | 1 day |
| `CloudCostSpike` | Warning | >20% day-over-day | FinOps team | 4 hours |
| `S3BucketLarge` | Info | >1TB bucket | DevOps | 1 week |
| `OverprovisionedPod` | Info | CPU <40% for 6h | DevOps | 1 week |

### Escalation Path

```
┌─────────────────────┐
│ Prometheus Alert    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Alertmanager        │
│ - Routes by severity│
│ - Deduplicates      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Warning │ │Critical │
│ → Email │ │ → Page  │
└─────────┘ └─────────┘
           │
           ▼
┌─────────────────────┐
│ Escalation Policy   │
│ - 0-30m: On-call    │
│ - 30m-1h: Lead      │
│ - 1h+: Executive    │
└─────────────────────┘
```

### Alert Configuration

**Alertmanager routes:**
```yaml
route:
  group_by: ['alertname', 'category']
  routes:
  - match:
      category: finops
      severity: critical
    receiver: finops-pager
    continue: true
  - match:
      category: finops
      severity: warning
    receiver: finops-email
```

---

## Best Practices

### ✅ DO

- **Set budgets proactively** for all new tenants
- **Review cost recommendations weekly** and act on top 5
- **Monitor unit economics** (cost per customer) monthly
- **Test budget enforcement** in staging before production
- **Document all budget changes** in change log
- **Run storage retention scripts** monthly
- **Alert on forecast, not just actuals** (predict overruns)

### ❌ DON'T

- **Don't manually reset budgets** without approval
- **Don't ignore "info" alerts** - they prevent future waste
- **Don't set AI budgets too low** - causes user frustration
- **Don't skip monthly reviews** - compounding costs add up
- **Don't delete PVCs/LBs without verification** - risk data loss
- **Don't over-optimize prematurely** - measure first

---

## Appendix

### Files & Locations

| File | Purpose |
|------|---------|
| `/services/ai-budget/` | AI budget service (Fastify API) |
| `/services/ai-budget/src/db/schema.sql` | Database schema for budgets |
| `/services/reporting/src/middleware/ai-budget.ts` | Budget enforcement middleware |
| `/observability/grafana/dashboards/finops-cloud-cost.json` | Cloud cost dashboard |
| `/observability/grafana/dashboards/finops-ai-budget.json` | AI budget dashboard |
| `/observability/prometheus/finops-alerts.yaml` | FinOps alerting rules |
| `/scripts/infra/storage-retention.sh` | Storage lifecycle automation |
| `/scripts/finops/cost-recommendations.sh` | Cost optimization analyzer |
| `/k8s/base/*/hpa.yaml` | HPA configs (CPU targets) |
| `/k8s/base/reporting/keda-scaledobject.yaml` | Queue-based autoscaling |

### Support Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| **FinOps Lead** | finops@teei.io | Budget oversight, cost strategy |
| **Engineering Lead** | eng-lead@teei.io | Technical implementation, optimization |
| **CFO** | cfo@teei.io | Budget approvals, executive review |
| **Account Managers** | am-team@teei.io | Tenant budget discussions |
| **DevOps On-Call** | oncall@teei.io | Alert response, incident resolution |

### Useful Queries

**Find tenants approaching budget:**
```sql
SELECT
  tenant_id,
  model,
  monthly_limit_usd,
  current_usage_usd,
  ROUND((current_usage_usd / monthly_limit_usd * 100)::numeric, 2) AS percentage_used
FROM ai_token_budgets
WHERE current_usage_usd >= monthly_limit_usd * 0.8
ORDER BY percentage_used DESC;
```

**Top AI cost drivers (last 7 days):**
```sql
SELECT
  tenant_id,
  report_type,
  COUNT(*) AS requests,
  SUM(cost_usd) AS total_cost,
  AVG(cost_usd) AS avg_cost
FROM ai_token_usage
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY tenant_id, report_type
ORDER BY total_cost DESC
LIMIT 10;
```

---

**End of FinOps Strategy Guide**

For questions or updates, contact: finops@teei.io
