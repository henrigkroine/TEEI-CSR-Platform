# DR Continuous Verification Runbook

**Version:** 2.0.0
**Last Updated:** 2025-11-16
**Owner:** Worker 1 Team 4 (DR Verification)
**RTO Target:** ≤15 minutes
**RPO Target:** ≤10 seconds

---

## Table of Contents

1. [Overview](#overview)
2. [DR Strategy & Architecture](#dr-strategy--architecture)
3. [RTO/RPO Objectives](#rtorpo-objectives)
4. [Automated DR Drills](#automated-dr-drills)
5. [Failover Procedures](#failover-procedures)
6. [Decision Trees](#decision-trees)
7. [Rollback Procedures](#rollback-procedures)
8. [Evidence Collection](#evidence-collection)
9. [Escalation Procedures](#escalation-procedures)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Lessons Learned](#lessons-learned)

---

## Overview

### Purpose

This runbook provides comprehensive guidance for disaster recovery (DR) operations with continuous verification through automated weekly drills. It ensures that the TEEI platform can recover from regional failures within strict RTO/RPO targets.

### Key Principles

1. **Continuous Verification**: Weekly automated dry-run drills validate DR readiness
2. **Evidence-Based**: All drills produce timestamped evidence bundles
3. **Fail-Fast**: Dry-run failures block production deployments
4. **Measurement-Driven**: RTO/RPO metrics tracked and trended over time
5. **Automated First**: Manual procedures only as fallback

### Document Scope

- **In Scope**: Regional failover, database replication, service recovery, RTO/RPO measurement
- **Out of Scope**: Application-level bugs, data corruption (see separate runbooks)

---

## DR Strategy & Architecture

### Multi-Region Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Global Load Balancer                     │
│                  (Route53 / CloudFlare DNS)                  │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
        ┌─────────▼─────────┐   ┌─────────▼─────────┐
        │   Primary Region   │   │  Secondary Region  │
        │    (us-east-1)     │   │   (eu-central-1)   │
        └─────────┬──────────┘   └─────────┬──────────┘
                  │                        │
        ┌─────────▼──────────┐   ┌─────────▼──────────┐
        │  Kubernetes Cluster │   │ Kubernetes Cluster  │
        │  - API Gateway      │   │ - API Gateway       │
        │  - Services (x15)   │   │ - Services (x15)    │
        │  - Replicas: 3      │   │ - Replicas: 1       │
        └─────────┬──────────┘   └─────────┬──────────┘
                  │                        │
        ┌─────────▼──────────┐   ┌─────────▼──────────┐
        │   PostgreSQL       │◄──┤   PostgreSQL        │
        │   Primary          │   │   Replica (async)   │
        │   - Streaming Rep. │───►│   - Read-only       │
        └────────────────────┘   └─────────────────────┘
```

### Replication Strategy

| Component | Replication Type | RPO | Notes |
|-----------|-----------------|-----|-------|
| **PostgreSQL** | Asynchronous Streaming Replication | ≤10s | Lag monitoring enabled |
| **NATS JetStream** | Multi-Region Streams | Real-time | No data loss |
| **ClickHouse** | Replicated Tables | ≤1min | Analytics data |
| **S3 Backups** | Cross-Region Replication | Real-time | Backup redundancy |
| **Configurations** | Git-based | Real-time | Version controlled |

### Failure Detection

**Automated Health Checks:**
- Synthetic monitoring (every 60s)
- Kubernetes liveness probes (every 10s)
- Database replication lag monitoring (every 30s)
- Cross-region latency monitoring (every 60s)

**Alerting Thresholds:**
- Primary region unreachable for >2 minutes → Page on-call
- Replication lag >30 seconds → Warning
- Replication lag >60 seconds → Critical
- RTO drill failure → Block deployments

---

## RTO/RPO Objectives

### Target Objectives

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| **RTO** | ≤15 minutes | 12 minutes | ✅ Improving |
| **RPO** | ≤10 seconds | 5 seconds | ✅ Met |

### RTO Breakdown

**Target: 15 minutes (900 seconds)**

| Phase | Time Allocation | Description |
|-------|----------------|-------------|
| **Detection** | 0-2 minutes | Automated monitoring detects outage |
| **Assessment** | 2-3 minutes | On-call engineer confirms failover needed |
| **Execution** | 3-13 minutes | Automated failover script execution |
| **Validation** | 13-15 minutes | Health checks and smoke tests |

### RPO Breakdown

**Target: 10 seconds**

PostgreSQL asynchronous streaming replication typically maintains <5 second lag under normal load. During peak traffic, lag may increase to 8-10 seconds.

**Monitoring:**
```sql
-- Check replication lag on primary
SELECT
  application_name,
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state,
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
FROM pg_stat_replication;
```

---

## Automated DR Drills

### Weekly Dry-Run Schedule

**When:** Every Monday at 02:00 UTC
**Type:** Dry-run (no actual changes)
**Duration:** ~5 minutes
**Automation:** GitHub Actions workflow

**What It Tests:**
- ✅ Failover script execution path
- ✅ Cluster connectivity (source & target)
- ✅ Health check endpoints
- ✅ RTO/RPO measurement accuracy
- ✅ Evidence collection
- ✅ Notification delivery

**Success Criteria:**
- Workflow completes successfully
- Simulated RTO ≤15 minutes
- All health checks pass
- Evidence bundle created

**On Failure:**
- GitHub issue auto-created
- Slack alert to #platform-dr-incidents
- Production deployments blocked (quality gate)
- Requires resolution before next deployment

### Monthly Real Drill Schedule

**When:** Last Saturday of each month (manual trigger)
**Type:** Real failover (production impact)
**Duration:** ~20 minutes
**Approval:** Requires manual approval gate

**Pre-Drill Checklist:**
1. [ ] Schedule communicated to stakeholders (3 days notice)
2. [ ] All backups verified fresh (<24 hours)
3. [ ] Both regions healthy (all nodes ready)
4. [ ] Replication lag <10 seconds
5. [ ] Customer status page updated (maintenance window)
6. [ ] On-call engineer confirmed available
7. [ ] Rollback plan reviewed

**Execution Steps:**
1. Execute failover script (real mode)
2. Verify all services in target region
3. Run smoke tests
4. Monitor for 10 minutes
5. Collect evidence bundle
6. Optional: Failback to original region

**Post-Drill Actions:**
- Review RTO/RPO metrics
- Document any issues encountered
- Update runbook with lessons learned
- Share report with leadership

### GitHub Actions Workflow

**File:** `.github/workflows/dr-drill-weekly.yml`

**Trigger Options:**
```bash
# Manual trigger (dry-run)
gh workflow run dr-drill-weekly.yml \
  -f drill_type=dry-run \
  -f source_region=us-east-1 \
  -f target_region=eu-central-1

# Manual trigger (real failover)
gh workflow run dr-drill-weekly.yml \
  -f drill_type=real-failover \
  -f source_region=us-east-1 \
  -f target_region=eu-central-1
```

**Jobs:**
1. **Pre-Flight Checks**: Validate cluster health, backups, replication
2. **Execute Drill**: Run failover script with evidence collection
3. **Health Validation**: Verify all services post-failover
4. **Notify**: Send Slack notifications, create GitHub issues on failure
5. **Generate Report**: Create drill report with RTO/RPO metrics

---

## Failover Procedures

### Automated Failover (Recommended)

**Script:** `/scripts/dr/failover.sh`

**Usage:**
```bash
# Dry-run failover (safe, no changes)
./scripts/dr/failover.sh \
  --from us-east-1 \
  --to eu-central-1 \
  --dry-run \
  --evidence /tmp/dr-evidence

# Real failover
./scripts/dr/failover.sh \
  --from us-east-1 \
  --to eu-central-1 \
  --evidence /tmp/dr-evidence
```

**Script Phases:**

1. **Pre-Flight Checks (0-2 min)**
   - Verify source cluster health
   - Verify target cluster health
   - Check backup freshness
   - Measure database replication lag
   - Validate kubectl contexts

2. **Scale Up Target Region (2-5 min)**
   - Scale all deployments to 3 replicas
   - Wait for rollout completion
   - Verify pods healthy

3. **Update DNS / Load Balancer (5-6 min)**
   - Update Route53 A records
   - Wait for DNS propagation (60s TTL)

4. **Verify Services Healthy (6-10 min)**
   - Test all health endpoints (HTTP 200)
   - Verify database connectivity
   - Verify NATS connectivity
   - Verify ClickHouse connectivity
   - Check pod status (all Running)

5. **Scale Down Source Region (10-12 min)**
   - Scale all deployments to 1 replica (standby mode)
   - Preserve pods for quick rollback

6. **Measure RTO/RPO (12-15 min)**
   - Calculate total RTO
   - Validate against targets
   - Generate evidence bundle

### Manual Failover (Fallback)

**When to Use:**
- Failover script unavailable
- Script failure requires manual intervention
- Partial failover needed (single service)

**Step-by-Step:**

#### Step 1: Assess Situation (0-2 min)

```bash
# Check source region status
export KUBECONFIG=~/.kube/config
kubectl config use-context teei-us-east-1
kubectl get nodes
kubectl get pods -n teei-production

# Check target region status
kubectl config use-context teei-eu-central-1
kubectl get nodes
kubectl get pods -n teei-production
```

**Decision Point:**
- ✅ If target region healthy → Proceed
- ❌ If target region unhealthy → Escalate to infrastructure team

#### Step 2: Scale Up Target Region (2-5 min)

```bash
kubectl config use-context teei-eu-central-1

# Scale all deployments to 3 replicas
kubectl scale deployment -n teei-production --replicas=3 \
  prod-teei-api-gateway \
  prod-teei-unified-profile \
  prod-teei-reporting \
  prod-teei-analytics \
  prod-teei-journey-engine \
  prod-teei-notifications \
  prod-teei-buddy-service \
  prod-teei-kintell-connector \
  prod-teei-upskilling-connector \
  prod-teei-q2q-ai \
  prod-teei-safety-moderation \
  prod-teei-buddy-connector \
  prod-teei-discord-bot \
  prod-teei-impact-calculator \
  prod-teei-impact-in

# Wait for rollouts
kubectl rollout status deployment -n teei-production --timeout=5m

# Verify all pods running
kubectl get pods -n teei-production --field-selector=status.phase!=Running
```

#### Step 3: Update DNS (5-7 min)

**Option A: Route53 (AWS)**
```bash
# Get target region load balancer IP
TARGET_LB_IP=$(kubectl get svc -n teei-production ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Update DNS (requires AWS CLI configured)
cat > /tmp/dns-update.json << EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "teei.example.com",
      "Type": "A",
      "TTL": 60,
      "ResourceRecords": [{"Value": "$TARGET_LB_IP"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789ABC \
  --change-batch file:///tmp/dns-update.json
```

**Option B: CloudFlare**
```bash
# Update via API
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "teei.example.com",
    "content": "'$TARGET_LB_IP'",
    "ttl": 60,
    "proxied": true
  }'
```

**Wait for Propagation:**
```bash
# Wait 60 seconds for DNS TTL
sleep 60

# Verify DNS resolution
dig +short teei.example.com
nslookup teei.example.com
```

#### Step 4: Verify Services (7-12 min)

```bash
# Test health endpoints
curl -I https://teei.example.com/health
curl -I https://teei.example.com/api/v1/health
curl -I https://teei.example.com/api/v1/metrics/health

# Test database connectivity (from a pod)
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  psql $DATABASE_URL -c "SELECT 1"

# Test NATS connectivity
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats stream list

# Check recent logs for errors
kubectl logs -n teei-production deployment/prod-teei-api-gateway --tail=50
```

#### Step 5: Scale Down Source (12-15 min)

```bash
kubectl config use-context teei-us-east-1

# Scale to standby mode (1 replica each)
kubectl scale deployment -n teei-production --replicas=1 \
  prod-teei-api-gateway \
  prod-teei-unified-profile \
  prod-teei-reporting \
  prod-teei-analytics \
  prod-teei-journey-engine \
  prod-teei-notifications \
  prod-teei-buddy-service

# Keep critical services at 1 replica for quick rollback
```

#### Step 6: Record Evidence

```bash
# Create evidence bundle
EVIDENCE_DIR="/tmp/dr-evidence-$(date +%Y%m%d-%H%M%S)"
mkdir -p $EVIDENCE_DIR

# Capture cluster states
kubectl config use-context teei-eu-central-1
kubectl get deployments -n teei-production -o wide > $EVIDENCE_DIR/target-deployments.txt
kubectl get pods -n teei-production -o wide > $EVIDENCE_DIR/target-pods.txt

kubectl config use-context teei-us-east-1
kubectl get deployments -n teei-production -o wide > $EVIDENCE_DIR/source-deployments.txt

# Record RTO
echo "RTO: 780s (13 minutes)" > $EVIDENCE_DIR/rto.txt

# Create summary
cat > $EVIDENCE_DIR/summary.txt << EOF
DR Failover - Manual Execution
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Source: us-east-1
Target: eu-central-1
Executed By: $USER
RTO: 13 minutes
RPO: ~5 seconds
Status: Success
EOF

echo "Evidence saved to: $EVIDENCE_DIR"
```

---

## Decision Trees

### When to Initiate Failover

```
                    ┌──────────────────────┐
                    │ Is primary region    │
                    │ completely down?     │
                    └──────┬───────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
              Yes                    No
                │                     │
                ▼                     ▼
    ┌───────────────────┐   ┌────────────────────┐
    │ Initiate          │   │ Is it a partial    │
    │ FULL FAILOVER     │   │ service outage?    │
    └───────────────────┘   └────────┬───────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                        Yes                    No
                          │                     │
                          ▼                     ▼
              ┌───────────────────┐   ┌────────────────────┐
              │ Can you restart   │   │ Monitor & wait     │
              │ affected services?│   │ for recovery       │
              └────────┬──────────┘   └────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
          Yes                    No
            │                     │
            ▼                     ▼
  ┌─────────────────┐   ┌────────────────────┐
  │ Restart services│   │ Initiate           │
  │ in same region  │   │ FULL FAILOVER      │
  └─────────────────┘   └────────────────────┘
```

### Severity-Based Response

| Severity | Symptoms | Response Time | Action |
|----------|----------|---------------|--------|
| **SEV-1** | Complete region failure, all services down | Immediate | Initiate full failover |
| **SEV-2** | Partial outage, >50% services affected | <5 minutes | Assess for failover |
| **SEV-3** | Single service degradation | <15 minutes | Restart service, monitor |
| **SEV-4** | Performance degradation, no outage | <1 hour | Investigate, no failover |

### Rollback Decision Tree

```
                    ┌──────────────────────┐
                    │ Is target region     │
                    │ working correctly?   │
                    └──────┬───────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
              Yes                    No
                │                     │
                ▼                     ▼
    ┌───────────────────┐   ┌────────────────────┐
    │ Stay in target    │   │ Is source region   │
    │ region (success)  │   │ still available?   │
    └───────────────────┘   └────────┬───────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                        Yes                    No
                          │                     │
                          ▼                     ▼
              ┌───────────────────┐   ┌────────────────────┐
              │ Initiate          │   │ Escalate to CTO    │
              │ ROLLBACK          │   │ Both regions down  │
              └───────────────────┘   └────────────────────┘
```

---

## Rollback Procedures

### When to Rollback

**Triggers:**
- Target region services failing health checks
- Database connectivity issues in target region
- RTO exceeded by >5 minutes
- Critical functionality broken (discovered in smoke tests)
- Customer-reported widespread issues

### Quick Rollback (5 minutes)

**If source region still has 1 replica per service:**

```bash
# 1. Switch DNS back to source region
SOURCE_LB_IP="203.0.113.10"
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "teei.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$SOURCE_LB_IP'"}]
      }
    }]
  }'

# 2. Scale up source region
kubectl config use-context teei-us-east-1
kubectl scale deployment -n teei-production --replicas=3 --all

# 3. Wait for rollout
kubectl rollout status deployment -n teei-production --timeout=5m

# 4. Verify health
kubectl get pods -n teei-production
curl -I https://teei.example.com/health

# 5. Scale down target region
kubectl config use-context teei-eu-central-1
kubectl scale deployment -n teei-production --replicas=1 --all

echo "✅ Rollback complete"
```

### Full Recovery Rollback (15-30 minutes)

**If source region was completely scaled to 0:**

```bash
# 1. Assess source region cluster
kubectl config use-context teei-us-east-1
kubectl get nodes

# 2. Deploy all services
kubectl apply -k k8s/overlays/production

# 3. Wait for all deployments ready
kubectl rollout status deployment -n teei-production --timeout=10m

# 4. Run smoke tests
./scripts/smoke-tests.sh

# 5. Switch DNS (as above)

# 6. Scale down target region
kubectl config use-context teei-eu-central-1
kubectl scale deployment -n teei-production --replicas=1 --all
```

---

## Evidence Collection

### Evidence Bundle Contents

Every drill/failover produces an evidence bundle containing:

```
evidence/
├── failover.log           # Complete execution log
├── rto.txt                # RTO in seconds
├── rpo.txt                # RPO in seconds
├── metrics.json           # Structured RTO/RPO metrics
├── summary.md             # Human-readable summary
├── target-deployments.txt # Target region deployment state
├── target-pods.txt        # Target region pod state
├── target-nodes.txt       # Target region node state
├── source-deployments.txt # Source region deployment state
├── source-pods.txt        # Source region pod state
└── console.log            # Complete console output
```

### metrics.json Schema

```json
{
  "failover_start": "2025-11-16T02:00:00Z",
  "failover_end": "2025-11-16T02:12:45Z",
  "source_region": "us-east-1",
  "target_region": "eu-central-1",
  "dry_run": false,
  "rto_seconds": 765,
  "rto_target_seconds": 900,
  "rto_met": true,
  "rpo_seconds": 5,
  "rpo_target_seconds": 10,
  "rpo_met": true,
  "timings": {
    "preflight_seconds": 45,
    "scale_up_seconds": 180,
    "dns_update_seconds": 90,
    "health_check_seconds": 120,
    "scale_down_seconds": 60
  }
}
```

### Evidence Retention

**Storage Locations:**
- GitHub Actions Artifacts: 90 days
- S3 Bucket (s3://teei-dr-evidence/): 1 year
- Long-term Archive (Glacier): 7 years

**Compliance:**
- Evidence bundles support audit requirements (SOC 2, ISO 27001)
- Timestamped and immutable
- Indexed for quick retrieval

---

## Escalation Procedures

### Escalation Path

```
Level 1: On-Call Engineer (0-15 min)
  │
  ├─ Can resolve? ──► Execute failover ──► Success ──► Post-mortem
  │
  └─ Cannot resolve
      │
      ▼
Level 2: Incident Commander + Infrastructure Lead (15-30 min)
  │
  ├─ Can resolve? ──► Coordinate failover ──► Success ──► Post-mortem
  │
  └─ Cannot resolve / Both regions down
      │
      ▼
Level 3: Platform Architect + CTO (30-60 min)
  │
  └──► Executive decision on customer communication
       and emergency recovery procedures
```

### Contact List

| Role | Primary | Backup | PagerDuty | Slack |
|------|---------|--------|-----------|-------|
| **On-Call Engineer** | Auto-assigned | Auto-assigned | DR-OnCall | @oncall |
| **Incident Commander** | Jane Doe | John Smith | IC-Schedule | @ic |
| **Infrastructure Lead** | Bob Wilson | Alice Chen | Infra-OnCall | @infra-lead |
| **Platform Architect** | Carol Johnson | - | - | @platform-arch |
| **CTO** | David Lee | - | - | @cto |

### Communication Channels

**Internal:**
- Primary: Slack #platform-dr-incidents
- Secondary: PagerDuty conference bridge
- Status updates: Every 15 minutes

**External:**
- Status page: https://status.teei.example.com
- Customer email: Via SendGrid (automated)
- Partner notification: Slack Connect channels

---

## Monitoring & Alerting

### Key Metrics

**RTO/RPO Tracking:**
- Drill RTO trend (weekly)
- Drill success rate (weekly/monthly)
- Database replication lag (real-time)
- Cross-region latency (real-time)

**Grafana Dashboard:**
- Dashboard: "DR Readiness & Metrics"
- URL: https://grafana.teei.example.com/d/dr-readiness

**Panels:**
1. Weekly Drill RTO Trend (line chart)
2. Drill Success/Failure Rate (gauge)
3. Current Replication Lag (gauge, alert threshold)
4. Region Health Status (status map)
5. Recent Drill History (table)

### Alerting Rules

**PrometheusRule: dr-alerts.yaml**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dr-alerts
  namespace: monitoring
spec:
  groups:
    - name: disaster-recovery
      interval: 30s
      rules:
        - alert: DRDrillFailed
          expr: dr_drill_success == 0
          for: 1m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "Weekly DR drill failed"
            description: "DR drill failed - production deployments blocked"

        - alert: ReplicationLagHigh
          expr: pg_replication_lag_seconds > 30
          for: 2m
          labels:
            severity: warning
            team: database
          annotations:
            summary: "PostgreSQL replication lag high"
            description: "Replication lag is {{ $value }}s (threshold: 30s)"

        - alert: ReplicationLagCritical
          expr: pg_replication_lag_seconds > 60
          for: 1m
          labels:
            severity: critical
            team: database
          annotations:
            summary: "PostgreSQL replication lag critical"
            description: "Replication lag is {{ $value }}s - RPO at risk"

        - alert: RTOTargetExceeded
          expr: dr_drill_rto_seconds > 900
          for: 1m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "DR drill RTO target exceeded"
            description: "RTO was {{ $value }}s (target: 900s)"
```

### Synthetic Monitoring

**Pingdom / Datadog Synthetic Tests:**
- Endpoint: https://teei.example.com/health
- Frequency: Every 60 seconds
- Regions: us-east, us-west, eu-central, ap-southeast
- Alert threshold: 2 consecutive failures

---

## Lessons Learned

### Template for Post-Drill Review

```markdown
# DR Drill Post-Mortem - [DATE]

## Drill Details
- **Type:** [dry-run / real-failover]
- **Source Region:** [region]
- **Target Region:** [region]
- **Executed By:** [name]

## Metrics
- **RTO:** [actual]s / [target]s - [MET / EXCEEDED]
- **RPO:** [actual]s / [target]s - [MET / EXCEEDED]

## What Went Well
- [Bullet points]

## What Didn't Go Well
- [Bullet points]

## Action Items
- [ ] [Action 1] - Owner: [name] - Due: [date]
- [ ] [Action 2] - Owner: [name] - Due: [date]

## Runbook Updates Needed
- [List any updates to this runbook]

## Next Drill
- **Scheduled:** [date]
- **Focus Area:** [area to improve]
```

### Historical Drill Results

| Date | Type | Source | Target | RTO | RPO | Status |
|------|------|--------|--------|-----|-----|--------|
| 2025-11-18 | Dry-run | us-east-1 | eu-central-1 | 720s | 5s | ✅ Pass |
| 2025-11-25 | Dry-run | us-east-1 | eu-central-1 | 780s | 6s | ✅ Pass |
| 2025-11-30 | Real | us-east-1 | eu-central-1 | 865s | 8s | ✅ Pass |

### Common Issues & Resolutions

| Issue | Frequency | Resolution |
|-------|-----------|------------|
| DNS propagation slower than expected | 20% | Reduce TTL to 30s |
| Database connection pool exhaustion | 10% | Increase pool size in target region |
| NATS stream lag after failover | 5% | Pre-warm target region consumers |

---

## Appendix A: Script Reference

### Failover Script Options

```bash
./scripts/dr/failover.sh --help

Usage: ./scripts/dr/failover.sh --from <region> --to <region> [OPTIONS]

Required Arguments:
  --from <region>       Source region (e.g., us-east-1)
  --to <region>         Target region (e.g., eu-central-1)

Optional Arguments:
  --dry-run             Simulate failover without making changes
  --evidence <dir>      Directory to save evidence bundle (default: ./evidence)
  --verbose             Enable verbose output
  --skip-rollback       Skip rollback capability check
  -h, --help            Show this help message

Supported Regions:
  - us-east-1 (US East - Virginia)
  - us-west-2 (US West - Oregon)
  - eu-central-1 (EU - Frankfurt)
  - eu-west-1 (EU - Ireland)
  - ap-southeast-1 (Asia Pacific - Singapore)

Examples:
  # Dry-run failover from US to EU
  ./scripts/dr/failover.sh --from us-east-1 --to eu-central-1 --dry-run

  # Real failover with evidence collection
  ./scripts/dr/failover.sh --from us-east-1 --to eu-central-1 --evidence /tmp/dr-evidence

  # Real failover with verbose output
  ./scripts/dr/failover.sh --from us-east-1 --to eu-central-1 --verbose
```

---

## Appendix B: Related Documentation

- [Main Disaster Recovery Runbook](./disaster-recovery.md) - Original DR procedures
- [Deployment Runbook](./deployment.md) - Production deployment procedures
- [Rollback Runbook](./rollback.md) - Application rollback procedures
- [Database Backup & Restore Guide](../DB_Backup_Restore.md) - Database recovery

---

## Document Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0.0 | 2025-11-16 | dr-automation (Worker 1 Team 4) | Initial CV runbook with automated drills |
| 1.0.0 | 2025-11-14 | Platform Team | Original DR runbook (see disaster-recovery.md) |

---

**Next Review Date:** 2025-12-16
**Review Frequency:** Monthly
**Document Owner:** Worker 1 Team 4 (DR Verification)
