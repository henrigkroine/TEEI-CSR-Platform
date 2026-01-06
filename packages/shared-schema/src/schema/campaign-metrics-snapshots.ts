/**
 * Campaign Metrics Snapshots Schema
 * Time-series tracking for campaign performance over time
 *
 * Purpose: Enable historical analysis, trend visualization, and capacity planning
 * Frequency: Daily snapshots (configurable to hourly/weekly based on campaign activity)
 * Retention: See docs/METRICS_RETENTION_POLICY.md
 */

import {
  pgTable,
  uuid,
  timestamp,
  integer,
  decimal,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns.js';

/**
 * Campaign Metrics Snapshots Table
 *
 * Stores point-in-time metrics for campaigns to enable:
 * - Time-series charts (SROI/VIS trends over campaign lifecycle)
 * - Capacity utilization tracking (volunteers, beneficiaries, sessions)
 * - Budget burn-rate analysis
 * - Historical comparison for upsell opportunities
 * - Grafana dashboard queries
 *
 * Snapshot Frequency:
 * - Active campaigns: Daily at 00:00 UTC
 * - High-activity campaigns (>100 sessions/week): Hourly
 * - Completed campaigns: Final snapshot on completion, then archived
 *
 * Indexes optimized for:
 * - Time-range queries: WHERE snapshotDate BETWEEN x AND y
 * - Campaign time-series: WHERE campaignId = x ORDER BY snapshotDate
 * - Capacity alerts: WHERE volunteers.utilization > 0.8
 */
export const campaignMetricsSnapshots = pgTable('campaign_metrics_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Foreign key to campaigns table
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),

  // Snapshot timestamp (UTC)
  snapshotDate: timestamp('snapshot_date', { withTimezone: true }).notNull(),

  // Capacity Metrics (structured for easy querying)
  // Volunteers
  volunteersTarget: integer('volunteers_target').notNull(),
  volunteersCurrent: integer('volunteers_current').notNull(),
  volunteersUtilization: decimal('volunteers_utilization', { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000+

  // Beneficiaries
  beneficiariesTarget: integer('beneficiaries_target').notNull(),
  beneficiariesCurrent: integer('beneficiaries_current').notNull(),
  beneficiariesUtilization: decimal('beneficiaries_utilization', { precision: 5, scale: 4 }).notNull(),

  // Sessions
  sessionsTarget: integer('sessions_target'),
  sessionsCurrent: integer('sessions_current').notNull(),
  sessionsUtilization: decimal('sessions_utilization', { precision: 5, scale: 4 }),

  // Financial Metrics (in campaign currency, stored as cents/smallest unit)
  budgetAllocated: decimal('budget_allocated', { precision: 12, scale: 2 }).notNull(),
  budgetSpent: decimal('budget_spent', { precision: 12, scale: 2 }).notNull(),
  budgetRemaining: decimal('budget_remaining', { precision: 12, scale: 2 }).notNull(),
  budgetUtilization: decimal('budget_utilization', { precision: 5, scale: 4 }).notNull(),

  // Impact Metrics
  sroiScore: decimal('sroi_score', { precision: 10, scale: 2 }), // null if no data yet
  averageVISScore: decimal('average_vis_score', { precision: 10, scale: 2 }),
  totalHoursLogged: decimal('total_hours_logged', { precision: 12, scale: 2 }).notNull().default('0'),
  totalSessionsCompleted: integer('total_sessions_completed').notNull().default(0),

  // Monetization Metrics (optional fields based on campaign pricing model)
  seatsUsed: integer('seats_used'), // For seat-based pricing
  seatsCommitted: integer('seats_committed'),
  creditsConsumed: decimal('credits_consumed', { precision: 12, scale: 2 }), // For credit-based pricing
  creditsAllocated: decimal('credits_allocated', { precision: 12, scale: 2 }),
  learnersServed: integer('learners_served'), // For IAAS pricing
  learnersCommitted: integer('learners_committed'),

  // Full snapshot JSONB for flexibility and future-proofing
  // Stores complete campaign state at snapshot time
  fullSnapshot: jsonb('full_snapshot').notNull().$type<{
    campaignName: string;
    status: 'draft' | 'planned' | 'recruiting' | 'active' | 'paused' | 'completed' | 'closed';
    programTemplateId: string;
    beneficiaryGroupId: string;
    companyId: string;

    // Extended metrics not in top-level columns
    programInstances?: {
      activeCount: number;
      totalCount: number;
      avgOutcomeScores?: Record<string, number>;
    };

    // Engagement metrics
    engagement?: {
      volunteerRetentionRate?: number;
      beneficiaryDropoutRate?: number;
      avgSessionsPerVolunteer?: number;
      avgSessionsPerBeneficiary?: number;
    };

    // Outcome scores by category
    outcomeScores?: {
      integration?: number;
      language?: number;
      jobReadiness?: number;
      wellbeing?: number;
    };

    // Top evidence snippets for this snapshot
    topEvidenceIds?: string[];

    // Alerts triggered at snapshot time
    alerts?: Array<{
      type: 'capacity_warning' | 'capacity_critical' | 'budget_warning' | 'performance_low';
      threshold: number;
      currentValue: number;
      message: string;
    }>;

    // Metadata for debugging/auditing
    snapshotMetadata?: {
      generatedBy: string;
      dataSource: string;
      calculationDurationMs?: number;
    };
  }>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Primary index: Campaign + Date (for time-series queries)
  campaignDateIdx: index('campaign_metrics_snapshots_campaign_date_idx').on(table.campaignId, table.snapshotDate),

  // Date-based queries (all campaigns at specific time)
  snapshotDateIdx: index('campaign_metrics_snapshots_snapshot_date_idx').on(table.snapshotDate),

  // Capacity alert queries (find campaigns near capacity)
  volunteersUtilizationIdx: index('campaign_metrics_snapshots_volunteers_util_idx').on(table.volunteersUtilization),
  beneficiariesUtilizationIdx: index('campaign_metrics_snapshots_beneficiaries_util_idx').on(table.beneficiariesUtilization),

  // Budget tracking queries
  budgetUtilizationIdx: index('campaign_metrics_snapshots_budget_util_idx').on(table.budgetUtilization),

  // Impact metric queries (find high-performing campaigns)
  sroiIdx: index('campaign_metrics_snapshots_sroi_idx').on(table.sroiScore),

  // Composite index for common dashboard query pattern
  campaignDateCreatedIdx: index('campaign_metrics_snapshots_campaign_date_created_idx')
    .on(table.campaignId, table.snapshotDate, table.createdAt),
}));

/**
 * TypeScript types derived from schema
 */
export type CampaignMetricsSnapshot = typeof campaignMetricsSnapshots.$inferSelect;
export type NewCampaignMetricsSnapshot = typeof campaignMetricsSnapshots.$inferInsert;

/**
 * Helper type for snapshot creation
 */
export interface CampaignSnapshotInput {
  campaignId: string;
  snapshotDate: Date;
  capacity: {
    volunteers: { target: number; current: number };
    beneficiaries: { target: number; current: number };
    sessions?: { target: number; current: number };
  };
  financials: {
    allocated: number;
    spent: number;
    currency: string;
  };
  impact?: {
    sroi?: number;
    vis?: number;
    hours: number;
    sessions: number;
  };
  monetization?: {
    seats?: { used: number; committed: number };
    credits?: { consumed: number; allocated: number };
    learners?: { served: number; committed: number };
  };
  fullSnapshot: CampaignMetricsSnapshot['fullSnapshot'];
}

/**
 * Helper type for time-series query results
 */
export interface CampaignTimeSeriesPoint {
  snapshotDate: Date;
  volunteersUtilization: number;
  beneficiariesUtilization: number;
  budgetUtilization: number;
  sroiScore: number | null;
  averageVISScore: number | null;
  totalHoursLogged: number;
}

/**
 * Helper type for capacity alert queries
 */
export interface CampaignCapacityAlert {
  campaignId: string;
  campaignName: string;
  snapshotDate: Date;
  volunteersUtilization: number;
  beneficiariesUtilization: number;
  budgetUtilization: number;
  status: string;
  alerts: Array<{
    type: string;
    message: string;
    threshold: number;
    currentValue: number;
  }>;
}
