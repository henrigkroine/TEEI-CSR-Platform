# Public Impact Pages & Embeds - Worker 19

## Overview

The Publications system allows companies to create and publish public microsites showcasing their social impact. These pages can be shared publicly or secured with tokens, and embedded on corporate websites via secure iframes.

## Architecture

### Components

1. **Database Schema** (`packages/shared-schema/src/schema/publications.ts`)
   - `publications`: Publication metadata, SEO, analytics
   - `publication_blocks`: Content blocks (tiles, text, charts, evidence)
   - `publication_tokens`: Access tokens for private publications
   - `publication_views`: Analytics tracking

2. **API Gateway** (`services/api-gateway/src/routes/publications.ts`)
   - CRUD operations for publications
   - Block management
   - Token generation and management
   - Analytics endpoints

3. **Publisher UI** (`apps/corp-cockpit-astro/src/components/admin/PublicationComposer.tsx`)
   - Compose publications with drag-and-drop blocks
   - SEO metadata editor
   - Token management
   - Embed code generator

4. **Trust Center Microsites** (`apps/trust-center/src/pages/impact/[slug].astro`)
   - Server-side rendered public pages
   - Token-gated access
   - ETag caching for performance
   - Analytics tracking

5. **Embed SDK** (`packages/sdk/embeds/src/embed.ts`)
   - Lightweight JavaScript SDK
   - Auto-resizing iframes via postMessage
   - CSP-safe origin verification
   - Analytics integration

6. **Supporting Services**
   - XSS sanitizer (`services/reporting/src/publications/sanitizer.ts`)
   - Cache manager (`services/reporting/src/publications/cache.ts`)

## Features

### Publication Management

- **Create** publications with slug-based URLs
- **Compose** with multiple block types:
  - TILE: Metric cards with values and trends
  - TEXT: Rich text content (HTML or Markdown)
  - CHART: Data visualizations
  - EVIDENCE: Quoted snippets with sources
  - METRIC: KPI displays with changes
  - HEADING: Section headers
- **Publish** workflow: DRAFT → LIVE → ARCHIVED
- **Visibility** control: PUBLIC or TOKEN-required

### SEO & Metadata

- Custom meta title, description
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card support
- Sitemap integration
- Robots.txt control

### Security

- **Tenant scoping**: Publications are isolated per tenant
- **Token-based access**: Generate secure tokens for private publications
- **XSS sanitization**: HTML content sanitized with DOMPurify
- **CSP-safe embeds**: No inline scripts, origin verification
- **Token TTL**: Configurable expiration (1-365 days)
- **Token revocation**: Immediate access denial

### Performance

- **Server-side rendering**: Astro SSR for fast TTFB
- **ETag caching**: HTTP 304 responses for unchanged content
- **Stale-while-revalidate**: Background updates for cache freshness
- **CDN-ready**: Cache-Control headers for edge caching
- **Lazy loading**: Defer iframe loading until visible
- **Target**: TTFB ≤300ms (public), embed first render ≤600ms

### Analytics

- **View tracking**: Anonymized visitor hashing (IP + User-Agent)
- **Unique visitors**: Deduplication via visitor hash
- **Referrer tracking**: Top referrers list
- **Embed analytics**: Track embed domains and embed views
- **View duration**: Beacon API for exit tracking
- **Dashboard**: Views by day, unique visitors, embed stats

## Usage

### 1. Create Publication (API)

```bash
POST /publications
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "slug": "impact-2024-q1",
  "title": "Our Impact in Q1 2024",
  "description": "Highlights of our social impact achievements",
  "visibility": "PUBLIC",
  "meta_title": "Q1 2024 Impact Report | Acme Corp",
  "meta_description": "Discover how Acme Corp made a difference in Q1 2024"
}
```

### 2. Add Blocks

```bash
POST /publications/{id}/blocks

{
  "kind": "TILE",
  "order": 0,
  "width": "quarter",
  "payload_json": {
    "type": "TILE",
    "label": "Volunteers",
    "value": 1250,
    "trend": 15.3
  }
}
```

```bash
POST /publications/{id}/blocks

{
  "kind": "TEXT",
  "order": 1,
  "width": "full",
  "payload_json": {
    "type": "TEXT",
    "format": "markdown",
    "content": "# Our Story\n\nIn Q1 2024, we achieved..."
  }
}
```

### 3. Publish

```bash
POST /publications/{id}/publish
```

### 4. Access Public Page

```
https://trust.teei.io/impact/impact-2024-q1
```

### 5. Generate Token (Private Publications)

```bash
POST /publications/{id}/tokens

{
  "label": "Marketing website embed",
  "expires_in_days": 90
}
```

Response:
```json
{
  "id": "...",
  "token": "pub_abc123...",
  "token_prefix": "pub_abc12345",
  "expires_at": "2025-02-15T00:00:00Z",
  "created_at": "2024-11-17T00:00:00Z"
}
```

### 6. Embed on Corporate Site

```html
<!-- CDN Method -->
<script src="https://cdn.teei.io/embed.js"
        data-slug="impact-2024-q1"
        data-token="pub_abc123..."
        data-width="100%"
        data-height="800px">
</script>

<!-- Or Programmatic -->
<script src="https://cdn.teei.io/embed.js"></script>
<script>
  TEEIEmbed.create({
    slug: 'impact-2024-q1',
    token: 'pub_abc123...',
    targetElement: '#embed-container',
    analytics: true
  });
</script>
<div id="embed-container"></div>
```

## Database Migrations

Run migrations to create tables:

```bash
cd packages/shared-schema
pnpm db:migrate
```

## API Reference

Full OpenAPI spec: `packages/openapi/publications.yaml`

### Authenticated Endpoints

- `POST /publications` - Create publication
- `GET /publications` - List publications
- `GET /publications/:id` - Get publication with blocks
- `PATCH /publications/:id` - Update publication
- `DELETE /publications/:id` - Delete publication
- `POST /publications/:id/publish` - Publish publication
- `POST /publications/:id/blocks` - Add block
- `PATCH /publications/:id/blocks/:blockId` - Update block
- `DELETE /publications/:id/blocks/:blockId` - Delete block
- `POST /publications/:id/tokens` - Generate token
- `GET /publications/:id/tokens` - List tokens
- `DELETE /publications/:id/tokens/:tokenId` - Revoke token
- `GET /publications/:id/stats` - Get analytics

### Public Endpoints

- `GET /public/publications/:slug?token=...` - Get publication
- `POST /public/publications/:slug/view` - Track view

## Testing

### Unit Tests

```bash
# Sanitizer tests
cd services/reporting
pnpm test src/publications/sanitizer.test.ts

# Cache tests
pnpm test src/publications/cache.test.ts
```

### Contract Tests

```bash
# API contract tests
cd services/api-gateway
pnpm test src/routes/__tests__/publications.contract.test.ts
```

### E2E Tests

```bash
# Publication flow test
cd apps/corp-cockpit-astro
pnpm test:e2e tests/publications.spec.ts
```

## Performance Targets

- ✅ Public page TTFB: ≤300ms (from cache)
- ✅ Embed first render: ≤600ms
- ✅ API response time (p95): ≤200ms
- ✅ Cache hit rate: ≥90%
- ✅ ETag validation: 304 responses for unchanged content

## Security Checklist

- ✅ Tenant scoping on all queries
- ✅ XSS sanitization for TEXT blocks
- ✅ CSP-safe embed (no inline scripts)
- ✅ Token hashing (SHA-256)
- ✅ Token expiration enforcement
- ✅ Token revocation
- ✅ Origin verification for postMessage
- ✅ Anonymized analytics (no PII)
- ✅ Rate limiting on public endpoints

## Accessibility (WCAG 2.2 AA)

- ✅ Semantic HTML
- ✅ Heading hierarchy (h1 → h2 → h3)
- ✅ Alt text for images
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ Color contrast ≥4.5:1
- ✅ Screen reader support

## Troubleshooting

### Publication not loading

1. Check publication status (must be LIVE)
2. Verify slug in URL
3. Check token if visibility is TOKEN
4. Check network requests for API errors

### Embed not resizing

1. Verify postMessage listener is active
2. Check CSP headers allow iframe
3. Ensure embed script loaded
4. Check browser console for errors

### Token not working

1. Verify token not expired
2. Check token not revoked
3. Ensure token matches publication
4. Verify token in query param: `?token=pub_...`

### Analytics not tracking

1. Check Beacon API support (use fetch fallback)
2. Verify CORS headers for `/public/publications/:slug/view`
3. Check network tab for beacon requests
4. Ensure analytics not blocked by ad blockers

## Roadmap

### Future Enhancements

- [ ] Rich chart rendering (Chart.js integration)
- [ ] A/B testing for publications
- [ ] Multi-language publications
- [ ] PDF export
- [ ] Custom domains (CNAME)
- [ ] Scheduled publishing
- [ ] Version history and rollback
- [ ] Collaborative editing
- [ ] Comment threads
- [ ] Social media auto-posting

## Support

For issues or questions:
- GitHub: https://github.com/teei-platform/teei-csr-platform/issues
- Docs: https://docs.teei.io/publications
- Email: support@teei.io
