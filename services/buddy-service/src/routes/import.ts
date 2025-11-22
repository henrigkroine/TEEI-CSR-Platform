import type { FastifyInstance } from 'fastify';
import { parse } from 'csv-parse';
import { db, buddyMatches, buddyEvents, buddyCheckins, buddyFeedback, users } from '@teei/shared-schema';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type {
  BuddyMatchCreated,
  BuddyEventLogged,
  BuddyCheckinCompleted,
  BuddyFeedbackSubmitted,
} from '@teei/event-contracts';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('buddy-service:import');

export async function importRoutes(app: FastifyInstance) {
  // POST /import/matches - Import buddy matches CSV
  app.post('/matches', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing buddy matches CSV');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find participant and buddy by email
        const [participant] = await db
          .select()
          .from(users)
          .where(eq(users.email, row.participant_email))
          .limit(1);

        const [buddy] = await db
          .select()
          .from(users)
          .where(eq(users.email, row.buddy_email))
          .limit(1);

        if (!participant || !buddy) {
          results.errors.push({
            row: i + 1,
            error: `User not found: ${!participant ? row.participant_email : row.buddy_email}`,
          });
          continue;
        }

        // SWARM 6: Associate match to campaign (if possible)
        const participantCompanyId = participant.companyId;
        const matchDate = row.matched_at ? new Date(row.matched_at) : new Date();

        let programInstanceId: string | null = null;
        if (participantCompanyId) {
          try {
            // Dynamic import to avoid hard dependency
            const { associateMatchDuringIngestion } = await import('../lib/campaign-association.js');
            programInstanceId = await associateMatchDuringIngestion(
              crypto.randomUUID(), // Temp ID (will be replaced by actual match.id)
              participant.id,
              buddy.id,
              participantCompanyId,
              matchDate
            );
          } catch (error) {
            // Graceful degradation: Continue without campaign association
            logger.warn({ error }, 'Campaign association unavailable - continuing without association');
          }
        }

        // Insert match
        const [match] = await db
          .insert(buddyMatches)
          .values({
            participantId: participant.id,
            buddyId: buddy.id,
            matchedAt: row.matched_at ? new Date(row.matched_at) : new Date(),
            status: row.status || 'active',
            programInstanceId: programInstanceId, // SWARM 6: Link to campaign
          })
          .returning();

        // Emit event
        const event = eventBus.createEvent<BuddyMatchCreated>('buddy.match.created', {
          matchId: match.id,
          participantId: match.participantId,
          buddyId: match.buddyId,
          matchedAt: match.matchedAt.toISOString(),
          matchingCriteria: {
            language: row.language,
            interests: row.interests ? row.interests.split(',').map((i) => i.trim()) : undefined,
            location: row.location,
          },
        });

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

  // POST /import/events - Import buddy events CSV
  app.post('/events', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing buddy events CSV');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find match by ID (assuming match_id is provided as UUID)
        const [match] = await db
          .select()
          .from(buddyMatches)
          .where(eq(buddyMatches.id, row.match_id))
          .limit(1);

        if (!match) {
          results.errors.push({
            row: i + 1,
            error: `Match not found: ${row.match_id}`,
          });
          continue;
        }

        // Insert event
        const [buddyEvent] = await db
          .insert(buddyEvents)
          .values({
            matchId: row.match_id,
            eventType: row.event_type,
            eventDate: row.event_date ? new Date(row.event_date) : new Date(),
            description: row.description,
            location: row.location,
          })
          .returning();

        // Emit event
        const event = eventBus.createEvent<BuddyEventLogged>('buddy.event.logged', {
          eventId: buddyEvent.id,
          matchId: buddyEvent.matchId,
          eventType: buddyEvent.eventType || 'hangout',
          eventDate: buddyEvent.eventDate!.toISOString(),
          description: buddyEvent.description || undefined,
          location: buddyEvent.location || undefined,
          attendees: row.attendees ? row.attendees.split(',').map((a) => a.trim()) : undefined,
        });

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

  // POST /import/checkins - Import checkins CSV
  app.post('/checkins', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing buddy checkins CSV');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find match by ID
        const [match] = await db
          .select()
          .from(buddyMatches)
          .where(eq(buddyMatches.id, row.match_id))
          .limit(1);

        if (!match) {
          results.errors.push({
            row: i + 1,
            error: `Match not found: ${row.match_id}`,
          });
          continue;
        }

        // Insert checkin
        const [checkin] = await db
          .insert(buddyCheckins)
          .values({
            matchId: row.match_id,
            checkinDate: row.checkin_date ? new Date(row.checkin_date) : new Date(),
            mood: row.mood,
            notes: row.notes,
          })
          .returning();

        // Emit event
        const event = eventBus.createEvent<BuddyCheckinCompleted>('buddy.checkin.completed', {
          checkinId: checkin.id,
          matchId: checkin.matchId,
          checkinDate: checkin.checkinDate.toISOString(),
          mood: checkin.mood as 'great' | 'good' | 'okay' | 'struggling' | 'difficult' | undefined,
          notes: checkin.notes || undefined,
          questionResponses: row.question_responses ? JSON.parse(row.question_responses) : undefined,
        });

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

  // POST /import/feedback - Import feedback CSV
  app.post('/feedback', async (request, reply) => {
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

    logger.info({ count: records.length }, 'Processing buddy feedback CSV');

    const eventBus = getEventBus();
    const results = {
      processed: 0,
      created: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    for (let i = 0; i < records.length; i++) {
      try {
        const row = records[i];

        // Find match by ID
        const [match] = await db
          .select()
          .from(buddyMatches)
          .where(eq(buddyMatches.id, row.match_id))
          .limit(1);

        if (!match) {
          results.errors.push({
            row: i + 1,
            error: `Match not found: ${row.match_id}`,
          });
          continue;
        }

        // Parse rating (normalized 0-1)
        const rating = parseFloat(row.rating);
        if (isNaN(rating) || rating < 0 || rating > 1) {
          results.errors.push({
            row: i + 1,
            error: `Invalid rating: ${row.rating} (must be 0-1)`,
          });
          continue;
        }

        // Insert feedback
        const [feedback] = await db
          .insert(buddyFeedback)
          .values({
            matchId: row.match_id,
            fromRole: row.from_role,
            rating: rating.toString(),
            feedbackText: row.feedback_text,
            submittedAt: row.submitted_at ? new Date(row.submitted_at) : new Date(),
          })
          .returning();

        // Parse categories if provided
        let categories;
        if (row.communication || row.helpfulness || row.engagement) {
          categories = {
            communication: row.communication ? parseFloat(row.communication) : undefined,
            helpfulness: row.helpfulness ? parseFloat(row.helpfulness) : undefined,
            engagement: row.engagement ? parseFloat(row.engagement) : undefined,
          };
        }

        // Emit event
        const event = eventBus.createEvent<BuddyFeedbackSubmitted>('buddy.feedback.submitted', {
          feedbackId: feedback.id,
          matchId: feedback.matchId,
          fromRole: feedback.fromRole as 'participant' | 'buddy',
          rating: parseFloat(feedback.rating),
          feedbackText: feedback.feedbackText || undefined,
          submittedAt: feedback.submittedAt.toISOString(),
          categories,
        });

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
