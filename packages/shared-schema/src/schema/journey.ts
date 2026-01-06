import { pgTable, uuid, varchar, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Journey flags table
 * Stores computed journey readiness flags for participants
 */
export const journeyFlags = pgTable('journey_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  flag: varchar('flag', { length: 100 }).notNull(), // mentor_ready, followup_needed, etc.
  value: boolean('value').notNull(), // true/false
  setByRule: varchar('set_by_rule', { length: 100 }), // Rule ID that set this flag
  setAt: timestamp('set_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // Optional expiration
});

/**
 * Journey rules table
 * Stores rule definitions for journey orchestration
 */
export const journeyRules = pgTable('journey_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: varchar('rule_id', { length: 100 }).unique().notNull(), // Business ID (e.g., mentor_ready_001)
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  ruleConfig: jsonb('rule_config').notNull(), // Full rule definition (conditions, actions, etc.)
  active: boolean('active').notNull().default(true),
  priority: integer('priority').notNull().default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Journey milestones table
 * Tracks when participants reach significant milestones
 */
export const journeyMilestones = pgTable('journey_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  milestone: varchar('milestone', { length: 100 }).notNull(), // mentor_ready, first_match, etc.
  reachedAt: timestamp('reached_at', { withTimezone: true }).defaultNow().notNull(),
  triggeredByRule: varchar('triggered_by_rule', { length: 100 }), // Rule ID that triggered this
  metadata: jsonb('metadata'), // Additional context about the milestone
});
