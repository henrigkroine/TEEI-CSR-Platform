import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

export const queryBudgets = pgTable('query_budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  budgetType: varchar('budget_type', { length: 20 }).notNull(), // 'daily' | 'monthly'
  queryLimit: integer('query_limit').notNull(), // max queries allowed
  queriesUsed: integer('queries_used').notNull().default(0),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
