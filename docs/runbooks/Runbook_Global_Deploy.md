# Runbook: Global Multi-Region Deployment

**Document ID**: RB-GA-001
**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: Platform Engineering Team
**Severity**: CRITICAL
**Estimated Duration**: 4-6 hours

---

## 📋 Overview

This runbook provides step-by-step procedures for deploying the TEEI CSR Platform across multiple geographic regions in a coordinated, safe, and reversible manner.

### Deployment Regions

| Region | AWS Region | Purpose | Data Residency |
|--------|-----------|---------|----------------|
| **US-EAST-1** | us-east-1 | Primary Americas | US/Canada |
| **EU-CENTRAL-1** | eu-central-1 | Primary EMEA | EU/UK/EFTA |
| **AP-SOUTHEAST-1** (Future) | ap-southeast-1 | Primary APAC | Singapore/APAC |

### Deployment Strategy

- **Blue/Green Deployment**: Zero-downtime releases
- **Canary Rollout**: 10% → 25% → 50% → 100% traffic progression
- **Region Order**: US-EAST-1 (lead) → EU-CENTRAL-1 (follower) → additional regions
- **Rollback Time**: < 5 minutes per region

---

## 🎯 Prerequisites

### 1. Pre-Deployment Verification

**Checklist** (All items must be ✅):

- [ ] All CI/CD pipelines passed (unit, integration, E2E tests)
- [ ] Security scans completed (Trivy, SAST, container scanning)
- [ ] Database migrations tested in staging environment
- [ ] Blue/Green environments provisioned in all target regions
- [ ] DNS health checks configured for all regions
- [ ] Secrets rotated and synced across regions (SOPS/Vault)
- [ ] Feature flags configured (all new features OFF by default)
- [ ] Rollback plan reviewed and approved
- [ ] Incident response team on standby
- [ ] Communication plan prepared (status page, stakeholder notifications)

### 2. Required Access & Tools

**Access Required**:
- AWS Console access (IAM role: `DeploymentEngineer`)
- Kubernetes cluster admin (`kubectl` context for all regions)
- ArgoCD UI/CLI access
- Datadog/Prometheus monitoring dashboards
- PagerDuty incident management
- Slack: `#platform-deployments`, `#incidents`

**Tools Required**:
```bash
# Verify tool versions
kubectl version --client  # ≥ 1.28
argocd version           # ≥ 2.9
aws --version            # ≥ 2.13
helm version             # ≥ 3.12
k9s version              # Optional but recommended
```

### 3. Deployment Artifacts

**Docker Images** (must be scanned and signed):
```
us-east-1:
  - 123456789012.dkr.ecr.us-east-1.amazonaws.com/teei-csr-platform:{VERSION}
  - 123456789012.dkr.ecr.us-east-1.amazonaws.com/teei-reporting:{VERSION}
  - 123456789012.dkr.ecr.us-east-1.amazonaws.com/teei-analytics:{VERSION}

eu-central-1:
  - 123456789012.dkr.ecr.eu-central-1.amazonaws.com/teei-csr-platform:{VERSION}
  - 123456789012.dkr.ecr.eu-central-1.amazonaws.com/teei-reporting:{VERSION}
  - 123456789012.dkr.ecr.eu-central-1.amazonaws.com/teei-analytics:{VERSION}
```

**Helm Charts**:
- `teei-platform-{VERSION}.tgz` (stored in S3/ChartMuseum)
- `teei-monitoring-{VERSION}.tgz`
- `teei-ingress-{VERSION}.tgz`

---

## 🚀 Deployment Procedure

### Phase 1: Pre-Flight Checks (30 minutes)

#### 1.1 Verify Regional Infrastructure

**US-EAST-1**:
```bash
# Set context
export AWS_REGION=us-east-1
export CLUSTER_NAME=teei-prod-us-east-1
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Verify cluster health
kubectl get nodes
# Expected: All nodes in Ready state

kubectl get pods -n kube-system
# Expected: All system pods Running

# Check resource capacity
kubectl top nodes
# Expected: CPU < 70%, Memory < 80%
```

**EU-CENTRAL-1**:
```bash
# Set context
export AWS_REGION=eu-central-1
export CLUSTER_NAME=teei-prod-eu-central-1
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Verify cluster health
kubectl get nodes
kubectl get pods -n kube-system
kubectl top nodes
```

#### 1.2 Database Replication Status

```bash
# Check Postgres replication lag (must be < 5 seconds)
kubectl exec -n database postgresql-primary-0 -- \
  psql -U postgres -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;"

# Expected output:
# lag_seconds | < 5.0

# Check ClickHouse replication
kubectl exec -n analytics clickhouse-0 -- \
  clickhouse-client --query "SELECT database, table, is_leader, absolute_delay FROM system.replicas WHERE absolute_delay > 10;"

# Expected output: (empty - no delays > 10s)
```

#### 1.3 NATS JetStream Health

```bash
# Check stream replication
kubectl exec -n messaging nats-0 -- \
  nats stream ls

# Verify consumer lag
kubectl exec -n messaging nats-0 -- \
  nats consumer report

# Expected: All consumers lag < 1000 messages
```

#### 1.4 Monitoring Baseline

**Capture pre-deployment metrics**:
```bash
# CPU/Memory baseline
kubectl top pods -n teei-platform

# Request rates (from Prometheus)
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total[5m])' | jq .

# Error rates
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq .

# Record baseline values in deployment log
```

---

### Phase 2: Blue Environment Preparation (45 minutes)

#### 2.1 Deploy to Blue Environment (US-EAST-1)

```bash
# Switch context to us-east-1
kubectx teei-prod-us-east-1

# Create blue namespace if not exists
kubectl create namespace teei-platform-blue --dry-run=client -o yaml | kubectl apply -f -

# Deploy via ArgoCD
argocd app create teei-platform-blue \
  --repo https://github.com/yourorg/teei-helm-charts \
  --path charts/teei-platform \
  --dest-namespace teei-platform-blue \
  --dest-server https://kubernetes.default.svc \
  --helm-set-string image.tag=${VERSION} \
  --helm-set-string environment=production \
  --helm-set-string region=us-east-1 \
  --sync-policy none

# Initiate sync
argocd app sync teei-platform-blue --prune

# Monitor deployment
argocd app wait teei-platform-blue --health --timeout 600
```

**Expected Output**:
```
TIMESTAMP            GROUP        KIND   NAMESPACE              NAME    STATUS    HEALTH        HOOK  MESSAGE
2025-11-15T10:00:00Z            Service  teei-platform-blue  platform  Synced  Healthy              service/platform created
2025-11-15T10:00:15Z apps  Deployment  teei-platform-blue  platform  Synced  Healthy              deployment.apps/platform created
```

#### 2.2 Smoke Tests (Blue Environment)

```bash
# Get blue service endpoint (internal)
BLUE_ENDPOINT=$(kubectl get svc -n teei-platform-blue platform -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Health check
curl -f http://$BLUE_ENDPOINT/health
# Expected: {"status":"healthy","version":"${VERSION}","region":"us-east-1"}

# Database connectivity
curl -f http://$BLUE_ENDPOINT/health/db
# Expected: {"status":"connected","latency_ms":5}

# NATS connectivity
curl -f http://$BLUE_ENDPOINT/health/messaging
# Expected: {"status":"connected","cluster":"nats-prod"}

# ClickHouse connectivity
curl -f http://$BLUE_ENDPOINT/health/analytics
# Expected: {"status":"connected"}
```

#### 2.3 Integration Tests (Blue)

```bash
# Run E2E test suite against blue
kubectl run e2e-tests-blue \
  --image=teei/e2e-tests:${VERSION} \
  --namespace=teei-platform-blue \
  --env="TARGET_URL=http://$BLUE_ENDPOINT" \
  --env="TEST_SUITE=smoke" \
  --restart=Never \
  --attach=true

# Wait for completion
kubectl wait --for=condition=complete --timeout=300s job/e2e-tests-blue -n teei-platform-blue

# Check results
kubectl logs job/e2e-tests-blue -n teei-platform-blue | tail -20
# Expected: All tests passed (100% success rate)
```

---

### Phase 3: Canary Traffic Routing (90 minutes)

#### 3.1 Configure Canary (10% Traffic to Blue)

```bash
# Update Istio VirtualService for canary routing
cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: platform-canary
  namespace: teei-platform
spec:
  hosts:
  - platform.teei.io
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: platform.teei-platform-blue.svc.cluster.local
        port:
          number: 80
  - route:
    - destination:
        host: platform.teei-platform-green.svc.cluster.local
        port:
          number: 80
      weight: 90
    - destination:
        host: platform.teei-platform-blue.svc.cluster.local
        port:
          number: 80
      weight: 10
EOF
```

#### 3.2 Monitor Canary Metrics (15 minutes)

**Watch for anomalies**:
```bash
# Error rate comparison (Prometheus query)
# Blue error rate should be ≤ Green error rate
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5..",namespace="teei-platform-blue"}[5m])' | jq .
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5..",namespace="teei-platform-green"}[5m])' | jq .

# Latency comparison (p95)
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{namespace="teei-platform-blue"}[5m]))' | jq .
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{namespace="teei-platform-green"}[5m]))' | jq .

# Expected: Blue p95 latency within 10% of Green
```

**Acceptance Criteria for Canary Progression**:
- ✅ Error rate: Blue ≤ Green
- ✅ p95 latency: Blue within 110% of Green
- ✅ Zero 500 errors for 15 consecutive minutes
- ✅ Database connection pool healthy
- ✅ No OOM kills or pod restarts

#### 3.3 Increase Canary to 25% (if 10% successful)

```bash
# Update weight distribution
kubectl patch virtualservice platform-canary -n teei-platform --type=json -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 75},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 25}
]'

# Monitor for 15 minutes
# Repeat metrics collection from 3.2
```

#### 3.4 Increase Canary to 50%

```bash
# Update weight distribution
kubectl patch virtualservice platform-canary -n teei-platform --type=json -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 50},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 50}
]'

# Monitor for 15 minutes
```

#### 3.5 Full Cutover to Blue (100%)

```bash
# Update weight distribution
kubectl patch virtualservice platform-canary -n teei-platform --type=json -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 0},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 100}
]'

# Monitor for 30 minutes

# Verify all traffic on blue
kubectl top pods -n teei-platform-blue
kubectl top pods -n teei-platform-green
# Expected: Blue pods showing high CPU/traffic, Green pods idle
```

---

### Phase 4: Label Swap (Blue → Green) (15 minutes)

#### 4.1 Update DNS/Service Labels

```bash
# Relabel blue as new green
kubectl label namespace teei-platform-blue environment=green --overwrite
kubectl label namespace teei-platform-green environment=blue --overwrite

# Update service selectors
kubectl patch svc platform -n teei-platform-blue -p '{"spec":{"selector":{"app":"platform","version":"stable"}}}'

# Verify traffic flowing correctly
curl -f https://platform.teei.io/health
# Expected: {"version":"${VERSION}"}
```

#### 4.2 Cleanup Old Green (now labeled Blue)

```bash
# Scale down old version
kubectl scale deployment platform -n teei-platform-green --replicas=1

# Keep 1 replica running for 24 hours (fast rollback capability)
# Full deletion only after 24-hour bake period
```

---

### Phase 5: Secondary Region Deployment (EU-CENTRAL-1) (60 minutes)

#### 5.1 Deploy to EU-CENTRAL-1 Blue Environment

```bash
# Switch context
kubectx teei-prod-eu-central-1

# Deploy (same process as US-EAST-1 Phase 2)
argocd app create teei-platform-blue-eu \
  --repo https://github.com/yourorg/teei-helm-charts \
  --path charts/teei-platform \
  --dest-namespace teei-platform-blue \
  --dest-server https://kubernetes.default.svc \
  --helm-set-string image.tag=${VERSION} \
  --helm-set-string environment=production \
  --helm-set-string region=eu-central-1 \
  --sync-policy none

argocd app sync teei-platform-blue-eu --prune
argocd app wait teei-platform-blue-eu --health --timeout 600
```

#### 5.2 EU-Specific Smoke Tests

```bash
# Verify data residency compliance
EU_ENDPOINT=$(kubectl get svc -n teei-platform-blue platform -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test GDPR-compliant tenant (tenant_id with EU residency)
curl -f http://$EU_ENDPOINT/api/v1/tenants/eu-test-tenant-001/health
# Expected: {"region":"eu-central-1","data_residency":"EU"}

# Verify NO cross-region data access
curl -f http://$EU_ENDPOINT/api/v1/tenants/us-test-tenant-001/data
# Expected: 403 Forbidden (data residency violation)
```

#### 5.3 Canary Rollout (EU)

```bash
# Repeat Phase 3 steps for EU region
# 10% → 25% → 50% → 100% canary progression
# Monitor with same acceptance criteria
```

---

### Phase 6: GeoDNS Activation (30 minutes)

#### 6.1 Configure Route53 Geolocation Routing

```bash
# Update Route53 hosted zone
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC --change-batch file://geo-routing.json

# geo-routing.json content:
cat > geo-routing.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "platform.teei.io",
        "Type": "A",
        "GeoLocation": {
          "ContinentCode": "NA"
        },
        "SetIdentifier": "US-EAST-1",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "us-east-1-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "platform.teei.io",
        "Type": "A",
        "GeoLocation": {
          "ContinentCode": "EU"
        },
        "SetIdentifier": "EU-CENTRAL-1",
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "eu-central-1-alb-789012.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "platform.teei.io",
        "Type": "A",
        "SetIdentifier": "DEFAULT",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "us-east-1-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF
```

#### 6.2 Verify GeoDNS Routing

```bash
# Test from different geolocations (use VPN/proxy)
# North America → should resolve to us-east-1
dig platform.teei.io @8.8.8.8
# Expected: us-east-1-alb-123456.us-east-1.elb.amazonaws.com

# Europe → should resolve to eu-central-1
dig platform.teei.io @8.8.4.4
# Expected: eu-central-1-alb-789012.eu-central-1.elb.amazonaws.com

# Use curl with location header
curl -H "X-Test-Geo: US" https://platform.teei.io/api/v1/region
# Expected: {"region":"us-east-1"}

curl -H "X-Test-Geo: EU" https://platform.teei.io/api/v1/region
# Expected: {"region":"eu-central-1"}
```

---

### Phase 7: Post-Deployment Validation (30 minutes)

#### 7.1 End-to-End Business Flows

**Test critical user journeys**:
```bash
# Run production smoke tests
kubectl run e2e-prod-validation \
  --image=teei/e2e-tests:${VERSION} \
  --env="TARGET_URL=https://platform.teei.io" \
  --env="TEST_SUITE=production-critical-path" \
  --restart=Never

# Monitor test execution
kubectl logs -f e2e-prod-validation

# Expected tests:
# ✅ User login (SSO)
# ✅ Tenant data fetch (multi-region)
# ✅ Report generation (PDF export)
# ✅ Analytics query (ClickHouse)
# ✅ Event publishing (NATS)
# ✅ Audit log write (Postgres)
```

#### 7.2 SLO Compliance Check

```bash
# Verify all SLOs are met
# Availability SLO: 99.95% uptime
curl -s 'http://prometheus:9090/api/v1/query?query=avg_over_time(up{job="platform"}[1h])' | jq .
# Expected: > 0.9995

# Latency SLO: p95 < 500ms
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))' | jq .
# Expected: < 0.5

# Error Budget: 99.9% success rate
curl -s 'http://prometheus:9090/api/v1/query?query=1 - (rate(http_requests_total{status=~"5.."}[1h]) / rate(http_requests_total[1h]))' | jq .
# Expected: > 0.999
```

#### 7.3 Monitoring Dashboard Review

**Open Datadog/Grafana dashboards**:
- [ ] Platform Overview Dashboard (no red alerts)
- [ ] Database Replication Dashboard (lag < 5s)
- [ ] NATS JetStream Dashboard (consumer lag < 1000 msgs)
- [ ] ClickHouse Query Performance (p95 < 100ms)
- [ ] Cost Monitoring Dashboard (within budget)
- [ ] Security Dashboard (no unauthorized access attempts)

---

## 🔄 Rollback Procedure

**If ANY of the following occur, initiate immediate rollback**:
- Error rate > 5% for > 5 minutes
- p95 latency > 2x baseline
- Database connection failures
- Pod crash loops (> 3 restarts in 10 minutes)
- Data corruption detected
- Security breach detected

### Rollback Steps (< 5 minutes)

```bash
# IMMEDIATE: Route all traffic back to old green
kubectl patch virtualservice platform-canary -n teei-platform --type=json -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 100},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 0}
]'

# Scale up old green deployment
kubectl scale deployment platform -n teei-platform-green --replicas=10

# Verify rollback successful
curl -f https://platform.teei.io/health
# Expected: {"version":"${OLD_VERSION}"}

# Post-rollback: Investigate root cause in blue environment
# Blue environment remains running for debugging
```

**Rollback Notification**:
```bash
# Send PagerDuty alert
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Production deployment rolled back - Version ${VERSION}",
      "severity": "error",
      "source": "deployment-automation"
    }
  }'

# Update status page
# Notify stakeholders in #platform-deployments
```

---

## 📊 Success Criteria

**Deployment is considered successful when**:
- ✅ All regions deployed and serving traffic
- ✅ GeoDNS routing active and verified
- ✅ SLOs met for 30 consecutive minutes post-deployment
- ✅ Zero critical/high-severity errors
- ✅ Database replication lag < 5s across all regions
- ✅ E2E tests passing at 100% success rate
- ✅ Cost metrics within budget (+/- 10%)
- ✅ Security scans showing no new vulnerabilities
- ✅ Monitoring dashboards showing green status

---

## 📞 Escalation Contacts

| Role | Contact | Escalation Level |
|------|---------|------------------|
| **On-Call SRE** | PagerDuty: `platform-oncall` | Level 1 |
| **Platform Lead** | Slack: @platform-lead | Level 2 |
| **CTO** | Slack: @cto | Level 3 (Critical incidents only) |

---

## 📝 Post-Deployment Tasks

**Within 24 hours**:
- [ ] Update deployment log with actual metrics
- [ ] Conduct deployment retrospective
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned
- [ ] Archive deployment artifacts (logs, configs, metrics)
- [ ] Update status page: "Deployment completed successfully"

**Within 7 days**:
- [ ] Full deletion of old green environment
- [ ] Cost analysis report (actual vs. projected)
- [ ] Performance benchmarking report
- [ ] Security audit of new deployment

---

## 📚 Related Documentation

- [Runbook: Region Failover](/docs/runbooks/Runbook_Region_Failover.md)
- [Runbook: Database Failover](/docs/runbooks/Runbook_Database_Failover.md)
- [Runbook: Rollback Procedures](/docs/runbooks/Runbook_Rollback.md)
- [Blue/Green Canary Rollouts](/docs/Blue_Green_Canary_Rollouts.md)
- [DNS & Traffic Management](/docs/DNS_WAF_Traffic.md)
- [DR Strategy](/docs/DR_Strategy.md)

---

**Document History**:
- **v1.0.0** (2025-11-15): Initial GA deployment runbook
