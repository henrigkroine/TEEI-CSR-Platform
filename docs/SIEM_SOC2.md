# SIEM & SOC2 Compliance Architecture

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Security & Compliance Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [SIEM Architecture](#siem-architecture)
3. [Log Correlation Rules](#log-correlation-rules)
4. [Alert Routing](#alert-routing)
5. [SOC2 Control Mapping](#soc2-control-mapping)
6. [Evidence Automation](#evidence-automation)
7. [Quarterly Evidence Collection](#quarterly-evidence-collection)
8. [Dashboards](#dashboards)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)
11. [Auditor Access](#auditor-access)

---

## Executive Summary

The TEEI CSR Platform implements a comprehensive Security Information and Event Management (SIEM) system integrated with automated SOC2 Type II evidence collection. This architecture provides:

- **Centralized Security Monitoring**: All security events from 15+ microservices across US/EU regions
- **Real-time Threat Detection**: <1 minute latency from event to alert
- **Automated Compliance**: Zero-touch quarterly SOC2 evidence generation
- **GDPR Enforcement**: Continuous data residency monitoring with automated blocking
- **Audit Readiness**: Cryptographically signed evidence bundles for auditor review

### Key Metrics

- **Log Ingestion**: 10,000 events/second peak
- **Retention**: 90 days hot, 2 years archive (S3 Glacier)
- **Uptime**: 99.9% SLA
- **Alert Latency**: <1 minute
- **False Positive Rate**: <5%
- **Evidence Generation**: 100% automated

---

## SIEM Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Multi-Region Clusters                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ US-East-1    │  │ US-West-2    │  │ EU-West-1    │          │
│  │ Kubernetes   │  │ Kubernetes   │  │ Kubernetes   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                            ▼                                     │
│              ┌─────────────────────────┐                         │
│              │   Vector Aggregators    │                         │
│              │   (Log Collection)      │                         │
│              └──────────┬──────────────┘                         │
│                         │                                        │
│         ┌───────────────┼───────────────┐                        │
│         │               │               │                        │
│         ▼               ▼               ▼                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                    │
│  │OpenSearch│   │  S3      │   │  NATS    │                    │
│  │ Cluster  │   │ Archive  │   │ Alerts   │                    │
│  └─────┬────┘   └──────────┘   └─────┬────┘                    │
│        │                              │                         │
│        ▼                              ▼                         │
│  ┌──────────┐              ┌──────────────────┐                │
│  │OpenSearch│              │ Alert Router     │                │
│  │Dashboards│              │ (Alertmanager)   │                │
│  └──────────┘              └─────┬────────────┘                │
│                                   │                             │
│                   ┌───────────────┼───────────────┐             │
│                   │               │               │             │
│                   ▼               ▼               ▼             │
│            ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│            │PagerDuty │   │  Slack   │   │  Jira    │          │
│            └──────────┘   └──────────┘   └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion**: Vector aggregators collect logs from Kubernetes (via DaemonSet), NATS streams, and Syslog
2. **Parsing**: Logs are parsed into structured events with standard fields
3. **Enrichment**: Events are enriched with metadata (region, service, compliance tags)
4. **Correlation**: Security event correlation engine applies rules (10 rules active)
5. **Storage**: Events stored in OpenSearch (hot) and S3 Glacier (archive)
6. **Alerting**: Anomalies trigger alerts via NATS → Alertmanager → PagerDuty/Slack/Jira
7. **Visualization**: Grafana dashboards for real-time monitoring

### OpenSearch Cluster

- **Nodes**: 3 (for HA)
- **Storage**: 500GB per node (fast SSD)
- **Replicas**: 2 (for each index)
- **Index Lifecycle**:
  - **Hot** (0-7 days): Full replicas, fast queries
  - **Warm** (7-30 days): Reduced replicas
  - **Cold** (30-90 days): Single replica
  - **Delete** (>90 days): Pruned, archived to S3

### Index Patterns

| Pattern | Event Type | Retention | Shards |
|---------|------------|-----------|--------|
| `auth-events-*` | Authentication (login, logout, MFA) | 90 days | 3 |
| `data-access-*` | Data access (PII queries, exports) | 2 years | 3 |
| `security-events-*` | Authorization, change mgmt, alerts | 90 days | 3 |

### Vector Transforms

Vector applies the following transformations:

1. **parse_security_events**: Extract JSON fields, add timestamps
2. **filter_security_events**: Keep only security-relevant events
3. **enrich_auth_events**: Add index routing, retention policies
4. **extract_pii_markers**: Detect PII access patterns, tag GDPR events
5. **detect_anomalies**: Flag suspicious patterns (failed logins, large exports)
6. **route_by_type**: Route to appropriate OpenSearch indices

---

## Log Correlation Rules

The correlation engine applies 10 security detection rules with <5% false positive rate.

### Rule 1: Brute Force Detection

**Description**: Detects >10 failed login attempts from same IP within 5 minutes

**Query**:
```json
{
  "event_type": "authentication",
  "success": false,
  "@timestamp": "now-5m"
}
```

**Aggregation**: Group by `source_ip`, count >10

**Actions**:
- Alert severity: **High**
- PagerDuty: security-oncall
- Slack: #security-alerts
- Auto-block IP for 1 hour in WAF

**False Positive Reduction**:
- Whitelist internal IPs (10.0.0.0/8, 172.16.0.0/12)
- Exclude known security scanners

### Rule 2: Privilege Escalation

**Description**: ServiceAccount role changed, then pod exec within 10 minutes

**Correlation Sequence**:
1. Event: `role_change` (ServiceAccount permissions modified)
2. Event: `pod_exec` (Same ServiceAccount executes in pod)
3. Time window: 10 minutes

**Actions**:
- Alert severity: **Critical**
- PagerDuty: security-oncall (P1)
- Slack: #security-incidents
- JIRA: Create SEC ticket
- **Auto-remediation**: Revoke ServiceAccount access

### Rule 3: Data Exfiltration

**Description**: Data export >1GB outside business hours (9am-5pm EST)

**Query**:
```json
{
  "event_type": "data_access",
  "export_size_bytes": ">= 1073741824",
  "@timestamp": "NOT(now/d+9h TO now/d+17h)"
}
```

**Actions**:
- Alert severity: **High**
- PagerDuty: security-oncall
- Email: DPO, CISO
- **Context enrichment**: Compare to user's 30-day baseline

### Rule 4: GDPR Violation

**Description**: EU PII accessed from US-based service

**Query**:
```json
{
  "event_type": "data_access",
  "pii_accessed": true,
  "data_region": "eu",
  "source_region": "us"
}
```

**Actions**:
- Alert severity: **Critical**
- PagerDuty: compliance-team (P1)
- Slack: #compliance-alerts
- Email: DPO, legal team
- JIRA: Create COMPLIANCE ticket
- **Auto-remediation**: Block request immediately

**Compliance Tags**: `gdpr`, `article-32`, `data-residency`

### Rule 5: Anomalous Access Pattern (ML-based)

**Description**: Access rate deviates >3σ from 30-day baseline

**ML Model**:
- Type: Anomaly Detection
- Detector: OpenSearch Anomaly Detector
- Feature: `requests_per_hour` per user
- Threshold: 3.0 sigma
- Min samples: 100

**Actions**:
- Alert severity: **Medium**
- Slack: #security-alerts
- Learning window: 30 days
- Min confidence: 85%

### Rule 6: Certificate Rotation Failure

**Description**: Certificate expiring <6h with failed rotation attempts

**Correlation Sequence**:
1. Alert: `cert_expiring` (expires within 6 hours)
2. Event: `rotation_failed` (cert-manager rotation failed)
3. Time window: 1 hour

**Actions**:
- Alert severity: **Critical**
- PagerDuty: sre-oncall (P1)
- Slack: #sre-incidents
- **Auto-remediation**: Run emergency rotation playbook

### Additional Rules

- **Rule 7**: Excessive authorization failures (>20 in 10 minutes)
- **Rule 8**: ServiceAccount used from external IP
- **Rule 9**: Concurrent sessions across regions (impossible travel)
- **Rule 10**: Production schema changes without JIRA ticket

All rules documented in: `/observability/siem/correlation-rules.yaml`

---

## Alert Routing

Alerts are routed via Alertmanager based on severity and compliance tags.

### Severity Levels

| Severity | Response Time | Escalation | Example |
|----------|---------------|------------|---------|
| **Critical (P1)** | Immediate (page) | Security oncall → CISO | GDPR violation, privilege escalation |
| **High (P2)** | 15 minutes | Security team | Brute force, data exfiltration |
| **Medium (P3)** | Next business day | Slack notification | Anomalous access |
| **Low (P4)** | Daily digest | Email summary | Minor config changes |

### Routing Matrix

```yaml
GDPR Violation (Critical):
  → PagerDuty: compliance-team (P1)
  → Slack: #compliance-alerts
  → Email: dpo@teei-csr.com, legal@teei-csr.com
  → JIRA: COMPLIANCE project (auto-create ticket)
  → Auto-block: Yes

Privilege Escalation (Critical):
  → PagerDuty: security-oncall (P1)
  → Slack: #security-incidents
  → Email: sre-leads@teei-csr.com
  → Auto-remediation: Revoke access

Brute Force (High):
  → PagerDuty: security-oncall (P2)
  → Slack: #security-alerts
  → WAF: Block IP for 1 hour

Change Management Violation (High):
  → PagerDuty: sre-oncall (P2)
  → Slack: #change-management
  → JIRA: OPS project
```

### Inhibition Rules

To prevent alert storms:

- Critical alerts suppress medium/low from same source
- GDPR violation alerts suppress general data access alerts
- Brute force detection suppresses individual failed login alerts

### Integrations

- **PagerDuty**: 3 integration keys (security, SRE, compliance)
- **Slack**: 4 channels (#security-incidents, #security-alerts, #compliance-alerts, #sre-incidents)
- **Jira**: Auto-create tickets in SEC, COMPLIANCE, OPS projects
- **Email**: Sendgrid SMTP (dpo@, legal@, ciso@, security-team@)

Configuration: `/observability/siem/alert-routing.yaml`

---

## SOC2 Control Mapping

The SIEM system provides automated evidence for the following SOC2 Trust Services Criteria:

### Common Criteria (CC)

| Control | Title | Evidence Source | Automation |
|---------|-------|-----------------|------------|
| **CC6.1** | Logical and Physical Access Controls | Access reviews, Key rotation | 100% automated |
| **CC6.2** | Prior to Issuing System Credentials | Access reviews (onboarding) | 100% automated |
| **CC6.3** | Removes Access When Appropriate | Orphaned account detection | 100% automated |
| **CC7.2** | System Monitoring | SIEM logs, Key rotation | 100% automated |
| **CC8.1** | Change Management Process | Git commits, PR approvals | 100% automated |
| **CC9.1** | Availability | Backup logs, Uptime metrics | Manual backup verification |

### Evidence Artifacts

Each control is supported by:

1. **Access Reviews (CC6.1-6.3)**
   - CSV export of all users and ServiceAccounts
   - RBAC role bindings
   - Last login timestamps
   - Orphaned account list (>90 days inactive)
   - **Frequency**: Monthly, bundled quarterly

2. **Change Management (CC8.1)**
   - Git commit history with PR approvals
   - JIRA ticket linkage
   - Deployment logs from Argo CD
   - Rollback tracking
   - **Frequency**: Continuous, reported quarterly

3. **Key Rotation (CC6.1, CC7.2)**
   - Secret rotation timeline
   - Certificate renewal logs (cert-manager)
   - Vault secret versions
   - Auto-rotation enablement status
   - **Frequency**: Quarterly rotation requirement

4. **Security Monitoring (CC7.2)**
   - SIEM uptime metrics
   - Log coverage percentage (% of services shipping logs)
   - Alert counts by severity
   - Mean time to detection/response
   - **Frequency**: Real-time, reported quarterly

5. **Availability (CC9.1)**
   - Uptime SLA (99.9% target)
   - Incident count and MTTR
   - Backup success rate
   - RTO/RPO measurements from gameday drills
   - **Frequency**: Continuous, reported quarterly

---

## Evidence Automation

All SOC2 evidence is generated automatically with zero manual effort.

### Evidence Collection Scripts

Located in: `/scripts/soc2/`

1. **`generate-access-review.sh`**
   - Queries Kubernetes RBAC
   - Extracts ServiceAccounts and users
   - Enriches with last login from SIEM
   - Identifies orphaned accounts
   - **Output**: CSV, JSON, summary.txt

2. **`generate-change-log.sh`**
   - Parses git commit history
   - Extracts PR approvals (GitHub API)
   - Links JIRA tickets
   - Queries deployment logs from OpenSearch
   - Calculates approval rate, rollback rate
   - **Output**: CSV, JSON, summary.txt

3. **`generate-key-rotation-report.sh`**
   - Inventories Kubernetes Secrets
   - Checks certificate renewal (cert-manager)
   - Queries Vault secret versions
   - Identifies pending rotations
   - **Output**: CSV, JSON, summary.txt

4. **`generate-gdpr-attestation.sh`**
   - Queries data access logs from SIEM
   - Detects cross-region PII access (EU→US)
   - Generates zero-violation attestation
   - **Output**: JSON attestation, CSV violations, summary.txt
   - **Exit code**: Non-zero if violations found

5. **`sign-evidence.sh`**
   - Creates evidence bundle (tar.gz)
   - Generates SHA256 checksums
   - GPG-signs checksums and bundle
   - Exports public key for auditors
   - **Output**: .tar.gz, .asc signature, public-key.asc

6. **`upload-to-audit-portal.sh`**
   - Uploads bundle to auditor portal
   - Supports S3, SFTP, or API upload
   - Generates presigned URL (7-day expiry)
   - Sends notification emails
   - **Output**: Upload log

7. **`collect-quarterly-evidence.sh`**
   - **Orchestrator**: Runs all generators
   - Tracks success/failure
   - Generates completion report
   - Pushes metrics to Prometheus
   - **Exit code**: Non-zero if any task fails

### Automation Flow

```
Quarterly Trigger (Jan 1, Apr 1, Jul 1, Oct 1)
        │
        ▼
┌───────────────────┐
│ Kubernetes CronJob│
│  (SIEM namespace) │
└─────────┬─────────┘
          │
          ▼
┌─────────────────────────┐
│ collect-quarterly-      │
│ evidence.sh             │
└───────┬─────────────────┘
        │
        ├──▶ generate-access-review.sh
        ├──▶ generate-change-log.sh
        ├──▶ generate-key-rotation-report.sh
        ├──▶ generate-gdpr-attestation.sh
        ├──▶ sign-evidence.sh
        └──▶ upload-to-audit-portal.sh
                  │
                  ▼
          ┌──────────────┐
          │ S3 Bucket    │
          │ (Auditor)    │
          └──────────────┘
                  │
                  ▼
          ┌──────────────┐
          │ Email        │
          │ Notification │
          └──────────────┘
            DPO, Legal,
            Compliance, Auditor
```

### Evidence Integrity

All evidence is cryptographically signed:

- **Hashing**: SHA256 checksums for all files
- **Signing**: GPG detached signature (4096-bit RSA key)
- **Key Management**: GPG key `soc2-evidence@teei-csr.com`
- **Verification**: Auditors verify with public key
- **Tamper Detection**: Any modification breaks signature

---

## Quarterly Evidence Collection

### Schedule

Evidence is collected on the **first day of each quarter at 00:00 UTC**:

- **Q1**: January 1st
- **Q2**: April 1st
- **Q3**: July 1st
- **Q4**: October 1st

**Automation**: Kubernetes CronJob in `siem` namespace

### Manual Collection

To manually collect evidence:

```bash
cd /home/user/TEEI-CSR-Platform/scripts/soc2

# Collect for current quarter
./collect-quarterly-evidence.sh

# Collect for specific quarter
QUARTER=2025-Q1 ./collect-quarterly-evidence.sh
```

### Evidence Bundle Contents

```
soc2-evidence-bundle-2025-Q1.tar.gz
├── access-reviews/
│   ├── access-review-2025-01-01_00-00-00.csv
│   ├── access-review-2025-01-01_00-00-00.json
│   └── summary-2025-01-01_00-00-00.txt
├── change-management/
│   ├── change-log-2025-01-01_00-00-00.csv
│   ├── change-log-2025-01-01_00-00-00.json
│   └── summary-2025-01-01_00-00-00.txt
├── key-rotation/
│   ├── key-rotation-2025-01-01_00-00-00.csv
│   ├── key-rotation-2025-01-01_00-00-00.json
│   └── summary-2025-01-01_00-00-00.txt
├── gdpr-compliance/
│   ├── gdpr-attestation-2025-01-01_00-00-00.json
│   ├── violations-2025-01-01_00-00-00.csv
│   └── summary-2025-01-01_00-00-00.txt
├── signatures/
│   ├── public-key.asc
│   └── VERIFICATION.txt
├── SHA256SUMS
├── SHA256SUMS.asc
├── MANIFEST.json
└── EVIDENCE_COLLECTION_REPORT.txt
```

### Verification

Auditors can verify evidence integrity:

```bash
# Import public key
gpg --import signatures/public-key.asc

# Verify bundle signature
gpg --verify soc2-evidence-bundle-2025-Q1.tar.gz.asc \
             soc2-evidence-bundle-2025-Q1.tar.gz

# Verify checksums
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum -c SHA256SUMS
```

Expected output:
```
gpg: Good signature from "TEEI SOC2 Evidence Signer <soc2-evidence@teei-csr.com>"
access-reviews/access-review-2025-01-01_00-00-00.csv: OK
change-management/change-log-2025-01-01_00-00-00.csv: OK
...
```

### Retention

- **Active**: 2 years in S3 Standard (hot storage)
- **Archive**: 5 years in S3 Glacier (cold storage)
- **Total**: 7 years (SOC2 + regulatory requirement)

---

## Dashboards

### 1. Security SIEM Overview

**URL**: https://grafana.teei-csr.com/d/security-siem

**File**: `/observability/grafana/dashboards/security-siem.json`

**Panels** (20 total):
- Active security alerts (stat)
- Threat score 0-100 (gauge)
- Blocked IPs (stat)
- Failed logins (stat)
- SIEM pipeline health (stat)
- Log coverage % (stat)
- Authentication events timeline (timeseries)
- Failed login attempts by IP (bar chart)
- Security alerts by severity (pie chart)
- Security alerts by type (pie chart)
- MFA adoption rate (stat)
- Authorization denials by service (timeseries)
- Top denied users (table)
- Data access events (timeseries)
- Failed login heatmap by hour (heatmap)
- PII query rate (stat)
- Data exports by region (bar gauge)
- Recent security alerts (table)
- Change management activity (timeseries)
- Known bad IPs (table)

**Variables**:
- `$region` (multi-select)
- `$service` (multi-select)
- `$severity` (multi-select)

**Refresh**: 1 minute

### 2. SOC2 Compliance Dashboard

**URL**: https://grafana.teei-csr.com/d/soc2-compliance

**File**: `/observability/grafana/dashboards/soc2-compliance.json`

**Panels** (22 total):
- SOC2 compliance score (stat)
- SOC2 control categories (bar gauge)
- Evidence collection status (table)
- Users with admin access (stat) - CC6.1
- Last access review date (stat) - CC6.2
- Orphaned accounts (stat) - CC6.3
- ServiceAccounts active (stat)
- Deployments with PR approval (stat) - CC8.1
- Emergency changes (stat)
- Rollback rate (stat) - CC8.1
- Access control violations (timeseries)
- Change management activity (timeseries)
- Uptime SLA compliance (stat) - CC9.1
- Incident count (stat)
- MTTR (stat)
- Backup success rate (stat) - CC9.1
- Active security alerts (stat) - CC7.2
- Log coverage (stat) - CC7.2
- Access review status by user (table)
- Key rotation evidence (table)
- Production changes (table)
- Quarterly evidence collection timeline (timeseries)

**Variables**:
- `$quarter` (2025-Q1, Q2, Q3, Q4)
- `$environment` (production, staging)

**Refresh**: 5 minutes

**Annotations**:
- Access reviews completed
- Evidence collection events
- SOC2 audit events

---

## Deployment Guide

### Prerequisites

1. Kubernetes cluster (1.25+)
2. Helm 3
3. OpenSearch operator (or manual deployment)
4. cert-manager (for TLS)
5. Prometheus + Grafana
6. S3 bucket for archive (optional)

### Step 1: Deploy OpenSearch SIEM

```bash
cd /home/user/TEEI-CSR-Platform/k8s/base/siem

# Generate TLS certificates
mkdir -p certs
openssl req -x509 -new -nodes -keyout certs/ca.key -sha256 -days 1825 \
  -out certs/ca.crt -subj "/CN=TEEI SIEM CA/O=TEEI/C=US"
openssl req -new -nodes -out certs/tls.csr -keyout certs/tls.key \
  -subj "/CN=opensearch.siem.svc.cluster.local/O=TEEI/C=US"
openssl x509 -req -in certs/tls.csr -CA certs/ca.crt -CAkey certs/ca.key \
  -CAcreateserial -out certs/tls.crt -days 825 -sha256

# Update credentials
OPENSEARCH_PASSWORD=$(openssl rand -base64 32)
# Edit kustomization.yaml and set password

# Deploy
kubectl apply -k .

# Verify
kubectl get pods -n siem
kubectl exec -n siem opensearch-0 -- curl -k -u admin:$OPENSEARCH_PASSWORD \
  https://localhost:9200/_cluster/health?pretty
```

### Step 2: Deploy Vector Aggregators

Vector is already deployed via `/k8s/base/siem/vector-aggregator.yaml`.

Verify:
```bash
kubectl logs -n siem -l app=vector-aggregator --tail=50
```

### Step 3: Deploy Alert Router

Alert router (Alertmanager) is deployed via `/observability/siem/alert-routing.yaml`.

Configure secrets:
```bash
kubectl create secret generic pagerduty-keys -n siem \
  --from-literal=security-key=$PAGERDUTY_SECURITY_KEY \
  --from-literal=sre-key=$PAGERDUTY_SRE_KEY \
  --from-literal=compliance-key=$PAGERDUTY_COMPLIANCE_KEY

kubectl create secret generic slack-webhooks -n siem \
  --from-literal=security-incidents=$SLACK_WEBHOOK_SECURITY_INCIDENTS \
  --from-literal=security-alerts=$SLACK_WEBHOOK_SECURITY_ALERTS \
  --from-literal=compliance=$SLACK_WEBHOOK_COMPLIANCE \
  --from-literal=sre=$SLACK_WEBHOOK_SRE

kubectl create secret generic sendgrid-credentials -n siem \
  --from-literal=username=$SENDGRID_USERNAME \
  --from-literal=password=$SENDGRID_PASSWORD

kubectl create secret generic jira-credentials -n siem \
  --from-literal=username=$JIRA_USERNAME \
  --from-literal=api-token=$JIRA_API_TOKEN
```

Deploy:
```bash
kubectl apply -f /home/user/TEEI-CSR-Platform/observability/siem/alert-routing.yaml
```

### Step 4: Deploy Grafana Dashboards

```bash
kubectl create configmap grafana-dashboard-security-siem -n observability \
  --from-file=/home/user/TEEI-CSR-Platform/observability/grafana/dashboards/security-siem.json

kubectl create configmap grafana-dashboard-soc2-compliance -n observability \
  --from-file=/home/user/TEEI-CSR-Platform/observability/grafana/dashboards/soc2-compliance.json

# Label for auto-discovery
kubectl label configmap grafana-dashboard-security-siem -n observability \
  grafana_dashboard=1

kubectl label configmap grafana-dashboard-soc2-compliance -n observability \
  grafana_dashboard=1

# Reload Grafana
kubectl rollout restart deployment grafana -n observability
```

### Step 5: Deploy SOC2 Evidence Collector

```bash
# Make scripts executable
cd /home/user/TEEI-CSR-Platform/scripts/soc2
chmod +x *.sh

# Deploy CronJob
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/jobs/soc2-evidence-collection.yaml

# Verify CronJob
kubectl get cronjobs -n siem

# Test manual run
kubectl create job --from=cronjob/soc2-quarterly-evidence \
  soc2-manual-test -n siem

kubectl logs -n siem -l job-name=soc2-manual-test --tail=100
```

### Step 6: Verify End-to-End

1. **SIEM Health**:
   ```bash
   curl -k https://siem.teei-csr.com
   # Should show OpenSearch Dashboards login
   ```

2. **Log Ingestion**:
   ```bash
   kubectl logs -n siem -l app=vector-aggregator | grep "events_processed"
   ```

3. **Alert Routing**:
   ```bash
   kubectl logs -n siem -l app=alert-router | grep "notification sent"
   ```

4. **Dashboards**:
   - Visit https://grafana.teei-csr.com/d/security-siem
   - Visit https://grafana.teei-csr.com/d/soc2-compliance

5. **Evidence Collection**:
   ```bash
   ls -la /home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder/
   ```

---

## Troubleshooting

### OpenSearch Won't Start

**Symptom**: OpenSearch pods in CrashLoopBackOff

**Diagnosis**:
```bash
kubectl logs -n siem opensearch-0
```

**Common Causes**:

1. **vm.max_map_count too low**
   ```bash
   # Check
   sysctl vm.max_map_count

   # Fix (on nodes)
   sudo sysctl -w vm.max_map_count=262144
   echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
   ```

2. **Insufficient storage**
   ```bash
   kubectl get pvc -n siem
   # Ensure PVCs are Bound
   ```

3. **TLS certificate issues**
   ```bash
   kubectl get secret -n siem opensearch-certs
   # Verify cert files exist
   ```

### Vector Not Shipping Logs

**Symptom**: No data in OpenSearch

**Diagnosis**:
```bash
kubectl logs -n siem -l app=vector-aggregator --tail=100 | grep error
```

**Common Causes**:

1. **OpenSearch credentials wrong**
   ```bash
   kubectl get secret -n siem opensearch-credentials -o yaml
   # Verify username/password base64 decode correctly
   ```

2. **NATS connection failed**
   ```bash
   kubectl get svc -n nats
   # Ensure nats.nats.svc.cluster.local resolves
   ```

3. **Certificate verification failed**
   ```bash
   # Check Vector config for tls.verify_certificate
   kubectl get cm -n siem vector-config -o yaml
   ```

### Alerts Not Firing

**Symptom**: No PagerDuty/Slack notifications

**Diagnosis**:
```bash
kubectl logs -n siem -l app=alert-router | grep "notification.*failed"
```

**Common Causes**:

1. **PagerDuty key invalid**
   ```bash
   # Test manually
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H "Content-Type: application/json" \
     -d '{"routing_key":"'$PAGERDUTY_SECURITY_KEY'","event_action":"trigger","payload":{"summary":"Test"}}'
   ```

2. **Slack webhook expired**
   ```bash
   # Regenerate webhook in Slack app settings
   ```

3. **Correlation rules not matching**
   ```bash
   # Check OpenSearch for events
   curl -k -u admin:password https://opensearch.siem.svc.cluster.local:9200/security-events-*/_search
   ```

### Evidence Collection Fails

**Symptom**: CronJob completes with errors

**Diagnosis**:
```bash
kubectl logs -n siem -l job-name=soc2-quarterly-evidence --tail=200
```

**Common Causes**:

1. **Kubectl permissions**
   ```bash
   # Verify ServiceAccount has ClusterRole
   kubectl get clusterrolebinding soc2-evidence-collector -o yaml
   ```

2. **OpenSearch SIEM unreachable**
   ```bash
   kubectl exec -n siem soc2-quarterly-evidence-xxxx -- \
     curl -k https://opensearch.siem.svc.cluster.local:9200/_cluster/health
   ```

3. **S3 upload fails**
   ```bash
   # Check AWS credentials
   kubectl get secret -n siem aws-s3-credentials -o yaml
   ```

4. **GPG key missing**
   ```bash
   # Re-run sign-evidence.sh to generate key
   ```

### Dashboards Not Showing Data

**Symptom**: Grafana panels show "No data"

**Diagnosis**:
1. Check Prometheus data source connection
2. Verify metrics are being scraped:
   ```bash
   curl http://prometheus.observability.svc.cluster.local:9090/api/v1/query?query=siem_auth_events_total
   ```

3. Check OpenSearch data source connection in Grafana

**Fix**:
```bash
# Re-import dashboards
kubectl delete cm grafana-dashboard-security-siem -n observability
kubectl create configmap grafana-dashboard-security-siem -n observability \
  --from-file=/home/user/TEEI-CSR-Platform/observability/grafana/dashboards/security-siem.json
kubectl label cm grafana-dashboard-security-siem -n observability grafana_dashboard=1
kubectl rollout restart deployment grafana -n observability
```

---

## Auditor Access

### Providing Evidence to Auditors

1. **Generate Evidence Bundle**:
   ```bash
   cd /home/user/TEEI-CSR-Platform/scripts/soc2
   QUARTER=2025-Q1 ./collect-quarterly-evidence.sh
   ```

2. **Verify Signature**:
   ```bash
   cd /home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder/2025-Q1
   gpg --verify soc2-evidence-bundle-2025-Q1.tar.gz.asc \
                soc2-evidence-bundle-2025-Q1.tar.gz
   ```

3. **Upload to Auditor Portal**:
   ```bash
   cd /home/user/TEEI-CSR-Platform/scripts/soc2
   UPLOAD_METHOD=s3 S3_BUCKET=auditor-evidence-bucket ./upload-to-audit-portal.sh
   ```

4. **Share Public Key**:
   ```bash
   # Send to auditor via secure channel
   cat ops/soc2/evidence-binder/2025-Q1/signatures/public-key.asc
   ```

5. **Provide Verification Instructions**:
   ```bash
   # Send to auditor
   cat ops/soc2/evidence-binder/2025-Q1/signatures/VERIFICATION.txt
   ```

### Granting Read-Only SIEM Access

To grant auditors read-only access to SIEM:

```bash
# Create auditor user
kubectl create serviceaccount auditor -n siem

# Create read-only role
kubectl create role auditor-readonly -n siem \
  --verb=get,list \
  --resource=pods,logs

# Bind role
kubectl create rolebinding auditor-readonly -n siem \
  --role=auditor-readonly \
  --serviceaccount=siem:auditor

# Generate kubeconfig
# (Share with auditor via secure channel)
```

### Granting OpenSearch Dashboards Access

1. Create read-only user in OpenSearch:
   ```bash
   curl -k -u admin:password -X PUT \
     "https://opensearch.siem.svc.cluster.local:9200/_plugins/_security/api/internalusers/auditor" \
     -H 'Content-Type: application/json' \
     -d '{
       "password": "AuditorPassword123!",
       "opendistro_security_roles": ["kibana_read_only"]
     }'
   ```

2. Share credentials and URL:
   - URL: https://siem.teei-csr.com
   - Username: auditor
   - Password: (via 1Password share)

### Evidence Review Meeting

Typical agenda:

1. **SIEM Architecture** (15 min)
   - Review data flow diagram
   - Explain correlation rules
   - Demonstrate alerting

2. **Evidence Verification** (30 min)
   - Verify GPG signatures
   - Review evidence completeness
   - Spot-check sample entries

3. **Control Walkthrough** (45 min)
   - CC6.1-6.3: Access control evidence
   - CC7.2: Security monitoring
   - CC8.1: Change management
   - CC9.1: Availability
   - GDPR: Data residency compliance

4. **Live Demonstration** (30 min)
   - Show Grafana dashboards
   - Query OpenSearch for specific events
   - Trigger test alert

5. **Questions & Findings** (30 min)

---

## Appendices

### A. Metrics Reference

All metrics pushed to Prometheus:

```
# Evidence collection status
soc2_evidence_collected{evidence_type, quarter}
soc2_user_count{quarter}
soc2_admin_count{quarter}
soc2_orphaned_count{quarter}
soc2_total_changes{quarter}
soc2_production_changes{quarter}
soc2_change_approval_rate{quarter}
soc2_emergency_changes{quarter}
soc2_total_secrets{quarter}
soc2_rotated_secrets{quarter}
soc2_rotation_rate{quarter}
soc2_gdpr_violations{quarter}
soc2_gdpr_compliant{quarter}
soc2_evidence_signed{quarter}
soc2_evidence_bundle_size_bytes{quarter}
soc2_evidence_files_count{quarter}
soc2_collection_last_run_timestamp
soc2_collection_last_run_success{quarter}

# SIEM metrics
siem_auth_events_total{event_type, success}
siem_data_access_total{pii_accessed, region}
siem_security_anomalies_total{anomaly_type, severity}
siem_auth_duration_ms
siem_data_export_size_bytes

# Compliance scores
soc2_access_control_score
soc2_change_management_score
soc2_availability_score
soc2_security_monitoring_score
```

### B. File Inventory

```
/home/user/TEEI-CSR-Platform/
├── k8s/base/siem/
│   ├── opensearch-deployment.yaml
│   ├── opensearch-dashboards.yaml
│   ├── vector-aggregator.yaml
│   ├── kustomization.yaml
│   └── README.md
├── k8s/jobs/
│   └── soc2-evidence-collection.yaml
├── observability/siem/
│   ├── correlation-rules.yaml
│   └── alert-routing.yaml
├── observability/grafana/dashboards/
│   ├── security-siem.json
│   └── soc2-compliance.json
├── scripts/soc2/
│   ├── generate-access-review.sh
│   ├── generate-change-log.sh
│   ├── generate-key-rotation-report.sh
│   ├── generate-gdpr-attestation.sh
│   ├── sign-evidence.sh
│   ├── upload-to-audit-portal.sh
│   └── collect-quarterly-evidence.sh
├── ops/soc2/evidence-binder/
│   ├── README.md
│   └── 2025-Q1/
│       ├── access-reviews/
│       ├── change-management/
│       ├── key-rotation/
│       ├── gdpr-compliance/
│       ├── signatures/
│       ├── SHA256SUMS
│       ├── SHA256SUMS.asc
│       ├── MANIFEST.json
│       └── soc2-evidence-bundle-2025-Q1.tar.gz
└── docs/
    └── SIEM_SOC2.md (this file)
```

### C. Contact Information

- **DPO**: dpo@teei-csr.com
- **CISO**: ciso@teei-csr.com
- **Security Team**: security@teei-csr.com
- **Compliance Team**: compliance@teei-csr.com
- **SRE On-Call**: PagerDuty (security-oncall integration)
- **External Auditor**: auditor@audit-firm.com

### D. Regulatory References

- **SOC2**: AICPA Trust Services Criteria (2017)
- **GDPR**: Regulation (EU) 2016/679
  - Article 32: Security of processing
  - Article 44: General principle for transfers
  - Article 46: Transfers subject to appropriate safeguards
- **NIST Cybersecurity Framework**: ID.AM, PR.AC, DE.AE, RS.AN

### E. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-15 | 1.0 | Initial documentation | Security Team |

---

**Document Approval**:
- DPO: __________________ Date: __________
- CISO: _________________ Date: __________
- Compliance Lead: _______ Date: __________

**Next Review**: 2026-02-15
