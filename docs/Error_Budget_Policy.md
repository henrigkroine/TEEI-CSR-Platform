# Error Budget Policy

**TEEI CSR Platform - SRE Reliability Framework**

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: SRE Team
**Contact**: sre@teei.io

---

## Table of Contents

1. [Overview](#overview)
2. [Error Budget Definition](#error-budget-definition)
3. [Error Budget Calculation](#error-budget-calculation)
4. [Error Budget Thresholds](#error-budget-thresholds)
5. [Policy Enforcement](#policy-enforcement)
6. [Deployment Restrictions](#deployment-restrictions)
7. [Exemptions and Overrides](#exemptions-and-overrides)
8. [Budget Reset Policy](#budget-reset-policy)
9. [Stakeholder Communication](#stakeholder-communication)
10. [Case Studies](#case-studies)

---

## Overview

The **Error Budget Policy** defines how the TEEI CSR Platform balances **innovation velocity** (new features, deployments) with **reliability** (service stability, uptime).

### Key Principle

> **Error budgets allow teams to fail within acceptable limits, encouraging innovation while maintaining reliability.**

An **error budget** is the maximum amount of unreliability a service can tolerate in a given time period (typically 30 days) before violating its SLO (Service Level Objective).

---

## Error Budget Definition

### What is an Error Budget?

An error budget is calculated as:

```
Error Budget = (1 - SLO) × Total Events in Measurement Window
```

For example:
- **Service**: API Gateway
- **SLO**: 99.9% availability
- **Measurement Window**: 30 days (720 hours)
- **Total Requests**: 1,000,000 requests/month

```
Error Budget = (1 - 0.999) × 1,000,000
             = 0.001 × 1,000,000
             = 1,000 errors allowed per month
```

This translates to **43.2 minutes of downtime** per month.

### Why Error Budgets?

1. **Quantify Reliability**: Converts abstract concepts like "high availability" into concrete numbers
2. **Balance Trade-offs**: Provides a framework for deciding when to prioritize features vs. reliability
3. **Shared Responsibility**: Aligns development, SRE, and product teams on acceptable risk levels
4. **Data-Driven Decisions**: Removes emotion from deployment decisions during incidents

---

## Error Budget Calculation

### SLO Targets (30-Day Window)

| Service | SLO Target | Error Budget | Max Downtime/Month | Max Errors/Million Requests |
|---------|------------|--------------|--------------------|-----------------------------|
| **API Gateway** | 99.9% | 0.1% | 43.2 minutes | 1,000 errors |
| **Reporting Service** | 99.5% | 0.5% | 3.6 hours | 5,000 errors |
| **Data Residency** | 99.99% | 0.01% | 4.32 minutes | 100 errors |
| **Web UI** | 99% | 1% | 7.2 hours | 10,000 errors |

### Error Budget Consumption

Error budget is consumed by:

1. **Service Downtime**: Complete service outages (5xx errors, connection failures)
2. **SLO Violations**: Latency exceeding targets, error rate breaches
3. **Partial Outages**: Degraded performance affecting subset of users
4. **Regional Outages**: Single region down (consumes regional budget)

### Error Budget Remaining

```
Error Budget Remaining = Error Budget - Errors Consumed
Budget Remaining % = (Error Budget Remaining / Error Budget) × 100
```

**Example**:
- API Gateway has consumed 800 of 1,000 allowed errors this month
- Error Budget Remaining = 1,000 - 800 = 200 errors
- Budget Remaining % = (200 / 1,000) × 100 = **20%**
- **Status**: **Yellow** (see thresholds below)

---

## Error Budget Thresholds

### Policy Levels

The error budget policy defines four levels based on budget remaining:

#### 🟢 **Green: Normal Operations** (>50% budget remaining)

**Policy**: Normal deployments allowed

**Actions**:
- ✅ All deployments permitted
- ✅ Automated deployments continue
- ✅ Canary rollouts proceed normally
- ✅ No restrictions on feature velocity

**Monitoring**:
- Daily SLO review
- Weekly error budget report

---

#### 🟡 **Yellow: Caution** (20-50% budget remaining)

**Policy**: Require approval for non-critical changes

**Actions**:
- ⚠️ **Deployment Approval Required**: Engineering Lead or SRE must approve all deployments
- ✅ **Critical Fixes Allowed**: Security patches, GDPR compliance fixes, data loss prevention
- ⚠️ **Non-Critical Deployments Reviewed**: Feature releases assessed for risk
- ✅ **Automated Rollbacks**: Increased monitoring during deployments

**Monitoring**:
- Daily SLO review with stakeholders
- Daily error budget burn rate analysis
- Incident retrospectives for all SLO breaches

**Communication**:
- Slack notification to `#sre-alerts`
- Email to Engineering Leadership
- Update SLO dashboard with yellow status

---

#### 🟠 **Orange: Freeze Deployments** (10-20% budget remaining)

**Policy**: Freeze deployments, focus on reliability

**Actions**:
- 🚫 **BLOCK All Deployments**: Except for critical hotfixes (see exemptions)
- 🔍 **Root Cause Analysis**: Investigate all recent SLO breaches
- 🛠️ **Reliability Work**: Focus engineering efforts on reliability improvements
- 📊 **Daily Leadership Sync**: CTO, VP Engineering, SRE Lead meet daily
- 🔧 **Rollback Plans**: Prepare rollback procedures for recent changes

**Monitoring**:
- Real-time SLO monitoring (1-minute alerts)
- Hourly burn rate analysis
- On-call engineer assigned to SLO monitoring

**Communication**:
- Slack notification to `#engineering-all` and `#sre-alerts`
- Email to C-Suite (CTO, CEO, CPO)
- Update SLO dashboard with orange status
- Prepare external communication plan (if customer-facing)

---

#### 🔴 **Red: Incident Response Mode** (<10% budget remaining or exhausted)

**Policy**: Incident declared, only hotfixes allowed

**Actions**:
- 🚨 **INCIDENT DECLARED**: Severity 1 incident triggered
- 🚫 **FREEZE ALL DEPLOYMENTS**: Only emergency hotfixes (with CTO approval)
- 👥 **War Room Activated**: All hands on deck for reliability
- 🔄 **Rollback Recent Changes**: Rollback all non-critical changes from past 7 days
- 📋 **Post-Mortem Required**: Blameless post-mortem within 48 hours
- 🛑 **Feature Freeze**: No new features until error budget recovers

**Monitoring**:
- 24/7 war room staffed by SRE + Engineering
- Real-time dashboards on office displays
- Every SLO breach triggers page to on-call

**Communication**:
- Slack notification to `#incident-response` (all engineers)
- Email to entire company
- Customer communication (if customer-impacting)
- Update SLO dashboard with red status
- Daily status updates to stakeholders

**Exit Criteria**:
- SLO recovers to >20% error budget remaining
- Root cause identified and mitigated
- Post-mortem completed
- Reliability improvements committed to backlog

---

## Policy Enforcement

### Automated Enforcement

1. **Prometheus Alerting**: Alerts fire when error budget thresholds are crossed
2. **Argo Rollouts Gates**: Deployments automatically blocked when SLOs breach
3. **GitHub Actions**: CI/CD checks SLO status before allowing merges to `main`
4. **Grafana Dashboard**: Real-time error budget status visible to all teams

### Manual Enforcement

1. **Engineering Lead Approval**: Required for yellow threshold deployments
2. **SRE Review**: Required for orange threshold exemptions
3. **CTO Approval**: Required for red threshold exemptions

---

## Deployment Restrictions

### Deployment Gating Logic

```yaml
# Pre-Deployment Gate (Argo Rollouts)
gates:
  - name: slo_health_check
    conditions:
      - error_budget_remaining > 10%
      - no_fast_burn_detected (burn_rate < 14.4x)
      - no_gdpr_violations
      - availability_slo_met
    action_on_failure: BLOCK_DEPLOYMENT
    override_allowed: true
    override_approval_required: CTO or VP_Engineering
```

### Deployment Decision Matrix

| Error Budget Remaining | Deployment Type | Decision | Approval Required |
|------------------------|-----------------|----------|-------------------|
| >50% (Green) | Feature Release | ✅ ALLOW | None |
| >50% (Green) | Hotfix | ✅ ALLOW | None |
| 20-50% (Yellow) | Feature Release | ⚠️ REVIEW | Engineering Lead |
| 20-50% (Yellow) | Hotfix | ✅ ALLOW | SRE Review |
| 10-20% (Orange) | Feature Release | 🚫 BLOCK | CTO Exception Only |
| 10-20% (Orange) | Hotfix (Security) | ⚠️ REVIEW | VP Engineering |
| <10% (Red) | Feature Release | 🚫 BLOCK | No Exceptions |
| <10% (Red) | Hotfix (Critical) | ⚠️ REVIEW | CTO + Post-Mortem Required |

---

## Exemptions and Overrides

### Allowed Exemption Reasons

The following scenarios allow **emergency override** of deployment gates:

1. **Security Vulnerability**: CVE patch, zero-day fix, active exploit mitigation
2. **Data Loss Prevention**: Urgent fix to prevent data corruption or loss
3. **GDPR Compliance Fix**: Regulatory violation fix (e.g., residency breach)
4. **Production Outage Fix**: Hotfix to restore service availability

### Exemption Approval Process

1. **Request Exemption**: Engineer submits exemption request via `/scripts/infra/slo-gate.sh override`
2. **Provide Justification**:
   - Exemption reason (from allowed list)
   - Incident ID or CVE number
   - Rollback plan
   - Expected impact on error budget
3. **Approval Required**:
   - **Yellow Threshold**: Engineering Lead
   - **Orange Threshold**: VP Engineering
   - **Red Threshold**: CTO
4. **Audit Logging**: All exemptions logged to audit trail (365-day retention)
5. **Post-Exemption Review**: Post-mortem required within 48 hours

### Exemption Audit Trail

```bash
# Example: Override SLO gate for security vulnerability
./slo-gate.sh override \
  --reason security_vulnerability \
  --incident CVE-2025-12345 \
  --approver john.doe@teei.io \
  --rollback-plan "Revert commit abc123 if error rate spikes"

# Audit log entry:
{
  "timestamp": "2025-11-15T14:30:00Z",
  "event_type": "slo_gate_override",
  "reason": "security_vulnerability",
  "approver": "john.doe@teei.io",
  "incident_id": "CVE-2025-12345",
  "deployment_id": "deploy-9876",
  "rollback_plan": "Revert commit abc123 if error rate spikes",
  "error_budget_before": "8%",
  "error_budget_after": "TBD"
}
```

---

## Budget Reset Policy

### Monthly Reset

**Error budgets reset on the 1st of each month at 00:00 UTC.**

### Why Monthly?

- Aligns with business reporting cycles (monthly/quarterly)
- Provides fresh start for teams after incidents
- Encourages long-term reliability investments

### Reset Process

1. **Automated Reset**: Prometheus recording rules recalculate budgets on 1st of month
2. **Budget Carryover**: **Not allowed** - each month starts fresh
3. **Incident Review**: Previous month's incidents reviewed in monthly SRE meeting
4. **Reliability Backlog**: Prioritize reliability work if budget was exhausted

### Exception: GDPR Violations

**GDPR violations do NOT reset monthly** - they require:
- Immediate incident declaration
- DPO (Data Protection Officer) notification
- Legal review
- Regulatory reporting (within 72 hours)

---

## Stakeholder Communication

### Internal Communication

| Error Budget Level | Audience | Channel | Frequency |
|--------------------|----------|---------|-----------|
| Green (>50%) | SRE Team | Slack `#sre` | Weekly Report |
| Yellow (20-50%) | Engineering + SRE | Slack `#sre-alerts` | Daily Updates |
| Orange (10-20%) | Engineering + Leadership | Email + Slack | Real-Time Alerts |
| Red (<10%) | Entire Company | Email + Slack `#incident-response` | Hourly Updates |

### External Communication

| Error Budget Level | Customer Impact | Communication | SLA |
|--------------------|-----------------|---------------|-----|
| Green (>50%) | None | None | N/A |
| Yellow (20-50%) | None | None | N/A |
| Orange (10-20%) | Possible Degradation | Status Page Update | 1 hour |
| Red (<10%) | Likely Outage | Status Page + Email | 30 minutes |

### Dashboard Visibility

- **Internal Teams**: Grafana SLO Dashboard (https://grafana.teei.io/d/slo-overview)
- **Leadership**: Weekly SLO Report (emailed every Monday)
- **Customers**: Public Status Page (https://status.teei.io)

---

## Case Studies

### Case Study 1: Yellow Threshold - Feature Freeze Prevented Outage

**Scenario**: API Gateway error budget dropped to 25% (yellow) after a database migration

**Actions Taken**:
1. Engineering Lead blocked all feature deployments
2. SRE investigated database slow queries
3. Database indexes added, reducing p95 latency from 250ms to 80ms
4. Error budget recovered to 45% within 3 days

**Outcome**:
- Feature freeze lasted 3 days
- No customer-facing outage
- Reliability investment prioritized over features
- Error budget recovered without hitting orange threshold

**Lessons Learned**:
- Yellow threshold policy prevented escalation to incident
- Early detection allowed proactive fixes
- Feature freeze was temporary, outage would have been worse

---

### Case Study 2: Red Threshold - Incident Response Mode

**Scenario**: Reporting Service error budget exhausted (0%) after GenAI prompt regression

**Actions Taken**:
1. Incident declared (Severity 1)
2. War room activated with all SRE + Backend engineers
3. Rollback of recent GenAI prompt changes
4. Customer communication sent via status page
5. Post-mortem completed within 24 hours

**Outcome**:
- Service recovered within 2 hours
- Error budget remained at 0% for remainder of month
- Feature freeze in place for 2 weeks
- Reliability work prioritized: better GenAI testing framework

**Lessons Learned**:
- Red threshold forced focus on reliability
- Rollback saved hours of debugging
- Post-mortem identified gaps in GenAI testing
- Team morale improved after transparent post-mortem

---

### Case Study 3: Exemption Approved - Security Vulnerability

**Scenario**: CVE-2025-12345 (critical SQL injection) discovered while error budget at 15% (orange)

**Actions Taken**:
1. Security team submitted exemption request
2. VP Engineering approved exemption
3. Hotfix deployed via expedited canary rollout
4. Post-deployment SLO monitoring (no degradation)
5. Post-mortem documented exemption justification

**Outcome**:
- Security vulnerability patched within 4 hours
- No SLO degradation from hotfix
- Exemption audit trail logged
- Team demonstrated mature incident response

**Lessons Learned**:
- Exemption process worked as designed
- Security vulnerabilities justify orange threshold overrides
- Transparent audit trail builds trust with stakeholders

---

## Appendix: Error Budget Formulas

### Error Budget Calculation

```
Error Budget = (1 - SLO) × Total Events in Measurement Window
```

### Error Budget Remaining

```
Error Budget Remaining = Error Budget - Errors Consumed
Budget Remaining % = (Error Budget Remaining / Error Budget) × 100
```

### Burn Rate

```
Burn Rate = (Actual Error Rate) / (Allowed Error Rate)
           = (1 - SLI) / (1 - SLO)
```

**Example**:
- SLO: 99.9% (allowed error rate: 0.1%)
- SLI: 99.5% (actual availability)
- Actual error rate: 0.5%
- Burn Rate = 0.5% / 0.1% = **5x**

This means the service is consuming error budget **5 times faster** than normal.

### Time to Exhaustion

```
Time to Exhaustion = (Budget Remaining %) / Burn Rate × Measurement Window
```

**Example**:
- Budget Remaining: 20%
- Burn Rate: 5x
- Measurement Window: 30 days

```
Time to Exhaustion = 20% / 5 × 30 days = 1.2 days
```

At this burn rate, error budget will be exhausted in **1.2 days**.

---

## References

- [Google SRE Book: Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [SLO Definitions](/observability/slo/slo-definitions.yaml)
- [SLO Gates Documentation](/docs/SLO_Gates.md)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-15 | SRE Team | Initial release |

**Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CTO | TBD | TBD | TBD |
| VP Engineering | TBD | TBD | TBD |
| SRE Lead | TBD | TBD | TBD |
