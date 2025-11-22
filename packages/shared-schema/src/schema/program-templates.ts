/**
 * Program Templates Schema
 * Drizzle ORM schema for program_templates table
 *
 * Agent: template-schema-engineer (Agent 7)
 */

import { pgTable, uuid, varchar, timestamp, jsonb, integer, text, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { companies } from './users.js';

/**
 * Program Templates
 * Reusable blueprints for creating programs
 */
export const programTemplates = pgTable(
  'program_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateKey: varchar('template_key', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(), // mentorship, language, buddy, upskilling

    // Configuration Definition
    configSchema: jsonb('config_schema').notNull(), // Zod schema as JSON
    defaultConfig: jsonb('default_config').notNull(), // Default configuration values
    uiSchema: jsonb('ui_schema'), // UI rendering hints

    // Lifecycle
    version: integer('version').default(1).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // draft, active, deprecated, archived
    deprecatedBy: uuid('deprecated_by').references((): any => programTemplates.id),

    // Metadata
    tags: text('tags').array(),
    sdgGoals: integer('sdg_goals').array(), // UN SDG 1-17
    ownerId: uuid('owner_id').references(() => users.id),
    tenantId: uuid('tenant_id').references(() => companies.id), // NULL for platform templates

    // Impact Configuration
    defaultSroiWeights: jsonb('default_sroi_weights'),
    defaultVisMultipliers: jsonb('default_vis_multipliers'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    categoryIdx: index('program_templates_category_idx').on(table.category),
    statusIdx: index('program_templates_status_idx').on(table.status),
    tenantIdx: index('program_templates_tenant_idx').on(table.tenantId),
    versionIdx: index('program_templates_version_idx').on(table.version),
  })
);
