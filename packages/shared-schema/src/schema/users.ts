import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, text, index, decimal } from 'drizzle-orm/pg-core';

// Enums
export const privacyRequestTypeEnum = pgEnum('privacy_request_type', ['export', 'delete']);
export const privacyRequestStatusEnum = pgEnum('privacy_request_status', ['pending', 'processing', 'completed', 'failed']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 50 }).notNull(), // admin, company_user, participant, volunteer
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  country: varchar('country', { length: 100 }),
  features: jsonb('features'), // Feature flags: { impactIn: { benevity: true, goodera: false, workday: true } }
  aiBudgetMonthly: decimal('ai_budget_monthly', { precision: 10, scale: 2 }).default('1000.00'),
  aiSpendCurrentMonth: decimal('ai_spend_current_month', { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const companyUsers = pgTable('company_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const programEnrollments = pgTable('program_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  programType: varchar('program_type', { length: 50 }).notNull(), // buddy, language, mentorship, upskilling
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// External ID mapping for surrogate keys
export const externalIdMappings = pgTable('external_id_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  externalSystem: varchar('external_system', { length: 50 }).notNull(), // kintell, discord, buddy, etc.
  externalId: varchar('external_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Privacy requests table
export const privacyRequests = pgTable('privacy_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  requestType: privacyRequestTypeEnum('request_type').notNull(),
  status: privacyRequestStatusEnum('status').notNull().default('pending'),
  progress: integer('progress').notNull().default(0), // 0-100
  resultPath: varchar('result_path', { length: 500 }), // Path to export ZIP or delete summary
  errorMessage: text('error_message'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('privacy_requests_user_id_idx').on(table.userId),
  statusIdx: index('privacy_requests_status_idx').on(table.status),
}));

// Privacy audit log table
export const privacyAuditLog = pgTable('privacy_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id').notNull().references(() => privacyRequests.id),
  action: varchar('action', { length: 100 }).notNull(), // 'data_exported', 'user_deleted', 'anonymized'
  details: jsonb('details'),
  performedBy: uuid('performed_by').references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  requestIdIdx: index('privacy_audit_log_request_id_idx').on(table.requestId),
}));
