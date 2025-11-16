# SLO Incident Response Playbook

**TEEI CSR Platform - SRE Incident Response**

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: SRE Team
**Contact**: sre@teei.io

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Severity Levels](#incident-severity-levels)
3. [Escalation Matrix](#escalation-matrix)
4. [Alert Response Playbooks](#alert-response-playbooks)
5. [War Room Procedures](#war-room-procedures)
6. [Communication Templates](#communication-templates)
7. [Post-Incident Review](#post-incident-review)
8. [Runbooks](#runbooks)

---

## Overview

This playbook defines the incident response process for SLO (Service Level Objective) breaches on the TEEI CSR Platform.

### Key Principles

1. **Customer Impact First**: Prioritize restoring service over root cause analysis
2. **Blameless Culture**: Focus on system improvement, not individual blame
3. **Transparent Communication**: Keep stakeholders informed throughout the incident
4. **Data-Driven Decisions**: Use metrics and dashboards to guide response
5. **Learn and Improve**: Every incident is an opportunity to strengthen the system

### When to Declare an Incident

An incident is declared when:

- **Fast Burn Alert Fires**: Error budget consumed 14.4x faster than normal (1h window)
- **Error Budget Exhausted**: Monthly error budget reaches 0%
- **GDPR Violation Detected**: Any data residency violation (zero tolerance)
- **Deployment Gate Blocked**: SLOs breach during deployment
- **Customer-Reported Outage**: User-facing service unavailable

---

## Incident Severity Levels

### Severity 1 (Critical) - Page On-Call Immediately

**Definition**: Service completely unavailable or GDPR violation

**Examples**:
- API Gateway down (100% error rate)
- Data residency service routing EU data to US
- GDPR violation count > 0
- Error budget exhausted (<10% remaining)
- Fast burn rate >14.4x for >5 minutes

**Response Time**: 15 minutes

**Escalation**: On-call SRE → VP Engineering → CTO

**Communication**: Slack `#incident-response`, Email to C-Suite, Customer status page update

**Actions**:
- Declare incident in PagerDuty
- Start war room (Zoom + Slack)
- Freeze all deployments
- Activate DPO (for GDPR incidents)

---

### Severity 2 (High) - Page On-Call

**Definition**: Partial service degradation affecting multiple users

**Examples**:
- Slow burn rate 6x-14.4x (6h window)
- Availability SLO 99.5%-99.9% (breaching but not catastrophic)
- Error budget 10-20% remaining
- Latency p95 2x over SLO target

**Response Time**: 30 minutes

**Escalation**: On-call SRE → Engineering Lead

**Communication**: Slack `#sre-alerts`, Engineering team email

**Actions**:
- Investigate in Grafana dashboards
- Review recent deployments
- Prepare rollback plan
- Escalate to Severity 1 if degradation worsens

---

### Severity 3 (Medium) - Ticket Only

**Definition**: Single service degradation, low customer impact

**Examples**:
- Slow burn rate 3x-6x
- Error budget 20-50% remaining
- Non-critical service latency spike

**Response Time**: 2 hours

**Escalation**: On-call SRE (no page)

**Communication**: Slack `#sre`

**Actions**:
- Create Jira ticket
- Investigate during business hours
- Monitor for escalation

---

### Severity 4 (Low) - Informational

**Definition**: SLO warning, no customer impact

**Examples**:
- Error budget 50-75% remaining
- Burn rate 1x-3x
- Proactive alert (e.g., disk space 70%)

**Response Time**: Next business day

**Escalation**: None

**Communication**: Slack `#sre`

**Actions**:
- Log in Jira backlog
- Address during sprint planning

---

## Escalation Matrix

### Escalation by Burn Rate

| Burn Rate | Time to Exhaustion | Severity | Page? | Escalation Path |
|-----------|--------------------|----|-------|-----------------|
| >14.4x (1h) | ~36 hours | Sev 1 | YES | On-call SRE → VP Eng → CTO |
| 6x-14.4x (6h) | 6 days | Sev 2 | YES | On-call SRE → Eng Lead |
| 3x-6x | 10 days | Sev 3 | NO | On-call SRE (ticket) |
| 1x-3x | Normal | Sev 4 | NO | None |

### Escalation by Error Budget

| Error Budget Remaining | Severity | Page? | Escalation Path |
|------------------------|----------|-------|-----------------|
| <10% (Red) | Sev 1 | YES | On-call SRE → VP Eng → CTO |
| 10-20% (Orange) | Sev 2 | YES | On-call SRE → Eng Lead |
| 20-50% (Yellow) | Sev 3 | NO | On-call SRE (ticket) |
| >50% (Green) | Sev 4 | NO | None |

### Escalation Contacts

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| On-call SRE | Rotation | PagerDuty | oncall@teei.io | `@sre-oncall` |
| Engineering Lead | TBD | TBD | eng-lead@teei.io | `@eng-lead` |
| VP Engineering | TBD | TBD | vp-eng@teei.io | `@vp-engineering` |
| CTO | TBD | TBD | cto@teei.io | `@cto` |
| DPO (GDPR) | TBD | TBD | dpo@teei.io | `@dpo` |

---

## Alert Response Playbooks

### Playbook 1: SLOFastBurn_APIGateway

**Alert**: API Gateway consuming error budget 14.4x faster than normal

**Severity**: Sev 1 (Critical)

**Response Steps**:

1. **Acknowledge Alert** (0-5 minutes)
   ```bash
   # Check SLO dashboard
   open https://grafana.teei.io/d/slo-overview

   # Check error budget status
   ./scripts/infra/slo-gate.sh status
   ```

2. **Assess Impact** (5-10 minutes)
   - Check error rate: `rate(http_requests_total{service="api-gateway",status=~"5.."}[5m])`
   - Check latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="api-gateway"}[5m])) by (le))`
   - Check regional impact: `sli:availability:api_gateway:ratio_by_region`
   - Estimate time to error budget exhaustion

3. **Declare Incident** (10-15 minutes)
   ```bash
   # PagerDuty
   pd incident create --title "API Gateway Fast Burn" --severity critical

   # Slack
   /incident declare "API Gateway Fast Burn - Error budget at 14.4x burn rate"
   ```

4. **War Room** (15-20 minutes)
   - Start Zoom war room: https://zoom.us/j/teei-incident
   - Slack channel: `#incident-response`
   - Assign roles:
     - **Incident Commander**: On-call SRE
     - **Technical Lead**: Backend Lead
     - **Communications Lead**: Engineering Manager
     - **Scribe**: Junior SRE

5. **Investigate** (20-60 minutes)
   - Check recent deployments: `kubectl rollout history deployment/api-gateway -n production`
   - Check logs: `kubectl logs -n production -l app=api-gateway --tail=100`
   - Check distributed traces: Jaeger dashboard
   - Check database: `pg_stat_activity`, slow query log
   - Check external dependencies: AWS status, third-party APIs

6. **Mitigate** (20-60 minutes)
   - **Option 1**: Rollback recent deployment
     ```bash
     kubectl rollout undo deployment/api-gateway -n production
     ```
   - **Option 2**: Scale up pods (if traffic spike)
     ```bash
     kubectl scale deployment/api-gateway -n production --replicas=20
     ```
   - **Option 3**: Circuit breaker (if external dependency failing)
     ```bash
     kubectl apply -f k8s/circuit-breaker-patch.yaml
     ```
   - **Option 4**: Traffic shedding (if DDoS)
     ```bash
     kubectl apply -f k8s/rate-limit-patch.yaml
     ```

7. **Verify Recovery** (60-90 minutes)
   - Check burn rate: `burn_rate:api_gateway:1h < 14.4`
   - Check error budget: `error_budget:api_gateway:remaining_ratio > 0.10`
   - Check availability: `sli:availability:api_gateway:ratio > 0.999`

8. **Communicate Resolution** (90 minutes)
   - Update Slack: "Incident resolved, API Gateway burn rate normal"
   - Update status page: "Service restored"
   - Email stakeholders: CTO, VP Engineering

9. **Post-Incident** (48 hours)
   - Schedule post-mortem within 48 hours
   - Document timeline in Jira
   - Assign action items

---

### Playbook 2: ErrorBudgetExhausted_APIGateway

**Alert**: API Gateway monthly error budget exhausted (0% remaining)

**Severity**: Sev 1 (Critical)

**Response Steps**:

1. **Immediate Actions** (0-15 minutes)
   - Declare incident
   - Start war room
   - **FREEZE ALL DEPLOYMENTS**
   - Review error budget consumption timeline

2. **Root Cause Analysis** (15-60 minutes)
   - Identify when error budget was consumed
   - Correlate with deployments, traffic spikes, external incidents
   - Check for cascading failures

3. **Mitigation** (15-60 minutes)
   - Rollback all non-critical deployments from past 7 days
   - Focus on reliability over features
   - Identify quick wins to recover SLO

4. **Reliability Focus** (Until error budget recovers)
   - **Feature freeze** until error budget >20%
   - Prioritize reliability backlog items
   - Increase monitoring and alerting
   - Daily leadership sync (CTO, VP Eng, SRE Lead)

5. **Exit Criteria**
   - Error budget recovers to >20%
   - Root cause identified and mitigated
   - Post-mortem completed
   - Reliability improvements committed to sprint

---

### Playbook 3: GDPRResidencyViolation

**Alert**: GDPR data residency violation detected (zero tolerance)

**Severity**: Sev 1 (Critical) + **Legal Escalation**

**Response Steps**:

1. **Immediate Actions** (0-5 minutes)
   - **STOP ALL WRITES** to affected service
   - Declare incident
   - **ESCALATE TO DPO IMMEDIATELY**

2. **Assess Scope** (5-15 minutes)
   - Identify affected users (how many EU users?)
   - Identify affected data (what data was transferred?)
   - Identify destination region (where did data go?)
   - Check: `sli:gdpr_violations:count`

3. **Contain Breach** (15-30 minutes)
   - Isolate affected service
   - Prevent further transfers
   - Document all actions (legal compliance)

4. **Notify Stakeholders** (30-60 minutes)
   - **DPO**: Immediately (phone + email)
   - **Legal Team**: Within 30 minutes
   - **CTO**: Immediately
   - **CEO**: Within 1 hour

5. **Legal Compliance** (1-72 hours)
   - DPO assesses regulatory reporting requirements
   - GDPR Article 33: Breach notification within 72 hours (if required)
   - Prepare communication to data subjects (GDPR Article 34)

6. **Technical Remediation** (1-7 days)
   - Fix residency routing logic
   - Data repatriation (if needed)
   - Audit all residency controls
   - Implement additional safeguards

7. **Post-Incident** (7 days)
   - Blameless post-mortem (required)
   - Legal review of incident
   - Regulatory reporting (if required)
   - Update residency controls
   - External audit of compliance

---

### Playbook 4: DeploymentBlocked_SLOBreach

**Alert**: Deployment gate blocked due to SLO breach

**Severity**: Sev 2 (High) - unless production outage

**Response Steps**:

1. **Assess Urgency** (0-5 minutes)
   - Is this a critical hotfix?
   - Is there a production outage?
   - Can deployment wait?

2. **Review SLO Status** (5-10 minutes)
   ```bash
   ./scripts/infra/slo-gate.sh status
   ```
   - Check error budget levels
   - Check burn rates
   - Identify which SLO is breaching

3. **Decision Tree**:

   **Option A: Defer Deployment** (Recommended)
   - Fix SLO breach first
   - Deploy after SLOs recover
   - Communicate delay to stakeholders

   **Option B: Emergency Override** (Critical hotfixes only)
   ```bash
   ./scripts/infra/slo-gate.sh override \
     security_vulnerability \
     cto@teei.io \
     CVE-2025-12345
   ```
   - Requires CTO approval
   - Audit trail logged
   - Post-mortem required

4. **Fix SLO Breach** (10-60 minutes)
   - Investigate root cause
   - Rollback problematic deployment
   - Scale resources if needed

5. **Verify Recovery** (60-90 minutes)
   - Check error budget >10%
   - Check burn rate <14.4x
   - Re-run deployment gate check

6. **Proceed with Deployment**
   - Deploy via normal process
   - Monitor SLOs during deployment
   - Rollback if SLOs degrade

---

## War Room Procedures

### War Room Activation

**When to Activate**:
- Severity 1 incident declared
- Error budget exhausted
- GDPR violation
- Customer-facing outage

**War Room Tools**:
- **Zoom**: https://zoom.us/j/teei-incident
- **Slack**: `#incident-response`
- **Grafana**: https://grafana.teei.io/d/slo-overview
- **PagerDuty**: Incident timeline

### War Room Roles

| Role | Responsibilities |
|------|------------------|
| **Incident Commander (IC)** | Overall incident leadership, decision-making, escalation |
| **Technical Lead** | Technical investigation, mitigation, rollback decisions |
| **Communications Lead** | Stakeholder updates, status page, customer communication |
| **Scribe** | Document timeline, actions, decisions |

### War Room Cadence

1. **Initial Huddle** (15 minutes)
   - Assess severity
   - Assign roles
   - Define success criteria

2. **Hourly Updates** (5 minutes)
   - IC summarizes progress
   - Update stakeholders
   - Adjust response plan

3. **Resolution Verification** (30 minutes)
   - Verify SLOs recovered
   - Confirm customer impact resolved
   - Document final timeline

4. **War Room Close**
   - Schedule post-mortem
   - Assign action items
   - Thank team

---

## Communication Templates

### Template 1: Incident Declared (Slack)

```
@channel 🚨 INCIDENT DECLARED - Severity 1

**Incident**: API Gateway Fast Burn
**Impact**: API latency degraded, error rate 5%
**Status**: Investigating
**War Room**: https://zoom.us/j/teei-incident
**Dashboard**: https://grafana.teei.io/d/slo-overview

**Next Update**: 30 minutes
```

### Template 2: Customer Communication (Status Page)

```
Subject: Service Degradation - API Latency

We are currently experiencing degraded performance on our API Gateway, affecting response times for all users.

Status: Investigating
Impact: API requests may be slower than normal
ETA: Investigating

We will provide updates every 30 minutes. Thank you for your patience.
```

### Template 3: Resolution (Slack)

```
@channel ✅ INCIDENT RESOLVED

**Incident**: API Gateway Fast Burn
**Duration**: 2 hours 15 minutes
**Root Cause**: Database connection pool exhaustion
**Mitigation**: Increased connection pool size, rolled back recent DB migration
**SLO Impact**: Consumed 5% of monthly error budget

**Post-Mortem**: Scheduled for 2025-11-17 2pm UTC
**Action Items**: See Jira TEEI-1234

Thank you to the incident response team! 🙏
```

---

## Post-Incident Review

### Post-Mortem Timeline

- **Within 24 hours**: Schedule post-mortem meeting
- **Within 48 hours**: Complete post-mortem document
- **Within 7 days**: Assign action items to sprint backlog

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date**: 2025-11-15
**Authors**: SRE Team
**Status**: Draft

## Incident Summary

**Duration**: 2 hours 15 minutes
**Severity**: Sev 1
**Impact**: API latency degraded, affecting 80% of users
**Root Cause**: Database connection pool exhaustion

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 14:00 | Alert fired: SLOFastBurn_APIGateway |
| 14:05 | On-call SRE acknowledged alert |
| 14:10 | Incident declared, war room started |
| 14:30 | Identified root cause: DB connection pool |
| 14:45 | Mitigation: Increased pool size 50→200 |
| 15:00 | Partial recovery observed |
| 15:30 | Rolled back recent DB migration |
| 16:15 | SLOs fully recovered, incident resolved |

## Root Cause

Recent database migration introduced N+1 query, exhausting connection pool.

## What Went Well

- Alert fired quickly (5 min to detect)
- War room activated promptly
- Rollback executed smoothly

## What Went Wrong

- Database migration not tested under load
- Connection pool size not monitored
- No pre-deployment DB query analysis

## Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| Add DB query analysis to CI/CD | Backend Lead | 2025-11-22 | High |
| Monitor DB connection pool in Grafana | SRE | 2025-11-18 | High |
| Load test all DB migrations | QA Lead | 2025-11-25 | Medium |

## Lessons Learned

1. Always load test database migrations
2. Monitor database connection pools proactively
3. War room procedures worked well
```

---

## Runbooks

### Runbook Links

| Alert | Runbook URL |
|-------|-------------|
| SLOFastBurn_APIGateway | https://runbooks.teei.io/slo-fast-burn |
| SLOSlowBurn_APIGateway | https://runbooks.teei.io/slo-slow-burn |
| ErrorBudgetExhausted | https://runbooks.teei.io/error-budget-exhausted |
| GDPRResidencyViolation | https://runbooks.teei.io/gdpr-violation |
| DeploymentBlocked_SLOBreach | https://runbooks.teei.io/deployment-gate-blocked |

---

## Appendix: Incident Response Checklist

### Severity 1 Incident Checklist

- [ ] Acknowledge alert within 15 minutes
- [ ] Declare incident in PagerDuty
- [ ] Start war room (Zoom + Slack)
- [ ] Assign IC, Tech Lead, Comms Lead, Scribe
- [ ] Update status page
- [ ] Notify stakeholders (Slack `#incident-response`)
- [ ] Freeze deployments
- [ ] Investigate root cause
- [ ] Implement mitigation
- [ ] Verify recovery
- [ ] Update status page (resolved)
- [ ] Notify stakeholders (resolution)
- [ ] Schedule post-mortem within 24 hours
- [ ] Complete post-mortem within 48 hours
- [ ] Assign action items to backlog

---

## References

- [SLO Definitions](/observability/slo/slo-definitions.yaml)
- [Error Budget Policy](/docs/Error_Budget_Policy.md)
- [SLO Gates Documentation](/docs/SLO_Gates.md)
- [Google SRE Book: Incident Management](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty Incident Response](https://response.pagerduty.com/)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-15 | SRE Team | Initial release |

**Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SRE Lead | TBD | TBD | TBD |
| VP Engineering | TBD | TBD | TBD |
| CTO | TBD | TBD | TBD |
