# TEEI CSR Cockpit Infrastructure

**Last Updated**: 2025-01-27

---

## Overview

The CSR Cockpit is the main corporate dashboard for CSR reporting, metrics visualization, and program management. Built with Astro 4 + React 18.

**Location**: `apps/corp-cockpit-astro/`  
**Port**: `4327` (dev)  
**Status**: ✅ Working

---

## Core Components

### SROI Calculator

| Component | File | Status | Connected To |
|-----------|------|--------|--------------|
| **SROI Calculator** | `services/analytics/src/lib/calculations.ts` | ✅ | Real database |
| **SROI API** | `services/analytics/src/routes/metrics.ts` | ✅ | PostgreSQL |
| **SROI Display** | `apps/corp-cockpit-astro/src/components/...` | ✅ | Analytics API |

**Formula**: `SROI = Total Value / Total Investment`

**Data Sources**:
- Volunteer hours from `kintell_sessions`, `buddy_matches`
- Investment from `campaigns.budget_spent_cents`
- Valuation: $220/hour (configurable)

**Status**: ✅ Connected to real data

---

### VIS Calculator

| Component | File | Status | Connected To |
|-----------|------|--------|--------------|
| **VIS Calculator** | `services/impact-calculator/` | ✅ | Real database |
| **VIS API** | `services/analytics/src/routes/metrics.ts` | ✅ | PostgreSQL |
| **VIS Display** | Dashboard components | ✅ | Analytics API |

**Formula**: Decay-based scoring with activity contributions

**Data Sources**:
- User activities from `kintell_sessions`, `buddy_events`, `learning_progress`
- Decay factor applied over time
- Batch recalculation: Daily at 2 AM (cron)

**Status**: ✅ Connected to real data

---

### Metric Cards

| Component | File | Status | Connected To |
|-----------|------|--------|--------------|
| **MetricCard** | `src/components/dashboard/MetricCard.tsx` | ✅ | Analytics API |
| **Dashboard Metrics** | Dashboard page | ✅ | Real data |
| **Real-Time Updates** | SSE connection | ✅ | Working |

**Metrics Displayed**:
- Total Volunteer Hours
- SROI Ratio
- VIS Score
- Participants Count
- Sessions Count
- Campaign Count

**Status**: ✅ Connected to real data

---

### Program Dashboard

| Component | File | Status | Connected To |
|-----------|------|--------|--------------|
| **Program List** | Campaigns page | ✅ | Real database |
| **Program Details** | Programme pages | ✅ | Real database |
| **Program Metrics** | Campaign dashboard API | ✅ | Real data |

**Data Sources**:
- `program_instances` table
- `campaigns` table
- `program_templates` table

**Status**: ✅ Connected to real data

---

## Data Sources

### Connected Metrics

| Metric | Source Table | Query | Status |
|--------|--------------|-------|--------|
| **Volunteer Hours** | `kintell_sessions`, `buddy_events` | SUM calculations | ✅ Connected |
| **SROI Value** | Calculated | Hours × $220 | ✅ Connected |
| **VIS Score** | `vis_calculations` | Latest score | ✅ Connected |
| **Participants** | `program_enrollments` | COUNT DISTINCT | ✅ Connected |
| **Sessions** | `kintell_sessions` | COUNT | ✅ Connected |
| **Campaigns** | `campaigns` | COUNT by status | ✅ Connected |

### Mock Data (If Any)

**Status**: ⚠️ Some demo endpoints may use mock data
- `/api/demo/metrics` - Demo metrics endpoint
- `/api/demo/status` - Demo status endpoint

**Production**: Real data from database

---

## Corporate Partner Features

| Feature | Built? | Working? | Location |
|---------|--------|----------|----------|
| **Company Profiles** | ✅ | ✅ | `companies` table |
| **Volunteer Mapping** | ✅ | ✅ | `company_users`, `program_enrollments` |
| **Report Generation** | ✅ | ✅ | Reporting Service |
| **Data Export** | ✅ | ✅ | Export endpoints |
| **Campaign Management** | ✅ | ✅ | Campaigns Service |
| **Multi-Tenant Isolation** | ✅ | ✅ | Tenant routing |
| **SSO Configuration** | ✅ | ✅ | Admin SSO page |
| **RBAC** | ✅ | ✅ | Role management |
| **White-Label Branding** | ✅ | ✅ | Branding tables |

---

## Report Generation

### AI-Generated Reports

| Feature | Status | Location |
|---------|--------|----------|
| **Report Templates** | ✅ | 4 templates (Quarterly, Annual, Investor, Impact) |
| **Citation Validation** | ✅ | Minimum 1 citation per paragraph |
| **PII Redaction** | ✅ | Pre-LLM redaction |
| **Multi-Locale** | ✅ | EN, ES, FR, UK, NO |
| **Cost Tracking** | ✅ | LLM usage tracking |
| **Lineage Tracking** | ✅ | Evidence lineage |

**Templates**:
- `quarterly-report.en.hbs`
- `annual-report.en.hbs`
- `investor-update.en.hbs`
- `impact-deep-dive.en.hbs`

**Status**: ✅ Fully operational

---

## Regulatory Packs

| Feature | Status | Location |
|---------|--------|----------|
| **CSRD Pack Generation** | ✅ | Reporting Service |
| **GRI Mapping** | ✅ | Framework mapping |
| **SDG Mapping** | ✅ | SDG alignment |
| **Gap Analysis** | ✅ | Completeness scoring |
| **Export (PDF/PPTX)** | ✅ | Export endpoints |

**Status**: ✅ Working

---

## Campaign Management

| Feature | Status | Location |
|---------|--------|----------|
| **Campaign Creation** | ✅ | Campaigns Service |
| **Lifecycle Management** | ✅ | Auto-transition cron |
| **Capacity Tracking** | ✅ | Seat/credit usage |
| **Metrics Snapshots** | ✅ | Time-series metrics |
| **Dashboard** | ✅ | Campaign dashboard API |

**Status**: ✅ Fully operational

---

## Real-Time Features

### Server-Sent Events (SSE)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/sse/dashboard` | Dashboard updates | ✅ Working |
| `/api/sse/stream` | General updates | ✅ Working |

**Features**:
- Real-time metric updates
- Campaign status changes
- Report generation status
- Notification delivery

---

## Performance

### Caching

- **ETag Support**: ✅ Implemented
- **Redis Caching**: ✅ Configured
- **Response Caching**: ✅ Working
- **Cache TTL**: 1-6 hours (configurable)

### Query Performance

- **Analytics Queries**: p95 120-190ms
- **Materialized Views**: ClickHouse for fast queries
- **Database Indexes**: Optimized for common queries

---

## Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| **Analytics Service** | ✅ | Fully connected |
| **Reporting Service** | ✅ | Fully connected |
| **Campaigns Service** | ✅ | Fully connected |
| **Database** | ✅ | PostgreSQL connected |
| **ClickHouse** | ✅ | Analytics warehouse |
| **NATS** | ✅ | Event bus |
| **Redis** | ✅ | Caching |

---

## Known Issues

### ⚠️ Minor Issues

1. **Demo Endpoints**: Some demo endpoints use mock data (intentional)
2. **Performance**: Some complex queries may be slow (optimization ongoing)
3. **Real-Time**: SSE connections may drop (reconnection logic in place)

### ✅ Resolved

1. **Data Connection**: All metrics now connected to real data
2. **Multi-Tenant**: Tenant isolation working correctly
3. **Auth**: RBAC properly enforced

---

## Next Steps

1. ✅ **Complete**: Data connection verified
2. 🔄 **In Progress**: Query performance optimization
3. 📋 **Todo**: Add more metric visualizations
4. 📋 **Todo**: Enhance real-time updates
5. 📋 **Todo**: Add more export formats

---

**Next**: See [09-AUTOMATION.md](./09-AUTOMATION.md) for cron jobs and automation.
