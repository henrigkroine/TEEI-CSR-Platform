import { pgTable, uuid, varchar, timestamp, decimal, jsonb, date, index } from 'drizzle-orm/pg-core';

/**
 * Stores calculated SROI (Social Return on Investment) metrics
 * for different program types over specific time periods
 */
export const sroiCalculations = pgTable(
  'sroi_calculations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programType: varchar('program_type', { length: 50 }).notNull(), // 'buddy', 'upskilling', etc.
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    companyId: uuid('company_id'), // NULL for global calculations
    totalSocialValue: decimal('total_social_value', { precision: 10, scale: 2 }).notNull(),
    totalInvestment: decimal('total_investment', { precision: 10, scale: 2 }).notNull(),
    sroiRatio: decimal('sroi_ratio', { precision: 10, scale: 4 }).notNull(),
    activityBreakdown: jsonb('activity_breakdown').notNull(), // Detailed activity counts and values
    confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // 0.00 - 1.00
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    programPeriodIdx: index('sroi_program_period_idx').on(table.programType, table.periodStart, table.periodEnd),
    companyIdx: index('sroi_company_idx').on(table.companyId),
    calculatedAtIdx: index('sroi_calculated_at_idx').on(table.calculatedAt),
  })
);

/**
 * Stores configurable valuation weights for different activity types
 * Allows company-specific overrides of global defaults
 */
export const sroiValuationWeights = pgTable(
  'sroi_valuation_weights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id'), // NULL for global defaults
    activityType: varchar('activity_type', { length: 100 }).notNull(), // 'buddy_match', 'event_attended', etc.
    valuePoints: decimal('value_points', { precision: 10, scale: 2 }).notNull(), // Point value for this activity
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'), // NULL for currently active
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyActivityIdx: index('weights_company_activity_idx').on(table.companyId, table.activityType),
    effectiveDateIdx: index('weights_effective_date_idx').on(table.effectiveFrom, table.effectiveTo),
  })
);

/**
 * Stores VIS (Value Impact Score) calculations for users
 * Tracks cumulative impact points with decay over time
 */
export const visCalculations = pgTable(
  'vis_calculations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    programType: varchar('program_type', { length: 50 }).notNull(), // 'buddy', 'upskilling', etc.
    currentScore: decimal('current_score', { precision: 10, scale: 2 }).notNull(),
    lifetimeScore: decimal('lifetime_score', { precision: 10, scale: 2 }).notNull(), // Total before decay
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    activityCounts: jsonb('activity_counts').notNull(), // Breakdown by activity type
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userProgramIdx: index('vis_user_program_idx').on(table.userId, table.programType),
    calculatedAtIdx: index('vis_calculated_at_idx').on(table.calculatedAt),
  })
);

/**
 * Tracks individual VIS contributions from specific activities
 * Used for detailed impact attribution and decay calculations
 */
export const visActivityLog = pgTable(
  'vis_activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    eventId: uuid('event_id').notNull(), // Links to buddy_system_events
    activityType: varchar('activity_type', { length: 100 }).notNull(),
    pointsAwarded: decimal('points_awarded', { precision: 10, scale: 2 }).notNull(),
    decayFactor: decimal('decay_factor', { precision: 3, scale: 2 }).notNull().default('1.00'), // Multiplier for age-based decay
    effectivePoints: decimal('effective_points', { precision: 10, scale: 2 }).notNull(), // points_awarded * decay_factor
    activityDate: timestamp('activity_date', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userActivityIdx: index('vis_log_user_activity_idx').on(table.userId, table.activityDate),
    eventIdIdx: index('vis_log_event_id_idx').on(table.eventId),
  })
);
