# Deployment Rollback Runbook

Step-by-step guide for rolling back a failed deployment.

## Quick Reference

**Detect issue → Stop rollout → Rollback → Verify → Document**

## When to Rollback

Rollback immediately if new deployment causes:

- **SEV-1 incident** - Complete service outage
- **High error rate** - 5xx errors >5%
- **Performance degradation** - Latency >3x normal
- **Data corruption** - Any data integrity issues
- **Security vulnerability** - Exposed credentials, auth bypass

Do NOT rollback for:

- Minor bugs (can be fixed forward)
- Cosmetic issues
- Non-critical features broken
- Expected behavior changes (need communication, not rollback)

## Prerequisites

- kubectl access to cluster
- Knowledge of what was deployed
- Access to deployment history

## Rollback Methods

### Method 1: Automated Rollback (Recommended)

Use the automated rollback workflow:

```bash
# Trigger rollback workflow
gh workflow run rollback.yml \
  --ref main \
  -f service=api-gateway \
  -f reason="High error rate after v1.2.3 deployment"

# Or use curl
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/teei-csr/platform/actions/workflows/rollback.yml/dispatches \
  -d '{"ref":"main","inputs":{"service":"api-gateway","reason":"High error rate"}}'
```

See: `.github/workflows/rollback.yml`

### Method 2: Manual Rollback (If automation fails)

```bash
# 1. Stop ongoing rollout (if still deploying)
kubectl rollout pause deployment/<service> -n teei-csr

# 2. View rollout history
kubectl rollout history deployment/<service> -n teei-csr

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Deploy v1.2.2 - Add caching
# 3         Deploy v1.2.3 - Fix auth bug

# 3. Rollback to previous version
kubectl rollout undo deployment/<service> -n teei-csr

# Or rollback to specific revision
kubectl rollout undo deployment/<service> -n teei-csr --to-revision=2

# 4. Monitor rollback progress
kubectl rollout status deployment/<service> -n teei-csr

# 5. Verify pods are running
kubectl get pods -n teei-csr -l app=<service>
```

### Method 3: Rollback Script

Use the provided rollback script:

```bash
# Rollback single service
./scripts/rollback/rollback-deployment.sh api-gateway

# Rollback to specific revision
./scripts/rollback/rollback-deployment.sh api-gateway --revision=2

# Dry-run (preview what would happen)
./scripts/rollback/rollback-deployment.sh api-gateway --dry-run
```

See: `scripts/rollback/rollback-deployment.sh`

## Step-by-Step Rollback

### Step 1: Detect Deployment Issue (0-5 minutes)

**Symptoms**:
- Synthetic monitoring alerts
- Error rate spike in Grafana
- User reports
- PagerDuty alerts

**Verify issue is deployment-related**:

```bash
# Check when deployment happened
kubectl rollout history deployment/<service> -n teei-csr

# Check pod start times
kubectl get pods -n teei-csr -l app=<service> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.startTime}{"\n"}{end}'

# Check error rate timeline
# If error spike aligns with deployment → likely deployment issue
```

### Step 2: Stop Rollout (5-10 minutes)

If deployment is still in progress:

```bash
# Pause rollout (stops creating new pods)
kubectl rollout pause deployment/<service> -n teei-csr

# Check status
kubectl rollout status deployment/<service> -n teei-csr
```

This prevents more bad pods from being created while you assess.

### Step 3: Notify Team (5-10 minutes)

```
Post in #incident-response:

🔄 ROLLBACK IN PROGRESS
Service: <service-name>
Deployment: v1.2.3
Reason: <issue description>
Severity: SEV-X
Rolling back to: Previous version
ETA: 5 minutes
On-call: @engineer
```

Update status page if SEV-1 or SEV-2:

```
We have identified an issue with a recent deployment.
We are rolling back to the previous stable version.
Expected resolution: 10 minutes.
```

### Step 4: Execute Rollback (10-15 minutes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/<service> -n teei-csr

# Watch rollback progress
kubectl rollout status deployment/<service> -n teei-csr --watch

# Expected output:
# Waiting for deployment "<service>" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "<service>" rollout to finish: 2 out of 3 new replicas have been updated...
# Waiting for deployment "<service>" rollout to finish: 3 out of 3 new replicas have been updated...
# deployment "<service>" successfully rolled out
```

**Monitor during rollback**:

```bash
# Watch pod status
watch 'kubectl get pods -n teei-csr -l app=<service>'

# Watch logs for errors
kubectl logs -n teei-csr -l app=<service> --tail=50 --follow
```

### Step 5: Verify Rollback (15-20 minutes)

Run verification script:

```bash
# Automated verification
./scripts/rollback/verify-rollback.sh <service>
```

Or manual verification:

```bash
# 1. Check all pods are running
kubectl get pods -n teei-csr -l app=<service>
# All should be "Running" with 0 restarts

# 2. Check pod version
kubectl get pods -n teei-csr -l app=<service> -o jsonpath='{.items[0].spec.containers[0].image}'
# Should be previous version tag

# 3. Test health endpoint
kubectl exec -it -n teei-csr <pod> -- curl http://localhost:3000/health
# Should return 200 OK

# 4. Run synthetic checks
./scripts/synthetics/uptime-probe.sh
./scripts/synthetics/login-flow.spec.ts

# 5. Check metrics
# - Error rate back to <0.5%
# - Latency back to <500ms
# - No new errors in logs

# 6. Smoke tests
pnpm test:smoke
```

### Step 6: Resume Traffic (20-25 minutes)

If rollout was paused:

```bash
# Resume deployment (uses rolled-back version)
kubectl rollout resume deployment/<service> -n teei-csr
```

### Step 7: Update Status Page (25-30 minutes)

```
Update incident:

The issue has been resolved by rolling back to the previous version.
All systems are now operating normally.
We will investigate the root cause and share findings.
```

### Step 8: Document Incident (30+ minutes)

Create postmortem:

```markdown
# Postmortem: <service> v1.2.3 Deployment Rollback

## Summary
Deployment of v1.2.3 caused high error rate. Rolled back to v1.2.2.

## Timeline
- 14:30 UTC - v1.2.3 deployed
- 14:35 UTC - Error rate spike detected
- 14:40 UTC - Rollback initiated
- 14:45 UTC - Rollback complete
- 14:50 UTC - Verified resolution

## Root Cause
[To be investigated]

## Impact
- Duration: 20 minutes
- Error rate: 15% (normally <0.5%)
- Users affected: ~500

## What Went Well
- Quick detection via synthetic monitoring
- Rollback completed in 5 minutes
- No data loss

## What Went Wrong
- Issue not caught in staging
- No canary deployment
- Missing E2E test coverage

## Action Items
- [ ] Investigate root cause of v1.2.3 failure
- [ ] Add E2E test to prevent recurrence
- [ ] Implement canary deployments
- [ ] Improve staging environment parity
```

## Rollback Scenarios

### Scenario 1: API Gateway Rollback

```bash
# Rollback API Gateway
kubectl rollout undo deployment/api-gateway -n teei-csr

# Verify
curl https://api.teei-csr.com/health
./scripts/synthetics/uptime-probe.sh
```

### Scenario 2: Frontend (Cockpit) Rollback

```bash
# Rollback frontend
kubectl rollout undo deployment/corp-cockpit-astro -n teei-csr

# Verify
curl https://cockpit.teei-csr.com/health
./scripts/synthetics/login-flow.spec.ts
```

### Scenario 3: Database Migration Rollback

**WARNING**: Database rollbacks are dangerous!

```bash
# 1. Stop all services writing to database
kubectl scale deployment/api-gateway -n teei-csr --replicas=0
kubectl scale deployment/reporting -n teei-csr --replicas=0

# 2. Rollback migration
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  -- Run down migration
  DELETE FROM schema_migrations WHERE version = '20251115_add_new_column';
  ALTER TABLE organizations DROP COLUMN new_column;
"

# 3. Rollback application code
kubectl rollout undo deployment/api-gateway -n teei-csr

# 4. Resume services
kubectl scale deployment/api-gateway -n teei-csr --replicas=3
kubectl scale deployment/reporting -n teei-csr --replicas=2
```

### Scenario 4: Multi-Service Rollback

If deployment affected multiple services:

```bash
# Rollback all affected services
for service in api-gateway reporting impact-calculator; do
  echo "Rolling back $service..."
  kubectl rollout undo deployment/$service -n teei-csr
  kubectl rollout status deployment/$service -n teei-csr
done

# Verify all
./scripts/synthetics/uptime-probe.sh
```

### Scenario 5: ConfigMap/Secret Change Rollback

```bash
# ConfigMap changes don't have rollout history
# You need to manually revert

# 1. Get ConfigMap history from git
git log --oneline -- k8s/base/<service>/configmap.yaml

# 2. Checkout previous version
git show <commit-hash>:k8s/base/<service>/configmap.yaml > /tmp/configmap.yaml

# 3. Apply previous ConfigMap
kubectl apply -f /tmp/configmap.yaml

# 4. Restart pods to pick up old config
kubectl rollout restart deployment/<service> -n teei-csr
```

## Troubleshooting Rollback

### Rollback is slow

```bash
# Check if PodDisruptionBudget is blocking
kubectl get pdb -n teei-csr

# Temporarily delete PDB if needed (emergency only)
kubectl delete pdb <service>-pdb -n teei-csr

# Force delete stuck pods
kubectl delete pod <pod-name> -n teei-csr --grace-period=0 --force
```

### Rollback fails with "revision not found"

```bash
# Check available revisions
kubectl rollout history deployment/<service> -n teei-csr

# If no history, manually deploy previous version
kubectl set image deployment/<service> -n teei-csr \
  <container-name>=ghcr.io/teei-csr/<service>:<previous-tag>
```

### New pods won't start after rollback

```bash
# Check pod events
kubectl describe pod <pod-name> -n teei-csr

# Common issues:
# - ImagePullBackOff: Image was deleted/doesn't exist
# - CrashLoopBackOff: Pod crashes on startup (check logs)
# - Pending: Not enough resources (scale down other services)
```

## Prevention

### Pre-Deployment Checks

Before every deployment:

- [ ] E2E tests passing
- [ ] Load tests passing
- [ ] Security scan passing
- [ ] Database migrations tested
- [ ] Rollback plan documented

### Deployment Best Practices

1. **Canary deployments**: Deploy to 10% of pods first
2. **Feature flags**: Toggle new features on/off without deployment
3. **Blue-green deployments**: Run old and new versions side-by-side
4. **Automated rollback**: Trigger rollback on high error rate
5. **Deployment windows**: Deploy during low-traffic hours

### Rollback Drills

Run monthly rollback drills:

```bash
# Simulate deployment issue
kubectl set image deployment/api-gateway -n teei-csr api-gateway=bad-image:latest

# Practice rollback
./scripts/rollback/rollback-deployment.sh api-gateway

# Verify
./scripts/rollback/verify-rollback.sh api-gateway

# Document time to rollback
```

See: `docs/pilot/rollback_drill.md`

## Automated Rollback Triggers

Configure automated rollback based on metrics:

```yaml
# .github/workflows/rollback.yml
# Triggers automatic rollback if:
# - Error rate >5% for 5 minutes
# - Latency P95 >3000ms for 5 minutes
# - Health checks failing for 2 minutes
# - Synthetic checks failing 3 times in a row
```

## Communication Templates

### Rollback Announcement

```
#incident-response

🔄 ROLLBACK INITIATED

Service: api-gateway
Version: v1.2.3 → v1.2.2
Reason: High error rate (15%)
Severity: SEV-2
Initiated by: @engineer
Status: In progress
ETA: 5 minutes

Next update in 5 minutes.
```

### Rollback Complete

```
#incident-response

✅ ROLLBACK COMPLETE

Service: api-gateway
Version: v1.2.2 (stable)
Duration: 5 minutes
Metrics: All green ✓
Synthetics: Passing ✓

Incident resolved. Postmortem in 24h.
```

## Rollback Metrics

Track these metrics:

- **Rollback frequency**: Rollbacks per month
- **Time to rollback**: From detection to complete
- **Rollback success rate**: % of successful rollbacks
- **Mean time to detect (MTTD)**: How fast we detect issues
- **Mean time to rollback (MTTR)**: How fast we rollback

**Goal**: <5% of deployments require rollback, <10 minutes to complete rollback

## Related Documentation

- [Incident Response](./incident_response.md)
- [Deployment Runbook](../../PROD_DEPLOY_RUNBOOK.md)
- [Rollback Drill Log](../rollback_drill.md)
- [CI/CD Workflows](../../../.github/workflows/)
