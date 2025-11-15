# Rollback Runbook

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**Target Time:** < 5 minutes
**Severity:** Critical

---

## Table of Contents

1. [When to Rollback](#when-to-rollback)
2. [Quick Rollback (Method 1)](#quick-rollback-method-1)
3. [Selective Rollback (Method 2)](#selective-rollback-method-2)
4. [Full Restore from Backup (Method 3)](#full-restore-from-backup-method-3)
5. [Database Rollback](#database-rollback)
6. [Post-Rollback Verification](#post-rollback-verification)
7. [Post-Mortem](#post-mortem)

---

## When to Rollback

### Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLLBACK DECISION TREE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  All health checks failing?                    → ROLLBACK   │
│  │                                                           │
│  ├─ Error rate > 20%?                          → ROLLBACK   │
│  │                                                           │
│  ├─ Error rate 10-20%?                                      │
│  │  ├─ Investigate 5 min → Still high?         → ROLLBACK   │
│  │  └─ Resolved?                                → MONITOR   │
│  │                                                           │
│  ├─ Error rate 5-10%?                           → MONITOR   │
│  │  └─ Increasing trend?                        → ROLLBACK   │
│  │                                                           │
│  ├─ Single service failing?                                 │
│  │  ├─ Critical service (api-gateway)?          → ROLLBACK   │
│  │  ├─ Non-critical service (discord-bot)?      → ROLLBACK   │
│  │  └─ Service only                                         │
│  │                                                           │
│  ├─ Database migration failed?                              │
│  │  ├─ Data corrupted?                          → DR PLAN   │
│  │  └─ Schema inconsistent?                     → ROLLBACK   │
│  │                                                           │
│  ├─ P95 latency > 5s?                           → ROLLBACK   │
│  │                                                           │
│  ├─ Customer impact reported?                               │
│  │  ├─ SEV-1 (service down)?                    → ROLLBACK   │
│  │  └─ SEV-2 (degraded)?                        → MONITOR   │
│  │                                                           │
│  └─ Security vulnerability discovered?          → CONSULT   │
│     └─ CTO approval required                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Severity Matrix

| Condition | Action | Time to Act |
|-----------|--------|-------------|
| All health checks failing | **IMMEDIATE ROLLBACK** | < 2 minutes |
| Error rate > 20% | **ROLLBACK** | < 5 minutes |
| Error rate 10-20% | **Investigate, then ROLLBACK** | 5 minutes investigation |
| Error rate 5-10% | **MONITOR** | Watch for 15 minutes |
| Single critical service down | **ROLLBACK** | < 5 minutes |
| Database migration failed | **STOP DEPLOYMENT, ASSESS** | Consult DBA |
| Customer SEV-1 incident | **ROLLBACK** | < 5 minutes |

---

## Quick Rollback (Method 1)

**When to use:** Most common rollback scenario
**Time:** 2-4 minutes
**Risk:** Low (uses Kubernetes native rollback)

### Step 1: Declare Incident (30 seconds)

```bash
# Post to Slack
# #platform-incidents channel:
# "🚨 ROLLBACK INITIATED - Production deployment failed
#  Reason: [error rate/health checks/customer impact]
#  Operator: [your name]
#  Time: [current time]"

# Optional: Create PagerDuty incident
curl -X POST https://api.pagerduty.com/incidents \
  -H "Authorization: Token ${PAGERDUTY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "type": "incident",
      "title": "Production Rollback in Progress",
      "service": {"id": "PXXX", "type": "service_reference"},
      "urgency": "high"
    }
  }'
```

### Step 2: Execute Rollback (2-3 minutes)

```bash
# Set environment
export KUBECONFIG=~/.kube/config-production
export NAMESPACE=teei-production

# Rollback ALL deployments (parallel execution)
echo "Rolling back all deployments..."
for deployment in $(kubectl get deployment -n ${NAMESPACE} -o name); do
  kubectl rollout undo $deployment -n ${NAMESPACE} &
done
wait

# Wait for rollback to complete
echo "Waiting for rollback to complete..."
kubectl rollout status deployment -n ${NAMESPACE} --timeout=3m

# Verify rollback
kubectl get deployments -n ${NAMESPACE}
```

### Step 3: Quick Verification (1 minute)

```bash
# Check pod health
kubectl get pods -n ${NAMESPACE} | grep -v Running

# Test health endpoint
GATEWAY_IP=$(kubectl get svc -n ${NAMESPACE} prod-teei-api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -f http://${GATEWAY_IP}/health && echo "✅ Health check passed"

# Check error rate in Grafana
# URL: http://grafana.example.com/d/http-overview
```

---

## Selective Rollback (Method 2)

**When to use:** Only specific services are failing
**Time:** 1-2 minutes
**Risk:** Low

### Identify Failed Service

```bash
# Check deployment status
kubectl get deployments -n ${NAMESPACE}

# Check recent events for specific service
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | grep api-gateway

# View logs
kubectl logs -n ${NAMESPACE} deployment/prod-teei-api-gateway --tail=50
```

### Rollback Single Service

```bash
# Rollback specific deployment
export SERVICE=api-gateway  # Change to failed service

kubectl rollout undo deployment/prod-teei-${SERVICE} -n ${NAMESPACE}

# Monitor rollback
kubectl rollout status deployment/prod-teei-${SERVICE} -n ${NAMESPACE}

# Verify
kubectl get pods -n ${NAMESPACE} -l app=teei-${SERVICE}
```

### Common Service Dependencies

**Critical services** (rollback immediately):
- `api-gateway` - All traffic routes through this
- `unified-profile` - Authentication/authorization
- `analytics` - Core reporting
- `reporting` - Report generation

**Non-critical services** (can tolerate brief downtime):
- `discord-bot` - Notification delays acceptable
- `buddy-connector` - Partner integration
- `upskilling-connector` - Partner integration

---

## Full Restore from Backup (Method 3)

**When to use:** Quick rollback failed or deployment backup exists
**Time:** 3-5 minutes
**Risk:** Medium (requires backup exists)

### Prerequisites

Deployment backup should have been created during deployment:
```bash
# Backup location: /tmp/deployment-backup-YYYYMMDD-HHMMSS.yaml
```

### Step 1: Locate Backup (30 seconds)

```bash
# Find most recent backup
ls -lt /tmp/deployment-backup-*.yaml | head -1

# Or from GitHub Actions artifacts
gh run download --name deployment-backup
```

### Step 2: Restore from Backup (2-3 minutes)

```bash
export BACKUP_FILE=/tmp/deployment-backup-20251114-120000.yaml

# Validate backup file
kubectl apply --dry-run=server -f ${BACKUP_FILE}

# Apply backup
kubectl apply -f ${BACKUP_FILE}

# Wait for restoration
kubectl rollout status deployment -n ${NAMESPACE} --timeout=5m
```

### Step 3: Verify Restoration (1 minute)

```bash
# Compare image tags with backup
kubectl get deployment -n ${NAMESPACE} prod-teei-api-gateway \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Expected: Should match pre-deployment version
```

---

## Database Rollback

**WARNING:** Database rollbacks are complex and may cause data loss. Always consult DBA first.

### Decision Tree for DB Rollback

```
Database migration failed?
├─ Schema changes only (no data loss)?
│  └─ Run rollback migration → Safe
│
├─ Data corrupted?
│  └─ Restore from backup → DATA LOSS (since backup)
│
├─ New columns added (backward compatible)?
│  └─ No rollback needed → Application rollback is sufficient
│
└─ Columns removed/altered?
   └─ Restore from backup → Coordinate with DBA
```

### Method 1: Rollback Migration (Safe)

**When to use:** Migration has rollback script available

```bash
# Check if rollback migration exists
ls /home/user/TEEI-CSR-Platform/packages/shared-schema/migrations/rollback/

# Run rollback migration
export DB_URL="postgresql://teei:${DB_PASSWORD}@db-host:5432/teei_platform"

psql ${DB_URL} -f /home/user/TEEI-CSR-Platform/packages/shared-schema/migrations/rollback/XXXX_rollback.sql

# Verify schema state
psql ${DB_URL} -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Method 2: Restore from Backup (DANGEROUS)

**When to use:** Data corruption or irreversible migration
**Risk:** HIGH - All data since backup will be lost

```bash
# 1. STOP ALL SERVICES (prevent writes)
echo "⚠️  STOPPING ALL SERVICES - READ THIS CAREFULLY"
echo "This will cause DOWNTIME. Press Ctrl+C to abort."
sleep 5

kubectl scale deployment -n ${NAMESPACE} --replicas=0 --all

# 2. Wait for all pods to terminate
kubectl wait --for=delete pod --all -n ${NAMESPACE} --timeout=5m

# 3. Restore database (see disaster-recovery.md)
export BACKUP_FILE=/backups/teei_platform_2025-11-14T10-00-00.sql.gz

gunzip -c ${BACKUP_FILE} | psql ${DB_URL}

# 4. Verify restoration
psql ${DB_URL} -c "SELECT COUNT(*) FROM users;"

# 5. Restart services with OLD version
kubectl scale deployment -n ${NAMESPACE} --replicas=3 --all

# 6. Monitor recovery
kubectl get pods -n ${NAMESPACE} -w
```

---

## Post-Rollback Verification

**Target Time:** 3-5 minutes

### 1. Service Health (1 minute)

```bash
# Check all pods are running
kubectl get pods -n ${NAMESPACE}

# Verify no crash loops
kubectl get pods -n ${NAMESPACE} -o json | \
  jq -r '.items[] | select(.status.containerStatuses[0].restartCount > 0) | .metadata.name'

# Test health endpoints
for service in api-gateway unified-profile analytics reporting; do
  kubectl exec -n ${NAMESPACE} deployment/prod-teei-api-gateway -- \
    wget -q -O- http://prod-teei-${service}/health | jq '.status'
done
```

### 2. Critical User Flows (2 minutes)

```bash
GATEWAY_URL=$(kubectl get svc -n ${NAMESPACE} prod-teei-api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test authentication
TOKEN=$(curl -X POST http://${GATEWAY_URL}/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"healthcheck@teei.example.com","password":"${HEALTHCHECK_PASSWORD}"}' \
  -s | jq -r '.token')

echo "Token obtained: ${TOKEN:0:20}..."

# Test profile retrieval
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/profiles/me -s | jq '.email'

# Test metrics endpoint
curl -H "Authorization: Bearer ${TOKEN}" \
  http://${GATEWAY_URL}/api/v1/metrics/test-company-123 -s | jq '.totalEmployees'
```

### 3. Monitoring (1 minute)

```bash
# Check Grafana dashboards
# URL: http://grafana.example.com

# Expected metrics:
# - Error rate < 1%
# - P95 latency < 2s
# - Request rate restored to baseline
```

### 4. Database Integrity (1 minute)

```bash
# Verify database connection
kubectl exec -n ${NAMESPACE} deployment/prod-teei-unified-profile -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT COUNT(*) FROM users', (err, res) => {
      if (err) { console.error('DB ERROR:', err); process.exit(1); }
      console.log('User count:', res.rows[0].count);
      process.exit(0);
    });
  "

# Check critical tables
psql ${DB_URL} << EOF
SELECT 'users' as table, COUNT(*) as count FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'metrics', COUNT(*) FROM metrics;
EOF
```

---

## Post-Mortem

### Immediate Actions (Within 1 hour)

```bash
# 1. Update status page
# Status: "Incident resolved - Services restored"

# 2. Notify stakeholders
# Slack #announcements:
# "✅ Production rollback completed successfully
#  All services restored to previous version
#  Root cause under investigation
#  No data loss occurred"

# 3. Collect incident data
kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' > /tmp/incident-events.txt
kubectl logs -n ${NAMESPACE} deployment/prod-teei-api-gateway --since=1h > /tmp/incident-logs.txt

# 4. Document timeline
cat > /tmp/incident-timeline.txt << EOF
Incident Timeline - $(date)
----------------------------
Deployment started: [TIME]
Issue detected: [TIME]
Rollback initiated: [TIME]
Rollback completed: [TIME]
Services verified: [TIME]
Total duration: [DURATION]

Root Cause:
[DESCRIPTION]

Impact:
- Error rate: [PEAK]%
- Duration: [MINUTES]
- Users affected: [ESTIMATE]

Resolution:
Rolled back to version: [VERSION]
EOF
```

### Follow-up Actions (Within 24 hours)

1. **Schedule post-mortem meeting**
   - Include: Engineering lead, DevOps, Product owner
   - Review: Timeline, root cause, action items

2. **Create GitHub issue**
   ```bash
   gh issue create \
     --title "Post-mortem: Production rollback on $(date +%Y-%m-%d)" \
     --body "See /tmp/incident-timeline.txt for details" \
     --label "incident,post-mortem" \
     --assignee @infrastructure-lead
   ```

3. **Update runbooks** (if new issues discovered)
   - Document new failure modes
   - Add to troubleshooting section
   - Update decision tree

4. **Action items**
   - [ ] Identify root cause
   - [ ] Create fix branch
   - [ ] Add regression tests
   - [ ] Re-test in staging
   - [ ] Schedule new deployment

---

## Rollback Scripts

### One-Command Rollback (Emergency)

Save this script as `/usr/local/bin/teei-rollback`:

```bash
#!/bin/bash
set -euo pipefail

# TEEI Emergency Rollback Script
# Usage: teei-rollback [production|staging]

ENV=${1:-production}
NAMESPACE=teei-${ENV}
export KUBECONFIG=~/.kube/config-${ENV}

echo "🚨 EMERGENCY ROLLBACK - Environment: ${ENV}"
echo "This will rollback ALL deployments to previous version"
read -p "Type 'ROLLBACK' to confirm: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
  echo "Aborted."
  exit 1
fi

echo "Starting rollback..."

# Post to Slack
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"🚨 ROLLBACK INITIATED by $(whoami) on ${ENV}\"}"

# Execute rollback
for deployment in $(kubectl get deployment -n ${NAMESPACE} -o name); do
  echo "Rolling back $deployment..."
  kubectl rollout undo $deployment -n ${NAMESPACE} &
done
wait

# Wait for completion
kubectl rollout status deployment -n ${NAMESPACE} --timeout=5m

# Verify
NOT_READY=$(kubectl get pods -n ${NAMESPACE} --field-selector=status.phase!=Running --no-headers | wc -l)
if [ "$NOT_READY" -gt "0" ]; then
  echo "❌ ROLLBACK FAILED - $NOT_READY pods not running"
  kubectl get pods -n ${NAMESPACE}
  exit 1
fi

echo "✅ ROLLBACK COMPLETE - All services restored"

# Post success to Slack
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"✅ ROLLBACK COMPLETE on ${ENV} - All services healthy\"}"
```

### Make it executable:
```bash
chmod +x /usr/local/bin/teei-rollback
```

### Usage:
```bash
# Production rollback
teei-rollback production

# Staging rollback
teei-rollback staging
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                   ROLLBACK QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────┤
│ When to Rollback:                                           │
│  • Error rate > 20%                → IMMEDIATE              │
│  • All health checks failing       → IMMEDIATE              │
│  • Customer SEV-1 incident         → < 5 minutes            │
│                                                             │
│ Quick Rollback (2-4 min):                                   │
│  export NAMESPACE=teei-production                           │
│  for d in $(kubectl get deploy -n $NAMESPACE -o name); do  │
│    kubectl rollout undo $d -n $NAMESPACE &                  │
│  done; wait                                                 │
│  kubectl rollout status deploy -n $NAMESPACE                │
│                                                             │
│ Verify:                                                     │
│  kubectl get pods -n $NAMESPACE                             │
│  curl http://<gateway-ip>/health                            │
│                                                             │
│ Emergency Script:                                           │
│  teei-rollback production                                   │
│                                                             │
│ Emergency Contact:                                          │
│  PagerDuty: Alert on-call engineer                         │
│  Slack: #platform-incidents                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix: Rollback Time Estimates

| Rollback Method | Time | Complexity | Risk |
|----------------|------|------------|------|
| Quick rollback (all services) | 2-4 min | Low | Low |
| Selective rollback (one service) | 1-2 min | Low | Low |
| Full restore from backup | 3-5 min | Medium | Medium |
| Database rollback (migration) | 2-3 min | Medium | Medium |
| Database restore (from backup) | 10-30 min | High | High |

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-14 | Initial rollback runbook |

**Related Runbooks:**
- [Deployment Runbook](./deployment.md)
- [Disaster Recovery Runbook](./disaster-recovery.md)
