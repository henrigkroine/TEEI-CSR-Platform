import type { EventBus } from '@teei/shared-utils';
import { db, programEnrollments } from '@teei/shared-schema';
import type { UpskillingCourseCompleted, KintellSessionCompleted, BuddyMatchCreated } from '@teei/event-contracts';
import { eq, and } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('unified-profile:subscribers');

export async function setupSubscribers(eventBus: EventBus) {
  // Subscribe to upskilling.course.completed -> Update profile flag
  await eventBus.subscribe<UpskillingCourseCompleted>(
    'upskilling.course.completed',
    async (event) => {
      logger.info({ userId: event.data.userId }, 'Course completed, updating enrollment');

      // Find and update enrollment
      const [enrollment] = await db
        .select()
        .from(programEnrollments)
        .where(
          and(
            eq(programEnrollments.userId, event.data.userId),
            eq(programEnrollments.programType, 'upskilling')
          )
        )
        .limit(1);

      if (enrollment) {
        await db
          .update(programEnrollments)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(programEnrollments.id, enrollment.id));
      }
    }
  );

  // Subscribe to kintell.session.completed -> Update language/mentorship flags
  await eventBus.subscribe<KintellSessionCompleted>(
    'kintell.session.completed',
    async (event) => {
      logger.info(
        { userId: event.data.participantId, sessionType: event.data.sessionType },
        'Kintell session completed'
      );

      const programType = event.data.sessionType; // 'language' or 'mentorship'

      // Check if enrollment exists
      const [enrollment] = await db
        .select()
        .from(programEnrollments)
        .where(
          and(
            eq(programEnrollments.userId, event.data.participantId),
            eq(programEnrollments.programType, programType)
          )
        )
        .limit(1);

      if (!enrollment) {
        // Create enrollment if not exists
        await db.insert(programEnrollments).values({
          userId: event.data.participantId,
          programType,
          status: 'active',
        });
      }
    }
  );

  // Subscribe to buddy.match.created -> Update buddy flag
  await eventBus.subscribe<BuddyMatchCreated>('buddy.match.created', async (event) => {
    logger.info({ userId: event.data.participantId }, 'Buddy match created');

    // Check if enrollment exists
    const [enrollment] = await db
      .select()
      .from(programEnrollments)
      .where(
        and(
          eq(programEnrollments.userId, event.data.participantId),
          eq(programEnrollments.programType, 'buddy')
        )
      )
      .limit(1);

    if (!enrollment) {
      // Create enrollment
      await db.insert(programEnrollments).values({
        userId: event.data.participantId,
        programType: 'buddy',
        status: 'active',
      });
    }
  });

  logger.info('Event subscribers initialized');
}
