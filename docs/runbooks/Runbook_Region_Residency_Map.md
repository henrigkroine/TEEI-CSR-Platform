# Runbook: Data Residency Compliance Verification

**Document ID**: RB-GA-002
**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: Compliance & Security Team
**Severity**: HIGH
**Compliance Frameworks**: GDPR, CCPA, PIPEDA, UK GDPR

---

## 📋 Overview

This runbook provides procedures for verifying and maintaining data residency compliance across all geographic regions. It ensures that customer data remains within legally mandated boundaries and provides audit trails for regulatory compliance.

### Regulatory Requirements

| Region | Framework | Key Requirement | Enforcement |
|--------|-----------|----------------|-------------|
| **EU** | GDPR | Personal data must remain in EU/EEA | Mandatory |
| **UK** | UK GDPR | Personal data must remain in UK (or adequate country) | Mandatory |
| **US** | CCPA | Data residency preferred, not mandatory | Advisory |
| **Canada** | PIPEDA | Data residency preferred for federal contracts | Contractual |
| **Norway** | Personal Data Act | Follows GDPR + stricter consent requirements | Mandatory |

---

## 🗺️ Region Residency Map

### Production Regions

#### **US-EAST-1 (Virginia)**

**Geographic Coverage**:
- United States
- Canada (non-federal contracts)
- Latin America
- Default for non-EU/UK tenants

**Data Stored**:
- Tenant operational data (non-EU/UK tenants)
- Audit logs (regional)
- Analytics aggregates (anonymized, global)
- Application logs and metrics

**AWS Services**:
- EKS Cluster: `teei-prod-us-east-1`
- RDS Postgres: `teei-prod-db-us-east-1` (encrypted, no cross-region replication of PII)
- ClickHouse: `clickhouse-us-east-1` (analytics only, anonymized)
- S3 Buckets: `teei-platform-us-east-1`, `teei-backups-us-east-1`
- NATS: `nats-us-east-1` (transient messages only)

**Compliance Attestations**:
- SOC 2 Type II
- ISO 27001
- FedRAMP Moderate (AWS infrastructure)

---

#### **EU-CENTRAL-1 (Frankfurt)**

**Geographic Coverage**:
- European Union (all 27 member states)
- European Economic Area (EEA)
- UK (post-Brexit, under adequacy decision)
- Switzerland
- Norway

**Data Stored**:
- Tenant operational data (EU/UK/EEA tenants ONLY)
- Audit logs (regional)
- Analytics aggregates (anonymized, regional)
- Application logs and metrics

**AWS Services**:
- EKS Cluster: `teei-prod-eu-central-1`
- RDS Postgres: `teei-prod-db-eu-central-1` (encrypted, NO cross-region replication)
- ClickHouse: `clickhouse-eu-central-1` (EU data only)
- S3 Buckets: `teei-platform-eu-central-1`, `teei-backups-eu-central-1`
- NATS: `nats-eu-central-1` (transient messages only)

**Compliance Attestations**:
- GDPR compliant
- ISO 27001
- C5 (Cloud Computing Compliance Criteria Catalogue - Germany)
- SOC 2 Type II

**Data Processing Agreement (DPA)**:
- AWS GDPR DPA signed
- Standard Contractual Clauses (SCCs) in place
- Data Protection Impact Assessment (DPIA) completed

---

#### **AP-SOUTHEAST-1 (Singapore)** - Future

**Geographic Coverage** (Planned):
- APAC region
- Australia (post-region launch)
- Singapore
- Japan

**Target Launch**: Q2 2026

---

## 🔍 Residency Verification Procedures

### Daily Automated Checks

#### 1. Tenant-to-Region Mapping Validation

**Query tenant residency configuration**:
```sql
-- Run against Postgres primary in EACH region
SELECT
  tenant_id,
  tenant_name,
  data_residency_region,
  db_region,
  created_at,
  updated_at
FROM tenants
WHERE data_residency_region != 'us-east-1'
  AND db_region != data_residency_region;

-- Expected result: 0 rows (no mismatches)
```

**Automated Check** (runs via cron every 6 hours):
```bash
#!/bin/bash
# /opt/compliance/scripts/verify_residency.sh

REGIONS=("us-east-1" "eu-central-1")
MISMATCH_COUNT=0

for REGION in "${REGIONS[@]}"; do
  echo "Checking region: $REGION"

  # Query tenant residency
  MISMATCHES=$(kubectl exec -n database postgresql-primary-0 --context teei-prod-$REGION -- \
    psql -U postgres -d teei_prod -t -c \
    "SELECT COUNT(*) FROM tenants WHERE data_residency_region != db_region;")

  if [ "$MISMATCHES" -gt 0 ]; then
    echo "❌ ALERT: $MISMATCHES residency violations in $REGION"
    MISMATCH_COUNT=$((MISMATCH_COUNT + MISMATCHES))

    # Send PagerDuty alert
    curl -X POST https://events.pagerduty.com/v2/enqueue \
      -H 'Content-Type: application/json' \
      -d "{
        \"routing_key\": \"$PAGERDUTY_RESIDENCY_KEY\",
        \"event_action\": \"trigger\",
        \"payload\": {
          \"summary\": \"Data residency violation detected in $REGION\",
          \"severity\": \"critical\",
          \"source\": \"residency-monitor\",
          \"custom_details\": {
            \"region\": \"$REGION\",
            \"violation_count\": $MISMATCHES
          }
        }
      }"
  else
    echo "✅ No residency violations in $REGION"
  fi
done

exit $MISMATCH_COUNT
```

---

#### 2. Cross-Region Data Access Audit

**Monitor for unauthorized cross-region queries**:
```sql
-- Audit log query (run in each region)
SELECT
  timestamp,
  user_id,
  tenant_id,
  action,
  resource,
  source_region,
  target_region,
  allowed
FROM audit_logs
WHERE source_region != target_region
  AND action IN ('READ', 'WRITE', 'UPDATE', 'DELETE')
  AND allowed = false
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Expected: Only allowlisted system operations (replication, backups)
```

**Alert on violations**:
```bash
# Datadog monitor: Cross-region access violations
# Metric: audit.cross_region_access.denied
# Threshold: > 0 occurrences in 5 minutes
# Action: Page on-call security team
```

---

#### 3. S3 Bucket Replication Check

**Ensure NO replication of PII to other regions**:
```bash
# Check S3 replication rules
aws s3api get-bucket-replication --bucket teei-platform-eu-central-1 --region eu-central-1

# Expected output:
# An error occurred (ReplicationConfigurationNotFoundError) when calling the GetBucketReplication operation:
# The replication configuration was not found

# If replication IS configured, verify it's only for anonymized logs/metrics
```

**Automated validation**:
```bash
#!/bin/bash
# /opt/compliance/scripts/check_s3_replication.sh

BUCKETS=("teei-platform-us-east-1" "teei-platform-eu-central-1" "teei-backups-us-east-1" "teei-backups-eu-central-1")

for BUCKET in "${BUCKETS[@]}"; do
  REGION=$(echo $BUCKET | grep -oP 'us-east-1|eu-central-1')

  echo "Checking replication for: $BUCKET"

  REPL_CONFIG=$(aws s3api get-bucket-replication --bucket $BUCKET --region $REGION 2>&1)

  if echo "$REPL_CONFIG" | grep -q "ReplicationConfigurationNotFoundError"; then
    echo "✅ No replication configured (compliant)"
  else
    echo "⚠️ Replication configured - manual review required"
    echo "$REPL_CONFIG"

    # Check if replication destination is in same compliance zone
    DEST_BUCKET=$(echo "$REPL_CONFIG" | jq -r '.ReplicationConfiguration.Rules[0].Destination.Bucket')
    if [[ "$BUCKET" == *"eu-central-1"* ]] && [[ "$DEST_BUCKET" != *"eu-central-1"* ]]; then
      echo "❌ CRITICAL: EU bucket replicating outside EU!"
      exit 1
    fi
  fi
done
```

---

### Weekly Compliance Audits

#### 4. Tenant Onboarding Review

**Verify new tenants are correctly mapped**:
```sql
-- Review tenants created in last 7 days
SELECT
  t.tenant_id,
  t.tenant_name,
  t.billing_country,
  t.data_residency_region,
  t.db_region,
  t.created_at,
  CASE
    WHEN t.billing_country IN ('DE','FR','IT','ES','NL','BE','AT','SE','DK','NO','FI','IE','PT','GR','PL','CZ','HU','RO')
      AND t.data_residency_region != 'eu-central-1' THEN 'VIOLATION: EU tenant not in EU region'
    WHEN t.billing_country = 'GB'
      AND t.data_residency_region != 'eu-central-1' THEN 'VIOLATION: UK tenant not in EU region'
    WHEN t.data_residency_region != t.db_region THEN 'VIOLATION: Region mismatch'
    ELSE 'COMPLIANT'
  END AS compliance_status
FROM tenants t
WHERE t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC;
```

**Export to compliance report**:
```bash
# Generate weekly compliance report
psql -U postgres -d teei_prod -c "COPY (
  SELECT * FROM weekly_residency_compliance_view
) TO STDOUT CSV HEADER" > /tmp/compliance_report_$(date +%Y%m%d).csv

# Upload to secure S3 bucket
aws s3 cp /tmp/compliance_report_$(date +%Y%m%d).csv \
  s3://teei-compliance-reports-us-east-1/residency/$(date +%Y)/$(date +%m)/ \
  --sse aws:kms \
  --sse-kms-key-id alias/compliance-reports
```

---

#### 5. Backup Location Verification

**Ensure backups respect residency**:
```bash
# Check RDS automated backups
aws rds describe-db-snapshots \
  --db-instance-identifier teei-prod-db-eu-central-1 \
  --region eu-central-1 \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,AvailabilityZone]' \
  --output table

# Expected: All snapshots in eu-central-1 availability zones

# Verify NO cross-region backup copy
aws rds describe-db-snapshot-attributes \
  --db-snapshot-identifier <snapshot-id> \
  --region eu-central-1 \
  --query 'DBSnapshotAttributesResult.DBSnapshotAttributes[?AttributeName==`restore`].AttributeValues'

# Expected: Only accounts in allowlist, NO cross-region restore permissions
```

---

### Monthly Data Flow Audits

#### 6. Network Traffic Analysis

**Verify no unauthorized egress to other regions**:
```bash
# Query VPC Flow Logs
aws ec2 describe-flow-logs --region eu-central-1 --filter Name=resource-id,Values=vpc-xxxxx

# Analyze flow logs for cross-region traffic
aws s3 cp s3://vpc-flow-logs-eu-central-1/$(date +%Y/%m/%d)/ /tmp/flow-logs/ --recursive

# Parse logs for traffic to other AWS regions
grep -E "(us-east-1|ap-southeast-1)" /tmp/flow-logs/*.log > /tmp/cross_region_traffic.txt

# Expected: Only allowlisted traffic (CloudWatch, S3 for metrics/logs)
```

**Automated flow log analysis**:
```python
# /opt/compliance/scripts/analyze_flow_logs.py
import boto3
import re
from datetime import datetime, timedelta

def analyze_cross_region_traffic(region, vpc_id):
    """Analyze VPC flow logs for unauthorized cross-region traffic"""

    s3 = boto3.client('s3', region_name=region)
    bucket = f'vpc-flow-logs-{region}'

    # Allowlist: Legitimate cross-region services
    ALLOWLIST = [
        '*.cloudwatch.amazonaws.com',
        '*.s3.amazonaws.com',  # For metrics/logs only
        '*.ecr.amazonaws.com',  # Docker image pulls
    ]

    # Fetch today's logs
    prefix = datetime.now().strftime('%Y/%m/%d/')
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)

    violations = []

    for obj in response.get('Contents', []):
        # Download and parse flow log
        log_obj = s3.get_object(Bucket=bucket, Key=obj['Key'])
        log_data = log_obj['Body'].read().decode('utf-8')

        # Parse for cross-region IPs (simplified)
        for line in log_data.split('\n'):
            if 'ACCEPT' in line:
                parts = line.split()
                dst_ip = parts[4]

                # Check if IP is in other AWS region (simplified check)
                if is_cross_region(dst_ip, region) and not is_allowlisted(dst_ip, ALLOWLIST):
                    violations.append({
                        'timestamp': parts[10],
                        'src_ip': parts[3],
                        'dst_ip': dst_ip,
                        'protocol': parts[7],
                    })

    return violations

# Run analysis and alert
violations = analyze_cross_region_traffic('eu-central-1', 'vpc-xxxxx')
if violations:
    print(f"❌ {len(violations)} cross-region traffic violations detected")
    # Send to SIEM
else:
    print("✅ No cross-region traffic violations")
```

---

## 🚨 Violation Response Procedures

### Severity Levels

| Severity | Definition | Response Time | Escalation |
|----------|-----------|---------------|------------|
| **CRITICAL** | Active data transfer outside residency boundary | Immediate (< 5 min) | CTO, Legal, DPO |
| **HIGH** | Configuration drift allowing potential violation | < 30 min | Security Lead, Compliance |
| **MEDIUM** | Audit log anomaly, no confirmed violation | < 4 hours | On-call SRE |
| **LOW** | Documentation/process gap | < 24 hours | Compliance team |

---

### Incident Response: Critical Violation

**If active cross-region data transfer detected**:

```bash
# STEP 1: IMMEDIATE - Block cross-region traffic (circuit breaker)
# Update security group to deny egress to other regions
aws ec2 revoke-security-group-egress \
  --group-id sg-xxxxx \
  --ip-permissions IpProtocol=-1,IpRanges='[{CidrIp=0.0.0.0/0}]' \
  --region eu-central-1

# STEP 2: Identify affected tenants
psql -U postgres -d teei_prod -c "
  SELECT tenant_id, tenant_name, data_residency_region
  FROM tenants
  WHERE tenant_id IN (
    SELECT DISTINCT tenant_id FROM audit_logs
    WHERE source_region != target_region
      AND timestamp > NOW() - INTERVAL '1 hour'
  );
"

# STEP 3: Notify affected tenants (GDPR Article 33: within 72 hours)
# Use notification service
curl -X POST https://api.teei.io/internal/compliance/notify-breach \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "incident_id": "RES-2025-001",
    "severity": "high",
    "affected_tenants": ["tenant-123", "tenant-456"],
    "description": "Potential data residency violation detected",
    "remediation": "Investigation in progress, access temporarily restricted"
  }'

# STEP 4: Engage legal/DPO
# Send encrypted email to legal@teei.io, dpo@teei.io
```

---

## 📋 Tenant Residency Mapping

### Onboarding Process

**When onboarding a new tenant**:

1. **Identify billing country** (from contract/signup)
2. **Determine data residency region**:
   ```
   IF billing_country IN (EU27, UK, NO, CH, IS, LI) THEN
     data_residency_region = 'eu-central-1'
   ELSIF billing_country IN (US, CA, MX, BR, AR) THEN
     data_residency_region = 'us-east-1'
   ELSIF billing_country IN (AU, SG, JP, NZ) THEN
     data_residency_region = 'ap-southeast-1'  # Future
   ELSE
     data_residency_region = 'us-east-1'  # Default
   END IF
   ```

3. **Set tenant configuration**:
   ```sql
   INSERT INTO tenants (
     tenant_id,
     tenant_name,
     billing_country,
     data_residency_region,
     db_region
   ) VALUES (
     'tenant-new-001',
     'Acme Corp EU',
     'DE',
     'eu-central-1',
     'eu-central-1'
   );
   ```

4. **Validate routing**:
   ```bash
   # Test tenant routing
   curl -H "X-Tenant-ID: tenant-new-001" https://platform.teei.io/api/v1/health
   # Expected: {"region":"eu-central-1","tenant":"tenant-new-001"}
   ```

---

### Migration Process (Region Change)

**If tenant requests region migration** (e.g., company relocates):

```bash
# STEP 1: Legal review (DPA amendment required for EU tenants)
# Obtain written consent from tenant

# STEP 2: Create migration plan
# Document: target region, data volume, downtime window

# STEP 3: Backup current data
pg_dump -U postgres -d teei_prod -t tenants -t tenant_data \
  --data-only --inserts \
  -f /tmp/tenant-migration-backup.sql

# STEP 4: Export to target region
aws s3 cp /tmp/tenant-migration-backup.sql \
  s3://teei-migrations-<target-region>/tenant-new-001/ \
  --sse aws:kms

# STEP 5: Import in target region
# (Run in target region context)
psql -U postgres -d teei_prod -f /tmp/tenant-migration-backup.sql

# STEP 6: Update tenant record
UPDATE tenants
SET data_residency_region = 'us-east-1',
    db_region = 'us-east-1',
    migration_date = NOW(),
    migration_reason = 'Company relocation'
WHERE tenant_id = 'tenant-new-001';

# STEP 7: Verify migration
SELECT * FROM tenants WHERE tenant_id = 'tenant-new-001';

# STEP 8: Delete from source region (after verification period)
# Wait 30 days, then:
DELETE FROM tenant_data WHERE tenant_id = 'tenant-new-001';
DELETE FROM tenants WHERE tenant_id = 'tenant-new-001';
```

---

## 📊 Compliance Dashboard

### Key Metrics

**Monitor in Datadog/Grafana**:

1. **Residency Compliance Rate**:
   ```
   (Total tenants correctly mapped / Total tenants) * 100
   Target: 100%
   ```

2. **Cross-Region Access Denials**:
   ```
   COUNT(audit_logs WHERE source_region != target_region AND allowed = false)
   Target: > 0 (shows enforcement is working)
   ```

3. **Cross-Region Access Allowances** (should be ZERO for data operations):
   ```
   COUNT(audit_logs WHERE source_region != target_region AND allowed = true AND action IN ('READ','WRITE'))
   Target: 0
   ```

4. **Backup Residency Compliance**:
   ```
   (Backups in correct region / Total backups) * 100
   Target: 100%
   ```

---

## 📚 Compliance Artifacts

### Required Documentation (Updated Quarterly)

- [ ] **Data Processing Agreement (DPA)** - EU tenants
- [ ] **Data Protection Impact Assessment (DPIA)** - High-risk processing
- [ ] **Standard Contractual Clauses (SCCs)** - Cross-border transfers
- [ ] **Records of Processing Activities (ROPA)** - GDPR Article 30
- [ ] **Vendor Due Diligence** - AWS, subprocessors
- [ ] **Data Residency Certification** - Customer-facing attestation

### Audit Trails

**Retain for 7 years** (GDPR requirement):
- Tenant residency configurations (all changes)
- Cross-region access logs (all attempts)
- Backup locations and restore tests
- DPO notifications and breach reports

---

## 🔗 Related Documentation

- [Data Residency Strategy](/docs/Data_Residency.md)
- [GDPR Compliance Guide](/docs/GDPR_Compliance.md)
- [SIEM & SOC2 Audit Logs](/docs/SIEM_SOC2.md)
- [DR Strategy](/docs/DR_Strategy.md)
- [Database Backup & Restore](/docs/DB_Backup_Restore.md)

---

## 📞 Escalation Contacts

| Role | Contact | Scope |
|------|---------|-------|
| **Data Protection Officer (DPO)** | dpo@teei.io | GDPR violations |
| **Chief Information Security Officer (CISO)** | Slack: @ciso | Security incidents |
| **Legal Counsel** | legal@teei.io | Regulatory inquiries |
| **Compliance Lead** | Slack: @compliance-lead | Process questions |

---

**Document History**:
- **v1.0.0** (2025-11-15): Initial data residency runbook
