# User Management Features Index

**Generated**: 2025-01-27  
**Category**: User Management  
**Status**: Complete

---

## Table of Contents

1. [Buddy Matching](#buddy-matching)
2. [Program Management](#program-management)
3. [Campaign Management](#campaign-management)
4. [Unified Profile](#unified-profile)

---

## Buddy Matching

**Description**: Buddy matching and management system

### Service Files

**`services/buddy-service/`** (6 files: 5 *.ts, 1 *.csv)
- `src/index.ts` - Buddy service entry point
- `src/routes/` - Buddy API routes
- `src/lib/` - Matching algorithms
- `Dockerfile` - Container definition

**`services/buddy-connector/`** (35 files: 28 *.ts, 4 *.map, 2 *.js, 1 *.json)
- `src/index.ts` - Connector entry point
- `src/routes/` - Connector routes
- `src/lib/` - Integration logic
- `Dockerfile` - Container definition
- `README.md` - Documentation

**`packages/ingestion-buddy/`** (17 *.ts files)
- Buddy ingestion utilities
- Data transformation modules

### Schema Files

**`packages/shared-schema/src/schema/`**
- `buddy.ts` - Buddy matching schema
- `buddy_matches` - Match records
- `buddy_events` - Event tracking
- `buddy_feedback` - Feedback collection

### UI Components

**`apps/corp-cockpit-astro/src/components/`**
- Buddy matching UI (if exists)
- Match management components

### Documentation

- `docs/ingestion/BUDDY_EXPORT_SPEC.md` - Buddy export specification
- `services/buddy-connector/README.md` - Buddy connector README

### Observability

**`observability/grafana/dashboards/`**
- `buddy-service-metrics.json` - Buddy service metrics dashboard

### Tests

**`tests/integration/buddy-system/`**
- `calculation-accuracy.test.ts` - Calculation accuracy tests
- `data-validation.test.ts` - Data validation tests
- `event-flow.test.ts` - Event flow tests
- `failure-injection.test.ts` - Failure injection tests
- `webhook-delivery.test.ts` - Webhook delivery tests
- `README.md` - Integration test documentation
- `run-all-tests.sh` - Test runner script

**`tests/fixtures/webhooks/`**
- `buddy-match-created.json` - Buddy match webhook fixture

**`tests/load/buddy-system/`**
- `load-test.js` - Load tests
- `run-load-tests.sh` - Load test runner

### Related Features
- Unified Profile
- Program Management
- Notifications

---

## Program Management

**Description**: Program template and instance management

### Service Files

**`services/program-service/`** (10 *.ts files)
- `src/index.ts` - Program service entry
- `src/routes/programs.ts` - Program CRUD routes
- `src/routes/templates.ts` - Template management routes
- `src/routes/campaigns.ts` - Campaign routes
- `src/lib/template-registry.ts` - Template registry
- `src/lib/instantiator.ts` - Program instantiation logic
- `src/lib/config-resolver.ts` - Configuration resolution
- `migrations/001_backfill_programs.ts` - Migration
- `openapi.yaml` - OpenAPI specification

**`packages/program-templates/`** (5 *.ts files)
- `src/schemas/buddy-template.ts` - Buddy program template
- `src/schemas/language-template.ts` - Language program template
- `src/schemas/mentorship-template.ts` - Mentorship program template
- `src/schemas/index.ts` - Template exports
- `src/index.ts` - Package entry

### Schema Files

**`packages/shared-schema/src/schema/`**
- `programs.ts` - Program schema
- `program-templates.ts` - Template schema
- `program-instances.ts` - Instance schema
- `program-campaigns.ts` - Program-campaign associations

### Seed Data

**`scripts/seed/templates/`**
- `buddy-template.sql` - Buddy template seed
- `language-template.sql` - Language template seed
- `mentorship-template.sql` - Mentorship template seed
- `upskilling-template.sql` - Upskilling template seed
- `README.md` - Template seed documentation
- `TEMPLATE_INVENTORY.md` - Template inventory

### Documentation

- `services/program-service/README.md` - Program service README
- `services/program-service/INTEGRATION_CHECKLIST.md` - Integration checklist
- `docs/PROGRAM_CONCEPTS.md` - Program concepts
- `docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md` - Template system design
- `docs/PROGRAM_TEMPLATES_GUIDE.md` - Template guide
- `docs/TEMPLATE_VERSIONING.md` - Template versioning
- `docs/INSTANCE_LIFECYCLE.md` - Instance lifecycle
- `docs/runbooks/PROGRAM_TEMPLATE_SYSTEM.md` - Template system runbook

### Related Features
- Campaign Management
- Unified Journey Tracking
- Template System

---

## Campaign Management

**Description**: Campaign lifecycle and monetization

### Service Files

**`services/campaigns/`** (37 *.ts files)

**Routes**:
- `src/routes/campaigns.ts` - Campaign CRUD operations
- `src/routes/beneficiary-groups.ts` - Beneficiary groups
- `src/routes/program-templates.ts` - Template routes
- `src/routes/pricing-insights.ts` - Pricing analytics
- `src/routes/upsell-opportunities.ts` - Upsell detection

**Business Logic**:
- `src/lib/campaign-instantiator.ts` - Campaign creation
- `src/lib/lifecycle-manager.ts` - Lifecycle management
- `src/lib/capacity-tracker.ts` - Capacity tracking
- `src/lib/capacity-alerts.ts` - Capacity alerts
- `src/lib/pricing-signals.ts` - Pricing logic
- `src/lib/upsell-analyzer.ts` - Upsell analysis
- `src/lib/metrics-aggregator.ts` - Metrics aggregation
- `src/lib/seat-tracker.ts` - Seat tracking
- `src/lib/credit-tracker.ts` - Credit tracking
- `src/lib/commercial-terms.ts` - Commercial terms
- `src/lib/evidence-selector.ts` - Evidence selection
- `src/lib/activity-associator.ts` - Activity association
- `src/lib/backfill-associations.ts` - Backfill logic
- `src/lib/billing-integrator.ts` - Billing integration
- `src/lib/campaign-validator.ts` - Validation
- `src/lib/config-merger.ts` - Config merging
- `src/lib/state-transitions.ts` - State management

**Middleware**:
- `src/middleware/auth.ts` - Authentication

**Tests**:
- `tests/` - Test suites (14 *.ts files)
  - `snapshots.test.ts`
  - `seat-tracker.test.ts`
  - `pricing-signals.test.ts`
  - `metrics-aggregator.test.ts`
  - `credit-tracker.test.ts`
  - `commercial-terms.test.ts`
  - `capacity-tracker.test.ts`
  - `campaign-instantiator.test.ts`
  - `billing-integrator.test.ts`
  - `backfill.test.ts`
  - `activity-associator.test.ts`
  - `api/campaigns.test.ts`
  - `api/reference-data.test.ts`
  - `api/auth.test.ts`

**Configuration**:
- `openapi.yaml` - OpenAPI specification
- Multiple agent completion reports (*.md)

### Schema Files

**`packages/shared-schema/src/schema/`**
- `program-campaigns.ts` - Campaign schema
- `beneficiary-groups.ts` - Beneficiary groups schema
- `campaign-metrics-snapshots.ts` - Campaign metrics snapshots

### UI Components

**`apps/corp-cockpit-astro/src/components/campaigns/`** (11 files: 8 *.tsx, 2 *.css, 1 *.md)
- Campaign list components
- Campaign detail components
- Campaign creation/editing
- Campaign dashboard
- `TEST_PLAN.md` - Test plan

**`apps/corp-cockpit-astro/docs/`**
- `CAMPAIGN_DETAIL_DASHBOARD_IMPLEMENTATION.md` - Campaign dashboard implementation
- `CAMPAIGN_DETAIL_DASHBOARD_TEST_PLAN.md` - Campaign dashboard test plan

### Seed Data

**`scripts/seed/swarm6/`**
- `campaigns.sql` - Campaign seed data
- `campaign-metrics-snapshots.sql` - Campaign metrics seed
- `beneficiary-groups.sql` - Beneficiary groups seed
- `program-instances.sql` - Program instances seed
- `README.md` - Seed documentation

### Documentation

- `services/campaigns/README.md` - Campaign service README
- `docs/CAMPAIGN_LIFECYCLE.md` - Campaign lifecycle
- `docs/CAMPAIGN_DASHBOARD_QUERIES.md` - Campaign dashboard queries
- `docs/CAMPAIGN_PRICING_MODELS.md` - Campaign pricing models
- `docs/CAMPAIGN_MONETIZATION_QUICK_REF.md` - Monetization quick reference
- `docs/PRICING_PROPOSAL_TEMPLATE.md` - Pricing proposal template
- `docs/UPSELL_EMAIL_TEMPLATES.md` - Upsell email templates
- `UPSELL_ANALYZER_IMPLEMENTATION.md` - Upsell analyzer implementation

### Related Features
- Program Management
- Billing
- Reporting
- Evidence Lineage

---

## Unified Profile

**Description**: Aggregated user profile across programs

### Service Files

**`services/unified-profile/`** (12 *.ts files)
- `src/index.ts` - Profile service entry
- `src/routes/` - Profile API routes
- `src/lib/` - Profile aggregation logic
- `src/subscribers/` - NATS event subscribers
  - `index.ts` - Subscriber exports
- `openapi-profile-linking.yaml` - OpenAPI specification

**Tests**:
- `src/__tests__/enrollment-flow.e2e.test.ts` - Enrollment flow E2E test

### Schema Files

**`packages/shared-schema/src/schema/`**
- `users.ts` - User schema
- `companies.ts` - Company schema
- Profile linking schemas

### UI Components

**`apps/corp-cockpit-astro/src/components/`**
- Profile components (if exists)
- User management components

### Documentation

- `docs/` - Profile documentation (if exists)

### Observability

**`observability/grafana/dashboards/`**
- `unified-profile-metrics.json` - Unified profile metrics dashboard

### Related Features
- Unified Journey Tracking
- Program Management
- Identity Management

---

## File Statistics

| Feature | Service Files | Package Files | UI Files | Documentation | Tests | Total |
|---------|--------------|---------------|----------|---------------|-------|-------|
| Buddy Matching | 41 | 17 | ~5 | 2 | 7 | ~72 |
| Program Management | 10 | 5 | ~5 | 8 | - | ~28 |
| Campaign Management | 37 | 0 | 11 | 8 | 14 | ~70 |
| Unified Profile | 12 | 0 | ~5 | 1 | 1 | ~19 |
| **Total** | **100** | **22** | **26** | **19** | **22** | **~189** |

---

## Dependencies

### User Management Dependency Graph

```
Campaign Management
  ├── Program Management (templates)
  ├── Billing (monetization)
  ├── Reporting (metrics)
  └── Evidence Lineage (associations)

Program Management
  ├── Template System (templates)
  ├── Campaign Management (instances)
  └── Unified Profile (participants)

Unified Profile
  ├── Program Management (enrollments)
  ├── Buddy Matching (matches)
  └── NATS (events)

Buddy Matching
  ├── Unified Profile (users)
  ├── Program Management (programs)
  └── NATS (events)
```

---

## Workflows

### Campaign Creation Workflow
1. Template selection from Program Service
2. Campaign instantiation via Campaign Instantiator
3. Configuration merging
4. Capacity tracking setup
5. Billing integration
6. Evidence selector configuration
7. Campaign activation

### Program Instantiation Workflow
1. Template selection
2. Configuration resolution
3. Program instance creation
4. Campaign association
5. Participant enrollment
6. Metrics tracking setup

### Buddy Matching Workflow
1. User profile creation/update
2. Matching algorithm execution
3. Match creation
4. Event publishing (NATS)
5. Notification delivery
6. Match acceptance/tracking

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



