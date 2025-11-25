import { pgTable, uuid, varchar, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Program Instances - Specific runs of programs (e.g., "Mentors for Ukraine Q4 2024")
 *
 * Enables distinguishing between:
 * - Different program types (mentors_ukraine, language_ukraine, buddy, upskilling)
 * - Different time periods (Q4 2024 vs Q1 2025)
 * - Different companies (Company A vs Company B running same program)
 *
 * Used for:
 * - Session filtering (show me Language sessions from Q4 2024)
 * - SROI/VIS calculations per program instance
 * - Reporting and analytics
 */
export const programInstances = pgTable(
  'program_instances',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Program identification
    programType: varchar('program_type', { length: 50 }).notNull(), // mentors_ukraine, language_ukraine, buddy, upskilling
    programName: varchar('program_name', { length: 255 }).notNull(), // "Mentors for Ukraine - Q4 2024"
    programSlug: varchar('program_slug', { length: 255 }).notNull(), // mentors-ukraine-2024-q4 (for URLs)

    // Ownership
    companyId: uuid('company_id').references(() => companies.id), // NULL for TEEI-run programs

    // Time boundaries
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // NULL for ongoing programs

    // External system linkage
    externalSystemId: varchar('external_system_id', { length: 255 }), // Kintell project ID, Buddy program ID, etc.
    externalSystem: varchar('external_system', { length: 50 }), // 'kintell', 'buddy', 'upskilling'

    // Program metadata
    description: varchar('description', { length: 1000 }),
    targetParticipants: varchar('target_participants', { length: 500 }), // e.g., "Ukrainian refugees in Norway"
    programGoals: jsonb('program_goals').$type<string[]>(), // ["Language proficiency", "Job readiness"]

    // Configuration
    metadata: jsonb('metadata').$type<{
      cohortSize?: number;
      matchingCriteria?: string[];
      programUrl?: string;
      coordinatorEmail?: string;
      [key: string]: any;
    }>(),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, paused, cancelled

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Primary indexes
    programTypeIdx: index('program_instances_program_type_idx').on(table.programType),
    companyIdIdx: index('program_instances_company_id_idx').on(table.companyId),
    programSlugIdx: index('program_instances_program_slug_idx').on(table.programSlug),
    statusIdx: index('program_instances_status_idx').on(table.status),

    // Composite indexes for common queries
    companyProgramIdx: index('program_instances_company_program_idx').on(table.companyId, table.programType),
    startDateIdx: index('program_instances_start_date_idx').on(table.startDate),

    // External system lookups
    externalSystemIdx: index('program_instances_external_system_idx').on(table.externalSystem, table.externalSystemId),
  })
);
