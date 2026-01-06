# Runbook: Cloud & AI Budget Overrun Response

**Document ID**: RB-GA-004
**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: FinOps Team
**Severity**: HIGH
**Response Time**: < 4 hours for budget alerts

---

## 📋 Overview

This runbook provides procedures for responding to cloud infrastructure and AI/ML cost overruns. It includes automated cost controls, manual intervention steps, and escalation paths to prevent budget breaches while maintaining service availability.

### Cost Budget Overview

| Cost Category | Monthly Budget | Alert Threshold | Hard Limit | Owner |
|--------------|---------------|----------------|-----------|-------|
| **AWS Infrastructure** | $25,000 | 80% ($20,000) | 110% ($27,500) | Platform Engineering |
| **AI/ML (OpenAI/Anthropic)** | $8,000 | 80% ($6,400) | 100% ($8,000) | AI/ML Team |
| **Data Transfer** | $3,000 | 80% ($2,400) | 120% ($3,600) | Platform Engineering |
| **Database (RDS)** | $5,000 | 80% ($4,000) | 110% ($5,500) | Data Engineering |
| **Analytics (ClickHouse)** | $4,000 | 80% ($3,200) | 110% ($4,400) | Analytics Team |
| **Monitoring (Datadog)** | $2,000 | 80% ($1,600) | 100% ($2,000) | SRE Team |
| **TOTAL** | **$47,000** | **$37,600** | **$51,000** | CFO |

---

## 🚨 Alert Levels

### Level 1: Early Warning (70% of budget)

**Actions**: Informational only
- Send Slack notification to #finops-alerts
- Email FinOps team
- Log in cost tracking dashboard

**No immediate action required** - normal monitoring continues.

---

### Level 2: Budget Warning (80% of budget)

**Actions**: Review and optimize
- **Response Time**: < 4 hours during business hours
- PagerDuty alert to FinOps on-call
- Slack notification to #finops-alerts + #engineering
- Email to cost center owners

**Required Actions**:
1. Review current spend trends
2. Identify cost anomalies
3. Create optimization plan
4. Report to CFO (if trending toward overage)

---

### Level 3: Critical Alert (90% of budget)

**Actions**: Immediate intervention
- **Response Time**: < 1 hour (24/7)
- PagerDuty critical alert to FinOps + Platform Lead
- Slack notification to #finops-alerts, #engineering, #leadership
- Email to CFO, CTO, CEO

**Required Actions**:
1. Activate cost reduction measures (see below)
2. Freeze non-essential workloads
3. Implement rate limiting
4. Executive briefing within 2 hours

---

### Level 4: Hard Limit Breach (100%+ of budget)

**Actions**: Emergency shutdown protocols
- **Response Time**: Immediate (automated)
- PagerDuty critical alert to ALL stakeholders
- Automated circuit breakers activated
- Emergency budget meeting (CFO, CTO, CEO)

**Automated Actions**:
1. Suspend AI/ML inference (maintain availability, degraded features)
2. Scale down non-production environments
3. Throttle data transfer (non-critical)
4. Pause scheduled jobs (ETL, reports)

---

## 💰 Cost Monitoring & Detection

### Real-Time Cost Tracking

#### AWS Cost Explorer Queries

```bash
# Get current month spend by service
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-1 \
  --output json > /tmp/aws-cost-$(date +%Y%m%d).json

# Parse and summarize
jq -r '.ResultsByTime[-1].Groups[] | "\(.Keys[0]): $\(.Metrics.UnblendedCost.Amount)"' \
  /tmp/aws-cost-$(date +%Y%m%d).json | sort -t'$' -k2 -rn | head -10
```

**Expected Output**:
```
AmazonRDS: $4234.56
AmazonEC2: $3821.42
AmazonEKS: $2987.21
...
```

#### AI/ML Cost Tracking

**OpenAI API usage**:
```bash
# Query OpenAI usage API
curl -X GET https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d "start_date=$(date -d '1 month ago' +%Y-%m-%d)" \
  -d "end_date=$(date +%Y-%m-%d)" | jq .

# Expected: Daily usage and cost breakdown
```

**Internal token tracking** (from application logs):
```sql
-- Query AI token usage from audit logs
SELECT
  DATE(timestamp) AS usage_date,
  model,
  SUM(prompt_tokens) AS total_prompt_tokens,
  SUM(completion_tokens) AS total_completion_tokens,
  SUM(total_cost_usd) AS daily_cost
FROM ai_usage_logs
WHERE timestamp >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE(timestamp), model
ORDER BY usage_date DESC, daily_cost DESC;
```

**Expected Output**:
```
usage_date   | model         | total_prompt_tokens | total_completion_tokens | daily_cost
2025-11-15   | gpt-4         | 1,234,567          | 456,789                 | 245.67
2025-11-15   | claude-sonnet | 987,654            | 321,098                 | 189.23
```

---

### Automated Budget Alerts

**AWS Budgets Configuration**:
```bash
# Create budget for AI/ML spending
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://ai-ml-budget.json \
  --notifications-with-subscribers file://ai-ml-notifications.json

# ai-ml-budget.json
{
  "BudgetName": "AI-ML-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "8000",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["Project$TEEI-AI-ML"]
  }
}

# ai-ml-notifications.json
{
  "Notification": {
    "NotificationType": "ACTUAL",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 80,
    "ThresholdType": "PERCENTAGE"
  },
  "Subscribers": [
    {
      "SubscriptionType": "EMAIL",
      "Address": "finops@teei.io"
    },
    {
      "SubscriptionType": "SNS",
      "Address": "arn:aws:sns:us-east-1:123456789012:budget-alerts"
    }
  ]
}
```

---

## 🛡️ Cost Reduction Measures

### Phase 1: Immediate Actions (< 1 hour)

**Activate when budget reaches 90%**

#### 1.1 AI/ML Cost Controls

**Implement token rate limiting**:
```typescript
// /services/reporting/src/middleware/ai-rate-limit.ts

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Reduce from 100 req/min to 50 req/min during budget crisis
const aiRateLimiter = new RateLimiterMemory({
  points: process.env.AI_RATE_LIMIT || 50,  // Was 100
  duration: 60,
});

export async function aiRateLimitMiddleware(req, res, next) {
  try {
    await aiRateLimiter.consume(req.tenant_id, 1);
    next();
  } catch {
    res.status(429).json({
      error: 'AI rate limit exceeded - budget conservation mode',
      retry_after: 60,
    });
  }
}
```

**Update environment variable**:
```bash
# Reduce AI rate limits globally
kubectl set env deployment/reporting \
  AI_RATE_LIMIT=50 \
  -n teei-platform

# Restart pods
kubectl rollout restart deployment/reporting -n teei-platform
```

#### 1.2 Disable Non-Essential AI Features

**Feature flag updates**:
```bash
# Disable AI-powered report generation (use template-based instead)
kubectl exec -n teei-platform deployment/platform -- \
  curl -X POST http://localhost:8080/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "ai_report_generation": false,
    "ai_insight_suggestions": false,
    "ai_narrative_enhancement": false
  }'

# Verify feature flags
kubectl exec -n teei-platform deployment/platform -- \
  curl http://localhost:8080/admin/feature-flags | jq .
```

**Expected Impact**: 60-80% reduction in AI costs

#### 1.3 Scale Down Non-Production Environments

```bash
# Scale down staging environment
kubectl scale deployment --all --replicas=1 -n teei-staging

# Stop development environment (completely)
kubectl scale deployment --all --replicas=0 -n teei-dev

# Expected savings: ~$300/day
```

#### 1.4 Optimize Database Queries

**Identify expensive queries**:
```sql
-- Find top 10 most expensive queries (PostgreSQL)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Add query caching**:
```bash
# Enable query result caching in application
kubectl set env deployment/platform \
  QUERY_CACHE_ENABLED=true \
  QUERY_CACHE_TTL=300 \
  -n teei-platform
```

**Expected Impact**: 20-30% reduction in database costs

---

### Phase 2: Tactical Optimizations (< 24 hours)

**Activate when budget reaches 95%**

#### 2.1 Right-Size Infrastructure

**Identify over-provisioned resources**:
```bash
# Get resource utilization
kubectl top nodes
kubectl top pods -A

# Find pods with low CPU/memory usage
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.status.phase == "Running") |
  "\(.metadata.namespace)/\(.metadata.name): CPU=\(.status.containerStatuses[0].resources.requests.cpu // "none") Memory=\(.status.containerStatuses[0].resources.requests.memory // "none")"
'
```

**Reduce resource requests for underutilized pods**:
```yaml
# Example: Reduce reporting service resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reporting
  namespace: teei-platform
spec:
  template:
    spec:
      containers:
      - name: reporting
        resources:
          requests:
            cpu: 250m       # Was 500m
            memory: 512Mi   # Was 1Gi
          limits:
            cpu: 1000m      # Was 2000m
            memory: 1Gi     # Was 2Gi
```

**Apply optimizations**:
```bash
kubectl apply -f deployments/reporting-optimized.yaml
kubectl rollout restart deployment/reporting -n teei-platform
```

**Expected Impact**: 15-25% reduction in EC2/EKS costs

#### 2.2 Implement Aggressive Caching

**Add Redis caching layer**:
```typescript
// /services/platform/src/cache/redis-cache.ts

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  // Aggressive TTL during budget crisis
  keyPrefix: 'cache:',
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export async function cacheMiddleware(req, res, next) {
  const cacheKey = `${req.method}:${req.originalUrl}`;

  // Check cache
  const cachedResponse = await redis.get(cacheKey);
  if (cachedResponse) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return res.json(JSON.parse(cachedResponse));
  }

  // Cache miss - proceed and cache response
  const originalJson = res.json;
  res.json = function(data) {
    redis.setex(cacheKey, 600, JSON.stringify(data));  // 10 min TTL
    originalJson.call(this, data);
  };

  next();
}
```

**Expected Impact**: 30-40% reduction in database queries, 20% reduction in AI calls

#### 2.3 Optimize Data Transfer

**Enable compression**:
```bash
# Enable gzip compression globally
kubectl patch configmap nginx-config -n ingress-nginx \
  --type=json -p='[{"op": "add", "path": "/data/enable-gzip", "value": "true"}]'

# Restart ingress
kubectl rollout restart deployment nginx-ingress-controller -n ingress-nginx
```

**Use CloudFront CDN for static assets**:
```bash
# Configure CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# Point static assets to CloudFront
kubectl set env deployment/platform \
  STATIC_ASSETS_CDN=https://d1234567890.cloudfront.net \
  -n teei-platform
```

**Expected Impact**: 40-60% reduction in data transfer costs

---

### Phase 3: Strategic Changes (< 1 week)

**Activate when sustained overspend is projected**

#### 3.1 Negotiate Reserved Instances / Savings Plans

```bash
# Analyze EC2 usage patterns
aws ce get-reservation-purchase-recommendation \
  --service EC2 \
  --lookback-period-in-days 60 \
  --payment-option PARTIAL_UPFRONT \
  --term-in-years 1

# Purchase Savings Plan (requires approval)
aws savingsplans create-savings-plan \
  --savings-plan-type ComputeSavingsPlan \
  --commitment 1000 \
  --upfront-payment-amount 500 \
  --recurring-payment-amount 50 \
  --savings-plan-offering-id <offering-id>
```

**Expected Impact**: 30-50% reduction in EC2/RDS costs (long-term)

#### 3.2 Migrate to More Cost-Effective Regions

**Evaluate region pricing**:
```bash
# Compare pricing across regions
aws pricing get-products \
  --service-code AmazonEC2 \
  --filters Type=TERM_MATCH,Field=instanceType,Value=t3.large \
  --region us-east-1

# Compare with us-east-2, eu-central-1, etc.
```

**Plan migration** (if significant savings):
- Requires: Data residency compliance review, latency analysis
- Expected savings: 10-20% (depending on workload)

#### 3.3 Implement Spot Instances for Non-Critical Workloads

```yaml
# Example: Use spot instances for analytics batch jobs
apiVersion: batch/v1
kind: Job
metadata:
  name: analytics-batch
  namespace: teei-analytics
spec:
  template:
    spec:
      nodeSelector:
        eks.amazonaws.com/capacityType: SPOT
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      containers:
      - name: analytics
        image: teei/analytics:latest
        # Job must be idempotent (can handle interruptions)
```

**Expected Impact**: 60-90% reduction for batch workload costs

---

## 📊 Budget Overrun Analysis

### Root Cause Investigation

**When alert is triggered, investigate**:

#### 1. Identify Cost Spikes

```bash
# Get daily cost breakdown for current month
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output json | jq '.ResultsByTime[] | {date: .TimePeriod.Start, total: .Total.UnblendedCost.Amount}'

# Look for anomalies (day-over-day increases > 50%)
```

#### 2. Service-Level Attribution

```sql
-- AI/ML cost attribution by tenant
SELECT
  tenant_id,
  tenant_name,
  COUNT(*) AS ai_requests,
  SUM(prompt_tokens + completion_tokens) AS total_tokens,
  SUM(total_cost_usd) AS total_cost,
  AVG(total_cost_usd) AS avg_cost_per_request
FROM ai_usage_logs
WHERE timestamp >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY tenant_id, tenant_name
ORDER BY total_cost DESC
LIMIT 20;
```

**Identify "whale" tenants** consuming disproportionate resources:
- If 1 tenant accounts for > 30% of AI costs → Review tenant plan/limits
- If 1 tenant has > 10x average usage → Investigate for abuse/misconfiguration

#### 3. Infrastructure Waste

**Identify idle resources**:
```bash
# Find EC2 instances with < 5% CPU utilization (over 7 days)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxxxx \
  --start-time $(date -d '7 days ago' -Iseconds) \
  --end-time $(date -Iseconds) \
  --period 86400 \
  --statistics Average \
  --query 'Datapoints[*].Average' \
  --output text | awk '{sum+=$1} END {print sum/NR}'

# If average < 5%, consider terminating or resizing
```

**Find unused EBS volumes**:
```bash
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,VolumeType]' \
  --output table

# Delete unused volumes
aws ec2 delete-volume --volume-id vol-xxxxx
```

---

## 🔄 Budget Recovery Plan

**After overrun is contained**:

### Week 1: Immediate Stabilization
- [ ] Cost controls activated
- [ ] AI rate limits reduced
- [ ] Non-prod environments scaled down
- [ ] Daily cost reviews with FinOps team

### Week 2: Root Cause Remediation
- [ ] Address cost spike drivers
- [ ] Optimize top 10 cost contributors
- [ ] Implement additional caching
- [ ] Review tenant pricing/limits

### Week 3: Long-Term Optimization
- [ ] Reserved instance/Savings Plan purchases
- [ ] Architecture optimizations
- [ ] Cost forecasting improvements
- [ ] Automated cost anomaly detection

### Week 4: Preventive Measures
- [ ] Update budget thresholds
- [ ] Improve cost visibility dashboards
- [ ] Tenant cost attribution
- [ ] Quarterly cost review cadence

---

## 📈 Cost Optimization Dashboard

**Grafana panels to monitor**:

1. **Monthly Burn Rate**:
   ```promql
   sum(rate(aws_cost_total_usd[1d])) * 30
   ```

2. **Budget Utilization**:
   ```promql
   (sum(aws_cost_month_to_date) / 47000) * 100
   ```

3. **AI Token Usage**:
   ```promql
   sum(rate(ai_tokens_total[1h])) * 3600
   ```

4. **Cost per Tenant**:
   ```sql
   SELECT tenant_id, SUM(cost_usd) FROM cost_attribution GROUP BY tenant_id
   ```

5. **Projected Month-End Cost**:
   ```
   (Current Month-to-Date Cost / Days Elapsed) * Days in Month
   ```

---

## 📞 Escalation Matrix

| Budget Threshold | Notification | Response Time | Approver for Overrun |
|-----------------|--------------|---------------|---------------------|
| **70%** | FinOps team | 4 hours | N/A (informational) |
| **80%** | FinOps + Engineering Leads | 4 hours | CFO (if trending up) |
| **90%** | CFO, CTO | 1 hour | CFO |
| **100%** | CEO, CFO, CTO, Board | Immediate | Board of Directors |

---

## ✅ Post-Incident Review

**Within 7 days of budget alert**:

- [ ] Root cause analysis documented
- [ ] Cost optimization opportunities identified
- [ ] Process improvements implemented
- [ ] Budget forecast updated
- [ ] Stakeholder communication completed
- [ ] Lessons learned shared with team

---

## 📚 Related Documentation

- [FinOps Strategy](/docs/FinOps_Strategy.md)
- [Cost Monitoring Dashboards](/docs/SRE_Dashboards.md)
- [Error Budget Policy](/docs/Error_Budget_Policy.md)
- [AI Cost Controls](/reports/ai_costs_controls.md)

---

**Document History**:
- **v1.0.0** (2025-11-15): Initial budget response runbook
