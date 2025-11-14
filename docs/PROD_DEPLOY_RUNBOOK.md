# TEEI CSR Platform - Production Deployment Runbook

**Version**: 1.0.0
**Last Updated**: 2025-11-14
**Owner**: Infrastructure Team
**Ref**: MULTI_AGENT_PLAN.md § Worker 1 Phase D

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Procedures](#deployment-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Incident Response](#incident-response)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This runbook provides step-by-step instructions for deploying the TEEI CSR Platform to production. It covers:

- Initial cluster setup
- Service deployment
- Secret management
- Rollback procedures
- Health verification
- Incident response

**Deployment Strategy**: Rolling update with automated rollback

**Deployment Windows**:
- **Preferred**: Tuesday/Wednesday 10:00-14:00 UTC
- **Emergency**: Any time (requires VP approval)

---

## Prerequisites

### Required Access

- [ ] Kubernetes cluster admin access (production)
- [ ] GitHub repository access
- [ ] Container registry access (GHCR)
- [ ] Vault access (read/write secrets)
- [ ] Grafana/Prometheus access
- [ ] PagerDuty/incident management access

### Required Tools

```bash
# Verify tool versions
kubectl version --client  # >= v1.28.0
kustomize version        # >= 5.0.0
helm version            # >= 3.12.0
vault version           # >= 1.14.0
```

### Required Credentials

Store these securely (1Password, AWS Secrets Manager, etc.):

- `KUBE_CONFIG_PRODUCTION`: Kubernetes config for production cluster
- `VAULT_TOKEN`: Vault root or admin token
- `GITHUB_TOKEN`: Personal access token for GHCR
- `PAGERDUTY_API_KEY`: For incident creation

---

## Pre-Deployment Checklist

### 1. Code Review & Testing

- [ ] All PRs approved and merged to `main`
- [ ] CI pipeline green (all tests passing)
- [ ] Security scans passed (Trivy, Snyk)
- [ ] Staging deployment successful
- [ ] QA sign-off received
- [ ] Release notes prepared

### 2. Infrastructure Readiness

- [ ] Cluster health verified (nodes ready)
- [ ] Resource quotas sufficient (CPU, memory, disk)
- [ ] Database backups completed (< 1 hour old)
- [ ] Secrets rotated (if scheduled)
- [ ] SSL certificates valid (> 30 days remaining)

### 3. Communication

- [ ] Deployment scheduled in change calendar
- [ ] Stakeholders notified (email, Slack)
- [ ] PagerDuty maintenance window created (if planned downtime)
- [ ] Status page updated ("Maintenance Scheduled")

### 4. Backup & Rollback Preparation

- [ ] Database backup verified
- [ ] Current deployment manifests saved
- [ ] Current image tags documented
- [ ] Rollback plan reviewed

---

## Deployment Procedures

### Option A: Automated Deployment (Recommended)

Use the GitHub Actions workflow for production deployments.

#### Step 1: Trigger Deployment Workflow

1. Navigate to GitHub Actions: `.github/workflows/deploy-production.yml`
2. Click "Run workflow"
3. Specify parameters:
   - **image_tag**: Version to deploy (e.g., `v1.2.3`)
   - **run_smoke_tests**: `true` (recommended)
   - **enable_rollback**: `true` (recommended)
4. Click "Run workflow"

#### Step 2: Monitor Deployment

```bash
# Watch workflow progress in GitHub Actions UI
# Or follow logs via kubectl

export KUBECONFIG=~/.kube/config-production

# Watch deployments
kubectl get deployments -n teei-production -w

# Follow pod rollout
kubectl rollout status deployment -n teei-production --watch
```

#### Step 3: Approve Deployment

1. Workflow will pause for manual approval
2. Review deployment summary in GitHub Actions
3. Click "Approve and Deploy" if all checks pass

#### Step 4: Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification)

---

### Option B: Manual Deployment

Use this method if GitHub Actions is unavailable.

#### Step 1: Connect to Cluster

```bash
export KUBECONFIG=~/.kube/config-production

# Verify cluster connection
kubectl cluster-info
kubectl get nodes
```

#### Step 2: Backup Current State

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d-%H%M%S)
cd backups/$(date +%Y%m%d-%H%M%S)

# Backup all deployments
kubectl get deployment -n teei-production -o yaml > deployments-backup.yaml

# Document current image tags
kubectl get deployment -n teei-production \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}' \
  > current-images.txt

echo "Backup saved to: $(pwd)"
```

#### Step 3: Update Image Tags

```bash
cd k8s/overlays/production

# Set the version to deploy
export VERSION=v1.2.3

# Update kustomization.yaml with new image tags
# (This updates all services to the specified version)
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
```

#### Step 4: Run Database Migrations

**CRITICAL**: Always run migrations before deploying new code.

```bash
# Create migration job (adjust image as needed)
kubectl run -n teei-production db-migrate-${VERSION} \
  --image=ghcr.io/henrigkroine/teei-api-gateway:${VERSION} \
  --restart=Never \
  --command -- pnpm db:migrate

# Wait for migration to complete
kubectl wait -n teei-production \
  --for=condition=complete \
  --timeout=5m \
  job/db-migrate-${VERSION}

# Check migration logs
kubectl logs -n teei-production job/db-migrate-${VERSION}

# Clean up migration job
kubectl delete -n teei-production job/db-migrate-${VERSION}
```

#### Step 5: Render and Validate Manifests

```bash
# Render Kustomize manifests
kubectl kustomize k8s/overlays/production > /tmp/production-manifests.yaml

# Dry-run to validate
kubectl apply --dry-run=server -f /tmp/production-manifests.yaml

# Review changes (optional)
kubectl diff -f /tmp/production-manifests.yaml
```

#### Step 6: Deploy to Production

```bash
# Apply manifests
kubectl apply -f /tmp/production-manifests.yaml

# Watch rollout status
kubectl rollout status deployment -n teei-production --timeout=15m

# Alternative: watch individual deployments
kubectl get deployment -n teei-production -w
```

#### Step 7: Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification)

---

## Rollback Procedures

### Automatic Rollback

If using GitHub Actions with `enable_rollback: true`, rollback happens automatically on:
- Deployment failure
- Health check failure
- Smoke test failure

### Manual Rollback

#### Option 1: Restore from Backup

```bash
# Navigate to backup directory
cd backups/<timestamp>

# Apply backup manifests
kubectl apply -f deployments-backup.yaml

# Wait for rollout
kubectl rollout status deployment -n teei-production --timeout=10m
```

#### Option 2: Rollback to Previous Revision

```bash
# Get deployment history
kubectl rollout history deployment/prod-teei-api-gateway -n teei-production

# Rollback to previous version
kubectl rollout undo deployment/prod-teei-api-gateway -n teei-production

# Rollback specific revision
kubectl rollout undo deployment/prod-teei-api-gateway -n teei-production --to-revision=3

# Rollback all deployments (parallel)
for deployment in $(kubectl get deployment -n teei-production -o name); do
  kubectl rollout undo $deployment -n teei-production &
done
wait

# Verify rollback
kubectl rollout status deployment -n teei-production
```

#### Option 3: Redeploy Previous Version

```bash
# Set to previous working version
export VERSION=v1.2.2

# Update images and redeploy
cd k8s/overlays/production
kustomize edit set image ghcr.io/henrigkroine/teei-api-gateway:${VERSION} ...
kubectl apply -k .
```

### Database Rollback

**WARNING**: Database rollbacks are complex and may cause data loss.

```bash
# Option 1: Restore from backup (requires downtime)
kubectl scale deployment -n teei-production --replicas=0 --all
# Restore database from backup (follow DB-specific procedure)
kubectl scale deployment -n teei-production --replicas=<original> --all

# Option 2: Run down migrations (if supported)
kubectl run -n teei-production db-rollback \
  --image=ghcr.io/henrigkroine/teei-api-gateway:${PREVIOUS_VERSION} \
  --command -- pnpm db:rollback
```

---

## Post-Deployment Verification

### 1. Pod Health

```bash
# Check all pods are running
kubectl get pods -n teei-production

# Ensure no pods are crash looping
kubectl get pods -n teei-production --field-selector=status.phase!=Running

# Check pod events for errors
kubectl get events -n teei-production --sort-by='.lastTimestamp' | tail -20
```

### 2. Service Health

```bash
# Test API Gateway health
GATEWAY_IP=$(kubectl get svc -n teei-production prod-teei-api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -f http://${GATEWAY_IP}/health || echo "Health check failed!"

# Test all service health endpoints
kubectl run -n teei-production health-checker --rm -it --restart=Never \
  --image=curlimages/curl:latest \
  -- sh -c 'for svc in api-gateway unified-profile kintell-connector; do
    echo "Checking prod-teei-$svc..."
    curl -f http://prod-teei-$svc/health || echo "FAILED: $svc"
  done'
```

### 3. Database Connectivity

```bash
# Test database connections from a pod
kubectl exec -n teei-production deployment/prod-teei-unified-profile -- \
  node -e "require('./dist/db').testConnection()"
```

### 4. Monitoring & Metrics

```bash
# Check Prometheus targets are up
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Visit http://localhost:9090/targets

# Check Grafana dashboards
kubectl port-forward -n monitoring svc/grafana 3000:80 &
# Visit http://localhost:3000
```

### 5. Smoke Tests

Run critical user flows:

```bash
# Test authentication
curl -X POST http://${GATEWAY_IP}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test profile retrieval
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_IP}/api/profiles/me

# Test report generation (critical path)
curl -X POST http://${GATEWAY_IP}/api/reports/generate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"quarterly","year":2025,"quarter":4}'
```

### 6. Performance Baseline

```bash
# Check p95 latency is within SLA (<2s)
# View in Grafana "HTTP Overview" dashboard

# Check error rate is below threshold (<1%)
# View in Grafana "HTTP Overview" dashboard

# Verify auto-scaling is working
kubectl get hpa -n teei-production
```

---

## Monitoring & Alerts

### Grafana Dashboards

Access Grafana:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:80
```

Visit `http://localhost:3000` and check:

1. **TEEI Platform - HTTP Overview**
   - Request rate (normal range: 100-1000 req/s)
   - Error rate (must be < 1%)
   - Latency p95 (must be < 2s)

2. **TEEI Platform - NATS Consumer Metrics**
   - Consumer lag (must be < 1000 messages)
   - Processing rate (should match ingestion rate)

3. **TEEI Platform - PostgreSQL Metrics**
   - Active connections (< 80% of max)
   - Cache hit ratio (> 95%)
   - Query duration (< 500ms average)

4. **TEEI Platform - ClickHouse Metrics**
   - Query rate (normal range: 10-100 qps)
   - Disk usage (< 70%)

### Alert Thresholds

See `observability/prometheus/rules.yaml` for full alert definitions.

**Critical Alerts** (page immediately):
- Service down for > 2 minutes
- Error rate > 20%
- NATS consumer stuck

**Warning Alerts** (investigate within 30 minutes):
- Error rate > 5%
- High latency (p95 > 2s)
- High memory usage (> 90%)
- Consumer lag > 10,000 messages

### PagerDuty Integration

Alerts automatically create PagerDuty incidents for on-call engineers.

Manual incident creation:

```bash
# Create high-priority incident
curl -X POST https://api.pagerduty.com/incidents \
  -H "Authorization: Token ${PAGERDUTY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "type": "incident",
      "title": "TEEI Production Deployment Issue",
      "service": {"id": "PXXX", "type": "service_reference"},
      "urgency": "high",
      "body": {"type": "incident_body", "details": "Deployment failed..."}
    }
  }'
```

---

## Incident Response

### Severity Levels

**SEV-1 (Critical)**: Production down or major functionality unavailable
- Response: Immediate (< 15 minutes)
- Mitigation: Rollback or hotfix
- Communication: Exec team, all stakeholders

**SEV-2 (High)**: Degraded performance or partial functionality loss
- Response: < 1 hour
- Mitigation: Rollback or fix forward
- Communication: Engineering team, product owner

**SEV-3 (Medium)**: Minor issues or single feature degraded
- Response: < 4 hours
- Mitigation: Fix in next release
- Communication: Engineering team

### Incident Workflow

1. **Detect**: Alert fired or issue reported
2. **Triage**: Assess severity and impact
3. **Communicate**: Update status page and stakeholders
4. **Mitigate**: Rollback or apply hotfix
5. **Resolve**: Verify fix and close incident
6. **Post-Mortem**: Document root cause and action items

### Rollback Decision Matrix

| Condition | Action |
|-----------|--------|
| All health checks failing | **Immediate rollback** |
| Error rate > 20% | **Rollback** |
| Error rate 10-20% | **Investigate (5 min), then rollback** |
| Error rate 5-10% | **Monitor closely** |
| Single service failing | **Rollback that service only** |
| Database migration failed | **Stop deployment, assess data integrity** |

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

**Symptoms**: Pods stuck in `Pending`, `CrashLoopBackOff`, or `ImagePullBackOff`

**Diagnosis**:
```bash
kubectl describe pod -n teei-production <pod-name>
kubectl logs -n teei-production <pod-name> --previous
```

**Solutions**:
- **ImagePullBackOff**: Check image exists in registry, verify imagePullSecrets
- **CrashLoopBackOff**: Check logs for errors, verify environment variables
- **Pending**: Check resource quotas, node capacity

#### 2. High Error Rate

**Symptoms**: Prometheus alert firing, HTTP 5xx errors in logs

**Diagnosis**:
```bash
# Check error logs
kubectl logs -n teei-production deployment/prod-teei-api-gateway | grep -i error

# Check dependency health
kubectl run -n teei-production curl --rm -it --restart=Never \
  --image=curlimages/curl -- curl http://prod-teei-unified-profile/health
```

**Solutions**:
- Check database connectivity
- Verify downstream service health
- Check secret availability (Vault)
- Scale up replicas if CPU/memory constrained

#### 3. Database Connection Issues

**Symptoms**: Errors like "Connection pool exhausted", "Connection refused"

**Diagnosis**:
```bash
# Check connection pool usage
kubectl exec -n teei-production deployment/prod-teei-unified-profile -- \
  node -e "console.log(require('./dist/db').getPoolStats())"

# Test database connectivity
kubectl run -n teei-production db-test --rm -it --restart=Never \
  --image=postgres:15 -- psql postgresql://user:pass@postgres-service:5432/db
```

**Solutions**:
- Scale up connection pool limits
- Check database server capacity
- Verify network policies allow traffic

#### 4. Secrets Not Available

**Symptoms**: Pods can't start, "Secret not found" errors

**Diagnosis**:
```bash
# Check Vault status
vault status

# Verify pod can authenticate to Vault
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  env | grep VAULT
```

**Solutions**:
- Verify Vault is running and accessible
- Check service account annotations
- Verify Vault policies are correct

#### 5. High Latency

**Symptoms**: Requests taking > 2 seconds, timeouts

**Diagnosis**:
```bash
# Check resource usage
kubectl top pods -n teei-production

# Check HPA status
kubectl get hpa -n teei-production
```

**Solutions**:
- Scale up replicas (HPA or manual)
- Optimize database queries
- Check network latency between services
- Review application logs for slow operations

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Infrastructure Lead | [Name] | [Email/Phone] |
| Platform Architect | [Name] | [Email/Phone] |
| Database Admin | [Name] | [Email/Phone] |
| Security Lead | [Name] | [Email/Phone] |
| Product Owner | [Name] | [Email/Phone] |

**PagerDuty**: [PagerDuty service URL]
**Slack Channel**: `#teei-production-incidents`
**Status Page**: https://status.teei.example.com

---

## Appendix

### A. Useful Commands

```bash
# Get all resources in namespace
kubectl get all -n teei-production

# Describe deployment
kubectl describe deployment -n teei-production prod-teei-api-gateway

# View recent events
kubectl get events -n teei-production --sort-by='.lastTimestamp'

# Port-forward to service
kubectl port-forward -n teei-production svc/prod-teei-api-gateway 8080:80

# Execute command in pod
kubectl exec -it -n teei-production deployment/prod-teei-api-gateway -- sh

# View logs (last 100 lines)
kubectl logs -n teei-production deployment/prod-teei-api-gateway --tail=100

# Follow logs in real-time
kubectl logs -f -n teei-production deployment/prod-teei-api-gateway

# Scale deployment
kubectl scale deployment -n teei-production prod-teei-api-gateway --replicas=5

# Get resource usage
kubectl top pods -n teei-production
kubectl top nodes
```

### B. Environment Variables Reference

See individual service documentation for complete environment variable lists.

**Common Variables**:
- `NODE_ENV`: `production`
- `LOG_LEVEL`: `warn` (production), `info` (staging), `debug` (development)
- `PORT`: Service-specific (3000-3014, 4321 for frontend)

**Secrets (from Vault)**:
- `JWT_SECRET`: JWT signing key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string (optional)
- `OPENAI_API_KEY`: OpenAI API key (Q2Q service)

### C. Database Schema Versions

Track schema versions in this table after each migration:

| Version | Date | Migration | Notes |
|---------|------|-----------|-------|
| v1.0.0 | 2025-11-14 | Initial schema | Baseline production schema |

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-14 | Infrastructure Team | Initial production runbook |
