import { createServiceLogger } from '@teei/shared-utils';
import { db, buddySystemEvents } from '@teei/shared-schema';
import type { BuddyEventAttended } from '@teei/event-contracts';
import { tagEventWithSDGs, enrichPayloadWithSDGs } from '../utils/sdg-tagger.js';
import { incrementJourneyCounter } from '../services/profile-service.js';

const logger = createServiceLogger('buddy-connector:event-attended');

/**
 * Process buddy.event.attended event
 * Records attendance at formal buddy program events (workshops, cultural events, etc.)
 * Currently stores in buddy_system_events for analytics and SROI calculation
 */
export async function processEventAttended(
  event: BuddyEventAttended,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      userId: data.userId,
      eventType: data.eventType,
      eventTitle: data.eventTitle,
    },
    'Processing buddy.event.attended event'
  );

  // Tag event with SDGs
  const sdgResult = tagEventWithSDGs('buddy.event.attended', event);
  const enrichedPayload = enrichPayloadWithSDGs(event, sdgResult);

  // Store raw event with SDG tags (could be expanded to dedicated attendance table later)
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.event.attended',
    userId: data.userId,
    timestamp: new Date(timestamp),
    payload: enrichedPayload as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  logger.info(
    {
      deliveryId,
      eventId,
      userId: data.userId,
      eventTitle: data.eventTitle,
    },
    'Event attendance recorded successfully'
  );

  // TASK-A-05: Update journey flags
  try {
    await incrementJourneyCounter(data.userId, 'buddy_events_attended');
    logger.info({ userId: data.userId }, 'Journey counter updated for event attendance');
  } catch (error) {
    logger.warn({ error, userId: data.userId }, 'Failed to update journey counter');
  }
}
