# Integration Features Index

**Generated**: 2025-01-27  
**Category**: External Integrations  
**Status**: Complete

---

## Table of Contents

1. [External Connectors](#external-connectors)
2. [Discord Integration](#discord-integration)
3. [Webhooks](#webhooks)

---

## External Connectors

**Description**: Integration with external CSR platforms (Benevity, Goodera, Workday)

### Impact-In Service

**`services/impact-in/`** (74 *.ts files)

**Core Service**:
- `src/index.ts` - Service entry point
- `src/routes/` - Ingestion API routes
- `src/lib/` - Data transformation modules

**Connectors**:
- `src/connectors/` - External connector implementations
  - Benevity connector
  - Goodera connector
  - Workday connector

**Scheduling**:
- `scheduler/` - Scheduled ingestion (1 *.ts)
- `sla-monitor/` - SLA monitoring (1 *.ts)

**Tests**:
- `__tests__/` - Integration tests (2 *.ts files)

**Configuration**:
- `Dockerfile` - Container definition
- `README.md` - Documentation

### Kintell Connector

**`services/kintell-connector/`** (18 files: 16 *.ts, 1 *.csv, 1 *.md)

**Core Files**:
- `src/index.ts` - Connector entry point
- `src/routes/import.ts` - CSV import route
- `src/lib/campaign-association.ts` - Campaign association logic
- `src/identity/` - Identity resolution
  - `resolution-strategy.md` - Resolution strategy documentation

**Configuration**:
- `Dockerfile` - Container definition
- `test.http` - HTTP test file

### Upskilling Connector

**`services/upskilling-connector/`** (8 files: 6 *.ts, 2 *.csv)

**Core Files**:
- `src/index.ts` - Connector entry point
- `src/routes/import.ts` - CSV import route
- `src/lib/` - Integration logic

**Configuration**:
- `Dockerfile` - Container definition
- `test.http` - HTTP test file

### Buddy Connector

**`services/buddy-connector/`** (35 files: 28 *.ts, 4 *.map, 2 *.js, 1 *.json)

**Core Files**:
- `src/index.ts` - Connector entry point
- `src/routes/` - Connector routes
- `src/lib/` - Integration logic

**Configuration**:
- `Dockerfile` - Container definition
- `README.md` - Documentation

### Documentation

- `docs/Impact_In_API.md` - Impact-In API documentation
- `docs/ImpactIn_Connectors.md` - Connector documentation
- `docs/ImpactIn_Integrations.md` - Integration guide
- `docs/ImpactIn_Runbook.md` - Impact-In runbook
- `docs/integrations/CONNECTORS_GUIDE.md` - Connectors guide
- `docs/integrations/WORKER4_CONNECTORS.md` - Worker 4 connectors
- `docs/integrations/importer.md` - Importer documentation
- `docs/ingestion/BUDDY_EXPORT_SPEC.md` - Buddy export specification
- `services/kintell-connector/src/identity/resolution-strategy.md` - Identity resolution

### Observability

**`observability/grafana/dashboards/`**
- `impact-in-metrics.json` - Impact-In metrics dashboard
- `kintell-connector-metrics.json` - Kintell connector metrics
- `upskilling-connector-metrics.json` - Upskilling connector metrics

### Related Features
- Campaign Management
- Program Management
- Data Ingestion

---

## Discord Integration

**Description**: Discord bot for community engagement and feedback collection

### Service Files

**`services/discord-bot/`** (9 *.ts files)

**Core Files**:
- `src/index.ts` - Bot entry point
- `src/lib/` - Bot logic
  - Discord.js integration
  - Event handlers
  - Feedback collection

**Configuration**:
- `Dockerfile` - Container definition
- `package.json`, `tsconfig.json`

### Documentation

- `docs/Discord_Integration.md` - Discord integration documentation
- `docs/Discord_Usage_Guide.md` - Discord usage guide

### Related Features
- Notifications
- Feedback Collection
- Community Engagement

---

## Webhooks

**Description**: Outbound webhook notifications for external systems

### Notifications Service

**`services/notifications/`** (28 files: 24 *.ts, 4 *.mjml)

**Core Files**:
- `src/index.ts` - Notifications service entry
- `src/routes/` - Notification routes
- `src/lib/` - Notification logic
  - Webhook delivery
  - Retry logic
  - Event publishing

**Templates**:
- `src/templates/` - Email templates (4 *.mjml files)

**Database**:
- `migrations/` - Database migrations (1 *.sql)
- `INTEGRATION_SCHEMA.sql` - Integration schema

**Configuration**:
- `Dockerfile` - Container definition
- `W5_IMPLEMENTATION_SUMMARY.md` - Implementation summary

### Test Fixtures

**`tests/fixtures/webhooks/`**
- `buddy-match-created.json` - Buddy match webhook fixture
- `kintell-session-created.json` - Kintell session created webhook
- `kintell-session-updated.json` - Kintell session updated webhook
- `upskilling-course-completed.json` - Course completion webhook

### Tests

**`tests/`**
- `e2e/webhook-integration.spec.ts` - Webhook integration E2E test
- `integration/webhook-to-profile.test.ts` - Webhook to profile integration test

**`tests/utils/`**
- `webhook-helpers.ts` - Webhook test helpers

### Documentation

- `docs/Notifications_Service.md` - Notifications service documentation
- `docs/Notifications_Integration.md` - Webhook integration guide
- `docs/Notifications_Runbook.md` - Notifications runbook

### Observability

**`observability/grafana/dashboards/`**
- Notifications metrics (if exists)

### Related Features
- Notifications
- Event-Driven Architecture
- External Integrations

---

## File Statistics

| Feature | Service Files | Documentation | Tests | Total |
|---------|--------------|---------------|-------|-------|
| External Connectors | 135 | 9 | 2 | ~146 |
| Discord Integration | 9 | 2 | - | ~11 |
| Webhooks | 28 | 3 | 3 | ~34 |
| **Total** | **172** | **14** | **5** | **~191** |

---

## Connector Details

### Benevity Connector
- **Type**: External API integration
- **Service**: `services/impact-in/src/connectors/benevity/`
- **Purpose**: Import volunteer data from Benevity platform
- **Data**: Volunteer hours, donations, program participation

### Goodera Connector
- **Type**: External API integration
- **Service**: `services/impact-in/src/connectors/goodera/`
- **Purpose**: Import CSR program data from Goodera
- **Data**: Program enrollments, activities, outcomes

### Workday Connector
- **Type**: External API integration
- **Service**: `services/impact-in/src/connectors/workday/`
- **Purpose**: Import employee data from Workday
- **Data**: Employee profiles, department assignments, participation

### Kintell Connector
- **Type**: CSV import + API integration
- **Service**: `services/kintell-connector/`
- **Purpose**: Import language/mentorship session data
- **Data**: Sessions, progress, completion status
- **Features**: Campaign association, identity resolution

### Upskilling Connector
- **Type**: CSV import
- **Service**: `services/upskilling-connector/`
- **Purpose**: Import course completion data
- **Data**: Course completions, learning progress
- **Features**: Campaign association

### Buddy Connector
- **Type**: External system integration
- **Service**: `services/buddy-connector/`
- **Purpose**: Integrate with Buddy matching system
- **Data**: Matches, events, feedback

---

## Integration Patterns

### Data Flow

```
External Systems (Benevity, Goodera, Workday)
  ↓
Impact-In Service
  ↓
Data Transformation & Validation
  ↓
NATS Events
  ↓
Internal Services (Reporting, Analytics, Campaigns)
```

### Webhook Flow

```
Internal Events (NATS)
  ↓
Notifications Service
  ↓
Webhook Delivery (with retry)
  ↓
External Systems
```

### Connector Flow

```
External Data (CSV/API)
  ↓
Connector Service (Kintell/Upskilling/Buddy)
  ↓
Data Transformation
  ↓
Campaign Association
  ↓
NATS Events
  ↓
Internal Services
```

---

## Dependencies

### Integration Dependency Graph

```
External Connectors
  ├── Impact-In Service (orchestration)
  ├── NATS (event publishing)
  └── PostgreSQL (data storage)

Webhooks
  ├── Notifications Service (delivery)
  ├── NATS (event source)
  └── External Systems (consumers)

Discord Integration
  ├── Discord.js (Discord API)
  └── NATS (event publishing)
```

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



