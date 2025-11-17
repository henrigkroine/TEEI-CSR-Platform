/**
 * Ingestion Loader
 * Idempotent bulk loader with chunking and error handling
 */

import {
  ImportSession,
  IngestionStats,
  ValidationError,
} from '@teei/shared-types';
import { readAllRows } from './parser.js';
import { applyMapping } from './mapper.js';
import { validateRow } from './validator.js';
import { sessionStore } from '../routes/imports/session-store.js';
import { createHash } from 'crypto';

interface CommitOptions {
  session: ImportSession;
  skipRowsWithErrors: boolean;
  jobId: string;
}

const CHUNK_SIZE = 1000; // Process 1000 rows at a time

/**
 * Commit import and start ingestion
 */
export async function commitIngestion(options: CommitOptions): Promise<void> {
  const { session, skipRowsWithErrors, jobId } = options;

  const startTime = Date.now();

  try {
    // Read all rows
    const buffer = await getSessionFileBuffer(session);
    const allRows = await readAllRows(buffer, session.fileFormat);

    // Apply mapping and validate
    const processedRows: Array<{
      original: Record<string, unknown>;
      mapped: Record<string, unknown>;
      valid: boolean;
      errors: ValidationError[];
    }> = [];

    for (let i = 0; i < allRows.length; i++) {
      const originalRow = allRows[i];
      const mappedRow = applyMapping(originalRow, session.mappingConfig!);
      const errors = validateRow(
        mappedRow,
        i,
        session.mappingConfig!.targetContract
      );
      const valid = errors.filter((e) => e.severity === 'error').length === 0;

      processedRows.push({
        original: originalRow,
        mapped: mappedRow,
        valid,
        errors,
      });
    }

    // Filter valid rows or skip errors
    const rowsToIngest = skipRowsWithErrors
      ? processedRows.filter((r) => r.valid)
      : processedRows;

    if (!skipRowsWithErrors && rowsToIngest.length !== allRows.length) {
      throw new Error(
        `${allRows.length - rowsToIngest.length} rows have validation errors`
      );
    }

    // Ingest in chunks
    let insertedRows = 0;
    let updatedRows = 0;
    let duplicatesSkipped = 0;

    for (let i = 0; i < rowsToIngest.length; i += CHUNK_SIZE) {
      const chunk = rowsToIngest.slice(i, i + CHUNK_SIZE);
      const result = await ingestChunk(
        chunk.map((r) => r.mapped),
        session
      );
      insertedRows += result.inserted;
      updatedRows += result.updated;
      duplicatesSkipped += result.duplicates;
    }

    const rejectedRows = allRows.length - rowsToIngest.length;

    // Generate rejected rows CSV if needed
    if (rejectedRows > 0) {
      const rejectedData = processedRows.filter((r) => !r.valid);
      const rejectedPath = await saveRejectedRows(rejectedData, session);
      session.rejectedRowsPath = rejectedPath;
    }

    // Update session with stats
    const processingTimeMs = Date.now() - startTime;
    const throughputRowsPerSec = (allRows.length / processingTimeMs) * 1000;

    session.ingestionStats = {
      totalRows: allRows.length,
      insertedRows,
      updatedRows,
      rejectedRows,
      duplicatesSkipped,
      processingTimeMs,
      throughputRowsPerSec,
    };

    session.status = 'completed';
    session.ingestionCompletedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    await sessionStore.saveSession(session);
  } catch (error: any) {
    // Update session with error
    session.status = 'failed';
    session.errorMessage = error.message;
    session.errorDetails = { jobId, error: error.toString() };
    session.updatedAt = new Date().toISOString();
    await sessionStore.saveSession(session);

    throw error;
  }
}

/**
 * Ingest a chunk of rows (with deduplication)
 */
async function ingestChunk(
  rows: Record<string, unknown>[],
  session: ImportSession
): Promise<{ inserted: number; updated: number; duplicates: number }> {
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;

  for (const row of rows) {
    // Compute row hash for deduplication
    const rowHash = createHash('sha256')
      .update(JSON.stringify(row))
      .digest('hex');

    // Check if row already exists (by hash)
    const exists = await checkRowExists(rowHash, session.tenantId);

    if (exists) {
      duplicates++;
      continue;
    }

    // Insert row (would write to database in production)
    await insertRow(row, rowHash, session);
    inserted++;
  }

  return { inserted, updated, duplicates };
}

/**
 * Check if row already exists (by hash)
 */
async function checkRowExists(
  rowHash: string,
  tenantId: string
): Promise<boolean> {
  // In production, query database:
  // SELECT EXISTS(SELECT 1 FROM imported_events WHERE tenant_id = ? AND row_hash = ?)
  // For now, always false (no deduplication)
  return false;
}

/**
 * Insert row into database
 */
async function insertRow(
  row: Record<string, unknown>,
  rowHash: string,
  session: ImportSession
): Promise<void> {
  // In production, insert into database:
  // INSERT INTO imported_events (tenant_id, event_type, event_data, row_hash, import_session_id)
  // VALUES (?, ?, ?, ?, ?)

  // For now, just log
  console.log('Inserting row:', {
    tenantId: session.tenantId,
    eventType: session.mappingConfig?.targetContract,
    rowHash,
    sessionId: session.id,
  });
}

/**
 * Save rejected rows to CSV
 */
async function saveRejectedRows(
  rejectedData: Array<{
    original: Record<string, unknown>;
    errors: ValidationError[];
  }>,
  session: ImportSession
): Promise<string> {
  // In production, generate CSV and upload to S3:
  // 1. Create CSV with original data + error messages
  // 2. Upload to S3
  // 3. Return S3 path or pre-signed URL

  // For now, return a stub path
  const path = `/import-errors/${session.tenantId}/${session.id}/rejected-rows.csv`;
  return path;
}

/**
 * Get file buffer for session (stub)
 */
async function getSessionFileBuffer(session: ImportSession): Promise<Buffer> {
  // In production, fetch from S3 using session.filePath
  throw new Error('File buffer retrieval not implemented - would fetch from storage');
}
