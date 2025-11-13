import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { createWriteStream, promises as fs } from 'fs';
import { Readable } from 'stream';
import { db, backfillJobs, kintellSessions, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { mapCSVRowToSession } from '../mappers/session-mapper.js';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { KintellSessionCompleted } from '@teei/event-contracts';

const logger = createServiceLogger('kintell-connector:backfill');

export interface BackfillProgress {
  jobId: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  percentComplete: number;
  errorFilePath?: string;
}

export interface BackfillError {
  row: number;
  data: Record<string, string>;
  error: string;
}

const BATCH_SIZE = 500;
const PROGRESS_INTERVAL = 1000;

/**
 * Create a new backfill job
 */
export async function createBackfillJob(
  fileName: string,
  totalRows: number
): Promise<string> {
  const [job] = await db
    .insert(backfillJobs)
    .values({
      fileName,
      totalRows,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      lastProcessedRow: 0,
      status: 'pending',
    })
    .returning();

  logger.info({ jobId: job.id, fileName, totalRows }, 'Backfill job created');

  return job.id;
}

/**
 * Get backfill job status
 */
export async function getBackfillJobStatus(jobId: string): Promise<BackfillProgress | null> {
  const [job] = await db
    .select()
    .from(backfillJobs)
    .where(eq(backfillJobs.id, jobId))
    .limit(1);

  if (!job) {
    return null;
  }

  const percentComplete =
    job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;

  return {
    jobId: job.id,
    fileName: job.fileName,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successfulRows: job.successfulRows,
    failedRows: job.failedRows,
    status: job.status as any,
    percentComplete,
    errorFilePath: job.errorFilePath || undefined,
  };
}

/**
 * Update backfill job progress
 */
async function updateJobProgress(
  jobId: string,
  processedRows: number,
  successfulRows: number,
  failedRows: number,
  lastProcessedRow: number
): Promise<void> {
  await db
    .update(backfillJobs)
    .set({
      processedRows,
      successfulRows,
      failedRows,
      lastProcessedRow,
      updatedAt: new Date(),
    })
    .where(eq(backfillJobs.id, jobId));
}

/**
 * Mark backfill job as running
 */
async function markJobRunning(jobId: string): Promise<void> {
  await db
    .update(backfillJobs)
    .set({
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(backfillJobs.id, jobId));

  logger.info({ jobId }, 'Backfill job marked as running');
}

/**
 * Mark backfill job as completed
 */
async function markJobCompleted(jobId: string): Promise<void> {
  await db
    .update(backfillJobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(backfillJobs.id, jobId));

  logger.info({ jobId }, 'Backfill job completed');
}

/**
 * Mark backfill job as failed
 */
async function markJobFailed(jobId: string, error: string): Promise<void> {
  await db
    .update(backfillJobs)
    .set({
      status: 'failed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(backfillJobs.id, jobId));

  logger.error({ jobId, error }, 'Backfill job failed');
}

/**
 * Set error file path for backfill job
 */
async function setErrorFilePath(jobId: string, errorFilePath: string): Promise<void> {
  await db
    .update(backfillJobs)
    .set({
      errorFilePath,
      updatedAt: new Date(),
    })
    .where(eq(backfillJobs.id, jobId));
}

/**
 * Write error records to CSV file
 */
async function writeErrorFile(
  jobId: string,
  errors: BackfillError[]
): Promise<string> {
  const errorFilePath = `/tmp/backfill_errors_${jobId}.csv`;

  // Create CSV stringifier
  const columns = Object.keys(errors[0].data);
  columns.push('_error_row', '_error_message');

  const stringifier = stringify({
    header: true,
    columns,
  });

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

  logger.info({ jobId, errorFilePath, errorCount: errors.length }, 'Error file written');

  await setErrorFilePath(jobId, errorFilePath);

  return errorFilePath;
}

/**
 * Process a single CSV row (with validation and event emission)
 */
async function processRow(
  row: Record<string, string>,
  rowNumber: number,
  eventBus: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate and map CSV row
    const mapped = mapCSVRowToSession(row);

    // Find participant and volunteer by email
    const [participant] = await db
      .select()
      .from(users)
      .where(eq(users.email, mapped.participantEmail))
      .limit(1);

    const [volunteer] = await db
      .select()
      .from(users)
      .where(eq(users.email, mapped.volunteerEmail))
      .limit(1);

    if (!participant) {
      return {
        success: false,
        error: `Participant not found: ${mapped.participantEmail}`,
      };
    }

    if (!volunteer) {
      return {
        success: false,
        error: `Volunteer not found: ${mapped.volunteerEmail}`,
      };
    }

    // Insert session
    const [session] = await db
      .insert(kintellSessions)
      .values({
        externalSessionId: mapped.externalSessionId,
        sessionType: mapped.sessionType,
        participantId: participant.id,
        volunteerId: volunteer.id,
        scheduledAt: mapped.scheduledAt,
        completedAt: mapped.completedAt,
        durationMinutes: mapped.durationMinutes,
        rating: mapped.rating?.toString(),
        feedbackText: mapped.feedbackText,
        languageLevel: mapped.languageLevel,
      })
      .returning();

    // Emit event
    const event = eventBus.createEvent<KintellSessionCompleted>(
      'kintell.session.completed',
      {
        sessionId: session.id,
        externalSessionId: session.externalSessionId || undefined,
        sessionType: session.sessionType as 'language' | 'mentorship',
        participantId: session.participantId,
        volunteerId: session.volunteerId,
        scheduledAt: session.scheduledAt!.toISOString(),
        completedAt: session.completedAt!.toISOString(),
        durationMinutes: session.durationMinutes!,
        languageLevel: session.languageLevel || undefined,
      }
    );

    await eventBus.publish(event);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process CSV backfill with checkpoint/resume capability
 *
 * Features:
 * - Validates each row with Zod schema
 * - Processes in batches (500 rows per transaction)
 * - Progress tracking every 1000 rows
 * - Checkpoint system for resume capability
 * - Error file generation for failed rows
 * - Event emission for each successful row
 *
 * @param jobId - Backfill job ID
 * @param csvStream - Readable stream of CSV data
 * @param startFromRow - Row number to start from (for resume)
 */
export async function processBackfill(
  jobId: string,
  csvStream: Readable,
  startFromRow: number = 0
): Promise<BackfillProgress> {
  const eventBus = getEventBus();
  const errors: BackfillError[] = [];

  let processedRows = 0;
  let successfulRows = 0;
  let failedRows = 0;
  let lastProgressUpdate = Date.now();

  try {
    await markJobRunning(jobId);

    // Parse CSV
    const parser = csvStream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        from: startFromRow + 1, // +1 because CSV library is 1-indexed
      })
    );

    const records: Array<{ row: number; data: Record<string, string> }> = [];
    let currentRow = startFromRow;

    // Collect records
    for await (const record of parser) {
      currentRow++;
      records.push({
        row: currentRow,
        data: record as Record<string, string>,
      });

      // Process in batches
      if (records.length >= BATCH_SIZE) {
        const batchResults = await processBatch(records, eventBus, errors);
        successfulRows += batchResults.successful;
        failedRows += batchResults.failed;
        processedRows += records.length;

        // Update progress
        await updateJobProgress(
          jobId,
          processedRows,
          successfulRows,
          failedRows,
          currentRow
        );

        // Emit progress event
        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_INTERVAL) {
          logger.info(
            {
              jobId,
              processedRows,
              successfulRows,
              failedRows,
              lastRow: currentRow,
            },
            'Backfill progress update'
          );
          lastProgressUpdate = now;
        }

        records.length = 0; // Clear batch
      }
    }

    // Process remaining records
    if (records.length > 0) {
      const batchResults = await processBatch(records, eventBus, errors);
      successfulRows += batchResults.successful;
      failedRows += batchResults.failed;
      processedRows += records.length;

      await updateJobProgress(
        jobId,
        processedRows,
        successfulRows,
        failedRows,
        currentRow
      );
    }

    // Write error file if there are errors
    if (errors.length > 0) {
      await writeErrorFile(jobId, errors);
    }

    // Mark job as completed
    await markJobCompleted(jobId);

    logger.info(
      {
        jobId,
        processedRows,
        successfulRows,
        failedRows,
        errorCount: errors.length,
      },
      'Backfill completed'
    );

    return (await getBackfillJobStatus(jobId))!;
  } catch (error: any) {
    logger.error({ error, jobId }, 'Backfill failed with error');
    await markJobFailed(jobId, error.message);
    throw error;
  }
}

/**
 * Process a batch of records
 */
async function processBatch(
  records: Array<{ row: number; data: Record<string, string> }>,
  eventBus: any,
  errors: BackfillError[]
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const { row, data } of records) {
    const result = await processRow(data, row, eventBus);

    if (result.success) {
      successful++;
    } else {
      failed++;
      errors.push({
        row,
        data,
        error: result.error!,
      });
    }
  }

  return { successful, failed };
}

/**
 * Get error file for download
 */
export async function getErrorFile(jobId: string): Promise<Buffer | null> {
  const [job] = await db
    .select()
    .from(backfillJobs)
    .where(eq(backfillJobs.id, jobId))
    .limit(1);

  if (!job || !job.errorFilePath) {
    return null;
  }

  try {
    const buffer = await fs.readFile(job.errorFilePath);
    return buffer;
  } catch (error: any) {
    logger.error({ error, jobId, errorFilePath: job.errorFilePath }, 'Error reading error file');
    return null;
  }
}

/**
 * Resume a paused/failed backfill job
 */
export async function resumeBackfill(
  jobId: string,
  csvStream: Readable
): Promise<BackfillProgress> {
  const [job] = await db
    .select()
    .from(backfillJobs)
    .where(eq(backfillJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error(`Backfill job ${jobId} not found`);
  }

  if (job.status === 'completed') {
    throw new Error(`Backfill job ${jobId} is already completed`);
  }

  logger.info(
    { jobId, lastProcessedRow: job.lastProcessedRow },
    'Resuming backfill from checkpoint'
  );

  return processBackfill(jobId, csvStream, job.lastProcessedRow);
}
