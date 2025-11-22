# Data Lineage & Batch Tracking
## Kintell CSV Ingestion - Provenance and Audit Trail

**Date**: 2025-11-22
**Agent**: data-lineage-designer
**Status**: ✅ Complete

---

## Overview

**Data lineage** enables answering:
- "Where did this session come from?" → `ingestion_batches` via `batchId`
- "When was this file imported?" → `ingestion_batches.createdAt`
- "Who imported this data?" → `ingestion_batches.importedBy`
- "Which sessions came from batch X?" → `kintell_sessions.batchId = X`

**Purpose**: Full audit trail for CSV imports, supporting GDPR compliance, data quality investigations, and re-import prevention.

---

## Lineage Architecture

### **Entity Relationships**

```
ingestion_batches (1) ────< (N) kintell_sessions
       │
       │ (1)
       ▼
program_instances (1) ────< (N) kintell_sessions
```

**Key Fields**:
- `ingestion_batches.id` → `kintell_sessions.batchId` (FK)
- `program_instances.id` → `kintell_sessions.programInstanceId` (FK)
- `ingestion_batches.programInstanceId` → `program_instances.id` (FK)

---

## Batch Lifecycle

### **Phase 1: Batch Creation**

**When**: Before starting CSV import

**Actions**:
1. Calculate file hash (SHA-256) for re-import detection
2. Create `ingestion_batches` record with status `pending`
3. Return `batchId` for linking

```typescript
import { createHash } from 'crypto';

async function createIngestionBatch(
  fileName: string,
  fileBuffer: Buffer,
  programType: string,
  programInstanceId?: string
): Promise<IngestionBatch> {
  // Calculate file hash
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

  // Check for re-import (same file hash)
  const [existing] = await db
    .select()
    .from(ingestionBatches)
    .where(
      and(
        eq(ingestionBatches.fileHash, fileHash),
        eq(ingestionBatches.programType, programType),
        eq(ingestionBatches.status, 'completed')
      )
    )
    .limit(1);

  if (existing) {
    logger.warn({
      fileName,
      fileHash,
      existingBatchId: existing.id,
      existingImportDate: existing.completedAt,
    }, 'File already imported - re-import detected');

    throw new Error(
      `File '${fileName}' was already imported on ${existing.completedAt}. ` +
      `Batch ID: ${existing.id}. Use --force to re-import.`
    );
  }

  // Create new batch
  const [batch] = await db
    .insert(ingestionBatches)
    .values({
      fileName,
      fileHash,
      fileSizeBytes: fileBuffer.length,
      programType,
      programInstanceId: programInstanceId || null,
      sourceSystem: 'kintell',
      importMethod: 'csv_upload',
      totalRows: 0,
      successRows: 0,
      errorRows: 0,
      skippedRows: 0,
      lastProcessedRow: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({
    batchId: batch.id,
    fileName,
    fileHash,
    programType,
  }, 'Ingestion batch created');

  return batch;
}
```

---

### **Phase 2: Batch Processing**

**When**: During CSV import (row-by-row)

**Actions**:
1. Link each imported session to `batchId`
2. Update batch statistics (successRows, errorRows, skippedRows)
3. Set batch status to `running`

```typescript
async function markBatchRunning(batchId: string): Promise<void> {
  await db
    .update(ingestionBatches)
    .set({
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ingestionBatches.id, batchId));
}

async function updateBatchProgress(
  batchId: string,
  stats: {
    totalRows: number;
    successRows: number;
    errorRows: number;
    skippedRows: number;
    lastProcessedRow: number;
  }
): Promise<void> {
  await db
    .update(ingestionBatches)
    .set({
      ...stats,
      updatedAt: new Date(),
    })
    .where(eq(ingestionBatches.id, batchId));
}
```

**Session Linking**:

```typescript
async function insertSessionWithLineage(
  sessionData: any,
  batchId: string,
  programInstanceId: string
): Promise<void> {
  await db.insert(kintellSessions).values({
    ...sessionData,
    batchId,             // ← Data lineage
    programInstanceId,   // ← Program context
    createdAt: new Date(),
  });
}
```

---

### **Phase 3: Batch Completion**

**When**: After all CSV rows processed

**Actions**:
1. Update final statistics
2. Set batch status to `completed` or `failed`
3. Record `completedAt` timestamp
4. Generate error summary (if errors)

```typescript
async function completeBatch(
  batchId: string,
  stats: {
    totalRows: number;
    successRows: number;
    errorRows: number;
    skippedRows: number;
  },
  errors: Array<{ row: number; error: string }>
): Promise<void> {
  // Aggregate error categories
  const errorCategories: Record<string, number> = {};
  const topErrors: Array<{ error: string; count: number }> = [];

  for (const err of errors) {
    const category = categorizeError(err.error);
    errorCategories[category] = (errorCategories[category] || 0) + 1;
  }

  // Top 5 most frequent errors
  const errorCounts = new Map<string, number>();
  for (const err of errors) {
    errorCounts.set(err.error, (errorCounts.get(err.error) || 0) + 1);
  }
  const sortedErrors = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));

  // Update batch
  await db
    .update(ingestionBatches)
    .set({
      totalRows: stats.totalRows,
      successRows: stats.successRows,
      errorRows: stats.errorRows,
      skippedRows: stats.skippedRows,
      errorSummary: {
        errorCategories,
        topErrors: sortedErrors,
      },
      status: stats.errorRows === stats.totalRows ? 'failed' : 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ingestionBatches.id, batchId));

  logger.info({
    batchId,
    stats,
    errorCount: errors.length,
  }, 'Ingestion batch completed');
}

function categorizeError(errorMessage: string): string {
  if (errorMessage.includes('validation')) return 'validation';
  if (errorMessage.includes('not found')) return 'user_not_found';
  if (errorMessage.includes('duplicate')) return 'duplicate';
  if (errorMessage.includes('database')) return 'db_error';
  return 'other';
}
```

---

## Re-Import Detection

### **File Hash Comparison**

**Goal**: Prevent accidental re-imports of the same CSV file.

**Strategy**:
1. Calculate SHA-256 hash of uploaded file
2. Check if hash exists in `ingestion_batches` with status `completed`
3. If match found: reject import (unless `--force` flag provided)

**Implementation** (already shown in `createIngestionBatch`)

**Benefits**:
- ✅ Prevents duplicate data
- ✅ Fast check (indexed on `file_hash`)
- ✅ Works even if filename changes

---

## CSV Metadata Tracking

### **Captured Metadata**

Stored in `ingestion_batches.csvMetadata` (JSONB):

```typescript
interface CSVMetadata {
  delimiter: string;        // ',', ';', '\t'
  encoding: string;         // 'utf-8', 'utf-16', 'iso-8859-1'
  headers: string[];        // Column names from first row
  detectedSchemaVersion: string; // '1.0', '1.1', '1.2'
  rowCount: number;         // Total rows in CSV (before processing)
  hasHeaderRow: boolean;    // true if first row is headers
}
```

**Detection**:

```typescript
import { parse } from 'csv-parse';
import { detect as detectEncoding } from 'chardet';

async function detectCSVMetadata(fileBuffer: Buffer): Promise<CSVMetadata> {
  // Detect encoding
  const encoding = detectEncoding(fileBuffer) || 'utf-8';

  // Parse first 10 rows to detect delimiter and headers
  const parser = parse(fileBuffer, {
    delimiter: [',', ';', '\t'], // Auto-detect
    to: 10,
  });

  const rows: string[][] = [];
  for await (const row of parser) {
    rows.push(row);
  }

  const headers = rows[0]; // Assume first row is headers
  const delimiter = parser.info.delimiter || ',';

  return {
    delimiter,
    encoding,
    headers,
    detectedSchemaVersion: detectSchemaVersion(headers),
    rowCount: 0, // Will be updated after full parse
    hasHeaderRow: true,
  };
}

function detectSchemaVersion(headers: string[]): string {
  if (headers.includes('metadata')) return '1.1';
  return '1.0';
}
```

---

## Error File Generation

### **Purpose**

Generate a CSV file containing all failed rows + error messages for user review.

### **Format**

Original CSV columns + two additional columns:
- `_error_row`: Row number in original CSV
- `_error_message`: Error description

**Example**:

```csv
session_id,participant_email,volunteer_email,...,_error_row,_error_message
MS-999,invalid-email,john@acme.com,...,5,"Invalid email format 'invalid-email'"
MS-1000,anna@example.com,missing@acme.com,...,10,"Volunteer not found: missing@acme.com"
```

### **Implementation**

```typescript
import { stringify } from 'csv-stringify';
import { createWriteStream } from 'fs';

async function generateErrorFile(
  batchId: string,
  errors: Array<{ row: number; data: Record<string, string>; error: string }>
): Promise<string> {
  const errorFilePath = `/tmp/errors-${batchId}.csv`;

  // Get column names from first error row
  const columns = [...Object.keys(errors[0].data), '_error_row', '_error_message'];

  // Create CSV writer
  const stringifier = stringify({ header: true, columns });
  const writeStream = createWriteStream(errorFilePath);
  stringifier.pipe(writeStream);

  // Write error rows
  for (const error of errors) {
    stringifier.write({
      ...error.data,
      _error_row: error.row.toString(),
      _error_message: error.error,
    });
  }

  stringifier.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  // Update batch with error file path
  await db
    .update(ingestionBatches)
    .set({ errorFilePath })
    .where(eq(ingestionBatches.id, batchId));

  logger.info({ batchId, errorFilePath, errorCount: errors.length }, 'Error file generated');

  return errorFilePath;
}
```

---

## Lineage Queries

### **Q1: Find all sessions from a specific batch**

```typescript
const sessions = await db
  .select()
  .from(kintellSessions)
  .where(eq(kintellSessions.batchId, batchId));
```

**SQL**:
```sql
SELECT * FROM kintell_sessions WHERE batch_id = 'uuid-123';
```

---

### **Q2: Find batch metadata for a session**

```typescript
const result = await db
  .select({
    session: kintellSessions,
    batch: ingestionBatches,
  })
  .from(kintellSessions)
  .innerJoin(ingestionBatches, eq(kintellSessions.batchId, ingestionBatches.id))
  .where(eq(kintellSessions.id, sessionId));
```

**SQL**:
```sql
SELECT ks.*, ib.*
FROM kintell_sessions ks
JOIN ingestion_batches ib ON ks.batch_id = ib.id
WHERE ks.id = 'uuid-456';
```

---

### **Q3: Find all batches for a program instance**

```typescript
const batches = await db
  .select()
  .from(ingestionBatches)
  .where(eq(ingestionBatches.programInstanceId, programInstanceId))
  .orderBy(desc(ingestionBatches.createdAt));
```

---

### **Q4: Get import statistics summary**

```typescript
const summary = await db
  .select({
    totalBatches: count(ingestionBatches.id),
    totalRowsProcessed: sum(ingestionBatches.totalRows),
    totalSuccessful: sum(ingestionBatches.successRows),
    totalErrors: sum(ingestionBatches.errorRows),
  })
  .from(ingestionBatches)
  .where(eq(ingestionBatches.programType, 'mentors_ukraine'));
```

---

### **Q5: Find recent failed imports**

```typescript
const failedBatches = await db
  .select()
  .from(ingestionBatches)
  .where(eq(ingestionBatches.status, 'failed'))
  .orderBy(desc(ingestionBatches.createdAt))
  .limit(10);
```

---

## Audit Logging

### **Import Audit Trail**

**Who, What, When** tracking for compliance:

```typescript
async function logImportAudit(
  batchId: string,
  userId: string | null,
  action: 'import_started' | 'import_completed' | 'import_failed'
): Promise<void> {
  await db.insert(auditLogs).values({
    eventType: 'csv_import',
    action,
    userId: userId || null,
    performedBy: 'kintell-connector', // Service name
    resourceType: 'ingestion_batch',
    resourceId: batchId,
    details: {
      action,
      timestamp: new Date().toISOString(),
    },
    performedAt: new Date(),
  });
}
```

**Call at key moments**:
```typescript
await logImportAudit(batchId, userId, 'import_started');
// ... process import
await logImportAudit(batchId, userId, 'import_completed');
```

---

## Data Retention

### **Batch Retention Policy**

**Completed batches**:
- Keep for **1 year** (compliance requirement)
- Archive to cold storage after 90 days

**Error files**:
- Keep for **30 days** (debugging)
- Auto-delete after 30 days

**Implementation** (future cron job):

```typescript
async function cleanupOldBatches(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Archive old batches (soft delete)
  await db
    .update(ingestionBatches)
    .set({ status: 'archived' })
    .where(
      and(
        lte(ingestionBatches.completedAt, oneYearAgo),
        eq(ingestionBatches.status, 'completed')
      )
    );

  // Delete old error files
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldBatches = await db
    .select()
    .from(ingestionBatches)
    .where(
      and(
        lte(ingestionBatches.completedAt, thirtyDaysAgo),
        isNotNull(ingestionBatches.errorFilePath)
      )
    );

  for (const batch of oldBatches) {
    if (batch.errorFilePath) {
      await fs.unlink(batch.errorFilePath); // Delete file
      await db
        .update(ingestionBatches)
        .set({ errorFilePath: null })
        .where(eq(ingestionBatches.id, batch.id));
    }
  }
}
```

---

## Testing Strategy

### **Unit Tests**

1. **Test file hash calculation**:
   - ✅ Same file → same hash
   - ✅ Different file → different hash

2. **Test re-import detection**:
   - ✅ Import CSV → re-import same CSV → error thrown

3. **Test batch lifecycle**:
   - ✅ Create batch → status `pending`
   - ✅ Mark running → status `running`, `startedAt` set
   - ✅ Complete batch → status `completed`, `completedAt` set

4. **Test error categorization**:
   - ✅ "validation failed" → `validation`
   - ✅ "user not found" → `user_not_found`

### **Integration Tests**

1. **Test full batch lifecycle**:
   - Create batch → process CSV → complete batch
   - Verify batch stats match actual results

2. **Test session linkage**:
   - Import CSV → verify all sessions have `batchId` populated
   - Query sessions by batch → verify correct sessions returned

3. **Test error file generation**:
   - Import CSV with errors → verify error file created
   - Parse error file → verify format correct

4. **Test re-import prevention**:
   - Import CSV → re-import same CSV → verify error thrown
   - Import with `--force` → verify re-import succeeds

---

## CLI Usage

### **Import with batch tracking**

```bash
# Import creates batch automatically
pnpm --filter @teei/kintell-connector import:csv \
  --file mentors-for-ukraine-2024-Q4.csv

# Output:
# Batch ID: uuid-123
# Processed: 500 rows
# Success: 480
# Errors: 20
# Error file: /tmp/errors-uuid-123.csv
```

### **Check batch status**

```bash
curl http://localhost:3002/v1/import/backfill/uuid-123/status

# Response:
# {
#   "batchId": "uuid-123",
#   "fileName": "mentors-for-ukraine-2024-Q4.csv",
#   "programType": "mentors_ukraine",
#   "status": "completed",
#   "totalRows": 500,
#   "successRows": 480,
#   "errorRows": 20,
#   "completedAt": "2024-11-22T10:15:00Z"
# }
```

### **Download error file**

```bash
curl http://localhost:3002/v1/import/backfill/uuid-123/errors --output errors.csv
```

---

## Visualization (Future)

### **Batch Timeline Dashboard**

```
┌─────────────────────────────────────────────────────┐
│ Recent Imports                                      │
├─────────────────────────────────────────────────────┤
│ 2024-11-22 10:15 | Mentors Q4 2024 | ✓ 480/500   │
│ 2024-11-20 14:30 | Language Q4     | ✓ 1200/1250 │
│ 2024-11-18 09:00 | Mentors Q3      | ✗ 0/500 (failed) │
└─────────────────────────────────────────────────────┘
```

### **Lineage Graph**

```
mentors-for-ukraine-2024-Q4.csv
  │
  ├─> Ingestion Batch (uuid-123)
  │     │
  │     ├─> Session MS-001 (Anna + John)
  │     ├─> Session MS-002 (Bob + Jane)
  │     └─> ... (480 sessions)
  │
  └─> Program Instance: Mentors for Ukraine - Q4 2024
```

---

## Conclusion

✅ **Batch lifecycle** defined (pending → running → completed/failed)
✅ **File hash-based re-import detection** prevents duplicates
✅ **CSV metadata tracking** (delimiter, encoding, headers)
✅ **Error file generation** for failed rows
✅ **Lineage queries** enable "where did this come from?" lookups
✅ **Audit logging** for compliance (who imported, when)
✅ **Data retention policies** defined (1 year batches, 30 days errors)
✅ **Testing strategy** comprehensive (unit + integration)

**Next Phase**: Batch 2A - Schema Implementation (migration generation and testing)
