# On-Call Rotation

24/7 on-call rotation for TEEI CSR Platform pilot production support.

## Overview

The on-call engineer is responsible for:

- Responding to production incidents within 15 minutes
- Triaging alerts and determining severity
- Coordinating incident response
- Executing runbooks and escalating when needed
- Documenting incidents and learnings

## Rotation Schedule

### Primary On-Call (24/7)

| Week Start | Primary Engineer | Secondary (Backup) |
|------------|------------------|-------------------|
| 2025-11-15 | Alice Chen       | Bob Martinez      |
| 2025-11-22 | Bob Martinez     | Charlie Kim       |
| 2025-11-29 | Charlie Kim      | Dana Patel        |
| 2025-12-06 | Dana Patel       | Alice Chen        |

**Rotation**: Weekly, Monday 00:00 UTC to Sunday 23:59 UTC

**Handoff**: Monday 09:00 UTC (30-minute video call)

### Escalation Path

```
┌─────────────────────┐
│  PagerDuty Alert    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Primary On-Call    │  ◄── Responds within 15 minutes
└──────────┬──────────┘
           │ (No response)
           ▼
┌─────────────────────┐
│  Secondary On-Call  │  ◄── Escalates after 15 minutes
└──────────┬──────────┘
           │ (Needs help)
           ▼
┌─────────────────────┐
│  Engineering Lead   │  ◄── Escalates for architectural issues
└──────────┬──────────┘
           │ (Critical incident)
           ▼
┌─────────────────────┐
│  CTO / VP Eng       │  ◄── Escalates for customer impact
└─────────────────────┘
```

## Contact Information

### On-Call Engineers

| Name | Phone | Slack | PagerDuty |
|------|-------|-------|-----------|
| Alice Chen | +1-555-0101 | @alice | alice.chen@pagerduty |
| Bob Martinez | +1-555-0102 | @bob | bob.martinez@pagerduty |
| Charlie Kim | +1-555-0103 | @charlie | charlie.kim@pagerduty |
| Dana Patel | +1-555-0104 | @dana | dana.patel@pagerduty |

### Escalation Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Engineering Lead | Sam Johnson | +1-555-0201 | @sam.johnson |
| CTO | Morgan Lee | +1-555-0301 | @morgan.lee |
| VP Engineering | Taylor Adams | +1-555-0302 | @taylor.adams |

### External Contacts

| Vendor | Contact | Purpose |
|--------|---------|---------|
| AWS Support | Premium Support | Infrastructure issues |
| Statuspage.io | support@statuspage.io | Status page issues |
| PagerDuty | support@pagerduty.com | PagerDuty issues |
| Auth0 | Premium Support | SSO/SAML issues |

## Alert Channels

### PagerDuty

**Service**: TEEI CSR Platform Production

**Integrations**:
- Prometheus AlertManager
- Synthetic Monitoring (GitHub Actions)
- Statuspage.io (incident sync)
- AWS CloudWatch (infrastructure)

**Urgency Levels**:
- **High**: Page immediately (phone call + SMS + push)
- **Low**: Slack notification only (business hours)

### Slack Channels

- **#oncall-alerts** - All production alerts (read-only)
- **#incident-response** - Active incident coordination
- **#oncall-handoff** - Weekly handoff discussions
- **#postmortems** - Incident retrospectives

### Discord

- **#operations-alerts** - Production alerts
- **#on-call** - On-call coordination

## Alert Severity

### SEV-1: Critical (Page Immediately)

**Criteria**:
- Complete service outage (all users impacted)
- Data loss or corruption
- Security breach
- Payment processing down
- Major outage >50% of users

**Response Time**: 15 minutes
**Update Frequency**: Every 15 minutes
**Escalation**: Immediately notify Engineering Lead

**Example Alerts**:
- "API Gateway is down"
- "Database connection pool exhausted"
- "All health checks failing"

### SEV-2: High (Page, Business Hours Only)

**Criteria**:
- Partial service degradation (<50% users)
- Non-critical feature broken
- Performance degradation (latency >2s)
- Error rate >5%

**Response Time**: 30 minutes
**Update Frequency**: Every 30 minutes
**Escalation**: After 2 hours if unresolved

**Example Alerts**:
- "Reporting service slow"
- "SSE connection failures"
- "Login success rate <95%"

### SEV-3: Medium (Slack Only)

**Criteria**:
- Single service degraded
- Non-user-facing issue
- Error rate 1-5%
- Synthetic check failing

**Response Time**: 2 hours (business hours)
**Update Frequency**: As needed
**Escalation**: Not required

**Example Alerts**:
- "Synthetic login flow failed"
- "Export queue backed up"
- "Cache hit rate low"

### SEV-4: Low (Monitor)

**Criteria**:
- Warning thresholds exceeded
- Potential future issue
- Non-impacting metric drift

**Response Time**: Next business day
**Update Frequency**: Daily
**Escalation**: Not required

**Example Alerts**:
- "Disk usage >70%"
- "API rate limit approaching"
- "Memory usage trending up"

## Incident Response Process

### 1. Alert Received (0-5 minutes)

1. **Acknowledge** alert in PagerDuty (stops escalation)
2. **Join** #incident-response Slack channel
3. **Check** status page: https://status.teei-csr.com
4. **Check** synthetics dashboard
5. **Check** Grafana dashboards

### 2. Initial Assessment (5-15 minutes)

1. **Determine severity** (SEV-1 to SEV-4)
2. **Post initial message** in #incident-response:
   ```
   🚨 INCIDENT: [Component] [Issue]
   Severity: SEV-X
   Impact: [Describe user impact]
   Started: [Timestamp]
   On-call: @engineer
   Status: Investigating
   ```
3. **Update status page** if SEV-1 or SEV-2:
   - Create incident
   - Post "Investigating" update
4. **Run diagnostics** (see runbooks)

### 3. Investigation (15-60 minutes)

1. **Review logs**:
   ```bash
   kubectl logs -n teei-csr <pod> --tail=100 --follow
   ```
2. **Check metrics** in Grafana
3. **Review recent changes**:
   ```bash
   kubectl rollout history deployment/<service> -n teei-csr
   ```
4. **Consult runbooks** (see below)
5. **Post updates** every 15-30 minutes

### 4. Mitigation (Ongoing)

1. **Apply fix** or **rollback** deployment
2. **Verify fix** with synthetics and metrics
3. **Update status page** to "Monitoring"
4. **Continue monitoring** for 30 minutes

### 5. Resolution (Final)

1. **Confirm issue resolved** (all metrics green)
2. **Update status page** to "Resolved"
3. **Post resolution** in #incident-response
4. **Document incident** in postmortem template
5. **Schedule postmortem** meeting (within 48 hours for SEV-1/SEV-2)

## Runbooks

Quick links to common runbooks:

- [Incident Response](./runbooks/incident_response.md) - General incident handling
- [Database Issues](./runbooks/database_issues.md) - Postgres troubleshooting
- [API Degradation](./runbooks/api_degradation.md) - API performance issues
- [Deployment Rollback](./runbooks/deployment_rollback.md) - How to rollback

## Common Commands

### Check Service Health

```bash
# All services
kubectl get pods -n teei-csr

# Specific service
kubectl describe pod <pod-name> -n teei-csr

# Logs
kubectl logs -n teei-csr <pod-name> --tail=100 --follow

# Events
kubectl get events -n teei-csr --sort-by='.lastTimestamp'
```

### Check Metrics

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Open http://localhost:9090

# Example queries
up{job="api-gateway"}
rate(http_requests_total{job="api-gateway"}[5m])
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/<service> -n teei-csr

# Rollback to previous version
kubectl rollout undo deployment/<service> -n teei-csr

# Rollback to specific revision
kubectl rollout undo deployment/<service> -n teei-csr --to-revision=3

# Check rollout status
kubectl rollout status deployment/<service> -n teei-csr
```

### Scale Service

```bash
# Scale up
kubectl scale deployment/<service> -n teei-csr --replicas=5

# Scale down
kubectl scale deployment/<service> -n teei-csr --replicas=2

# Check status
kubectl get deployment/<service> -n teei-csr
```

## Handoff Protocol

### Outgoing On-Call (Before Handoff)

1. Prepare handoff doc:
   - Open incidents
   - Ongoing issues
   - Flaky alerts
   - Upcoming maintenance
2. Schedule 30-minute handoff call
3. Update #oncall-handoff with summary

### Handoff Call Agenda

1. **Active incidents** (5 min)
   - Current status
   - Next steps
   - Who to escalate to

2. **Recent alerts** (10 min)
   - Patterns observed
   - False positives
   - Alert tuning needed

3. **System health** (5 min)
   - Any degraded services
   - Metrics trends
   - Capacity concerns

4. **Upcoming work** (5 min)
   - Scheduled deployments
   - Maintenance windows
   - Known risks

5. **Questions** (5 min)
   - Clarifications
   - Access verification
   - Tool walkthrough if needed

### Incoming On-Call (After Handoff)

1. Verify PagerDuty schedule updated
2. Test alert notification (send test page)
3. Verify access to:
   - AWS Console
   - Kubernetes cluster (kubectl)
   - Grafana dashboards
   - Datadog (if used)
   - PagerDuty web/app
4. Review open incidents in #incident-response
5. Post "On-call this week" message in #oncall-alerts

## On-Call Expectations

### During On-Call

- **Respond** to pages within 15 minutes (24/7)
- **Be available** with laptop and stable internet
- **Stay sober** and fit to respond
- **Escalate** if you need help (don't suffer alone)
- **Document** everything in #incident-response
- **Update** status page for SEV-1/SEV-2 incidents

### After On-Call

- **Write postmortems** for SEV-1/SEV-2 incidents (within 48 hours)
- **File tickets** for follow-up work
- **Improve runbooks** based on learnings
- **Update alerts** to reduce false positives

## Compensation

- **On-call stipend**: $X per week
- **Incident response**: Time-and-a-half for after-hours work
- **Time off**: 1 day off after SEV-1 incident resolved

## Training

All on-call engineers must complete:

1. **Runbook training** - Hands-on with all runbooks
2. **Access verification** - Verify access to all systems
3. **Shadow rotation** - Shadow current on-call for 1 week
4. **Tabletop exercise** - Simulated incident drill
5. **Rollback drill** - Practice deployment rollback

## Incident Metrics

Track these metrics for on-call effectiveness:

- **MTTD** (Mean Time To Detect) - How quickly we detect issues
- **MTTA** (Mean Time To Acknowledge) - How quickly we respond
- **MTTR** (Mean Time To Resolve) - How quickly we fix issues
- **False positive rate** - % of alerts that are not real issues
- **Escalation rate** - % of incidents requiring escalation

**Goal**: MTTA <15 min, MTTR <1 hour for SEV-1

## Support Resources

- **Runbooks**: [./runbooks/](./runbooks/)
- **Architecture Docs**: [../Platform_Architecture.md](../Platform_Architecture.md)
- **Observability**: [../Observability_Overview.md](../Observability_Overview.md)
- **Deployment Guide**: [../PROD_DEPLOY_RUNBOOK.md](../PROD_DEPLOY_RUNBOOK.md)

## Emergency Contacts

**After-Hours Critical Issues**:
- Engineering Lead: +1-555-0201
- CTO: +1-555-0301

**Vendor Emergency Lines**:
- AWS Premium Support: 1-877-AWS-SUPPORT
- Auth0 Critical Support: support.auth0.com (premium ticket)
