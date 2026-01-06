# Cost & Latency SLO Tracking Report

**Generated**: {{timestamp}}
**Reporting Period**: {{startDate}} to {{endDate}}
**Report ID**: {{reportId}}

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Cost** | ${{totalCost}} | {{costStatus}} |
| **Avg Cost/Request** | ${{avgCostPerRequest}} | {{avgCostStatus}} |
| **Global Budget Utilization** | {{globalBudgetUtilization}}% | {{budgetStatus}} |
| **Avg Latency (p95)** | {{avgLatencyP95}}ms | {{latencyStatus}} |
| **SLO Compliance Rate** | {{sloComplianceRate}}% | {{complianceStatus}} |
| **Total Requests** | {{totalRequests}} | - |
| **Active Tenants** | {{activeTenants}} | - |

---

## 1. Per-Tenant Cost Breakdown

### Top 10 Tenants by Cost

| Rank | Tenant ID | Monthly Cost | Budget | Utilization | Requests | Avg Cost/Req | Status |
|------|-----------|--------------|--------|-------------|----------|--------------|--------|
{{#tenantCostRanking}}
| {{rank}} | {{tenantId}} | ${{monthlyCost}} | ${{budget}} | {{utilization}}% | {{requests}} | ${{avgCost}} | {{status}} |
{{/tenantCostRanking}}

### Budget Alerts

{{#budgetAlerts}}
#### {{tenantId}} - {{alertType}}

- **Current Spend**: ${{currentSpend}}
- **Budget**: ${{budget}}
- **Utilization**: {{utilization}}%
- **Projected Month-End**: ${{projectedSpend}}
- **Action Required**: {{actionRequired}}

{{/budgetAlerts}}

{{^budgetAlerts}}
✅ No budget alerts at this time.
{{/budgetAlerts}}

---

## 2. Latency Performance by Tenant

### Latency Percentiles (All Tenants)

| Tenant ID | p50 (ms) | p95 (ms) | p99 (ms) | Sample Size | SLO (p95) | Compliant |
|-----------|----------|----------|----------|-------------|-----------|-----------|
{{#tenantLatency}}
| {{tenantId}} | {{p50}} | {{p95}} | {{p99}} | {{sampleSize}} | {{sloThreshold}} | {{compliant}} |
{{/tenantLatency}}

### Latency Trend (Last 30 Days)

```
{{latencyTrendChart}}
```

### Cold-Start Performance

| Metric | First Request | Subsequent Avg | Improvement |
|--------|---------------|----------------|-------------|
| **Time to First Token (TTFT)** | {{ttftFirst}}ms | {{ttftAvg}}ms | {{ttftImprovement}}% |
| **Total Latency** | {{latencyFirst}}ms | {{latencyAvg}}ms | {{latencyImprovement}}% |
| **Pool Warmup Savings** | - | {{poolSavings}}ms | - |

---

## 3. Model Auto-Switch Events

### Switch Summary

- **Total Switches**: {{totalSwitches}}
- **Cost-Triggered**: {{costTriggeredSwitches}} ({{costTriggeredPercent}}%)
- **Latency-Triggered**: {{latencyTriggeredSwitches}} ({{latencyTriggeredPercent}}%)
- **Manual Switches**: {{manualSwitches}}
- **Recovery Switches**: {{recoverySwitches}}

### Recent Switch Events

| Timestamp | Tenant ID | From Model | To Model | Reason | Trigger Value | Threshold |
|-----------|-----------|------------|----------|--------|---------------|-----------|
{{#switchEvents}}
| {{timestamp}} | {{tenantId}} | {{fromModel}} | {{toModel}} | {{reason}} | {{triggerValue}} | {{threshold}} |
{{/switchEvents}}

### Model Distribution

| Model | Active Tenants | Requests | Total Cost | Avg Latency |
|-------|----------------|----------|------------|-------------|
{{#modelDistribution}}
| {{model}} | {{tenants}} | {{requests}} | ${{cost}} | {{avgLatency}}ms |
{{/modelDistribution}}

---

## 4. Budget Utilization Detail

### Monthly Budget Status

{{#monthlyBudgets}}
#### {{tenantId}}

**Budget**: ${{budget}} | **Spent**: ${{spent}} | **Remaining**: ${{remaining}}

Progress: [{{progressBar}}] {{utilization}}%

{{#warnings}}
- ⚠️ {{warningMessage}}
{{/warnings}}

{{#exceeded}}
- 🚨 **BUDGET EXCEEDED** - Additional spend: ${{overage}}
- Override Allowed: {{overrideAllowed}}
{{/exceeded}}

---
{{/monthlyBudgets}}

### Daily Budget Trends (Last 7 Days)

| Date | Total Spent | Avg per Tenant | Peak Tenant | Peak Amount |
|------|-------------|----------------|-------------|-------------|
{{#dailyBudgets}}
| {{date}} | ${{totalSpent}} | ${{avgPerTenant}} | {{peakTenant}} | ${{peakAmount}} |
{{/dailyBudgets}}

---

## 5. SLO Compliance Status

### Overall Compliance

```
Cost SLO:     [{{costSLOBar}}] {{costSLOCompliance}}%
Latency SLO:  [{{latencySLOBar}}] {{latencySLOCompliance}}%
Combined:     [{{combinedSLOBar}}] {{combinedSLOCompliance}}%
```

### Non-Compliant Tenants

{{#nonCompliantTenants}}
#### {{tenantId}}

- **Violations**: {{violationCount}}
- **Issue**: {{primaryIssue}}
- **Current**: {{currentValue}}
- **SLO Threshold**: {{sloThreshold}}
- **Recommended Action**: {{recommendation}}

{{/nonCompliantTenants}}

{{^nonCompliantTenants}}
✅ All tenants are SLO-compliant.
{{/nonCompliantTenants}}

---

## 6. Cost Optimization Recommendations

{{#recommendations}}
### {{category}}

{{#items}}
- **{{tenantId}}**: {{recommendation}}
  - Current: {{currentValue}}
  - Potential Savings: {{potentialSavings}}
  - Effort: {{implementationEffort}}

{{/items}}
{{/recommendations}}

### Estimated Total Savings

| Category | Monthly Savings | Annual Savings | Implementation Effort |
|----------|-----------------|----------------|----------------------|
{{#savingsSummary}}
| {{category}} | ${{monthlySavings}} | ${{annualSavings}} | {{effort}} |
{{/savingsSummary}}
| **TOTAL** | **${{totalMonthlySavings}}** | **${{totalAnnualSavings}}** | - |

---

## 7. Cache & Optimization Performance

### Cache Warmer Statistics

- **Total Warmups**: {{totalWarmups}}
- **Success Rate**: {{warmupSuccessRate}}%
- **Avg Warmup Duration**: {{avgWarmupDuration}}ms
- **Cache Hit Rate**: {{cacheHitRate}}%

### Connection Pool Status

| Provider | Active | Idle | Total Requests | Avg Init Time |
|----------|--------|------|----------------|---------------|
{{#connectionPools}}
| {{provider}} | {{active}} | {{idle}} | {{totalRequests}} | {{avgInitTime}}ms |
{{/connectionPools}}

---

## 8. Budget Event Log

### Critical Events (Last 30 Days)

| Timestamp | Tenant ID | Event Type | Budget | Spent | Threshold | Request ID |
|-----------|-----------|------------|--------|-------|-----------|------------|
{{#budgetEvents}}
| {{timestamp}} | {{tenantId}} | {{eventType}} | ${{budget}} | ${{spent}} | {{threshold}}% | {{requestId}} |
{{/budgetEvents}}

---

## 9. API Health & Reliability

### Provider Reliability

| Provider | Success Rate | Avg Latency | Error Rate | Retry Rate |
|----------|--------------|-------------|------------|------------|
{{#providerHealth}}
| {{provider}} | {{successRate}}% | {{avgLatency}}ms | {{errorRate}}% | {{retryRate}}% |
{{/providerHealth}}

### Error Distribution

{{#errorDistribution}}
- **{{errorType}}**: {{count}} ({{percentage}}%)
{{/errorDistribution}}

---

## 10. Forecast & Trends

### Cost Projection (Next 30 Days)

- **Projected Total Cost**: ${{projectedCost}}
- **Based on Current Trend**: {{trendDirection}} {{trendPercent}}%
- **Budget Risk**: {{budgetRisk}}

### Tenants at Risk of Budget Overrun

{{#atRiskTenants}}
- **{{tenantId}}**: {{riskLevel}} risk - Projected: ${{projected}} / Budget: ${{budget}}
{{/atRiskTenants}}

### Recommended Actions

{{#forecastActions}}
1. {{action}}
{{/forecastActions}}

---

## Appendix A: Methodology

### Cost Calculation

- **Per-Request Cost** = (Input Tokens × Input Price) + (Output Tokens × Output Price)
- **Monthly Budget** = Configured per-tenant limit from model registry
- **Utilization** = (Spent / Budget) × 100

### Latency Measurement

- **p50 (Median)**: 50th percentile latency
- **p95**: 95th percentile latency (SLO threshold)
- **p99**: 99th percentile latency

### SLO Thresholds

- **Cost SLO**: Max cost per request (from registry `guardrails.maxCostPerRequest`)
- **Latency SLO**: p95 latency < 3000ms (default)
- **Compliance**: Request meets both cost and latency SLOs

---

## Appendix B: Configuration

### Global Defaults

```yaml
guardrails:
  maxCostPerRequest: 0.5  # USD
  maxLatencyP95Ms: 3000   # milliseconds
  minSampleSize: 10       # requests

budgetEnforcer:
  warningThresholds: [0.8, 0.9]  # 80%, 90%
  allowOverride: false

autoSwitch:
  cooldownMs: 300000      # 5 minutes
  recoveryMultiplier: 0.8 # 80% of threshold

cacheWarmer:
  ttlSeconds: 86400       # 24 hours
  warmupOnStartup: true

coldStartOptimizer:
  poolMinSize: 2
  poolMaxSize: 10
```

---

**Report End**

*Generated by TEEI CSR Platform - Q2Q AI Service*
*For questions or issues, contact: platform-team@teei.io*
