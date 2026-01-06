/**
 * L2I Program Allocations Schema
 * Drizzle ORM schema for l2i_program_allocations table
 * Links L2I subscriptions to specific programs and campaigns
 *
 * Agent: monetization-metadata-modeler (Agent 12)
 */

import { pgTable, uuid, timestamp, jsonb, integer, decimal, index } from 'drizzle-orm/pg-core';
import { companies } from './users.js';
import { l2iSubscriptions } from './billing.js';
import { programs } from './programs.js';
import { programCampaigns } from './program-campaigns.js';

/**
 * L2I Program Allocations
 * Tracks budget allocation and impact metrics per program/campaign
 */
export const l2iProgramAllocations = pgTable(
  'l2i_program_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    l2iSubscriptionId: uuid('l2i_subscription_id')
      .notNull()
      .references(() => l2iSubscriptions.id, { onDelete: 'cascade' }),
    programId: uuid('program_id').references(() => programs.id),
    campaignId: uuid('campaign_id').references(() => programCampaigns.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Allocation
    allocationPercentage: decimal('allocation_percentage', { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000
    allocationAmountUsd: integer('allocation_amount_usd').notNull(), // cents

    // Impact Metrics (updated periodically)
    learnersServed: integer('learners_served').default(0).notNull(),
    averageSroi: decimal('average_sroi', { precision: 10, scale: 2 }),
    averageVis: decimal('average_vis', { precision: 10, scale: 2 }),
    engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),

    // Evidence Lineage (sample evidence IDs showing impact)
    evidenceSnippets: jsonb('evidence_snippets').$type<
      Array<{
        evidenceId: string;
        learnerName: string; // anonymized
        outcome: string;
        sroi: number;
      }>
    >(),

    // Period Tracking
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Last Updated
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    l2iSubscriptionIdx: index('l2i_prog_alloc_subscription_idx').on(table.l2iSubscriptionId),
    programIdx: index('l2i_prog_alloc_program_idx').on(table.programId),
    campaignIdx: index('l2i_prog_alloc_campaign_idx').on(table.campaignId),
    companyIdx: index('l2i_prog_alloc_company_idx').on(table.companyId),
    periodIdx: index('l2i_prog_alloc_period_idx').on(table.periodStart, table.periodEnd),
  })
);
