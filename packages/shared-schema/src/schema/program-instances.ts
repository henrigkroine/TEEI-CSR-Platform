/**
 * Program Instances Schema
 *
 * ProgramInstances represent the runtime execution of campaigns, inheriting
 * configuration from templates and consuming campaign capacity.
 *
 * Key Concepts:
 * - Template → Campaign → Instance (inheritance chain)
 * - Instance config = template.defaultConfig + campaign.configOverrides
 * - Instances consume capacity from parent campaign quotas
 * - Activity tracking (sessions, hours) happens at instance level
 * - Impact metrics (SROI, VIS) are aggregated from instances → campaign
 *
 * Privacy: No individual PII stored; only aggregate counts and metrics
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  decimal,
  index,
  date
} from 'drizzle-orm/pg-core';
import { companies } from './users.js';
import { campaigns } from './campaigns.js';
import { programTemplates, type ProgramTemplateConfig } from './program-templates.js';
import { beneficiaryGroups } from './beneficiary-groups.js';

/**
 * Program Instance Status
 * Lifecycle: planned → active → paused → completed
 */
export const programInstanceStatusEnum = pgEnum('program_instance_status', [
  'planned',    // Created but not yet started
  'active',     // Currently running
  'paused',     // Temporarily suspended
  'completed'   // Finished successfully
]);

/**
 * Program Instances Table
 *
 * Represents runtime execution of campaigns with inherited configuration,
 * participant tracking, and impact metrics calculation.
 *
 * Design Decisions:
 * 1. Denormalization: Duplicates companyId, templateId, groupId from campaign
 *    for query performance (avoid joins in analytics queries)
 *
 * 2. Immutability: Once created, template/campaign links are frozen
 *    (use versioning for changes)
 *
 * 3. Config Merging: config field contains merged result of:
 *    template.defaultConfig + campaign.configOverrides
 *    Stored as JSONB for flexibility across program types
 *
 * 4. Capacity Tracking: volunteersConsumed, creditsConsumed, learnersServed
 *    count toward parent campaign quotas
 *
 * 5. No Individual PII: All tracking at aggregate level (counts, not names)
 */
export const programInstances = pgTable('program_instances', {
  // ===== Identity =====
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Mentors for Syrian Refugees - Cohort 1"

  // ===== Relationships =====
  // Primary relationship
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),

  // Denormalized relationships (from campaign) for query performance
  programTemplateId: uuid('program_template_id').notNull().references(() => programTemplates.id, { onDelete: 'restrict' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  beneficiaryGroupId: uuid('beneficiary_group_id').notNull().references(() => beneficiaryGroups.id, { onDelete: 'restrict' }),

  // ===== Execution Period =====
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),

  // ===== Status =====
  status: programInstanceStatusEnum('status').notNull().default('planned'),

  // ===== Configuration =====
  /**
   * Merged configuration from template defaults + campaign overrides
   *
   * Structure varies by program type:
   *
   * Mentorship:
   * {
   *   sessionFormat: '1-on-1' | 'group' | 'hybrid',
   *   sessionDuration: 60, // minutes
   *   sessionFrequency: 'weekly' | 'bi-weekly' | 'monthly',
   *   totalDuration: 24, // weeks
   *   matchingCriteria: ['skills', 'industry', 'language']
   * }
   *
   * Language:
   * {
   *   classSizeMin: 3,
   *   classSizeMax: 12,
   *   proficiencyLevels: ['A1', 'A2', 'B1'],
   *   targetLanguages: ['en', 'no'],
   *   sessionDuration: 90
   * }
   *
   * Buddy:
   * {
   *   matchMethod: 'skill_based' | 'random' | 'interest_based',
   *   pairDuration: 12, // weeks
   *   checkInFrequency: 'weekly'
   * }
   *
   * Upskilling:
   * {
   *   coursePlatforms: ['linkedin_learning', 'coursera'],
   *   certificationRequired: true,
   *   skillTracks: ['data_analytics', 'cloud']
   * }
   */
  config: jsonb('config').notNull().default('{}').$type<ProgramTemplateConfig>(),

  // ===== Participant Counts (Aggregate only, no PII) =====
  enrolledVolunteers: integer('enrolled_volunteers').notNull().default(0),
  enrolledBeneficiaries: integer('enrolled_beneficiaries').notNull().default(0),

  // Program-specific participant tracking
  activePairs: integer('active_pairs'), // For buddy/mentorship programs
  activeGroups: integer('active_groups'), // For language/group programs

  // ===== Activity Tracking =====
  totalSessionsHeld: integer('total_sessions_held').notNull().default(0),
  totalHoursLogged: decimal('total_hours_logged', { precision: 10, scale: 2 }).notNull().default('0.00'),

  // ===== Impact Metrics (Instance-specific) =====
  sroiScore: decimal('sroi_score', { precision: 10, scale: 2 }), // Social Return on Investment
  averageVISScore: decimal('average_vis_score', { precision: 10, scale: 2 }), // Volunteer Impact Score

  /**
   * Outcome scores by dimension (JSONB for flexibility)
   * Example:
   * {
   *   integration: 0.65,
   *   language: 0.78,
   *   job_readiness: 0.82,
   *   social_connection: 0.71
   * }
   */
  outcomeScores: jsonb('outcome_scores').default('{}').$type<Record<string, number>>(),

  // ===== Capacity Consumption (for Campaign Quota Tracking) =====
  /**
   * Counts toward campaign.committedSeats
   * Tracked separately because volunteers may join/leave over time
   */
  volunteersConsumed: integer('volunteers_consumed').notNull().default(0),

  /**
   * Counts toward campaign.creditAllocation (for credit-based pricing)
   * Credits are consumed based on activity (e.g., per session, per hour)
   */
  creditsConsumed: decimal('credits_consumed', { precision: 10, scale: 2 }),

  /**
   * Counts toward IAAS (Impact-as-a-Service) commitments
   * Tracks unique beneficiaries served for outcome-based pricing
   */
  learnersServed: integer('learners_served').notNull().default(0),

  // ===== Timestamps =====
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }), // Last session/event timestamp

}, (table) => ({
  // ===== Indexes for Query Performance =====

  // Primary query patterns: fetch all instances for a campaign
  campaignIdIdx: index('program_instances_campaign_id_idx').on(table.campaignId),

  // Query pattern: fetch all instances for a company (denormalized for performance)
  companyIdIdx: index('program_instances_company_id_idx').on(table.companyId),

  // Query pattern: filter instances by status (e.g., show only active)
  statusIdx: index('program_instances_status_idx').on(table.status),

  // Query pattern: find instances by date range (for reporting)
  dateRangeIdx: index('program_instances_date_range_idx').on(table.startDate, table.endDate),

  // Query pattern: aggregate metrics by template type
  templateIdIdx: index('program_instances_template_id_idx').on(table.programTemplateId),

  // Query pattern: analyze impact by beneficiary group
  beneficiaryGroupIdIdx: index('program_instances_beneficiary_group_id_idx').on(table.beneficiaryGroupId),

  // Composite index: most common query (company + status + date)
  companyStatusDateIdx: index('program_instances_company_status_date_idx')
    .on(table.companyId, table.status, table.startDate),

  // Composite index: campaign metrics aggregation (campaign + status)
  campaignStatusIdx: index('program_instances_campaign_status_idx')
    .on(table.campaignId, table.status),
}));

/**
 * Type exports for TypeScript
 */
export type ProgramInstance = typeof programInstances.$inferSelect;
export type NewProgramInstance = typeof programInstances.$inferInsert;

/**
 * Note: Config types (MentorshipConfig, LanguageConfig, etc.) are imported from program-templates.ts
 * to avoid duplication and maintain single source of truth.
 */
export type { ProgramTemplateConfig as ProgramInstanceConfig } from './program-templates.js';
