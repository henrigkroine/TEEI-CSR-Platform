import { pgTable, uuid, date, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

export const metricsCompanyPeriod = pgTable('metrics_company_period', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  participantsCount: integer('participants_count'),
  volunteersCount: integer('volunteers_count'),
  sessionsCount: integer('sessions_count'),
  avgIntegrationScore: decimal('avg_integration_score', { precision: 4, scale: 3 }),
  avgLanguageLevel: decimal('avg_language_level', { precision: 4, scale: 3 }),
  avgJobReadiness: decimal('avg_job_readiness', { precision: 4, scale: 3 }),
  sroiRatio: decimal('sroi_ratio', { precision: 6, scale: 2 }), // e.g., 5.23 = 5.23:1
  visScore: decimal('vis_score', { precision: 6, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
