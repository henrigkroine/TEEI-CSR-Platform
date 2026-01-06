# Change Freeze Policy - TEEI CSR Platform Pilot

**Document Version:** 1.0
**Effective Date:** 2025-11-15
**Owner:** Platform Engineering & Success Team
**Review Cycle:** Weekly during pilot, Monthly post-pilot

---

## Executive Summary

This policy establishes change freeze windows during the TEEI CSR Platform pilot to ensure system stability, reduce risk during critical business hours, and provide a predictable deployment schedule for pilot tenants.

**Key Points:**
- Freeze windows protect pilot tenants during high-usage periods
- All production changes require approval during freeze windows
- Emergency changes follow a defined escalation process
- CAB (Change Advisory Board) provides governance oversight

---

## Table of Contents

1. [Freeze Window Schedule](#freeze-window-schedule)
2. [Change Advisory Board (CAB)](#change-advisory-board-cab)
3. [Approval Process](#approval-process)
4. [Emergency Change Procedure](#emergency-change-procedure)
5. [Rollback Protocol](#rollback-protocol)
6. [Communication Requirements](#communication-requirements)
7. [Monitoring & Compliance](#monitoring--compliance)
8. [FAQ](#faq)

---

## Freeze Window Schedule

### Pilot Week 1-2: Daily Overnight Freeze

**Freeze Period:** 16:00 UTC - 09:00 UTC (daily)

**Rationale:**
- Early pilot phase requires maximum stability
- Overnight freeze protects against deployment issues during low-coverage hours
- Allows for issue resolution during business hours

**Allowed Window:** 09:00 UTC - 16:00 UTC (7-hour window)

### Pilot Week 3-8: Weekend Freeze

**Freeze Period:** Friday 12:00 UTC - Monday 09:00 UTC

**Rationale:**
- Reduced on-call coverage during weekends
- Pilot tenants have critical business operations Monday-Friday
- Provides longer deployment windows (Monday-Friday morning)

**Allowed Window:** Monday 09:00 UTC - Friday 12:00 UTC (4.5 days)

### Post-Pilot (Week 9+)

**Freeze Period:** To be determined based on pilot learnings

**Review Criteria:**
- Incident frequency during pilot
- Tenant feedback on change cadence
- Platform stability metrics
- Business impact analysis

---

## Change Advisory Board (CAB)

### Charter

The CAB is responsible for:
- Reviewing and approving changes during freeze windows
- Assessing risk and business impact of proposed changes
- Ensuring adequate rollback plans are in place
- Tracking emergency overrides and post-incident reviews

### Membership

**Permanent Members:**
- Platform Engineering Lead (Chair)
- Site Reliability Engineer (SRE)
- Product Manager - Corporate Cockpit
- Customer Success Lead

**Optional Members (as needed):**
- Security Engineer
- Database Administrator
- Pilot Tenant Representative
- Executive Sponsor

### Meeting Schedule

- **Regular CAB:** Thursday 15:00 UTC (weekly during pilot)
- **Emergency CAB:** On-demand via Slack `/cab-emergency` command
- **Post-Incident Review:** Within 48 hours of any emergency change

### Quorum

- Minimum 3 members required for standard changes
- Minimum 2 members required for emergency changes
- Chair (or designated alternate) must be present

---

## Approval Process

### Standard Change During Freeze

1. **Submit Change Request**
   - Create PR with detailed description
   - Include business justification
   - Attach risk assessment and rollback plan
   - Tag with `change-request` label

2. **CAB Review**
   - CAB reviews at weekly meeting (or async via Slack)
   - Evaluates: risk, impact, timing, rollback plan
   - Decision: Approve, Defer, or Reject

3. **Approval Documentation**
   - Add `cab-approved` label to PR
   - Document decision in CAB meeting notes
   - Update change calendar

4. **Deployment**
   - CI/CD pipeline allows merge with `cab-approved` label
   - Deployment proceeds per standard process
   - Monitoring alerts active during deployment

### Fast-Track Approval (Low-Risk Changes)

**Eligible Changes:**
- Documentation updates
- Configuration tweaks (no code changes)
- Monitoring/alerting adjustments
- Synthetic monitor updates

**Process:**
1. Tag PR with `low-risk-change`
2. Get async approval from any CAB member
3. Add `cab-approved` label
4. Proceed with deployment

---

## Emergency Change Procedure

### Definition of Emergency

An emergency change addresses:
- Production outage or severe degradation (P0/P1 incidents)
- Security vulnerability requiring immediate patching
- Data integrity issue affecting pilot tenants
- Regulatory compliance violation

### Emergency Change Process

#### Step 1: Declare Emergency

```bash
# In Slack #platform-engineering channel
/incident declare
Title: [Brief description]
Severity: P0 or P1
Impact: [Affected tenants/systems]
```

#### Step 2: Create Emergency PR

1. Create PR with prefix: `[EMERGENCY]`
2. Add label: `emergency-change`
3. Include:
   - Incident ticket link
   - Root cause summary
   - Blast radius assessment
   - Rollback plan (tested)
   - Monitoring checklist

#### Step 3: Get Emergency Approvals

**Required:**
- 2 approvals from authorized personnel (see list below)
- At least 1 approval must be from SRE or Platform Lead

**Authorized Emergency Approvers:**
- Platform Engineering Lead
- Site Reliability Engineer
- CTO/VP Engineering
- On-call Engineer (if designated)

#### Step 4: Deploy with Override

**Option A: Via GitHub Actions**
```yaml
workflow_dispatch:
  inputs:
    override_freeze: true
    override_reason: "P0 incident #1234: Database corruption affecting ACME tenant"
```

**Option B: Manual Override** (if CI/CD unavailable)
```bash
# Document in emergency override issue
# Requires post-incident review within 24 hours
```

#### Step 5: Post-Emergency Actions

**Within 4 hours:**
- [ ] Update incident ticket with resolution
- [ ] Notify affected tenants
- [ ] Document change in CAB tracker

**Within 24 hours:**
- [ ] Conduct post-incident review
- [ ] Update runbook if needed
- [ ] Schedule CAB review of emergency override

**Within 1 week:**
- [ ] Present findings to CAB
- [ ] Update emergency procedures if gaps identified
- [ ] Close incident ticket

---

## Rollback Protocol

### Rollback Decision Criteria

Initiate rollback if:
- Synthetic monitors report 2+ consecutive failures
- Error rate increases >5% from baseline
- Customer-reported P0/P1 incident
- Data integrity concerns identified
- Deployment fails smoke tests

### Rollback Procedure

#### Automated Rollback (Preferred)

```bash
# Trigger rollback via GitHub Actions
gh workflow run rollback-production.yml \
  --ref main \
  --field version="previous-stable-tag" \
  --field reason="Failed smoke tests - error rate spike"
```

**Automated Process:**
1. Revert to previous stable image tag
2. Kubernetes rolling update to previous version
3. Run smoke tests to verify rollback
4. Update status page
5. Notify on-call and stakeholders

#### Manual Rollback (If automation fails)

1. **Identify Last Known Good (LKG) version**
   ```bash
   kubectl get deployment -n teei-production -o yaml | grep image:
   ```

2. **Update image tags to LKG**
   ```bash
   kubectl set image deployment/teei-api-gateway \
     teei-api-gateway=ghcr.io/teei/api-gateway:v1.2.3 \
     -n teei-production
   ```

3. **Verify rollout**
   ```bash
   kubectl rollout status deployment -n teei-production --timeout=10m
   ```

4. **Run smoke tests**
   ```bash
   npm run smoke-tests:production
   ```

5. **Document rollback**
   - Update incident ticket
   - Notify CAB and stakeholders
   - Schedule post-mortem

### Rollback SLA

- **Decision Time:** 5 minutes from failure detection
- **Execution Time:** 10 minutes for automated, 20 minutes for manual
- **Verification Time:** 5 minutes smoke tests
- **Total Rollback SLA:** 30 minutes

---

## Communication Requirements

### Pre-Change Communication

**For CAB-Approved Changes:**
- Notify pilot tenants 24 hours in advance
- Update status page with scheduled maintenance
- Post in #platform-updates Slack channel

**Template:**
```
Subject: Scheduled Maintenance - [Date] [Time UTC]

Dear [Tenant],

We will be deploying updates to the TEEI CSR Platform on [Date] at [Time UTC].

Expected Impact: [None/Brief downtime/Performance degradation]
Duration: [XX minutes]
Affected Features: [List]

Questions? Contact: support@teei-platform.com

Thank you,
TEEI Platform Team
```

### During Change Communication

**For Active Deployments:**
- Update status page: "Maintenance in progress"
- Monitor #platform-alerts for synthetic monitor alerts
- SRE on standby for rollback decision

**For Incidents:**
- Update incident ticket every 15 minutes
- Post status updates in Slack
- Notify tenants if impact exceeds 10 minutes

### Post-Change Communication

**For Successful Deployments:**
```
Subject: Maintenance Complete - [Feature Name]

Dear [Tenant],

The scheduled maintenance has been completed successfully.

What's New:
- [Feature/fix 1]
- [Feature/fix 2]

All systems are operational. Thank you for your patience.

TEEI Platform Team
```

**For Incidents:**
- RCA (Root Cause Analysis) within 48 hours
- Share learnings with tenants and CAB
- Update documentation and runbooks

---

## Monitoring & Compliance

### Synthetic Monitoring During Changes

All deployments trigger enhanced synthetic monitoring:

**Monitors Active:**
- Tenant login flows (3 pilot tenants)
- Dashboard page load (LCP < 2s budget)
- AI report generation (< 10s budget)
- PDF export functionality
- Approval workflow state machine
- Evidence explorer queries

**Alert Thresholds:**
- 2 consecutive failures → Rollback evaluation
- 3 consecutive failures → Automatic rollback
- Performance degradation >25% → Investigation

**Monitoring Dashboard:**
- Grafana: `https://grafana.teei-platform.com/d/pilot-monitoring`
- Synthetic Metrics: Updated every 5 minutes
- OTel Traces: `https://jaeger.teei-platform.com`

### Compliance Tracking

**Weekly CAB Report:**
- Total changes approved/rejected
- Emergency overrides count and reasons
- Freeze violations (if any)
- Rollback count and success rate
- Tenant impact summary

**Audit Trail:**
- All CAB decisions logged in GitHub Issues
- Emergency overrides tracked with dedicated issues
- Change calendar maintained in Confluence/Notion
- Incident tickets linked to changes

### Metrics Dashboard

**Key Metrics:**
- Mean Time to Approval (MTTA)
- Change Success Rate
- Rollback Rate
- Freeze Violation Rate
- Emergency Change Frequency

**Targets (Pilot Phase):**
- MTTA: < 24 hours
- Change Success Rate: > 95%
- Rollback Rate: < 5%
- Freeze Violations: 0
- Emergency Changes: < 1 per week

---

## FAQ

### Q: What happens if I accidentally merge during a freeze window?

**A:** The CI/CD pipeline will block the merge. The PR will be automatically commented with freeze details and options to proceed (CAB approval or emergency process).

### Q: Can I deploy documentation updates during a freeze?

**A:** Yes, if tagged as `low-risk-change` and approved by any CAB member. Documentation changes typically don't affect runtime systems.

### Q: How do I know if we're in a freeze window?

**A:** Check:
1. GitHub Actions status on your PR
2. Status page: `https://status.teei-platform.com`
3. Slack: `/freeze-status` command
4. This schedule (above)

### Q: What if a critical security patch is released during a freeze?

**A:** Follow the emergency change procedure. Security patches are eligible for emergency override with proper approvals and incident documentation.

### Q: Who can approve emergency changes?

**A:** See "Authorized Emergency Approvers" in the Emergency Change Procedure section. At least 2 approvals required, with at least 1 from SRE or Platform Lead.

### Q: Can tenants request changes during a freeze?

**A:** Tenants can submit requests, but deployment will wait until:
1. Freeze window ends (preferred), or
2. CAB approves during freeze, or
3. Emergency criteria met

### Q: How long do CAB approvals take?

**A:**
- Async (Slack): 2-4 hours during business hours
- Regular CAB meeting: Next Thursday (max 1 week)
- Emergency CAB: 30 minutes

### Q: What if we need to rollback a change made during a freeze?

**A:** Rollbacks are always allowed, regardless of freeze windows. Follow the Rollback Protocol above.

### Q: Are configuration changes subject to freezes?

**A:** Yes, any production changes are subject to freeze policy. However, config changes can be fast-tracked as low-risk with CAB member approval.

### Q: How will this policy change after the pilot?

**A:** The CAB will review this policy at the end of Week 8 based on:
- Incident data
- Tenant feedback
- Change velocity needs
- SRE team capacity

---

## Policy Review & Updates

**Review Schedule:**
- Weekly during pilot (Weeks 1-8)
- Monthly post-pilot
- After any emergency override
- Quarterly comprehensive review

**Amendment Process:**
1. Propose changes in CAB meeting
2. Collect feedback from stakeholders
3. Update policy document
4. Communicate changes to all teams
5. Update CI/CD workflows if needed

**Version History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-15 | Initial policy for pilot launch | Platform Engineering |

---

## Contact & Escalation

**Primary Contacts:**
- **CAB Chair:** platform-lead@teei.com
- **SRE On-Call:** Use PagerDuty rotation
- **Customer Success:** success@teei.com

**Escalation Path:**
1. SRE On-Call (incidents)
2. Platform Engineering Lead
3. VP Engineering
4. CTO (executive override)

**Communication Channels:**
- Slack: `#platform-engineering` (team)
- Slack: `#platform-alerts` (automated)
- Slack: `#cab-approvals` (change requests)
- Email: platform-team@teei.com

---

**Last Updated:** 2025-11-15
**Next Review:** 2025-11-22 (Weekly during pilot)
