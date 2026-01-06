/**
 * Entitlements & Policy Schema
 * Feature access control and policy-based authorization
 */
import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, text, index, boolean } from 'drizzle-orm/pg-core';
import { companies, users } from './users.js';
import { billingSubscriptions } from './billing.js';
// Enums
export const policyEffectEnum = pgEnum('policy_effect', ['allow', 'deny']);
export const policyStatusEnum = pgEnum('policy_status', ['active', 'inactive', 'expired']);
/**
 * Entitlement Policies - Define what features/resources are accessible
 */
export const entitlementPolicies = pgTable('entitlement_policies', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    // Policy identification
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // Policy rules (ABAC-style)
    // Example: { "feature": "nlq", "action": "query", "conditions": { "maxQueriesPerDay": 100 } }
    rules: jsonb('rules').notNull().$type(),
    // Status
    status: policyStatusEnum('status').notNull().default('active'),
    // Validity period
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    // Priority (higher priority policies override lower ones)
    priority: integer('priority').default(0),
    // Linked subscription (if policy is subscription-based)
    subscriptionId: uuid('subscription_id').references(() => billingSubscriptions.id),
    // Metadata
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyIdIdx: index('entitlement_policies_company_id_idx').on(table.companyId),
    statusIdx: index('entitlement_policies_status_idx').on(table.status),
    subscriptionIdIdx: index('entitlement_policies_subscription_id_idx').on(table.subscriptionId),
}));
/**
 * Entitlement Decisions - Cached policy evaluation results
 */
export const entitlementDecisions = pgTable('entitlement_decisions', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Request details
    feature: varchar('feature', { length: 100 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 255 }),
    // Decision
    decision: policyEffectEnum('decision').notNull(),
    reason: text('reason'),
    // Policy that made the decision
    policyId: uuid('policy_id').references(() => entitlementPolicies.id),
    // TTL for cache invalidation
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // Evaluation metadata
    evaluationTime: integer('evaluation_time'), // milliseconds
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyFeatureActionIdx: index('entitlement_decisions_company_feature_action_idx')
        .on(table.companyId, table.feature, table.action),
    userFeatureActionIdx: index('entitlement_decisions_user_feature_action_idx')
        .on(table.userId, table.feature, table.action),
    expiresAtIdx: index('entitlement_decisions_expires_at_idx').on(table.expiresAt),
}));
/**
 * Entitlement Grants - Explicit feature grants (overrides)
 */
export const entitlementGrants = pgTable('entitlement_grants', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Grant details
    feature: varchar('feature', { length: 100 }).notNull(),
    grantType: varchar('grant_type', { length: 50 }).notNull(), // 'trial', 'promotional', 'manual', 'beta'
    // Limits (if any)
    quota: jsonb('quota').$type(),
    // Validity
    validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    // Granted by
    grantedBy: uuid('granted_by').references(() => users.id),
    grantReason: text('grant_reason'),
    // Revocation
    revoked: boolean('revoked').default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id),
    revokeReason: text('revoke_reason'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyFeatureIdx: index('entitlement_grants_company_feature_idx').on(table.companyId, table.feature),
    userFeatureIdx: index('entitlement_grants_user_feature_idx').on(table.userId, table.feature),
    validityIdx: index('entitlement_grants_validity_idx').on(table.validFrom, table.validUntil),
}));
/**
 * Entitlement Checks - Audit log of entitlement checks
 */
export const entitlementChecks = pgTable('entitlement_checks', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Check details
    feature: varchar('feature', { length: 100 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 255 }),
    // Result
    allowed: boolean('allowed').notNull(),
    denialReason: text('denial_reason'),
    // Policy/grant that allowed/denied
    policyId: uuid('policy_id').references(() => entitlementPolicies.id),
    grantId: uuid('grant_id').references(() => entitlementGrants.id),
    // Request context
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 100 }),
    // Performance
    responseTime: integer('response_time'), // milliseconds
    cacheHit: boolean('cache_hit').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyFeatureIdx: index('entitlement_checks_company_feature_idx').on(table.companyId, table.feature),
    allowedIdx: index('entitlement_checks_allowed_idx').on(table.allowed),
    createdAtIdx: index('entitlement_checks_created_at_idx').on(table.createdAt),
}));
/**
 * Usage Quotas - Track usage against entitlement limits
 */
export const usageQuotas = pgTable('usage_quotas', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    // Quota details
    feature: varchar('feature', { length: 100 }).notNull(),
    quotaType: varchar('quota_type', { length: 50 }).notNull(), // 'requests', 'tokens', 'storage', 'seats'
    // Limits
    limit: integer('limit').notNull(),
    used: integer('used').default(0).notNull(),
    // Reset period
    resetPeriod: varchar('reset_period', { length: 20 }).notNull(), // 'daily', 'monthly', 'never'
    lastReset: timestamp('last_reset', { withTimezone: true }).defaultNow().notNull(),
    nextReset: timestamp('next_reset', { withTimezone: true }).notNull(),
    // Alerts
    alertThreshold: integer('alert_threshold'), // Percentage (e.g., 80 for 80%)
    alertSent: boolean('alert_sent').default(false),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyFeatureIdx: index('usage_quotas_company_feature_idx').on(table.companyId, table.feature),
    userFeatureIdx: index('usage_quotas_user_feature_idx').on(table.userId, table.feature),
    nextResetIdx: index('usage_quotas_next_reset_idx').on(table.nextReset),
}));
//# sourceMappingURL=entitlements.js.map