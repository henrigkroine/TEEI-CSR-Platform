import { createServiceLogger } from '@teei/shared-utils';
import { db, buddyMatches, buddySystemEvents, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { BuddyMatchCreated } from '@teei/event-contracts';
import { tagEventWithSDGs, enrichPayloadWithSDGs } from '../utils/sdg-tagger.js';
import {
  linkBuddyUser,
  incrementJourneyCounter,
  updateJourneyFlags,
} from '../services/profile-service.js';

const logger = createServiceLogger('buddy-connector:match-created');

/**
 * Process buddy.match.created event
 * Stores the match in buddy_matches table and raw event in buddy_system_events
 */
export async function processMatchCreated(
  event: BuddyMatchCreated,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      participantId: data.participantId,
      buddyId: data.buddyId,
    },
    'Processing buddy.match.created event'
  );

  // Verify users exist
  const [participant] = await db
    .select()
    .from(users)
    .where(eq(users.id, data.participantId))
    .limit(1);

  const [buddy] = await db
    .select()
    .from(users)
    .where(eq(users.id, data.buddyId))
    .limit(1);

  if (!participant) {
    throw new Error(`Participant not found: ${data.participantId}`);
  }

  if (!buddy) {
    throw new Error(`Buddy not found: ${data.buddyId}`);
  }

  // Tag event with SDGs
  const sdgResult = tagEventWithSDGs('buddy.match.created', event);
  const enrichedPayload = enrichPayloadWithSDGs(event, sdgResult);

  // Store raw event with SDG tags
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.match.created',
    userId: data.participantId,
    timestamp: new Date(timestamp),
    payload: enrichedPayload as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  logger.info(
    { eventId, sdgs: sdgResult.sdgs },
    'Event tagged with SDGs'
  );

  // Check if match already exists (idempotency at domain level)
  const [existingMatch] = await db
    .select()
    .from(buddyMatches)
    .where(eq(buddyMatches.id, data.matchId))
    .limit(1);

  if (existingMatch) {
    logger.info(
      { deliveryId, matchId: data.matchId },
      'Match already exists, skipping insert'
    );
    return;
  }

  // Insert match
  await db.insert(buddyMatches).values({
    id: data.matchId,
    participantId: data.participantId,
    buddyId: data.buddyId,
    matchedAt: new Date(data.matchedAt),
    status: 'active',
  });

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
    },
    'Match created successfully'
  );

  // TASK-A-05: Link Buddy users to CSR profiles and update journey flags
  try {
    // Link participant to profile
    await linkBuddyUser(data.participantId, data.participantId, {
      matchId: data.matchId,
      matchedAt: data.matchedAt,
    });

    // Link buddy to profile
    await linkBuddyUser(data.buddyId, data.buddyId, {
      matchId: data.matchId,
      matchedAt: data.matchedAt,
    });

    // Update journey flags for participant
    await updateJourneyFlags(data.participantId, {
      is_buddy_participant: true,
    });

    // Increment match count for participant
    await incrementJourneyCounter(data.participantId, 'buddy_match_count');

    logger.info(
      { participantId: data.participantId, buddyId: data.buddyId },
      'Profile linking and journey flags updated'
    );
  } catch (error) {
    // Log but don't fail - profile linking is non-critical
    logger.warn({ error, deliveryId }, 'Failed to update profile linking');
  }
}
