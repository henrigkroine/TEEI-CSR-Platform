import { createServiceLogger } from '@teei/shared-utils';
import { db, buddySystemEvents } from '@teei/shared-schema';
import type { BuddySkillShareCompleted } from '@teei/event-contracts';
import { tagEventWithSDGs, enrichPayloadWithSDGs } from '../utils/sdg-tagger.js';

const logger = createServiceLogger('buddy-connector:skill-share-completed');

/**
 * Process buddy.skill_share.completed event
 * Records skill exchange sessions between buddies (language, tech, professional skills)
 * Critical for SROI calculation and SDG mapping (especially SDG 4: Quality Education)
 */
export async function processSkillShareCompleted(
  event: BuddySkillShareCompleted,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      sessionId: data.sessionId,
      skillName: data.skillName,
      teacherId: data.teacherId,
      learnerId: data.learnerId,
    },
    'Processing buddy.skill_share.completed event'
  );

  // Tag event with SDGs
  const sdgResult = tagEventWithSDGs('buddy.skill_share.completed', event);
  const enrichedPayload = enrichPayloadWithSDGs(event, sdgResult);

  // Store raw event with SDG tags (could be expanded to dedicated skill_sessions table later)
  await db.insert(buddySystemEvents).values({
    eventId,
    eventType: 'buddy.skill_share.completed',
    userId: data.learnerId, // Index by learner for impact tracking
    timestamp: new Date(timestamp),
    payload: enrichedPayload as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  logger.info(
    {
      deliveryId,
      eventId,
      sessionId: data.sessionId,
      skillName: data.skillName,
      sdgGoals: data.sdgGoals,
      valuationPoints: data.valuationPoints,
    },
    'Skill share session recorded successfully'
  );
}
