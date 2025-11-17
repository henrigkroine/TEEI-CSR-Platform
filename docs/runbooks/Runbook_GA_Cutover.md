# GA Cutover Runbook: Multi-Region Production Launch

**Version:** 1.0.0
**Last Updated:** 2025-11-16
**Owner:** Platform Engineering Team
**RTO Target:** ≤ 15 minutes
**RPO Target:** ≤ 10 seconds
<<<<<<< HEAD
=======
# GA Cutover Runbook - Phase I

**Version:** 1.0.0
**Date:** 2025-11-16
**Status:** Production Ready
**RTO:** 15 minutes
**RPO:** 10 seconds
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Cutover Checklist](#pre-cutover-checklist)
3. [Cutover Procedure](#cutover-procedure)
4. [Rollback Procedure](#rollback-procedure)
5. [Post-Cutover Validation](#post-cutover-validation)
6. [Evidence Collection](#evidence-collection)
7. [Troubleshooting](#troubleshooting)
<<<<<<< HEAD
=======
3. [Cutover Execution](#cutover-execution)
4. [Validation & Smoke Tests](#validation--smoke-tests)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Cutover Tasks](#post-cutover-tasks)
7. [Emergency Contacts](#emergency-contacts)
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

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
<<<<<<< HEAD
=======
### Mission

Execute zero-downtime production GA cutover with multi-region (US/EU) deployment, progressive delivery, mTLS STRICT enforcement, and evidence-grade telemetry for SOC2 compliance.

### Scope

- **Regions**: us-east-1 (primary), eu-central-1 (GDPR)
- **Services**: 16 microservices + 3 data stores (PostgreSQL, ClickHouse, NATS)
- **Traffic**: Progressive rollout 5%→15%→30%→60%→100%
- **Compliance**: SOC2, GDPR, SLSA Level 2

### Success Criteria

✅ All services deployed and healthy in both regions
✅ mTLS STRICT verified (100% coverage)
✅ RTO ≤ 15 minutes, RPO ≤ 10 seconds
✅ Zero cross-region data residency violations
✅ Error budget burn < 0.1%
✅ All quality gates pass
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

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
<<<<<<< HEAD
=======
### T-7 Days: Planning & Communication

- [ ] **Stakeholder Notification**
  - Send cutover announcement to all teams
  - Schedule maintenance window (recommend: Saturday 02:00 UTC)
  - Brief customer success on expected impact (none)

- [ ] **Team Assignments**
  - Incident Commander: [Name]
  - Infrastructure Lead: [Name]
  - Database Admin: [Name]
  - Security Officer: [Name]
  - Scribe (documenter): [Name]

- [ ] **Backup Validation**
  - Verify PostgreSQL backups (last 7 days)
  - Verify ClickHouse backups (last 7 days)
  - Test restore to staging environment
  - Confirm WAL archiving is active

### T-3 Days: Infrastructure Validation

- [ ] **Cluster Readiness**
  ```bash
  # Verify both regional clusters
  kubectl --context us-east-1 get nodes
  kubectl --context eu-central-1 get nodes

  # Ensure all nodes Ready
  kubectl --context us-east-1 get nodes | grep -v Ready && echo "FAIL" || echo "PASS"
  kubectl --context eu-central-1 get nodes | grep -v Ready && echo "FAIL" || echo "PASS"
  ```

- [ ] **Network Validation**
  ```bash
  # Test cross-AZ connectivity
  ./scripts/synthetics/uptime-probe.sh us-east-1
  ./scripts/synthetics/uptime-probe.sh eu-central-1
  ```

- [ ] **Kustomize Build Test**
  ```bash
  kustomize build k8s/overlays/us-east-1 > /tmp/us-manifest.yaml
  kustomize build k8s/overlays/eu-central-1 > /tmp/eu-manifest.yaml

  # Validate with kubeconform
  kubeconform -strict /tmp/us-manifest.yaml
  kubeconform -strict /tmp/eu-manifest.yaml
  ```

- [ ] **Secrets Verification**
  ```bash
  # Check Sealed Secrets controller
  kubectl get pods -n kube-system -l name=sealed-secrets-controller

  # Verify critical secrets exist
  kubectl get secrets -n teei-us-east-1 | grep -E "(api-gateway|database|openai)"
  kubectl get secrets -n teei-eu-central-1 | grep -E "(api-gateway|database|openai)"
  ```

### T-1 Day: Final Preparations

- [ ] **Database Replication Check**
  ```bash
  # Verify replication lag < 5 seconds
  kubectl exec -n teei-us-east-1 statefulset/postgres-0 -- \
    psql -U teei -d teei_platform -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag;"
  ```

- [ ] **Observability Setup**
  ```bash
  # Import new Grafana dashboards
  kubectl apply -f observability/grafana/dashboards/finops-cost-analysis.json
  kubectl apply -f observability/grafana/dashboards/carbon-emissions.json
  kubectl apply -f observability/grafana/dashboards/mtls-security.json

  # Verify Prometheus scraping all targets
  kubectl port-forward -n observability svc/prometheus 9090:9090 &
  curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
  ```

- [ ] **Quality Gates Baseline**
  ```bash
  # Run full test suite
  pnpm -w test

  # Check coverage ≥ 80%
  pnpm -w test:coverage | grep "All files" | awk '{print $10}' | sed 's/%//' | \
    awk '{if ($1 >= 80) print "✅ PASS"; else print "❌ FAIL"}'

  # Lint and typecheck
  pnpm -w lint && pnpm -w typecheck
  ```

- [ ] **DR Drill**
  ```bash
  # Execute dry-run DR failover
  ./scripts/dr/failover.sh --from us-east-1 --to eu-central-1 --evidence /tmp/dr-drill --dry-run
  ```

---

## Cutover Execution

### Phase 1: Deploy US Region (T+0:00)

**Duration:** 20 minutes
**Commander:** Infrastructure Lead

```bash
# Set context
export KUBECONFIG=~/.kube/config
export REGION=us-east-1
export NAMESPACE=teei-${REGION}

# Create namespace if not exists
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply Kustomize overlay
echo "⚙️  Deploying to ${REGION}..."
kubectl apply --server-side -k k8s/overlays/${REGION}

# Wait for rollout (max 10 minutes)
kubectl rollout status deployment -n ${NAMESPACE} --timeout=10m

# Verify all pods Running
kubectl get pods -n ${NAMESPACE} -o wide

# Expected: All pods in Running state, 0 restarts
```

**Acceptance:**
- ✅ All deployments report "successfully rolled out"
- ✅ `kubectl get pods -n teei-us-east-1` shows all Running
- ✅ No CrashLoopBackOff or ImagePullBackOff

### Phase 2: Deploy EU Region (T+0:20)

**Duration:** 20 minutes
**Commander:** Infrastructure Lead

```bash
export REGION=eu-central-1
export NAMESPACE=teei-${REGION}

# Create namespace
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply Kustomize overlay with GDPR policies
echo "⚙️  Deploying to ${REGION} (GDPR-compliant)..."
kubectl apply --server-side -k k8s/overlays/${REGION}

# Wait for rollout
kubectl rollout status deployment -n ${NAMESPACE} --timeout=10m

# Verify GDPR labels
kubectl get pods -n ${NAMESPACE} -o json | \
  jq -r '.items[] | select(.metadata.labels."gdpr-compliant" != "true") | .metadata.name' | \
  wc -l  # Should be 0
```

**Acceptance:**
- ✅ All deployments rolled out successfully
- ✅ All pods have `gdpr-compliant: "true"` label
- ✅ Node affinity enforced (pods only in eu-central-1 AZs)

### Phase 3: Verify mTLS STRICT (T+0:40)

**Duration:** 10 minutes
**Commander:** Security Officer

```bash
# Check PeerAuthentication policies
kubectl get peerauthentication -n teei-us-east-1
kubectl get peerauthentication -n teei-eu-central-1

# Expected output:
# NAME                   MODE     AGE
# default-mtls-strict    STRICT   5m

# Verify Istio mesh config
kubectl get meshconfig -n istio-system -o yaml | grep "mtls:" -A 2

# Test mTLS enforcement
kubectl exec -n teei-us-east-1 deployment/us-teei-api-gateway -c api-gateway -- \
  curl -s -o /dev/null -w "%{http_code}" http://us-teei-reporting:3014/health

# Expected: 200 (mTLS handshake succeeded)

# Test cross-region blocking
kubectl exec -n teei-us-east-1 deployment/us-teei-api-gateway -c api-gateway -- \
  curl -s -o /dev/null -w "%{http_code}" http://eu-teei-reporting.teei-eu-central-1.svc.cluster.local:3014/health

# Expected: 403 or 000 (blocked by AuthorizationPolicy)
```

**Acceptance:**
- ✅ All PeerAuthentication policies in STRICT mode
- ✅ Intra-region traffic succeeds with mTLS
- ✅ Cross-region traffic blocked

### Phase 4: Progressive Traffic Rollout (T+0:50)

**Duration:** 60 minutes (includes soak time)
**Commander:** Incident Commander

```bash
# Enable Argo Rollouts
kubectl apply -k k8s/base/argo-rollouts

# Start progressive canary for API Gateway
kubectl argo rollouts promote api-gateway -n teei-us-east-1

# Monitor rollout
watch kubectl argo rollouts get rollout api-gateway -n teei-us-east-1

# Expected progression:
# Step 1/8: SetWeight 5%    (pause 5m)
# Step 2/8: Analysis (success-rate)
# Step 3/8: SetWeight 15%   (pause 5m)
# Step 4/8: Analysis (success-rate, latency-p95)
# Step 5/8: SetWeight 30%   (pause 10m)
# Step 6/8: Analysis (success-rate, latency-p95, error-budget)
# Step 7/8: SetWeight 60%   (pause 10m)
# Step 8/8: SetWeight 100%

# If analysis fails at any step, rollout auto-aborts
```

**SLO Gates (monitored by AnalysisTemplates):**
- ✅ Success rate ≥ 99.9%
- ✅ P95 latency ≤ 500ms
- ✅ Error budget burn < 0.1%

**Manual Gate at 60%:**
```bash
# Review metrics before proceeding to 100%
# Open Grafana: http://grafana.teei.example.com
# Check:
# - HTTP Overview: Error rate, latency
# - mTLS Security: TLS handshake success
# - FinOps: Cost spike detection

# If metrics good, promote to 100%
kubectl argo rollouts promote api-gateway -n teei-us-east-1
```

### Phase 5: DNS Cutover (T+1:50)

**Duration:** 10 minutes
**Commander:** Infrastructure Lead

```bash
# Update Route53 to enable latency-based routing
cd infrastructure/terraform

# Initialize and plan
terraform init
terraform plan -out=tfplan

# Review plan (ensure only Route53 changes)
terraform show tfplan

# Apply Route53 configuration
terraform apply tfplan

# Verify health checks
aws route53 get-health-check-status --health-check-id $(terraform output us_health_check_id)
aws route53 get-health-check-status --health-check-id $(terraform output eu_health_check_id)

# Expected: Both healthy
```

**Acceptance:**
- ✅ Route53 health checks passing
- ✅ Latency-based routing active
- ✅ DNS propagation (verify with `dig api.teei.example.com`)

### Phase 6: Data Residency Validation (T+2:00)

**Duration:** 10 minutes
**Commander:** Security Officer

```bash
# Run automated residency validation
./scripts/dr/validate-residency.sh

# Expected output:
# ✅ Test 1: Tenant→Region Routing: 0 violations
# ✅ Test 2: Pod Node Affinity: Verified
# ✅ Test 3: Cross-Region Traffic Blocking: HTTP 403
# ✅ Test 4: Database Residency: US=12 conn, EU=8 conn
# ✅ Test 5: GDPR Compliance Labels: Verified
# Status: ✅ PASS
```

**Acceptance:**
- ✅ 0 cross-region residency violations
- ✅ All tenant routes correct
- ✅ GDPR labels present on EU pods

---

## Validation & Smoke Tests

### Automated Smoke Tests (T+2:10)

```bash
# Run comprehensive smoke tests
./scripts/smoke-tests.sh

# Expected tests:
# ✅ API Gateway health (US and EU)
# ✅ Database connectivity
# ✅ NATS pub/sub
# ✅ ClickHouse analytics query
# ✅ Gen-AI report generation
# ✅ SSO/SAML login flow
# ✅ Export service (PDF/CSV)
```

### Manual Validation (T+2:20)

**Test User Journeys:**

1. **Corporate User - US Region**
   - Navigate to https://cockpit.teei.example.com
   - Login with SSO (should route to us-east-1)
   - Generate Quarterly Report
   - Verify CSV export works
   - Check metrics dashboard loads

2. **Corporate User - EU Region**
   - VPN to EU location (or use EU-based tester)
   - Navigate to https://cockpit.teei.example.com
   - Login with SSO (should route to eu-central-1)
   - Verify GDPR consent banner shows
   - Generate Annual Report (CSRD-aligned)

3. **API Client**
   ```bash
   # US API endpoint
   curl -H "Authorization: Bearer ${TOKEN}" \
     https://api.teei.example.com/v1/metrics/sroi | jq

   # EU API endpoint
   curl -H "Authorization: Bearer ${TOKEN}" \
     https://api.teei.example.com/v1/metrics/sroi | jq
   ```

**Acceptance:**
- ✅ All user journeys complete successfully
- ✅ Latency acceptable (<500ms P95)
- ✅ No console errors

### Metrics Validation (T+2:30)

**Grafana Dashboards:**

1. **HTTP Overview**
   - Request rate: ~100-200 req/s baseline
   - Error rate: <0.1%
   - P95 latency: <500ms

2. **mTLS Security**
   - mTLS coverage: 100%
   - TLS handshake success: >99.9%
   - Unauthorized attempts: <10/5min

3. **FinOps Cost Analysis**
   - Total spend: within budget
   - No unexpected cost spikes

4. **Carbon Emissions**
   - Baseline established
   - Reduction playbook available

**Acceptance:**
- ✅ All dashboards rendering correctly
- ✅ Metrics within expected ranges
- ✅ No alerting anomalies

---

## Rollback Procedures

### Trigger Conditions

Initiate rollback if:
- ❌ Error rate > 1% sustained for 5+ minutes
- ❌ P95 latency > 2000ms sustained
- ❌ Database replication lag > 60 seconds
- ❌ Critical service CrashLoopBackOff
- ❌ Data residency violation detected

### Rollback Steps

**Option 1: Rollback via Argo Rollouts (fastest)**

```bash
# Abort current rollout and rollback
kubectl argo rollouts abort api-gateway -n teei-us-east-1
kubectl argo rollouts undo api-gateway -n teei-us-east-1

# Wait for stable revision
kubectl argo rollouts status api-gateway -n teei-us-east-1
```

**Option 2: Full Cluster Rollback**

```bash
# Use existing rollback script
./scripts/rollback/rollback-deployment.sh --region us-east-1 --to-revision previous

# Verify rollback
./scripts/rollback/verify-rollback.sh
```

**Option 3: DNS Cutover Rollback**

```bash
# Revert Route53 to previous state
cd infrastructure/terraform
terraform apply -auto-approve -var="rollback=true"
```

**Post-Rollback:**
- [ ] Verify all services healthy
- [ ] Run smoke tests
- [ ] Document root cause
- [ ] Schedule retrospective

---

## Post-Cutover Tasks

### Immediate (T+3:00 - T+4:00)

- [ ] **Evidence Collection**
  ```bash
  # Generate SBOM and provenance
  ./scripts/soc2/generate-sbom.sh

  # Generate validation report
  ./scripts/validation/generate-report.sh

  # Archive evidence
  tar -czf /reports/phaseI/evidence-$(date +%Y%m%d).tar.gz /reports/phaseI/evidence/
  ```

- [ ] **Monitoring Setup**
  ```bash
  # Enable 24/7 PagerDuty alerting
  kubectl apply -f k8s/observability/pagerduty-integration.yaml

  # Set up Slack alerts
  kubectl apply -f k8s/observability/slack-alerts.yaml
  ```

- [ ] **Status Page Update**
  - Update https://status.teei.example.com to "Operational"
  - Post incident report (if any issues occurred)

### Within 24 Hours

- [ ] **Cost Analysis**
  ```bash
  # Run FinOps ingestion
  ./scripts/finops/ingest.sh

  # Review dashboard for unexpected costs
  # Open: https://grafana.teei.example.com/d/finops
  ```

- [ ] **Security Scan**
  ```bash
  # Run vulnerability scan
  pnpm audit --audit-level=high

  # ZAP scan (if available)
  zap-cli quick-scan https://api.teei.example.com
  ```

- [ ] **Compliance Documentation**
  - Generate SOC2 evidence bundle
  - Update compliance tracker
  - Archive runbook execution logs

### Within 1 Week

- [ ] **Retrospective Meeting**
  - Review what went well
  - Identify improvement areas
  - Update runbook with lessons learned

- [ ] **Performance Optimization**
  - Analyze 7-day performance data
  - Right-size resources if needed
  - Tune autoscaling policies

- [ ] **DR Drill Scheduling**
  - Schedule quarterly DR drill
  - Update DR calendar

---

## Emergency Contacts

### On-Call Rotation

| Role | Primary | Secondary | Phone | PagerDuty |
|------|---------|-----------|-------|-----------|
| **Incident Commander** | [Name] | [Name] | [Phone] | [@handle] |
| **Infrastructure Lead** | [Name] | [Name] | [Phone] | [@handle] |
| **Database Admin** | [Name] | [Name] | [Phone] | [@handle] |
| **Security Officer** | [Name] | [Name] | [Phone] | [@handle] |
| **Platform Architect** | [Name] | [Name] | [Phone] | [@handle] |

### Escalation Path

```
SEV-1 (Critical):
├─ 0-15 min: On-call engineer + Incident Commander
├─ 15-30 min: + Infrastructure Lead + DBA + Security
├─ 30-60 min: + Platform Architect
└─ > 60 min: + CTO

SEV-2 (High):
├─ 0-30 min: On-call engineer
├─ 30-60 min: + Incident Commander
└─ > 60 min: + Infrastructure Lead
```

### Communication Channels

- **Primary:** Slack #platform-incidents
- **Secondary:** PagerDuty conference bridge
- **Status Updates:** Every 30 minutes to #engineering
- **Customer Comms:** Via status page

---

## Appendix

### Quality Gates Summary

| Gate | Threshold | Status |
|------|-----------|--------|
| Unit Tests | ≥ 80% coverage | ⏳ Check |
| Lint/Typecheck | 0 errors | ⏳ Check |
| Kubeconform | Clean | ⏳ Check |
| Security Scan | 0 HIGH vulns | ⏳ Check |
| DR Metrics | RTO ≤ 15m, RPO ≤ 10s | ⏳ Check |

### Key Metrics Baseline

| Metric | Target | Actual |
|--------|--------|--------|
| Request Rate | 100-200 req/s | TBD |
| Error Rate | < 0.1% | TBD |
| P95 Latency | < 500ms | TBD |
| Database Lag | < 5s | TBD |
| mTLS Coverage | 100% | TBD |

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-16 | Initial GA Cutover runbook |

**Related Runbooks:**
- [Disaster Recovery](./disaster-recovery.md)
- [Rollback Procedures](./rollback.md)
- [Deployment Guide](./deployment.md)
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
