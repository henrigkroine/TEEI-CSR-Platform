# Incident Postmortem Template

**Incident ID**: INC-YYYY-XXXX
**Date of Incident**: YYYY-MM-DD
**Postmortem Author**: [Your Name]
**Postmortem Date**: YYYY-MM-DD
**Status**: [Draft / Under Review / Final]

---

## Executive Summary

**TL;DR**: [1-2 sentence summary of what happened, impact, and resolution]

**Example**:
> On 2025-11-18, the TEEI CSR Platform experienced a 45-minute outage affecting all pilot customers due to a Redis cache misconfiguration. The issue was resolved by increasing cache memory allocation from 2GB to 4GB. No data loss occurred, but 120 users were unable to access dashboards during the outage.

---

## Incident Details

### 1. Basic Information

| Field | Value |
|-------|-------|
| **Incident ID** | INC-2025-XXXX |
| **Severity** | [P0 / P1 / P2 / P3] |
| **Services Affected** | [e.g., Cockpit UI, Reporting API, Q2Q Pipeline] |
| **Start Time** | YYYY-MM-DD HH:MM UTC |
| **End Time** | YYYY-MM-DD HH:MM UTC |
| **Duration** | [e.g., 45 minutes] |
| **Detection Method** | [Synthetic monitor, User report, Alert, Manual discovery] |
| **Detection Lag** | [Time between incident start and detection] |

### 2. Impact Assessment

**Users Affected**:
- **Total Impacted**: [Number of users or tenants]
- **Percentage**: [% of total user base]
- **Pilot Customers**: [List of affected pilot organizations]

**Business Impact**:
- **Revenue Loss**: [Estimated $ or "N/A for pilot"]
- **SLA Breach**: [Yes/No, details if applicable]
- **Customer Escalations**: [Number of support tickets, escalations to leadership]
- **Reputational Impact**: [Social media mentions, customer sentiment]

**Technical Impact**:
- **Data Loss**: [Yes/No, describe if applicable]
- **Data Integrity**: [Compromised/Intact]
- **Performance Degradation**: [Describe latency, error rates]
- **Downstream Systems**: [Impact on Impact-In, Benevity, etc.]

**Quantitative Metrics**:
- **Requests Failed**: [Total number or rate]
- **Error Rate**: [Peak error rate, e.g., 85% 5xx errors]
- **Latency**: [P95 latency during incident, e.g., 12 seconds]
- **Uptime**: [Uptime % for the day, e.g., 98.5%]

---

## Timeline of Events

**Format**: Use UTC timestamps. Include detection lag, mitigation steps, and resolution.

| Time (UTC) | Event | Owner | Notes |
|------------|-------|-------|-------|
| **00:00** | **Incident Start** | System | [What triggered the incident] |
| 00:05 | Synthetic monitor alert fired | PagerDuty | Alert: "Dashboard endpoint returning 500" |
| 00:07 | On-call engineer paged | SRE Lead | Response time: 2 minutes |
| 00:10 | Investigation started | SRE Lead | Checked logs, metrics dashboards |
| 00:15 | Root cause identified | Backend Lead | Redis cache memory exhausted (OOM errors) |
| 00:20 | Mitigation plan decided | SRE Lead | Increase Redis memory allocation |
| 00:25 | Configuration updated | DevOps | Updated Kubernetes resource limits |
| 00:30 | Redis pod restarted | DevOps | Manual restart to apply new config |
| 00:35 | Cache warming started | Backend Lead | Pre-populated tenant metadata |
| 00:40 | Health checks green | SRE Lead | All services returned to normal |
| 00:45 | **Incident Resolved** | SRE Lead | Monitoring continued for 1 hour |
| 01:00 | Postmortem scheduled | SRE Lead | Meeting set for next day |

**Detection Lag**: 5 minutes (incident started at 00:00, detected at 00:05)

**Time to Mitigation**: 20 minutes (detected at 00:05, mitigation started at 00:25)

**Time to Resolution**: 40 minutes (detected at 00:05, resolved at 00:45)

---

## Root Cause Analysis

### What Happened?

**Proximate Cause** (immediate trigger):
> [Describe the direct cause of the incident]
>
> **Example**: Redis cache memory reached 100% capacity (2GB limit), causing out-of-memory (OOM) errors. The cache eviction policy was set to `noeviction`, which rejected new writes instead of evicting old keys. This caused all cache-dependent API endpoints to fail with 500 errors.

**Contributing Factors** (conditions that allowed it to happen):
1. **Insufficient Capacity Planning**: Redis memory allocation (2GB) was based on development workload, not production pilot load
2. **Monitoring Gap**: No alert configured for Redis memory usage > 80%
3. **Eviction Policy Misconfiguration**: `noeviction` policy was too aggressive for production use; should have been `allkeys-lru`
4. **Lack of Load Testing**: Load tests used synthetic data with smaller cache footprint than real pilot data

### 5 Whys Analysis

**Problem Statement**: Why did the cockpit dashboard return 500 errors?

1. **Why did the dashboard return 500 errors?**
   - Because the reporting API failed to fetch tenant metadata from Redis cache

2. **Why did the API fail to fetch from Redis?**
   - Because Redis rejected new cache writes due to OOM errors

3. **Why did Redis run out of memory?**
   - Because the cache size (2GB) was insufficient for pilot tenant data (actual usage: 3.2GB)

4. **Why was the cache size insufficient?**
   - Because capacity planning was based on development workload, not production pilot data

5. **Why was capacity planning based on development workload?**
   - Because load tests did not include production-representative tenant metadata volume

**Root Cause**: Inadequate capacity planning due to load tests not using production-representative data

---

## What Went Well

> Highlight positives to reinforce good practices

1. **Fast Detection**: Synthetic monitors detected the issue within 5 minutes
2. **Clear Runbooks**: On-call engineer followed Redis troubleshooting runbook, identified root cause quickly
3. **Effective Communication**: Status page updated within 10 minutes, stakeholders notified via Slack
4. **No Data Loss**: Read-only cache failure did not compromise data integrity
5. **Team Coordination**: SRE, Backend, and DevOps teams collaborated efficiently in war room

---

## What Went Wrong

> Honest assessment of failures and gaps

1. **Insufficient Monitoring**: No proactive alert for Redis memory usage before OOM
2. **Inadequate Load Testing**: Load tests did not simulate real pilot tenant data volume
3. **Configuration Error**: `noeviction` policy too strict for production; should have been `allkeys-lru`
4. **No Capacity Buffer**: Redis allocated at exactly estimated capacity, with no headroom for growth
5. **Detection Lag**: 5-minute delay between incident start and alert (users noticed first)

---

## Lessons Learned

### Technical Lessons
1. **Always provision 2x expected capacity** for caches and databases to accommodate growth and spikes
2. **Eviction policies matter**: Use `allkeys-lru` for caches, not `noeviction`, to gracefully degrade instead of failing hard
3. **Production-representative load tests**: Load tests must use real tenant metadata volume, not synthetic data
4. **Monitor saturation metrics**: Alert on memory, disk, CPU, connection pool usage at 80% thresholds

### Process Lessons
1. **Capacity planning review**: Add capacity planning review to CAB checklist for all infrastructure changes
2. **Pre-launch cache warming**: Warm caches with real pilot data before go-live to validate capacity
3. **Graduated rollout**: Deploy to 10% of tenants first (canary) to catch capacity issues early

### Communication Lessons
1. **Proactive updates**: Post status page updates every 15 mins during incidents, not just at start/end
2. **Customer empathy**: Reach out to affected pilot customers directly, not just broadcast updates

---

## Action Items

> SMART action items: Specific, Measurable, Assignable, Realistic, Time-bound

| ID | Action Item | Owner | Priority | Due Date | Status |
|----|-------------|-------|----------|----------|--------|
| **AI-001** | Add Redis memory usage alert (threshold: 80%) | SRE Lead | P0 | 2025-11-20 | ✅ Done |
| **AI-002** | Update Redis eviction policy to `allkeys-lru` | Backend Lead | P0 | 2025-11-20 | ✅ Done |
| **AI-003** | Increase Redis memory to 8GB (2x pilot requirement) | DevOps | P0 | 2025-11-20 | ✅ Done |
| **AI-004** | Re-run load tests with production tenant data | QA Lead | P1 | 2025-11-22 | 🔄 In Progress |
| **AI-005** | Add capacity planning review to CAB checklist | CAB Chair | P1 | 2025-11-25 | ⏳ Pending |
| **AI-006** | Update runbook with cache warming procedure | SRE Lead | P2 | 2025-11-27 | ⏳ Pending |
| **AI-007** | Document eviction policy decision in architecture docs | Backend Lead | P3 | 2025-11-30 | ⏳ Pending |

**Priority Levels**:
- **P0**: Critical, must complete within 24-48 hours
- **P1**: High priority, complete within 1 week
- **P2**: Medium priority, complete within 2 weeks
- **P3**: Low priority, complete within 1 month

---

## Resolution and Recovery

### Immediate Fix (Deployed During Incident)
- Increased Redis memory allocation from 2GB to 4GB
- Restarted Redis pod to apply new configuration
- Warmed cache with tenant metadata

### Permanent Fix (Post-Incident)
- Updated infrastructure-as-code (Terraform) to set Redis memory to 8GB
- Changed eviction policy to `allkeys-lru` in Kubernetes ConfigMap
- Added Grafana dashboard for Redis saturation metrics
- Configured PagerDuty alert for Redis memory > 80%

### Validation
- Ran load tests with 3x expected pilot load for 2 hours
- Verified cache eviction behavior under memory pressure
- Confirmed alerts fire correctly at 80% memory threshold

---

## Preventive Measures

> How to prevent this class of incident in the future

### Short-Term (Next 7 Days)
1. **Audit all cache configurations**: Review Redis, Memcached, in-memory caches for capacity and eviction policies
2. **Add saturation alerts**: Ensure all stateful services (DB, cache, storage) have 80% usage alerts
3. **Update load tests**: Include production-representative data volume in all load test scenarios

### Medium-Term (Next 30 Days)
1. **Capacity planning framework**: Define capacity headroom standards (2x expected, 50% buffer)
2. **Pre-launch checklist update**: Add cache warming and saturation metric review
3. **Runbook enhancement**: Document cache troubleshooting, eviction policy tuning

### Long-Term (Next Quarter)
1. **Auto-scaling for caches**: Implement horizontal scaling for Redis (cluster mode)
2. **Capacity forecasting**: Use historical metrics to predict future capacity needs
3. **Chaos engineering**: Regularly simulate cache failures to validate resilience

---

## Supporting Data

### Graphs and Dashboards

**Include screenshots or links to**:
1. **Redis Memory Usage**: Show OOM spike at incident time
2. **Error Rate Dashboard**: Show 5xx error spike
3. **Request Latency**: Show P95 latency spike
4. **Alert Timeline**: PagerDuty alert history

**Example**:
![Redis Memory Usage](https://grafana.example.com/d/redis-memory/snapshot?from=1637193600&to=1637197200)

### Logs

**Relevant log excerpts** (sanitize sensitive data):

```
[2025-11-18T00:00:12Z] ERROR redis: OOM command not allowed when used memory > 'maxmemory'
[2025-11-18T00:00:13Z] ERROR reporting-api: Failed to set cache key 'tenant:123:metadata' - Redis connection refused
[2025-11-18T00:00:14Z] ERROR cockpit-ui: API request failed - GET /api/v2/tenants/123/dashboard - 500 Internal Server Error
```

### Metrics

**Quantitative data**:
- **Peak Redis Memory Usage**: 2.1GB (105% of limit)
- **Peak Error Rate**: 85% (3,400 failed requests out of 4,000 total)
- **Peak Latency**: P95 = 12 seconds (normal: 0.5 seconds)
- **Total Requests Failed**: 15,300 over 45 minutes

---

## Appendix: Related Incidents

**Similar Past Incidents**:
- **INC-2025-0042** (2025-10-05): PostgreSQL connection pool exhaustion → Added connection pool monitoring
- **INC-2025-0018** (2025-08-12): Disk space full on log volume → Added disk usage alerts

**Pattern**: Saturation-related incidents due to missing capacity monitoring

**Recommendation**: Conduct quarterly capacity review for all stateful services

---

## Postmortem Review

**Review Status**: [Pending / Approved]

**Reviewed By**:
- [ ] SRE Lead
- [ ] Backend Lead
- [ ] VP Engineering
- [ ] Product Owner

**Approval Date**: YYYY-MM-DD

**Published To**:
- [ ] Engineering team (Slack #incidents)
- [ ] Pilot customers (via customer success)
- [ ] Leadership (email summary)

---

## Example Postmortem: Synthetic Monitor Failure

**Incident ID**: INC-2025-0123
**Date of Incident**: 2025-11-20
**Postmortem Author**: incident-scribe
**Postmortem Date**: 2025-11-21
**Status**: Final

---

### Executive Summary

On November 20, 2025, at 14:30 UTC, all Datadog synthetic monitors for the TEEI CSR Platform reported "Unavailable" status for 2 hours, triggering false-positive alerts and paging on-call engineers. Investigation revealed that Datadog's monitoring infrastructure experienced a regional outage in US-EAST-1, not an issue with the TEEI platform. The incident was resolved when Datadog restored service at 16:30 UTC. No actual platform downtime occurred, but 5 engineers were paged unnecessarily, and stakeholders received incorrect status page updates.

---

### Incident Details

| Field | Value |
|-------|-------|
| **Incident ID** | INC-2025-0123 |
| **Severity** | P2 (False positive, but created confusion) |
| **Services Affected** | Datadog Synthetic Monitors (not TEEI platform) |
| **Start Time** | 2025-11-20 14:30 UTC |
| **End Time** | 2025-11-20 16:30 UTC |
| **Duration** | 2 hours |
| **Detection Method** | PagerDuty alert: "All synthetics down" |
| **Detection Lag** | 1 minute |

---

### Impact Assessment

**Users Affected**:
- **Platform Users**: 0 (platform was operational)
- **Engineering Team**: 5 engineers paged unnecessarily

**Business Impact**:
- **Revenue Loss**: $0 (no actual outage)
- **SLA Breach**: No
- **Customer Escalations**: 2 pilot customers asked about status page update
- **Reputational Impact**: Minor confusion, clarified via follow-up email

**Technical Impact**:
- **Data Loss**: No
- **Data Integrity**: Intact
- **Performance Degradation**: None
- **Downstream Systems**: Unaffected

---

### Timeline of Events

| Time (UTC) | Event | Owner | Notes |
|------------|-------|-------|-------|
| **14:30** | **Incident Start** | Datadog | Datadog US-EAST-1 region outage |
| 14:31 | PagerDuty alert: "All synthetics down" | PagerDuty | 5 engineers paged |
| 14:33 | On-call engineer acknowledged | SRE Lead | Response time: 2 minutes |
| 14:35 | Checked TEEI platform health | SRE Lead | All services green, no errors in logs |
| 14:40 | Confirmed platform operational | Backend Lead | Manual smoke tests passed |
| 14:45 | Investigated Datadog status | SRE Lead | Datadog status page: "Investigating" |
| 14:50 | Posted status page update | SRE Lead | "Monitoring provider issue, platform operational" |
| 15:00 | Opened Datadog support ticket | SRE Lead | Ticket #987654 |
| 16:30 | Datadog restored service | Datadog | Synthetics reporting correctly |
| 16:35 | **Incident Resolved** | SRE Lead | Closed PagerDuty alert |
| 17:00 | Postmortem scheduled | SRE Lead | Meeting set for next day |

---

### Root Cause Analysis

**Proximate Cause**:
> Datadog's synthetic monitoring infrastructure experienced a regional outage in US-EAST-1, causing all TEEI platform monitors to report "Unavailable" status, even though the platform was fully operational.

**Contributing Factors**:
1. **Single Monitoring Vendor**: All synthetic monitors ran on Datadog; no redundancy
2. **Alert Logic**: Alerts fired on "monitor unavailable" status, not just "endpoint down"
3. **Status Page Automation**: Status page automatically updated based on Datadog status, without manual verification
4. **No Multi-Region Monitors**: All synthetics ran from US-EAST-1, no fallback to EU or APAC regions

---

### What Went Well

1. **Fast Validation**: On-call engineer quickly validated platform was operational (within 10 mins)
2. **Communication**: Status page updated promptly to clarify monitoring issue vs. platform issue
3. **No User Impact**: Actual users unaffected, pilot customers reassured quickly

---

### What Went Wrong

1. **False Positive Alerts**: 5 engineers paged unnecessarily, wasted 2 hours of investigation time
2. **Status Page Confusion**: Automated status page update caused unnecessary customer concern
3. **Single Point of Failure**: Only one monitoring vendor, no redundancy
4. **Alert Logic Too Broad**: Alerts should distinguish between "endpoint down" and "monitor unavailable"

---

### Lessons Learned

1. **Monitoring redundancy**: Use multiple monitoring vendors (e.g., Datadog + Pingdom) to avoid false positives
2. **Alert nuance**: Configure alerts to fire only on "endpoint down", not "monitor unavailable"
3. **Manual status page updates**: Require manual approval before posting status page incidents
4. **Multi-region monitors**: Run synthetics from multiple regions to detect regional outages vs. platform issues

---

### Action Items

| ID | Action Item | Owner | Priority | Due Date | Status |
|----|-------------|-------|----------|----------|--------|
| **AI-101** | Add Pingdom as secondary monitoring vendor | SRE Lead | P1 | 2025-11-27 | ⏳ Pending |
| **AI-102** | Update PagerDuty alert logic to exclude "monitor unavailable" | SRE Lead | P1 | 2025-11-25 | 🔄 In Progress |
| **AI-103** | Disable automatic status page updates, require manual approval | DevOps | P1 | 2025-11-23 | ✅ Done |
| **AI-104** | Configure Datadog synthetics from EU and APAC regions | SRE Lead | P2 | 2025-12-01 | ⏳ Pending |
| **AI-105** | Document "false positive incident" runbook | SRE Lead | P2 | 2025-11-30 | ⏳ Pending |

---

### Resolution and Recovery

**Immediate Fix**:
- Manually verified platform operational
- Updated status page to clarify monitoring provider issue

**Permanent Fix**:
- Added Pingdom as secondary monitoring vendor
- Updated PagerDuty alert logic to ignore "monitor unavailable" status
- Disabled automatic status page updates

---

### Preventive Measures

**Short-Term**:
1. Add Pingdom synthetics for critical endpoints (login, dashboard, API health)
2. Update runbook to include "validate platform manually before posting status page incident"

**Medium-Term**:
1. Configure multi-region monitors (US, EU, APAC) for all critical endpoints
2. Implement alert correlation logic (require 2+ monitors failing before paging)

**Long-Term**:
1. Build internal synthetic monitoring to reduce third-party dependency
2. Implement auto-remediation for common false positives

---

**Postmortem Reviewed and Approved**: 2025-11-21
**Published To**: Engineering team, CAB members

---

**End of Postmortem Template**
