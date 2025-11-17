# Worker 26: PWA + Offline Boardroom + Push Notifications

**Branch**: `claude/worker26-pwa-offline-push-019NGDYLgu3QPcFVs3MesoAd`
**Status**: 🚧 In Progress | **Started**: 2025-11-17

## Mission
Ship PWA + Offline Boardroom + Push Notifications: installable Cockpit, cached board packs for offline viewing, background sync for exports, and push alerts—no new services added.

---

## 30-Agent Team Structure (5 Teams)

### Team 1: PWA Core & Service Worker (6 agents)
**Lead**: `pwa-core-lead`

**Agents:**
- **Agent 1.1**: `manifest-engineer` - MUST BE USED when enhancing manifest.webmanifest (Boardroom shortcut, icons, splash screens, scope)
- **Agent 1.2**: `sw-architect` - MUST BE USED when building src/sw.ts (service worker with caching strategies, routes, versioning)
- **Agent 1.3**: `cache-strategy-dev` - MUST BE USED for cache strategies (stale-while-revalidate, cache-first, network-first with fallback)
- **Agent 1.4**: `sw-lifecycle-dev` - MUST BE USED for SW install/activate/fetch handlers, cache versioning, cleanup
- **Agent 1.5**: `sw-messaging-dev` - MUST BE USED for postMessage API, cache dashboard, clear cache, sync queue
- **Agent 1.6**: `a2hs-ui-dev` - MUST BE USED for Add to Home Screen prompt UI, install banner, install success feedback

**Deliverables:**
- ✅ Enhanced `manifest.webmanifest` with Boardroom shortcut
- ✅ Complete service worker (`src/sw.ts`) with routing, caching, versioning
- ✅ Cache cleanup on activate (delete old versions)
- ✅ A2HS install prompt UI component
- ✅ Integration with existing `swRegistration.ts`

---

### Team 2: Offline Board Packs (6 agents)
**Lead**: `offline-packs-lead`

**Agents:**
- **Agent 2.1**: `board-pack-ui-dev` - MUST BE USED for "Make Available Offline" action button on reports/decks
- **Agent 2.2**: `pack-prefetch-dev` - MUST BE USED for prefetch logic (slides, images, fonts, CSS, JS with SRI hashes)
- **Agent 2.3**: `pack-storage-dev` - MUST BE USED for IndexedDB pack storage schema, integrity validation, size limits
- **Agent 2.4**: `offline-viewer-dev` - MUST BE USED for offline viewer at `/offline/:packId` (read-only, watermarked)
- **Agent 2.5**: `pack-sync-dev` - MUST BE USED for pack update detection, expiration, LRU eviction
- **Agent 2.6**: `pack-ui-manager-dev` - MUST BE USED for offline packs list UI, storage usage, delete packs

**Deliverables:**
- ✅ "Make Available Offline" action on report/deck pages
- ✅ Prefetch worker for assets with integrity hashes
- ✅ IndexedDB schema for board packs (slides, metadata, expiry)
- ✅ Offline viewer with "OFFLINE" watermark banner
- ✅ Pack management UI at `/settings/offline-packs`
- ✅ LRU eviction when storage limit reached

---

### Team 3: Background Sync & Export Queue (5 agents)
**Lead**: `bg-sync-lead`

**Agents:**
- **Agent 3.1**: `export-queue-dev` - MUST BE USED for export job queue (IndexedDB, retry logic, status tracking)
- **Agent 3.2**: `bg-sync-register-dev` - MUST BE USED for Background Sync API registration, sync event handling
- **Agent 3.3**: `export-retry-dev` - MUST BE USED for retry logic with exponential backoff, max retries
- **Agent 3.4**: `export-notify-dev` - MUST BE USED for local notification on export completion (Notification API)
- **Agent 3.5**: `sync-ui-dev` - MUST BE USED for sync queue UI, pending exports badge, manual retry

**Deliverables:**
- ✅ Export queue with retry logic (max 5 retries, exponential backoff)
- ✅ Background Sync registration on export request when offline
- ✅ Sync event handler in service worker
- ✅ Local notification on export completion
- ✅ Pending exports UI with manual retry option

---

### Team 4: Web Push Notifications (7 agents)
**Lead**: `push-lead`

**Agents:**
- **Agent 4.1**: `vapid-key-manager` - MUST BE USED for VAPID key generation, storage, rotation (server-side in notifications service)
- **Agent 4.2**: `push-subscription-dev` - MUST BE USED for subscription endpoints (POST /notifications/subscriptions, DELETE)
- **Agent 4.3**: `push-delivery-dev` - MUST BE USED for Web Push delivery with signature headers, payload encryption
- **Agent 4.4**: `push-topics-dev` - MUST BE USED for topic routing (report.ready, deck.exported, approval.requested, budget.threshold)
- **Agent 4.5**: `push-ui-permission-dev` - MUST BE USED for double opt-in UI, permission prompt handling
- **Agent 4.6**: `push-sw-handler-dev` - MUST BE USED for SW push event handler, notification display, click handling
- **Agent 4.7**: `push-preferences-dev` - MUST BE USED for granular push preferences UI, quiet hours, topic filters

**Deliverables:**
- ✅ VAPID key management in notifications service
- ✅ Subscription lifecycle endpoints in api-gateway
- ✅ Web Push delivery with encryption (web-push library)
- ✅ Topic routing for 4 notification types
- ✅ Double opt-in UI with permission prompt
- ✅ SW push event handler with notification display
- ✅ Push preferences UI with quiet hours, topic filters

---

### Team 5: In-App Notifications & Security (6 agents)
**Lead**: `notifications-ui-lead`

**Agents:**
- **Agent 5.1**: `toast-notification-dev` - MUST BE USED for toast notifications UI (success, info, warning, error)
- **Agent 5.2**: `notification-inbox-dev` - MUST BE USED for in-app inbox, unread count badge, mark read
- **Agent 5.3**: `notification-filter-dev` - MUST BE USED for topic filters, search, date range
- **Agent 5.4**: `notification-deeplink-dev` - MUST BE USED for deep links to report/deck/approval from notification
- **Agent 5.5**: `csp-pwa-dev` - MUST BE USED for CSP upgrades (SW script-src, connect-src for push endpoints)
- **Agent 5.6**: `pwa-security-audit-dev` - MUST BE USED for security audit (no sensitive payloads in push, SW token denial, payload encryption)

**Deliverables:**
- ✅ Toast notifications component with 4 types
- ✅ Notification inbox with unread badge
- ✅ Topic filters and search
- ✅ Deep links from notifications
- ✅ CSP upgrades for PWA (SW, push endpoints)
- ✅ Security audit report (no PII in push payloads, encrypted payloads)

---

## Delivery Slices (W1–W8)

### W1: Service Worker & Manifest
**Agents**: Team 1 (1.1–1.6)
- Enhance manifest with Boardroom shortcut, icons, splash screens
- Build service worker with caching strategies (stale-while-revalidate, cache-first, network-first)
- Cache versioning and cleanup on activate
- A2HS install prompt UI

**Acceptance**:
- ✅ Manifest enhanced with Boardroom shortcut
- ✅ SW registers successfully, caches shell + assets
- ✅ Old caches deleted on activate
- ✅ A2HS prompt displays on supported browsers
- ✅ SW install size ≤150 KB

---

### W2: Offline Board Packs
**Agents**: Team 2 (2.1–2.6)
- "Make Available Offline" action on reports/decks
- Prefetch slides, images, fonts with SRI hashes
- IndexedDB pack storage with integrity validation
- Offline viewer at `/offline/:packId` with watermark

**Acceptance**:
- ✅ "Make Available Offline" button functional
- ✅ Prefetch downloads all assets with integrity hashes
- ✅ Offline viewer displays board pack with "OFFLINE" banner
- ✅ Pack size limit enforced (LRU eviction)
- ✅ Read-only mode (no edit actions)

---

### W3: Background Sync for Exports
**Agents**: Team 3 (3.1–3.5)
- Export queue with retry logic (exponential backoff, max 5 retries)
- Background Sync registration
- Local notification on export completion

**Acceptance**:
- ✅ Export jobs queued when offline
- ✅ Background Sync triggers on reconnect
- ✅ Retry logic with exponential backoff (max 5 retries)
- ✅ Local notification on export completion
- ✅ Success rate ≥99% within 5 retries

---

### W4: VAPID & Push Subscriptions
**Agents**: Team 4 (4.1–4.3, 4.5)
- VAPID key generation and management (server-side)
- Subscription endpoints (POST /notifications/subscriptions, DELETE)
- Double opt-in permission UI

**Acceptance**:
- ✅ VAPID keys generated and stored securely
- ✅ Subscription endpoints operational
- ✅ Double opt-in UI prompts for permission
- ✅ Subscriptions stored in PostgreSQL
- ✅ Minimal tokens stored (no PII)

---

### W5: Push Delivery & Topics
**Agents**: Team 4 (4.4, 4.6, 4.7)
- Topic routing (4 topics)
- Web Push delivery with encryption
- SW push event handler
- Push preferences UI

**Acceptance**:
- ✅ 4 topics routed correctly (report.ready, deck.exported, approval.requested, budget.threshold)
- ✅ Push payloads encrypted
- ✅ SW displays notifications correctly
- ✅ Push preferences UI with quiet hours, topic filters

---

### W6: In-App Notifications UI
**Agents**: Team 5 (5.1–5.4)
- Toast notifications (4 types)
- Notification inbox with unread badge
- Topic filters and search
- Deep links from notifications

**Acceptance**:
- ✅ Toast notifications display correctly
- ✅ Inbox shows all notifications with unread badge
- ✅ Topic filters functional
- ✅ Deep links navigate to correct pages

---

### W7: Security & CSP
**Agents**: Team 5 (5.5–5.6)
- CSP upgrades for SW, push endpoints
- Security audit (no sensitive payloads, encrypted payloads, SW token denial)

**Acceptance**:
- ✅ CSP allows SW script-src, connect-src for push endpoints
- ✅ No sensitive data in push payloads
- ✅ Payloads encrypted with VAPID signature
- ✅ SW denied access to auth tokens
- ✅ Security audit report published

---

### W8: Testing, Docs & CI
**All Teams**
- Extend e2e tests for all PWA features
- OpenAPI spec for notifications endpoints
- PWA docs (install guide, offline modes, push topics)
- CI workflow for PWA tests

**Acceptance**:
- ✅ E2E tests for: install, offline board packs, background sync, push notifications
- ✅ Unit tests for cache logic, queue, push delivery
- ✅ Contract tests for `/notifications/*` endpoints
- ✅ PWA docs published (`/docs/pwa/install.md`, `/docs/pwa/offline-modes.md`, `/docs/pwa/push-topics.md`)
- ✅ CI workflow passes all PWA tests
- ✅ Performance: repeat visit LCP p95 ≤2.4s, export bg sync success ≥99%

---

## Quality Gates & Guardrails

**Blocking Conditions** (Fail CI):
- ❌ SW install size >150 KB
- ❌ Offline start time >2.0s on repeat visits
- ❌ Board pack cache size guard missing (LRU eviction)
- ❌ Sensitive data in push payloads (PII, auth tokens)
- ❌ SW has access to auth tokens
- ❌ CSP violations (SW script-src, connect-src)
- ❌ Export background sync success <99% within 5 retries
- ❌ E2E PWA tests failing
- ❌ A11y violations in offline UI (keyboard-operable, ARIA live regions)

**Enforcement**:
- Existing PR gates apply: lint, typecheck, unit ≥80%, E2E ≥60%, security audits, a11y
- New gates: `pnpm pwa:test`, `pnpm pwa:perf`, `pnpm pwa:security`

**No Secrets Policy**:
- VAPID keys stored in environment variables (not repo)
- No API keys, DB passwords, or PII in repo

---

## Success Criteria

✅ **W1 (SW & Manifest)**: Manifest enhanced, SW operational, A2HS working, SW install ≤150 KB
✅ **W2 (Offline Packs)**: Board packs prefetch, offline viewer functional, LRU eviction working
✅ **W3 (Background Sync)**: Export queue operational, background sync triggers, retry ≥99% success
✅ **W4 (VAPID & Subscriptions)**: VAPID keys secure, subscription endpoints operational, double opt-in UI
✅ **W5 (Push Delivery)**: 4 topics routed, payloads encrypted, SW displays notifications, preferences UI
✅ **W6 (In-App UI)**: Toasts, inbox, filters, deep links all functional
✅ **W7 (Security)**: CSP compliant, no sensitive payloads, security audit published
✅ **W8 (Testing & Docs)**: E2E tests pass, docs published, CI workflow green

---

## Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **Documentation**: Update `/docs/pwa/` after each milestone
- **Agent Artifacts**: All agents write-to-file in `/docs/pwa/` + update `/WORKER26_PLAN.md`

---

## Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does Tech Lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early (e.g., push UI depends on VAPID backend)
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every feature documented in `/docs/pwa/`
6. **Least-privilege tools** - Agents use minimum required tools (no unnecessary Bash/Grep by UI agents)

---

## Current Progress

**Completed** (2025-11-17):
- ✅ Initial codebase exploration
- ✅ 30-agent plan created
- ✅ W1: Service Worker & Manifest
  - Enhanced manifest.webmanifest with Boardroom shortcut
  - Complete service worker (src/sw.ts) with 3 caching strategies
  - Cache versioning and cleanup
  - Integration with existing PWA components (InstallPrompt, OfflineIndicator)
- ✅ W2: Offline Board Packs
  - Board pack types and storage (IndexedDB)
  - Prefetch worker with SRI integrity hashes
  - "Make Available Offline" UI component
  - Offline packs manager
  - LRU eviction policy (150 MB limit, 10 packs max)
- ✅ W3: Background Sync for Exports
  - Export queue with retry logic (max 5 retries, exponential backoff)
  - Background Sync API integration
  - Local notifications on completion
  - Auto-sync on reconnect
- ✅ W8: Documentation (Partial)
  - PWA installation guide (docs/pwa/install.md)
  - Offline modes documentation (docs/pwa/offline-modes.md)

**In Progress**:
- 🚧 W4–W7: Web Push Notifications (Deferred to focused session)
  - VAPID key management
  - Push subscription endpoints
  - Topic routing
  - In-app notifications UI

**Next Up**:
- W4: VAPID & Push Subscriptions (requires notifications service enhancement)
- W5: Push Delivery & Topics
- W6: In-App Notifications UI
- W7: Security & CSP
- W8: Testing & CI completion
