# Grafana Dashboard Provisioning Guide

## Overview

This document describes the Grafana dashboard provisioning setup for the TEEI CSR Platform. All dashboards are provisioned automatically via Grafana's provisioning mechanism, ensuring consistency across environments.

## Architecture

### Trace-to-Logs Correlation

All service dashboards implement **trace-to-logs correlation**, allowing operators to:

1. Click on a TraceID in the dashboard
2. Automatically navigate to Loki logs filtered by that specific trace
3. View the complete request flow across distributed services

This is implemented using Grafana data links that construct Loki queries with the trace_id field.

## Service Dashboards

The following 10 service dashboards have been created with full observability:

### 1. API Gateway (`api-gateway-metrics.json`)
- **Service**: `api-gateway`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/api-gateway
- **Key Metrics**: Request rate, error rate, latency (p50/p95/p99), HTTP status codes
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 2. Reporting (`reporting-metrics.json`)
- **Service**: `reporting`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/reporting
- **Key Metrics**: Report generation rate, PDF export latency, cache hit rate
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 3. Q2Q AI (`q2q-ai-metrics.json`)
- **Service**: `q2q-ai`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/q2q-ai
- **Key Metrics**: AI inference rate, model latency, error rate
- **Resource Monitoring**: CPU and memory usage by pod (GPU metrics coming soon)
- **Trace Correlation**: Click TraceID → Loki logs

### 4. Corporate Cockpit (`corp-cockpit-metrics.json`)
- **Service**: `corp-cockpit`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/corp-cockpit
- **Key Metrics**: Dashboard load time, widget render latency, SSE connection count
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 5. Impact-In (`impact-in-metrics.json`)
- **Service**: `impact-in`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/impact-in
- **Key Metrics**: API push rate, webhook delivery rate, integration errors
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 6. Buddy Service (`buddy-service-metrics.json`)
- **Service**: `buddy-service`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/buddy-service
- **Key Metrics**: Buddy matching rate, recommendation latency, user engagement
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 7. Kintell Connector (`kintell-connector-metrics.json`)
- **Service**: `kintell-connector`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/kintell-connector
- **Key Metrics**: Sync rate, data transformation latency, API errors
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 8. Upskilling Connector (`upskilling-connector-metrics.json`)
- **Service**: `upskilling-connector`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/upskilling-connector
- **Key Metrics**: Course sync rate, enrollment tracking, API errors
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 9. Unified Profile (`unified-profile-metrics.json`)
- **Service**: `unified-profile`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/unified-profile
- **Key Metrics**: Profile merge rate, data enrichment latency, cache performance
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

### 10. Analytics (`analytics-metrics.json`)
- **Service**: `analytics`
- **Runbook**: https://github.com/TEEI-CSR-Platform/wiki/runbooks/analytics
- **Key Metrics**: Event ingestion rate, query latency, data aggregation performance
- **Resource Monitoring**: CPU and memory usage by pod
- **Trace Correlation**: Click TraceID → Loki logs

## Dashboard Panels

Each service dashboard includes the following panels:

### 1. Request Rate (Time Series)
- **Metric**: `sum(rate(http_server_requests_total{service="<name>"}[5m]))`
- **Unit**: Requests per second (reqps)
- **Description**: Total request rate for the service

### 2. Error Rate (Time Series)
- **Metric**: `sum(rate(http_server_requests_total{service="<name>",status=~"5.."}[5m])) / sum(rate(http_server_requests_total{service="<name>"}[5m]))`
- **Unit**: Percent (0-1)
- **Description**: Percentage of requests returning 5xx errors
- **Threshold**: Red alert at 1% error rate

### 3. Request Latency (Time Series)
- **Metrics**:
  - p50: `histogram_quantile(0.50, sum(rate(http_server_request_duration_seconds_bucket{service="<name>"}[5m])) by (le))`
  - p95: `histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{service="<name>"}[5m])) by (le))`
  - p99: `histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{service="<name>"}[5m])) by (le))`
- **Unit**: Seconds
- **Description**: Request latency at 50th, 95th, and 99th percentiles

### 4. HTTP Status Code Breakdown (Pie Chart)
- **Metrics**:
  - 2xx: `sum(increase(http_server_requests_total{service="<name>",status=~"2.."}[5m]))`
  - 4xx: `sum(increase(http_server_requests_total{service="<name>",status=~"4.."}[5m]))`
  - 5xx: `sum(increase(http_server_requests_total{service="<name>",status=~"5.."}[5m]))`
- **Description**: Distribution of HTTP status codes
- **Colors**: Green (2xx), Yellow (4xx), Red (5xx)

### 5. Top Endpoints by Latency (Table with Trace-to-Logs)
- **Metric**: `topk(10, histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{service="<name>"}[5m])) by (le, endpoint, trace_id)))`
- **Columns**: Endpoint, TraceID, p95 Latency
- **Special Feature**: **Click on TraceID to view logs**
  - Data link URL: `/explore?left={"datasource":"loki","queries":[{"refId":"A","expr":"{job=\"<service>\"} | json | trace_id=\"${__value.raw}\""}],"range":{"from":"now-1h","to":"now"}}`
  - Opens Loki explore view with logs filtered by trace_id
  - Shows all log lines for that specific request

### 6. CPU Usage by Pod (Time Series)
- **Metric**: `sum(rate(container_cpu_usage_seconds_total{pod=~"<name>-.*"}[5m])) by (pod)`
- **Unit**: Percent (0-1)
- **Description**: CPU usage for each pod replica

### 7. Memory Usage by Pod (Time Series)
- **Metric**: `sum(container_memory_working_set_bytes{pod=~"<name>-.*"}) by (pod)`
- **Unit**: Bytes
- **Description**: Memory working set for each pod replica

## Trace-to-Logs Implementation Details

### How It Works

1. **Prometheus Metrics**: Each service exports HTTP metrics with trace_id labels
2. **Dashboard Table Panel**: Displays top endpoints with their trace IDs
3. **Data Link**: Clicking a TraceID triggers a Grafana data link
4. **Loki Query**: The data link constructs a Loki query: `{job="<service>"} | json | trace_id="<clicked_trace_id>"`
5. **Explore View**: Opens Grafana Explore with logs filtered to that specific trace

### Loki Query Structure

```logql
{job="<service-name>"} | json | trace_id="<trace_id_value>"
```

- `{job="<service-name>"}`: Filter logs by service
- `| json`: Parse JSON log lines
- `| trace_id="<value>"`: Filter by trace ID

### Example Workflow

1. User notices high latency on `/api/reports/generate` endpoint
2. User clicks on the TraceID in the "Top Endpoints by Latency" table
3. Grafana opens Explore view with Loki query pre-populated
4. User sees all log lines for that specific request:
   ```
   2025-11-16 10:30:45 [INFO] Request received: POST /api/reports/generate
   2025-11-16 10:30:45 [DEBUG] Fetching data from database
   2025-11-16 10:30:47 [DEBUG] Database query took 2.1s
   2025-11-16 10:30:47 [DEBUG] Generating PDF
   2025-11-16 10:30:48 [INFO] Response sent: 200 OK
   ```
5. User identifies database query slowness as root cause

## Provisioning Configuration

### File Structure

```
observability/
├── grafana/
│   ├── dashboards/
│   │   ├── api-gateway-metrics.json
│   │   ├── reporting-metrics.json
│   │   ├── q2q-ai-metrics.json
│   │   ├── corp-cockpit-metrics.json
│   │   ├── impact-in-metrics.json
│   │   ├── buddy-service-metrics.json
│   │   ├── kintell-connector-metrics.json
│   │   ├── upskilling-connector-metrics.json
│   │   ├── unified-profile-metrics.json
│   │   └── analytics-metrics.json
│   └── provisioning/
│       └── dashboards/
│           └── dashboards.yaml
```

### Provisioning Config (`dashboards.yaml`)

```yaml
apiVersion: 1

providers:
  - name: 'Service Dashboards'
    orgId: 1
    folder: 'Service Metrics'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards/services
```

### Deployment

#### Docker Compose

```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      # Provisioning config
      - ./observability/grafana/provisioning/dashboards/dashboards.yaml:/etc/grafana/provisioning/dashboards/dashboards.yaml

      # Dashboard JSON files
      - ./observability/grafana/dashboards:/etc/grafana/dashboards/services

      # Data source config
      - ./observability/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
```

#### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: observability
data:
  # Include all dashboard JSON files here
  api-gateway-metrics.json: |
    {{ .Files.Get "observability/grafana/dashboards/api-gateway-metrics.json" | indent 4 }}
  # ... repeat for all services

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: observability
spec:
  template:
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        volumeMounts:
        - name: dashboards
          mountPath: /etc/grafana/dashboards/services
        - name: provisioning
          mountPath: /etc/grafana/provisioning/dashboards
      volumes:
      - name: dashboards
        configMap:
          name: grafana-dashboards
      - name: provisioning
        configMap:
          name: grafana-provisioning
```

## Data Source Requirements

### Prometheus

All dashboards require a Prometheus data source configured in Grafana:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Loki (for Trace-to-Logs)

Trace-to-logs correlation requires a Loki data source:

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
    editable: false
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

## Instrumentation Requirements

### Application Code

Services must export the following Prometheus metrics:

```typescript
// Request counter with labels
http_server_requests_total{service="api-gateway", endpoint="/api/foo", status="200", trace_id="abc123"}

// Request duration histogram
http_server_request_duration_seconds_bucket{service="api-gateway", endpoint="/api/foo", trace_id="abc123", le="0.1"}
http_server_request_duration_seconds_bucket{service="api-gateway", endpoint="/api/foo", trace_id="abc123", le="0.5"}
http_server_request_duration_seconds_bucket{service="api-gateway", endpoint="/api/foo", trace_id="abc123", le="1.0"}
```

### Logging

Services must emit structured JSON logs with trace_id:

```json
{
  "timestamp": "2025-11-16T10:30:45Z",
  "level": "INFO",
  "message": "Request received",
  "service": "api-gateway",
  "trace_id": "abc123",
  "endpoint": "/api/foo",
  "method": "GET"
}
```

### OpenTelemetry Integration

Recommended setup using OpenTelemetry:

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

const provider = new NodeTracerProvider();
provider.register();

// Prometheus metrics
const prometheusExporter = new PrometheusExporter({ port: 9464 });

// Loki logs with trace correlation
const logExporter = new OTLPLogExporter({
  url: 'http://loki:3100/loki/api/v1/push',
});
```

## Maintenance

### Adding a New Service Dashboard

1. Create a new JSON file in `observability/grafana/dashboards/`
2. Use the existing dashboards as templates
3. Update the following fields:
   - `title`: Service name
   - `uid`: Unique identifier (e.g., `new-service-metrics`)
   - `description`: Service description with runbook link
   - All `service="..."` labels in Prometheus queries
   - All `job="..."` labels in Loki data links
   - All `pod=~"...-.*"` patterns in resource queries
4. Validate JSON: `python3 -m json.tool new-service-metrics.json`
5. Commit to repository
6. Dashboards will auto-reload within 10 seconds

### Updating Existing Dashboards

1. Edit the JSON file directly, or
2. Make changes in Grafana UI and export JSON
3. Validate JSON
4. Commit to repository
5. Dashboards will auto-reload

### Dashboard Variables

All dashboards use the `DS_PROMETHEUS` variable for the data source:

```json
{
  "templating": {
    "list": [
      {
        "name": "DS_PROMETHEUS",
        "type": "datasource",
        "query": "prometheus"
      }
    ]
  }
}
```

This allows switching between different Prometheus instances without editing the dashboard.

## Alerting Integration

Dashboards can be used to create alerts. Example alert rule:

```yaml
groups:
  - name: service_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_server_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_server_requests_total[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
          dashboard: "https://grafana/d/{{ $labels.service }}-metrics"
```

## Troubleshooting

### Dashboards not appearing in Grafana

1. Check provisioning config is mounted correctly:
   ```bash
   kubectl exec -it grafana-xxx -- ls /etc/grafana/provisioning/dashboards
   ```

2. Check dashboard files are mounted:
   ```bash
   kubectl exec -it grafana-xxx -- ls /etc/grafana/dashboards/services
   ```

3. Check Grafana logs:
   ```bash
   kubectl logs -f grafana-xxx | grep -i provision
   ```

### Trace-to-Logs not working

1. Verify Loki data source is configured
2. Check log format includes `trace_id` field
3. Verify Loki query syntax in data link
4. Test query manually in Explore view

### No data in panels

1. Verify Prometheus is scraping the service:
   ```promql
   up{job="api-gateway"}
   ```

2. Check metric labels match dashboard queries:
   ```promql
   http_server_requests_total{service="api-gateway"}
   ```

3. Verify time range is appropriate

## References

- [Grafana Provisioning Docs](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Prometheus Metrics Best Practices](https://prometheus.io/docs/practices/naming/)
- [Loki LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [TEEI Observability README](/observability/README.md)

## Support

For issues or questions:
- Slack: #observability
- GitHub Issues: https://github.com/TEEI-CSR-Platform/issues
- On-call: PagerDuty rotation
