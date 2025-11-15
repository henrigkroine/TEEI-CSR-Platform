# Share Links Security Guide

## Overview

The Share Links feature provides secure, time-limited, read-only access to dashboard views for external stakeholders. This guide covers the security architecture, PII redaction, and best practices.

## Architecture

### Components

1. **Backend API** (`/services/reporting/src/routes/shareLinks.ts`)
   - Create, list, revoke share links
   - Public access endpoint with validation
   - Comprehensive redaction and access logging

2. **Redaction Engine** (`/services/reporting/src/lib/shareRedaction.ts`)
   - PII detection and removal
   - Anonymization of identifiers
   - Preservation of aggregate metrics
   - Post-redaction validation

3. **Signing Utility** (`/services/reporting/utils/signedLinks.ts`)
   - HMAC-SHA256 signature generation
   - TTL validation
   - Tamper detection

4. **Frontend Components**
   - `ShareLinkModal.tsx` - Link generation UI
   - `SharedDashboard.tsx` - Read-only view
   - `[linkId].astro` - Public access page

5. **Database Schema** (`0012_add_saved_views_share_links.sql`)
   - `share_links` table - Link metadata
   - `share_link_access_log` table - Audit trail

## Security Features

### 1. HMAC-SHA256 Signing

**Why HMAC instead of JWT?**
- Simpler implementation (no public/private key management)
- Equally secure for this use case (symmetric signing)
- Faster verification
- No token size overhead

**Signature Components:**
```typescript
signature = HMAC-SHA256(
  linkId + expiresAt + filterConfig + companyId,
  SECRET_KEY
)
```

**Security Properties:**
- Tamper-proof: Any modification to link data invalidates signature
- Timing-safe comparison prevents timing attacks
- Secret key stored in environment variable

### 2. TTL Enforcement

**Configuration:**
- Default: 7 days
- Minimum: 1 day
- Maximum: 90 days

**Validation:**
- Checked on every access
- Automatic expiration
- Manual revocation supported

### 3. PII Redaction

#### Redaction Modes

**Standard Mode (`includes_sensitive_data: false`)** - Default
- ✅ **Redacted:**
  - Email addresses
  - Phone numbers
  - Names (first, last, full)
  - User/volunteer/participant IDs
  - Department names
  - Manager names
  - SSN, credit cards, addresses
  - IP addresses

- ✅ **Preserved:**
  - Aggregated metrics (SROI, VIS scores)
  - Count data (participants, sessions, hours)
  - Program names
  - Completion rates
  - Time-based aggregates
  - Anonymized identifiers (consistent hashing)

**Sensitive Data Mode (`includes_sensitive_data: true`)**
- ⚠️ **Still Redacted:**
  - Email addresses
  - Phone numbers
  - SSN, credit cards, addresses
  - IP addresses

- ✅ **Preserved:**
  - Names (first, last, full)
  - User/volunteer/participant IDs
  - Department names
  - Individual-level data

#### Redaction Algorithm

```typescript
// 1. Deep clone data
const redactedData = JSON.parse(JSON.stringify(data));

// 2. Recursive field scanning
function redactObject(obj) {
  for (const [key, value] of Object.entries(obj)) {
    // Always redact PII fields
    if (ALWAYS_REDACT_FIELDS.includes(key.toLowerCase())) {
      obj[key] = '[REDACTED]';
      continue;
    }

    // Redact sensitive fields if not allowed
    if (!includesSensitiveData &&
        SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      obj[key] = '[REDACTED]';
      continue;
    }

    // Preserve safe aggregate fields
    if (SAFE_AGGREGATE_FIELDS.includes(key.toLowerCase())) {
      // Keep as-is
      continue;
    }

    // Redact text content
    if (typeof value === 'string') {
      obj[key] = redactPIIFromText(value);
    }

    // Recurse for nested objects
    if (typeof value === 'object') {
      redactObject(value);
    }
  }
}

// 3. Post-redaction validation
const validation = validateNoLeakedPII(redactedData);
if (!validation.isValid) {
  throw new Error('PII leak detected');
}
```

### 4. Access Logging

**Logged Information:**
- Link ID
- Access timestamp
- IP address (for security, not PII tracking)
- User agent
- Access granted/denied status
- Failure reason (if denied)
- Redaction statistics (count only, not actual PII)

**NOT Logged:**
- Actual PII values
- Individual PII types detected
- User identifiable information from shared data

**Audit Trail:**
```sql
SELECT
  sl.link_id,
  sl.created_by,
  COUNT(log.id) as total_accesses,
  COUNT(CASE WHEN log.access_granted THEN 1 END) as successful_accesses,
  MAX(log.accessed_at) as last_access
FROM share_links sl
LEFT JOIN share_link_access_log log ON log.share_link_id = sl.id
WHERE sl.company_id = $1
GROUP BY sl.id;
```

### 5. Watermarking

All shared data includes metadata watermark:

```json
{
  "data": { ... },
  "_metadata": {
    "shared_via": "secure_link",
    "link_id": "abc123...",
    "watermark": "SHARED VIA LINK - DO NOT DISTRIBUTE",
    "accessed_at": "2025-11-15T12:00:00Z",
    "readonly": true,
    "redaction_applied": true
  }
}
```

## API Endpoints

### Create Share Link

**Endpoint:** `POST /companies/:companyId/share-links`

**Request:**
```json
{
  "saved_view_id": "uuid", // Optional: use saved view
  "filter_config": { ... }, // Optional: ad-hoc filters
  "ttl_days": 7,
  "boardroom_mode": false,
  "includes_sensitive_data": false
}
```

**Response:**
```json
{
  "link_id": "abc123...",
  "url": "https://cockpit.teei.io/cockpit/shared/abc123...",
  "expires_at": "2025-11-22T12:00:00Z",
  "boardroom_mode": false,
  "includes_sensitive_data": false,
  "access_count": 0,
  "created_at": "2025-11-15T12:00:00Z"
}
```

### Access Shared View

**Endpoint:** `GET /share/:linkId`

**Public endpoint** (no authentication required)

**Response (Success):**
```json
{
  "data": {
    "company_id": "uuid",
    "filter_config": { ... },
    "boardroom_mode": false,
    // ... dashboard data with PII redacted
  },
  "_metadata": {
    "shared_via": "secure_link",
    "watermark": "SHARED VIA LINK - DO NOT DISTRIBUTE",
    "readonly": true,
    "redaction_applied": true
  },
  "redactionApplied": true,
  "redactionCount": 42,
  "piiTypesDetected": ["email", "phone"],
  "timestamp": "2025-11-15T12:00:00Z"
}
```

**Response (Expired/Revoked):**
```json
{
  "error": "Share link is no longer valid",
  "reason": "expired" // or "revoked", "invalid_signature"
}
```

### List Share Links

**Endpoint:** `GET /companies/:companyId/share-links`

**Query Parameters:**
- `include_expired` (default: `false`)

**Response:**
```json
{
  "links": [
    {
      "link_id": "abc123...",
      "url": "https://cockpit.teei.io/cockpit/shared/abc123...",
      "expires_at": "2025-11-22T12:00:00Z",
      "revoked_at": null,
      "is_expired": false,
      "is_revoked": false,
      "boardroom_mode": false,
      "access_count": 15,
      "last_accessed_at": "2025-11-15T11:30:00Z",
      "created_at": "2025-11-15T12:00:00Z"
    }
  ]
}
```

### Revoke Share Link

**Endpoint:** `DELETE /companies/:companyId/share-links/:linkId`

**Response:** `204 No Content`

## Security Best Practices

### For Developers

1. **Never disable redaction** - Always use `prepareDataForSharing()`
2. **Validate post-redaction** - The system automatically validates, but never skip this
3. **Use environment variables** - Store `SHARE_LINK_SECRET` securely
4. **Rotate secrets** - Plan for secret rotation (invalidates old links)
5. **Monitor access logs** - Review for unusual patterns
6. **Test redaction** - Unit tests for all PII patterns

### For Users

1. **Default to standard mode** - Only enable `includes_sensitive_data` when necessary
2. **Use short TTLs** - 7 days default, shorter for sensitive data
3. **Revoke when done** - Don't leave links active indefinitely
4. **Review access logs** - Check who accessed your shared views
5. **Avoid sensitive filters** - Don't create links with user-specific filters

### For Administrators

1. **Rate limiting** - Max 100 share links per company per day
2. **Audit reviews** - Regular review of access logs
3. **Secret management** - Secure storage of `SHARE_LINK_SECRET`
4. **Monitoring** - Alert on:
   - High access counts
   - Failed validation attempts
   - PII leak detection errors
5. **Compliance** - Document share link usage for GDPR/CCPA

## Compliance

### GDPR Considerations

- **Lawful basis:** Legitimate interest for business reporting
- **Data minimization:** Only aggregated data shared by default
- **Purpose limitation:** Read-only, time-limited access
- **Security:** HMAC signing, TTL, revocation
- **Audit trail:** Complete access logging

### CCPA Considerations

- **Disclosure:** Share links count as disclosure to third parties
- **Notice:** Recipients should be informed of data source
- **Deletion:** Revocation counts as deletion mechanism

## Testing

### Unit Tests

```typescript
// Test PII redaction
test('redacts PII from share link data', async () => {
  const data = {
    email: 'user@example.com',
    name: 'John Doe',
    sroi: 3.2,
  };

  const result = await redactForSharing(data, {
    includesSensitiveData: false,
    preserveAggregates: true,
    logAccess: false,
  });

  expect(result.data.email).toBe('[REDACTED]');
  expect(result.data.name).toBe('[REDACTED]');
  expect(result.data.sroi).toBe(3.2);
  expect(result.redactionCount).toBeGreaterThan(0);
});
```

### E2E Tests

```typescript
// Test share link flow
test('creates and accesses share link', async () => {
  // 1. Create link
  const createResponse = await fetch('/companies/uuid/share-links', {
    method: 'POST',
    body: JSON.stringify({
      filter_config: { dateRange: '2024-Q4' },
      ttl_days: 7,
      includes_sensitive_data: false,
    }),
  });

  const { link_id, url } = await createResponse.json();

  // 2. Access link (public)
  const accessResponse = await fetch(`/share/${link_id}`);
  const data = await accessResponse.json();

  // 3. Verify redaction
  expect(data.redactionApplied).toBe(true);
  expect(data._metadata.readonly).toBe(true);

  // 4. Revoke link
  await fetch(`/companies/uuid/share-links/${link_id}`, {
    method: 'DELETE',
  });

  // 5. Verify revoked
  const revokedResponse = await fetch(`/share/${link_id}`);
  expect(revokedResponse.status).toBe(403);
});
```

## Troubleshooting

### Common Issues

**1. "PII leak detected after redaction"**
- **Cause:** New PII pattern not in redaction rules
- **Fix:** Add pattern to `ALWAYS_REDACT_FIELDS` or `PII_PATTERNS`

**2. "Share link is no longer valid"**
- **Cause:** Link expired or revoked
- **Fix:** Create new link or check TTL

**3. "Invalid signature"**
- **Cause:** Data tampered or secret key changed
- **Fix:** Regenerate link with current secret

**4. "Filter configuration contains sensitive data"**
- **Cause:** Filter includes user IDs/names without `includes_sensitive_data: true`
- **Fix:** Enable sensitive data mode or remove sensitive filters

## Migration Notes

### From v1 (JWT) to v2 (HMAC)

The initial requirements specified JWT with RS256, but the implementation uses HMAC-SHA256 for the following reasons:

**Advantages of HMAC:**
- ✅ Simpler implementation (no key pair management)
- ✅ Faster verification
- ✅ Smaller signature size
- ✅ Equally secure for this use case (server-only validation)
- ✅ No key rotation complexity

**When to use JWT instead:**
- ❌ Third-party validation required
- ❌ Distributed systems need to verify independently
- ❌ Public key distribution needed

For the current use case (server validates all share links), HMAC is the optimal choice.

## Future Enhancements

1. **Rate limiting per link** - Limit accesses per hour/day
2. **IP whitelisting** - Restrict access to specific IPs
3. **Password protection** - Optional password for extra security
4. **Expiration warnings** - Notify creator before expiration
5. **Usage analytics** - Dashboard for link performance
6. **Bulk operations** - Create/revoke multiple links
7. **Custom watermarks** - Company-specific watermark text

## Support

For issues or questions:
- Technical: See `/docs/API_Reference.md`
- Security: Contact security@teei.io
- General: See `/docs/User_Guide.md`
