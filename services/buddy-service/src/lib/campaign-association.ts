/**
 * Campaign Association Helper for Buddy Service
 *
 * SWARM 6: Agent 4.3 (ingestion-enhancer)
 *
 * Integrates with Agent 3.2's activity-associator to link buddy matches
 * to campaigns during ingestion.
 *
 * Fallback Strategy:
 * - If association succeeds with high confidence (>80%), auto-link
 * - If association has medium confidence (40-80%), store NULL and log for review
 * - If association fails (<40% or error), store NULL and continue
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-service:campaign-association');

// Import association function from campaigns service
let associateBuddyMatchToCampaign: any;

try {
  // Dynamic import to avoid hard dependency if campaigns service not available
  const module = await import('../../../campaigns/src/lib/activity-associator.js');
  associateBuddyMatchToCampaign = module.associateBuddyMatchToCampaign;
} catch (error) {
  logger.warn('Campaign service not available - buddy match association disabled');
  associateBuddyMatchToCampaign = null;
}

/**
 * Associate a buddy match to a campaign during ingestion
 *
 * @param matchId - Match ID
 * @param participantId - Participant user ID
 * @param buddyId - Buddy user ID
 * @param companyId - Company ID
 * @param matchDate - Match date
 * @returns Program instance ID if associated, null otherwise
 */
export async function associateMatchDuringIngestion(
  matchId: string,
  participantId: string,
  buddyId: string,
  companyId: string,
  matchDate: Date
): Promise<string | null> {
  // If association function not available, return null (graceful degradation)
  if (!associateBuddyMatchToCampaign) {
    return null;
  }

  try {
    const startTime = Date.now();

    // Call Agent 3.2's association logic
    const result = await associateBuddyMatchToCampaign(
      matchId,
      participantId,
      buddyId,
      companyId,
      matchDate
    );

    const duration = Date.now() - startTime;

    // Log association result
    logger.debug(
      {
        matchId,
        campaignId: result.campaignId,
        programInstanceId: result.programInstanceId,
        confidence: result.confidence,
        requiresReview: result.requiresReview,
        durationMs: duration,
      },
      'Buddy match association result'
    );

    // Performance check
    if (duration > 10) {
      logger.warn(
        { matchId, durationMs: duration },
        'Buddy match association exceeded 10ms performance target'
      );
    }

    // Auto-link if high confidence
    if (result.confidence >= 80 && result.programInstanceId) {
      logger.info(
        {
          matchId,
          campaignId: result.campaignId,
          programInstanceId: result.programInstanceId,
          confidence: result.confidence,
        },
        'Buddy match auto-associated to campaign'
      );
      return result.programInstanceId;
    }

    // Medium confidence: Log for manual review
    if (result.confidence >= 40 && result.requiresReview) {
      logger.info(
        {
          matchId,
          campaignId: result.campaignId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Buddy match requires manual review for campaign association'
      );
      return null;
    }

    // Low confidence or no match
    if (result.confidence < 40 || !result.campaignId) {
      logger.debug(
        {
          matchId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Buddy match not associated to campaign (low confidence or no match)'
      );
      return null;
    }

    return null;
  } catch (error) {
    // Graceful degradation
    logger.error(
      {
        error,
        matchId,
        participantId,
        companyId,
      },
      'Error associating buddy match to campaign - continuing without association'
    );
    return null;
  }
}
