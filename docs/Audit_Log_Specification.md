# Audit Log Specification

**Version**: 1.0
**Last Updated**: 2025-11-13
**Owner**: Audit Engineer (Compliance Team)

## Table of Contents

1. [Overview](#overview)
2. [Schema](#schema)
3. [Event Categories](#event-categories)
4. [Usage Guide](#usage-guide)
5. [Query Examples](#query-examples)
6. [Retention & Compliance](#retention--compliance)
7. [Best Practices](#best-practices)

---

## Overview

The audit logging system provides an immutable record of all significant actions in the TEEI CSR Platform. It supports:

- **Compliance**: GDPR Article 30 (records of processing activities)
- **Security**: Forensic investigation of security incidents
- **Debugging**: Troubleshooting production issues
- **Analytics**: Usage patterns and user behavior

### Design Principles

1. **Immutability**: Audit logs are never updated or deleted (except per retention policy)
2. **Completeness**: All significant actions are logged
3. **Non-blocking**: Audit logging failures don't block operations
4. **Performance**: Minimal overhead on application performance
5. **Privacy**: PII in logs is minimized and encrypted where necessary

---

## Schema

### Table: `audit_logs`

```sql
CREATE TABLE audit_logs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  company_id UUID REFERENCES companies(id),

  -- Actor (who performed the action)
  actor_id UUID NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  actor_ip VARCHAR(45),

  -- Action (what was done)
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,

  -- Resource (what was affected)
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  resource_identifier VARCHAR(255),

  -- State tracking
  before_state JSONB,
  after_state JSONB,

  -- Request context
  request_id VARCHAR(100),
  user_agent TEXT,
  endpoint VARCHAR(255),

  -- Additional metadata
  metadata JSONB,

  -- Compliance
  gdpr_basis VARCHAR(100),
  retention_until TIMESTAMP WITH TIME ZONE,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Indexes

```sql
-- Fast lookups by actor
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);

-- Fast lookups by company (tenant isolation)
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);

-- Fast lookups by resource
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Time-based queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Category filtering
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);

-- Retention cleanup
CREATE INDEX idx_audit_logs_retention ON audit_logs(retention_until)
  WHERE retention_until IS NOT NULL;
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for the audit log entry |
| `company_id` | UUID | No | Tenant ID (null for super admin actions) |
| `actor_id` | UUID | Yes | User ID of the person performing the action |
| `actor_email` | VARCHAR(255) | Yes | Email of the actor (for readability) |
| `actor_role` | VARCHAR(50) | Yes | Role of the actor at time of action |
| `actor_ip` | VARCHAR(45) | No | IP address (IPv4 or IPv6) |
| `action` | VARCHAR(100) | Yes | Specific action performed (e.g., LOGIN, UPDATE, DELETE) |
| `action_category` | VARCHAR(50) | Yes | Category: AUTH, DATA_ACCESS, DATA_MODIFICATION, PRIVACY, ADMIN, SECURITY |
| `resource_type` | VARCHAR(100) | Yes | Type of resource affected (e.g., users, profiles, companies) |
| `resource_id` | UUID | No | ID of the affected resource |
| `resource_identifier` | VARCHAR(255) | No | Human-readable identifier (e.g., email, name) |
| `before_state` | JSONB | No | Previous state (for UPDATE/DELETE actions) |
| `after_state` | JSONB | No | New state (for CREATE/UPDATE actions) |
| `request_id` | VARCHAR(100) | No | Correlation ID for distributed tracing |
| `user_agent` | TEXT | No | Browser/client user agent |
| `endpoint` | VARCHAR(255) | No | API endpoint that was called |
| `metadata` | JSONB | No | Additional context-specific data |
| `gdpr_basis` | VARCHAR(100) | No | Legal basis for processing (consent, contract, etc.) |
| `retention_until` | TIMESTAMP | No | Automatic deletion date (per retention policy) |
| `timestamp` | TIMESTAMP | Yes | When the action occurred |

---

## Event Categories

### 1. AUTH (Authentication)

Actions related to user authentication and session management.

| Action | When to Log | Example |
|--------|-------------|---------|
| `LOGIN` | Successful login | User signs in with email/password |
| `LOGOUT` | User logs out | User clicks logout button |
| `LOGIN_FAILED` | Failed login attempt | Wrong password entered |
| `PASSWORD_RESET` | Password changed | User resets forgotten password |
| `MFA_ENABLED` | MFA activated | User enables two-factor auth |
| `MFA_DISABLED` | MFA deactivated | User disables two-factor auth |
| `SESSION_EXPIRED` | Session timeout | JWT token expired |

**Example**:
```typescript
await auditLogger.logAuth({
  actorId: user.id,
  actorEmail: user.email,
  action: AuditAction.LOGIN,
  actorIp: request.ip,
  userAgent: request.headers['user-agent'],
  metadata: { loginMethod: 'email_password' }
});
```

### 2. DATA_ACCESS (Read Operations)

Actions that read or view personal data.

| Action | When to Log | Example |
|--------|-------------|---------|
| `READ` | Viewing PII or sensitive data | Admin views user profile |
| `SEARCH` | Searching for users/records | Manager searches employee list |
| `EXPORT` | Exporting data (non-GDPR) | Admin exports report |
| `VIEW_LIST` | Viewing list of records | Viewing participant roster |

**Example**:
```typescript
await auditLogger.logDataAccess({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  resourceType: 'user_profile',
  resourceId: profileId,
  requestId: request.id,
  endpoint: request.url
});
```

### 3. DATA_MODIFICATION (Write Operations)

Actions that create, update, or delete data.

| Action | When to Log | Example |
|--------|-------------|---------|
| `CREATE` | Creating new record | New user registration |
| `UPDATE` | Modifying existing record | User updates their profile |
| `DELETE` | Deleting record | Admin deletes inactive account |
| `BULK_DELETE` | Deleting multiple records | Purging old data |
| `IMPORT` | Importing data from CSV | Kintell CSV import |
| `ANONYMIZE` | Anonymizing data | Post-deletion anonymization |

**Example**:
```typescript
await auditLogger.logDataModification({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: AuditAction.UPDATE,
  resourceType: 'users',
  resourceId: userId,
  resourceIdentifier: user.email,
  beforeState: { email: 'old@example.com' },
  afterState: { email: 'new@example.com' },
  requestId: request.id
});
```

### 4. PRIVACY (GDPR/Privacy Operations)

Actions related to data subject rights and privacy.

| Action | When to Log | Example |
|--------|-------------|---------|
| `EXPORT_DATA` | GDPR data export | User requests their data |
| `REQUEST_DELETION` | GDPR deletion request | User requests account deletion |
| `CONFIRM_DELETION` | Deletion completed | System completes deletion |
| `CONSENT_GIVEN` | User gives consent | User accepts terms |
| `CONSENT_WITHDRAWN` | User withdraws consent | User opts out of marketing |
| `ACCESS_PII` | Accessing encrypted PII | Admin decrypts sensitive data |

**Example**:
```typescript
await auditLogger.logPrivacyEvent({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: AuditAction.EXPORT_DATA,
  resourceType: 'user_data',
  resourceId: userId,
  metadata: { format: 'json', recordCount: 42 }
});
```

### 5. ADMIN (Administrative Operations)

Actions performed by administrators.

| Action | When to Log | Example |
|--------|-------------|---------|
| `ROLE_CHANGE` | User role modified | Promote user to admin |
| `PERMISSION_GRANT` | Permission granted | Grant export permission |
| `PERMISSION_REVOKE` | Permission revoked | Remove admin access |
| `SETTINGS_CHANGE` | System settings changed | Update retention policy |
| `USER_IMPERSONATE` | Admin impersonates user | Support debugging |
| `COMPANY_CREATE` | New company created | Onboarding new client |

**Example**:
```typescript
await auditLogger.logAdmin({
  companyId: user.companyId,
  actorId: admin.id,
  actorEmail: admin.email,
  actorRole: admin.role,
  action: AuditAction.ROLE_CHANGE,
  resourceType: 'users',
  resourceId: userId,
  beforeState: { role: 'company_user' },
  afterState: { role: 'company_admin' },
  metadata: { reason: 'Promotion to admin' }
});
```

### 6. SECURITY (Security Events)

Security-related events and suspicious activity.

| Action | When to Log | Example |
|--------|-------------|---------|
| `ACCESS_DENIED` | Unauthorized access attempt | User tries to access forbidden resource |
| `SUSPICIOUS_ACTIVITY` | Potential security threat | Multiple failed logins |
| `KEY_ROTATION` | Encryption key rotated | PII master key rotation |
| `RATE_LIMIT_HIT` | Rate limit exceeded | Too many API requests |
| `WEBHOOK_VERIFY_FAILED` | Invalid webhook signature | Kintell webhook signature mismatch |

**Example**:
```typescript
await auditLogger.log({
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: AuditAction.ACCESS_DENIED,
  actionCategory: AuditActionCategory.SECURITY,
  resourceType: 'company_data',
  resourceId: forbiddenCompanyId,
  metadata: {
    attemptedCompanyId: forbiddenCompanyId,
    userCompanyId: user.companyId,
    reason: 'Cross-tenant access attempt'
  }
});
```

---

## Usage Guide

### Installation

```typescript
import { createAuditLogger, AuditAction, AuditActionCategory } from '@teei/compliance';
import { db } from '@teei/shared-schema';

const auditLogger = createAuditLogger(db);
```

### Basic Logging

```typescript
// Generic log
await auditLogger.log({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: 'CUSTOM_ACTION',
  actionCategory: AuditActionCategory.DATA_MODIFICATION,
  resourceType: 'resource_type',
  resourceId: 'resource_id',
  beforeState: { old: 'value' },
  afterState: { new: 'value' },
  requestId: request.id
});
```

### Specialized Methods

```typescript
// Authentication
await auditLogger.logAuth({
  actorId: user.id,
  actorEmail: user.email,
  action: AuditAction.LOGIN,
  actorIp: request.ip,
  userAgent: request.headers['user-agent']
});

// Data access
await auditLogger.logDataAccess({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  resourceType: 'users',
  resourceId: userId
});

// Data modification
await auditLogger.logDataModification({
  companyId: user.companyId,
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: AuditAction.UPDATE,
  resourceType: 'users',
  resourceId: userId,
  beforeState: oldData,
  afterState: newData
});

// Privacy event
await auditLogger.logPrivacyEvent({
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  action: AuditAction.EXPORT_DATA,
  resourceType: 'user_data',
  resourceId: userId
});

// Admin action
await auditLogger.logAdmin({
  companyId: user.companyId,
  actorId: admin.id,
  actorEmail: admin.email,
  actorRole: admin.role,
  action: AuditAction.ROLE_CHANGE,
  resourceType: 'users',
  resourceId: userId,
  beforeState: { role: 'user' },
  afterState: { role: 'admin' }
});
```

### Request Context

Always include request context when available:

```typescript
await auditLogger.log({
  // ... other fields
  requestId: request.id, // Correlation ID for tracing
  userAgent: request.headers['user-agent'],
  endpoint: request.url,
  actorIp: request.ip
});
```

---

## Query Examples

### Get User's Own Actions

```typescript
const logs = await auditLogger.query({
  actorId: userId,
  limit: 100
});
```

### Get Actions on a Resource

```typescript
const logs = await auditLogger.query({
  resourceType: 'users',
  resourceId: userId,
  limit: 50
});
```

### Get Privacy Events for Compliance Report

```typescript
const logs = await auditLogger.query({
  actionCategory: AuditActionCategory.PRIVACY,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 1000
});
```

### Get Company Actions (Tenant-Filtered)

```typescript
const logs = await auditLogger.query({
  companyId: companyId,
  startDate: startDate,
  endDate: endDate,
  limit: 500
});
```

### Direct SQL Queries

```sql
-- Failed login attempts in last 24 hours
SELECT actor_email, actor_ip, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'LOGIN_FAILED'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY actor_email, actor_ip
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- Most accessed resources
SELECT resource_type, COUNT(*) as access_count
FROM audit_logs
WHERE action_category = 'DATA_ACCESS'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY resource_type
ORDER BY access_count DESC;

-- User activity timeline
SELECT timestamp, action, resource_type, endpoint
FROM audit_logs
WHERE actor_id = 'user-uuid'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## Retention & Compliance

### Retention Policies

| Log Category | Retention Period | Reason |
|--------------|------------------|--------|
| Authentication | 2 years | Security analysis |
| Data access | 2 years | GDPR Article 30 |
| Data modification | 7 years | Legal/tax compliance |
| Privacy events | 7 years | GDPR compliance |
| Security events | 2 years | Forensic investigation |

### Automatic Cleanup

```typescript
// Run daily via cron
const deletedCount = await auditLogger.purgeExpiredLogs();
console.log(`Purged ${deletedCount} expired audit logs`);
```

### Setting Retention

```typescript
// Set custom retention when logging
await auditLogger.log({
  // ... other fields
  retentionUntil: new Date('2031-12-31') // Keep until this date
});
```

---

## Best Practices

### DO

✅ **Log all significant actions**
- Authentication events
- Data access (especially PII)
- Data modifications
- Privacy operations
- Administrative actions

✅ **Include context**
- Request ID for tracing
- User agent for debugging
- IP address for security
- Before/after states for modifications

✅ **Use structured metadata**
```typescript
metadata: {
  reason: 'User request',
  source: 'api',
  batchId: 'batch-123'
}
```

✅ **Handle failures gracefully**
- Audit logging should never block operations
- Log failures to stderr for monitoring
- Retry transient failures

✅ **Minimize PII in logs**
- Use UUIDs instead of emails where possible
- Encrypt sensitive fields
- Hash tokens and secrets

### DON'T

❌ **Don't log passwords or secrets**
```typescript
// BAD
beforeState: { password: 'plaintext123' }

// GOOD
beforeState: { password: '[REDACTED]' }
```

❌ **Don't update or delete audit logs**
- Audit logs are immutable
- Only automated retention cleanup is allowed

❌ **Don't log excessively**
- Avoid logging every read of non-sensitive data
- Use sampling for high-volume operations

❌ **Don't block on audit failures**
```typescript
// BAD
await auditLogger.log(...); // Throws exception

// GOOD (built into SDK)
try {
  await db.insert(auditLogs).values(...);
} catch (error) {
  console.error('Audit log failed:', error);
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Volume**: Logs per hour/day
- **Categories**: Distribution of action categories
- **Failed Logins**: Count of LOGIN_FAILED events
- **Privacy Requests**: Count of EXPORT_DATA and REQUEST_DELETION
- **Security Events**: Count of ACCESS_DENIED and SUSPICIOUS_ACTIVITY

### Alerts

Set up alerts for:
- Multiple failed logins from same IP
- Unusual volume of data exports
- Cross-tenant access attempts
- Encryption key rotation events
- Bulk deletion operations

### Grafana Dashboard

**Queries**:
```sql
-- Audit log volume over time
SELECT
  date_trunc('hour', timestamp) as hour,
  action_category,
  COUNT(*) as count
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour, action_category
ORDER BY hour;

-- Failed login attempts by user
SELECT
  actor_email,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt
FROM audit_logs
WHERE action = 'LOGIN_FAILED'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY actor_email
HAVING COUNT(*) > 3;
```

---

## Integration Examples

### Fastify Middleware

```typescript
// Log all requests
fastify.addHook('onResponse', async (request, reply) => {
  const user = (request as any).user;
  if (user && request.method !== 'GET') {
    await auditLogger.log({
      actorId: user.userId,
      actorEmail: user.email,
      actorRole: user.role,
      action: request.method,
      actionCategory: AuditActionCategory.DATA_MODIFICATION,
      resourceType: 'api',
      endpoint: request.url,
      requestId: request.id,
      actorIp: request.ip,
      userAgent: request.headers['user-agent']
    });
  }
});
```

### Drizzle ORM Hook

```typescript
// Log all database modifications
db.$client.on('query', (event) => {
  if (['INSERT', 'UPDATE', 'DELETE'].includes(event.query.toUpperCase().split(' ')[0])) {
    // Extract context and log
    auditLogger.log({
      // ... populate from context
    });
  }
});
```

---

## Troubleshooting

### Issue: Audit logs not appearing

**Possible causes**:
1. Database connection issues
2. Audit logger not initialized
3. Silent failures (check stderr)

**Solution**:
```typescript
// Enable debug logging
const auditLogger = createAuditLogger(db);
// Check database connection
await db.execute(sql`SELECT 1`);
```

### Issue: Performance degradation

**Possible causes**:
1. Missing indexes
2. Large JSON payloads in `before_state`/`after_state`
3. High volume of logs

**Solution**:
- Verify indexes are created
- Limit size of state objects
- Use async logging (non-blocking)
- Consider batching for high-volume operations

### Issue: Retention cleanup not working

**Possible causes**:
1. Cron job not running
2. `retention_until` not set
3. Database permissions

**Solution**:
```bash
# Manually run cleanup
pnpm run db:cleanup-audit-logs

# Check cron job
crontab -l
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-13 | Initial specification | Audit Engineer |

---

**Related Documents**:
- [GDPR Compliance Guide](./GDPR_Compliance.md)
- [Security Hardening Checklist](./Security_Hardening_Checklist.md)
- [Database Schema Documentation](../packages/shared-schema/README.md)
