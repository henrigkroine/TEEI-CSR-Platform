# TEEI Automation & Scheduled Tasks

**Last Updated**: 2025-01-27

---

## Cron Jobs

### Campaign Management

#### Auto-Transition Campaigns
- **Service**: `services/campaigns/`
- **File**: `src/jobs/auto-transition-campaigns.ts`
- **Schedule**: Hourly (`0 * * * *`)
- **Purpose**: Automatically transition campaigns based on capacity/utilization
- **Status**: ✅ Working

#### Track Seat Usage
- **Service**: `services/campaigns/`
- **File**: `src/jobs/track-seat-usage.ts`
- **Schedule**: Hourly (`0 * * * *`)
- **Purpose**: Track volunteer seat utilization
- **Env Var**: `SEAT_USAGE_CRON_INTERVAL` (default: hourly)
- **Status**: ✅ Working

#### Track Credit Usage
- **Service**: `services/campaigns/`
- **File**: `src/jobs/track-credit-usage.ts`
- **Schedule**: Hourly (`0 * * * *`)
- **Purpose**: Track credit/budget utilization
- **Env Var**: `CREDIT_USAGE_CRON_INTERVAL` (default: hourly)
- **Status**: ✅ Working

#### Aggregate Campaign Metrics
- **Service**: `services/campaigns/`
- **File**: `src/jobs/aggregate-campaign-metrics.ts`
- **Schedule**: Hourly (`0 * * * *`)
- **Purpose**: Create campaign metrics snapshots
- **Status**: ✅ Working

---

### Impact Calculator

#### VIS Score Recalculation
- **Service**: `services/impact-calculator/`
- **File**: `src/batch-job.ts`
- **Schedule**: Daily at 2 AM (`0 2 * * *`)
- **Purpose**: Recalculate all VIS scores with fresh decay calculations
- **Env Var**: `VIS_CRON_SCHEDULE` (default: `0 2 * * *`)
- **Status**: ✅ Working

---

### Analytics Service

#### Data Sync Scheduler
- **Service**: `services/analytics/`
- **File**: `src/loaders/ingestion.ts`
- **Schedule**: Every 15 minutes
- **Purpose**: Sync data from PostgreSQL to ClickHouse
- **Status**: ✅ Working

---

### Notifications Service

#### Notification Scheduler
- **Service**: `services/notifications/`
- **File**: `src/lib/scheduler.ts`
- **Schedule**: Per notification (cron expression in DB)
- **Purpose**: Send scheduled notifications
- **Status**: ✅ Working

#### Email Worker
- **Service**: `services/notifications/`
- **File**: `src/workers/email-worker.ts`
- **Schedule**: Continuous (queue-based)
- **Purpose**: Process email queue
- **Status**: ✅ Working

---

### Synthetics Service

#### Synthetic Monitoring
- **Service**: `services/synthetics/`
- **File**: `src/index.ts`
- **Schedule**: Configurable (default: every 1-5 minutes)
- **Purpose**: Monitor critical endpoints
- **Monitors**:
  - Connector health
  - Trust center status
  - Export functionality
  - Boardroom deck
  - Approval workflow
  - Tenant login
  - Report generation
  - Evidence explorer
  - Dashboard load
- **Status**: ✅ Working

---

### Q2Q AI Service

#### Cache Warmer
- **Service**: `services/q2q-ai/`
- **File**: `src/slo/cache-warmer.ts`
- **Schedule**: Configurable cron expression
- **Purpose**: Warm up cache before business hours
- **Status**: ✅ Configured

#### Budget Reset
- **Service**: `services/q2q-ai/`
- **File**: `src/slo/budget-enforcer.ts`
- **Schedule**: Monthly/Daily (cron)
- **Purpose**: Reset monthly/daily AI budgets
- **Status**: ✅ Working

---

## Scheduled Tasks Summary

| Task | Service | Schedule | Purpose | Status |
|------|---------|----------|---------|--------|
| **Auto-Transition Campaigns** | campaigns | Hourly | Transition campaigns | ✅ |
| **Track Seat Usage** | campaigns | Hourly | Monitor seat utilization | ✅ |
| **Track Credit Usage** | campaigns | Hourly | Monitor credit usage | ✅ |
| **Aggregate Campaign Metrics** | campaigns | Hourly | Create snapshots | ✅ |
| **VIS Recalculation** | impact-calculator | Daily 2 AM | Recalculate scores | ✅ |
| **Data Sync** | analytics | Every 15 min | PostgreSQL → ClickHouse | ✅ |
| **Notification Scheduler** | notifications | Per notification | Send scheduled emails | ✅ |
| **Email Worker** | notifications | Continuous | Process email queue | ✅ |
| **Synthetic Monitoring** | synthetics | 1-5 min | Monitor endpoints | ✅ |
| **Cache Warmer** | q2q-ai | Configurable | Warm cache | ✅ |
| **Budget Reset** | q2q-ai | Monthly/Daily | Reset budgets | ✅ |

---

## Webhooks Received

| Source | Endpoint | Auth | Purpose | Status |
|--------|----------|------|---------|--------|
| **Resend** | `/v1/notifications/webhooks/sendgrid` | Signature | Email delivery status | ✅ |
| **Twilio** | `/v1/notifications/webhooks/twilio` | Signature | SMS delivery status | ⚠️ Stub |
| **Benevity** | `/webhooks/benevity` | HMAC-SHA256 | Volunteer/donation updates | ✅ |
| **Goodera** | `/webhooks/goodera` | OAuth | Volunteer updates | ✅ |
| **Workday** | `/webhooks/workday` | WS-Security | Directory updates | ✅ |
| **Kintell** | `/v1/webhooks/session-scheduled` | Signature | Session scheduled | ✅ |
| **Kintell** | `/v1/webhooks/session-completed` | Signature | Session completed | ✅ |

---

## Event-Driven Automation

### NATS Event Subscriptions

Services subscribe to events and perform automated actions:

| Event | Subscriber | Action | Status |
|-------|------------|--------|--------|
| `kintell.session.completed` | Analytics | Update metrics | ✅ |
| `kintell.session.completed` | Q2Q AI | Extract evidence | ✅ |
| `buddy.match.created` | Analytics | Update metrics | ✅ |
| `user.profile.updated` | Unified Profile | Update completeness | ✅ |
| `report.generated` | Notifications | Send email | ✅ |
| `campaign.status.changed` | Analytics | Update snapshots | ✅ |

---

## Cron Job Configuration

### Environment Variables

```bash
# Campaign Jobs
SEAT_USAGE_CRON_INTERVAL="0 * * * *"  # Hourly
CREDIT_USAGE_CRON_INTERVAL="0 * * * *"  # Hourly

# VIS Recalculation
VIS_CRON_SCHEDULE="0 2 * * *"  # Daily at 2 AM

# Analytics Sync
ANALYTICS_SYNC_INTERVAL="*/15 * * * *"  # Every 15 minutes

# Synthetic Monitoring
SYNTHETICS_SCHEDULE="*/5 * * * *"  # Every 5 minutes
```

---

## Kubernetes CronJobs

For production, cron jobs can be deployed as Kubernetes CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vis-recalculation
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: impact-calculator
            image: teei/impact-calculator:latest
            command: ["node", "src/batch-job.js"]
```

---

## Monitoring & Alerts

### Cron Job Health

- **Health Checks**: All cron jobs report status
- **Error Logging**: Failures logged to observability system
- **Alerts**: Failed cron jobs trigger alerts
- **Retry Logic**: Automatic retry on transient failures

---

## Manual Triggers

Some automated tasks can be triggered manually:

| Task | Endpoint | Auth | Purpose |
|------|----------|------|---------|
| **VIS Recalculation** | `POST /v1/impact-calculator/recalculate` | Yes | Manual recalculation |
| **Campaign Metrics** | `POST /v1/campaigns/:id/snapshot` | Yes | Create snapshot |
| **Data Sync** | `POST /v1/analytics/sync` | Yes | Trigger sync |
| **Cost Aggregation** | `POST /v1/analytics/finops/aggregate` | Yes | Aggregate costs |

---

## Automation Status Summary

| Category | Count | Working | Partial | Broken |
|----------|-------|---------|---------|--------|
| **Cron Jobs** | 11 | 11 | 0 | 0 |
| **Webhooks** | 7 | 6 | 1 | 0 |
| **Event Subscriptions** | 6+ | 6+ | 0 | 0 |
| **Manual Triggers** | 4 | 4 | 0 | 0 |

---

**Next**: See [10-ENV-VARIABLES.md](./10-ENV-VARIABLES.md) for environment variable documentation.
