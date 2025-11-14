# Database Backup & Restore Guide

**Version:** 1.0
**Last Updated:** 2025-11-13
**Owner:** Data Lead Team

## Overview

This guide provides comprehensive procedures for backing up and restoring the TEEI CSR Platform PostgreSQL database. It covers automated backup scheduling, manual backup procedures, restore operations, and disaster recovery protocols.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Automated Backup Setup](#automated-backup-setup)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Restore Procedures](#restore-procedures)
5. [Disaster Recovery](#disaster-recovery)
6. [Backup Verification](#backup-verification)
7. [Troubleshooting](#troubleshooting)

---

## Backup Strategy

### Backup Types

#### 1. Logical Backups (pg_dump)
- **Format**: SQL dump files with gzip compression
- **Frequency**: Daily (automated)
- **Retention**: 7 days rolling
- **Use Case**: Point-in-time recovery, schema migrations, cross-version restores
- **Location**: `/backups/` directory (configure in production)

#### 2. Physical Backups (Future: WAL archiving)
- **Format**: Base backup + WAL files
- **Frequency**: Continuous WAL archiving
- **Use Case**: Continuous PITR (Point-In-Time Recovery)
- **Status**: Planned for production deployment

### Retention Policy

| Backup Type | Frequency | Retention |
|------------|-----------|-----------|
| Daily logical | 1x per day (2 AM) | 7 days |
| Weekly logical | Sunday 2 AM | 4 weeks |
| Monthly logical | 1st of month | 12 months |
| Pre-migration | Before migration | Until migration verified |

---

## Automated Backup Setup

### Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `psql`)
- `DATABASE_URL` environment variable configured
- Write permissions to backup directory
- Sufficient disk space (estimate: 2-3x database size for compressed backups)

### Using the Backup Utility

The backup utility is located at `/packages/db/src/backup.ts`.

#### Installation

```bash
cd /packages/db
npm install
```

#### Configuration

Create a backup configuration file:

```typescript
// backup.config.ts
import { BackupConfig } from './src/backup';

export const config: BackupConfig = {
  connectionString: process.env.DATABASE_URL!,
  backupDir: '/var/backups/teei-platform',
  retentionCount: 7,
  prefix: 'teei_platform',
  compress: true,
};
```

#### Schedule Automated Backups

**Option 1: Node.js Scheduled Task**

```typescript
import { scheduleBackups } from '@teei/db/backup';
import { config } from './backup.config';

// Run backup every 6 hours (in milliseconds)
const timerId = scheduleBackups(config, 6 * 60 * 60 * 1000);

// Keep the process running
process.on('SIGINT', () => {
  clearInterval(timerId);
  process.exit(0);
});
```

**Option 2: Cron Job (Linux/Unix)**

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * cd /app/packages/db && npm run backup:create >> /var/log/teei-backup.log 2>&1

# Weekly backup on Sunday at 2 AM
0 2 * * 0 cd /app/packages/db && npm run backup:create:weekly >> /var/log/teei-backup.log 2>&1
```

**Option 3: systemd Timer (Linux)**

Create `/etc/systemd/system/teei-backup.service`:

```ini
[Unit]
Description=TEEI Database Backup
Wants=teei-backup.timer

[Service]
Type=oneshot
WorkingDirectory=/app/packages/db
ExecStart=/usr/bin/npm run backup:create
User=teei
Environment=DATABASE_URL=postgresql://user:pass@localhost:5432/teei_platform

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/teei-backup.timer`:

```ini
[Unit]
Description=TEEI Database Backup Timer
Requires=teei-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable teei-backup.timer
sudo systemctl start teei-backup.timer
sudo systemctl status teei-backup.timer
```

---

## Manual Backup Procedures

### Create a Backup

#### Using the Backup Utility

```bash
cd /packages/db
npm run backup:create
```

Output:
```
[Backup] Starting database backup to /backups/teei_platform_2025-11-13T10-00-00.sql.gz
[Backup] Completed in 12345ms, size: 45.67 MB
[Cleanup] Removing old backup: /backups/teei_platform_2025-11-06T10-00-00.sql.gz
```

#### Using pg_dump Directly

**Compressed backup:**
```bash
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > teei_platform_$(date +%Y-%m-%d_%H-%M-%S).sql.gz
```

**Uncompressed backup:**
```bash
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-acl \
  > teei_platform_$(date +%Y-%m-%d_%H-%M-%S).sql
```

**Custom format (recommended for large databases):**
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file=teei_platform_$(date +%Y-%m-%d_%H-%M-%S).dump
```

### List Available Backups

```bash
cd /packages/db
npm run backup:list
```

Output:
```
Found 7 backups:
  /backups/teei_platform_2025-11-13T10-00-00.sql.gz - 45.67 MB - 2025-11-13T10:00:00.000Z
  /backups/teei_platform_2025-11-12T10-00-00.sql.gz - 44.23 MB - 2025-11-12T10:00:00.000Z
  ...
```

---

## Restore Procedures

### ⚠️ Pre-Restore Checklist

Before restoring a backup:

1. **Verify backup integrity** (see Backup Verification section)
2. **Stop all application services** to prevent data corruption
3. **Create a backup of the current database** (if not corrupted)
4. **Notify stakeholders** of maintenance window
5. **Document the reason for restore** in incident log

### Restore from Backup

#### Using the Backup Utility

```bash
cd /packages/db
npm run backup:restore -- /backups/teei_platform_2025-11-13T10-00-00.sql.gz --clean
```

**Flags:**
- `--clean`: Drop existing database objects before restore (recommended)

Output:
```
[Restore] Starting database restore from /backups/teei_platform_2025-11-13T10-00-00.sql.gz
[Restore] Dropping existing database objects...
[Restore] Completed in 15678ms
```

#### Using psql Directly

**Compressed backup:**
```bash
# WARNING: This will overwrite the database!
gunzip -c teei_platform_2025-11-13T10-00-00.sql.gz | psql "$DATABASE_URL"
```

**Uncompressed backup:**
```bash
psql "$DATABASE_URL" < teei_platform_2025-11-13T10-00-00.sql
```

**Custom format:**
```bash
pg_restore --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  teei_platform_2025-11-13T10-00-00.dump
```

### Post-Restore Steps

1. **Verify data integrity:**
   ```bash
   npm run db:verify
   ```

2. **Run database health check:**
   ```bash
   cd /packages/db
   node -e "const {createOptimizer} = require('./src/optimizer'); \
     createOptimizer({connectionString: process.env.DATABASE_URL}) \
     .healthCheck().then(ok => console.log('Health:', ok))"
   ```

3. **Update sequences (if needed):**
   ```sql
   SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
   -- Repeat for all sequences
   ```

4. **Restart application services**

5. **Monitor error logs** for 15-30 minutes

6. **Document restore in incident log**

---

## Disaster Recovery

### Scenario 1: Database Corruption

**Symptoms:**
- Query errors: "invalid page header"
- Postgres crash loops
- Data inconsistencies

**Recovery Steps:**

1. Stop application services
2. Attempt to export uncorrupted data:
   ```bash
   pg_dump --table=users ... > partial_backup.sql
   ```
3. Restore from latest backup:
   ```bash
   npm run backup:restore -- /backups/latest.sql.gz --clean
   ```
4. Manually recover data created after backup (if possible)
5. Investigate root cause (disk failure, OOM, etc.)

### Scenario 2: Accidental Data Deletion

**Symptoms:**
- Reports of missing data
- Unexpected query results

**Recovery Steps:**

1. **Stop application immediately** to prevent further writes
2. Identify time of deletion from audit logs or application logs
3. Restore to staging database for investigation:
   ```bash
   npm run backup:restore -- /backups/pre-incident.sql.gz
   ```
4. Export deleted records:
   ```sql
   COPY (SELECT * FROM users WHERE deleted_at IS NULL) TO '/tmp/recovered_users.csv' CSV HEADER;
   ```
5. Import to production (if safe)
6. Update audit logs with recovery action

### Scenario 3: Failed Migration

**Symptoms:**
- Migration script errors
- Application errors after deployment
- Schema inconsistencies

**Recovery Steps:**

1. **DO NOT** run more migrations
2. Check if rollback script exists:
   ```bash
   ls /packages/shared-schema/migrations/rollback/
   ```
3. Run rollback script:
   ```bash
   psql "$DATABASE_URL" < /packages/shared-schema/migrations/rollback/0004_rollback_idempotency_tables.sql
   ```
4. Verify schema state matches pre-migration:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
5. If rollback fails, restore from pre-migration backup
6. Investigate migration failure, fix script, test in staging

---

## Backup Verification

### Verify Backup Integrity

#### Using the Backup Utility

```typescript
import { verifyBackup } from '@teei/db/backup';

const isValid = await verifyBackup(
  '/backups/teei_platform_2025-11-13T10-00-00.sql.gz',
  'postgresql://teei:pass@localhost:5432/teei_test'
);

console.log('Backup valid:', isValid);
```

#### Manual Verification

1. **Test restore to temporary database:**
   ```bash
   # Create test database
   createdb teei_test_restore

   # Restore backup
   gunzip -c backup.sql.gz | psql postgresql://localhost/teei_test_restore

   # Verify table count
   psql postgresql://localhost/teei_test_restore -c "\dt"

   # Cleanup
   dropdb teei_test_restore
   ```

2. **Check file integrity:**
   ```bash
   # Verify gzip compression
   gunzip -t backup.sql.gz

   # Check file size (should not be 0 or suspiciously small)
   ls -lh backup.sql.gz
   ```

### Regular Backup Drills

**Schedule:** Monthly on 15th

**Procedure:**

1. Select random backup from past week
2. Restore to staging environment
3. Run automated test suite
4. Verify critical data:
   - User count matches production
   - Latest records present
   - Foreign key integrity
5. Document results in runbook
6. Delete staging database after verification

---

## Troubleshooting

### Issue: Backup Fails with "Permission Denied"

**Cause:** Insufficient permissions on backup directory

**Solution:**
```bash
sudo chown -R teei:teei /var/backups/teei-platform
sudo chmod 755 /var/backups/teei-platform
```

### Issue: Restore Fails with "role does not exist"

**Cause:** Backup contains role references not present in target database

**Solution:**
Add `--no-owner --no-acl` flags:
```bash
pg_restore --no-owner --no-acl backup.dump
```

### Issue: Backup File Grows Too Large

**Cause:** Database size increase, verbose logging tables

**Solutions:**
1. Exclude log tables from backup:
   ```bash
   pg_dump --exclude-table=event_logs --exclude-table=audit_logs ...
   ```
2. Implement table partitioning for logs
3. Archive and truncate old log data

### Issue: Restore Takes Too Long

**Cause:** Single-threaded restore process

**Solution:**
Use custom format with parallel jobs:
```bash
pg_restore --jobs=4 --dbname="$DATABASE_URL" backup.dump
```

---

## Best Practices

1. **Test restores regularly** - Backups are only good if they can be restored
2. **Store backups off-site** - Use S3, Azure Blob, or similar cloud storage
3. **Encrypt backups** - Use gpg or cloud provider encryption
4. **Monitor backup job failures** - Alert on failed backups
5. **Document restore procedures** - Keep this guide updated
6. **Automate verification** - Run monthly restore drills
7. **Version control migration scripts** - Keep rollback scripts in sync

---

## Related Documents

- [Migration Playbook](/docs/Migration_Playbook.md)
- [Database ER Diagram](/docs/Database_ER_Diagram.md)
- [Backup Utility Source](/packages/db/src/backup.ts)

---

## Contact

For backup/restore support:
- **Data Lead Team**: data-team@teei-platform.org
- **On-Call DBA**: See PagerDuty rotation
- **Escalation**: CTO / Infrastructure Lead

**Emergency Hotline:** [Configure in production]
