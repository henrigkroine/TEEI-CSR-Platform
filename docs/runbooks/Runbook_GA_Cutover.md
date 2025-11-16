# GA Cutover Runbook - Phase I

**Version:** 1.0.0
**Date:** 2025-11-16
**Status:** Production Ready
**RTO:** 15 minutes
**RPO:** 10 seconds

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Cutover Checklist](#pre-cutover-checklist)
3. [Cutover Execution](#cutover-execution)
4. [Validation & Smoke Tests](#validation--smoke-tests)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Cutover Tasks](#post-cutover-tasks)
7. [Emergency Contacts](#emergency-contacts)

---

## Overview

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

---

## Pre-Cutover Checklist

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
