# Public Impact Pages & Embeds

**Worker 19 Deliverable**: Share your impact story with stakeholders through public microsites and embeddable widgets.

## Overview

The Publications feature allows companies to:
- **Create** impact pages showcasing metrics, evidence, and narratives
- **Publish** to public URLs or token-gated microsites
- **Embed** impact pages in corporate websites
- **Track** views, unique visitors, and referrers

---

## Quick Start

### 1. Create a Publication

1. Navigate to **Publications** in the Corporate Cockpit
2. Click **"+ Create New Publication"**
3. Fill in the details:
   - **Title**: e.g., "Q4 2024 Impact Report"
   - **URL Slug**: e.g., "q4-2024-impact" (becomes `/impact/q4-2024-impact`)
   - **Description**: SEO meta description (160 chars max)
   - **Visibility**: PUBLIC (anyone) or TOKEN (requires access token)
4. Click **"Create"**

### 2. Publish Your Page

1. Edit your DRAFT publication
2. Add content blocks (tiles, charts, text, evidence)
3. Preview your page
4. Click **"Publish"**
5. If TOKEN visibility: save the access token (shown once!)

### 3. Share Your Impact

**Public URL**:
```
https://trust.teei.io/impact/q4-2024-impact
```

**Token-gated URL**:
```
https://trust.teei.io/impact/q4-2024-impact?token=YOUR_ACCESS_TOKEN
```

**Embed on Your Website**:
```html
<script src="https://cdn.teei.io/embeds/embed.js"
  data-slug="q4-2024-impact"
  data-tenant="your-company-uuid"
  data-token="optional-token">
</script>
```

---

## Features

### Public Microsites

- **Server-side rendering** for fast initial load (TTFB ≤300ms)
- **Cache headers** with ETag and stale-while-revalidate
- **SEO-friendly** with meta tags, Open Graph, and sitemap
- **Responsive** design for desktop, tablet, and mobile

### Token Gating

- **Secure access** with SHA-256 hashed tokens
- **30-day TTL** (configurable 1-90 days)
- **Token rotation** to revoke old tokens
- **Embed support** with token parameter

### Analytics

- **View tracking** (total, unique, last 7/30 days)
- **Referrer analysis** (top 10 referrers)
- **Anonymized IPs** (hashed with salt, no PII)
- **Real-time dashboards** in Cockpit

### Embed SDK

- **Zero dependencies** vanilla JavaScript
- **Responsive iframe** with auto-height (postMessage)
- **CSP-safe** origin validation
- **Error handling** with fallback UI

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Corporate Cockpit                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Publisher UI                                         │  │
│  │ - Create/Edit Publications (DRAFT)                   │  │
│  │ - Tile/Block Composer (drag-drop)                    │  │
│  │ - SEO Controls (meta, OG image)                      │  │
│  │ - Publish (DRAFT → LIVE + token)                     │  │
│  │ - Analytics Dashboard (views, referrers)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Gateway
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Publication APIs                         │
│  - POST /api/publications (create)                          │
│  - PATCH /api/publications/:id (update DRAFT)               │
│  - POST /api/publications/:id/live (publish)                │
│  - POST /api/publications/:id/token (rotate token)          │
│  - GET /api/publications/:id/stats (analytics)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
│  - publications (id, tenant_id, slug, status, visibility)   │
│  - publication_blocks (kind, order, payload_json)           │
│  - publication_views (anonymized_ip, referrer, viewed_at)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Public Microsites                        │
│  - GET /publications/:slug (public read + token gate)       │
│  - GET /publications/sitemap.xml (PUBLIC only)              │
│  - Cache: ETag, max-age=3600, stale-while-revalidate=86400  │
│  - Analytics: async tracking (non-blocking)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Embed SDK                              │
│  - Vanilla JS (zero deps)                                   │
│  - Responsive iframe + postMessage height sync              │
│  - CSP-safe origin checks                                   │
│  - Error handling + loading states                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Trust Center Base URL
TRUST_CENTER_BASE_URL=https://trust.teei.io

# IP Hashing Salt (analytics anonymization)
IP_HASH_SALT=your-random-salt-here

# CDN URL (for embed SDK)
CDN_BASE_URL=https://cdn.teei.io
```

### Database Schema

See `packages/shared-schema/src/schema/publications.ts` for full schema definition.

**Tables**:
- `publications`: Main publication metadata
- `publication_blocks`: Ordered content blocks
- `publication_views`: Anonymized view tracking

**Indexes**:
- `publications_tenant_slug_idx`: Fast tenant+slug lookups
- `publications_status_idx`: Filter by DRAFT/LIVE
- `publication_blocks_publication_order_idx`: Fast block ordering
- `publication_views_publication_viewed_at_idx`: Analytics queries

---

## API Reference

See `packages/openapi/publications.yaml` for full OpenAPI specification.

### Create Publication

**POST** `/api/publications`

```json
{
  "tenantId": "uuid",
  "slug": "q4-2024-impact",
  "title": "Q4 2024 Impact Report",
  "description": "Our impact story from Q4 2024",
  "visibility": "PUBLIC",
  "blocks": [
    {
      "kind": "TILE",
      "order": 0,
      "payloadJson": {
        "tileId": "sroi-summary",
        "title": "SROI Overview"
      }
    }
  ]
}
```

### Publish Publication

**POST** `/api/publications/:id/live`

**Response** (TOKEN visibility):
```json
{
  "success": true,
  "message": "Publication published successfully. Save the access token securely - it will not be shown again.",
  "data": {
    "publicationId": "uuid",
    "status": "LIVE",
    "publishedAt": "2024-11-17T10:00:00Z",
    "accessToken": "abc123...",
    "tokenExpiresAt": "2024-12-17T10:00:00Z"
  }
}
```

### Get Analytics

**GET** `/api/publications/:id/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "publicationId": "uuid",
    "totalViews": 1234,
    "uniqueVisitors": 567,
    "viewsLast7Days": 89,
    "viewsLast30Days": 456,
    "topReferrers": [
      { "referrer": "https://example.com", "count": 123 },
      { "referrer": "Direct", "count": 100 }
    ]
  }
}
```

---

## Examples

See `docs/publications/examples/` for full integration examples:
- React
- Vue
- Vanilla HTML
- Next.js
- WordPress

---

## Security

### Tenant Scoping

All API endpoints enforce tenant scoping:
- Publications can only be created/updated/deleted by tenant admins
- Public read is unrestricted (for PUBLIC visibility)
- Token validation for TOKEN visibility

### Token Management

- Tokens are SHA-256 hashed before storage
- Only plain-text token is returned on generation (once!)
- Token rotation revokes old token and generates new one
- Expiry enforcement (30d default, 1-90d configurable)

### XSS Prevention

- TEXT blocks are sanitized (DOMPurify or equivalent)
- HTML tags removed: `<script>`, event handlers, `javascript:` URLs
- Safe subset: `<p>`, `<h1-6>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<strong>`, `<em>`

### Analytics Privacy

- IP addresses are hashed (HMAC-SHA256 with salt)
- No PII stored (emails, names, etc.)
- Referrers truncated to 500 chars
- User agents truncated to 500 chars

---

## Performance

### Public Microsites

- **TTFB**: ≤300ms (cache hit)
- **FCP**: ≤1.2s
- **LCP**: ≤2.5s
- **Cache**: 1h max-age, 24h stale-while-revalidate

### Embed SDK

- **First Render**: ≤600ms
- **Height Sync**: ≤50ms (postMessage)
- **Bundle Size**: ≤5KB (gzipped)
- **Zero Dependencies**: Vanilla JS

---

## Troubleshooting

### Publication Not Found

- Check slug spelling (case-sensitive, lowercase only)
- Verify status is LIVE (drafts are not publicly visible)
- Ensure tenantId matches (if multi-tenant)

### Token Invalid

- Verify token hasn't expired (check `tokenExpiresAt`)
- Token may have been rotated (use latest token)
- Token is case-sensitive

### Embed Not Loading

- Check CSP policies (allow iframe from `trust.teei.io`)
- Verify `data-slug` and `data-tenant` attributes
- Check browser console for errors

### Slow Performance

- Enable caching (check `Cache-Control` headers)
- Use CDN for embed SDK (avoid direct server loads)
- Optimize block payloads (minimize JSON size)

---

## Roadmap

- [ ] Block Templates (pre-built layouts)
- [ ] Scheduled Publishing (publish at specific time)
- [ ] Versioning (publish new version without unpublishing old)
- [ ] Custom Domains (e.g., `impact.yourcompany.com`)
- [ ] Advanced Analytics (device, location, conversion funnels)
- [ ] A/B Testing (compare different versions)
- [ ] PDF Export (download as PDF report)

---

## Support

For questions or issues:
- **Docs**: https://docs.teei.io/publications
- **GitHub**: https://github.com/teei/csr-platform/issues
- **Email**: support@teei.io
