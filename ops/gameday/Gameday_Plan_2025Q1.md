# Disaster Recovery Gameday Plan - 2025 Q1

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: dr-gameday-lead
**Status**: Scheduled

---

## Overview

This document outlines the quarterly disaster recovery gameday drill schedule for Q1 2025. The goal is to verify RTO/RPO targets, test runbook procedures, and ensure team readiness for real regional outages.

**Objectives**:
1. Validate RTO < 5 minutes for regional failover
2. Validate RPO < 10 seconds for critical data
3. Test automation scripts and runbook accuracy
4. Train on-call engineers on failover procedures
5. Generate SOC2 compliance evidence

---

## Quarterly Drill Schedule

### Q1 2025 Gameday Drills

| Date | Drill Type | Scope | Lead | Status |
|------|------------|-------|------|--------|
| 2025-01-15 | Database Failover | Postgres only | backup-restore-auditor | Scheduled |
| 2025-02-12 | Partial Failover | Database + ClickHouse | dr-gameday-lead | Scheduled |
| 2025-03-19 | Full Region Failover | All services (US→EU) | dr-gameday-lead | Scheduled |
| 2025-03-20 | Failback Drill | Restore to US primary | dr-gameday-lead | Scheduled |

---

## Drill 1: Database Failover Only (Jan 15, 2025)

**Objective**: Test PostgreSQL promotion and validate database RTO/RPO.

**Date**: Tuesday, January 15, 2025
**Time**: 14:00-15:00 UTC (9 AM EST, low-traffic window)
**Duration**: 1 hour
**Impact**: None (standby promotion only, no DNS changes)

### Scope
- [x] PostgreSQL standby promotion
- [x] PgBouncer reconfiguration
- [x] Application reconnection
- [ ] ClickHouse (skip)
- [ ] NATS (skip)
- [ ] DNS cutover (skip)

### Team Assignments
| Role | Name | Responsibilities |
|------|------|------------------|
| Drill Lead | backup-restore-auditor | Execute runbook, capture evidence |
| Database Observer | DBA On-call | Monitor replication lag, query performance |
| Application Observer | Backend Engineer | Verify app connectivity, error rates |
| Evidence Collector | SRE Engineer | Run RTO/RPO measurement scripts |

### Runbook Reference
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md`

### Success Criteria
- [ ] Replication lag < 10 seconds before promotion
- [ ] Promotion completes in < 2 minutes
- [ ] No errors in application logs after reconnection
- [ ] Evidence bundle generated with RTO/RPO calculations

### Communication Plan
- **T-24 hours**: Email notification to engineering team
- **T-1 hour**: Slack announcement in #engineering and #sre-ops
- **T-0**: Execute drill (no customer notification - internal only)
- **T+24 hours**: Post-mortem document shared

---

## Drill 2: Partial Failover - Database + ClickHouse (Feb 12, 2025)

**Objective**: Test multi-component failover coordination.

**Date**: Wednesday, February 12, 2025
**Time**: 15:00-16:30 UTC (10 AM EST)
**Duration**: 1.5 hours
**Impact**: Minimal (analytics queries may experience brief latency spike)

### Scope
- [x] PostgreSQL standby promotion
- [x] ClickHouse replica promotion
- [x] Application services scale-up in EU
- [ ] NATS (skip for this drill)
- [ ] DNS cutover (skip - use test endpoints)

### Team Assignments
| Role | Name | Responsibilities |
|------|------|------------------|
| Drill Lead | dr-gameday-lead | Orchestrate multi-component failover |
| Postgres Lead | backup-restore-auditor | Execute database failover |
| ClickHouse Lead | Analytics Engineer | Execute ClickHouse promotion |
| App Services Lead | DevOps Engineer | Scale applications, verify health |
| Observer | VP Engineering | Executive oversight, timing validation |

### Runbook References
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md`
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_ClickHouse_DR.md`

### Success Criteria
- [ ] Both components fail over within 3 minutes (cumulative)
- [ ] Analytics dashboards resume within 2 minutes of ClickHouse promotion
- [ ] No data loss (row count matches pre/post failover)
- [ ] Application error rate < 0.1% during drill

---

## Drill 3: Full Regional Failover (Mar 19, 2025)

**Objective**: Execute complete DR procedure including DNS cutover.

**Date**: Wednesday, March 19, 2025
**Time**: 13:00-14:30 UTC (8 AM EST, early morning low-traffic)
**Duration**: 1.5 hours
**Impact**: Moderate (30-60 second DNS propagation delay for some users)

### Scope
- [x] **FULL SCOPE**: All services, all databases, all queues, DNS
- [x] PostgreSQL failover
- [x] ClickHouse failover
- [x] NATS JetStream failover
- [x] Application services
- [x] DNS cutover (Route53 + Cloudflare)

### Team Assignments
| Role | Name | Responsibilities |
|------|------|------------------|
| Drill Commander | dr-gameday-lead | Overall coordination, timing, go/no-go decisions |
| Database Lead | backup-restore-auditor | Postgres + ClickHouse failover |
| Messaging Lead | Platform Engineer | NATS JetStream promotion |
| Network Lead | Network Engineer | DNS cutover, verify propagation |
| Application Lead | Backend Lead | App service scaling, health checks |
| Observability Lead | SRE Engineer | Prometheus/Grafana monitoring, alerting |
| Evidence Lead | Compliance Engineer | Capture screenshots, metrics, compliance artifacts |
| Executive Observer | CTO | Witness drill for compliance attestation |

### Runbook References
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md` (master runbook)
- All sub-runbooks (Database, ClickHouse, NATS, DNS)

### Automation Scripts
```bash
# Automated execution (with checkpoints)
export GAMEDAY_DRILL=true
/home/user/TEEI-CSR-Platform/scripts/gameday/execute-failover.sh \
  --source us-east-1 \
  --target eu-central-1 \
  --auto-confirm  # Remove this flag for manual checkpoints
```

### Success Criteria
- [ ] Total RTO < 5 minutes (from outage simulation to full recovery)
- [ ] RPO < 10 seconds (minimal data loss)
- [ ] DNS propagates within 2 minutes to 95% of global resolvers
- [ ] All health checks pass post-failover
- [ ] Customer-facing services available (HTTP 200) within 5 minutes
- [ ] Error rate < 0.5% during failover window
- [ ] Evidence bundle complete with RTO/RPO attestation

### Communication Plan
- **T-7 days**: Announcement to all customers (status page)
- **T-24 hours**: Reminder email to engineering + customer success teams
- **T-2 hours**: Slack war room created (#gameday-mar19)
- **T-1 hour**: Final go/no-go decision
- **T-0**: Execute drill + update status page ("Scheduled maintenance in progress")
- **T+30 min**: Post-drill all-hands debrief
- **T+24 hours**: Public incident report published

---

## Drill 4: Failback to Primary (Mar 20, 2025)

**Objective**: Test return to normal operations after DR event.

**Date**: Thursday, March 20, 2025 (day after full failover)
**Time**: 14:00-16:00 UTC (9 AM EST)
**Duration**: 2 hours
**Impact**: Low (maintenance mode enabled, < 5 minute downtime)

### Scope
- [x] Restore US region from EU backup
- [x] Rebuild PostgreSQL, ClickHouse, NATS in US
- [x] DNS cutover back to US
- [x] Re-establish EU as standby

### Team Assignments
Same as Drill 3 (full team)

### Runbook Reference
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

### Success Criteria
- [ ] US region restored within 2 hours
- [ ] Data consistency verified (row counts match EU)
- [ ] EU becomes standby with replication lag < 10 seconds
- [ ] No customer data loss during failback

---

## Pre-Drill Preparation Checklist

**Complete 1 week before each drill:**

### Technical Preparation
- [ ] Verify all runbooks are up-to-date
- [ ] Test all automation scripts in staging environment
- [ ] Verify backup integrity (run restore test)
- [ ] Check monitoring dashboards are accessible
- [ ] Pre-lower DNS TTL to 60 seconds (for faster cutover)
- [ ] Ensure evidence directory has sufficient storage
- [ ] Validate all Kubernetes contexts are accessible
- [ ] Test Slack/PagerDuty notification channels

### Team Preparation
- [ ] Schedule gameday calendar invites
- [ ] Distribute observer guides
- [ ] Conduct pre-drill walkthrough (dry-run)
- [ ] Assign specific roles and responsibilities
- [ ] Identify backup personnel for key roles
- [ ] Review previous drill post-mortems (lessons learned)

### Communication Preparation
- [ ] Draft customer notification email
- [ ] Update status page with scheduled maintenance
- [ ] Prepare Slack war room
- [ ] Draft post-drill report template
- [ ] Notify executive team

---

## During Drill Execution

### Roles and Responsibilities

**Drill Commander** (dr-gameday-lead):
- Call start/stop for each phase
- Monitor overall timing vs RTO targets
- Make go/no-go decisions at checkpoints
- Coordinate communication

**Technical Leads**:
- Execute runbook steps for assigned components
- Report status at each checkpoint
- Escalate blockers immediately

**Observers**:
- Monitor systems without interfering
- Take notes for post-mortem
- Verify evidence capture

**Evidence Lead**:
- Run RTO/RPO measurement scripts
- Capture screenshots, metrics
- Generate compliance report

### Communication Protocol
- **Slack Channel**: #gameday-drill (real-time updates)
- **Video Call**: Zoom/Google Meet (all participants join)
- **Status Updates**: Every 5 minutes (phase completion, issues)
- **Escalation Path**: Drill Commander → VP Engineering → CTO

---

## Post-Drill Activities

**Within 2 hours:**
- [ ] Restore systems to normal (if not already done)
- [ ] Generate RTO/RPO compliance report
- [ ] Quick team debrief (what worked, what didn't)
- [ ] Upload evidence to SOC2 evidence repository

**Within 24 hours:**
- [ ] Complete detailed post-mortem document
- [ ] Identify runbook updates needed
- [ ] File JIRA tickets for any issues found
- [ ] Share drill results with stakeholders

**Within 1 week:**
- [ ] Update runbooks based on lessons learned
- [ ] Improve automation scripts (if gaps identified)
- [ ] Schedule follow-up training if needed
- [ ] Archive evidence for audit

---

## Evidence Requirements (SOC2 CC9.1)

Each drill must capture:
- [ ] Pre-drill state (replication lag, row counts, timestamps)
- [ ] During-drill timing (each phase duration)
- [ ] Post-drill state (RTO/RPO calculations)
- [ ] Prometheus metrics snapshots
- [ ] Grafana dashboard screenshots
- [ ] Database transaction ID comparisons
- [ ] DNS propagation verification
- [ ] Application health check results
- [ ] Signed attestation from Drill Commander

**Evidence Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/`

---

## Risk Mitigation

### Pre-Drill Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Real outage during drill | Low | High | Monitor AWS health dashboard, abort if real issue detected |
| Script failures | Medium | Medium | Test scripts in staging, have manual fallback runbooks |
| DNS propagation issues | Low | Medium | Pre-lower TTL, have rollback plan ready |
| Data loss during failover | Low | High | Verify replication lag < 10s before proceeding |
| Extended downtime | Low | High | Set hard time limits, abort drill if exceeded |

### Abort Criteria

**Immediately abort drill if:**
- Real production incident occurs
- Replication lag > 5 minutes (data loss risk)
- More than 3 critical services fail health checks
- Customer-reported impact exceeds acceptable threshold
- Executive decision to abort

**Abort Procedure**:
1. Drill Commander calls "ABORT DRILL"
2. Restore to pre-drill state (use rollback runbook)
3. Notify all participants
4. Conduct emergency post-mortem within 2 hours

---

## Quarterly Metrics Tracking

Track improvement over time:

| Metric | Q4 2024 Baseline | Q1 2025 Target | Q1 2025 Actual |
|--------|------------------|----------------|----------------|
| RTO (minutes) | 7.2 | < 5.0 | TBD |
| RPO (seconds) | 15 | < 10 | TBD |
| Runbook accuracy | 85% | > 95% | TBD |
| Script automation coverage | 60% | > 80% | TBD |
| Team confidence (survey) | 6.5/10 | > 8.0/10 | TBD |

---

## Continuous Improvement

After each drill:
1. **What went well** - Document successes
2. **What didn't go well** - Document failures/delays
3. **Action items** - Assign owners and due dates
4. **Runbook updates** - Reflect actual procedures
5. **Automation opportunities** - Reduce manual steps

**Next Quarter Planning**:
- Q2 2025: Add chaos engineering (random pod failures)
- Q2 2025: Test active-active multi-region (if implemented)
- Q3 2025: Customer-facing gameday (with opt-in beta customers)

---

## Appendix: Quick Reference

**Key Contacts**:
- Drill Commander: dr-gameday-lead (Slack: @gameday-lead)
- Backup Commander: SRE Manager (Slack: @sre-manager)
- Executive Sponsor: CTO (Slack: @cto)

**Key Resources**:
- Runbooks: `/home/user/TEEI-CSR-Platform/docs/runbooks/`
- Scripts: `/home/user/TEEI-CSR-Platform/scripts/gameday/`
- Evidence: `/home/user/TEEI-CSR-Platform/ops/gameday/evidence/`

**Emergency Contacts**:
- AWS Support: 1-877-AWS-SUPPORT
- On-call SRE: PagerDuty escalation
- Incident Coordinator: #incident-response channel

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial Q1 2025 plan |

**Next Review**: 2025-12-15 (Q4 2025 planning)
