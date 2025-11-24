import type { FastifyInstance } from 'fastify';
import { parse } from 'csv-parse';
import { db, learningProgress, users } from '@teei/shared-schema';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { UpskillingCourseCompleted, UpskillingCredentialIssued } from '@teei/event-contracts';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('upskilling-connector:import');

export async function importRoutes(app: FastifyInstance) {
  // POST /import/course-completions - Import course completions CSV
  app.post('/course-completions', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing course completions CSV records');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, row.user_email))
          .limit(1);

        if (!user) {
          results.errors.push({
            row: i + 1,
            error: `User not found: ${row.user_email}`,
          });
          continue;
        }

        // Parse optional fields
        const finalScore = row.final_score ? parseFloat(row.final_score) : undefined;
        const completedAt = new Date(row.completed_at);

        // SWARM 6: Associate completion to campaign (if possible)
        const userCompanyId = user.companyId;

        let programInstanceId: string | null = null;
        if (userCompanyId) {
          try {
            // Dynamic import to avoid hard dependency
            const { associateCompletionDuringIngestion } = await import('../lib/campaign-association.js');
            programInstanceId = await associateCompletionDuringIngestion(
              crypto.randomUUID(), // Temp ID (will be replaced by actual progress.id)
              user.id,
              userCompanyId,
              completedAt
            );
          } catch (error) {
            // Graceful degradation: Continue without campaign association
            logger.warn({ error }, 'Campaign association unavailable - continuing without association');
          }
        }

        // Insert/update learning progress
        const [progress] = await db
          .insert(learningProgress)
          .values({
            userId: user.id,
            provider: row.provider,
            courseId: row.course_id,
            courseName: row.course_name,
            status: 'completed',
            progressPercent: 100,
            completedAt: completedAt,
            credentialRef: row.credential_ref || null,
            programInstanceId: programInstanceId, // SWARM 6: Link to campaign
          })
          .returning();

        // Emit upskilling.course.completed event
        const event = eventBus.createEvent<UpskillingCourseCompleted>(
          'upskilling.course.completed',
          {
            progressId: progress.id,
            userId: user.id,
            provider: row.provider,
            courseId: row.course_id,
            courseName: row.course_name,
            completedAt: completedAt.toISOString(),
            finalScore: finalScore,
            credentialRef: row.credential_ref || undefined,
          }
        );

        await eventBus.publish(event);

        results.created++;
      } catch (error: any) {
        logger.error({ error, row: i + 1 }, 'Error processing course completion row');
        results.errors.push({ row: i + 1, error: error.message });
      } finally {
        results.processed++;
      }
    }

    return results;
  });

  // POST /import/credentials - Import credentials CSV
  app.post('/credentials', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing credentials CSV records');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      emitted: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, row.user_email))
          .limit(1);

        if (!user) {
          results.errors.push({
            row: i + 1,
            error: `User not found: ${row.user_email}`,
          });
          continue;
        }

        // Validate credential type
        const validTypes = ['certificate', 'badge', 'diploma', 'transcript'];
        if (!validTypes.includes(row.credential_type)) {
          results.errors.push({
            row: i + 1,
            error: `Invalid credential type: ${row.credential_type}`,
          });
          continue;
        }

        const issuedAt = new Date(row.issued_at);
        const expiresAt = row.expires_at ? new Date(row.expires_at) : undefined;

        // Emit upskilling.credential.issued event
        const event = eventBus.createEvent<UpskillingCredentialIssued>(
          'upskilling.credential.issued',
          {
            credentialId: row.credential_id,
            userId: user.id,
            provider: row.provider,
            courseId: row.course_id,
            courseName: row.course_name,
            credentialType: row.credential_type as 'certificate' | 'badge' | 'diploma' | 'transcript',
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt?.toISOString(),
            credentialUrl: row.credential_url || undefined,
            verificationCode: row.verification_code || undefined,
          }
        );

        await eventBus.publish(event);

        results.emitted++;
      } catch (error: any) {
        logger.error({ error, row: i + 1 }, 'Error processing credential row');
        results.errors.push({ row: i + 1, error: error.message });
      } finally {
        results.processed++;
      }
    }

    return results;
  });
}
