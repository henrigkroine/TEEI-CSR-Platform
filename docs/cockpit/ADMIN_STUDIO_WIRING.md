<<<<<<< HEAD
# Admin Studio Wiring Guide (Phase H3-B)

## Overview

Admin Studio provides enterprise-grade administration capabilities for the TEEI Corporate Cockpit. Phase H3-B connects the UI components to backend APIs for data residency, embed tokens, and domain allowlisting.

## Components

### 1. Data Residency Selector

**Purpose**: Configure where company data is stored and processed, with compliance framework support.

**Location**: `src/components/admin/DataResidencySelector.tsx`

#### Features

- **Primary Region Selection**
  - Choose data storage location
  - View compliance badges (GDPR, ISO-27001, CCPA, etc.)
  - See estimated latency per region

- **Backup Regions**
  - Configure redundancy across multiple regions
  - Optional cross-border data transfer

- **Compliance Controls**
  - Enforce local processing
  - Restrict cross-border transfers
  - Track compliance frameworks

- **Audit Trail**
  - Last updated timestamp
  - Updated by user
  - Full audit log integration

#### API Integration

##### GET `/api/admin/residency/regions`

Returns available data regions.

**Response**:
```json
{
  "regions": [
    {
      "id": "eu-west-1",
      "name": "Europe (Ireland)",
      "code": "eu-west-1",
      "country": "Ireland",
      "compliance": ["GDPR", "ISO-27001", "SOC2"],
      "latency": 45,
      "available": true
    },
    {
      "id": "us-east-1",
      "name": "US East (Virginia)",
      "code": "us-east-1",
      "country": "United States",
      "compliance": ["SOC2", "ISO-27001", "HIPAA"],
      "latency": 25,
      "available": true
    }
  ]
}
```

##### GET `/api/admin/residency?companyId={id}`

Get current residency configuration for a company.

**Response**:
```json
{
  "primaryRegion": "eu-west-1",
  "backupRegions": ["eu-central-1"],
  "enforceLocalProcessing": true,
  "allowCrossBorderTransfer": false,
  "complianceFrameworks": ["GDPR", "ISO-27001"],
  "lastUpdated": "2025-11-16T10:30:00Z",
  "updatedBy": "admin@acme.com"
}
```

##### PUT `/api/admin/residency`

Update residency configuration.

**Request**:
```json
{
  "companyId": "acme-corp",
  "primaryRegion": "eu-west-1",
  "backupRegions": ["eu-central-1", "eu-west-2"],
  "enforceLocalProcessing": true,
  "allowCrossBorderTransfer": false
}
```

**Response**: Same as GET response with updated values.

#### RBAC

Requires `MANAGE_DATA_RESIDENCY` permission.

#### Usage

```tsx
<DataResidencySelector
  companyId="acme-corp"
  canEdit={hasPermission(user.role, 'MANAGE_DATA_RESIDENCY')}
  onUpdate={(config) => {
    console.log('Residency updated:', config);
  }}
/>
```

---

### 2. Embed Token Manager

**Purpose**: Create and manage secure tokens for embedding cockpit dashboards in external applications.

**Location**: `src/components/admin/EmbedTokenManager.tsx`

#### Features

- **Token Generation**
  - Named tokens with expiration
  - Configurable permissions
  - Usage limits

- **View Permissions**
  - Granular access control per view
  - Export permission toggle
  - Evidence access toggle

- **Token Management**
  - List all tokens
  - Revoke tokens
  - View usage statistics

- **Embed Code**
  - Auto-generated iframe code
  - One-click copy
  - Sandbox attributes for security

#### API Integration

##### GET `/api/admin/embed-tokens?companyId={id}`

List all embed tokens for a company.
=======
# Admin Studio Wiring Guide

**Phase H3-B: Backend API Integration with RBAC**

## Overview

Admin Studio provides enterprise-grade administration capabilities for the TEEI Corporate Cockpit. Phase H3-B connects the UI components to backend APIs for data residency, embed tokens, and domain allowlisting with full CRUD operations, RBAC enforcement, and comprehensive audit logging.

## Features

### 1. Data Residency Selector
Configure where company data is stored and processed across global regions, with compliance framework support.

### 2. Embed Token Manager
Create and manage authentication tokens for embedding dashboards in external applications.

### 3. Domain Allow-List Manager
Control which domains are authorized to embed dashboards.

### 4. Activity & Audit Stream
Real-time feed of administrative actions with live SSE updates.

## Architecture

### Component Structure

```
admin-studio.astro                    # Page entry point
  ├─ DataResidencySelector.tsx        # Region selection
  ├─ EmbedTokenManager.tsx            # Token CRUD
  ├─ DomainAllowListManager.tsx       # Domain management
  └─ ActivityStream.tsx               # Audit log stream
```

### Backend API Endpoints

```
/api/admin-studio/
  ├─ residency/
  │    ├─ GET  /regions                    # List available regions
  │    ├─ GET  /{companyId}                # Get current config
  │    └─ PUT  /{companyId}                # Update residency
  │
  ├─ embed-tokens/
  │    ├─ GET    /{companyId}              # List tokens
  │    ├─ POST   /{companyId}              # Create token
  │    └─ DELETE /{companyId}/{tokenId}    # Revoke token
  │
  ├─ domain-allowlist/
  │    ├─ GET    /{companyId}              # List domains
  │    ├─ POST   /{companyId}              # Add domain
  │    └─ DELETE /{companyId}/{domainId}   # Remove domain
  │
  └─ audit/
       ├─ GET  /{companyId}                # Historical events
       └─ SSE  /stream/{companyId}         # Live stream
```

## 1. Data Residency Selector

### Purpose
Allow administrators to configure where company data is stored and processed, ensuring compliance with data sovereignty regulations (GDPR, CCPA, etc.).

### Component: `DataResidencySelector.tsx`

**Location**: `src/components/admin/DataResidencySelector.tsx`

### Features
- **Primary Region Selection**: Choose data storage location
- **Compliance Badges**: View compliance frameworks (GDPR, ISO-27001, SOC2, CCPA, HIPAA, etc.)
- **Latency Information**: See estimated latency per region
- **Backup Regions**: Configure redundancy across multiple regions
- **Compliance Controls**: Enforce local processing, restrict cross-border transfers
- **Change with Confirmation**: Warning dialog for region changes
- **Audit Trail**: Last updated timestamp, updated by user, full audit log integration

### Data Model

```typescript
interface ResidencyRegion {
  id: string;              // "us-east-1", "eu-west-1", etc.
  name: string;            // "US East (Virginia)"
  code: string;            // "US-EAST"
  dataCenter: string;      // "AWS us-east-1"
  country: string;         // "United States"
  complianceFrameworks: string[]; // ["SOC2", "GDPR", "HIPAA"]
  latencyMs: number;       // Expected latency
  available: boolean;      // Region availability
}
```

### API Integration

#### Get Available Regions

```http
GET /api/admin-studio/residency/regions
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "id": "us-east-1",
    "name": "US East (Virginia)",
    "code": "US-EAST",
    "dataCenter": "AWS us-east-1",
    "country": "United States",
    "complianceFrameworks": ["SOC2", "HIPAA", "ISO-27001"],
    "latencyMs": 50,
    "available": true
  },
  {
    "id": "eu-west-1",
    "name": "Europe (Ireland)",
    "code": "EU-WEST",
    "dataCenter": "AWS eu-west-1",
    "country": "Ireland",
    "complianceFrameworks": ["GDPR", "SOC2", "ISO-27001"],
    "latencyMs": 120,
    "available": true
  }
]
```

#### Get Current Configuration

```http
GET /api/admin-studio/residency/{companyId}
Authorization: Bearer {token}
```
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

**Response**:
```json
{
  "tokens": [
    {
      "id": "tok_abc123",
      "name": "Marketing Dashboard Embed",
      "token": "embed_live_xyz789...",
      "createdAt": "2025-11-01T10:00:00Z",
      "expiresAt": "2026-02-01T10:00:00Z",
      "createdBy": "admin@acme.com",
      "permissions": {
        "views": ["dashboard", "impact", "trends"],
        "allowExport": false,
        "allowEvidence": false
      },
      "restrictions": {
        "maxRequests": 10000,
        "requestCount": 2450,
        "lastUsedAt": "2025-11-16T09:15:00Z"
      },
      "status": "active"
    }
  ]
}
```

##### POST `/api/admin/embed-tokens`

Create a new embed token.

**Request**:
```json
{
  "companyId": "acme-corp",
  "name": "Marketing Dashboard Embed",
  "expiresAt": "2026-02-01T10:00:00Z",
  "permissions": {
    "views": ["dashboard", "impact"],
    "allowExport": false,
    "allowEvidence": false
  },
  "restrictions": {
    "maxRequests": 10000
  }
}
```

**Response**: Created token object (same schema as GET).

##### DELETE `/api/admin/embed-tokens/:id`

Revoke an embed token.

<<<<<<< HEAD
=======
  "companyId": "comp-123",
  "regionId": "us-east-1",
  "updatedAt": "2025-11-15T10:30:00Z",
  "updatedBy": "admin@example.com"
}
```

#### Update Residency

```http
PUT /api/admin-studio/residency/{companyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "regionId": "eu-west-1"
}
```

>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
**Response**:
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

##### PUT `/api/admin/embed-tokens/:id`

Update token permissions (NOT YET IMPLEMENTED - future enhancement).

#### RBAC

Requires `MANAGE_EMBED_TOKENS` permission.

#### Embed Code Format

```html
<!-- TEEI Corporate Cockpit Embed -->
<iframe
  src="https://teei.app/embed?token=embed_live_xyz789"
  width="100%"
  height="600"
  frameborder="0"
  allow="fullscreen"
  sandbox="allow-scripts allow-same-origin"
  title="TEEI Corporate Cockpit"
></iframe>
```

#### Usage

```tsx
<EmbedTokenManager
  companyId="acme-corp"
  canManage={hasPermission(user.role, 'MANAGE_EMBED_TOKENS')}
/>
```

---

### 3. Domain Allowlist Manager (Planned H3-B)

**Purpose**: Control which domains can embed cockpit dashboards via iframe.

**Status**: Component skeleton ready, full implementation in progress.

#### Planned Features

- **Domain Management**
  - Add/remove allowed domains
  - Wildcard support (*.example.com)
  - Domain verification

- **CORS Configuration**
  - Auto-configure CORS headers
  - CSP frame-ancestors directive

- **Security**
  - Prevent clickjacking
  - XSS protection
  - Audit all domain changes

#### Planned API

##### GET `/api/admin/domain-allowlist?companyId={id}`
##### POST `/api/admin/domain-allowlist`
##### DELETE `/api/admin/domain-allowlist/:domain`

---

## Admin Studio Page

**Route**: `/[lang]/cockpit/[companyId]/admin/studio`

### Layout

```astro
---
import DataResidencySelector from '@/components/admin/DataResidencySelector';
import EmbedTokenManager from '@/components/admin/EmbedTokenManager';
import DomainAllowlistManager from '@/components/admin/DomainAllowlistManager';
---

<BaseLayout title="Admin Studio">
  <div class="admin-studio-grid">
    <!-- Section 1: Data Residency -->
    <section>
      <h2>Data Residency</h2>
      <DataResidencySelector
        companyId={companyId}
        canEdit={canManageResidency}
        client:load
      />
    </section>

    <!-- Section 2: Embed Tokens -->
    <section>
      <h2>Embed Tokens</h2>
      <EmbedTokenManager
        companyId={companyId}
        canManage={canManageTokens}
        client:load
      />
    </section>

    <!-- Section 3: Domain Allowlist -->
    <section>
      <h2>Domain Allowlist</h2>
      <DomainAllowlistManager
        companyId={companyId}
        canManage={canManageDomains}
        client:load
      />
    </section>
  </div>
</BaseLayout>
```

## Acceptance Criteria (AC)

### Data Residency

- [x] CRUD operations work with RBAC enforcement
- [x] Audit log line created per action
- [x] Zero unsafe navigation warnings
- [x] Forms are fully accessible (keyboard + screen reader)
- [ ] Integration tests pass (90% coverage)

### Embed Tokens

- [x] CRUD operations work with RBAC enforcement
- [x] Token generation includes expiration
- [x] Usage statistics tracked
- [x] Copy functionality works
- [ ] Integration tests pass (90% coverage)

### Domain Allowlist

- [ ] CRUD operations work with RBAC enforcement (in progress)
- [ ] Domain validation implemented
- [ ] CORS headers auto-configured
- [ ] Audit log integration

## Security Considerations

### Data Residency

1. **Validation**: Ensure selected regions are available and compliant
2. **Audit**: Log all residency changes with user attribution
3. **RBAC**: Enforce `MANAGE_DATA_RESIDENCY` permission
4. **Encryption**: Encrypt configuration data at rest

### Embed Tokens

1. **Token Format**: Use cryptographically secure random tokens
2. **Expiration**: Enforce token expiration (no infinite tokens)
3. **Rate Limiting**: Track and limit token usage
4. **Revocation**: Support immediate token revocation
5. **Permissions**: Granular view-level permissions
6. **Audit**: Log token creation, usage, and revocation

### Domain Allowlist

1. **Validation**: Verify domain ownership before adding
2. **Wildcards**: Carefully validate wildcard patterns
3. **CSP**: Set strict `frame-ancestors` directive
4. **HTTPS**: Enforce HTTPS for embedded views
5. **Audit**: Log all allowlist changes

## Performance

### Metrics

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Load residency config | < 500ms | API response time |
| Save residency config | < 1s | PUT request |
| Load embed tokens | < 500ms | API response time |
| Create embed token | < 1s | POST request |
| Token validation | < 100ms | Middleware check |

### Optimization

- **Caching**: Cache residency config for 5 minutes
- **Pagination**: Paginate token lists (50 per page)
- **Lazy Loading**: Load components on-demand
- **Debouncing**: Debounce search/filter inputs

## Error Handling

### User-Facing Errors

```tsx
// Example error display
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
    <div className="text-red-800 text-sm">{error}</div>
    <button
      onClick={retry}
      className="mt-2 text-sm text-red-700 underline"
    >
      Retry
<<<<<<< HEAD
=======
  "migrationId": "mig-456",
  "estimatedCompletionTime": "2025-11-16T14:00:00Z"
}
```

### RBAC Enforcement

**Required Permission**: `MANAGE_DATA_RESIDENCY`

```typescript
if (!hasPermission(user.role, 'MANAGE_DATA_RESIDENCY')) {
  return Response.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

### Audit Logging

Every residency change generates an audit log:

```json
{
  "action": "residency.update",
  "resource": "eu-west-1",
  "userId": "user-123",
  "userName": "John Admin",
  "details": {
    "previousRegion": "us-east-1",
    "newRegion": "eu-west-1",
    "migrationId": "mig-456"
  },
  "severity": "critical",
  "timestamp": "2025-11-16T10:35:00Z"
}
```

### Confirmation Dialog

```tsx
<div className="warning-box">
  <strong>⚠️ Warning:</strong> This change will:
  <ul>
    <li>Trigger immediate data migration</li>
    <li>Generate a compliance audit entry</li>
    <li>May affect service availability during migration</li>
  </ul>
</div>
```

### Error Handling

```typescript
try {
  await updateResidency.mutate(regionId);
} catch (error) {
  // Display user-friendly error
  setError('Failed to update residency. Please contact support.');

  // Log detailed error
  console.error('[DataResidency] Update failed:', error);
}
```

## 2. Embed Token Manager

### Purpose
Create and manage authentication tokens for embedding dashboards in external applications (e.g., customer portals, internal tools).

### Component: `EmbedTokenManager.tsx`

### Features
- **Create Tokens**: Generate new embed authentication tokens
- **List Tokens**: View all active and revoked tokens
- **Usage Tracking**: Monitor token usage and last access time
- **Revoke Tokens**: Immediately invalidate tokens
- **One-Time Display**: Tokens shown only once at creation

### Data Model

```typescript
interface EmbedToken {
  id: string;              // "tok-abc123"
  name: string;            // User-defined name
  token: string;           // JWT token (only shown once)
  createdAt: string;       // ISO 8601
  expiresAt: string | null; // Optional expiration
  lastUsedAt: string | null;
  usageCount: number;      // Total requests
  scopes: string[];        // ["read:dashboards", "read:reports"]
  isActive: boolean;       // false if revoked
}
```

### API Integration

#### List Tokens

```http
GET /api/admin-studio/embed-tokens/{companyId}
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "id": "tok-123",
    "name": "Production Dashboard",
    "token": "***", // Redacted
    "createdAt": "2025-11-01T10:00:00Z",
    "expiresAt": null,
    "lastUsedAt": "2025-11-16T09:45:00Z",
    "usageCount": 1523,
    "scopes": ["read:dashboards"],
    "isActive": true
  }
]
```

#### Create Token

```http
POST /api/admin-studio/embed-tokens/{companyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Customer Portal",
  "scopes": ["read:dashboards", "read:reports"]
}
```

**Response**:
```json
{
  "id": "tok-456",
  "name": "Customer Portal",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2025-11-16T10:30:00Z",
  "expiresAt": null,
  "scopes": ["read:dashboards", "read:reports"],
  "isActive": true
}
```

#### Revoke Token

```http
DELETE /api/admin-studio/embed-tokens/{companyId}/{tokenId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "revokedAt": "2025-11-16T10:35:00Z"
}
```

### RBAC Enforcement

**Required Permission**: `MANAGE_EMBED_TOKENS`

### Security Best Practices

1. **One-Time Display**: Token shown only once at creation
2. **Secure Storage**: Never log or display full tokens
3. **Scope Limitation**: Minimum required scopes
4. **Expiration**: Consider setting `expiresAt` for tokens
5. **Revocation**: Immediate token invalidation

### Token Display (One-Time)

```tsx
{showToken && (
  <div className="token-reveal">
    <p className="token-reveal-title">
      ⚠️ Save this token now - it won't be shown again!
    </p>
    <code className="token-code">{showToken}</code>
    <button onClick={() => setShowToken(null)}>
      I've saved the token
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
    </button>
  </div>
)}
```

### API Error Codes

| Code | Message | Action |
|------|---------|--------|
| 400 | Invalid request | Show validation errors |
| 401 | Unauthorized | Redirect to login |
| 403 | Insufficient permissions | Show permission error |
| 404 | Not found | Show "not found" message |
| 429 | Rate limited | Show retry after message |
| 500 | Internal error | Show generic error + support link |

## Testing

### Unit Tests

```typescript
describe('DataResidencySelector', () => {
  it('loads regions on mount', async () => {
    // Test region loading
  });

  it('enforces RBAC for editing', () => {
    // Test permission check
  });

  it('validates region selection', () => {
    // Test validation
  });
});
```

### Integration Tests

```typescript
describe('Admin Studio API', () => {
  it('creates residency config', async () => {
    const response = await api.put('/api/admin/residency', {
      companyId: 'test',
      primaryRegion: 'eu-west-1',
    });

    expect(response.status).toBe(200);
    expect(response.data.primaryRegion).toBe('eu-west-1');
  });

  it('creates embed token', async () => {
    const response = await api.post('/api/admin/embed-tokens', {
      companyId: 'test',
      name: 'Test Token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(response.status).toBe(201);
    expect(response.data.token).toBeTruthy();
  });
});
```

### E2E Tests (Playwright)

```typescript
test('Admin can configure data residency', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/admin/studio');

  // Select primary region
  await page.click('[data-testid="region-eu-west-1"]');

  // Save
  await page.click('[data-testid="save-residency"]');

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});

test('Admin can create embed token', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/admin/studio');

  // Open create dialog
  await page.click('[data-testid="create-token-btn"]');

  // Fill form
  await page.fill('[name="name"]', 'Test Embed Token');
  await page.check('[name="view-dashboard"]');

  // Create
  await page.click('[data-testid="create-btn"]');

  // Verify token appears in list
  await expect(page.locator('text=Test Embed Token')).toBeVisible();
});
```

## Troubleshooting

### Data Residency

**Problem**: Regions not loading

**Solutions**:
1. Check API endpoint is reachable: `/api/admin/residency/regions`
2. Verify backend service is running
3. Check CORS configuration
4. Review browser console for errors

**Problem**: Save fails with 403

**Solutions**:
1. Verify user has `MANAGE_DATA_RESIDENCY` permission
2. Check JWT token is valid
3. Review audit logs for permission denials

### Embed Tokens

**Problem**: Token creation fails

**Solutions**:
1. Check token expiration is in the future
2. Ensure at least one view is selected
3. Verify unique token name
4. Check rate limits

**Problem**: Embed doesn't load

**Solutions**:
1. Verify token is active (not expired/revoked)
2. Check domain is allowlisted
3. Verify CORS headers
4. Check browser console for CSP violations

## Best Practices

### For Administrators

1. **Data Residency**
   - Review compliance requirements before selecting regions
   - Test backup regions for failover
   - Document residency decisions for audits

2. **Embed Tokens**
   - Use descriptive token names
   - Set reasonable expiration dates (90 days default)
   - Regularly review and revoke unused tokens
   - Monitor usage statistics

3. **Domain Allowlist**
   - Only allowlist trusted domains
   - Use specific domains over wildcards
   - Verify domain ownership before adding
   - Audit allowlist quarterly

### For Developers

1. **API Integration**
   - Always handle loading and error states
   - Implement optimistic updates where appropriate
   - Cache API responses (with invalidation)
   - Use React Query for data fetching

2. **Security**
   - Never log full tokens
   - Validate all user inputs
   - Enforce RBAC at API layer (not just UI)
   - Audit all sensitive operations

3. **Performance**
   - Debounce search/filter inputs
   - Paginate large lists
   - Lazy load heavy components
   - Monitor API response times

## Future Enhancements

Planned for future phases:

- [ ] Domain allowlist full implementation
- [ ] SSO configuration UI
- [ ] SCIM provisioning UI
- [ ] Advanced audit log viewer
- [ ] Usage analytics dashboard
- [ ] Automated compliance reporting
- [ ] Multi-region failover testing
- [ ] Token rotation automation
<<<<<<< HEAD
=======
### Audit Logging

```json
{
  "action": "embed-token.create",
  "resource": "tok-456",
  "details": {
    "tokenName": "Customer Portal",
    "scopes": ["read:dashboards"],
    "expiresAt": null
  },
  "severity": "warning"
}
```

## 3. Domain Allow-List Manager

### Purpose
Control which domains are authorized to embed dashboards via `<iframe>` or direct embedding.

### Component: `DomainAllowListManager.tsx`

### Features
- **Add Domains**: Validate and add authorized domains
- **List Domains**: View all allowed domains
- **Remove Domains**: Revoke domain authorization
- **Validation**: Ensure valid domain format
- **Audit Trail**: Track who added/removed domains

### Data Model

```typescript
interface AllowedDomain {
  id: string;              // "dom-123"
  domain: string;          // "example.com"
  addedAt: string;         // ISO 8601
  addedBy: string;         // User email
  isActive: boolean;       // false if removed
}
```

### API Integration

#### List Domains

```http
GET /api/admin-studio/domain-allowlist/{companyId}
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "id": "dom-123",
    "domain": "example.com",
    "addedAt": "2025-11-10T14:20:00Z",
    "addedBy": "admin@company.com",
    "isActive": true
  },
  {
    "id": "dom-124",
    "domain": "portal.customer.com",
    "addedAt": "2025-11-12T09:15:00Z",
    "addedBy": "admin@company.com",
    "isActive": true
  }
]
```

#### Add Domain

```http
POST /api/admin-studio/domain-allowlist/{companyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "domain": "newportal.com"
}
```

**Response**:
```json
{
  "id": "dom-125",
  "domain": "newportal.com",
  "addedAt": "2025-11-16T10:40:00Z",
  "addedBy": "admin@company.com",
  "isActive": true
}
```

#### Remove Domain

```http
DELETE /api/admin-studio/domain-allowlist/{companyId}/{domainId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "removedAt": "2025-11-16T10:45:00Z"
}
```

### Domain Validation

```typescript
const validateDomain = (domain: string): boolean => {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
};
```

**Valid Examples**:
- ✅ `example.com`
- ✅ `subdomain.example.com`
- ✅ `portal.customer.co.uk`

**Invalid Examples**:
- ❌ `http://example.com` (includes protocol)
- ❌ `example.com/path` (includes path)
- ❌ `-example.com` (starts with hyphen)

### RBAC Enforcement

**Required Permission**: `MANAGE_DOMAIN_ALLOWLIST`

### CORS Integration

The domain allow-list is used to configure CORS headers:

```typescript
// Backend middleware
const allowedOrigins = await getDomainAllowlist(companyId);

res.setHeader(
  'Access-Control-Allow-Origin',
  allowedOrigins.includes(origin) ? origin : 'null'
);
```

### Audit Logging

```json
{
  "action": "domain.add",
  "resource": "newportal.com",
  "details": {
    "domain": "newportal.com",
    "purpose": "Customer portal embedding"
  },
  "severity": "warning"
}
```

## 4. Activity & Audit Stream

### Purpose
Provide real-time visibility into all administrative actions with live SSE updates and historical log access.

### Component: `ActivityStream.tsx`

### Features
- **Live Updates**: SSE stream of real-time events
- **Historical Log**: Query past 50 events
- **Severity Filtering**: Filter by info/warning/critical
- **Detailed Metadata**: Expandable event details
- **User Attribution**: Track who performed each action

### Data Model

```typescript
interface ActivityEvent {
  id: string;
  timestamp: string;
  action: string;          // "residency.update", "embed-token.create", etc.
  resource: string;        // Resource identifier
  userId: string;
  userName: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}
```

### API Integration

#### Historical Events

```http
GET /api/admin-studio/audit/{companyId}?limit=50
Authorization: Bearer {token}
```

**Response**:
```json
[
  {
    "id": "evt-123",
    "timestamp": "2025-11-16T10:35:00Z",
    "action": "residency.update",
    "resource": "eu-west-1",
    "userId": "user-123",
    "userName": "John Admin",
    "details": {
      "previousRegion": "us-east-1",
      "newRegion": "eu-west-1"
    },
    "severity": "critical"
  },
  {
    "id": "evt-124",
    "timestamp": "2025-11-16T10:40:00Z",
    "action": "embed-token.create",
    "resource": "tok-456",
    "userId": "user-123",
    "userName": "John Admin",
    "details": {
      "tokenName": "Customer Portal"
    },
    "severity": "warning"
  }
]
```

#### Live Stream (SSE)

```http
GET /api/admin-studio/audit/stream/{companyId}
Authorization: Bearer {token}
Accept: text/event-stream
```

**Event Format**:
```
event: audit-event
data: {"id":"evt-125","action":"domain.add",...}
id: evt-125

event: audit-event
data: {"id":"evt-126","action":"domain.remove",...}
id: evt-126
```

### SSE Integration

```typescript
const { subscribe } = useSSEConnection({
  companyId,
  channel: 'admin-audit',
  autoConnect: true,
  enablePollingFallback: true,
});

useEffect(() => {
  const unsubscribe = subscribe((event) => {
    const activityEvent = JSON.parse(event.data);
    setLiveEvents((prev) => [activityEvent, ...prev]);
  });

  return unsubscribe;
}, [subscribe]);
```

### Severity Indicators

- **Critical** (🔴): Data residency changes, system configuration
- **Warning** (🟡): Token creation/revocation, domain changes
- **Info** (🔵): Routine operations, read-only actions

### Action Labels

```typescript
const actionLabels = {
  'residency.update': 'Updated data residency',
  'embed-token.create': 'Created embed token',
  'embed-token.revoke': 'Revoked embed token',
  'domain.add': 'Added allowed domain',
  'domain.remove': 'Removed allowed domain',
};
```

### RBAC Enforcement

**Required Permission**: `VIEW_AUDIT_LOG`

### Filtering

```tsx
<div className="filter-buttons">
  <button onClick={() => setFilter('all')}>All</button>
  <button onClick={() => setFilter('info')}>Info</button>
  <button onClick={() => setFilter('warning')}>Warning</button>
  <button onClick={() => setFilter('critical')}>Critical</button>
</div>
```

## Acceptance Criteria

### ✅ CRUD Works with RBAC
- All operations check user permissions before execution
- Unauthorized requests return 403 Forbidden
- Permissions enforced at both frontend and backend

### ✅ Audit Log Line Per Action
- Every create/update/delete generates audit event
- Events include timestamp, user, resource, and details
- Severity level assigned based on action type

### ✅ Zero Unsafe Navigation
- All navigation uses Astro routing
- No direct DOM manipulation or `window.location.href`
- Form submissions use `fetch` API
- Proper error handling prevents navigation on failure

### ✅ Forms A11y Complete
- All inputs have `<label>` or `aria-label`
- Error messages use `aria-invalid` and `aria-describedby`
- Focus management on dialogs (`role="dialog"`)
- Keyboard navigation fully supported

## Permissions Matrix

| Feature | Permission | Roles |
|---------|-----------|-------|
| Data Residency | `MANAGE_DATA_RESIDENCY` | SuperAdmin |
| Embed Tokens | `MANAGE_EMBED_TOKENS` | Admin, SuperAdmin |
| Domain Allow-List | `MANAGE_DOMAIN_ALLOWLIST` | Admin, SuperAdmin |
| Audit Log (View) | `VIEW_AUDIT_LOG` | Admin, SuperAdmin, Viewer |

## Error Handling

### Network Errors

```typescript
try {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
} catch (error) {
  console.error('[AdminStudio] Network error:', error);
  setError('Failed to connect. Please check your network.');
}
```

### Validation Errors

```typescript
if (!validateDomain(domain)) {
  setValidationError('Invalid domain format');
  return;
}
```

### Permission Errors

```typescript
if (response.status === 403) {
  setError('You do not have permission to perform this action.');
}
```

## Testing

### E2E Tests

```bash
pnpm e2e:run tests/e2e/admin-studio.spec.ts
```

**Coverage**:
- ✅ Data residency selector (view, change with confirmation)
- ✅ Embed token manager (create, list, revoke)
- ✅ Domain allow-list (add, list, remove)
- ✅ Activity stream (historical + live updates)
- ✅ RBAC enforcement (permissions checked)

### Unit Tests

```bash
pnpm test src/components/admin-studio/
```

## Security Best Practices

1. **Input Validation**: All inputs validated on frontend and backend
2. **RBAC Enforcement**: Permissions checked before all operations
3. **Audit Logging**: Complete trail of all administrative actions
4. **Token Security**: One-time display, secure storage
5. **CORS Control**: Domain allow-list enforces embedding restrictions

## Migration Notes

### From Basic Admin Console

Admin Studio is an enhancement to the existing Admin Console:
- Basic features remain in `/admin`
- Advanced features in `/admin-studio`
- No breaking changes to existing functionality

## Future Enhancements

- [ ] Bulk token operations
- [ ] Token expiration policies
- [ ] Advanced audit log search (full-text, date ranges)
- [ ] Webhook notifications for critical events
- [ ] Multi-region failover configuration
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp

## Support

For issues or questions:
- GitHub Issues: https://github.com/teei/cockpit/issues
- Documentation: https://docs.teei.app/cockpit/admin-studio
- Support Email: support@teei.app
<<<<<<< HEAD
=======
- Documentation: `/docs/cockpit/`
- API Docs: `/docs/api/`
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Last Updated**: 2025-11-16
**Phase**: H3-B
**Version**: 1.0.0
>>>>>>> origin/claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp
