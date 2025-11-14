import { createServiceLogger } from '@teei/shared-utils';
import { db, buddyMatches, buddySystemEvents } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { BuddyMatchEnded } from '@teei/event-contracts';
import { tagEventWithSDGs, enrichPayloadWithSDGs } from '../utils/sdg-tagger.js';

const logger = createServiceLogger('buddy-connector:match-ended');

/**
 * Process buddy.match.ended event
 * Updates match status to ended and records end reason
 */
export async function processMatchEnded(
  event: BuddyMatchEnded,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      endReason: data.endReason,
    },
    'Processing buddy.match.ended event'
  );

  // Tag event with SDGs
  const sdgResult = tagEventWithSDGs('buddy.match.ended', event);
  const enrichedPayload = enrichPayloadWithSDGs(event, sdgResult);

  // Store raw event with SDG tags
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.match.ended',
    userId: data.participantId,
    timestamp: new Date(timestamp),
    payload: enrichedPayload as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  // Find match
  const [match] = await db
    .select()
    .from(buddyMatches)
    .where(eq(buddyMatches.id, data.matchId))
    .limit(1);

  if (!match) {
    throw new Error(`Match not found: ${data.matchId}`);
  }

  // Update match status
  await db
    .update(buddyMatches)
    .set({
      status: 'ended',
      endedAt: new Date(data.endedAt),
    })
    .where(eq(buddyMatches.id, data.matchId));

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      endReason: data.endReason,
    },
    'Match ended successfully'
  );
}
