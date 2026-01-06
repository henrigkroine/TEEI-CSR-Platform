# SRE Infrastructure - TEEI CSR Platform

**Owner**: Worker 12 - SRE & Synthetics Team
**Last Updated**: 2025-11-17
**Status**: ✅ Production Ready

## Overview

This document describes the Site Reliability Engineering (SRE) infrastructure for the TEEI CSR Platform, including synthetic monitoring, SLO tracking, disaster recovery, and automated deployment safety mechanisms.

---

## Table of Contents

1. [Synthetic Monitoring](#synthetic-monitoring)
2. [SLO & Error Budgets](#slo--error-budgets)
3. [Health Checks](#health-checks)
4. [Canary Deployments](#canary-deployments)
5. [Disaster Recovery](#disaster-recovery)
6. [High Availability](#high-availability)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Synthetic Monitoring

### Overview

Continuous synthetic monitoring probes test critical user journeys across all regions.

**Location**: `services/synthetics/`

### Monitored Journeys (10 total)

1. **Tenant Login** (`pilot-routes/tenant-login.ts`)
   - SSO/OIDC authentication flow
   - SAML metadata validation
   - Target: < 2s LCP

2. **Dashboard Load** (`pilot-routes/dashboard-load.ts`)
   - Homepage rendering
   - Data fetching
   - Target: < 2s LCP

3. **Report Generation** (`pilot-routes/report-generation.ts`)
   - SROI/VIS calculation
   - Evidence aggregation
   - Target: < 5s generation time

4. **PDF Export** (`pilot-routes/export-pdf.ts`)
   - Report PDF generation
   - Watermarking validation
   - Target: < 2s export time

5. **PPTX Export** (`pilot-routes/export-pptx.ts`)  ✨ NEW
   - PowerPoint deck generation
   - Slide validation (cover + KPIs + charts)
   - Target: < 3s export time

6. **Boardroom Deck** (`pilot-routes/boardroom-deck.ts`)  ✨ NEW
   - Executive dashboard tiles
   - All tiles loaded successfully
   - Target: < 1.5s LCP

7. **Approval Workflow** (`pilot-routes/approval-workflow.ts`)
   - Draft → Review → Approve flow
   - Version diffs

8. **Evidence Explorer** (`pilot-routes/evidence-explorer.ts`)
   - Evidence lineage display
   - Citation validation

9. **Connectors Health** (`pilot-routes/connectors-health.ts`)  ✨ NEW
   - Benevity, Goodera, Workday, Kintell, Buddy, Upskilling
   - Dependency checks (DB, Redis, Queue, External API)
   - Target: 99.5% uptime

10. **Trust Center Status** (`pilot-routes/trust-center-status.ts`)  ✨ NEW
    - Public status page `/status.json`
    - Component health tracking
    - Incident reporting
    - Target: < 500ms response time

### Storage

**ClickHouse Tables**: `services/synthetics/schemas/clickhouse/`

- `synthetic_probes` - All probe results (90-day retention)
- `synthetic_probes_hourly` - Hourly aggregations
- `synthetic_probes_daily_slo` - Daily SLO metrics
- `synthetic_incidents` - Incident tracking
- `connector_health` - Connector uptime tracking

**Writer**: `services/synthetics/src/clickhouse-writer.ts`

### Usage

```bash
# Run all monitors once
cd services/synthetics
pnpm monitor:all

# Run specific monitor
pnpm monitor:boardroom-deck
pnpm monitor:connectors-health
pnpm monitor:trust-center-status

# Run as service (5-minute schedule)
pnpm start
```

---

## SLO & Error Budgets

### SLO Definitions

**Location**: `packages/observability/src/slo.ts`

| SLO | Target | Window | Threshold |
|-----|--------|--------|-----------|
| API Availability | 99.9% | Monthly | - |
| API Latency (p95) | 95% < 500ms | Hourly | 500ms |
| API Latency (p99) | 99% < 1000ms | Hourly | 1000ms |
| Frontend LCP (p95) | 95% < 2.5s | Daily | 2500ms |
| Boardroom LCP (p95) | 95% < 1.5s | Hourly | 1500ms |
| Error Rate | < 0.1% | Hourly | 0.1% |
| Export Generation (p95) | 95% < 3s | Hourly | 3000ms |
| Database Query (p95) | 95% < 100ms | Hourly | 100ms |
| Connector Health | 99.5% | Daily | - |

### Error Budget Calculation

**Formula**:
```
Total Budget = Total Events × (1 - SLO Target)
Error Budget Remaining = Total Budget - Errors Consumed
Burn Rate = Errors / Time Window (errors/hour)
```

**Burn Rate Alerts**:
- Fast burn (1h window): 14.4x normal rate → **Critical**
- Medium burn (6h window): 6x normal rate → **Critical**
- Slow burn (24h window): 3x normal rate → **Warning**

### Prometheus Metrics

**Exporter**: `packages/observability/src/slo-metrics.ts`

**Endpoint**: `GET /metrics/slo`

**Metrics**:
- `teei_slo_compliance` - 1 = compliant, 0 = violated
- `teei_slo_current_value` - Current metric value
- `teei_slo_target_value` - Target value
- `teei_error_budget_remaining_percent` - % remaining (0-100)
- `teei_error_budget_consumed_percent` - % consumed (0-100)
- `teei_error_budget_burn_rate` - Errors/hour
- `teei_slo_violations_total` - Counter of violations

### Grafana Dashboard

**Location**: `ops/grafana/dashboards/slo-monitoring.json`

**URL**: https://grafana.teei-platform.com/d/slo-monitoring

**Panels**:
- SLO Overview (compliance counts)
- API Availability SLO chart
- API Latency p95/p99 charts
- Error Budget gauges
- Burn rate alerts
- Frontend LCP tracking
- SLO violations table
- Compliance status grid

---

## Health Checks

### Endpoints

All services expose:

- `GET /health` - Detailed health with dependencies
- `GET /healthz` - Kubernetes-style health check
- `GET /readyz` - Readiness probe (can accept traffic?)
- `GET /livez` - Liveness probe (is service alive?)

### Implementation

**Package**: `packages/observability/src/health.ts`

```typescript
import { HealthCheckManager, registerHealthRoutes } from '@teei/observability';

// Create manager
const healthManager = new HealthCheckManager('api-gateway', '1.0.0');

// Register dependency checks
healthManager.registerCheck('database', createDatabaseHealthCheck('postgres', checkDB));
healthManager.registerCheck('redis', createRedisHealthCheck('redis', checkRedis));

// Mark ready when initialized
await initialize();
healthManager.setReady(true);

// Register routes (Fastify)
registerHealthRoutes(fastify, healthManager);
```

### Kubernetes Integration

**Deployment configuration**:

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2

startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 2
  failureThreshold: 30  # 60s total
```

---

## Canary Deployments

### Automated Canary Workflow

**Location**: `.github/workflows/release-canary.yml`

**Features**:
- ✅ Progressive traffic shifting (5% → 25% → 50% → 100%)
- ✅ Automated metrics analysis at each stage
- ✅ SLO compliance validation
- ✅ Error budget threshold enforcement
- ✅ Automatic rollback on violations
- ✅ Incident ticket creation

### Canary Stages

| Stage | Traffic | Duration | Validation |
|-------|---------|----------|------------|
| 1 | 5% | 5 min | Error rate, latency, SLO |
| 2 | 25% | 5 min | Error rate, latency, SLO |
| 3 | 50% | 5 min | Error rate, latency, SLO |
| 4 | 100% | - | Full promotion |

### Metrics Analysis

**Script**: `scripts/canary/analyze-metrics.sh`

**Checks**:
1. **Error Rate**: Canary vs Stable (< 0.1% difference)
2. **Latency p95**: Canary vs Stable (< 20% increase)
3. **SLO Compliance**: No critical violations
4. **Error Budget**: < threshold (default 10%)
5. **Request Volume**: Ensure canary receiving traffic
6. **Resource Usage**: CPU/Memory within limits

**Auto-Rollback Conditions**:
- Error rate > 0.1% higher than stable
- Latency > 20% slower than stable
- Any critical SLO violation
- Error budget consumption > threshold

### Usage

```bash
# Trigger canary deployment
gh workflow run release-canary.yml \
  -f service=api-gateway \
  -f version=v1.2.0 \
  -f region=us-east-1 \
  -f auto_rollback=true \
  -f slo_threshold=10

# Monitor progress
gh run watch

# Manual rollback (if needed)
gh workflow run rollback.yml \
  -f service=api-gateway \
  -f environment=production \
  -f reason="Performance regression detected"
```

---

## Disaster Recovery

### Region Failover

**Runbook**: `docs/sre/runbooks/region-failover.md`

**RTO**: 15 minutes
**RPO**: 5 minutes

**Procedure**:
1. Assessment (2 min)
2. Pre-failover prep (3 min)
3. DNS & traffic switchover (5 min)
4. Service activation (3 min)
5. Validation (2 min)

**Key Steps**:
- Promote read replica to primary
- Update DNS (Route53)
- Scale up services in secondary region
- Validate with synthetic tests

### Database Restore

**Runbook**: `docs/sre/runbooks/database-restore.md`

**RPO**: < 5 minutes (WAL archiving)
**RTO**: 30 min (logical), 2 hours (full)

**Scenarios**:
- Logical corruption (single table)
- Physical corruption (disk failure)
- Complete database loss
- Point-in-time recovery (PITR)

**Backup Architecture**:
- Full backups: Daily 02:00 UTC
- WAL archiving: Continuous (every 16MB or 5 min)
- Retention: 30 days
- Cross-region replication: S3 → S3 EU

### DR Smoke Tests

**Script**: `scripts/dr/smoke.sh`

**Validation**:
- Infrastructure (K8s cluster, nodes, pods)
- Database (connections, tables, data integrity)
- API health endpoints
- Critical user journeys
- External integrations
- SLO compliance
- Data integrity (foreign keys, recent data)

**Usage**:
```bash
# Run after failover
REGION=eu-central-1 BASE_URL=https://api-eu.teei-platform.com ./scripts/dr/smoke.sh

# Expected: All tests pass (exit 0)
```

---

## High Availability

### Pod Disruption Budgets (PDBs)

**Location**: `k8s/base/pod-disruption-budgets.yaml`

**Critical Services** (maxUnavailable: 1):
- api-gateway
- reporting
- analytics
- impact-calculator
- journey-engine
- unified-profile

**High Availability** (minAvailable: 2):
- q2q-ai
- corp-cockpit (50% min)

**Observability** (minAvailable: 1):
- prometheus
- grafana

### Deployment Strategy

**Production**:
- Min replicas: 3 (critical services)
- Max surge: 1
- Max unavailable: 0 (zero-downtime)
- Rolling update

**Auto-scaling**:
- HPA based on CPU/memory
- Custom metrics (request rate)
- Min: 3, Max: 10

---

## Monitoring & Alerts

### Prometheus Alert Rules

**Generated**: `packages/observability/src/slo-metrics.ts:generatePrometheusAlertRules()`

**Critical Alerts**:
- `SLOViolation` - SLO not met for 5 minutes
- `ErrorBudgetDepleted` - Error budget exhausted
- `ErrorBudgetFastBurn` - Consuming budget at 14.4x rate
- `APIAvailabilitySLOViolation` - API availability < 99.9%

**Warning Alerts**:
- `ErrorBudgetLow` - < 25% remaining for 10 minutes
- `ErrorBudgetSlowBurn` - Consuming budget at 3x rate
- `APILatencySLOViolation` - Latency exceeded for 10 minutes
- `FrontendLCPSLOViolation` - LCP exceeded for 15 minutes

### Alert Channels

- **Slack**: #incidents, #sre-alerts
- **PagerDuty**: SRE on-call rotation
- **Discord**: Engineering webhook
- **Email**: Critical alerts to leadership

---

## Related Documentation

- [Multi-Agent Plan](/AGENTS.md) - Worker 12 specifications
- [Region Failover Runbook](./runbooks/region-failover.md)
- [Database Restore Runbook](./runbooks/database-restore.md)
- [Gen-AI Reporting](/docs/GenAI_Reporting.md)

---

## Contacts

- **SRE Team**: #sre
- **On-Call**: PagerDuty rotation
- **Cloud Provider Support**: Via AWS/GCP console
- **Database Team**: #database-team

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-17 | Worker 12 SRE Team | Initial comprehensive SRE infrastructure |
