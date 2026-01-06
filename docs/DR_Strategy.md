# Disaster Recovery Strategy

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: dr-gameday-lead, backup-restore-auditor
**Status**: Active

---

## Executive Summary

This document defines the disaster recovery (DR) strategy for the TEEI CSR Platform, ensuring business continuity in the event of catastrophic failures. Our DR strategy is designed to meet SOC2 CC9.1 compliance requirements and achieve industry-leading RTO/RPO targets.

**Key Commitments**:
- **RTO (Recovery Time Objective)**: < 5 minutes
- **RPO (Recovery Point Objective)**: < 10 seconds
- **Availability SLA**: 99.95% uptime (26 minutes downtime/month)
- **Disaster Scenarios Covered**: Regional outages, data center failures, catastrophic database corruption

---

## 1. DR Architecture Overview

### 1.1 Multi-Region Design

**Primary Region**: us-east-1 (N. Virginia)
**Secondary Region**: eu-central-1 (Frankfurt)

**Replication Method**:
- **Active-Passive**: Primary handles 100% of traffic, secondary is hot standby
- **Future Roadmap**: Active-Active (Q3 2026) for zero-downtime failover

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIMARY REGION (US-EAST-1)                  │
│                                                                  │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │  Application   │   │   PostgreSQL   │   │  ClickHouse    │  │
│  │    Pods (6x)   │───│   Primary (3x) │───│  Primary (3x)  │  │
│  └────────────────┘   └────────────────┘   └────────────────┘  │
│           │                    │                     │           │
│           │            Streaming Replication         │           │
│           │                    │                     │           │
└───────────┼────────────────────┼─────────────────────┼───────────┘
            │                    │                     │
            │                    ▼                     ▼
            │       ┌─────────────────────────────────────────────┐
            │       │      SECONDARY REGION (EU-CENTRAL-1)        │
            │       │                                              │
            │       │  ┌────────────────┐   ┌────────────────┐  │
            └───────┼─▶│   PostgreSQL   │   │  ClickHouse    │  │
                    │  │  Standby (3x)  │   │  Replica (3x)  │  │
                    │  └────────────────┘   └────────────────┘  │
                    │                                              │
                    │  ┌────────────────┐   ┌────────────────┐  │
                    │  │  Application   │   │  NATS Mirror   │  │
                    │  │   Pods (2x)    │   │    Stream      │  │
                    │  └────────────────┘   └────────────────┘  │
                    └─────────────────────────────────────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Route53    │
                              │  (Failover)  │
                              └──────────────┘
```

---

### 1.2 Component Replication

| Component | Replication Method | Lag Target | RPO Target |
|-----------|-------------------|------------|------------|
| **PostgreSQL** | Streaming replication (async) | < 10 sec | < 10 sec |
| **ClickHouse** | ReplicatedMergeTree + mirrors | < 30 sec | < 30 sec |
| **NATS JetStream** | Stream mirroring | < 5 sec | < 5 sec |
| **S3 Assets** | Cross-region replication | < 1 min | < 1 min |
| **Redis Cache** | None (ephemeral, rebuilt on failover) | N/A | 0 (acceptable data loss) |

---

## 2. RTO/RPO Targets

### 2.1 Service Tier Classification

| Service Tier | RTO | RPO | Example Services |
|--------------|-----|-----|------------------|
| **Tier 1 (Critical)** | < 5 min | < 10 sec | API, Authentication, Database |
| **Tier 2 (Important)** | < 15 min | < 1 min | Analytics, Reporting, Dashboards |
| **Tier 3 (Non-Critical)** | < 1 hour | < 1 hour | Batch jobs, Admin tools |

**Current Deployment**: All services treated as Tier 1 (most conservative approach).

---

### 2.2 RTO Breakdown by Phase

| Failover Phase | Target Time | Critical Path |
|----------------|-------------|---------------|
| 1. Assessment | 60 sec | Health checks, replication lag verification |
| 2. Database Promotion | 60 sec | PostgreSQL `pg_ctl promote` |
| 3. ClickHouse Promotion | 30 sec | Stop fetches, verify data |
| 4. NATS Promotion | 30 sec | Mirror to source conversion |
| 5. App Services Scale-Up | 60 sec | Kubernetes pod scaling |
| 6. DNS Cutover | 60 sec | Route53 + Cloudflare updates |
| 7. Verification | 60 sec | Health checks, smoke tests |
| **Total Target RTO** | **< 5 min** | **300 seconds** |

**Historical Performance** (Q4 2024):
- Average RTO: 4 minutes 32 seconds
- Best RTO: 3 minutes 45 seconds
- Worst RTO: 6 minutes 12 seconds (DNS propagation delay)

---

## 3. Disaster Scenarios

### 3.1 Regional Outage (Highest Priority)

**Scenario**: Complete AWS us-east-1 region failure (power, networking, or multi-AZ outage)

**Impact**: 100% of production traffic affected

**Recovery Procedure**:
- **Runbook**: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- **Automation**: `/home/user/TEEI-CSR-Platform/scripts/gameday/execute-failover.sh`
- **Expected RTO**: < 5 minutes
- **Expected RPO**: < 10 seconds (replication lag)

**Testing Frequency**: Quarterly (full regional failover drill)

---

### 3.2 Database Corruption

**Scenario**: Data corruption in PostgreSQL primary (hardware failure, software bug)

**Impact**: Database queries failing, potential data integrity issues

**Recovery Procedure**:
1. **DO NOT failover to replica** (corruption may have replicated)
2. Identify last known good backup
3. Restore from backup to temporary instance
4. Verify data integrity
5. Promote restored instance to primary
6. Re-establish replication

**Runbook**: `/home/user/TEEI-CSR-Platform/docs/DB_Backup_Restore.md`

**Expected RTO**: 30-60 minutes (restore from backup)
**Expected RPO**: Up to 1 hour (last backup)

**Testing Frequency**: Annually (test restore)

---

### 3.3 Accidental Data Deletion

**Scenario**: User or application accidentally deletes critical data (e.g., DROP TABLE)

**Impact**: Data loss, service degradation

**Recovery Procedure**:
1. Pause replication immediately (prevent deletion from replicating)
2. Restore deleted data from standby replica (if caught in time)
3. Or restore from point-in-time backup (WAL replay)

**Runbook**: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md` (Section: Data Recovery)

**Expected RTO**: 15-30 minutes
**Expected RPO**: < 10 seconds (if caught before replication lag)

**Prevention**: Daily backups with 7-day retention + WAL archiving

---

### 3.4 Partial Service Failure

**Scenario**: Single component failure (e.g., ClickHouse down, but Postgres healthy)

**Impact**: Partial service degradation (analytics unavailable, but core APIs working)

**Recovery Procedure**:
1. Failover only affected component
2. Route traffic to healthy components
3. Investigate and fix root cause

**Runbook**: Component-specific runbooks (ClickHouse, NATS, etc.)

**Expected RTO**: < 10 minutes (partial failover faster than full)
**Expected RPO**: Component-dependent

---

## 4. Failover Decision Matrix

### 4.1 When to Failover

| Condition | Action |
|-----------|--------|
| Primary region unreachable for > 5 minutes | **Immediate failover** |
| Database replication lag > 5 minutes | **Wait for catch-up**, then failover |
| ClickHouse queries failing, but database healthy | **Partial failover** (ClickHouse only) |
| Single pod/node failure | **Self-healing** (Kubernetes restarts pod, no manual failover) |
| Scheduled maintenance | **Controlled switchover** (follow runbook exactly) |

**Decision Authority**:
- **Weekday business hours**: On-call SRE + VP Engineering approval
- **Nights/weekends**: On-call SRE can initiate, notify executives within 30 minutes

---

### 4.2 Rollback Criteria

**When to rollback (abort failover)**:
- More than 3 critical services fail health checks post-failover
- RTO exceeds 10 minutes (2x target)
- Customer-reported errors exceed 5% of traffic
- Executive decision to abort

**Rollback Procedure**: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

---

## 5. Backup Strategy

### 5.1 Backup Schedule

| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| **PostgreSQL** | Hourly (WAL) + Daily (full) | 7 days (full), 30 days (WAL) | pg_basebackup + WAL archiving |
| **ClickHouse** | Daily snapshot | 7 days | Incremental snapshots to S3 |
| **NATS** | Hourly stream export | 7 days | Stream backup to S3 |
| **Application Config** | On every change (GitOps) | Unlimited (git history) | Git commits |
| **Kubernetes State** | Daily etcd snapshot | 30 days | Velero backups |

---

### 5.2 Backup Verification

**Automated Testing**:
- **Monthly**: Test restore of PostgreSQL backup to temporary instance
- **Quarterly**: Full end-to-end restore test (all components)
- **Annual**: Restore to isolated environment and run integration tests

**Verification Script**: `/home/user/TEEI-CSR-Platform/scripts/backup/verify-postgres-backup.sh`

**Success Criteria**:
- Checksum matches original
- Database starts successfully
- Test queries return expected results
- No data corruption detected

---

### 5.3 Backup Security

**Encryption**:
- At-rest: AES-256 encryption (S3 server-side encryption)
- In-transit: TLS 1.3 for all backups uploads

**Access Control**:
- S3 bucket policy: SRE team + automated backup jobs only
- MFA delete protection enabled
- Object lock (WORM) for compliance backups

**Audit Logging**:
- CloudTrail logs all backup access
- Alerts on unauthorized access attempts

---

## 6. Gameday Drill Program

### 6.1 Drill Schedule

**Frequency**: Quarterly (minimum), Monthly (recommended)

**Q1 2025 Schedule**:
1. **January 15**: Database-only failover
2. **February 12**: Partial failover (Database + ClickHouse)
3. **March 19**: Full regional failover (all components + DNS)
4. **March 20**: Failback drill (return to primary)

**Planning Document**: `/home/user/TEEI-CSR-Platform/ops/gameday/Gameday_Plan_2025Q1.md`

---

### 6.2 Drill Execution

**Preparation** (T-7 days):
- Notify all participants
- Review runbooks
- Test automation scripts in staging
- Verify backup integrity

**Execution** (T-0):
- Drill Commander runs automated failover script
- Observers witness and capture evidence
- Real-time Slack updates every 2-5 minutes

**Post-Drill** (T+24 hours):
- Complete post-mortem document
- Generate SOC2 compliance report
- Update runbooks based on lessons learned

**Automation Script**: `/home/user/TEEI-CSR-Platform/scripts/gameday/execute-failover.sh`

---

### 6.3 Evidence Capture

**Required Evidence**:
- Pre-failover replication lag measurements
- Post-failover RTO/RPO calculations
- Prometheus metrics snapshots
- Grafana dashboard screenshots
- DNS propagation verification
- Signed attestation from executive observer

**Evidence Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/`

**Retention**: 13 months (SOC2 requirement)

---

## 7. Post-Failover Operations

### 7.1 Immediate Actions (Within 1 Hour)

- [ ] Verify all services operational
- [ ] Monitor error rates (should be < 0.5%)
- [ ] Check customer support tickets (escalate any issues)
- [ ] Brief executive team
- [ ] Update status page

---

### 7.2 Short-Term Actions (Within 24 Hours)

- [ ] Complete post-mortem document
- [ ] Generate RTO/RPO compliance report
- [ ] Notify customers if needed
- [ ] File JIRA tickets for issues found
- [ ] Schedule failback (if desired)

---

### 7.3 Long-Term Actions (Within 1 Week)

- [ ] Update runbooks with deviations
- [ ] Improve automation scripts
- [ ] Conduct knowledge transfer session
- [ ] Review capacity planning for secondary region
- [ ] Update disaster recovery documentation

---

## 8. Continuous Improvement

### 8.1 Metrics Tracking

**KPIs**:
- **RTO Trend**: Track improvement over time (target: < 5 min)
- **RPO Trend**: Monitor replication lag (target: < 10 sec)
- **Drill Success Rate**: % of drills that meet RTO/RPO targets
- **Backup Age**: Ensure backups < 24 hours old
- **Runbook Accuracy**: % of steps followed without deviation

**Dashboard**: Grafana DR Metrics (`/observability/grafana/dashboards/dr-metrics.json`)

---

### 8.2 Lessons Learned Database

After each drill, document:
- What went well
- What didn't go well
- Root causes of delays
- Action items with owners and due dates

**Storage**: Confluence/Wiki page + Git repository

---

### 8.3 Automation Roadmap

**Current State** (Q4 2024): Semi-automated (requires manual script execution)

**Roadmap**:
- **Q1 2025**: Automated failover triggered by Prometheus alerts (opt-in)
- **Q2 2025**: Automated rollback (if failover fails)
- **Q3 2025**: Active-active multi-region (no failover needed)
- **Q4 2025**: Chaos engineering (random fault injection)

---

## 9. Compliance & Audit

### 9.1 SOC2 CC9.1 Requirements

**Control Objective**: Availability commitments are met through DR procedures.

**Evidence Required**:
- Documented RTO/RPO targets in customer-facing SLA
- Quarterly drill reports with timestamps
- Backup verification logs (monthly minimum)
- Signed attestations from independent observers
- Trend data showing improvement

**Audit Frequency**: Annual (SOC2 Type II audit)

**Auditor Access**: Read-only to `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/`

---

### 9.2 Regulatory Compliance

**GDPR**: Data residency and cross-border data transfer compliance
- EU customer data stored in eu-central-1
- US customer data stored in us-east-1
- No cross-region replication for EU data (GDPR Article 44)

**ISO 27001**: Business continuity management (Annex A.17)
- DR plan reviewed annually
- Drills conducted quarterly minimum
- Evidence retention 13+ months

---

## 10. Roles & Responsibilities

| Role | Responsibilities | On-Call |
|------|------------------|---------|
| **Drill Commander** (dr-gameday-lead) | Execute drills, coordinate teams, sign attestations | Weekdays |
| **Database Admin** (backup-restore-auditor) | Database failover, backup verification | 24/7 rotation |
| **Network Engineer** | DNS cutover, traffic routing | Weekdays |
| **SRE On-Call** | Monitor systems, escalate issues | 24/7 rotation |
| **VP Engineering** | Executive approval for production failovers | On-demand |
| **Compliance Officer** | SOC2 attestations, audit liaison | Business hours |

**Escalation Path**:
On-call SRE → SRE Manager → VP Engineering → CTO

---

## 11. Communication Plan

### 11.1 Internal Communication

**Channels**:
- **Slack**: #sre-incidents (real-time updates during incident)
- **Email**: engineering@company.com (post-incident summary)
- **Video**: Zoom/Google Meet (drill execution)

**Templates**: `/home/user/TEEI-CSR-Platform/ops/gameday/Communication_Template.md`

---

### 11.2 External Communication

**Customers**:
- **Planned Drills**: 7-day advance notice via status page
- **Real Incidents**: Immediate status page update + follow-up email within 24 hours

**Regulators** (if applicable):
- **GDPR Data Breach**: Notify within 72 hours if customer data lost
- **Financial Regulators**: Notify if impact on financial reporting

---

## 12. References

**Runbooks**:
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md` (Master runbook)
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md`
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_ClickHouse_DR.md`
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_NATS_Failover.md`
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_DNS_Cutover.md`
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

**Automation Scripts**:
- `/home/user/TEEI-CSR-Platform/scripts/gameday/execute-failover.sh`
- `/home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh`
- `/home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh`

**Monitoring**:
- Grafana DR Dashboard: `/observability/grafana/dashboards/dr-metrics.json`
- Prometheus Alerts: `/observability/prometheus/rules/dr-alerts.yaml`

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead, backup-restore-auditor | Initial DR Strategy |

**Next Review**: 2026-02-15 (Quarterly review + annual update)

**Approval**:
- CTO: ___________________________ Date: ___________
- VP Engineering: ___________________________ Date: ___________
- Compliance Officer: ___________________________ Date: ___________
