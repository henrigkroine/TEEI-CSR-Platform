# Status Page Configuration

Public-facing status page for TEEI CSR Platform transparency.

## Overview

We use **Statuspage.io** (Atlassian) to provide real-time status updates to our customers and stakeholders.

**URL**: https://status.teei-csr.com

## Architecture

```
┌─────────────────────┐
│  K8s Cluster        │
│  ┌───────────────┐  │      ┌──────────────────┐
│  │ Statuspage    │  │─────►│ Statuspage.io    │
│  │ Exporter      │  │      │ API              │
│  └───────────────┘  │      └──────────────────┘
│         ▲           │              │
│         │           │              ▼
│  ┌──────┴────────┐  │      ┌──────────────────┐
│  │ Prometheus    │  │      │ Public Status    │
│  │ Metrics       │  │      │ Page             │
│  └───────────────┘  │      └──────────────────┘
└─────────────────────┘
```

## Components

### Components Monitored

1. **API Gateway** - Entry point for all API requests
2. **Corporate Cockpit** - Dashboard web application
3. **Reporting Service** - SROI/VIS calculations
4. **Impact Calculator** - Impact metrics computation
5. **Q2Q AI Service** - AI-generated insights
6. **Analytics Service** - Data warehouse queries
7. **Journey Engine** - User journey tracking
8. **Notifications** - Email/SMS/Discord notifications
9. **SSO/Authentication** - Login and session management
10. **Database** - PostgreSQL persistence layer

### Metrics Exported

For each component:

- **Status** - `operational`, `degraded_performance`, `partial_outage`, `major_outage`
- **Uptime %** - Rolling 90-day uptime percentage
- **Response Time** - P50, P95, P99 latencies
- **Error Rate** - 5xx error rate over last 5 minutes

### Incidents

Automatically created when:

- Service health check fails for >2 minutes
- Error rate exceeds 5% for >5 minutes
- Latency P95 exceeds 2000ms for >5 minutes
- Synthetic monitoring fails 3 consecutive times

## Statuspage.io Configuration

### API Key

Store in Kubernetes secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: statuspage-api-key
  namespace: teei-csr
type: Opaque
stringData:
  api-key: sp_xxxxxxxxxxxxxxxxxxxx
  page-id: xxxxxxxxxxxxx
```

### Component IDs

Map our services to Statuspage.io component IDs:

| Service | Component ID | Description |
|---------|--------------|-------------|
| API Gateway | `cmp_api_gateway` | API entry point |
| Corporate Cockpit | `cmp_cockpit_ui` | Web dashboard |
| Reporting Service | `cmp_reporting` | SROI/VIS reports |
| Impact Calculator | `cmp_impact_calc` | Impact metrics |
| Q2Q AI Service | `cmp_q2q_ai` | AI insights |
| Analytics Service | `cmp_analytics` | Data warehouse |
| Journey Engine | `cmp_journey` | Journey tracking |
| Notifications | `cmp_notifications` | Alerts/comms |
| SSO/Authentication | `cmp_sso_auth` | Login services |
| Database | `cmp_database` | PostgreSQL |

### Metric IDs

For each component, we track:

- **Uptime %**: `metric_<component>_uptime`
- **Response Time**: `metric_<component>_latency_p95`
- **Error Rate**: `metric_<component>_error_rate`

Example for API Gateway:
- `metric_api_gateway_uptime`
- `metric_api_gateway_latency_p95`
- `metric_api_gateway_error_rate`

## Statuspage Exporter

The `statuspage-exporter` service runs in Kubernetes and periodically pushes metrics to Statuspage.io.

### Configuration

See: `k8s/base/observability/statuspage-exporter/`

**Frequency**: Every 60 seconds

**Source**: Prometheus metrics

**API**: Statuspage.io REST API v2

### Deployment

```bash
# Deploy statuspage-exporter
kubectl apply -k k8s/base/observability/statuspage-exporter/

# Verify deployment
kubectl get pods -n teei-csr -l app=statuspage-exporter

# Check logs
kubectl logs -n teei-csr -l app=statuspage-exporter --tail=50
```

### Example Metrics Update

The exporter queries Prometheus and pushes to Statuspage:

```javascript
// Query Prometheus for API Gateway uptime
const uptime = await prometheus.query('avg_over_time(up{job="api-gateway"}[90d])');

// Push to Statuspage.io
await statuspage.updateMetric('metric_api_gateway_uptime', {
  value: uptime * 100, // Convert to percentage
  timestamp: Date.now()
});
```

## Status Levels

### Operational (Green)

- Uptime > 99.5%
- Error rate < 0.5%
- Latency P95 < 500ms
- All health checks passing

### Degraded Performance (Yellow)

- Uptime 95% - 99.5%
- Error rate 0.5% - 2%
- Latency P95 500ms - 2000ms
- Health checks intermittent

### Partial Outage (Orange)

- Uptime 90% - 95%
- Error rate 2% - 5%
- Latency P95 2000ms - 5000ms
- Health checks failing for some endpoints

### Major Outage (Red)

- Uptime < 90%
- Error rate > 5%
- Latency P95 > 5000ms
- All health checks failing

## Incident Management

### Automatic Incident Creation

When a component enters `partial_outage` or `major_outage` state:

1. Incident created on Statuspage.io
2. Initial update: "Investigating - We are aware of issues with [component]"
3. Slack/Discord notification sent to on-call team
4. PagerDuty alert triggered

### Incident Updates

Post updates at these milestones:

1. **Investigating** (auto) - Issue detected
2. **Identified** (manual) - Root cause found
3. **Monitoring** (manual) - Fix deployed, monitoring recovery
4. **Resolved** (auto/manual) - Metrics back to normal

### Incident Template

```markdown
## Incident: [Component] Degraded Performance

**Detected**: 2025-11-15 14:23 UTC
**Status**: Investigating

### Timeline
- 14:23 UTC - Elevated error rates detected
- 14:25 UTC - On-call engineer paged
- 14:30 UTC - Root cause identified: database connection pool exhausted
- 14:35 UTC - Fix deployed: increased pool size
- 14:40 UTC - Metrics returning to normal
- 14:45 UTC - Incident resolved

### Impact
- ~15% of API requests returned 503 errors
- Dashboard experienced intermittent loading delays
- No data loss occurred

### Root Cause
Database connection pool configured too small for peak traffic.

### Resolution
Increased connection pool size from 20 to 50.

### Prevention
- Added connection pool alerting
- Updated capacity planning docs
- Scheduled load testing for next week
```

## Maintenance Windows

Schedule maintenance windows via Statuspage.io:

1. Navigate to **Maintenance** tab
2. Click **Schedule Maintenance**
3. Fill in:
   - **Name**: "Database Migration"
   - **Components**: Database, API Gateway
   - **Start**: 2025-11-20 02:00 UTC
   - **Duration**: 2 hours
   - **Updates**: Pre-scheduled at start, midpoint, completion
4. Save and auto-notify subscribers

## Subscriber Management

Users can subscribe to status updates:

- **Email** - Incident notifications
- **SMS** - Major outages only
- **Slack** - Webhook integration
- **RSS** - Feed for status changes
- **Webhook** - For custom integrations

## Custom Branding

Statuspage.io configured with:

- **Logo**: TEEI CSR Platform logo
- **Brand Color**: `#0066CC` (TEEI blue)
- **Favicon**: TEEI icon
- **Custom Domain**: status.teei-csr.com
- **Support URL**: https://support.teei-csr.com

## Monitoring Dashboard

Internal Grafana dashboard for status page health:

**Dashboard**: "Statuspage.io Exporter"

**Panels**:
- Metric push success rate
- API rate limit usage
- Push latency
- Last successful update per component

## API Rate Limits

Statuspage.io API limits:

- **Rate Limit**: 500 requests/minute
- **Burst**: 100 requests/10 seconds

Our exporter respects these limits by:
- Batching updates every 60 seconds
- Using bulk update endpoint
- Caching unchanged values

## Troubleshooting

### Metrics not updating

```bash
# Check exporter logs
kubectl logs -n teei-csr -l app=statuspage-exporter

# Verify API key
kubectl get secret statuspage-api-key -n teei-csr -o jsonpath='{.data.api-key}' | base64 -d

# Test API connectivity
kubectl exec -it -n teei-csr <exporter-pod> -- curl -H "Authorization: OAuth sp_xxxx" https://api.statuspage.io/v1/pages
```

### Incorrect status shown

```bash
# Query Prometheus directly
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Open http://localhost:9090 and run query
avg_over_time(up{job="api-gateway"}[5m])

# Compare with statuspage-exporter logs
kubectl logs -n teei-csr -l app=statuspage-exporter | grep "api-gateway"
```

### Incidents not auto-creating

Check incident thresholds in ConfigMap:

```bash
kubectl get configmap statuspage-exporter-config -n teei-csr -o yaml
```

## Best Practices

1. **Be transparent** - Post updates even if you don't have full details yet
2. **Update frequently** - During incidents, update every 15-30 minutes
3. **Use plain language** - Avoid jargon in public updates
4. **Post resolution** - Always close with what was learned
5. **Retrospective** - Link to postmortem doc after major incidents

## Related Documentation

- [On-Call Rotation](./oncall.md)
- [Incident Response Runbook](./runbooks/incident_response.md)
- [Observability Overview](../Observability_Overview.md)
- [Synthetic Monitoring](../../scripts/synthetics/README.md)
