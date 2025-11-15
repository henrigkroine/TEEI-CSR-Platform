# Monthly Operational Readiness Drill Script

## Overview
Monthly drill to validate operational readiness, incident response, and disaster recovery capabilities.

**Frequency**: Monthly (first Tuesday of each month)
**Duration**: 2-3 hours
**Participants**: Platform Team, Security Team, Tech Lead, On-Call Engineer

---

## Pre-Drill Checklist (1 week before)
- [ ] Schedule drill on team calendar
- [ ] Notify all participants
- [ ] Choose drill scenario (rotate monthly)
- [ ] Prepare staging environment
- [ ] Notify stakeholders (no impact to production)
- [ ] Create drill ticket in Jira

---

## Drill Scenarios (Rotate Monthly)

### Month 1: Database Failure & Restore
Test database backup and restore procedures

### Month 2: Bad Deployment Rollback
Test deployment rollback procedures

### Month 3: Security Incident Response
Test security incident detection and response

### Month 4: Regional Failover
Test multi-region failover capabilities

### Month 5: Key Rotation
Test encryption key rotation procedures

### Month 6: Full Disaster Recovery
Test complete infrastructure rebuild from backups

---

## Drill Script: Database Failure & Restore

### Setup (15 minutes)
1. **Create baseline in staging**
   ```bash
   # Verify staging database is healthy
   kubectl exec -it deployment/api-gateway -n teei-staging -- \
     psql $DATABASE_URL -c "SELECT count(*) FROM users;"

   # Record baseline metrics
   echo "Baseline user count: [X]"
   ```

2. **Insert test data**
   ```bash
   # Create test records
   kubectl exec -it deployment/api-gateway -n teei-staging -- \
     psql $DATABASE_URL -c "INSERT INTO users (id, email, first_name) VALUES (gen_random_uuid(), 'drill-test@example.com', 'Drill Test');"
   ```

### Execution (60 minutes)

#### Phase 1: Simulate Failure (15 minutes)
```bash
# Simulate database corruption by stopping writes
kubectl scale statefulset/postgresql --replicas=0 -n teei-staging

# Verify services detect the failure
kubectl logs -n teei-staging -l app=api-gateway --tail=50 | grep -i "database"

# Check alert triggers
# Expected: DatabaseDown alert in Prometheus
```

**Timed Checkpoint 1**: Did alerts fire within 2 minutes? ⏱️ _____

#### Phase 2: Identify Backup (10 minutes)
```bash
# List recent backups
# Production command (example - adapt to your backup system):
aws s3 ls s3://teei-db-backups/staging/ --recursive | tail -10

# OR for managed databases:
# gcloud sql backups list --instance=teei-staging-db

# Identify most recent valid backup
BACKUP_ID="[backup-timestamp]"
echo "Selected backup: $BACKUP_ID"
```

**Timed Checkpoint 2**: Backup identified within 10 minutes? ⏱️ _____

#### Phase 3: Restore Database (30 minutes)
```bash
# Create new database instance from backup
# Example for managed DB:
# gcloud sql instances create teei-staging-db-restore \
#   --backup=$BACKUP_ID \
#   --tier=db-n1-standard-2

# Update connection strings
kubectl set env deployment/api-gateway -n teei-staging \
  DATABASE_URL="postgresql://[new-connection-string]"

# Wait for pods to restart
kubectl rollout status deployment/api-gateway -n teei-staging
```

#### Phase 4: Verify Recovery (5 minutes)
```bash
# Check data integrity
kubectl exec -it deployment/api-gateway -n teei-staging -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# Compare to baseline
# Verify test data exists
kubectl exec -it deployment/api-gateway -n teei-staging -- \
  psql $DATABASE_URL -c "SELECT * FROM users WHERE email='drill-test@example.com';"

# Run validation queries
kubectl exec -it deployment/api-gateway -n teei-staging -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM companies;"
```

**Timed Checkpoint 3**: RTO (Recovery Time Objective) met? Target: 4 hours, Actual: ⏱️ _____

**RPO (Recovery Point Objective) met?** Target: < 15 minutes data loss ✓/✗

### Debrief (30 minutes)
- **What went well?**
- **What could be improved?**
- **Action items**
- **Runbook updates needed**

---

## Drill Script: Bad Deployment Rollback

### Setup (10 minutes)
1. **Deploy test version to staging**
   ```bash
   # Deploy "bad" version (intentionally degraded performance)
   kubectl set image deployment/api-gateway \
     api-gateway=ghcr.io/teei/api-gateway:bad-deploy-test \
     -n teei-staging
   ```

### Execution (30 minutes)

#### Phase 1: Detection (5 minutes)
```bash
# Monitor error rate spike
watch "kubectl logs -n teei-staging -l app=api-gateway --tail=20 | grep -i error | wc -l"

# Check Prometheus for alert
# Expected: HighErrorRate alert within 5 minutes
```

**Timed Checkpoint 1**: Detected within 5 minutes? ⏱️ _____

#### Phase 2: Decision & Communication (5 minutes)
```bash
# Post in #incidents (simulate)
echo "🚨 Bad deploy detected - rolling back"

# Update StatusPage (simulate)
echo "StatusPage: Investigating service degradation"
```

#### Phase 3: Rollback (5 minutes)
```bash
# Execute rollback
kubectl rollout undo deployment/api-gateway -n teei-staging

# Monitor rollback
kubectl rollout status deployment/api-gateway -n teei-staging -w
```

**Timed Checkpoint 2**: Rollback initiated within 5 minutes of detection? ⏱️ _____

#### Phase 4: Verification (5 minutes)
```bash
# Verify error rate returns to normal
kubectl logs -n teei-staging -l app=api-gateway --tail=50 | grep -i error

# Test endpoints
curl -v https://staging.teei.com/health
```

**Timed Checkpoint 3**: Service restored within 10 minutes total? ⏱️ _____

### Debrief (10 minutes)

---

## Drill Script: Security Incident Response

### Setup (10 minutes)
1. **Inject simulated threat indicators**
   ```bash
   # Create simulated suspicious access logs
   kubectl exec -it deployment/api-gateway -n teei-staging -- \
     curl -H "X-Forwarded-For: 192.0.2.1" \
     http://localhost:3000/api/users/1234/export

   # Repeat 100 times to trigger rate limit alert
   ```

### Execution (60 minutes)

#### Phase 1: Detection & Triage (15 minutes)
```bash
# Check SIEM for alerts
# Expected: Multiple failed access attempts from same IP

# Review audit logs
kubectl exec -it deployment/api-gateway -n teei-staging -- \
  psql $DATABASE_URL -c "SELECT * FROM audit_logs WHERE actor_ip='192.0.2.1' ORDER BY timestamp DESC LIMIT 10;"
```

**Assessment Questions**:
- [ ] Is this a real threat or false positive?
- [ ] What data was accessed?
- [ ] Is the attack ongoing?

#### Phase 2: Containment (15 minutes)
```bash
# Block suspicious IP
kubectl exec -it deployment/api-gateway -n teei-staging -- \
  iptables -A INPUT -s 192.0.2.1 -j DROP

# Rotate API keys if compromised (simulate)
# Force logout of affected users (simulate)
```

#### Phase 3: Investigation (20 minutes)
- Review full access logs
- Check for data exfiltration
- Identify attack vector
- Document timeline

#### Phase 4: Communication (10 minutes)
- Notify security team
- Update incident ticket
- Prepare customer communication (if needed)
- Regulatory notification assessment (GDPR Article 33)

### Debrief (30 minutes)

---

## Drill Recording Template

```markdown
# Drill Report: [Scenario Name]
**Date**: [YYYY-MM-DD]
**Participants**: [Names]
**Duration**: [X hours]

## Scenario
[Brief description]

## Objectives
- [ ] Objective 1
- [ ] Objective 2

## Timeline
| Time | Event | Status |
|------|-------|--------|
| 10:00 | Drill started | ✓ |
| 10:05 | Detection | ✓ |
| 10:15 | Rollback initiated | ✓ |
| 10:20 | Service restored | ✓ |

## Metrics
- **Detection Time**: 5 minutes (Target: < 5 min) ✓
- **Response Time**: 15 minutes (Target: < 30 min) ✓
- **Recovery Time**: 20 minutes (Target: < 4 hours) ✓

## What Went Well
-
-

## Areas for Improvement
-
-

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

## Runbook Updates Needed
-
-

## Evidence
- Screenshots: [link]
- Logs: [link]
- Metrics: [link]

## Approval
- Drill Facilitator: [Name] - [Signature/Date]
- Tech Lead: [Name] - [Signature/Date]
```

---

## Quarterly Schedule 2025

| Month | Scenario | Lead |
|-------|----------|------|
| January | Database Restore | DevOps |
| February | Deployment Rollback | Platform |
| March | Security Incident | Security |
| April | Regional Failover | DevOps |
| May | Key Rotation | Security |
| June | Full DR | Tech Lead |
| July | Database Restore | DevOps |
| August | Deployment Rollback | Platform |
| September | Security Incident | Security |
| October | Regional Failover | DevOps |
| November | Key Rotation | Security |
| December | Year-End Review | All |

---

## Evidence Collection

After each drill:
```bash
# Generate drill evidence
bash ops/compliance/evidence-collectors/incident-drill-collector.sh

# Store in SOC 2 bundle
mv reports/compliance/SOC2_BUNDLE/incident-drills/drill-$(date +%Y-%m).json \
   reports/compliance/SOC2_BUNDLE/incident-drills/
```

---

## Contacts
- **Drill Coordinator**: devops@teei.com
- **Platform Team**: #platform-team
- **Security Team**: security@teei.com
- **Tech Lead**: tech-lead@teei.com
