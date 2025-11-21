# Region Failover Runbook

**Owner**: SRE Team
**Severity**: P0 - Critical
**Last Updated**: 2025-11-17
**Review Frequency**: Quarterly

## Overview

This runbook covers the procedures for failing over the TEEI CSR Platform from one region to another in the event of a regional outage or degradation.

**SLO Impact**: Regional failover should complete within **15 minutes** (RTO) with **< 5 minutes** of data loss (RPO).

---

## Pre-Requisites

- [ ] Access to AWS/GCP console for all regions
- [ ] kubectl configured for all clusters
- [ ] Access to DNS management (Route53/Cloud DNS)
- [ ] Access to database replication controls
- [ ] Incident commander assigned
- [ ] Stakeholders notified via #incidents channel

---

## Decision Criteria

**Trigger failover if**:
- Primary region API availability < 50% for > 5 minutes
- Primary region database unreachable for > 2 minutes
- Multiple critical services down in primary region
- Natural disaster/datacenter outage confirmed by cloud provider

**Do NOT trigger failover if**:
- Single service degradation (use service-level recovery instead)
- Temporary network blip (< 2 minutes)
- Scheduled maintenance window

---

## Failover Procedure

### Phase 1: Assessment (Target: 2 minutes)

1. **Verify Primary Region Status**
   ```bash
   # Check synthetic monitoring
   curl https://status.teei-platform.com/api/regions/us-east-1/health

   # Check Grafana - Region Health Dashboard
   # URL: https://grafana.teei-platform.com/d/region-health

   # Check cluster health
   kubectl --context us-east-1 cluster-info
   kubectl --context us-east-1 get nodes
   ```

2. **Verify Secondary Region Readiness**
   ```bash
   # Check EU region
   kubectl --context eu-central-1 cluster-info
   kubectl --context eu-central-1 get pods -n teei-csr

   # Verify database replication lag
   psql -h eu-central-1-db-replica.teei.internal -c "
     SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
   "
   # ✅ Acceptable: < 5 seconds
   # ⚠️  Warning: 5-30 seconds
   # 🚨 Critical: > 30 seconds (data loss risk)
   ```

3. **Document Decision**
   ```bash
   # Create incident ticket
   gh issue create \
     --repo teei/platform \
     --title "[P0] Region Failover: US-EAST-1 → EU-CENTRAL-1" \
     --label incident,p0,failover \
     --body "Primary region: us-east-1
   Secondary region: eu-central-1
   Triggered by: [YOUR NAME]
   Reason: [OUTAGE DESCRIPTION]
   Time: $(date -Iseconds)"
   ```

---

### Phase 2: Pre-Failover Preparation (Target: 3 minutes)

4. **Enable Maintenance Mode**
   ```bash
   # Set Trust Center status to "Partial Outage"
   curl -X POST https://api.teei-platform.com/internal/status \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{
       "status": "partial_outage",
       "message": "Executing region failover - brief interruption expected",
       "components": {
         "api": "degraded",
         "database": "maintenance"
       }
     }'
   ```

5. **Stop Writes to Primary Region** (if accessible)
   ```bash
   # Scale down write-heavy services in primary region
   kubectl --context us-east-1 scale deployment \
     impact-calculator reporting q2q-ai analytics \
     --replicas=0 -n teei-csr

   # Wait for graceful shutdown (max 30s)
   sleep 30
   ```

6. **Promote Secondary Database to Primary**
   ```bash
   # Promote read replica to primary
   aws rds promote-read-replica \
     --db-instance-identifier teei-eu-central-1-primary \
     --region eu-central-1

   # Wait for promotion to complete (typically 1-2 minutes)
   aws rds wait db-instance-available \
     --db-instance-identifier teei-eu-central-1-primary \
     --region eu-central-1

   # Verify promotion
   psql -h eu-central-1-db.teei.internal -c "SELECT pg_is_in_recovery();"
   # Expected: f (false = primary)
   ```

---

### Phase 3: DNS and Traffic Switchover (Target: 5 minutes)

7. **Update DNS to Point to Secondary Region**
   ```bash
   # Update Route53 records
   aws route53 change-resource-record-sets \
     --hosted-zone-id $HOSTED_ZONE_ID \
     --change-batch file://failover-dns-change.json

   # Contents of failover-dns-change.json:
   # {
   #   "Changes": [{
   #     "Action": "UPSERT",
   #     "ResourceRecordSet": {
   #       "Name": "api.teei-platform.com",
   #       "Type": "A",
   #       "SetIdentifier": "EU-CENTRAL-1",
   #       "Weight": 100,
   #       "AliasTarget": {
   #         "HostedZoneId": "...",
   #         "DNSName": "api-eu-central-1-lb.teei.internal",
   #         "EvaluateTargetHealth": true
   #       }
   #     }
   #   }]
   # }

   # Verify DNS propagation
   dig api.teei-platform.com +short
   # Should return EU region IP
   ```

8. **Update Load Balancer Weights**
   ```bash
   # If using weighted routing, shift 100% to EU
   kubectl --context eu-central-1 patch service api-gateway \
     -n teei-csr \
     -p '{"spec": {"externalTrafficPolicy": "Local"}}'
   ```

---

### Phase 4: Service Activation in Secondary Region (Target: 3 minutes)

9. **Scale Up Services in Secondary Region**
   ```bash
   # Scale up all services to production capacity
   kubectl --context eu-central-1 apply -f k8s/overlays/eu-central-1/replica-patch.yaml

   # Verify deployments are healthy
   kubectl --context eu-central-1 get deployments -n teei-csr
   kubectl --context eu-central-1 get pods -n teei-csr | grep -v Running
   # Expected: no output (all pods Running)
   ```

10. **Verify Database Connections**
    ```bash
    # Test database connectivity from new region
    kubectl --context eu-central-1 exec -n teei-csr \
      deploy/api-gateway -- \
      psql $DATABASE_URL -c "SELECT 1;"

    # Check active connections
    psql -h eu-central-1-db.teei.internal -c "
      SELECT count(*) FROM pg_stat_activity WHERE datname = 'teei_platform';
    "
    # Expected: > 10 connections (services connected)
    ```

---

### Phase 5: Validation (Target: 2 minutes)

11. **Run Synthetic Health Checks**
    ```bash
    # Run full synthetic test suite against new region
    cd services/synthetics
    REGION=eu-central-1 pnpm monitor:all

    # Expected: All monitors pass
    ```

12. **Verify Critical User Journeys**
    - [ ] Login: `curl -I https://api.teei-platform.com/auth/health`
    - [ ] Boardroom: `curl -I https://api.teei-platform.com/boardroom/health`
    - [ ] Reporting: `curl -I https://api.teei-platform.com/reports/health`
    - [ ] Exports: `curl -I https://api.teei-platform.com/exports/health`

13. **Check Error Rates and Latency**
    ```bash
    # Prometheus queries
    # Error rate (should be < 0.1%)
    curl -G https://prometheus.teei-platform.com/api/v1/query \
      --data-urlencode 'query=rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])'

    # p95 latency (should be < 500ms)
    curl -G https://prometheus.teei-platform.com/api/v1/query \
      --data-urlencode 'query=histogram_quantile(0.95, http_request_duration_seconds_bucket)'
    ```

---

### Phase 6: Post-Failover Cleanup

14. **Update Status Page**
    ```bash
    curl -X POST https://api.teei-platform.com/internal/status \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d '{
        "status": "operational",
        "message": "Failover to EU region completed successfully",
        "incident_resolved": true
      }'
    ```

15. **Notify Stakeholders**
    - [ ] Post in #incidents: "Failover complete, all services operational in EU region"
    - [ ] Email to CTO/VP Engineering
    - [ ] Update incident ticket with resolution time

16. **Schedule Postmortem**
    - [ ] Create postmortem doc: `docs/postmortems/YYYY-MM-DD-region-failover.md`
    - [ ] Schedule meeting within 48 hours
    - [ ] Tag: "p0", "region-failover", "lessons-learned"

---

## Rollback Procedure

If secondary region is unhealthy after failover:

1. **Stop traffic to secondary**
   ```bash
   kubectl --context eu-central-1 scale deployment --all --replicas=0 -n teei-csr
   ```

2. **Re-assess primary region**
   - If primary recovered, reverse DNS changes
   - If primary still down, escalate to multi-region outage procedure

3. **Engage cloud provider support** for assistance

---

## Monitoring During Failover

**Key Dashboards**:
- Grafana: Region Health Dashboard - https://grafana.teei-platform.com/d/region-health
- Grafana: SLO Monitoring - https://grafana.teei-platform.com/d/slo-monitoring
- Status Page: https://status.teei-platform.com

**Alert Channels**:
- Slack: #incidents
- PagerDuty: SRE on-call
- Discord: Engineering webhook

---

## Recovery Time Objectives (RTO/RPO)

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| **RTO** (Recovery Time) | 10 min | 15 min | > 20 min |
| **RPO** (Data Loss) | 0 min | 5 min | > 10 min |
| **Detection Time** | 1 min | 2 min | > 5 min |
| **Failover Execution** | 8 min | 12 min | > 15 min |

---

## Contacts

- **SRE On-Call**: PagerDuty rotation
- **Database Team**: db-team@teei.com
- **Cloud Provider Support**: Via console
- **Incident Commander**: Designated in #incidents

---

## Related Runbooks

- [Database Restore](./database-restore.md)
- [Service Recovery](./service-recovery.md)
- [Network Outage](./network-outage.md)
- [DR Smoke Tests](../../scripts/dr/smoke.sh)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-17 | Worker 12 SRE Team | Initial version |
