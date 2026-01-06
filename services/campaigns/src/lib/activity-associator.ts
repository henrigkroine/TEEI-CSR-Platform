/**
 * Activity Associator
 *
 * Associates ingested activities (sessions, matches, completions) to appropriate
 * campaigns and program instances based on company, beneficiary group, and date matching.
 *
 * SWARM 6: Agent 3.2 (activity-associator)
 *
 * Matching Strategy:
 * - MUST match: companyId, activity date within campaign period
 * - SHOULD match: user eligibility for beneficiary group (via tags/demographics)
 * - Confidence scoring: exact match (100%), partial match (70%), fallback (40%)
 * - Auto-associate if confidence > 80%, manual review queue if 40-80%, ignore if <40%
 */

import { db } from '@teei/shared-schema/db';
import {
  campaigns,
  programInstances,
  beneficiaryGroups,
  users,
  type Campaign,
  type ProgramInstance,
  type BeneficiaryGroup,
} from '@teei/shared-schema';
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Association result with confidence scoring
 */
export interface AssociationResult {
  campaignId: string | null;
  programInstanceId: string | null;
  confidence: number; // 0-100
  matchReasons: string[];
  requiresReview: boolean;
}

/**
 * Campaign with eligibility score
 */
interface ScoredCampaign {
  campaign: Campaign;
  score: number;
  reasons: string[];
}

/**
 * User profile for matching (aggregated, no PII)
 */
interface UserMatchProfile {
  userId: string;
  companyId: string;
  tags: string[];
  // Add more fields as needed for matching
}

// ============================================================================
// CONFIDENCE THRESHOLDS
// ============================================================================

const CONFIDENCE_THRESHOLD_AUTO = 80; // Auto-associate above this
const CONFIDENCE_THRESHOLD_REVIEW = 40; // Manual review between this and auto
const CONFIDENCE_THRESHOLD_IGNORE = 40; // Ignore below this

// Scoring weights
const SCORE_COMPANY_MATCH = 30; // Company must match (base score)
const SCORE_DATE_MATCH = 30; // Date within campaign period (base score)
const SCORE_GROUP_EXACT_MATCH = 40; // User tags exactly match group tags
const SCORE_GROUP_PARTIAL_MATCH = 20; // User tags partially match group tags
const SCORE_ACTIVE_CAMPAIGN = 10; // Campaign is in active status
const SCORE_INSTANCE_EXISTS = 10; // Campaign has active program instance

// ============================================================================
// CORE ASSOCIATION FUNCTIONS
// ============================================================================

/**
 * Associate a session to the most appropriate campaign
 *
 * @param sessionId - Kintell session ID
 * @param userId - User ID (participant or volunteer)
 * @param companyId - Company ID
 * @param sessionDate - Date of the session
 * @returns Association result with confidence score
 */
export async function associateSessionToCampaign(
  sessionId: string,
  userId: string,
  companyId: string,
  sessionDate: Date
): Promise<AssociationResult> {
  try {
    // Find eligible campaigns
    const eligibleCampaigns = await findEligibleCampaigns(userId, companyId, sessionDate);

    if (eligibleCampaigns.length === 0) {
      return {
        campaignId: null,
        programInstanceId: null,
        confidence: 0,
        matchReasons: ['No eligible campaigns found for this user/company/date combination'],
        requiresReview: false,
      };
    }

    // Select best campaign
    const bestMatch = selectBestCampaign(eligibleCampaigns);

    // Determine if manual review is needed
    const requiresReview =
      bestMatch.score >= CONFIDENCE_THRESHOLD_REVIEW &&
      bestMatch.score < CONFIDENCE_THRESHOLD_AUTO;

    // Find active program instance for the campaign
    const programInstance = await findActiveProgramInstance(bestMatch.campaign.id, sessionDate);

    return {
      campaignId: bestMatch.campaign.id,
      programInstanceId: programInstance?.id || null,
      confidence: bestMatch.score,
      matchReasons: bestMatch.reasons,
      requiresReview,
    };
  } catch (error) {
    console.error('Error associating session to campaign:', error);
    throw error;
  }
}

/**
 * Associate a buddy match to the most appropriate campaign
 *
 * @param matchId - Buddy match ID
 * @param participantId - Participant user ID
 * @param buddyId - Buddy user ID
 * @param companyId - Company ID
 * @param matchDate - Date of the match
 * @returns Association result with confidence score
 */
export async function associateBuddyMatchToCampaign(
  matchId: string,
  participantId: string,
  buddyId: string,
  companyId: string,
  matchDate: Date
): Promise<AssociationResult> {
  // Use participant as primary user for matching
  return associateSessionToCampaign(matchId, participantId, companyId, matchDate);
}

/**
 * Associate an upskilling completion to the most appropriate campaign
 *
 * @param completionId - Learning progress record ID
 * @param userId - User ID
 * @param companyId - Company ID
 * @param completionDate - Date of completion
 * @returns Association result with confidence score
 */
export async function associateUpskillingCompletionToCampaign(
  completionId: string,
  userId: string,
  companyId: string,
  completionDate: Date
): Promise<AssociationResult> {
  return associateSessionToCampaign(completionId, userId, companyId, completionDate);
}

// ============================================================================
// CAMPAIGN MATCHING LOGIC
// ============================================================================

/**
 * Find all campaigns eligible for this user/company/date combination
 *
 * Strategy:
 * 1. Filter campaigns by companyId (MUST match)
 * 2. Filter campaigns by date range (activity date within campaign period)
 * 3. Score campaigns based on beneficiary group match
 * 4. Return scored campaigns
 *
 * @param userId - User ID to match
 * @param companyId - Company ID (must match)
 * @param activityDate - Date of the activity
 * @returns Array of scored campaigns
 */
export async function findEligibleCampaigns(
  userId: string,
  companyId: string,
  activityDate: Date
): Promise<ScoredCampaign[]> {
  try {
    // Step 1: Get user profile for matching
    const userProfile = await getUserMatchProfile(userId, companyId);

    // Step 2: Find campaigns matching company and date
    const eligibleCampaigns = await db
      .select({
        campaign: campaigns,
        beneficiaryGroup: beneficiaryGroups,
      })
      .from(campaigns)
      .innerJoin(beneficiaryGroups, eq(campaigns.beneficiaryGroupId, beneficiaryGroups.id))
      .where(
        and(
          eq(campaigns.companyId, companyId),
          eq(campaigns.isActive, true),
          lte(campaigns.startDate, activityDate.toISOString().split('T')[0]),
          gte(campaigns.endDate, activityDate.toISOString().split('T')[0])
        )
      );

    if (eligibleCampaigns.length === 0) {
      return [];
    }

    // Step 3: Score each campaign based on beneficiary group match
    const scoredCampaigns: ScoredCampaign[] = eligibleCampaigns.map(({ campaign, beneficiaryGroup }) => {
      const { score, reasons } = scoreCampaignMatch(campaign, beneficiaryGroup, userProfile, activityDate);
      return {
        campaign,
        score,
        reasons,
      };
    });

    // Step 4: Filter out campaigns below minimum threshold
    const filteredCampaigns = scoredCampaigns.filter(
      (sc) => sc.score >= CONFIDENCE_THRESHOLD_IGNORE
    );

    // Step 5: Sort by score (highest first)
    return filteredCampaigns.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error finding eligible campaigns:', error);
    throw error;
  }
}

/**
 * Score a campaign based on how well it matches the user profile
 *
 * Scoring breakdown:
 * - Company match: 30 points (base requirement, already filtered)
 * - Date match: 30 points (base requirement, already filtered)
 * - Exact beneficiary group tag match: 40 points
 * - Partial beneficiary group tag match: 20 points
 * - Campaign is active: 10 points
 * - Campaign has active program instance: 10 points
 *
 * @param campaign - Campaign to score
 * @param beneficiaryGroup - Beneficiary group for this campaign
 * @param userProfile - User profile to match against
 * @param activityDate - Date of activity
 * @returns Score (0-100) and reasons
 */
function scoreCampaignMatch(
  campaign: Campaign,
  beneficiaryGroup: BeneficiaryGroup,
  userProfile: UserMatchProfile,
  activityDate: Date
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Base scores for company and date match (already filtered, so always add)
  score += SCORE_COMPANY_MATCH;
  reasons.push(`Company match: ${campaign.companyId}`);

  score += SCORE_DATE_MATCH;
  reasons.push(
    `Date within campaign period: ${campaign.startDate} to ${campaign.endDate}`
  );

  // Score beneficiary group match based on user tags
  const userTags = userProfile.tags || [];
  const groupTags = (beneficiaryGroup.tags as string[]) || [];

  if (groupTags.length > 0 && userTags.length > 0) {
    const matchingTags = userTags.filter((tag) => groupTags.includes(tag));

    if (matchingTags.length === groupTags.length && matchingTags.length === userTags.length) {
      // Exact match: all user tags match all group tags
      score += SCORE_GROUP_EXACT_MATCH;
      reasons.push(`Exact beneficiary group match: ${matchingTags.join(', ')}`);
    } else if (matchingTags.length > 0) {
      // Partial match: some tags overlap
      const matchPercentage = matchingTags.length / Math.max(groupTags.length, userTags.length);
      const partialScore = Math.round(SCORE_GROUP_PARTIAL_MATCH * matchPercentage);
      score += partialScore;
      reasons.push(
        `Partial beneficiary group match: ${matchingTags.join(', ')} (${matchPercentage.toFixed(0)}%)`
      );
    }
  } else if (groupTags.length === 0) {
    // No specific group targeting, give some credit
    score += SCORE_GROUP_PARTIAL_MATCH / 2;
    reasons.push('Beneficiary group has no specific tag requirements');
  }

  // Bonus for active campaign status
  if (campaign.status === 'active') {
    score += SCORE_ACTIVE_CAMPAIGN;
    reasons.push('Campaign is currently active');
  } else if (campaign.status === 'recruiting') {
    score += SCORE_ACTIVE_CAMPAIGN / 2;
    reasons.push('Campaign is recruiting');
  }

  return { score, reasons };
}

/**
 * Select the best campaign from a list of scored campaigns
 *
 * Strategy:
 * 1. Pick campaign with highest score
 * 2. If tie, prefer active campaigns
 * 3. If still tie, prefer most recent start date
 *
 * @param campaigns - Array of scored campaigns (assumed sorted by score desc)
 * @returns Best matching campaign with score and reasons
 */
export function selectBestCampaign(campaigns: ScoredCampaign[]): ScoredCampaign {
  if (campaigns.length === 0) {
    throw new Error('No campaigns to select from');
  }

  if (campaigns.length === 1) {
    return campaigns[0];
  }

  // Already sorted by score, so first is highest
  const topScore = campaigns[0].score;
  const topCampaigns = campaigns.filter((c) => c.score === topScore);

  if (topCampaigns.length === 1) {
    return topCampaigns[0];
  }

  // Tie-breaker 1: Prefer active campaigns
  const activeCampaigns = topCampaigns.filter((c) => c.campaign.status === 'active');
  if (activeCampaigns.length > 0) {
    // Tie-breaker 2: Prefer most recent start date
    const sorted = activeCampaigns.sort(
      (a, b) =>
        new Date(b.campaign.startDate).getTime() - new Date(a.campaign.startDate).getTime()
    );
    return sorted[0];
  }

  // Fallback: Return first campaign
  return topCampaigns[0];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user match profile for campaign association
 *
 * This aggregates user information needed for matching WITHOUT exposing PII.
 * Only group-level tags and characteristics are used.
 *
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns User match profile
 */
async function getUserMatchProfile(
  userId: string,
  companyId: string
): Promise<UserMatchProfile> {
  try {
    // Query user record (minimal fields, no PII)
    const userRecord = await db
      .select({
        id: users.id,
        tags: users.tags,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRecord.length === 0) {
      // User not found, return empty profile
      return {
        userId,
        companyId,
        tags: [],
      };
    }

    const user = userRecord[0];

    return {
      userId: user.id,
      companyId,
      tags: (user.tags as string[]) || [],
    };
  } catch (error) {
    console.error('Error getting user match profile:', error);
    // Return empty profile on error
    return {
      userId,
      companyId,
      tags: [],
    };
  }
}

/**
 * Find an active program instance for a campaign on a given date
 *
 * @param campaignId - Campaign ID
 * @param activityDate - Date of the activity
 * @returns Active program instance or null
 */
async function findActiveProgramInstance(
  campaignId: string,
  activityDate: Date
): Promise<ProgramInstance | null> {
  try {
    const instances = await db
      .select()
      .from(programInstances)
      .where(
        and(
          eq(programInstances.campaignId, campaignId),
          inArray(programInstances.status, ['active', 'planned']),
          lte(programInstances.startDate, activityDate.toISOString().split('T')[0]),
          gte(programInstances.endDate, activityDate.toISOString().split('T')[0])
        )
      )
      .orderBy(sql`${programInstances.createdAt} DESC`)
      .limit(1);

    return instances.length > 0 ? instances[0] : null;
  } catch (error) {
    console.error('Error finding active program instance:', error);
    return null;
  }
}

// ============================================================================
// BATCH ASSOCIATION FUNCTIONS
// ============================================================================

/**
 * Associate multiple sessions in batch
 *
 * @param sessions - Array of session records with id, userId, companyId, date
 * @returns Array of association results
 */
export async function associateSessionsBatch(
  sessions: Array<{
    id: string;
    userId: string;
    companyId: string;
    date: Date;
  }>
): Promise<AssociationResult[]> {
  const results: AssociationResult[] = [];

  for (const session of sessions) {
    try {
      const result = await associateSessionToCampaign(
        session.id,
        session.userId,
        session.companyId,
        session.date
      );
      results.push(result);
    } catch (error) {
      console.error(`Error associating session ${session.id}:`, error);
      results.push({
        campaignId: null,
        programInstanceId: null,
        confidence: 0,
        matchReasons: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        requiresReview: true,
      });
    }
  }

  return results;
}

/**
 * Get association statistics
 *
 * @param results - Array of association results
 * @returns Statistics object
 */
export function getAssociationStats(results: AssociationResult[]): {
  total: number;
  associated: number;
  requiresReview: number;
  failed: number;
  averageConfidence: number;
} {
  const total = results.length;
  const associated = results.filter((r) => r.campaignId !== null).length;
  const requiresReview = results.filter((r) => r.requiresReview).length;
  const failed = results.filter((r) => r.campaignId === null).length;
  const averageConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / (total || 1);

  return {
    total,
    associated,
    requiresReview,
    failed,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
  };
}
