import { createServiceLogger } from '@teei/shared-utils';
import { db, buddyCheckins, buddySystemEvents, buddyMatches } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { BuddyCheckinCompleted } from '@teei/event-contracts';

const logger = createServiceLogger('buddy-connector:checkin-completed');

/**
 * Process buddy.checkin.completed event
 * Records regular check-ins for tracking participant well-being
 */
export async function processCheckinCompleted(
  event: BuddyCheckinCompleted,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      mood: data.mood,
    },
    'Processing buddy.checkin.completed event'
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
    eventType: 'buddy.checkin.completed',
    userId: match.participantId,
    timestamp: new Date(timestamp),
    payload: event as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  // Check if checkin already exists
  const [existingCheckin] = await db
    .select()
    .from(buddyCheckins)
    .where(eq(buddyCheckins.id, data.checkinId))
    .limit(1);

  if (existingCheckin) {
    logger.info(
      { deliveryId, checkinId: data.checkinId },
      'Checkin already exists, skipping insert'
    );
    return;
  }

  // Insert checkin
  await db.insert(buddyCheckins).values({
    id: data.checkinId,
    matchId: data.matchId,
    checkinDate: new Date(data.checkinDate),
    mood: data.mood || null,
    notes: data.notes || null,
  });

  logger.info(
    {
      deliveryId,
      eventId,
      checkinId: data.checkinId,
    },
    'Checkin completed successfully'
  );
}
