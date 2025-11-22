import type { EventBus } from '@teei/shared-utils';
import { db, programEnrollments, programs, programCampaigns, beneficiaryGroups } from '@teei/shared-schema';
import type { UpskillingCourseCompleted, KintellSessionCompleted, BuddyMatchCreated } from '@teei/event-contracts';
import { eq, and } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('unified-profile:subscribers');

/**
 * Helper: Lookup program context for enrollment
 * Implements Agent 21: enrollment-gateway-enhancer dual-write pattern
 */
async function lookupProgramContext(
  userId: string,
  programType: string
): Promise<{
  programId: string | null;
  campaignId: string | null;
  beneficiaryGroupId: string | null;
}> {
  // For MVP, look up user's company and find matching active campaign/program
  // In production, this would consider:
  // - User's demographic attributes (nationality, location, etc.)
  // - Active campaigns for user's company
  // - Beneficiary group eligibility

  try {
    // Step 1: Get user to find their company
    const user = await db.query.users.findFirst({
      where: eq(db.query.users.id, userId),
    });

    if (!user?.companyId) {
      logger.warn({ userId }, 'User has no company, skipping program lookup');
      return { programId: null, campaignId: null, beneficiaryGroupId: null };
    }

    // Step 2: Find active campaign for this company + programType
    const campaign = await db.query.programCampaigns.findFirst({
      where: and(
        eq(programCampaigns.companyId, user.companyId),
        eq(programCampaigns.status, 'active')
      ),
      with: {
        program: true,
      },
    });

    if (campaign && campaign.program.programType === programType) {
      logger.info(
        { userId, programType, campaignId: campaign.id, programId: campaign.programId },
        'Found program context for enrollment'
      );

      return {
        programId: campaign.programId,
        campaignId: campaign.id,
        beneficiaryGroupId: campaign.program.beneficiaryGroupId || null,
      };
    }

    // Step 3: Fallback - find any active program matching programType
    const program = await db.query.programs.findFirst({
      where: and(
        eq(programs.programType, programType),
        eq(programs.status, 'active')
      ),
    });

    if (program) {
      logger.info(
        { userId, programType, programId: program.id },
        'Found fallback program (no campaign)'
      );

      return {
        programId: program.id,
        campaignId: null,
        beneficiaryGroupId: program.beneficiaryGroupId || null,
      };
    }

    logger.warn({ userId, programType }, 'No matching program found');
    return { programId: null, campaignId: null, beneficiaryGroupId: null };
  } catch (error) {
    logger.error({ error, userId, programType }, 'Error looking up program context');
    return { programId: null, campaignId: null, beneficiaryGroupId: null };
  }
}

export async function setupSubscribers(eventBus: EventBus) {
  // Subscribe to upskilling.course.completed -> Update profile flag
  // Agent 21: enrollment-gateway-enhancer - Ensure dual-write on enrollment creation
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
      } else {
        // If enrollment doesn't exist, create it (with program context)
        const programContext = await lookupProgramContext(event.data.userId, 'upskilling');

        await db.insert(programEnrollments).values({
          userId: event.data.userId,
          programType: 'upskilling', // LEGACY: Backward compatibility
          programId: programContext.programId || undefined,
          campaignId: programContext.campaignId || undefined,
          beneficiaryGroupId: programContext.beneficiaryGroupId || undefined,
          sourceSystem: 'upskilling',
          sourceId: event.data.courseId,
          status: 'completed',
          completedAt: new Date(),
        });

        logger.info(
          { userId: event.data.userId, programContext },
          'Created completed enrollment with program context'
        );
      }
    }
  );

  // Subscribe to kintell.session.completed -> Update language/mentorship flags
  // Agent 19: kintell-program-linker - Enhanced with program context lookup
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
        // Lookup program context (dual-write pattern)
        const programContext = await lookupProgramContext(
          event.data.participantId,
          programType
        );

        // Create enrollment if not exists with program context
        await db.insert(programEnrollments).values({
          userId: event.data.participantId,
          programType, // LEGACY: Backward compatibility
          programId: programContext.programId || undefined,
          campaignId: programContext.campaignId || undefined,
          beneficiaryGroupId: programContext.beneficiaryGroupId || undefined,
          sourceSystem: 'kintell',
          sourceId: event.data.externalSessionId,
          status: 'active',
        });

        logger.info(
          {
            userId: event.data.participantId,
            programType,
            programId: programContext.programId,
            campaignId: programContext.campaignId,
          },
          'Created enrollment with program context'
        );
      }
    }
  );

  // Subscribe to buddy.match.created -> Update buddy flag
  // Agent 20: buddy-program-linker - Enhanced with program context lookup
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
      // Lookup program context (dual-write pattern)
      const programContext = await lookupProgramContext(
        event.data.participantId,
        'buddy'
      );

      // Create enrollment with program context
      await db.insert(programEnrollments).values({
        userId: event.data.participantId,
        programType: 'buddy', // LEGACY: Backward compatibility
        programId: programContext.programId || undefined,
        campaignId: programContext.campaignId || undefined,
        beneficiaryGroupId: programContext.beneficiaryGroupId || undefined,
        sourceSystem: 'buddy',
        sourceId: event.data.matchId,
        status: 'active',
      });

      logger.info(
        {
          userId: event.data.participantId,
          programType: 'buddy',
          programId: programContext.programId,
          campaignId: programContext.campaignId,
        },
        'Created enrollment with program context'
      );
    }
  });

  logger.info('Event subscribers initialized');
}
