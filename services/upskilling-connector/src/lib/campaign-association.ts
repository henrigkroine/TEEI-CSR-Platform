/**
 * Campaign Association Helper for Upskilling Connector
 *
 * SWARM 6: Agent 4.3 (ingestion-enhancer)
 *
 * Integrates with Agent 3.2's activity-associator to link course completions
 * to campaigns during ingestion.
 *
 * Fallback Strategy:
 * - If association succeeds with high confidence (>80%), auto-link
 * - If association has medium confidence (40-80%), store NULL and log for review
 * - If association fails (<40% or error), store NULL and continue
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('upskilling-connector:campaign-association');

// Import association function from campaigns service
let associateUpskillingCompletionToCampaign: any;

try {
  // Dynamic import to avoid hard dependency if campaigns service not available
  const module = await import('../../../campaigns/src/lib/activity-associator.js');
  associateUpskillingCompletionToCampaign = module.associateUpskillingCompletionToCampaign;
} catch (error) {
  logger.warn('Campaign service not available - course completion association disabled');
  associateUpskillingCompletionToCampaign = null;
}

/**
 * Associate a course completion to a campaign during ingestion
 *
 * @param completionId - Learning progress record ID
 * @param userId - User ID
 * @param companyId - Company ID
 * @param completionDate - Completion date
 * @returns Program instance ID if associated, null otherwise
 */
export async function associateCompletionDuringIngestion(
  completionId: string,
  userId: string,
  companyId: string,
  completionDate: Date
): Promise<string | null> {
  // If association function not available, return null (graceful degradation)
  if (!associateUpskillingCompletionToCampaign) {
    return null;
  }

  try {
    const startTime = Date.now();

    // Call Agent 3.2's association logic
    const result = await associateUpskillingCompletionToCampaign(
      completionId,
      userId,
      companyId,
      completionDate
    );

    const duration = Date.now() - startTime;

    // Log association result
    logger.debug(
      {
        completionId,
        campaignId: result.campaignId,
        programInstanceId: result.programInstanceId,
        confidence: result.confidence,
        requiresReview: result.requiresReview,
        durationMs: duration,
      },
      'Course completion association result'
    );

    // Performance check
    if (duration > 10) {
      logger.warn(
        { completionId, durationMs: duration },
        'Course completion association exceeded 10ms performance target'
      );
    }

    // Auto-link if high confidence
    if (result.confidence >= 80 && result.programInstanceId) {
      logger.info(
        {
          completionId,
          campaignId: result.campaignId,
          programInstanceId: result.programInstanceId,
          confidence: result.confidence,
        },
        'Course completion auto-associated to campaign'
      );
      return result.programInstanceId;
    }

    // Medium confidence: Log for manual review
    if (result.confidence >= 40 && result.requiresReview) {
      logger.info(
        {
          completionId,
          campaignId: result.campaignId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Course completion requires manual review for campaign association'
      );
      return null;
    }

    // Low confidence or no match
    if (result.confidence < 40 || !result.campaignId) {
      logger.debug(
        {
          completionId,
          confidence: result.confidence,
          reasons: result.matchReasons,
        },
        'Course completion not associated to campaign (low confidence or no match)'
      );
      return null;
    }

    return null;
  } catch (error) {
    // Graceful degradation
    logger.error(
      {
        error,
        completionId,
        userId,
        companyId,
      },
      'Error associating course completion to campaign - continuing without association'
    );
    return null;
  }
}
