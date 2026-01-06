# Platform Features Index

**Generated**: 2025-01-27  
**Category**: Platform Infrastructure Features  
**Status**: Complete

---

## Table of Contents

1. [API Gateway](#api-gateway)
2. [Notifications](#notifications)
3. [Safety Moderation](#safety-moderation)
4. [Boardroom Mode](#boardroom-mode)
5. [PWA Support](#pwa-support)
6. [Dark Mode](#dark-mode)
7. [Accessibility (A11y)](#accessibility-a11y)
8. [Internationalization (i18n)](#internationalization-i18n)
9. [Benchmarks](#benchmarks)
10. [Approvals Workflow](#approvals-workflow)
11. [Deck Composer](#deck-composer)
12. [Publications](#publications)
13. [Admin Console](#admin-console)
14. [Identity & SSO](#identity--sso)
15. [Data Trust & Catalog](#data-trust--catalog)

---

## API Gateway

**Description**: Unified API gateway with authentication and rate limiting

### Service Files

**`services/api-gateway/`** (49 files: 48 *.ts, 1 *.sql)

**Core Modules**:
- `src/index.ts` - Gateway entry point
- `src/routes/` - Gateway routes (48 *.ts files)
- `src/middleware/` - Auth, rate limiting middleware
- `TENANT_MIDDLEWARE.md` - Middleware documentation

**Configuration**:
- `Dockerfile` - Container definition
- `package.json`, `tsconfig.json`

### Documentation

- `docs/api/` - API documentation (2 *.md files)
- `TENANT_MIDDLEWARE.md` - Tenant middleware guide

### Observability

**`observability/grafana/dashboards/`**
- `api-gateway-metrics.json` - API Gateway metrics dashboard

### Related Features
- Identity & SSO
- Rate Limiting
- Request Routing

---

## Notifications

**Description**: Multi-channel notifications (Email, SMS, Push)

### Service Files

**`services/notifications/`** (28 files: 24 *.ts, 4 *.mjml)

**Core Modules**:
- `src/index.ts` - Notifications service entry
- `src/routes/` - Notification routes
- `src/lib/` - Notification logic
- `src/templates/` - Email templates (4 *.mjml files)

**Database**:
- `migrations/` - Database migrations (1 *.sql)
- `INTEGRATION_SCHEMA.sql` - Integration schema

**Configuration**:
- `Dockerfile` - Container definition
- `W5_IMPLEMENTATION_SUMMARY.md` - Implementation summary

### Documentation

- `docs/Notifications_Service.md` - Notifications service documentation
- `docs/Notifications_Integration.md` - Integration guide
- `docs/Notifications_Runbook.md` - Notifications runbook

### Related Features
- Webhooks
- Email Templates
- Event-Driven Architecture

---

## Safety Moderation

**Description**: Content safety and moderation

### Service Files

**`services/safety-moderation/`** (7 *.ts files)
- `src/index.ts` - Safety service entry
- `src/routes/` - Moderation routes
- `src/lib/` - Moderation logic
- `Dockerfile` - Container definition

**`services/q2q-ai/src/safety/`** - Q2Q AI safety checks

### Documentation

- `services/q2q-ai/SAFETY_IMPLEMENTATION_REPORT.md` - Safety implementation report
- `docs/SWARM6_TYPE_SAFETY.md` - Type safety documentation

### Related Features
- Q2Q AI Engine
- Content Screening

---

## Boardroom Mode

**Description**: Executive-facing "war room" dashboards

### UI Components

**`apps/corp-cockpit-astro/src/components/boardroom/`** (9 *.tsx files)
- Boardroom dashboard components
- Full-screen displays
- Presentation mode
- KPI focus components

### Documentation

- `apps/corp-cockpit-astro/BOARDROOM_IMPLEMENTATION_SUMMARY.md` - Boardroom implementation
- `apps/corp-cockpit-astro/BOARDROOM_MODE_IMPLEMENTATION.md` - Boardroom mode guide
- `docs/Cockpit_Boardroom_And_Exports.md` - Boardroom and exports guide

### Related Features
- Dashboard
- Report Generation
- KPI Display

---

## PWA Support

**Description**: Progressive Web App capabilities

### Service Worker

**`apps/corp-cockpit-astro/public/sw.js`** - Service worker
**`apps/corp-cockpit-astro/src/sw.ts`** - Service worker TypeScript source

### Manifest

**`apps/corp-cockpit-astro/public/manifest.json`** - PWA manifest
**`apps/corp-cockpit-astro/public/manifest.webmanifest`** - Web manifest

### Offline Support

**`apps/corp-cockpit-astro/src/features/offline/`** (6 files: 4 *.ts, 2 *.tsx)
- Offline detection
- Offline data caching
- Offline UI components

**`apps/corp-cockpit-astro/public/offline.html`** - Offline page

### PWA Components

**`apps/corp-cockpit-astro/src/components/pwa/`** (2 *.tsx files)
- PWA install prompts
- PWA status indicators

### Documentation

- `apps/corp-cockpit-astro/PWA_IMPLEMENTATION.md` - PWA implementation guide
- `docs/pwa/` - PWA documentation (2 *.md files)
  - `install.md` - Installation guide
  - `offline-modes.md` - Offline modes guide

### Tests

**`tests/e2e/07-pwa.spec.ts`** - PWA E2E tests

### Related Features
- Dashboard
- Offline Support
- Service Worker

---

## Dark Mode

**Description**: Dark mode theme support

### Theme Components

**`apps/corp-cockpit-astro/src/components/theme/`** (4 *.tsx files)
- Theme switcher components
- Theme context providers

### Theme Configuration

**`apps/corp-cockpit-astro/src/theme/`** (4 files: 3 *.ts, 1 *.tsx)
- Theme configuration
- Color schemes
- Contrast settings

### Documentation

- `apps/corp-cockpit-astro/DARK_MODE_IMPLEMENTATION.md` - Dark mode implementation
- `docs/DarkModeImplementation.md` - Implementation guide
- `docs/DarkModeTestingGuide.md` - Testing guide
- `docs/a11y_color_guide.md` - Color guide

### Scripts

**`scripts/validateDarkModeContrast.ts`** - Dark mode contrast validator
**`apps/corp-cockpit-astro/scripts/check-contrast.js`** - Contrast checker

### Related Features
- Accessibility
- Theme System

---

## Accessibility (A11y)

**Description**: WCAG 2.2 AA/AAA compliance

### A11y Utilities

**`apps/corp-cockpit-astro/src/a11y/`**
- `keyboardNav.ts` - Keyboard navigation utilities
- `screenReaderScripts.ts` - Screen reader scripts
- `keyboard-map.md` - Keyboard map documentation
- `targetSizeAudit.md` - Target size audit

### A11y Components

**`apps/corp-cockpit-astro/src/components/a11y/`** (2 *.tsx files)
- Accessibility wrapper components
- A11y helpers

### Documentation

- `apps/corp-cockpit-astro/ACCESSIBILITY.md` - Accessibility guide
- `docs/accessibility.md` - Accessibility documentation
- `docs/a11y-audit.md` - A11y audit guide
- `docs/a11y_color_guide.md` - Color guide
- `docs/UX_A11y_VRT_Policies.md` - A11y policies

### Tests

**`apps/corp-cockpit-astro/tests/a11y/`** (3 files: 2 *.ts, 1 *.md)
- Accessibility tests
- Screen reader tests
- Keyboard navigation tests

**`tests/e2e/09-accessibility.spec.ts`** - Accessibility E2E tests

### Scripts

**`apps/corp-cockpit-astro/scripts/validate-chart-contrast.ts`** - Chart contrast validator

### Related Features
- Dark Mode
- Keyboard Navigation
- Screen Reader Support

---

## Internationalization (i18n)

**Description**: Multi-language support

### i18n Files

**`apps/corp-cockpit-astro/src/i18n/`**
- `en.json` - English translations
- `uk.json` - Ukrainian translations
- `no.json` - Norwegian translations
- `ar.json` - Arabic translations
- `he.json` - Hebrew translations
- `en/` - English locale-specific (2 *.json files)
  - `forecast.json`
  - `benchmarks.json`
- `uk/` - Ukrainian locale-specific (2 *.json files)
- `no/` - Norwegian locale-specific (2 *.json files)

### Components

**`apps/corp-cockpit-astro/src/components/LanguageSwitcher.tsx`** - Language switcher component

### Documentation

- `docs/i18n/rtl_guide.md` - RTL (Right-to-Left) guide

### Related Features
- Dashboard
- UI Components

---

## Benchmarks

**Description**: Cohort comparison and benchmarking

### UI Components

**`apps/corp-cockpit-astro/src/components/benchmarks/`** (13 *.tsx files)
- Benchmark comparison components
- Cohort comparison UI
- Percentile ribbon displays
- Benchmark metric cards

### i18n

**`apps/corp-cockpit-astro/src/i18n/en/benchmarks.json`**
**`apps/corp-cockpit-astro/src/i18n/uk/benchmarks.json`**
**`apps/corp-cockpit-astro/src/i18n/no/benchmarks.json`**

### Tests

**`tests/e2e/06-benchmarks.spec.ts`** - Benchmarks E2E tests

### Related Features
- Analytics
- Dashboard
- Metrics

---

## Approvals Workflow

**Description**: Report approval and review workflow

### UI Components

**`apps/corp-cockpit-astro/src/components/approvals/`** (2 *.tsx files)
- Approval workflow components
- Review interface
- Version diff display

### Tests

**`tests/e2e/04-approvals.spec.ts`** - Approvals E2E tests

### Related Features
- Report Generation
- Workflow Management

---

## Deck Composer

**Description**: Presentation deck creation and management

### UI Components

**`apps/corp-cockpit-astro/src/components/deck/`** (23 files: 17 *.tsx, 4 *.ts, 2 *.md)
- Deck composer components
- Slide creation/editing
- Template system
- Export functionality

**`apps/corp-cockpit-astro/src/components/deck/slides/`**
- `README.md` - Slides documentation

### Documentation

- `apps/corp-cockpit-astro/DECK_COMPOSER_IMPLEMENTATION.md` - Deck composer implementation
- `packages/shared-types/DECK_QUICK_REFERENCE.md` - Deck quick reference
- `packages/shared-types/DECK_SCHEMA_DIAGRAM.txt` - Deck schema diagram
- `packages/shared-types/DECK_SCHEMA_SUMMARY.md` - Deck schema summary
- `packages/shared-types/DECK_USAGE_EXAMPLES.md` - Deck usage examples

### Related Features
- Report Generation
- Template System

---

## Publications

**Description**: Public impact pages and publications

### UI Components

**`apps/corp-cockpit-astro/src/components/publications/`** (6 files: 5 *.tsx, 1 *.css)
- Publication components
- Public page components
- Embed integration

### SDK

**`packages/sdk/embeds/`** (6 files: 2 *.js, 2 *.json, 1 *.md, 1 *.ts)
- Embed SDK for publications
- `README.md` - Embed SDK documentation

### Documentation

- `docs/publications/` - Publication documentation (5 *.md files)
  - `README.md` - Publications README
  - `EMBED_GUIDE.md` - Embed guide
  - `embed-integration.md` - Embed integration
  - `Publishing_Guide.md` - Publishing guide
  - `Embed_Integration.md` - Embed integration guide

### Related Features
- Share Links
- Public Pages

---

## Admin Console

**Description**: Administrative interface

### UI Components

**`apps/corp-cockpit-astro/src/components/admin/`** (18 files: 17 *.tsx, 1 *.css)
- Admin dashboard components
- User management
- Tenant management
- System configuration
- Audit explorer

**`apps/corp-cockpit-astro/src/components/admin-studio/`** (4 *.tsx files)
- Admin studio components
- Advanced admin features

### Documentation

- `docs/admin/` - Admin documentation (2 *.md files)
  - `admin_studio_v2.md` - Admin studio v2
  - `consolidated_reporting.md` - Consolidated reporting

**`apps/corp-cockpit-astro/ADMIN_CONSOLE_SUMMARY.md`** - Admin console summary

### Tests

**`tests/e2e/10-sso-admin.spec.ts`** - SSO admin E2E tests

### Related Features
- Identity & SSO
- Audit Logging
- Governance

---

## Identity & SSO

**Description**: Single Sign-On and identity management

### UI Components

**`apps/corp-cockpit-astro/src/components/identity/`** (5 *.tsx files)
- Identity management components
- SSO configuration
- Role management

### API

**`apps/corp-cockpit-astro/src/api/identity.ts`** - Identity API client

### Documentation

- `docs/identity/` - Identity documentation (if exists)
- `IMPLEMENTATION_SUMMARY_SSO_SCIM_UX.md` - SSO/SCIM UX implementation summary

### Tests

**`tests/e2e/10-sso-admin.spec.ts`** - SSO admin E2E tests

### Related Features
- API Gateway
- Admin Console
- RBAC

---

## Data Trust & Catalog

**Description**: Data governance and lineage catalog

### Documentation

- `docs/trust/data_trust_catalog.md` - Data trust catalog documentation

### Schema Files

**`packages/shared-schema/src/schema/`**
- `lineage.ts` - Lineage tracking schema

### Related Features
- Evidence Lineage
- Data Governance
- Worker 5 Implementation

---

## File Statistics

| Feature | Service Files | UI Files | Documentation | Tests | Total |
|---------|--------------|----------|---------------|-------|-------|
| API Gateway | 49 | 0 | 2 | - | ~51 |
| Notifications | 28 | 0 | 3 | - | ~31 |
| Safety Moderation | 7 | 0 | 2 | - | ~9 |
| Boardroom Mode | 0 | 9 | 3 | - | ~12 |
| PWA Support | 0 | 8 | 3 | 1 | ~12 |
| Dark Mode | 0 | 8 | 4 | - | ~12 |
| Accessibility | 0 | 2 | 5 | 4 | ~11 |
| i18n | 0 | 1 | 1 | - | ~2 |
| Benchmarks | 0 | 13 | 0 | 1 | ~14 |
| Approvals Workflow | 0 | 2 | 0 | 1 | ~3 |
| Deck Composer | 0 | 23 | 5 | - | ~28 |
| Publications | 0 | 6 | 5 | - | ~11 |
| Admin Console | 0 | 22 | 3 | 1 | ~26 |
| Identity & SSO | 0 | 5 | 1 | 1 | ~7 |
| Data Trust & Catalog | 0 | 0 | 1 | - | ~1 |
| **Total** | **84** | **99** | **37** | **9** | **~229** |

---

## Dependencies

### Platform Features Dependency Graph

```
API Gateway
  ├── Identity & SSO (authentication)
  ├── Rate Limiting (Redis)
  └── Request Routing

Notifications
  ├── Email Templates (MJML)
  ├── NATS (events)
  └── Webhooks (delivery)

PWA Support
  ├── Service Worker (offline)
  └── Manifest (metadata)

Dark Mode
  ├── Theme System (configuration)
  └── Accessibility (contrast)

Accessibility
  ├── Keyboard Navigation
  ├── Screen Reader Support
  └── Target Size Compliance
```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



