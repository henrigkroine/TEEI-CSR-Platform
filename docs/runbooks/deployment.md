# Deployment Runbook

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**Time to Execute:** 20-30 minutes
**Environments:** Staging, Production

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Common Issues](#common-issues)

---

## Quick Reference

### Deployment Windows
- **Staging:** Any time (automated on `develop` push)
- **Production:** Tuesday/Wednesday 10:00-14:00 UTC (requires approval)
- **Emergency:** Any time with VP approval + runbook documentation

### Key Commands
```bash
# Check cluster status
kubectl get nodes
kubectl get deployments -n teei-production

# Quick rollback
kubectl rollout undo deployment -n teei-production --all

# View logs
kubectl logs -f deployment/prod-teei-api-gateway -n teei-production
```

### Contact
- **On-Call:** PagerDuty alert
- **Slack:** #platform-deployments
- **Escalation:** Infrastructure Lead

---

## Pre-Deployment Checklist

### 1. Code & CI Verification (5 minutes)

```bash
# Verify CI pipeline is green
gh run list --workflow=ci.yml --limit 1

# Check all tests passed
gh run view --log

# Verify images built successfully
gh run list --workflow=build-images.yml --limit 1

# Confirm image tags exist in registry
export VERSION=v1.2.3
docker manifest inspect ghcr.io/henrigkroine/teei-api-gateway:${VERSION}
```

**Checklist:**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Security scans passed (Trivy, Snyk)
- [ ] Accessibility tests passed
- [ ] Images built and pushed to GHCR
- [ ] QA sign-off received (for production)

### 2. Infrastructure Readiness (3 minutes)

```bash
# Set environment
export ENV=production  # or staging
export KUBECONFIG=~/.kube/config-${ENV}

# Verify cluster health
kubectl cluster-info
kubectl get nodes
kubectl top nodes

# Check resource availability
kubectl describe nodes | grep -A 5 "Allocated resources"

# Verify current deployment is healthy
kubectl get deployments -n teei-${ENV}
kubectl get pods -n teei-${ENV} | grep -v Running
```

**Checklist:**
- [ ] All cluster nodes ready
- [ ] CPU/Memory headroom available (>30%)
- [ ] No pods in CrashLoopBackOff
- [ ] All current deployments healthy

### 3. Backup Verification (2 minutes)

```bash
# Check database backup recency
export DB_HOST=teei-db-${ENV}.example.com
psql postgresql://teei:$DB_PASSWORD@${DB_HOST}:5432/teei_platform -c \
  "SELECT NOW() - MAX(backup_time) as backup_age FROM backup_metadata;"

# Verify backup exists
ls -lh /backups/teei_platform_* | tail -1
```

**Checklist:**
- [ ] Database backup < 4 hours old
- [ ] Backup size is reasonable (not 0 bytes)
- [ ] SSL certificates valid (> 30 days)

### 4. Communication (2 minutes)

**Checklist:**
- [ ] Deployment scheduled in change calendar
- [ ] Stakeholders notified (Slack #announcements)
- [ ] Status page updated if planned downtime
- [ ] Rollback plan reviewed

---

## Staging Deployment

**Target Time:** 10-15 minutes
**Trigger:** Automatic on push to `develop` branch, or manual

### Automated Deployment (Recommended)

```bash
# Navigate to GitHub Actions
# URL: https://github.com/henrigkroine/TEEI-CSR-Platform/actions/workflows/deploy-staging.yml

# Click "Run workflow"
# Parameters:
#   - image_tag: staging (default) or specific version
#   - Branch: develop (default)

# Monitor deployment
gh run watch
```

### Manual Deployment

```bash
# 1. Set environment
export KUBECONFIG=~/.kube/config-staging
export VERSION=staging
export NAMESPACE=teei-staging

# 2. Verify cluster connection (30 seconds)
kubectl cluster-info
kubectl get nodes

# 3. Update image tags (1 minute)
cd /home/user/TEEI-CSR-Platform/k8s/overlays/staging

kustomize edit set image \
  ghcr.io/henrigkroine/teei-api-gateway:${VERSION} \
  ghcr.io/henrigkroine/teei-unified-profile:${VERSION} \
  ghcr.io/henrigkroine/teei-kintell-connector:${VERSION} \
  ghcr.io/henrigkroine/teei-buddy-service:${VERSION} \
  ghcr.io/henrigkroine/teei-upskilling-connector:${VERSION} \
  ghcr.io/henrigkroine/teei-q2q-ai:${VERSION} \
  ghcr.io/henrigkroine/teei-safety-moderation:${VERSION} \
  ghcr.io/henrigkroine/teei-analytics:${VERSION} \
  ghcr.io/henrigkroine/teei-buddy-connector:${VERSION} \
  ghcr.io/henrigkroine/teei-discord-bot:${VERSION} \
  ghcr.io/henrigkroine/teei-impact-calculator:${VERSION} \
  ghcr.io/henrigkroine/teei-impact-in:${VERSION} \
  ghcr.io/henrigkroine/teei-journey-engine:${VERSION} \
  ghcr.io/henrigkroine/teei-notifications:${VERSION} \
  ghcr.io/henrigkroine/teei-reporting:${VERSION} \
  ghcr.io/henrigkroine/teei-corp-cockpit:${VERSION}

# 4. Render and validate manifests (30 seconds)
kubectl kustomize . > /tmp/staging-manifests.yaml

# Dry-run to catch errors
kubectl apply --dry-run=server -f /tmp/staging-manifests.yaml

# Review changes (optional)
kubectl diff -f /tmp/staging-manifests.yaml

# 5. Run database migrations (2-3 minutes)
# IMPORTANT: Always run migrations BEFORE deploying new code
kubectl run -n ${NAMESPACE} db-migrate-${VERSION} \
  --image=ghcr.io/henrigkroine/teei-api-gateway:${VERSION} \
  --restart=Never \
  --env="DATABASE_URL=${DATABASE_URL}" \
  --command -- node -e "require('@teei/shared-schema').runMigrations()"

# Wait for migration to complete
kubectl wait -n ${NAMESPACE} \
  --for=condition=complete \
  --timeout=5m \
  pod/db-migrate-${VERSION}

# Check migration logs
kubectl logs -n ${NAMESPACE} db-migrate-${VERSION}

# Clean up
kubectl delete -n ${NAMESPACE} pod/db-migrate-${VERSION}

# 6. Deploy to staging (5-7 minutes)
kubectl apply -f /tmp/staging-manifests.yaml

# Watch rollout progress
kubectl rollout status deployment -n ${NAMESPACE} --timeout=10m

# Alternative: watch specific deployment
kubectl get pods -n ${NAMESPACE} -w

# 7. Wait for all pods to be ready (2-3 minutes)
kubectl wait --for=condition=available --timeout=10m \
  -n ${NAMESPACE} \
  deployment --all
```

### Smoke Tests

```bash
# Get API Gateway endpoint
GATEWAY_URL=$(kubectl get svc -n ${NAMESPACE} staging-teei-api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test 1: Health check
curl -f http://${GATEWAY_URL}/health || echo "FAIL: Health check"

# Test 2: Authentication
curl -X POST http://${GATEWAY_URL}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@teei.example.com","password":"test123"}' \
  | jq -r '.token' > /tmp/token.txt

export TOKEN=$(cat /tmp/token.txt)

# Test 3: Profile retrieval
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/profiles/me \
  | jq '.email'

# Test 4: Metrics endpoint
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/metrics/test-company-123 \
  | jq '.totalEmployees'

# Test 5: Database connectivity
kubectl exec -n ${NAMESPACE} deployment/staging-teei-unified-profile -- \
  node -e "const db = require('./dist/db'); db.testConnection().then(ok => console.log('DB:', ok))"
```

---

## Production Deployment

**Target Time:** 20-30 minutes
**Trigger:** Manual via GitHub Actions (requires approval)

### Step 1: Trigger Deployment (2 minutes)

```bash
# Navigate to GitHub Actions
# URL: https://github.com/henrigkroine/TEEI-CSR-Platform/actions/workflows/deploy-production.yml

# Click "Run workflow"
# Parameters:
#   - image_tag: v1.2.3 (REQUIRED - must be semver format)
#   - run_smoke_tests: true (recommended)
#   - enable_rollback: true (recommended)
```

**OR via CLI:**

```bash
gh workflow run deploy-production.yml \
  -f image_tag=v1.2.3 \
  -f run_smoke_tests=true \
  -f enable_rollback=true
```

### Step 2: Pre-Deployment Checks (Automatic, 2-3 minutes)

GitHub Actions will automatically:
- Validate semver format
- Check if images exist in registry
- Wait for manual approval

### Step 3: Approve Deployment (Manual Gate)

```bash
# Monitor workflow
gh run watch

# When prompted, review deployment summary:
# - Image tag
# - Services to be updated
# - Current version

# Click "Approve and Deploy" in GitHub UI
```

### Step 4: Monitor Deployment (15-20 minutes)

**From local terminal:**

```bash
export KUBECONFIG=~/.kube/config-production
export NAMESPACE=teei-production

# Watch deployment progress
watch -n 5 kubectl get deployments -n ${NAMESPACE}

# Follow API Gateway logs
kubectl logs -f deployment/prod-teei-api-gateway -n ${NAMESPACE}

# Monitor rollout status
kubectl rollout status deployment -n ${NAMESPACE} --watch

# Check for errors
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20
```

**Deployment stages:**
1. Backup current deployment (1-2 min)
2. Update image tags (30 sec)
3. Run database migrations (2-5 min)
4. Rolling update (8-12 min per service)
5. Health checks (2-3 min)
6. Smoke tests (2-3 min)

### Step 5: Manual Verification (5 minutes)

See [Post-Deployment Verification](#post-deployment-verification) section below.

---

## Post-Deployment Verification

**Target Time:** 5-7 minutes

### 1. Pod Health (1 minute)

```bash
export NAMESPACE=teei-production  # or teei-staging

# Check all pods are running
kubectl get pods -n ${NAMESPACE}

# Identify any problem pods
kubectl get pods -n ${NAMESPACE} --field-selector=status.phase!=Running

# Check for recent restarts
kubectl get pods -n ${NAMESPACE} -o json | \
  jq -r '.items[] | select(.status.containerStatuses[0].restartCount > 0) |
    .metadata.name + " (restarts: " + (.status.containerStatuses[0].restartCount|tostring) + ")"'

# View recent events
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20
```

**Success Criteria:**
- [ ] All pods in `Running` state
- [ ] No recent restarts
- [ ] No error events in last 5 minutes

### 2. Service Health Checks (2 minutes)

```bash
# Test all service health endpoints
for service in api-gateway unified-profile kintell-connector buddy-service \
               upskilling-connector q2q-ai safety-moderation analytics \
               buddy-connector discord-bot impact-calculator impact-in \
               journey-engine notifications reporting corp-cockpit; do
  echo "Checking prod-teei-${service}..."
  kubectl exec -n ${NAMESPACE} deployment/prod-teei-api-gateway -- \
    wget -q -O- http://prod-teei-${service}:80/health 2>&1 | head -1
done
```

**Success Criteria:**
- [ ] All services return HTTP 200
- [ ] Health check JSON includes `"status": "healthy"`

### 3. Database Connectivity (1 minute)

```bash
# Test PostgreSQL connection
kubectl exec -n ${NAMESPACE} deployment/prod-teei-unified-profile -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT NOW()', (err, res) => {
      if (err) { console.error('DB ERROR:', err); process.exit(1); }
      console.log('DB OK:', res.rows[0].now);
      process.exit(0);
    });
  "

# Test ClickHouse connection (analytics)
kubectl exec -n ${NAMESPACE} deployment/prod-teei-analytics -- \
  wget -q -O- 'http://clickhouse-service:8123/?query=SELECT%201' || echo "FAIL"

# Test NATS connection
kubectl exec -n ${NAMESPACE} deployment/prod-teei-api-gateway -- \
  node -e "
    const { connect } = require('nats');
    connect({ servers: process.env.NATS_URL })
      .then(nc => { console.log('NATS OK'); nc.close(); })
      .catch(err => { console.error('NATS ERROR:', err); process.exit(1); });
  "
```

**Success Criteria:**
- [ ] PostgreSQL responds with current timestamp
- [ ] ClickHouse returns `1`
- [ ] NATS connection successful

### 4. Critical User Flows (2 minutes)

```bash
GATEWAY_URL=$(kubectl get svc -n ${NAMESPACE} prod-teei-api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test 1: Authentication
TOKEN=$(curl -X POST http://${GATEWAY_URL}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"healthcheck@teei.example.com","password":"${HEALTHCHECK_PASSWORD}"}' \
  -s | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

# Test 2: Profile retrieval
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/profiles/me -s | jq '.email'

# Test 3: Metrics endpoint (critical for reporting)
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/metrics/test-company-123 -s | jq '.totalEmployees'

# Test 4: Report generation (critical path)
curl -X POST http://${GATEWAY_URL}/api/v1/reports/generate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"quarterly","year":2025,"quarter":4}' -s | jq '.reportId'
```

**Success Criteria:**
- [ ] Authentication returns valid JWT
- [ ] Profile retrieval succeeds
- [ ] Metrics endpoint returns data
- [ ] Report generation queued successfully

### 5. Monitoring Dashboards (1 minute)

```bash
# Open Grafana in browser
kubectl port-forward -n monitoring svc/grafana 3000:80 &

# URL: http://localhost:3000
# Check dashboards:
# - TEEI Platform - HTTP Overview
# - TEEI Platform - PostgreSQL Metrics
# - TEEI Platform - NATS Consumer Metrics
```

**Success Criteria:**
- [ ] Request rate stable (100-1000 req/s)
- [ ] Error rate < 1%
- [ ] p95 latency < 2s
- [ ] No active critical alerts

### 6. Performance Baseline (1 minute)

```bash
# Check Horizontal Pod Autoscalers
kubectl get hpa -n ${NAMESPACE}

# Verify CPU/Memory usage is normal
kubectl top pods -n ${NAMESPACE}

# Check for any throttling
kubectl describe deployment -n ${NAMESPACE} | grep -A 3 "Resource Limits"
```

**Success Criteria:**
- [ ] HPA scaling within normal range
- [ ] CPU usage < 70% per pod
- [ ] Memory usage < 80% per pod
- [ ] No OOMKilled events

---

## Common Issues

### Issue 1: ImagePullBackOff

**Symptoms:**
```bash
kubectl get pods -n ${NAMESPACE}
# NAME                          READY   STATUS             RESTARTS
# prod-teei-api-gateway-xxx     0/1     ImagePullBackOff   0
```

**Diagnosis:**
```bash
kubectl describe pod -n ${NAMESPACE} prod-teei-api-gateway-xxx
# Look for: "Failed to pull image"
```

**Solutions:**

1. **Verify image exists:**
   ```bash
   docker manifest inspect ghcr.io/henrigkroine/teei-api-gateway:${VERSION}
   ```

2. **Check imagePullSecrets:**
   ```bash
   kubectl get secret -n ${NAMESPACE} | grep ghcr
   kubectl describe secret -n ${NAMESPACE} ghcr-secret
   ```

3. **Recreate image pull secret:**
   ```bash
   kubectl delete secret -n ${NAMESPACE} ghcr-secret
   kubectl create secret docker-registry ghcr-secret \
     --docker-server=ghcr.io \
     --docker-username=${GITHUB_USERNAME} \
     --docker-password=${GITHUB_TOKEN} \
     -n ${NAMESPACE}
   ```

### Issue 2: CrashLoopBackOff

**Symptoms:**
```bash
kubectl get pods -n ${NAMESPACE}
# NAME                          READY   STATUS             RESTARTS
# prod-teei-api-gateway-xxx     0/1     CrashLoopBackOff   3
```

**Diagnosis:**
```bash
# View current logs
kubectl logs -n ${NAMESPACE} prod-teei-api-gateway-xxx --tail=100

# View previous container logs (before crash)
kubectl logs -n ${NAMESPACE} prod-teei-api-gateway-xxx --previous

# Common errors to look for:
# - "Connection refused" (database/NATS)
# - "Secret not found" (Vault/ConfigMap)
# - "Cannot find module" (build error)
# - "EADDRINUSE" (port conflict)
```

**Solutions:**

1. **Database connection issues:**
   ```bash
   # Test database connectivity
   kubectl run -n ${NAMESPACE} db-test --rm -it --restart=Never \
     --image=postgres:15 -- \
     psql postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/teei_platform -c "SELECT 1"
   ```

2. **Missing environment variables:**
   ```bash
   kubectl describe deployment -n ${NAMESPACE} prod-teei-api-gateway | grep -A 20 "Environment"
   ```

3. **Check ConfigMaps and Secrets:**
   ```bash
   kubectl get configmap -n ${NAMESPACE}
   kubectl describe configmap -n ${NAMESPACE} api-gateway-config
   ```

### Issue 3: Database Migration Failed

**Symptoms:**
- Migration job exits with error
- Logs show "Migration failed"

**Diagnosis:**
```bash
kubectl logs -n ${NAMESPACE} db-migrate-${VERSION}
```

**Solutions:**

1. **Check migration state:**
   ```bash
   psql ${DATABASE_URL} -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
   ```

2. **Rollback failed migration (if safe):**
   ```bash
   psql ${DATABASE_URL} -c "DELETE FROM schema_migrations WHERE version = 'XXXX';"
   ```

3. **Re-run migrations:**
   ```bash
   kubectl delete pod -n ${NAMESPACE} db-migrate-${VERSION}
   # Then re-run migration command from deployment steps
   ```

### Issue 4: High Error Rate After Deployment

**Symptoms:**
- Grafana shows error rate > 5%
- PagerDuty alert fired

**Diagnosis:**
```bash
# Check error logs across all services
for deployment in $(kubectl get deployment -n ${NAMESPACE} -o name); do
  echo "=== $deployment ==="
  kubectl logs -n ${NAMESPACE} $deployment --tail=50 | grep -i error
done

# Check specific service
kubectl logs -n ${NAMESPACE} deployment/prod-teei-api-gateway | grep -E "(error|ERROR|Error)" | tail -20
```

**Solutions:**

1. **If error rate > 20%:** IMMEDIATE ROLLBACK (see rollback.md)
2. **If error rate 10-20%:** Investigate for 5 minutes, then rollback
3. **If error rate 5-10%:** Monitor closely, prepare for rollback

### Issue 5: Deployment Timeout

**Symptoms:**
- Rollout stuck at "Waiting for deployment to finish"
- Timeout after 15 minutes

**Diagnosis:**
```bash
# Check rollout status
kubectl rollout status deployment/prod-teei-api-gateway -n ${NAMESPACE}

# Check for stuck pods
kubectl get pods -n ${NAMESPACE} | grep -E "(Pending|ContainerCreating|Init)"

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

**Solutions:**

1. **Insufficient resources:**
   ```bash
   # Scale down non-critical services temporarily
   kubectl scale deployment -n ${NAMESPACE} prod-teei-discord-bot --replicas=0
   ```

2. **Force rollout:**
   ```bash
   kubectl rollout restart deployment -n ${NAMESPACE} --all
   ```

3. **Rollback if unable to resolve:**
   ```bash
   kubectl rollout undo deployment -n ${NAMESPACE} --all
   ```

---

## Quick Reference Card

Print this card and keep it handy during deployments:

```
┌─────────────────────────────────────────────────────────────┐
│               TEEI DEPLOYMENT QUICK REFERENCE               │
├─────────────────────────────────────────────────────────────┤
│ Pre-Deployment:                                             │
│  ✓ CI green    ✓ Backups done    ✓ Stakeholders notified  │
│                                                             │
│ Deployment Command:                                         │
│  gh workflow run deploy-production.yml \                    │
│    -f image_tag=v1.2.3 \                                    │
│    -f enable_rollback=true                                  │
│                                                             │
│ Monitor:                                                    │
│  kubectl get pods -n teei-production -w                     │
│                                                             │
│ Quick Rollback:                                             │
│  kubectl rollout undo deployment -n teei-production --all   │
│                                                             │
│ Emergency Contact:                                          │
│  PagerDuty: #platform-incidents                            │
│  Slack: #platform-deployments                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix: Service Port Reference

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| api-gateway | 3001 | /health |
| unified-profile | 3002 | /health |
| kintell-connector | 3005 | /health |
| buddy-service | 3006 | /health |
| upskilling-connector | 3009 | /health |
| q2q-ai | 3007 | /health |
| safety-moderation | 3003 | /health |
| analytics | 3004 | /health |
| buddy-connector | 3011 | /health |
| discord-bot | 3010 | /health |
| impact-calculator | 3012 | /health |
| impact-in | 3008 | /health |
| journey-engine | 3013 | /health |
| notifications | 3014 | /health |
| reporting | 3015 | /health |
| corp-cockpit | 4321 | /health |

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-14 | Initial runbook creation |

**Related Runbooks:**
- [Rollback Runbook](./rollback.md)
- [Disaster Recovery Runbook](./disaster-recovery.md)
- [PROD_DEPLOY_RUNBOOK.md](../PROD_DEPLOY_RUNBOOK.md) (comprehensive reference)
