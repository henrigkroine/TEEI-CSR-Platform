/**
 * Campaigns Schema
 * Sellable CSR products linking templates, beneficiary groups, and commercial terms
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Created by: Agent 1.5 (monetization-metadata-modeler)
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  text,
  index,
  decimal,
  boolean,
  date
} from 'drizzle-orm/pg-core';
import { companies } from './users.js';
import { l2iSubscriptions } from './billing.js';
import { programTemplates } from './program-templates.js';
import { beneficiaryGroups } from './beneficiary-groups.js';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Campaign lifecycle states
 * Flow: draft → planned → recruiting → active → paused? → completed → closed
 */
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',       // Initial creation, not finalized
  'planned',     // Scheduled for future start
  'recruiting',  // Actively seeking volunteers/participants
  'active',      // Running program
  'paused',      // Temporarily suspended
  'completed',   // Successfully finished
  'closed'       // Archived/cancelled
]);

/**
 * Pricing models for campaign monetization
 * - seats: Pay per volunteer seat (monthly)
 * - credits: Pre-purchased impact credits consumed per activity
 * - bundle: Part of L2I subscription bundle allocation
 * - iaas: Impact-as-a-Service (pay per learner outcomes)
 * - custom: Negotiated pricing
 */
export const pricingModelEnum = pgEnum('pricing_model', [
  'seats',
  'credits',
  'bundle',
  'iaas',
  'custom'
]);

/**
 * Campaign priority levels (for resource allocation)
 */
export const campaignPriorityEnum = pgEnum('campaign_priority', [
  'low',
  'medium',
  'high',
  'critical'
]);

// ============================================================================
// CAMPAIGNS TABLE
// ============================================================================

/**
 * Campaigns - Sellable CSR Products
 *
 * A Campaign represents a sellable unit: Template + Beneficiary Group + Company + Period + Commercial Terms
 * Example: "Mentors for Syrian Refugees - Q1 2025" for Acme Corp
 *
 * Monetization Models:
 * 1. SEATS: committedSeats × seatPricePerMonth (e.g., 50 seats × $500/mo)
 * 2. CREDITS: creditAllocation with consumption tracking (e.g., 10,000 credits at $0.50 each)
 * 3. BUNDLE: Portion of L2I subscription (e.g., 25% of L2I-500 bundle)
 * 4. IAAS: learnersCommitted × pricePerLearner with outcome guarantees
 * 5. CUSTOM: Bespoke pricing in metadata
 */
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // "Mentors for Syrian Refugees - Q1 2025"
  description: text('description'),

  // ========================================================================
  // RELATIONSHIPS
  // ========================================================================

  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // Foreign keys to program templates and beneficiary groups
  programTemplateId: uuid('program_template_id').notNull().references(() => programTemplates.id, { onDelete: 'restrict' }),
  beneficiaryGroupId: uuid('beneficiary_group_id').notNull().references(() => beneficiaryGroups.id, { onDelete: 'restrict' }),

  // ========================================================================
  // CAMPAIGN PERIOD
  // ========================================================================

  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  quarter: varchar('quarter', { length: 10 }), // "2025-Q1" for reporting alignment

  // ========================================================================
  // LIFECYCLE & PRIORITY
  // ========================================================================

  status: campaignStatusEnum('status').notNull().default('draft'),
  priority: campaignPriorityEnum('priority').default('medium'),

  // ========================================================================
  // CAPACITY & QUOTAS (Target vs Actual Tracking)
  // ========================================================================

  targetVolunteers: integer('target_volunteers').notNull(), // Planned volunteer capacity
  currentVolunteers: integer('current_volunteers').default(0).notNull(), // Actually enrolled

  targetBeneficiaries: integer('target_beneficiaries').notNull(), // Planned learner capacity
  currentBeneficiaries: integer('current_beneficiaries').default(0).notNull(), // Actually enrolled

  maxSessions: integer('max_sessions'), // Optional session limit
  currentSessions: integer('current_sessions').default(0).notNull(),

  // ========================================================================
  // BUDGET TRACKING
  // ========================================================================

  budgetAllocated: decimal('budget_allocated', { precision: 12, scale: 2 }).notNull(), // Total budget
  budgetSpent: decimal('budget_spent', { precision: 12, scale: 2 }).default('0').notNull(), // Current spend
  currency: varchar('currency', { length: 3 }).default('EUR').notNull(), // ISO 4217 currency code

  // ========================================================================
  // MONETIZATION MODEL (Agent 1.5 - Pricing Fields)
  // ========================================================================

  pricingModel: pricingModelEnum('pricing_model').notNull(),

  // --- SEATS MODEL ---
  // Pay per volunteer seat (e.g., 50 seats × €500/month)
  committedSeats: integer('committed_seats'), // Purchased volunteer slots
  seatPricePerMonth: decimal('seat_price_per_month', { precision: 10, scale: 2 }), // Price per seat

  // --- CREDITS MODEL ---
  // Pre-purchased impact credits consumed per activity
  creditAllocation: integer('credit_allocation'), // Total credits allocated
  creditConsumptionRate: decimal('credit_consumption_rate', { precision: 10, scale: 4 }), // Credits per hour/session
  creditsRemaining: integer('credits_remaining'), // Credits left

  // --- IAAS MODEL (Impact-as-a-Service) ---
  // Pay per learner with outcome guarantees
  iaasMetrics: jsonb('iaas_metrics').$type<{
    learnersCommitted: number; // Guaranteed number of learners
    pricePerLearner: number; // Price per learner (decimal)
    outcomesGuaranteed: string[]; // e.g., ['job_readiness > 0.7', 'language_proficiency >= B1']
    outcomeThresholds?: { [key: string]: number }; // e.g., { sroi: 3.0, vis: 70 }
  }>(),

  // --- BUNDLE MODEL (L2I Subscription Allocation) ---
  // Campaign is part of a larger L2I bundle
  l2iSubscriptionId: uuid('l2i_subscription_id').references(() => l2iSubscriptions.id), // FK to L2I subscription
  bundleAllocationPercentage: decimal('bundle_allocation_percentage', { precision: 5, scale: 4 }), // 0.25 = 25% of bundle

  // --- CUSTOM PRICING ---
  // For negotiated or bespoke pricing models
  customPricingTerms: jsonb('custom_pricing_terms').$type<{
    description?: string;
    fixedFee?: number;
    variableComponents?: Array<{
      name: string;
      unit: string; // 'hour', 'session', 'learner'
      rate: number;
      cap?: number;
    }>;
    milestonePayments?: Array<{
      milestone: string;
      amount: number;
      dueDate?: string;
    }>;
  }>(),

  // ========================================================================
  // CONFIGURATION OVERRIDES (from template)
  // ========================================================================

  // Company-specific tweaks to program template defaults
  configOverrides: jsonb('config_overrides').default({}).$type<{
    // Mentorship overrides
    sessionDuration?: number;
    sessionFrequency?: string;

    // Language overrides
    classSizeMax?: number;
    proficiencyLevels?: string[];

    // Buddy overrides
    matchMethod?: string;

    // Any custom fields
    [key: string]: any;
  }>(),

  // ========================================================================
  // IMPACT METRICS (Aggregated from ProgramInstances)
  // ========================================================================

  // Updated periodically by metrics-aggregator (Agent 3.5)
  cumulativeSROI: decimal('cumulative_sroi', { precision: 10, scale: 2 }), // Social Return on Investment
  averageVIS: decimal('average_vis', { precision: 10, scale: 2 }), // Volunteer Impact Score
  totalHoursLogged: decimal('total_hours_logged', { precision: 12, scale: 2 }).default('0'), // Sum of volunteer hours
  totalSessionsCompleted: integer('total_sessions_completed').default(0), // Sum of completed sessions

  // ========================================================================
  // UPSELL INDICATORS (Agent 1.5 - Sales Intelligence)
  // ========================================================================

  /**
   * Capacity utilization ratio (currentVolunteers / targetVolunteers)
   * Used to identify expansion opportunities
   */
  capacityUtilization: decimal('capacity_utilization', { precision: 5, scale: 4 }).default('0'), // 0.85 = 85% utilized

  /**
   * Near capacity flag (e.g., >80% utilization)
   * Triggers proactive upsell outreach
   */
  isNearCapacity: boolean('is_near_capacity').default(false),

  /**
   * Over capacity flag (e.g., >100% utilization)
   * Indicates need for immediate expansion
   */
  isOverCapacity: boolean('is_over_capacity').default(false),

  /**
   * High-value campaign indicator
   * Based on SROI, VIS, engagement, and budget
   */
  isHighValue: boolean('is_high_value').default(false),

  /**
   * Upsell opportunity score (0-100)
   * Composite score for sales prioritization
   * Calculated from: capacity utilization + SROI + engagement + budget spend rate
   */
  upsellOpportunityScore: integer('upsell_opportunity_score').default(0),

  // ========================================================================
  // LINEAGE & EVIDENCE
  // ========================================================================

  // Top evidence snippets demonstrating campaign impact
  evidenceSnippetIds: jsonb('evidence_snippet_ids').default([]).$type<string[]>(),

  // ========================================================================
  // METADATA & TAGS
  // ========================================================================

  tags: jsonb('tags').default([]).$type<string[]>(), // ['integration', 'employment', 'refugees']
  internalNotes: text('internal_notes'), // For sales/CS notes (not visible to customer)

  // ========================================================================
  // STATUS FLAGS
  // ========================================================================

  isActive: boolean('is_active').default(true),
  isArchived: boolean('is_archived').default(false),

  // ========================================================================
  // AUDIT TIMESTAMPS
  // ========================================================================

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastMetricsUpdateAt: timestamp('last_metrics_update_at', { withTimezone: true }), // Last aggregation run
  createdBy: uuid('created_by'), // Admin/user who created campaign

}, (table) => ({
  // Performance indexes
  companyIdIdx: index('campaigns_company_id_idx').on(table.companyId),
  statusIdx: index('campaigns_status_idx').on(table.status),
  templateIdIdx: index('campaigns_template_id_idx').on(table.programTemplateId),
  groupIdIdx: index('campaigns_group_id_idx').on(table.beneficiaryGroupId),
  datesIdx: index('campaigns_dates_idx').on(table.startDate, table.endDate),
  pricingModelIdx: index('campaigns_pricing_model_idx').on(table.pricingModel),
  l2iSubscriptionIdIdx: index('campaigns_l2i_subscription_id_idx').on(table.l2iSubscriptionId),

  // Upsell query optimization
  capacityUtilizationIdx: index('campaigns_capacity_utilization_idx').on(table.capacityUtilization),
  upsellScoreIdx: index('campaigns_upsell_score_idx').on(table.upsellOpportunityScore),

  // Reporting indexes
  quarterIdx: index('campaigns_quarter_idx').on(table.quarter),
  activeIdx: index('campaigns_active_idx').on(table.isActive, table.status),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

/**
 * Pricing model type guard helpers
 */
export const isPricingModelSeats = (campaign: Campaign): boolean => campaign.pricingModel === 'seats';
export const isPricingModelCredits = (campaign: Campaign): boolean => campaign.pricingModel === 'credits';
export const isPricingModelBundle = (campaign: Campaign): boolean => campaign.pricingModel === 'bundle';
export const isPricingModelIAAS = (campaign: Campaign): boolean => campaign.pricingModel === 'iaas';
export const isPricingModelCustom = (campaign: Campaign): boolean => campaign.pricingModel === 'custom';

/**
 * Capacity utilization helpers
 */
export const calculateCapacityUtilization = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.round((current / target) * 10000) / 10000; // 4 decimal places
};

export const isNearCapacity = (utilization: number, threshold: number = 0.8): boolean => {
  return utilization >= threshold && utilization < 1.0;
};

export const isOverCapacity = (utilization: number): boolean => {
  return utilization >= 1.0;
};
