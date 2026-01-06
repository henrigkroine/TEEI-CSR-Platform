import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Readable } from 'stream';
import {
  createBackfillJob,
  processBackfill,
  getBackfillJobStatus,
  getErrorFile,
  resumeBackfill,
} from '../utils/backfill.js';
import { db, backfillJobs, kintellSessions, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

/**
 * Integration tests for backfill pipeline
 *
 * Test coverage:
 * 1. CSV import with 10K rows completes in < 5 minutes
 * 2. Checkpoint/resume (stop mid-import, resume from last row)
 * 3. Error file generation (invalid rows written to error CSV)
 * 4. Progress tracking
 */

describe('Backfill Pipeline Integration Tests', () => {
  let testUserId1: string;
  let testUserId2: string;

  beforeAll(async () => {
    // Create test users for backfill
    const [user1] = await db
      .insert(users)
      .values({
        email: 'backfill-participant@example.com',
        name: 'Backfill Participant',
        role: 'participant',
      })
      .returning();

    const [user2] = await db
      .insert(users)
      .values({
        email: 'backfill-volunteer@example.com',
        name: 'Backfill Volunteer',
        role: 'volunteer',
      })
      .returning();

    testUserId1 = user1.id;
    testUserId2 = user2.id;
  });

  afterAll(async () => {
    // Cleanup test users
    await db.delete(users).where(eq(users.id, testUserId1));
    await db.delete(users).where(eq(users.id, testUserId2));
  });

  describe('Backfill Job Creation', () => {
    it('should create backfill job with correct metadata', async () => {
      const fileName = 'test-sessions.csv';
      const totalRows = 1000;

      const jobId = await createBackfillJob(fileName, totalRows);

      expect(jobId).toBeTruthy();

      const status = await getBackfillJobStatus(jobId);

      expect(status).toBeTruthy();
      expect(status?.fileName).toBe(fileName);
      expect(status?.totalRows).toBe(totalRows);
      expect(status?.processedRows).toBe(0);
      expect(status?.successfulRows).toBe(0);
      expect(status?.failedRows).toBe(0);
      expect(status?.status).toBe('pending');
      expect(status?.percentComplete).toBe(0);

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));
    });

    it('should return null for non-existent job', async () => {
      const status = await getBackfillJobStatus('non-existent-job-id');
      expect(status).toBeNull();
    });
  });

  describe('CSV Processing', () => {
    function createCSVStream(rows: string[]): Readable {
      const header = 'session_id,session_type,participant_email,volunteer_email,date,duration_min,rating,feedback_text,language_level\n';
      const csvContent = header + rows.join('\n');
      return Readable.from([csvContent]);
    }

    it('should process valid CSV rows successfully', async () => {
      const rows = [
        `session-1,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Great session,B1`,
        `session-2,Mentorship,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-02T10:00:00Z,45,4,Good session,B2`,
      ];

      const jobId = await createBackfillJob('test.csv', rows.length);
      const csvStream = createCSVStream(rows);

      const result = await processBackfill(jobId, csvStream, 0);

      expect(result.status).toBe('completed');
      expect(result.successfulRows).toBe(2);
      expect(result.failedRows).toBe(0);
      expect(result.processedRows).toBe(2);
      expect(result.percentComplete).toBe(100);

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));
      await db.delete(kintellSessions).where(eq(kintellSessions.externalSessionId, 'session-1'));
      await db.delete(kintellSessions).where(eq(kintellSessions.externalSessionId, 'session-2'));
    });

    it('should handle invalid rows and generate error file', async () => {
      const rows = [
        // Valid row
        `session-valid,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Great,B1`,
        // Invalid email
        `session-invalid-1,Language Connect,invalid-email,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Good,B1`,
        // Non-existent user
        `session-invalid-2,Language Connect,nonexistent@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Good,B1`,
      ];

      const jobId = await createBackfillJob('test-errors.csv', rows.length);
      const csvStream = createCSVStream(rows);

      const result = await processBackfill(jobId, csvStream, 0);

      expect(result.status).toBe('completed');
      expect(result.successfulRows).toBe(1);
      expect(result.failedRows).toBe(2);
      expect(result.processedRows).toBe(3);

      // Check error file exists
      const errorFile = await getErrorFile(jobId);
      expect(errorFile).toBeTruthy();

      if (errorFile) {
        const errorContent = errorFile.toString('utf-8');
        expect(errorContent).toContain('_error_row');
        expect(errorContent).toContain('_error_message');
        expect(errorContent).toContain('session-invalid-1');
        expect(errorContent).toContain('session-invalid-2');
      }

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));
      await db.delete(kintellSessions).where(eq(kintellSessions.externalSessionId, 'session-valid'));
    });

    it('should process large CSV file (performance test)', async () => {
      // Generate 1000 rows (scaled down from 10K for faster tests)
      const rows: string[] = [];
      for (let i = 0; i < 1000; i++) {
        rows.push(
          `session-large-${i},Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Test ${i},B1`
        );
      }

      const jobId = await createBackfillJob('large-test.csv', rows.length);
      const csvStream = createCSVStream(rows);

      const startTime = Date.now();
      const result = await processBackfill(jobId, csvStream, 0);
      const endTime = Date.now();

      const durationSeconds = (endTime - startTime) / 1000;

      expect(result.status).toBe('completed');
      expect(result.successfulRows).toBe(1000);
      expect(result.failedRows).toBe(0);

      // Should complete in reasonable time (< 30 seconds for 1K rows)
      expect(durationSeconds).toBeLessThan(30);

      console.log(`Processed ${rows.length} rows in ${durationSeconds.toFixed(2)} seconds`);
      console.log(`Rate: ${(rows.length / durationSeconds).toFixed(2)} rows/second`);

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));

      // Delete all test sessions
      for (let i = 0; i < 1000; i++) {
        await db
          .delete(kintellSessions)
          .where(eq(kintellSessions.externalSessionId, `session-large-${i}`));
      }
    }, 60000); // 60 second timeout

    it('should resume backfill from checkpoint', async () => {
      const rows = [
        `session-resume-1,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Test 1,B1`,
        `session-resume-2,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-02T10:00:00Z,60,5,Test 2,B1`,
        `session-resume-3,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-03T10:00:00Z,60,5,Test 3,B1`,
        `session-resume-4,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-04T10:00:00Z,60,5,Test 4,B1`,
      ];

      // Create job and process first 2 rows
      const jobId = await createBackfillJob('resume-test.csv', rows.length);
      const csvStream1 = createCSVStream(rows.slice(0, 2));

      await processBackfill(jobId, csvStream1, 0);

      // Check intermediate status
      let status = await getBackfillJobStatus(jobId);
      expect(status?.processedRows).toBe(2);
      expect(status?.successfulRows).toBe(2);

      // Resume from checkpoint (process remaining rows)
      const csvStream2 = createCSVStream(rows);
      await resumeBackfill(jobId, csvStream2);

      // Check final status
      status = await getBackfillJobStatus(jobId);
      expect(status?.status).toBe('completed');
      expect(status?.processedRows).toBe(4);
      expect(status?.successfulRows).toBe(4);
      expect(status?.percentComplete).toBe(100);

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));
      for (let i = 1; i <= 4; i++) {
        await db
          .delete(kintellSessions)
          .where(eq(kintellSessions.externalSessionId, `session-resume-${i}`));
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress accurately', async () => {
      const rows = [
        `session-progress-1,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-01T10:00:00Z,60,5,Test,B1`,
        `session-progress-2,Language Connect,backfill-participant@example.com,backfill-volunteer@example.com,2024-01-02T10:00:00Z,60,5,Test,B1`,
      ];

      const jobId = await createBackfillJob('progress-test.csv', rows.length);

      // Check initial status
      let status = await getBackfillJobStatus(jobId);
      expect(status?.percentComplete).toBe(0);
      expect(status?.status).toBe('pending');

      // Process
      const csvStream = Readable.from([
        'session_id,session_type,participant_email,volunteer_email,date,duration_min,rating,feedback_text,language_level\n' +
          rows.join('\n'),
      ]);

      await processBackfill(jobId, csvStream, 0);

      // Check final status
      status = await getBackfillJobStatus(jobId);
      expect(status?.percentComplete).toBe(100);
      expect(status?.status).toBe('completed');
      expect(status?.processedRows).toBe(rows.length);

      // Cleanup
      await db.delete(backfillJobs).where(eq(backfillJobs.id, jobId));
      await db.delete(kintellSessions).where(eq(kintellSessions.externalSessionId, 'session-progress-1'));
      await db.delete(kintellSessions).where(eq(kintellSessions.externalSessionId, 'session-progress-2'));
    });
  });
});
