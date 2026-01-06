/**
 * Scenario Planner Database Schema
 *
 * Stores scenario definitions and execution results
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Scenarios table
 * Stores scenario definitions with parameters
 */
export const scenarios = pgTable(
  'scenarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenancy
    tenantId: varchar('tenant_id', { length: 100 }).notNull(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),

    // Scenario metadata
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),

    // Scenario parameters (JSON)
    parameters: jsonb('parameters').notNull().$type<{
      volunteerHoursDelta?: number;
      grantAmountDelta?: number;
      cohortSizeMultiplier?: number;
      cohortDurationMonths?: number;
      programMix?: {
        buddySystem?: number;
        skillShare?: number;
        mentorship?: number;
        communityEvents?: number;
      };
      activityRates?: {
        matchesPerMonth?: number;
        eventsPerMonth?: number;
        skillSharesPerMonth?: number;
        feedbackPerMonth?: number;
        milestonesPerMonth?: number;
        checkinsPerMonth?: number;
      };
      investmentMultiplier?: number;
    }>(),

    // Latest execution result (denormalized for quick access)
    latestResult: jsonb('latest_result').$type<{
      scenarioId: string;
      baseline: any;
      projected: any;
      parameters: any;
      calculatedAt: string;
      calculationDurationMs: number;
      confidence: number;
      warnings?: string[];
    } | null>(),

    // User tracking
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    updatedBy: varchar('updated_by', { length: 100 }).notNull(),
    isFavorite: boolean('is_favorite').default(false).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Indexes for efficient queries
    companyIdx: index('scenarios_company_idx').on(table.companyId),
    tenantIdx: index('scenarios_tenant_idx').on(table.tenantId),
    createdAtIdx: index('scenarios_created_at_idx').on(table.createdAt),
    favoriteIdx: index('scenarios_favorite_idx').on(table.companyId, table.isFavorite),
  })
);

/**
 * Scenario Executions table
 * Stores historical execution results for auditing
 */
export const scenarioExecutions = pgTable(
  'scenario_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Reference to scenario
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => scenarios.id, { onDelete: 'cascade' }),

    // Execution result (full JSON)
    result: jsonb('result').notNull().$type<{
      scenarioId: string;
      baseline: {
        sroi: number;
        vis: number;
        socialValue: number;
        investment: number;
        sdgCoverage: { goalId: number; coverage: number }[];
        activityCounts: any;
        programAllocations: any;
        period: { start: string; end: string };
      };
      projected: {
        sroi: number;
        sroiDelta: number;
        sroiPercentChange: number;
        vis: number;
        visDelta: number;
        visPercentChange: number;
        socialValue: number;
        socialValueDelta: number;
        socialValuePercentChange: number;
        investment: number;
        investmentDelta: number;
        investmentPercentChange: number;
        sdgCoverage: { goalId: number; coverage: number; delta: number }[];
        activityCounts: any;
      };
      parameters: any;
      calculatedAt: string;
      calculationDurationMs: number;
      confidence: number;
      warnings?: string[];
    }>(),

    // Execution metadata
    executedBy: varchar('executed_by', { length: 100 }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scenarioIdx: index('scenario_executions_scenario_idx').on(table.scenarioId),
    executedAtIdx: index('scenario_executions_executed_at_idx').on(table.executedAt),
  })
);
