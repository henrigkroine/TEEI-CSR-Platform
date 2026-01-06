import { createServiceLogger } from '@teei/shared-utils';
import { db, buddyEvents, buddySystemEvents, buddyMatches } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { BuddyEventLogged } from '@teei/event-contracts';

const logger = createServiceLogger('buddy-connector:event-logged');

/**
 * Process buddy.event.logged event
 * Records social activities (hangouts, workshops, etc.) between buddy pairs
 */
export async function processEventLogged(
  event: BuddyEventLogged,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      eventType: data.eventType,
    },
    'Processing buddy.event.logged event'
  );

  // Verify match exists
  const [match] = await db
    .select()
    .from(buddyMatches)
    .where(eq(buddyMatches.id, data.matchId))
    .limit(1);

  if (!match) {
    throw new Error(`Match not found: ${data.matchId}`);
  }

  // Store raw event
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.event.logged',
    userId: match.participantId,
    timestamp: new Date(timestamp),
    payload: event as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  // Check if event already exists
  const [existingEvent] = await db
    .select()
    .from(buddyEvents)
    .where(eq(buddyEvents.id, data.eventId))
    .limit(1);

  if (existingEvent) {
    logger.info(
      { deliveryId, eventId: data.eventId },
      'Event already exists, skipping insert'
    );
    return;
  }

  // Insert buddy event
  await db.insert(buddyEvents).values({
    id: data.eventId,
    matchId: data.matchId,
    eventType: data.eventType,
    eventDate: new Date(data.eventDate),
    description: data.description || null,
    location: data.location || null,
  });

  logger.info(
    {
      deliveryId,
      eventId,
      buddyEventId: data.eventId,
    },
    'Buddy event logged successfully'
  );
}
