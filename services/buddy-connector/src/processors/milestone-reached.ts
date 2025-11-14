import { createServiceLogger } from '@teei/shared-utils';
import { db, buddySystemEvents } from '@teei/shared-schema';
import type { BuddyMilestoneReached } from '@teei/event-contracts';
import { tagEventWithSDGs, enrichPayloadWithSDGs } from '../utils/sdg-tagger.js';
import { incrementJourneyCounter } from '../services/profile-service.js';

const logger = createServiceLogger('buddy-connector:milestone-reached');

/**
 * Process buddy.milestone.reached event
 * Records user milestones in the buddy program (onboarding, achievements, etc.)
 * Used for VIS calculation, gamification, and journey orchestration triggers
 */
export async function processMilestoneReached(
  event: BuddyMilestoneReached,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      userId: data.userId,
      milestoneTitle: data.milestoneTitle,
      milestoneCategory: data.milestoneCategory,
      points: data.points,
    },
    'Processing buddy.milestone.reached event'
  );

  // Tag event with SDGs
  const sdgResult = tagEventWithSDGs('buddy.milestone.reached', event);
  const enrichedPayload = enrichPayloadWithSDGs(event, sdgResult);

  // Store raw event with SDG tags (could be expanded to dedicated user_milestones table later)
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.milestone.reached',
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
      milestoneTitle: data.milestoneTitle,
      points: data.points,
    },
    'Milestone reached successfully'
  );

  // TASK-A-05: Update journey flags
  try {
    await incrementJourneyCounter(data.userId, 'buddy_milestones_count');
    logger.info({ userId: data.userId, milestoneTitle: data.milestoneTitle }, 'Journey counter updated for milestone');
  } catch (error) {
    logger.warn({ error, userId: data.userId }, 'Failed to update journey counter');
  }
}
