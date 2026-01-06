# TEEI CSR Platform - Feature Index

**Generated**: 2025-01-27  
**Status**: Complete Feature Inventory

---

## Table of Contents

1. [Core Features](#core-features)
2. [AI & Analytics Features](#ai--analytics-features)
3. [Integration Features](#integration-features)
4. [Reporting & Compliance Features](#reporting--compliance-features)
5. [User Management Features](#user-management-features)
6. [Platform Features](#platform-features)
7. [Feature Files Database](#feature-files-database)

---

## Core Features

### 1. Unified Journey Tracking

**Description**: Track participants across multiple programs (Buddy → Language Connect → Upskilling → Mentorship → Employment)

**Files**:
- `services/journey-engine/` - Journey orchestration service
- `services/unified-profile/` - Profile aggregation
- `packages/shared-schema/src/schema/programs.ts` - Program schema
- `packages/shared-schema/src/schema/program-instances.ts` - Instance tracking
- `apps/corp-cockpit-astro/src/components/journey/` - Journey UI components

**Components**:
- Journey rule engine
- Cross-program identity linking
- Participant lifecycle tracking
- Program enrollment management

---

### 2. Q2Q AI Engine

**Description**: Converts qualitative feedback into quantitative outcome scores

**Files**:
- `services/q2q-ai/` - Q2Q AI service (82 files)
- `services/q2q-ai/src/lib/` - AI processing modules
- `services/q2q-ai/src/safety/` - Safety moderation
- `services/q2q-ai/src/labeling/` - Labeling taxonomy
- `packages/model-registry/` - AI model configuration
- `apps/corp-cockpit-astro/src/components/q2q/` - Q2Q UI components

**Components**:
- Qualitative feedback analysis
- Quantitative metric conversion
- AI model integration
- Safety checks
- Evidence extraction

---

### 3. SROI Calculation

**Description**: Social Return on Investment calculation engine

**Files**:
- `services/reporting/src/calculators/sroi.ts` - SROI calculator
- `services/reporting/src/calculators/sroi.test.ts` - SROI tests
- `services/impact-calculator/` - Impact calculation service
- `docs/SROI_Calculation.md` - SROI documentation
- `apps/corp-cockpit-astro/src/components/analytics/` - SROI dashboard

**Components**:
- SROI formula implementation
- Campaign-level SROI
- Period-based calculations
- Evidence linking

---

### 4. VIS Calculation

**Description**: Volunteer Impact Score calculation

**Files**:
- `services/reporting/src/calculators/vis.ts` - VIS calculator
- `services/reporting/src/calculators/vis.test.ts` - VIS tests
- `services/reporting/src/calculators/campaign-vis.test.ts` - Campaign VIS tests
- `docs/VIS_Model.md` - VIS model documentation
- `apps/corp-cockpit-astro/src/components/analytics/` - VIS dashboard

**Components**:
- VIS scoring algorithm
- Volunteer engagement metrics
- Impact scoring

---

### 5. Corporate Cockpit Dashboard

**Description**: Executive dashboard with real-time impact metrics

**Files**:
- `apps/corp-cockpit-astro/` - Main dashboard app (581 files)
- `apps/corp-cockpit-astro/src/components/dashboard/` - Dashboard components
- `apps/corp-cockpit-astro/src/components/widgets/` - Dashboard widgets
- `apps/corp-cockpit-astro/src/components/Chart.tsx` - Chart components
- `apps/corp-cockpit-astro/src/components/DashboardWithSSE.tsx` - SSE dashboard

**Components**:
- Real-time metrics (SSE)
- KPI cards
- Interactive charts
- Boardroom mode
- Dark mode support
- PWA capabilities

---

## AI & Analytics Features

### 6. Natural Language Query (NLQ)

**Description**: Natural language query interface for insights

**Files**:
- `services/insights-nlq/` - NLQ service (89 files)
- `services/insights-nlq/src/lib/` - Query processing
- `services/insights-nlq/src/cache/` - Query caching
- `apps/corp-cockpit-astro/src/components/nlq/` - NLQ UI (25 files)
- `docs/insights/` - NLQ documentation (14 *.md files)

**Components**:
- Natural language processing
- SQL query generation
- Query caching
- Chart generation
- Accessibility support

---

### 7. Analytics Engine

**Description**: ClickHouse-based analytics and time-series processing

**Files**:
- `services/analytics/` - Analytics service (85 files)
- `services/analytics/src/lib/` - Analytics modules
- `docs/Analytics_APIs.md` - Analytics documentation
- `docs/Analytics_DW.md` - Data warehouse docs
- `apps/corp-cockpit-astro/src/components/analytics/` - Analytics UI

**Components**:
- Time-series analytics
- Dashboard data aggregation
- Metric calculations
- Data windowing

---

### 8. Forecasting

**Description**: Time-series forecasting for impact metrics

**Files**:
- `services/forecast/` - Forecast service (18 *.ts files)
- `services/forecast/src/lib/` - Forecasting algorithms
- `apps/corp-cockpit-astro/src/components/forecast/` - Forecast UI (5 *.tsx files)

**Components**:
- Trend analysis
- Predictive metrics
- Scenario planning

---

### 9. Scenario Planner

**Description**: Scenario planning and what-if analysis

**Files**:
- `apps/corp-cockpit-astro/src/components/scenario-planner/` - Scenario planner (7 files)
- `docs/analytics/scenario_planner.md` - Scenario planning docs

**Components**:
- What-if analysis
- Scenario modeling
- Impact projections

---

## Integration Features

### 10. External Connectors

**Description**: Integration with external CSR platforms

**Files**:
- `services/impact-in/` - Impact ingestion service (74 *.ts files)
- `services/kintell-connector/` - Kintell connector (18 files)
- `services/upskilling-connector/` - Upskilling connector (8 files)
- `services/buddy-connector/` - Buddy connector (35 files)
- `docs/ImpactIn_Connectors.md` - Connector documentation
- `docs/integrations/CONNECTORS_GUIDE.md` - Integration guide

**Components**:
- Benevity integration
- Goodera integration
- Workday integration
- CSV import/export
- Webhook handling

---

### 11. Discord Integration

**Description**: Discord bot for community engagement

**Files**:
- `services/discord-bot/` - Discord bot service (9 *.ts files)
- `docs/Discord_Integration.md` - Discord documentation
- `docs/Discord_Usage_Guide.md` - Usage guide

**Components**:
- Feedback collection
- Event publishing
- Community engagement

---

### 12. Webhooks

**Description**: Outbound webhook notifications

**Files**:
- `services/notifications/` - Notifications service (28 files)
- `tests/fixtures/webhooks/` - Webhook test fixtures
- `docs/Notifications_Integration.md` - Webhook documentation

**Components**:
- Webhook delivery
- Retry logic
- Event publishing

---

## Reporting & Compliance Features

### 13. Report Generation

**Description**: PDF/PPTX report generation with Gen-AI narratives

**Files**:
- `services/reporting/src/templates/` - Report templates (19 *.hbs files)
- `services/reporting/src/routes/gen-reports.ts` - Report generation routes
- `docs/GenAI_Reporting.md` - Gen-AI reporting guide
- `docs/Reporting_Exports.md` - Export documentation
- `apps/corp-cockpit-astro/src/components/reports/` - Report UI (18 *.tsx files)

**Components**:
- PDF generation
- PPTX export
- Gen-AI narratives
- Citation validation
- PII redaction
- Template system

---

### 14. Evidence Lineage

**Description**: Track evidence provenance and lineage

**Files**:
- `services/reporting/src/lib/evidenceLineageMapper.ts` - Lineage mapping
- `services/reporting/src/routes/evidence.ts` - Evidence routes
- `packages/shared-schema/src/schema/evidence_ledger.ts` - Evidence schema
- `docs/Evidence_Lineage.md` - Lineage documentation
- `apps/corp-cockpit-astro/src/components/evidence/` - Evidence UI (9 *.tsx files)

**Components**:
- Evidence tracking
- Lineage mapping
- Citation management
- Audit trail

---

### 15. GDPR Compliance

**Description**: GDPR compliance and DSAR handling

**Files**:
- `services/privacy-orchestrator/` - Privacy service (6 *.ts files)
- `services/gdpr-service/` - GDPR service (3 *.ts files - stub)
- `packages/compliance/` - Compliance utilities
- `docs/GDPR_Compliance.md` - GDPR documentation
- `docs/GDPR_DSR_Runbook.md` - DSAR runbook
- `apps/corp-cockpit-astro/src/components/governance/` - Governance UI (9 *.tsx files)

**Components**:
- DSAR handling
- Data deletion workflows
- Consent management
- PII encryption
- Tenant isolation

---

### 16. Audit Logging

**Description**: Comprehensive audit trail

**Files**:
- `packages/compliance/src/audit-logger.ts` - Audit logger
- `docs/Audit_Log_Specification.md` - Audit spec
- `apps/corp-cockpit-astro/src/components/admin/audit/` - Audit UI

**Components**:
- Action logging
- Audit trail
- Compliance reporting

---

## User Management Features

### 17. Buddy Matching

**Description**: Buddy matching and management system

**Files**:
- `services/buddy-service/` - Buddy service (6 files)
- `services/buddy-connector/` - Buddy connector (35 files)
- `packages/shared-schema/src/schema/buddy.ts` - Buddy schema
- `apps/corp-cockpit-astro/src/components/buddy/` - Buddy UI (if exists)

**Components**:
- Matching algorithms
- Match management
- Event publishing

---

### 18. Program Management

**Description**: Program template and instance management

**Files**:
- `services/program-service/` - Program service (10 *.ts files)
- `services/campaigns/` - Campaign service (37 *.ts files)
- `packages/program-templates/` - Template system (5 *.ts files)
- `packages/shared-schema/src/schema/program-templates.ts` - Template schema
- `docs/PROGRAM_CONCEPTS.md` - Program concepts
- `docs/PROGRAM_TEMPLATES_GUIDE.md` - Template guide

**Components**:
- Template system
- Program instantiation
- Campaign management
- Capacity tracking

---

### 19. Campaign Management

**Description**: Campaign lifecycle and monetization

**Files**:
- `services/campaigns/` - Campaign service (37 *.ts files)
- `services/campaigns/src/lib/` - Campaign logic
  - `campaign-instantiator.ts`
  - `lifecycle-manager.ts`
  - `capacity-tracker.ts`
  - `pricing-signals.ts`
  - `upsell-analyzer.ts`
- `apps/corp-cockpit-astro/src/components/campaigns/` - Campaign UI (11 files)
- `docs/CAMPAIGN_LIFECYCLE.md` - Campaign lifecycle docs

**Components**:
- Campaign CRUD
- Capacity tracking
- Pricing insights
- Upsell detection
- Billing integration

---

### 20. Unified Profile

**Description**: Aggregated user profile across programs

**Files**:
- `services/unified-profile/` - Profile service (12 *.ts files)
- `packages/shared-schema/src/schema/users.ts` - User schema
- `apps/corp-cockpit-astro/src/components/profile/` - Profile UI (if exists)

**Components**:
- Profile aggregation
- Identity linking
- Cross-program sync

---

## Platform Features

### 21. API Gateway

**Description**: Unified API gateway with auth and rate limiting

**Files**:
- `services/api-gateway/` - Gateway service (49 files)
- `services/api-gateway/src/routes/` - Gateway routes
- `services/api-gateway/src/middleware/` - Auth middleware
- `TENANT_MIDDLEWARE.md` - Middleware docs

**Components**:
- JWT authentication
- RBAC
- Rate limiting
- Request routing
- CORS handling

---

### 22. Notifications

**Description**: Multi-channel notifications (Email, SMS, Push)

**Files**:
- `services/notifications/` - Notifications service (28 files)
- `services/notifications/src/templates/` - Email templates (4 *.mjml)
- `docs/Notifications_Service.md` - Notification docs
- `apps/corp-cockpit-astro/src/components/notifications/` - Notification UI (if exists)

**Components**:
- Email notifications
- Template rendering
- Delivery tracking

---

### 23. Safety Moderation

**Description**: Content safety and moderation

**Files**:
- `services/safety-moderation/` - Safety service (7 *.ts files)
- `services/q2q-ai/src/safety/` - Q2Q safety checks

**Components**:
- Content screening
- Safety checks
- Moderation workflows

---

### 24. Boardroom Mode

**Description**: Executive-facing "war room" dashboards

**Files**:
- `apps/corp-cockpit-astro/src/components/boardroom/` - Boardroom components (9 *.tsx files)
- `apps/cockpit-astro/BOARDROOM_IMPLEMENTATION_SUMMARY.md` - Boardroom docs

**Components**:
- Full-screen dashboards
- Presentation mode
- KPI focus
- Real-time updates

---

### 25. PWA Support

**Description**: Progressive Web App capabilities

**Files**:
- `apps/corp-cockpit-astro/public/sw.js` - Service worker
- `apps/corp-cockpit-astro/public/manifest.json` - PWA manifest
- `apps/corp-cockpit-astro/src/components/pwa/` - PWA components (2 *.tsx files)
- `apps/corp-cockpit-astro/src/features/offline/` - Offline support (6 files)
- `docs/pwa/` - PWA documentation (2 *.md files)

**Components**:
- Offline support
- Service worker
- App manifest
- Install prompts

---

### 26. Dark Mode

**Description**: Dark mode theme support

**Files**:
- `apps/corp-cockpit-astro/src/components/theme/` - Theme components (4 *.tsx files)
- `apps/corp-cockpit-astro/src/theme/` - Theme configuration (4 files)
- `apps/corp-cockpit-astro/DARK_MODE_IMPLEMENTATION.md` - Dark mode docs
- `docs/DarkModeImplementation.md` - Implementation guide

**Components**:
- Theme switching
- Contrast compliance
- System preference detection

---

### 27. Accessibility (A11y)

**Description**: WCAG 2.2 AA/AAA compliance

**Files**:
- `apps/corp-cockpit-astro/src/a11y/` - A11y utilities
- `apps/corp-cockpit-astro/src/components/a11y/` - A11y components (2 *.tsx files)
- `apps/corp-cockpit-astro/tests/a11y/` - A11y tests (3 files)
- `docs/accessibility.md` - A11y documentation
- `docs/a11y-audit.md` - Audit guide

**Components**:
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels
- Target size compliance

---

### 28. Internationalization (i18n)

**Description**: Multi-language support

**Files**:
- `apps/corp-cockpit-astro/src/i18n/` - i18n files
  - `en.json`, `uk.json`, `no.json`, `ar.json`, `he.json`
  - Locale-specific files (`en/`, `uk/`, `no/`)
- `apps/corp-cockpit-astro/src/components/LanguageSwitcher.tsx` - Language switcher
- `docs/i18n/` - i18n documentation

**Components**:
- Language switching
- RTL support
- Locale-specific formatting

---

### 29. Benchmarks

**Description**: Cohort comparison and benchmarking

**Files**:
- `apps/corp-cockpit-astro/src/components/benchmarks/` - Benchmark components (13 *.tsx files)
- `docs/benchmarks/` - Benchmark documentation (if exists)

**Components**:
- Cohort comparison
- Percentile ribbons
- Benchmark metrics

---

### 30. Approvals Workflow

**Description**: Report approval and review workflow

**Files**:
- `apps/corp-cockpit-astro/src/components/approvals/` - Approval components (2 *.tsx files)
- `tests/e2e/04-approvals.spec.ts` - Approval E2E tests

**Components**:
- Draft → Review → Approve workflow
- Version diffs
- Approval tracking

---

### 31. Deck Composer

**Description**: Presentation deck creation and management

**Files**:
- `apps/corp-cockpit-astro/src/components/deck/` - Deck components (23 files)
- `apps/corp-cockpit-astro/DECK_COMPOSER_IMPLEMENTATION.md` - Deck docs
- `packages/shared-types/DECK_*.md` - Deck documentation

**Components**:
- Slide creation
- Template system
- Export functionality

---

### 32. Publications

**Description**: Public impact pages and publications

**Files**:
- `apps/corp-cockpit-astro/src/components/publications/` - Publication components (6 files)
- `docs/publications/` - Publication documentation (5 *.md files)
- `packages/sdk/embeds/` - Embed SDK

**Components**:
- Public pages
- Embed integration
- Share links

---

### 33. Admin Console

**Description**: Administrative interface

**Files**:
- `apps/corp-cockpit-astro/src/components/admin/` - Admin components (18 files)
- `apps/corp-cockpit-astro/src/components/admin-studio/` - Admin studio (4 *.tsx files)
- `docs/admin/` - Admin documentation (2 *.md files)

**Components**:
- User management
- Tenant management
- System configuration
- Audit explorer

---

### 34. Identity & SSO

**Description**: Single Sign-On and identity management

**Files**:
- `apps/corp-cockpit-astro/src/components/identity/` - Identity components (5 *.tsx files)
- `apps/corp-cockpit-astro/src/api/identity.ts` - Identity API
- `docs/identity/` - Identity documentation (if exists)

**Components**:
- SAML/OIDC SSO
- SCIM provisioning
- Role management

---

### 35. Data Trust & Catalog

**Description**: Data governance and lineage catalog

**Files**:
- `docs/trust/data_trust_catalog.md` - Catalog documentation
- `packages/shared-schema/src/schema/lineage.ts` - Lineage schema
- Worker 5 implementation files

**Components**:
- Dataset catalog
- Lineage tracking
- Data quality monitoring
- Freshness tracking

---

## Feature Files Database

### Feature-to-File Mapping

See `FILES_DATABASE.json` for complete feature-to-file mapping with metadata.

---

## Feature Dependencies

### Feature Dependency Graph

```
Corporate Cockpit Dashboard
  ├── SROI Calculation
  ├── VIS Calculation
  ├── Analytics Engine
  ├── NLQ
  └── Report Generation

Report Generation
  ├── Q2Q AI Engine
  ├── Evidence Lineage
  └── Template System

Q2Q AI Engine
  ├── Model Registry
  └── Safety Moderation

Campaign Management
  ├── Program Management
  ├── Billing
  └── Reporting

Unified Journey Tracking
  ├── Unified Profile
  ├── Buddy Matching
  └── Program Management

GDPR Compliance
  ├── Privacy Orchestrator
  └── Audit Logging
```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0




