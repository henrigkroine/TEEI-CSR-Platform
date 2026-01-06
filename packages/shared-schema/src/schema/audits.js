import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { companies } from './users.js';
/**
 * Audit Log Table
 *
 * Captures all significant actions in the system for compliance, security monitoring,
 * and forensic investigation. Supports GDPR Article 30 record-keeping requirements.
 *
 * Key features:
 * - Immutable audit trail (no updates, only inserts)
 * - Actor identification (user + IP)
 * - Resource tracking with before/after states
 * - Tenant isolation via company_id
 * - Retention policy support
 */
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    // Tenant isolation
    companyId: uuid('company_id').references(() => companies.id),
    // Who performed the action
    actorId: uuid('actor_id').notNull(), // user_id of actor
    actorEmail: varchar('actor_email', { length: 255 }).notNull(),
    actorRole: varchar('actor_role', { length: 50 }).notNull(),
    actorIp: varchar('actor_ip', { length: 45 }), // IPv4 or IPv6
    // What action was performed
    action: varchar('action', { length: 100 }).notNull(), // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, etc.
    actionCategory: varchar('action_category', { length: 50 }).notNull(), // AUTH, DATA_ACCESS, DATA_MODIFICATION, PRIVACY, ADMIN
    // What resource was affected
    resourceType: varchar('resource_type', { length: 100 }).notNull(), // users, profiles, companies, etc.
    resourceId: uuid('resource_id'), // ID of affected resource
    resourceIdentifier: varchar('resource_identifier', { length: 255 }), // Human-readable identifier (email, name, etc.)
    // State tracking (for data modifications)
    beforeState: jsonb('before_state'), // Previous state (for UPDATE/DELETE)
    afterState: jsonb('after_state'), // New state (for CREATE/UPDATE)
    // Request context
    requestId: varchar('request_id', { length: 100 }), // Correlation ID for tracing
    userAgent: text('user_agent'),
    endpoint: varchar('endpoint', { length: 255 }), // API endpoint called
    // Additional metadata
    metadata: jsonb('metadata'), // Additional context-specific data
    // Compliance fields
    gdprBasis: varchar('gdpr_basis', { length: 100 }), // Legal basis: consent, contract, legitimate_interest, etc.
    retentionUntil: timestamp('retention_until', { withTimezone: true }), // Automatic deletion date
    // Timestamp
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
/**
 * Audit Log Indexes
 * - Fast lookups by actor, company, resource, and time range
 * - Support for compliance queries and forensic investigations
 */
// Index suggestions (to be created in migration):
// CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
// CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
// CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
// CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
// CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);
// CREATE INDEX idx_audit_logs_retention ON audit_logs(retention_until) WHERE retention_until IS NOT NULL;
//# sourceMappingURL=audits.js.map