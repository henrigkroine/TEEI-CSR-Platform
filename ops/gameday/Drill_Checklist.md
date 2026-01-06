# Disaster Recovery Drill Checklist

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: dr-gameday-lead

---

## Overview

This checklist ensures comprehensive preparation, execution, and post-drill activities for disaster recovery gameday drills. Print this document or open in a separate window during drills for real-time tracking.

---

## Pre-Drill Checklist (T-7 Days to T-1 Hour)

### T-7 Days: Planning & Communication

**Communication**:
- [ ] Send email notification to all engineering team members
- [ ] Post announcement in #engineering Slack channel
- [ ] Update company calendar with drill schedule
- [ ] Notify customer success team (for external communication)
- [ ] Draft customer notification email (if public drill)
- [ ] Update status page with "Scheduled Maintenance" notice

**Team Preparation**:
- [ ] Confirm drill roles and assignments
- [ ] Identify backup personnel for key roles
- [ ] Schedule pre-drill walkthrough meeting
- [ ] Distribute Observer Guide to all participants
- [ ] Share runbook links with team

**Technical Readiness**:
- [ ] Review and update all runbooks
- [ ] Test automation scripts in staging environment
- [ ] Verify backup integrity (run test restore)
- [ ] Check monitoring dashboards are accessible
- [ ] Verify all Kubernetes contexts are reachable
- [ ] Test Prometheus/Grafana access
- [ ] Ensure evidence directory has sufficient storage (50+ GB free)

---

### T-24 Hours: Final Preparation

**Infrastructure**:
- [ ] Verify source region (US) is healthy
  ```bash
  kubectl --context prod-us-east-1 get nodes
  aws health describe-events --region us-east-1
  ```
- [ ] Verify target region (EU) is healthy
  ```bash
  kubectl --context prod-eu-central-1 get nodes
  kubectl --context prod-eu-central-1 get pods -n teei-prod-eu
  ```
- [ ] Check database replication status
  ```bash
  # From EU cluster
  kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
    psql -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
  # Expected: < 30 seconds
  ```
- [ ] Verify ClickHouse replication lag
  ```bash
  kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
    clickhouse-client --query "SELECT count(*) FROM system.replication_queue;"
  # Expected: < 1000 items in queue
  ```
- [ ] Check NATS mirror status
  ```bash
  kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
    nats stream info CSR_EVENTS_MIRROR --json | jq '.mirror.lag'
  # Expected: < 100 messages lag
  ```

**DNS Preparation** (Optional for faster cutover):
- [ ] Pre-lower DNS TTL to 60 seconds (execute 24 hours before drill)
  ```bash
  aws route53 change-resource-record-sets --hosted-zone-id Z1234EXAMPLE \
    --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.teei.example.com","Type":"A","TTL":60,"ResourceRecords":[{"Value":"52.1.2.3"}]}}]}'
  ```

**Backup Verification**:
- [ ] Verify recent backups exist (< 1 hour old)
  ```bash
  aws s3 ls s3://teei-postgres-backups/eu-central-1/ --recursive | tail -5
  ```
- [ ] Run backup integrity check
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/backup/verify-postgres-backup.sh --region eu-central-1
  ```

**Team Communication**:
- [ ] Send 24-hour reminder to all participants
- [ ] Confirm availability of all key personnel
- [ ] Create Slack war room channel (e.g., #gameday-mar19)
- [ ] Schedule video call link (Zoom/Google Meet)
- [ ] Share video call link in Slack channel

---

### T-1 Hour: Go/No-Go Decision

**Final Health Checks**:
- [ ] No ongoing production incidents
- [ ] AWS regions healthy (no outages reported)
- [ ] All monitoring systems operational
- [ ] All drill participants confirmed present
- [ ] Executive approval received (if required)

**Pre-Drill Checklist Review**:
- [ ] All automation scripts tested and working
- [ ] Evidence directory prepared
- [ ] Runbooks accessible to all team members
- [ ] Communication channels ready
- [ ] Rollback procedure reviewed

**Go/No-Go Decision**:
- [ ] Drill Commander makes final go/no-go call
- [ ] If GO: Proceed to execution phase
- [ ] If NO-GO: Notify team, reschedule, document reason

---

## During-Drill Checklist (T-0 to Recovery Complete)

### Phase 0: Drill Kickoff (0-2 minutes)

- [ ] All participants joined video call
- [ ] Slack war room active
- [ ] Drill Commander confirms drill start time
- [ ] Set `GAMEDAY_DRILL=true` environment variable
- [ ] Create evidence directory:
  ```bash
  export EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/failover-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$EVIDENCE_DIR"
  ```
- [ ] Start screen recording (for post-drill review)
- [ ] Notify team: "Drill starting in 3... 2... 1... GO"

---

### Phase 1: Assessment (Target: 1 minute)

- [ ] Mark outage start time:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase outage-start
  ```
- [ ] Capture pre-failover state:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase pre-failover --region eu-central-1
  ```
- [ ] Check replication lag (< 10 seconds required to proceed)
- [ ] Verify EU region health
- [ ] Document source region status (healthy/degraded/unreachable)
- [ ] **CHECKPOINT**: Drill Commander confirms "Assessment complete, proceed to database promotion"

**Phase 1 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 60s) ☐ FAIL (> 60s)

---

### Phase 2: Database Promotion (Target: 1 minute)

- [ ] Promote PostgreSQL standby to primary:
  ```bash
  kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
    /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data
  ```
- [ ] Verify promotion successful:
  ```bash
  kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
    psql -U postgres -c "SELECT pg_is_in_recovery();"
  # Expected: f (false = primary mode)
  ```
- [ ] Update PgBouncer configuration
- [ ] Test database write capability
- [ ] **CHECKPOINT**: Database Lead confirms "Database writable, proceed to ClickHouse"

**Phase 2 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 60s) ☐ FAIL (> 60s)

---

### Phase 3: ClickHouse Promotion (Target: 30 seconds)

- [ ] Stop ClickHouse replication fetches
- [ ] Verify data is accessible
- [ ] Test ClickHouse write capability
- [ ] **CHECKPOINT**: ClickHouse Lead confirms "ClickHouse operational, proceed to NATS"

**Phase 3 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 30s) ☐ FAIL (> 30s)

---

### Phase 4: NATS Promotion (Target: 30 seconds)

- [ ] Promote NATS mirror to source stream
- [ ] Test NATS publish capability
- [ ] Update consumer configurations
- [ ] **CHECKPOINT**: Messaging Lead confirms "NATS writable, proceed to app services"

**Phase 4 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 30s) ☐ FAIL (> 30s)

---

### Phase 5: Application Services (Target: 1 minute)

- [ ] Scale up application pods in EU region
- [ ] Wait for pods to become Ready
- [ ] Verify application health endpoints
- [ ] Run smoke tests:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --region eu-central-1 --quick
  ```
- [ ] **CHECKPOINT**: App Lead confirms "Services healthy, proceed to DNS cutover"

**Phase 5 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 60s) ☐ FAIL (> 60s)

---

### Phase 6: DNS Cutover (Target: 1 minute)

- [ ] Update Route53 DNS records
- [ ] Monitor DNS propagation:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/check-dns-propagation.sh api.teei.example.com 52.58.10.20
  ```
- [ ] Update Cloudflare WAF rules
- [ ] Verify DNS resolution from multiple locations
- [ ] **CHECKPOINT**: Network Lead confirms "DNS propagated, proceed to verification"

**Phase 6 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 60s) ☐ FAIL (> 60s)

---

### Phase 7: Verification (Target: 1 minute)

- [ ] Capture post-failover state:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase post-failover --region eu-central-1
  ```
- [ ] Run full verification suite:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --region eu-central-1 --full
  ```
- [ ] Test user-facing services (login, API calls)
- [ ] Monitor error rates in Grafana
- [ ] **CHECKPOINT**: Drill Commander confirms "Failover complete, systems operational"

**Phase 7 Timing**:
- Start: __________ (timestamp)
- End: __________ (timestamp)
- Duration: __________ seconds
- **Status**: ☐ PASS (< 60s) ☐ FAIL (> 60s)

---

### Evidence Capture (Continuous throughout drill)

- [ ] Prometheus metrics snapshot captured
- [ ] Grafana dashboard screenshots saved
- [ ] Database transaction IDs recorded
- [ ] DNS propagation verified
- [ ] Application health checks logged
- [ ] Timing file generated

---

## Post-Drill Checklist (Within 24 Hours)

### Immediate Post-Drill (Within 30 Minutes)

- [ ] Mark drill end time
- [ ] Calculate RTO/RPO:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --calculate --evidence-dir "$EVIDENCE_DIR"
  ```
- [ ] Quick team debrief (15 minutes):
  - What worked well?
  - What didn't work?
  - Any unexpected issues?
- [ ] Take attendance (who participated)
- [ ] Capture initial feedback from team

**RTO/RPO Results**:
- **RTO Achieved**: __________ seconds (Target: < 300s)
- **RPO Achieved**: __________ seconds (Target: < 10s)
- **RTO Met?**: ☐ YES ☐ NO
- **RPO Met?**: ☐ YES ☐ NO

---

### Evidence Archival (Within 2 Hours)

- [ ] Generate compliance report:
  ```bash
  /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --calculate --evidence-dir "$EVIDENCE_DIR"
  ```
- [ ] Verify all evidence artifacts present:
  - [ ] Pre-failover metrics (Postgres, ClickHouse, NATS)
  - [ ] Post-failover metrics
  - [ ] RTO/RPO calculation JSON files
  - [ ] Timing logs
  - [ ] Grafana screenshots
- [ ] Copy evidence to SOC2 repository:
  ```bash
  cp -r "$EVIDENCE_DIR" /home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/
  ```
- [ ] Generate evidence hash for tamper-proof attestation:
  ```bash
  find "$EVIDENCE_DIR" -type f | sort | xargs cat | sha256sum > "${EVIDENCE_DIR}/evidence-hash.txt"
  ```
- [ ] Sign evidence bundle (GPG or similar)

---

### Communication (Within 4 Hours)

- [ ] Update status page (drill complete, normal operations resumed)
- [ ] Send summary email to stakeholders
- [ ] Post drill summary in Slack #engineering
- [ ] Thank participants for their time
- [ ] Schedule post-mortem meeting (within 24 hours)

---

### Post-Mortem Documentation (Within 24 Hours)

- [ ] Complete detailed post-mortem document:
  - Executive summary
  - Timeline of events
  - RTO/RPO results
  - Issues encountered
  - Action items
- [ ] Identify runbook updates needed
- [ ] Create JIRA tickets for follow-up work
- [ ] Document lessons learned
- [ ] Archive all notes and recordings

**Post-Mortem Template**:
```markdown
# Gameday Drill Post-Mortem

**Date**: YYYY-MM-DD
**Drill Type**: [Full/Partial] Regional Failover
**Duration**: XXX minutes
**RTO**: XX seconds (Target: 300s) - [PASS/FAIL]
**RPO**: XX seconds (Target: 10s) - [PASS/FAIL]

## What Went Well
- Item 1
- Item 2

## What Didn't Go Well
- Issue 1
- Issue 2

## Action Items
| Item | Owner | Due Date | Priority |
|------|-------|----------|----------|
| Update runbook step 3.2 | SRE Team | 2025-03-25 | High |

## Recommendations
- Recommendation 1
- Recommendation 2
```

---

## Rollback Checklist (If Needed)

### When to Rollback
- [ ] Critical services failing health checks
- [ ] Error rate > 1%
- [ ] RTO exceeded by > 100% (> 10 minutes elapsed)
- [ ] Executive decision to abort

### Rollback Procedure
- [ ] Drill Commander declares "ABORT DRILL - INITIATING ROLLBACK"
- [ ] Notify all participants via Slack
- [ ] Follow Runbook_Rollback.md procedure
- [ ] Revert DNS to original region
- [ ] Demote promoted databases to standby
- [ ] Restore original replica counts
- [ ] Verify all services back to normal
- [ ] Document rollback reason in post-mortem

---

## Continuous Improvement

**After Each Drill**:
- [ ] Update runbooks with actual procedures (if deviations occurred)
- [ ] Improve automation scripts based on lessons learned
- [ ] Add missing monitoring/alerting
- [ ] Schedule training for gaps identified
- [ ] Update drill schedule for next quarter

---

## Sign-Off

**Drill Commander**: _____________________ Date: __________

**Database Lead**: _____________________ Date: __________

**Network Lead**: _____________________ Date: __________

**Executive Observer**: _____________________ Date: __________

**Overall Drill Status**: ☐ SUCCESS ☐ PARTIAL SUCCESS ☐ FAILED

**Evidence Bundle Location**: ____________________________________________

**SOC2 Compliance**: ☐ PASS (RTO + RPO met) ☐ FAIL (SLA breached)

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation |

**Next Review**: Quarterly
