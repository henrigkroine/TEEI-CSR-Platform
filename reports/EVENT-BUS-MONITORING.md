# Event Bus Monitoring & Alerting Guide

**Status**: Ready for Implementation
**Date**: 2025-11-14
**Phase**: Phase 1 (HTTP Webhooks)
**Components**: Buddy System → CSR Platform

---

## Table of Contents

1. [Overview](#overview)
2. [Metrics Definition](#metrics-definition)
3. [Dashboard Setup](#dashboard-setup)
4. [Alert Rules](#alert-rules)
5. [Observability Stack](#observability-stack)
6. [Health Checks](#health-checks)
7. [SLOs & SLIs](#slos--slis)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Why Monitor the Event Bus?

The HTTP webhook event bus is the critical path for data flowing from Buddy System to CSR Platform. Visibility into this pipeline enables:

1. **Rapid Detection**: Identify delivery failures within seconds
2. **Root Cause Analysis**: Understand what broke (network, timeout, format, etc.)
3. **Capacity Planning**: Know when to upgrade infrastructure
4. **Compliance**: Audit trail of all events (who published, when, result)
5. **Performance Optimization**: Identify slow operations

### Monitoring Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Buddy System                             │
│  Metrics: publish_total, publish_duration, errors_total    │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP POST
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    CSR Platform                             │
│  Metrics: received_total, processing_duration, lag         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Prometheus DB                              │
│          (Stores all metrics time-series)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Grafana         │   │  AlertManager    │
│  (Dashboards)    │   │  (Alert routing) │
└──────────────────┘   └────────┬─────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
                 Slack              PagerDuty/Email
```

---

## Metrics Definition

### Buddy System (Publisher) Metrics

#### 1. buddy_webhook_publish_total
**Type**: Counter
**Labels**: `event_type`, `status` (success/error)
**Description**: Total number of events published

```
buddy_webhook_publish_total{event_type="buddy.match.created", status="success"} 1524
buddy_webhook_publish_total{event_type="buddy.match.created", status="error"} 3
buddy_webhook_publish_total{event_type="buddy.event.logged", status="success"} 8240
```

**Alert Condition**: Sudden drop in success rate
```
rate(buddy_webhook_publish_total{status="success"}[5m]) == 0
```

#### 2. buddy_webhook_publish_duration_ms
**Type**: Histogram
**Labels**: `event_type`
**Description**: Latency of publishing events (in milliseconds)
**Buckets**: 10, 50, 100, 500, 1000, 5000, 10000

```
buddy_webhook_publish_duration_ms_bucket{event_type="buddy.match.created", le="100"} 1200
buddy_webhook_publish_duration_ms_bucket{event_type="buddy.match.created", le="500"} 1298
buddy_webhook_publish_duration_ms_bucket{event_type="buddy.match.created", le="1000"} 1300
```

**Alert Condition**: P95 latency > 2 seconds
```
histogram_quantile(0.95, buddy_webhook_publish_duration_ms) > 2000
```

#### 3. buddy_webhook_publish_errors_total
**Type**: Counter
**Labels**: `error_type` (timeout, network, validation, etc.)
**Description**: Total errors publishing events

```
buddy_webhook_publish_errors_total{error_type="timeout"} 5
buddy_webhook_publish_errors_total{error_type="connection_refused"} 2
buddy_webhook_publish_errors_total{error_type="validation"} 0
```

**Alert Condition**: > 10 errors/minute
```
rate(buddy_webhook_publish_errors_total[1m]) > (10/60)
```

#### 4. buddy_webhook_retry_attempts_total
**Type**: Counter
**Labels**: `attempt_number` (1, 2, 3, 4, 5)
**Description**: Total retry attempts (breakdown by attempt)

```
buddy_webhook_retry_attempts_total{attempt_number="1"} 523
buddy_webhook_retry_attempts_total{attempt_number="2"} 45
buddy_webhook_retry_attempts_total{attempt_number="3"} 8
buddy_webhook_retry_attempts_total{attempt_number="4"} 1
buddy_webhook_retry_attempts_total{attempt_number="5"} 0
```

**Alert Condition**: Too many retries (indicates systemic issue)
```
rate(buddy_webhook_retry_attempts_total{attempt_number=~"4|5"}[5m]) > 0.1
```

#### 5. buddy_webhook_pending_queue_size
**Type**: Gauge
**Labels**: None
**Description**: Current events awaiting retry (queue depth)

```
buddy_webhook_pending_queue_size 0
```

**Alert Condition**: Webhook endpoint possibly down
```
buddy_webhook_pending_queue_size > 100
```

---

### CSR Platform (Consumer) Metrics

#### 1. csr_webhook_received_total
**Type**: Counter
**Labels**: `event_type`, `status` (received/rejected)
**Description**: Total webhooks received

```
csr_webhook_received_total{event_type="buddy.match.created", status="received"} 1524
csr_webhook_received_total{event_type="buddy.match.created", status="rejected"} 0
```

**Alert Condition**: High rejection rate (validation errors)
```
rate(csr_webhook_received_total{status="rejected"}[5m]) > 0.1
```

#### 2. csr_webhook_processing_duration_ms
**Type**: Histogram
**Labels**: `event_type`
**Description**: Time to process webhook and publish to event bus
**Buckets**: 10, 50, 100, 500, 1000, 5000

```
csr_webhook_processing_duration_ms_bucket{event_type="buddy.match.created", le="100"} 1200
csr_webhook_processing_duration_ms_bucket{event_type="buddy.match.created", le="500"} 1500
```

**Alert Condition**: P95 processing > 1 second
```
histogram_quantile(0.95, csr_webhook_processing_duration_ms) > 1000
```

#### 3. csr_webhook_errors_total
**Type**: Counter
**Labels**: `error_type` (validation, parsing, database, etc.)
**Description**: Errors processing webhooks

```
csr_webhook_errors_total{error_type="validation"} 0
csr_webhook_errors_total{error_type="database"} 2
csr_webhook_errors_total{error_type="serialization"} 0
```

**Alert Condition**: > 5 errors/minute
```
rate(csr_webhook_errors_total[1m]) > (5/60)
```

#### 4. csr_webhook_processing_lag_ms
**Type**: Gauge
**Labels**: `percentile` (p50, p95, p99)
**Description**: Time from webhook receipt to event processing completion
**Calculated**: `receipt_timestamp → completion_timestamp`

```
csr_webhook_processing_lag_ms{percentile="p50"} 45
csr_webhook_processing_lag_ms{percentile="p95"} 250
csr_webhook_processing_lag_ms{percentile="p99"} 1200
```

**Alert Condition**: P99 lag > 5 seconds (indicates queue backlog)
```
csr_webhook_processing_lag_ms{percentile="p99"} > 5000
```

#### 5. csr_event_bus_publish_errors_total
**Type**: Counter
**Labels**: `event_type`
**Description**: Failures publishing to internal event bus (NATS)

```
csr_event_bus_publish_errors_total{event_type="buddy.match.created"} 0
```

**Alert Condition**: Any error in event bus
```
rate(csr_event_bus_publish_errors_total[1m]) > 0
```

#### 6. csr_webhook_signature_validation_failures
**Type**: Counter
**Labels**: None (enabled only when validation active)
**Description**: Invalid webhook signatures (security concern)

```
csr_webhook_signature_validation_failures 0
```

**Alert Condition**: Possible tampering
```
rate(csr_webhook_signature_validation_failures[1m]) > 0
```

---

## Dashboard Setup

### Prometheus Configuration

**File**: `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'teei-csr-platform'
    environment: 'development'

scrape_configs:
  # Buddy System metrics
  - job_name: 'buddy-system'
    static_configs:
      - targets: ['localhost:9091']  # Buddy System metrics port
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # CSR Platform metrics
  - job_name: 'csr-platform'
    static_configs:
      - targets: ['localhost:9092']  # CSR Platform metrics port
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### Grafana Dashboard JSON

**File**: `dashboards/event-bus-pipeline.json`

```json
{
  "dashboard": {
    "title": "Event Bus Pipeline - Buddy → CSR",
    "description": "Real-time monitoring of event delivery",
    "timezone": "browser",
    "refresh": "10s",
    "panels": [
      {
        "title": "Event Flow (events/min)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(buddy_webhook_publish_total{status=\"success\"}[1m]) * 60",
            "legendFormat": "Published (success)"
          },
          {
            "expr": "rate(csr_webhook_received_total{status=\"received\"}[1m]) * 60",
            "legendFormat": "Received (CSR)"
          }
        ],
        "yaxes": [
          {
            "label": "Events/min",
            "format": "short"
          }
        ]
      },
      {
        "title": "Publication Latency (ms)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.5, buddy_webhook_publish_duration_ms)",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, buddy_webhook_publish_duration_ms)",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, buddy_webhook_publish_duration_ms)",
            "legendFormat": "p99"
          }
        ],
        "yaxes": [
          {
            "label": "Latency (ms)",
            "format": "short"
          }
        ]
      },
      {
        "title": "Error Rate (errors/min)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(buddy_webhook_publish_errors_total[1m]) * 60",
            "legendFormat": "Buddy publish errors"
          },
          {
            "expr": "rate(csr_webhook_errors_total[1m]) * 60",
            "legendFormat": "CSR processing errors"
          }
        ],
        "alert": {
          "name": "High error rate",
          "conditions": [
            {
              "evaluator": { "params": [0.1], "type": "gt" },
              "operator": { "type": "and" },
              "query": { "params": ["A", "5m", "now"] }
            }
          ]
        }
      },
      {
        "title": "Retries & Backlog",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(buddy_webhook_retry_attempts_total[5m])) * 5",
            "legendFormat": "Retries (5m)"
          },
          {
            "expr": "buddy_webhook_pending_queue_size",
            "legendFormat": "Pending queue"
          }
        ]
      },
      {
        "title": "Processing Lag (ms)",
        "type": "graph",
        "targets": [
          {
            "expr": "csr_webhook_processing_lag_ms{percentile=\"p50\"}",
            "legendFormat": "p50"
          },
          {
            "expr": "csr_webhook_processing_lag_ms{percentile=\"p95\"}",
            "legendFormat": "p95"
          },
          {
            "expr": "csr_webhook_processing_lag_ms{percentile=\"p99\"}",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Health Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"buddy-system\"}",
            "legendFormat": "Buddy System"
          },
          {
            "expr": "up{job=\"csr-platform\"}",
            "legendFormat": "CSR Platform"
          }
        ],
        "thresholds": [
          { "value": 0, "color": "red", "text": "DOWN" },
          { "value": 1, "color": "green", "text": "UP" }
        ]
      },
      {
        "title": "Event Types (last 1h)",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (event_type) (increase(csr_webhook_received_total[1h]))"
          }
        ]
      }
    ]
  }
}
```

### Docker Compose for Monitoring Stack

**File**: `docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
    depends_on:
      - prometheus
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:
  alertmanager-data:

networks:
  monitoring:
    driver: bridge
```

---

## Alert Rules

### Prometheus Alert Rules

**File**: `alert-rules.yml`

```yaml
groups:
  - name: event_bus_alerts
    interval: 30s
    rules:
      # Buddy System Alerts
      - alert: BuddyWebhookPublishErrors
        expr: rate(buddy_webhook_publish_errors_total[1m]) > (10/60)
        for: 2m
        labels:
          severity: warning
          component: buddy-system
        annotations:
          summary: "High webhook publish error rate"
          description: "Buddy System publishing {{ $value | humanize }} errors/sec"
          dashboard: "http://localhost:3001/d/event-bus"

      - alert: BuddyWebhookHighLatency
        expr: histogram_quantile(0.95, buddy_webhook_publish_duration_ms) > 2000
        for: 5m
        labels:
          severity: warning
          component: buddy-system
        annotations:
          summary: "High webhook publish latency (p95)"
          description: "P95 latency: {{ $value | humanize }}ms (threshold: 2000ms)"

      - alert: BuddyWebhookQueueBuildup
        expr: buddy_webhook_pending_queue_size > 100
        for: 5m
        labels:
          severity: critical
          component: buddy-system
        annotations:
          summary: "Webhook endpoint possibly down"
          description: "{{ $value | humanize }} events pending retry (threshold: 100)"
          action: "Check CSR Platform health and network connectivity"

      - alert: BuddyWebhookTooManyRetries
        expr: rate(buddy_webhook_retry_attempts_total{attempt_number=~"4|5"}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          component: buddy-system
        annotations:
          summary: "Too many final-attempt retries"
          description: "{{ $value | humanize }} events exhausting retries/sec (systemic issue)"

      # CSR Platform Alerts
      - alert: CSRWebhookProcessingErrors
        expr: rate(csr_webhook_errors_total[1m]) > (5/60)
        for: 2m
        labels:
          severity: warning
          component: csr-platform
        annotations:
          summary: "High webhook processing error rate"
          description: "CSR Platform processing {{ $value | humanize }} errors/sec"

      - alert: CSRWebhookHighProcessingLag
        expr: csr_webhook_processing_lag_ms{percentile="p99"} > 5000
        for: 5m
        labels:
          severity: warning
          component: csr-platform
        annotations:
          summary: "High event processing lag"
          description: "P99 lag: {{ $value | humanize }}ms (threshold: 5000ms)"
          action: "Check CSR Platform CPU, memory, database"

      - alert: CSRWebhookHighRejectionRate
        expr: rate(csr_webhook_received_total{status="rejected"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
          component: csr-platform
        annotations:
          summary: "High webhook rejection rate (validation failures)"
          description: "{{ $value | humanize }} webhooks/sec rejected (event format issue?)"

      - alert: CSREventBusPublishError
        expr: rate(csr_event_bus_publish_errors_total[1m]) > 0
        for: 1m
        labels:
          severity: critical
          component: csr-platform
        annotations:
          summary: "Failed to publish event to internal event bus"
          description: "NATS/Event Bus unavailable or misconfigured"
          action: "Check NATS cluster health and CSR Platform logs"

      - alert: CSRWebhookSignatureFailure
        expr: rate(csr_webhook_signature_validation_failures[1m]) > 0
        for: 1m
        labels:
          severity: critical
          component: csr-platform
        annotations:
          summary: "Webhook signature validation failures (possible tampering)"
          description: "{{ $value | humanize }} signature failures/sec"
          action: "Verify webhook secret matches Buddy System config"

      # Infrastructure Alerts
      - alert: BuddySystemDown
        expr: up{job="buddy-system"} == 0
        for: 1m
        labels:
          severity: critical
          component: buddy-system
        annotations:
          summary: "Buddy System is down"
          description: "Buddy System has not been scraping metrics for 1m"
          action: "Restart Buddy System service"

      - alert: CSRPlatformDown
        expr: up{job="csr-platform"} == 0
        for: 1m
        labels:
          severity: critical
          component: csr-platform
        annotations:
          summary: "CSR Platform is down"
          description: "CSR Platform has not been scraping metrics for 1m"
          action: "Restart CSR Platform service"

      # SLO Alerts
      - alert: EventBusSuccessRateLow
        expr: |
          (rate(buddy_webhook_publish_total{status="success"}[5m]) /
           (rate(buddy_webhook_publish_total[5m]) + 0.001)) < 0.99
        for: 5m
        labels:
          severity: warning
          slo: true
        annotations:
          summary: "Event bus success rate < 99% (Phase 1 SLO)"
          description: "Success rate: {{ $value | humanizePercentage }}"
          threshold: "99%"
```

### AlertManager Configuration

**File**: `alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '<YOUR_SLACK_WEBHOOK_URL>'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h

  routes:
    # Critical alerts - immediate Slack + PagerDuty
    - match:
        severity: critical
      receiver: 'critical'
      continue: true

    # Warning alerts - Slack only
    - match:
        severity: warning
      receiver: 'warnings'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#teei-alerts'
        title: 'Event Bus Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'critical'
    slack_configs:
      - channel: '#teei-critical'
        title: 'CRITICAL: Event Bus Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          Action: {{ .Annotations.action }}
          {{ end }}
    pagerduty_configs:
      - service_key: '<YOUR_PAGERDUTY_KEY>'
        description: '{{ .GroupLabels.alertname }}'
        details:
          firing: '{{ template "pagerduty.default.instances" .Alerts.Firing }}'

  - name: 'warnings'
    slack_configs:
      - channel: '#teei-alerts'
        title: 'Event Bus Warning'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

inhibit_rules:
  # Don't alert on warning if critical already firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

---

## Observability Stack

### Setup Instructions

#### 1. Install Prometheus

```bash
# Using Docker
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/alert-rules.yml:/etc/prometheus/alert-rules.yml \
  -v prometheus-data:/prometheus \
  --name prometheus \
  prom/prometheus:latest

# Verify
curl http://localhost:9090
```

#### 2. Install Grafana

```bash
# Using Docker
docker run -d \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-data:/var/lib/grafana \
  --name grafana \
  grafana/grafana:latest

# Access at http://localhost:3001 (admin/admin)
```

#### 3. Install AlertManager

```bash
docker run -d \
  -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  -v alertmanager-data:/alertmanager \
  --name alertmanager \
  prom/alertmanager:latest
```

#### 4. Expose Metrics from Services

**Buddy System** (add to main app file):

```typescript
import prometheus from 'prom-client';
import express from 'express';

const app = express();

// Register Prometheus client
prometheus.collectDefaultMetrics();

// Create custom counters
const publishTotal = new prometheus.Counter({
  name: 'buddy_webhook_publish_total',
  help: 'Total webhook publish attempts',
  labelNames: ['event_type', 'status'],
});

const publishDuration = new prometheus.Histogram({
  name: 'buddy_webhook_publish_duration_ms',
  help: 'Webhook publish latency',
  labelNames: ['event_type'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});

app.listen(9091, () => console.log('Metrics on :9091'));
```

**CSR Platform** (similar setup on port 9092)

---

## Health Checks

### Webhook Endpoint Health

**Endpoint**: `GET /health/webhook`

```bash
curl http://localhost:3000/health/webhook
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:30:00Z",
  "uptime": "24h45m",
  "events_processed_1h": 5230,
  "avg_latency_ms": 45
}
```

### Dependencies Health

**Endpoint**: `GET /health/all`

```bash
curl http://localhost:3000/health/all
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:30:00Z",
  "services": {
    "api-gateway": {
      "status": "healthy",
      "responseTime": 2
    },
    "nats": {
      "status": "healthy",
      "responseTime": 5
    },
    "database": {
      "status": "healthy",
      "responseTime": 15
    }
  }
}
```

### Metrics Endpoint Health

**Buddy System**: `GET http://localhost:9091/metrics`
**CSR Platform**: `GET http://localhost:9092/metrics`

Both should return Prometheus format metrics.

---

## SLOs & SLIs

### Phase 1 SLOs (Service Level Objectives)

| SLO | Target | Priority |
|-----|--------|----------|
| **Event Delivery Success Rate** | 99% | Critical |
| **Event Processing Latency (p95)** | < 2 seconds | High |
| **Webhook Endpoint Uptime** | 99.5% | High |
| **Error Rate** | < 0.1% | Medium |

### Phase 1 SLIs (Service Level Indicators)

#### SLI: Event Delivery Success Rate

**Definition**: Percentage of events that reach CSR Platform without permanent failure

**Calculation**:
```
Success Rate = (Events received by CSR) / (Events published by Buddy) * 100
```

**PromQL**:
```
(sum(rate(csr_webhook_received_total{status="received"}[5m])) /
 sum(rate(buddy_webhook_publish_total[5m]))) * 100
```

**Target**: >= 99% (max 1% loss)

**Threshold Alert** (< 99% for 5m):
```yaml
- alert: EventDeliverySuccessRateLow
  expr: |
    (sum(rate(csr_webhook_received_total{status="received"}[5m])) /
     sum(rate(buddy_webhook_publish_total[5m]))) < 0.99
  for: 5m
```

#### SLI: Processing Latency P95

**Definition**: 95th percentile end-to-end latency from Buddy publish to CSR processing complete

**Calculation**: `publish_time → csr_receipt → processing_complete`

**PromQL**:
```
histogram_quantile(0.95, csr_webhook_processing_lag_ms)
```

**Target**: <= 2000ms (2 seconds)

**Threshold Alert** (> 2s for 5m):
```yaml
- alert: EventLatencyHigh
  expr: histogram_quantile(0.95, csr_webhook_processing_lag_ms) > 2000
  for: 5m
```

#### SLI: Webhook Endpoint Uptime

**Definition**: Percentage of time webhook endpoint responds successfully

**Calculation**: `(Total requests - 5xx responses) / Total requests * 100`

**Target**: >= 99.5% (up to 5m downtime per day)

**Alerting**: `up{job="csr-platform"} == 0` for 2m

---

## Troubleshooting

### Q: Prometheus doesn't show metrics
**A**:
1. Check if services are running: `curl http://localhost:9091/metrics`
2. Verify prometheus.yml has correct targets
3. Check logs: `docker logs prometheus`
4. Restart Prometheus: `docker restart prometheus`

### Q: Grafana dashboard is blank
**A**:
1. Verify Prometheus data source is connected: `http://localhost:9090`
2. Check metric names match actual metrics (case-sensitive)
3. Ensure time range includes recent data (right side dropdown)
4. Check dashboard queries in Grafana UI

### Q: Alerts not firing
**A**:
1. Verify alert rules loaded: `curl http://localhost:9090/api/v1/rules`
2. Check AlertManager status: `curl http://localhost:9093/api/v1/status`
3. Test Slack webhook: `curl -X POST <SLACK_URL> -d '{"text":"test"}'`
4. Review AlertManager logs: `docker logs alertmanager`

### Q: Metrics accumulate forever
**A**:
1. Set retention: add `--storage.tsdb.retention.time=7d` to Prometheus
2. Prune old data: `docker exec prometheus promtool query instant http://localhost:9090 'up' | head -1`

### Q: Alert spam in Slack
**A**:
1. Increase `group_wait` in alertmanager.yml (batches alerts)
2. Increase `repeat_interval` (default 4h is good)
3. Add inhibit rules to suppress warnings when critical fires

---

## Quick Reference

### Useful Queries

```promql
# Event flow (events/min)
sum(rate(buddy_webhook_publish_total{status="success"}[1m])) * 60

# Error rate (%)
(sum(rate(buddy_webhook_publish_errors_total[5m])) /
 sum(rate(buddy_webhook_publish_total[5m]))) * 100

# Latency percentiles
histogram_quantile(0.95, buddy_webhook_publish_duration_ms)

# Pending retries
buddy_webhook_pending_queue_size

# Service health
up{job=~"buddy-system|csr-platform"}

# Event type breakdown
sum by (event_type) (rate(csr_webhook_received_total[1h]))
```

### Alert Testing

```bash
# Trigger test alert
curl -X POST http://localhost:9090/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert"}}]'

# Query current alerts
curl http://localhost:9090/api/v1/alerts

# Check AlertManager status
curl http://localhost:9093/api/v1/status
```

---

## References

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **AlertManager**: https://prometheus.io/docs/alerting/latest/overview/
- **PromQL**: https://prometheus.io/docs/prometheus/latest/querying/basics/

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-11-14
**Owner**: Observability Engineer (Agent)

