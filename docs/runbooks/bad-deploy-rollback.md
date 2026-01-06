# Bad Deploy Rollback Runbook

## Overview
Emergency rollback procedure for production deployments that cause incidents or degraded service.

**Target Time**: < 5 minutes from detection to rollback initiated
**Owner**: Platform Team
**On-Call**: PagerDuty escalation

---

## Detection

### Automatic Triggers
- Prometheus alert: `HighErrorRate` or `CriticalErrorRate`
- Sentry error spike (> 50 errors/minute)
- SLO burn rate alert (> 14.4x in 1 hour)
- Customer reports via StatusPage

### Manual Detection
- User reports via Slack `#incidents`
- Customer support tickets
- Monitoring dashboard anomalies

---

## Decision Tree

```
Is this a deployment-related issue?
├─ YES → Continue to Rollback
└─ NO  → Use Incident Response runbook
```

**Signs of deployment issue**:
- Issues started within 30 minutes of deployment
- Error logs reference new code
- Specific service showing degradation

---

## Rollback Procedure

### 1. Declare Incident (30 seconds)
```bash
# Post in Slack #incidents
/incident declare
Title: Bad deploy rollback - [service-name]
Severity: high
```

### 2. Identify Deployment (1 minute)
```bash
# Find recent deployments
kubectl rollout history deployment/[service-name] -n teei-production

# Check last deploy time
kubectl get deployment/[service-name] -n teei-production -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'

# View current image
kubectl get deployment/[service-name] -n teei-production -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### 3. Execute Rollback (1-2 minutes)

#### Option A: Kubernetes Rollout Undo (Fastest)
```bash
# Rollback to previous version
kubectl rollout undo deployment/[service-name] -n teei-production

# Watch rollout status
kubectl rollout status deployment/[service-name] -n teei-production -w

# Verify pods are healthy
kubectl get pods -n teei-production -l app=[service-name]
```

#### Option B: Git Revert + Redeploy
```bash
# Only if rollout undo doesn't work
cd /path/to/repo
git revert [bad-commit-sha]
git push origin main

# Trigger CI/CD pipeline
# Wait for deployment (typically 5-10 minutes)
```

#### Option C: Manual Image Rollback
```bash
# Set image to previous known-good version
kubectl set image deployment/[service-name] \
  [container-name]=ghcr.io/teei/[service-name]:[previous-tag] \
  -n teei-production

# Watch rollout
kubectl rollout status deployment/[service-name] -n teei-production -w
```

### 4. Verify Recovery (1 minute)
```bash
# Check error rate
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\",service=\"[service-name]\"}[5m])" | jq

# Check pod health
kubectl get pods -n teei-production -l app=[service-name]

# Check logs for errors
kubectl logs -n teei-production -l app=[service-name] --tail=50 | grep -i error

# Test critical endpoints
curl -v https://api.teei.com/health
```

### 5. Update StatusPage (ongoing)
```
- Initial: "We are investigating reports of [issue description]"
- Rollback: "We have identified the issue and are rolling back to restore service"
- Resolved: "Service has been restored. We will provide a postmortem within 48 hours"
```

### 6. Post-Rollback Actions (within 1 hour)
- [ ] Confirm metrics returned to baseline
- [ ] Review error logs from bad deploy
- [ ] Identify root cause
- [ ] Create postmortem ticket
- [ ] Update incident channel with summary
- [ ] Schedule postmortem meeting

---

## Service-Specific Rollback

### API Gateway
```bash
kubectl rollout undo deployment/api-gateway -n teei-production
kubectl rollout status deployment/api-gateway -n teei-production -w
```

### Privacy Orchestrator
```bash
# Stop accepting new jobs first
kubectl scale deployment/privacy-orchestrator --replicas=0 -n teei-production

# Rollback
kubectl rollout undo deployment/privacy-orchestrator -n teei-production

# Scale back up
kubectl scale deployment/privacy-orchestrator --replicas=3 -n teei-production
```

### Database Migrations
**⚠️ DO NOT ROLLBACK DATABASE MIGRATIONS ⚠️**
- Database rollbacks are complex and data-destructive
- Use forward fixes only
- Escalate to Tech Lead immediately
- See `database-migration-issues.md` runbook

---

## Rollback Script

Automated one-command rollback:

```bash
#!/bin/bash
# File: scripts/emergency-rollback.sh

SERVICE=$1
NAMESPACE=${2:-teei-production}

if [ -z "$SERVICE" ]; then
  echo "Usage: ./emergency-rollback.sh [service-name] [namespace]"
  exit 1
fi

echo "🚨 Emergency Rollback: $SERVICE in $NAMESPACE"
echo ""

# Rollback
echo "Rolling back deployment..."
kubectl rollout undo deployment/$SERVICE -n $NAMESPACE

# Wait
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/$SERVICE -n $NAMESPACE -w

# Verify
echo ""
echo "Verification:"
kubectl get pods -n $NAMESPACE -l app=$SERVICE
kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=10

echo ""
echo "✅ Rollback complete. Verify metrics in Grafana."
```

Usage:
```bash
./scripts/emergency-rollback.sh privacy-orchestrator
./scripts/emergency-rollback.sh api-gateway
```

---

## Communication Templates

### Slack #incidents
```
🚨 INCIDENT: Bad deploy detected - [service-name]
Status: Rollback in progress
Impact: [High error rate / Degraded service / Downtime]
ETA: 5 minutes
Incident Commander: @[name]
```

### StatusPage
```
Title: Service Degradation - [Service Name]
Status: Monitoring

We are currently experiencing [brief description of impact].
Our team has identified the issue and is actively working on a resolution.

Updates will be posted here as we have them.
```

---

## Escalation

If rollback doesn't resolve the issue within 10 minutes:
1. Escalate to Tech Lead
2. Consider full incident response
3. Check dependencies (database, Redis, external APIs)
4. Review recent infrastructure changes
5. Engage vendor support if third-party issue

---

## Post-Incident

Within 48 hours:
- [ ] Write postmortem (template: `docs/templates/postmortem.md`)
- [ ] Identify action items
- [ ] Update runbooks based on learnings
- [ ] Communicate to team and leadership

---

## Related Runbooks
- [Incident Response](./incident-response.md)
- [Database Issues](./database-issues.md)
- [Monitoring & Alerting](./monitoring-alerting.md)
- [Disaster Recovery](./disaster-recovery.md)

## Contacts
- **Platform Team**: #platform-team
- **On-Call**: PagerDuty
- **Tech Lead**: tech-lead@teei.com
- **Security**: security@teei.com
