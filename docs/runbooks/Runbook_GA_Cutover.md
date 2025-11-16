# GA Cutover Runbook: Multi-Region Production Launch

**Version:** 1.0.0
**Last Updated:** 2025-11-16
**Owner:** Platform Engineering Team
**RTO Target:** ≤ 15 minutes
**RPO Target:** ≤ 10 seconds

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Cutover Checklist](#pre-cutover-checklist)
3. [Cutover Procedure](#cutover-procedure)
4. [Rollback Procedure](#rollback-procedure)
5. [Post-Cutover Validation](#post-cutover-validation)
6. [Evidence Collection](#evidence-collection)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This runbook details the step-by-step procedure for executing the GA (General Availability) cutover to multi-region production deployment across US (us-east-1) and EU (eu-central-1) regions.

**Key Objectives:**
- Zero-downtime migration to multi-region architecture
- mTLS STRICT enforcement across all services
- GDPR data residency compliance for EU region
- Error-budget-gated progressive rollouts
- RTO ≤ 15 min, RPO ≤ 10 s validation

**Infrastructure Components:**
- Kubernetes clusters: us-east-1, eu-central-1
- Istio service mesh with mTLS STRICT
- Argo Rollouts for canary deployments
- Kyverno admission policies
- Regional PostgreSQL, ClickHouse, NATS
- Route53 latency-based routing
- CloudFront CDN with WAF

---

## Pre-Cutover Checklist

### 1. Infrastructure Validation

- [ ] **Kubernetes Clusters Ready**
  ```bash
  kubectl cluster-info --context us-east-1
  kubectl cluster-info --context eu-central-1
  kubectl get nodes --context us-east-1
  kubectl get nodes --context eu-central-1
  ```
  **Expected:** All nodes `Ready`, control plane healthy

- [ ] **Namespaces Created**
  ```bash
  kubectl get namespace teei-production-us-east-1 --context us-east-1
  kubectl get namespace teei-production-eu-central-1 --context eu-central-1
  ```

- [ ] **Istio Installed and Configured**
  ```bash
  kubectl get pods -n istio-system --context us-east-1
  kubectl get peerauthentication -A --context us-east-1
  ```
  **Expected:** mTLS mode = STRICT

- [ ] **Kyverno Policies Active**
  ```bash
  kubectl get clusterpolicy --context us-east-1
  ```
  **Expected:** 8 policies in `validationFailureAction: Enforce`

- [ ] **Argo Rollouts Installed**
  ```bash
  kubectl get rollout -n teei-production-us-east-1 --context us-east-1
  ```

### 2. Data Layer Validation

- [ ] **Database Replication Active**
  ```bash
  kubectl exec -n databases postgres-0 --context us-east-1 -- \
    psql -U postgres -c "SELECT * FROM pg_stat_replication;"
  ```
  **Expected:** Active replication to eu-central-1, lag < 10s

- [ ] **ClickHouse Replication Healthy**
  ```bash
  kubectl exec -n databases clickhouse-0 --context us-east-1 -- \
    clickhouse-client --query "SELECT * FROM system.replicas WHERE is_readonly=0;"
  ```

- [ ] **NATS JetStream Mirroring**
  ```bash
  nats stream info --context us-east-1
  nats stream info --context eu-central-1
  ```

### 3. Security Validation

- [ ] **Container Images Signed**
  ```bash
  cosign verify ghcr.io/henrigkroine/teei-api-gateway:v1.0.0
  ```

- [ ] **Secrets Synced to Vault**
  ```bash
  vault kv list secret/teei/production/us-east-1
  vault kv list secret/teei/production/eu-central-1
  ```

- [ ] **TLS Certificates Valid**
  ```bash
  kubectl get certificate -A --context us-east-1
  ```
  **Expected:** All certificates `Ready=True`, expiry > 30 days

- [ ] **Security Scans Passed**
  ```bash
  ./scripts/soc2/generate.sh
  ```
  **Expected:** 0 CRITICAL, 0 HIGH vulnerabilities

### 4. Observability Validation

- [ ] **Prometheus Scraping**
  ```bash
  curl http://prometheus.observability.svc.cluster.local:9090/-/healthy
  ```

- [ ] **Grafana Dashboards Loaded**
  - [ ] FinOps Overview
  - [ ] Carbon Emissions (CO₂e)
  - [ ] mTLS Metrics
  - [ ] Argo Rollouts Canary

- [ ] **Loki Receiving Logs**
  ```bash
  curl http://loki.observability.svc.cluster.local:3100/ready
  ```

### 5. Networking Validation

- [ ] **Route53 Health Checks Configured**
  ```bash
  aws route53 get-health-check-status --health-check-id <id>
  ```

- [ ] **WAF Rules Active**
  ```bash
  aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1
  ```

- [ ] **CloudFront Distribution Ready**
  ```bash
  aws cloudfront get-distribution --id <distribution-id>
  ```
  **Expected:** Status = `Deployed`

---

## Cutover Procedure

### Phase 1: Pre-Cutover Preparation (T-30 min)

**Duration:** 10 minutes
**Operator:** Platform Engineering Lead

1. **Announce Cutover Window**
   ```bash
   # Send notifications
   ./scripts/notify-cutover.sh --status "starting" --eta "30 minutes"
   ```

2. **Create Evidence Directory**
   ```bash
   export EVIDENCE_DIR="./reports/phaseI/evidence/cutover-$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$EVIDENCE_DIR"
   ```

3. **Capture Pre-Cutover State**
   ```bash
   kubectl get all -A --context us-east-1 > "$EVIDENCE_DIR/pre-state-us.txt"
   kubectl get all -A --context eu-central-1 > "$EVIDENCE_DIR/pre-state-eu.txt"
   ```

4. **Enable Change Freeze**
   ```bash
   git tag -a "cutover-start-$(date +%s)" -m "GA Cutover Start"
   ```

### Phase 2: Deploy Regional Overlays (T-20 min)

**Duration:** 10 minutes
**Operator:** Kubernetes Specialist

#### US-East-1 Deployment

```bash
# Validate manifests
kustomize build k8s/overlays/us-east-1 | kubeconform -strict -summary

# Dry-run apply
kubectl apply -k k8s/overlays/us-east-1 --dry-run=server --context us-east-1

# Apply manifests (server-side apply for conflicts)
kubectl apply -k k8s/overlays/us-east-1 --server-side --context us-east-1

# Wait for rollout
kubectl wait --for=condition=available --timeout=300s \
  deployment --all -n teei-production-us-east-1 --context us-east-1
```

**Validation:**
```bash
kubectl get pods -n teei-production-us-east-1 --context us-east-1
# Expected: All pods Running, Ready 1/1
```

#### EU-Central-1 Deployment

```bash
# Validate manifests
kustomize build k8s/overlays/eu-central-1 | kubeconform -strict -summary

# Apply with GDPR network policies
kubectl apply -k k8s/overlays/eu-central-1 --server-side --context eu-central-1

# Wait for rollout
kubectl wait --for=condition=available --timeout=300s \
  deployment --all -n teei-production-eu-central-1 --context eu-central-1
```

**Validation:**
```bash
kubectl get pods -n teei-production-eu-central-1 --context eu-central-1
kubectl get networkpolicy -n teei-production-eu-central-1 --context eu-central-1
# Expected: deny-cross-border-egress policy active
```

### Phase 3: Progressive Rollout with Argo (T-10 min)

**Duration:** 20 minutes (automated)
**Operator:** Argo Rollouts Controller

#### API Gateway Canary Rollout

```bash
# Trigger rollout
kubectl argo rollouts set image teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:v1.0.0 \
  -n teei-production-us-east-1 --context us-east-1

# Monitor canary progression
watch kubectl argo rollouts status teei-api-gateway \
  -n teei-production-us-east-1 --context us-east-1
```

**Canary Steps:**
1. 5% traffic (2 min hold) → SLO analysis
2. 15% traffic (3 min hold) → SLO analysis
3. 30% traffic (5 min hold) → SLO analysis
4. 60% traffic (5 min hold) → SLO analysis
5. 100% traffic → Complete

**SLO Gates:**
- p95 latency < 500ms
- Error rate < 0.1%
- CPU saturation < 80%
- Memory saturation < 85%

**Auto-Rollback:**
If any SLO gate fails, Argo Rollouts auto-rollback < 2 min

#### Monitoring Rollout Progress

```bash
# View analysis results
kubectl get analysisrun -n teei-production-us-east-1 --context us-east-1

# Check metrics
kubectl argo rollouts get rollout teei-api-gateway \
  -n teei-production-us-east-1 --context us-east-1 --watch
```

**Manual Promotion (if auto-promote disabled):**
```bash
kubectl argo rollouts promote teei-api-gateway \
  -n teei-production-us-east-1 --context us-east-1
```

### Phase 4: Traffic Cutover (T+10 min)

**Duration:** 5 minutes
**Operator:** Network Engineering

#### Update Route53 DNS

```bash
# Update latency-based routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-cutover.json

# Verify DNS propagation
dig api.teei.cloud
dig api.eu.teei.cloud
```

**dns-cutover.json:**
```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.teei.cloud",
        "Type": "A",
        "SetIdentifier": "us-east-1",
        "Region": "us-east-1",
        "AliasTarget": {
          "HostedZoneId": "Z123",
          "DNSName": "us-east-1-lb.teei.cloud",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.eu.teei.cloud",
        "Type": "A",
        "SetIdentifier": "eu-central-1",
        "Region": "eu-central-1",
        "AliasTarget": {
          "HostedZoneId": "Z456",
          "DNSName": "eu-central-1-lb.teei.cloud",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

#### Update WAF Rules

```bash
# Attach WAF to CloudFront
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/teei-waf/abc123 \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/EDFDVBD632BHDS5

# Verify WAF rules
aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 \
  --name teei-waf --id abc123
```

### Phase 5: DR Failover Test (T+15 min)

**Duration:** 15 minutes
**Operator:** DR Commander

```bash
# Execute planned failover test
./scripts/dr/failover.sh \
  --from us-east-1 \
  --to eu-central-1 \
  --evidence "$EVIDENCE_DIR/dr-test"

# Expected output:
# RTO: < 900s (15 min)
# RPO: < 10s
```

**Validation:**
- [ ] Traffic routed to EU region
- [ ] All pods healthy in EU
- [ ] Database replication lag < 10s
- [ ] No data loss
- [ ] Evidence bundle signed and hashed

**Failback:**
```bash
./scripts/dr/failover.sh \
  --from eu-central-1 \
  --to us-east-1 \
  --evidence "$EVIDENCE_DIR/dr-failback"
```

---

## Post-Cutover Validation

### 1. Health Checks

```bash
# Check all pods
kubectl get pods -A --context us-east-1 | grep -v Running
kubectl get pods -A --context eu-central-1 | grep -v Running
# Expected: No output (all pods Running)

# Check PodDisruptionBudgets
kubectl get pdb -A --context us-east-1
# Expected: minAvailable met for all PDBs
```

### 2. mTLS Verification

```bash
# Verify mTLS mode
kubectl get peerauthentication -A --context us-east-1 -o yaml | grep "mode: STRICT"

# Check certificate rotation
istioctl proxy-config secret -n teei-production-us-east-1 \
  <pod-name> --context us-east-1
```

### 3. Smoke Tests

```bash
# Run comprehensive smoke tests
./scripts/smoke-tests.sh --region us-east-1
./scripts/smoke-tests.sh --region eu-central-1

# Expected: All tests pass
```

### 4. Load Tests

```bash
# Run k6 load tests
k6 run --vus 100 --duration 5m ./scripts/loadtests/api-gateway.js

# Expected:
# - p95 latency < 500ms
# - Error rate < 0.1%
# - No OOM kills
```

### 5. GDPR Residency Validation

```bash
# Verify EU data stays in EU
kubectl logs -n teei-production-eu-central-1 <api-gateway-pod> \
  --context eu-central-1 | grep "cross-border"
# Expected: No cross-border data transfers

# Check Kyverno policy violations
kubectl get policyreport -A --context eu-central-1
# Expected: 0 violations for data-residency policies
```

### 6. FinOps & Carbon Validation

```bash
# Ingest cost data
./scripts/finops/ingest.sh

# Render dashboards
./scripts/finops/render.sh

# Verify budget alerts
clickhouse-client --query "SELECT * FROM finops.budget_alerts WHERE date = today();"
```

---

## Rollback Procedure

**Trigger Conditions:**
- RTO/RPO targets not met
- Critical security vulnerability detected
- > 1% error budget burn during cutover
- Data residency violation detected

### Emergency Rollback (< 5 min)

```bash
# 1. Revert Argo Rollouts
kubectl argo rollouts abort teei-api-gateway \
  -n teei-production-us-east-1 --context us-east-1
kubectl argo rollouts undo teei-api-gateway \
  -n teei-production-us-east-1 --context us-east-1

# 2. Revert DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-rollback.json

# 3. Scale down new deployments
kubectl scale deployment --all --replicas=0 \
  -n teei-production-us-east-1 --context us-east-1

# 4. Restore previous state
kubectl rollout undo deployment --all \
  -n teei-production --context us-east-1
```

### Rollback Validation

```bash
# Run smoke tests
./scripts/smoke-tests.sh --region us-east-1

# Check metrics
curl http://prometheus:9090/api/v1/query?query=up
```

---

## Evidence Collection

All evidence must be captured with cryptographic hashing and timestamping.

### Required Evidence

1. **Pre/Post Deployment State**
   ```bash
   kubectl get all -A > "$EVIDENCE_DIR/post-state-us.txt"
   sha256sum "$EVIDENCE_DIR/"*.txt > "$EVIDENCE_DIR/evidence.sha256"
   ```

2. **Manifest Validation**
   ```bash
   kustomize build k8s/overlays/us-east-1 > "$EVIDENCE_DIR/manifests-us.yaml"
   kubeconform -summary k8s/overlays/us-east-1 > "$EVIDENCE_DIR/kubeconform-us.txt"
   ```

3. **SLO Analysis Results**
   ```bash
   kubectl get analysisrun -A -o yaml > "$EVIDENCE_DIR/analysisruns.yaml"
   ```

4. **Security Scans**
   ```bash
   ./scripts/soc2/generate.sh
   cp ./reports/phaseI/evidence/security/scan-*/security-summary.json "$EVIDENCE_DIR/"
   ```

5. **DR Test Results**
   ```bash
   cp "$EVIDENCE_DIR/dr-test/summary.json" "$EVIDENCE_DIR/dr-evidence.json"
   ```

6. **FinOps Metrics**
   ```bash
   ./scripts/finops/render.sh
   cp /tmp/finops-reports/*.csv "$EVIDENCE_DIR/"
   ```

### Sign Evidence Bundle

```bash
cd "$EVIDENCE_DIR"
sha256sum * > evidence.sha256
gpg --detach-sign --armor evidence.sha256
tar -czf "ga-cutover-evidence-$(date +%s).tar.gz" ./*
```

---

## Troubleshooting

### Issue: Pods Not Starting

**Symptoms:** Pods stuck in `Pending` or `CrashLoopBackOff`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n teei-production-us-east-1
kubectl logs <pod-name> -n teei-production-us-east-1
```

**Common Causes:**
1. **Resource constraints:** Check node resources
   ```bash
   kubectl top nodes
   ```
2. **Image pull errors:** Verify image exists and credentials
   ```bash
   kubectl get events -n teei-production-us-east-1 | grep "Failed to pull"
   ```
3. **Kyverno policy violations:** Check policy reports
   ```bash
   kubectl get policyreport -A
   ```

### Issue: mTLS Connection Refused

**Symptoms:** `connection refused` or `TLS handshake failed`

**Diagnosis:**
```bash
istioctl proxy-config secret <pod-name> -n teei-production-us-east-1
kubectl logs <pod-name> -c istio-proxy -n teei-production-us-east-1
```

**Resolution:**
```bash
# Restart Envoy proxy
kubectl rollout restart deployment <deployment-name> -n teei-production-us-east-1
```

### Issue: Argo Rollout Stuck

**Symptoms:** Rollout paused indefinitely

**Diagnosis:**
```bash
kubectl argo rollouts get rollout <rollout-name> -n teei-production-us-east-1
kubectl get analysisrun -n teei-production-us-east-1
```

**Resolution:**
```bash
# Manually promote if analysis passed
kubectl argo rollouts promote <rollout-name> -n teei-production-us-east-1

# Abort if analysis failed
kubectl argo rollouts abort <rollout-name> -n teei-production-us-east-1
```

### Issue: GDPR Residency Violation

**Symptoms:** Cross-border data transfer detected

**Diagnosis:**
```bash
kubectl logs -n teei-production-eu-central-1 <pod-name> | grep "cross-border"
kubectl get networkpolicy -n teei-production-eu-central-1
```

**Resolution:**
```bash
# Block all egress immediately
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: emergency-egress-block
  namespace: teei-production-eu-central-1
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress: []
EOF

# Investigate and remediate
```

---

## Success Criteria

- [x] All pods `Running` in both regions
- [x] RTO ≤ 15 min validated
- [x] RPO ≤ 10 s validated
- [x] mTLS STRICT enforced (verified)
- [x] 0 CRITICAL/HIGH vulnerabilities
- [x] 0 Kyverno policy violations
- [x] 0 GDPR residency violations
- [x] Error budget burn < 0.1%
- [x] FinOps dashboards live
- [x] CO₂e monitoring active
- [x] Evidence bundle signed and archived

---

## Contact Information

- **Platform Lead:** platform-lead@teei.cloud
- **On-Call:** +1-XXX-XXX-XXXX
- **Slack:** #production-cutover
- **War Room:** https://meet.teei.cloud/ga-cutover

---

**END OF RUNBOOK**
