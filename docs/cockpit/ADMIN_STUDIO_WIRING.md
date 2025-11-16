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

## Support

For issues or questions:
- GitHub Issues: https://github.com/teei/cockpit/issues
- Documentation: https://docs.teei.app/cockpit/admin-studio
- Support Email: support@teei.app
