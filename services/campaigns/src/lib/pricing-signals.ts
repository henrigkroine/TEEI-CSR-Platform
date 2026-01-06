/**
 * Pricing Signals Generator
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Agent 5.3: pricing-signal-exporter
 *
 * Purpose: Generate pricing signals and analytics for sales teams
 *
 * Functions:
 * - calculateCostPerLearner: Total cost / learners served
 * - compareUsageVsContract: Actual vs committed usage comparison
 * - identifyHighValueCampaigns: Flag high-SROI, high-engagement campaigns
 * - generatePricingSignals: Aggregate all pricing data for CRM export
 * - generatePricingReport: Generate comprehensive pricing analytics
 *
 * Pricing Signals enable:
 * - Cost optimization insights
 * - Usage pattern analysis
 * - Upsell recommendations based on data
 * - CRM/HubSpot integration for sales team
 */

import { db } from '@teei/shared-schema';
import {
  campaigns,
  programInstances,
  companies,
  type Campaign,
} from '@teei/shared-schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { aggregateCampaignMetrics, calculateCumulativeSROI, calculateAverageVIS } from './metrics-aggregator.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Cost-per-learner analysis
 */
export interface CostPerLearner {
  campaignId: string;
  campaignName: string;
  budgetAllocated: number;
  currency: string;
  learnersServed: number;
  costPerLearner: number | null;
  costPerHour: number | null;
  totalHours: number;
  budgetUtilization: number; // budgetSpent / budgetAllocated
  budgetSpent: number;
}

/**
 * Usage vs contract comparison
 */
export interface UsageVsContract {
  campaignId: string;
  campaignName: string;
  pricingModel: string;

  // For SEATS model
  seats?: {
    committed: number;
    used: number;
    utilizationPercent: number;
    variance: number; // used - committed (positive = overage)
  };

  // For CREDITS model
  credits?: {
    allocated: number;
    consumed: number;
    utilizationPercent: number;
    remaining: number;
    costPerCredit: number;
  };

  // For IAAS model
  iaas?: {
    learnersCommitted: number;
    learnersServed: number;
    utilizationPercent: number;
    variance: number;
    pricePerLearner: number;
    projectedCost: number;
  };

  // General metrics
  expectedClosureDate: string | null; // When will contract be exhausted?
  isNearExhaustion: boolean; // >80% utilization
  isExhausted: boolean; // >=100% utilization
  recommendedAction: 'maintain' | 'expand' | 'negotiate' | 'close';
}

/**
 * High-value campaign indicator
 */
export interface HighValueCampaign {
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  sroi: number | null;
  averageVis: number | null;
  engagementScore: number; // 0-100
  totalHours: number;
  beneficiariesServed: number;
  budgetAllocated: number;
  budgetSpent: number;
  roi: number; // (SROI - 1) * 100
  status: string;
  isHighValue: boolean; // SROI > 4.0 AND engagement > 75%
  valueScore: number; // 0-100 composite score
  priorities: string[]; // ['high_sroi', 'high_engagement', 'expanding', 'near_completion']
}

/**
 * Pricing signal for export/integration
 */
export interface PricingSignal {
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  status: string;

  // Period
  startDate: string;
  endDate: string;
  daysSinceStart: number;
  daysUntilEnd: number;

  // Pricing
  pricingModel: string;
  budgetAllocated: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetUtilizationPercent: number;
  currency: string;

  // Capacity
  targetVolunteers: number;
  currentVolunteers: number;
  volunteerUtilizationPercent: number;
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  beneficiaryUtilizationPercent: number;

  // Impact
  sroi: number | null;
  averageVis: number | null;
  totalHours: number;
  totalSessions: number;
  costPerLearner: number | null;
  costPerHour: number | null;

  // Signals
  isHighValue: boolean;
  isNearCapacity: boolean;
  isOverCapacity: boolean;
  isBudgetConstrained: boolean;

  // Recommendations
  recommendations: string[];

  // Metadata
  lastUpdated: string;
}

/**
 * Pricing report for company
 */
export interface PricingReport {
  companyId: string;
  companyName: string;
  reportGeneratedAt: string;

  // Summary metrics
  totalCampaigns: number;
  activeCampaigns: number;
  highValueCampaigns: number;

  // Financial summary
  totalBudgetAllocated: number;
  totalBudgetSpent: number;
  totalBudgetRemaining: number;
  averageBudgetUtilization: number;
  currency: string;

  // Capacity summary
  totalTargetBeneficiaries: number;
  totalCurrentBeneficiaries: number;
  beneficiaryUtilizationAverage: number;

  // Impact summary
  averageSroi: number | null;
  averageVis: number | null;
  totalHours: number;

  // Signals
  campaignsNearCapacity: number;
  campaignsOverCapacity: number;
  campaignsBudgetConstrained: number;

  // Details
  campaigns: PricingSignal[];
  highValueOpportunities: HighValueCampaign[];
  recommendations: string[];
}

// ============================================================================
// COST PER LEARNER CALCULATION
// ============================================================================

/**
 * Calculate cost per learner for a campaign
 *
 * Cost per learner = budgetAllocated / currentBeneficiaries
 * Also calculates cost per hour
 *
 * @param campaignId - Campaign UUID
 * @returns Cost per learner analysis
 */
export async function calculateCostPerLearner(campaignId: string): Promise<CostPerLearner> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const metrics = await aggregateCampaignMetrics(campaignId);

  const budgetAllocated = parseFloat(campaign.budgetAllocated.toString());
  const budgetSpent = parseFloat(campaign.budgetSpent?.toString() || '0');

  // Calculate cost per learner (only if beneficiaries > 0)
  const costPerLearner = metrics.currentBeneficiaries > 0
    ? budgetAllocated / metrics.currentBeneficiaries
    : null;

  // Calculate cost per hour (only if hours > 0)
  const costPerHour = metrics.totalHoursLogged > 0
    ? budgetAllocated / metrics.totalHoursLogged
    : null;

  // Calculate budget utilization (spend vs allocated)
  const budgetUtilization = budgetAllocated > 0
    ? budgetSpent / budgetAllocated
    : 0;

  return {
    campaignId,
    campaignName: campaign.name,
    budgetAllocated,
    currency: campaign.currency,
    learnersServed: metrics.currentBeneficiaries,
    costPerLearner,
    costPerHour,
    totalHours: metrics.totalHoursLogged,
    budgetUtilization,
    budgetSpent,
  };
}

// ============================================================================
// USAGE VS CONTRACT COMPARISON
// ============================================================================

/**
 * Compare actual vs contracted usage for a campaign
 *
 * Analyzes pricing model specifics and provides usage variance analysis
 *
 * @param campaignId - Campaign UUID
 * @returns Usage comparison analysis
 */
export async function compareUsageVsContract(campaignId: string): Promise<UsageVsContract> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const metrics = await aggregateCampaignMetrics(campaignId);

  let seats, credits, iaas;
  let expectedClosureDate = null;
  let isNearExhaustion = false;
  let isExhausted = false;
  let recommendedAction: 'maintain' | 'expand' | 'negotiate' | 'close' = 'maintain';

  // Analyze based on pricing model
  if (campaign.pricingModel === 'seats') {
    const committed = campaign.committedSeats || 0;
    const used = metrics.currentVolunteers;
    const utilizationPercent = committed > 0 ? (used / committed) * 100 : 0;
    const variance = used - committed;

    seats = {
      committed,
      used,
      utilizationPercent,
      variance,
    };

    isNearExhaustion = utilizationPercent >= 80 && utilizationPercent < 100;
    isExhausted = utilizationPercent >= 100;

    if (utilizationPercent > 100) {
      recommendedAction = 'expand';
    } else if (utilizationPercent >= 80) {
      recommendedAction = 'expand';
    } else if (utilizationPercent < 50) {
      recommendedAction = 'negotiate';
    }
  } else if (campaign.pricingModel === 'credits') {
    const allocated = campaign.creditAllocation || 0;
    const remaining = campaign.creditsRemaining || 0;
    const consumed = allocated - remaining;
    const consumptionRate = campaign.creditConsumptionRate ? parseFloat(campaign.creditConsumptionRate.toString()) : 0;
    const utilizationPercent = allocated > 0 ? (consumed / allocated) * 100 : 0;

    const costPerCredit = consumptionRate > 0
      ? parseFloat(campaign.budgetAllocated.toString()) / allocated
      : 0;

    credits = {
      allocated,
      consumed,
      utilizationPercent,
      remaining,
      costPerCredit,
    };

    isNearExhaustion = utilizationPercent >= 80 && utilizationPercent < 100;
    isExhausted = utilizationPercent >= 100;

    if (remaining > 0 && consumptionRate > 0) {
      const daysRemaining = remaining / (consumptionRate * 24); // Assuming consumption per hour
      if (daysRemaining > 0) {
        const closureDate = new Date();
        closureDate.setDate(closureDate.getDate() + Math.ceil(daysRemaining));
        expectedClosureDate = closureDate.toISOString().split('T')[0];
      }
    }
  } else if (campaign.pricingModel === 'iaas') {
    const iaasMetrics = campaign.iaasMetrics as any;
    const learnersCommitted = iaasMetrics?.learnersCommitted || 0;
    const learnersServed = metrics.currentBeneficiaries;
    const utilizationPercent = learnersCommitted > 0 ? (learnersServed / learnersCommitted) * 100 : 0;
    const variance = learnersServed - learnersCommitted;
    const pricePerLearner = iaasMetrics?.pricePerLearner || 0;
    const projectedCost = learnersServed * pricePerLearner;

    iaas = {
      learnersCommitted,
      learnersServed,
      utilizationPercent,
      variance,
      pricePerLearner,
      projectedCost,
    };

    isNearExhaustion = utilizationPercent >= 80 && utilizationPercent < 100;
    isExhausted = utilizationPercent >= 100;

    if (learnersServed > 0) {
      const daysElapsed = Math.ceil(
        (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const daysPassed = Math.ceil(
        (Date.now() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysPassed > 0 && daysElapsed > 0) {
        const pace = learnersServed / daysPassed;
        const projectedTotal = pace * daysElapsed;

        if (projectedTotal > learnersCommitted * 1.1) {
          recommendedAction = 'expand';
        } else if (projectedTotal > learnersCommitted) {
          recommendedAction = 'negotiate';
        }
      }
    }
  }

  return {
    campaignId,
    campaignName: campaign.name,
    pricingModel: campaign.pricingModel,
    seats,
    credits,
    iaas,
    expectedClosureDate,
    isNearExhaustion,
    isExhausted,
    recommendedAction,
  };
}

// ============================================================================
// HIGH-VALUE CAMPAIGN IDENTIFICATION
// ============================================================================

/**
 * Identify high-value campaigns for a company
 *
 * High-value = SROI > 4.0 AND engagement > 75%
 *
 * @param companyId - Company UUID
 * @param sroiThreshold - SROI threshold for high-value (default 4.0)
 * @param engagementThreshold - Engagement threshold 0-100 (default 75)
 * @returns List of high-value campaigns
 */
export async function identifyHighValueCampaigns(
  companyId: string,
  sroiThreshold: number = 4.0,
  engagementThreshold: number = 75
): Promise<HighValueCampaign[]> {
  // Get all active and completed campaigns for company
  const companyCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.companyId, companyId),
        inArray(campaigns.status, ['active', 'completed'])
      )
    );

  if (companyCampaigns.length === 0) {
    return [];
  }

  const highValueCampaigns: HighValueCampaign[] = [];

  for (const campaign of companyCampaigns) {
    const metrics = await aggregateCampaignMetrics(campaign.id);
    const sroi = await calculateCumulativeSROI(campaign.id);
    const vis = await calculateAverageVIS(campaign.id);

    // Calculate engagement score (0-100)
    // Engagement = (beneficiaries/target) * 50 + (volunteers/target) * 50
    const beneficiaryEngagement = campaign.targetBeneficiaries > 0
      ? Math.min(100, (metrics.currentBeneficiaries / campaign.targetBeneficiaries) * 100)
      : 0;

    const volunteerEngagement = campaign.targetVolunteers > 0
      ? Math.min(100, (metrics.currentVolunteers / campaign.targetVolunteers) * 100)
      : 0;

    const engagementScore = (beneficiaryEngagement + volunteerEngagement) / 2;

    // Calculate ROI (SROI - 1) * 100
    const roi = sroi ? (sroi - 1) * 100 : 0;

    // Determine if high-value
    const isHighValue = (sroi || 0) > sroiThreshold && engagementScore >= engagementThreshold;

    // Determine priorities
    const priorities: string[] = [];
    if ((sroi || 0) > 5) priorities.push('very_high_sroi');
    if ((sroi || 0) > sroiThreshold) priorities.push('high_sroi');
    if (engagementScore >= 90) priorities.push('excellent_engagement');
    if (engagementScore >= engagementThreshold) priorities.push('high_engagement');
    if (metrics.capacityUtilization > 0.8) priorities.push('expanding');
    if (new Date(campaign.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000) {
      priorities.push('near_completion');
    }

    // Calculate composite value score (0-100)
    const sroi_norm = Math.min(100, ((sroi || 0) / sroiThreshold) * 100);
    const engagement_norm = engagementScore;
    const budget_norm = Math.min(100, (parseFloat(campaign.budgetSpent?.toString() || '0') / parseFloat(campaign.budgetAllocated.toString())) * 100);
    const valueScore = (sroi_norm + engagement_norm + budget_norm) / 3;

    // Fetch company name
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    highValueCampaigns.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      companyId,
      companyName: company?.name || 'Unknown',
      sroi,
      averageVis: vis,
      engagementScore,
      totalHours: metrics.totalHoursLogged,
      beneficiariesServed: metrics.currentBeneficiaries,
      budgetAllocated: parseFloat(campaign.budgetAllocated.toString()),
      budgetSpent: parseFloat(campaign.budgetSpent?.toString() || '0'),
      roi,
      status: campaign.status,
      isHighValue,
      valueScore: Math.round(valueScore),
      priorities,
    });
  }

  // Sort by value score descending
  return highValueCampaigns.sort((a, b) => b.valueScore - a.valueScore);
}

// ============================================================================
// PRICING SIGNALS GENERATION
// ============================================================================

/**
 * Generate all pricing signals for a company
 *
 * Aggregates cost-per-learner, usage comparisons, and high-value indicators
 *
 * @param companyId - Company UUID
 * @returns Pricing signals for all campaigns
 */
export async function generatePricingSignals(companyId: string): Promise<PricingSignal[]> {
  // Get all campaigns for company
  const companyCampaigns = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.companyId, companyId))
    .orderBy(desc(campaigns.createdAt));

  if (companyCampaigns.length === 0) {
    return [];
  }

  const signals: PricingSignal[] = [];

  for (const campaign of companyCampaigns) {
    const metrics = await aggregateCampaignMetrics(campaign.id);
    const costAnalysis = await calculateCostPerLearner(campaign.id);
    const usageComparison = await compareUsageVsContract(campaign.id);
    const sroi = await calculateCumulativeSROI(campaign.id);
    const vis = await calculateAverageVIS(campaign.id);

    // Calculate days
    const today = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    const daysSinceStart = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysUntilEnd = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate budget utilization
    const budgetAllocated = parseFloat(campaign.budgetAllocated.toString());
    const budgetSpent = parseFloat(campaign.budgetSpent?.toString() || '0');
    const budgetRemaining = Math.max(0, budgetAllocated - budgetSpent);
    const budgetUtilizationPercent = budgetAllocated > 0 ? (budgetSpent / budgetAllocated) * 100 : 0;

    // Calculate capacity utilization percentages
    const volunteerUtilizationPercent = campaign.targetVolunteers > 0
      ? (metrics.currentVolunteers / campaign.targetVolunteers) * 100
      : 0;

    const beneficiaryUtilizationPercent = campaign.targetBeneficiaries > 0
      ? (metrics.currentBeneficiaries / campaign.targetBeneficiaries) * 100
      : 0;

    // Determine signals
    const isHighValue = (sroi || 0) > 4.0 && beneficiaryUtilizationPercent >= 75;
    const isBudgetConstrained = budgetUtilizationPercent > 90;

    // Generate recommendations
    const recommendations: string[] = [];

    if (usageComparison.recommendedAction === 'expand') {
      recommendations.push(`Expand ${campaign.pricingModel} capacity - currently at ${Math.round(usageComparison.seats?.utilizationPercent || usageComparison.iaas?.utilizationPercent || 0)}% utilization`);
    }

    if (isHighValue) {
      recommendations.push('High-value campaign - consider upselling additional capacity or related products');
    }

    if (isBudgetConstrained) {
      recommendations.push(`Budget nearly exhausted (${Math.round(budgetUtilizationPercent)}%) - schedule budget review soon`);
    }

    if (daysUntilEnd > 0 && daysUntilEnd < 30) {
      recommendations.push(`Campaign ending in ${daysUntilEnd} days - plan renewal or new campaigns`);
    }

    // Fetch company name
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    signals.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      companyId,
      companyName: company?.name || 'Unknown',
      status: campaign.status,
      startDate: campaign.startDate.toISOString().split('T')[0],
      endDate: campaign.endDate.toISOString().split('T')[0],
      daysSinceStart,
      daysUntilEnd,
      pricingModel: campaign.pricingModel,
      budgetAllocated,
      budgetSpent,
      budgetRemaining,
      budgetUtilizationPercent,
      currency: campaign.currency,
      targetVolunteers: campaign.targetVolunteers,
      currentVolunteers: metrics.currentVolunteers,
      volunteerUtilizationPercent,
      targetBeneficiaries: campaign.targetBeneficiaries,
      currentBeneficiaries: metrics.currentBeneficiaries,
      beneficiaryUtilizationPercent,
      sroi,
      averageVis: vis,
      totalHours: metrics.totalHoursLogged,
      totalSessions: metrics.currentSessions,
      costPerLearner: costAnalysis.costPerLearner,
      costPerHour: costAnalysis.costPerHour,
      isHighValue,
      isNearCapacity: metrics.isNearCapacity,
      isOverCapacity: metrics.isOverCapacity,
      isBudgetConstrained,
      recommendations,
      lastUpdated: new Date().toISOString(),
    });
  }

  return signals;
}

// ============================================================================
// PRICING REPORT GENERATION
// ============================================================================

/**
 * Generate comprehensive pricing report for a company
 *
 * Includes all pricing signals, high-value analysis, and recommendations
 *
 * @param companyId - Company UUID
 * @returns Comprehensive pricing report
 */
export async function generatePricingReport(companyId: string): Promise<PricingReport> {
  // Fetch company
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // Get all pricing signals
  const signals = await generatePricingSignals(companyId);

  // Get high-value campaigns
  const highValue = await identifyHighValueCampaigns(companyId);

  // Calculate summary metrics
  const totalCampaigns = signals.length;
  const activeCampaigns = signals.filter(s => s.status === 'active').length;
  const highValueCampaigns = signals.filter(s => s.isHighValue).length;

  const totalBudgetAllocated = signals.reduce((sum, s) => sum + s.budgetAllocated, 0);
  const totalBudgetSpent = signals.reduce((sum, s) => sum + s.budgetSpent, 0);
  const totalBudgetRemaining = signals.reduce((sum, s) => sum + s.budgetRemaining, 0);
  const averageBudgetUtilization = totalBudgetAllocated > 0
    ? (totalBudgetSpent / totalBudgetAllocated) * 100
    : 0;

  const totalTargetBeneficiaries = signals.reduce((sum, s) => sum + s.targetBeneficiaries, 0);
  const totalCurrentBeneficiaries = signals.reduce((sum, s) => sum + s.currentBeneficiaries, 0);
  const beneficiaryUtilizationAverage = totalTargetBeneficiaries > 0
    ? (totalCurrentBeneficiaries / totalTargetBeneficiaries) * 100
    : 0;

  // Calculate impact metrics
  const validSROI = signals.filter(s => s.sroi !== null && s.sroi > 0);
  const averageSroi = validSROI.length > 0
    ? validSROI.reduce((sum, s) => sum + (s.sroi || 0), 0) / validSROI.length
    : null;

  const validVIS = signals.filter(s => s.averageVis !== null && s.averageVis > 0);
  const averageVis = validVIS.length > 0
    ? validVIS.reduce((sum, s) => sum + (s.averageVis || 0), 0) / validVIS.length
    : null;

  const totalHours = signals.reduce((sum, s) => sum + s.totalHours, 0);

  // Count capacity issues
  const campaignsNearCapacity = signals.filter(s => s.isNearCapacity).length;
  const campaignsOverCapacity = signals.filter(s => s.isOverCapacity).length;
  const campaignsBudgetConstrained = signals.filter(s => s.isBudgetConstrained).length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (highValueCampaigns > 0) {
    recommendations.push(`${highValueCampaigns} high-value campaign(s) ready for upsell or expansion`);
  }

  if (campaignsNearCapacity > 0) {
    recommendations.push(`${campaignsNearCapacity} campaign(s) approaching capacity - consider expansions`);
  }

  if (campaignsBudgetConstrained > 0) {
    recommendations.push(`${campaignsBudgetConstrained} campaign(s) with tight budgets - monitor spend closely`);
  }

  if (averageBudgetUtilization > 90) {
    recommendations.push('Overall budget utilization is high - plan additional budget allocation');
  }

  if (activeCampaigns === 0 && totalCampaigns > 0) {
    recommendations.push('No active campaigns - consider renewing or launching new campaigns');
  }

  return {
    companyId,
    companyName: company.name,
    reportGeneratedAt: new Date().toISOString(),
    totalCampaigns,
    activeCampaigns,
    highValueCampaigns,
    totalBudgetAllocated,
    totalBudgetSpent,
    totalBudgetRemaining,
    averageBudgetUtilization,
    currency: signals.length > 0 ? signals[0].currency : 'EUR',
    totalTargetBeneficiaries,
    totalCurrentBeneficiaries,
    beneficiaryUtilizationAverage,
    averageSroi,
    averageVis,
    totalHours,
    campaignsNearCapacity,
    campaignsOverCapacity,
    campaignsBudgetConstrained,
    campaigns: signals,
    highValueOpportunities: highValue,
    recommendations,
  };
}
