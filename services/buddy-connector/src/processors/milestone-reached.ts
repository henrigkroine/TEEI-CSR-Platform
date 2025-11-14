import { createServiceLogger } from '@teei/shared-utils';
import { db, buddySystemEvents } from '@teei/shared-schema';
import type { BuddyMilestoneReached } from '@teei/event-contracts';

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

  // Store raw event (could be expanded to dedicated user_milestones table later)
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.milestone.reached',
    userId: data.userId,
    timestamp: new Date(timestamp),
    payload: event as any,
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
}
