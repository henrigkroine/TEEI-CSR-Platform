# Tenant Middleware Usage Guide

Quick reference for using tenant-scoped middleware in the TEEI CSR Platform API Gateway.

## Table of Contents

- [Quick Start](#quick-start)
- [Middleware Types](#middleware-types)
- [Common Patterns](#common-patterns)
- [Helper Functions](#helper-functions)
- [Examples](#examples)

---

## Quick Start

### Basic Tenant-Scoped Endpoint

```typescript
import { authenticateJWT } from './middleware/auth.js';
import { tenantScope } from './middleware/tenantScope.js';
import { requireCompanyUser } from './middleware/rbac.js';

fastify.get('/api/companies/:companyId/data', {
  onRequest: [authenticateJWT, tenantScope, requireCompanyUser]
}, async (request, reply) => {
  const { companyId } = getTenantContext(request);
  // Your business logic here
});
```

### Admin-Only Endpoint

```typescript
import { requireCompanyAdmin, requirePermission, Permission } from './middleware/rbac.js';

fastify.put('/api/companies/:companyId/settings', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireCompanyAdmin,
    requirePermission(Permission.COMPANY_SETTINGS)
  ]
}, handler);
```

---

## Middleware Types

### 1. Authentication

```typescript
import { authenticateJWT } from './middleware/auth.js';

// Always first in the chain
onRequest: [authenticateJWT, ...]
```

**Purpose**: Validates JWT token and attaches user to request

**Required**: Yes (for all protected routes)

### 2. Tenant Scope

```typescript
import { tenantScope, optionalTenantScope } from './middleware/tenantScope.js';

// Required tenant context
onRequest: [authenticateJWT, tenantScope, ...]

// Optional tenant context
onRequest: [authenticateJWT, optionalTenantScope, ...]
```

**Purpose**: Extracts and validates tenant (company) ID

**Required**: Yes (for tenant-specific operations)

**Optional**: Use `optionalTenantScope` for endpoints that support both global and tenant views

### 3. RBAC

#### Role-Based

```typescript
import {
  requireSystemAdmin,
  requireCompanyAdmin,
  requireCompanyUser,
  requireParticipant
} from './middleware/rbac.js';

// Only system admins
onRequest: [authenticateJWT, requireSystemAdmin]

// Company admins and system admins
onRequest: [authenticateJWT, tenantScope, requireCompanyAdmin]

// Any company user
onRequest: [authenticateJWT, tenantScope, requireCompanyUser]
```

#### Permission-Based

```typescript
import { requirePermission, Permission } from './middleware/rbac.js';

// Single permission
onRequest: [
  authenticateJWT,
  tenantScope,
  requirePermission(Permission.DATA_WRITE)
]

// Multiple permissions (all required)
onRequest: [
  authenticateJWT,
  tenantScope,
  requirePermission(
    Permission.DATA_READ,
    Permission.DATA_EXPORT
  )
]
```

#### Tenant Admin Only

```typescript
import { requireTenantAdmin } from './middleware/rbac.js';

// Must be admin of specific tenant
onRequest: [authenticateJWT, tenantScope, requireTenantAdmin]
```

---

## Common Patterns

### Pattern 1: Public Endpoint (No Auth)

```typescript
fastify.get('/api/public/stats', async (request, reply) => {
  // No middleware needed
  return { stats: 'public data' };
});
```

### Pattern 2: Authenticated Only

```typescript
fastify.get('/api/user/profile', {
  onRequest: [authenticateJWT]
}, async (request, reply) => {
  const { userId } = (request as AuthenticatedRequest).user;
  return getUserProfile(userId);
});
```

### Pattern 3: Tenant-Scoped Read

```typescript
fastify.get('/api/companies/:companyId/reports', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireCompanyUser
  ]
}, async (request, reply) => {
  const qb = new TenantQueryBuilder(request);
  const { query, params } = qb.select('reports');
  return db.query(query, params);
});
```

### Pattern 4: Tenant-Scoped Write (Admin Only)

```typescript
fastify.post('/api/companies/:companyId/activities', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireCompanyAdmin,
    requirePermission(Permission.DATA_WRITE)
  ]
}, async (request, reply) => {
  const qb = new TenantQueryBuilder(request);
  const { query, params } = qb.insert('activities', request.body);

  const result = await db.query(query, params);

  await logTenantAction(request, {
    action: 'create_activity',
    resourceType: 'activity',
    resourceId: result.id
  });

  return result;
});
```

### Pattern 5: System Admin Override

```typescript
fastify.delete('/api/companies/:companyId', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireSystemAdmin  // Only platform admins
  ]
}, async (request, reply) => {
  const { companyId } = getTenantContext(request);
  await deleteCompany(companyId);
  return { success: true };
});
```

### Pattern 6: Optional Tenant Context

```typescript
fastify.get('/api/analytics/global', {
  onRequest: [authenticateJWT, optionalTenantScope]
}, async (request, reply) => {
  try {
    const { companyId } = getTenantContext(request);
    // Tenant-specific analytics
    return getCompanyAnalytics(companyId);
  } catch {
    // Global analytics (no tenant context)
    return getGlobalAnalytics();
  }
});
```

---

## Helper Functions

### Get Tenant Context

```typescript
import { getTenantContext, getTenantId } from './middleware/tenantScope.js';

// Full context
const { companyId, role, userId } = getTenantContext(request);

// Just company ID
const companyId = getTenantId(request);
```

### Check Admin Status

```typescript
import { isTenantAdmin } from './middleware/tenantScope.js';

if (isTenantAdmin(request)) {
  // User is admin of current tenant
}
```

### Get User Permissions

```typescript
import { getUserPermissions, hasPermission, Permission } from './middleware/rbac.js';

// All permissions
const permissions = getUserPermissions(request);

// Check specific permission
if (hasPermission(request, Permission.DATA_WRITE)) {
  // User can write data
}
```

### Tenant Query Builder

```typescript
import { TenantQueryBuilder } from './utils/tenantContext.js';

const qb = new TenantQueryBuilder(request);

// SELECT (automatically adds company_id filter)
const { query, params } = qb.select(
  'activities',
  ['id', 'name'],
  ['is_active = :isActive']
);

// INSERT (automatically includes company_id)
const { query, params } = qb.insert('activities', {
  name: 'Mentorship',
  type: 'mentorship'
});

// UPDATE (automatically scopes to company_id)
const { query, params } = qb.update(
  'activities',
  { name: 'Updated Name' },
  ['id = :activityId']
);

// DELETE (automatically scopes to company_id)
const { query, params } = qb.delete('activities', ['id = :activityId']);
```

### Audit Logging

```typescript
import { logTenantAction } from './utils/tenantContext.js';

await logTenantAction(request, {
  action: 'update_settings',
  resourceType: 'company',
  resourceId: companyId,
  changes: { theme: 'dark' }
});
```

### Tenant Settings

```typescript
import { TenantSettings, isFeatureEnabled, getSROIOverride } from './utils/tenantContext.js';

const settings = new TenantSettings(company.settings);

// Get setting with default
const primaryColor = settings.get('branding.primaryColor', '#000000');

// Set setting
settings.set('feature_flags.analytics', true);

// Check feature flag
if (isFeatureEnabled(request, 'advanced_analytics', company.settings)) {
  // Feature is enabled
}

// Get SROI override
const multiplier = getSROIOverride(request, 'mentorship', company.settings);
```

### API Key Management

```typescript
import { generateTenantAPIKey, verifyTenantAPIKey } from './utils/tenantContext.js';

// Generate key
const { apiKey, keyHash } = generateTenantAPIKey(companyId);
// apiKey: "teei_550e8400_[64-char-hex]" (show to user once)
// keyHash: SHA256 hash (store in database)

// Verify key
const isValid = verifyTenantAPIKey(providedKey, storedHash);
```

---

## Examples

### Example 1: Simple Tenant-Scoped GET

```typescript
fastify.get('/api/companies/:companyId/volunteers', {
  onRequest: [authenticateJWT, tenantScope, requireCompanyUser]
}, async (request, reply) => {
  const qb = new TenantQueryBuilder(request);
  const { query, params } = qb.select('volunteers', ['*'], ['is_active = :isActive']);

  const volunteers = await db.query(query, { ...params, isActive: true });

  return {
    success: true,
    data: volunteers,
    meta: {
      companyId: qb.getCompanyId(),
      count: volunteers.length
    }
  };
});
```

### Example 2: Admin-Only POST with Audit Log

```typescript
fastify.post('/api/companies/:companyId/programs', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireCompanyAdmin,
    requirePermission(Permission.DATA_WRITE)
  ]
}, async (request, reply) => {
  const programData = request.body;
  const qb = new TenantQueryBuilder(request);

  // Insert with tenant scope
  const { query, params } = qb.insert('programs', programData);
  const result = await db.query(query, params);

  // Log action
  await logTenantAction(request, {
    action: 'create_program',
    resourceType: 'program',
    resourceId: result.id,
    changes: programData
  });

  return {
    success: true,
    data: result,
    message: 'Program created successfully'
  };
});
```

### Example 3: Settings Update with Validation

```typescript
fastify.put('/api/companies/:companyId/settings', {
  onRequest: [
    authenticateJWT,
    tenantScope,
    requireCompanyAdmin,
    requirePermission(Permission.COMPANY_SETTINGS)
  ]
}, async (request, reply) => {
  const newSettings = request.body;
  const { companyId } = getTenantContext(request);

  // Validate settings
  const allowedKeys = ['feature_flags', 'sroi_overrides', 'branding'];
  const invalidKeys = Object.keys(newSettings).filter(k => !allowedKeys.includes(k));

  if (invalidKeys.length > 0) {
    return reply.status(400).send({
      success: false,
      error: 'Invalid settings keys',
      invalidKeys
    });
  }

  // Update settings
  const company = await db.query(
    'UPDATE companies SET settings = settings || :newSettings WHERE id = :companyId RETURNING *',
    { companyId, newSettings: JSON.stringify(newSettings) }
  );

  // Log action
  await logTenantAction(request, {
    action: 'update_settings',
    resourceType: 'company',
    resourceId: companyId,
    changes: newSettings
  });

  return {
    success: true,
    data: company,
    message: 'Settings updated successfully'
  };
});
```

### Example 4: Permission Check in Handler

```typescript
fastify.get('/api/companies/:companyId/sensitive-data', {
  onRequest: [authenticateJWT, tenantScope, requireCompanyUser]
}, async (request, reply) => {
  const { companyId } = getTenantContext(request);

  // Additional runtime permission check
  if (!hasPermission(request, Permission.DATA_EXPORT)) {
    return reply.status(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Export permission required'
    });
  }

  const data = await getSensitiveData(companyId);
  return { success: true, data };
});
```

### Example 5: Multi-Tenant Aggregation (System Admin)

```typescript
fastify.get('/api/admin/all-companies-stats', {
  onRequest: [authenticateJWT, requireSystemAdmin]
}, async (request, reply) => {
  // No tenant scope - system admin sees all
  const stats = await db.query(`
    SELECT
      company_id,
      COUNT(*) as total_activities,
      SUM(participant_count) as total_participants
    FROM activities
    GROUP BY company_id
  `);

  return {
    success: true,
    data: stats
  };
});
```

---

## Middleware Order

**Always use this order**:

```typescript
onRequest: [
  authenticateJWT,        // 1. Verify JWT
  tenantScope,            // 2. Extract tenant context
  requireRole(...),       // 3. Check role
  requirePermission(...)  // 4. Check permission
]
```

**Why this order?**
- JWT must be verified before extracting tenant
- Tenant context needed before role/permission checks
- Role checks are faster than permission checks (do first)

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Invalid tenant ID format. Must be a valid UUID."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Access denied. You do not have permission to access this company's data.",
  "requiredRoles": ["company_admin"],
  "userRole": "company_user"
}
```

---

## Best Practices

1. **Always use absolute middleware order**: Auth → Tenant → RBAC
2. **Use TenantQueryBuilder** for all database queries
3. **Log admin actions** with `logTenantAction`
4. **Validate input** before database operations
5. **Return consistent error format** (success, error, message)
6. **Check permissions at route level** (not in handler when possible)
7. **Use typed requests** (`TenantRequest`, `AuthenticatedRequest`)
8. **Test tenant isolation** for every new endpoint

---

## Testing

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('My Tenant Endpoint', () => {
  it('should require authentication', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/companies/xxx/data'
    });

    expect(response.statusCode).toBe(401);
  });

  it('should enforce tenant scope', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/companies/other-company-id/data',
      headers: { authorization: `Bearer ${myCompanyToken}` }
    });

    expect(response.statusCode).toBe(403);
  });

  it('should require admin role', async () => {
    const response = await fastify.inject({
      method: 'PUT',
      url: '/api/companies/xxx/settings',
      headers: { authorization: `Bearer ${userToken}` }
    });

    expect(response.statusCode).toBe(403);
  });
});
```

---

## Troubleshooting

### Issue: 403 on valid tenant access

**Check**:
- User has record in `company_users` table
- `companyId` in JWT matches route param
- User role has required permissions

### Issue: Tenant context not available

**Check**:
- `tenantScope` middleware is applied
- Route has `:companyId` param or JWT has `companyId` claim
- Middleware order is correct

### Issue: Permission denied for admin

**Check**:
- User role is `company_admin` or `system_admin`
- Tenant context has correct role
- Permission is in `ROLE_PERMISSIONS` mapping

---

**For more details, see**: `/reports/PHASE-C-A-03-tenant-backend.md`
