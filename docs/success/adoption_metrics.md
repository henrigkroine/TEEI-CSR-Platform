# Adoption Metrics Framework

**Version:** 1.0.0
**Last Updated:** Phase E - Success Telemetry
**Owner:** Success Telemetry Team (adoption-analyst)
**Status:** Production Ready

## Executive Summary

This document defines the adoption metrics framework for the Corporate Cockpit, enabling data-driven insights into user activation, engagement, and value realization. All metrics are instrumented via OpenTelemetry and visualized in Grafana dashboards.

## Table of Contents

1. [Core Adoption Metrics](#core-adoption-metrics)
2. [Engagement Metrics](#engagement-metrics)
3. [Retention Metrics](#retention-metrics)
4. [Value Realization Metrics](#value-realization-metrics)
5. [Data Collection Methods](#data-collection-methods)
6. [Target Thresholds](#target-thresholds)
7. [Grafana Integration](#grafana-integration)

---

## Core Adoption Metrics

### 1. Activation Rate

**Definition:** Percentage of invited users who complete their first successful login within 7 days of invitation.

**Calculation Formula:**
```
Activation Rate = (Unique Users with First Login / Total Invited Users) × 100%
```

**Target Threshold:** ≥ 60%

**Data Source:**
- Event: `user.login.success` (with `is_first_login: true` attribute)
- Timeframe: 7 days from invitation timestamp
- Denominator: User invitation records from backend database

**Collection Method:**
```typescript
// On successful first login
adoptionTracker.trackActivation({
  userId: string,
  tenantId: string,
  invitedAt: timestamp,
  activatedAt: timestamp,
  timeTaken: number, // days
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel with gauge
- **Query:**
  ```promql
  (
    count_over_time(user_login_success{is_first_login="true"}[7d])
    /
    count(user_invitations_sent[7d])
  ) * 100
  ```
- **Thresholds:**
  - Green: ≥ 60%
  - Yellow: 40-60%
  - Red: < 40%

---

### 2. FTUE Completion Rate (First Time User Experience)

**Definition:** Percentage of activated users who complete the onboarding flow within 24 hours of first login.

**Calculation Formula:**
```
FTUE Completion Rate = (Users Completing Onboarding / Activated Users) × 100%
```

**Target Threshold:** ≥ 75%

**Data Source:**
- Event: `user.ftue.completed`
- Onboarding steps tracked: profile setup, role selection, first dashboard view, tutorial completion
- Timeframe: 24 hours from first login

**Collection Method:**
```typescript
// Track each onboarding step
adoptionTracker.trackOnboardingStep({
  userId: string,
  step: 'profile_setup' | 'role_selected' | 'dashboard_viewed' | 'tutorial_completed',
  timestamp: number,
});

// Track completion
adoptionTracker.trackOnboardingComplete({
  userId: string,
  completedAt: timestamp,
  stepsCompleted: number,
  totalSteps: number,
  timeTaken: number, // minutes
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel with trend
- **Query:**
  ```promql
  (
    count_over_time(user_ftue_completed[24h])
    /
    count_over_time(user_login_success{is_first_login="true"}[24h])
  ) * 100
  ```
- **Thresholds:**
  - Green: ≥ 75%
  - Yellow: 50-75%
  - Red: < 50%

---

### 3. TTFV (Time to First Value)

**Definition:** Median number of days from first login until first meaningful dashboard interaction (viewing a report, generating an export, or interacting with a widget).

**Calculation Formula:**
```
TTFV = MEDIAN(First Value Timestamp - First Login Timestamp) in days
```

**Target Threshold:** ≤ 3 days

**Data Source:**
- Event: `dashboard.first_view`, `report.first_generated`, `export.first_downloaded`
- Calculated as time delta from `user.login.success` (first login)

**Collection Method:**
```typescript
// Track first meaningful interaction
adoptionTracker.trackFirstValue({
  userId: string,
  action: 'dashboard_view' | 'report_generated' | 'export_downloaded',
  timestamp: number,
  daysSinceActivation: number,
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel with histogram
- **Query:**
  ```promql
  histogram_quantile(0.5,
    rate(ttfv_days_bucket[7d])
  )
  ```
- **Thresholds:**
  - Green: ≤ 3 days
  - Yellow: 3-7 days
  - Red: > 7 days

---

## Engagement Metrics

### 4. WAU (Weekly Active Users)

**Definition:** Number of unique users who performed at least one meaningful action in the past 7 days.

**Calculation Formula:**
```
WAU = COUNT(DISTINCT user_id WHERE last_activity >= NOW() - 7 days)
```

**Target Threshold:** ≥ 80% of total activated users

**Data Source:**
- Events: Any user interaction event (`dashboard.viewed`, `widget.interacted`, `report.generated`, etc.)
- Timeframe: Rolling 7-day window

**Collection Method:**
```typescript
// Auto-tracked on any user session
adoptionTracker.trackUserActivity({
  userId: string,
  action: string,
  timestamp: number,
});
```

**Grafana Panel Spec:**
- **Type:** Time series graph
- **Query:**
  ```promql
  count(
    count_over_time(user_activity[7d]) > 0
  ) by (user_id)
  ```
- **Thresholds:**
  - Green: ≥ 80% of activated users
  - Yellow: 60-80%
  - Red: < 60%

---

### 5. MAU (Monthly Active Users)

**Definition:** Number of unique users who performed at least one meaningful action in the past 30 days.

**Calculation Formula:**
```
MAU = COUNT(DISTINCT user_id WHERE last_activity >= NOW() - 30 days)
```

**Target Threshold:** ≥ 90% of total activated users

**Data Source:**
- Same as WAU, but 30-day rolling window

**Collection Method:**
- Same as WAU, aggregated over 30 days

**Grafana Panel Spec:**
- **Type:** Time series graph with MAU/WAU ratio
- **Query:**
  ```promql
  count(
    count_over_time(user_activity[30d]) > 0
  ) by (user_id)
  ```

---

### 6. Engagement Depth

**Definition:** Average number of actions per session and unique features used per user.

**Calculation Formula:**
```
Actions per Session = SUM(actions) / SUM(sessions)
Features per User = COUNT(DISTINCT features_used) / COUNT(DISTINCT users)
```

**Target Threshold:**
- ≥ 8 actions per session
- ≥ 5 features per user per week

**Data Source:**
- Event: `user.session.ended` with action count
- Events: Feature-specific interactions (`widget.interacted`, `report.generated`, `export.downloaded`, `filter.applied`, etc.)

**Collection Method:**
```typescript
// Track session
adoptionTracker.trackSession({
  userId: string,
  sessionId: string,
  duration: number, // seconds
  actionCount: number,
  featuresUsed: string[],
  startedAt: timestamp,
  endedAt: timestamp,
});

// Track feature usage
adoptionTracker.trackFeatureUsage({
  userId: string,
  feature: string,
  timestamp: number,
});
```

**Grafana Panel Spec:**
- **Type:** Multi-panel (Stat + Bar chart)
- **Query 1 (Actions per Session):**
  ```promql
  sum(rate(session_actions_total[1h]))
  /
  sum(rate(session_count_total[1h]))
  ```
- **Query 2 (Features per User):**
  ```promql
  count(features_used) by (user_id)
  ```

---

## Retention Metrics

### 7. Week-over-Week User Retention

**Definition:** Percentage of users active in week N who return in week N+1.

**Calculation Formula:**
```
W/W Retention = (Users Active in Week N AND Week N+1 / Users Active in Week N) × 100%
```

**Target Threshold:** ≥ 70%

**Data Source:**
- Event: Weekly cohort analysis from `user_activity` events
- Cohort: Users active in a specific week

**Collection Method:**
```typescript
// Automatic cohort tracking based on user_activity events
// Backend aggregation job calculates weekly retention cohorts
```

**Grafana Panel Spec:**
- **Type:** Time series with cohort retention curves
- **Query:**
  ```promql
  (
    count(user_active_week_n AND user_active_week_n_plus_1)
    /
    count(user_active_week_n)
  ) * 100
  ```
- **Thresholds:**
  - Green: ≥ 70%
  - Yellow: 50-70%
  - Red: < 50%

---

## Value Realization Metrics

### 8. Delivery Success Rate

**Definition:** Percentage of scheduled Impact-In deliveries that complete successfully without errors.

**Calculation Formula:**
```
Delivery Success Rate = (Successful Deliveries / Total Scheduled Deliveries) × 100%
```

**Target Threshold:** ≥ 95%

**Data Source:**
- Event: `impact_in.delivery.completed` with `status: 'success' | 'failed'`
- Backend: Impact-In delivery job logs

**Collection Method:**
```typescript
// Track delivery outcome
adoptionTracker.trackDeliveryOutcome({
  deliveryId: string,
  tenantId: string,
  status: 'success' | 'failed',
  errorReason?: string,
  timestamp: number,
  duration: number, // ms
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel with trend
- **Query:**
  ```promql
  (
    sum(rate(impact_in_delivery_success_total[1h]))
    /
    sum(rate(impact_in_delivery_total[1h]))
  ) * 100
  ```
- **Thresholds:**
  - Green: ≥ 95%
  - Yellow: 90-95%
  - Red: < 90%

---

### 9. Report Generation Rate

**Definition:** Average number of reports generated per active user per week.

**Calculation Formula:**
```
Reports per User per Week = SUM(reports_generated) / WAU
```

**Target Threshold:** ≥ 2 reports per user per week

**Data Source:**
- Event: `report.generated` with `report_type` attribute
- Denominator: WAU

**Collection Method:**
```typescript
// Track report generation
adoptionTracker.trackReportGenerated({
  userId: string,
  reportType: 'executive' | 'operational' | 'custom',
  format: 'pdf' | 'pptx' | 'csv',
  timestamp: number,
  generationTime: number, // ms
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel with bar chart
- **Query:**
  ```promql
  sum(rate(reports_generated_total[7d]))
  /
  count(count_over_time(user_activity[7d]) > 0)
  ```

---

### 10. Export Download Rate

**Definition:** Percentage of reports that are downloaded/exported vs just viewed.

**Calculation Formula:**
```
Export Rate = (Exports Downloaded / Reports Viewed) × 100%
```

**Target Threshold:** ≥ 40%

**Data Source:**
- Event: `export.downloaded` with `export_type` attribute
- Event: `report.viewed`

**Collection Method:**
```typescript
// Track export
adoptionTracker.trackExport({
  userId: string,
  exportType: 'pdf' | 'csv' | 'json' | 'pptx',
  reportId?: string,
  timestamp: number,
  fileSize: number, // bytes
});
```

**Grafana Panel Spec:**
- **Type:** Stat panel
- **Query:**
  ```promql
  (
    sum(rate(exports_downloaded_total[1d]))
    /
    sum(rate(reports_viewed_total[1d]))
  ) * 100
  ```

---

## Data Collection Methods

### Client-Side Instrumentation

All client-side tracking is implemented via the **Adoption Tracker** utility using OpenTelemetry Web SDK:

**Location:** `/apps/corp-cockpit-astro/src/utils/adoption-tracker.ts`

**Key Features:**
- Automatic page view tracking with route labels
- User action event tracking (clicks, interactions)
- Session management with duration tracking
- Error event tracking
- Privacy-safe user properties (anonymized tenant ID, role)

**Integration Points:**
- OpenTelemetry Collector (OTLP/HTTP endpoint)
- Grafana Loki (for log aggregation)
- Prometheus (for metrics scraping)

### Backend Aggregation

Some metrics require backend aggregation:
- **Activation Rate:** Calculated from user invitation + first login events
- **TTFV:** Requires delta calculation between first login and first value
- **Retention Cohorts:** Weekly batch job to calculate cohort retention

**Batch Job Location:** `/services/analytics-service/src/jobs/adoption-metrics.ts`

### Privacy Considerations

All telemetry respects GDPR compliance:
- **No PII collected:** User IDs are anonymized/hashed
- **Tenant-level aggregation:** Metrics rolled up by tenant, not individual users
- **Opt-out support:** Users can disable telemetry in preferences
- **Data retention:** 90-day retention policy for raw events, 2 years for aggregates

---

## Target Thresholds Summary

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **Activation Rate** | ≥ 60% | 40-60% | < 40% |
| **FTUE Completion** | ≥ 75% | 50-75% | < 50% |
| **TTFV** | ≤ 3 days | 3-7 days | > 7 days |
| **WAU** | ≥ 80% of activated | 60-80% | < 60% |
| **MAU** | ≥ 90% of activated | 70-90% | < 70% |
| **Actions per Session** | ≥ 8 | 5-8 | < 5 |
| **Features per User** | ≥ 5/week | 3-5/week | < 3/week |
| **W/W Retention** | ≥ 70% | 50-70% | < 50% |
| **Delivery Success** | ≥ 95% | 90-95% | < 90% |
| **Reports per User** | ≥ 2/week | 1-2/week | < 1/week |
| **Export Rate** | ≥ 40% | 25-40% | < 25% |

---

## Grafana Integration

### Dashboard Structure

All adoption metrics are visualized in the **Adoption & Engagement Dashboard** in Grafana.

**Dashboard Location:** Grafana → Dashboards → Adoption & Engagement

**Panels:**
1. **Activation Funnel** - Invited → Activated → FTUE Complete → First Value
2. **Active Users** - WAU/MAU trend over time
3. **Engagement Depth** - Actions per session, features used
4. **Retention Cohorts** - Week-over-week retention heatmap
5. **Value Metrics** - Delivery success, report generation, export rates
6. **Alerts** - Active alerts for threshold violations

### Query Examples

See `/docs/success/grafana_adoption_dashboard.md` for complete panel specifications and PromQL queries.

---

## Alerting Rules

### Critical Alerts

**1. Low Activation Rate**
```yaml
alert: LowActivationRate
expr: activation_rate < 40
for: 1d
severity: critical
message: "Activation rate dropped below 40% (current: {{ $value }}%)"
```

**2. High FTUE Drop-off**
```yaml
alert: HighFTUEDropoff
expr: ftue_completion_rate < 50
for: 6h
severity: warning
message: "FTUE completion rate dropped below 50% (current: {{ $value }}%)"
```

**3. Delivery Failures**
```yaml
alert: HighDeliveryFailureRate
expr: delivery_success_rate < 90
for: 1h
severity: critical
message: "Impact-In delivery success rate below 90% (current: {{ $value }}%)"
```

**4. User Churn**
```yaml
alert: HighUserChurn
expr: week_over_week_retention < 50
for: 1w
severity: warning
message: "User retention dropped below 50% (current: {{ $value }}%)"
```

---

## Monitoring & Reporting

### Daily Health Check

Review the following metrics daily:
- ✅ Activation rate (trailing 7 days)
- ✅ FTUE completion rate (trailing 24 hours)
- ✅ WAU trend (is it growing or declining?)
- ✅ Delivery success rate (trailing 24 hours)

### Weekly Review

Analyze trends weekly:
- 📊 Week-over-week retention
- 📊 Engagement depth (actions per session)
- 📊 Feature adoption (which features are used most?)
- 📊 TTFV distribution (identify slow-to-value cohorts)

### Monthly Business Review

Present to stakeholders monthly:
- 📈 MAU growth rate
- 📈 Activation funnel conversion rates
- 📈 Value realization metrics (reports, exports)
- 📈 Top features by usage
- 📈 Cohort retention curves

---

## References

- **Observability Infrastructure:** `/docs/Observability_Overview.md`
- **Grafana Dashboard Spec:** `/docs/success/grafana_adoption_dashboard.md`
- **OpenTelemetry Setup:** `/packages/observability/README.md`
- **Analytics Service:** `/services/analytics-service/README.md`

---

**Last Updated:** Phase E - Success Telemetry
**Version:** 1.0.0
**Status:** Production Ready
