# Dashboard Data Binding Map

**Generated**: 2025-01-27  
**Investigator**: Cursor Worker 2  
**Purpose**: Map exact data flow for Corporate Cockpit executive dashboard widgets  
**Status**: Investigation Complete - No Code Changes Made

---

## Executive Summary

The main Corporate Cockpit executive dashboard (`/{lang}/cockpit/{companyId}`) currently displays **hardcoded static data** for all widgets on first load. No widgets are currently wired to live API endpoints or CSV-backed data sources.

**Key Finding**: The dashboard page (`apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro`) passes hardcoded data arrays as props to all widget components. While widget components exist that can fetch from APIs (e.g., `SROIPanel`, `VISPanel`), they are **not used** on the main dashboard page.

---

## Dashboard Entry Route

**File**: `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro`  
**Route Pattern**: `/{lang}/cockpit/{companyId}`  
**Layout**: `CockpitExperienceLayout.astro`  
**Authentication**: JWT via `auth.ts` middleware → Tenant routing via `tenantRouting.ts` middleware

**Post-Login Flow**:
1. User authenticates at `/login`
2. Tenant selector (`TenantSelector.tsx`) displays available tenants
3. User selects tenant → redirects to `/{lang}/cockpit/{companyId}`
4. Middleware validates tenant context
5. Dashboard page loads with hardcoded data

---

## Widget Inventory (First Load)

### 1. KPI Grid (4 Cards)

**Location**: Lines 29-78 in `index.astro`  
**Widget Type**: Inline HTML/CSS (not a React component)  
**Data Source**: **HARDCODED** in Astro page frontmatter

**KPIs Rendered**:
- **SROI**: `value: '4.3x'`, `trend: '+0.2x'`, `sparkline: [62, 64, 66, 70, 68, 71, 73]`
- **VIS Score**: `value: '82'`, `trend: '+4 pts'`, `sparkline: [58, 60, 59, 63, 65, 66, 68]`
- **AI Coverage**: `value: '74%'`, `trend: '-3 pts'`, `sparkline: [72, 75, 73, 74, 71, 72, 74]`
- **Compliance**: `value: '92%'`, `trend: '+1 pt'`, `sparkline: [88, 89, 90, 91, 90, 92, 92]`

**Data Flow**:
```
Widget → Hardcoded array (kpiStats) → Direct rendering in Astro template
```

**API Hooks**: ❌ None  
**SSE Subscription**: ❌ None  
**CSV-Backed**: ❌ No

**Alternative Components Available** (not used):
- `SROIPanel.tsx` - Fetches from `http://localhost:3001/companies/{companyId}/sroi` (Reporting Service)
- `VISPanel.tsx` - Fetches from `http://localhost:3001/companies/{companyId}/vis` (Reporting Service)
- `AtAGlance.tsx` - Fetches from `http://localhost:3001/companies/{companyId}/at-a-glance` (Reporting Service)

---

### 2. Actionable Items

**Component**: `ActionableItems.tsx`  
**Location**: `apps/corp-cockpit-astro/src/components/dashboard/ActionableItems.tsx`  
**Usage**: `<ActionableItems client:load items={actionableItems} />` (line 363)

**Data Source**: **HARDCODED** prop passed from Astro page (lines 80-105)

**Data Flow**:
```
Astro page (actionableItems array) → ActionableItems component prop → Renders list
```

**Default Data** (if prop not provided):
- Component has `defaultItems` array (lines 21-52) with 3 sample campaigns
- Currently overridden by prop from page

**API Hooks**: ❌ None  
**SSE Subscription**: ❌ None  
**CSV-Backed**: ❌ No

**Backend Service Available** (not used):
- Campaigns Service (port 3002): `GET /campaigns?companyId={id}` → Returns campaigns from PostgreSQL `campaigns` table

---

### 3. Campaign Pipeline

**Component**: `CampaignPipelineWithLanes`  
**Location**: `apps/corp-cockpit-astro/src/components/dashboard/CampaignPipeline.tsx`  
**Usage**: `<CampaignPipelineWithLanes client:load lanes={pipelineLanes} />` (line 364)

**Data Source**: **HARDCODED** prop passed from Astro page (lines 107-168)

**Data Flow**:
```
Astro page (pipelineLanes array) → CampaignPipelineWithLanes component prop → Renders Kanban board
```

**Default Data** (if prop not provided):
- Component has `lanes` array (lines 20-90) with sample pipeline data
- Currently overridden by prop from page

**API Hooks**: ❌ None  
**SSE Subscription**: ❌ None  
**CSV-Backed**: ❌ No

**Backend Service Available** (not used):
- Campaigns Service (port 3002): `GET /campaigns?companyId={id}&status={draft|active|paused|completed}` → Returns campaigns from PostgreSQL `campaigns` table

---

### 4. AI Insights

**Component**: `AIInsights.tsx`  
**Location**: `apps/corp-cockpit-astro/src/components/dashboard/AIInsights.tsx`  
**Usage**: `<AIInsights client:load insights={aiNarratives} chartData={aiChartData} clusters={insightClusters} />` (line 367)

**Data Source**: **HARDCODED** props passed from Astro page:
- `insights={aiNarratives}` (lines 171-190)
- `chartData={aiChartData}` (lines 192-198)
- `clusters={insightClusters}` (line 170)

**Data Flow**:
```
Astro page (3 hardcoded arrays) → AIInsights component props → Renders narrative clusters + chart
```

**Default Data** (if props not provided):
- Component has `defaultClusters` object (lines 26-51) and `defaultChartSeries` (lines 55-61)
- Currently overridden by props from page

**API Hooks**: ❌ None  
**SSE Subscription**: ❌ None  
**CSV-Backed**: ❌ No

**Backend Service Available** (not used):
- Q2Q AI Service: Narrative clusters endpoint (needs verification)
- Insights NLQ Service (port 3009/3015): Natural language query API

---

### 5. Compliance Alerts

**Component**: `ComplianceAlerts.tsx`  
**Location**: `apps/corp-cockpit-astro/src/components/dashboard/ComplianceAlerts.tsx`  
**Usage**: `<ComplianceAlerts alerts={complianceAlerts} filters={complianceFilters} />` (line 368)

**Data Source**: **HARDCODED** props passed from Astro page:
- `alerts={complianceAlerts}` (lines 200-225)
- `filters={complianceFilters}` (line 227)

**Data Flow**:
```
Astro page (2 hardcoded arrays) → ComplianceAlerts component props → Renders alert table
```

**Default Data** (if props not provided):
- Component has `defaultAlerts` array (lines 22-50) and `defaultFilters` (line 52)
- Currently overridden by props from page

**API Hooks**: ❌ None  
**SSE Subscription**: ❌ None  
**CSV-Backed**: ❌ No

**Backend Service Available** (not used):
- Compliance Service: Policy alerts endpoint (needs verification)
- GDPR Service: Compliance alerts (⚠️ Service is stub - 0% complete per documentation)

---

## Data Source Analysis

### Services That Could Feed Dashboard (Currently Unused)

#### 1. Reporting Service (Port 3001)

**Endpoints Available**:
- `GET /companies/{companyId}/sroi` - SROI calculation
- `GET /companies/{companyId}/vis` - VIS score calculation
- `GET /companies/{companyId}/at-a-glance` - Summary metrics
- `GET /companies/{companyId}/q2q-feed` - Q2Q activity feed
- `GET /companies/{companyId}/evidence` - Evidence snippets

**Data Source**: PostgreSQL (calculated from `metrics_company_period`, `outcome_scores`, `evidence_snippets` tables)

**CSV-Backed**: ❌ No - Reads from PostgreSQL database

**Widget Components That Use This** (not on main dashboard):
- `SROIPanel.tsx` - Fetches SROI from Reporting Service
- `VISPanel.tsx` - Fetches VIS from Reporting Service
- `AtAGlance.tsx` - Fetches summary from Reporting Service
- `Q2QFeed.tsx` - Fetches Q2Q feed from Reporting Service

---

#### 2. Analytics Service (Port 3007)

**Endpoints Available**:
- `GET /metrics/company/{companyId}/period/{period}` - Time-series metrics
- `GET /metrics/sroi/{companyId}` - SROI report
- `GET /metrics/vis/{companyId}` - VIS report

**Data Source**: PostgreSQL (`metrics_company_period` table)

**CSV-Backed**: ❌ No - Reads from PostgreSQL database

**SSE Available**:
- `GET /stream/updates?companyId={id}&channel=dashboard-updates` - Real-time metric updates
- Event types: `metric_updated`, `sroi_updated`, `vis_updated`

**Widget Components That Use This** (not on main dashboard):
- None currently - Analytics Service endpoints exist but no widgets use them directly

---

#### 3. Campaigns Service (Port 3002)

**Endpoints Available**:
- `GET /campaigns?companyId={id}` - List campaigns with filters
- `GET /campaigns/{id}` - Campaign details
- `GET /campaigns/{id}/metrics` - Campaign metrics

**Data Source**: PostgreSQL (`campaigns` table)

**CSV-Backed**: ❌ No - Reads from PostgreSQL database

**Widget Components That Use This** (not on main dashboard):
- `CampaignList.tsx` - Fetches campaigns via `/api/campaigns` proxy (which calls Campaigns Service)

---

#### 4. Q2Q AI Service

**Purpose**: Narrative clusters, semantic analysis

**Data Source**: PostgreSQL (calculated from evidence snippets, outcome scores)

**CSV-Backed**: ❌ No - Reads from PostgreSQL database

**Widget Components That Use This** (not on main dashboard):
- None identified - AI Insights widget uses hardcoded data

---

#### 5. Compliance Service

**Purpose**: Policy alerts, compliance monitoring

**Data Source**: Unknown (service may be stub)

**CSV-Backed**: ❌ No

**Widget Components That Use This** (not on main dashboard):
- None identified - Compliance Alerts widget uses hardcoded data

---

### CSV Data Sources (Ingestion Only)

**Important**: CSV files are used for **data ingestion** into the system, not for dashboard display.

**CSV Importers Found**:
1. **Kintell Connector** (`services/kintell-connector/src/routes/import.ts`)
   - `POST /import/kintell-sessions` - Bulk CSV import of learning sessions
   - Data flows: CSV → PostgreSQL `kintell_sessions` table → Metrics calculations

2. **Buddy Service** (`services/buddy-service/src/routes/import.ts`)
   - `POST /import/matches` - Import buddy matches CSV
   - `POST /import/events` - Import buddy events CSV
   - `POST /import/checkins` - Import check-ins CSV
   - `POST /import/feedback` - Import feedback CSV
   - Data flows: CSV → PostgreSQL `buddy_matches`, `buddy_events`, `buddy_feedback` tables → Metrics calculations

3. **Upskilling Connector** (`services/upskilling-connector/src/routes/import.ts`)
   - CSV import for training platform data
   - Data flows: CSV → PostgreSQL → Metrics calculations

4. **Impact-In Service** (`services/impact-in/src/importers/parser.ts`)
   - CSV parser for external platform data (Benevity, Goodera, Workday)
   - Data flows: CSV → PostgreSQL → Metrics calculations

**Conclusion**: CSV data is **ingested into PostgreSQL** and then used by services to calculate metrics. Dashboard widgets would read from PostgreSQL via service APIs, not directly from CSV files.

---

## Feature Flags and Demo Switches

### Environment Variables

**Found**:
- `VITE_FEATURE_ANALYTICS_TRENDS` - Enables/disables trends analytics feature
- `VITE_FEATURE_ANALYTICS_ENGAGEMENT` - Enables/disables engagement analytics feature
- `PUBLIC_FEATURE_USAGE_ANALYTICS_V1` - Enables/disables usage analytics

**Location**: `apps/corp-cockpit-astro/src/hooks/useAnalytics.ts`

**Purpose**: Feature gating, not demo data switching

---

### Mock Data Functions

**Found Multiple Mock Data Functions** (for development/testing):
- `getMockPlatformStatus()` - `StatusDisplay.tsx`
- `getMockDSARRequests()` - `DSARQueue.tsx`, `DSARStatus.tsx`
- `getMockExportLogs()` - `ExportAuditLog.tsx`
- `getMockComplianceMetrics()` - `ComplianceSummary.tsx`
- `getMockRoleMappings()` - `RoleMappingTable.tsx`
- `getMockSLOData()` - `SLOMetrics.tsx`
- `getMockStatusData()` - `StatusBanner.tsx`
- `generateMockReport()` - `api/reporting.ts` (dev mode fallback)

**Purpose**: Development/testing fallbacks, not production demo switches

**CSV-Backed**: ❌ No - All are hardcoded JavaScript objects

---

### Demo Mode Indicators

**Found**:
- `demo-company` used as default companyId in several places
- `TenantContext.tsx` has mock tenant data fallback (line 78)
- `TenantSelector.tsx` has mock companies array (line 41)

**Purpose**: Development defaults, not feature flags

**CSV-Backed**: ❌ No

---

## Widget → Hook → API/SSE → Service → Data Source Mapping

### Current State (Hardcoded)

| Widget | Hook | API/SSE | Service | Data Source | CSV-Backed |
|--------|------|---------|---------|-------------|------------|
| **KPI Grid (SROI)** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **KPI Grid (VIS)** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **KPI Grid (AI Coverage)** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **KPI Grid (Compliance)** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **Actionable Items** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **Campaign Pipeline** | ❌ None | ❌ None | ❌ None | Hardcoded array | ❌ No |
| **AI Insights** | ❌ None | ❌ None | ❌ None | Hardcoded arrays | ❌ No |
| **Compliance Alerts** | ❌ None | ❌ None | ❌ None | Hardcoded arrays | ❌ No |

---

### Potential State (If Wired to APIs)

| Widget | Hook | API/SSE | Service | Data Source | CSV-Backed |
|--------|------|---------|---------|-------------|------------|
| **KPI Grid (SROI)** | `useEffect` in `SROIPanel.tsx` | `GET /companies/{id}/sroi` | Reporting Service (3001) | PostgreSQL `metrics_company_period` | ❌ No (but data may originate from CSV ingestion) |
| **KPI Grid (VIS)** | `useEffect` in `VISPanel.tsx` | `GET /companies/{id}/vis` | Reporting Service (3001) | PostgreSQL `metrics_company_period` | ❌ No (but data may originate from CSV ingestion) |
| **KPI Grid (AI Coverage)** | ❌ Not implemented | ❌ Not available | ❌ Not available | ❌ Not available | ❌ No |
| **KPI Grid (Compliance)** | ❌ Not implemented | ❌ Not available | ❌ Not available | ❌ Not available | ❌ No |
| **Actionable Items** | `useEffect` in `CampaignList.tsx` | `GET /api/campaigns?companyId={id}` | Campaigns Service (3002) | PostgreSQL `campaigns` | ❌ No |
| **Campaign Pipeline** | `useEffect` in `CampaignList.tsx` | `GET /api/campaigns?companyId={id}&status={...}` | Campaigns Service (3002) | PostgreSQL `campaigns` | ❌ No |
| **AI Insights** | ❌ Not implemented | ❌ Not available | Q2Q AI Service (needs verification) | PostgreSQL (evidence/outcomes) | ❌ No |
| **Compliance Alerts** | ❌ Not implemented | ❌ Not available | Compliance/GDPR Service (stub) | ❌ Not available | ❌ No |

**Note**: CSV data flows into PostgreSQL via ingestion services, then services calculate metrics from PostgreSQL. Dashboard would read calculated metrics, not raw CSV.

---

## SSE (Server-Sent Events) Subscriptions

### Available SSE Endpoints

**Analytics Service** (port 3007):
- `GET /stream/updates?companyId={id}&channel=dashboard-updates`
- Event types: `metric_updated`, `sroi_updated`, `vis_updated`, `journey_flag_updated`
- Payload: `{ companyId, metricName, value, timestamp }`

**Reporting Service**:
- `GET /sse/stream?companyId={id}&channel=report-updates`
- Event types: `report_generated`, `report_failed`, `report_progress`

**SSE Client**: `apps/corp-cockpit-astro/src/utils/sseClient.ts`

### Current Usage

**Dashboard Page**: ❌ No SSE subscriptions  
**Widget Components**: 
- `SROIPanelOptimized.tsx` - Has `useDashboardUpdate` hook (line 92) but component is not used on main dashboard
- `DashboardWithSSE.tsx` - Exists but not used on main dashboard page

---

## Widgets That Would Need No Changes to Display CSV-Driven Numbers

**Answer**: All widgets are currently hardcoded, so **none** would need changes if backend services were modified to read from CSV-derived data.

**Reasoning**:
1. All widgets accept data via props (or have default hardcoded data)
2. If backend services were modified to read from CSV-derived PostgreSQL data, widgets would automatically display that data once props are wired to API calls
3. No widget currently has CSV-specific logic that would need modification

**Example Flow** (if implemented):
```
CSV File → Ingestion Service → PostgreSQL → Analytics Service → API Endpoint → Widget Component
```

Widgets are already data-agnostic - they just render whatever data is passed to them.

---

## Inconsistencies: "Real" Widgets Fed by Placeholder Data

### Finding 1: KPI Grid Appears Real but is Hardcoded

**Location**: `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro` lines 29-78

**Issue**: KPI cards display values like "4.3x", "82", "74%", "92%" with sparklines and trends, making them appear live, but all data is hardcoded in the Astro page frontmatter.

**Evidence**: No API calls, no hooks, no data fetching logic in the page file.

---

### Finding 2: Actionable Items Use Real Scoring Logic but Fake Data

**Location**: `ActionableItems.tsx` lines 67-177

**Issue**: Component uses real scoring functions (`getPriority()`, `classifyScore()`) from `@/data/scoringWeights`, but the data itself (campaign titles, deadlines, scores) is hardcoded.

**Evidence**: Component receives `items` prop from hardcoded array in Astro page (lines 80-105).

---

### Finding 3: Campaign Pipeline Has Real Component Structure but Fake Data

**Location**: `CampaignPipeline.tsx` lines 218-273

**Issue**: Component has proper Kanban structure with lanes, cards, progress bars, and collaborator avatars, but all campaign data is hardcoded.

**Evidence**: Component receives `lanes` prop from hardcoded array in Astro page (lines 107-168).

---

### Finding 4: AI Insights Uses Real Chart Component but Fake Data

**Location**: `AIInsights.tsx` lines 102-469

**Issue**: Component uses real `AreaChart` component with proper styling and cluster selector, but narrative insights and chart data are hardcoded.

**Evidence**: Component receives `insights`, `chartData`, and `clusters` props from hardcoded arrays in Astro page (lines 170-198).

---

### Finding 5: Compliance Alerts Has Real Table Structure but Fake Data

**Location**: `ComplianceAlerts.tsx` lines 60-456

**Issue**: Component has proper table with filters, severity badges, and empty states, but all alert data is hardcoded.

**Evidence**: Component receives `alerts` and `filters` props from hardcoded arrays in Astro page (lines 200-227).

---

## Summary: CSV-Backed Data Status

### Direct CSV Reading: ❌ None

No dashboard widgets currently read directly from CSV files.

### Indirect CSV-Derived Data: ⚠️ Possible (via Ingestion)

**Flow**:
1. CSV files are imported via ingestion services (Kintell, Buddy, Upskilling, Impact-In)
2. Data is stored in PostgreSQL tables
3. Services (Analytics, Reporting, Campaigns) calculate metrics from PostgreSQL
4. Dashboard widgets would read from service APIs (currently not wired)

**Conclusion**: If CSV data has been ingested into PostgreSQL, it could theoretically feed dashboard widgets once API wiring is implemented. However, **no widgets are currently wired to these APIs**, so CSV-derived data is not visible on the dashboard.

---

## Recommendations for CSV Integration

### If CSV Data Should Feed Dashboard:

1. **Wire KPI Grid to APIs**:
   - Replace hardcoded `kpiStats` array with API calls to Reporting Service
   - Use `SROIPanel`, `VISPanel`, or similar components
   - Add SSE subscription for real-time updates

2. **Wire Actionable Items to Campaigns API**:
   - Replace hardcoded `actionableItems` array with `GET /api/campaigns?companyId={id}`
   - Filter campaigns by deadline/priority on backend or frontend

3. **Wire Campaign Pipeline to Campaigns API**:
   - Replace hardcoded `pipelineLanes` array with `GET /api/campaigns?companyId={id}&status={...}`
   - Group campaigns by status on frontend

4. **Wire AI Insights to Q2Q AI Service**:
   - Replace hardcoded arrays with narrative clusters API (needs verification)
   - Add chart data endpoint if not available

5. **Wire Compliance Alerts to Compliance Service**:
   - Replace hardcoded arrays with compliance alerts API
   - ⚠️ Note: GDPR Service is stub (0% complete) - may need implementation

### CSV Data Flow (If Implemented):

```
CSV Files
  ↓ (Ingestion)
PostgreSQL Tables
  ↓ (Service Calculations)
Analytics/Reporting Services
  ↓ (API Endpoints)
Dashboard Widgets
```

**Current State**: Only the first two steps are implemented. Dashboard widgets are not wired to services.

---

## Files Referenced

### Dashboard Page
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro` - Main dashboard page

### Widget Components
- `apps/corp-cockpit-astro/src/components/dashboard/ActionableItems.tsx`
- `apps/corp-cockpit-astro/src/components/dashboard/CampaignPipeline.tsx`
- `apps/corp-cockpit-astro/src/components/dashboard/AIInsights.tsx`
- `apps/corp-cockpit-astro/src/components/dashboard/ComplianceAlerts.tsx`

### Alternative Widget Components (Not Used on Main Dashboard)
- `apps/corp-cockpit-astro/src/components/widgets/SROIPanel.tsx`
- `apps/corp-cockpit-astro/src/components/widgets/VISPanel.tsx`
- `apps/corp-cockpit-astro/src/components/widgets/AtAGlance.tsx`
- `apps/corp-cockpit-astro/src/components/widgets/SROIPanelOptimized.tsx`

### Services
- `services/reporting/src/routes/companies.ts` - SROI/VIS endpoints (port 3001)
- `services/analytics/src/routes/metrics.ts` - Metrics endpoints (port 3007)
- `services/campaigns/src/routes/campaigns.ts` - Campaign endpoints (port 3002)

### SSE
- `apps/corp-cockpit-astro/src/utils/sseClient.ts` - SSE client implementation
- `services/analytics/src/routes/stream.ts` - SSE endpoint (needs verification)

### CSV Importers (Ingestion Only)
- `services/kintell-connector/src/routes/import.ts`
- `services/buddy-service/src/routes/import.ts`
- `services/upskilling-connector/src/routes/import.ts`
- `services/impact-in/src/importers/parser.ts`

---

## Conclusion

**Current State**: The Corporate Cockpit executive dashboard displays **100% hardcoded data** on first load. No widgets are wired to live APIs, SSE subscriptions, or CSV-backed data sources.

**CSV Status**: CSV files are used for **data ingestion** into PostgreSQL, but dashboard widgets do not read from CSV files directly or indirectly (since widgets are not wired to services that read from PostgreSQL).

**Next Steps** (if CSV data should feed dashboard):
1. Wire widget props to API endpoints
2. Ensure CSV data has been ingested into PostgreSQL
3. Verify services can read CSV-derived data from PostgreSQL
4. Add SSE subscriptions for real-time updates

**Widgets Ready for CSV-Derived Data**: All widgets are data-agnostic and would work with CSV-derived data once API wiring is implemented. No widget code changes needed - only prop wiring changes.

---

**Document Status**: Complete  
**Investigation Date**: 2025-01-27  
**No Code Changes Made**: Investigation only, as requested
