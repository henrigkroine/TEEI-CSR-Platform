# Worker 1 Identity API Contract

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**Owner:** Worker 1 (Platform Services)
**Consumer:** Worker 3 (Corporate Cockpit)

## Overview

This document defines the API contract between Worker 1 (Platform Services) and Worker 3 (Corporate Cockpit) for SSO and SCIM identity management features. Worker 1 owns and manages all identity provider configuration, secrets, and provisioning logic. Worker 3 consumes these APIs to display configuration and manage role mappings.

## Security Requirements

### Authentication
All endpoints require valid session authentication or API key with appropriate scopes:
- Session Cookie: `teei_session` (set by Worker 1 auth middleware)
- API Key Header: `Authorization: Bearer <api_key>` (for programmatic access)

### Authorization
- **SSO Metadata (Read):** `ADMIN`, `SUPER_ADMIN`
- **Role Mappings (Read):** `ADMIN`, `SUPER_ADMIN`
- **Role Mappings (Write):** `SUPER_ADMIN` only
- **SCIM Test/Sync:** `SUPER_ADMIN` only

### Rate Limiting
- **Standard endpoints:** 100 requests/minute per user
- **Test/sync endpoints:** 10 requests/minute per company

---

## Endpoints

### 1. SSO Configuration

#### 1.1 Get SSO Metadata
**GET** `/api/identity/sso/{companyId}/metadata`

Returns SAML and OIDC configuration for display in Corporate Cockpit.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Response 200 OK:**
```json
{
  "saml": {
    "enabled": true,
    "entity_id": "https://teei.platform/saml/{companyId}",
    "acs_url": "https://teei.platform/api/auth/saml/{companyId}/acs",
    "metadata_url": "https://teei.platform/api/auth/saml/{companyId}/metadata.xml",
    "certificate_fingerprint": "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
    "sign_requests": true,
    "want_assertions_signed": true,
    "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  },
  "oidc": {
    "enabled": false,
    "issuer": "https://accounts.google.com",
    "client_id": "teei-{companyId}.apps.googleusercontent.com",
    "redirect_uri": "https://teei.platform/api/auth/oidc/{companyId}/callback",
    "scopes": ["openid", "profile", "email"],
    "response_type": "code",
    "grant_type": "authorization_code"
  }
}
```

**Response 404 Not Found:**
```json
{
  "error": "SSO not configured for this company",
  "code": "SSO_NOT_CONFIGURED"
}
```

**Security Notes:**
- **NO client secrets, private keys, or bearer tokens in response**
- Only public metadata suitable for IdP configuration
- Certificate shown as fingerprint only, not full certificate

---

### 2. Role Mappings

#### 2.1 List Role Mappings
**GET** `/api/identity/scim/{companyId}/mappings`

Returns all IdP claim to TEEI role mappings for a company.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Query Parameters:**
- `enabled` (boolean, optional): Filter by enabled/disabled status
- `role` (string, optional): Filter by TEEI role (VIEWER, MANAGER, ADMIN, SUPER_ADMIN)

**Response 200 OK:**
```json
{
  "mappings": [
    {
      "id": "map_abc123",
      "idp_claim": "groups",
      "claim_value": "teei-admins",
      "teei_role": "ADMIN",
      "priority": 90,
      "enabled": true,
      "description": "Company administrators and report reviewers",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-02-01T14:30:00Z",
      "created_by": "user_xyz789"
    }
  ],
  "total": 5
}
```

---

#### 2.2 Create Role Mapping
**POST** `/api/identity/scim/{companyId}/mappings`

Creates a new role mapping rule.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Request Body:**
```json
{
  "idp_claim": "groups",
  "claim_value": "teei-managers",
  "teei_role": "MANAGER",
  "priority": 80,
  "enabled": true,
  "description": "Team managers who can create reports"
}
```

**Validation Rules:**
- `idp_claim`: Required, one of: `groups`, `email`, `department`, `roles`, `custom`
- `claim_value`: Required, string, max 255 chars, supports wildcards (*, ?)
- `teei_role`: Required, enum: `VIEWER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`
- `priority`: Required, integer 1-100
- `enabled`: Optional, boolean, defaults to true
- `description`: Optional, string, max 500 chars

**Response 201 Created:**
```json
{
  "mapping": {
    "id": "map_def456",
    "idp_claim": "groups",
    "claim_value": "teei-managers",
    "teei_role": "MANAGER",
    "priority": 80,
    "enabled": true,
    "description": "Team managers who can create reports",
    "created_at": "2024-11-14T16:00:00Z",
    "created_by": "user_current"
  }
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "claim_value",
      "message": "claim_value is required"
    }
  ]
}
```

**Response 409 Conflict:**
```json
{
  "error": "Mapping with same claim and value already exists",
  "code": "DUPLICATE_MAPPING",
  "existing_mapping_id": "map_abc123"
}
```

---

#### 2.3 Update Role Mapping
**PUT** `/api/identity/scim/{companyId}/mappings/{mappingId}`

Updates an existing role mapping.

**Path Parameters:**
- `companyId` (string, required): Company identifier
- `mappingId` (string, required): Mapping identifier

**Request Body:**
Same as Create, all fields optional (partial update supported)

**Response 200 OK:**
```json
{
  "mapping": {
    "id": "map_abc123",
    "idp_claim": "groups",
    "claim_value": "teei-admins",
    "teei_role": "ADMIN",
    "priority": 95,
    "enabled": true,
    "description": "Updated description",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-11-14T16:15:00Z",
    "created_by": "user_xyz789",
    "updated_by": "user_current"
  }
}
```

**Response 404 Not Found:**
```json
{
  "error": "Mapping not found",
  "code": "MAPPING_NOT_FOUND"
}
```

---

#### 2.4 Delete Role Mapping
**DELETE** `/api/identity/scim/{companyId}/mappings/{mappingId}`

Deletes a role mapping. Soft delete with audit trail.

**Path Parameters:**
- `companyId` (string, required): Company identifier
- `mappingId` (string, required): Mapping identifier

**Response 204 No Content:**
(Empty response body)

**Response 404 Not Found:**
```json
{
  "error": "Mapping not found",
  "code": "MAPPING_NOT_FOUND"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Cannot delete default mapping",
  "code": "PROTECTED_MAPPING"
}
```

---

### 3. SCIM Provisioning

#### 3.1 Get SCIM Status
**GET** `/api/identity/scim/{companyId}/status`

Returns current SCIM provisioning status and configuration.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Response 200 OK:**
```json
{
  "config": {
    "enabled": true,
    "endpoint": "https://teei.platform/api/scim/v2",
    "sync_frequency_minutes": 15,
    "supported_operations": ["CREATE", "UPDATE", "DELETE", "PATCH"]
  },
  "sync_status": {
    "last_sync_at": "2024-11-14T16:00:00Z",
    "last_sync_status": "success",
    "next_sync_at": "2024-11-14T16:15:00Z",
    "users_synced": 247,
    "groups_synced": 12,
    "errors_count": 0,
    "duration_ms": 3420
  },
  "metrics": {
    "total_users": 247,
    "total_groups": 12,
    "users_created_last_sync": 3,
    "users_updated_last_sync": 12,
    "users_deleted_last_sync": 1,
    "groups_created_last_sync": 0,
    "groups_updated_last_sync": 2,
    "groups_deleted_last_sync": 0
  }
}
```

---

#### 3.2 Test SCIM Sync
**POST** `/api/identity/scim/{companyId}/test`

Performs a dry-run SCIM sync to test connectivity and preview pending changes.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Request Body:**
```json
{
  "dry_run": true,
  "timeout_seconds": 30
}
```

**Response 200 OK:**
```json
{
  "status": "success",
  "timestamp": "2024-11-14T16:20:00Z",
  "connection_status": "ok",
  "response_time_ms": 1234,
  "users_found": 250,
  "groups_found": 12,
  "users_to_create": 3,
  "users_to_update": 8,
  "users_to_delete": 0,
  "groups_to_create": 0,
  "groups_to_update": 1,
  "groups_to_delete": 0,
  "validation_errors": [
    {
      "resource_type": "user",
      "resource_id": "user_123",
      "error": "Email format invalid: not-an-email"
    }
  ]
}
```

**Response 500 Internal Server Error:**
```json
{
  "status": "error",
  "timestamp": "2024-11-14T16:20:00Z",
  "connection_status": "failed",
  "message": "SCIM endpoint unreachable: Connection timeout",
  "error_code": "SCIM_CONNECTION_FAILED"
}
```

**Rate Limiting:**
- Max 10 tests per hour per company
- Returns `429 Too Many Requests` if exceeded

---

#### 3.3 Get SCIM Logs
**GET** `/api/identity/scim/{companyId}/logs`

Returns provisioning event logs for debugging.

**Path Parameters:**
- `companyId` (string, required): Company identifier

**Query Parameters:**
- `limit` (integer, optional): Max records to return (default: 50, max: 500)
- `offset` (integer, optional): Pagination offset
- `error_only` (boolean, optional): Filter to errors only
- `since` (ISO 8601 datetime, optional): Filter events after this timestamp

**Response 200 OK:**
```json
{
  "logs": [
    {
      "id": "log_abc123",
      "timestamp": "2024-11-14T16:00:15Z",
      "event_type": "user_created",
      "resource_type": "user",
      "resource_id": "user_456",
      "status": "success",
      "message": "User john.doe@company.com created successfully",
      "duration_ms": 234
    },
    {
      "id": "log_def456",
      "timestamp": "2024-11-14T16:00:18Z",
      "event_type": "user_update_failed",
      "resource_type": "user",
      "resource_id": "user_789",
      "status": "error",
      "message": "Duplicate email: jane.doe@company.com",
      "error_code": "DUPLICATE_EMAIL",
      "resolved": false
    }
  ],
  "total": 142,
  "has_more": true
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SSO_NOT_CONFIGURED` | 404 | SSO not set up for this company |
| `MAPPING_NOT_FOUND` | 404 | Role mapping ID doesn't exist |
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `DUPLICATE_MAPPING` | 409 | Mapping with same claim/value exists |
| `PROTECTED_MAPPING` | 400 | Cannot delete system mapping |
| `SCIM_NOT_CONFIGURED` | 404 | SCIM not enabled for company |
| `SCIM_CONNECTION_FAILED` | 500 | Cannot reach SCIM endpoint |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## Data Models

### RoleMapping
```typescript
interface RoleMapping {
  id: string;                    // Unique identifier (map_*)
  idp_claim: string;             // IdP attribute name
  claim_value: string;           // Value to match (supports wildcards)
  teei_role: TEEIRole;          // Assigned TEEI role
  priority: number;              // 1-100, higher = higher priority
  enabled: boolean;              // Active/inactive status
  description?: string;          // Human-readable description
  created_at: string;            // ISO 8601 timestamp
  updated_at?: string;           // ISO 8601 timestamp
  created_by: string;            // User ID who created
  updated_by?: string;           // User ID who last updated
}

type TEEIRole = 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
```

---

## Implementation Notes

### For Worker 1 (Platform Services)

1. **Secret Management:**
   - Store all IdP secrets (client secrets, private keys, bearer tokens) securely
   - Never expose secrets in API responses
   - Rotate secrets regularly and update IdP configuration

2. **CSRF Protection:**
   - All mutating endpoints (POST, PUT, DELETE) require CSRF token
   - Token in `X-CSRF-Token` header or `_csrf` form field

3. **Audit Logging:**
   - Log all role mapping changes with user ID, timestamp, before/after values
   - Retain SCIM sync logs for 90 days minimum

4. **SCIM Provider Support:**
   - Azure AD SCIM v2.0
   - Okta SCIM 2.0
   - Google Workspace (via SCIM adapter)
   - OneLogin SCIM 2.0

### For Worker 3 (Corporate Cockpit)

1. **Read-Only by Default:**
   - SSO configuration is display-only
   - Only SUPER_ADMIN can edit role mappings

2. **Optimistic Updates:**
   - Update UI immediately on mutation success
   - Revert on error with user notification

3. **Error Handling:**
   - Display user-friendly error messages
   - Log full error details to console for debugging

4. **Polling:**
   - SCIM status can be polled every 30 seconds
   - Use exponential backoff on errors

---

## Testing

### Mock Endpoints (Development)
Worker 3 can use mock data during development. Worker 1 should provide:
- Sandbox environment at `https://sandbox.teei.platform/api/identity/*`
- Test company ID: `test_company_001`
- Test credentials provided separately

### Integration Tests
Both workers should implement:
- Contract tests using Pact or similar
- E2E tests for full SSO login flow
- SCIM sync integration tests with mock IdP

---

## Versioning

API versioning via URL path: `/api/v2/identity/*` (future)

**Backward Compatibility:**
- Non-breaking changes: Add optional fields, new endpoints
- Breaking changes: Increment version number, maintain v1 for 6 months

---

## Support

**Questions/Issues:**
- Worker 1 Team: `#worker1-platform-services` (Slack)
- API Changes: Submit RFC to architecture review board
- Bugs: File ticket in `TEEI-PLATFORM` Jira project

**SLA:**
- Uptime: 99.9% excluding scheduled maintenance
- Response time (p95): < 500ms for reads, < 2s for writes
- Support response: < 24 hours for P2, < 4 hours for P1
