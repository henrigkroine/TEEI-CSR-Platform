/**
 * Program Campaigns Schema
 * Drizzle ORM schema for program_campaigns table
 *
 * Agent: company-program-linker (Agent 10)
 */

import { pgTable, uuid, varchar, timestamp, jsonb, integer, decimal, text, date, index } from 'drizzle-orm/pg-core';
import { users, companies } from './users.js';
import { programs } from './programs.js';
import { l2iSubscriptions } from './billing.js';

/**
 * Program Campaigns
 * Company-specific instances of programs with budget tracking
 */
export const programCampaigns = pgTable(
  'program_campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    campaignKey: varchar('campaign_key', { length: 100 }).unique().notNull(),
    programId: uuid('program_id').notNull().references(() => programs.id),
    companyId: uuid('company_id').notNull().references(() => companies.id),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Configuration (Program + Campaign Overrides)
    configOverrides: jsonb('config_overrides'),

    // Lifecycle
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, active, paused, completed, archived
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),

    // Capacity Management
    targetEnrollment: integer('target_enrollment'), // Goal
    maxEnrollment: integer('max_enrollment'), // Hard cap
    currentEnrollment: integer('current_enrollment').default(0).notNull(),

    // Billing Integration
    l2iSubscriptionId: uuid('l2i_subscription_id').references(() => l2iSubscriptions.id),
    budgetAllocated: integer('budget_allocated'), // cents
    budgetSpent: integer('budget_spent').default(0).notNull(),

    // Metrics (Cached Aggregates)
    completionCount: integer('completion_count').default(0).notNull(),
    averageSroi: decimal('average_sroi', { precision: 10, scale: 2 }),
    averageVis: decimal('average_vis', { precision: 10, scale: 2 }),

    // Metadata
    tags: text('tags').array(),
    internalCode: varchar('internal_code', { length: 100 }), // Company's project code

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    programIdx: index('program_campaigns_program_idx').on(table.programId),
    companyIdx: index('program_campaigns_company_idx').on(table.companyId),
    statusIdx: index('program_campaigns_status_idx').on(table.status),
    l2iSubscriptionIdx: index('program_campaigns_l2i_subscription_idx').on(table.l2iSubscriptionId),
  })
);
