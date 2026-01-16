# Phase 1: Discovery & Assessment Report
**Date:** 2025-01-27  
**Project:** CSR Platform → Cloudflare Migration

---

## 1. Current Astro Configuration

### 1.1 Astro Config Location
- **File:** `apps/corp-cockpit-astro/astro.config.mjs`
- **Current Adapter:** `@astrojs/node` (standalone mode)
- **Port:** 4327
- **Output Mode:** `server` (SSR enabled)

### 1.2 Key Configuration Details
- **Integrations:**
  - `@astrojs/react`
  - `@astrojs/tailwind`
  - Custom CSP (Content Security Policy) integration
- **i18n:** Supports `en`, `no`, `uk` locales
- **Vite:** Custom chunking strategy, code splitting, performance optimizations
- **Security:** CSP headers, Trusted Types, security headers in production

---

## 2. Package Dependencies

### 2.1 Current Dependencies (`package.json`)
```json
{
  "@astrojs/node": "^8.0.0",  // ⚠️ NEEDS REPLACEMENT
  "@astrojs/react": "^3.0.0",
  "@astrojs/tailwind": "^5.0.0",
  "@tanstack/react-query": "^5.0.0",
  "astro": "^4.0.0",
  "bcryptjs": "^2.4.3",  // ⚠️ For password hashing
  "chart.js": "^4.5.1",
  "react": "^18.2.0",
  "react-chartjs-2": "^5.3.1",
  "recharts": "^3.5.1",
  "web-vitals": "^3.5.0",
  "zod": "^3.22.0",
  "zustand": "^4.4.0"
}
```

### 2.2 Database Dependencies (Lazy-Loaded)
- **`drizzle-orm`** - Used in `src/pages/api/login.ts` and `src/pages/api/forgot-password.ts`
- **`@teei/shared-schema`** - Shared database schema package
- **`bcryptjs`** - Password hashing

**Note:** Database dependencies are lazy-loaded to allow demo mode without DB.

---

## 3. Database Usage Analysis

### 3.1 Database Calls Found
**Files using database:**
1. `src/pages/api/login.ts` - User authentication
   - Uses `drizzle-orm` with `@teei/shared-schema`
   - Queries: `users`, `companyUsers` tables
   - Password verification with `bcryptjs`

2. `src/pages/api/forgot-password.ts` - Password reset
   - Uses `drizzle-orm` with `@teei/shared-schema`
   - Queries: `users` table

### 3.2 Database Schema (Inferred)
From code analysis:
- **`users`** table:
  - `id`, `email`, `firstName`, `lastName`, `passwordHash`, `role`
- **`companyUsers`** table:
  - `userId`, `companyId` (many-to-many relationship)

### 3.3 Database Connection Pattern
```typescript
// Lazy-load pattern used:
const [{ eq }, { db, users, companyUsers }, bcrypt] = await Promise.all([
  import('drizzle-orm'),
  import('@teei/shared-schema'),
  import('bcryptjs'),
]);
```

**Migration Impact:** Need to replace Drizzle ORM with raw D1 queries or create D1-compatible schema.

---

## 4. Environment Variables Analysis

### 4.1 Service URLs (Microservice Endpoints)
Found **75+ references** to environment variables:

**Core Service URLs:**
- `PUBLIC_REPORTING_API_URL` → Default: `http://localhost:3001`
- `PUBLIC_ANALYTICS_SERVICE_URL` → Default: `http://localhost:3007`
- `PUBLIC_CAMPAIGNS_SERVICE_URL` → Default: `http://localhost:3002`
- `PUBLIC_Q2Q_AI_SERVICE_URL` → Default: `http://localhost:3005`
- `PUBLIC_COMPLIANCE_SERVICE_URL` → Default: Same as REPORTING
- `IDENTITY_SERVICE_URL` / `PUBLIC_IDENTITY_SERVICE_URL` → Default: `http://localhost:3017`
- `NLQ_SERVICE_URL` → Default: `http://localhost:3011`

**Other Environment Variables:**
- `USE_MOCK_AUTH` - Enable mock authentication
- `PUBLIC_FEATURE_ADMIN_STUDIO_V1` - Feature flags
- `PUBLIC_FEATURE_USAGE_ANALYTICS_V1` - Feature flags
- `PUBLIC_SSE_ENDPOINT` - Server-Sent Events endpoint
- `PUBLIC_API_BASE_URL` - General API base URL
- `PUBLIC_USE_REAL_API` - Toggle real vs mock API
- `PUBLIC_REPORTING_DEBUG` - Debug mode
- `VITE_SENTRY_DSN` - Sentry error tracking
- `VITE_ENVIRONMENT` - Environment name
- `OTEL_EXPORTER_ENDPOINT` → Default: `http://localhost:4318/v1/metrics`
- `ENABLE_OTEL` - OpenTelemetry enablement
- `DEMO_MODE_ENABLED` - Demo mode toggle
- `DEMO_CSV_PATH` - Demo data path

### 4.2 Environment Variable Usage Pattern
- **Client-side:** Uses `import.meta.env.PUBLIC_*` (Astro pattern)
- **Server-side:** Uses `process.env.*` or `import.meta.env.*`
- **Fallbacks:** Most have localhost defaults for development

---

## 5. Microservice Architecture Analysis

### 5.1 Services Directory Structure
Found **26 microservices** in `/services/`:

1. **ai-budget** - AI budget management
2. **analytics** - Analytics calculations (port 3007)
3. **api-gateway** - API gateway/router
4. **billing** - Billing service
5. **buddy-connector** - External connector
6. **buddy-service** - Buddy matching service
7. **builder-runtime** - Runtime builder
8. **campaigns** - Campaign management (port 3002)
9. **data-residency** - Data residency compliance
10. **discord-bot** - Discord integration
11. **forecast** - Forecasting service
12. **gdpr-service** - GDPR compliance
13. **impact-calculator** - Impact calculations
14. **impact-in** - Impact data ingestion
15. **insights-nlq** - Natural language queries (port 3011)
16. **journey-engine** - User journey engine
17. **kintell-connector** - External connector
18. **notifications** - Notification service
19. **privacy-orchestrator** - Privacy orchestration
20. **program-service** - Program management
21. **q2q-ai** - Qualitative to Quantitative AI (port 3005)
22. **reporting** - Report generation (port 3001)
23. **safety-moderation** - Content moderation
24. **synthetics** - Synthetic monitoring
25. **unified-profile** - User profile service
26. **upskilling-connector** - External connector

### 5.2 Microservice API Calls Found

**Direct localhost calls (256+ matches):**
- `http://localhost:3001` - Reporting service
- `http://localhost:3002` - Campaigns service
- `http://localhost:3005` - Q2Q AI service
- `http://localhost:3007` - Analytics service
- `http://localhost:3011` - NLQ service
- `http://localhost:3017` - Identity service
- `http://localhost:3023` - Analytics (alternative)
- `http://localhost:4017` - SSE/Compliance service
- `http://localhost:4318` - OpenTelemetry exporter

**API Routes in Astro App:**
- `/api/login` - Authentication
- `/api/forgot-password` - Password reset
- `/api/campaigns` - Campaigns proxy
- `/api/sse/dashboard` - Server-Sent Events
- `/api/usage-analytics/*` - Usage analytics
- `/api/demo/*` - Demo mode endpoints
- `/api/branding/*` - Branding/theming
- `/api/regulatory/*` - Regulatory packs
- `/api/reporting/*` - Report generation
- `/api/exports` - Export functionality

### 5.3 Key API Client Files
1. **`src/api/dashboard.ts`** - Main dashboard API client
   - Fetches SROI, VIS, AI Coverage, Compliance, Campaigns
   - Uses multiple service URLs

2. **`src/api/identity.ts`** - Identity/SSO API client
   - SSO config, SAML, OIDC, SCIM operations

3. **`src/lib/api.ts`** - Generic API client
   - Base API client class

4. **`src/lib/nlq-api.ts`** - Natural Language Query API

---

## 6. Critical Features to Migrate

### 6.1 Authentication & Authorization
- **Current:** Database-backed with Drizzle ORM
- **Files:** `src/pages/api/login.ts`, `src/pages/api/forgot-password.ts`
- **Migration:** Replace with D1 queries, session management

### 6.2 Dashboard Data
- **SROI Calculator** - Calls reporting service
- **VIS (Volunteer Impact Score)** - Calls reporting service
- **AI Coverage** - Calls analytics service
- **Compliance** - Calls compliance/reporting service
- **Campaigns** - Calls campaigns service
- **AI Insights** - Calls Q2Q AI service

### 6.3 Real-Time Features
- **Server-Sent Events (SSE)** - `/api/sse/dashboard`
- **SSE Client** - `src/utils/sseClient.ts` (579 lines)
- **Connection management** - 6-state FSM, retry logic, offline storage

### 6.4 Reporting & Export
- **PDF Generation** - `src/lib/pdf.ts`
- **PPTX Export** - `src/lib/reporting/pptxBridge.ts`
- **Report Generation** - Gen-AI reporting features

### 6.5 Identity & SSO
- **SSO Configuration** - SAML, OIDC
- **SCIM Provisioning** - Role mapping, sync
- **Identity API Client** - `src/api/identity.ts`

---

## 7. Architecture Simplification Strategy

### 7.1 Services to Inline (Move to Astro API Routes)
**High Priority:**
1. **Reporting Service** (port 3001) - Core SROI/VIS calculations
2. **Analytics Service** (port 3007) - Metrics calculations
3. **Campaigns Service** (port 3002) - Campaign management

**Medium Priority:**
4. **Q2Q AI Service** (port 3005) - Can be mocked initially
5. **Identity Service** (port 3017) - SSO/SCIM (can use Cloudflare Workers)

**Low Priority (Remove/Mock for V1):**
6. **NLQ Service** (port 3011) - Natural language queries
7. **Compliance Service** (port 4017) - Can be simplified
8. **OpenTelemetry** (port 4318) - Use Cloudflare Analytics instead

### 7.2 Services to Remove (Not Needed for V1)
- Discord bot
- External connectors (buddy, kintell, upskilling)
- Billing service
- Journey engine
- Privacy orchestrator
- Safety moderation
- Synthetics monitoring

---

## 8. Database Migration Requirements

### 8.1 Current Database Schema (PostgreSQL)
From code analysis, need these tables:
- `users` - User accounts
- `companyUsers` - User-company relationships
- `companies` - Tenant companies
- `sessions` - Auth sessions (implied)
- `volunteers` - Volunteer data
- `programs` - Program definitions
- `volunteer_sessions` - Volunteer activities
- `sroi_snapshots` - Calculated SROI metrics
- `reports` - Generated reports

### 8.2 Migration Approach
1. Create D1 schema matching PostgreSQL structure
2. Convert Drizzle ORM queries to raw D1 SQL
3. Handle SQLite differences (TEXT vs VARCHAR, datetime functions)
4. Migrate seed data

---

## 9. Cloudflare-Specific Considerations

### 9.1 Features to Replace
- **Redis** → Cloudflare KV or D1
- **ClickHouse** → D1 (for analytics, may need to simplify)
- **NATS** → Remove (use Cloudflare Queues if needed)
- **PostgreSQL** → D1 (SQLite)

### 9.2 Features to Keep
- **SSE** - Can work with Cloudflare Pages (with limitations)
- **File Storage** - Use Cloudflare R2
- **CDN** - Built into Cloudflare Pages
- **SSL/TLS** - Automatic with Cloudflare

### 9.3 Potential Limitations
- **SSE** - May need to use Cloudflare Workers for better SSE support
- **Long-running tasks** - Use Cloudflare Workers + Queues
- **File uploads** - Use R2 or Workers
- **Background jobs** - Use Cloudflare Cron Triggers

---

## 10. Migration Priority Matrix

### Phase 1 (Critical - Must Have)
- [ ] Switch Astro adapter to Cloudflare
- [ ] Create D1 database and schema
- [ ] Migrate authentication (login, sessions)
- [ ] Inline SROI/VIS calculations
- [ ] Basic dashboard with metrics

### Phase 2 (Important - Core Features)
- [ ] Campaign management
- [ ] Report generation (basic)
- [ ] Export functionality (CSV/PDF)
- [ ] SSE for real-time updates (if possible)

### Phase 3 (Nice to Have - Can Mock)
- [ ] Q2Q AI insights
- [ ] Advanced analytics
- [ ] SSO/SCIM (can use Workers)
- [ ] Compliance features

### Phase 4 (Future - Remove for V1)
- [ ] NLQ service
- [ ] External connectors
- [ ] Advanced monitoring
- [ ] Complex background jobs

---

## 11. Estimated Migration Complexity

| Component | Complexity | Effort | Notes |
|-----------|-----------|--------|-------|
| Astro Config | Low | 1 hour | Simple adapter swap |
| D1 Schema | Medium | 4 hours | Need to convert PostgreSQL → SQLite |
| Auth Migration | Medium | 6 hours | Replace Drizzle with D1 queries |
| SROI/VIS Inline | High | 16 hours | Complex calculations, need to port logic |
| Campaigns Inline | Medium | 8 hours | Move to Astro API routes |
| SSE Migration | High | 12 hours | May need Workers, complex state management |
| Report Generation | Medium | 8 hours | PDF/PPTX export |
| Testing | High | 16 hours | E2E tests, data validation |
| **Total** | - | **~71 hours** | ~2 weeks for 1 developer |

---

## 12. Next Steps

1. **Review this report** with stakeholders
2. **Create D1 database** and test schema
3. **Start with Phase 1** (adapter + auth)
4. **Incrementally migrate** services one by one
5. **Test each phase** before proceeding

---

## 13. Files to Create/Modify (Summary)

### Create:
- `wrangler.toml` - Cloudflare configuration
- `migrations/001_core_schema.sql` - D1 schema
- `src/lib/db.ts` - D1 database helper
- `src/middleware.ts` - Auth middleware (if not exists)

### Modify:
- `apps/corp-cockpit-astro/astro.config.mjs` - Switch adapter
- `apps/corp-cockpit-astro/package.json` - Update scripts, dependencies
- `src/pages/api/login.ts` - Replace Drizzle with D1
- `src/pages/api/forgot-password.ts` - Replace Drizzle with D1
- `src/api/dashboard.ts` - Inline service calls
- All service URL references - Update to use Astro API routes

---

**Report Generated:** 2025-01-27  
**Status:** ✅ Phase 1 Complete - Ready for Phase 2
