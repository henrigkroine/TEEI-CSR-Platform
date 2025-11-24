/**
 * Campaign Service Library Exports
 *
 * Centralized exports for all campaign service utilities
 */

// Core Campaign Management
export {
  createCampaign,
  type CreateCampaignInput,
  type CreateCampaignResult
} from './campaign-instantiator.js';

export {
  validateTemplateGroupCompatibility,
  type CompatibilityResult
} from './campaign-validator.js';

export {
  mergeConfigs,
  type MergeResult
} from './config-merger.js';

// Capacity Management
export {
  CapacityTracker,
  createCapacityTracker,
  type CapacityStatus,
  type CapacityAlert,
  type ConsumptionResult
} from './capacity-tracker.js';

export {
  CapacityAlertsManager,
  createCapacityAlertsManager,
  type AlertTemplate
} from './capacity-alerts.js';

// Seat & Credit Tracking (Agent 5.2)
export {
  SeatTracker,
  createSeatTracker,
  type SeatAllocation,
  type SeatUsage,
  type SeatUsageReport,
  type SeatAllocationEvent,
  type SeatCapacityThreshold
} from './seat-tracker.js';

export {
  CreditTracker,
  createCreditTracker,
  type CreditConsumption,
  type CreditBalance,
  type CreditUsageBreakdown,
  type CreditUsageReport,
  type CreditCapacityThreshold
} from './credit-tracker.js';

// Lifecycle Management
export {
  CampaignLifecycleManager,
  createCampaignLifecycleManager,
  type StateTransition,
  type TransitionResult
} from './lifecycle-manager.js';

// Activity Association
export {
  ActivityAssociator,
  createActivityAssociator,
  type AssociationResult,
  type ScoredCampaign
} from './activity-associator.js';

// Metrics & Reporting
export {
  MetricsAggregator,
  createMetricsAggregator,
  type AggregatedMetrics,
  type MetricsSnapshot
} from './metrics-aggregator.js';

// Commercial & Billing
export {
  CommercialTermsManager,
  createCommercialTermsManager,
  type PricingProposal
} from './commercial-terms.js';

export {
  BillingIntegrator,
  createBillingIntegrator,
  type UsageRecord
} from './billing-integrator.js';

export {
  PricingSignalsExporter,
  createPricingSignalsExporter,
  type PricingSignal
} from './pricing-signals.js';

export {
  UpsellOpportunityAnalyzer,
  createUpsellOpportunityAnalyzer,
  type UpsellOpportunity
} from './upsell-analyzer.js';

// Evidence Selection
export {
  EvidenceSelector,
  createEvidenceSelector,
  type SelectedEvidence
} from './evidence-selector.js';

// Program Instance Management
export {
  ProgramInstanceCreator,
  createProgramInstanceCreator
} from './instance-creator.js';

// State Management
export {
  StateTransitionManager,
  createStateTransitionManager
} from './state-transitions.js';

// Backfill Utilities
export {
  backfillHistoricalSessions,
  backfillHistoricalMatches,
  backfillHistoricalCompletions,
  backfillAllHistoricalData,
  type BackfillOptions,
  type BackfillResult
} from './backfill-associations.js';
