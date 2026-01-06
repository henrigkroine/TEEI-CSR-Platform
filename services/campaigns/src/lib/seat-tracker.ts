/**
 * Seat Tracker for Campaigns
 *
 * SWARM 6: Agent 5.2 - seat-credit-tracker
 *
 * Responsibilities:
 * - Track volunteer seats consumed per campaign
 * - Calculate remaining capacity (committed seats)
 * - Generate seat usage reports for billing
 * - Provide seat allocation and deallocation
 *
 * Pricing Model: Seats
 * - Companies purchase committed volunteer slots
 * - Monthly billing based on seat allocation
 * - Tracks utilization for upsell opportunities
 */

import type { Campaign, ProgramInstance } from '@teei/shared-schema';
import postgres from 'postgres';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Seat allocation tracking
 */
export interface SeatAllocation {
  campaignId: string;
  volunteerId: string;
  instanceId?: string;
  allocationDate: Date;
  deallocationDate?: Date;
  isActive: boolean;
  status: 'allocated' | 'deallocated' | 'paused';
  metadata?: Record<string, any>;
}

/**
 * Seat usage summary for a campaign
 */
export interface SeatUsage {
  campaignId: string;
  committedSeats: number;
  allocatedSeats: number;
  availableSeats: number;
  utilizationPercent: number;
  utilizationTrend: 'stable' | 'increasing' | 'decreasing';
  isNearCapacity: boolean;
  isAtCapacity: boolean;
  isOverCapacity: boolean;
}

/**
 * Seat usage report for billing
 */
export interface SeatUsageReport {
  campaignId: string;
  campaignName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  committedSeats: number;
  peakSeatsUsed: number;
  averageSeatsUsed: number;
  totalSeatMonths: number; // Billable seat-months
  dailySnapshots: Array<{
    date: Date;
    seatsUsed: number;
    utilizationPercent: number;
  }>;
  allocations: Array<{
    volunteerId: string;
    allocationDate: Date;
    deallocationDate?: Date;
    daysAllocated: number;
  }>;
  summary: {
    totalDaysInPeriod: number;
    averageUtilization: number;
    peakUtilization: number;
    daysAtCapacity: number;
    daysOverCapacity: number;
  };
}

/**
 * Seat allocation change event
 */
export interface SeatAllocationEvent {
  campaignId: string;
  volunteerId: string;
  instanceId?: string;
  type: 'allocate' | 'deallocate';
  timestamp: Date;
  previousCount: number;
  newCount: number;
  metadata?: Record<string, any>;
}

/**
 * Seat capacity threshold result
 */
export interface SeatCapacityThreshold {
  campaignId: string;
  currentUtilization: number;
  threshold: 'under_80' | 'at_80' | 'at_90' | 'at_100' | 'over_100';
  thresholdPercent: number;
  recommendation: string;
  requiresAction: boolean;
}

// ============================================================================
// SEAT TRACKER CLASS
// ============================================================================

export class SeatTracker {
  constructor(private sql: postgres.Sql) {}

  /**
   * Track seat usage for a volunteer in a campaign
   *
   * @param campaignId - Campaign UUID
   * @param volunteerId - Volunteer UUID
   * @param instanceId - Optional program instance UUID
   * @returns Updated seat allocation
   */
  async trackSeatUsage(
    campaignId: string,
    volunteerId: string,
    instanceId?: string
  ): Promise<SeatAllocation> {
    // Check if allocation already exists for this volunteer in this campaign
    const [existing] = await this.sql`
      SELECT id FROM campaign_seat_allocations
      WHERE campaign_id = ${campaignId}
        AND volunteer_id = ${volunteerId}
        AND status = 'allocated'
      LIMIT 1
    `;

    if (existing) {
      // Already allocated, return existing allocation
      return this.getSeatAllocation(campaignId, volunteerId);
    }

    // Create new seat allocation
    const [allocation] = await this.sql`
      INSERT INTO campaign_seat_allocations (
        campaign_id,
        volunteer_id,
        instance_id,
        allocation_date,
        is_active,
        status
      ) VALUES (
        ${campaignId},
        ${volunteerId},
        ${instanceId || null},
        NOW(),
        true,
        'allocated'
      ) RETURNING
        campaign_id,
        volunteer_id,
        instance_id,
        allocation_date,
        deallocation_date,
        is_active,
        status
    `;

    // Update campaign seat count
    await this.sql`
      UPDATE campaigns
      SET
        current_volunteers = current_volunteers + 1,
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Update program instance volunteer count if provided
    if (instanceId) {
      await this.sql`
        UPDATE program_instances
        SET
          enrolled_volunteers = enrolled_volunteers + 1,
          volunteers_consumed = volunteers_consumed + 1,
          updated_at = NOW()
        WHERE id = ${instanceId}
      `;
    }

    // Create allocation event for audit trail
    await this.createAllocationEvent({
      campaignId,
      volunteerId,
      instanceId,
      type: 'allocate',
      timestamp: allocation.allocation_date,
      previousCount: 0,
      newCount: 1,
      metadata: { source: 'trackSeatUsage' }
    });

    return {
      campaignId: allocation.campaign_id,
      volunteerId: allocation.volunteer_id,
      instanceId: allocation.instance_id,
      allocationDate: allocation.allocation_date,
      deallocationDate: allocation.deallocation_date,
      isActive: allocation.is_active,
      status: allocation.status
    };
  }

  /**
   * Get seat usage for a campaign
   *
   * @param campaignId - Campaign UUID
   * @returns Seat usage summary
   */
  async getSeatUsage(campaignId: string): Promise<SeatUsage | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return null;

    // Get committed seats based on pricing model
    let committedSeats: number;
    if (campaign.pricing_model === 'seats' && campaign.committed_seats) {
      committedSeats = campaign.committed_seats;
    } else {
      committedSeats = campaign.target_volunteers;
    }

    const allocatedSeats = campaign.current_volunteers || 0;
    const availableSeats = Math.max(0, committedSeats - allocatedSeats);
    const utilizationPercent = committedSeats > 0
      ? Math.round((allocatedSeats / committedSeats) * 10000) / 100
      : 0;

    // Get trend (compare to 7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [historicalSnapshot] = await this.sql`
      SELECT seats_used
      FROM campaign_metrics_snapshots
      WHERE campaign_id = ${campaignId}
        AND snapshot_date >= ${sevenDaysAgo.toISOString()}
        AND snapshot_date < NOW() - INTERVAL '7 days'
      ORDER BY snapshot_date DESC
      LIMIT 1
    `;

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (historicalSnapshot) {
      const historicalUsage = historicalSnapshot.seats_used || 0;
      if (allocatedSeats > historicalUsage * 1.1) {
        trend = 'increasing';
      } else if (allocatedSeats < historicalUsage * 0.9) {
        trend = 'decreasing';
      }
    }

    const isNearCapacity = utilizationPercent >= 80 && utilizationPercent < 100;
    const isAtCapacity = utilizationPercent >= 100 && utilizationPercent < 110;
    const isOverCapacity = utilizationPercent >= 110;

    return {
      campaignId,
      committedSeats,
      allocatedSeats,
      availableSeats,
      utilizationPercent,
      utilizationTrend: trend,
      isNearCapacity,
      isAtCapacity,
      isOverCapacity
    };
  }

  /**
   * Get available seats remaining in a campaign
   *
   * @param campaignId - Campaign UUID
   * @returns Number of available seats
   */
  async getAvailableSeats(campaignId: string): Promise<number> {
    const usage = await this.getSeatUsage(campaignId);
    return usage ? usage.availableSeats : 0;
  }

  /**
   * Deallocate a volunteer seat
   *
   * @param campaignId - Campaign UUID
   * @param volunteerId - Volunteer UUID
   * @returns Deallocation result
   */
  async deallocateSeat(campaignId: string, volunteerId: string): Promise<boolean> {
    const [result] = await this.sql`
      UPDATE campaign_seat_allocations
      SET
        is_active = false,
        status = 'deallocated',
        deallocation_date = NOW()
      WHERE campaign_id = ${campaignId}
        AND volunteer_id = ${volunteerId}
        AND status = 'allocated'
      RETURNING id
    `;

    if (!result) {
      return false;
    }

    // Update campaign seat count
    await this.sql`
      UPDATE campaigns
      SET
        current_volunteers = GREATEST(0, current_volunteers - 1),
        updated_at = NOW()
      WHERE id = ${campaignId}
    `;

    // Create deallocation event
    await this.createAllocationEvent({
      campaignId,
      volunteerId,
      type: 'deallocate',
      timestamp: new Date(),
      previousCount: 1,
      newCount: 0,
      metadata: { source: 'deallocateSeat' }
    });

    return true;
  }

  /**
   * Get seat allocation record
   *
   * @param campaignId - Campaign UUID
   * @param volunteerId - Volunteer UUID
   * @returns Allocation record or null
   */
  async getSeatAllocation(campaignId: string, volunteerId: string): Promise<SeatAllocation> {
    const [allocation] = await this.sql`
      SELECT
        campaign_id,
        volunteer_id,
        instance_id,
        allocation_date,
        deallocation_date,
        is_active,
        status
      FROM campaign_seat_allocations
      WHERE campaign_id = ${campaignId}
        AND volunteer_id = ${volunteerId}
      ORDER BY allocation_date DESC
      LIMIT 1
    `;

    if (!allocation) {
      throw new Error(`Seat allocation not found for campaign ${campaignId}, volunteer ${volunteerId}`);
    }

    return {
      campaignId: allocation.campaign_id,
      volunteerId: allocation.volunteer_id,
      instanceId: allocation.instance_id,
      allocationDate: allocation.allocation_date,
      deallocationDate: allocation.deallocation_date,
      isActive: allocation.is_active,
      status: allocation.status
    };
  }

  /**
   * Generate seat usage report for billing
   *
   * @param campaignId - Campaign UUID
   * @param startDate - Report period start
   * @param endDate - Report period end
   * @returns Seat usage report
   */
  async generateSeatUsageReport(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SeatUsageReport> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const committedSeats = campaign.pricing_model === 'seats' && campaign.committed_seats
      ? campaign.committed_seats
      : campaign.target_volunteers;

    // Get daily snapshots for the period
    const snapshots = await this.sql`
      SELECT
        snapshot_date,
        seats_used
      FROM campaign_metrics_snapshots
      WHERE campaign_id = ${campaignId}
        AND snapshot_date >= ${startDate.toISOString()}
        AND snapshot_date <= ${endDate.toISOString()}
      ORDER BY snapshot_date ASC
    `;

    // Get allocations for the period
    const allocations = await this.sql`
      SELECT
        volunteer_id,
        allocation_date,
        deallocation_date
      FROM campaign_seat_allocations
      WHERE campaign_id = ${campaignId}
        AND allocation_date <= ${endDate.toISOString()}
        AND (deallocation_date IS NULL OR deallocation_date >= ${startDate.toISOString()})
      ORDER BY allocation_date ASC
    `;

    // Calculate statistics
    const seatsUsedValues = snapshots.map((s: any) => s.seats_used || 0);
    const peakSeatsUsed = seatsUsedValues.length > 0 ? Math.max(...seatsUsedValues) : 0;
    const averageSeatsUsed = seatsUsedValues.length > 0
      ? Math.round(seatsUsedValues.reduce((a: number, b: number) => a + b, 0) / seatsUsedValues.length * 100) / 100
      : 0;

    // Calculate total seat-months (billable units)
    const totalSeatMonths = this.calculateSeatMonths(allocations, startDate, endDate, committedSeats);

    // Calculate summary statistics
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgUtil = seatsUsedValues.length > 0
      ? Math.round((seatsUsedValues.reduce((a: number, b: number) => a + b, 0) / seatsUsedValues.length / committedSeats) * 10000) / 100
      : 0;
    const peakUtil = committedSeats > 0
      ? Math.round((peakSeatsUsed / committedSeats) * 10000) / 100
      : 0;

    const daysAtCapacity = snapshots.filter((s: any) => (s.seats_used || 0) >= committedSeats).length;
    const daysOverCapacity = snapshots.filter((s: any) => (s.seats_used || 0) > committedSeats).length;

    return {
      campaignId,
      campaignName: campaign.name,
      period: {
        startDate,
        endDate
      },
      committedSeats,
      peakSeatsUsed,
      averageSeatsUsed,
      totalSeatMonths,
      dailySnapshots: snapshots.map((s: any) => ({
        date: new Date(s.snapshot_date),
        seatsUsed: s.seats_used || 0,
        utilizationPercent: committedSeats > 0
          ? Math.round(((s.seats_used || 0) / committedSeats) * 10000) / 100
          : 0
      })),
      allocations: allocations.map((a: any) => {
        const allocStart = new Date(a.allocation_date);
        const allocEnd = a.deallocation_date ? new Date(a.deallocation_date) : endDate;
        const periodStart = allocStart > startDate ? allocStart : startDate;
        const periodEnd = allocEnd < endDate ? allocEnd : endDate;
        const daysAllocated = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

        return {
          volunteerId: a.volunteer_id,
          allocationDate: allocStart,
          deallocationDate: a.deallocation_date ? new Date(a.deallocation_date) : undefined,
          daysAllocated: Math.max(0, daysAllocated)
        };
      }),
      summary: {
        totalDaysInPeriod: periodDays,
        averageUtilization: avgUtil,
        peakUtilization: peakUtil,
        daysAtCapacity,
        daysOverCapacity
      }
    };
  }

  /**
   * Check seat capacity thresholds
   *
   * @param campaignId - Campaign UUID
   * @returns Capacity threshold status
   */
  async checkSeatCapacityThreshold(campaignId: string): Promise<SeatCapacityThreshold> {
    const usage = await this.getSeatUsage(campaignId);
    if (!usage) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    let threshold: 'under_80' | 'at_80' | 'at_90' | 'at_100' | 'over_100';
    let recommendation: string;

    if (usage.utilizationPercent < 80) {
      threshold = 'under_80';
      recommendation = 'Seats are underutilized. Consider reducing committed seats or increasing marketing.';
    } else if (usage.utilizationPercent < 90) {
      threshold = 'at_80';
      recommendation = 'Good seat utilization. Monitor for growth opportunities.';
    } else if (usage.utilizationPercent < 100) {
      threshold = 'at_90';
      recommendation = 'Approaching capacity. Consider expanding committed seats to avoid blocking enrollments.';
    } else if (usage.utilizationPercent <= 110) {
      threshold = 'at_100';
      recommendation = 'At or near capacity. Immediate expansion recommended to prevent blocking enrollments.';
    } else {
      threshold = 'over_100';
      recommendation = 'Over capacity. Urgent expansion needed. New enrollments may be blocked.';
    }

    return {
      campaignId,
      currentUtilization: usage.utilizationPercent,
      threshold,
      thresholdPercent: usage.utilizationPercent,
      recommendation,
      requiresAction: usage.isNearCapacity || usage.isAtCapacity || usage.isOverCapacity
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
        committed_seats,
        target_volunteers,
        current_volunteers
      FROM campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;
    return campaign || null;
  }

  private async createAllocationEvent(event: SeatAllocationEvent): Promise<void> {
    await this.sql`
      INSERT INTO campaign_seat_allocation_events (
        campaign_id,
        volunteer_id,
        instance_id,
        type,
        timestamp,
        previous_count,
        new_count,
        metadata
      ) VALUES (
        ${event.campaignId},
        ${event.volunteerId},
        ${event.instanceId || null},
        ${event.type},
        ${event.timestamp},
        ${event.previousCount},
        ${event.newCount},
        ${JSON.stringify(event.metadata || {})}
      )
    `;
  }

  /**
   * Calculate billable seat-months from allocations
   *
   * Seat-months = sum of (days allocated / 30) for each volunteer
   * Only counts days within the report period
   */
  private calculateSeatMonths(
    allocations: any[],
    startDate: Date,
    endDate: Date,
    committedSeats: number
  ): number {
    let totalSeatDays = 0;

    for (const alloc of allocations) {
      const allocStart = new Date(alloc.allocation_date);
      const allocEnd = alloc.deallocation_date ? new Date(alloc.deallocation_date) : endDate;

      // Find overlap with report period
      const overlapStart = allocStart > startDate ? allocStart : startDate;
      const overlapEnd = allocEnd < endDate ? allocEnd : endDate;

      if (overlapStart < overlapEnd) {
        const days = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
        totalSeatDays += days;
      }
    }

    // Convert days to months (using 30 days per month)
    return Math.round(totalSeatDays / 30 * 100) / 100;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new SeatTracker instance
 */
export function createSeatTracker(sql: postgres.Sql): SeatTracker {
  return new SeatTracker(sql);
}
