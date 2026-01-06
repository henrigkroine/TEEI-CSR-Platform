# API Integration Guide

This directory contains API client modules for connecting Corporate Cockpit frontend components to backend services.

## Identity API Client

**File**: `identity.ts`

### Overview

The Identity API client provides functions for interacting with Worker-1 platform's identity and SSO services. It handles:

- SSO configuration (SAML and OIDC)
- SCIM provisioning configuration
- SCIM sync testing
- Role mappings

### Features

- **Feature Flag Support**: Toggle between real API and mock data using environment variables
- **Type Safety**: Full TypeScript support with interfaces matching API spec
- **Error Handling**: Standardized error handling with helpful error messages
- **Development Mode**: Automatic fallback to mock data when API is unavailable
- **Authentication**: Bearer token support for authenticated requests

### Configuration

#### Environment Variables

Add these to your `.env` file:

```bash
# Identity Service URL (Worker-1 platform identity/SSO service)
IDENTITY_SERVICE_URL=http://localhost:3000/v1/identity
PUBLIC_IDENTITY_SERVICE_URL=http://localhost:3000/v1/identity

# Feature Flag: Set to 'true' to use real Identity API instead of mock data
USE_REAL_IDENTITY_API=false
PUBLIC_USE_REAL_IDENTITY_API=false
```

**Note**: Both `IDENTITY_SERVICE_URL` and `PUBLIC_IDENTITY_SERVICE_URL` are needed because:
- `IDENTITY_SERVICE_URL` is used on the server side
- `PUBLIC_IDENTITY_SERVICE_URL` is used on the client side (Astro's `import.meta.env.PUBLIC_*` pattern)

### Usage

#### Get SSO Configuration

```typescript
import { getSSOConfig } from '@/api/identity';

async function loadSSOConfig(companyId: string) {
  try {
    const config = await getSSOConfig(companyId);
    console.log('SAML enabled:', config.saml.enabled);
    console.log('OIDC enabled:', config.oidc.enabled);
  } catch (error) {
    console.error('Failed to load SSO config:', error);
  }
}
```

#### Get SCIM Configuration

```typescript
import { getSCIMConfig } from '@/api/identity';

async function loadSCIMConfig(companyId: string) {
  try {
    const config = await getSCIMConfig(companyId);
    console.log('SCIM endpoint:', config.scim.endpoint);
    console.log('Last sync:', config.scim.lastSyncAt);
    console.log('Role mappings:', config.scim.roleMappings);
  } catch (error) {
    console.error('Failed to load SCIM config:', error);
  }
}
```

#### Test SCIM Sync

```typescript
import { testSCIMSync } from '@/api/identity';

async function runTest(companyId: string) {
  try {
    const result = await testSCIMSync(companyId);
    console.log('Users found:', result.usersFound);
    console.log('Groups found:', result.groupsFound);
    console.log('Latency:', result.latency, 'ms');

    if (result.errors.length > 0) {
      console.error('Sync errors:', result.errors);
    }
  } catch (error) {
    console.error('Failed to test sync:', error);
  }
}
```

#### Using the API Client Class

For more advanced usage, you can instantiate the `IdentityApiClient` class:

```typescript
import { createIdentityApiClient } from '@/api/identity';

const authToken = 'your-jwt-token';
const client = createIdentityApiClient(authToken);

// Make authenticated requests
const ssoConfig = await client.getSSOConfig('company-id');
const scimConfig = await client.getSCIMConfig('company-id');
const testResult = await client.testSCIMSync('company-id');
```

### Error Handling

The API client provides helper functions for error handling:

```typescript
import { getErrorMessage, isApiError } from '@/api/identity';

try {
  await getSSOConfig(companyId);
} catch (error) {
  if (isApiError(error)) {
    console.error('API Error:', error.error);
    console.error('Status Code:', error.statusCode);
    console.error('Message:', error.message);
  } else {
    console.error('Unknown error:', getErrorMessage(error));
  }
}
```

### Mock Data Mode

When `USE_REAL_IDENTITY_API=false` or when the API is unavailable:

- The client automatically falls back to mock data
- Console warnings are shown in development mode
- Mock data matches the expected API response format
- Useful for local development without backend dependencies

### API Endpoints (Backend Implementation Required)

The Identity API client expects these endpoints on Worker-1:

#### 1. Get SSO Configuration
```
GET /v1/identity/sso-config/{companyId}
```

**Response**:
```json
{
  "companyId": "uuid",
  "saml": {
    "enabled": true,
    "entity_id": "https://teei.io/saml/metadata/acme",
    "acs_url": "https://teei.io/saml/acs",
    "metadata_url": "https://teei.io/saml/metadata/acme",
    "certificate_fingerprint": "A1:B2:C3:...",
    "sign_requests": true,
    "want_assertions_signed": true,
    "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  },
  "oidc": {
    "enabled": false,
    "issuer": "https://accounts.google.com",
    "client_id": "1234567890.apps.googleusercontent.com",
    "redirect_uri": "https://teei.io/auth/oidc/callback",
    "scopes": ["openid", "email", "profile"],
    "response_type": "code",
    "grant_type": "authorization_code"
  }
}
```

#### 2. Get SCIM Configuration
```
GET /v1/identity/scim-config/{companyId}
```

**Response**:
```json
{
  "companyId": "uuid",
  "scim": {
    "enabled": true,
    "version": "2.0",
    "endpoint": "https://teei.io/scim/v2",
    "token": "scim_abc123_redacted",
    "lastSyncAt": "2024-11-14T09:00:00Z",
    "syncStatus": "success",
    "roleMappings": [
      {
        "externalRoleId": "okta-admin",
        "internalRoleId": "company-admin",
        "description": "Full admin access"
      }
    ]
  }
}
```

#### 3. Test SCIM Sync
```
POST /v1/identity/scim-config/{companyId}/test-sync
```

**Response**:
```json
{
  "success": true,
  "usersFound": 42,
  "groupsFound": 5,
  "latency": 127,
  "errors": []
}
```

### Future Enhancements

The following API endpoints are referenced in components but not yet implemented:

1. **SCIM Role Mapping CRUD**:
   - `POST /v1/identity/scim-config/{companyId}/role-mappings` - Create mapping
   - `PUT /v1/identity/scim-config/{companyId}/role-mappings/{id}` - Update mapping
   - `DELETE /v1/identity/scim-config/{companyId}/role-mappings/{id}` - Delete mapping

2. **SCIM Metrics & Errors**:
   - `GET /v1/identity/scim-config/{companyId}/metrics` - Detailed sync metrics
   - `GET /v1/identity/scim-config/{companyId}/errors` - Error logs

These would enhance the functionality of `SCIMRoleMappingEditor` and `SCIMStatus` components.

### Testing

To test the integration:

1. **With Mock Data** (default):
   ```bash
   # In .env
   USE_REAL_IDENTITY_API=false
   ```

   All components will use mock data. Check browser console for warnings.

2. **With Real API**:
   ```bash
   # In .env
   USE_REAL_IDENTITY_API=true
   IDENTITY_SERVICE_URL=http://localhost:3000/v1/identity
   ```

   Components will attempt real API calls and fall back to mock on error.

3. **Production**:
   ```bash
   # In .env.production
   USE_REAL_IDENTITY_API=true
   IDENTITY_SERVICE_URL=https://api.teei-platform.com/v1/identity
   ```

### Components Using Identity API

- **SSOSettings.tsx**: Displays SAML and OIDC configuration
- **SCIMStatus.tsx**: Shows SCIM provisioning status and sync history
- **SCIMRoleMappingEditor.tsx**: Manages role mappings (read-only until CRUD endpoints available)
- **SyncTestButton.tsx**: Tests SCIM connection and sync

### Troubleshooting

#### API calls failing with CORS errors

Ensure your backend allows CORS from the Corporate Cockpit domain. In production, the CSP should include:

```javascript
"connect-src 'self' https://api.teei-platform.com"
```

#### Mock data still showing after enabling real API

1. Check environment variables are set correctly
2. Restart the development server
3. Clear browser cache
4. Check browser console for errors

#### Components showing old data

The Identity API client doesn't cache responses. If you see stale data:

1. Check component's `useEffect` dependencies
2. Ensure `companyId` prop is changing correctly
3. Verify backend is returning updated data

### Security Considerations

1. **Never commit real credentials** to `.env` files
2. **Use HTTPS** in production for `IDENTITY_SERVICE_URL`
3. **Validate JWT tokens** on the backend
4. **Implement rate limiting** for API endpoints
5. **Audit all SSO configuration changes**

### Related Documentation

- API Specification: `/reports/worker3_api-diff.md` (Section 2.4)
- AGENTS.md: Team 2 - Identity & SSO agents
- OpenAPI Spec (when available): `/packages/openapi/v1-final/identity.yaml`

---

**Last Updated**: 2025-11-14
**Maintained by**: Worker 3 - Corporate Cockpit Team (Agent 15: sso-ui-integrator)
