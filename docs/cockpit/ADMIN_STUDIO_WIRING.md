# Admin Studio Wiring Guide

**Phase H3-B: Backend API Integration with RBAC**

## Overview

Admin Studio provides advanced administrative configuration capabilities for the Corporate Cockpit. Phase H3-B wires four critical features to real backend APIs with full CRUD operations, RBAC enforcement, and comprehensive audit logging.

## Features

### 1. Data Residency Selector
Manage where company data is stored and processed across global regions.

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

### Features
- **List Available Regions**: Display all supported data center locations
- **Current Configuration**: Show active residency region
- **Change with Confirmation**: Warning dialog for region changes
- **Compliance Frameworks**: Display supported frameworks per region
- **Latency Information**: Show expected latency for each region

### Data Model

```typescript
interface ResidencyRegion {
  id: string;              // "us-east-1", "eu-west-1", etc.
  name: string;            // "US East (Virginia)"
  code: string;            // "US-EAST"
  dataCenter: string;      // "AWS us-east-1"
  complianceFrameworks: string[]; // ["SOC2", "GDPR", "HIPAA"]
  latencyMs: number;       // Expected latency
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
    "complianceFrameworks": ["SOC2", "HIPAA"],
    "latencyMs": 50
  },
  {
    "id": "eu-west-1",
    "name": "Europe (Ireland)",
    "code": "EU-WEST",
    "dataCenter": "AWS eu-west-1",
    "complianceFrameworks": ["GDPR", "SOC2"],
    "latencyMs": 120
  }
]
```

#### Get Current Configuration

```http
GET /api/admin-studio/residency/{companyId}
Authorization: Bearer {token}
```

**Response**:
```json
{
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

**Response**:
```json
{
  "success": true,
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
    </button>
  </div>
)}
```

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

## Support

For issues or questions:
- Documentation: `/docs/cockpit/`
- API Docs: `/docs/api/`
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Last Updated**: 2025-11-16
**Phase**: H3-B
**Version**: 1.0.0
