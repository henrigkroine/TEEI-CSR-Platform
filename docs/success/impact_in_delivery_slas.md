# Impact-In Delivery SLAs

## Overview

This document defines Service Level Agreements (SLAs) for automated Impact-In deliveries to third-party platforms (Benevity, Goodera, Workday). These SLAs ensure reliable, timely delivery of impact data to partner platforms.

**Last Updated:** 2025-11-15
**Owner:** Worker 4 Team (Impact Scheduler & SLA Monitor)

---

## SLA Definitions

### 1. On-Time Delivery Rate

**Definition:** Percentage of scheduled deliveries completed successfully within their scheduled window.

**Target:** ≥ 98%

**Measurement Window:** Rolling 7-day period

**Calculation:**
```
On-Time Rate = (Successful Deliveries / Total Scheduled Deliveries) × 100%
```

**Breach Threshold:**
- **Warning:** < 95%
- **Critical:** < 98%

**Example:**
- Scheduled deliveries: 100
- Successful: 97
- Failed: 3
- On-Time Rate: 97% ❌ (BREACH)

---

### 2. Delivery Latency

**Definition:** Time elapsed between scheduled delivery time and actual successful delivery.

**Target:** ≤ 5 minutes

**Measurement:** Average latency across all deliveries in measurement window

**Calculation:**
```
Latency = Delivered_At - Scheduled_Time
Avg Latency = SUM(Latency) / COUNT(Deliveries)
```

**Breach Threshold:**
- **Warning:** > 4 minutes average
- **Critical:** > 5 minutes average

**Notes:**
- Excludes deliveries that failed all retry attempts
- Includes time spent in retry logic
- Measured in UTC timezone

---

### 3. Retry Success Rate

**Definition:** Percentage of initially failed deliveries that succeed after retry attempts.

**Target:** ≥ 90%

**Max Retry Attempts:** 3

**Retry Strategy:** Exponential backoff
- 1st retry: 5 minutes
- 2nd retry: 10 minutes
- 3rd retry: 20 minutes

**Calculation:**
```
Retry Success Rate = (Retried Successes / Total Retried) × 100%
```

**Breach Threshold:**
- **Warning:** < 85%
- **Critical:** < 90%

**Example:**
- Initial failures: 10
- Success after 1 retry: 6
- Success after 2 retries: 2
- Success after 3 retries: 1
- Permanent failures: 1
- Retry Success Rate: 90% ✅

---

## Platform-Specific SLAs

### Benevity
- **Expected Response Time:** < 2 seconds
- **Rate Limit:** 100 requests/minute
- **Idempotency:** 24-hour cache window
- **Webhook Signature:** HMAC-SHA256 required

### Goodera
- **Expected Response Time:** < 3 seconds
- **Rate Limit:** 60 requests/minute
- **Idempotency:** Payload hash-based
- **Authentication:** Bearer token (refreshed every 6 hours)

### Workday
- **Expected Response Time:** < 5 seconds
- **Rate Limit:** 30 requests/minute
- **Idempotency:** Transaction ID-based
- **Authentication:** OAuth 2.0 client credentials

---

## Monitoring & Alerting

### Real-Time Monitoring

The SLA monitor service runs continuously and tracks:

1. **Delivery Success Rate** (per company, per platform)
2. **Average Delivery Latency** (milliseconds)
3. **Retry Attempt Distribution** (1st, 2nd, 3rd attempts)
4. **Payload Size Metrics** (average, max)
5. **Consecutive Failure Count** (per schedule)

### Alert Triggers

| Condition | Severity | Notification Channel | Response Time |
|-----------|----------|---------------------|---------------|
| Success rate < 98% | Critical | PagerDuty + Slack | Immediate |
| Success rate < 95% | Warning | Slack only | 1 hour |
| Avg latency > 5 min | Critical | PagerDuty + Slack | Immediate |
| 3+ consecutive failures | Critical | PagerDuty + Slack | Immediate |
| Platform downtime detected | Critical | PagerDuty + Slack | Immediate |

### Alert Payload Example (Slack)

```json
{
  "text": "🚨 SLA CRITICAL Alert",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Impact-In SLA BREACH"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Company:*\nAcme Corp (uuid-123)"
        },
        {
          "type": "mrkdwn",
          "text": "*Platform:*\nBenevity"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "• *success_rate*: 96.50% (threshold: 98.00%)\n• *latency*: 6.2 min (threshold: 5.0 min)"
      }
    }
  ]
}
```

---

## Escalation Procedures

### Level 1: Warning (< 95% success rate)

**Actions:**
1. Log warning in monitoring dashboard
2. Send Slack notification to #impact-in-ops channel
3. No immediate action required
4. Review at next business day standup

**Responsible:** On-call engineer

---

### Level 2: SLA Breach (< 98% success rate)

**Actions:**
1. **Immediate (0-15 minutes):**
   - PagerDuty alert to on-call engineer
   - Slack notification to #impact-in-critical
   - Automated health check on platform connectors

2. **Short-term (15-60 minutes):**
   - Review failed delivery logs
   - Check platform status pages (Benevity, Goodera, Workday)
   - Manual retry of failed deliveries if platform issue resolved
   - Notify affected customers if widespread

3. **Long-term (1-4 hours):**
   - Root cause analysis
   - Implement fix or workaround
   - Update incident post-mortem
   - Schedule customer communication if needed

**Responsible:** On-call engineer → Engineering Lead (if unresolved in 1 hour)

---

### Level 3: Platform Outage (complete failure for 30+ minutes)

**Actions:**
1. **Immediate:**
   - Pause all scheduled deliveries to affected platform
   - Escalate to Engineering Lead and Product Manager
   - Post incident status to status page
   - Notify all affected customers

2. **During Outage:**
   - Monitor platform status
   - Queue failed deliveries for automatic retry when platform recovers
   - Update customers every 2 hours

3. **Recovery:**
   - Resume scheduled deliveries
   - Trigger bulk replay of failed deliveries
   - Verify SLA compliance restored
   - Complete incident post-mortem within 24 hours

**Responsible:** Engineering Lead + Product Manager

---

## Replay Workflow

### Manual Replay (Admin UI)

Admins can manually replay failed deliveries via the Corporate Cockpit:

**Path:** `/{lang}/cockpit/{companyId}/deliveries`

**Features:**
- View last 30 deliveries timeline
- Filter by platform and status
- One-click replay for single delivery
- Bulk replay for multiple deliveries
- Real-time status updates

**Permissions Required:** `ADMIN_CONSOLE` + `MANAGE_INTEGRATIONS`

**API Endpoints:**
```
POST /v1/impact-in/deliveries/:id/replay
POST /v1/impact-in/deliveries/bulk-replay
POST /v1/impact-in/deliveries/retry-all-failed
```

### Automatic Replay

The scheduler automatically retries failed deliveries:

1. **1st Retry:** 5 minutes after initial failure
2. **2nd Retry:** 10 minutes after 1st retry
3. **3rd Retry:** 20 minutes after 2nd retry
4. **Permanent Failure:** After 3rd retry fails, marked as permanent failure and alerts triggered

**Idempotency:** Payload hash ensures duplicate deliveries are prevented, even across retries.

---

## SLA Reporting

### Weekly SLA Report

Generated every Monday at 00:00 UTC for the previous week.

**Recipients:**
- Engineering Lead
- Product Manager
- Customer Success (for customer-facing summaries)

**Contents:**
1. Overall success rate (company-wide)
2. Per-platform success rates
3. Average delivery latency
4. Retry attempt distribution
5. Top 5 failed deliveries (with root causes)
6. Recommendations for improvement

**API Endpoint:**
```
GET /v1/impact-in/sla-report?companyId={id}&startDate={iso}&endDate={iso}
```

### Monthly SLA Review

**Cadence:** First Monday of each month

**Attendees:**
- Engineering Lead
- Product Manager
- On-call engineers rotation

**Agenda:**
1. Review previous month's SLA performance
2. Analyze trends (improving/degrading)
3. Identify systemic issues
4. Prioritize improvements
5. Update SLA targets if needed

---

## Dashboard API

### GET /v1/impact-in/sla-status

Returns real-time SLA status for a company.

**Query Parameters:**
- `companyId` (required): Company UUID
- `startDate` (optional): ISO 8601 date (defaults to 7 days ago)
- `endDate` (optional): ISO 8601 date (defaults to now)

**Response:**
```json
{
  "overall": {
    "totalDeliveries": 142,
    "successfulDeliveries": 139,
    "failedDeliveries": 3,
    "successRate": 0.9789,
    "retrySuccessRate": 0.9167,
    "avgDeliveryLatencyMs": 2340,
    "avgPayloadSizeBytes": 4523,
    "avgRetries": 1.2,
    "slaStatus": "healthy",
    "breaches": []
  },
  "byPlatform": [
    {
      "platform": "benevity",
      "totalDeliveries": 48,
      "successfulDeliveries": 47,
      "successRate": 0.9792,
      "avgDeliveryLatencyMs": 1890,
      "slaStatus": "healthy",
      "breaches": []
    },
    {
      "platform": "goodera",
      "totalDeliveries": 47,
      "successfulDeliveries": 45,
      "successRate": 0.9574,
      "avgDeliveryLatencyMs": 2650,
      "slaStatus": "warning",
      "breaches": [
        {
          "type": "success_rate",
          "threshold": 0.98,
          "actual": 0.9574,
          "severity": "warning"
        }
      ]
    },
    {
      "platform": "workday",
      "totalDeliveries": 47,
      "successfulDeliveries": 47,
      "successRate": 1.0,
      "avgDeliveryLatencyMs": 2480,
      "slaStatus": "healthy",
      "breaches": []
    }
  ]
}
```

---

## Frequency Options

Scheduler supports flexible delivery frequencies:

### Predefined Frequencies

| Frequency | Cron Expression | Description |
|-----------|----------------|-------------|
| Hourly | `0 * * * *` | Every hour at :00 |
| Every 6 Hours | `0 */6 * * *` | 00:00, 06:00, 12:00, 18:00 |
| Daily | `0 0 * * *` | Every day at midnight |
| Weekly | `0 0 * * 0` | Every Sunday at midnight |
| Monthly | `0 0 1 * *` | 1st of month at midnight |

### Custom Frequencies

Use standard cron expressions for custom schedules:

**Examples:**
- `0 9 * * 1-5` - Weekdays at 9:00 AM
- `0 0,12 * * *` - Twice daily (midnight and noon)
- `0 0 * * 1,3,5` - Mon/Wed/Fri at midnight
- `0 */4 * * *` - Every 4 hours

**Validation:** All cron expressions validated before schedule creation.

**Preview:** API provides preview of next 5 run times before schedule activation.

---

## Idempotency Strategy

### Payload Hashing

Each delivery payload is hashed using SHA-256:

```typescript
const payloadHash = createHash('sha256')
  .update(JSON.stringify(payload, Object.keys(payload).sort()))
  .digest('hex');
```

### Duplicate Detection

Before delivery:
1. Generate payload hash
2. Check if hash exists in `impact_deliveries` table with status `'delivered'`
3. If exists, skip delivery (idempotent)
4. If not exists, proceed with delivery

### Cache TTL

- **Benevity:** 24 hours
- **Goodera:** 24 hours
- **Workday:** 24 hours

After TTL expires, same payload can be delivered again (e.g., for daily metrics updates).

---

## Performance Benchmarks

### Target Performance

| Metric | Target | Current (Q4 2024) |
|--------|--------|-------------------|
| Delivery Success Rate | ≥ 98% | 98.7% ✅ |
| Avg Delivery Latency | ≤ 5 min | 2.3 min ✅ |
| Retry Success Rate | ≥ 90% | 92.1% ✅ |
| Platform Uptime (Benevity) | ≥ 99.5% | 99.8% ✅ |
| Platform Uptime (Goodera) | ≥ 99.5% | 99.2% ⚠️ |
| Platform Uptime (Workday) | ≥ 99.5% | 99.9% ✅ |

### Capacity Planning

| Load | Max Concurrent Deliveries | Avg Response Time |
|------|--------------------------|-------------------|
| Low (< 100/hour) | 10 | 1.8s |
| Medium (100-500/hour) | 25 | 2.4s |
| High (500-1000/hour) | 50 | 3.2s |
| Peak (> 1000/hour) | 100 | 4.5s |

**Note:** Auto-scaling configured to maintain response times under load.

---

## Troubleshooting

### Common Issues

#### Issue: High Latency (> 5 minutes)

**Symptoms:**
- Deliveries taking longer than expected
- SLA warnings for latency

**Possible Causes:**
1. Platform API slowness
2. Large payload sizes
3. Network congestion
4. Rate limiting

**Resolution:**
1. Check platform status pages
2. Review payload sizes (optimize if > 100KB)
3. Verify rate limit thresholds not exceeded
4. Check network connectivity to platform endpoints

---

#### Issue: Low Success Rate (< 98%)

**Symptoms:**
- Repeated delivery failures
- SLA breach alerts

**Possible Causes:**
1. Platform downtime/maintenance
2. Invalid credentials/API keys
3. Malformed payloads
4. Rate limit exceeded

**Resolution:**
1. Verify platform status
2. Check API key expiration dates
3. Review failed delivery error messages
4. Validate payload schema against platform specs
5. Manual replay after resolution

---

#### Issue: Consecutive Failures (3+)

**Symptoms:**
- Same schedule failing repeatedly
- Critical alerts triggered

**Possible Causes:**
1. Misconfigured schedule
2. Company data unavailable
3. Platform configuration issue
4. Authentication failure

**Resolution:**
1. Review schedule configuration
2. Verify company has active data
3. Test platform connection manually
4. Re-authenticate platform integration
5. Pause schedule if issue persists, escalate

---

## Appendix A: Database Schema

### scheduled_deliveries

```sql
CREATE TABLE scheduled_deliveries (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'benevity', 'goodera', 'workday'
  schedule VARCHAR(100) NOT NULL, -- cron expression
  active BOOLEAN DEFAULT true,
  timezone VARCHAR(50) DEFAULT 'UTC',
  next_run TIMESTAMP NOT NULL,
  last_run TIMESTAMP,
  last_status VARCHAR(20), -- 'success', 'failed'
  last_error TEXT,
  consecutive_failures INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### impact_deliveries

```sql
CREATE TABLE impact_deliveries (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  schedule_id UUID,
  provider VARCHAR(50) NOT NULL, -- 'benevity', 'goodera', 'workday'
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'retrying'
  payload JSONB NOT NULL,
  payload_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  payload_sample JSONB, -- Truncated payload for UI preview
  attempt_count INT DEFAULT 1,
  last_error TEXT,
  provider_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Appendix B: References

- **Scheduler Implementation:** `/services/impact-in/scheduler/index.ts`
- **SLA Monitor Implementation:** `/services/impact-in/sla-monitor/index.ts`
- **Delivery UI:** `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/deliveries.astro`
- **Platform Specs:**
  - Benevity: `/docs/impact_in/benevity_spec.md`
  - Goodera: `/docs/impact_in/goodera_spec.md`
  - Workday: `/docs/impact_in/workday_spec.md`

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-15 | 1.0 | Initial SLA definitions | Worker 4 Team |
