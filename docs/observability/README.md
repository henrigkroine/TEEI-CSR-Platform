# TEEI Platform Observability Stack

## Overview

The TEEI Platform implements a comprehensive observability stack using industry-standard open-source tools and SaaS services. This provides complete visibility into distributed traces, centralized logs, error tracking, and system metrics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TEEI Microservices                            │
│  (api-gateway, reporting, analytics, q2q-ai, unified-profile, ...)  │
└────────┬─────────────┬─────────────┬──────────────┬─────────────────┘
         │             │             │              │
         │ OTLP        │ JSON Logs   │ Exceptions   │ Metrics
         │ (traces)    │             │              │
         v             v             v              v
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Jaeger  │  │   Loki   │  │  Sentry  │  │Prometheus│
   │ (Traces) │  │  (Logs)  │  │ (Errors) │  │(Metrics) │
   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │              │
        └─────────────┴─────────────┴──────────────┘
                           │
                           v
                    ┌──────────────┐
                    │   Grafana    │
                    │  (Unified    │
                    │  Dashboard)  │
                    └──────────────┘
```

## Components

### 1. Distributed Tracing (Jaeger)

**Purpose**: Track requests across microservices
**Deployment**: `/k8s/base/observability/jaeger/`
**UI Access**: `http://teei-jaeger:16686`

**Key Features**:
- End-to-end request tracking
- Service dependency mapping
- Performance bottleneck identification
- Cross-service latency analysis

**Documentation**: [traces.md](./traces.md)

### 2. Log Aggregation (Loki + Promtail)

**Purpose**: Centralized log collection and querying
**Deployment**:
- Loki: `/k8s/base/observability/loki/`
- Promtail: `/k8s/base/observability/promtail/`

**Key Features**:
- Structured JSON log parsing
- Trace correlation (trace_id linking)
- Real-time log streaming
- LogQL query language

**Documentation**: [logs.md](./logs.md)

### 3. Error Tracking (Sentry)

**Purpose**: Real-time error monitoring and alerting
**Configuration**: `/observability/sentry/`
**SaaS**: sentry.io

**Key Features**:
- Exception capture and stack traces
- User impact analysis
- Performance monitoring
- Release tracking

**Documentation**: [errors.md](./errors.md)

### 4. Metrics (Prometheus)

**Purpose**: Time-series metrics and alerting
**Deployment**: (existing setup)

**Key Features**:
- Service health metrics
- Business metrics (SROI, VIS calculations)
- Custom exporters (ClickHouse, NATS, etc.)
- Alerting rules

**Documentation**: [../../observability/prometheus/](../../observability/prometheus/)

## Quick Start

### Deploy Observability Stack

```bash
# Deploy all observability components
kubectl apply -k k8s/base/observability

# Verify deployment
kubectl get pods -n teei-platform -l app.kubernetes.io/part-of=teei-observability

# Expected output:
# teei-jaeger-xxx      1/1  Running
# teei-loki-0          1/1  Running
# teei-promtail-xxx    1/1  Running (DaemonSet on each node)
```

### Configure Sentry

```bash
# Create sealed secret with your Sentry DSN
kubectl create secret generic teei-sentry-dsn \
  --from-literal=SENTRY_DSN='https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT' \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > observability/sentry/sentry-sealed.yaml

# Apply
kubectl apply -f observability/sentry/sentry-sealed.yaml
```

### Access Grafana Dashboards

1. Port-forward Grafana:
   ```bash
   kubectl port-forward svc/grafana 3000:3000 -n teei-platform
   ```

2. Open browser: `http://localhost:3000`

3. Navigate to dashboards:
   - **Distributed Traces**: Service traces, latency, errors
   - **Logs (Loki)**: Log volume, errors, patterns
   - **Errors (Sentry)**: Error rates, user impact
   - **HTTP Overview**: Request rates, status codes
   - **Postgres Metrics**: Database performance
   - **ClickHouse Metrics**: OLAP query performance
   - **NATS Consumer Lag**: Event bus health

## Service Configuration

Services are pre-configured with OpenTelemetry exporters:

```yaml
# k8s/base/*/configmap.yaml (example)
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://teei-jaeger:4318"
  OTEL_SERVICE_NAME: "teei-api-gateway"
  OTEL_TRACES_SAMPLER: "parentbased_traceidratio"
  OTEL_TRACES_SAMPLER_ARG: "0.1"  # 10% sampling
```

**Services configured** (5+):
- ✅ `teei-api-gateway`
- ✅ `teei-reporting`
- ✅ `teei-analytics`
- ✅ `teei-q2q-ai`
- ✅ `teei-unified-profile`

## Common Tasks

### 1. Find Slow Requests

**Jaeger UI**:
1. Service: `teei-api-gateway`
2. Min Duration: `1s`
3. Click on trace → Analyze spans

**Grafana**:
- Dashboard: Distributed Traces → P95 Latency by Service

### 2. Debug an Error

**Step 1**: Find error in Loki
```logql
{app="teei-reporting", level="error"} | json | user_id="12345"
```

**Step 2**: Get trace_id from log entry

**Step 3**: View trace in Jaeger
- Grafana: Click trace_id → Opens Jaeger
- Or: `http://jaeger:16686/trace/{trace_id}`

**Step 4**: View error in Sentry
- Check Sentry dashboard for exception details
- Review stack trace and context

### 3. Monitor Service Health

**Grafana**:
- Dashboard: Service Overview
  - CPU/Memory usage
  - Request rate
  - Error rate
  - P95 latency

**Alerts**: Configured in Prometheus
- High error rate (>5%)
- Slow P95 latency (>2s)
- Service down (no logs for 10m)

### 4. Correlate Traces and Logs

**From Trace to Logs**:
1. Open trace in Jaeger
2. Copy `trace_id`
3. Query Loki: `{trace_id="<id>"}`

**From Logs to Trace**:
1. View log in Grafana Explore
2. Click on `trace_id` field
3. Grafana opens Jaeger trace

## Data Retention

| Component   | Retention | Storage          | Configurable |
|-------------|-----------|------------------|--------------|
| Jaeger      | In-memory | 50,000 traces    | Yes          |
| Loki        | 7 days    | 10Gi PVC         | Yes          |
| Sentry      | 90 days   | SaaS (unlimited) | No           |
| Prometheus  | 15 days   | 50Gi PVC         | Yes          |

**Increase retention**:

```yaml
# k8s/base/observability/loki/configmap.yaml
limits_config:
  retention_period: 720h  # 30 days

# k8s/base/observability/loki/statefulset.yaml
volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      resources:
        requests:
          storage: 50Gi  # Increase storage
```

## Performance Tuning

### Reduce Log Volume

**Option 1**: Increase log level
```yaml
# k8s/base/*/configmap.yaml
LOG_LEVEL: "warn"  # Only warn, error, fatal
```

**Option 2**: Filter noisy logs
```javascript
// In service code
if (req.path === '/health') {
  return; // Don't log health checks
}
logger.info('Request received', { path: req.path });
```

### Reduce Trace Volume

**Adjust sampling rate**:
```yaml
# k8s/base/*/configmap.yaml
OTEL_TRACES_SAMPLER_ARG: "0.01"  # 1% sampling (production)
```

**Head-based sampling**: Random selection
**Tail-based sampling**: Sample based on latency/errors (advanced)

### Reduce Sentry Events

**Sample errors**:
```javascript
Sentry.init({
  beforeSend(event) {
    // Only send 10% of ValidationErrors
    if (event.exception?.values?.[0]?.type === 'ValidationError') {
      return Math.random() < 0.1 ? event : null;
    }
    return event;
  },
});
```

## Alerting

Alerts are configured in Prometheus:

```yaml
# observability/prometheus/rules.yaml
groups:
  - name: observability
    rules:
      - alert: HighErrorRate
        expr: sum(rate({level="error"}[5m])) by (app) > 10
        for: 5m
        annotations:
          summary: "{{ $labels.app }} has high error rate"

      - alert: SlowTraces
        expr: histogram_quantile(0.95, duration_bucket) > 2000
        for: 10m
        annotations:
          summary: "{{ $labels.service }} P95 > 2s"
```

**Alert channels**:
- Slack: `#alerts-staging` / `#alerts-production`
- PagerDuty: Critical alerts (production)
- Sentry: Built-in alerts for error spikes

## Security

### 1. Secrets Management

Sentry DSN is stored as SealedSecret:
```bash
# Never commit plain secrets!
kubectl create secret generic teei-sentry-dsn \
  --from-literal=SENTRY_DSN='...' \
  --dry-run=client -o yaml | kubeseal > sentry-sealed.yaml
```

### 2. Data Sanitization

All services sanitize PII before logging/tracing:
```javascript
function sanitize(obj) {
  const clone = { ...obj };
  const secrets = ['password', 'token', 'api_key', 'ssn', 'credit_card'];
  secrets.forEach(key => {
    if (clone[key]) clone[key] = '[REDACTED]';
  });
  return clone;
}

logger.info('User data', sanitize(userData));
```

### 3. Network Policies

Observability components are isolated:
```yaml
# Only allow services to push to Jaeger/Loki
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: observability-ingress
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: teei-observability
  ingress:
    - from:
      - podSelector:
          matchLabels:
            app.kubernetes.io/part-of: teei-csr-platform
```

## Migration to Production

### Jaeger → Tempo

For production, migrate to Grafana Tempo for scalable storage:

```yaml
# k8s/base/observability/tempo/deployment.yaml
image: grafana/tempo:latest
```

**Benefits**:
- S3/GCS backend (cheaper)
- No memory limits
- Better performance at scale

### Loki Scaling

Enable Loki microservices mode:
- Separate read/write paths
- Horizontal scaling
- Object storage (S3/GCS)

### Sentry

Already on SaaS (sentry.io). Consider:
- Self-hosted Sentry for compliance
- Increase quota for production traffic
- Enable session replay (debugging)

## Troubleshooting

See detailed troubleshooting in:
- [traces.md](./traces.md#troubleshooting)
- [logs.md](./logs.md#troubleshooting)
- [errors.md](./errors.md#troubleshooting)

**Common issues**:

| Issue                | Solution                                       |
|----------------------|------------------------------------------------|
| Traces not appearing | Check OTEL_EXPORTER_OTLP_ENDPOINT in configmap |
| Logs not in Loki     | Verify Promtail DaemonSet is running           |
| Sentry errors missing| Verify SENTRY_DSN secret exists                |
| High memory usage    | Reduce retention or increase limits            |

## References

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Sentry Documentation](https://docs.sentry.io/)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [TEEI Observability Package](../../packages/observability/)

## Support

For issues or questions:
1. Check documentation above
2. Review Grafana dashboards for system health
3. Check service logs: `kubectl logs -l app=teei-<service>`
4. Contact DevOps team: `#devops-support`
