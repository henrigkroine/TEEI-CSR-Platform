# Grafana Adoption Dashboard Specification

**Version:** 1.0.0
**Last Updated:** Phase E - Success Telemetry
**Owner:** Success Telemetry Team (adoption-analyst)
**Status:** Production Ready

## Executive Summary

This document specifies the Grafana dashboard configuration for visualizing adoption and engagement metrics for the Corporate Cockpit. The dashboard provides real-time insights into user activation, engagement, retention, and value realization.

## Dashboard Overview

**Dashboard Name:** Corporate Cockpit - Adoption & Engagement

**UID:** `corp-cockpit-adoption`

**Refresh Rate:** 5 minutes (auto-refresh)

**Time Range:** Default last 7 days, configurable

**Tags:** `adoption`, `engagement`, `success-metrics`, `corporate-cockpit`

---

## Table of Contents

1. [Dashboard Structure](#dashboard-structure)
2. [Panel Specifications](#panel-specifications)
3. [PromQL Query Examples](#promql-query-examples)
4. [LogQL Query Examples](#logql-query-examples)
5. [Alert Rules](#alert-rules)
6. [Variables & Templating](#variables--templating)
7. [Dashboard JSON Export](#dashboard-json-export)

---

## Dashboard Structure

### Layout Overview

The dashboard is organized into 5 rows:

1. **Row 1: Executive Summary** - Key metrics at a glance
2. **Row 2: Activation Funnel** - User journey from invitation to first value
3. **Row 3: Engagement Metrics** - WAU/MAU, actions per session, feature usage
4. **Row 4: Retention & Cohorts** - Week-over-week retention analysis
5. **Row 5: Value Realization** - Delivery success, reports, exports

---

## Panel Specifications

### Row 1: Executive Summary

#### Panel 1.1: Activation Rate (Stat)

**Type:** Stat with gauge

**Description:** Percentage of invited users who activated (first login) in the last 7 days

**Query (PromQL):**
```promql
(
  count_over_time({event="user.activation"}[7d])
  /
  sum(user_invitations_sent[7d])
) * 100
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Activation Rate (7d)",
  "unit": "percent",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 40, "color": "yellow" },
      { "value": 60, "color": "green" }
    ]
  },
  "decimals": 1,
  "options": {
    "graphMode": "area",
    "orientation": "auto",
    "showThresholdLabels": false,
    "showThresholdMarkers": true
  }
}
```

---

#### Panel 1.2: FTUE Completion Rate (Stat)

**Type:** Stat with trend

**Description:** Percentage of activated users who completed onboarding in last 24h

**Query (PromQL):**
```promql
(
  count_over_time({event="user.ftue.completed"}[24h])
  /
  count_over_time({event="user.login.success", is_first_login="true"}[24h])
) * 100
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "FTUE Completion Rate (24h)",
  "unit": "percent",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 50, "color": "yellow" },
      { "value": 75, "color": "green" }
    ]
  },
  "options": {
    "graphMode": "area",
    "orientation": "auto"
  }
}
```

---

#### Panel 1.3: Time to First Value (Stat)

**Type:** Stat with gauge

**Description:** Median days from activation to first meaningful interaction

**Query (PromQL):**
```promql
histogram_quantile(0.5,
  rate(ttfv_days_bucket[7d])
)
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Time to First Value (Median)",
  "unit": "days",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "green" },
      { "value": 3, "color": "yellow" },
      { "value": 7, "color": "red" }
    ]
  },
  "decimals": 1
}
```

---

#### Panel 1.4: Weekly Active Users (Stat)

**Type:** Stat with trend

**Description:** Unique users with activity in last 7 days

**Query (PromQL):**
```promql
count(
  count_over_time({event=~"widget.interacted|report.generated|export.downloaded"}[7d])
  > 0
) by (user_id)
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Weekly Active Users",
  "unit": "short",
  "options": {
    "graphMode": "area",
    "orientation": "auto"
  }
}
```

---

### Row 2: Activation Funnel

#### Panel 2.1: Activation Funnel (Funnel Chart)

**Type:** Grafana Funnel Panel

**Description:** User journey from invitation to first value

**Query (Multiple):**
```promql
# Step 1: Invited
sum(user_invitations_sent[7d])

# Step 2: Activated (First Login)
count_over_time({event="user.activation"}[7d])

# Step 3: FTUE Completed
count_over_time({event="user.ftue.completed"}[7d])

# Step 4: First Value
count_over_time({event=~"dashboard.first_view|report.first_generated|export.first_downloaded"}[7d])
```

**Configuration:**
```json
{
  "type": "grafana-funnel-panel",
  "title": "Activation Funnel (7d)",
  "options": {
    "showPercentages": true,
    "showValues": true
  }
}
```

---

#### Panel 2.2: Activation Trend (Time Series)

**Type:** Time series graph

**Description:** Daily activation count over time

**Query (PromQL):**
```promql
sum(
  count_over_time({event="user.activation"}[1d])
)
```

**Configuration:**
```json
{
  "type": "timeseries",
  "title": "Daily Activations",
  "options": {
    "legend": {
      "displayMode": "list",
      "placement": "bottom"
    },
    "tooltip": {
      "mode": "multi"
    }
  }
}
```

---

### Row 3: Engagement Metrics

#### Panel 3.1: WAU vs MAU (Time Series)

**Type:** Time series graph with dual Y-axis

**Description:** Weekly and monthly active users trend

**Query 1 (WAU):**
```promql
count(
  count_over_time({event=~"widget.interacted|report.generated|export.downloaded"}[7d])
  > 0
) by (user_id)
```

**Query 2 (MAU):**
```promql
count(
  count_over_time({event=~"widget.interacted|report.generated|export.downloaded"}[30d])
  > 0
) by (user_id)
```

**Configuration:**
```json
{
  "type": "timeseries",
  "title": "Active Users (WAU/MAU)",
  "options": {
    "legend": {
      "displayMode": "list",
      "placement": "bottom"
    }
  }
}
```

---

#### Panel 3.2: Actions per Session (Stat)

**Type:** Stat with trend

**Description:** Average actions per session

**Query (PromQL):**
```promql
sum(rate(session_actions_total[1h]))
/
sum(rate(session_count_total[1h]))
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Avg Actions per Session",
  "unit": "short",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 5, "color": "yellow" },
      { "value": 8, "color": "green" }
    ]
  },
  "decimals": 1
}
```

---

#### Panel 3.3: Feature Usage Heatmap

**Type:** Heatmap

**Description:** Feature usage by hour of day

**Query (PromQL):**
```promql
sum(
  count_over_time({event="feature.used"}[1h])
) by (feature, hour)
```

**Configuration:**
```json
{
  "type": "heatmap",
  "title": "Feature Usage by Hour",
  "options": {
    "calculate": true,
    "cellGap": 1,
    "color": {
      "exponent": 0.5,
      "mode": "scheme",
      "scheme": "Spectral"
    }
  }
}
```

---

#### Panel 3.4: Top Features (Bar Chart)

**Type:** Bar chart

**Description:** Most used features in last 7 days

**Query (PromQL):**
```promql
topk(10,
  sum(
    count_over_time({event="feature.used"}[7d])
  ) by (feature)
)
```

**Configuration:**
```json
{
  "type": "barchart",
  "title": "Top 10 Features (7d)",
  "options": {
    "orientation": "horizontal",
    "showValues": true,
    "xField": "feature"
  }
}
```

---

### Row 4: Retention & Cohorts

#### Panel 4.1: Week-over-Week Retention (Heatmap)

**Type:** Heatmap

**Description:** Cohort retention analysis showing % of users returning each week

**Query (PromQL):**
```promql
# Requires backend aggregation to calculate cohorts
sum(user_retention_cohort_percentage) by (cohort_week, week_number)
```

**Configuration:**
```json
{
  "type": "heatmap",
  "title": "Cohort Retention Heatmap",
  "options": {
    "calculate": false,
    "cellGap": 1,
    "color": {
      "mode": "scheme",
      "scheme": "RdYlGn"
    }
  },
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 0,
      "max": 100
    }
  }
}
```

---

#### Panel 4.2: Retention Rate (Time Series)

**Type:** Time series graph

**Description:** Weekly retention rate trend

**Query (PromQL):**
```promql
(
  count(
    count_over_time({event=~".*"}[7d] offset 7d) > 0
    AND
    count_over_time({event=~".*"}[7d]) > 0
  ) by (user_id)
  /
  count(
    count_over_time({event=~".*"}[7d] offset 7d) > 0
  ) by (user_id)
) * 100
```

**Configuration:**
```json
{
  "type": "timeseries",
  "title": "Week-over-Week Retention (%)",
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 0,
      "max": 100
    }
  },
  "options": {
    "legend": {
      "displayMode": "list"
    }
  }
}
```

---

### Row 5: Value Realization

#### Panel 5.1: Delivery Success Rate (Stat)

**Type:** Stat with gauge

**Description:** Percentage of successful Impact-In deliveries

**Query (PromQL):**
```promql
(
  sum(rate(impact_in_delivery_success_total[1h]))
  /
  sum(rate(impact_in_delivery_total[1h]))
) * 100
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Delivery Success Rate",
  "unit": "percent",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 90, "color": "yellow" },
      { "value": 95, "color": "green" }
    ]
  },
  "decimals": 2
}
```

---

#### Panel 5.2: Reports per User (Stat)

**Type:** Stat

**Description:** Average reports generated per WAU

**Query (PromQL):**
```promql
sum(rate(reports_generated_total[7d]))
/
count(
  count_over_time({event=~".*"}[7d]) > 0
) by (user_id)
```

**Configuration:**
```json
{
  "type": "stat",
  "title": "Avg Reports per User (7d)",
  "unit": "short",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 1, "color": "yellow" },
      { "value": 2, "color": "green" }
    ]
  },
  "decimals": 1
}
```

---

#### Panel 5.3: Export Rate (Gauge)

**Type:** Gauge

**Description:** Percentage of reports that are exported/downloaded

**Query (PromQL):**
```promql
(
  sum(rate(exports_downloaded_total[1d]))
  /
  sum(rate(reports_viewed_total[1d]))
) * 100
```

**Configuration:**
```json
{
  "type": "gauge",
  "title": "Export Rate",
  "unit": "percent",
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": 0, "color": "red" },
      { "value": 25, "color": "yellow" },
      { "value": 40, "color": "green" }
    ]
  }
}
```

---

#### Panel 5.4: Report Types Breakdown (Pie Chart)

**Type:** Pie chart

**Description:** Distribution of report types generated

**Query (PromQL):**
```promql
sum(
  count_over_time({event="report.generated"}[7d])
) by (report_type)
```

**Configuration:**
```json
{
  "type": "piechart",
  "title": "Report Types (7d)",
  "options": {
    "legend": {
      "displayMode": "table",
      "placement": "right",
      "values": ["value", "percent"]
    }
  }
}
```

---

## PromQL Query Examples

### Activation Metrics

**1. Activation Rate (7-day window):**
```promql
(
  count_over_time({event="user.activation"}[7d])
  /
  sum(user_invitations_sent[7d])
) * 100
```

**2. FTUE Completion Rate (24h window):**
```promql
(
  count_over_time({event="user.ftue.completed"}[24h])
  /
  count_over_time({event="user.login.success", is_first_login="true"}[24h])
) * 100
```

**3. Time to First Value (Median):**
```promql
histogram_quantile(0.5,
  sum(rate(ttfv_days_bucket[7d])) by (le)
)
```

**4. Time to First Value (95th percentile):**
```promql
histogram_quantile(0.95,
  sum(rate(ttfv_days_bucket[7d])) by (le)
)
```

---

### Engagement Metrics

**5. Weekly Active Users:**
```promql
count(
  count_over_time({event=~"widget.interacted|report.generated|export.downloaded"}[7d])
  > 0
) by (user_id)
```

**6. Monthly Active Users:**
```promql
count(
  count_over_time({event=~"widget.interacted|report.generated|export.downloaded"}[30d])
  > 0
) by (user_id)
```

**7. WAU/MAU Ratio (Stickiness):**
```promql
(
  count(count_over_time({event=~".*"}[7d]) > 0) by (user_id)
  /
  count(count_over_time({event=~".*"}[30d]) > 0) by (user_id)
) * 100
```

**8. Actions per Session:**
```promql
sum(rate(session_actions_total[1h]))
/
sum(rate(session_count_total[1h]))
```

**9. Average Session Duration:**
```promql
avg(session_duration_seconds)
```

---

### Retention Metrics

**10. Week-over-Week Retention:**
```promql
(
  count(
    count_over_time({event=~".*"}[7d] offset 7d) > 0
    AND
    count_over_time({event=~".*"}[7d]) > 0
  ) by (user_id)
  /
  count(
    count_over_time({event=~".*"}[7d] offset 7d) > 0
  ) by (user_id)
) * 100
```

---

### Value Realization Metrics

**11. Delivery Success Rate:**
```promql
(
  sum(rate(impact_in_delivery_success_total[1h]))
  /
  sum(rate(impact_in_delivery_total[1h]))
) * 100
```

**12. Reports per Active User:**
```promql
sum(rate(reports_generated_total[7d]))
/
count(count_over_time({event=~".*"}[7d]) > 0) by (user_id)
```

**13. Export Download Rate:**
```promql
(
  sum(rate(exports_downloaded_total[1d]))
  /
  sum(rate(reports_viewed_total[1d]))
) * 100
```

---

## LogQL Query Examples

If using Grafana Loki for log aggregation:

**1. Activation Events:**
```logql
{service="corp-cockpit-astro", event="user.activation"}
| json
| line_format "User {{.user_id}} activated in {{.time_taken_days}} days"
```

**2. Failed Deliveries:**
```logql
{service="corp-cockpit-astro", event="impact_in.delivery.outcome", status="failed"}
| json
| line_format "Delivery {{.delivery_id}} failed: {{.error_reason}}"
```

**3. Top Features by Usage:**
```logql
sum by (feature) (
  count_over_time({service="corp-cockpit-astro", event="feature.used"}[7d])
)
```

---

## Alert Rules

### Critical Alerts

**1. Low Activation Rate**

```yaml
groups:
  - name: adoption_alerts
    interval: 1h
    rules:
      - alert: LowActivationRate
        expr: |
          (
            count_over_time({event="user.activation"}[7d])
            /
            sum(user_invitations_sent[7d])
          ) * 100 < 40
        for: 24h
        labels:
          severity: critical
          category: adoption
        annotations:
          summary: "Low activation rate detected"
          description: "Activation rate is {{ $value }}% (target: ≥60%)"
```

---

**2. High FTUE Drop-off**

```yaml
- alert: HighFTUEDropoff
  expr: |
    (
      count_over_time({event="user.ftue.completed"}[24h])
      /
      count_over_time({event="user.login.success", is_first_login="true"}[24h])
    ) * 100 < 50
  for: 6h
  labels:
    severity: warning
    category: onboarding
  annotations:
    summary: "High FTUE drop-off detected"
    description: "FTUE completion rate is {{ $value }}% (target: ≥75%)"
```

---

**3. Delivery Failure Spike**

```yaml
- alert: HighDeliveryFailureRate
  expr: |
    (
      sum(rate(impact_in_delivery_failed_total[1h]))
      /
      sum(rate(impact_in_delivery_total[1h]))
    ) * 100 > 10
  for: 30m
  labels:
    severity: critical
    category: delivery
  annotations:
    summary: "High delivery failure rate"
    description: "Delivery failure rate is {{ $value }}% (target: <5%)"
```

---

**4. User Churn Alert**

```yaml
- alert: HighUserChurn
  expr: |
    (
      count(
        count_over_time({event=~".*"}[7d] offset 7d) > 0
        AND
        count_over_time({event=~".*"}[7d]) > 0
      ) by (user_id)
      /
      count(
        count_over_time({event=~".*"}[7d] offset 7d) > 0
      ) by (user_id)
    ) * 100 < 50
  for: 7d
  labels:
    severity: warning
    category: retention
  annotations:
    summary: "User retention dropped significantly"
    description: "Week-over-week retention is {{ $value }}% (target: ≥70%)"
```

---

## Variables & Templating

### Dashboard Variables

**1. Tenant Filter:**
```json
{
  "name": "tenant_id",
  "type": "query",
  "query": "label_values(tenant_id)",
  "multi": true,
  "includeAll": true
}
```

**2. Time Range:**
```json
{
  "name": "time_range",
  "type": "interval",
  "options": ["7d", "14d", "30d", "90d"],
  "current": "7d"
}
```

**3. User Role:**
```json
{
  "name": "user_role",
  "type": "query",
  "query": "label_values(user_role)",
  "multi": true,
  "includeAll": true
}
```

---

## Dashboard JSON Export

To import this dashboard into Grafana, use the following structure:

```json
{
  "dashboard": {
    "title": "Corporate Cockpit - Adoption & Engagement",
    "uid": "corp-cockpit-adoption",
    "tags": ["adoption", "engagement", "success-metrics"],
    "timezone": "browser",
    "refresh": "5m",
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "tenant_id",
          "type": "query",
          "query": "label_values(tenant_id)",
          "multi": true,
          "includeAll": true
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "type": "stat",
        "title": "Activation Rate (7d)",
        "targets": [
          {
            "expr": "(count_over_time({event=\"user.activation\"}[7d])/sum(user_invitations_sent[7d]))*100"
          }
        ],
        "gridPos": {
          "x": 0,
          "y": 0,
          "w": 6,
          "h": 4
        }
      }
      // ... (additional panels)
    ]
  }
}
```

---

## Implementation Steps

### 1. Setup Prometheus Data Source

In Grafana:
1. Navigate to **Configuration → Data Sources**
2. Add **Prometheus** data source
3. Set URL: `http://prometheus:9090`
4. Save & Test

### 2. Import Dashboard

Option A - Manual:
1. Navigate to **Dashboards → Import**
2. Paste JSON configuration
3. Select Prometheus data source
4. Click **Import**

Option B - Provisioning:
1. Add dashboard JSON to `/etc/grafana/provisioning/dashboards/`
2. Restart Grafana
3. Dashboard auto-loads

### 3. Configure Alerts

1. Navigate to **Alerting → Alert Rules**
2. Create new alert group: `adoption_alerts`
3. Add each alert rule from **Alert Rules** section
4. Configure notification channels (Slack, email, PagerDuty)

### 4. Test Metrics Flow

Verify data is flowing:
```bash
# Test OTLP endpoint
curl http://localhost:4318/v1/traces

# Query Prometheus
curl http://localhost:9090/api/v1/query?query=user_activation_total

# Check Grafana dashboard
# Navigate to Grafana → Dashboards → Corporate Cockpit - Adoption & Engagement
```

---

## Best Practices

### 1. Query Optimization

- Use **recording rules** for complex queries that are frequently used
- Set appropriate **scrape intervals** (15s default)
- Use **downsampling** for long-term retention

### 2. Dashboard Performance

- Limit **time range** to 30 days or less for heavy queries
- Use **query caching** where possible
- Avoid **high-cardinality labels** (e.g., user_id in labels)

### 3. Alert Tuning

- Start with **conservative thresholds** and adjust based on baseline
- Use **for** clauses to avoid alert flapping
- Group related alerts to reduce noise

---

## Troubleshooting

### Issue: No Data Showing

**Solutions:**
1. Verify OpenTelemetry collector is running
2. Check Prometheus scrape targets: `http://localhost:9090/targets`
3. Verify client is sending events (check browser DevTools → Network)
4. Check CORS configuration if using external OTLP endpoint

### Issue: Queries Timing Out

**Solutions:**
1. Reduce time range
2. Add **rate()** or **increase()** to counter queries
3. Use **recording rules** for complex aggregations
4. Increase Prometheus query timeout

### Issue: Incorrect Metrics

**Solutions:**
1. Verify event names match exactly (case-sensitive)
2. Check label names and values
3. Validate PromQL syntax in Prometheus UI first
4. Review client instrumentation code

---

## References

- **Adoption Metrics Spec:** `/docs/success/adoption_metrics.md`
- **OpenTelemetry Setup:** `/docs/Observability_Overview.md`
- **Prometheus Docs:** https://prometheus.io/docs/
- **Grafana Docs:** https://grafana.com/docs/
- **PromQL Cheat Sheet:** https://promlabs.com/promql-cheat-sheet/

---

**Last Updated:** Phase E - Success Telemetry
**Version:** 1.0.0
**Status:** Production Ready
