# Gameday Playbook: PostgreSQL Failover

**ID**: GAMEDAY-002
**Scenario**: Primary PostgreSQL database failure
**Duration**: 1.5 hours
**Participants**: SRE, Database Admin, Backend teams
**Severity**: Critical
**RTO Target**: ≤60 minutes
**RPO Target**: ≤15 minutes

---

## Objectives

1. Validate automatic failover to replica
2. Verify zero data loss (WAL replay)
3. Test connection pool recovery
4. Verify read/write capability post-failover
5. Document failover timeline

---

## Pre-Gameday Checklist

- [ ] Verify replication lag <5s
- [ ] Create pre-failover backup
- [ ] Confirm replica promotion script tested
- [ ] Alert stakeholders 48h in advance
- [ ] Verify connection string points to cluster (not primary IP)

---

## Success Metrics

| Metric | Target | Result |
|--------|--------|--------|
| Failover Time | ≤5m | ___ |
| Replication Lag | ≤15m | ___ |
| Data Loss | 0 rows | ___ |
| Service Downtime | 0s | ___ |

---

## Execution Steps

See `/chaos/experiments/postgres-failover.yaml` for automation.
