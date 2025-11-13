# Production Operations Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-13

This guide covers all production operations systems implemented in Phase C.

---

## Table of Contents

1. [Scheduled Deliveries](#scheduled-deliveries)
2. [Safety & Moderation](#safety--moderation)
3. [Privacy & DSAR](#privacy--dsar)
4. [API Versioning](#api-versioning)
5. [Performance Monitoring](#performance-monitoring)
6. [Cost Controls](#cost-controls)
7. [Troubleshooting](#troubleshooting)

---

## Scheduled Deliveries

### Overview

The Impact-In scheduler automates delivery of company metrics to partner platforms (Benevity, Goodera, Workday) on configurable schedules.

### Creating a Schedule

```bash
curl -X POST http://localhost:3008/impact-in/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "c1111111-1111-1111-1111-111111111111",
    "platform": "benevity",
    "schedule": "0 0 1 * *"
  }'
```

**Response:**
```json
{
  "success": true,
  "schedule": {
    "id": "schedule-123",
    "companyId": "c1111111-1111-1111-1111-111111111111",
    "platform": "benevity",
    "schedule": "0 0 1 * *",
    "nextRun": "2025-12-01T00:00:00Z",
    "active": true
  }
}
```

### Common Cron Expressions

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| **Monthly** | `0 0 1 * *` | 1st day of each month at midnight |
| **Quarterly** | `0 0 1 */3 *` | 1st day of Jan, Apr, Jul, Oct |
| **Weekly** | `0 0 * * 1` | Every Monday at midnight |
| **Daily** | `0 2 * * *` | Every day at 2 AM |
| **Bi-weekly** | `0 0 1,15 * *` | 1st and 15th of each month |

### Preview Payload

Before a scheduled delivery runs, preview what will be sent:

```bash
curl http://localhost:3008/impact-in/schedules/schedule-123/preview
```

**Response:**
```json
{
  "success": true,
  "preview": {
    "companyId": "...",
    "platform": "benevity",
    "payload": {
      "totalEmployees": 1000,
      "activeParticipants": 750,
      "totalHoursVolunteered": 5000,
      "impactScore": 7.8
    },
    "generatedAt": "2025-11-13T10:00:00Z",
    "note": "This is a preview. No actual delivery will be made."
  }
}
```

### Manual Trigger

Trigger a scheduled delivery immediately:

```bash
curl -X POST http://localhost:3008/impact-in/schedules/schedule-123/run-now
```

### Monitor Delivery Status

Check statistics for all scheduled deliveries:

```bash
curl http://localhost:3008/impact-in/schedules/stats
```

**Response:**
```json
{
  "success": true,
  "stats": [
    {
      "platform": "benevity",
      "totalSchedules": 45,
      "activeSchedules": 42,
      "successfulRuns": 38,
      "failedRuns": 4
    }
  ]
}
```

---

## Safety & Moderation

### Overview

The safety pipeline screens all user-generated content for profanity, spam, PII, and toxic content before it reaches AI classification.

### Screen Text

```bash
curl -X POST http://localhost:3003/screen/text \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "feedback-123",
    "contentType": "feedback_text",
    "text": "This is a test message"
  }'
```

**Safe Response:**
```json
{
  "safe": true,
  "flags": [],
  "requiresReview": false
}
```

**Flagged Response:**
```json
{
  "safe": false,
  "flagId": "flag-456",
  "reason": "profanity, spam",
  "confidence": 0.75,
  "requiresReview": true,
  "flags": [
    {
      "type": "profanity",
      "reason": "Profanity detected in text",
      "confidence": 0.7,
      "details": { "count": 2 }
    },
    {
      "type": "spam",
      "reason": "Spam patterns detected",
      "confidence": 0.5,
      "details": { "excessiveCaps": true }
    }
  ]
}
```

### Review Queue

#### Get Pending Reviews

```bash
curl http://localhost:3003/safety/queue?limit=50&offset=0
```

**Response:**
```json
{
  "items": [
    {
      "queueItem": {
        "id": "queue-123",
        "flagId": "flag-456",
        "status": "pending",
        "createdAt": "2025-11-13T10:00:00Z"
      },
      "flag": {
        "id": "flag-456",
        "contentId": "feedback-123",
        "contentType": "feedback_text",
        "flagReason": "profanity",
        "confidence": "0.750"
      }
    }
  ],
  "count": 1
}
```

#### Review an Item

```bash
curl -X POST http://localhost:3003/safety/queue/queue-123/review \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Reviewed - acceptable in context",
    "assignedTo": "reviewer-user-id"
  }'
```

#### Escalate

```bash
curl -X POST http://localhost:3003/safety/queue/queue-123/escalate \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Requires admin review",
    "assignedTo": "admin-user-id"
  }'
```

#### Dismiss

```bash
curl -X POST http://localhost:3003/safety/queue/queue-123/dismiss \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "False positive"
  }'
```

### Safety Events

The safety service emits events when content is flagged:

```typescript
eventBus.on('safety.flag.raised', (event) => {
  console.log('Content flagged:', event.data);
  // {
  //   flagId: 'flag-456',
  //   contentId: 'feedback-123',
  //   flagReason: 'profanity',
  //   confidence: 0.75,
  //   requiresHumanReview: true
  // }
});
```

---

## Privacy & DSAR

### Overview

Implements GDPR-compliant data subject access requests (DSAR) for data export and deletion.

### Data Export

#### Request Export

```bash
curl -X POST http://localhost:3001/privacy/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user-jwt-token" \
  -d '{
    "userId": "user-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "requestId": "export-789",
  "status": "pending",
  "message": "Export request created. You will be notified when complete."
}
```

#### Check Export Status

```bash
curl http://localhost:3001/privacy/export/export-789
```

**Response:**
```json
{
  "success": true,
  "request": {
    "id": "export-789",
    "status": "completed",
    "progress": 100,
    "resultPath": "/exports/user-data-export-user-123-1699900000.json",
    "requestedAt": "2025-11-13T10:00:00Z",
    "completedAt": "2025-11-13T10:05:00Z"
  }
}
```

### Data Deletion

#### Request Deletion (Requires Admin)

```bash
curl -X POST http://localhost:3001/privacy/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-jwt-token" \
  -d '{
    "userId": "user-123",
    "adminApproved": true
  }'
```

**Response:**
```json
{
  "success": true,
  "requestId": "delete-101",
  "status": "pending",
  "message": "Delete request created and will be processed"
}
```

#### Check Deletion Status

```bash
curl http://localhost:3001/privacy/delete/delete-101
```

### Get All Requests

```bash
curl http://localhost:3001/privacy/requests/user-123
```

### Audit Trail

```bash
curl http://localhost:3001/privacy/audit/export-789
```

**Response:**
```json
{
  "success": true,
  "auditLogs": [
    {
      "id": "audit-1",
      "requestId": "export-789",
      "action": "export_requested",
      "details": { "userId": "user-123", "email": "user@example.com" },
      "performedBy": "user-123",
      "performedAt": "2025-11-13T10:00:00Z"
    },
    {
      "id": "audit-2",
      "requestId": "export-789",
      "action": "data_exported",
      "details": { "filepath": "/exports/...", "recordCounts": {...} },
      "performedAt": "2025-11-13T10:05:00Z"
    }
  ]
}
```

---

## API Versioning

### Overview

All public APIs are versioned to prevent breaking changes for consumers.

### Using v1 Routes

**Old (deprecated):**
```bash
curl http://localhost:3004/metrics/company-123
```

**New (v1):**
```bash
curl http://localhost:3004/v1/metrics/company-123
```

### Deprecation Warnings

Responses from deprecated endpoints include a warning header:

```
X-API-Version-Deprecated: true
```

### OpenAPI Documentation

Access API documentation at:

- Per-service: `http://localhost:3004/docs`
- Unified catalog: `http://localhost:3001/api-docs/catalog`

### Client SDKs

Use typed TypeScript clients instead of raw HTTP:

```typescript
import { createReportingClient } from '@teei/clients/reporting';

const client = createReportingClient('http://localhost:3004');
const metrics = await client.getMetrics('company-123');
```

---

## Performance Monitoring

### Overview

Comprehensive load testing and monitoring for production readiness.

### Running Load Tests

```bash
# Ingestion load test (1000 req/s)
k6 run tests/k6/ingestion-load.js

# Reporting load test (100 concurrent users)
k6 run tests/k6/reporting-load.js

# Soak test (1 hour sustained load)
k6 run tests/k6/soak-test.js
```

### Performance Targets

| Service | Metric | Target | Current |
|---------|--------|--------|---------|
| **Ingestion** | Throughput | 1000 req/s | 980 req/s ✅ |
| **Ingestion** | p95 Latency | < 500ms | 380ms ✅ |
| **Reporting** | p95 Latency | < 1000ms | 850ms ✅ |
| **All** | Error Rate | < 1% | 0.3-0.5% ✅ |

### Monitoring Metrics

#### Application Metrics

Available at `/metrics` endpoints (Prometheus format):

```bash
# Q2Q AI metrics
curl http://localhost:3007/metrics

# Analytics metrics
curl http://localhost:3004/metrics
```

**Key Metrics:**
- `q2q_requests_total` - Total Q2Q classification requests
- `q2q_cost_dollars` - Total AI costs
- `q2q_tokens_total` - Total tokens processed
- `http_req_duration_p95` - 95th percentile latency

#### Grafana Dashboards

Import dashboards from `/monitoring/grafana-dashboards/`:
1. Cost Overview Dashboard
2. Performance Dashboard
3. Error Rate Dashboard

---

## Cost Controls

### Overview

AI spend tracking and budget enforcement for Q2Q classification service.

### Check Budget

```bash
curl http://localhost:3007/cost/budget/company-123
```

**Response:**
```json
{
  "success": true,
  "budget": {
    "allowed": true,
    "budget": 1000.00,
    "spent": 425.50,
    "remaining": 574.50
  }
}
```

### Cost Metrics

```bash
curl http://localhost:3007/cost/metrics
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "totalRequests": 15000,
    "totalCost": 18.50,
    "totalTokens": 6750000,
    "avgCostPerRequest": 0.0012,
    "byProvider": {
      "openai": { "count": 8000, "cost": 9.60, "tokens": 3600000 },
      "anthropic": { "count": 7000, "cost": 8.90, "tokens": 3150000 }
    },
    "byModel": {
      "gpt-3.5-turbo": { "count": 6000, "cost": 7.20, "tokens": 2700000 },
      "claude-3-haiku": { "count": 7000, "cost": 5.60, "tokens": 2940000 }
    }
  }
}
```

### Rate Limiting

Automatically enforced:
- **100 requests/minute per company** for Q2Q classification
- Returns `429 Too Many Requests` when exceeded
- Budget check before each request

### Budget Exceeded Response

```json
{
  "error": "AI Budget Exceeded",
  "message": "Monthly AI budget has been exceeded. Please contact your administrator.",
  "budget": {
    "allowed": false,
    "budget": 1000.00,
    "spent": 1025.00,
    "remaining": -25.00
  }
}
```

### Cost Optimization

**Recommendations:**
1. Use Claude 3 Haiku for simple classifications (cheapest)
2. Enable response caching for repeated queries
3. Implement batch processing for bulk classifications
4. Consider self-hosted models for high-volume companies

**Potential Savings:**
- Smart model selection: -25%
- Response caching: -10%
- Batch processing: -7%
- **Total: 35-42% cost reduction**

---

## Troubleshooting

### Scheduled Deliveries Not Running

**Symptoms:** Schedules created but deliveries never execute

**Diagnosis:**
```bash
# Check if scheduler is running
curl http://localhost:3008/health

# Check schedule details
curl http://localhost:3008/impact-in/schedules/schedule-123

# Check logs
docker logs impact-in-service
```

**Solutions:**
1. Verify cron expression is valid
2. Check `nextRun` timestamp is in the future
3. Ensure schedule is `active: true`
4. Restart service to reinitialize scheduler

### Safety Queue Backlog

**Symptoms:** Review queue growing faster than manual review capacity

**Diagnosis:**
```bash
# Check queue size
curl http://localhost:3003/safety/queue | jq '.count'
```

**Solutions:**
1. Adjust confidence thresholds to reduce false positives
2. Add more reviewers
3. Implement auto-dismiss for low-confidence flags
4. Enable ML-based pre-filtering

### Privacy Export Stuck

**Symptoms:** Export request stays in "processing" status

**Diagnosis:**
```bash
# Check export status
curl http://localhost:3001/privacy/export/export-789

# Check logs
docker logs api-gateway
```

**Solutions:**
1. Check for database connection issues
2. Verify export directory is writable
3. Check for timeout in large exports
4. Restart export job manually

### High AI Costs

**Symptoms:** Companies rapidly approaching budget limits

**Diagnosis:**
```bash
# Check top spenders
curl http://localhost:3007/cost/metrics?companyId=company-123

# Check model usage
curl http://localhost:3007/cost/metrics | jq '.metrics.byModel'
```

**Solutions:**
1. Enable rate limiting (already active)
2. Implement smart model selection
3. Add response caching
4. Review classification frequency
5. Adjust monthly budgets

### Performance Degradation

**Symptoms:** p95 latency increasing over time

**Diagnosis:**
```bash
# Run load test to establish baseline
k6 run tests/k6/ingestion-load.js

# Check metrics
curl http://localhost:3004/metrics
```

**Solutions:**
1. Increase database connection pool
2. Add Redis caching layer
3. Optimize slow queries (check logs)
4. Scale horizontally (add instances)
5. Enable CDN for static content

---

## Support & Escalation

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0** | Service down | 15 minutes | All services unavailable |
| **P1** | Critical feature broken | 1 hour | Scheduled deliveries failing |
| **P2** | Major feature impaired | 4 hours | High latency (>2s) |
| **P3** | Minor issue | 24 hours | UI bug, cosmetic issue |

### Contact

- **On-call:** PagerDuty alert
- **Email:** ops@teei-platform.com
- **Slack:** #platform-operations

### Runbooks

Detailed runbooks available in `/docs/runbooks/`:
- `scheduled_deliveries.md`
- `safety_moderation.md`
- `privacy_dsar.md`
- `performance_issues.md`
- `cost_overruns.md`

---

## Changelog

### v1.0.0 (2025-11-13)
- ✅ Initial release of all production operations systems
- ✅ Scheduled deliveries with cron
- ✅ Safety screening and review queue
- ✅ Privacy export/deletion (GDPR)
- ✅ API versioning (v1)
- ✅ Performance testing suite
- ✅ AI cost controls

---

**End of Production Operations Guide**

For more information, see:
- [Phase C Operations Summary](../PHASE_C_OPERATIONS_SUMMARY.md)
- [Performance Report](../reports/perf_ingest_reporting.md)
- [AI Costs Report](../reports/ai_costs.md)
