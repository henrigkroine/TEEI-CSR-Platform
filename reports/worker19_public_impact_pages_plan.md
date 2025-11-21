# Worker 19: Public Impact Pages & Embeds - Multi-Agent Plan

**Branch**: `claude/worker19-public-impact-pages-embeds-01UgAzvB58s8WjrqeaHCE3Y2`
**Status**: 🚧 In Progress | **Started**: 2025-11-17
**Mission**: Build public microsites on Trust Center and secure embed scripts for corporate sites

---

## Team Structure (30 Agents / 5 Leads)

### Team 1: Database & Schema (6 agents)
**Lead**: schema-lead
- **Agent 1.1**: schema-architect (MUST BE USED when defining publications/publication_blocks tables. Blocks if tenant scoping missing)
- **Agent 1.2**: migration-author (MUST BE USED for Drizzle migrations. Blocks if rollback strategy undefined)
- **Agent 1.3**: types-generator (MUST BE USED when creating shared-types/publications. Blocks if Zod validation missing)
- **Agent 1.4**: seed-data-author (MUST BE USED for test fixtures. Blocks if multi-tenant scenarios missing)
- **Agent 1.5**: index-optimizer (MUST BE USED for database indexes (slug, tenant_id, status). Blocks if composite indexes missing)
- **Agent 1.6**: relations-mapper (MUST BE USED for Drizzle relations. Blocks if cascade behaviors undefined)

### Team 2: API & Backend (6 agents)
**Lead**: api-lead
- **Agent 2.1**: crud-api-engineer (MUST BE USED for POST/PATCH/DELETE /publications. Blocks if tenant scoping missing)
- **Agent 2.2**: publish-pipeline-engineer (MUST BE USED for POST /publications/:id/live. Blocks if validation missing)
- **Agent 2.3**: token-auth-engineer (MUST BE USED for POST /publications/:id/token. Blocks if TTL/rotation missing)
- **Agent 2.4**: public-api-engineer (MUST BE USED for GET /publications/:slug. Blocks if cache headers missing)
- **Agent 2.5**: analytics-api-engineer (MUST BE USED for GET /publications/:id/stats. Blocks if anonymization missing)
- **Agent 2.6**: cache-invalidation-engineer (MUST BE USED for ETags + cache busting. Blocks if stale-while-revalidate missing)

### Team 3: Publisher UI (6 agents)
**Lead**: publisher-ui-lead
- **Agent 3.1**: tile-selector-dev (MUST BE USED for tile/section picker UI. Blocks if preview missing)
- **Agent 3.2**: block-composer-dev (MUST BE USED for drag-drop block arrangement. Blocks if a11y keyboard nav missing)
- **Agent 3.3**: preview-renderer-dev (MUST BE USED for live preview pane. Blocks if responsive breakpoints missing)
- **Agent 3.4**: seo-controls-dev (MUST BE USED for meta title/desc/OG image inputs. Blocks if character limits missing)
- **Agent 3.5**: visibility-controls-dev (MUST BE USED for PUBLIC/TOKEN toggle + token display. Blocks if copy-to-clipboard missing)
- **Agent 3.6**: publication-status-dev (MUST BE USED for DRAFT/LIVE status indicator + publish button. Blocks if optimistic updates missing)

### Team 4: Trust Center & Embed (6 agents)
**Lead**: frontend-lead
- **Agent 4.1**: microsite-page-dev (MUST BE USED for /impact/:slug Astro page. Blocks if SSR missing)
- **Agent 4.2**: token-gate-dev (MUST BE USED for token validation middleware. Blocks if error states missing)
- **Agent 4.3**: sitemap-generator (MUST BE USED for sitemap.xml + robots.txt. Blocks if non-public pages included)
- **Agent 4.4**: embed-sdk-engineer (MUST BE USED for packages/sdk/embeds/embed.js. Blocks if postMessage height sync missing)
- **Agent 4.5**: embed-iframe-engineer (MUST BE USED for responsive iframe rendering. Blocks if CSP origin checks missing)
- **Agent 4.6**: embed-examples-author (MUST BE USED for docs/embeds/integration.md. Blocks if multiple frameworks missing)

### Team 5: Security, Analytics & QA (6 agents)
**Lead**: qa-security-lead
- **Agent 5.1**: xss-sanitizer-dev (MUST BE USED for HTML sanitization in TEXT blocks. Blocks if DOMPurify missing)
- **Agent 5.2**: signed-request-engineer (MUST BE USED for signed embed requests. Blocks if HMAC validation missing)
- **Agent 5.3**: analytics-tracker-dev (MUST BE USED for view tracking (anonymized). Blocks if PII logging detected)
- **Agent 5.4**: contract-test-author (MUST BE USED for API contract tests. Blocks if publish/read workflows untested)
- **Agent 5.5**: e2e-test-author (MUST BE USED for Playwright tests. Blocks if compose→publish→view→embed flow untested)
- **Agent 5.6**: perf-engineer (MUST BE USED for TTFB ≤300ms, first render ≤600ms. Blocks if budgets exceeded)

---

## Delivery Slices (P1–P7)

### P1: Database Schema & Migrations
**Agents**: 1.1–1.6, schema-lead
**Deliverables**:
- Tables: `publications(id, tenant_id, slug, title, status, visibility, updated_at)`, `publication_blocks(publication_id, kind, payload_json, order)`
- Drizzle migrations with rollback
- Indexes: `publications_tenant_slug_idx`, `publications_status_idx`, `publication_blocks_publication_order_idx`
- Seed data: 3 sample publications (PUBLIC, TOKEN, multi-block)
- **Acceptance**: Migrations apply/rollback cleanly; tenant scoping enforced; seed data loads

### P2: Publication APIs
**Agents**: 2.1–2.6, api-lead
**Deliverables**:
- `POST /api/publications` (create draft)
- `PATCH /api/publications/:id` (update draft)
- `POST /api/publications/:id/live` (publish)
- `POST /api/publications/:id/token` (rotate token)
- `GET /publications/:slug` (public read with token gate)
- `GET /api/publications/:id/stats` (analytics)
- Cache headers: ETag, stale-while-revalidate, max-age
- **Acceptance**: All endpoints return shaped data; tenant scoping enforced; cache headers present; token TTL 30d

### P3: Publisher UI (Cockpit)
**Agents**: 3.1–3.6, publisher-ui-lead
**Deliverables**:
- Page: `/cockpit/[companyId]/publications`
- Tile/section picker with multi-select
- Drag-drop block composer with order preview
- Live preview pane (responsive: desktop/tablet/mobile)
- SEO inputs: meta title (60 chars), meta description (160 chars), OG image upload
- Visibility toggle: PUBLIC/TOKEN with token display + copy button
- Publish button with optimistic updates + status badge
- **Acceptance**: Can compose 3+ block publication; preview updates live; publish succeeds; token displayed

### P4: Trust Center Microsites
**Agents**: 4.1–4.3, frontend-lead
**Deliverables**:
- Page: `/impact/:slug` in apps/trust-center
- SSR with cache headers (max-age=3600, stale-while-revalidate=86400)
- Token gate middleware (validates token from query param or header)
- Sitemap.xml generation (PUBLIC publications only)
- Robots.txt (allow PUBLIC, disallow TOKEN)
- 404 handling for missing/draft publications
- **Acceptance**: Public page renders ≤300ms TTFB; token-gated page blocks unauthorized; sitemap lists PUBLIC only

### P5: Embed SDK
**Agents**: 4.4–4.6, frontend-lead
**Deliverables**:
- SDK: `packages/sdk/embeds/embed.js` (vanilla JS, no deps)
- Usage: `<script src="..." data-slug="..." data-tenant="..."></script>`
- Renders responsive iframe with auto-height (postMessage height sync)
- CSP-safe origin checks (validates parent origin)
- Error states: publication not found, token invalid, network error
- Examples: React, Vue, Vanilla HTML integration docs
- **Acceptance**: Embed renders ≤600ms; height syncs on content change; CSP errors blocked; docs include 3 frameworks

### P6: Security & Analytics
**Agents**: 5.1–5.3, qa-security-lead
**Deliverables**:
- XSS sanitization for TEXT blocks (DOMPurify or equivalent)
- Signed embed requests (HMAC-SHA256 with tenant secret)
- Analytics: `publication_views(publication_id, viewed_at, referrer, anonymized_ip)`
- Anonymization: hash IP with salt, no PII stored
- Stats endpoint: unique views (count distinct), total views, top referrers (last 30d)
- **Acceptance**: TEXT blocks sanitized (no <script>); signed requests validated; analytics anonymized; stats accurate

### P7: Testing, Docs & CI
**Agents**: 5.4–5.6, All Leads
**Deliverables**:
- Contract tests: POST/PATCH/publish/read workflows (80%+ coverage)
- E2E tests: compose → publish → view public → view token → embed → analytics (Playwright)
- Performance tests: TTFB ≤300ms (public page), first render ≤600ms (embed)
- A11y tests: WCAG AA compliance (microsites + publisher UI)
- OpenAPI spec: `packages/openapi/publications.yaml`
- Docs: `/docs/publications/publishing-guide.md`, `/docs/publications/embed-integration.md`
- CI gates: lint, typecheck, unit ≥80%, E2E ≥60%, perf budgets
- **Acceptance**: All tests pass; OpenAPI valid; docs published; CI green

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **schema-lead**: Create publications/publication_blocks tables + migrations
2. **api-lead**: Scaffold API routes (CRUD endpoints)
3. **qa-security-lead**: Set up test frameworks (Vitest, Playwright)

### Phase 2: Core APIs & UI (Week 2)
1. **Team 2 (API)**: Implement CRUD + publish + token APIs
2. **Team 3 (Publisher UI)**: Build tile selector + block composer
3. **Team 1 (Schema)**: Create seed data + fixtures

### Phase 3: Public Pages & Embed (Week 3)
1. **Team 4 (Frontend)**: Build /impact/:slug microsites
2. **Team 4 (Frontend)**: Create embed SDK + examples
3. **Team 2 (API)**: Implement cache headers + ETags

### Phase 4: Security & Analytics (Week 4)
1. **Team 5 (Security)**: Add XSS sanitization + signed requests
2. **Team 5 (Analytics)**: Build view tracking + stats endpoint
3. **Team 3 (Publisher UI)**: Add SEO controls + preview pane

### Phase 5: Testing & Launch (Week 5)
1. **All Teams**: Execute contract + E2E tests
2. **Team 5 (QA)**: Performance testing (TTFB, first render)
3. **All Leads**: Documentation review + PR prep

---

## Quality Gates & Guardrails

**Blocking Conditions** (Fail CI):
- ❌ Tenant scoping missing from any API endpoint
- ❌ Token TTL > 90 days or missing rotation
- ❌ Cache headers missing from public pages (ETag, stale-while-revalidate)
- ❌ XSS sanitization missing from TEXT blocks
- ❌ PII logging detected in analytics (no raw IPs, emails, names)
- ❌ Embed SDK missing CSP origin checks
- ❌ Performance budgets exceeded (TTFB >300ms, first render >600ms)
- ❌ A11y violations (WCAG AA) in microsites or publisher UI
- ❌ E2E coverage <60% (compose→publish→view→embed flow)
- ❌ OpenAPI spec invalid or missing endpoints

**Enforcement**:
- Existing gates: lint, typecheck, unit ≥80%, E2E ≥60%, security audits, a11y
- New gates: `pnpm publications:validate` (tenant scoping + cache headers), `pnpm perf:ci` (TTFB/render budgets)

**No Secrets Policy**:
- Use Vault/Secrets Manager for tenant secrets (embed signing keys)
- No API keys, tokens, or PII in repo

---

## Success Criteria

✅ **P1 (Schema)**: Migrations apply/rollback; tenant scoping enforced; seed data loads
✅ **P2 (APIs)**: All endpoints return shaped data; cache headers present; token TTL 30d; tenant scoping enforced
✅ **P3 (Publisher UI)**: Can compose 3+ block publication; preview updates live; publish succeeds; token displayed
✅ **P4 (Microsites)**: Public page TTFB ≤300ms; token-gated page blocks unauthorized; sitemap lists PUBLIC only
✅ **P5 (Embed SDK)**: Embed renders ≤600ms; height syncs; CSP errors blocked; docs include 3 frameworks
✅ **P6 (Security & Analytics)**: TEXT blocks sanitized; signed requests validated; analytics anonymized; stats accurate
✅ **P7 (Testing & Docs)**: All tests pass (unit ≥80%, E2E ≥60%); OpenAPI valid; docs published; CI green

---

## Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **Documentation**: Update `/reports/worker19_readout.md` after each milestone
- **Agent Artifacts**: All agents write-to-file in `/reports/` + update this plan

---

## Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does Tech Lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early (e.g., UI depends on APIs)
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every API, component, workflow documented
6. **Least-privilege tools** - Agents use minimum required tools

---

## Current Status

**Completed**:
- ✅ Multi-agent plan created

**In Progress**:
- 🚧 P1: Database Schema & Migrations

**Blocked**: None

**Next Up**: P2: Publication APIs
