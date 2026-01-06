/**
 * Campaign State Machine Definition
 *
 * Defines the valid state transitions, validation rules, and side effects
 * for campaign lifecycle management.
 *
 * SWARM 6: Agent 3.4 (campaign-lifecycle-manager)
 * Reference: /docs/CAMPAIGN_LIFECYCLE.md
 */

import type { Campaign } from '@teei/shared-schema/schema/campaigns.js';

// ============================================================================
// STATE DEFINITIONS
// ============================================================================

/**
 * Campaign lifecycle states
 */
export type CampaignStatus =
  | 'draft'       // Initial creation, not finalized
  | 'planned'     // Configuration locked, awaiting start
  | 'recruiting'  // Actively seeking volunteers
  | 'active'      // Running with participants
  | 'paused'      // Temporarily suspended
  | 'completed'   // Successfully finished
  | 'closed';     // Archived (terminal state)

/**
 * Transition metadata
 */
export interface StateTransition {
  from: CampaignStatus;
  to: CampaignStatus;
  reason?: string;
  triggeredBy?: 'manual' | 'automatic' | 'system';
  userId?: string;
  timestamp: Date;
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: CampaignStatus;
  transitionedAt: string;
  transitionedBy?: string;
  reason?: string;
  triggeredBy?: 'manual' | 'automatic' | 'system';
}

// ============================================================================
// STATE TRANSITION MATRIX
// ============================================================================

/**
 * Valid state transitions matrix
 *
 * Based on CAMPAIGN_LIFECYCLE.md section "Valid Transitions Matrix"
 *
 * Total valid transitions: 14
 * - draft → planned (manual)
 * - draft → closed (cancel)
 * - planned → draft (unlock, requires approval)
 * - planned → recruiting (manual)
 * - planned → active (skip recruiting)
 * - planned → closed (cancel)
 * - recruiting → active (auto on startDate or manual)
 * - recruiting → paused (manual)
 * - recruiting → closed (cancel)
 * - active → paused (manual)
 * - active → completed (auto on endDate or manual)
 * - paused → active (resume)
 * - paused → completed (complete while paused)
 * - paused → closed (abandon)
 * - completed → closed (archive)
 */
export const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['planned', 'closed'],
  planned: ['draft', 'recruiting', 'active', 'closed'],
  recruiting: ['active', 'paused', 'closed'],
  active: ['paused', 'completed'],
  paused: ['active', 'completed', 'closed'],
  completed: ['closed'],
  closed: [], // Terminal state, no transitions allowed
};

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  currentStatus: CampaignStatus,
  newStatus: CampaignStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get all allowed transitions from current state
 */
export function getAllowedTransitions(currentStatus: CampaignStatus): CampaignStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validation error types
 */
export class TransitionValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TransitionValidationError';
  }
}

/**
 * Validation rules for state transitions
 */
export interface ValidationRule {
  validate: (campaign: Campaign, newStatus: CampaignStatus) => Promise<void> | void;
  errorMessage: string;
}

/**
 * Validation rules by transition
 */
export const TRANSITION_VALIDATIONS: Record<string, ValidationRule[]> = {
  // draft → planned: Must have all required fields
  'draft->planned': [
    {
      validate: (campaign) => {
        if (!campaign.name || campaign.name.trim().length === 0) {
          throw new TransitionValidationError(
            'Campaign name is required',
            'MISSING_NAME'
          );
        }
      },
      errorMessage: 'Campaign name is required',
    },
    {
      validate: (campaign) => {
        if (!campaign.programTemplateId) {
          throw new TransitionValidationError(
            'Program template must be selected',
            'MISSING_TEMPLATE'
          );
        }
      },
      errorMessage: 'Program template must be selected',
    },
    {
      validate: (campaign) => {
        if (!campaign.beneficiaryGroupId) {
          throw new TransitionValidationError(
            'Beneficiary group must be selected',
            'MISSING_GROUP'
          );
        }
      },
      errorMessage: 'Beneficiary group must be selected',
    },
    {
      validate: (campaign) => {
        if (!campaign.startDate || !campaign.endDate) {
          throw new TransitionValidationError(
            'Start and end dates are required',
            'MISSING_DATES'
          );
        }
      },
      errorMessage: 'Start and end dates are required',
    },
    {
      validate: (campaign) => {
        const start = new Date(campaign.startDate);
        const end = new Date(campaign.endDate);
        if (start >= end) {
          throw new TransitionValidationError(
            'Start date must be before end date',
            'INVALID_DATE_RANGE',
            { startDate: campaign.startDate, endDate: campaign.endDate }
          );
        }
      },
      errorMessage: 'Start date must be before end date',
    },
    {
      validate: (campaign) => {
        if (!campaign.targetVolunteers || campaign.targetVolunteers <= 0) {
          throw new TransitionValidationError(
            'Target volunteers must be greater than 0',
            'INVALID_TARGET_VOLUNTEERS'
          );
        }
      },
      errorMessage: 'Target volunteers must be greater than 0',
    },
    {
      validate: (campaign) => {
        if (!campaign.targetBeneficiaries || campaign.targetBeneficiaries <= 0) {
          throw new TransitionValidationError(
            'Target beneficiaries must be greater than 0',
            'INVALID_TARGET_BENEFICIARIES'
          );
        }
      },
      errorMessage: 'Target beneficiaries must be greater than 0',
    },
    {
      validate: (campaign) => {
        const budget = parseFloat(campaign.budgetAllocated?.toString() || '0');
        if (budget <= 0) {
          throw new TransitionValidationError(
            'Budget allocated must be greater than 0',
            'INVALID_BUDGET'
          );
        }
      },
      errorMessage: 'Budget allocated must be greater than 0',
    },
    {
      validate: (campaign) => {
        if (!campaign.pricingModel) {
          throw new TransitionValidationError(
            'Pricing model must be specified',
            'MISSING_PRICING_MODEL'
          );
        }
      },
      errorMessage: 'Pricing model must be specified',
    },
  ],

  // planned → draft: Requires approval (tracked in reason)
  'planned->draft': [
    {
      validate: (campaign, newStatus) => {
        // This transition requires approval, which should be indicated in the reason
        // The calling code should handle approval logic
      },
      errorMessage: 'Unlocking a planned campaign requires approval',
    },
  ],

  // planned → recruiting: Must be before start date
  'planned->recruiting': [
    {
      validate: (campaign) => {
        const today = new Date();
        const startDate = new Date(campaign.startDate);

        // Can start recruiting at any time before or during the campaign
        // No strict validation here, but best practice is to start recruiting before startDate
      },
      errorMessage: 'Can start recruiting at any time',
    },
  ],

  // recruiting → active: Must have some volunteers (optional check)
  'recruiting->active': [
    {
      validate: (campaign) => {
        // Optional: warn if no volunteers enrolled
        // But don't block transition - company may want to activate anyway
      },
      errorMessage: 'Campaign can be activated',
    },
  ],

  // active → paused: No special validation
  'active->paused': [],

  // paused → active: No special validation
  'paused->active': [],

  // active → completed: Should be near or past end date (soft check)
  'active->completed': [
    {
      validate: (campaign) => {
        // Soft check: warn if completing early, but allow it
        const today = new Date();
        const endDate = new Date(campaign.endDate);

        if (today < endDate) {
          // Allow early completion, but log it
          console.warn(
            `Campaign ${campaign.id} completing early (endDate: ${campaign.endDate})`
          );
        }
      },
      errorMessage: 'Campaign can be completed',
    },
  ],

  // paused → completed: Same as active → completed
  'paused->completed': [
    {
      validate: (campaign) => {
        const today = new Date();
        const endDate = new Date(campaign.endDate);

        if (today < endDate) {
          console.warn(
            `Campaign ${campaign.id} completing early while paused (endDate: ${campaign.endDate})`
          );
        }
      },
      errorMessage: 'Campaign can be completed',
    },
  ],

  // Any state → closed: Always allowed (with reason)
  'draft->closed': [],
  'planned->closed': [],
  'recruiting->closed': [],
  'paused->closed': [],
  'completed->closed': [],
};

/**
 * Run all validations for a transition
 */
export async function validateTransition(
  campaign: Campaign,
  newStatus: CampaignStatus
): Promise<void> {
  const currentStatus = campaign.status;
  const transitionKey = `${currentStatus}->${newStatus}`;

  // Check if transition is valid
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new TransitionValidationError(
      `Invalid transition from ${currentStatus} to ${newStatus}`,
      'INVALID_TRANSITION',
      { currentStatus, newStatus, allowedTransitions: getAllowedTransitions(currentStatus) }
    );
  }

  // Run validation rules for this transition
  const rules = TRANSITION_VALIDATIONS[transitionKey] || [];
  for (const rule of rules) {
    await rule.validate(campaign, newStatus);
  }
}

// ============================================================================
// SIDE EFFECTS DEFINITION
// ============================================================================

/**
 * Side effect function signature
 */
export type SideEffectFunction = (
  campaign: Campaign,
  transition: StateTransition
) => Promise<void>;

/**
 * Side effects to execute on state transitions
 *
 * Each transition can have multiple side effects that execute in order
 */
export interface SideEffectDefinition {
  name: string;
  execute: SideEffectFunction;
  critical: boolean; // If true, failure blocks the transition
}

/**
 * Side effects by transition
 *
 * Based on CAMPAIGN_LIFECYCLE.md section "Side Effects Summary"
 */
export const TRANSITION_SIDE_EFFECTS: Record<string, SideEffectDefinition[]> = {
  // draft → planned
  'draft->planned': [
    {
      name: 'Lock configuration fields',
      execute: async (campaign) => {
        console.log(`[Side Effect] Locking configuration for campaign ${campaign.id}`);
        // Configuration locking is handled by the lifecycle manager
        // by preventing edits to certain fields in planned+ states
      },
      critical: false,
    },
    {
      name: 'Initialize billing integration',
      execute: async (campaign) => {
        console.log(`[Side Effect] Initializing billing for campaign ${campaign.id}`);
        // TODO: Integration with billing service
        // - If pricingModel = 'bundle', allocate credits/seats from L2I subscription
        // - Create billing usage record
      },
      critical: false,
    },
    {
      name: 'Send notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Notifying sales/CS team of new planned campaign ${campaign.id}`);
        // TODO: Send notification via notification service
      },
      critical: false,
    },
  ],

  // planned → recruiting
  'planned->recruiting': [
    {
      name: 'Enable volunteer signup',
      execute: async (campaign) => {
        console.log(`[Side Effect] Enabling volunteer signup for campaign ${campaign.id}`);
        // TODO: Make campaign visible in volunteer portal
        // - Update campaign visibility flags
        // - Generate signup links
      },
      critical: false,
    },
    {
      name: 'Send recruitment notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending recruitment emails for campaign ${campaign.id}`);
        // TODO: Send recruitment emails/notifications
      },
      critical: false,
    },
    {
      name: 'Initialize capacity alerts',
      execute: async (campaign) => {
        console.log(`[Side Effect] Initializing capacity tracking for campaign ${campaign.id}`);
        // Capacity alerts are handled by the auto-transition job
        // which runs hourly and checks utilization
      },
      critical: false,
    },
  ],

  // recruiting → active OR planned → active
  'recruiting->active': [
    {
      name: 'Create initial ProgramInstance',
      execute: async (campaign) => {
        console.log(`[Side Effect] Creating initial ProgramInstance for campaign ${campaign.id}`);
        // TODO: Agent 3.1 (campaign-instantiator) creates ProgramInstance
        // - Inherits template configuration + campaign overrides
        // - Links to campaign for metrics aggregation
      },
      critical: true, // Must succeed for campaign to be active
    },
    {
      name: 'Activate connectors',
      execute: async (campaign) => {
        console.log(`[Side Effect] Activating connectors for campaign ${campaign.id}`);
        // TODO: Enable session tracking in kintell-connector, buddy-service, etc.
      },
      critical: false,
    },
    {
      name: 'Start metrics aggregation',
      execute: async (campaign) => {
        console.log(`[Side Effect] Starting metrics aggregation for campaign ${campaign.id}`);
        // Metrics aggregation handled by Agent 3.5 (metrics-aggregator)
        // Runs hourly/daily to update campaign metrics
      },
      critical: false,
    },
    {
      name: 'Begin billing usage metering',
      execute: async (campaign) => {
        console.log(`[Side Effect] Beginning billing usage metering for campaign ${campaign.id}`);
        // TODO: Start tracking seat/credit consumption
      },
      critical: false,
    },
    {
      name: 'Send start notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending campaign start notifications for ${campaign.id}`);
        // TODO: Notify company admins, volunteers
      },
      critical: false,
    },
  ],
  'planned->active': [
    // Same side effects as recruiting → active
    {
      name: 'Create initial ProgramInstance',
      execute: async (campaign) => {
        console.log(`[Side Effect] Creating initial ProgramInstance for campaign ${campaign.id}`);
        // TODO: Agent 3.1 (campaign-instantiator) creates ProgramInstance
      },
      critical: true,
    },
    {
      name: 'Activate connectors',
      execute: async (campaign) => {
        console.log(`[Side Effect] Activating connectors for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Start metrics aggregation',
      execute: async (campaign) => {
        console.log(`[Side Effect] Starting metrics aggregation for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Begin billing usage metering',
      execute: async (campaign) => {
        console.log(`[Side Effect] Beginning billing usage metering for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send start notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending campaign start notifications for ${campaign.id}`);
      },
      critical: false,
    },
  ],

  // active → paused
  'active->paused': [
    {
      name: 'Freeze activities',
      execute: async (campaign) => {
        console.log(`[Side Effect] Freezing activities for campaign ${campaign.id}`);
        // TODO: Disable session tracking
        // - Update ProgramInstances to paused status
      },
      critical: false,
    },
    {
      name: 'Disable participant access',
      execute: async (campaign) => {
        console.log(`[Side Effect] Disabling participant access for campaign ${campaign.id}`);
        // TODO: Update access controls
      },
      critical: false,
    },
    {
      name: 'Pause billing usage metering',
      execute: async (campaign) => {
        console.log(`[Side Effect] Pausing billing for campaign ${campaign.id}`);
        // TODO: Pause usage tracking
      },
      critical: false,
    },
    {
      name: 'Send pause notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending pause notifications for campaign ${campaign.id}`);
        // TODO: Notify participants
      },
      critical: false,
    },
  ],

  // paused → active
  'paused->active': [
    {
      name: 'Resume activities',
      execute: async (campaign) => {
        console.log(`[Side Effect] Resuming activities for campaign ${campaign.id}`);
        // TODO: Re-enable session tracking
      },
      critical: false,
    },
    {
      name: 'Re-enable participant access',
      execute: async (campaign) => {
        console.log(`[Side Effect] Re-enabling participant access for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Resume billing usage metering',
      execute: async (campaign) => {
        console.log(`[Side Effect] Resuming billing for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send resume notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending resume notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],

  // active → completed OR paused → completed
  'active->completed': [
    {
      name: 'Run final metrics aggregation',
      execute: async (campaign) => {
        console.log(`[Side Effect] Running final metrics aggregation for campaign ${campaign.id}`);
        // TODO: Agent 3.5 runs final aggregation
        // - Calculate final SROI, VIS, hours, sessions
        // - Create final CampaignMetricsSnapshot
      },
      critical: true,
    },
    {
      name: 'Generate final impact report',
      execute: async (campaign) => {
        console.log(`[Side Effect] Generating final report for campaign ${campaign.id}`);
        // TODO: Generate "Campaign Impact Summary" document
      },
      critical: false,
    },
    {
      name: 'Reconcile budget',
      execute: async (campaign) => {
        console.log(`[Side Effect] Reconciling budget for campaign ${campaign.id}`);
        // TODO: Compare budgetAllocated vs budgetSpent
      },
      critical: false,
    },
    {
      name: 'Update billing with final usage',
      execute: async (campaign) => {
        console.log(`[Side Effect] Updating billing with final usage for campaign ${campaign.id}`);
        // TODO: Send final usage to billing system
      },
      critical: false,
    },
    {
      name: 'Send completion notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending completion notifications for campaign ${campaign.id}`);
        // TODO: Notify company admins
      },
      critical: false,
    },
    {
      name: 'Flag for upsell analysis',
      execute: async (campaign) => {
        console.log(`[Side Effect] Flagging for upsell analysis: campaign ${campaign.id}`);
        // TODO: Agent 5.4 (upsell-opportunity-analyzer) analyzes completed campaigns
      },
      critical: false,
    },
  ],
  'paused->completed': [
    // Same as active → completed
    {
      name: 'Run final metrics aggregation',
      execute: async (campaign) => {
        console.log(`[Side Effect] Running final metrics aggregation for campaign ${campaign.id}`);
      },
      critical: true,
    },
    {
      name: 'Generate final impact report',
      execute: async (campaign) => {
        console.log(`[Side Effect] Generating final report for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Reconcile budget',
      execute: async (campaign) => {
        console.log(`[Side Effect] Reconciling budget for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Update billing with final usage',
      execute: async (campaign) => {
        console.log(`[Side Effect] Updating billing with final usage for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send completion notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending completion notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Flag for upsell analysis',
      execute: async (campaign) => {
        console.log(`[Side Effect] Flagging for upsell analysis: campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],

  // completed → closed OR paused → closed OR recruiting → closed
  'completed->closed': [
    {
      name: 'Archive data',
      execute: async (campaign) => {
        console.log(`[Side Effect] Archiving data for campaign ${campaign.id}`);
        // TODO: Archive to data warehouse
        // - Set isActive = false
        // - Set isArchived = true
      },
      critical: false,
    },
    {
      name: 'Remove from active lists',
      execute: async (campaign) => {
        console.log(`[Side Effect] Removing campaign ${campaign.id} from active lists`);
        // Handled by setting isActive = false
      },
      critical: false,
    },
    {
      name: 'Send archival notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending archival notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],
  'paused->closed': [
    {
      name: 'Archive data',
      execute: async (campaign) => {
        console.log(`[Side Effect] Archiving data for campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send archival notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending archival notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],
  'recruiting->closed': [
    {
      name: 'Archive data',
      execute: async (campaign) => {
        console.log(`[Side Effect] Archiving cancelled campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send cancellation notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending cancellation notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],
  'planned->closed': [
    {
      name: 'Archive data',
      execute: async (campaign) => {
        console.log(`[Side Effect] Archiving cancelled campaign ${campaign.id}`);
      },
      critical: false,
    },
    {
      name: 'Send cancellation notifications',
      execute: async (campaign) => {
        console.log(`[Side Effect] Sending cancellation notifications for campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],
  'draft->closed': [
    {
      name: 'Archive data',
      execute: async (campaign) => {
        console.log(`[Side Effect] Archiving cancelled draft campaign ${campaign.id}`);
      },
      critical: false,
    },
  ],
};

/**
 * Execute all side effects for a transition
 *
 * @param campaign - The campaign being transitioned
 * @param transition - The transition metadata
 * @returns Array of side effect results (success/failure)
 */
export async function executeSideEffects(
  campaign: Campaign,
  transition: StateTransition
): Promise<{ name: string; success: boolean; error?: Error }[]> {
  const transitionKey = `${transition.from}->${transition.to}`;
  const sideEffects = TRANSITION_SIDE_EFFECTS[transitionKey] || [];

  const results: { name: string; success: boolean; error?: Error }[] = [];

  for (const sideEffect of sideEffects) {
    try {
      await sideEffect.execute(campaign, transition);
      results.push({ name: sideEffect.name, success: true });
    } catch (error) {
      const err = error as Error;
      console.error(
        `[Side Effect Error] ${sideEffect.name} failed for campaign ${campaign.id}:`,
        err.message
      );
      results.push({ name: sideEffect.name, success: false, error: err });

      // If critical side effect fails, throw error to block transition
      if (sideEffect.critical) {
        throw new TransitionValidationError(
          `Critical side effect failed: ${sideEffect.name}`,
          'SIDE_EFFECT_FAILED',
          { sideEffect: sideEffect.name, error: err.message }
        );
      }
    }
  }

  return results;
}

// ============================================================================
// AUTOMATIC TRANSITION ELIGIBILITY
// ============================================================================

/**
 * Check if campaign is eligible for automatic transition
 *
 * Automatic transitions:
 * - planned/recruiting → active (when startDate reached)
 * - active → completed (when endDate reached)
 */
export function checkAutoTransitionEligibility(
  campaign: Campaign,
  currentDate: Date = new Date()
): { eligible: boolean; newStatus?: CampaignStatus; reason?: string } {
  const status = campaign.status;
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);

  // planned/recruiting → active (on startDate)
  if ((status === 'planned' || status === 'recruiting') && currentDate >= startDate) {
    return {
      eligible: true,
      newStatus: 'active',
      reason: `Start date reached (${campaign.startDate})`,
    };
  }

  // active → completed (on endDate)
  if (status === 'active' && currentDate >= endDate) {
    return {
      eligible: true,
      newStatus: 'completed',
      reason: `End date reached (${campaign.endDate})`,
    };
  }

  return { eligible: false };
}
