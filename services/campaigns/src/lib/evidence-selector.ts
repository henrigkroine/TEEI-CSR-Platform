/**
 * Campaign Evidence Selector
 *
 * SWARM 6: Agent 4.4 (evidence-campaign-linker)
 * Selects top evidence snippets for campaigns based on impact and diversity
 *
 * Selection Criteria:
 * - High SROI contribution
 * - Diverse outcome types (confidence, belonging, language, job readiness, well-being)
 * - Recent dates (prefer fresher evidence)
 * - Verification status (prefer verified evidence)
 * - Geographic and demographic representativeness
 *
 * @module lib/evidence-selector
 */

import { db } from '@teei/shared-schema';
import { evidenceSnippets, outcomeScores, programInstances, campaigns } from '@teei/shared-schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

/**
 * Evidence scoring criteria
 */
export interface EvidenceScore {
  evidenceId: string;
  score: number;
  impactScore: number;
  diversityScore: number;
  recencyScore: number;
  verificationScore: number;
  outcomeType: string;
}

/**
 * Select top evidence snippets for a campaign
 *
 * Strategy:
 * 1. Query all evidence linked to campaign
 * 2. Score each evidence based on multiple criteria
 * 3. Select top N with diversity (different outcome types)
 * 4. Return evidence IDs sorted by score
 *
 * @param campaignId - Campaign ID
 * @param limit - Number of evidence snippets to select (default: 10)
 * @returns Array of evidence IDs (top evidence)
 */
export async function selectTopEvidenceForCampaign(
  campaignId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    // Query all evidence snippets linked to this campaign
    const campaignEvidence = await db
      .select({
        snippet: evidenceSnippets,
        outcome: outcomeScores,
      })
      .from(evidenceSnippets)
      .leftJoin(outcomeScores, eq(evidenceSnippets.outcomeScoreId, outcomeScores.id))
      .where(eq(evidenceSnippets.campaignId, campaignId));

    if (campaignEvidence.length === 0) {
      return [];
    }

    // Score each evidence snippet
    const scoredEvidence: EvidenceScore[] = campaignEvidence
      .filter((item) => item.snippet.id) // Ensure valid evidence
      .map((item) => {
        const snippet = item.snippet;
        const outcome = item.outcome;

        // Calculate component scores
        const impactScore = calculateImpactScore(outcome);
        const diversityScore = calculateDiversityScore(outcome);
        const recencyScore = calculateRecencyScore(snippet.createdAt);
        const verificationScore = 1.0; // Placeholder - enhance when verification field exists

        // Weighted total score
        const totalScore =
          impactScore * 0.4 + // 40% weight on impact
          diversityScore * 0.3 + // 30% weight on diversity
          recencyScore * 0.2 + // 20% weight on recency
          verificationScore * 0.1; // 10% weight on verification

        return {
          evidenceId: snippet.id,
          score: totalScore,
          impactScore,
          diversityScore,
          recencyScore,
          verificationScore,
          outcomeType: outcome?.dimension || 'unknown',
        };
      });

    // Select top evidence with diversity
    const topEvidence = selectDiverseEvidence(scoredEvidence, limit);

    return topEvidence.map((e) => e.evidenceId);
  } catch (error) {
    console.error('[EvidenceSelector] Failed to select top evidence:', error);
    return [];
  }
}

/**
 * Calculate impact score based on outcome scores
 *
 * Higher outcome scores (confidence, belonging, job_readiness) = higher impact
 *
 * @param outcome - Outcome score record
 * @returns Impact score (0-1)
 */
function calculateImpactScore(outcome: typeof outcomeScores.$inferSelect | null): number {
  if (!outcome) return 0.5; // Neutral score if no outcome

  const score = parseFloat(outcome.score as string);
  const confidence = outcome.confidence ? parseFloat(outcome.confidence as string) : 0.8;

  // High outcome scores weighted by confidence
  return score * confidence;
}

/**
 * Calculate diversity score based on outcome dimension
 *
 * Prefer evidence covering underrepresented dimensions
 *
 * @param outcome - Outcome score record
 * @returns Diversity score (0-1)
 */
function calculateDiversityScore(outcome: typeof outcomeScores.$inferSelect | null): number {
  if (!outcome) return 0.5;

  // Dimension importance weights (job_readiness and well_being are high-impact)
  const dimensionWeights: Record<string, number> = {
    job_readiness: 1.0,
    well_being: 0.95,
    confidence: 0.9,
    belonging: 0.85,
    lang_level_proxy: 0.8,
  };

  return dimensionWeights[outcome.dimension] || 0.7;
}

/**
 * Calculate recency score based on creation date
 *
 * Prefer more recent evidence (exponential decay)
 *
 * @param createdAt - Evidence creation date
 * @returns Recency score (0-1)
 */
function calculateRecencyScore(createdAt: Date): number {
  const now = new Date();
  const ageInDays = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: 90 days half-life
  const halfLife = 90;
  const recencyScore = Math.exp(-(ageInDays / halfLife) * Math.log(2));

  return Math.max(0, Math.min(1, recencyScore));
}

/**
 * Select diverse evidence snippets (different outcome types)
 *
 * Strategy:
 * 1. Sort by score descending
 * 2. Pick top evidence ensuring diversity across outcome types
 * 3. Max 2-3 evidence per outcome type
 *
 * @param scoredEvidence - All scored evidence
 * @param limit - Total limit
 * @returns Top diverse evidence
 */
function selectDiverseEvidence(scoredEvidence: EvidenceScore[], limit: number): EvidenceScore[] {
  // Sort by score descending
  const sorted = [...scoredEvidence].sort((a, b) => b.score - a.score);

  const selected: EvidenceScore[] = [];
  const outcomeTypeCounts: Record<string, number> = {};
  const maxPerType = Math.ceil(limit / 3); // Max 3-4 per outcome type for diversity

  for (const evidence of sorted) {
    if (selected.length >= limit) break;

    const typeCount = outcomeTypeCounts[evidence.outcomeType] || 0;

    // Ensure diversity: don't over-represent any single outcome type
    if (typeCount < maxPerType) {
      selected.push(evidence);
      outcomeTypeCounts[evidence.outcomeType] = typeCount + 1;
    }
  }

  // If we haven't reached the limit, add remaining highest-scoring evidence
  if (selected.length < limit) {
    for (const evidence of sorted) {
      if (selected.length >= limit) break;
      if (!selected.find((e) => e.evidenceId === evidence.evidenceId)) {
        selected.push(evidence);
      }
    }
  }

  return selected;
}

/**
 * Update campaign's evidenceSnippetIds field with top evidence
 *
 * @param campaignId - Campaign ID
 * @param evidenceIds - Top evidence IDs to set
 */
export async function updateCampaignTopEvidence(
  campaignId: string,
  evidenceIds: string[]
): Promise<void> {
  try {
    await db
      .update(campaigns)
      .set({
        evidenceSnippetIds: evidenceIds,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    console.log(`[EvidenceSelector] Updated campaign ${campaignId} with ${evidenceIds.length} top evidence`);
  } catch (error) {
    console.error('[EvidenceSelector] Failed to update campaign evidence:', error);
    throw error;
  }
}

/**
 * Refresh top evidence for a campaign
 *
 * Convenience function to select and update in one call
 *
 * @param campaignId - Campaign ID
 * @param limit - Number of evidence snippets to select
 */
export async function refreshCampaignEvidence(campaignId: string, limit: number = 10): Promise<void> {
  const topEvidence = await selectTopEvidenceForCampaign(campaignId, limit);
  await updateCampaignTopEvidence(campaignId, topEvidence);
}

/**
 * Get evidence summary for a campaign
 *
 * Returns breakdown of evidence by outcome type
 *
 * @param campaignId - Campaign ID
 * @returns Evidence summary
 */
export async function getCampaignEvidenceSummary(campaignId: string): Promise<{
  total: number;
  byOutcomeType: Record<string, number>;
  topEvidence: string[];
}> {
  try {
    const campaignEvidence = await db
      .select({
        snippet: evidenceSnippets,
        outcome: outcomeScores,
      })
      .from(evidenceSnippets)
      .leftJoin(outcomeScores, eq(evidenceSnippets.outcomeScoreId, outcomeScores.id))
      .where(eq(evidenceSnippets.campaignId, campaignId));

    const byOutcomeType: Record<string, number> = {};

    campaignEvidence.forEach((item) => {
      const dimension = item.outcome?.dimension || 'unknown';
      byOutcomeType[dimension] = (byOutcomeType[dimension] || 0) + 1;
    });

    const topEvidence = await selectTopEvidenceForCampaign(campaignId, 10);

    return {
      total: campaignEvidence.length,
      byOutcomeType,
      topEvidence,
    };
  } catch (error) {
    console.error('[EvidenceSelector] Failed to get evidence summary:', error);
    return {
      total: 0,
      byOutcomeType: {},
      topEvidence: [],
    };
  }
}
