/**
 * Beneficiary Groups Schema
 * Drizzle ORM schema for beneficiary_groups table
 *
 * Agent: beneficiary-group-modeler (Agent 9)
 */

import { pgTable, uuid, varchar, timestamp, jsonb, text, date, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Beneficiary Groups
 * Target demographics for programs (e.g., Ukrainian refugees, Syrian refugees)
 */
export const beneficiaryGroups = pgTable(
  'beneficiary_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupKey: varchar('group_key', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Demographics
    demographics: jsonb('demographics'), // { region, languages, age_range, etc. }

    // Location
    primaryRegion: varchar('primary_region', { length: 100 }), // EU, US, UK, NO, GLOBAL
    countries: text('countries').array(), // ISO country codes
    cities: text('cities').array(),

    // Constraints
    eligibilityCriteria: jsonb('eligibility_criteria'), // { min_age, max_age, languages, etc. }

    // Status
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive, archived
    activeFrom: date('active_from'),
    activeUntil: date('active_until'),

    // Metadata
    tags: text('tags').array(),
    externalId: varchar('external_id', { length: 255 }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    statusIdx: index('beneficiary_groups_status_idx').on(table.status),
    regionIdx: index('beneficiary_groups_region_idx').on(table.primaryRegion),
    groupKeyIdx: index('beneficiary_groups_group_key_idx').on(table.groupKey),
  })
);
