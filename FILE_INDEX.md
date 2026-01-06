# TEEI CSR Platform - Complete File Index

**Generated**: 2025-01-27  
**Repository**: TEEI_CSR_Platform  
**Monorepo Structure**: PNPM Workspaces + Turbo

---

## Table of Contents

1. [Root Configuration Files](#root-configuration-files)
2. [Packages Directory](#packages-directory)
3. [Services Directory](#services-directory)
4. [Apps Directory](#apps-directory)
5. [Infrastructure & DevOps](#infrastructure--devops)
6. [Documentation](#documentation)
7. [Scripts](#scripts)
8. [Tests](#tests)
9. [Configuration Files](#configuration-files)

---

## Root Configuration Files

### Core Configuration
- `package.json` - Root workspace configuration
- `pnpm-workspace.yaml` - PNPM workspace definitions
- `pnpm-lock.yaml` - Dependency lock file
- `turbo.json` - Turbo build system configuration
- `tsconfig.base.json` - Base TypeScript configuration
- `tsconfig.json` - Root TypeScript config
- `vitest.config.ts` - Vitest test configuration
- `playwright.config.ts` - Playwright E2E test configuration
- `commitlint.config.js` - Commit message linting
- `.chromatic.yml` - Visual regression testing config

### Docker & Infrastructure
- `docker-compose.yml` - Main Docker Compose configuration
- `docker-compose.e2e.yml` - E2E test Docker Compose
- `cloudflare-cdn.config.js` - CDN configuration

### Documentation & Planning
- `README.md` - Main project README
- `CLAUDE.md` - Claude Code enablement guide
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy
- `TESTING.md` - Testing guidelines
- `QUICKSTART.md` - Quick start guide
- `AGENTS.md` - Multi-agent orchestration plan
- `MULTI_AGENT_PLAN.md` - Agent coordination details
- `LICENSE` - License file

### Status Reports & Summaries
- `COMPREHENSIVE_STATUS_REPORT_2025-11-17.md`
- `PLATFORM_STATUS_2025.md`
- `PLATFORM_STATUS_REPORT_2025.md`
- `PROJECT_OVERVIEW_COMPREHENSIVE.md`
- `SERVICES_INVENTORY.md`
- Multiple agent completion reports (AGENT_*.md)
- Multiple worker summaries (WORKER*.md)
- Multiple phase summaries (PHASE_*.md)

---

## Packages Directory

### Shared Libraries (26+ packages)

#### `packages/shared-schema/`
**Purpose**: Drizzle ORM schemas for PostgreSQL
- `drizzle.config.ts` - Drizzle configuration
- `package.json`, `tsconfig.json`
- `src/schema/` - Database schemas (54 files: 50 *.ts, 3 *.sql, 1 *.json)
  - Core schemas: users, companies, programs, enrollments, sessions
  - Evidence ledger, metric lineage, report citations
  - Lineage tracking, program instances, ingestion batches
- `migrations/` - Database migrations (52 files: 51 *.sql, 1 *.md)
- `seeds/` - Seed data (1 *.sql)
- `README.md`

#### `packages/shared-types/`
**Purpose**: TypeScript type definitions
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `src/` - Type definitions (27 *.ts files)
- `collab/`, `demo/` - Feature-specific types
- Documentation: `DECK_QUICK_REFERENCE.md`, `DECK_SCHEMA_DIAGRAM.txt`, `DECK_SCHEMA_SUMMARY.md`, `DECK_USAGE_EXAMPLES.md`

#### `packages/event-contracts/`
**Purpose**: NATS event schemas
- `package.json`, `tsconfig.json`
- `src/` - Event contract definitions (47 *.ts files)

#### `packages/model-registry/`
**Purpose**: AI model configuration
- `package.json`, `tsconfig.json`
- `schema.yaml` - Model registry schema
- `src/` - Registry implementation (5 *.ts files)
- `tenant-overrides/` - Tenant-specific model configs (1 *.yaml)
- `README.md`

#### `packages/openapi/`
**Purpose**: OpenAPI specifications
- `package.json`
- `index.md` - API documentation index
- OpenAPI specs:
  - `admin.yaml`, `ai-audit.yaml`, `api-gateway.yaml`
  - `audit.yaml`, `billing.yaml`, `branding.yaml`
  - `buddy-service.yaml`, `collab.yaml`, `deck.yaml`
  - `demo.yaml`, `hierarchies.yaml`, `imports.yaml`
  - `kintell-connector.yaml`, `publications.yaml`
  - `q2q-ai.yaml`, `reporting.yaml`
  - `safety-moderation.yaml`, `scenario.yaml`
  - `tiles.yaml`, `trust-catalog.yaml`
  - `unified-profile.yaml`, `upskilling-connector.yaml`
- `schemas/` - Shared schemas (1 *.yaml)
- `scripts/` - OpenAPI tooling (1 *.sh)
- `v1-final/` - Finalized API versions (8 files: 7 *.yaml, 1 *.md)

#### `packages/clients/`
**Purpose**: Service client libraries
- `package.json`, `tsconfig.json`
- `journey.ts`, `q2q.ts`, `reporting.ts` - Service clients
- `usage-analytics/` - Analytics client (client.ts, stuck-detector.ts, taxonomy.ts)
- `dist/` - Compiled output
- `README.md`

#### `packages/compliance/`
**Purpose**: Compliance utilities
- `package.json`, `tsconfig.json`
- `src/` - Compliance modules:
  - `audit-logger.ts`, `dsr-orchestrator.ts`
  - `pii-encryption.ts`, `tenant-isolation.ts`
  - `index.ts`

#### `packages/data-masker/`
**Purpose**: PII data masking
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `src/` - Masking utilities (12 *.ts files)
- `dist/` - Compiled output
- `README.md`

#### `packages/entitlements/`
**Purpose**: Feature entitlement engine
- `package.json`, `tsconfig.json`
- `src/` - Entitlement logic:
  - `engine/`, `cache/`, `types/`
  - `__tests__/` - Tests
  - `index.ts`

#### `packages/observability/`
**Purpose**: Observability utilities
- `package.json`, `tsconfig.json`
- `src/` - Observability modules (17 *.ts files)
- `collab/` - Collaboration observability (1 *.ts)
- `README.md`

#### `packages/metrics/`
**Purpose**: Metrics calculation utilities
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `src/` - Metrics modules (9 *.ts files)
- `README.md`

#### `packages/shared-auth/`
**Purpose**: Shared authentication utilities
- `package.json`, `tsconfig.json`
- `src/` - Auth modules (5 *.ts files)

#### `packages/shared-utils/`
**Purpose**: Shared utility functions
- `package.json`, `tsconfig.json`
- `src/` - Utility modules (8 *.ts files)

#### `packages/events/`
**Purpose**: Event handling utilities
- `package.json`, `tsconfig.json`
- `src/` - Event modules (`dlq.ts`, `index.ts`)
- `README.md`

#### `packages/http-client/`
**Purpose**: HTTP client utilities
- `package.json`, `tsconfig.json`
- `src/` - HTTP client (2 *.ts files)
- `README.md`

#### `packages/ingestion-buddy/`
**Purpose**: Data ingestion utilities
- `package.json`, `tsconfig.json`
- `src/` - Ingestion modules (17 *.ts files)

#### `packages/program-templates/`
**Purpose**: Program template system
- `package.json`, `tsconfig.json`
- `src/` - Template modules (5 *.ts files)

#### `packages/contracts/`
**Purpose**: Pact contract testing
- `package.json`, `tsconfig.json`
- `vitest.pact.config.ts` - Pact test configuration
- `pact-tests/` - Contract tests (10 *.test.ts files)
- `CONTRACTS_SUMMARY.md`, `PROVIDER_IMPLEMENTATION_GUIDE.md`, `README.md`

#### `packages/sdk/`
**Purpose**: Public SDK
- `embeds/` - Embed SDK (6 files: 2 *.js, 2 *.json, 1 *.md, 1 *.ts)
- `typescript/` - TypeScript SDK (10 files: 7 *.ts, 2 *.json, 1 *.md)

#### `packages/auth/`
**Purpose**: Authentication configuration
- `src/config-loader.ts`, `src/service-auth.ts`

#### `packages/db/`
**Purpose**: Database utilities
- `src/backup.ts`, `src/optimizer.ts`

---

## Services Directory

### Backend Microservices (26+ services)

#### `services/reporting/`
**Purpose**: SROI/VIS calculations, report generation, Gen-AI narratives
- `package.json`, `tsconfig.json`
- `src/` - Main service code (184 *.ts files)
  - Calculators: SROI, VIS
  - Report generation: PDF, PPTX
  - Gen-AI templates (19 *.hbs files)
  - Citation validation, PII redaction
- `tests/` - Test suites
- `src/openapi.json` - OpenAPI spec
- Documentation: Multiple *.md files

#### `services/analytics/`
**Purpose**: ClickHouse analytics engine
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `Dockerfile`
- `src/` - Analytics modules (85 files: 82 *.ts, 3 *.sql)
- `config/` - Configuration (1 *.json)
- `test.http` - HTTP test file
- `README.md`

#### `services/api-gateway/`
**Purpose**: GraphQL/REST gateway, authentication, rate limiting
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Gateway code (49 files: 48 *.ts, 1 *.sql)
- `tests/` - Gateway tests (1 *.http)
- `test.http` - HTTP test file
- `TENANT_MIDDLEWARE.md` - Middleware documentation
- `dist/` - Compiled output

#### `services/impact-in/`
**Purpose**: External data ingestion (Benevity, Goodera, Workday connectors)
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Ingestion modules (74 *.ts files)
- `scheduler/` - Scheduling (1 *.ts)
- `sla-monitor/` - SLA monitoring (1 *.ts)
- `__tests__/` - Tests (2 *.ts)
- `test.http` - HTTP test file
- `README.md`

#### `services/q2q-ai/`
**Purpose**: Qualitative-to-Quantitative AI pipeline
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Q2Q pipeline (82 files: 76 *.ts, 3 *.yaml, 2 *.md, 1 *.jsonl)
- `golden-sets/` - Golden test sets (4 files: 3 *.jsonl, 1 *.md)
- `demo-safety.ts` - Safety demo
- `test.http` - HTTP test file
- `SAFETY_IMPLEMENTATION_REPORT.md`, `README.md`

#### `services/insights-nlq/`
**Purpose**: Natural Language Query insights
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `src/` - NLQ engine (89 files: 80 *.ts, 5 *.hbs, 4 *.md)
- `scripts/` - NLQ scripts (1 *.ts)
- Multiple implementation summaries (*.md)
- `README.md`

#### `services/campaigns/`
**Purpose**: Campaign management
- `package.json`, `tsconfig.json`
- `openapi.yaml` - OpenAPI spec
- `src/` - Campaign service (37 *.ts files)
- `tests/` - Campaign tests (14 *.ts files)
- Multiple agent completion reports (*.md)
- `README.md`

#### `services/buddy-service/`
**Purpose**: Buddy matching system
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Buddy service (6 files: 5 *.ts, 1 *.csv)
- `test.http` - HTTP test file

#### `services/buddy-connector/`
**Purpose**: Buddy system connector
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Connector code (35 files: 28 *.ts, 4 *.map, 2 *.js, 1 *.json)
- `README.md`

#### `services/kintell-connector/`
**Purpose**: Kintell integration connector
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Connector code (18 files: 16 *.ts, 1 *.csv, 1 *.md)
- `test.http` - HTTP test file

#### `services/upskilling-connector/`
**Purpose**: Upskilling platform connector
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Connector code (8 files: 6 *.ts, 2 *.csv)
- `test.http` - HTTP test file

#### `services/journey-engine/`
**Purpose**: User journey orchestration
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Journey engine (15 files: 12 *.ts, 3 *.yaml)
- `__tests__/` - Tests (2 *.ts)
- `test.http` - HTTP test file
- `README.md`

#### `services/notifications/`
**Purpose**: Notification service
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Notification modules (28 files: 24 *.ts, 4 *.mjml)
- `migrations/` - DB migrations (1 *.sql)
- `INTEGRATION_SCHEMA.sql` - Integration schema
- `W5_IMPLEMENTATION_SUMMARY.md`

#### `services/unified-profile/`
**Purpose**: Unified user profile service
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Profile service (12 *.ts files)
- `openapi-profile-linking.yaml` - OpenAPI spec
- `test.http` - HTTP test file

#### `services/safety-moderation/`
**Purpose**: Content safety and moderation
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Safety modules (7 *.ts files)
- `test.http` - HTTP test file

#### `services/program-service/`
**Purpose**: Program management service
- `package.json`
- `openapi.yaml` - OpenAPI spec
- `src/` - Program service (10 *.ts files)
- `migrations/` - Migrations (1 *.ts)
- `INTEGRATION_CHECKLIST.md`, `README.md`

#### `services/forecast/`
**Purpose**: Forecasting service
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `src/` - Forecast modules (18 *.ts files)
- `README.md`

#### `services/impact-calculator/`
**Purpose**: Impact calculation service
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Calculator modules (4 *.ts files)
- `tests/` - Tests (1 *.ts)
- `README.md`

#### `services/billing/`
**Purpose**: Billing service
- `package.json`, `tsconfig.json`
- `src/` - Billing modules (15 *.ts files)

#### `services/data-residency/`
**Purpose**: Data residency enforcement
- `package.json`, `tsconfig.json`
- `src/` - Residency modules (15 *.ts files)

#### `services/ai-budget/`
**Purpose**: AI budget management
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Budget modules:
  - `budget-enforcer.ts`
  - `db/` - Database (4 files: 2 *.sql, 2 *.ts)
  - `routes/` - API routes (2 *.ts)
  - `types/` - Types (1 *.ts)
  - `index.ts`

#### `services/privacy-orchestrator/`
**Purpose**: Privacy orchestration
- `package.json`, `tsconfig.json`
- `src/` - Privacy modules (6 *.ts files)
- `README.md`

#### `services/gdpr-service/`
**Purpose**: GDPR compliance service
- `src/` - GDPR modules (3 *.ts files)

#### `services/builder-runtime/`
**Purpose**: Builder runtime service
- `package.json`, `tsconfig.json`
- `src/` - Runtime modules (12 *.ts files)

#### `services/synthetics/`
**Purpose**: Synthetic monitoring
- `package.json`, `tsconfig.json`
- `src/` - Synthetic modules (2 *.ts files)
- `pilot-routes/` - Pilot routes (10 *.ts files)
- `schemas/` - Schemas (1 *.sql)

#### `services/discord-bot/`
**Purpose**: Discord integration bot
- `package.json`, `tsconfig.json`
- `Dockerfile`
- `src/` - Bot modules (9 *.ts files)

---

## Apps Directory

### Frontend Applications

#### `apps/corp-cockpit-astro/`
**Purpose**: Executive dashboard (Astro 5 + React)
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `astro.config.mjs` - Astro configuration
- `tailwind.config.mjs` - Tailwind CSS config
- `playwright.config.ts` - Playwright config
- `lighthouse.config.js`, `lighthouserc.json` - Lighthouse configs
- `Dockerfile`

**Source Structure** (`src/`):
- `pages/` - Astro pages (74 files: 70 *.astro, 4 *.ts)
- `components/` - React components:
  - `a11y/` - Accessibility (2 *.tsx)
  - `admin/` - Admin UI (18 files: 17 *.tsx, 1 *.css)
  - `admin-studio/` - Admin studio (4 *.tsx)
  - `analytics/` - Analytics (7 *.tsx)
  - `approvals/` - Approvals workflow (2 *.tsx)
  - `benchmarks/` - Benchmarks (13 *.tsx)
  - `boardroom/` - Boardroom mode (9 *.tsx)
  - `campaigns/` - Campaigns (11 files: 8 *.tsx, 2 *.css, 1 *.md)
  - `deck/` - Deck composer (23 files: 17 *.tsx, 4 *.ts, 2 *.md)
  - `evidence/` - Evidence explorer (9 *.tsx)
  - `forecast/` - Forecasting (5 *.tsx)
  - `generators/` - Report generators (2 *.tsx)
  - `governance/` - Governance (9 *.tsx)
  - `identity/` - Identity management (5 *.tsx)
  - `impact-in/` - Impact ingestion UI (13 files: 9 *.tsx, 3 *.css, 1 *.ts)
  - `nlq/` - Natural Language Query (25 files: 18 *.tsx, 4 *.md, 3 *.ts)
  - `onboarding/` - Onboarding (2 *.tsx)
  - `partners/` - Partner portal (3 *.tsx)
  - `publications/` - Publications (6 files: 5 *.tsx, 1 *.css)
  - `pwa/` - PWA components (2 *.tsx)
  - `reports/` - Reports (18 *.tsx)
  - `scenario-planner/` - Scenario planning (7 files: 6 *.tsx, 1 *.ts)
  - `schedules/` - Scheduling (2 *.tsx)
  - `settings/` - Settings (1 *.tsx)
  - `status/` - Status components (7 *.tsx)
  - `tenant/` - Tenant management (3 *.tsx)
  - `theme/` - Theming (4 *.tsx)
  - `usage/` - Usage analytics (5 *.tsx)
  - `views/` - Saved views (4 *.tsx)
  - `widgets/` - Dashboard widgets (13 *.tsx)
  - Common: `Chart.tsx`, `ChartOptimized.tsx`, `ConnectionStatus.tsx`, `DashboardActions.tsx`, `DashboardWithSSE.tsx`, `EmptyState.tsx`, `ErrorMessage.tsx`, `EvidenceDrawer.tsx`, `KPICard.tsx`, `LanguageSwitcher.tsx`, `LoadingSpinner.tsx`, `Navigation.astro`, `PermissionGate.tsx`, `Q2QFeedList.tsx`, `SEOHead.astro`
- `layouts/` - Astro layouts (4 *.astro)
- `lib/` - Utilities (28 files: 27 *.ts, 1 *.tsx)
- `utils/` - Helper utilities (23 files: 21 *.ts, 1 *.skip, 1 *.tsx)
- `hooks/` - React hooks (6 *.ts)
- `contexts/` - React contexts (`TenantContext.tsx`)
- `api/` - API clients (`identity.ts`, `reporting.ts`, `tenantPreferences.ts`, `README.md`)
- `client/init/` - Client initialization (3 *.ts)
- `middleware/` - Middleware (3 *.ts), `middleware.ts`
- `features/` - Feature modules:
  - `editor-collab/` - Collaborative editing (2 files: 1 *.ts, 1 *.tsx)
  - `generators/` - Report generators (3 files: 2 *.tsx, 1 *.ts)
  - `importer/` - Data import (6 *.tsx)
  - `offline/` - Offline support (6 files: 4 *.ts, 2 *.tsx)
  - `regulatory/` - Regulatory features (6 *.tsx)
- `i18n/` - Internationalization:
  - `en.json`, `uk.json`, `no.json`, `ar.json`, `he.json`
  - `en/`, `uk/`, `no/` - Locale-specific (2 *.json each)
- `styles/` - Stylesheets (6 files: 5 *.css, 1 *.ts)
- `theme/` - Theme configuration (4 files: 3 *.ts, 1 *.tsx)
- `types/` - TypeScript types (8 *.ts)
- `data/` - Mock data (`mockEvidence.ts`)
- `monitoring/` - Monitoring (1 *.ts)
- `telemetry/` - Telemetry (1 *.ts)
- `security/` - Security docs (1 *.md)
- `a11y/` - Accessibility utilities (`keyboardNav.ts`, `screenReaderScripts.ts`, `keyboard-map.md`, `targetSizeAudit.md`)
- `sw.ts` - Service worker
- `test/`, `tests/` - Test utilities (2 *.ts)
- `env.d.ts` - Environment types

**Public Assets** (`public/`):
- `manifest.json`, `manifest.webmanifest` - PWA manifests
- `sw.js` - Service worker
- `offline.html` - Offline page
- `favicon.svg` - Favicon
- `browserconfig.xml` - Browser config
- `icons/` - App icons (multiple sizes + README.md)
- `robots.txt` - SEO robots file

**Tests** (`tests/`):
- `e2e/` - E2E tests (41 files: 37 *.ts, 4 *.md)
- `a11y/` - Accessibility tests (3 files: 2 *.ts, 1 *.md)
- `visual/` - Visual regression tests (3 *.ts)

**Scripts** (`scripts/`):
- `check-contrast.js` - Contrast checker
- `generate-visual-baselines.sh` - Visual baseline generator
- `validate-chart-contrast.ts` - Chart contrast validator

**Documentation**:
- `README.md`, `ACCESSIBILITY.md`
- `ADMIN_CONSOLE_SUMMARY.md`
- `BOARDROOM_IMPLEMENTATION_SUMMARY.md`, `BOARDROOM_MODE_IMPLEMENTATION.md`
- `CHART_OPTIMIZATION_QUICKSTART.md`
- `DARK_MODE_IMPLEMENTATION.md`
- `DECK_COMPOSER_IMPLEMENTATION.md`
- `IMPLEMENTATION_SUMMARY.md`
- `PWA_IMPLEMENTATION.md`
- `TENANT_IMPLEMENTATION.md`
- `TESTING_SETUP.md`
- `VISUAL_REGRESSION_DELIVERABLES.md`, `VISUAL_REGRESSION_SUMMARY.md`, `VISUAL_TESTING_QUICKSTART.md`
- `WEB_VITALS_IMPLEMENTATION.md`
- `RELEASE_NOTES_PHASE3_4.md`
- `docs/` - Additional docs (4 *.md files)
- `reports/analytics/` - Analytics reports (2 *.md)

#### `apps/trust-center/`
**Purpose**: Trust center public site
- `package.json`, `tsconfig.json`
- `astro.config.mjs` - Astro configuration
- `tailwind.config.cjs`, `tailwind.config.mjs` - Tailwind configs
- `playwright.config.ts` - Playwright config
- `src/`:
  - `pages/` - Pages (10 files: 9 *.astro, 1 *.ts)
  - `components/` - Components (6 files: 5 *.astro, 1 *.tsx)
  - `layouts/` - Layouts (3 *.astro)
  - `lib/` - Utilities (1 *.ts)
  - `styles/` - Styles (1 *.css)
- `public/`:
  - `index.html`, `robots.txt`, `status.json`
- `tests/e2e/` - E2E tests (4 files: 2 *.md, 2 *.ts)
- `README.md`

---

## Infrastructure & DevOps

### Kubernetes (`k8s/`)

#### `k8s/base/`
**Purpose**: Base Kubernetes manifests
- `observability/` - Observability configs (Loki, etc.)
- `istio/` - Istio service mesh (namespace.yaml, gateway.yaml, kustomization.yaml)
- `argo-rollouts/` - Argo Rollouts (namespace.yaml, api-gateway-rollout.yaml, kustomization.yaml)
- `keda/` - KEDA autoscaling:
  - `reporting-scaler.yaml`, `q2q-ai-scaler.yaml`
  - `impact-calculator-scaler.yaml`, `carbon-aware-batch.yaml`
- `postgres/` - PostgreSQL (statefulset.yaml, service.yaml, secret.yaml, pvc.yaml)
- `reporting/` - Reporting service (keda-scaledobject.yaml, hpa.yaml)
- `q2q-ai/` - Q2Q AI service (hpa.yaml)
- `siem/` - SIEM stack (vector-aggregator.yaml, opensearch-deployment.yaml, opensearch-dashboards.yaml, kustomization.yaml)
- `pod-disruption-budgets.yaml` - PDB definitions
- Additional service manifests (190 files: 181 *.yaml, 5 *.md, 2 *.conf, 2 *.sh)

#### `k8s/overlays/`
**Purpose**: Environment-specific overlays
- `us-east-1/` - US East region:
  - `kustomization.yaml`
  - `replica-patch.yaml`, `resource-limits-patch.yaml`
  - `ingress-patch.yaml`, `postgres-patch.yaml`
  - `networkpolicy-patch.yaml`, `namespace-patch.yaml`
  - `nats/kustomization.yaml`
- `eu-central-1/` - EU Central region (similar structure)
- `staging/`, `production/`, `eu-region/` - Environment patches (`mtls-patch.yaml`)
- `regions-config.yaml` - Regional configuration
- Total: 57 files (53 *.yaml, 3 *.md, 1 *.sh)

#### `k8s/rollouts/`
**Purpose**: Deployment rollouts
- `blue-green/` - Blue-green rollouts (reporting-rollout.yaml, api-gateway-rollout.yaml, corp-cockpit-rollout.yaml, kustomization.yaml)
- `canary/` - Canary rollouts (q2q-ai-rollout.yaml, data-residency-rollout.yaml, analytics-rollout.yaml, kustomization.yaml)
- `analysis/` - Analysis templates:
  - `success-rate-analysis.yaml`, `latency-analysis.yaml`
  - `slo-gate-analysis.yaml`, `genai-token-analysis.yaml`
  - `gdpr-compliance-analysis.yaml`, `kustomization.yaml`
- Service-specific rollouts (unified-profile, reporting, q2q-ai, impact-in, corp-cockpit, api-gateway)
- Total: 22 files (20 *.yaml, 2 *.md)

#### `k8s/policies/`
**Purpose**: Security and compliance policies
- `kyverno/` - Kyverno policies:
  - `signed-images.yaml`, `readonly-fs.yaml`
  - `privileged-deny.yaml`, `nodeport-deny.yaml`
- `greenops/` - GreenOps policies (`batch-carbon-hints.yaml`)
- `tests/` - Policy tests (writable-pod.yaml, unsigned-pod.yaml, tenant-isolation-test.yaml, privileged-pod.yaml, nodeport-service.yaml)
- `admission-controller.yml` - Admission controller config
- Total: 15 files (12 *.yaml, 2 *.rego, 1 *.yml)

#### `k8s/jobs/`
**Purpose**: Kubernetes jobs
- `soc2-evidence-collection.yaml` - SOC2 evidence job
- `co2e-ingest-cronjob.yaml` - Carbon ingestion cronjob
- Additional job definitions (9 files: 4 *.md, 4 *.yaml, 1 *.sh)

#### `k8s/services/`
**Purpose**: Service definitions
- `unified-profile.yaml` - Unified profile service

#### `k8s/README.md`
**Purpose**: Kubernetes documentation

### Observability (`observability/`)

#### `observability/grafana/`
**Purpose**: Grafana dashboards and provisioning
- `dashboards/` - Dashboard JSON files (37 *.json):
  - Service dashboards: `api-gateway-metrics.json`, `analytics-metrics.json`, `buddy-service-metrics.json`, `corp-cockpit-metrics.json`, `impact-in-metrics.json`, `kintell-connector-metrics.json`, `q2q-ai-metrics.json`, `reporting-metrics.json`, `unified-profile-metrics.json`, `upskilling-connector-metrics.json`
  - Infrastructure: `clickhouse-replication.json`, `dns-waf-traffic.json`, `dr-metrics.json`, `finops-ai-budget.json`, `finops-budget.json`, `finops-carbon.json`, `finops-cloud-cost.json`, `finops-cost-analysis.json`, `finops-cost-tracking.json`, `finops-overview.json`, `mtls-security.json`, `nats-jetstream.json`, `postgres-replication.json`, `rollouts.json`
  - Compliance: `privacy-sla-dashboard.json`, `soc2-compliance.json`, `security-siem.json`
  - SLO: `slo-overview.json`
  - Carbon: `carbon-emissions.json`, `carbon-footprint.json`
- `provisioning/dashboards/dashboards.yaml` - Dashboard provisioning

#### `observability/prometheus/`
**Purpose**: Prometheus configuration
- `rules/` - Alert rules:
  - `slo-alerts.yaml`, `budget-alerts.yaml`
  - `database-performance-alerts.yaml`, `finops-alerts.yaml`
- `recording-rules/` - Recording rules (`slo-rules.yaml`)
- Additional Prometheus configs (6 *.yaml files)

#### `observability/loki/`
**Purpose**: Loki log aggregation
- `rules/sampling.yaml` - Log sampling rules
- Additional Loki configs (5 files: 2 *.sh, 1 *.logql, 1 *.md, 1 *.yaml)

#### `observability/siem/`
**Purpose**: SIEM configuration
- `correlation-rules.yaml` - Correlation rules
- `alert-routing.yaml` - Alert routing
- Additional SIEM configs (3 *.yaml files)

#### `observability/slo/`
**Purpose**: SLO definitions
- `slo-definitions.yaml` - SLO configuration
- Additional SLO configs (5 *.yaml files)

#### `observability/sentry/`
**Purpose**: Sentry error tracking
- `sentry.yaml` - Sentry configuration

#### `observability/README.md`
**Purpose**: Observability documentation

### Operations (`ops/`)

#### `ops/grafana/`
**Purpose**: Operations Grafana dashboards
- `dashboards/slo-monitoring.json` - SLO monitoring dashboard

#### `ops/slo-definitions/`
**Purpose**: SLO definitions per service
- `api-gateway.yaml`, `cockpit.yaml`, `impact-in.yaml`, `q2q-ai.yaml`, `reporting.yaml`

#### `ops/security/siem/rules/`
**Purpose**: SIEM security rules
- `token-abuse.yml`, `data-exfil.yml`, `auth-anomalies.yml`

#### `ops/dlp/`
**Purpose**: Data Loss Prevention
- `retention-policies.yml` - Retention policies
- `policies/pii-patterns.yml` - PII detection patterns

#### `ops/ai-act/`
**Purpose**: AI Act compliance
- `dataset-register.json` - Dataset registry

#### `ops/canary/`
**Purpose**: Canary deployment utilities
- `package.json` - Canary package

#### Additional Operations Files
- Various TypeScript, YAML, Markdown files (57 files: 17 *.ts, 12 *.yaml, 11 *.md, etc.)

### Infrastructure (`infrastructure/`)

#### `infrastructure/terraform/`
**Purpose**: Terraform infrastructure as code
- `route53-multiregion.tf` - Route53 multi-region config
- `waf.tf` - WAF configuration

### Infrastructure Config (`infra/`)

#### `infra/cdn/`
**Purpose**: CDN configuration
- `cdn.yaml` - CDN config

#### `infra/dns/`
**Purpose**: DNS configuration
- `dns.yaml` - DNS config

#### `infra/traffic/`
**Purpose**: Traffic management
- `traffic.yaml` - Traffic config

#### `infra/vault/`
**Purpose**: Vault configuration
- Vault configs (5 files: 4 *.hcl, 1 *.md)

#### `infra/waf/`
**Purpose**: WAF configuration
- `waf.yaml` - WAF config

### Docker (`docker/`)

#### `docker/grafana/`
**Purpose**: Docker Grafana configs
- Grafana JSON configs (5 *.json files)

### Chaos Engineering (`chaos/`)

#### `chaos/experiments/`
**Purpose**: Chaos experiments
- Experiment configs (4 *.yaml files)

#### `chaos/gameday-playbooks/`
**Purpose**: Game day playbooks
- Playbooks (3 *.md files)

### Configuration (`config/`)

#### `config/postgres-performance.conf`
**Purpose**: PostgreSQL performance tuning

---

## Documentation

### Main Documentation (`docs/`)

**Architecture & Design**:
- `Architecture_Visual_Overview.md`
- `Backend_Services_Architecture.md`
- `Platform_Architecture.md`
- `System_Diagram.md`
- `Database_ER_Diagram.md`
- `Database_Schema.md`
- `Database_Optimization.md`

**Features & Services**:
- `Analytics_APIs.md`, `Analytics_DW.md`, `AnalyticsDW_Runbook.md`
- `Impact_In_API.md`, `ImpactIn_Connectors.md`, `ImpactIn_Integrations.md`, `ImpactIn_Runbook.md`
- `Reporting_Exports.md`
- `GenAI_Reporting.md`
- `Journey_Engine.md`
- `Notifications_Service.md`, `Notifications_Integration.md`, `Notifications_Runbook.md`
- `Q2Q_GenReports_Wiring.md`, `Q2Q_Label_Taxonomy.md`, `Q2Q_Model_Governance.md`, `Q2Qv3_Methodology.md`
- `SROI_Calculation.md`, `SROI_VIS_Calibration.md`, `VIS_Model.md`
- `Evidence_Lineage.md`
- `Metrics_Catalog.md`, `METRICS_RETENTION_POLICY.md`

**Compliance & Security**:
- `GDPR_Compliance.md`, `GDPR_DSR_Runbook.md`
- `BENEFICIARY_GROUPS_PRIVACY.md`
- `DSAR_Consent_Operations.md`
- `Security_Hardening_Checklist.md`
- `SIEM_SOC2.md`
- `mTLS_Service_Mesh.md`
- `Data_Residency.md`

**Operations**:
- `PRODUCTION_OPERATIONS_GUIDE.md`
- `PROD_DEPLOY_RUNBOOK.md`
- `GA_Deployment_Checklist.md`
- `Migration_Playbook.md`
- `DB_Backup_Restore.md`
- `DR_Strategy.md`
- `NATS_JetStream_DR.md`, `NATS_Quick_Reference.md`
- `Postgres_Replication.md`, `ClickHouse_Replication.md`
- `Blue_Green_Canary_Rollouts.md`
- `Error_Budget_Policy.md`
- `SLO_Gates.md`, `SLO_Incident_Response.md`
- `SLOW_QUERY_MONITORING.md`

**Observability**:
- `Observability_Overview.md`
- `SRE_Dashboards.md`

**Accessibility**:
- `accessibility.md`, `a11y-audit.md`, `a11y_color_guide.md`
- `DarkModeImplementation.md`, `DarkModeTestingGuide.md`
- `UX_A11y_VRT_Policies.md`
- `visual_regression_guide.md`

**Commercial & Pricing**:
- `CAMPAIGN_PRICING_MODELS.md`
- `CAMPAIGN_MONETIZATION_QUICK_REF.md`
- `PRICING_PROPOSAL_TEMPLATE.md`
- `UPSELL_EMAIL_TEMPLATES.md`

**Programs & Campaigns**:
- `PROGRAM_CONCEPTS.md`
- `PROGRAM_TEMPLATE_SYSTEM_DESIGN.md`
- `PROGRAM_TEMPLATES_GUIDE.md`
- `TEMPLATE_VERSIONING.md`
- `INSTANCE_LIFECYCLE.md`
- `CAMPAIGN_LIFECYCLE.md`
- `CAMPAIGN_DASHBOARD_QUERIES.md`

**Integrations**:
- `Discord_Integration.md`, `Discord_Usage_Guide.md`
- `ShareLinks_Examples.md`, `ShareLinks_Security_Guide.md`

**Feature Documentation** (`docs/` subdirectories):
- `admin/` - Admin console docs (2 *.md)
- `ai/` - AI documentation (1 *.md)
- `analytics/` - Analytics docs (1 *.md)
- `api/` - API documentation (2 *.md)
- `branding/` - Branding docs (README.md)
- `cockpit/` - Cockpit docs (10 *.md)
- `collab/` - Collaboration docs (2 *.md)
- `commercial/` - Commercial features (2 *.md)
- `compliance/` - Compliance docs (6 *.md)
- `demo/`, `demos/` - Demo documentation (3 *.md)
- `features/` - Feature docs (2 *.md)
- `greenops/` - GreenOps docs (1 *.md)
- `i18n/` - Internationalization (1 *.md)
- `impact_in/` - Impact ingestion (4 *.md)
- `infra/` - Infrastructure docs (1 *.md)
- `ingestion/` - Ingestion docs (1 *.md)
- `insights/` - Insights/NLQ docs (14 *.md)
- `integrations/` - Integration docs (3 *.md)
- `kintell/` - Kintell docs (5 *.md)
- `observability/` - Observability docs (5 *.md)
- `ops/` - Operations docs (2 *.md)
- `pilot/` - Pilot features (16 *.md)
- `publications/` - Publications docs (5 *.md)
- `pwa/` - PWA docs (2 *.md)
- `reporting/` - Reporting docs (3 *.md)
- `reports/` - Report docs (2 *.md)
- `runbooks/` - Operational runbooks (20 *.md)
- `security/` - Security docs (1 *.md)
- `sre/` - SRE docs (3 *.md)
- `success/` - Success metrics (17 *.md)
- `swarm10/` - Swarm 10 docs (11 *.md)
- `trust/` - Trust docs (1 *.md)
- `trust-center/` - Trust center docs (5 *.md)

**Additional Documentation**:
- `Quality_Gates.md`
- `Model_Governance.md`
- `STREAMING_ANALYTICS_QUICK_REF.md`, `STREAMING_AND_ANALYTICS_SETUP.md`, `Streaming_Updates.md`
- `DNS_WAF_Traffic.md`
- `FinOps_Strategy.md`
- `Compliance_Backend_Additions.md`
- `status-api.md`
- `trust-api-examples.md`
- Multiple phase and agent documentation files

**Total**: 253 *.md files

### Reports (`reports/`)

**Purpose**: Agent reports, implementation summaries, analysis reports
- Worker reports: `worker*.md` files
- Phase reports: Phase-specific summaries
- Agent deliverables: Agent completion reports
- Quality reports: Quality gate results
- Evidence: Compliance evidence
- Total: 203 files (190 *.md, 5 *.txt, 3 *.json, 5 other)

---

## Scripts

### Root Scripts (`scripts/`)

#### Infrastructure Scripts (`scripts/infra/`)
- `bootstrap-vault.sh` - Vault bootstrap
- `clickhouse-backup.sh`, `clickhouse-sharding.sql`, `clickhouse-tables.sql`, `clickhouse-ttl.sql` - ClickHouse management
- `deploy-clickhouse.sh` - ClickHouse deployment
- `postgres-failover.sh`, `postgres-residency-replication.sql`, `setup-postgres-replication.sh` - PostgreSQL management
- `nats-failover.sh`, `nats-retention.sh`, `nats-streams.sh` - NATS management
- `rotate-aws-secrets.sh`, `rotate-certs.sh`, `rotate-vault-secrets.sh`, `secrets-rotation-audit.sh` - Secrets management
- `enable-mtls.sh`, `install-istio-mtls.sh`, `verify-mtls.sh`, `debug-mtls.sh` - mTLS management
- `test-dns-routing.sh`, `update-dns.sh` - DNS management
- `waf-analysis.sh` - WAF analysis
- `storage-retention.sh` - Storage retention
- `slo-gate.sh` - SLO gate checks
- `coordinated-rollout.sh`, `emergency-rollback.sh` - Deployment management

#### Backup Scripts (`scripts/backup/`)
- `restore-test-db.sh` - Database restore
- `verify-clickhouse-backup.sh`, `verify-postgres-backup.sh`, `verify-s3-backup.sh` - Backup verification
- `README_MONTHLY_VERIFICATION.md` - Verification guide

#### Disaster Recovery (`scripts/dr/`)
- `failover.sh` - Failover script
- `smoke.sh` - Smoke tests
- `evidence-sign.sh`, `evidence-verify.sh` - Evidence signing
- `validate-residency.sh` - Residency validation

#### Game Day (`scripts/gameday/`)
- `execute-failover.sh` - Failover execution
- `measure-rto-rpo.sh` - RTO/RPO measurement
- `restore-primary.sh` - Primary restoration
- `simulate-region-outage.sh` - Region outage simulation
- `verify-recovery.sh` - Recovery verification

#### FinOps (`scripts/finops/`)
- `carbon-aware-simulation.ts` - Carbon simulation
- `carbon-calculator.sh`, `co2e-calculator.ts`, `co2e-ingest.sh` - Carbon calculations
- `cost-forecast.py` - Cost forecasting
- `cost-ingest.sh`, `cost-recommendations.sh` - Cost management
- `ingest.sh`, `render.sh` - Data ingestion/rendering

#### SOC2 (`scripts/soc2/`)
- `collect-quarterly-evidence.sh` - Evidence collection
- `generate-access-review.sh` - Access review generation
- `generate-change-log.sh` - Change log generation
- `generate-gdpr-attestation.sh` - GDPR attestation
- `generate-key-rotation-report.sh` - Key rotation report
- `generate-sbom.sh` - SBOM generation
- `generate.sh` - General generation
- `sign-evidence.sh` - Evidence signing
- `upload-to-audit-portal.sh` - Audit portal upload

#### Canary (`scripts/canary/`)
- `analyze-metrics.sh` - Metrics analysis

#### Demo (`scripts/demo/`)
- `create.ts`, `list.ts`, `teardown.ts` - Demo management

#### Seed (`scripts/seed/`)
- `pilot/` - Pilot seed data (companies.sql, programs.sql, reports.sql, users.sql, README.md)
- `swarm6/` - Swarm 6 seed data (beneficiary-groups.sql, campaign-metrics-snapshots.sql, campaigns.sql, program-instances.sql, README.md)
- `templates/` - Template seeds (buddy-template.sql, language-template.sql, mentorship-template.sql, upskilling-template.sql, README.md, TEMPLATE_INVENTORY.md)

#### Rollback (`scripts/rollback/`)
- `rollback-deployment.sh` - Deployment rollback
- `verify-rollback.sh` - Rollback verification

#### Synthetics (`scripts/synthetics/`)
- `login-flow.spec.ts` - Login flow synthetic test
- `sse-probe.spec.ts` - SSE probe test
- `uptime-probe.sh` - Uptime probe
- `README.md` - Synthetics documentation

#### CI (`scripts/ci/`)
- `i18n-parity-check.ts` - i18n parity checking

#### Root Scripts
- `audit-secrets.sh` - Secret auditing
- `backfill-campaign-associations.sh`, `backfill-campaign-associations.ts` - Campaign association backfill
- `checkPerformanceBudgets.ts` - Performance budget checking
- `coverage-analysis.ts` - Coverage analysis
- `e2e-coverage.js` - E2E coverage
- `generate-sri.js` - SRI hash generation
- `init-clickhouse.sql`, `init-db.sql` - Database initialization
- `migrate-swarm6.sh` - Swarm 6 migration
- `publish-weekly-dashboard.ts` - Weekly dashboard publishing
- `quality-report.ts` - Quality reporting
- `run-e2e-tests.sh` - E2E test runner
- `seed-swarm6.sh` - Swarm 6 seeding
- `seal-secret.sh` - Secret sealing
- `smoke-tests.sh` - Smoke test runner
- `validateDarkModeContrast.ts` - Dark mode contrast validation

**Total**: 104 files (63 *.sh, 18 *.sql, 14 *.ts, 9 *.md)

---

## Tests

### Test Structure (`tests/`)

#### E2E Tests (`tests/e2e/`)
- `01-login.spec.ts` - Login flow
- `02-dashboard.spec.ts` - Dashboard tests
- `03-reports.spec.ts` - Reports tests
- `04-approvals.spec.ts` - Approvals tests
- `05-evidence.spec.ts` - Evidence tests
- `06-benchmarks.spec.ts` - Benchmarks tests
- `07-pwa.spec.ts` - PWA tests
- `08-governance.spec.ts` - Governance tests
- `09-accessibility.spec.ts` - Accessibility tests
- `10-sso-admin.spec.ts` - SSO admin tests
- `11-nlq-canonical-questions.spec.ts` - NLQ canonical questions
- `12-nlq-accessibility.spec.ts` - NLQ accessibility
- `buddy-integration.spec.ts` - Buddy integration
- `csv-end-to-end.test.ts` - CSV E2E
- `visual-regression.spec.ts` - Visual regression
- `webhook-integration.spec.ts` - Webhook integration
- `helpers/nlq-helpers.ts` - NLQ test helpers
- `NLQ_TEST_README.md`, `README.md` - Documentation

#### Integration Tests (`tests/integration/`)
- `buddy-system/` - Buddy system integration (calculation-accuracy.test.ts, data-validation.test.ts, event-flow.test.ts, failure-injection.test.ts, webhook-delivery.test.ts, README.md, run-all-tests.sh)
- `circuit-breaker.test.ts` - Circuit breaker tests
- `e2e-cockpit.test.ts` - Cockpit E2E
- `health-endpoints.test.ts` - Health endpoint tests
- `idempotency-replay.test.ts` - Idempotency tests
- `webhook-to-profile.test.ts` - Webhook to profile tests

#### Unit Tests (`tests/unit/`)
- `insights-nlq/` - NLQ unit tests (fuzzing.test.ts, planner.property.test.ts)

#### Security Tests (`tests/security/`)
- `nlq-dos.test.ts` - NLQ DoS tests
- `nlq-exfiltration.test.ts` - NLQ exfiltration tests
- `nlq-injection.test.ts` - NLQ injection tests
- `nlq-pii-protection.test.ts` - NLQ PII protection
- `nlq-prompt-injection.test.ts` - NLQ prompt injection
- `nlq-tenant-isolation.test.ts` - NLQ tenant isolation
- `README.md`, `SECURITY_TEST_SUMMARY.md` - Documentation

#### Compliance Tests (`tests/compliance/`)
- `dsar-exercise.test.ts` - DSAR exercise tests
- `retention-policies.test.ts` - Retention policy tests

#### Contract Tests (`tests/contract/`)
- `gateway-profile.test.ts` - Gateway profile contract tests

#### Pact Tests (`tests/pact/`)
- `gateway-analytics.pact.ts` - Gateway analytics pact
- `insights-nlq/cockpit-consumer.pact.test.ts` - NLQ cockpit consumer pact

#### Smoke Tests (`tests/smoke/`)
- `api-gateway.spec.ts` - API gateway smoke tests
- `health-checks.spec.ts` - Health check smoke tests
- `reporting.spec.ts` - Reporting smoke tests
- `README.md` - Documentation

#### Load Tests (`tests/load/`)
- `analytics.js` - Analytics load test
- `buddy-system/` - Buddy system load tests (load-test.js, run-load-tests.sh)
- `dashboard-load.js` - Dashboard load test
- `gen-reports.js` - Report generation load test
- `impact-in.js` - Impact ingestion load test
- `ingestion-load.js` - Ingestion load test
- `k6-baseline.js` - K6 baseline
- `k6-evidence-gates.js` - K6 evidence gates
- `k6-stress.js` - K6 stress test
- `k6-trust-api.js` - K6 trust API test
- `keda-validation.js` - KEDA validation
- `notifications.js` - Notifications load test
- `reporting-load.js` - Reporting load test
- `README.md` - Documentation

#### K6 Tests (`tests/k6/`)
- `cockpit-load.js` - Cockpit load test
- `ingestion-load.js` - Ingestion load test
- `nlq-helpers.js` - NLQ helpers
- `nlq-performance.js` - NLQ performance test
- `nlq-soak.js` - NLQ soak test
- `nlq-stress.js` - NLQ stress test
- `reporting-load.js` - Reporting load test
- `soak-test.js` - Soak test
- `streaming-load.js` - Streaming load test
- `scenarios/nlq-load.js` - NLQ load scenario
- `NLQ_LOAD_TESTING_RUNBOOK.md`, `NLQ_PERFORMANCE_TEST_REPORT_TEMPLATE.md`, `README.md` - Documentation

#### Test Utilities (`tests/utils/`)
- `e2e-helpers.ts` - E2E test helpers
- `flakiness-tracker.ts` - Flakiness tracking
- `test-helpers.ts` - General test helpers
- `webhook-helpers.ts` - Webhook test helpers

#### Test Fixtures (`tests/fixtures/`)
- `e2e-data-factory.ts` - E2E data factory
- `nlq/` - NLQ fixtures (canonical-answers.json)
- `nlq-test-data.json` - NLQ test data
- `sample-invalid-sessions.csv`, `sample-valid-sessions.csv` - Sample CSV data
- `seed.ts` - Seed data
- `webhooks/` - Webhook fixtures:
  - `buddy-match-created.json`
  - `kintell-session-created.json`, `kintell-session-updated.json`
  - `upskilling-course-completed.json`

#### Test API Clients (`tests/api-clients/`)
- `buddy-system-api.ts` - Buddy system API client
- `csr-platform-api.ts` - CSR platform API client

#### Test Setup
- `setup.ts` - Test setup
- `README.md`, `E2E_QUICK_REFERENCE.md` - Documentation

**Total**: 97 files (52 *.ts, 23 *.js, 12 *.md, 10 other)

---

## Configuration Files

### Postman Collections (`postman/`)
- `NLQ.postman_collection.json` - NLQ API collection
- `TEEI-Cockpit.postman_collection.json` - Cockpit API collection

### Plans (`plans/`)
- `worker-integrations.md` - Worker integrations plan
- `worker-quality.md` - Worker quality plan

### Enablement Templates (`enablement-templates/`)
- `README.md`, `SETUP_GUIDE.md`, `MIGRATION_GUIDE.md`, `TROUBLESHOOTING.md`
- `CI_INTEGRATION_GUIDE.md`
- `SHARED_AGENTS_CATALOG.md`
- `agents/` - Agent templates (8 *.md files)
- `quickstart/` - Quickstart guides (11 *.md files)
- `repos/` - Repository templates (11 *.md files)
- `scripts/` - Script templates (2 *.sh, 1 *.md)

---

## File Statistics Summary

### By Type
- **TypeScript**: 829+ *.ts files (services), 252+ *.ts files (packages), 150+ *.ts files (apps)
- **React/TSX**: 262+ *.tsx files (apps)
- **Astro**: 76+ *.astro files (apps)
- **Markdown**: 253+ *.md files (docs), 190+ *.md files (reports), many more in root
- **YAML**: 359+ *.yaml/*.yml files (K8s, configs)
- **JSON**: 178+ *.json files (configs, dashboards, test data)
- **SQL**: 55+ *.sql files (migrations, seeds, scripts)
- **Shell**: 63+ *.sh files (scripts)
- **Handlebars**: 19+ *.hbs files (report templates)
- **CSS**: Multiple *.css files (styles)

### By Directory
- **Root**: ~100+ files (configs, docs, reports)
- **packages/**: 404+ files (252 *.ts, 55 *.sql, 41 *.json, etc.)
- **services/**: 1052+ files (829 *.ts, 55 *.json, 54 *.md, etc.)
- **apps/**: 581+ files (262 *.tsx, 150 *.ts, 76 *.astro, etc.)
- **docs/**: 253+ *.md files
- **scripts/**: 104+ files (63 *.sh, 18 *.sql, 14 *.ts, 9 *.md)
- **tests/**: 97+ files (52 *.ts, 23 *.js, 12 *.md, etc.)
- **k8s/**: 190+ files (181 *.yaml, 5 *.md, 2 *.conf, etc.)
- **observability/**: 41+ files (37 *.json, 4 *.yaml)
- **reports/**: 203+ files (190 *.md, 5 *.txt, 3 *.json, etc.)

### Total Estimated Files
**~3,000+ files** (excluding node_modules, dist, .git)

---

## Key File Locations Quick Reference

| Category | Key Files/Directories |
|----------|----------------------|
| **Database Schemas** | `packages/shared-schema/src/schema/` |
| **Migrations** | `packages/shared-schema/migrations/` |
| **SROI Calculator** | `services/reporting/src/calculators/sroi.ts` |
| **Report Templates** | `services/reporting/src/templates/` |
| **Dashboard Components** | `apps/corp-cockpit-astro/src/components/` |
| **API Routes** | `services/*/src/routes/` |
| **Event Contracts** | `packages/event-contracts/src/` |
| **Type Definitions** | `packages/shared-types/src/` |
| **K8s Manifests** | `k8s/base/`, `k8s/overlays/`, `k8s/rollouts/` |
| **Grafana Dashboards** | `observability/grafana/dashboards/` |
| **Test Suites** | `tests/e2e/`, `tests/integration/`, `tests/unit/` |
| **Documentation** | `docs/` |
| **Scripts** | `scripts/` |

---

## Notes

- This index excludes:
  - `node_modules/` directories
  - `dist/` build outputs
  - `.git/` directory
  - `.turbo/` cache
  - Other build artifacts

- File counts are approximate and may vary based on gitignore rules and build state.

- For the most up-to-date file listing, run:
  ```bash
  find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" | wc -l
  ```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0

---

## Quick Reference: File Search Index

### By File Extension

#### TypeScript Files (*.ts)
- **Services**: 829+ files in `services/`
- **Packages**: 252+ files in `packages/`
- **Apps**: 150+ files in `apps/corp-cockpit-astro/src/`
- **Scripts**: 14+ files in `scripts/`
- **Tests**: 52+ files in `tests/`
- **Total**: ~1,300+ TypeScript files

#### React/TSX Files (*.tsx)
- **Apps**: 262+ files in `apps/corp-cockpit-astro/src/components/`
- **Total**: ~262+ TSX files

#### Astro Files (*.astro)
- **Apps**: 76+ files in `apps/corp-cockpit-astro/src/pages/` and `apps/trust-center/`
- **Total**: ~76+ Astro files

#### Markdown Files (*.md)
- **Documentation**: 253+ files in `docs/`
- **Reports**: 190+ files in `reports/`
- **Root**: 50+ files (README, guides, summaries)
- **Services**: 54+ files in `services/`
- **Apps**: Multiple files in `apps/corp-cockpit-astro/`
- **Scripts**: 9+ files in `scripts/`
- **Tests**: 12+ files in `tests/`
- **Total**: ~600+ Markdown files

#### YAML Files (*.yaml, *.yml)
- **Kubernetes**: 181+ files in `k8s/base/`, 53+ files in `k8s/overlays/`, 20+ files in `k8s/rollouts/`
- **Observability**: 4+ files in `observability/grafana/`, 6+ files in `observability/prometheus/`
- **OpenAPI**: 20+ files in `packages/openapi/`
- **Ops**: 12+ files in `ops/`
- **Total**: ~359+ YAML files

#### JSON Files (*.json)
- **Config**: 41+ files in `packages/`
- **Dashboards**: 37+ files in `observability/grafana/dashboards/`
- **Test Data**: Multiple files in `tests/fixtures/`
- **Package Configs**: All `package.json` files
- **Total**: ~178+ JSON files

#### SQL Files (*.sql)
- **Migrations**: 51+ files in `packages/shared-schema/migrations/`
- **Seeds**: Multiple files in `scripts/seed/`
- **Scripts**: 18+ files in `scripts/`
- **Total**: ~55+ SQL files

#### Shell Scripts (*.sh)
- **Infrastructure**: 20+ files in `scripts/infra/`
- **Backup**: 4+ files in `scripts/backup/`
- **DR**: 4+ files in `scripts/dr/`
- **Game Day**: 5+ files in `scripts/gameday/`
- **SOC2**: 9+ files in `scripts/soc2/`
- **Other**: Multiple files in `scripts/`
- **Total**: ~63+ Shell scripts

#### Handlebars Templates (*.hbs)
- **Report Templates**: 19+ files in `services/reporting/src/templates/`
- **NLQ Templates**: 5+ files in `services/insights-nlq/src/`
- **Total**: ~24+ HBS files

---

## Searchable File Paths

### Key Service Entry Points
- `services/reporting/src/index.ts` - Reporting service entry
- `services/analytics/src/index.ts` - Analytics service entry
- `services/api-gateway/src/index.ts` - API Gateway entry
- `services/impact-in/src/index.ts` - Impact ingestion entry
- `services/q2q-ai/src/index.ts` - Q2Q AI pipeline entry
- `services/insights-nlq/src/index.ts` - NLQ service entry
- `services/campaigns/src/index.ts` - Campaigns service entry

### Key Calculator Files
- `services/reporting/src/calculators/sroi.ts` - SROI calculator
- `services/reporting/src/calculators/sroi.test.ts` - SROI tests
- `services/reporting/src/calculators/vis.ts` - VIS calculator
- `services/reporting/src/calculators/vis.test.ts` - VIS tests
- `services/reporting/src/calculators/campaign-vis.test.ts` - Campaign VIS tests

### Database Schema Files
- `packages/shared-schema/src/schema/users.ts` - Users schema
- `packages/shared-schema/src/schema/companies.ts` - Companies schema
- `packages/shared-schema/src/schema/programs.ts` - Programs schema
- `packages/shared-schema/src/schema/kintell.ts` - Kintell schema
- `packages/shared-schema/src/schema/buddy.ts` - Buddy schema
- `packages/shared-schema/src/schema/metrics.ts` - Metrics schema
- `packages/shared-schema/src/schema/evidence_ledger.ts` - Evidence ledger
- `packages/shared-schema/src/schema/lineage.ts` - Lineage tracking
- `packages/shared-schema/src/schema/program-instances.ts` - Program instances
- `packages/shared-schema/src/schema/ingestion-batches.ts` - Ingestion batches
- `packages/shared-schema/src/schema/index.ts` - Schema exports

### Report Template Files
- `services/reporting/src/templates/quarterly-report.en.hbs` - Quarterly report template
- `services/reporting/src/templates/annual-report.en.hbs` - Annual report template
- `services/reporting/src/templates/investor-update.en.hbs` - Investor update template
- `services/reporting/src/templates/impact-deep-dive.en.hbs` - Impact deep dive template

### Dashboard Component Files
- `apps/corp-cockpit-astro/src/components/DashboardWithSSE.tsx` - Main dashboard with SSE
- `apps/corp-cockpit-astro/src/components/Chart.tsx` - Chart component
- `apps/corp-cockpit-astro/src/components/ChartOptimized.tsx` - Optimized chart
- `apps/corp-cockpit-astro/src/components/KPICard.tsx` - KPI card component
- `apps/corp-cockpit-astro/src/components/EvidenceDrawer.tsx` - Evidence drawer
- `apps/corp-cockpit-astro/src/components/nlq/` - NLQ components (25 files)

### API Route Files
- `services/reporting/src/routes/gen-reports.ts` - Report generation routes
- `services/reporting/src/routes/campaign-dashboard.ts` - Campaign dashboard routes
- `services/reporting/src/routes/evidence.ts` - Evidence routes
- `services/analytics/src/routes/` - Analytics routes
- `services/api-gateway/src/routes/` - Gateway routes
- `services/campaigns/src/routes/campaigns.ts` - Campaign routes

### Test Files
- `tests/e2e/01-login.spec.ts` - Login E2E test
- `tests/e2e/02-dashboard.spec.ts` - Dashboard E2E test
- `tests/integration/buddy-system/` - Buddy system integration tests
- `tests/security/nlq-*.test.ts` - NLQ security tests
- `services/reporting/tests/campaign-sroi.test.ts` - Campaign SROI test

### Configuration Files
- `tsconfig.base.json` - Base TypeScript config
- `turbo.json` - Turbo build config
- `pnpm-workspace.yaml` - PNPM workspace config
- `playwright.config.ts` - Playwright config
- `vitest.config.ts` - Vitest config
- `docker-compose.yml` - Docker Compose config
- `astro.config.mjs` - Astro config (apps)

### Kubernetes Manifests
- `k8s/base/postgres/statefulset.yaml` - PostgreSQL StatefulSet
- `k8s/base/istio/gateway.yaml` - Istio Gateway
- `k8s/rollouts/blue-green/reporting-rollout.yaml` - Reporting blue-green rollout
- `k8s/rollouts/canary/q2q-ai-rollout.yaml` - Q2Q AI canary rollout
- `k8s/overlays/us-east-1/kustomization.yaml` - US East overlay
- `k8s/overlays/eu-central-1/kustomization.yaml` - EU Central overlay

### Observability Dashboards
- `observability/grafana/dashboards/api-gateway-metrics.json` - API Gateway dashboard
- `observability/grafana/dashboards/reporting-metrics.json` - Reporting dashboard
- `observability/grafana/dashboards/q2q-ai-metrics.json` - Q2Q AI dashboard
- `observability/grafana/dashboards/finops-overview.json` - FinOps overview
- `observability/grafana/dashboards/slo-overview.json` - SLO overview

### Documentation Files
- `docs/GenAI_Reporting.md` - Gen-AI reporting guide
- `docs/SROI_Calculation.md` - SROI calculation guide
- `docs/VIS_Model.md` - VIS model documentation
- `docs/Platform_Architecture.md` - Platform architecture
- `docs/PRODUCTION_OPERATIONS_GUIDE.md` - Production operations
- `CLAUDE.md` - Claude Code enablement
- `README.md` - Main README

---

## File Naming Conventions

### Service Files
- `src/index.ts` - Service entry point
- `src/routes/` - API routes
- `src/lib/` - Library/utility functions
- `src/db/` - Database access
- `src/types/` - Type definitions
- `tests/` - Test files
- `Dockerfile` - Docker image definition
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration

### Component Files
- `*.tsx` - React components
- `*.astro` - Astro pages/components
- `*.css` - Stylesheets
- `*.test.ts` / `*.test.tsx` - Test files
- `*.stories.tsx` - Storybook stories

### Configuration Files
- `*.config.ts` / `*.config.js` / `*.config.mjs` - Configuration files
- `*.config.yaml` / `*.config.yml` - YAML configuration
- `docker-compose*.yml` - Docker Compose files
- `kustomization.yaml` - Kustomize configuration

### Documentation Files
- `README.md` - Package/service README
- `*.md` - General documentation
- `CHANGELOG.md` - Change log (if present)
- `LICENSE` - License file

---

## File Organization Patterns

### Monorepo Structure
```
TEEI_CSR_Platform/
├── packages/          # Shared libraries (26+ packages)
├── services/          # Backend microservices (26+ services)
├── apps/              # Frontend applications (2 apps)
├── infrastructure/    # Infrastructure as code
├── k8s/              # Kubernetes manifests
├── observability/    # Observability configs
├── docs/             # Documentation
├── scripts/          # Utility scripts
├── tests/            # Test suites
└── reports/          # Agent reports and summaries
```

### Service Structure Pattern
```
services/[service-name]/
├── src/
│   ├── index.ts           # Entry point
│   ├── routes/            # API routes
│   ├── lib/               # Business logic
│   ├── db/                # Database access
│   ├── types/             # Type definitions
│   └── [feature]/         # Feature modules
├── tests/                 # Test files
├── Dockerfile             # Docker image
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── README.md              # Documentation
```

### Package Structure Pattern
```
packages/[package-name]/
├── src/                   # Source code
│   ├── index.ts           # Main export
│   └── [modules]/         # Module files
├── dist/                  # Compiled output
├── package.json           # Package config
├── tsconfig.json          # TypeScript config
└── README.md              # Documentation
```

### App Structure Pattern
```
apps/[app-name]/
├── src/
│   ├── pages/             # Astro pages
│   ├── components/        # React components
│   ├── layouts/           # Layout components
│   ├── lib/               # Utilities
│   ├── api/               # API clients
│   └── styles/            # Stylesheets
├── public/                # Static assets
├── tests/                 # Test files
├── astro.config.mjs       # Astro config
├── package.json           # Dependencies
└── README.md              # Documentation
```

---

## File Count Summary by Category

| Category | File Count | Primary Extensions |
|----------|------------|-------------------|
| **TypeScript Source** | ~1,300+ | `.ts`, `.tsx` |
| **React Components** | ~262+ | `.tsx` |
| **Astro Pages** | ~76+ | `.astro` |
| **Documentation** | ~600+ | `.md` |
| **Configuration** | ~359+ | `.yaml`, `.yml`, `.json` |
| **SQL Scripts** | ~55+ | `.sql` |
| **Shell Scripts** | ~63+ | `.sh` |
| **Templates** | ~24+ | `.hbs` |
| **CSS/Styles** | ~20+ | `.css` |
| **Dockerfiles** | ~15+ | `Dockerfile` |
| **Total Estimated** | **~2,800+** | (excluding node_modules, dist) |

---

## Maintenance Notes

### Updating This Index

To update this index:
1. Run directory listings for new packages/services
2. Update file counts based on actual repository state
3. Add new file paths to the "Searchable File Paths" section
4. Update statistics in the "File Count Summary" section
5. Update the "Last Updated" date

### Finding Files

**By Extension**:
```bash
# TypeScript files
find . -name "*.ts" -not -path "./node_modules/*"

# Markdown files
find . -name "*.md" -not -path "./node_modules/*"

# YAML files
find . -name "*.yaml" -o -name "*.yml" -not -path "./node_modules/*"
```

**By Pattern**:
```bash
# Test files
find . -name "*.test.ts" -o -name "*.spec.ts"

# Configuration files
find . -name "*.config.*"

# Documentation
find . -name "README.md" -o -name "*.md"
```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.1

