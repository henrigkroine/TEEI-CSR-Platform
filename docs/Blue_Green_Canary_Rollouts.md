# Blue/Green and Canary Rollouts with Argo Rollouts

**Version:** 1.0
**Last Updated:** 2025-11-15
**Owner:** Platform Engineering Team

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Deployment Strategies](#deployment-strategies)
- [Blue/Green Deployments](#bluegreen-deployments)
- [Canary Deployments](#canary-deployments)
- [Analysis Templates](#analysis-templates)
- [Regional Coordination](#regional-coordination)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This platform uses **Argo Rollouts** to enable progressive delivery strategies (blue/green and canary deployments) with automated analysis and instant rollback capabilities. This ensures zero-downtime deployments with minimal risk.

### Key Features

- **Blue/Green Deployments**: Instant cutover with preview environments
- **Canary Deployments**: Progressive traffic shifting (0% → 10% → 25% → 50% → 100%)
- **Automated Analysis**: Prometheus-based health checks during rollout
- **Instant Rollback**: <30 second rollback time on failures
- **Multi-Region Support**: Coordinated rollouts across US and EU regions
- **GDPR Compliance**: Zero-tolerance validation for data residency

### When to Use Each Strategy

| Strategy | Use Case | Examples |
|----------|----------|----------|
| **Blue/Green** | Critical services requiring instant rollback | API Gateway, Frontend |
| **Canary** | Services with variable behavior (AI/ML) | Q2Q AI, Analytics |
| **Blue/Green + Manual** | Compliance-critical services | Reporting (GenAI), Data Residency |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Argo Rollouts Controller                  │
│  - Manages Rollout CRDs                                     │
│  - Orchestrates traffic shifting                            │
│  - Triggers analysis runs                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├──────────────────┬─────────────────┐
                          ▼                  ▼                 ▼
              ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
              │  Blue/Green    │  │    Canary      │  │   Analysis     │
              │   Rollouts     │  │   Rollouts     │  │   Templates    │
              └────────────────┘  └────────────────┘  └────────────────┘
                     │                   │                     │
                     ├───────────────────┴─────────────────────┤
                     │            Prometheus Metrics            │
                     └──────────────────────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
            ┌─────────────────┐             ┌─────────────────┐
            │  Active Service │             │ Preview/Canary  │
            │     (Blue)      │             │    Service      │
            │   100% Traffic  │             │   0-100% Traffic│
            └─────────────────┘             └─────────────────┘
```

## Installation

### 1. Install Argo Rollouts

```bash
# Create namespace
kubectl create namespace argo-rollouts

# Install Argo Rollouts controller
kubectl apply -n argo-rollouts -f /home/user/TEEI-CSR-Platform/k8s/base/argo-rollouts/install.yaml

# Install CRDs (if not already installed)
kubectl apply -f https://github.com/argoproj/argo-rollouts/releases/download/v1.6.0/install.yaml

# Verify installation
kubectl -n argo-rollouts get pods
kubectl -n argo-rollouts get crd | grep argoproj
```

### 2. Install kubectl Plugin (Optional)

```bash
# macOS (Homebrew)
brew install argoproj/tap/kubectl-argo-rollouts

# Linux
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Verify
kubectl argo rollouts version
```

### 3. Deploy Dashboard (Optional)

```bash
# Deploy Argo Rollouts dashboard
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/base/argo-rollouts/dashboard.yaml

# Port-forward to access dashboard
kubectl port-forward -n argo-rollouts svc/argo-rollouts-dashboard 3100:3100

# Open browser: http://localhost:3100
```

## Deployment Strategies

### Strategy Decision Matrix

```
                      ┌─────────────────────────────────────────┐
                      │   Is this a critical service?           │
                      └─────────────────┬───────────────────────┘
                                        │
                ┌───────────────────────┴────────────────────────┐
                │ YES                                            │ NO
                ▼                                                ▼
   ┌──────────────────────────┐                   ┌──────────────────────────┐
   │ Does it have variable    │                   │   Use Canary             │
   │ behavior (AI/ML)?        │                   │   (Progressive rollout)  │
   └────────┬─────────────────┘                   └──────────────────────────┘
            │
    ┌───────┴────────┐
    │ YES            │ NO
    ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Blue/Green   │  │ Blue/Green   │
│ + Manual     │  │ + Auto       │
│ Approval     │  │ Promotion    │
└──────────────┘  └──────────────┘
```

## Blue/Green Deployments

Blue/Green deployments maintain two identical environments (blue = active, green = preview) and instantly switch traffic between them.

### Example: API Gateway (Auto-Promotion)

```yaml
# File: k8s/rollouts/blue-green/api-gateway-rollout.yaml

strategy:
  blueGreen:
    activeService: teei-api-gateway          # Production traffic
    previewService: teei-api-gateway-preview # Testing only

    autoPromotionEnabled: false  # Manual approval for production
    autoPromotionSeconds: 600    # Auto-promote after 10 min if enabled

    scaleDownDelaySeconds: 300   # Keep old version for 5 min
    scaleDownDelayRevisionLimit: 2

    prePromotionAnalysis:
      templates:
      - templateName: api-gateway-smoke-test
      - templateName: success-rate-analysis
      args:
      - name: service-name
        value: teei-api-gateway-preview
      - name: error-threshold
        value: "1"  # <1% errors
```

### Deploying with Blue/Green

```bash
# 1. Deploy new version (creates green environment)
kubectl argo rollouts set image teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:v1.2.3

# 2. Monitor rollout status
kubectl argo rollouts status teei-api-gateway --watch

# 3. Check preview service (green)
kubectl port-forward svc/teei-api-gateway-preview 8080:3000
curl http://localhost:8080/health

# 4. Run analysis (automatic)
kubectl argo rollouts get rollout teei-api-gateway

# 5. Promote to production (manual)
kubectl argo rollouts promote teei-api-gateway

# 6. Verify active service
curl https://api.teei-csr.com/health
```

### Blue/Green Rollback

```bash
# Abort and revert to blue (instant)
kubectl argo rollouts abort teei-api-gateway
kubectl argo rollouts undo teei-api-gateway

# Or use emergency rollback script
/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  -c prod-us-west \
  teei-api-gateway \
  "High error rate detected"
```

## Canary Deployments

Canary deployments gradually shift traffic from stable to new version with automated validation at each step.

### Example: Q2Q AI Service

```yaml
# File: k8s/rollouts/canary/q2q-ai-rollout.yaml

strategy:
  canary:
    canaryService: teei-q2q-ai-canary
    stableService: teei-q2q-ai

    steps:
    # Step 1: 10% traffic to canary
    - setWeight: 10
    - pause:
        duration: 5m
    - analysis:
        templates:
        - templateName: success-rate-analysis
        - templateName: latency-analysis
        - templateName: q2q-ai-quality-analysis

    # Step 2: 25% traffic
    - setWeight: 25
    - pause:
        duration: 5m
    - analysis:
        templates:
        - templateName: success-rate-analysis

    # Step 3: 50% traffic
    - setWeight: 50
    - pause:
        duration: 10m
    - analysis:
        templates:
        - templateName: success-rate-analysis

    # Step 4: 100% traffic (full promotion)
    - setWeight: 100
```

### Deploying with Canary

```bash
# 1. Deploy new version
kubectl argo rollouts set image teei-q2q-ai \
  q2q-ai=ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0

# 2. Monitor canary progression
kubectl argo rollouts get rollout teei-q2q-ai --watch

# Example output:
# Name:            teei-q2q-ai
# Status:          ॥ Paused
# Strategy:        Canary
#   Step:          2/4
#   SetWeight:     25
#   ActualWeight:  25
# Images:          ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0 (canary)
#                  ghcr.io/henrigkroine/teei-q2q-ai:v1.4.0 (stable)
# Replicas:
#   Desired:       4
#   Current:       4
#   Updated:       1
#   Ready:         4
#   Available:     4

# 3. Check analysis results
kubectl get analysisrun -l rollout=teei-q2q-ai

# 4. Manual promotion (if paused)
kubectl argo rollouts promote teei-q2q-ai

# 5. Skip to end (emergency promotion)
kubectl argo rollouts promote teei-q2q-ai --full
```

### Canary Rollback

```bash
# Abort canary and revert to stable
kubectl argo rollouts abort teei-q2q-ai

# Analysis will automatically rollback on failure
# Check analysis results:
kubectl describe analysisrun <analysis-run-name>
```

## Analysis Templates

Analysis templates define automated validation criteria. Rollouts automatically rollback if analysis fails.

### Available Templates

| Template | Purpose | Used By | Threshold |
|----------|---------|---------|-----------|
| `success-rate-analysis` | HTTP success rate | All rollouts | <1% errors |
| `latency-analysis` | Request latency (p95) | All rollouts | <500ms |
| `genai-token-analysis` | GenAI token consumption | Reporting, Q2Q AI | <20% increase |
| `gdpr-compliance-analysis` | Data residency violations | Data Residency | ZERO violations |
| `q2q-ai-quality-analysis` | AI quality score | Q2Q AI | >70% quality |
| `clickhouse-query-analysis` | ClickHouse query performance | Analytics | <2s queries |

### Creating Custom Analysis Templates

```yaml
# File: k8s/rollouts/analysis/custom-analysis.yaml

apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: custom-analysis
spec:
  args:
  - name: service-name
  - name: threshold
    value: "100"

  metrics:
  - name: custom-metric
    interval: 30s
    successCondition: result < {{args.threshold}}
    failureLimit: 3
    count: 10
    provider:
      prometheus:
        address: http://prometheus-server.monitoring.svc.cluster.local:9090
        query: |
          # Your Prometheus query here
          avg(custom_metric{service="{{args.service-name}}"})
```

### Analysis Failure Behavior

```
Analysis Run → Metric Check (every 30s)
                    │
        ┌───────────┴───────────┐
        │ SUCCESS               │ FAILURE
        ▼                       ▼
  Continue Rollout    ─────→  Increment Failure Count
                                    │
                        ┌───────────┴───────────┐
                        │ < failureLimit        │ >= failureLimit
                        ▼                       ▼
                  Continue Checks       ABORT ROLLOUT
                                       (Auto-Rollback)
```

## Regional Coordination

Deploy services across multiple regions with coordinated rollouts and validation.

### Regional Rollout Order

```
Strategy 1 (Low Risk First):
EU West → EU Central → US East → US West

Strategy 2 (High Traffic First):
US West → US East → EU West → EU Central
```

### Multi-Region Deployment

```bash
# File: scripts/infra/coordinated-rollout.sh

# Deploy to all regions (default order)
/home/user/TEEI-CSR-Platform/scripts/infra/coordinated-rollout.sh \
  teei-api-gateway \
  ghcr.io/henrigkroine/teei-api-gateway:v1.2.3

# Custom rollout order
/home/user/TEEI-CSR-Platform/scripts/infra/coordinated-rollout.sh \
  -o us-west:prod-us-west,eu-west:prod-eu-west \
  teei-reporting \
  ghcr.io/henrigkroine/teei-reporting:v2.0.0

# With Slack notifications
/home/user/TEEI-CSR-Platform/scripts/infra/coordinated-rollout.sh \
  -w https://hooks.slack.com/services/XXX \
  -a 600 \
  teei-q2q-ai \
  ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0
```

### Script Parameters

```
-n, --namespace NAMESPACE      Kubernetes namespace (default: default)
-o, --order REGION_ORDER       Rollout order (default: us-west,us-east,eu-west,eu-central)
                               Format: region1:context1,region2:context2
-w, --webhook URL              Notification webhook URL (Slack/Discord)
-t, --timeout SECONDS          Rollout timeout per region (default: 1800)
-a, --analysis-wait SECONDS    Wait time between regions (default: 300)
```

## Rollback Procedures

### Automatic Rollback

Rollouts automatically rollback when:
- Analysis fails (exceeds `failureLimit`)
- Pod health checks fail
- Replica creation fails

### Manual Rollback

```bash
# 1. Abort current rollout
kubectl argo rollouts abort <rollout-name>

# 2. Revert to previous version
kubectl argo rollouts undo <rollout-name>

# 3. Verify rollback
kubectl argo rollouts status <rollout-name> --watch
```

### Emergency Multi-Region Rollback

```bash
# File: scripts/infra/emergency-rollback.sh

# Rollback single region
/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  -c prod-us-west \
  teei-api-gateway \
  "High error rate detected"

# Rollback all regions
/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  teei-q2q-ai \
  "Model inference errors"

# With notifications and custom data directory
/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  -w https://hooks.slack.com/services/XXX \
  -d /var/rollback-data \
  teei-reporting \
  "GDPR violation detected"
```

### Rollback Data Capture

Emergency rollback captures:
- Rollout manifests
- Analysis run results
- ReplicaSet states
- Pod logs (current + previous)
- Prometheus metrics snapshot
- Kubernetes events

Data stored in: `/tmp/rollback-data/<rollout-name>_<timestamp>/`

## Monitoring

### Grafana Dashboard

Access the Rollouts dashboard:
```bash
# Import dashboard
kubectl apply -f /home/user/TEEI-CSR-Platform/observability/grafana/dashboards/rollouts.json

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
# Open: http://localhost:3000/d/rollouts
```

### Dashboard Panels

1. **Rollout Status Overview**: Current status of all rollouts
2. **Active Rollouts by Phase**: In-progress rollouts (Progressing, Paused, Degraded)
3. **Canary Traffic Split**: Real-time canary vs stable traffic percentage
4. **Analysis Run Status**: Pass/fail status of analysis runs
5. **Rollout Error Rate**: HTTP error rates during deployment
6. **Rollout Latency (p95)**: Latency during deployment
7. **Blue/Green Traffic**: Active vs preview traffic distribution
8. **Regional Coordination**: Status across all regions
9. **GenAI Token Consumption**: Token usage during AI rollouts
10. **GDPR Compliance**: Zero-tolerance violation monitoring

### Alerts

Critical alerts configured:
- **High Error Rate During Rollout** (>2% for 2 min)
- **High Latency During Rollout** (p95 >1000ms for 3 min)
- **GDPR Violation** (instant alert on ANY violation)
- **Analysis Failure** (instant alert on rollback)
- **Rollout Stuck** (no progress for 10 min)

### CLI Monitoring

```bash
# Watch rollout progress
kubectl argo rollouts get rollout <name> --watch

# List all rollouts
kubectl argo rollouts list

# Get analysis results
kubectl get analysisrun -l rollout=<name>

# Describe analysis run
kubectl describe analysisrun <analysis-run-name>

# Get rollout events
kubectl get events --field-selector involvedObject.name=<rollout-name>
```

## Troubleshooting

### Common Issues

#### 1. Rollout Stuck in Progressing

**Symptoms:**
```bash
$ kubectl argo rollouts get rollout teei-api-gateway
Status: ॥ Progressing (for 15 minutes)
```

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -l app=teei-api-gateway

# Check analysis runs
kubectl get analysisrun -l rollout=teei-api-gateway

# Check events
kubectl get events --field-selector involvedObject.name=teei-api-gateway
```

**Solutions:**
- Manual promotion: `kubectl argo rollouts promote <name>`
- Abort: `kubectl argo rollouts abort <name>`
- Check analysis template queries (Prometheus connectivity)

#### 2. Analysis Failing Unexpectedly

**Symptoms:**
```bash
$ kubectl get analysisrun
NAME                    STATUS   AGE
teei-q2q-ai-12345-1     Failed   2m
```

**Diagnosis:**
```bash
# Describe analysis run
kubectl describe analysisrun teei-q2q-ai-12345-1

# Check metric results
kubectl get analysisrun teei-q2q-ai-12345-1 -o yaml | grep -A 10 "measurements:"
```

**Solutions:**
- Verify Prometheus is reachable
- Check metric exists: `curl http://prometheus:9090/api/v1/query?query=<metric>`
- Adjust thresholds in analysis template
- Increase `failureLimit` if transient

#### 3. Blue/Green Not Switching Traffic

**Symptoms:**
- Preview service healthy but active service unchanged

**Diagnosis:**
```bash
# Check rollout status
kubectl argo rollouts get rollout <name>

# Check service selectors
kubectl get svc <active-service> -o yaml
kubectl get svc <preview-service> -o yaml
```

**Solutions:**
- Manual promotion: `kubectl argo rollouts promote <name>`
- Check `autoPromotionEnabled` setting
- Verify analysis completed successfully

#### 4. Canary Traffic Not Splitting

**Symptoms:**
- All traffic going to stable (no canary traffic)

**Diagnosis:**
```bash
# Check ingress/service mesh configuration
kubectl get ingress <ingress-name> -o yaml

# Check canary weight
kubectl argo rollouts get rollout <name>
```

**Solutions:**
- Verify NGINX Ingress Controller supports canary annotations
- Check `trafficRouting` configuration in rollout
- Ensure canary service exists

### Debug Commands

```bash
# Enable verbose logging
kubectl argo rollouts get rollout <name> -o yaml

# Check controller logs
kubectl logs -n argo-rollouts deployment/argo-rollouts -f

# Restart controller (if needed)
kubectl rollout restart -n argo-rollouts deployment/argo-rollouts

# Force analysis run
kubectl argo rollouts promote <name>
```

## Best Practices

### 1. Deployment Strategy Selection

```
Service Type              Recommended Strategy    Auto-Promotion
────────────────────────  ─────────────────────  ──────────────
API Gateway               Blue/Green              No (manual)
Frontend (Astro)          Blue/Green              Yes (with tests)
AI/ML Services            Canary (progressive)    Yes (with analysis)
Data Services             Blue/Green              No (manual)
GDPR-Critical Services    Canary (conservative)   No (manual)
Analytics Services        Canary                  Yes (with analysis)
```

### 2. Analysis Configuration

- **failureLimit**: Set to 2-3 for transient failures tolerance
- **count**: Set to 10+ for statistical significance
- **interval**: 30s for real-time detection, 60s for cost optimization
- **successCondition**: Use PromQL for complex conditions

### 3. Traffic Shifting

**Blue/Green:**
- Use for instant cutover requirements
- Enable `autoPromotionEnabled` only with robust tests
- Set `scaleDownDelaySeconds` to preserve rollback window

**Canary:**
- Start with small percentages (5-10%)
- Increase `pause.duration` for critical steps (50%+)
- Use analysis at EVERY step for safety

### 4. Regional Rollouts

- Deploy to low-traffic regions first (EU → US)
- Wait 5-10 minutes between regions for analysis
- Use Slack/Discord webhooks for coordination
- Always have emergency rollback plan

### 5. GDPR Compliance

For services handling GDPR-sensitive data:
- Use **zero-tolerance** analysis templates
- Set `failureLimit: 0` for violations
- Enable instant rollback on ANY violation
- Capture audit logs before rollback

### 6. GenAI Services

For LLM-based services:
- Monitor token consumption (cost tracking)
- Set token budget thresholds (e.g., +20% max)
- Use quality scores in analysis
- Test with production-like prompts

### 7. Rollback Preparedness

- Test rollback procedures regularly
- Document rollback reasons in Git
- Preserve failed deployments for post-mortem
- Automate data capture (logs, metrics, events)

### 8. Monitoring and Alerts

- Use Grafana dashboard for real-time monitoring
- Configure critical alerts (error rate, GDPR, latency)
- Set up PagerDuty/OpsGenie for emergencies
- Review analysis results weekly

## Examples

### Example 1: Deploy API Gateway (Blue/Green)

```bash
# 1. Apply rollout manifest
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/rollouts/blue-green/api-gateway-rollout.yaml

# 2. Deploy new version
kubectl argo rollouts set image teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:v1.2.3

# 3. Monitor
kubectl argo rollouts get rollout teei-api-gateway --watch

# 4. Test preview
kubectl port-forward svc/teei-api-gateway-preview 8080:3000
curl http://localhost:8080/health

# 5. Promote
kubectl argo rollouts promote teei-api-gateway

# 6. Verify
kubectl argo rollouts status teei-api-gateway
```

### Example 2: Deploy Q2Q AI (Canary)

```bash
# 1. Apply rollout manifest
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/rollouts/canary/q2q-ai-rollout.yaml

# 2. Deploy new version
kubectl argo rollouts set image teei-q2q-ai \
  q2q-ai=ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0

# 3. Monitor canary progression
kubectl argo rollouts get rollout teei-q2q-ai --watch

# 4. Check analysis at each step
kubectl get analysisrun -l rollout=teei-q2q-ai -w

# 5. Manual promotion (if paused)
kubectl argo rollouts promote teei-q2q-ai

# 6. Verify completion
kubectl argo rollouts status teei-q2q-ai
```

### Example 3: Multi-Region Coordinated Rollout

```bash
# Deploy Reporting service to all regions
/home/user/TEEI-CSR-Platform/scripts/infra/coordinated-rollout.sh \
  -o eu-west:prod-eu-west,us-west:prod-us-west \
  -w https://hooks.slack.com/services/YOUR_WEBHOOK \
  -a 600 \
  teei-reporting \
  ghcr.io/henrigkroine/teei-reporting:v2.0.0

# Monitor from Grafana dashboard
# Open: http://grafana/d/rollouts
```

### Example 4: Emergency Rollback

```bash
# Detect issue (high error rate)
# Execute emergency rollback

/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  -w https://hooks.slack.com/services/YOUR_WEBHOOK \
  teei-api-gateway \
  "High error rate: 5xx errors >10%"

# Check captured data
ls -la /tmp/rollback-data/teei-api-gateway_*/

# Review logs
cat /tmp/rollback-data/teei-api-gateway_*/logs/*.log
```

## References

- [Argo Rollouts Documentation](https://argoproj.github.io/argo-rollouts/)
- [Progressive Delivery Guide](https://argoproj.github.io/argo-rollouts/concepts/)
- [Analysis Templates](https://argoproj.github.io/argo-rollouts/features/analysis/)
- [Traffic Management](https://argoproj.github.io/argo-rollouts/features/traffic-management/)
- [Prometheus Metrics](https://argoproj.github.io/argo-rollouts/features/controller-metrics/)

---

**Next Steps:**
1. Install Argo Rollouts: [Installation](#installation)
2. Review deployment strategies: [Deployment Strategies](#deployment-strategies)
3. Deploy your first rollout: [Examples](#examples)
4. Set up monitoring: [Monitoring](#monitoring)
5. Test rollback procedures: [Rollback Procedures](#rollback-procedures)
