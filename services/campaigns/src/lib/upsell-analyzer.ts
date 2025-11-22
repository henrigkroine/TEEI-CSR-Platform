/**
 * Upsell Opportunity Analyzer
 *
 * SWARM 6: Agent 5.4 - upsell-opportunity-analyzer
 *
 * Purpose: Identify and score upsell opportunities based on campaign utilization,
 * performance metrics, and usage patterns.
 *
 * Scoring Model (0-100):
 * - Capacity: 40 points (utilization %)
 * - Performance: 30 points (SROI/VIS)
 * - Engagement: 20 points (session frequency)
 * - Spend Rate: 10 points (budget burn)
 *
 * Functions:
 * - findExpansionOpportunities: Identify campaigns at >80% capacity
 * - findHighPerformers: Identify campaigns with high SROI/VIS
 * - findBundleOpportunities: Identify companies with multiple successful campaigns
 * - generateUpsellRecommendations: Prioritized upsell list for a company
 * - scoreUpsellOpportunity: Calculate composite upsell score
 */

import { db, eq, and, gte, lte, inArray } from '@teei/shared-schema';
import { campaigns, programInstances, type Campaign } from '@teei/shared-schema';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Individual upsell opportunity
 */
export interface UpsellOpportunity {
  campaignId: string;
  campaignName: string;
  companyId: string;
  programTemplateId: string;
  beneficiaryGroupId: string;
  pricingModel: string;

  // Current metrics
  currentVolunteers: number;
  targetVolunteers: number;
  currentBeneficiaries: number;
  targetBeneficiaries: number;
  capacityUtilization: number;
  budgetSpent: number;
  budgetAllocated: number;
  totalHoursLogged: number;
  currentSessions: number;

  // Performance
  cumulativeSROI: number | null;
  averageVIS: number | null;

  // Scoring
  capacityScore: number;
  performanceScore: number;
  engagementScore: number;
  spendRateScore: number;
  compositeScore: number; // 0-100

  // Recommendations
  recommendationType: 'capacity_expansion' | 'performance_boost' | 'bundle_upgrade' | 'engagement_boost';
  recommendedAction: string;
  estimatedExpansionCost?: number;
  estimatedROI?: number;

  // Metadata
  daysUntilFullCapacity?: number;
  highValueFlag: boolean;
}

/**
 * Company-level upsell opportunity (for bundle upselling)
 */
export interface CompanyUpsellOpportunity {
  companyId: string;
  totalActiveCampaigns: number;
  highPerformingCampaigns: number;
  totalUtilization: number;
  averageSROI: number | null;
  averageVIS: number | null;

  // Opportunity
  compositeScore: number;
  bundleUpsellRecommendation: string;
  estimatedBundleValue: number;

  // Related campaigns
  topPerformingCampaigns: UpsellOpportunity[];
  capacityConstrainedCampaigns: UpsellOpportunity[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const THRESHOLDS = {
  EXPANSION_CAPACITY: 0.80, // >80% capacity = expansion candidate
  HIGH_PERFORMER_SROI: 5.0, // SROI > 5.0 = high performer
  HIGH_PERFORMER_VIS: 80, // VIS > 80 = high performer
  ENGAGEMENT_THRESHOLD: 25, // Sessions/week to consider engaged
  MIN_CAMPAIGNS_FOR_BUNDLE: 2, // Multiple campaigns for bundle upsell
  DAYS_TO_FULL_CAPACITY: 7, // Days at current burn rate to reach 100%
};

const SCORING = {
  CAPACITY_WEIGHT: 0.40,
  PERFORMANCE_WEIGHT: 0.30,
  ENGAGEMENT_WEIGHT: 0.20,
  SPEND_RATE_WEIGHT: 0.10,
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Find campaigns at >80% capacity (expansion candidates)
 *
 * @param companyId - Optional company filter
 * @returns Array of campaigns with high capacity utilization
 */
export async function findExpansionOpportunities(
  companyId?: string
): Promise<UpsellOpportunity[]> {
  const conditions: any[] = [
    gte(campaigns.capacityUtilization, THRESHOLDS.EXPANSION_CAPACITY),
    inArray(campaigns.status, ['active', 'recruiting', 'planned']),
  ];

  if (companyId) {
    conditions.push(eq(campaigns.companyId, companyId));
  }

  const results = await db
    .select()
    .from(campaigns)
    .where(and(...conditions));

  return Promise.all(results.map(campaign => scoreUpsellOpportunity(campaign, 'capacity_expansion')));
}

/**
 * Find high-performing campaigns (SROI > 5 OR VIS > 80)
 *
 * @param companyId - Optional company filter
 * @returns Array of high-performing campaigns
 */
export async function findHighPerformers(companyId?: string): Promise<UpsellOpportunity[]> {
  const conditions: any[] = [inArray(campaigns.status, ['active', 'completed'])];

  if (companyId) {
    conditions.push(eq(campaigns.companyId, companyId));
  }

  // Fetch all active/completed campaigns and filter in memory for SROI/VIS
  const results = await db
    .select()
    .from(campaigns)
    .where(and(...conditions));

  const highPerformers = results.filter(campaign => {
    const sroi = campaign.cumulativeSROI ? parseFloat(campaign.cumulativeSROI.toString()) : 0;
    const vis = campaign.averageVIS ? parseFloat(campaign.averageVIS.toString()) : 0;
    return sroi > THRESHOLDS.HIGH_PERFORMER_SROI || vis > THRESHOLDS.HIGH_PERFORMER_VIS;
  });

  return Promise.all(
    highPerformers.map(campaign => scoreUpsellOpportunity(campaign, 'performance_boost'))
  );
}

/**
 * Find companies running multiple successful campaigns (bundle upsell candidates)
 *
 * @param minActiveCampaigns - Minimum number of active campaigns
 * @returns Array of company-level upsell opportunities
 */
export async function findBundleOpportunities(
  minActiveCampaigns: number = THRESHOLDS.MIN_CAMPAIGNS_FOR_BUNDLE
): Promise<CompanyUpsellOpportunity[]> {
  // Get all active campaigns grouped by company
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(inArray(campaigns.status, ['active', 'recruiting']));

  // Group by company
  const companyCampaigns = new Map<string, Campaign[]>();
  activeCampaigns.forEach(campaign => {
    if (!companyCampaigns.has(campaign.companyId)) {
      companyCampaigns.set(campaign.companyId, []);
    }
    companyCampaigns.get(campaign.companyId)!.push(campaign);
  });

  // Filter companies with multiple campaigns and convert to opportunities
  const opportunities: CompanyUpsellOpportunity[] = [];

  for (const [companyId, companyCampaigns_] of companyCampaigns) {
    if (companyCampaigns_.length >= minActiveCampaigns) {
      const opportunity = await createCompanyUpsellOpportunity(companyId, companyCampaigns_);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }
  }

  return opportunities.sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Generate comprehensive upsell recommendations for a company
 *
 * Combines expansion opportunities, high performers, and bundle opportunities
 * sorted by composite score (highest potential first).
 *
 * @param companyId - Company UUID
 * @returns Prioritized upsell recommendations
 */
export async function generateUpsellRecommendations(
  companyId: string
): Promise<{
  companyId: string;
  recommendations: UpsellOpportunity[];
  bundleOpportunity: CompanyUpsellOpportunity | null;
  totalPotentialValue: number;
  nextSteps: string[];
}> {
  // Fetch all campaigns for this company
  const companyCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.companyId, companyId),
        inArray(campaigns.status, ['active', 'recruiting', 'planned', 'completed'])
      )
    );

  if (companyCampaigns.length === 0) {
    return {
      companyId,
      recommendations: [],
      bundleOpportunity: null,
      totalPotentialValue: 0,
      nextSteps: ['Create first campaign to unlock upsell opportunities'],
    };
  }

  // Score all campaigns for upselling
  const scoredCampaigns = await Promise.all(
    companyCampaigns.map(campaign => scoreUpsellOpportunity(campaign))
  );

  // Filter and sort by composite score
  const viableCampaigns = scoredCampaigns
    .filter(opp => opp.compositeScore >= 40) // Minimum viable score
    .sort((a, b) => b.compositeScore - a.compositeScore);

  // Check for bundle opportunities
  let bundleOpportunity: CompanyUpsellOpportunity | null = null;
  if (companyCampaigns.length >= THRESHOLDS.MIN_CAMPAIGNS_FOR_BUNDLE) {
    const bundleOpps = await findBundleOpportunities(THRESHOLDS.MIN_CAMPAIGNS_FOR_BUNDLE);
    bundleOpportunity = bundleOpps.find(opp => opp.companyId === companyId) || null;
  }

  // Calculate total potential value
  const totalPotentialValue = viableCampaigns.reduce((sum, opp) => {
    return sum + (opp.estimatedExpansionCost || 0);
  }, 0);

  // Generate next steps
  const nextSteps = generateNextSteps(viableCampaigns, bundleOpportunity);

  return {
    companyId,
    recommendations: viableCampaigns,
    bundleOpportunity,
    totalPotentialValue,
    nextSteps,
  };
}

/**
 * Score a single campaign for upsell opportunity
 *
 * Composite score calculation (0-100):
 * - Capacity Score (40%): Based on utilization (0-100)
 * - Performance Score (30%): Normalized SROI/VIS
 * - Engagement Score (20%): Based on session frequency
 * - Spend Rate Score (10%): Budget burn rate
 *
 * @param campaign - Campaign record
 * @param recommendationType - Optional recommendation type override
 * @returns Scored upsell opportunity
 */
export async function scoreUpsellOpportunity(
  campaign: Campaign,
  recommendationType?: 'capacity_expansion' | 'performance_boost' | 'bundle_upgrade' | 'engagement_boost'
): Promise<UpsellOpportunity> {
  // Extract metrics
  const capacityUtilization = Math.min(
    2.0, // Cap at 200% for scoring
    parseFloat(campaign.capacityUtilization?.toString() || '0')
  );

  const sroi = campaign.cumulativeSROI ? parseFloat(campaign.cumulativeSROI.toString()) : 0;
  const vis = campaign.averageVIS ? parseFloat(campaign.averageVIS.toString()) : 0;

  const totalHours = parseFloat(campaign.totalHoursLogged?.toString() || '0');
  const currentSessions = campaign.currentSessions || 0;
  const budgetAllocated = parseFloat(campaign.budgetAllocated?.toString() || '0');
  const budgetSpent = parseFloat(campaign.budgetSpent?.toString() || '0');

  // Calculate individual scores
  const capacityScore = calculateCapacityScore(capacityUtilization);
  const performanceScore = calculatePerformanceScore(sroi, vis);
  const engagementScore = calculateEngagementScore(currentSessions, totalHours);
  const spendRateScore = calculateSpendRateScore(budgetSpent, budgetAllocated);

  // Calculate composite score
  const compositeScore = Math.round(
    capacityScore * SCORING.CAPACITY_WEIGHT +
    performanceScore * SCORING.PERFORMANCE_WEIGHT +
    engagementScore * SCORING.ENGAGEMENT_WEIGHT +
    spendRateScore * SCORING.SPEND_RATE_WEIGHT
  );

  // Determine recommendation type if not provided
  let finalRecommendationType = recommendationType;
  if (!finalRecommendationType) {
    if (capacityUtilization >= THRESHOLDS.EXPANSION_CAPACITY) {
      finalRecommendationType = 'capacity_expansion';
    } else if (sroi > THRESHOLDS.HIGH_PERFORMER_SROI || vis > THRESHOLDS.HIGH_PERFORMER_VIS) {
      finalRecommendationType = 'performance_boost';
    } else if (currentSessions > THRESHOLDS.ENGAGEMENT_THRESHOLD) {
      finalRecommendationType = 'engagement_boost';
    } else {
      finalRecommendationType = 'bundle_upgrade';
    }
  }

  // Generate recommendation
  const recommendedAction = generateRecommendation(
    finalRecommendationType,
    capacityUtilization,
    compositeScore,
    sroi,
    vis
  );

  // Estimate expansion cost (simple model)
  const estimatedExpansionCost = estimateExpansionCost(
    campaign,
    capacityUtilization,
    finalRecommendationType
  );

  // Estimate ROI
  const estimatedROI = sroi > 0 ? sroi * (budgetSpent || 1000) : null;

  // Calculate days to full capacity
  const daysToFullCapacity = calculateDaysToCapacity(campaign, currentSessions);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    companyId: campaign.companyId,
    programTemplateId: campaign.programTemplateId,
    beneficiaryGroupId: campaign.beneficiaryGroupId,
    pricingModel: campaign.pricingModel,

    currentVolunteers: campaign.currentVolunteers,
    targetVolunteers: campaign.targetVolunteers,
    currentBeneficiaries: campaign.currentBeneficiaries,
    targetBeneficiaries: campaign.targetBeneficiaries,
    capacityUtilization,
    budgetSpent,
    budgetAllocated,
    totalHoursLogged: totalHours,
    currentSessions,

    cumulativeSROI: sroi || null,
    averageVIS: vis || null,

    capacityScore,
    performanceScore,
    engagementScore,
    spendRateScore,
    compositeScore,

    recommendationType: finalRecommendationType,
    recommendedAction,
    estimatedExpansionCost,
    estimatedROI,

    daysUntilFullCapacity: daysToFullCapacity,
    highValueFlag: compositeScore >= 70,
  };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate capacity score (0-100)
 * Based on utilization percentage (0-200%)
 * At 80% = 50 points, at 100% = 80 points, at 150% = 100 points
 */
function calculateCapacityScore(utilization: number): number {
  if (utilization < 0.5) return 10;
  if (utilization < 0.8) return Math.round(20 + (utilization - 0.5) * 40);
  if (utilization < 1.0) return Math.round(50 + (utilization - 0.8) * 150);
  if (utilization < 1.5) return Math.round(80 + (utilization - 1.0) * 40);
  return 100;
}

/**
 * Calculate performance score (0-100)
 * Weighted combination of SROI and VIS
 * SROI: 1:1 ratio up to 5 (max 50 points), then diminishing
 * VIS: 0-100 normalized to 0-50 points
 */
function calculatePerformanceScore(sroi: number, vis: number): number {
  let sroiScore = 0;
  if (sroi > 0) {
    sroiScore = Math.min(50, sroi * 10); // 1 point per 0.1 SROI, capped at 50
  }

  const visScore = Math.min(50, (vis / 100) * 50); // Normalize VIS 0-100 to 0-50

  return Math.round((sroiScore * 0.6 + visScore * 0.4));
}

/**
 * Calculate engagement score (0-100)
 * Based on session count and hours logged
 * <25 sessions/week = 20, 25-100 = 50, >100 = 100
 */
function calculateEngagementScore(sessions: number, hours: number): number {
  // Estimate weekly sessions (rough: total sessions / campaign duration weeks)
  const weeklySessionsProxy = Math.max(sessions / 4, sessions); // Rough approximation

  if (weeklySessionsProxy < 10) return 10;
  if (weeklySessionsProxy < THRESHOLDS.ENGAGEMENT_THRESHOLD) return Math.round(20 + (weeklySessionsProxy / 25) * 30);
  if (weeklySessionsProxy < 100) return Math.round(50 + ((weeklySessionsProxy - 25) / 75) * 30);
  return 100;
}

/**
 * Calculate spend rate score (0-100)
 * Based on budget utilization (spent / allocated)
 * <25% = 10, 50% = 50, 80% = 80, >100% = 100
 */
function calculateSpendRateScore(spent: number, allocated: number): number {
  if (allocated === 0) return 50; // Neutral if no budget allocated

  const spendRate = spent / allocated;
  if (spendRate < 0.25) return 10;
  if (spendRate < 0.5) return Math.round(10 + (spendRate - 0.25) * 160);
  if (spendRate < 0.8) return Math.round(50 + (spendRate - 0.5) * 100);
  if (spendRate < 1.0) return Math.round(80 + (spendRate - 0.8) * 100);
  return 100;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate recommendation text based on opportunity type and metrics
 */
function generateRecommendation(
  type: string,
  capacity: number,
  score: number,
  sroi: number,
  vis: number
): string {
  const urgency = score >= 70 ? 'immediately' : score >= 50 ? 'soon' : 'consider';

  switch (type) {
    case 'capacity_expansion':
      const capacityPercent = Math.round(capacity * 100);
      return `Campaign at ${capacityPercent}% capacity. ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} expand volunteer/beneficiary targets to accommodate demand.`;

    case 'performance_boost':
      return `Strong SROI (${sroi.toFixed(1)}) and VIS (${vis.toFixed(0)}) indicate high impact. ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} scale this campaign to maximize return.`;

    case 'bundle_upgrade':
      return `Multiple campaigns running successfully. ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} consolidate into bundle subscription for cost savings.`;

    case 'engagement_boost':
      return `High engagement and activity levels detected. ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} expand capacity to retain momentum.`;

    default:
      return 'Consider expanding or scaling this campaign based on current performance metrics.';
  }
}

/**
 * Estimate expansion cost based on campaign pricing model
 */
function estimateExpansionCost(
  campaign: Campaign,
  capacity: number,
  type: string
): number | undefined {
  // Only estimate if we're at >80% capacity
  if (capacity < THRESHOLDS.EXPANSION_CAPACITY) {
    return undefined;
  }

  switch (campaign.pricingModel) {
    case 'seats': {
      const monthlyRate = campaign.seatPricePerMonth ? parseFloat(campaign.seatPricePerMonth.toString()) : 500;
      const additionalSeats = Math.ceil(campaign.targetVolunteers * 0.5); // Expand by 50%
      return additionalSeats * monthlyRate * 3; // 3-month expansion
    }

    case 'credits': {
      const monthlyAllocation = campaign.creditAllocation || 1000;
      const expansionAmount = Math.ceil(monthlyAllocation * 0.5);
      return expansionAmount * 10; // Rough cost per credit
    }

    case 'iaas': {
      const iaasMetrics = campaign.iaasMetrics as any;
      const pricePerLearner = iaasMetrics?.pricePerLearner || 1000;
      const additionalLearners = Math.ceil(campaign.targetBeneficiaries * 0.5);
      return additionalLearners * pricePerLearner;
    }

    case 'bundle':
      // Bundle model: estimate as percentage increase to subscription
      return campaign.budgetAllocated ? Math.round(parseFloat(campaign.budgetAllocated.toString()) * 0.5) : undefined;

    default:
      return undefined;
  }
}

/**
 * Calculate days until reaching full capacity at current burn rate
 */
function calculateDaysToCapacity(campaign: Campaign, sessionsPerWeek: number): number | undefined {
  const capacity = campaign.targetVolunteers || 1;
  const current = campaign.currentVolunteers || 0;
  const remaining = capacity - current;

  if (remaining <= 0) return 0; // Already at capacity

  // Rough approximation: if no session data, return undefined
  if (sessionsPerWeek === 0) return undefined;

  // Estimate: sessions correlate with volunteer enrollment
  // Rough model: 1 session per volunteer per week
  const weeksTillCapacity = remaining / Math.max(1, sessionsPerWeek / 7);
  return Math.round(weeksTillCapacity * 7);
}

/**
 * Create company-level bundle upsell opportunity
 */
async function createCompanyUpsellOpportunity(
  companyId: string,
  companyCampaigns: Campaign[]
): Promise<CompanyUpsellOpportunity | null> {
  const scoredCampaigns = await Promise.all(
    companyCampaigns.map(c => scoreUpsellOpportunity(c))
  );

  // Calculate company-level metrics
  const highPerforming = scoredCampaigns.filter(opp =>
    opp.cumulativeSROI && opp.cumulativeSROI > THRESHOLDS.HIGH_PERFORMER_SROI
  ).length;

  const totalUtilization = companyCampaigns.reduce((sum, c) => {
    return sum + (parseFloat(c.capacityUtilization?.toString() || '0') / companyCampaigns.length);
  }, 0);

  // Average metrics
  const sroiValues = companyCampaigns
    .filter(c => c.cumulativeSROI)
    .map(c => parseFloat(c.cumulativeSROI!.toString()));

  const visValues = companyCampaigns
    .filter(c => c.averageVIS)
    .map(c => parseFloat(c.averageVIS!.toString()));

  const avgSROI = sroiValues.length > 0 ? sroiValues.reduce((a, b) => a + b) / sroiValues.length : null;
  const avgVIS = visValues.length > 0 ? visValues.reduce((a, b) => a + b) / visValues.length : null;

  // Calculate bundle score
  const bundleScore = Math.round(
    (companyCampaigns.length / 10) * 30 +
    (highPerforming / companyCampaigns.length) * 40 +
    (totalUtilization > 0.7 ? 30 : 0)
  );

  // Estimate bundle value
  const totalAllocated = companyCampaigns.reduce((sum, c) => {
    return sum + parseFloat(c.budgetAllocated?.toString() || '0');
  }, 0);

  const estimatedBundleValue = Math.round(totalAllocated * 0.25); // 25% discount bundle value

  return {
    companyId,
    totalActiveCampaigns: companyCampaigns.length,
    highPerformingCampaigns: highPerforming,
    totalUtilization,
    averageSROI: avgSROI,
    averageVIS: avgVIS,
    compositeScore: bundleScore,
    bundleUpsellRecommendation: `This company runs ${companyCampaigns.length} successful campaigns. Consolidate into L2I bundle for ${estimatedBundleValue > 0 ? `estimated €${estimatedBundleValue} savings` : 'cost optimization'}.`,
    estimatedBundleValue,
    topPerformingCampaigns: scoredCampaigns
      .filter(opp => opp.cumulativeSROI && opp.cumulativeSROI > THRESHOLDS.HIGH_PERFORMER_SROI)
      .sort((a, b) => (b.cumulativeSROI || 0) - (a.cumulativeSROI || 0))
      .slice(0, 3),
    capacityConstrainedCampaigns: scoredCampaigns
      .filter(opp => opp.capacityUtilization >= THRESHOLDS.EXPANSION_CAPACITY)
      .sort((a, b) => b.capacityUtilization - a.capacityUtilization)
      .slice(0, 3),
  };
}

/**
 * Generate next steps based on upsell analysis
 */
function generateNextSteps(
  recommendations: UpsellOpportunity[],
  bundleOpp: CompanyUpsellOpportunity | null
): string[] {
  const steps: string[] = [];

  if (recommendations.length === 0) {
    return ['No current upsell opportunities. Continue monitoring campaign performance.'];
  }

  // Identify top opportunities by type
  const topCapacity = recommendations.find(r => r.recommendationType === 'capacity_expansion');
  const topPerformance = recommendations.find(r => r.recommendationType === 'performance_boost');

  if (topCapacity) {
    steps.push(`Immediately expand capacity for "${topCapacity.campaignName}" (${Math.round(topCapacity.capacityUtilization * 100)}% utilized)`);
  }

  if (topPerformance && topPerformance.cumulativeSROI && topPerformance.cumulativeSROI > THRESHOLDS.HIGH_PERFORMER_SROI) {
    steps.push(`Scale high-performer "${topPerformance.campaignName}" (SROI: ${topPerformance.cumulativeSROI.toFixed(1)})`);
  }

  if (bundleOpp && bundleOpp.compositeScore >= 60) {
    steps.push(`Propose L2I bundle consolidation for estimated €${bundleOpp.estimatedBundleValue} savings`);
  }

  if (recommendations.length > 1) {
    steps.push(`Schedule expansion planning meeting to prioritize ${recommendations.length} growth opportunities`);
  }

  steps.push('Send upsell recommendations to sales team');

  return steps;
}
