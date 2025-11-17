# Database Restore Runbook

**Owner**: Database Team / SRE Team
**Severity**: P0-P1 (depending on scope)
**Last Updated**: 2025-11-17
**Review Frequency**: Quarterly

## Overview

This runbook covers procedures for restoring PostgreSQL databases from backups in various failure scenarios:
- Logical corruption (bad data, accidental deletion)
- Physical corruption (disk failure, file system issues)
- Complete database loss (region outage)
- Point-in-time recovery (PITR)

**RPO (Recovery Point Objective)**: < 5 minutes (continuous WAL archiving)
**RTO (Recovery Time Objective)**: < 30 minutes for logical restore, < 2 hours for full restore

---

## Pre-Requisites

- [ ] Access to AWS RDS/Cloud SQL console
- [ ] Access to S3/GCS backup buckets
- [ ] `psql` client installed
- [ ] Database credentials from Vault/Secrets Manager
- [ ] Incident ticket created
- [ ] Stakeholders notified

---

## Backup Architecture

### Continuous Backups
- **Full backups**: Daily at 02:00 UTC
- **WAL archiving**: Continuous (every 16MB or 5 minutes)
- **Retention**: 30 days
- **Storage**: S3 (us-east-1), cross-region replica (eu-central-1)

### Backup Locations
- Production: `s3://teei-platform-backups/postgres/production/`
- Staging: `s3://teei-platform-backups/postgres/staging/`
- WAL Archive: `s3://teei-platform-wal-archive/`

---

## Scenario 1: Logical Corruption (Single Table)

**Example**: Accidental DELETE without WHERE clause, bad UPDATE

### Assessment
```sql
-- Check affected rows
SELECT count(*) FROM users WHERE deleted_at IS NOT NULL;

-- Check when corruption occurred (from audit logs)
SELECT * FROM audit_log
WHERE table_name = 'users'
  AND action = 'DELETE'
  AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

### Recovery Steps

1. **Identify Target Restore Point**
   ```bash
   # List recent backups
   aws s3 ls s3://teei-platform-backups/postgres/production/ \
     --recursive | grep "$(date -d '1 day ago' +%Y-%m-%d)"

   # Example output:
   # 2025-11-16-02-00-00-full.sql.gz
   # 2025-11-16-14-30-00-wal-archive.tar.gz
   ```

2. **Restore to Temporary Database**
   ```bash
   # Create temporary database
   createdb teei_platform_restore_$(date +%s)

   # Download backup
   aws s3 cp \
     s3://teei-platform-backups/postgres/production/2025-11-16-02-00-00-full.sql.gz \
     /tmp/restore.sql.gz

   # Restore to temporary database
   gunzip -c /tmp/restore.sql.gz | \
     psql teei_platform_restore_$(date +%s)
   ```

3. **Apply WAL for Point-in-Time Recovery (PITR)**
   ```bash
   # Download WAL segments for the time range
   aws s3 sync \
     s3://teei-platform-wal-archive/2025-11-16/ \
     /tmp/wal-restore/

   # Apply WAL segments up to target time
   pg_receivewal -D /tmp/wal-restore \
     --slot restore_slot \
     --stop-time='2025-11-16 14:25:00'
   ```

4. **Extract and Validate Data**
   ```sql
   -- Export affected table from restore database
   \copy (SELECT * FROM users WHERE deleted_at IS NULL) TO '/tmp/users_restored.csv' CSV HEADER;

   -- Validate row count
   SELECT count(*) FROM users; -- Should match expected count
   ```

5. **Import Restored Data**
   ```bash
   # Stop application writes (enable maintenance mode)
   kubectl scale deployment api-gateway --replicas=0 -n teei-csr

   # Restore data
   psql teei_platform << SQL
   BEGIN;

   -- Backup current state before restore
   CREATE TABLE users_backup_$(date +%s) AS SELECT * FROM users;

   -- Truncate and reload
   TRUNCATE users CASCADE;
   \copy users FROM '/tmp/users_restored.csv' CSV HEADER

   -- Verify
   SELECT count(*) FROM users;

   COMMIT;
   SQL

   # Re-enable application
   kubectl scale deployment api-gateway --replicas=3 -n teei-csr
   ```

---

## Scenario 2: Full Database Restore

**Example**: Complete database loss, major corruption

### Recovery Steps

1. **Create New Database Instance** (if needed)
   ```bash
   # Using AWS RDS
   aws rds create-db-instance \
     --db-instance-identifier teei-platform-restore \
     --db-instance-class db.r6g.xlarge \
     --engine postgres \
     --engine-version 15.4 \
     --allocated-storage 500 \
     --storage-type gp3 \
     --backup-retention-period 30 \
     --region us-east-1

   # Wait for instance to be available
   aws rds wait db-instance-available \
     --db-instance-identifier teei-platform-restore
   ```

2. **Restore from Latest Snapshot**
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier teei-platform-production \
     --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
     --output table

   # Restore from snapshot
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier teei-platform-restored \
     --db-snapshot-identifier rds:teei-platform-production-2025-11-16-02-00
   ```

3. **Apply WAL for PITR**
   ```bash
   # Enable PITR if supported by RDS
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier teei-platform-production \
     --target-db-instance-identifier teei-platform-pitr \
     --restore-time "2025-11-16T14:25:00Z"
   ```

4. **Validate Restored Database**
   ```bash
   # Connect to restored database
   export PGHOST=$(aws rds describe-db-instances \
     --db-instance-identifier teei-platform-restored \
     --query 'DBInstances[0].Endpoint.Address' \
     --output text)

   # Verification queries
   psql -h $PGHOST -U teei_admin teei_platform << SQL
   -- Check critical tables
   SELECT 'users' AS table_name, count(*) FROM users
   UNION ALL
   SELECT 'companies', count(*) FROM companies
   UNION ALL
   SELECT 'metrics_company_period', count(*) FROM metrics_company_period
   UNION ALL
   SELECT 'evidence_snippets', count(*) FROM evidence_snippets;

   -- Verify latest data
   SELECT max(created_at) FROM users;
   SELECT max(created_at) FROM metrics_company_period;
   SQL
   ```

5. **Switchover Application**
   ```bash
   # Update Kubernetes secrets with new database endpoint
   kubectl create secret generic database-credentials \
     --from-literal=host=$PGHOST \
     --from-literal=database=teei_platform \
     --from-literal=username=teei_admin \
     --from-literal=password=$DB_PASSWORD \
     -n teei-csr \
     --dry-run=client -o yaml | kubectl apply -f -

   # Restart services to pick up new credentials
   kubectl rollout restart deployment \
     api-gateway reporting analytics q2q-ai \
     -n teei-csr

   # Wait for rollout
   kubectl rollout status deployment \
     api-gateway reporting analytics q2q-ai \
     -n teei-csr
   ```

---

## Scenario 3: Cross-Region Restore

**Example**: Primary region unavailable, restore to secondary region

1. **Verify Cross-Region Backup Replication**
   ```bash
   # Check EU region backups
   aws s3 ls s3://teei-platform-backups-eu/postgres/production/ \
     --region eu-central-1
   ```

2. **Restore in Secondary Region**
   ```bash
   # Create database in EU region
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier teei-platform-eu-restored \
     --db-snapshot-identifier rds:teei-platform-production-latest \
     --region eu-central-1
   ```

3. **Follow Region Failover Runbook**
   - See [Region Failover](./region-failover.md)

---

## Validation Checklist

After restore, verify:
- [ ] Row counts match expected values
- [ ] Latest timestamp is within expected range (< RPO)
- [ ] Referential integrity intact: `SELECT * FROM pg_constraint WHERE contype = 'f'`
- [ ] Indexes rebuilt: `REINDEX DATABASE teei_platform`
- [ ] Statistics updated: `ANALYZE VERBOSE`
- [ ] Application can connect and query
- [ ] Synthetic tests pass
- [ ] No ERROR logs in application

---

## Common Issues and Troubleshooting

### Issue: Restore Too Slow
```bash
# Increase parallelism
pg_restore --jobs=8 -d teei_platform backup.dump

# Disable triggers during restore
pg_restore --disable-triggers -d teei_platform backup.dump
```

### Issue: WAL Segments Missing
```bash
# Check S3 for gaps
aws s3 ls s3://teei-platform-wal-archive/2025-11-16/ | sort

# If gaps found, restore to last continuous point
# Accept data loss equal to gap duration
```

### Issue: Out of Disk Space
```bash
# Check disk usage
df -h

# Clean up old restore databases
psql -l | grep restore | awk '{print $1}' | xargs -I{} dropdb {}

# Expand disk if needed
aws rds modify-db-instance \
  --db-instance-identifier teei-platform-restored \
  --allocated-storage 1000 \
  --apply-immediately
```

---

## Backup Verification (Monthly)

Run these tests monthly to ensure backups are restorable:

```bash
#!/bin/bash
# Monthly backup verification

# 1. Restore latest backup to test environment
# 2. Run data validation queries
# 3. Run application smoke tests
# 4. Document results

./scripts/dr/backup-verification.sh
```

---

## Contacts

- **Database Team**: db-team@teei.com, #database-team
- **SRE On-Call**: PagerDuty rotation
- **Cloud Provider Support**: Via console

---

## Related Runbooks

- [Region Failover](./region-failover.md)
- [Service Recovery](./service-recovery.md)
- [DR Smoke Tests](../../scripts/dr/smoke.sh)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-17 | Worker 12 SRE Team | Initial version |
