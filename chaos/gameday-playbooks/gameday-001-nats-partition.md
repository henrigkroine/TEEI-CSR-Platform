# Gameday Playbook: NATS Partition

**ID**: GAMEDAY-001
**Scenario**: NATS message broker network partition
**Duration**: 2 hours
**Participants**: SRE, Backend, Platform teams
**Severity**: High
**RTO Target**: ≤60 minutes
**RPO Target**: ≤15 minutes

---

## Objectives

1. Validate event buffering and retry logic in all services
2. Verify RTO ≤60m for full NATS recovery
3. Verify RPO ≤15m (no event loss beyond 15 minutes of data)
4. Test alerting and incident response procedures
5. Document recovery timeline and blockers

---

## Pre-Gameday Checklist

- [ ] **Schedule**: Announce 48h in advance, block 2h time slot
- [ ] **Participants**: Confirm attendance (SRE lead, 2 backend engineers, platform engineer)
- [ ] **Monitoring**: Verify Grafana dashboards accessible
- [ ] **Alerts**: Ensure PagerDuty/Slack notifications enabled
- [ ] **Backup**: Create pre-chaos database snapshot
- [ ] **Stakeholders**: Notify leadership, set status page to "Maintenance"
- [ ] **Rollback**: Verify rollback script tested in staging

---

## Gameday Timeline

### T-15 minutes: Pre-Flight

**Actions**:
```bash
# 1. Verify all services healthy
kubectl get pods -n teei-prod | grep -v Running

# 2. Check NATS consumer lag baseline
kubectl exec -n teei-prod nats-0 -- nats consumer info --all

# 3. Take metrics snapshot
curl -X POST http://prometheus:9090/api/v1/admin/tsdb/snapshot

# 4. Open monitoring dashboards
open https://grafana.teei.com/d/nats-overview
open https://grafana.teei.com/d/event-lag
```

**Expected**: All pods Running, consumer lag <10 messages, dashboards green

---

### T+0: Chaos Injection

**Actions**:
```bash
# Apply NATS partition chaos
kubectl apply -f chaos/experiments/nats-partition.yaml

# Verify chaos active
kubectl get networkchaos -n teei-prod

# Start timer
echo "Chaos started at $(date +%H:%M:%S)"
```

**Expected**: NetworkChaos "nats-partition" status: Running

**Monitoring**:
- Watch NATS consumer lag increase (Grafana: NATS dashboard)
- Watch service logs for connection errors (`kubectl logs -f deployment/api-gateway`)
- Watch alerts fire in Slack/PagerDuty

---

### T+5 minutes: Event Buffering

**Observations to Record**:
1. How quickly did consumer lag start increasing?
2. Are services logging retry attempts?
3. Did circuit breakers engage?
4. Any user-facing errors in Corp Cockpit?

**Validation**:
```bash
# Check event buffer size
kubectl exec -n teei-prod api-gateway-xxx -- curl localhost:3000/metrics | grep event_buffer

# Check retry counts
kubectl exec -n teei-prod reporting-xxx -- curl localhost:3001/metrics | grep nats_retry
```

**Success Criteria**:
- Services buffer events in-memory or local queue
- Retry logic engaged with exponential backoff
- No user-facing errors (Corp Cockpit still responsive)

---

### T+10 minutes: Partition Heals

**Actions**:
```bash
# Remove chaos (partition heals)
kubectl delete networkchaos nats-partition -n teei-prod

# Verify NATS connectivity restored
kubectl exec -n teei-prod nats-0 -- nats server check connection

# Start recovery timer
echo "Partition healed at $(date +%H:%M:%S)"
```

**Expected**: NATS reports healthy connections within 30 seconds

---

### T+15 minutes: Event Replay

**Observations to Record**:
1. How long until consumer lag returns to baseline?
2. Were all buffered events delivered?
3. Any duplicate events detected?
4. Did services auto-recover or need manual intervention?

**Validation**:
```bash
# Monitor consumer lag recovery
watch -n 5 'kubectl exec -n teei-prod nats-0 -- nats consumer info --all | grep "Lag:"'

# Check for duplicate events (idempotency)
kubectl logs -n teei-prod reporting-xxx | grep "duplicate_event"

# Verify data integrity
kubectl exec -n teei-prod postgresql-0 -- psql -U teei -c \
  "SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '20 minutes';"
```

**Success Criteria**:
- Consumer lag returns to <10 messages within 15 minutes
- Zero event loss (compare pre-chaos count to post-recovery count)
- Idempotency keys prevent duplicates

---

### T+30 minutes: RTO Verification

**Actions**:
```bash
# Calculate RTO (time from partition start to full recovery)
# Expected: ≤60 minutes

# Verify all metrics green
kubectl exec -n teei-prod prometheus-0 -- promtool query instant http://localhost:9090 \
  'up{namespace="teei-prod"}'

# Check Corp Cockpit SSE streams
curl -N http://api-gateway.teei-prod/v1/metrics/stream
```

**Success Criteria**:
- RTO ≤60 minutes (partition heal + event replay complete)
- All services healthy
- SSE streams delivering real-time data

---

### T+45 minutes: RPO Verification

**Actions**:
```bash
# Query events table for data loss
kubectl exec -n teei-prod postgresql-0 -- psql -U teei -c \
  "SELECT MIN(created_at), MAX(created_at), COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '1 hour';"

# Compare to pre-chaos snapshot
# Calculate data loss window

# Check audit logs for any missing critical events
kubectl logs -n teei-prod audit-logger-xxx | grep -E "(buddy.match|kintell.session|report.generated)"
```

**Success Criteria**:
- RPO ≤15 minutes (no data loss beyond 15-minute window)
- All critical business events accounted for

---

### T+60 minutes: Incident Response Test

**Actions**:
1. Review alert timeline (when did first alert fire?)
2. Validate PagerDuty escalation (who was paged?)
3. Check runbook effectiveness (did team follow documented steps?)
4. Test communication (was status page updated?)

**Questions to Answer**:
- Did alerts provide actionable information?
- Did on-call engineer have access to runbooks?
- Were stakeholders notified appropriately?

---

### T+90 minutes: Post-Mortem

**Debrief Topics**:
1. What went well?
2. What could be improved?
3. Were RTO/RPO targets met?
4. Any code/config changes needed?
5. Update runbooks with learnings

**Artifacts to Create**:
- [ ] Incident report (use template in `/docs/incidents/template.md`)
- [ ] Timeline of events (use Grafana snapshots)
- [ ] Action items (create Jira tickets)
- [ ] Updated runbook (commit to `/chaos/gameday-playbooks/`)

---

## Success Metrics

| Metric | Target | Result | Status |
|--------|--------|--------|--------|
| RTO (Recovery Time) | ≤60m | ___ min | ☐ Pass ☐ Fail |
| RPO (Data Loss Window) | ≤15m | ___ min | ☐ Pass ☐ Fail |
| Event Loss Count | 0 | ___ events | ☐ Pass ☐ Fail |
| User-Facing Errors | 0 | ___ errors | ☐ Pass ☐ Fail |
| Alert Fire Time | ≤2m | ___ min | ☐ Pass ☐ Fail |
| Team Response Time | ≤10m | ___ min | ☐ Pass ☐ Fail |

---

## Rollback Procedure

If gameday causes production impact:

```bash
# 1. Immediately remove chaos
kubectl delete networkchaos nats-partition -n teei-prod

# 2. Force NATS pod restart (if needed)
kubectl delete pod nats-0 -n teei-prod

# 3. Verify connectivity
kubectl exec -n teei-prod nats-0 -- nats server check connection

# 4. Update status page
curl -X POST https://status.teei.com/api/incidents \
  -d '{"status": "resolved", "message": "NATS connectivity restored"}'

# 5. Notify stakeholders
# Post in #incidents Slack channel
```

---

## Next Gameday

**Scheduled**: [Date TBD]
**Scenario**: PostgreSQL failover (GAMEDAY-002)
**Improvements from this gameday**:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

---

## References

- [NATS Monitoring Dashboard](https://grafana.teei.com/d/nats-overview)
- [Event Lag Dashboard](https://grafana.teei.com/d/event-lag)
- [Runbook: NATS Partition](../runbooks/nats-partition.md)
- [Incident Template](../../docs/incidents/template.md)
