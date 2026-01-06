# AI & Analytics Features Index

**Generated**: 2025-01-27  
**Category**: AI & Analytics  
**Status**: Complete

---

## Table of Contents

1. [Natural Language Query (NLQ)](#natural-language-query-nlq)
2. [Analytics Engine](#analytics-engine)
3. [Forecasting](#forecasting)
4. [Scenario Planner](#scenario-planner)

---

## Natural Language Query (NLQ)

**Description**: Natural language query interface for insights

### Service Files

**`services/insights-nlq/`** (89 files: 80 *.ts, 5 *.hbs, 4 *.md)

**Core Modules**:
- `src/index.ts` - Service entry point (⚠️ Has merge conflicts)
- `src/routes/` - NLQ API routes
- `src/lib/` - Query processing modules
  - Query parsing
  - SQL generation
  - Result aggregation

**Caching**:
- `src/cache/` - Query caching layer
- `README.md` - Cache documentation

**Events**:
- `src/events/` - Event handlers
- `README.md` - Events documentation

**Templates**:
- `src/**/*.hbs` - Handlebars templates (5 files)
  - Query result templates
  - Chart generation templates

**Scripts**:
- `scripts/` - NLQ utility scripts (1 *.ts)

**Configuration**:
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- Multiple implementation summaries (*.md)

### UI Components

**`apps/corp-cockpit-astro/src/components/nlq/`** (25 files: 18 *.tsx, 4 *.md, 3 *.ts)

**Components**:
- NLQ query input component
- Query result display
- Chart generation components
- Accessibility components

**Charts**:
- `apps/corp-cockpit-astro/src/components/nlq/charts/` - Chart components
- `README.md` - Chart documentation

**Accessibility**:
- `apps/corp-cockpit-astro/docs/NLQ_A11Y_IMPLEMENTATION_SUMMARY.md`
- `apps/corp-cockpit-astro/docs/NLQ_ACCESSIBILITY.md`

### Documentation

- `services/insights-nlq/README.md` - NLQ service README
- `services/insights-nlq/CACHE_IMPLEMENTATION_SUMMARY.md` - Cache implementation
- `services/insights-nlq/DATABASE_INTEGRATION.md` - Database integration
- `services/insights-nlq/NLQ_API_ROUTES_IMPLEMENTATION.md` - API routes
- `services/insights-nlq/QUERY_GENERATOR_IMPLEMENTATION.md` - Query generator
- `services/insights-nlq/RATE_LIMITER_IMPLEMENTATION.md` - Rate limiter
- `services/insights-nlq/SERVICE_BOOTSTRAP_SUMMARY.md` - Service bootstrap
- `docs/insights/` - Insights documentation (14 *.md files)

### Tests

**`tests/`**
- `e2e/11-nlq-canonical-questions.spec.ts` - Canonical questions E2E test
- `e2e/12-nlq-accessibility.spec.ts` - Accessibility E2E test
- `security/nlq-*.test.ts` - Security tests (7 files)
  - `nlq-dos.test.ts` - DoS protection
  - `nlq-exfiltration.test.ts` - Data exfiltration protection
  - `nlq-injection.test.ts` - SQL injection protection
  - `nlq-pii-protection.test.ts` - PII protection
  - `nlq-prompt-injection.test.ts` - Prompt injection protection
  - `nlq-tenant-isolation.test.ts` - Tenant isolation

**`tests/k6/`**
- `nlq-performance.js` - Performance tests
- `nlq-soak.js` - Soak tests
- `nlq-stress.js` - Stress tests
- `nlq-helpers.js` - Test helpers
- `NLQ_LOAD_TESTING_RUNBOOK.md` - Load testing runbook
- `NLQ_PERFORMANCE_TEST_REPORT_TEMPLATE.md` - Performance test template

**`tests/fixtures/nlq/`**
- `canonical-answers.json` - Canonical answers fixture
- `nlq-test-data.json` - Test data

### Related Features
- Analytics Engine
- Q2Q AI Engine
- Dashboard

---

## Analytics Engine

**Description**: ClickHouse-based analytics and time-series processing

### Service Files

**`services/analytics/`** (85 files: 82 *.ts, 3 *.sql)

**Core Modules**:
- `src/index.ts` - Service entry point
- `src/routes/` - Analytics API routes
- `src/lib/` - Analytics calculation modules
  - Time-series processing
  - Metric aggregation
  - Data windowing

**Database**:
- `src/**/*.sql` - SQL queries (3 files)
- ClickHouse integration

**Configuration**:
- `config/` - Configuration files (1 *.json)
- `Dockerfile` - Container definition
- `vitest.config.ts` - Test configuration

### UI Components

**`apps/corp-cockpit-astro/src/components/analytics/`** (7 *.tsx files)
- Analytics dashboard components
- Metric visualization
- Time-series charts

### Documentation

- `services/analytics/README.md` - Analytics service README
- `docs/Analytics_APIs.md` - Analytics API documentation
- `docs/Analytics_DW.md` - Data warehouse documentation
- `docs/AnalyticsDW_Runbook.md` - Data warehouse runbook
- `docs/STREAMING_ANALYTICS_QUICK_REF.md` - Streaming analytics quick reference
- `docs/STREAMING_AND_ANALYTICS_SETUP.md` - Streaming analytics setup
- `docs/Streaming_Updates.md` - Streaming updates documentation

### Observability

**`observability/grafana/dashboards/`**
- `analytics-metrics.json` - Analytics metrics dashboard

### Related Features
- NLQ
- Forecasting
- Dashboard

---

## Forecasting

**Description**: Time-series forecasting for impact metrics

### Service Files

**`services/forecast/`** (18 *.ts files)

**Core Modules**:
- `src/index.ts` - Service entry point
- `src/routes/` - Forecast API routes
- `src/lib/` - Forecasting algorithms
  - Trend analysis
  - Predictive modeling
  - Time-series forecasting

**Configuration**:
- `package.json`, `tsconfig.json`, `vitest.config.ts`
- `README.md` - Documentation

### UI Components

**`apps/corp-cockpit-astro/src/components/forecast/`** (5 *.tsx files)
- Forecast visualization components
- Trend charts
- Predictive displays

**i18n**:
- `apps/corp-cockpit-astro/src/i18n/en/forecast.json`
- `apps/corp-cockpit-astro/src/i18n/uk/forecast.json`
- `apps/corp-cockpit-astro/src/i18n/no/forecast.json`

### Documentation

- `services/forecast/README.md` - Forecast service README
- `docs/analytics/scenario_planner.md` - Scenario planner documentation

### Related Features
- Analytics Engine
- Scenario Planner
- Dashboard

---

## Scenario Planner

**Description**: Scenario planning and what-if analysis

### UI Components

**`apps/corp-cockpit-astro/src/components/scenario-planner/`** (7 files: 6 *.tsx, 1 *.ts)
- Scenario planning interface
- What-if analysis components
- Impact projection displays

### Documentation

- `docs/analytics/scenario_planner.md` - Scenario planner documentation

### Related Features
- Forecasting
- Analytics Engine
- Dashboard

---

## File Statistics

| Feature | Service Files | UI Files | Documentation | Tests | Total |
|---------|--------------|----------|---------------|-------|-------|
| Natural Language Query (NLQ) | 89 | 25 | 14 | 10+ | ~138 |
| Analytics Engine | 85 | 7 | 6 | - | ~98 |
| Forecasting | 18 | 5 | 2 | - | ~25 |
| Scenario Planner | 0 | 7 | 1 | - | ~8 |
| **Total** | **192** | **44** | **23** | **10+** | **~269** |

---

## Dependencies

### AI & Analytics Dependency Graph

```
NLQ
  ├── Analytics Engine (data source)
  ├── Query Cache (Redis)
  └── SQL Query Builder

Analytics Engine
  ├── ClickHouse (time-series data)
  └── PostgreSQL (metadata)

Forecasting
  ├── Analytics Engine (historical data)
  └── Time-series libraries

Scenario Planner
  ├── Forecasting (projections)
  └── Analytics Engine (baseline data)
```

---

## Integration Points

### NLQ Integration
- **Input**: Natural language queries from dashboard
- **Processing**: Query parsing → SQL generation → Execution
- **Output**: Chart-ready data, visualizations
- **Caching**: Redis for query result caching
- **Security**: Tenant isolation, SQL injection protection, PII protection

### Analytics Integration
- **Data Sources**: ClickHouse (time-series), PostgreSQL (metadata)
- **Processing**: Aggregation, windowing, calculations
- **Output**: Dashboard metrics, API responses
- **Real-time**: SSE for live updates

### Forecasting Integration
- **Input**: Historical metrics from Analytics Engine
- **Processing**: Time-series forecasting algorithms
- **Output**: Predictive metrics, trends
- **UI**: Forecast visualization components

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



