# Publications Feature

## Overview

The **Publications** feature enables organizations to create, manage, and share public-facing impact pages that showcase their CSR metrics, stories, and evidence. Publications can be embedded on corporate websites and accessed via public URLs.

---

## Features

### ✅ Core Capabilities

- **📄 Publication Management**: Create and manage impact pages with title, slug, description, and SEO metadata
- **🧱 Modular Content Blocks**: Compose pages from TILE, TEXT, CHART, and EVIDENCE blocks
- **🔒 Access Control**: PUBLIC or TOKEN-protected visibility
- **🌐 Public Microsites**: Server-rendered pages at `trust.teei.io/impact/{slug}`
- **💾 Embed SDK**: JavaScript SDK for embedding publications on corporate sites
- **📊 Analytics**: Track views, unique visitors, referrers, and geographic distribution
- **⚡ Performance**: ETag caching, stale-while-revalidate, TTFB <300ms
- **🔐 Security**: XSS sanitization, CSP-safe embeds, tenant scoping, token TTL
- **♿ Accessibility**: WCAG AA compliance, keyboard navigation, semantic HTML

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                       TEEI Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Cockpit    │    │  API Gateway │    │   Reporting  │  │
│  │  (Publisher  │───>│  (REST API)  │───>│   Service    │  │
│  │     UI)      │    │              │    │  (Business   │  │
│  └──────────────┘    └──────────────┘    │   Logic)     │  │
│                                           └──────────────┘  │
│                                                   │          │
│                                                   ▼          │
│                                           ┌──────────────┐  │
│                                           │  PostgreSQL  │  │
│                                           │  (3 tables)  │  │
│                                           └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │      Public Access Layer          │
        ├───────────────────────────────────┤
        │                                   │
        │  ┌──────────────┐  ┌───────────┐ │
        │  │ Trust Center │  │  Embed    │ │
        │  │   (Astro)    │  │   SDK     │ │
        │  │ /impact/:slug│  │ (iframe + │ │
        │  │              │  │postMessage)│ │
        │  └──────────────┘  └───────────┘ │
        │                                   │
        └───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │      End Users & Embeds           │
        │  • Public viewers                 │
        │  • Corporate websites             │
        │  • Partner portals                │
        └───────────────────────────────────┘
```

### Data Model

#### Tables

1. **`publications`**
   - `id` (UUID, PK)
   - `tenant_id` (UUID, FK → companies)
   - `slug` (VARCHAR, unique per tenant)
   - `title`, `description`
   - `status` (ENUM: DRAFT, LIVE, ARCHIVED)
   - `visibility` (ENUM: PUBLIC, TOKEN)
   - SEO fields: `meta_title`, `meta_description`, `og_image`
   - `access_token`, `token_expires_at` (for TOKEN visibility)
   - `etag` (for caching)
   - Timestamps: `published_at`, `created_at`, `updated_at`

2. **`publication_blocks`**
   - `id` (UUID, PK)
   - `publication_id` (UUID, FK → publications, CASCADE)
   - `kind` (ENUM: TILE, TEXT, CHART, EVIDENCE)
   - `payload_json` (JSONB) — block-specific data
   - `order` (INTEGER) — display order
   - Timestamps: `created_at`, `updated_at`

3. **`publication_analytics`**
   - `id` (UUID, PK)
   - `publication_id` (UUID, FK → publications, CASCADE)
   - `visitor_hash` (VARCHAR) — SHA-256(IP + User-Agent)
   - `referrer`, `referrer_domain`
   - `user_agent`, `country` (ISO code)
   - `viewed_at` (TIMESTAMP)

---

## File Structure

```
TEEI-CSR-Platform/
├── apps/
│   ├── corp-cockpit-astro/
│   │   ├── src/
│   │   │   ├── pages/admin/publications/
│   │   │   │   ├── index.astro           # Publications list
│   │   │   │   └── [id].astro             # Publication editor
│   │   │   └── components/publications/
│   │   │       ├── PublicationsList.tsx
│   │   │       └── PublicationEditor.tsx
│   │   └── tests/e2e/
│   │       └── publications.spec.ts       # E2E tests
│   └── trust-center/
│       ├── package.json
│       ├── astro.config.mjs
│       └── src/
│           ├── layouts/BaseLayout.astro
│           ├── pages/impact/[slug].astro  # Public microsite
│           ├── components/
│           │   ├── TileBlock.astro
│           │   ├── TextBlock.astro
│           │   ├── ChartBlock.astro
│           │   └── EvidenceBlock.astro
│           └── lib/api.ts                 # API client
├── services/
│   ├── api-gateway/src/routes/publications/
│   │   ├── index.ts                       # REST routes
│   │   └── __tests__/publications.test.ts # Contract tests
│   └── reporting/src/publications/
│       └── publicationService.ts          # Business logic
├── packages/
│   ├── shared-schema/src/schema/
│   │   └── publications.ts                # Drizzle schema
│   ├── shared-types/src/
│   │   └── publications.ts                # TypeScript types
│   ├── openapi/
│   │   └── publications.yaml              # OpenAPI spec
│   └── sdk/embeds/
│       ├── impact-embed.js                # Embed SDK
│       └── README.md
└── docs/publications/
    ├── README.md                          # This file
    ├── Publishing_Guide.md                # User guide
    └── Embed_Integration.md               # Embed guide
```

---

## API Endpoints

### Authenticated (Cockpit)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/publications` | List all publications for tenant |
| POST | `/v1/publications` | Create new publication |
| GET | `/v1/publications/:id` | Get publication with blocks |
| PATCH | `/v1/publications/:id` | Update publication |
| DELETE | `/v1/publications/:id` | Delete publication |
| POST | `/v1/publications/:id/publish` | Publish publication (DRAFT → LIVE) |
| POST | `/v1/publications/:id/token` | Rotate access token |
| GET | `/v1/publications/:id/stats` | Get analytics stats |
| POST | `/v1/publications/:id/blocks` | Add block |
| PATCH | `/v1/publications/:id/blocks/:blockId` | Update block |
| DELETE | `/v1/publications/:id/blocks/:blockId` | Delete block |

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/publications/:slug` | Get publication by slug (with token if TOKEN-protected) |

---

## Usage

### 1. Creating a Publication (Cockpit)

```typescript
// POST /v1/publications
{
  "slug": "2024-annual-impact",
  "title": "2024 Annual Impact Report",
  "description": "Our impact in 2024",
  "visibility": "PUBLIC",
  "metaTitle": "2024 Annual Impact Report | Acme Corp",
  "metaDescription": "Discover how Acme Corp made a difference in 2024."
}
```

### 2. Adding Blocks

```typescript
// POST /v1/publications/{id}/blocks
{
  "kind": "TILE",
  "order": 0,
  "payloadJson": {
    "kind": "TILE",
    "tileType": "metric",
    "title": "Volunteer Hours",
    "value": 12450,
    "trend": { "direction": "up", "value": 23, "label": "vs. 2023" }
  }
}
```

### 3. Publishing

```typescript
// POST /v1/publications/{id}/publish
{
  "metaTitle": "2024 Annual Impact Report | Acme Corp"
}
```

### 4. Embedding on Corporate Site

```html
<script
  src="https://cdn.teei.io/embed.js"
  data-slug="2024-annual-impact"
></script>
```

---

## Security

### XSS Protection

- **TEXT blocks**: HTML sanitized via `DOMPurify`
- **Allowed tags**: `<p>`, `<h1-6>`, `<strong>`, `<em>`, `<a>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`
- **Forbidden**: `<script>`, `<iframe>`, `<object>`, `<embed>`, `onclick`, etc.

### Token Security

- **Generation**: 32-byte random hex (cryptographically secure)
- **Expiration**: Default 30 days (configurable)
- **Rotation**: Invalidates old token
- **Storage**: Never logged, hashed in analytics

### Tenant Scoping

- All APIs enforce `tenantId` from JWT
- Cross-tenant access blocked at DB level (FK constraints)
- Public endpoint verifies `slug` uniqueness per tenant

### CSP Compliance

- Embed SDK validates `postMessage` origin
- Only `trust.teei.io` and `localhost:4322` allowed
- Untrusted origins logged and ignored

---

## Performance

### Caching Strategy

1. **ETag Generation**: SHA-256 hash of `updatedAt` + random salt
2. **Cache Headers**:
   ```
   ETag: "abc123..."
   Cache-Control: public, max-age=60, stale-while-revalidate=300
   ```
3. **If-None-Match**: Returns `304 Not Modified` if ETag matches
4. **Soft Refresh**: Updates cached copy in background while serving stale

### Targets

- **Public Page TTFB**: ≤300ms (from cache)
- **Embed First Render**: ≤600ms (from script load)
- **Full Page Load**: ≤2s (including charts)

### Optimizations

- **Lazy Loading**: Iframes use `loading="lazy"`
- **CDN**: Embed SDK served via CDN (Cloudflare/Fastly)
- **Compression**: Gzip/Brotli for text content
- **Image Optimization**: OG images < 500KB

---

## Accessibility

### WCAG AA Compliance

- **Semantic HTML**: `<header>`, `<main>`, `<footer>`, `<nav>`
- **Headings**: Proper hierarchy (`<h1>` → `<h2>` → `<h3>`)
- **ARIA**: Labels on interactive elements
- **Keyboard Navigation**: All actions accessible via Tab/Enter
- **Color Contrast**: 4.5:1 for body text, 3:1 for large text
- **Focus Indicators**: Visible outlines on `:focus`

### Testing

- **Axe DevTools**: Automated checks in CI
- **Playwright**: Keyboard navigation tests
- **pa11y-ci**: Continuous a11y monitoring

---

## Analytics

### Metrics Collected

- **Total Views**: All page loads
- **Unique Visitors**: Anonymized SHA-256(IP + User-Agent)
- **Top Referrers**: Domain extraction from `Referer` header
- **Views by Country**: GeoIP lookup (ISO codes)
- **Views Over Time**: Daily counts (last 30 days)

### Privacy

- **No PII**: IP addresses hashed, not stored
- **GDPR Compliant**: Right to erasure supported
- **Anonymized**: Visitor hashes cannot be reversed

---

## Testing

### Contract Tests

```bash
cd services/api-gateway
pnpm test routes/publications
```

**Coverage**: 100% of API endpoints

### E2E Tests

```bash
cd apps/corp-cockpit-astro
pnpm test:e2e publications.spec.ts
```

**Scenarios**:
- Create → Add Blocks → Publish → View → Embed
- Token-protected publications
- Analytics tracking
- A11y compliance
- Performance benchmarks

### Performance Tests

```bash
pnpm perf:check
```

**Budgets**:
- TTFB: ≤300ms
- First Contentful Paint: ≤1s
- Largest Contentful Paint: ≤2.5s

---

## Deployment

### Database Migrations

```bash
pnpm -w db:migrate
```

Applies schema changes for `publications`, `publication_blocks`, `publication_analytics`.

### Build Trust Center

```bash
cd apps/trust-center
pnpm build
```

### Deploy Services

```bash
# API Gateway
cd services/api-gateway
pnpm build
pm2 restart api-gateway

# Reporting Service
cd services/reporting
pnpm build
pm2 restart reporting
```

### Deploy Embed SDK

```bash
cd packages/sdk/embeds
# Upload to CDN
aws s3 cp impact-embed.js s3://cdn.teei.io/embed.js --acl public-read
```

---

## Configuration

### Environment Variables

#### Trust Center

```env
PUBLIC_API_URL=https://api.teei.io
```

#### API Gateway

```env
TRUST_CENTER_URL=https://trust.teei.io
JWT_SECRET=your-secret
```

#### Reporting Service

```env
DATABASE_URL=postgresql://user:pass@host:5432/teei
```

---

## Troubleshooting

### Publication Not Showing

1. Check status: `SELECT status FROM publications WHERE slug = 'your-slug';`
2. Verify LIVE status
3. Check tenant scoping

### Embed Not Loading

1. Check CSP headers allow `trust.teei.io`
2. Verify `data-slug` matches
3. Check browser console for errors

### Analytics Not Tracking

1. Views tracked asynchronously (1-2 min delay)
2. Check `/api/v1/publications/{id}/stats` endpoint
3. Verify GeoIP service is running

---

## Roadmap

### Phase 2 (Future)

- [ ] **Block Templates**: Pre-built block layouts (e.g., "Quarterly Report Template")
- [ ] **Drag-and-Drop Editor**: Visual block composer
- [ ] **Scheduled Publishing**: Set publish date in advance
- [ ] **Version History**: Revert to previous publication states
- [ ] **Collaborative Editing**: Multi-user editing with locking
- [ ] **PDF Export**: Generate PDF from publication
- [ ] **Custom Domains**: Host publications on `impact.acme.com`

---

## Support

- **Documentation**: [Publishing Guide](./Publishing_Guide.md) | [Embed Integration](./Embed_Integration.md)
- **API Reference**: [OpenAPI Spec](../../packages/openapi/publications.yaml)
- **Email**: support@teei.io
- **Slack**: #publications-support

---

## Contributors

- **Worker 19 Team**: Full-stack implementation
- **Tech Lead**: Architecture and orchestration
- **QA Team**: Testing and performance validation

---

## License

Proprietary - TEEI CSR Platform
