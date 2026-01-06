# Region Failover Runbook (US-EAST-1 → EU-CENTRAL-1)

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 5 minutes
**RPO Target**: < 10 seconds
**Owner**: SRE Team / dr-gameday-lead
**Escalation**: CTO, VP Engineering

---

## Overview

This runbook provides the step-by-step procedure for failing over the entire TEEI CSR Platform from the primary region (us-east-1) to the secondary region (eu-central-1) in the event of a catastrophic regional outage or during scheduled gameday drills.

**Scope**: All services, databases, message queues, CDN, and DNS.

---

## Pre-Failover Checklist

**Before executing failover, verify:**

- [ ] **Incident Severity**: Confirm region outage is affecting production workloads
- [ ] **Secondary Region Health**: Verify eu-central-1 cluster is healthy (`kubectl get nodes -n teei-prod-eu`)
- [ ] **Replication Status**: Check database replication lag (< 10 seconds acceptable)
- [ ] **Backup Availability**: Confirm recent backups exist (< 1 hour old)
- [ ] **Stakeholder Notification**: Alert executive team and customers (use `/ops/gameday/Communication_Template.md`)
- [ ] **Gameday vs Real**: Clearly mark if this is a drill or actual incident

---

## Failover Procedure

### Phase 1: Assessment (Target: 1 minute)

**1.1 Verify Primary Region Outage**
```bash
# Check AWS health dashboard
aws health describe-events --region us-east-1 --query 'events[?eventTypeCode==`AWS_OUTAGE`]'

# Test connectivity to primary K8s cluster
kubectl --context prod-us-east-1 get nodes
# Expected: Connection timeout or degraded node status

# Check replication lag
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
# Expected: < 10 seconds
```

**1.2 Capture Pre-Failover Evidence**
```bash
# Automated snapshot script
/home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase pre-failover
```

**Output**: Timestamp, replication lag, last successful transaction ID saved to `/ops/gameday/evidence/pre-failover-$(date +%s).json`

---

### Phase 2: Database Promotion (Target: 1 minute)

**2.1 Promote PostgreSQL Standby to Primary**
```bash
# Promote standby (this breaks replication intentionally)
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data

# Verify promotion
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: f (false = primary mode)
```

**2.2 Update Connection Pooler to EU Database**
```bash
# Update PgBouncer config to point to EU Postgres
kubectl --context prod-eu-central-1 patch cm pgbouncer-config -n teei-prod-eu \
  --patch '{"data":{"pgbouncer.ini":"[databases]\nteei = host=postgres-primary.teei-prod-eu.svc.cluster.local port=5432 dbname=teei\n"}}'

# Restart PgBouncer
kubectl --context prod-eu-central-1 rollout restart deployment/pgbouncer -n teei-prod-eu
```

**2.3 Verify Database Writability**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -c "INSERT INTO dr_test_table (test_timestamp) VALUES (NOW()) RETURNING *;"
# Expected: Success with current timestamp
```

**Evidence**: Promotion timestamp logged to audit table.

See: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md` for detailed Postgres steps.

---

### Phase 3: ClickHouse Promotion (Target: 30 seconds)

**3.1 Promote ClickHouse Replica**
```bash
# Stop replication from US cluster
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SYSTEM STOP FETCHES analytics.events_distributed;"

# Verify data is accessible
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SELECT count(*) FROM analytics.events_distributed WHERE timestamp > now() - INTERVAL 1 MINUTE;"
# Expected: Non-zero count (recent events present)
```

**3.2 Update ClickHouse Service Endpoint**
```bash
# No action needed - K8s service DNS already points to local cluster
# Applications in EU will automatically use local ClickHouse
```

See: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_ClickHouse_DR.md` for details.

---

### Phase 4: NATS JetStream Promotion (Target: 30 seconds)

**4.1 Promote NATS Mirror to Source**
```bash
# Update stream configuration to disable mirroring and enable direct writes
nats --context prod-eu-central-1 stream edit CSR_EVENTS --source "" --no-mirror

# Verify stream is writable
nats --context prod-eu-central-1 pub CSR_EVENTS.test "DR Test $(date)"
nats --context prod-eu-central-1 sub CSR_EVENTS.test --count=1
# Expected: Message received
```

**4.2 Update Publisher Configurations**
```bash
# Application configs automatically route to local NATS cluster via K8s service DNS
# No changes needed if apps use nats://nats.teei-prod-eu.svc.cluster.local:4222
```

See: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_NATS_Failover.md` for details.

---

### Phase 5: Application Services (Target: 1 minute)

**5.1 Scale Up EU Application Pods**
```bash
# Increase replicas to handle full production load
kubectl --context prod-eu-central-1 scale deployment/reporting-service -n teei-prod-eu --replicas=6
kubectl --context prod-eu-central-1 scale deployment/analytics-service -n teei-prod-eu --replicas=6
kubectl --context prod-eu-central-1 scale deployment/corp-cockpit -n teei-prod-eu --replicas=4

# Verify pods are Running
kubectl --context prod-eu-central-1 get pods -n teei-prod-eu -l app.kubernetes.io/component=api
# Expected: All pods Running and Ready
```

**5.2 Verify Service Health**
```bash
# Run smoke tests against EU cluster
/home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --region eu-central-1
```

**Expected Output**: All health checks pass (200 OK responses).

---

### Phase 6: DNS Cutover (Target: 1 minute)

**6.1 Update Route53 DNS Records**
```bash
# Update apex and wildcard records to point to EU load balancer
aws route53 change-resource-record-sets --hosted-zone-id Z1234EXAMPLE --change-batch file:///home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-eu.json

# Verify DNS propagation
dig +short api.teei.example.com
# Expected: EU region ALB IP address (52.58.x.x)
```

**6.2 Update Cloudflare WAF Rules**
```bash
# Update origin server to EU ALB
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -d '{"content":"eu-alb.teei.example.com"}'
```

See: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_DNS_Cutover.md` for full DNS procedure.

---

### Phase 7: Verification (Target: 1 minute)

**7.1 End-to-End Health Checks**
```bash
# Automated verification script
/home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --full

# Manual spot checks
curl -H "Authorization: Bearer ${TEST_TOKEN}" https://api.teei.example.com/health
curl https://cockpit.teei.example.com/api/status

# Verify database writes are succeeding
kubectl --context prod-eu-central-1 logs -n teei-prod-eu deployment/reporting-service --tail=50 | grep "INSERT"
```

**7.2 Monitor Error Rates**
```bash
# Check Prometheus for elevated error rates
kubectl --context prod-eu-central-1 port-forward -n teei-prod-eu svc/prometheus 9090:9090

# Open Grafana dashboard
open http://localhost:3000/d/dr-metrics/disaster-recovery-metrics
```

**Success Criteria**:
- [ ] API response time < 500ms (p95)
- [ ] Error rate < 0.1%
- [ ] Database replication lag = 0 (EU is now primary)
- [ ] All services reporting healthy status

---

### Phase 8: Evidence Capture (Target: 30 seconds)

**8.1 Capture Post-Failover Metrics**
```bash
# Automated evidence capture
/home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase post-failover

# Calculate RTO/RPO
/home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --calculate
```

**Output**:
- RTO: Time from outage detection to service restoration
- RPO: Data loss window (should be < 10 seconds)
- Artifacts saved to `/ops/gameday/evidence/failover-$(date +%Y%m%d-%H%M%S)/`

---

## Post-Failover Actions

**Within 1 Hour:**
- [ ] Update runbook with any deviations encountered
- [ ] Notify customers that service is restored (via status page)
- [ ] Brief executive team on failover execution
- [ ] Document lessons learned in Incident Report

**Within 24 Hours:**
- [ ] Complete post-mortem (if real incident)
- [ ] Generate SOC2 compliance evidence bundle
- [ ] Update capacity planning (EU cluster load testing)
- [ ] Schedule failback to US (if desired) - see `Runbook_Rollback.md`

**Within 1 Week:**
- [ ] Review and update RTO/RPO targets based on actual performance
- [ ] Conduct knowledge transfer session with SRE team
- [ ] Update disaster recovery documentation

---

## Rollback Procedure

If failover encounters critical issues, see:
- `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

**Note**: Rollback is complex due to database write divergence. Only attempt if failover was aborted before DNS cutover.

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| SRE Lead | On-call SRE | +1-555-SRE-TEAM | #sre-incidents |
| Database Admin | DBA On-call | +1-555-DBA-TEAM | #database-ops |
| VP Engineering | Jane Doe | +1-555-VP-ENG | @jane.doe |
| CTO | John Smith | +1-555-CTO-CELL | @john.smith |

---

## Appendices

### Appendix A: Expected Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Assessment | 1 min | 1 min |
| Database Promotion | 1 min | 2 min |
| ClickHouse Promotion | 30 sec | 2.5 min |
| NATS Promotion | 30 sec | 3 min |
| App Services | 1 min | 4 min |
| DNS Cutover | 1 min | 5 min |
| Verification | 1 min | 6 min |
| **Total RTO** | **6 min** | **< 7 min (within SLA)** |

### Appendix B: Common Failure Modes

**Issue**: Database promotion fails with "cannot promote while replication is broken"
**Solution**: Check WAL shipping status. Manually trigger final WAL sync before promotion.

**Issue**: DNS cutover takes > 5 minutes due to TTL caching
**Solution**: Pre-reduce TTL to 60 seconds during planned maintenance windows.

**Issue**: Application pods crash-loop after failover
**Solution**: Check database connection strings. Verify secrets are mounted correctly in EU namespace.

### Appendix C: Automation Readiness

**Current State**: Semi-automated (requires manual execution of scripts)

**Future Roadmap**:
- Q2 2026: Fully automated failover triggered by synthetic monitoring
- Q3 2026: Active-active multi-region (eliminate failover entirely)
- Q4 2026: Automated failback with zero data loss (CRDT-based conflict resolution)

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation for Phase G |

**Next Review Date**: 2026-02-15 (Quarterly)
