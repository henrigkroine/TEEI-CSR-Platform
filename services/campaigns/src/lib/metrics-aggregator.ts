/**
 * Campaign Metrics Aggregator
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Agent 3.5: metrics-aggregator
 *
 * Purpose: Aggregate SROI/VIS and other metrics from ProgramInstances to Campaigns
 *
 * Functions:
 * - aggregateCampaignMetrics: Get all aggregated metrics for a campaign
 * - calculateCumulativeSROI: Calculate weighted average SROI across instances
 * - calculateAverageVIS: Calculate average VIS across volunteers
 * - updateCampaignMetrics: Update campaign table with aggregated metrics
 * - createMetricsSnapshot: Create time-series snapshot
 *
 * Aggregation Logic (from docs/INSTANCE_LIFECYCLE.md Section 5):
 * - SROI: Weighted average across instances (weight by participant count)
 * - VIS: Simple average across all volunteers
 * - Total hours: SUM across all instances
 * - Total sessions: SUM across all instances
 * - Beneficiaries served: SUM learnersServed from instances
 * - Capacity utilization: current / target
 */

import { db, sql } from '@teei/shared-schema';
import {
  campaigns,
  programInstances,
  campaignMetricsSnapshots,
  type Campaign,
  type ProgramInstance,
  type CampaignMetricsSnapshot,
  type NewCampaignMetricsSnapshot
} from '@teei/shared-schema';
import { eq, and, inArray, sql as sqlRaw } from 'drizzle-orm';

/**
 * Aggregated campaign metrics result
 */
export interface CampaignMetrics {
  campaignId: string;

  // Capacity metrics
  currentVolunteers: number;
  currentBeneficiaries: number;
  currentSessions: number;
  totalHoursLogged: number;

  // Impact metrics
  cumulativeSROI: number | null;
  averageVIS: number | null;

  // Utilization
  capacityUtilization: number;
  isNearCapacity: boolean;
  isOverCapacity: boolean;

  // Instance breakdown
  totalInstances: number;
  activeInstances: number;
}

/**
 * Aggregate all metrics from ProgramInstances to Campaign
 *
 * This function fetches and calculates all campaign-level metrics by aggregating
 * data from all associated program instances.
 *
 * @param campaignId - Campaign UUID
 * @returns Aggregated metrics object
 */
export async function aggregateCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  // Fetch campaign to get target values
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Fetch all instances for this campaign
  const instances = await db
    .select()
    .from(programInstances)
    .where(eq(programInstances.campaignId, campaignId));

  // Calculate aggregated metrics
  const activeInstances = instances.filter(i => i.status === 'active' || i.status === 'planned');

  // Sum capacity metrics from active and planned instances
  const currentVolunteers = activeInstances.reduce(
    (sum, inst) => sum + (inst.enrolledVolunteers || 0),
    0
  );

  const currentBeneficiaries = activeInstances.reduce(
    (sum, inst) => sum + (inst.enrolledBeneficiaries || 0),
    0
  );

  // Sum activity metrics from all instances (including completed)
  const currentSessions = instances.reduce(
    (sum, inst) => sum + (inst.totalSessionsHeld || 0),
    0
  );

  const totalHoursLogged = instances.reduce(
    (sum, inst) => sum + parseFloat(inst.totalHoursLogged?.toString() || '0'),
    0
  );

  // Calculate weighted SROI (weighted by participant count)
  const cumulativeSROI = await calculateCumulativeSROI(campaignId);

  // Calculate average VIS
  const averageVIS = await calculateAverageVIS(campaignId);

  // Calculate capacity utilization
  const capacityUtilization = campaign.targetVolunteers > 0
    ? currentVolunteers / campaign.targetVolunteers
    : 0;

  const isNearCapacity = capacityUtilization >= 0.8 && capacityUtilization < 1.0;
  const isOverCapacity = capacityUtilization >= 1.0;

  return {
    campaignId,
    currentVolunteers,
    currentBeneficiaries,
    currentSessions,
    totalHoursLogged,
    cumulativeSROI,
    averageVIS,
    capacityUtilization,
    isNearCapacity,
    isOverCapacity,
    totalInstances: instances.length,
    activeInstances: activeInstances.length
  };
}

/**
 * Calculate cumulative SROI for a campaign
 *
 * Uses weighted average across instances, weighted by participant count.
 * Only includes instances with non-null SROI scores that are active or completed.
 *
 * Formula: Σ(instance.sroiScore × instance.enrolledBeneficiaries) / Σ(instance.enrolledBeneficiaries)
 *
 * @param campaignId - Campaign UUID
 * @returns Weighted average SROI or null if no data
 */
export async function calculateCumulativeSROI(campaignId: string): Promise<number | null> {
  const instances = await db
    .select({
      sroiScore: programInstances.sroiScore,
      enrolledBeneficiaries: programInstances.enrolledBeneficiaries
    })
    .from(programInstances)
    .where(
      and(
        eq(programInstances.campaignId, campaignId),
        inArray(programInstances.status, ['active', 'completed'])
      )
    );

  // Filter instances with valid SROI scores
  const validInstances = instances.filter(
    i => i.sroiScore !== null && i.enrolledBeneficiaries > 0
  );

  if (validInstances.length === 0) {
    return null;
  }

  // Calculate weighted average (weight by participant count)
  const totalWeightedScore = validInstances.reduce(
    (sum, inst) => sum + (parseFloat(inst.sroiScore!.toString()) * inst.enrolledBeneficiaries),
    0
  );

  const totalWeight = validInstances.reduce(
    (sum, inst) => sum + inst.enrolledBeneficiaries,
    0
  );

  if (totalWeight === 0) {
    // If no beneficiaries enrolled yet, use simple average
    const totalScore = validInstances.reduce(
      (sum, inst) => sum + parseFloat(inst.sroiScore!.toString()),
      0
    );
    return parseFloat((totalScore / validInstances.length).toFixed(2));
  }

  return parseFloat((totalWeightedScore / totalWeight).toFixed(2));
}

/**
 * Calculate average VIS for a campaign
 *
 * Simple average across all volunteers in all instances.
 * Only includes instances with non-null VIS scores that are active or completed.
 *
 * @param campaignId - Campaign UUID
 * @returns Average VIS score or null if no data
 */
export async function calculateAverageVIS(campaignId: string): Promise<number | null> {
  const instances = await db
    .select({
      averageVISScore: programInstances.averageVISScore
    })
    .from(programInstances)
    .where(
      and(
        eq(programInstances.campaignId, campaignId),
        inArray(programInstances.status, ['active', 'completed'])
      )
    );

  // Filter instances with valid VIS scores
  const validScores = instances
    .filter(i => i.averageVISScore !== null)
    .map(i => parseFloat(i.averageVISScore!.toString()));

  if (validScores.length === 0) {
    return null;
  }

  // Simple average across all instances
  const totalScore = validScores.reduce((sum, score) => sum + score, 0);
  return parseFloat((totalScore / validScores.length).toFixed(2));
}

/**
 * Update campaign metrics in database
 *
 * Aggregates all metrics and updates the campaigns table.
 * This should be called periodically (hourly) by the cron job.
 *
 * @param campaignId - Campaign UUID
 * @returns Updated campaign record
 */
export async function updateCampaignMetrics(campaignId: string): Promise<Campaign> {
  // Aggregate metrics
  const metrics = await aggregateCampaignMetrics(campaignId);

  // Update campaign record
  const [updatedCampaign] = await db
    .update(campaigns)
    .set({
      currentVolunteers: metrics.currentVolunteers,
      currentBeneficiaries: metrics.currentBeneficiaries,
      currentSessions: metrics.currentSessions,
      totalHoursLogged: metrics.totalHoursLogged.toString(),
      cumulativeSROI: metrics.cumulativeSROI !== null ? metrics.cumulativeSROI.toString() : null,
      averageVIS: metrics.averageVIS !== null ? metrics.averageVIS.toString() : null,
      capacityUtilization: metrics.capacityUtilization.toFixed(4),
      isNearCapacity: metrics.isNearCapacity,
      isOverCapacity: metrics.isOverCapacity,
      lastMetricsUpdateAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(campaigns.id, campaignId))
    .returning();

  if (!updatedCampaign) {
    throw new Error(`Failed to update campaign metrics: ${campaignId}`);
  }

  return updatedCampaign;
}

/**
 * Determine snapshot frequency based on campaign activity level
 *
 * From docs/METRICS_RETENTION_POLICY.md:
 * - High activity (>100 sessions/week): Hourly snapshots
 * - Medium activity (25-100 sessions/week): Every 6 hours
 * - Low activity (<25 sessions/week): Daily
 * - Completed campaigns: Final snapshot only
 *
 * @param campaign - Campaign record
 * @returns Frequency in hours (1, 6, or 24)
 */
export function determineSnapshotFrequency(campaign: Campaign): number {
  if (campaign.status === 'completed' || campaign.status === 'closed') {
    return 0; // No automatic snapshots for completed campaigns
  }

  if (campaign.status === 'draft') {
    return 0; // No snapshots for draft campaigns
  }

  // For active campaigns, check activity level
  // Estimate: currentSessions as proxy for total sessions (we'd need a weekly count in production)
  // For now, use simple thresholds based on total sessions
  const sessionsLastWeek = campaign.currentSessions; // Simplified - should query last 7 days

  if (campaign.status === 'active') {
    if (sessionsLastWeek > 100) return 1;  // Hourly
    if (sessionsLastWeek > 25) return 6;   // Every 6 hours
  }

  return 24; // Daily (for planned, recruiting, paused)
}

/**
 * Create a campaign metrics snapshot for time-series analysis
 *
 * Captures point-in-time metrics for dashboard charts and historical analysis.
 * Snapshots are created based on campaign activity level (hourly, 6h, or daily).
 *
 * @param campaignId - Campaign UUID
 * @returns Created snapshot record
 */
export async function createMetricsSnapshot(campaignId: string): Promise<CampaignMetricsSnapshot> {
  // Fetch fresh campaign data with aggregated metrics
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Fetch instance summary for full snapshot
  const instances = await db
    .select()
    .from(programInstances)
    .where(eq(programInstances.campaignId, campaignId));

  const activeInstanceCount = instances.filter(i => i.status === 'active').length;

  // Calculate utilization ratios
  const volunteersUtilization = campaign.targetVolunteers > 0
    ? campaign.currentVolunteers / campaign.targetVolunteers
    : 0;

  const beneficiariesUtilization = campaign.targetBeneficiaries > 0
    ? campaign.currentBeneficiaries / campaign.targetBeneficiaries
    : 0;

  const sessionsUtilization = campaign.maxSessions
    ? campaign.currentSessions / campaign.maxSessions
    : 0;

  const budgetAllocated = parseFloat(campaign.budgetAllocated || '0');
  const budgetSpent = parseFloat(campaign.budgetSpent || '0');
  const budgetRemaining = budgetAllocated - budgetSpent;
  const budgetUtilization = budgetAllocated > 0 ? budgetSpent / budgetAllocated : 0;

  // Sum capacity consumption from instances
  const seatsUsed = instances.reduce((sum, i) => sum + (i.volunteersConsumed || 0), 0);
  const creditsConsumed = instances.reduce((sum, i) => sum + parseFloat(i.creditsConsumed?.toString() || '0'), 0);
  const learnersServed = instances.reduce((sum, i) => sum + (i.learnersServed || 0), 0);

  // Build snapshot record
  const snapshotData: NewCampaignMetricsSnapshot = {
    campaignId: campaign.id,
    snapshotDate: new Date(),

    // Volunteers
    volunteersTarget: campaign.targetVolunteers,
    volunteersCurrent: campaign.currentVolunteers,
    volunteersUtilization: volunteersUtilization.toFixed(4),

    // Beneficiaries
    beneficiariesTarget: campaign.targetBeneficiaries,
    beneficiariesCurrent: campaign.currentBeneficiaries,
    beneficiariesUtilization: beneficiariesUtilization.toFixed(4),

    // Sessions
    sessionsTarget: campaign.maxSessions,
    sessionsCurrent: campaign.currentSessions,
    sessionsUtilization: campaign.maxSessions ? sessionsUtilization.toFixed(4) : null,

    // Budget
    budgetAllocated: budgetAllocated.toFixed(2),
    budgetSpent: budgetSpent.toFixed(2),
    budgetRemaining: budgetRemaining.toFixed(2),
    budgetUtilization: budgetUtilization.toFixed(4),

    // Impact
    sroiScore: campaign.cumulativeSROI,
    averageVISScore: campaign.averageVIS,
    totalHoursLogged: campaign.totalHoursLogged || '0',
    totalSessionsCompleted: campaign.totalSessionsCompleted || 0,

    // Monetization
    seatsUsed: seatsUsed,
    seatsCommitted: campaign.committedSeats,
    creditsConsumed: creditsConsumed > 0 ? creditsConsumed.toFixed(2) : null,
    creditsAllocated: campaign.creditAllocation ? campaign.creditAllocation.toString() : null,
    learnersServed: learnersServed,
    learnersCommitted: campaign.iaasMetrics?.learnersCommitted || null,

    // Full snapshot JSONB
    fullSnapshot: {
      campaignName: campaign.name,
      status: campaign.status,
      programTemplateId: campaign.programTemplateId,
      beneficiaryGroupId: campaign.beneficiaryGroupId,
      companyId: campaign.companyId,

      programInstances: {
        activeCount: activeInstanceCount,
        totalCount: instances.length,
        avgOutcomeScores: calculateAverageOutcomeScores(instances)
      },

      // Capacity alerts
      alerts: generateCapacityAlerts(campaign, volunteersUtilization, beneficiariesUtilization, budgetUtilization),

      snapshotMetadata: {
        generatedBy: 'metrics-aggregator',
        dataSource: 'program_instances',
        calculationDurationMs: 0 // Would track actual duration in production
      }
    }
  };

  // Insert snapshot
  const [snapshot] = await db
    .insert(campaignMetricsSnapshots)
    .values(snapshotData)
    .returning();

  if (!snapshot) {
    throw new Error(`Failed to create snapshot for campaign: ${campaignId}`);
  }

  return snapshot;
}

/**
 * Calculate average outcome scores across all instances
 *
 * @param instances - Array of program instances
 * @returns Average outcome scores by dimension
 */
function calculateAverageOutcomeScores(instances: ProgramInstance[]): Record<string, number> {
  const outcomeMap = new Map<string, number[]>();

  instances.forEach(instance => {
    if (instance.outcomeScores && typeof instance.outcomeScores === 'object') {
      Object.entries(instance.outcomeScores).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!outcomeMap.has(key)) {
            outcomeMap.set(key, []);
          }
          outcomeMap.get(key)!.push(value);
        }
      });
    }
  });

  const averages: Record<string, number> = {};
  outcomeMap.forEach((values, key) => {
    const sum = values.reduce((a, b) => a + b, 0);
    averages[key] = parseFloat((sum / values.length).toFixed(2));
  });

  return averages;
}

/**
 * Generate capacity alert objects based on utilization thresholds
 *
 * @param campaign - Campaign record
 * @param volunteersUtil - Volunteers utilization (0-1+)
 * @param beneficiariesUtil - Beneficiaries utilization (0-1+)
 * @param budgetUtil - Budget utilization (0-1+)
 * @returns Array of alert objects
 */
function generateCapacityAlerts(
  campaign: Campaign,
  volunteersUtil: number,
  beneficiariesUtil: number,
  budgetUtil: number
): Array<{
  type: 'capacity_warning' | 'capacity_critical' | 'budget_warning' | 'performance_low';
  threshold: number;
  currentValue: number;
  message: string;
}> {
  const alerts: Array<{
    type: 'capacity_warning' | 'capacity_critical' | 'budget_warning' | 'performance_low';
    threshold: number;
    currentValue: number;
    message: string;
  }> = [];

  // Volunteer capacity alerts
  if (volunteersUtil >= 1.0) {
    alerts.push({
      type: 'capacity_critical',
      threshold: 1.0,
      currentValue: volunteersUtil,
      message: `Volunteer capacity exceeded: ${(volunteersUtil * 100).toFixed(1)}% utilization`
    });
  } else if (volunteersUtil >= 0.8) {
    alerts.push({
      type: 'capacity_warning',
      threshold: 0.8,
      currentValue: volunteersUtil,
      message: `Volunteer capacity nearing limit: ${(volunteersUtil * 100).toFixed(1)}% utilization`
    });
  }

  // Beneficiary capacity alerts
  if (beneficiariesUtil >= 1.0) {
    alerts.push({
      type: 'capacity_critical',
      threshold: 1.0,
      currentValue: beneficiariesUtil,
      message: `Beneficiary capacity exceeded: ${(beneficiariesUtil * 100).toFixed(1)}% utilization`
    });
  } else if (beneficiariesUtil >= 0.8) {
    alerts.push({
      type: 'capacity_warning',
      threshold: 0.8,
      currentValue: beneficiariesUtil,
      message: `Beneficiary capacity nearing limit: ${(beneficiariesUtil * 100).toFixed(1)}% utilization`
    });
  }

  // Budget alerts
  if (budgetUtil >= 0.9) {
    alerts.push({
      type: 'budget_warning',
      threshold: 0.9,
      currentValue: budgetUtil,
      message: `Budget ${(budgetUtil * 100).toFixed(1)}% spent`
    });
  }

  // Performance alerts (low SROI)
  const sroi = campaign.cumulativeSROI ? parseFloat(campaign.cumulativeSROI.toString()) : null;
  if (sroi !== null && sroi < 2.0 && campaign.status === 'active') {
    alerts.push({
      type: 'performance_low',
      threshold: 2.0,
      currentValue: sroi,
      message: `SROI below target: ${sroi.toFixed(2)}`
    });
  }

  return alerts;
}
