/**
 * Billing & Subscription Schema
 * Handles subscriptions, usage metering, invoices for commercial platform
 */

import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, text, index, decimal, boolean } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['essentials', 'professional', 'enterprise', 'custom']);
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
    genAiReports: boolean;
    copilot: boolean;
    multiRegion: boolean;
    connectors: boolean;
    apiAccess: boolean;
    sso: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
  }>(),

  // Pricing (for reference, actual pricing in Stripe)
  basePrice: integer('base_price'), // cents per month
  seatPrice: integer('seat_price'), // cents per additional seat

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * L2I Bundles - License-to-Impact add-on SKUs
 * Tied to TEEI program funding tiers with learner capacity and impact recognition
 */
export const l2iBundles = pgTable('l2i_bundles', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),

  // Bundle tier and pricing
  tier: l2iBundleTierEnum('tier').notNull(),
  sku: varchar('sku', { length: 100 }).notNull(), // e.g., 'L2I-FOUNDATION-250'
  priceUSD: integer('price_usd').notNull(), // Price in cents

  // Learner capacity
  learnerCapacity: integer('learner_capacity').notNull(), // 250, 500, custom
  learnersAllocated: integer('learners_allocated').default(0),

  // Program tags (multiple programs can be funded)
  programTags: jsonb('program_tags').notNull().$type<Array<'language' | 'mentorship' | 'upskilling' | 'weei'>>(),

  // Recognition metadata
  recognition: jsonb('recognition').$type<{
    founderBadge?: 'founding-8' | 'founding-100' | 'founding-1000';
    impactCredits?: number;
    acknowledgmentTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    publicRecognition?: boolean;
  }>(),

  // Allocation details
  teeiProgramId: varchar('teei_program_id', { length: 255 }), // Links to TEEI program
  allocationNotes: text('allocation_notes'),

  // Status and validity
  status: l2iBundleStatusEnum('status').notNull().default('active'),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),

  // Stripe integration
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  stripeInvoiceItemId: varchar('stripe_invoice_item_id', { length: 255 }),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('l2i_bundles_company_id_idx').on(table.companyId),
  tierIdx: index('l2i_bundles_tier_idx').on(table.tier),
  statusIdx: index('l2i_bundles_status_idx').on(table.status),
  subscriptionIdIdx: index('l2i_bundles_subscription_id_idx').on(table.subscriptionId),
}));

/**
 * L2I Allocations - Track learner allocations per bundle
 * Records which learners are funded by which L2I bundle
 */
export const l2iAllocations = pgTable('l2i_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleId: uuid('bundle_id').notNull().references(() => l2iBundles.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),

  // Learner info (from TEEI programs)
  learnerUserId: uuid('learner_user_id'), // May link to users table if learner has account
  learnerExternalId: varchar('learner_external_id', { length: 255 }), // TEEI program learner ID
  learnerName: varchar('learner_name', { length: 255 }),
  learnerEmail: varchar('learner_email', { length: 255 }),

  // Program details
  programTag: l2iProgramTagEnum('program_tag').notNull(),
  programCohort: varchar('program_cohort', { length: 100 }), // e.g., '2025-Q1'

  // Allocation status
  allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, withdrawn

  // Impact tracking
  impactMetrics: jsonb('impact_metrics').$type<{
    hoursCompleted?: number;
    skillsAcquired?: string[];
    certificationsEarned?: string[];
    engagementScore?: number;
  }>(),

  // Metadata
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bundleIdIdx: index('l2i_allocations_bundle_id_idx').on(table.bundleId),
  companyIdIdx: index('l2i_allocations_company_id_idx').on(table.companyId),
  programTagIdx: index('l2i_allocations_program_tag_idx').on(table.programTag),
  learnerExternalIdIdx: index('l2i_allocations_learner_external_id_idx').on(table.learnerExternalId),
}));
