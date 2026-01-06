/**
 * Achievement Transformer - Buddy Milestones → CSR Outcomes
 *
 * Transforms Buddy Program milestones and achievements into CSR outcome records
 * for integration with VIS Outcome Lift and SROI calculations.
 *
 * @module ingestion-buddy/transformers/achievement-transformer
 * @agent Agent 12 (buddy-transformer-achievements)
 */

import { createServiceLogger } from '@teei/shared-utils';
import type { Milestone, Feedback } from '../validators/schemas';

const logger = createServiceLogger('ingestion-buddy:achievement-transformer');

/**
 * CSR outcome record
 */
export interface CsrOutcome {
  userId: string;                // CSR user ID (beneficiary or volunteer)
  programId: string;             // Buddy Program ID
  outcomeType: string;           // Outcome category
  outcomeDate: string;           // ISO 8601 timestamp
  outcomeName: string;           // Human-readable outcome name
  outcomeValue: number | null;   // Quantitative value (if applicable)
  outcomeText: string | null;    // Qualitative description
  impactDimension: string;       // VIS/SROI dimension
  metadata: Record<string, any>; // Original Buddy data
}

/**
 * Milestone type → CSR outcome type mapping
 */
const MILESTONE_OUTCOME_MAP: Record<
  string,
  { outcomeType: string; impactDimension: string }
> = {
  // Community integration milestones
  first_meeting: {
    outcomeType: 'community_integration',
    impactDimension: 'integration_score',
  },
  community_milestone: {
    outcomeType: 'community_integration',
    impactDimension: 'integration_score',
  },

  // Skill development milestones
  skill_milestone: {
    outcomeType: 'skill_development',
    impactDimension: 'job_readiness',
  },

  // Social connection milestones
  first_call: {
    outcomeType: 'social_connection',
    impactDimension: 'belonging',
  },

  // Custom milestones (default to well-being)
  custom: {
    outcomeType: 'custom_achievement',
    impactDimension: 'well_being',
  },
};

/**
 * Quantify milestone value for SROI
 *
 * Estimates outcome value contribution based on milestone type.
 * Values are rough proxies for SROI dimension improvements.
 */
function quantifyMilestoneValue(milestoneType: string): number | null {
  const valueMap: Record<string, number> = {
    first_meeting: 0.1,        // +0.1 integration score improvement
    first_call: 0.1,           // +0.1 belonging improvement
    skill_milestone: 0.05,     // +0.05 job readiness improvement
    community_milestone: 0.15, // +0.15 integration improvement
    custom: 0.05,              // +0.05 general well-being
  };

  return valueMap[milestoneType] || null;
}

/**
 * Transform Buddy milestone into CSR outcome
 *
 * @param milestone - Validated Buddy milestone
 * @param userIdMapping - Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns CSR outcome (or null if user not mapped)
 */
export function transformMilestone(
  milestone: Milestone,
  userIdMapping: Map<string, string>,
  programId: string
): CsrOutcome | null {
  const csrUserId = userIdMapping.get(milestone.user_id);

  if (!csrUserId) {
    logger.debug(
      { milestoneId: milestone.milestone_id, buddyUserId: milestone.user_id },
      'Skipping milestone: user not found in mapping'
    );
    return null;
  }

  const mapping = MILESTONE_OUTCOME_MAP[milestone.milestone_type] || {
    outcomeType: 'custom_achievement',
    impactDimension: 'well_being',
  };

  const outcomeValue = quantifyMilestoneValue(milestone.milestone_type);

  logger.debug(
    {
      milestoneId: milestone.milestone_id,
      milestoneType: milestone.milestone_type,
      outcomeType: mapping.outcomeType,
    },
    'Transforming milestone to CSR outcome'
  );

  return {
    userId: csrUserId,
    programId,
    outcomeType: mapping.outcomeType,
    outcomeDate: milestone.achieved_at,
    outcomeName: milestone.milestone_name,
    outcomeValue,
    outcomeText: milestone.description || null,
    impactDimension: mapping.impactDimension,
    metadata: {
      buddy_milestone_id: milestone.milestone_id,
      milestone_type: milestone.milestone_type,
      buddy_metadata: milestone.metadata,
    },
  };
}

/**
 * Transform feedback into outcome (for VIS Quality Score)
 *
 * High-quality feedback (rating ≥ 0.8) can be treated as a positive outcome indicator.
 *
 * @param feedback - Validated feedback
 * @param userIdMapping - Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns CSR outcome for high-quality feedback
 */
export function transformFeedbackToOutcome(
  feedback: Feedback,
  userIdMapping: Map<string, string>,
  programId: string
): CsrOutcome | null {
  // Only convert high-quality feedback (≥ 0.8) to outcomes
  if (feedback.rating < 0.8) {
    return null;
  }

  const csrUserId = userIdMapping.get(feedback.to_user_id);

  if (!csrUserId) {
    return null;
  }

  logger.debug(
    {
      feedbackId: feedback.feedback_id,
      rating: feedback.rating,
      feedbackType: feedback.feedback_type,
    },
    'Transforming high-quality feedback to outcome'
  );

  return {
    userId: csrUserId,
    programId,
    outcomeType: 'positive_feedback',
    outcomeDate: feedback.submitted_at,
    outcomeName: `High-quality ${feedback.feedback_type} feedback received`,
    outcomeValue: feedback.rating, // Rating as outcome value
    outcomeText: feedback.feedback_text || null,
    impactDimension: 'confidence', // Positive feedback → confidence boost
    metadata: {
      buddy_feedback_id: feedback.feedback_id,
      feedback_type: feedback.feedback_type,
      rating: feedback.rating,
      feedback_categories: feedback.feedback_categories,
    },
  };
}

/**
 * Batch transformation result
 */
export interface AchievementTransformResult {
  outcomes: CsrOutcome[];
  stats: {
    totalOutcomes: number;
    fromMilestones: number;
    fromFeedback: number;
    byOutcomeType: Record<string, number>;
    byImpactDimension: Record<string, number>;
    totalOutcomeValue: number;
  };
  errors: Array<{
    sourceId: string;
    sourceType: string;
    error: string;
  }>;
}

/**
 * Transform batch of milestones and feedback into outcomes
 *
 * @param data - Validated milestone and feedback data
 * @param userIdMapping - Buddy user ID → CSR user ID
 * @param programId - Buddy Program ID
 * @returns Transformation result with stats
 */
export function transformAchievementsBatch(
  data: {
    milestones: Milestone[];
    feedback: Feedback[];
  },
  userIdMapping: Map<string, string>,
  programId: string
): AchievementTransformResult {
  logger.info(
    {
      milestones: data.milestones.length,
      feedback: data.feedback.length,
    },
    'Starting batch achievement transformation'
  );

  const outcomes: CsrOutcome[] = [];
  const errors: Array<{ sourceId: string; sourceType: string; error: string }> = [];

  let fromMilestones = 0;
  let fromFeedback = 0;

  // Transform milestones
  for (const milestone of data.milestones) {
    try {
      const outcome = transformMilestone(milestone, userIdMapping, programId);
      if (outcome) {
        outcomes.push(outcome);
        fromMilestones++;
      }
    } catch (err: any) {
      errors.push({
        sourceId: milestone.milestone_id,
        sourceType: 'milestone',
        error: err.message,
      });
    }
  }

  // Transform high-quality feedback
  for (const feedback of data.feedback) {
    try {
      const outcome = transformFeedbackToOutcome(feedback, userIdMapping, programId);
      if (outcome) {
        outcomes.push(outcome);
        fromFeedback++;
      }
    } catch (err: any) {
      errors.push({
        sourceId: feedback.feedback_id,
        sourceType: 'feedback',
        error: err.message,
      });
    }
  }

  // Calculate statistics
  const byOutcomeType: Record<string, number> = {};
  const byImpactDimension: Record<string, number> = {};
  let totalOutcomeValue = 0;

  for (const outcome of outcomes) {
    byOutcomeType[outcome.outcomeType] = (byOutcomeType[outcome.outcomeType] || 0) + 1;
    byImpactDimension[outcome.impactDimension] =
      (byImpactDimension[outcome.impactDimension] || 0) + 1;

    if (outcome.outcomeValue !== null) {
      totalOutcomeValue += outcome.outcomeValue;
    }
  }

  const result: AchievementTransformResult = {
    outcomes,
    stats: {
      totalOutcomes: outcomes.length,
      fromMilestones,
      fromFeedback,
      byOutcomeType,
      byImpactDimension,
      totalOutcomeValue,
    },
    errors,
  };

  logger.info(
    {
      totalOutcomes: outcomes.length,
      fromMilestones,
      fromFeedback,
      totalOutcomeValue: totalOutcomeValue.toFixed(2),
      errorCount: errors.length,
    },
    'Batch achievement transformation complete'
  );

  return result;
}

/**
 * Summarize achievement transformations
 */
export function summarizeAchievementTransformations(
  result: AchievementTransformResult
): string {
  const lines: string[] = [
    '--- Achievement Transformation Summary ---',
    '',
    `Total Outcomes: ${result.stats.totalOutcomes}`,
    `  - From Milestones: ${result.stats.fromMilestones}`,
    `  - From Feedback: ${result.stats.fromFeedback}`,
    '',
    'By Outcome Type:',
  ];

  for (const [type, count] of Object.entries(result.stats.byOutcomeType)) {
    lines.push(`  - ${type}: ${count}`);
  }

  lines.push('');
  lines.push('By Impact Dimension (VIS/SROI):');
  for (const [dimension, count] of Object.entries(result.stats.byImpactDimension)) {
    lines.push(`  - ${dimension}: ${count}`);
  }

  lines.push('');
  lines.push(`Total Outcome Value: ${result.stats.totalOutcomeValue.toFixed(2)}`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error.sourceType} ${error.sourceId}: ${error.error}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
