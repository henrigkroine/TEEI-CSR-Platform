# Incident Response Runbook

General playbook for responding to production incidents.

## Quick Reference

**Alert received → Acknowledge → Assess → Investigate → Mitigate → Resolve → Document**

## Prerequisites

- On-call rotation active
- PagerDuty configured
- Access to Kubernetes cluster
- Access to Grafana dashboards
- Access to Statuspage.io

## Step-by-Step Response

### Step 1: Alert Received (0-2 minutes)

When you receive a PagerDuty alert:

1. **Read the alert** - Understand what triggered it
2. **Acknowledge in PagerDuty** - Stops escalation timer
3. **Note the time** - Record when you were paged

**Example alert**:
```
Service: api-gateway
Alert: High Error Rate
Details: 5xx error rate >10% for last 5 minutes
Severity: SEV-1
```

### Step 2: Initial Triage (2-5 minutes)

1. **Join incident channel**:
   - Slack: #incident-response
   - Discord: #operations-alerts

2. **Post initial message**:
   ```
   🚨 INCIDENT ALERT
   Service: [service-name]
   Issue: [brief description]
   Severity: [SEV-X]
   Investigating: @your-name
   Started: [timestamp]
   Status: Acknowledged, investigating
   ```

3. **Check status page**: https://status.teei-csr.com
   - See if incident already created
   - Check other component status

4. **Quick health check**:
   ```bash
   # Run synthetic uptime probe
   ./scripts/synthetics/uptime-probe.sh
   ```

### Step 3: Determine Severity (5-10 minutes)

Use this decision tree:

```
Is service completely down?
├── YES → SEV-1 (Critical)
└── NO
    └── Are >50% of users impacted?
        ├── YES → SEV-1 (Critical)
        └── NO
            └── Is critical functionality broken?
                ├── YES → SEV-2 (High)
                └── NO
                    └── Is it performance degradation?
                        ├── YES → SEV-2 or SEV-3
                        └── NO → SEV-3 or SEV-4
```

**Severity definitions**:

- **SEV-1**: Complete outage, >50% users impacted, data loss
- **SEV-2**: Partial outage, <50% users, critical feature broken
- **SEV-3**: Single service degraded, non-critical
- **SEV-4**: Warning threshold, no user impact

### Step 4: Update Status Page (10-15 minutes)

For **SEV-1** and **SEV-2** incidents:

1. **Create incident** on Statuspage.io:
   - Title: "[Service] Experiencing Issues"
   - Status: Investigating
   - Impact: [Describe user impact]
   - Components affected: [List components]

2. **Post initial update**:
   ```
   We are investigating elevated error rates affecting [service].
   Users may experience [specific impact].
   We will provide updates every 15 minutes.
   ```

3. **Notify stakeholders**:
   - SEV-1: Page Engineering Lead immediately
   - SEV-2: Notify in #incident-response

### Step 5: Initial Investigation (15-30 minutes)

#### Check Service Pods

```bash
# List all pods
kubectl get pods -n teei-csr

# Check specific service
kubectl get pods -n teei-csr -l app=api-gateway

# Describe pod (see events)
kubectl describe pod <pod-name> -n teei-csr

# Check pod logs
kubectl logs -n teei-csr <pod-name> --tail=100 --follow
```

**Look for**:
- CrashLoopBackOff
- ImagePullBackOff
- OOMKilled
- Error messages in logs
- Connection errors

#### Check Metrics

1. **Open Grafana**: Port-forward if needed
   ```bash
   kubectl port-forward -n monitoring svc/grafana 3000:3000
   # Open http://localhost:3000
   ```

2. **Check key metrics**:
   - Request rate: `rate(http_requests_total[5m])`
   - Error rate: `rate(http_requests_total{status=~"5.."}[5m])`
   - Latency: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - CPU usage: `container_cpu_usage_seconds_total`
   - Memory usage: `container_memory_usage_bytes`

3. **Check Prometheus alerts**:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   # Open http://localhost:9090/alerts
   ```

#### Check Recent Changes

```bash
# Check deployment rollout history
kubectl rollout history deployment/api-gateway -n teei-csr

# Check recent pod events
kubectl get events -n teei-csr --sort-by='.lastTimestamp' | head -20

# Check recent ConfigMap/Secret changes
kubectl get events -n teei-csr --field-selector involvedObject.kind=ConfigMap
```

**Questions to ask**:
- Was there a recent deployment?
- Were any ConfigMaps or Secrets updated?
- Are there Kubernetes events indicating issues?

#### Check Dependencies

```bash
# Check database connectivity
kubectl exec -it <api-pod> -n teei-csr -- nc -zv postgresql.teei-csr.svc.cluster.local 5432

# Check external API connectivity
kubectl exec -it <api-pod> -n teei-csr -- curl -I https://external-api.example.com/health
```

**Common dependencies**:
- PostgreSQL database
- Redis cache
- External APIs (Auth0, payment gateway)
- AWS services (S3, SES)

### Step 6: Hypothesis Formation (30-45 minutes)

Based on investigation, form a hypothesis:

**Example hypotheses**:

1. **"Recent deployment introduced a bug"**
   - Evidence: Error spike started at deployment time
   - Action: Rollback deployment

2. **"Database connection pool exhausted"**
   - Evidence: "connection refused" errors in logs
   - Action: Scale up connection pool or restart service

3. **"External API outage"**
   - Evidence: Timeouts calling external service
   - Action: Enable circuit breaker or use fallback

4. **"Resource exhaustion (CPU/memory)"**
   - Evidence: Pods OOMKilled, high CPU usage
   - Action: Scale horizontally or increase resources

5. **"Traffic spike (DDoS?)"**
   - Evidence: 10x normal request rate
   - Action: Enable rate limiting or scale up

### Step 7: Mitigation Actions

Choose mitigation based on hypothesis:

#### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n teei-csr

# Check rollback status
kubectl rollout status deployment/api-gateway -n teei-csr

# Verify fix
./scripts/synthetics/uptime-probe.sh
```

See: [Deployment Rollback Runbook](./deployment_rollback.md)

#### Restart Service

```bash
# Restart all pods
kubectl rollout restart deployment/api-gateway -n teei-csr

# Or delete specific pod (will be recreated)
kubectl delete pod <pod-name> -n teei-csr
```

#### Scale Service

```bash
# Scale up replicas
kubectl scale deployment/api-gateway -n teei-csr --replicas=10

# Check autoscaling
kubectl get hpa -n teei-csr
```

#### Database Recovery

See: [Database Issues Runbook](./database_issues.md)

```bash
# Check database status
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "SELECT version();"

# Check active connections
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Enable Feature Flag

```bash
# Disable problematic feature via ConfigMap
kubectl edit configmap feature-flags -n teei-csr

# Change:
# ENABLE_NEW_FEATURE: "true"
# To:
# ENABLE_NEW_FEATURE: "false"

# Restart pods to pick up change
kubectl rollout restart deployment/api-gateway -n teei-csr
```

### Step 8: Verification (45-60 minutes)

After mitigation, verify fix:

1. **Check synthetics**:
   ```bash
   # Run uptime probe
   ./scripts/synthetics/uptime-probe.sh

   # Run login flow synthetic
   pnpm exec playwright test scripts/synthetics/login-flow.spec.ts
   ```

2. **Check metrics**:
   - Error rate back to <0.5%
   - Latency back to <500ms
   - No 5xx errors in logs

3. **Monitor for 15-30 minutes**:
   - Watch Grafana dashboards
   - Check for error rate creeping back up
   - Verify no new alerts

### Step 9: Status Page Updates

Update status page as you progress:

1. **Investigating → Identified**:
   ```
   We have identified the issue as [root cause].
   We are implementing a fix now.
   ```

2. **Identified → Monitoring**:
   ```
   A fix has been deployed. We are monitoring recovery.
   ```

3. **Monitoring → Resolved**:
   ```
   The issue has been resolved. All systems are operating normally.
   We will conduct a postmortem and share learnings.
   ```

### Step 10: Resolution & Handoff (60+ minutes)

1. **Confirm resolution**:
   - All metrics green for 30+ minutes
   - Synthetics passing
   - No new errors in logs

2. **Update status page**:
   - Mark incident as "Resolved"
   - Post final update with timeline

3. **Post in #incident-response**:
   ```
   ✅ INCIDENT RESOLVED
   Service: [service-name]
   Duration: [start] to [end] ([X] minutes)
   Root cause: [brief summary]
   Mitigation: [what we did]
   Next steps: Postmortem scheduled for [date/time]
   ```

4. **Resolve PagerDuty incident**

5. **Create postmortem doc**:
   - Use template: `.github/ISSUE_TEMPLATE/postmortem.md`
   - Schedule meeting within 48 hours for SEV-1/SEV-2

6. **File follow-up tickets**:
   - Bug fixes
   - Monitoring improvements
   - Runbook updates
   - Alert tuning

## Communication Templates

### Initial Alert

```
🚨 INCIDENT: [Service] [Issue]
Severity: SEV-X
Impact: [User-facing impact]
Started: 2025-11-15 14:30 UTC
On-call: @engineer
Status: Investigating
Dashboard: [Grafana link]
```

### Update (Every 15-30 minutes)

```
📊 UPDATE: [Service] Incident
Status: [Investigating | Identified | Monitoring]
Latest: [What we've learned / what we're doing]
Next update: [Time]
```

### Resolution

```
✅ RESOLVED: [Service] Incident
Duration: [X] minutes
Root cause: [Brief summary]
Mitigation: [What we did]
Postmortem: [Link or "scheduled for X"]
```

## Escalation Triggers

Escalate to Engineering Lead if:

- **SEV-1** incident (always escalate immediately)
- Unable to identify root cause within 1 hour
- Mitigation attempts failing
- Architectural decision needed
- Multiple services impacted

Escalate to CTO/VP Eng if:

- **SEV-1** lasting >2 hours
- Data loss or security breach
- Major customer impact
- Media/PR implications

## Common Pitfalls

1. **Not acknowledging alert** → Auto-escalates unnecessarily
2. **Not updating status page** → Customers left in dark
3. **Rolling forward instead of back** → Delays recovery
4. **Not verifying fix** → Issue recurs
5. **Not documenting** → Can't learn from incident

## Success Criteria

- ✅ Alert acknowledged within 5 minutes
- ✅ Initial investigation complete within 15 minutes
- ✅ Status page updated within 15 minutes (SEV-1/SEV-2)
- ✅ Mitigation attempted within 30 minutes
- ✅ Issue resolved or escalated within 1 hour
- ✅ Postmortem doc created within 24 hours
- ✅ Follow-up tickets filed

## Related Runbooks

- [Database Issues](./database_issues.md)
- [API Degradation](./api_degradation.md)
- [Deployment Rollback](./deployment_rollback.md)

## Postmortem Template

After resolution, use this template:

```markdown
# Postmortem: [Service] [Issue]

## Incident Summary
- **Date**: 2025-11-15
- **Duration**: 45 minutes (14:30 - 15:15 UTC)
- **Severity**: SEV-2
- **Impact**: ~15% of API requests failed

## Timeline
- 14:30 - Alert triggered for high error rate
- 14:32 - On-call acknowledged, began investigation
- 14:38 - Root cause identified: recent deployment bug
- 14:42 - Deployment rolled back
- 14:50 - Metrics back to normal
- 15:15 - Incident resolved after monitoring period

## Root Cause
[Detailed explanation]

## Resolution
[What we did to fix it]

## Impact Assessment
- Users affected: ~500 users
- Failed requests: ~2,000 out of 13,000 (15%)
- Data loss: None
- SLA impact: 99.5% → 99.2% (temporary)

## What Went Well
- Quick detection via synthetic monitoring
- Fast rollback (10 minutes)
- Good communication on status page

## What Went Wrong
- Deployment not caught by E2E tests
- No canary deployment
- Alert threshold too high (should trigger earlier)

## Action Items
- [ ] Add E2E test for this scenario (#123)
- [ ] Implement canary deployments (#124)
- [ ] Lower error rate alert threshold from 10% to 5% (#125)
- [ ] Update runbook with this scenario (#126)

## Lessons Learned
[Key takeaways]
```
