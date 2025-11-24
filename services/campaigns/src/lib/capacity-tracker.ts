/**
 * Campaign Capacity Tracker
 *
 * SWARM 6: Agent 3.3 - capacity-tracker
 *
 * Responsibilities:
 * - Track seat/credit/quota consumption per campaign
 * - Enforce capacity limits
 * - Calculate utilization percentages
 * - Trigger alerts at thresholds (80%, 90%, 100%, 110%)
 *
 * Pricing Models Supported:
 * - Seats: Track volunteers <= committedSeats
 * - Credits: Track creditsConsumed <= creditAllocation
 * - IAAS: Track learnersServed <= learnersCommitted
 * - Bundle: Share quota across campaigns proportionally
 */

import type { Campaign } from '@teei/shared-schema';
import postgres from 'postgres';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Capacity status for a campaign
 */
export interface CapacityStatus {
  campaignId: string;
  pricingModel: string;

  // Volunteer capacity
  volunteers: {
    target: number;
    current: number;
    available: number;
    utilizationPercent: number;
  };

  // Beneficiary capacity
  beneficiaries: {
    target: number;
    current: number;
    available: number;
    utilizationPercent: number;
  };

  // Model-specific capacity
  seats?: {
    committed: number;
    used: number;
    available: number;
    utilizationPercent: number;
  };

  credits?: {
    allocated: number;
    consumed: number;
    remaining: number;
    utilizationPercent: number;
  };

  iaas?: {
    learnersCommitted: number;
    learnersServed: number;
    remaining: number;
    utilizationPercent: number;
  };

  // Capacity flags
  isNearCapacity: boolean; // >= 80%
  isAtCapacity: boolean; // >= 100%
  isOverCapacity: boolean; // > 100%
  allowsOverage: boolean; // Can go up to 110%

  // Overall utilization
  overallUtilization: number;
}

/**
 * Capacity alert configuration
 */
export interface CapacityAlert {
  campaignId: string;
  threshold: '80%' | '90%' | '100%' | '110%';
  utilizationPercent: number;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recipients: Array<'sales' | 'company_admin' | 'cs'>;
  metadata?: Record<string, any>;
}

/**
 * Consumption result
 */
export interface ConsumptionResult {
  success: boolean;
  allowed: boolean;
  newUtilization: number;
  reason?: string;
  alerts?: CapacityAlert[];
}

// ============================================================================
// CAPACITY TRACKER CLASS
// ============================================================================

export class CapacityTracker {
  constructor(private sql: postgres.Sql) {}

  /**
   * Consume a volunteer seat for a campaign
   * Returns true if capacity available, false if at/over capacity
   *
   * Enforcement:
   * - Seats model: currentVolunteers must be <= committedSeats
   * - Other models: check targetVolunteers
   * - Allow 10% overage with warning
   */
  async consumeSeat(campaignId: string, volunteerId: string): Promise<ConsumptionResult> {
    const campaign = await this.getCampaign(campaignId);

    if (!campaign) {
      return {
        success: false,
        allowed: false,
        newUtilization: 0,
        reason: 'Campaign not found'
      };
    }

    // Determine capacity limit based on pricing model
    let capacityLimit: number;
    let currentCount = campaign.current_volunteers || 0;

    if (campaign.pricing_model === 'seats' && campaign.committed_seats) {
      capacityLimit = campaign.committed_seats;
    } else {
      capacityLimit = campaign.target_volunteers;
    }

    // Calculate new utilization
    const newCount = currentCount + 1;
    const newUtilization = capacityLimit > 0 ? (newCount / capacityLimit) : 0;

    // Enforcement logic
    // - Block if over 110% (overage limit)
    // - Allow if under 110% but warn if over 100%
    const OVERAGE_LIMIT = 1.10;

    if (newUtilization > OVERAGE_LIMIT) {
      return {
        success: false,
        allowed: false,
        newUtilization,
        reason: `Campaign at ${this.round(newUtilization * 100, 0)}% capacity. Maximum overage (110%) exceeded.`,
        alerts: await this.checkCapacityThreshold(campaignId, newUtilization)
      };
    }

    // Update campaign volunteer count
    await this.sql`
      UPDATE campaigns
      SET
        current_volunteers = current_volunteers + 1,
        capacity_utilization = ${newUtilization},
        is_near_capacity = ${newUtilization >= 0.8 && newUtilization < 1.0},
        is_over_capacity = ${newUtilization > 1.0},
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Check for alerts
    const alerts = await this.checkCapacityThreshold(campaignId, newUtilization);

    return {
      success: true,
      allowed: true,
      newUtilization,
      reason: newUtilization > 1.0 ? 'Overage allowed (max 110%)' : undefined,
      alerts: alerts.length > 0 ? alerts : undefined
    };
  }

  /**
   * Consume credits for a campaign (credits model)
   * Returns true if credits available, false otherwise
   */
  async consumeCredits(campaignId: string, amount: number): Promise<ConsumptionResult> {
    const campaign = await this.getCampaign(campaignId);

    if (!campaign) {
      return {
        success: false,
        allowed: false,
        newUtilization: 0,
        reason: 'Campaign not found'
      };
    }

    if (campaign.pricing_model !== 'credits') {
      return {
        success: false,
        allowed: false,
        newUtilization: 0,
        reason: 'Campaign does not use credits pricing model'
      };
    }

    const creditAllocation = campaign.credit_allocation || 0;
    const creditsRemaining = campaign.credits_remaining ?? creditAllocation;

    if (creditsRemaining < amount) {
      // Check if overage is allowed (up to 10% over allocation)
      const creditsConsumed = creditAllocation - creditsRemaining;
      const newCreditsConsumed = creditsConsumed + amount;
      const utilizationWithOverage = creditAllocation > 0 ? (newCreditsConsumed / creditAllocation) : 0;

      if (utilizationWithOverage > 1.10) {
        return {
          success: false,
          allowed: false,
          newUtilization: utilizationWithOverage,
          reason: `Insufficient credits. Requested: ${amount}, Available: ${creditsRemaining}, Overage limit exceeded.`
        };
      }
    }

    // Consume credits
    const newCreditsRemaining = creditsRemaining - amount;
    const creditsConsumed = creditAllocation - newCreditsRemaining;
    const newUtilization = creditAllocation > 0 ? (creditsConsumed / creditAllocation) : 0;

    await this.sql`
      UPDATE campaigns
      SET
        credits_remaining = ${newCreditsRemaining},
        capacity_utilization = ${newUtilization},
        is_near_capacity = ${newUtilization >= 0.8 && newUtilization < 1.0},
        is_over_capacity = ${newUtilization > 1.0},
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Check for alerts
    const alerts = await this.checkCapacityThreshold(campaignId, newUtilization);

    return {
      success: true,
      allowed: true,
      newUtilization,
      reason: newUtilization > 1.0 ? 'Credit overage allowed (max 110%)' : undefined,
      alerts: alerts.length > 0 ? alerts : undefined
    };
  }

  /**
   * Consume a learner slot for IAAS model campaigns
   * Returns true if capacity available, false otherwise
   */
  async consumeLearner(campaignId: string, learnerId: string): Promise<ConsumptionResult> {
    const campaign = await this.getCampaign(campaignId);

    if (!campaign) {
      return {
        success: false,
        allowed: false,
        newUtilization: 0,
        reason: 'Campaign not found'
      };
    }

    if (campaign.pricing_model !== 'iaas') {
      return {
        success: false,
        allowed: false,
        newUtilization: 0,
        reason: 'Campaign does not use IAAS pricing model'
      };
    }

    const iaasMetrics = campaign.iaas_metrics as { learnersCommitted?: number } | null;
    const learnersCommitted = iaasMetrics?.learnersCommitted || campaign.target_beneficiaries;
    const currentBeneficiaries = campaign.current_beneficiaries || 0;

    // Calculate new utilization
    const newCount = currentBeneficiaries + 1;
    const newUtilization = learnersCommitted > 0 ? (newCount / learnersCommitted) : 0;

    // Enforcement: Allow up to 110% overage
    const OVERAGE_LIMIT = 1.10;

    if (newUtilization > OVERAGE_LIMIT) {
      return {
        success: false,
        allowed: false,
        newUtilization,
        reason: `IAAS campaign at ${this.round(newUtilization * 100, 0)}% learner capacity. Maximum overage exceeded.`
      };
    }

    // Update beneficiary count
    await this.sql`
      UPDATE campaigns
      SET
        current_beneficiaries = current_beneficiaries + 1,
        capacity_utilization = ${newUtilization},
        is_near_capacity = ${newUtilization >= 0.8 && newUtilization < 1.0},
        is_over_capacity = ${newUtilization > 1.0},
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Check for alerts
    const alerts = await this.checkCapacityThreshold(campaignId, newUtilization);

    return {
      success: true,
      allowed: true,
      newUtilization,
      reason: newUtilization > 1.0 ? 'Learner overage allowed (max 110%)' : undefined,
      alerts: alerts.length > 0 ? alerts : undefined
    };
  }

  /**
   * Get comprehensive capacity status for a campaign
   */
  async getCapacityUtilization(campaignId: string): Promise<CapacityStatus | null> {
    const campaign = await this.getCampaign(campaignId);

    if (!campaign) {
      return null;
    }

    // Volunteer capacity
    const targetVolunteers = campaign.target_volunteers || 0;
    const currentVolunteers = campaign.current_volunteers || 0;
    const volunteerUtilization = targetVolunteers > 0
      ? (currentVolunteers / targetVolunteers)
      : 0;

    // Beneficiary capacity
    const targetBeneficiaries = campaign.target_beneficiaries || 0;
    const currentBeneficiaries = campaign.current_beneficiaries || 0;
    const beneficiaryUtilization = targetBeneficiaries > 0
      ? (currentBeneficiaries / targetBeneficiaries)
      : 0;

    const status: CapacityStatus = {
      campaignId,
      pricingModel: campaign.pricing_model,
      volunteers: {
        target: targetVolunteers,
        current: currentVolunteers,
        available: Math.max(0, targetVolunteers - currentVolunteers),
        utilizationPercent: this.round(volunteerUtilization * 100, 2)
      },
      beneficiaries: {
        target: targetBeneficiaries,
        current: currentBeneficiaries,
        available: Math.max(0, targetBeneficiaries - currentBeneficiaries),
        utilizationPercent: this.round(beneficiaryUtilization * 100, 2)
      },
      isNearCapacity: false,
      isAtCapacity: false,
      isOverCapacity: false,
      allowsOverage: true, // All models allow 10% overage
      overallUtilization: volunteerUtilization
    };

    // Add model-specific capacity tracking
    switch (campaign.pricing_model) {
      case 'seats':
        const committedSeats = campaign.committed_seats || 0;
        const seatUtilization = committedSeats > 0 ? (currentVolunteers / committedSeats) : 0;
        status.seats = {
          committed: committedSeats,
          used: currentVolunteers,
          available: Math.max(0, committedSeats - currentVolunteers),
          utilizationPercent: this.round(seatUtilization * 100, 2)
        };
        status.overallUtilization = seatUtilization;
        break;

      case 'credits':
        const creditAllocation = campaign.credit_allocation || 0;
        const creditsRemaining = campaign.credits_remaining ?? creditAllocation;
        const creditsConsumed = creditAllocation - creditsRemaining;
        const creditUtilization = creditAllocation > 0 ? (creditsConsumed / creditAllocation) : 0;
        status.credits = {
          allocated: creditAllocation,
          consumed: creditsConsumed,
          remaining: creditsRemaining,
          utilizationPercent: this.round(creditUtilization * 100, 2)
        };
        status.overallUtilization = creditUtilization;
        break;

      case 'iaas':
        const iaasMetrics = campaign.iaas_metrics as { learnersCommitted?: number } | null;
        const learnersCommitted = iaasMetrics?.learnersCommitted || targetBeneficiaries;
        const iaasUtilization = learnersCommitted > 0 ? (currentBeneficiaries / learnersCommitted) : 0;
        status.iaas = {
          learnersCommitted,
          learnersServed: currentBeneficiaries,
          remaining: Math.max(0, learnersCommitted - currentBeneficiaries),
          utilizationPercent: this.round(iaasUtilization * 100, 2)
        };
        status.overallUtilization = iaasUtilization;
        break;

      case 'bundle':
        // For bundle model, use volunteer utilization
        // Bundle quota is shared across campaigns proportionally
        status.overallUtilization = volunteerUtilization;
        break;

      case 'custom':
        // For custom pricing, use volunteer utilization as default
        status.overallUtilization = volunteerUtilization;
        break;
    }

    // Set capacity flags
    status.isNearCapacity = status.overallUtilization >= 0.8 && status.overallUtilization < 1.0;
    status.isAtCapacity = status.overallUtilization >= 1.0 && status.overallUtilization <= 1.10;
    status.isOverCapacity = status.overallUtilization > 1.0;

    return status;
  }

  /**
   * Check capacity thresholds and return alerts if triggered
   *
   * Alert Thresholds:
   * - 80%: Upsell opportunity (notify sales)
   * - 90%: Expansion recommended (notify company admin)
   * - 100%: At capacity (notify company admin + CS)
   * - 110%: Over capacity (block new enrollments, escalate to CS)
   */
  async checkCapacityThreshold(campaignId: string, utilization?: number): Promise<CapacityAlert[]> {
    const alerts: CapacityAlert[] = [];

    // Get current utilization if not provided
    let currentUtilization = utilization;
    if (currentUtilization === undefined) {
      const status = await this.getCapacityUtilization(campaignId);
      if (!status) return alerts;
      currentUtilization = status.overallUtilization;
    }

    const utilizationPercent = this.round(currentUtilization * 100, 0);

    // 110% threshold - CRITICAL
    if (currentUtilization >= 1.10) {
      alerts.push({
        campaignId,
        threshold: '110%',
        utilizationPercent,
        message: `Campaign has exceeded maximum capacity (110%). New enrollments blocked.`,
        severity: 'critical',
        recipients: ['company_admin', 'cs'],
        metadata: {
          action: 'block_enrollments',
          escalation: true
        }
      });
    }
    // 100% threshold - ERROR
    else if (currentUtilization >= 1.00) {
      alerts.push({
        campaignId,
        threshold: '100%',
        utilizationPercent,
        message: `Campaign is at full capacity (${utilizationPercent}%). Consider expansion.`,
        severity: 'error',
        recipients: ['company_admin', 'cs'],
        metadata: {
          action: 'recommend_expansion',
          upsell: true
        }
      });
    }
    // 90% threshold - WARNING
    else if (currentUtilization >= 0.90) {
      alerts.push({
        campaignId,
        threshold: '90%',
        utilizationPercent,
        message: `Campaign approaching capacity (${utilizationPercent}%). Expansion recommended.`,
        severity: 'warning',
        recipients: ['company_admin'],
        metadata: {
          action: 'recommend_expansion',
          upsell: true
        }
      });
    }
    // 80% threshold - INFO
    else if (currentUtilization >= 0.80) {
      alerts.push({
        campaignId,
        threshold: '80%',
        utilizationPercent,
        message: `Campaign utilization healthy (${utilizationPercent}%). Upsell opportunity.`,
        severity: 'info',
        recipients: ['sales'],
        metadata: {
          action: 'upsell_opportunity',
          upsell: true
        }
      });
    }

    return alerts;
  }

  /**
   * Bundle model: Get shared quota across campaigns
   * Returns total utilization across all campaigns in a bundle
   */
  async getBundleCapacityUtilization(l2iSubscriptionId: string): Promise<{
    totalAllocated: number;
    totalConsumed: number;
    utilizationPercent: number;
    campaigns: Array<{
      campaignId: string;
      name: string;
      allocationPercentage: number;
      currentVolunteers: number;
      utilization: number;
    }>;
  } | null> {
    const campaigns = await this.sql`
      SELECT
        id,
        name,
        bundle_allocation_percentage,
        current_volunteers,
        target_volunteers,
        capacity_utilization
      FROM campaigns
      WHERE
        l2i_subscription_id = ${l2iSubscriptionId}
        AND is_active = true
    `;

    if (campaigns.length === 0) {
      return null;
    }

    // Calculate total bundle utilization
    const totalConsumed = campaigns.reduce((sum, c) => sum + (c.current_volunteers || 0), 0);
    const totalAllocated = campaigns.reduce((sum, c) => sum + (c.target_volunteers || 0), 0);
    const utilizationPercent = totalAllocated > 0
      ? this.round((totalConsumed / totalAllocated) * 100, 2)
      : 0;

    return {
      totalAllocated,
      totalConsumed,
      utilizationPercent,
      campaigns: campaigns.map(c => ({
        campaignId: c.id,
        name: c.name,
        allocationPercentage: parseFloat(c.bundle_allocation_percentage || '0'),
        currentVolunteers: c.current_volunteers || 0,
        utilization: parseFloat(c.capacity_utilization || '0')
      }))
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getCampaign(campaignId: string): Promise<any | null> {
    const [campaign] = await this.sql`
      SELECT * FROM campaigns WHERE id = ${campaignId} LIMIT 1
    `;
    return campaign || null;
  }

  private round(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new CapacityTracker instance
 */
export function createCapacityTracker(sql: postgres.Sql): CapacityTracker {
  return new CapacityTracker(sql);
}
