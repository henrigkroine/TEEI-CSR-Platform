# Core Features Index

**Generated**: 2025-01-27  
**Category**: Core Platform Features  
**Status**: Complete

---

## Table of Contents

1. [Unified Journey Tracking](#unified-journey-tracking)
2. [Q2Q AI Engine](#q2q-ai-engine)
3. [SROI Calculation](#sroi-calculation)
4. [VIS Calculation](#vis-calculation)
5. [Corporate Cockpit Dashboard](#corporate-cockpit-dashboard)

---

## Unified Journey Tracking

**Description**: Track participants across multiple programs (Buddy → Language Connect → Upskilling → Mentorship → Employment)

### Service Files

**`services/journey-engine/`** (15 files)
- `src/index.ts` - Service entry point
- `src/routes/` - Journey API routes
- `src/lib/` - Journey orchestration logic
- `__tests__/` - Tests (2 *.ts files)
- `Dockerfile` - Container definition
- `README.md` - Documentation

**`services/unified-profile/`** (12 files)
- `src/index.ts` - Profile service entry
- `src/routes/` - Profile API routes
- `src/lib/` - Profile aggregation logic
- `src/subscribers/` - NATS event subscribers
- `openapi-profile-linking.yaml` - OpenAPI spec

### Schema Files

**`packages/shared-schema/src/schema/`**
- `programs.ts` - Program schema
- `program-instances.ts` - Instance tracking schema
- `program-templates.ts` - Template schema
- `users.ts` - User schema
- `kintell.ts` - Kintell session schema
- `buddy.ts` - Buddy matching schema

### UI Components

**`apps/corp-cockpit-astro/src/components/`**
- Journey tracking components (if exists)
- Profile components
- Program enrollment components

### Documentation

- `docs/PROGRAM_CONCEPTS.md` - Program concepts
- `docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md` - Template system design
- `docs/INSTANCE_LIFECYCLE.md` - Instance lifecycle
- `docs/Journey_Engine.md` - Journey engine documentation

### Related Features
- Program Management
- Unified Profile
- Campaign Management

---

## Q2Q AI Engine

**Description**: Converts qualitative feedback into quantitative outcome scores

### Service Files

**`services/q2q-ai/`** (82 files: 76 *.ts, 3 *.yaml, 2 *.md, 1 *.jsonl)

**Core Modules**:
- `src/index.ts` - Service entry point
- `src/routes/` - Q2Q API routes
- `src/lib/` - AI processing modules
  - Feedback analysis
  - Metric conversion
  - Evidence extraction

**Safety & Quality**:
- `src/safety/` - Safety moderation modules
- `src/labeling/` - Labeling taxonomy system
- `src/slo/` - SLO tracking

**Testing**:
- `golden-sets/` - Golden test sets (4 files: 3 *.jsonl, 1 *.md)
- `demo-safety.ts` - Safety demo

**Configuration**:
- `Dockerfile` - Container definition
- `SAFETY_IMPLEMENTATION_REPORT.md` - Safety documentation
- `README.md` - Service documentation

### Package Files

**`packages/model-registry/`** (6 files)
- `src/` - Model registry implementation (5 *.ts files)
- `schema.yaml` - Model registry schema
- `tenant-overrides/` - Tenant-specific model configs (1 *.yaml)

### UI Components

**`apps/corp-cockpit-astro/src/components/q2q/`** (25 files)
- `Q2QFeedList.tsx` - Q2Q feed list component
- NLQ components integration
- Evidence display components

### Documentation

- `docs/Q2Q_GenReports_Wiring.md` - Q2Q wiring guide
- `docs/Q2Q_Label_Taxonomy.md` - Label taxonomy
- `docs/Q2Q_Model_Governance.md` - Model governance
- `docs/Q2Qv3_Methodology.md` - Q2Q methodology

### Related Features
- NLQ (Natural Language Query)
- Report Generation
- Evidence Lineage

---

## SROI Calculation

**Description**: Social Return on Investment calculation engine

### Service Files

**`services/reporting/src/calculators/`**
- `sroi.ts` - SROI calculator implementation
- `sroi.test.ts` - SROI unit tests
- `campaign-sroi.test.ts` - Campaign SROI tests

**`services/impact-calculator/`** (4 files)
- `src/index.ts` - Calculator service entry
- `src/lib/` - Impact calculation logic
- `tests/` - Tests (1 *.ts file)
- `README.md` - Documentation

### Schema Files

**`packages/shared-schema/src/schema/`**
- `metrics.ts` - Metrics schema (includes SROI)
- `evidence_ledger.ts` - Evidence tracking

### UI Components

**`apps/corp-cockpit-astro/src/components/analytics/`** (7 *.tsx files)
- SROI dashboard components
- KPI cards displaying SROI
- Chart components for SROI visualization

### Documentation

- `docs/SROI_Calculation.md` - SROI calculation guide
- `docs/SROI_VIS_Calibration.md` - SROI/VIS calibration
- `services/reporting/docs/` - Reporting documentation

### Related Features
- VIS Calculation
- Campaign Management
- Report Generation

---

## VIS Calculation

**Description**: Volunteer Impact Score calculation

### Service Files

**`services/reporting/src/calculators/`**
- `vis.ts` - VIS calculator implementation
- `vis.test.ts` - VIS unit tests
- `campaign-vis.test.ts` - Campaign VIS tests

**`services/impact-calculator/`** (4 files)
- `src/index.ts` - Calculator service entry
- `src/lib/` - Impact calculation logic

### Schema Files

**`packages/shared-schema/src/schema/`**
- `metrics.ts` - Metrics schema (includes VIS)
- `evidence_ledger.ts` - Evidence tracking

### UI Components

**`apps/corp-cockpit-astro/src/components/analytics/`** (7 *.tsx files)
- VIS dashboard components
- Volunteer engagement metrics
- Impact scoring displays

### Documentation

- `docs/VIS_Model.md` - VIS model documentation
- `docs/SROI_VIS_Calibration.md` - SROI/VIS calibration

### Related Features
- SROI Calculation
- Volunteer Tracking
- Campaign Management

---

## Corporate Cockpit Dashboard

**Description**: Executive dashboard with real-time impact metrics

### App Files

**`apps/corp-cockpit-astro/`** (581 files total)

**Core Dashboard Components**:
- `src/components/DashboardWithSSE.tsx` - Main dashboard with Server-Sent Events
- `src/components/DashboardActions.tsx` - Dashboard actions
- `src/components/dashboard/` - Dashboard components (1 *.tsx file)

**Widgets**:
- `src/components/widgets/` - Dashboard widgets (13 *.tsx files)
- `src/components/KPICard.tsx` - KPI card component
- `src/components/Chart.tsx` - Chart component
- `src/components/ChartOptimized.tsx` - Optimized chart component

**Real-Time Updates**:
- `src/components/ConnectionStatus.tsx` - Connection status indicator
- SSE integration for live metrics

**Pages**:
- `src/pages/` - Astro pages (74 files: 70 *.astro, 4 *.ts)
- Dashboard routes and layouts

### API Integration

**`apps/corp-cockpit-astro/src/api/`**
- `reporting.ts` - Reporting API client
- `identity.ts` - Identity API client
- `tenantPreferences.ts` - Tenant preferences API

### State Management

**`apps/corp-cockpit-astro/src/contexts/`**
- `TenantContext.tsx` - Tenant context provider

**`apps/corp-cockpit-astro/src/hooks/`** (6 *.ts files)
- Custom React hooks for dashboard state

### Utilities

**`apps/corp-cockpit-astro/src/lib/`** (28 files: 27 *.ts, 1 *.tsx)
- Dashboard utilities
- Data transformation
- API helpers

**`apps/corp-cockpit-astro/src/utils/`** (23 files: 21 *.ts, 1 *.tsx, 1 *.skip)
- Helper utilities
- Formatting functions

### Documentation

- `apps/corp-cockpit-astro/README.md` - Dashboard README
- `apps/corp-cockpit-astro/IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `docs/cockpit/` - Cockpit documentation (10 *.md files)

### Related Features
- Boardroom Mode
- PWA Support
- Dark Mode
- Accessibility
- i18n

---

## File Statistics

| Feature | Service Files | UI Files | Documentation | Total |
|---------|--------------|----------|---------------|-------|
| Unified Journey Tracking | 27 | ~10 | 4 | ~41 |
| Q2Q AI Engine | 82 | 25 | 4 | ~111 |
| SROI Calculation | 4 | 7 | 3 | ~14 |
| VIS Calculation | 4 | 7 | 2 | ~13 |
| Corporate Cockpit Dashboard | 0 | 581 | 11 | ~592 |
| **Total** | **117** | **630** | **24** | **~771** |

---

## Dependencies

### Core Features Dependency Graph

```
Corporate Cockpit Dashboard
  ├── SROI Calculation
  ├── VIS Calculation
  ├── Q2Q AI Engine
  └── Unified Journey Tracking

Unified Journey Tracking
  ├── Program Management
  ├── Unified Profile
  └── Campaign Management

Q2Q AI Engine
  ├── Model Registry
  └── Safety Moderation

SROI/VIS Calculation
  ├── Evidence Lineage
  └── Campaign Management
```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



