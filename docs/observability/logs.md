# Log Aggregation with Loki

## Overview

The TEEI Platform uses **Grafana Loki** for centralized log aggregation and **Promtail** for log collection from Kubernetes pods. This enables efficient log querying, correlation with traces, and real-time log streaming.

## Architecture

```
┌─────────────┐
│  Kubernetes │
│    Pods     │
│ (JSON logs) │
└─────────────┘
       │
       v
┌─────────────┐     Push      ┌─────────────┐
│  Promtail   │ ─────────────> │    Loki     │
│ (DaemonSet) │    HTTP/3100   │ (StatefulSet)│
└─────────────┘                └─────────────┘
                                      │
                                      v
                               ┌─────────────┐
                               │   Grafana   │
                               │ (LogQL UI)  │
                               └─────────────┘
```

## Deployment

Deploy Loki and Promtail:

```bash
# Deploy Loki (log storage)
kubectl apply -k k8s/base/observability/loki

# Deploy Promtail (log collector)
kubectl apply -k k8s/base/observability/promtail
```

**Loki**: StatefulSet with 10Gi persistent volume
**Promtail**: DaemonSet running on every node, tailing `/var/log/pods/*`

## Log Format

All TEEI services output structured JSON logs:

```json
{
  "timestamp": "2025-11-15T14:23:45.123Z",
  "level": "info",
  "msg": "User profile updated",
  "service": "teei-unified-profile",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331",
  "user_id": "12345",
  "tenant_id": "acme-corp",
  "duration_ms": 45
}
```

**Standard Fields**:
- `timestamp`: ISO 8601 timestamp
- `level`: `debug`, `info`, `warn`, `error`, `fatal`
- `msg`: Human-readable message
- `service`: Service name (e.g., `teei-api-gateway`)
- `trace_id`: OpenTelemetry trace ID (for correlation)
- `span_id`: OpenTelemetry span ID

## Querying Logs

### Grafana Explore

Access Grafana → Explore → Select "Loki" datasource

### Basic Queries

**1. All logs from a service**:
```logql
{app="teei-api-gateway"}
```

**2. Filter by log level**:
```logql
{app="teei-reporting", level="error"}
```

**3. Multiple services**:
```logql
{app=~"teei-api-gateway|teei-unified-profile"}
```

**4. Exclude debug logs**:
```logql
{namespace="teei-platform", level!="debug"}
```

### Log Filtering

**5. Message search** (case-insensitive):
```logql
{app="teei-q2q-ai"} |= "Database connection failed"
```

**6. Regex filter**:
```logql
{app="teei-analytics"} |~ "timeout|deadline exceeded"
```

**7. Negative filter**:
```logql
{app="teei-notifications"} != "health check"
```

### JSON Extraction

**8. Parse JSON and filter**:
```logql
{app="teei-reporting"} | json | user_id="12345"
```

**9. Extract specific field**:
```logql
{app="teei-unified-profile"} | json | line_format "User: {{.user_id}}, Tenant: {{.tenant_id}}"
```

**10. Filter by nested JSON**:
```logql
{app="teei-journey-engine"} | json | request_body_size > 1000000
```

### Metrics from Logs

**11. Log rate per service**:
```logql
sum(rate({namespace="teei-platform"}[1m])) by (app)
```

**12. Error count**:
```logql
sum(count_over_time({namespace="teei-platform", level="error"}[5m]))
```

**13. Top error messages**:
```logql
topk(10, sum(count_over_time({level="error"} | json | line_format "{{.msg}}" [1h])) by (msg))
```

**14. Average request duration**:
```logql
avg_over_time({app="teei-api-gateway"} | json | unwrap duration_ms [5m])
```

### Trace Correlation

**15. Logs for a specific trace**:
```logql
{namespace="teei-platform", trace_id="0af7651916cd43dd8448eb211c80319c"}
```

**16. Find trace IDs from error logs**:
```logql
{app="teei-reporting", level="error"} | json | trace_id != ""
```

Click on `trace_id` in Grafana to jump to Jaeger trace view!

### Time-Based Queries

**17. Logs in last 5 minutes**:
```logql
{app="teei-discord-bot"} [5m]
```

**18. Logs between specific times**:
```logql
{app="teei-safety-moderation"} | json | timestamp >= "2025-11-15T10:00:00Z" and timestamp < "2025-11-15T11:00:00Z"
```

### Advanced Filtering

**19. Multi-condition filter**:
```logql
{app="teei-api-gateway"}
| json
| user_id="12345"
| http_status_code >= 400
| duration_ms > 1000
```

**20. Pattern matching**:
```logql
{app=~"teei-.*-connector"} | json | line_format "{{.service}}: {{.msg}}" | pattern "<service>: <message>"
```

## Grafana Dashboard

View the **Logs (Loki)** dashboard:

- **Log Volume by Service**: Real-time log ingestion rate
- **Error Log Rate**: Error logs per second with alerts
- **Log Levels Distribution**: Pie chart of log levels
- **Recent Error Logs**: Latest errors with trace links
- **All Logs Stream**: Live tail of all logs
- **Trace-Correlated Logs**: Logs with trace IDs (click to view in Jaeger)
- **Top Log Patterns**: Most frequent log messages

## Log Retention

Loki is configured with a **7-day retention policy** (`168h`):

```yaml
limits_config:
  retention_period: 168h
```

Compaction runs every 10 minutes to clean up old chunks.

For longer retention:
1. Increase `retention_period` in `k8s/base/observability/loki/configmap.yaml`
2. Increase persistent volume size in `statefulset.yaml`
3. Consider archiving to S3/GCS for compliance

## Alerting

Create alerts based on log patterns:

### High Error Rate

```yaml
# observability/prometheus/rules.yaml
- alert: HighErrorLogRate
  expr: |
    sum(rate({namespace="teei-platform", level="error"}[5m])) by (app) > 10
  for: 5m
  annotations:
    summary: "{{ $labels.app }} has high error log rate"
    description: "Error logs: {{ $value }} per second"
```

### Specific Error Pattern

```yaml
- alert: DatabaseConnectionFailure
  expr: |
    count_over_time({app=~"teei-.*"} |= "Database connection failed" [5m]) > 0
  for: 1m
  annotations:
    summary: "Database connection failures detected"
```

### Missing Logs

```yaml
- alert: ServiceNotLogging
  expr: |
    absent_over_time({app="teei-api-gateway"}[10m])
  for: 5m
  annotations:
    summary: "API Gateway has stopped logging"
```

## Best Practices

### 1. Use Structured Logging

**Good**:
```javascript
logger.info('User profile updated', {
  user_id: userId,
  fields_updated: ['email', 'phone'],
  duration_ms: 45
});
```

**Bad**:
```javascript
logger.info(`User ${userId} profile updated: email, phone (45ms)`);
```

### 2. Add Context

Include correlation IDs for debugging:
```javascript
const logger = winston.createLogger({
  defaultMeta: {
    service: 'teei-reporting',
    version: process.env.APP_VERSION,
    instance: os.hostname(),
  }
});
```

### 3. Use Appropriate Log Levels

- `debug`: Verbose debugging (disabled in production)
- `info`: Normal operations, user actions
- `warn`: Degraded performance, retries
- `error`: Errors requiring attention
- `fatal`: Critical errors, service crash

### 4. Avoid Logging Secrets

**Never log**:
- Passwords, API keys, tokens
- PII (unless anonymized): SSN, credit cards
- Full request/response bodies (truncate)

Use a sanitizer:
```javascript
function sanitize(obj) {
  const clone = { ...obj };
  const secrets = ['password', 'token', 'api_key', 'ssn'];
  secrets.forEach(key => {
    if (clone[key]) clone[key] = '[REDACTED]';
  });
  return clone;
}

logger.info('Request received', sanitize(req.body));
```

### 5. Rate Limiting

Avoid log floods:
```javascript
const logOnce = _.throttle(() => {
  logger.warn('Cache miss, fetching from DB');
}, 60000); // Log once per minute
```

## Integration with Traces

Logs are automatically correlated with traces when using OTel SDK:

```javascript
const { context, trace } = require('@opentelemetry/api');

app.use((req, res, next) => {
  const span = trace.getSpan(context.active());
  if (span) {
    req.logger = logger.child({
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
    });
  }
  next();
});

// Later in handler
req.logger.info('Processing request', { user_id: req.user.id });
```

Result:
```json
{
  "level": "info",
  "msg": "Processing request",
  "user_id": "12345",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331"
}
```

Click on `trace_id` in Grafana Explore → Opens Jaeger trace!

## Troubleshooting

### Logs Not Appearing

1. **Check Promtail DaemonSet**:
   ```bash
   kubectl get pods -l app=teei-promtail -n teei-platform
   kubectl logs -l app=teei-promtail -n teei-platform
   ```

2. **Verify Promtail Config**:
   ```bash
   kubectl get cm teei-promtail-config -o yaml
   ```

3. **Test Loki Endpoint**:
   ```bash
   kubectl exec -it deploy/teei-api-gateway -- curl http://teei-loki-headless:3100/ready
   ```

4. **Check Service Logs**:
   Ensure services are writing to stdout/stderr (not files)

### High Memory Usage

Loki memory usage depends on:
- **Ingestion rate**: Logs/second
- **Retention period**: Days of logs stored
- **Query complexity**: Large time ranges

Solutions:
- Reduce retention period
- Increase Loki memory limit
- Optimize queries (use smaller time ranges)
- Consider horizontal scaling (Loki in microservices mode)

### Slow Queries

- Use shorter time ranges: `[5m]` instead of `[1h]`
- Add more specific label filters: `{app="teei-api-gateway", level="error"}`
- Avoid regex on high-cardinality fields
- Use `| json` only when needed

## Query Performance Tips

### 1. Start with Labels

```logql
# Fast: Uses index
{app="teei-reporting", level="error"}

# Slow: Full log scan
{namespace="teei-platform"} | json | service="teei-reporting"
```

### 2. Limit Time Range

```logql
# Fast
{app="teei-api-gateway"} [5m]

# Slow
{app="teei-api-gateway"} [24h]
```

### 3. Use `count_over_time` for Metrics

```logql
# Fast: Aggregates before filtering
sum(count_over_time({app="teei-analytics", level="error"}[5m]))

# Slow: Filters then counts
count({app="teei-analytics", level="error"} [5m])
```

## Loki CLI (logcli)

Query Loki from command line:

```bash
# Install
brew install logcli  # macOS
# or download from https://github.com/grafana/loki/releases

# Set endpoint
export LOKI_ADDR=http://teei-loki-headless:3100

# Query
logcli query '{app="teei-api-gateway"}' --limit=50

# Follow logs (tail -f)
logcli query '{app="teei-reporting", level="error"}' --follow

# Get labels
logcli labels app

# Get label values
logcli labels app --values
```

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/)
- [TEEI Logging Standards](../../packages/observability/logging.md)
