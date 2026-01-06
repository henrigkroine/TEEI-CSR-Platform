# Kintell Ingestion Layer - Schema Design
## Database Extensions for Program Instances and Data Lineage

**Date**: 2025-11-22
**Agent**: schema-architect
**Status**: ✅ Complete

---

## Overview

This document describes the database schema extensions required to support full Kintell ingestion with:
1. **Program instance modeling** (distinguish Mentors vs Language programs)
2. **Data lineage tracking** (audit trail for CSV imports)
3. **Enhanced session linking** (sessions → batches → program instances)

---

## New Tables

### **1. `program_instances`** - Program Instance Modeling

**Purpose**: Distinguish between specific runs of programs (e.g., "Mentors for Ukraine Q4 2024" vs "Language for Ukraine Q1 2025").

**Schema**:
```sql
CREATE TABLE program_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Program identification
  program_type VARCHAR(50) NOT NULL,  -- 'mentors_ukraine', 'language_ukraine', 'buddy', 'upskilling'
  program_name VARCHAR(255) NOT NULL, -- "Mentors for Ukraine - Q4 2024"
  program_slug VARCHAR(255) NOT NULL, -- mentors-ukraine-2024-q4

  -- Ownership
  company_id UUID REFERENCES companies(id), -- NULL for TEEI-run programs

  -- Time boundaries
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for ongoing

  -- External system linkage
  external_system_id VARCHAR(255), -- Kintell project ID
  external_system VARCHAR(50),     -- 'kintell', 'buddy', 'upskilling'

  -- Program metadata
  description VARCHAR(1000),
  target_participants VARCHAR(500),
  program_goals JSONB, -- ["Language proficiency", "Job readiness"]
  metadata JSONB,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, paused, cancelled

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_instances_program_type ON program_instances(program_type);
CREATE INDEX idx_program_instances_company_id ON program_instances(company_id);
CREATE INDEX idx_program_instances_program_slug ON program_instances(program_slug);
CREATE INDEX idx_program_instances_status ON program_instances(status);
CREATE INDEX idx_program_instances_start_date ON program_instances(start_date);
CREATE INDEX idx_program_instances_external_system ON program_instances(external_system, external_system_id);
```

**Example Data**:
```sql
INSERT INTO program_instances (program_type, program_name, program_slug, start_date, end_date, description, status)
VALUES
  ('mentors_ukraine', 'Mentors for Ukraine - Q4 2024', 'mentors-ukraine-2024-q4', '2024-10-01', '2024-12-31', 'Mentorship program for Ukrainian refugees in Norway', 'completed'),
  ('language_ukraine', 'Language for Ukraine - Q4 2024', 'language-ukraine-2024-q4', '2024-10-01', '2024-12-31', 'English language practice sessions', 'completed'),
  ('mentors_ukraine', 'Mentors for Ukraine - Q1 2025', 'mentors-ukraine-2025-q1', '2025-01-01', '2025-03-31', 'Mentorship program Q1 2025', 'active');
```

**Use Cases**:
1. **SROI Calculation**: Calculate SROI per program instance (not just by program type)
2. **Reporting**: Generate reports like "Q4 2024 Mentors Program Impact Report"
3. **Filtering**: Show users only sessions from their enrolled programs
4. **Analytics**: Compare outcomes between different cohorts

---

### **2. `ingestion_batches`** - Data Lineage Tracking

**Purpose**: Audit trail for CSV imports and API ingestion runs.

**Schema**:
```sql
CREATE TABLE ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification
  file_name VARCHAR(500) NOT NULL, -- "mentors-for-ukraine-2024-Q4.csv"
  file_hash VARCHAR(64) NOT NULL,  -- SHA-256 for re-import detection
  file_size_bytes INTEGER,

  -- Program context
  program_type VARCHAR(50) NOT NULL,       -- mentors_ukraine, language_ukraine
  program_instance_id UUID REFERENCES program_instances(id),

  -- Source system
  source_system VARCHAR(50) NOT NULL DEFAULT 'kintell',       -- kintell, buddy, upskilling
  import_method VARCHAR(50) NOT NULL DEFAULT 'csv_upload',    -- csv_upload, api_webhook

  -- Statistics
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0, -- Duplicates

  -- Processing metadata
  last_processed_row INTEGER NOT NULL DEFAULT 0, -- For checkpoint/resume
  error_file_path VARCHAR(500),

  -- CSV metadata
  csv_metadata JSONB, -- { delimiter, encoding, headers, detectedSchemaVersion }

  -- Audit
  imported_by UUID REFERENCES users(id),
  imported_by_service VARCHAR(100), -- "kintell-connector", "cli"

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed

  -- Error summary
  error_summary JSONB, -- { topErrors: [...], errorCategories: {...} }

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingestion_batches_file_hash ON ingestion_batches(file_hash);
CREATE INDEX idx_ingestion_batches_program_type ON ingestion_batches(program_type);
CREATE INDEX idx_ingestion_batches_program_instance_id ON ingestion_batches(program_instance_id);
CREATE INDEX idx_ingestion_batches_status ON ingestion_batches(status);
CREATE INDEX idx_ingestion_batches_started_at ON ingestion_batches(started_at);
CREATE INDEX idx_ingestion_batches_imported_by ON ingestion_batches(imported_by);
```

**Example Data**:
```sql
INSERT INTO ingestion_batches (
  file_name, file_hash, program_type, program_instance_id,
  total_rows, success_rows, error_rows, status, started_at, completed_at
)
VALUES (
  'mentors-for-ukraine-2024-Q4.csv',
  'a3d5e8f1...',  -- SHA-256 hash
  'mentors_ukraine',
  'uuid-of-mentors-q4-2024',
  500,
  480,
  20,
  'completed',
  '2024-11-22 10:00:00+00',
  '2024-11-22 10:15:00+00'
);
```

**Use Cases**:
1. **Re-import Detection**: Check `file_hash` before importing (skip if already imported)
2. **Data Lineage**: "Which sessions came from this import batch?"
3. **Error Analysis**: "What went wrong in last import?"
4. **Audit Compliance**: "Who imported this data and when?"

---

## Modified Tables

### **3. `kintell_sessions`** - Extended with Lineage FKs

**Changes**:
```sql
ALTER TABLE kintell_sessions
  ADD COLUMN batch_id UUID REFERENCES ingestion_batches(id),
  ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);

CREATE INDEX idx_kintell_sessions_batch_id ON kintell_sessions(batch_id);
CREATE INDEX idx_kintell_sessions_program_instance_id ON kintell_sessions(program_instance_id);
CREATE INDEX idx_kintell_sessions_external_session_id ON kintell_sessions(external_session_id);
CREATE INDEX idx_kintell_sessions_participant_id ON kintell_sessions(participant_id);
CREATE INDEX idx_kintell_sessions_volunteer_id ON kintell_sessions(volunteer_id);
CREATE INDEX idx_kintell_sessions_completed_at ON kintell_sessions(completed_at);
```

**Impact**:
- ✅ **Non-breaking**: FKs are nullable, existing queries work unchanged
- ✅ **Enables lineage**: Can now query "show me all sessions from batch X"
- ✅ **Enables filtering**: Can filter by program instance (Q4 2024 vs Q1 2025)

---

### **4. `program_enrollments`** - Extended with Program Instance FK

**Changes**:
```sql
ALTER TABLE program_enrollments
  ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);

CREATE INDEX idx_program_enrollments_program_instance_id ON program_enrollments(program_instance_id);
```

**Impact**:
- ✅ Enrollment can now be linked to specific program instance
- ✅ Enables "show me all volunteers enrolled in Mentors Q4 2024"

---

## TypeScript Types

### **Drizzle Schema Definitions**

See implementation files:
- `/packages/shared-schema/src/schema/program-instances.ts`
- `/packages/shared-schema/src/schema/ingestion-batches.ts`
- `/packages/shared-schema/src/schema/kintell.ts` (updated)

### **TypeScript Interfaces**

```typescript
// Program Instance
export interface ProgramInstance {
  id: string;
  programType: 'mentors_ukraine' | 'language_ukraine' | 'buddy' | 'upskilling';
  programName: string;
  programSlug: string;
  companyId?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  externalSystemId?: string;
  externalSystem?: 'kintell' | 'buddy' | 'upskilling';
  description?: string;
  targetParticipants?: string;
  programGoals?: string[];
  metadata?: Record<string, any>;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Ingestion Batch
export interface IngestionBatch {
  id: string;
  fileName: string;
  fileHash: string;
  fileSizeBytes?: number;
  programType: string;
  programInstanceId?: string;
  sourceSystem: 'kintell' | 'buddy' | 'upskilling' | 'manual';
  importMethod: 'csv_upload' | 'api_webhook' | 'manual_entry';
  totalRows: number;
  successRows: number;
  errorRows: number;
  skippedRows: number;
  lastProcessedRow: number;
  errorFilePath?: string;
  csvMetadata?: {
    delimiter?: string;
    encoding?: string;
    headers?: string[];
    detectedSchemaVersion?: string;
  };
  importedBy?: string;
  importedByService?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  errorSummary?: {
    topErrors?: Array<{ error: string; count: number }>;
    errorCategories?: Record<string, number>;
  };
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Kintell Session (extended)
export interface KintellSession {
  id: string;
  externalSessionId?: string;
  sessionType: 'language' | 'mentorship';
  participantId: string;
  volunteerId: string;

  // NEW
  batchId?: string;
  programInstanceId?: string;

  scheduledAt?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  rating?: string; // decimal as string
  feedbackText?: string;
  languageLevel?: string;
  topics?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

---

## Schema Export Updates

**File**: `/packages/shared-schema/src/schema/index.ts`

**Changes**:
```typescript
// Add new exports
export * from './program-instances.js';
export * from './ingestion-batches.js';

// Existing exports remain unchanged
export * from './users.js';
export * from './kintell.js';
export * from './buddy.js';
// ... etc
```

---

## Common Queries

### **Q1: Find all sessions from a specific import batch**
```typescript
import { db, kintellSessions, ingestionBatches } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const sessions = await db
  .select()
  .from(kintellSessions)
  .where(eq(kintellSessions.batchId, batchId));
```

### **Q2: Find all sessions for a program instance (Q4 2024 Mentors)**
```typescript
const sessions = await db
  .select()
  .from(kintellSessions)
  .where(eq(kintellSessions.programInstanceId, programInstanceId));
```

### **Q3: Get import batch statistics**
```typescript
const batch = await db
  .select()
  .from(ingestionBatches)
  .where(eq(ingestionBatches.id, batchId))
  .limit(1);

console.log(`Processed: ${batch.totalRows}, Success: ${batch.successRows}, Errors: ${batch.errorRows}`);
```

### **Q4: Check if file was already imported (re-import detection)**
```typescript
import { createHash } from 'crypto';

const fileHash = createHash('sha256').update(fileContents).digest('hex');

const [existing] = await db
  .select()
  .from(ingestionBatches)
  .where(eq(ingestionBatches.fileHash, fileHash))
  .limit(1);

if (existing) {
  console.log(`File already imported on ${existing.createdAt}`);
}
```

### **Q5: Find active program instances**
```typescript
const activePrograms = await db
  .select()
  .from(programInstances)
  .where(eq(programInstances.status, 'active'));
```

### **Q6: Calculate SROI per program instance**
```typescript
import { and, gte, lte } from 'drizzle-orm';

const sessions = await db
  .select()
  .from(kintellSessions)
  .innerJoin(programInstances, eq(kintellSessions.programInstanceId, programInstances.id))
  .where(and(
    eq(programInstances.id, programInstanceId),
    gte(kintellSessions.completedAt, periodStart),
    lte(kintellSessions.completedAt, periodEnd)
  ));

// Calculate SROI from sessions
```

---

## Migration Strategy

### **Step 1: Generate Migration**
```bash
pnpm --filter @teei/shared-schema db:generate
```

This will create a migration file in `/packages/shared-schema/drizzle/migrations/`.

### **Step 2: Review Generated SQL**
```sql
-- Expected migration SQL:
CREATE TABLE program_instances (...);
CREATE TABLE ingestion_batches (...);
ALTER TABLE kintell_sessions ADD COLUMN batch_id UUID REFERENCES ingestion_batches(id);
ALTER TABLE kintell_sessions ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);
ALTER TABLE program_enrollments ADD COLUMN program_instance_id UUID REFERENCES program_instances(id);
CREATE INDEX ...;
```

### **Step 3: Apply Migration**
```bash
pnpm --filter @teei/shared-schema db:migrate
```

### **Step 4: Rollback (if needed)**
```sql
-- Rollback steps:
ALTER TABLE kintell_sessions DROP COLUMN batch_id;
ALTER TABLE kintell_sessions DROP COLUMN program_instance_id;
ALTER TABLE program_enrollments DROP COLUMN program_instance_id;
DROP TABLE ingestion_batches;
DROP TABLE program_instances;
```

---

## Backward Compatibility

### **Existing Code Continues to Work**

All changes are **additive** (new tables, new nullable FKs):
- ✅ Existing queries on `kintell_sessions` work unchanged
- ✅ Existing SROI/VIS calculators work without program filtering
- ✅ Existing Q2Q extraction works without batch context
- ✅ Existing reporting queries work without lineage tracking

### **Gradual Migration**

New FKs (`batchId`, `programInstanceId`) are **nullable**:
- Old sessions (imported before Swarm 1): FKs are NULL
- New sessions (imported after Swarm 1): FKs populated
- Can backfill old sessions later (optional)

---

## Validation & Constraints

### **Business Rules**

1. **Program Instance Uniqueness**:
   - `program_slug` should be unique
   - `(program_type, company_id, start_date)` should be unique

2. **Ingestion Batch File Hash**:
   - `file_hash` should be unique per `(program_type, source_system)`
   - Allow re-importing same file for different programs

3. **Session Linkage**:
   - If `batch_id` is populated, batch must exist
   - If `program_instance_id` is populated, program instance must exist

### **Database Constraints** (Future Enhancement)

```sql
-- Unique program slug
ALTER TABLE program_instances ADD CONSTRAINT uq_program_instances_slug UNIQUE (program_slug);

-- Unique file hash per program type
CREATE UNIQUE INDEX uq_ingestion_batches_file_hash_program
  ON ingestion_batches(file_hash, program_type)
  WHERE status = 'completed';
```

---

## Testing Strategy

### **Unit Tests**
- Test Drizzle schema definitions (type checking)
- Test query builders (SELECT, INSERT, UPDATE)

### **Integration Tests**
- Create program instance → insert sessions → query by program
- Create ingestion batch → link sessions → verify lineage
- Test re-import detection (same file hash)

### **Migration Tests**
- Apply migration on clean DB → verify tables created
- Apply migration on existing DB → verify FKs nullable
- Rollback migration → verify clean removal

---

## Performance Considerations

### **Index Strategy**

All high-traffic queries have covering indexes:
- ✅ `kintell_sessions.batch_id` (lineage queries)
- ✅ `kintell_sessions.program_instance_id` (filtering)
- ✅ `ingestion_batches.file_hash` (re-import detection)
- ✅ `program_instances.program_type` (filtering by type)

### **Storage Impact**

**Estimated Storage per 10K Sessions**:
- `program_instances`: ~100 rows × 1 KB = 100 KB (negligible)
- `ingestion_batches`: ~50 batches × 2 KB = 100 KB (negligible)
- `kintell_sessions` (2 new FKs): 10K rows × 32 bytes = 320 KB (negligible)

**Total Overhead**: < 1 MB per 10K sessions (acceptable)

---

## Security Considerations

### **PII in Metadata**

- ⚠️ `ingestion_batches.csv_metadata` may contain CSV headers (could include PII column names)
- ✅ Mitigation: Strip PII-sensitive metadata before storing

### **Access Control**

- ⚠️ `ingestion_batches` may reveal import patterns (e.g., batch sizes)
- ✅ Mitigation: Restrict access to admin users only

### **File Hash Disclosure**

- ⚠️ `file_hash` could reveal file contents if hash is reversible (it's not)
- ✅ SHA-256 is cryptographically secure, no risk

---

## Future Enhancements

1. **Add `program_instance_members` table**: Track which users belong to which program instances
2. **Add `program_milestones` table**: Track program phases (enrollment, mid-program check-in, graduation)
3. **Add `batch_dependencies` table**: Track dependencies between batches (e.g., "users batch must import before sessions batch")
4. **Add soft deletes**: `deleted_at` timestamp for program instances and batches

---

## Conclusion

✅ **2 new tables** designed: `program_instances`, `ingestion_batches`
✅ **2 existing tables** extended: `kintell_sessions`, `program_enrollments`
✅ **Backward compatible**: All changes are additive, nullable FKs
✅ **Performance optimized**: Comprehensive indexing strategy
✅ **Type-safe**: Drizzle ORM + TypeScript interfaces
✅ **Testable**: Migration + integration test strategy defined
✅ **Secure**: PII and access control considerations addressed

**Next Agent**: identity-unifier (design identity resolution strategy)
