# Admin Studio v2 - Documentation

**Version**: 2.0.0
**Status**: Production Ready
**Branch**: `claude/worker11-admin-studio-v2-01X55XT3LLvNmL9TQxEvKUcn`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [SCIM 2.0 Provisioning](#scim-20-provisioning)
5. [SSO Configuration](#sso-configuration)
6. [Tenant Lifecycle Management](#tenant-lifecycle-management)
7. [Entitlements & Plans](#entitlements--plans)
8. [Data Residency](#data-residency)
9. [RBAC & Permissions](#rbac--permissions)
10. [API Reference](#api-reference)
11. [Security & Compliance](#security--compliance)
12. [Deployment](#deployment)
13. [Testing](#testing)

---

## Overview

Admin Studio v2 is a comprehensive administrative platform for managing multi-tenant SaaS operations. It provides enterprise-grade capabilities for:

- **Tenant lifecycle**: Create, suspend, terminate, snapshot tenants
- **SCIM 2.0**: Automated user/group provisioning (RFC 7644 compliant)
- **SSO**: SAML and OIDC identity provider configuration
- **Entitlements**: Plan management, feature toggles, add-ons, quotas
- **Data Residency**: Regional compliance (US/EU/UK) with policy locking
- **Audit Logging**: Complete activity tracking for SOC 2 compliance

---

## Architecture

### Services

```
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Admin Routes (/admin/v2/*)                          │  │
│  │  - Tenant lifecycle                                   │  │
│  │  - Audit logs                                         │  │
│  │  - RBAC middleware                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Unified Profile  │ │ Data Residency   │ │ Billing Service  │
│                  │ │                  │ │                  │
│ SCIM 2.0 Server  │ │ SSO Configs      │ │ Entitlements API │
│ /scim/v2/Users   │ │ /v1/sso/configs  │ │ /admin/v2/       │
│ /scim/v2/Groups  │ │ Residency Policy │ │ entitlements/*   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Data Flow

1. **Admin UI** → API Gateway → Service Endpoints
2. **SCIM IdP** → Unified Profile (SCIM Server)
3. **SSO Login** → Data Residency (SSO Config Validation)
4. **Entitlements Check** → Billing Service → Entitlements Engine

---

## Features

### 1. Tenant Lifecycle Management

**Location**: `services/api-gateway/src/routes/admin/tenants.ts`

#### Create Tenant

```bash
POST /admin/v2/tenants
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "professional",
  "residencyRegion": "eu-central-1",
  "adminEmail": "admin@acme.com",
  "metadata": {
    "industry": "technology",
    "employeeCount": 500
  }
}
```

**Response**:
```json
{
  "id": "tenant-uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "status": "provisioning",
  "plan": "professional",
  "residencyRegion": "eu-central-1",
  "residencyLocked": false,
  "createdAt": "2025-11-17T10:00:00Z"
}
```

**Provisioning Steps** (automatic):
1. Create database schema (isolated per tenant)
2. Initialize S3 buckets with region constraints
3. Configure Redis namespace
4. Set up monitoring dashboards
5. Fire `tenant.created` webhook

**Status Transition**: `provisioning` → `active` (2-5 seconds)

---

#### Suspend Tenant

```bash
POST /admin/v2/tenants/{tenantId}/suspend
{
  "reason": "Payment overdue for 30 days",
  "notifyUsers": true
}
```

**Effects**:
- Blocks all API access (returns 403)
- Disables SSO logins
- Sends email notifications to all users
- Preserves data (no deletion)
- Fires `tenant.suspended` webhook

**Reversible**: Yes, via `POST /admin/v2/tenants/{tenantId}/reactivate`

---

#### Terminate Tenant (DANGER)

**Prerequisites**:
1. Create snapshot first: `POST /admin/v2/tenants/{tenantId}/snapshot`
2. Wait for snapshot status: `completed`
3. Confirm tenant ID matches

```bash
POST /admin/v2/tenants/{tenantId}/terminate
{
  "reason": "Customer requested full account deletion (GDPR)",
  "confirmationToken": "{tenantId}",
  "snapshotId": "snapshot-uuid"
}
```

**Response**:
```json
{
  "jobId": "job-uuid",
  "estimatedCompletionTime": "2025-11-17T10:05:00Z"
}
```

**Cleanup Steps** (background job):
1. Delete database data (cascade)
2. Purge S3 objects
3. Clear Redis cache
4. Archive logs to cold storage
5. Fire `tenant.terminated` webhook

**Irreversible**: Yes. Snapshot is the only recovery option.

---

#### Rotate Secrets

```bash
POST /admin/v2/tenants/{tenantId}/secrets/rotate
{
  "secretTypes": ["api_key", "signing_key"],
  "gracePeriodHours": 24
}
```

**Response**:
```json
{
  "rotatedKeys": [
    {
      "type": "api_key",
      "oldKeyId": "old_api_key_abc123",
      "newKeyId": "new_api_key_xyz789",
      "expiresAt": "2025-11-18T10:00:00Z"
    }
  ]
}
```

**Grace Period**: Both old and new keys are valid for specified hours.

---

### 2. SCIM 2.0 Provisioning

**RFC 7644 Compliant**: Full SCIM 2.0 implementation with filtering, pagination, ETags.

**Location**: `services/unified-profile/src/routes/scim.ts`

#### List Users

```bash
GET /scim/v2/Users?filter=active eq true&startIndex=1&count=100
Authorization: Bearer {token}
x-tenant-id: {tenantId}
```

**Filter Operators**:
- `eq` (equals), `ne` (not equals)
- `co` (contains), `sw` (starts with), `ew` (ends with)
- `gt`, `ge`, `lt`, `le` (comparisons)
- `pr` (present)
- `and`, `or`, `not` (logical)

**Example Filters**:
- `userName eq "john@example.com"`
- `emails[type eq "work" and value co "@example.com"]`
- `active eq true and name.givenName sw "J"`

---

#### Create User (Idempotent)

```bash
POST /scim/v2/Users
Content-Type: application/scim+json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "externalId": "ext-12345",
  "userName": "john.doe@example.com",
  "name": {
    "givenName": "John",
    "familyName": "Doe"
  },
  "emails": [
    { "value": "john.doe@example.com", "primary": true }
  ],
  "active": true,
  "roles": [
    { "value": "admin", "display": "Administrator" }
  ]
}
```

**Idempotency**: If `externalId` already exists, returns existing user (201).

**Response Headers**:
- `Location`: `/scim/v2/Users/{id}`
- `ETag`: `"{version}"`

---

#### Update User (PATCH)

```bash
PATCH /scim/v2/Users/{id}
Content-Type: application/scim+json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "active", "value": false },
    { "op": "add", "path": "roles", "value": [{ "value": "editor" }] }
  ]
}
```

**Operations**: `add`, `remove`, `replace`

---

#### Soft Delete User

```bash
DELETE /scim/v2/Users/{id}
```

**Effect**: Marks user as `active: false` (soft delete with audit trail).

---

#### Groups & Membership

```bash
POST /scim/v2/Groups
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "displayName": "Engineering",
  "members": [
    { "value": "user-uuid-1" },
    { "value": "user-uuid-2" }
  ]
}
```

**Membership Management**:
```bash
PATCH /scim/v2/Groups/{id}
{
  "Operations": [
    { "op": "add", "path": "members", "value": [{ "value": "user-uuid-3" }] },
    { "op": "remove", "path": "members", "value": [{ "value": "user-uuid-1" }] }
  ]
}
```

---

### 3. SSO Configuration

**Location**: `services/data-residency/src/routes/sso.ts`

#### Create SAML Config

```bash
POST /v1/sso/configs
{
  "tenantId": "tenant-uuid",
  "name": "Okta SAML",
  "type": "saml",
  "samlConfig": {
    "entityId": "https://acme.okta.com/saml2/default",
    "ssoUrl": "https://acme.okta.com/app/acme_teei/exk123/sso/saml",
    "certificate": "-----BEGIN CERTIFICATE-----\nMIIDXTCC...",
    "signRequests": true,
    "wantAssertionsSigned": true,
    "attributeMapping": {
      "email": "user.email",
      "firstName": "user.firstName",
      "lastName": "user.lastName"
    }
  }
}
```

---

#### Create OIDC Config

```bash
POST /v1/sso/configs
{
  "tenantId": "tenant-uuid",
  "name": "Azure AD OIDC",
  "type": "oidc",
  "oidcConfig": {
    "issuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
    "clientId": "client-id",
    "clientSecret": "client-secret",
    "authorizationEndpoint": "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize",
    "tokenEndpoint": "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token",
    "jwksUri": "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys",
    "scopes": ["openid", "profile", "email"]
  }
}
```

---

#### Test SSO Config

```bash
POST /v1/sso/configs/{configId}/test
```

**Tests Run**:
1. Entity ID / Issuer URL validation
2. Endpoint reachability
3. Certificate validity (SAML)
4. JWKS fetch (OIDC)
5. Metadata parsing

**Response**:
```json
{
  "success": true,
  "tests": [
    { "name": "Entity ID valid", "passed": true, "message": "Entity ID present" },
    { "name": "SSO URL reachable", "passed": true, "message": "SSO URL is valid" },
    { "name": "Certificate valid", "passed": true, "message": "Certificate is valid PEM format" }
  ],
  "errors": []
}
```

---

#### Get SP Metadata (for IdP config)

```bash
GET /v1/sso/metadata/{tenantId}
Accept: application/xml
```

**Response** (SAML XML):
```xml
<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://api.teei.io/sso/{tenantId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="https://api.teei.io/sso/{tenantId}/acs"
                              index="1" />
  </SPSSODescriptor>
</EntityDescriptor>
```

---

### 4. Entitlements & Plans

**Location**: `services/billing/src/routes/entitlements-admin.ts`

#### Available Plans

| Plan | Max Seats | Reports/Month | Storage | Features |
|------|-----------|---------------|---------|----------|
| **Starter** | 5 | 10 | 10 GB | Report Builder, PDF Export, CSV Export |
| **Professional** | 25 | 100 | 100 GB | + Boardroom Live, Forecast, Benchmarking, NLQ, API Access, PPTX Export |
| **Enterprise** | Unlimited | Unlimited | Unlimited | + Gen AI Reports, SSO, Custom Branding, Priority Support |

---

#### Get Tenant Entitlements

```bash
GET /admin/v2/entitlements/tenants/{tenantId}
```

**Response**:
```json
{
  "tenantId": "tenant-uuid",
  "plan": {
    "id": "professional",
    "name": "Professional",
    "tier": "professional",
    "features": [...],
    "quotas": {
      "maxSeats": 25,
      "maxReportsPerMonth": 100,
      "maxStorageGB": 100
    }
  },
  "addons": [
    { "id": "l2i_kintell", "name": "Learn-to-Impact: Kintell" }
  ],
  "customFeatures": [
    { "featureId": "gen_ai_reports", "enabled": true, "quotaOverride": null }
  ],
  "usage": {
    "seats": { "used": 18, "limit": 25, "unit": "users" },
    "reports": { "used": 45, "limit": 100, "unit": "reports/month" }
  }
}
```

---

#### Toggle Feature

```bash
PUT /admin/v2/entitlements/tenants/{tenantId}/features/{featureId}
{
  "enabled": true,
  "quotaOverride": 200
}
```

---

#### Attach Add-on

```bash
POST /admin/v2/entitlements/tenants/{tenantId}/addons
{
  "addonId": "l2i_full",
  "startDate": "2025-12-01"
}
```

**Available Add-ons**:
- `l2i_kintell`: Kintell microlearning platform
- `l2i_buddy`: Buddy program (peer mentoring)
- `l2i_full`: Complete L2I suite
- `advanced_analytics`: SROI, VIS, custom metrics
- `white_label`: Full branding customization

---

#### Active Connectors

```bash
GET /admin/v2/entitlements/tenants/{tenantId}/connectors
```

**Connectors** (filtered by plan + add-ons):
- Benevity (all plans)
- Goodera (all plans)
- Workday (all plans)
- Salesforce (requires `advanced_analytics` add-on)
- ServiceNow (requires `advanced_analytics` add-on)

---

### 5. Data Residency

**Location**: `services/data-residency/src/routes/residency.ts` (existing)

#### Assign Region

```bash
PUT /admin/v2/residency/tenants/{tenantId}
{
  "region": "eu-central-1",
  "lock": false
}
```

**Regions**:
- `us-east-1` (US East)
- `eu-central-1` (EU Central - Frankfurt)
- `uk-south-1` (UK South - London)

**Lock Behavior**: Once locked, region cannot be changed (prevents accidental data migration).

---

#### Validate Compliance

```bash
POST /admin/v2/residency/tenants/{tenantId}/validate
```

**Response**:
```json
{
  "compliant": true,
  "checkedAt": "2025-11-17T10:00:00Z",
  "violations": []
}
```

**Checks**:
- Database replica locations
- S3 bucket regions
- CDN edge locations
- Backup storage regions

---

### 6. RBAC & Permissions

**Admin Roles** (defined in `packages/entitlements`):

| Role | Tenants | SCIM | SSO | Billing | Residency | Secrets | Audit |
|------|---------|------|-----|---------|-----------|---------|-------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Billing Admin** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Identity Admin** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Enforcement**: Middleware in `services/api-gateway/src/routes/admin/index.ts`

**Usage**:
```typescript
import { AdminRole, hasAdminPermission } from '@teei/entitlements';

if (hasAdminPermission(adminRole, 'canManageTenants')) {
  // Allow action
}
```

---

### 7. API Reference

#### Base URL

- **Production**: `https://api.teei.io/admin/v2`
- **Staging**: `https://api-staging.teei.io/admin/v2`
- **Local**: `http://localhost:3000/admin/v2`

#### Authentication

```bash
Authorization: Bearer {jwt_token}
x-admin-role: owner
x-actor-id: admin-user-uuid
x-tenant-id: tenant-uuid (SCIM only)
```

#### Rate Limits

- **Read operations**: 100 req/min
- **Write operations**: 20 req/min
- **SCIM operations**: 60 req/min (per RFC 7644)

#### OpenAPI Spec

**Location**: `packages/openapi/admin.yaml`

**View**: https://api.teei.io/admin/v2/docs (Swagger UI)

---

### 8. Security & Compliance

#### Secrets Management

- **Client secrets**: Encrypted at rest with AES-256
- **API keys**: Stored in Vault (not in DB)
- **Certificates**: PEM format, validated before storage
- **Secret rotation**: Grace period for zero-downtime updates

#### Audit Logging

**Events Logged**:
- Tenant lifecycle changes (created, suspended, terminated)
- SCIM provisioning (user/group CRUD)
- SSO config changes
- Entitlement updates
- Secret rotations

**Audit Event Structure**:
```json
{
  "id": "event-uuid",
  "timestamp": "2025-11-17T10:00:00Z",
  "actor": {
    "id": "admin-uuid",
    "email": "admin@example.com",
    "ip": "192.168.1.1"
  },
  "action": "tenant.created",
  "resource": "tenant",
  "resourceId": "tenant-uuid",
  "tenantId": "tenant-uuid",
  "metadata": { "plan": "professional" },
  "outcome": "success"
}
```

#### SOC 2 Compliance

- ✅ Complete audit trail (Type II)
- ✅ Role-based access control
- ✅ Secret rotation policies
- ✅ Data residency controls
- ✅ Immutable audit logs (append-only)

#### GDPR Compliance

- ✅ Tenant termination with data export
- ✅ PII redaction in logs
- ✅ Regional data storage
- ✅ Snapshot retention (30 days)

---

### 9. Deployment

#### K8s Manifests

**Files Updated**:
- `k8s/services/unified-profile.yaml` (SCIM server)
- `k8s/services/data-residency.yaml` (SSO configs)
- `k8s/services/billing.yaml` (entitlements)
- `k8s/services/api-gateway.yaml` (admin routes)

**Environment Variables**:
```yaml
env:
  - name: PORT_UNIFIED_PROFILE
    value: "3001"
  - name: SCIM_ENABLED
    value: "true"
  - name: SSO_BASE_URL
    value: "https://api.teei.io"
  - name: ADMIN_JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: admin-secrets
        key: jwt-secret
```

---

#### CI/CD

**GitHub Actions** (`.github/workflows/admin-ci.yml`):

```yaml
name: Admin Studio v2 CI

on:
  push:
    paths:
      - 'services/unified-profile/**'
      - 'services/data-residency/**'
      - 'services/billing/**'
      - 'services/api-gateway/src/routes/admin/**'
      - 'packages/entitlements/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:scim
      - run: pnpm test:admin
      - run: pnpm test:e2e:admin
```

---

### 10. Testing

#### Unit Tests (SCIM Service)

**Location**: `services/unified-profile/src/__tests__/scim-service.test.ts`

**Coverage Target**: ≥85%

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { ScimService } from '../lib/scim-service';

describe('ScimService', () => {
  const service = new ScimService();

  it('should create user idempotently', async () => {
    const user = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: 'ext-123',
      userName: 'john@example.com',
      active: true,
    };

    const created1 = await service.createUser(user, 'tenant-1', 'admin');
    const created2 = await service.createUser(user, 'tenant-1', 'admin');

    expect(created1.id).toBe(created2.id);
  });
});
```

**Run**: `pnpm test:scim`

---

#### Contract Tests (SCIM Endpoints)

**Location**: `services/unified-profile/src/__tests__/scim-routes.test.ts`

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { build } from '../index';

describe('SCIM Routes', () => {
  it('should list users with filter', async () => {
    const app = await build();
    const response = await app.inject({
      method: 'GET',
      url: '/scim/v2/Users?filter=active eq true',
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
    expect(body.totalResults).toBeGreaterThanOrEqual(0);
  });
});
```

**Run**: `pnpm test:scim-routes`

---

#### E2E Tests (Admin Flows)

**Location**: `tests/e2e/admin/`

**Scenarios**:
1. Tenant lifecycle (create → suspend → reactivate → terminate)
2. SCIM user provisioning (create → update → delete)
3. SSO config (create SAML → test → enable)
4. Entitlements (change plan → toggle feature → attach add-on)

**Example** (Playwright):
```typescript
test('Tenant lifecycle: create, suspend, reactivate', async ({ request }) => {
  // Create tenant
  const createResponse = await request.post('/admin/v2/tenants', {
    data: { name: 'Test Tenant', slug: 'test-tenant', plan: 'starter', residencyRegion: 'us-east-1' },
  });
  expect(createResponse.ok()).toBeTruthy();
  const tenant = await createResponse.json();
  const tenantId = tenant.id;

  // Wait for provisioning
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Suspend
  const suspendResponse = await request.post(`/admin/v2/tenants/${tenantId}/suspend`, {
    data: { reason: 'Test suspension', notifyUsers: false },
  });
  expect(suspendResponse.ok()).toBeTruthy();

  // Reactivate
  const reactivateResponse = await request.post(`/admin/v2/tenants/${tenantId}/reactivate`);
  expect(reactivateResponse.ok()).toBeTruthy();
});
```

**Run**: `pnpm test:e2e:admin`

---

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start services
pnpm dev:unified-profile    # Port 3001 (SCIM server)
pnpm dev:data-residency     # Port 3002 (SSO configs)
pnpm dev:billing            # Port 3010 (entitlements)
pnpm dev:api-gateway        # Port 3000 (admin routes)

# Start UI
cd apps/corp-cockpit-astro
pnpm dev                    # Port 4321
```

### Access Admin Studio

**URL**: http://localhost:4321/en/admin

**Mock Admin Credentials** (dev only):
- **Email**: `admin@example.com`
- **Role**: `owner`
- **JWT**: (auto-generated on dev server start)

---

## Troubleshooting

### SCIM 401 Unauthorized

**Cause**: Missing or invalid JWT token.

**Fix**:
```bash
curl -H "Authorization: Bearer {jwt}" \
     -H "x-tenant-id: tenant-uuid" \
     https://api.teei.io/scim/v2/Users
```

---

### SSO Test Fails

**Cause**: Certificate format invalid.

**Fix**: Ensure PEM format with headers:
```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKH...
-----END CERTIFICATE-----
```

---

### Tenant Termination Blocked

**Cause**: Snapshot not completed.

**Fix**:
1. Check snapshot status: `GET /admin/v2/tenants/{tenantId}/snapshot/{snapshotId}`
2. Wait until `status: "completed"`
3. Retry termination with correct `snapshotId`

---

## Support

- **GitHub Issues**: https://github.com/teei/platform/issues
- **Slack**: `#admin-studio-support`
- **Email**: platform-support@teei.io

---

## Changelog

### v2.0.0 (2025-11-17)

**New**:
- ✅ SCIM 2.0 server with filtering, pagination, ETags
- ✅ SSO configuration (SAML + OIDC)
- ✅ Tenant lifecycle management
- ✅ Entitlements & plans API
- ✅ Data residency controls
- ✅ Admin RBAC (4 roles)
- ✅ Comprehensive audit logging
- ✅ Admin Studio v2 UI

**Services Updated**:
- `services/unified-profile`: SCIM routes
- `services/data-residency`: SSO routes
- `services/billing`: Entitlements routes
- `services/api-gateway`: Admin routes aggregator
- `packages/entitlements`: Admin roles

**Testing**:
- Unit tests: ≥85% coverage on SCIM service
- Contract tests: All SCIM endpoints
- E2E tests: Tenant lifecycle, SCIM, SSO flows

**Documentation**:
- OpenAPI spec: `packages/openapi/admin.yaml`
- This guide: `docs/admin/admin_studio_v2.md`

---

**Built by Worker 11** | Branch: `claude/worker11-admin-studio-v2-01X55XT3LLvNmL9TQxEvKUcn`
