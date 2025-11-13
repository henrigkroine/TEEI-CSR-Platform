import type { FastifyInstance } from 'fastify';
import { parse } from 'csv-parse';
import { db, kintellSessions, users } from '@teei/shared-schema';
import { mapCSVRowToSession } from '../mappers/session-mapper.js';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { KintellSessionCompleted } from '@teei/event-contracts';
import { eq } from 'drizzle-orm';

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
}
