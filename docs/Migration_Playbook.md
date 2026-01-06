# Database Migration Playbook

**Version:** 1.0
**Last Updated:** 2025-11-13
**Owner:** Data Lead Team

## Overview

This playbook provides step-by-step procedures for executing database migrations safely in the TEEI CSR Platform. It covers pre-migration checks, execution strategies, rollback procedures, and post-migration verification.

## Table of Contents

1. [Migration Philosophy](#migration-philosophy)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Execution](#migration-execution)
4. [Rollback Procedures](#rollback-procedures)
5. [Zero-Downtime Migrations](#zero-downtime-migrations)
6. [Migration Patterns](#migration-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Migration Philosophy

### Principles

1. **Backward Compatibility**: Migrations should not break existing application code
2. **Rollback-Ready**: Every migration must have a tested rollback script
3. **Incremental Changes**: Small, focused migrations are safer than large ones
4. **Test First**: Always test in staging before production
5. **Zero-Downtime**: Strive for zero-downtime migrations using multi-phase deployments

### Migration Naming Convention

```
{sequence}_{action}_{description}.sql
```

Examples:
- `0001_create_users_table.sql`
- `0002_add_email_index.sql`
- `0003_alter_users_add_role.sql`
- `0004_add_idempotency_tables.sql`

Rollback scripts mirror the forward migration:
- `0004_rollback_idempotency_tables.sql`

---

## Pre-Migration Checklist

### 1. Review Migration Script

- [ ] Script is idempotent (safe to run multiple times)
- [ ] Uses `IF EXISTS`, `IF NOT EXISTS` where appropriate
- [ ] Contains comments explaining purpose and impact
- [ ] Estimated execution time documented
- [ ] Rollback script exists and is tested
- [ ] No blocking DDL on large tables (see Zero-Downtime Migrations)

### 2. Test in Staging

- [ ] Staging database is up-to-date with production schema
- [ ] Migration executed successfully in staging
- [ ] Application tests pass after migration
- [ ] Rollback tested and verified in staging
- [ ] Performance impact measured (query times, lock durations)

### 3. Backup & Preparation

- [ ] **CRITICAL**: Create pre-migration backup
  ```bash
  npm run backup:create -- --prefix=pre-migration-0004
  ```
- [ ] Verify backup integrity
  ```bash
  npm run backup:verify -- /backups/pre-migration-0004_*.sql.gz
  ```
- [ ] Disk space check (ensure 2x database size available)
- [ ] Monitor dashboard accessible
- [ ] Rollback procedure reviewed with team

### 4. Communication

- [ ] Stakeholders notified of maintenance window
- [ ] Deployment ticket created with rollback plan
- [ ] On-call engineer briefed
- [ ] Incident channel prepared (Slack, Teams, etc.)

### 5. Timing

- [ ] Scheduled during low-traffic period
- [ ] Sufficient time allocated (2x estimated + 1 hour buffer)
- [ ] Team members available for monitoring

---

## Migration Execution

### Standard Migration (Non-Blocking)

#### Step 1: Stop Application (If Required)

```bash
# Kubernetes
kubectl scale deployment teei-api --replicas=0

# Docker Compose
docker-compose stop api-gateway unified-profile kintell-connector buddy-service upskilling-connector

# Systemd
sudo systemctl stop teei-*.service
```

#### Step 2: Create Pre-Migration Backup

```bash
cd /packages/db
npm run backup:create -- --prefix=pre-migration-0005
```

Verify:
```bash
ls -lh /backups/pre-migration-0005_*.sql.gz
```

#### Step 3: Execute Migration

**Using Drizzle (Recommended):**

```bash
cd /packages/shared-schema
npm run migrate
```

**Using psql Directly:**

```bash
psql "$DATABASE_URL" < /packages/shared-schema/migrations/0005_migration_name.sql
```

**Monitor execution:**

```bash
# In separate terminal
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### Step 4: Verify Migration

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;
```

**Application-level verification:**

```bash
# Run smoke tests
npm run test:integration

# Check health endpoints
curl http://localhost:3017/health/liveness
curl http://localhost:3018/health/liveness
```

#### Step 5: Restart Application

```bash
# Kubernetes
kubectl scale deployment teei-api --replicas=3

# Docker Compose
docker-compose up -d

# Systemd
sudo systemctl start teei-*.service
```

#### Step 6: Monitor

- Watch error logs for 15-30 minutes
- Check application metrics (response times, error rates)
- Verify critical user flows work
- Monitor database connection pool
  ```bash
  cd /packages/db
  node -e "const {getOptimizer} = require('./src/optimizer'); \
    console.log(getOptimizer().getConnectionMetrics())"
  ```

#### Step 7: Post-Migration Cleanup

- Document migration completion time
- Update CHANGELOG.md
- Archive pre-migration backup with retention label
- Send success notification to stakeholders

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Migration fails mid-execution
- Application crashes after migration
- Critical functionality broken
- Data corruption detected
- Performance degradation > 50%

### Rollback Execution

#### Step 1: Stop Application

```bash
docker-compose stop api-gateway unified-profile kintell-connector buddy-service upskilling-connector
```

#### Step 2: Execute Rollback Script

**Option A: Use Rollback Script (Preferred)**

```bash
psql "$DATABASE_URL" < /packages/shared-schema/migrations/rollback/0005_rollback_migration_name.sql
```

**Option B: Restore from Backup**

If rollback script fails or doesn't exist:

```bash
cd /packages/db
npm run backup:restore -- /backups/pre-migration-0005_*.sql.gz --clean
```

#### Step 3: Verify Rollback

```sql
-- Verify tables dropped/restored
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check application can connect
SELECT 1 AS health;
```

#### Step 4: Restart Application (Previous Version)

Redeploy the previous application version:

```bash
# Revert to previous Docker image tag
docker-compose up -d --force-recreate

# Or Kubernetes rollback
kubectl rollout undo deployment/teei-api
```

#### Step 5: Post-Rollback

- Investigate root cause of migration failure
- Update migration script to fix issues
- Test fix in staging
- Schedule retry with updated script

---

## Zero-Downtime Migrations

For production environments, use multi-phase migrations to avoid downtime.

### Phase 1: Additive Changes (Deploy with App v1)

Add new columns/tables without removing old ones.

```sql
-- Migration: Add new column
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Make nullable initially
ALTER TABLE users ALTER COLUMN new_field DROP NOT NULL;

-- Add default for backfill
ALTER TABLE users ALTER COLUMN new_field SET DEFAULT 'default_value';
```

**Application v1 continues running** (ignores new column).

### Phase 2: Dual-Write (Deploy App v2)

Application v2 writes to both old and new fields.

```typescript
// App v2 code
await db.users.update({
  old_field: value,
  new_field: value, // Dual write
});
```

**Both App v1 and v2 can run simultaneously.**

### Phase 3: Backfill (Background Job)

Backfill new column for existing rows.

```sql
-- Backfill in batches to avoid locking
DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
BEGIN
  LOOP
    UPDATE users
    SET new_field = old_field
    WHERE new_field IS NULL
    LIMIT batch_size;

    EXIT WHEN NOT FOUND;
    offset_val := offset_val + batch_size;
    PERFORM pg_sleep(0.1); -- Throttle to avoid load spikes
  END LOOP;
END $$;
```

### Phase 4: Migrate Reads (Deploy App v3)

Application v3 reads from new field, writes to both.

```typescript
// App v3 code
const user = await db.users.findOne({ id });
const value = user.new_field; // Read from new field
```

### Phase 5: Drop Old Column (Deploy App v4)

Application v4 only uses new field. Safe to drop old column.

```sql
-- Migration: Drop old column
ALTER TABLE users DROP COLUMN old_field;
```

**Application v4 deployed**, old column no longer used.

### Phase 6: Cleanup

Remove dual-write code from application.

---

## Migration Patterns

### Pattern 1: Adding a Column

**Safe (Zero-Downtime):**
```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Nullable, no default, no blocking locks
```

**Risky (Locks Table):**
```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT 'N/A';
-- NOT NULL + DEFAULT triggers full table rewrite on large tables (Postgres < 11)
```

**Best Practice:**
1. Add column as nullable
2. Backfill data in batches
3. Add NOT NULL constraint after backfill
4. Add default separately if needed

### Pattern 2: Adding an Index

**Safe (Concurrent Index):**
```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
-- Non-blocking, can run while app is live
```

**Risky (Standard Index):**
```sql
CREATE INDEX idx_users_email ON users(email);
-- Locks table for writes during creation
```

**Best Practice:**
- Always use `CREATE INDEX CONCURRENTLY` for production
- Monitor index creation progress:
  ```sql
  SELECT * FROM pg_stat_progress_create_index;
  ```

### Pattern 3: Renaming a Column

**Multi-Phase Approach:**

**Phase 1:** Add new column
```sql
ALTER TABLE users ADD COLUMN new_name VARCHAR(255);
```

**Phase 2:** Backfill
```sql
UPDATE users SET new_name = old_name WHERE new_name IS NULL;
```

**Phase 3:** Dual-write in application

**Phase 4:** Drop old column
```sql
ALTER TABLE users DROP COLUMN old_name;
```

### Pattern 4: Changing Column Type

**Safe Conversions (No Rewrite):**
- VARCHAR(50) → VARCHAR(100) (Postgres 9.2+)
- NUMERIC → NUMERIC with higher precision

**Risky Conversions (Table Rewrite):**
- VARCHAR → INTEGER
- INTEGER → BIGINT (Postgres < 12)

**Best Practice for Risky Conversions:**
1. Add new column with new type
2. Backfill with CAST in batches
3. Swap reads to new column
4. Drop old column

---

## Troubleshooting

### Issue: Migration Hangs

**Cause:** Blocked by long-running transaction or lock

**Diagnosis:**
```sql
-- Check blocking queries
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
  ON blocked_locks.locktype = blocking_locks.locktype
  AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
  AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
  AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
  AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
  AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
  AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
  AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
  AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
  AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
  AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solution:**
1. Terminate blocking query if safe:
   ```sql
   SELECT pg_terminate_backend(blocking_pid);
   ```
2. Or wait for blocking transaction to complete

### Issue: Rollback Script Fails

**Cause:** Schema dependencies not properly ordered

**Solution:**
1. Drop dependent objects first (views, foreign keys)
2. Then drop tables/columns
3. If still stuck, restore from backup

### Issue: Out of Disk Space During Migration

**Cause:** Large table rewrite or index build

**Solution:**
1. Cancel migration:
   ```sql
   SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE query LIKE '%ALTER TABLE%';
   ```
2. Free up disk space
3. Use multi-phase migration to avoid rewrites

---

## Migration Checklist Template

```markdown
## Migration: [Migration Name]
**Ticket:** [JIRA-123]
**Date:** 2025-11-13
**Engineer:** [Your Name]

### Pre-Migration
- [ ] Backup created: [backup filename]
- [ ] Staging tested: [date/time]
- [ ] Rollback tested: [date/time]
- [ ] Stakeholders notified
- [ ] Maintenance window: [start time] - [end time]

### Execution
- [ ] Application stopped: [time]
- [ ] Migration started: [time]
- [ ] Migration completed: [time]
- [ ] Verification passed
- [ ] Application restarted: [time]

### Post-Migration
- [ ] Monitoring: No errors after 30 min
- [ ] Performance: Within normal range
- [ ] User acceptance: [status]
- [ ] Documentation updated
- [ ] Success notification sent

### Rollback (if needed)
- [ ] Rollback executed: [time]
- [ ] Rollback verified
- [ ] Root cause documented
```

---

## Related Documents

- [Database ER Diagram](/docs/Database_ER_Diagram.md)
- [Backup & Restore Guide](/docs/DB_Backup_Restore.md)
- [Migration Scripts](/packages/shared-schema/migrations/)
- [Rollback Scripts](/packages/shared-schema/migrations/rollback/)

---

## References

- [PostgreSQL ALTER TABLE Performance](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Zero-Downtime Migrations](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
- [Postgres Lock Monitoring](https://wiki.postgresql.org/wiki/Lock_Monitoring)

---

## Contact

For migration support:
- **Data Lead Team**: data-team@teei-platform.org
- **DBA On-Call**: See PagerDuty rotation
- **Escalation**: CTO / Infrastructure Lead
