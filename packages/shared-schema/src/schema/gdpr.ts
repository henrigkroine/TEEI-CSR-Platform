import { pgTable, uuid, varchar, timestamp, text, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * GDPR Compliance Schema
 *
 * Implements:
 * - Consent management (GDPR Article 7)
 * - Right to erasure (GDPR Article 17)
 * - Right to data portability (GDPR Article 20)
 * - Processing records (GDPR Article 30)
 */

/**
 * User Consent Records
 *
 * Tracks granular consent for different processing purposes
 * Supports consent withdrawal and audit trail
 */
export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Consent details
    purpose: varchar('purpose', { length: 100 }).notNull(), // 'marketing', 'analytics', 'buddy_program', 'data_sharing'
    consentGiven: boolean('consent_given').notNull(),
    consentText: text('consent_text').notNull(), // What the user agreed to
    consentVersion: varchar('consent_version', { length: 50 }).notNull(), // Version of consent text

    // Consent metadata
    consentDate: timestamp('consent_date', { withTimezone: true }).notNull(),
    consentMethod: varchar('consent_method', { length: 50 }).notNull(), // 'explicit_opt_in', 'implicit', 'checkbox'
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    // Withdrawal
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    withdrawalReason: text('withdrawal_reason'),

    // Expiry
    expiresAt: timestamp('expires_at', { withTimezone: true }), // Some consents may expire

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_consents_user_id_idx').on(table.userId),
    purposeIdx: index('user_consents_purpose_idx').on(table.purpose),
    userPurposeIdx: index('user_consents_user_purpose_idx').on(table.userId, table.purpose),
    consentGivenIdx: index('user_consents_consent_given_idx').on(table.consentGiven),
  })
);

/**
 * Data Subject Access Requests (DSAR)
 *
 * Tracks GDPR data access and deletion requests
 */
export const dataSubjectRequests = pgTable(
  'data_subject_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Request details
    requestType: varchar('request_type', { length: 50 }).notNull(), // 'access', 'erasure', 'portability', 'rectification'
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'rejected'

    // Request metadata
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    requestedBy: uuid('requested_by').notNull(), // Could be user themselves or admin
    requestReason: text('request_reason'),
    ipAddress: varchar('ip_address', { length: 45 }),

    // Processing
    assignedTo: uuid('assigned_to'), // Admin handling the request
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Response
    responseData: jsonb('response_data'), // For access requests: the exported data
    responseFileUrl: text('response_file_url'), // URL to download data export
    rejectionReason: text('rejection_reason'),

    // For erasure requests
    deletionScheduledFor: timestamp('deletion_scheduled_for', { withTimezone: true }),
    deletionCompletedAt: timestamp('deletion_completed_at', { withTimezone: true }),
    systemsDeleted: jsonb('systems_deleted').$type<string[]>(), // ['buddy_system', 'csr_platform']
    verificationHash: varchar('verification_hash', { length: 64 }), // Hash of deleted data

    // Audit
    notes: text('notes'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('dsar_user_id_idx').on(table.userId),
    statusIdx: index('dsar_status_idx').on(table.status),
    requestTypeIdx: index('dsar_request_type_idx').on(table.requestType),
    requestedAtIdx: index('dsar_requested_at_idx').on(table.requestedAt),
  })
);

/**
 * Data Processing Records
 *
 * GDPR Article 30 - Record of processing activities
 * Tracks all processing of personal data
 */
export const dataProcessingRecords = pgTable(
  'data_processing_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Processing activity
    activity: varchar('activity', { length: 100 }).notNull(), // 'user_registration', 'buddy_matching', 'event_attendance'
    purpose: varchar('purpose', { length: 100 }).notNull(), // 'service_delivery', 'analytics', 'marketing'
    legalBasis: varchar('legal_basis', { length: 50 }).notNull(), // 'consent', 'contract', 'legitimate_interest'

    // Data categories
    dataCategories: jsonb('data_categories').notNull().$type<string[]>(), // ['contact_info', 'profile_data', 'usage_data']
    recipientCategories: jsonb('recipient_categories').$type<string[]>(), // ['internal_staff', 'service_providers']

    // Processing metadata
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
    processedBy: uuid('processed_by'), // System or user that processed the data
    systemComponent: varchar('system_component', { length: 100 }), // 'buddy_service', 'reporting_api'

    // Retention
    retentionPeriod: varchar('retention_period', { length: 100 }), // '2 years', 'until_consent_withdrawn'
    scheduledDeletionDate: timestamp('scheduled_deletion_date', { withTimezone: true }),

    // Additional context
    metadata: jsonb('metadata'), // Additional processing details
  },
  (table) => ({
    userIdIdx: index('dpr_user_id_idx').on(table.userId),
    activityIdx: index('dpr_activity_idx').on(table.activity),
    processedAtIdx: index('dpr_processed_at_idx').on(table.processedAt),
  })
);

/**
 * Data Breach Incidents
 *
 * GDPR Article 33 - Notification of personal data breach
 */
export const dataBreachIncidents = pgTable(
  'data_breach_incidents',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Incident details
    incidentType: varchar('incident_type', { length: 100 }).notNull(), // 'unauthorized_access', 'data_loss', 'system_compromise'
    severity: varchar('severity', { length: 50 }).notNull(), // 'low', 'medium', 'high', 'critical'
    status: varchar('status', { length: 50 }).notNull().default('investigating'), // 'investigating', 'contained', 'resolved'

    // Discovery
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull(),
    discoveredBy: uuid('discovered_by').notNull(),
    reportedToAuthorityAt: timestamp('reported_to_authority_at', { withTimezone: true }),

    // Impact
    affectedUserCount: varchar('affected_user_count', { length: 20 }),
    affectedDataCategories: jsonb('affected_data_categories').$type<string[]>(),
    riskToRights: text('risk_to_rights'), // Assessment of risk to data subjects

    // Response
    containmentMeasures: text('containment_measures'),
    notificationPlan: text('notification_plan'),
    usersNotifiedAt: timestamp('users_notified_at', { withTimezone: true }),

    // Resolution
    rootCause: text('root_cause'),
    remedialActions: text('remedial_actions'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    // Audit
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('breach_status_idx').on(table.status),
    severityIdx: index('breach_severity_idx').on(table.severity),
    discoveredAtIdx: index('breach_discovered_at_idx').on(table.discoveredAt),
  })
);

/**
 * Consent Text Versions
 *
 * Stores historical versions of consent text
 * Ensures we can prove what users agreed to at any point
 */
export const consentTextVersions = pgTable(
  'consent_text_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Version info
    purpose: varchar('purpose', { length: 100 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    language: varchar('language', { length: 10 }).notNull().default('en'), // 'en', 'uk', 'no'

    // Content
    title: text('title').notNull(),
    body: text('body').notNull(),
    summary: text('summary'), // Short summary for UI

    // Validity
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),

    // Metadata
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    purposeVersionIdx: index('consent_versions_purpose_version_idx').on(table.purpose, table.version),
    effectiveFromIdx: index('consent_versions_effective_from_idx').on(table.effectiveFrom),
  })
);

/**
 * Data Retention Policies
 *
 * Defines retention rules for different data types
 */
export const dataRetentionPolicies = pgTable(
  'data_retention_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Policy details
    dataCategory: varchar('data_category', { length: 100 }).notNull().unique(), // 'user_profiles', 'buddy_matches', 'events'
    retentionPeriodDays: varchar('retention_period_days', { length: 20 }).notNull(), // Number of days or 'indefinite'
    legalBasis: text('legal_basis').notNull(), // Why we retain this data

    // Deletion behavior
    deletionMethod: varchar('deletion_method', { length: 50 }).notNull(), // 'hard_delete', 'anonymize', 'archive'
    dependentCategories: jsonb('dependent_categories').$type<string[]>(), // Categories that must be deleted together

    // Policy metadata
    active: boolean('active').notNull().default(true),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dataCategoryIdx: index('retention_data_category_idx').on(table.dataCategory),
    activeIdx: index('retention_active_idx').on(table.active),
  })
);

export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = typeof userConsents.$inferInsert;
export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect;
export type InsertDataSubjectRequest = typeof dataSubjectRequests.$inferInsert;
export type DataProcessingRecord = typeof dataProcessingRecords.$inferSelect;
export type InsertDataProcessingRecord = typeof dataProcessingRecords.$inferInsert;
export type DataBreachIncident = typeof dataBreachIncidents.$inferSelect;
export type InsertDataBreachIncident = typeof dataBreachIncidents.$inferInsert;
export type ConsentTextVersion = typeof consentTextVersions.$inferSelect;
export type InsertConsentTextVersion = typeof consentTextVersions.$inferInsert;
export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = typeof dataRetentionPolicies.$inferInsert;
