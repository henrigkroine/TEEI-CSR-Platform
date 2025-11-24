/**
 * Campaign Association Helper
 *
 * SWARM 6: Agent 4.3 (ingestion-enhancer)
 *
 * Integrates with Agent 3.2's activity-associator to link Kintell sessions
 * to campaigns during ingestion.
 *
 * Fallback Strategy:
 * - If association succeeds with high confidence (>80%), auto-link
 * - If association has medium confidence (40-80%), store NULL and log for review
 * - If association fails (<40% or error), store NULL and continue
 * - Performance: <10ms overhead per session target
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('kintell-connector:campaign-association');

// Import association function from campaigns service
// Note: This creates a dependency on campaigns service
// Alternative: Could use HTTP API call to campaigns service
let associateSessionToCampaign: any;

try {
  // Dynamic import to avoid hard dependency if campaigns service not available
  const module = await import('../../../campaigns/src/lib/activity-associator.js');
  associateSessionToCampaign = module.associateSessionToCampaign;
} catch (error) {
  logger.warn('Campaign service not available - session association disabled');
  associateSessionToCampaign = null;
}

/**
 * Associate a session to a campaign during ingestion
 *
 * @param sessionId - Session ID
 * @param participantId - Participant user ID
 * @param volunteerId - Volunteer user ID
 * @param companyId - Company ID
 * @param sessionDate - Session date
 * @returns Program instance ID if associated, null otherwise
 */
export async function associateSessionDuringIngestion(
  sessionId: string,
  participantId: string,
  volunteerId: string,
  companyId: string,
  sessionDate: Date
): Promise<string | null> {
  // If association function not available, return null (graceful degradation)
  if (!associateSessionToCampaign) {
    return null;
  }

  try {
    const startTime = Date.now();

    // Call Agent 3.2's association logic
    const result = await associateSessionToCampaign(
      sessionId,
      participantId, // Use participant as primary user for matching
      companyId,
      sessionDate
    );

    const duration = Date.now() - startTime;

    // Log association result
    logger.debug(
      {
        sessionId,
        campaignId: result.campaignId,
        programInstanceId: result.programInstanceId,
        confidence: result.confidence,
        requiresReview: result.requiresReview,
        durationMs: duration,
      },
      'Session association result'
    );

    // Performance check: Warn if >10ms
    if (duration > 10) {
      logger.warn(
        { sessionId, durationMs: duration },
        'Session association exceeded 10ms performance target'
      );
    }

    // Auto-link if confidence > 80% (high confidence)
    if (result.confidence >= 80 && result.programInstanceId) {
      logger.info(
        {
          sessionId,
          campaignId: result.campaignId,
          programInstanceId: result.programInstanceId,
          confidence: result.confidence,
        },
        'Session auto-associated to campaign'
      );
      return result.programInstanceId;
    }

    // Medium confidence (40-80%): Log for manual review
    if (result.confidence >= 40 && result.requiresReview) {
      logger.info(
        {
          sessionId,
          campaignId: result.campaignId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Session requires manual review for campaign association'
      );
      // Could publish event to manual review queue here
      return null;
    }

    // Low confidence (<40%) or no match: Skip association
    if (result.confidence < 40 || !result.campaignId) {
      logger.debug(
        {
          sessionId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Session not associated to campaign (low confidence or no match)'
      );
      return null;
    }

    return null;
  } catch (error) {
    // Graceful degradation: Log error but don't fail ingestion
    logger.error(
      {
        error,
        sessionId,
        participantId,
        companyId,
      },
      'Error associating session to campaign - continuing without association'
    );
    return null;
  }
}

/**
 * Get company ID for a user (helper function)
 *
 * @param userId - User ID
 * @returns Company ID or null
 */
export async function getUserCompanyId(userId: string): Promise<string | null> {
  try {
    // Import here to avoid circular dependencies
    const { db, users, companies } = await import('@teei/shared-schema');
    const { eq } = await import('drizzle-orm');

    const userRecord = await db
      .select({
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userRecord.length > 0 ? userRecord[0].companyId : null;
  } catch (error) {
    logger.error({ error, userId }, 'Error getting user company ID');
    return null;
  }
}
