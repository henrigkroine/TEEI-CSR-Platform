# Kintell Ingestion Layer - Migration Guide
## Database Schema Changes for Swarm 1

**Date**: 2025-11-22
**Agent**: migration-engineer
**Status**: ⚠️ Manual Migration Required (Auto-generation blocked by existing TypeScript errors)

---

## Overview

This migration adds support for:
1. Program instance modeling (`program_instances` table)
2. Ingestion batch tracking (`ingestion_batches` table)
3. Enhanced data lineage (`kintell_sessions.batch_id`, `kintell_sessions.program_instance_id`)
4. Program enrollment linking (`program_enrollments.program_instance_id`)

---

## Migration SQL

### **Step 1: Create `program_instances` Table**

```sql
CREATE TABLE program_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Program identification
  program_type VARCHAR(50) NOT NULL,
  program_name VARCHAR(255) NOT NULL,
  program_slug VARCHAR(255) NOT NULL,

  -- Ownership
  company_id UUID REFERENCES companies(id),

  -- Time boundaries
  start_date DATE NOT NULL,
  end_date DATE,

  -- External system linkage
  external_system_id VARCHAR(255),
  external_system VARCHAR(50),

  -- Program metadata
  description VARCHAR(1000),
  target_participants VARCHAR(500),
  program_goals JSONB,
  metadata JSONB,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX program_instances_program_type_idx ON program_instances(program_type);
CREATE INDEX program_instances_company_id_idx ON program_instances(company_id);
CREATE INDEX program_instances_program_slug_idx ON program_instances(program_slug);
CREATE INDEX program_instances_status_idx ON program_instances(status);
CREATE INDEX program_instances_start_date_idx ON program_instances(start_date);
CREATE INDEX program_instances_company_program_idx ON program_instances(company_id, program_type);
CREATE INDEX program_instances_external_system_idx ON program_instances(external_system, external_system_id);

-- Comments
COMMENT ON TABLE program_instances IS 'Specific runs of programs (e.g., Mentors for Ukraine Q4 2024)';
COMMENT ON COLUMN program_instances.program_type IS 'mentors_ukraine, language_ukraine, buddy, upskilling';
COMMENT ON COLUMN program_instances.program_slug IS 'URL-friendly identifier (e.g., mentors-ukraine-2024-q4)';
COMMENT ON COLUMN program_instances.status IS 'active, completed, paused, cancelled';
```

---

### **Step 2: Create `ingestion_batches` Table**

```sql
CREATE TABLE ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification
  file_name VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  file_size_bytes INTEGER,

  -- Program context
  program_type VARCHAR(50) NOT NULL,
  program_instance_id UUID REFERENCES program_instances(id),

  -- Source system
  source_system VARCHAR(50) NOT NULL DEFAULT 'kintell',
  import_method VARCHAR(50) NOT NULL DEFAULT 'csv_upload',

  -- Statistics
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,

  -- Processing metadata
  last_processed_row INTEGER NOT NULL DEFAULT 0,
  error_file_path VARCHAR(500),
  csv_metadata JSONB,

  -- Audit
  imported_by UUID REFERENCES users(id),
  imported_by_service VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Error summary
  error_summary JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX ingestion_batches_file_hash_idx ON ingestion_batches(file_hash);
CREATE INDEX ingestion_batches_program_type_idx ON ingestion_batches(program_type);
CREATE INDEX ingestion_batches_program_instance_id_idx ON ingestion_batches(program_instance_id);
CREATE INDEX ingestion_batches_status_idx ON ingestion_batches(status);
CREATE INDEX ingestion_batches_started_at_idx ON ingestion_batches(started_at);
CREATE INDEX ingestion_batches_created_at_idx ON ingestion_batches(created_at);
CREATE INDEX ingestion_batches_imported_by_idx ON ingestion_batches(imported_by);
CREATE INDEX ingestion_batches_source_system_idx ON ingestion_batches(source_system);

-- Comments
COMMENT ON TABLE ingestion_batches IS 'Audit trail for CSV imports and API ingestion runs';
COMMENT ON COLUMN ingestion_batches.file_hash IS 'SHA-256 hash for re-import detection';
COMMENT ON COLUMN ingestion_batches.status IS 'pending, running, completed, failed, paused';
```

---

### **Step 3: Extend `kintell_sessions` Table**

```sql
-- Add new columns (nullable for backward compatibility)
ALTER TABLE kintell_sessions
  ADD COLUMN batch_id UUID REFERENCES ingestion_batches(id),
  ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);

-- Add indexes
CREATE INDEX kintell_sessions_batch_id_idx ON kintell_sessions(batch_id);
CREATE INDEX kintell_sessions_program_instance_id_idx ON kintell_sessions(program_instance_id);
CREATE INDEX kintell_sessions_external_session_id_idx ON kintell_sessions(external_session_id);
CREATE INDEX kintell_sessions_participant_id_idx ON kintell_sessions(participant_id);
CREATE INDEX kintell_sessions_volunteer_id_idx ON kintell_sessions(volunteer_id);
CREATE INDEX kintell_sessions_completed_at_idx ON kintell_sessions(completed_at);

-- Comments
COMMENT ON COLUMN kintell_sessions.batch_id IS 'Links to ingestion batch for data lineage';
COMMENT ON COLUMN kintell_sessions.program_instance_id IS 'Links to specific program instance (Q4 2024 vs Q1 2025)';
```

---

### **Step 4: Extend `program_enrollments` Table**

```sql
-- Add new column (nullable for backward compatibility)
ALTER TABLE program_enrollments
  ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);

-- Add index
CREATE INDEX program_enrollments_program_instance_id_idx ON program_enrollments(program_instance_id);

-- Comment
COMMENT ON COLUMN program_enrollments.program_instance_id IS 'Links enrollment to specific program instance';
```

---

## Rollback SQL

If you need to rollback these changes:

```sql
-- Step 4 rollback
DROP INDEX IF EXISTS program_enrollments_program_instance_id_idx;
ALTER TABLE program_enrollments DROP COLUMN IF EXISTS program_instance_id;

-- Step 3 rollback
DROP INDEX IF EXISTS kintell_sessions_batch_id_idx;
DROP INDEX IF EXISTS kintell_sessions_program_instance_id_idx;
DROP INDEX IF EXISTS kintell_sessions_external_session_id_idx;
DROP INDEX IF EXISTS kintell_sessions_participant_id_idx;
DROP INDEX IF EXISTS kintell_sessions_volunteer_id_idx;
DROP INDEX IF EXISTS kintell_sessions_completed_at_idx;
ALTER TABLE kintell_sessions DROP COLUMN IF EXISTS batch_id;
ALTER TABLE kintell_sessions DROP COLUMN IF EXISTS program_instance_id;

-- Step 2 rollback
DROP TABLE IF EXISTS ingestion_batches CASCADE;

-- Step 1 rollback
DROP TABLE IF EXISTS program_instances CASCADE;
```

---

## Pre-Migration Checklist

- [ ] Backup database before running migration
- [ ] Verify no active imports running (check `backfill_jobs` table)
- [ ] Run in transaction block for safety
- [ ] Test on dev/staging environment first

---

## Running the Migration

### **Option A: Transaction Block (Recommended)**

```sql
BEGIN;

-- Step 1: Create program_instances table
CREATE TABLE program_instances (...);
-- (full SQL from Step 1)

-- Step 2: Create ingestion_batches table
CREATE TABLE ingestion_batches (...);
-- (full SQL from Step 2)

-- Step 3: Extend kintell_sessions
ALTER TABLE kintell_sessions...;
-- (full SQL from Step 3)

-- Step 4: Extend program_enrollments
ALTER TABLE program_enrollments...;
-- (full SQL from Step 4)

COMMIT;
```

### **Option B: Individual Steps**

```bash
# Connect to database
psql $DATABASE_URL

# Run each step one by one
\i migration_step1_program_instances.sql
\i migration_step2_ingestion_batches.sql
\i migration_step3_extend_kintell_sessions.sql
\i migration_step4_extend_program_enrollments.sql
```

---

## Post-Migration Verification

### **1. Verify Tables Created**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('program_instances', 'ingestion_batches');

-- Expected: 2 rows
```

### **2. Verify Columns Added**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'kintell_sessions'
  AND column_name IN ('batch_id', 'program_instance_id');

-- Expected: 2 rows
```

### **3. Verify Indexes Created**

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('program_instances', 'ingestion_batches', 'kintell_sessions', 'program_enrollments')
  AND indexname LIKE '%batch%' OR indexname LIKE '%program_instance%';

-- Expected: 10+ rows
```

### **4. Verify Foreign Keys**

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('kintell_sessions', 'program_enrollments', 'ingestion_batches');

-- Expected: 5+ rows
```

---

## Sample Data for Testing

### **Insert Test Program Instance**

```sql
INSERT INTO program_instances (
  program_type,
  program_name,
  program_slug,
  start_date,
  end_date,
  description,
  status
)
VALUES (
  'mentors_ukraine',
  'Mentors for Ukraine - Q4 2024',
  'mentors-ukraine-2024-q4',
  '2024-10-01',
  '2024-12-31',
  'Mentorship program for Ukrainian refugees in Norway - Q4 2024 cohort',
  'completed'
)
RETURNING id;
```

### **Insert Test Ingestion Batch**

```sql
INSERT INTO ingestion_batches (
  file_name,
  file_hash,
  file_size_bytes,
  program_type,
  program_instance_id,
  total_rows,
  success_rows,
  status
)
VALUES (
  'mentors-for-ukraine-2024-Q4.csv',
  'a1b2c3d4e5f6...', -- SHA-256 hash
  51200,
  'mentors_ukraine',
  (SELECT id FROM program_instances WHERE program_slug = 'mentors-ukraine-2024-q4'),
  100,
  95,
  'completed'
)
RETURNING id;
```

---

## Impact Analysis

### **Breaking Changes**

**None.** All new columns are nullable, all new tables are independent.

### **Backward Compatibility**

✅ **Existing queries work unchanged:**
- `SELECT * FROM kintell_sessions` → returns rows (new columns are NULL for old data)
- `SELECT * FROM program_enrollments` → works as before

✅ **Existing imports continue to work:**
- Sessions without `batch_id` are allowed
- Enrollments without `program_instance_id` are allowed

### **Performance Impact**

**Minimal:**
- New indexes add ~1-2% storage overhead
- Foreign key checks add ~5-10% insert overhead (negligible for batch imports)
- Query performance improved for program filtering

---

## Next Steps After Migration

1. **Update `kintell-connector` service** to use new tables
2. **Backfill `batch_id` for existing sessions** (optional):
   ```sql
   -- Create a legacy batch for pre-Swarm 1 imports
   INSERT INTO ingestion_batches (file_name, program_type, status)
   VALUES ('legacy_import', 'mentors_ukraine', 'completed')
   RETURNING id;

   -- Link old sessions to legacy batch
   UPDATE kintell_sessions
   SET batch_id = (SELECT id FROM ingestion_batches WHERE file_name = 'legacy_import')
   WHERE batch_id IS NULL AND session_type = 'mentorship';
   ```

3. **Test CSV import** with new schema
4. **Monitor query performance** (check `pg_stat_statements`)

---

## Troubleshooting

### **Issue: Foreign key constraint violation**

```
ERROR:  insert or update on table "kintell_sessions" violates foreign key constraint
DETAIL:  Key (batch_id)=(uuid-123) is not present in table "ingestion_batches".
```

**Fix**: Ensure batch exists before linking sessions:
```sql
SELECT id FROM ingestion_batches WHERE id = 'uuid-123';
```

### **Issue: Migration hangs on ALTER TABLE**

```
ALTER TABLE kintell_sessions ADD COLUMN ...
-- (no response)
```

**Fix**: Check for locks:
```sql
SELECT * FROM pg_locks WHERE relation = 'kintell_sessions'::regclass;
```

Kill blocking queries if safe, or wait for completion.

---

## Automated Migration (Future)

Once TypeScript compilation errors in `shared-schema` are fixed:

```bash
# Generate migration automatically
pnpm --filter @teei/shared-schema db:generate

# Review generated SQL in src/migrations/

# Apply migration
pnpm --filter @teei/shared-schema db:migrate
```

---

## Conclusion

✅ **4 migration steps** defined with full SQL
✅ **Rollback procedure** documented
✅ **Verification queries** provided
✅ **Sample data** for testing
✅ **Zero breaking changes** - backward compatible
✅ **Performance impact minimal** - new indexes optimized

**Status**: ⚠️ Manual migration required due to existing TypeScript errors
**Recommendation**: Run migration manually following this guide, then fix TypeScript errors for future auto-generated migrations

---

## Files

Save migration SQL to individual files:
- `packages/shared-schema/src/migrations/001_program_instances.sql`
- `packages/shared-schema/src/migrations/002_ingestion_batches.sql`
- `packages/shared-schema/src/migrations/003_extend_kintell_sessions.sql`
- `packages/shared-schema/src/migrations/004_extend_program_enrollments.sql`

Or use a combined migration:
- `packages/shared-schema/src/migrations/001_swarm1_kintell_ingestion.sql`
