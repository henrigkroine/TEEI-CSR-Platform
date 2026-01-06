/**
 * Campaign Billing Integrator
 *
 * SWARM 6: Agent 5.1 - billing-integrator
 *
 * Responsibilities:
 * - Link campaigns to L2I subscriptions and track allocation percentages
 * - Track seat/credit usage per campaign → billingUsageRecords
 * - Implement campaign usage reporting for invoicing
 * - Handle bundle allocations (split L2I bundle across campaigns)
 * - Ensure no duplicate usage records (idempotency via deduplicationKey)
 *
 * Integration Points:
 * - campaigns table: l2iSubscriptionId, bundleAllocationPercentage, pricingModel
 * - l2iSubscriptions table: status, programAllocation
 * - billingUsageRecords table: eventType, quantity, deduplicationKey, metadata.campaignId
 *
 * Pricing Models:
 * - SEATS: Track active volunteer seats (monthly billing)
 * - CREDITS: Track credit consumption per activity
 * - BUNDLE: Track allocation % of L2I bundle
 * - IAAS: Track learner outcomes (usage via outcome metrics)
 * - CUSTOM: Track via custom pricing terms
 */

import type { Campaign } from '@teei/shared-schema';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Campaign usage summary for billing
 */
export interface CampaignUsageSummary {
  campaignId: string;
  campaignName: string;
  companyId: string;
  pricingModel: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    seatsUsed?: number;
    seatHours?: number;
    creditsConsumed?: number;
    learnersServed?: number;
    sessionsCompleted?: number;
  };
  billing: {
    unitPrice?: number;
    quantity?: number;
    totalAmount?: number;
    currency: string;
  };
  l2iAllocation?: {
    subscriptionId: string;
    allocationPercentage: number;
    allocatedAmount: number;
  };
}

/**
 * Bundle allocation split result
 */
export interface BundleAllocationResult {
  l2iSubscriptionId: string;
  totalBudget: number;
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    allocationPercentage: number;
    allocatedAmount: number;
    status: 'valid' | 'invalid';
  }>;
  totalAllocationPercentage: number;
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * Usage tracking event
 */
export interface UsageTrackingEvent {
  campaignId: string;
  eventType: 'seat_usage' | 'credit_usage' | 'learner_served' | 'session_completed';
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Usage record result with idempotency
 */
export interface UsageRecordResult {
  success: boolean;
  usageRecordId?: string;
  deduplicationKey: string;
  isDuplicate: boolean;
  reason?: string;
}

// ============================================================================
// BILLING INTEGRATOR CLASS
// ============================================================================

export class BillingIntegrator {
  constructor(private sql: postgres.Sql) {}

  /**
   * Link a campaign to an L2I subscription with allocation percentage
   *
   * Validates:
   * - Subscription exists and is active
   * - Allocation percentage is between 0 and 1
   * - Campaign exists
   * - Total allocations across campaigns <= 100% (if required)
   */
  async linkCampaignToSubscription(
    campaignId: string,
    l2iSubscriptionId: string,
    allocationPercentage: number
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      // Validate subscription exists
      const [subscription] = await this.sql`
        SELECT id, status, bundle_id FROM l2i_subscriptions
        WHERE id = ${l2iSubscriptionId}
        LIMIT 1
      `;

      if (!subscription) {
        return { success: false, reason: 'L2I subscription not found' };
      }

      if (subscription.status !== 'active') {
        return { success: false, reason: `L2I subscription is ${subscription.status}, not active` };
      }

      // Validate allocation percentage
      if (allocationPercentage < 0 || allocationPercentage > 1) {
        return { success: false, reason: 'Allocation percentage must be between 0 and 1' };
      }

      // Validate campaign exists
      const [campaign] = await this.sql`
        SELECT id, pricing_model FROM campaigns
        WHERE id = ${campaignId}
        LIMIT 1
      `;

      if (!campaign) {
        return { success: false, reason: 'Campaign not found' };
      }

      // Only allow bundle model to be linked to L2I subscriptions
      if (campaign.pricing_model !== 'bundle') {
        return {
          success: false,
          reason: `Campaign pricing model is ${campaign.pricing_model}, not bundle`
        };
      }

      // Update campaign with subscription link
      await this.sql`
        UPDATE campaigns
        SET
          l2i_subscription_id = ${l2iSubscriptionId},
          bundle_allocation_percentage = ${allocationPercentage},
          updated_at = NOW()
        WHERE id = ${campaignId}
      `;

      return { success: true };
    } catch (error) {
      return { success: false, reason: `Database error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }

  /**
   * Track campaign usage and create billing usage record
   *
   * Supports multiple event types:
   * - seat_usage: Tracks active volunteer seats
   * - credit_usage: Tracks impact credits consumed
   * - learner_served: Tracks beneficiary learners served
   * - session_completed: Tracks completed sessions
   *
   * Enforces idempotency via deduplicationKey to prevent duplicate charges
   */
  async trackCampaignUsage(event: UsageTrackingEvent): Promise<UsageRecordResult> {
    try {
      // Get campaign details
      const [campaign] = await this.sql<Campaign[]>`
        SELECT
          id,
          company_id,
          pricing_model,
          l2i_subscription_id,
          bundle_allocation_percentage,
          current_volunteers,
          credits_remaining
        FROM campaigns
        WHERE id = ${event.campaignId}
        LIMIT 1
      `;

      if (!campaign) {
        return {
          success: false,
          isDuplicate: false,
          deduplicationKey: '',
          reason: 'Campaign not found'
        };
      }

      // Generate deduplication key (format: campaignId-eventType-timestamp-hash)
      const deduplicationKey = this.generateDeduplicationKey(
        event.campaignId,
        event.eventType,
        event.timestamp,
        JSON.stringify(event.metadata || {})
      );

      // Check for existing usage record (idempotency)
      const [existingRecord] = await this.sql`
        SELECT id FROM billing_usage_records
        WHERE deduplication_key = ${deduplicationKey}
        LIMIT 1
      `;

      if (existingRecord) {
        return {
          success: true,
          isDuplicate: true,
          deduplicationKey,
          usageRecordId: existingRecord.id,
          reason: 'Duplicate usage record (already tracked)'
        };
      }

      // Determine subscription and usage event type
      let subscriptionId: string | null = null;
      let usageEventType: string = 'active_seats'; // Default

      // For bundle model campaigns, use L2I subscription
      if (campaign.pricing_model === 'bundle' && campaign.l2i_subscription_id) {
        subscriptionId = campaign.l2i_subscription_id;
      }

      // Map campaign event types to billing usage event types
      switch (event.eventType) {
        case 'seat_usage':
          usageEventType = 'active_seats';
          break;
        case 'credit_usage':
          usageEventType = 'storage_gb'; // Repurposed for credits (could be custom in future)
          break;
        case 'learner_served':
          usageEventType = 'compute_hours'; // Repurposed for learner tracking
          break;
        case 'session_completed':
          usageEventType = 'reports_generated'; // Repurposed for session tracking
          break;
      }

      // Create billing usage record
      const usageRecordId = uuidv4();
      await this.sql`
        INSERT INTO billing_usage_records (
          id,
          company_id,
          subscription_id,
          event_type,
          quantity,
          deduplication_key,
          event_timestamp,
          metadata,
          created_at
        ) VALUES (
          ${usageRecordId},
          ${campaign.company_id},
          ${subscriptionId},
          ${usageEventType}::usage_event_type,
          ${event.quantity},
          ${deduplicationKey},
          ${event.timestamp.toISOString()},
          ${JSON.stringify({
            campaignId: event.campaignId,
            campaignEventType: event.eventType,
            ...event.metadata
          })},
          NOW()
        )
      `;

      return {
        success: true,
        isDuplicate: false,
        deduplicationKey,
        usageRecordId
      };
    } catch (error) {
      return {
        success: false,
        isDuplicate: false,
        deduplicationKey: '',
        reason: `Failed to track usage: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get campaign usage summary for billing
   *
   * Returns aggregated usage metrics for a campaign during a specific period
   * Used for:
   * - Invoice line items
   * - Usage reports
   * - Upsell analysis
   */
  async getCampaignUsageForBilling(
    campaignId: string,
    period: { start: Date; end: Date }
  ): Promise<CampaignUsageSummary | null> {
    try {
      const [campaign] = await this.sql<any[]>`
        SELECT
          c.id,
          c.name,
          c.company_id,
          c.pricing_model,
          c.l2i_subscription_id,
          c.bundle_allocation_percentage,
          c.budget_allocated,
          c.currency,
          c.seat_price_per_month,
          c.credit_allocation,
          c.credit_consumption_rate,
          c.current_volunteers,
          c.current_beneficiaries,
          c.total_sessions_completed,
          l2i.sku,
          l2i.bundle_id
        FROM campaigns c
        LEFT JOIN l2i_subscriptions l2i ON c.l2i_subscription_id = l2i.id
        WHERE c.id = ${campaignId}
        LIMIT 1
      `;

      if (!campaign) {
        return null;
      }

      // Get usage records for the period
      const usageRecords = await this.sql`
        SELECT
          event_type,
          SUM(quantity) as total_quantity
        FROM billing_usage_records
        WHERE
          company_id = ${campaign.company_id}
          AND metadata->>'campaignId' = ${campaignId}
          AND event_timestamp >= ${period.start.toISOString()}
          AND event_timestamp <= ${period.end.toISOString()}
        GROUP BY event_type
      `;

      // Aggregate usage metrics
      let seatsUsed = campaign.current_volunteers || 0;
      let creditsConsumed = 0;
      let learnersServed = campaign.current_beneficiaries || 0;
      let sessionsCompleted = campaign.total_sessions_completed || 0;

      usageRecords.forEach((record: any) => {
        const quantity = parseFloat(record.total_quantity);
        switch (record.event_type) {
          case 'active_seats':
            seatsUsed = quantity;
            break;
          case 'storage_gb': // Credits repurposed
            creditsConsumed = quantity;
            break;
          case 'compute_hours': // Learners repurposed
            learnersServed = quantity;
            break;
          case 'reports_generated': // Sessions repurposed
            sessionsCompleted = quantity;
            break;
        }
      });

      // Calculate billing amounts based on pricing model
      let unitPrice = 0;
      let billingQuantity = 0;
      let totalAmount = 0;

      switch (campaign.pricing_model) {
        case 'seats':
          unitPrice = parseFloat(campaign.seat_price_per_month) || 0;
          billingQuantity = seatsUsed;
          totalAmount = unitPrice * billingQuantity;
          break;

        case 'credits':
          unitPrice = parseFloat(campaign.credit_consumption_rate) || 0;
          billingQuantity = creditsConsumed;
          totalAmount = unitPrice * billingQuantity;
          break;

        case 'iaas':
          // IAAS pricing handled separately (outcomes-based)
          unitPrice = 0; // Set in campaign iaasMetrics
          billingQuantity = learnersServed;
          break;

        case 'bundle':
          // Bundle pricing is handled at subscription level
          // Campaign pays proportional share
          if (campaign.l2i_subscription_id && campaign.bundle_allocation_percentage) {
            const allocationPercentage = parseFloat(campaign.bundle_allocation_percentage);
            const budgetAllocated = parseFloat(campaign.budget_allocated) || 0;
            totalAmount = budgetAllocated * allocationPercentage;
            billingQuantity = 1; // Allocated as a single bundle item
          }
          break;
      }

      // Get L2I allocation details if applicable
      let l2iAllocation = undefined;
      if (campaign.pricing_model === 'bundle' && campaign.l2i_subscription_id) {
        const allocationPercentage = parseFloat(campaign.bundle_allocation_percentage) || 0;
        const allocatedAmount = parseFloat(campaign.budget_allocated) * allocationPercentage || 0;
        l2iAllocation = {
          subscriptionId: campaign.l2i_subscription_id,
          allocationPercentage,
          allocatedAmount
        };
      }

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        companyId: campaign.company_id,
        pricingModel: campaign.pricing_model,
        period: { start: period.start, end: period.end },
        usage: {
          seatsUsed,
          creditsConsumed,
          learnersServed,
          sessionsCompleted
        },
        billing: {
          unitPrice: unitPrice || undefined,
          quantity: billingQuantity || undefined,
          totalAmount: totalAmount || undefined,
          currency: campaign.currency || 'EUR'
        },
        l2iAllocation
      };
    } catch (error) {
      console.error('Error getting campaign usage for billing:', error);
      return null;
    }
  }

  /**
   * Split L2I bundle across campaigns
   *
   * Validates that all campaign allocations sum to 100%
   * Returns allocation validation results
   *
   * Used by: Agent 5.3 (pricing-signal-exporter), Agent 5.5 (commercial-terms-manager)
   */
  async splitBundleAcrossCampaigns(l2iSubscriptionId: string): Promise<BundleAllocationResult> {
    try {
      // Get L2I subscription details
      const [subscription] = await this.sql`
        SELECT id, bundle_id, status FROM l2i_subscriptions
        WHERE id = ${l2iSubscriptionId}
        LIMIT 1
      `;

      if (!subscription) {
        return {
          l2iSubscriptionId,
          totalBudget: 0,
          campaigns: [],
          totalAllocationPercentage: 0,
          validation: {
            isValid: false,
            errors: ['L2I subscription not found']
          }
        };
      }

      // Get bundle details
      const [bundle] = await this.sql`
        SELECT id, annual_price FROM l2i_bundles
        WHERE id = ${subscription.bundle_id}
        LIMIT 1
      `;

      if (!bundle) {
        return {
          l2iSubscriptionId,
          totalBudget: 0,
          campaigns: [],
          totalAllocationPercentage: 0,
          validation: {
            isValid: false,
            errors: ['L2I bundle not found']
          }
        };
      }

      const totalBudget = bundle.annual_price / 100; // Convert from cents

      // Get all campaigns linked to this subscription
      const campaignRows = await this.sql`
        SELECT
          id,
          name,
          bundle_allocation_percentage,
          budget_allocated
        FROM campaigns
        WHERE
          l2i_subscription_id = ${l2iSubscriptionId}
          AND is_active = true
        ORDER BY created_at ASC
      `;

      // Validate allocations
      let totalAllocationPercentage = 0;
      const errors: string[] = [];
      const campaigns = campaignRows.map((campaign: any) => {
        const allocationPercentage = parseFloat(campaign.bundle_allocation_percentage || '0');
        const allocatedAmount = totalBudget * allocationPercentage;

        totalAllocationPercentage += allocationPercentage;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          allocationPercentage,
          allocatedAmount,
          status: allocationPercentage > 0 && allocationPercentage <= 1 ? ('valid' as const) : ('invalid' as const)
        };
      });

      // Check if allocations sum to valid percentage (allowing for floating point rounding)
      const ALLOCATION_TOLERANCE = 0.001; // 0.1% tolerance
      if (Math.abs(totalAllocationPercentage - 1.0) > ALLOCATION_TOLERANCE) {
        errors.push(
          `Total allocation is ${(totalAllocationPercentage * 100).toFixed(2)}%, expected 100%. ` +
          `Difference: ${((totalAllocationPercentage - 1.0) * 100).toFixed(2)}%`
        );
      }

      // Additional validation
      if (totalAllocationPercentage > 1.0) {
        errors.push('Total allocation exceeds 100%. Bundle is over-allocated.');
      }

      if (totalAllocationPercentage < 0.5) {
        errors.push(
          `Total allocation is only ${(totalAllocationPercentage * 100).toFixed(2)}%. ` +
          `Less than 50% of bundle is allocated to campaigns.`
        );
      }

      return {
        l2iSubscriptionId,
        totalBudget,
        campaigns,
        totalAllocationPercentage: Math.round(totalAllocationPercentage * 10000) / 10000,
        validation: {
          isValid: errors.length === 0,
          errors
        }
      };
    } catch (error) {
      return {
        l2iSubscriptionId,
        totalBudget: 0,
        campaigns: [],
        totalAllocationPercentage: 0,
        validation: {
          isValid: false,
          errors: [`Database error: ${error instanceof Error ? error.message : 'Unknown'}`]
        }
      };
    }
  }

  /**
   * Get all campaigns linked to an L2I subscription
   */
  async getCampaignsByL2ISubscription(l2iSubscriptionId: string): Promise<Campaign[]> {
    try {
      const campaigns = await this.sql`
        SELECT * FROM campaigns
        WHERE
          l2i_subscription_id = ${l2iSubscriptionId}
          AND is_active = true
        ORDER BY created_at ASC
      `;

      return campaigns as Campaign[];
    } catch (error) {
      console.error('Error getting campaigns by L2I subscription:', error);
      return [];
    }
  }

  /**
   * Get usage records for invoicing
   *
   * Returns usage records in the specified period, grouped by campaign
   * Used for: invoice generation, usage reports
   */
  async getUsageRecordsForInvoicing(
    companyId: string,
    period: { start: Date; end: Date }
  ): Promise<Array<{ campaignId: string; events: any[] }>> {
    try {
      const records = await this.sql`
        SELECT
          metadata->>'campaignId' as campaign_id,
          event_type,
          quantity,
          event_timestamp,
          deduplication_key
        FROM billing_usage_records
        WHERE
          company_id = ${companyId}
          AND event_timestamp >= ${period.start.toISOString()}
          AND event_timestamp <= ${period.end.toISOString()}
        ORDER BY campaign_id, event_timestamp ASC
      `;

      // Group by campaign
      const grouped = new Map<string, any[]>();
      records.forEach((record: any) => {
        const campaignId = record.campaign_id;
        if (!grouped.has(campaignId)) {
          grouped.set(campaignId, []);
        }
        grouped.get(campaignId)!.push(record);
      });

      return Array.from(grouped.entries()).map(([campaignId, events]) => ({
        campaignId,
        events
      }));
    } catch (error) {
      console.error('Error getting usage records for invoicing:', error);
      return [];
    }
  }

  /**
   * Validate campaign capacity against L2I subscription constraints
   *
   * For BUNDLE model campaigns:
   * - Allocation % is correct
   * - Doesn't exceed total L2I bundle capacity
   * - Has valid active L2I subscription
   */
  async validateBundleCapacity(campaignId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const [campaign] = await this.sql`
        SELECT
          id,
          pricing_model,
          l2i_subscription_id,
          bundle_allocation_percentage,
          current_volunteers,
          target_volunteers
        FROM campaigns
        WHERE id = ${campaignId}
        LIMIT 1
      `;

      if (!campaign) {
        return { valid: false, errors: ['Campaign not found'] };
      }

      if (campaign.pricing_model !== 'bundle') {
        return { valid: true, errors: [] }; // Non-bundle campaigns don't need validation
      }

      const errors: string[] = [];

      // Check subscription exists
      if (!campaign.l2i_subscription_id) {
        errors.push('Campaign has no L2I subscription linked');
      } else {
        const [subscription] = await this.sql`
          SELECT id, status FROM l2i_subscriptions
          WHERE id = ${campaign.l2i_subscription_id}
          LIMIT 1
        `;

        if (!subscription) {
          errors.push('L2I subscription not found');
        } else if (subscription.status !== 'active') {
          errors.push(`L2I subscription is ${subscription.status}, not active`);
        }
      }

      // Check allocation percentage
      const allocationPercentage = parseFloat(campaign.bundle_allocation_percentage || '0');
      if (allocationPercentage <= 0 || allocationPercentage > 1) {
        errors.push(`Bundle allocation percentage is ${allocationPercentage}, must be between 0 and 1`);
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown'}`]
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generate deduplication key for usage records
   * Format: {campaignId}-{eventType}-{timestamp}-{hash}
   *
   * Used to prevent duplicate usage charges if the same event is processed twice
   * Idempotent: Same input always produces same deduplication key
   */
  private generateDeduplicationKey(
    campaignId: string,
    eventType: string,
    timestamp: Date,
    metadata: string
  ): string {
    // Create a deterministic hash from the metadata
    const hash = this.simpleHash(metadata).toString(36).substring(2, 15);

    // Format: campaignId-eventType-YYYYMMDD-HHmmss-hash
    const dateString = timestamp.toISOString().replace(/[-:T.]/g, '').substring(0, 15);

    return `${campaignId}-${eventType}-${dateString}-${hash}`;
  }

  /**
   * Simple hash function for generating deterministic hashes
   * Not cryptographic, just for generating unique keys
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new BillingIntegrator instance
 */
export function createBillingIntegrator(sql: postgres.Sql): BillingIntegrator {
  return new BillingIntegrator(sql);
}
