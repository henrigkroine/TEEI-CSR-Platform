import { createServiceLogger } from '@teei/shared-utils';
import { db, buddyFeedback, buddySystemEvents, buddyMatches } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { BuddyFeedbackSubmitted } from '@teei/event-contracts';

const logger = createServiceLogger('buddy-connector:feedback-submitted');

/**
 * Process buddy.feedback.submitted event
 * Records feedback/ratings from participants or buddies about the match
 */
export async function processFeedbackSubmitted(
  event: BuddyFeedbackSubmitted,
  deliveryId: string
): Promise<void> {
  const { id: eventId, timestamp, correlationId, data } = event;

  logger.info(
    {
      deliveryId,
      eventId,
      matchId: data.matchId,
      fromRole: data.fromRole,
      rating: data.rating,
    },
    'Processing buddy.feedback.submitted event'
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
    eventType: 'buddy.feedback.submitted',
    userId: match.participantId,
    timestamp: new Date(timestamp),
    payload: event as any,
    correlationId: correlationId || null,
    processedAt: new Date(),
  });

  // Check if feedback already exists
  const [existingFeedback] = await db
    .select()
    .from(buddyFeedback)
    .where(eq(buddyFeedback.id, data.feedbackId))
    .limit(1);

  if (existingFeedback) {
    logger.info(
      { deliveryId, feedbackId: data.feedbackId },
      'Feedback already exists, skipping insert'
    );
    return;
  }

  // Insert feedback
  await db.insert(buddyFeedback).values({
    id: data.feedbackId,
    matchId: data.matchId,
    fromRole: data.fromRole,
    rating: data.rating.toString(), // Convert to decimal string
    feedbackText: data.feedbackText || null,
    submittedAt: new Date(data.submittedAt),
  });

  logger.info(
    {
      deliveryId,
      eventId,
      feedbackId: data.feedbackId,
    },
    'Feedback submitted successfully'
  );
}
