import { pgTable, uuid, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { users, companies } from './users.js';

/**
 * PII (Personally Identifiable Information) Schema
 *
 * Stores encrypted sensitive personal data in a separate schema for:
 * - Enhanced security (field-level encryption)
 * - GDPR compliance (easier data export/deletion)
 * - Data sovereignty (can be geographically partitioned)
 * - Access control (separate permissions from business data)
 *
 * All sensitive fields are stored encrypted at rest using AES-256-GCM.
 * Encryption keys are derived from a master key with user/field-specific context.
 */

/**
 * Encrypted User PII
 *
 * Contains sensitive personal information that requires encryption.
 * Each field is individually encrypted to support granular access control.
 */
export const encryptedUserPii = pgTable('encrypted_user_pii', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  companyId: uuid('company_id').references(() => companies.id),

  // Encrypted fields (stored as base64-encoded ciphertext)
  // Format: {iv}:{authTag}:{ciphertext} (all base64-encoded)
  encryptedEmail: text('encrypted_email'), // Primary email
  encryptedPhone: text('encrypted_phone'), // Phone number
  encryptedAddress: text('encrypted_address'), // Full address JSON
  encryptedDateOfBirth: text('encrypted_date_of_birth'), // DOB
  encryptedNationalId: text('encrypted_national_id'), // SSN, passport, etc.
  encryptedEmergencyContact: text('encrypted_emergency_contact'), // Emergency contact JSON

  // Encryption metadata
  encryptionKeyVersion: varchar('encryption_key_version', { length: 50 }).notNull().default('v1'),
  encryptedAt: timestamp('encrypted_at', { withTimezone: true }).defaultNow().notNull(),
  lastRotated: timestamp('last_rotated', { withTimezone: true }),

  // GDPR compliance flags
  consentGiven: boolean('consent_given').notNull().default(false),
  consentDate: timestamp('consent_date', { withTimezone: true }),
  processingPurpose: varchar('processing_purpose', { length: 255 }), // Why we're processing this data

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * PII Access Log
 *
 * Records every access to encrypted PII for compliance and security monitoring.
 * Required for GDPR Article 30 (record of processing activities).
 */
export const piiAccessLog = pgTable('pii_access_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  companyId: uuid('company_id').references(() => companies.id),

  // Access details
  accessorId: uuid('accessor_id').notNull(), // Who accessed the PII
  accessorRole: varchar('accessor_role', { length: 50 }).notNull(),
  accessorIp: varchar('accessor_ip', { length: 45 }),

  // What was accessed
  accessType: varchar('access_type', { length: 50 }).notNull(), // READ, DECRYPT, EXPORT
  fieldsAccessed: text('fields_accessed').notNull(), // JSON array of field names
  accessReason: varchar('access_reason', { length: 255 }), // Business justification

  // Request context
  requestId: varchar('request_id', { length: 100 }),
  endpoint: varchar('endpoint', { length: 255 }),

  // Timestamp
  accessedAt: timestamp('accessed_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * PII Deletion Queue
 *
 * Tracks PII scheduled for deletion (e.g., GDPR right to be forgotten).
 * Supports graceful deletion across all systems with verification.
 */
export const piiDeletionQueue = pgTable('pii_deletion_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  companyId: uuid('company_id').references(() => companies.id),

  // Deletion request details
  requestedBy: uuid('requested_by').notNull(), // Who requested deletion
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  requestReason: varchar('request_reason', { length: 50 }).notNull(), // GDPR_RIGHT_TO_BE_FORGOTTEN, USER_REQUEST, RETENTION_POLICY

  // Deletion status
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(), // When to delete (allows grace period)
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Verification
  systemsDeleted: text('systems_deleted'), // JSON array of systems that confirmed deletion
  verificationHash: varchar('verification_hash', { length: 64 }), // Hash of deleted data for verification

  // Error tracking
  errorMessage: text('error_message'),
  retryCount: varchar('retry_count', { length: 10 }).default('0'),

  // Timestamps
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Encryption Key Rotation Log
 *
 * Tracks key rotation events for audit and recovery purposes.
 */
export const encryptionKeyRotationLog = pgTable('encryption_key_rotation_log', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Key version
  oldKeyVersion: varchar('old_key_version', { length: 50 }).notNull(),
  newKeyVersion: varchar('new_key_version', { length: 50 }).notNull(),

  // Rotation details
  rotatedBy: uuid('rotated_by').notNull(),
  rotationReason: varchar('rotation_reason', { length: 255 }), // SCHEDULED, COMPROMISED, COMPLIANCE

  // Progress tracking
  recordsToRotate: varchar('records_to_rotate', { length: 20 }).notNull(),
  recordsRotated: varchar('records_rotated', { length: 20 }).notNull().default('0'),
  status: varchar('status', { length: 50 }).notNull(), // STARTED, IN_PROGRESS, COMPLETED, FAILED

  // Timestamps
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

/**
 * Index suggestions (to be created in migration):
 *
 * CREATE INDEX idx_encrypted_user_pii_user_id ON encrypted_user_pii(user_id);
 * CREATE INDEX idx_encrypted_user_pii_company_id ON encrypted_user_pii(company_id);
 * CREATE INDEX idx_pii_access_log_user_id ON pii_access_log(user_id);
 * CREATE INDEX idx_pii_access_log_accessor_id ON pii_access_log(accessor_id);
 * CREATE INDEX idx_pii_access_log_accessed_at ON pii_access_log(accessed_at DESC);
 * CREATE INDEX idx_pii_deletion_queue_status ON pii_deletion_queue(status);
 * CREATE INDEX idx_pii_deletion_queue_scheduled_for ON pii_deletion_queue(scheduled_for);
 */
