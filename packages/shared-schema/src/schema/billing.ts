/**
 * Billing & Subscription Schema
 * Handles subscriptions, usage metering, invoices for commercial platform
 */

import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, text, index, decimal, boolean } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['starter', 'pro', 'enterprise', 'custom', 'essentials', 'professional']);
export const l2iSkuEnum = pgEnum('l2i_sku', ['L2I-250', 'L2I-500', 'L2I-EXPAND', 'L2I-LAUNCH']);
export const l2iProgramEnum = pgEnum('l2i_program', ['language', 'mentorship', 'upskilling', 'weei']);
export const recognitionBadgeEnum = pgEnum('recognition_badge', ['bronze', 'silver', 'gold', 'platinum']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'trialing', 'past_due', 'canceled', 'unpaid']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void', 'uncollectible']);
export const usageEventTypeEnum = pgEnum('usage_event_type', [
  'q2q_tokens',
  'reports_generated',
  'active_seats',
  'nlq_queries',
  'ai_tokens_input',
  'ai_tokens_output',
  'storage_gb',
  'compute_hours'
]);

// L2I Bundle Enums
export const l2iBundleTierEnum = pgEnum('l2i_bundle_tier', ['foundation', 'growth', 'expand', 'launch']);
export const l2iProgramTagEnum = pgEnum('l2i_program_tag', ['language', 'mentorship', 'upskilling', 'weei']);
export const l2iBundleStatusEnum = pgEnum('l2i_bundle_status', ['active', 'expired', 'consumed', 'revoked']);

/**
 * Billing Customers - Links companies to Stripe customers
 */
export const billingCustomers = pgTable('billing_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),

  // Tax and billing details
  taxId: varchar('tax_id', { length: 100 }),
  billingEmail: varchar('billing_email', { length: 255 }),
  billingAddress: jsonb('billing_address').$type<{
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>(),

  // Customer portal
  customerPortalUrl: varchar('customer_portal_url', { length: 500 }),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('billing_customers_company_id_idx').on(table.companyId),
}));

/**
 * Subscriptions - Company subscription plans
 */
export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => billingCustomers.id),

  // Stripe data
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique().notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),

  // Plan details
  plan: subscriptionPlanEnum('plan').notNull(),
  status: subscriptionStatusEnum('status').notNull(),

  // Quantities
  seatCount: integer('seat_count').default(1).notNull(),

  // Billing period
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),

  // Trial
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),

  // Cancellation
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('billing_subscriptions_company_id_idx').on(table.companyId),
  statusIdx: index('billing_subscriptions_status_idx').on(table.status),
}));

/**
 * Usage Records - Metered events for billing
 */
export const billingUsageRecords = pgTable('billing_usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),

  // Event details
  eventType: usageEventTypeEnum('event_type').notNull(),
  quantity: decimal('quantity', { precision: 20, scale: 6 }).notNull(),

  // Idempotency
  deduplicationKey: varchar('deduplication_key', { length: 255 }).unique(),

  // Timestamps
  eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).notNull(),
  reportedToStripe: boolean('reported_to_stripe').default(false),
  reportedAt: timestamp('reported_at', { withTimezone: true }),

  // Stripe usage record ID
  stripeUsageRecordId: varchar('stripe_usage_record_id', { length: 255 }),

  // Metadata (context about the event)
  metadata: jsonb('metadata').default({}).$type<{
    userId?: string;
    resourceId?: string;
    modelName?: string;
    sessionId?: string;
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('billing_usage_records_company_id_idx').on(table.companyId),
  eventTypeIdx: index('billing_usage_records_event_type_idx').on(table.eventType),
  eventTimestampIdx: index('billing_usage_records_event_timestamp_idx').on(table.eventTimestamp),
  deduplicationKeyIdx: index('billing_usage_records_dedup_idx').on(table.deduplicationKey),
}));

/**
 * Invoices - Generated invoices
 */
export const billingInvoices = pgTable('billing_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => billingCustomers.id),
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),

  // Stripe data
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),

  // Invoice details
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  status: invoiceStatusEnum('status').notNull(),

  // Amounts (in cents)
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').default(0),
  total: integer('total').notNull(),
  amountDue: integer('amount_due').notNull(),
  amountPaid: integer('amount_paid').default(0),

  // Currency
  currency: varchar('currency', { length: 3 }).default('usd'),

  // Dates
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Files
  invoicePdfUrl: varchar('invoice_pdf_url', { length: 500 }),
  hostedInvoiceUrl: varchar('hosted_invoice_url', { length: 500 }),

  // Line items (detailed breakdown)
  lineItems: jsonb('line_items').$type<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    period?: { start: string; end: string };
  }>>(),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('billing_invoices_company_id_idx').on(table.companyId),
  statusIdx: index('billing_invoices_status_idx').on(table.status),
  periodIdx: index('billing_invoices_period_idx').on(table.periodStart, table.periodEnd),
}));

/**
 * Billing Events - Audit trail for billing operations
 */
export const billingEvents = pgTable('billing_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),

  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventSource: varchar('event_source', { length: 50 }).notNull(), // 'stripe', 'internal', 'admin'

  // Stripe webhook event ID (for idempotency)
  stripeEventId: varchar('stripe_event_id', { length: 255 }).unique(),

  // Related resources
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),
  invoiceId: uuid('invoice_id').references(() => billingInvoices.id),

  // Event payload
  payload: jsonb('payload').notNull(),

  // Processing
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('billing_events_company_id_idx').on(table.companyId),
  eventTypeIdx: index('billing_events_event_type_idx').on(table.eventType),
  stripeEventIdIdx: index('billing_events_stripe_event_id_idx').on(table.stripeEventId),
  processedIdx: index('billing_events_processed_idx').on(table.processed),
}));

/**
 * Plan Features - Feature limits per plan
 */
export const billingPlanFeatures = pgTable('billing_plan_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  plan: subscriptionPlanEnum('plan').notNull().unique(),

  // Feature limits
  maxSeats: integer('max_seats'), // null = unlimited
  maxReportsPerMonth: integer('max_reports_per_month'),
  maxAiTokensPerMonth: integer('max_ai_tokens_per_month'),
  maxStorageGB: integer('max_storage_gb'),

  // Feature flags
  features: jsonb('features').notNull().$type<{
    reportBuilder: boolean;
    boardroomLive: boolean;
    forecast: boolean;
    benchmarking: boolean;
    nlq: boolean;
    aiCopilot: boolean;
    genAiReports: boolean;
    copilot: boolean;
    multiRegion: boolean;
    connectors: boolean;
    apiAccess: boolean;
    externalConnectors: boolean;
    sso: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    multiRegion: boolean;
    scimProvisioning: boolean;
  }>(),

  // Pricing (for reference, actual pricing in Stripe)
  basePrice: integer('base_price'), // cents per month
  seatPrice: integer('seat_price'), // cents per additional seat

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * L2I Bundles - License-to-Impact bundle SKU definitions
 */
export const l2iBundles = pgTable('l2i_bundles', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: l2iSkuEnum('sku').notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Pricing
  annualPrice: integer('annual_price').notNull(), // cents
  currency: varchar('currency', { length: 3 }).default('usd'),

  // Impact metrics
  impactTier: varchar('impact_tier', { length: 50 }).notNull(), // tier1, tier2, tier3, tier4
  learnersSupported: integer('learners_supported').notNull(),

  // Recognition
  recognitionBadge: recognitionBadgeEnum('recognition_badge').notNull(),
  foundingMember: boolean('founding_member').default(false),

  // Program tags (default allocation percentages)
  defaultAllocation: jsonb('default_allocation').notNull().$type<{
    language: number;
    mentorship: number;
    upskilling: number;
    weei: number;
  }>(),

  // Stripe integration
  stripePriceId: varchar('stripe_price_id', { length: 255 }),

  // Status
  active: boolean('active').default(true),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * L2I Subscriptions - Company purchases of L2I bundles
 */
export const l2iSubscriptions = pgTable('l2i_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  bundleId: uuid('bundle_id').notNull().references(() => l2iBundles.id),
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),

  // Purchase details
  sku: l2iSkuEnum('sku').notNull(),
  quantity: integer('quantity').default(1).notNull(),

  // Stripe data
  stripeSubscriptionItemId: varchar('stripe_subscription_item_id', { length: 255 }),

  // Billing period
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),

  // Status
  status: subscriptionStatusEnum('status').notNull().default('active'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),

  // Program allocation (customizable by company)
  programAllocation: jsonb('program_allocation').notNull().$type<{
    language: number; // percentage (0-1)
    mentorship: number;
    upskilling: number;
    weei: number;
  }>(),

  // Impact tracking
  learnersServedToDate: integer('learners_served_to_date').default(0),
  lastImpactUpdateAt: timestamp('last_impact_update_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('l2i_subscriptions_company_id_idx').on(table.companyId),
  bundleIdIdx: index('l2i_subscriptions_bundle_id_idx').on(table.bundleId),
  statusIdx: index('l2i_subscriptions_status_idx').on(table.status),
}));

/**
 * L2I Allocations - Track program-level impact allocations
 */
export const l2iAllocations = pgTable('l2i_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  l2iSubscriptionId: uuid('l2i_subscription_id').notNull().references(() => l2iSubscriptions.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // Program details
  program: l2iProgramEnum('program').notNull(),
  allocationPercentage: decimal('allocation_percentage', { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000
  allocationAmountUSD: integer('allocation_amount_usd').notNull(), // cents

  // Impact metrics (updated periodically)
  learnersServed: integer('learners_served').default(0),
  averageSROI: decimal('average_sroi', { precision: 10, scale: 2 }),
  averageVIS: decimal('average_vis', { precision: 10, scale: 2 }),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),

  // Evidence lineage (sample evidence IDs showing impact)
  evidenceSnippets: jsonb('evidence_snippets').$type<Array<{
    evidenceId: string;
    learnerName: string; // anonymized
    outcome: string;
    sroi: number;
  }>>(),

  // Period tracking
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

  // Last updated
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  l2iSubscriptionIdIdx: index('l2i_allocations_l2i_subscription_id_idx').on(table.l2iSubscriptionId),
  companyIdIdx: index('l2i_allocations_company_id_idx').on(table.companyId),
  programIdx: index('l2i_allocations_program_idx').on(table.program),
  periodIdx: index('l2i_allocations_period_idx').on(table.periodStart, table.periodEnd),
}));

/**
 * L2I Impact Events - Audit trail for impact updates
 */
export const l2iImpactEvents = pgTable('l2i_impact_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  l2iSubscriptionId: uuid('l2i_subscription_id').notNull().references(() => l2iSubscriptions.id, { onDelete: 'cascade' }),
  allocationId: uuid('allocation_id').references(() => l2iAllocations.id),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // Event details
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'learner_served', 'outcome_recorded', 'allocation_changed'
  program: l2iProgramEnum('program'),

  // Impact data
  learnerIds: jsonb('learner_ids').$type<string[]>(),
  outcomeMetrics: jsonb('outcome_metrics').$type<{
    sroi?: number;
    vis?: number;
    engagement?: number;
  }>(),

  // Source tracking
  sourceSystem: varchar('source_system', { length: 100 }), // 'kintell', 'buddy', 'impact-in'
  sourceEventId: varchar('source_event_id', { length: 255 }),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  l2iSubscriptionIdIdx: index('l2i_impact_events_l2i_subscription_id_idx').on(table.l2iSubscriptionId),
  companyIdIdx: index('l2i_impact_events_company_id_idx').on(table.companyId),
  eventTypeIdx: index('l2i_impact_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('l2i_impact_events_created_at_idx').on(table.createdAt),
}));
