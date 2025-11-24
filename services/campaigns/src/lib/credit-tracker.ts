/**
 * Credit Tracker for Campaigns
 *
 * SWARM 6: Agent 5.2 - seat-credit-tracker
 *
 * Responsibilities:
 * - Track impact credit consumption per campaign
 * - Calculate remaining credit balance
 * - Generate credit usage reports for billing
 * - Provide credit consumption tracking by activity type
 *
 * Pricing Model: Credits
 * - Companies purchase impact credits (e.g., 10,000 credits)
 * - Credits are consumed per activity (e.g., 1 credit per hour)
 * - Tracks utilization and remaining balance
 * - Supports credit overage with warnings
 */

import type { Campaign } from '@teei/shared-schema';
import postgres from 'postgres';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Credit consumption record
 */
export interface CreditConsumption {
  campaignId: string;
  activity: string; // 'session', 'hour', 'completion', 'custom'
  amount: number; // Credits consumed
  timestamp: Date;
  volumeUnit?: number; // e.g., 1 session, 2 hours
  instanceId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Credit balance summary for a campaign
 */
export interface CreditBalance {
  campaignId: string;
  allocated: number;
  consumed: number;
  remaining: number;
  utilizationPercent: number;
  utilizationTrend: 'stable' | 'increasing' | 'decreasing';
  isNearCapacity: boolean;
  isAtCapacity: boolean;
  isOverCapacity: boolean;
  lastUpdateTime: Date;
}

/**
 * Credit usage breakdown by activity type
 */
export interface CreditUsageBreakdown {
  campaignId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalAllocated: number;
  totalConsumed: number;
  totalRemaining: number;
  averageDailyConsumption: number;
  byActivityType: Array<{
    activity: string;
    count: number;
    creditsConsumed: number;
    percentOfTotal: number;
    averageCreditPerActivity: number;
  }>;
  projectedDepletion?: {
    estimatedDepletionDate?: Date;
    daysUntilDepletion?: number;
    creditPerDay: number;
  };
}

/**
 * Credit consumption report for billing
 */
export interface CreditUsageReport {
  campaignId: string;
  campaignName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  pricingModel: string;
  creditAllocation: number;
  creditConsumptionRate: number; // Credits per unit
  peakDailyConsumption: number;
  averageDailyConsumption: number;
  totalCreditsConsumed: number;
  creditsRemaining: number;
  utilizationPercent: number;
  dailySnapshots: Array<{
    date: Date;
    creditsConsumed: number;
    utilizationPercent: number;
  }>;
  consumptionByActivity: Array<{
    activity: string;
    count: number;
    creditsConsumed: number;
    percentOfTotal: number;
  }>;
  summary: {
    totalDaysInPeriod: number;
    averageUtilization: number;
    peakUtilization: number;
    daysAtCapacity: number;
    daysOverCapacity: number;
    projectedMonthlyBurn: number;
  };
}

/**
 * Credit balance threshold result
 */
export interface CreditCapacityThreshold {
  campaignId: string;
  currentUtilization: number;
  threshold: 'under_80' | 'at_80' | 'at_90' | 'at_100' | 'over_100';
  thresholdPercent: number;
  daysUntilDepletion?: number;
  recommendation: string;
  requiresAction: boolean;
}

// ============================================================================
// CREDIT TRACKER CLASS
// ============================================================================

export class CreditTracker {
  constructor(private sql: postgres.Sql) {}

  /**
   * Consume credits for a campaign activity
   *
   * @param campaignId - Campaign UUID
   * @param amount - Number of credits to consume
   * @param activity - Type of activity consuming credits
   * @param volumeUnit - Optional unit count (e.g., hours, sessions)
   * @param instanceId - Optional program instance UUID
   * @param userId - Optional user UUID
   * @returns Consumption result
   */
  async consumeCredits(
    campaignId: string,
    amount: number,
    activity: string,
    volumeUnit?: number,
    instanceId?: string,
    userId?: string
  ): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.pricing_model !== 'credits') {
      throw new Error(`Campaign ${campaignId} does not use credits pricing model`);
    }

    const creditAllocation = campaign.credit_allocation || 0;
    const creditsRemaining = campaign.credits_remaining ?? creditAllocation;

    if (creditsRemaining < amount) {
      // Check if overage is allowed (up to 10%)
      const creditsConsumed = creditAllocation - creditsRemaining;
      const newCreditsConsumed = creditsConsumed + amount;
      const utilizationWithOverage = creditAllocation > 0
        ? (newCreditsConsumed / creditAllocation)
        : 0;

      if (utilizationWithOverage > 1.10) {
        throw new Error(
          `Insufficient credits. Requested: ${amount}, Available: ${creditsRemaining}. ` +
          `Would exceed 110% overage limit.`
        );
      }
    }

    // Record consumption
    const newCreditsRemaining = creditsRemaining - amount;

    await this.sql`
      INSERT INTO campaign_credit_consumption (
        campaign_id,
        activity,
        amount,
        timestamp,
        volume_unit,
        instance_id,
        user_id
      ) VALUES (
        ${campaignId},
        ${activity},
        ${amount},
        NOW(),
        ${volumeUnit || null},
        ${instanceId || null},
        ${userId || null}
      )
    `;

    // Update campaign credits remaining
    await this.sql`
      UPDATE campaigns
      SET
        credits_remaining = ${newCreditsRemaining},
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Update program instance credits consumed if provided
    if (instanceId) {
      await this.sql`
        UPDATE program_instances
        SET
          credits_consumed = (credits_consumed::decimal(10,2) + ${amount}),
          updated_at = NOW()
        WHERE id = ${instanceId}
      `;
    }

    return true;
  }

  /**
   * Get credit balance for a campaign
   *
   * @param campaignId - Campaign UUID
   * @returns Credit balance summary
   */
  async getCreditBalance(campaignId: string): Promise<CreditBalance | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return null;

    if (campaign.pricing_model !== 'credits') {
      throw new Error(`Campaign ${campaignId} does not use credits pricing model`);
    }

    const creditAllocation = campaign.credit_allocation || 0;
    const creditsRemaining = campaign.credits_remaining ?? creditAllocation;
    const creditsConsumed = creditAllocation - creditsRemaining;

    const utilizationPercent = creditAllocation > 0
      ? Math.round((creditsConsumed / creditAllocation) * 10000) / 100
      : 0;

    // Get trend (compare to 7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [historicalSnapshot] = await this.sql`
      SELECT credits_consumed
      FROM campaign_metrics_snapshots
      WHERE campaign_id = ${campaignId}
        AND snapshot_date >= ${sevenDaysAgo.toISOString()}
        AND snapshot_date < NOW() - INTERVAL '7 days'
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (historicalSnapshot) {
      const historicalUsage = historicalSnapshot.credits_consumed || 0;
      if (creditsConsumed > historicalUsage * 1.1) {
        trend = 'increasing';
      } else if (creditsConsumed < historicalUsage * 0.9) {
        trend = 'decreasing';
      }
    }

    const isNearCapacity = utilizationPercent >= 80 && utilizationPercent < 100;
    const isAtCapacity = utilizationPercent >= 100 && utilizationPercent < 110;
    const isOverCapacity = utilizationPercent >= 110;

    return {
      campaignId,
      allocated: creditAllocation,
      consumed: Math.round(creditsConsumed * 100) / 100,
      remaining: Math.round(creditsRemaining * 100) / 100,
      utilizationPercent,
      utilizationTrend: trend,
      isNearCapacity,
      isAtCapacity,
      isOverCapacity,
      lastUpdateTime: new Date()
    };
  }

  /**
   * Get credit usage breakdown by activity type
   *
   * @param campaignId - Campaign UUID
   * @param startDate - Optional period start date
   * @param endDate - Optional period end date
   * @returns Credit usage breakdown
   */
  async getCreditUsageBreakdown(
    campaignId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CreditUsageBreakdown | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return null;

    if (campaign.pricing_model !== 'credits') {
      throw new Error(`Campaign ${campaignId} does not use credits pricing model`);
    }

    const start = startDate || new Date(campaign.start_date);
    const end = endDate || new Date(campaign.end_date);

    const creditAllocation = campaign.credit_allocation || 0;
    const creditsRemaining = campaign.credits_remaining ?? creditAllocation;
    const totalConsumed = creditAllocation - creditsRemaining;

    // Get consumption by activity type
    const consumptionByActivity = await this.sql`
      SELECT
        activity,
        COUNT(*) as count,
        SUM(amount) as total_credits
      FROM campaign_credit_consumption
      WHERE campaign_id = ${campaignId}
        AND timestamp >= ${start.toISOString()}
        AND timestamp <= ${end.toISOString()}
      GROUP BY activity
      ORDER BY total_credits DESC
    `;

    // Calculate daily consumption for trend
    const dailyTotals = await this.sql`
      SELECT
        DATE(timestamp) as date,
        SUM(amount) as daily_total
      FROM campaign_credit_consumption
      WHERE campaign_id = ${campaignId}
        AND timestamp >= ${start.toISOString()}
        AND timestamp <= ${end.toISOString()}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyConsumption = periodDays > 0
      ? Math.round((totalConsumed / periodDays) * 100) / 100
      : 0;

    // Calculate projected depletion
    let projectedDepletion: CreditUsageBreakdown['projectedDepletion'] | undefined;
    if (creditsRemaining > 0 && averageDailyConsumption > 0) {
      const daysUntilDepletion = Math.ceil(creditsRemaining / averageDailyConsumption);
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + daysUntilDepletion);

      projectedDepletion = {
        estimatedDepletionDate: depletionDate,
        daysUntilDepletion,
        creditPerDay: Math.round(averageDailyConsumption * 100) / 100
      };
    }

    const totalConsumptionByActivity = consumptionByActivity.reduce(
      (sum: number, row: any) => sum + (parseFloat(row.total_credits) || 0),
      0
    );

    return {
      campaignId,
      period: { startDate: start, endDate: end },
      totalAllocated: creditAllocation,
      totalConsumed: Math.round(totalConsumed * 100) / 100,
      totalRemaining: Math.round(creditsRemaining * 100) / 100,
      averageDailyConsumption,
      byActivityType: consumptionByActivity.map((row: any) => {
        const credits = parseFloat(row.total_credits) || 0;
        const percentOfTotal = totalConsumptionByActivity > 0
          ? Math.round((credits / totalConsumptionByActivity) * 10000) / 100
          : 0;

        return {
          activity: row.activity,
          count: parseInt(row.count) || 0,
          creditsConsumed: Math.round(credits * 100) / 100,
          percentOfTotal,
          averageCreditPerActivity: Math.round((credits / (parseInt(row.count) || 1)) * 100) / 100
        };
      }),
      projectedDepletion
    };
  }

  /**
   * Generate credit usage report for billing
   *
   * @param campaignId - Campaign UUID
   * @param startDate - Report period start
   * @param endDate - Report period end
   * @returns Credit usage report
   */
  async generateCreditUsageReport(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CreditUsageReport> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.pricing_model !== 'credits') {
      throw new Error(`Campaign ${campaignId} does not use credits pricing model`);
    }

    const creditAllocation = campaign.credit_allocation || 0;
    const creditConsumptionRate = parseFloat(campaign.credit_consumption_rate as any) || 1;
    const creditsRemaining = campaign.credits_remaining ?? creditAllocation;
    const totalConsumed = creditAllocation - creditsRemaining;

    // Get daily snapshots
    const snapshots = await this.sql`
      SELECT
        snapshot_date,
        credits_consumed
      FROM campaign_metrics_snapshots
      WHERE campaign_id = ${campaignId}
        AND snapshot_date >= ${startDate.toISOString()}
        AND snapshot_date <= ${endDate.toISOString()}
      ORDER BY snapshot_date ASC
    `;

    // Get consumption by activity type
    const consumptionByActivity = await this.sql`
      SELECT
        activity,
        COUNT(*) as count,
        SUM(amount) as total_credits
      FROM campaign_credit_consumption
      WHERE campaign_id = ${campaignId}
        AND timestamp >= ${startDate.toISOString()}
        AND timestamp <= ${endDate.toISOString()}
      GROUP BY activity
      ORDER BY total_credits DESC
    `;

    // Calculate statistics
    const consumedValues = snapshots.map((s: any) => s.credits_consumed || 0);
    const peakDailyConsumption = consumedValues.length > 0 ? Math.max(...consumedValues) : 0;
    const averageDailyConsumption = consumedValues.length > 0
      ? Math.round((consumedValues.reduce((a: number, b: number) => a + b, 0) / consumedValues.length) * 100) / 100
      : 0;

    const utilizationPercent = creditAllocation > 0
      ? Math.round((totalConsumed / creditAllocation) * 10000) / 100
      : 0;

    // Calculate period statistics
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgUtil = creditAllocation > 0
      ? Math.round(((totalConsumed / creditAllocation) / periodDays) * 10000) / 100
      : 0;
    const peakUtil = creditAllocation > 0
      ? Math.round((peakDailyConsumption / creditAllocation) * 10000) / 100
      : 0;

    const daysAtCapacity = snapshots.filter((s: any) => (s.credits_consumed || 0) >= creditAllocation).length;
    const daysOverCapacity = snapshots.filter((s: any) => (s.credits_consumed || 0) > creditAllocation).length;

    const projectedMonthlyBurn = Math.round(averageDailyConsumption * 30 * 100) / 100;

    const totalActivityConsumption = consumptionByActivity.reduce(
      (sum: number, row: any) => sum + (parseFloat(row.total_credits) || 0),
      0
    );

    return {
      campaignId,
      campaignName: campaign.name,
      period: { startDate, endDate },
      pricingModel: campaign.pricing_model,
      creditAllocation,
      creditConsumptionRate,
      peakDailyConsumption: Math.round(peakDailyConsumption * 100) / 100,
      averageDailyConsumption,
      totalCreditsConsumed: Math.round(totalConsumed * 100) / 100,
      creditsRemaining: Math.round(creditsRemaining * 100) / 100,
      utilizationPercent,
      dailySnapshots: snapshots.map((s: any) => ({
        date: new Date(s.snapshot_date),
        creditsConsumed: s.credits_consumed || 0,
        utilizationPercent: creditAllocation > 0
          ? Math.round(((s.credits_consumed || 0) / creditAllocation) * 10000) / 100
          : 0
      })),
      consumptionByActivity: consumptionByActivity.map((row: any) => {
        const credits = parseFloat(row.total_credits) || 0;
        const percentOfTotal = totalActivityConsumption > 0
          ? Math.round((credits / totalActivityConsumption) * 10000) / 100
          : 0;

        return {
          activity: row.activity,
          count: parseInt(row.count) || 0,
          creditsConsumed: Math.round(credits * 100) / 100,
          percentOfTotal
        };
      }),
      summary: {
        totalDaysInPeriod: periodDays,
        averageUtilization: avgUtil,
        peakUtilization: peakUtil,
        daysAtCapacity,
        daysOverCapacity,
        projectedMonthlyBurn
      }
    };
  }

  /**
   * Check credit capacity thresholds
   *
   * @param campaignId - Campaign UUID
   * @returns Capacity threshold status
   */
  async checkCreditCapacityThreshold(campaignId: string): Promise<CreditCapacityThreshold> {
    const balance = await this.getCreditBalance(campaignId);
    if (!balance) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    let threshold: 'under_80' | 'at_80' | 'at_90' | 'at_100' | 'over_100';
    let recommendation: string;
    let daysUntilDepletion: number | undefined;

    if (balance.utilizationPercent < 80) {
      threshold = 'under_80';
      recommendation = 'Credits are underutilized. On track for the campaign period.';
    } else if (balance.utilizationPercent < 90) {
      threshold = 'at_80';
      recommendation = 'Good credit utilization. Monitor consumption rate.';
      // Calculate days until depletion
      const avgDailyConsumption = balance.consumed / 30; // Rough estimate
      if (avgDailyConsumption > 0) {
        daysUntilDepletion = Math.ceil(balance.remaining / avgDailyConsumption);
      }
    } else if (balance.utilizationPercent < 100) {
      threshold = 'at_90';
      recommendation = 'Approaching credit limit. Consider purchasing additional credits.';
      const avgDailyConsumption = balance.consumed / 30;
      if (avgDailyConsumption > 0) {
        daysUntilDepletion = Math.ceil(balance.remaining / avgDailyConsumption);
      }
    } else if (balance.utilizationPercent <= 110) {
      threshold = 'at_100';
      recommendation = 'Credit limit exceeded. Immediate purchase required to continue activities.';
    } else {
      threshold = 'over_100';
      recommendation = 'Credits severely depleted. Operations may be limited or blocked.';
    }

    return {
      campaignId,
      currentUtilization: balance.utilizationPercent,
      threshold,
      thresholdPercent: balance.utilizationPercent,
      daysUntilDepletion,
      recommendation,
      requiresAction: balance.isNearCapacity || balance.isAtCapacity || balance.isOverCapacity
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getCampaign(campaignId: string): Promise<Campaign | null> {
    const [campaign] = await this.sql`
      SELECT
        id,
        name,
        pricing_model,
        credit_allocation,
        credits_remaining,
        credit_consumption_rate,
        start_date,
        end_date
      FROM campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;
    return campaign || null;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new CreditTracker instance
 */
export function createCreditTracker(sql: postgres.Sql): CreditTracker {
  return new CreditTracker(sql);
}
