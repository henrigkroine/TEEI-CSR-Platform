import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Evidence Ledger Table
 *
 * Append-only tamper-evident ledger for tracking all evidence/citation modifications.
 * Implements hash chaining and HMAC signatures for integrity verification.
 *
 * Key features:
 * - Append-only (no updates/deletes via database triggers)
 * - Hash chain linking each entry to the previous one
 * - HMAC signatures for authentication
 * - NO PII stored (only IDs and technical metadata)
 * - Tamper detection via integrity verification
 *
 * Security:
 * - content_hash: SHA-256 of citation text
 * - previous_hash: SHA-256 of previous entry (forms chain)
 * - signature: HMAC-SHA256 of entry data
 *
 * Privacy:
 * - editor field contains userId (UUID) or 'system', never email/name
 * - metadata contains only technical data (IP, userAgent, requestId, reason)
 * - NO citation text or PII stored
 */
export const evidenceLedger = pgTable('evidence_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull(),
  citationId: uuid('citation_id').notNull(),

  // Action type: ADDED, MODIFIED, REMOVED
  action: varchar('action', { length: 20 }).notNull(),

  // Hash chain for integrity
  contentHash: varchar('content_hash', { length: 64 }).notNull(), // SHA-256
  previousHash: varchar('previous_hash', { length: 64 }), // SHA-256 (NULL for first entry)

  // HMAC signature for authentication
  signature: varchar('signature', { length: 64 }).notNull(), // HMAC-SHA256

  // Actor tracking (NO PII)
  editor: varchar('editor', { length: 100 }).notNull(), // userId or 'system'

  // Request context (NO PII)
  metadata: jsonb('metadata'), // { ip, userAgent, reason, requestId }

  // Timestamp
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Ledger Indexes
 * - Fast lookups by report and citation
 * - Chronological ordering for hash chain verification
 * - Action-based filtering for audit queries
 */

// Index suggestions (created in migration):
// CREATE INDEX idx_evidence_ledger_report_id ON evidence_ledger(report_id);
// CREATE INDEX idx_evidence_ledger_citation_id ON evidence_ledger(citation_id);
// CREATE INDEX idx_evidence_ledger_timestamp ON evidence_ledger(timestamp);
// CREATE INDEX idx_evidence_ledger_report_timestamp ON evidence_ledger(report_id, timestamp DESC);
// CREATE INDEX idx_evidence_ledger_action ON evidence_ledger(action);
