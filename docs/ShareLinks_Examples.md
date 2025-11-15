# Share Links - Usage Examples

## Quick Start

### 1. Basic Share Link (Aggregated Data Only)

```typescript
// Create a share link with PII redacted
const response = await fetch('/api/companies/abc-123/share-links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter_config: {
      dateRange: { start: '2024-10-01', end: '2024-12-31' },
      programs: ['buddy', 'upskilling'],
    },
    ttl_days: 7, // Expires in 7 days
    boardroom_mode: false,
    includes_sensitive_data: false, // Default: only aggregates shared
  }),
});

const { url, link_id, expires_at } = await response.json();

// Share the URL
console.log(`Share this link: ${url}`);
// https://cockpit.teei.io/cockpit/shared/abc123xyz...
```

**What gets shared:**
- ✅ SROI, VIS scores
- ✅ Total participants, sessions, hours
- ✅ Program completion rates
- ✅ Time-based aggregates
- ❌ Individual names
- ❌ Email addresses
- ❌ User/volunteer IDs

### 2. Boardroom Mode (Presentation View)

```typescript
// Create link optimized for boardroom presentations
const response = await fetch('/api/companies/abc-123/share-links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    saved_view_id: 'view-uuid', // Use existing saved view
    ttl_days: 1, // Short TTL for presentations
    boardroom_mode: true, // Auto-refresh, large fonts
    includes_sensitive_data: false,
  }),
});

const { url } = await response.json();

// Display on boardroom screen
window.open(url, '_blank', 'fullscreen=yes');
```

**Boardroom mode features:**
- 🖥️ Auto-refresh every 60 seconds
- 📺 Large typography for visibility
- 🎨 Dark theme optimized for displays
- 🚫 Minimal UI (no navigation, editing)

### 3. Share Link with Individual Data (Sensitive)

```typescript
// Create link that includes individual names/IDs
// USE WITH CAUTION - only for trusted recipients
const response = await fetch('/api/companies/abc-123/share-links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter_config: {
      dateRange: { start: '2024-10-01', end: '2024-12-31' },
      programs: ['buddy'],
    },
    ttl_days: 3, // Shorter TTL for sensitive data
    boardroom_mode: false,
    includes_sensitive_data: true, // ⚠️ Includes names and IDs
  }),
});

const { url } = await response.json();
```

**What gets shared:**
- ✅ All aggregates (SROI, VIS, etc.)
- ✅ Individual names (first, last)
- ✅ User/volunteer/participant IDs
- ✅ Department names
- ❌ Email addresses (still redacted)
- ❌ Phone numbers (still redacted)
- ❌ SSN, credit cards, addresses (still redacted)

### 4. List Active Share Links

```typescript
// Get all active share links
const response = await fetch('/api/companies/abc-123/share-links?include_expired=false');
const { links } = await response.json();

links.forEach(link => {
  console.log(`Link: ${link.url}`);
  console.log(`Expires: ${link.expires_at}`);
  console.log(`Accessed: ${link.access_count} times`);
  console.log(`Last access: ${link.last_accessed_at || 'Never'}`);
  console.log('---');
});
```

### 5. Revoke Share Link

```typescript
// Revoke a share link immediately
await fetch('/api/companies/abc-123/share-links/link-id-123', {
  method: 'DELETE',
});

// Link is now invalid - returns 403 Forbidden
```

### 6. Access Shared View (Public)

```typescript
// Anyone with the link can access (no auth required)
const response = await fetch('/share/link-id-123');

if (response.ok) {
  const data = await response.json();

  console.log('Dashboard Data:', data.data);
  console.log('Metadata:', data._metadata);
  console.log('Redaction Applied:', data.redactionApplied);
  console.log('Redaction Count:', data.redactionCount);
} else {
  const error = await response.json();
  console.error(`Link invalid: ${error.reason}`);
  // Reasons: 'expired', 'revoked', 'invalid_signature'
}
```

## Frontend Integration

### React Component Example

```tsx
import { useState } from 'react';
import { ShareLinkModal } from '@components/views/ShareLinkModal';

function DashboardHeader({ companyId, currentFilters }) {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => setShowShareModal(true)}>
        Share Dashboard
      </button>

      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        currentFilters={currentFilters}
        companyId={companyId}
      />
    </div>
  );
}
```

### Astro Page Example

```astro
---
// pages/[lang]/cockpit/shared/[linkId].astro
import SharedDashboard from '@components/views/SharedDashboard';

const { lang, linkId } = Astro.params;
const { mode } = Astro.url.searchParams;

// Fetch share link data
const response = await fetch(`${API_URL}/share/${linkId}`);
const shareData = await response.json();
---

<SharedDashboard
  companyId={shareData.company_id}
  filterConfig={shareData.filter_config}
  boardroomMode={mode === 'boardroom'}
  lang={lang}
  client:load
/>
```

## Backend Integration

### Custom Endpoint with Redaction

```typescript
import { prepareDataForSharing } from '../lib/shareRedaction';

// Your custom API endpoint
fastify.get('/custom-share/:linkId', async (request, reply) => {
  const { linkId } = request.params;

  // Fetch your data
  const rawData = await fetchDashboardData();

  // Apply comprehensive redaction
  const redactedData = await prepareDataForSharing(rawData, {
    includesSensitiveData: false,
    preserveAggregates: true,
    logAccess: true,
    shareLinkId: linkId,
    accessorIp: request.ip,
    accessorUserAgent: request.headers['user-agent'],
  });

  return reply.send(redactedData);
});
```

### Custom Redaction Rules

```typescript
import { redactForSharing } from '../lib/shareRedaction';

// Apply redaction with custom config
const result = await redactForSharing(data, {
  includesSensitiveData: false,
  preserveAggregates: true,
  logAccess: false,
});

// Extract only safe aggregates
import { extractSafeAggregates } from '../lib/shareRedaction';
const safeData = extractSafeAggregates(data);
```

## Use Cases

### 1. Investor Updates

**Scenario:** Share quarterly CSR metrics with investors

```typescript
const shareLink = await createShareLink({
  filter_config: {
    dateRange: { start: '2024-07-01', end: '2024-09-30' },
    programs: 'all',
  },
  ttl_days: 30, // Valid through investor meeting
  boardroom_mode: false,
  includes_sensitive_data: false, // Aggregates only
});

// Email link to investors
sendEmail({
  to: 'investors@example.com',
  subject: 'Q3 2024 CSR Impact Report',
  body: `View our CSR impact: ${shareLink.url}`,
});
```

### 2. Board Meetings

**Scenario:** Display live dashboard during board meeting

```typescript
const boardroomLink = await createShareLink({
  saved_view_id: 'board-view-uuid',
  ttl_days: 1, // Only valid for meeting day
  boardroom_mode: true, // Large fonts, auto-refresh
  includes_sensitive_data: false,
});

// Display on conference room screen
// Auto-refreshes every 60 seconds
// Large, readable metrics
```

### 3. Partner Reporting

**Scenario:** Share specific program metrics with implementation partner

```typescript
const partnerLink = await createShareLink({
  filter_config: {
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    programs: ['buddy'], // Only buddy program
  },
  ttl_days: 14, // Two-week access
  boardroom_mode: false,
  includes_sensitive_data: true, // Partner needs participant details
});

// Share with implementation partner
// Includes names/IDs but still redacts PII
```

### 4. Public ESG Reports

**Scenario:** Share CSR metrics in public ESG report

```typescript
const publicLink = await createShareLink({
  filter_config: {
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    programs: 'all',
  },
  ttl_days: 90, // Long TTL for public access
  boardroom_mode: false,
  includes_sensitive_data: false, // Strict redaction for public
});

// Embed in ESG report
const embedCode = `
  <iframe
    src="${publicLink.url}"
    width="100%"
    height="600"
    frameborder="0"
  ></iframe>
`;
```

### 5. Internal Stakeholder Updates

**Scenario:** Share with internal stakeholders (HR, leadership)

```typescript
const internalLink = await createShareLink({
  saved_view_id: 'internal-view-uuid',
  ttl_days: 7,
  boardroom_mode: false,
  includes_sensitive_data: true, // Internal stakeholders can see details
});

// Share via internal Slack/Teams
postToSlack({
  channel: '#csr-updates',
  message: `Latest CSR metrics: ${internalLink.url}`,
});
```

## Security Checklist

Before creating a share link:

- [ ] Do I need individual names/IDs, or are aggregates sufficient?
- [ ] What is the appropriate TTL? (default: 7 days)
- [ ] Who will have access to this link?
- [ ] Is boardroom mode needed for this use case?
- [ ] Have I reviewed the data being shared?
- [ ] Do I need to enable access logging? (default: yes)
- [ ] Will I remember to revoke the link when no longer needed?

## Monitoring and Audit

### View Access Logs

```sql
-- See all accesses for a specific link
SELECT
  accessed_at,
  ip_address,
  access_granted,
  failure_reason,
  metadata->>'redaction_count' as redaction_count
FROM share_link_access_log
WHERE share_link_id = (
  SELECT id FROM share_links WHERE link_id = 'link-id-123'
)
ORDER BY accessed_at DESC;
```

### Monitor Link Usage

```sql
-- Find most accessed links
SELECT
  sl.link_id,
  sl.expires_at,
  sl.includes_sensitive_data,
  sl.access_count,
  sl.last_accessed_at
FROM share_links sl
WHERE sl.company_id = 'company-uuid'
ORDER BY sl.access_count DESC
LIMIT 10;
```

### Audit Sensitive Links

```sql
-- List all links with sensitive data enabled
SELECT
  sl.link_id,
  sl.expires_at,
  sl.access_count,
  u.email as created_by_email
FROM share_links sl
JOIN users u ON u.id = sl.created_by
WHERE sl.includes_sensitive_data = true
  AND sl.revoked_at IS NULL
  AND sl.expires_at > NOW()
ORDER BY sl.created_at DESC;
```

## Troubleshooting

### "Filter configuration contains sensitive data"

**Problem:** Trying to create link with user IDs in filter without enabling sensitive data

**Solution:**
```typescript
// Option 1: Enable sensitive data mode
includes_sensitive_data: true

// Option 2: Remove sensitive filters
filter_config: {
  // ❌ volunteerIds: ['vol-123'],
  programs: ['buddy'], // ✅ Use program names instead
}
```

### Link Returns 403 Forbidden

**Possible Causes:**
1. Link expired (check `expires_at`)
2. Link revoked (check `revoked_at`)
3. Invalid signature (data tampered)

**Solution:**
```typescript
// Create new link
const newLink = await createShareLink({ ... });
```

### Redaction Too Aggressive

**Problem:** Needed data is being redacted

**Solution:**
```typescript
// Enable sensitive data mode (carefully!)
includes_sensitive_data: true

// Or extract specific safe aggregates
const safeData = extractSafeAggregates(fullData);
```

## Best Practices

1. **Default to Standard Mode**
   - Only enable `includes_sensitive_data` when absolutely necessary
   - Review what data is actually needed

2. **Use Short TTLs**
   - Default: 7 days
   - Boardroom/presentations: 1 day
   - Sensitive data: 1-3 days
   - Public reports: up to 90 days (aggregates only)

3. **Revoke When Done**
   - Don't leave links active indefinitely
   - Revoke after meeting/presentation
   - Regular cleanup of old links

4. **Monitor Access**
   - Review access logs regularly
   - Alert on unusual access patterns
   - Track sensitive data access

5. **Document Usage**
   - Log why link was created
   - Note who received the link
   - Track business purpose

## Additional Resources

- [Security Guide](/docs/ShareLinks_Security_Guide.md)
- [API Reference](/docs/API_Reference.md)
- [User Guide](/docs/User_Guide.md)
- [Migration Guide](/docs/Migration_Guide.md)
