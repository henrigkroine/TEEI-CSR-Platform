/**
 * Campaign Lifecycle Manager
 *
 * Manages campaign state transitions, validations, and side effects.
 * Implements the state machine defined in state-transitions.ts
 *
 * SWARM 6: Agent 3.4 (campaign-lifecycle-manager)
 * Reference: /docs/CAMPAIGN_LIFECYCLE.md
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, or, lte, gte, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import type { Campaign } from '@teei/shared-schema/schema/campaigns.js';
import { campaigns } from '@teei/shared-schema/schema/campaigns.js';
import {
  type CampaignStatus,
  type StateTransition,
  type StatusHistoryEntry,
  isValidTransition,
  getAllowedTransitions,
  validateTransition,
  executeSideEffects,
  checkAutoTransitionEligibility,
  TransitionValidationError,
} from './state-transitions.js';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// TODO: Import from shared config
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/teei';
const sql = postgres(connectionString);
const db = drizzle(sql);

// ============================================================================
// TYPES
// ============================================================================

/**
 * Transition options
 */
export interface TransitionOptions {
  reason?: string;
  userId?: string;
  triggeredBy?: 'manual' | 'automatic' | 'system';
  skipValidation?: boolean; // Use with caution
  skipSideEffects?: boolean; // Use with caution (testing only)
}

/**
 * Transition result
 */
export interface TransitionResult {
  success: boolean;
  campaign: Campaign;
  transition: StateTransition;
  sideEffects?: { name: string; success: boolean; error?: Error }[];
  error?: Error;
}

/**
 * Auto-transition result
 */
export interface AutoTransitionResult {
  campaignsChecked: number;
  campaignsTransitioned: number;
  transitions: Array<{
    campaignId: string;
    campaignName: string;
    from: CampaignStatus;
    to: CampaignStatus;
    reason: string;
  }>;
  errors: Array<{
    campaignId: string;
    error: string;
  }>;
}

// ============================================================================
// CORE TRANSITION FUNCTION
// ============================================================================

/**
 * Transition a campaign to a new state
 *
 * @param campaignId - UUID of the campaign
 * @param newStatus - Target status
 * @param options - Transition options (reason, userId, etc.)
 * @returns TransitionResult with updated campaign and side effect results
 *
 * @throws TransitionValidationError if transition is invalid or validation fails
 *
 * @example
 * ```typescript
 * const result = await transitionCampaign(
 *   'camp_123',
 *   'planned',
 *   {
 *     reason: 'Configuration finalized',
 *     userId: 'user_456',
 *     triggeredBy: 'manual'
 *   }
 * );
 * ```
 */
export async function transitionCampaign(
  campaignId: string,
  newStatus: CampaignStatus,
  options: TransitionOptions = {}
): Promise<TransitionResult> {
  const {
    reason = '',
    userId,
    triggeredBy = 'manual',
    skipValidation = false,
    skipSideEffects = false,
  } = options;

  try {
    // 1. Fetch current campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      throw new TransitionValidationError(
        `Campaign not found: ${campaignId}`,
        'CAMPAIGN_NOT_FOUND'
      );
    }

    const currentStatus = campaign.status;

    // 2. Check if transition is valid
    if (!skipValidation) {
      if (!isValidTransition(currentStatus, newStatus)) {
        throw new TransitionValidationError(
          `Invalid transition from ${currentStatus} to ${newStatus}`,
          'INVALID_TRANSITION',
          {
            currentStatus,
            newStatus,
            allowedTransitions: getAllowedTransitions(currentStatus),
          }
        );
      }

      // 3. Run validation rules
      await validateTransition(campaign, newStatus);
    }

    // 4. Create transition metadata
    const transition: StateTransition = {
      from: currentStatus,
      to: newStatus,
      reason,
      triggeredBy,
      userId,
      timestamp: new Date(),
    };

    // 5. Execute side effects
    let sideEffectResults: { name: string; success: boolean; error?: Error }[] = [];
    if (!skipSideEffects) {
      sideEffectResults = await executeSideEffects(campaign, transition);
    }

    // 6. Prepare status history entry
    const statusHistoryEntry: StatusHistoryEntry = {
      status: newStatus,
      transitionedAt: new Date().toISOString(),
      transitionedBy: userId,
      reason,
      triggeredBy,
    };

    // Get existing status history (if stored as JSONB)
    const existingHistory: StatusHistoryEntry[] = []; // TODO: Extract from campaign if stored

    // 7. Update campaign in database
    const updates: Partial<typeof campaigns.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
      // TODO: Add statusHistory field to schema and update here
      // statusHistory: [...existingHistory, statusHistoryEntry],
    };

    // Additional updates based on transition
    if (newStatus === 'closed') {
      updates.isActive = false;
      updates.isArchived = true;
    }

    if (newStatus === 'completed') {
      updates.lastMetricsUpdateAt = new Date();
    }

    const [updatedCampaign] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, campaignId))
      .returning();

    console.log(
      `[Lifecycle] Campaign ${campaignId} transitioned: ${currentStatus} → ${newStatus} (${triggeredBy})`
    );

    return {
      success: true,
      campaign: updatedCampaign,
      transition,
      sideEffects: sideEffectResults,
    };
  } catch (error) {
    console.error(`[Lifecycle] Transition failed for campaign ${campaignId}:`, error);

    // Re-throw TransitionValidationError
    if (error instanceof TransitionValidationError) {
      throw error;
    }

    // Wrap other errors
    throw new TransitionValidationError(
      `Transition failed: ${(error as Error).message}`,
      'TRANSITION_FAILED',
      { originalError: (error as Error).message }
    );
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a transition is valid (without executing it)
 *
 * @param currentStatus - Current campaign status
 * @param newStatus - Target status
 * @returns boolean indicating if transition is allowed
 *
 * @example
 * ```typescript
 * const canTransition = validateTransitionSync('draft', 'planned'); // true
 * const cannotTransition = validateTransitionSync('draft', 'active'); // false
 * ```
 */
export function validateTransitionSync(
  currentStatus: CampaignStatus,
  newStatus: CampaignStatus
): boolean {
  return isValidTransition(currentStatus, newStatus);
}

/**
 * Get all allowed transitions for a campaign
 *
 * @param campaignId - UUID of the campaign
 * @returns Array of allowed target statuses
 *
 * @example
 * ```typescript
 * const allowed = await getAllowedTransitionsForCampaign('camp_123');
 * // Returns: ['planned', 'closed'] if campaign is in 'draft' status
 * ```
 */
export async function getAllowedTransitionsForCampaign(
  campaignId: string
): Promise<CampaignStatus[]> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new TransitionValidationError(
      `Campaign not found: ${campaignId}`,
      'CAMPAIGN_NOT_FOUND'
    );
  }

  return getAllowedTransitions(campaign.status);
}

// ============================================================================
// AUTOMATIC TRANSITIONS
// ============================================================================

/**
 * Check all campaigns for automatic transition eligibility
 *
 * Runs as a cron job (hourly) to:
 * - Transition planned/recruiting → active (when startDate reached)
 * - Transition active → completed (when endDate reached)
 *
 * @param dryRun - If true, only checks eligibility without executing transitions
 * @returns AutoTransitionResult with summary of transitions
 *
 * @example
 * ```typescript
 * // Dry run (check only)
 * const preview = await autoTransitionCheck(true);
 * console.log(`Would transition ${preview.campaignsTransitioned} campaigns`);
 *
 * // Execute transitions
 * const result = await autoTransitionCheck();
 * console.log(`Transitioned ${result.campaignsTransitioned} campaigns`);
 * ```
 */
export async function autoTransitionCheck(
  dryRun: boolean = false
): Promise<AutoTransitionResult> {
  const currentDate = new Date();
  const result: AutoTransitionResult = {
    campaignsChecked: 0,
    campaignsTransitioned: 0,
    transitions: [],
    errors: [],
  };

  try {
    // Fetch campaigns eligible for auto-transition
    // - planned/recruiting with startDate <= today
    // - active with endDate <= today
    const eligibleCampaigns = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.isActive, true),
          or(
            // planned/recruiting → active (startDate reached)
            and(
              inArray(campaigns.status, ['planned', 'recruiting']),
              lte(campaigns.startDate, currentDate.toISOString().split('T')[0])
            ),
            // active → completed (endDate reached)
            and(
              eq(campaigns.status, 'active'),
              lte(campaigns.endDate, currentDate.toISOString().split('T')[0])
            )
          )
        )
      );

    result.campaignsChecked = eligibleCampaigns.length;

    console.log(
      `[Auto-Transition] Checking ${eligibleCampaigns.length} campaigns (dryRun: ${dryRun})`
    );

    // Process each eligible campaign
    for (const campaign of eligibleCampaigns) {
      const eligibility = checkAutoTransitionEligibility(campaign, currentDate);

      if (!eligibility.eligible || !eligibility.newStatus) {
        continue;
      }

      const { newStatus, reason } = eligibility;

      console.log(
        `[Auto-Transition] ${campaign.name} (${campaign.id}): ${campaign.status} → ${newStatus}`
      );

      if (dryRun) {
        // Preview only
        result.transitions.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          from: campaign.status,
          to: newStatus,
          reason: reason || 'Auto-transition',
        });
        result.campaignsTransitioned++;
      } else {
        // Execute transition
        try {
          await transitionCampaign(campaign.id, newStatus, {
            reason: reason || 'Automatic transition',
            triggeredBy: 'automatic',
          });

          result.transitions.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            from: campaign.status,
            to: newStatus,
            reason: reason || 'Auto-transition',
          });
          result.campaignsTransitioned++;
        } catch (error) {
          console.error(
            `[Auto-Transition] Failed to transition campaign ${campaign.id}:`,
            error
          );
          result.errors.push({
            campaignId: campaign.id,
            error: (error as Error).message,
          });
        }
      }
    }

    console.log(
      `[Auto-Transition] Complete: ${result.campaignsTransitioned}/${result.campaignsChecked} campaigns transitioned`
    );

    return result;
  } catch (error) {
    console.error('[Auto-Transition] Job failed:', error);
    throw error;
  }
}

// ============================================================================
// SIDE EFFECT HELPERS
// ============================================================================

/**
 * Trigger side effects for a campaign transition
 *
 * This is the main hook for other services to execute campaign-specific logic.
 * Called by transitionCampaign() but can also be invoked manually if needed.
 *
 * @param campaignId - UUID of the campaign
 * @param transition - Transition metadata
 * @returns Array of side effect results
 *
 * @example
 * ```typescript
 * const results = await triggerSideEffects('camp_123', {
 *   from: 'recruiting',
 *   to: 'active',
 *   reason: 'Start date reached',
 *   triggeredBy: 'automatic',
 *   timestamp: new Date()
 * });
 * ```
 */
export async function triggerSideEffects(
  campaignId: string,
  transition: StateTransition
): Promise<{ name: string; success: boolean; error?: Error }[]> {
  // Fetch campaign
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new TransitionValidationError(
      `Campaign not found: ${campaignId}`,
      'CAMPAIGN_NOT_FOUND'
    );
  }

  // Execute side effects
  return await executeSideEffects(campaign, transition);
}

// ============================================================================
// CAPACITY ALERTS (Related to Lifecycle)
// ============================================================================

/**
 * Check campaign capacity and update alert flags
 *
 * Called by auto-transition cron job to monitor capacity utilization.
 * Updates isNearCapacity and isOverCapacity flags.
 *
 * @param thresholds - Custom thresholds (default: near=0.8, over=1.0)
 * @returns Summary of campaigns with capacity alerts
 *
 * @example
 * ```typescript
 * const alerts = await checkCapacityAlerts();
 * console.log(`${alerts.nearCapacity} campaigns near capacity`);
 * ```
 */
export async function checkCapacityAlerts(
  thresholds: { near: number; over: number } = { near: 0.8, over: 1.0 }
): Promise<{
  campaignsChecked: number;
  nearCapacity: number;
  overCapacity: number;
  alerts: Array<{
    campaignId: string;
    campaignName: string;
    utilization: number;
    alert: 'near' | 'over';
  }>;
}> {
  const result = {
    campaignsChecked: 0,
    nearCapacity: 0,
    overCapacity: 0,
    alerts: [] as Array<{
      campaignId: string;
      campaignName: string;
      utilization: number;
      alert: 'near' | 'over';
    }>,
  };

  // Fetch active campaigns in recruiting or active state
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.isActive, true),
        inArray(campaigns.status, ['recruiting', 'active'])
      )
    );

  result.campaignsChecked = activeCampaigns.length;

  for (const campaign of activeCampaigns) {
    const volunteerUtilization = campaign.currentVolunteers / campaign.targetVolunteers;
    const beneficiaryUtilization =
      campaign.currentBeneficiaries / campaign.targetBeneficiaries;
    const utilization = Math.max(volunteerUtilization, beneficiaryUtilization);

    const updates: Partial<typeof campaigns.$inferInsert> = {
      capacityUtilization: utilization.toFixed(4),
    };

    let hasAlert = false;

    // Check near capacity (80%+)
    if (utilization >= thresholds.near && utilization < thresholds.over) {
      if (!campaign.isNearCapacity) {
        updates.isNearCapacity = true;
        hasAlert = true;
        result.nearCapacity++;
        result.alerts.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          utilization,
          alert: 'near',
        });
        console.log(
          `[Capacity Alert] Campaign ${campaign.name} (${campaign.id}) near capacity: ${(utilization * 100).toFixed(1)}%`
        );
      }
    }

    // Check over capacity (100%+)
    if (utilization >= thresholds.over) {
      if (!campaign.isOverCapacity) {
        updates.isOverCapacity = true;
        hasAlert = true;
        result.overCapacity++;
        result.alerts.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          utilization,
          alert: 'over',
        });
        console.log(
          `[Capacity Alert] Campaign ${campaign.name} (${campaign.id}) OVER capacity: ${(utilization * 100).toFixed(1)}%`
        );
      }
    }

    // Update campaign if capacity flags changed
    if (Object.keys(updates).length > 1) {
      // More than just capacityUtilization
      await db.update(campaigns).set(updates).where(eq(campaigns.id, campaign.id));
    }
  }

  console.log(
    `[Capacity Check] ${result.campaignsChecked} campaigns checked, ${result.nearCapacity} near capacity, ${result.overCapacity} over capacity`
  );

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Main functions
  transitionCampaign,
  validateTransitionSync,
  getAllowedTransitionsForCampaign,
  autoTransitionCheck,
  triggerSideEffects,
  checkCapacityAlerts,
  // Re-export from state-transitions for convenience
  isValidTransition,
  getAllowedTransitions,
  TransitionValidationError,
};
