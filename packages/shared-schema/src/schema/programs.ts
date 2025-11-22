/**
 * Programs Schema
 * Drizzle ORM schema for programs table
 *
 * Agent: program-instance-modeler (Agent 8)
 */

import { pgTable, uuid, varchar, timestamp, jsonb, integer, decimal, text, date, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { programTemplates } from './program-templates.js';
import { beneficiaryGroups } from './beneficiary-groups.js';

/**
 * Programs
 * Global instances of program templates, targeted at specific beneficiary groups
 */
export const programs = pgTable(
  'programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programKey: varchar('program_key', { length: 100 }).unique().notNull(),
    templateId: uuid('template_id').notNull().references(() => programTemplates.id),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    programType: varchar('program_type', { length: 50 }).notNull(), // Denormalized from template.category

    // Configuration (Template + Overrides)
    config: jsonb('config').notNull(),
    configOverrides: jsonb('config_overrides'),

    // Target Audience
    beneficiaryGroupId: uuid('beneficiary_group_id').references(() => beneficiaryGroups.id),

    // Lifecycle
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, active, paused, completed, archived
    startDate: date('start_date'),
    endDate: date('end_date'),

    // Ownership
    ownerId: uuid('owner_id').references(() => users.id),
    visibility: varchar('visibility', { length: 20 }).default('public').notNull(), // public, private, restricted

    // Metrics (Cached Aggregates)
    enrollmentCount: integer('enrollment_count').default(0).notNull(),
    activeEnrollmentCount: integer('active_enrollment_count').default(0).notNull(),
    completionCount: integer('completion_count').default(0).notNull(),
    averageCompletionRate: decimal('average_completion_rate', { precision: 5, scale: 4 }),

    // Metadata
    tags: text('tags').array(),
    sdgGoals: integer('sdg_goals').array(),
    externalId: varchar('external_id', { length: 255 }), // For third-party integrations

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    templateIdx: index('programs_template_idx').on(table.templateId),
    statusIdx: index('programs_status_idx').on(table.status),
    beneficiaryGroupIdx: index('programs_beneficiary_group_idx').on(table.beneficiaryGroupId),
    programTypeIdx: index('programs_program_type_idx').on(table.programType),
    externalIdIdx: index('programs_external_id_idx').on(table.externalId),
  })
);
