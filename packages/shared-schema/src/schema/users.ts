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
  journeyFlags: jsonb('journey_flags').default({}), // Journey tracking flags: { is_buddy_participant, buddy_match_count, etc. }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  journeyFlagsIdx: index('idx_users_journey_flags').on(table.journeyFlags),
}));

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

  // NEW: Program Context (Agent 11: enrollment-schema-enhancer)
  programId: uuid('program_id'), // Will add FK after programs table exists
  campaignId: uuid('campaign_id'), // Will add FK after program_campaigns table exists
  beneficiaryGroupId: uuid('beneficiary_group_id'), // Will add FK after beneficiary_groups table exists

  // LEGACY: Backward Compatibility (denormalized from program.programType)
  programType: varchar('program_type', { length: 50 }).notNull(), // buddy, language, mentorship, upskilling

  // Lifecycle
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, completed, dropped
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Source Tracking
  sourceSystem: varchar('source_system', { length: 50 }), // kintell, buddy, upskilling, manual
  sourceId: varchar('source_id', { length: 255 }), // External ID in source system

  // Metadata
  enrollmentMetadata: jsonb('enrollment_metadata').default('{}'),
}, (table) => ({
  // Add indexes for new columns
  programIdIdx: index('program_enrollments_program_id_idx').on(table.programId),
  campaignIdIdx: index('program_enrollments_campaign_id_idx').on(table.campaignId),
  beneficiaryGroupIdIdx: index('program_enrollments_beneficiary_group_id_idx').on(table.beneficiaryGroupId),
}));

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

// User External IDs table - Maps CSR users to external system identities
export const userExternalIds = pgTable('user_external_ids', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // buddy, discord, kintell, upskilling
  externalId: varchar('external_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}), // Provider-specific metadata
}, (table) => ({
  profileIdIdx: index('idx_user_external_ids_profile').on(table.profileId),
  providerExternalIdx: index('idx_user_external_ids_provider_external').on(table.provider, table.externalId),
  providerIdx: index('idx_user_external_ids_provider').on(table.provider),
}));

// Identity linking audit log
export const identityLinkingAudit = pgTable('identity_linking_audit', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => users.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(), // created, updated, deleted
  performedBy: varchar('performed_by', { length: 100 }), // Service or user identifier
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  profileIdIdx: index('idx_identity_linking_audit_profile').on(table.profileId),
  providerIdx: index('idx_identity_linking_audit_provider').on(table.provider, table.externalId),
  performedAtIdx: index('idx_identity_linking_audit_performed_at').on(table.performedAt),
}));
