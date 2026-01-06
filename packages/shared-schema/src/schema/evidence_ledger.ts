import { pgTable, uuid, varchar, timestamp, text, index, boolean, integer } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Evidence Ledger - Append-only tamper-proof audit log for evidence citations
 *
 * Purpose: Cryptographically secure tracking of all evidence usage in generated reports
 * Compliance: SOC2, ISO 27001, AI Act Article 13 (record keeping), CSRD assurance
 *
 * Features:
 * - SHA-256 content digests for tamper detection
 * - Append-only: no updates or deletes allowed
 * - Version tracking for evidence edits
 * - Editor/signer attribution
 * - No PII: only references and digests
 *
 * Security: Digests enable independent verification of evidence integrity
 */
export const evidenceLedger = pgTable(
  'evidence_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Evidence identification (no PII)
    evidenceId: uuid('evidence_id').notNull(), // References evidence_snippets.id or report_citations.id
    evidenceType: varchar('evidence_type', { length: 50 }).notNull(), // 'snippet', 'citation', 'metric', 'calculation'
    companyId: uuid('company_id').notNull().references(() => companies.id),

    // Cryptographic integrity
    contentDigest: varchar('content_digest', { length: 64 }).notNull(), // SHA-256 hex (64 chars)
    previousDigest: varchar('previous_digest', { length: 64 }), // Chain to previous entry for this evidenceId

    // Version tracking
    version: integer('version').notNull().default(1), // Incremental version number
    eventType: varchar('event_type', { length: 30 }).notNull(), // 'created', 'cited', 'edited', 'verified', 'redacted'

    // Attribution (user IDs, not names/emails)
    editorId: uuid('editor_id'), // User who made the change
    editorRole: varchar('editor_role', { length: 50 }), // 'analyst', 'reviewer', 'system'
    signerIdentity: varchar('signer_identity', { length: 100 }), // Hashed identifier or 'system'

    // Audit metadata (no PII)
    reportId: uuid('report_id'), // If used in report generation
    lineageId: uuid('lineage_id'), // References report_lineage.id if applicable
    operationContext: varchar('operation_context', { length: 100 }), // 'gen_report', 'citation_edit', 'validation'

    // Tamper detection
    tamperDetected: boolean('tamper_detected').default(false), // Flag if verification fails
    tamperDetails: text('tamper_details'), // Description of tamper attempt if detected

    // Timestamps (immutable)
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(), // When the change took effect

    // Retention policy
    retentionUntil: timestamp('retention_until', { withTimezone: true }), // For GDPR compliance

    // Additional audit fields
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6 (anonymized/hashed)
    userAgent: varchar('user_agent', { length: 200 }), // Client identifier (truncated)
  },
  (table) => ({
    // Indexes for efficient queries
    evidenceIdIdx: index('evidence_ledger_evidence_id_idx').on(table.evidenceId),
    companyIdIdx: index('evidence_ledger_company_id_idx').on(table.companyId),
    reportIdIdx: index('evidence_ledger_report_id_idx').on(table.reportId),
    recordedAtIdx: index('evidence_ledger_recorded_at_idx').on(table.recordedAt),
    contentDigestIdx: index('evidence_ledger_content_digest_idx').on(table.contentDigest),
    tamperDetectedIdx: index('evidence_ledger_tamper_idx').on(table.tamperDetected),
  })
);

/**
 * Evidence Ledger Events - Audit trail for ledger operations
 * Tracks all read/write operations to the evidence ledger itself
 * For security monitoring and compliance audits
 */
export const evidenceLedgerAudit = pgTable(
  'evidence_ledger_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Operation tracking
    operationType: varchar('operation_type', { length: 30 }).notNull(), // 'append', 'verify', 'query'
    ledgerEntryId: uuid('ledger_entry_id').references(() => evidenceLedger.id),

    // Actor (no PII)
    actorId: uuid('actor_id'), // User or service account
    actorType: varchar('actor_type', { length: 30 }), // 'user', 'service', 'system'

    // Operation result
    success: boolean('success').notNull(),
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),

    // Timestamps
    performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),

    // Request context
    requestId: varchar('request_id', { length: 100 }), // Correlation ID
    ipAddress: varchar('ip_address', { length: 45 }), // Anonymized
  },
  (table) => ({
    performedAtIdx: index('evidence_ledger_audit_performed_at_idx').on(table.performedAt),
    actorIdIdx: index('evidence_ledger_audit_actor_id_idx').on(table.actorId),
    operationTypeIdx: index('evidence_ledger_audit_operation_type_idx').on(table.operationType),
  })
);
