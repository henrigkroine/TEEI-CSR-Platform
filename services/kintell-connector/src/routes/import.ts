import type { FastifyInstance } from 'fastify';
import { parse } from 'csv-parse';
import { db, kintellSessions, users } from '@teei/shared-schema';
import { mapCSVRowToSession } from '../mappers/session-mapper.js';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { KintellSessionCompleted } from '@teei/event-contracts';
import { eq } from 'drizzle-orm';
import {
  createBackfillJob,
  processBackfill,
  getBackfillJobStatus,
  getErrorFile,
  resumeBackfill,
} from '../utils/backfill.js';

const logger = createServiceLogger('kintell-connector:import');

export async function importRoutes(app: FastifyInstance) {
  // POST /import/kintell-sessions - Bulk CSV import
  app.post('/kintell-sessions', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const records: Record<string, string>[] = [];
    const parser = data.file.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    for await (const record of parser) {
      records.push(record as Record<string, string>);
    }

    logger.info({ count: records.length }, 'Processing CSV records');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const mapped = mapCSVRowToSession(records[i]);

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

        if (!participant || !volunteer) {
          results.errors.push({
            row: i + 1,
            error: `User not found: ${!participant ? mapped.participantEmail : mapped.volunteerEmail}`,
          });
          continue;
        }

        // SWARM 6: Associate session to campaign (if possible)
        // Use participant's company for campaign matching
        const participantCompanyId = participant.companyId;
        const sessionDate = mapped.completedAt || new Date();

        let programInstanceId: string | null = null;
        if (participantCompanyId) {
          try {
            // Dynamic import to avoid hard dependency
            const { associateSessionDuringIngestion } = await import('../lib/campaign-association.js');
            programInstanceId = await associateSessionDuringIngestion(
              mapped.externalSessionId || crypto.randomUUID(),
              participant.id,
              volunteer.id,
              participantCompanyId,
              sessionDate
            );
          } catch (error) {
            // Graceful degradation: Continue without campaign association
            logger.warn({ error }, 'Campaign association unavailable - continuing without association');
          }
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
            programInstanceId: programInstanceId, // SWARM 6: Link to campaign
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

        results.created++;
      } catch (error: any) {
        logger.error({ error, row: i + 1 }, 'Error processing row');
        results.errors.push({ row: i + 1, error: error.message });
      } finally {
        results.processed++;
      }
    }

    return results;
  });

  /**
   * POST /import/backfill/start
   * Start a new backfill job with checkpoint/resume capability
   */
  app.post('/backfill/start', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    try {
      // Count total rows first
      let totalRows = 0;
      const countParser = data.file.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      );

      for await (const _ of countParser) {
        totalRows++;
      }

      // Create backfill job
      const jobId = await createBackfillJob(data.filename, totalRows);

      logger.info({ jobId, fileName: data.filename, totalRows }, 'Backfill job created');

      // Note: In production, you would start processing in the background
      // For now, we just return the job ID
      return {
        jobId,
        fileName: data.filename,
        totalRows,
        status: 'pending',
        message: 'Backfill job created. Call resume endpoint to start processing.',
      };
    } catch (error: any) {
      logger.error({ error }, 'Error creating backfill job');
      return reply.status(500).send({
        error: 'Failed to create backfill job',
        message: error.message,
      });
    }
  });

  /**
   * GET /import/backfill/:jobId/status
   * Get backfill job progress
   */
  app.get('/backfill/:jobId/status', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };

      const status = await getBackfillJobStatus(jobId);

      if (!status) {
        return reply.status(404).send({
          error: 'Backfill job not found',
        });
      }

      return status;
    } catch (error: any) {
      logger.error({ error }, 'Error fetching backfill job status');
      return reply.status(500).send({
        error: 'Failed to fetch backfill job status',
        message: error.message,
      });
    }
  });

  /**
   * GET /import/backfill/:jobId/errors
   * Download error CSV file
   */
  app.get('/backfill/:jobId/errors', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };

      const errorFile = await getErrorFile(jobId);

      if (!errorFile) {
        return reply.status(404).send({
          error: 'Error file not found',
          message: 'No errors recorded or file has been deleted',
        });
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="backfill_errors_${jobId}.csv"`);

      return errorFile;
    } catch (error: any) {
      logger.error({ error }, 'Error downloading error file');
      return reply.status(500).send({
        error: 'Failed to download error file',
        message: error.message,
      });
    }
  });

  /**
   * POST /import/backfill/:jobId/resume
   * Resume a backfill job from checkpoint (or start if pending)
   */
  app.post('/backfill/:jobId/resume', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    try {
      const { jobId } = request.params as { jobId: string };

      logger.info({ jobId }, 'Resuming backfill job');

      // Process backfill (will resume from checkpoint if previously started)
      const result = await resumeBackfill(jobId, data.file);

      return result;
    } catch (error: any) {
      logger.error({ error }, 'Error resuming backfill job');
      return reply.status(500).send({
        error: 'Failed to resume backfill job',
        message: error.message,
      });
    }
  });
}
