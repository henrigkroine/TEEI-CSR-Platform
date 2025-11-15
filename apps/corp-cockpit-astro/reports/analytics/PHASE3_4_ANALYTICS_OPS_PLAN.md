# Phase 3.4 - Analytics Observability & Live Ops UX

**Session ID**: 01K18Cq6Ry31oQcUtsop4PUk
**Branch**: `claude/ops-dashboard-phase3-4-analytics-ops-01K18Cq6Ry31oQcUtsop4PUk`
**Date**: 2025-11-15
**Status**: 🚧 In Progress

---

## Executive Summary

Phase 3.4 introduces **Analytics Observability & Live Ops UX** capabilities to the Corporate Cockpit dashboard. This phase integrates advanced analytics endpoints (trends + engagement), wires comprehensive observability (Sentry + Web Vitals), and provides a dedicated Live Ops view for internal operations teams.

**Key Objectives**:
1. Integrate backend analytics endpoints (trends & engagement) under feature flags
2. Wire analytics UI into Sentry + Web Vitals for health monitoring
3. Provide Live Ops dashboard for real-time analytics health visibility
4. Maintain existing performance, accessibility, and graceful degradation

---

## Backend API Context

### Analytics Endpoints

Since backend documentation files are not yet available, we define the expected API contracts based on the task requirements:

#### 1. Trends Endpoint
```
GET /api/admin/analytics/trends
```

**Query Parameters**:
- `metric` (string): Metric to trend (e.g., "recordings", "sessions", "users")
- `period` (string): Time period (7d, 30d, 90d, 1y)
- `bucket` (string): Aggregation bucket (day, week, month)

**Response**:
```typescript
interface TrendsResponse {
  metric: string;
  period: string;
  bucket: string;
  data: Array<{
    timestamp: string;      // ISO 8601
    value: number;
    change_pct: number;     // % change from previous bucket
  }>;
  summary: {
    total: number;
    average: number;
    peak: number;
    trend_direction: 'up' | 'down' | 'stable';
  };
}
```

#### 2. Engagement Endpoint
```
GET /api/admin/analytics/engagement
```

**Query Parameters**:
- `period` (string): Time period (7d, 30d, 90d, 1y)

**Response**:
```typescript
interface EngagementResponse {
  period: string;
  dau: {                    // Daily Active Users
    current: number;
    previous: number;
    change_pct: number;
  };
  wau: {                    // Weekly Active Users
    current: number;
    previous: number;
    change_pct: number;
  };
  mau: {                    // Monthly Active Users
    current: number;
    previous: number;
    change_pct: number;
  };
  retention: {
    day_1: number;          // % returning after 1 day
    day_7: number;          // % returning after 7 days
    day_30: number;         // % returning after 30 days
  };
  chart_data: Array<{
    date: string;
    dau: number;
    wau: number;
  }>;
}
```

#### 3. Analytics Health Endpoint (Live Ops)
```
GET /api/admin/analytics/health
```

**Response**:
```typescript
interface AnalyticsHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  endpoints: {
    trends: {
      status: 'up' | 'down';
      latency_p50: number;  // ms
      latency_p95: number;  // ms
      error_rate: number;   // 0-1
      last_success: string; // ISO 8601
    };
    engagement: {
      status: 'up' | 'down';
      latency_p50: number;
      latency_p95: number;
      error_rate: number;
      last_success: string;
    };
    data_quality: {
      status: 'up' | 'down';
      latency_p50: number;
      latency_p95: number;
      error_rate: number;
      last_success: string;
    };
  };
  cache: {
    hit_rate: number;       // 0-1
    size_mb: number;
    eviction_count: number;
  };
  dq_remediation: {
    runs_24h: number;
    checks_passed: number;
    checks_failed: number;
    last_run: string;       // ISO 8601
  };
}
```

---

## Frontend Integration Plan

### Feature Flags

We leverage existing feature flags from Phase 3.3B:

- **VITE_FEATURE_ANALYTICS_TRENDS** - Enable trends visualization
- **VITE_FEATURE_ANALYTICS_ENGAGEMENT** - Enable engagement metrics

**New flag** (optional for Live Ops):
- **VITE_FEATURE_ANALYTICS_OPS** - Enable Live Ops dashboard (defaults to true for Admin/PM/Data Engineer)

---

## Phase Breakdown

### Phase 1: API Integration (CLUSTER-API)

#### Task W3-3_4-API1: Wire Trends & Engagement Calls

**Files**:
- `src/lib/api-services.ts` (new file for analytics services)
- `src/types/analytics.ts` (new file for type definitions)

**Implementation**:
```typescript
// src/types/analytics.ts
export interface TrendsRequest {
  metric: string;
  period: '7d' | '30d' | '90d' | '1y';
  bucket: 'day' | 'week' | 'month';
}

export interface EngagementRequest {
  period: '7d' | '30d' | '90d' | '1y';
}

// src/lib/api-services.ts
import { createApiClient } from './api';

export class AnalyticsService {
  private api = createApiClient();

  async getTrends(params: TrendsRequest): Promise<TrendsResponse> {
    return this.api.get('/api/admin/analytics/trends', { params });
  }

  async getEngagement(params: EngagementRequest): Promise<EngagementResponse> {
    return this.api.get('/api/admin/analytics/engagement', { params });
  }

  async getHealth(): Promise<AnalyticsHealthResponse> {
    return this.api.get('/api/admin/analytics/health');
  }
}

export const analyticsService = new AnalyticsService();
```

**Behavior**:
- If feature flags are OFF → do not make calls
- If feature flags are ON → make real API calls with error handling
- Use existing `ApiClient` from `src/lib/api.ts`

---

#### Task W3-3_4-API2: Create Analytics Hooks

**Files**:
- `src/hooks/useAnalytics.ts` (new file)

**Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api-services';

export function useTrendsAnalytics(params: TrendsRequest) {
  const isEnabled = import.meta.env.VITE_FEATURE_ANALYTICS_TRENDS === 'true';

  return useQuery({
    queryKey: ['analytics', 'trends', params],
    queryFn: () => analyticsService.getTrends(params),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useEngagementAnalytics(params: EngagementRequest) {
  const isEnabled = import.meta.env.VITE_FEATURE_ANALYTICS_ENGAGEMENT === 'true';

  return useQuery({
    queryKey: ['analytics', 'engagement', params],
    queryFn: () => analyticsService.getEngagement(params),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useAnalyticsHealth() {
  // Always enabled for ops dashboard
  return useQuery({
    queryKey: ['analytics', 'health'],
    queryFn: () => analyticsService.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Poll every minute
    retry: 3,
  });
}
```

**Return Shape**:
```typescript
{
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEnabled: boolean;
}
```

---

### Phase 2: UX & Live Ops Page (CLUSTER-UX + CLUSTER-UI)

#### Task W3-3_4-UX1: Live Ops Requirements

**Live Ops Dashboard Requirements**:

1. **At-a-Glance Status**
   - Overall analytics health: Green/Yellow/Red
   - Individual endpoint status (trends, engagement, DQ)
   - Cache health indicator

2. **Key Metrics**
   - API latency (p50/p95) for each endpoint
   - Error rates (last 24h)
   - Last successful run timestamps
   - DQ remediation activity counts

3. **Visual Indicators**
   - Status badges (up/down)
   - Sparklines for latency trends
   - Error rate percentage with thresholds
   - Cache hit rate gauge

4. **Role Access**
   - **Admin**: Full access (read/write if remediation UI added)
   - **Project Manager**: Read-only access
   - **Data Engineer**: Full access
   - **QA/Researcher**: Hidden or read-only (configurable)

**SLO Indicators**:
- **Availability**: > 99.5% (green), 95-99.5% (yellow), < 95% (red)
- **Latency p95**: < 500ms (green), 500-1000ms (yellow), > 1000ms (red)
- **Error Rate**: < 1% (green), 1-5% (yellow), > 5% (red)
- **Cache Hit Rate**: > 80% (green), 50-80% (yellow), < 50% (red)

---

#### Task W3-3_4-UI1: Live Ops Page

**File**: `src/pages/analytics-ops.astro` (new page)

**Route**: `/analytics-ops` or `/admin/analytics-ops`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Analytics Operations Dashboard                   │
├─────────────────────────────────────────────────┤
│                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌───────────┐│
│ │ Overall      │ │ Trends API   │ │ Engagement││
│ │ Status: 🟢   │ │ Status: 🟢   │ │ Status: 🟢││
│ │ Healthy      │ │ p95: 230ms   │ │ p95: 180ms││
│ └──────────────┘ └──────────────┘ └───────────┘│
│                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌───────────┐│
│ │ Data Quality │ │ Cache Health │ │ DQ Runs   ││
│ │ Status: 🟢   │ │ Hit: 85%     │ │ 24h: 48   ││
│ │ p95: 450ms   │ │ Size: 120MB  │ │ Pass: 45  ││
│ └──────────────┘ └──────────────┘ └───────────┘│
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ Latency Trends (Last 24h)                  │ │
│ │ [Sparkline chart showing p95 over time]    │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ ┌────────────────────────────────────────────┐ │
│ │ Error Rate (Last 24h)                      │ │
│ │ Trends: 0.2%  Engagement: 0.1%  DQ: 0.3%  │ │
│ └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Components** (new):
- `src/components/analytics/ops/HealthCard.tsx`
- `src/components/analytics/ops/LatencyChart.tsx`
- `src/components/analytics/ops/ErrorRateIndicator.tsx`
- `src/components/analytics/ops/CacheHealthGauge.tsx`

---

#### Task W3-3_4-UI2: Trends & Engagement Visualization

**Files Modified**:
- `src/pages/business-metrics.astro` (or equivalent)
- `src/components/analytics/TrendsChart.tsx` (new)
- `src/components/analytics/EngagementMetrics.tsx` (new)

**Trends Chart**:
- Line chart showing metric values over time
- Configurable metric selector (recordings, sessions, users)
- Period selector (7d, 30d, 90d, 1y)
- Trend direction indicator (↑↓→)
- Lazy-loaded for performance

**Engagement Metrics**:
- DAU/WAU/MAU cards with sparklines
- Retention cohort visualization
- Period-over-period comparison
- Arrow indicators for trends (↑ +5%, ↓ -2%)

**Graceful Degradation**:
- If flags OFF → components not rendered
- If API errors → show fallback message with retry button
- If loading → skeleton loaders
- Use existing `ErrorState` and `EmptyState` components from Phase 3.3B

---

### Phase 3: Observability Wiring (CLUSTER-OBS)

#### Task W3-3_4-OBS1: Sentry Integration

**File**: `src/lib/sentry.ts` (new)

**Implementation**:
```typescript
import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';

  if (!dsn) {
    console.warn('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      new BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
        routingInstrumentation: Sentry.reactRouterV6Instrumentation,
      }),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out non-analytics errors if desired
      return event;
    },
  });
}

export function setSentryContext(context: {
  page?: string;
  featureFlags?: Record<string, boolean>;
  userId?: string;
}) {
  Sentry.setContext('app', context);
}

export function addBreadcrumb(message: string, category: string, data?: any) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}
```

**Integration Points**:
1. Initialize in root layout (`src/layouts/Layout.astro`)
2. Set context on analytics pages:
   ```typescript
   setSentryContext({
     page: 'analytics-data-quality',
     featureFlags: {
       analytics_trends: import.meta.env.VITE_FEATURE_ANALYTICS_TRENDS === 'true',
       analytics_engagement: import.meta.env.VITE_FEATURE_ANALYTICS_ENGAGEMENT === 'true',
     },
   });
   ```
3. Add breadcrumbs for user actions:
   - Period change: `addBreadcrumb('Changed period to 30d', 'analytics')`
   - Severity filter: `addBreadcrumb('Filtered to critical severity', 'analytics')`
   - Feature flag toggle: `addBreadcrumb('Enabled trends view', 'feature-flag')`

**Error Boundaries**:
- Wrap analytics routes with `<Sentry.ErrorBoundary>`
- Fallback UI for caught errors
- Automatic exception reporting

**Privacy**:
- No PII in tags or breadcrumbs
- Sanitize user IDs (hash or anonymize)
- Filter sensitive query parameters

---

#### Task W3-3_4-OBS2: Web Vitals Labeling

**Files Modified**:
- `src/telemetry/web-vitals.ts` (enhance existing)

**Enhancement**:
```typescript
// Add route grouping
export function getRouteGroup(path: string): string {
  if (path.startsWith('/analytics')) return 'analytics';
  if (path.startsWith('/admin')) return 'admin';
  return 'core';
}

// Modify handleMetric to include route group
handleMetric(metric: Metric): void {
  const routeGroup = getRouteGroup(this.getCurrentRoute());

  const data: WebVitalsData = {
    // ... existing fields
    route: this.getCurrentRoute(),
    routeGroup,  // NEW
    featureFlags: {  // NEW
      analytics_trends: import.meta.env.VITE_FEATURE_ANALYTICS_TRENDS === 'true',
      analytics_engagement: import.meta.env.VITE_FEATURE_ANALYTICS_ENGAGEMENT === 'true',
    },
  };

  // ... rest of implementation
}
```

**OTel Attributes**:
- `route_group` = 'analytics' | 'admin' | 'core'
- `page` = specific page name
- `feature.analytics_trends.enabled` = true/false
- `feature.analytics_engagement.enabled` = true/false

**Budget Enforcement**:
- Analytics pages must not push LCP > 2.5s
- Analytics pages must not push INP > 300ms
- If budget violations occur, log warning to console and Sentry

---

### Phase 4: Tests (CLUSTER-TEST)

#### Task W3-3_4-TEST1: Unit Tests

**Files**:
- `src/hooks/__tests__/useAnalytics.test.ts`
- `src/components/analytics/ops/__tests__/HealthCard.test.tsx`
- `src/lib/__tests__/api-services.test.ts`

**Test Coverage**:

1. **Hooks** (`useAnalytics.test.ts`):
   ```typescript
   describe('useTrendsAnalytics', () => {
     it('should not fetch when feature flag is disabled', () => {
       // Test isEnabled = false behavior
     });

     it('should fetch with correct params when enabled', () => {
       // Test API call with params
     });

     it('should handle API errors gracefully', () => {
       // Test error state
     });
   });
   ```

2. **Live Ops Components** (`HealthCard.test.tsx`):
   ```typescript
   describe('HealthCard', () => {
     it('should render green status for healthy service', () => {
       // Test status: 'up', error_rate < 0.01
     });

     it('should render red status for down service', () => {
       // Test status: 'down'
     });

     it('should render yellow status for degraded service', () => {
       // Test error_rate > 0.01 && < 0.05
     });
   });
   ```

3. **API Services** (`api-services.test.ts`):
   ```typescript
   describe('AnalyticsService', () => {
     it('should call trends endpoint with correct params', async () => {
       // Mock fetch, verify URL and params
     });

     it('should throw on API error', async () => {
       // Test error handling
     });
   });
   ```

**Target**: 25+ unit tests

---

#### Task W3-3_4-TEST2: E2E Tests for Live Ops

**File**: `tests/e2e/analytics-ops.spec.ts`

**Scenarios**:

```typescript
test.describe('Analytics Ops Dashboard', () => {
  test('Admin can access Live Ops page', async ({ page }) => {
    await page.goto('/login');
    await loginAsAdmin(page);
    await page.goto('/analytics-ops');
    await expect(page.locator('h1')).toContainText('Analytics Operations');
  });

  test('Live Ops displays health cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics-ops');
    await expect(page.locator('[data-testid="health-card-trends"]')).toBeVisible();
    await expect(page.locator('[data-testid="health-card-engagement"]')).toBeVisible();
  });

  test('Data Engineer can access Live Ops', async ({ page }) => {
    await loginAsDataEngineer(page);
    await page.goto('/analytics-ops');
    await expect(page.locator('h1')).toContainText('Analytics Operations');
  });

  test('QA cannot access Live Ops (403)', async ({ page }) => {
    await loginAsQA(page);
    await page.goto('/analytics-ops');
    await expect(page).toHaveURL(/403|access-denied/);
  });

  test('Backend failure shows warning instead of crash', async ({ page }) => {
    // Mock backend 500 error
    await page.route('**/api/admin/analytics/health', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await loginAsAdmin(page);
    await page.goto('/analytics-ops');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load analytics health');
  });
});
```

**Target**: 15+ E2E tests

---

#### Task W3-3_4-TEST3: E2E Tests for Feature Flags

**File**: `tests/e2e/analytics-feature-flags.spec.ts`

**Scenarios**:

```typescript
test.describe('Analytics Feature Flags', () => {
  test('Trends chart hidden when flag is OFF', async ({ page }) => {
    // Set VITE_FEATURE_ANALYTICS_TRENDS=false
    await page.goto('/business-metrics');
    await expect(page.locator('[data-testid="trends-chart"]')).not.toBeVisible();
  });

  test('Trends chart visible when flag is ON', async ({ page }) => {
    // Set VITE_FEATURE_ANALYTICS_TRENDS=true
    await page.goto('/business-metrics');
    await expect(page.locator('[data-testid="trends-chart"]')).toBeVisible();
  });

  test('Engagement metrics hidden when flag is OFF', async ({ page }) => {
    // Set VITE_FEATURE_ANALYTICS_ENGAGEMENT=false
    await page.goto('/business-metrics');
    await expect(page.locator('[data-testid="engagement-metrics"]')).not.toBeVisible();
  });

  test('Engagement metrics visible when flag is ON', async ({ page }) => {
    // Set VITE_FEATURE_ANALYTICS_ENGAGEMENT=true
    await page.goto('/business-metrics');
    await expect(page.locator('[data-testid="engagement-metrics"]')).toBeVisible();
  });

  test('Analytics pages work when backend is unavailable', async ({ page }) => {
    // Mock backend 503
    await page.route('**/api/admin/analytics/**', (route) =>
      route.fulfill({ status: 503 })
    );
    await page.goto('/business-metrics');
    await expect(page.locator('h1')).toBeVisible(); // Page still loads
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible(); // Shows error fallback
  });
});
```

**Target**: 10+ E2E tests

---

### Phase 5: Documentation (CLUSTER-DOC)

#### Task W3-3_4-DOC1: Completion Summary

**File**: `apps/corp-cockpit-astro/reports/analytics/PHASE3_4_ANALYTICS_OPS_COMPLETION.md`

**Contents**:
- Pages affected (analytics-ops, business-metrics)
- New API endpoints integrated
- Sentry/Web Vitals tagging details
- Feature flag behavior matrix
- Live Ops view semantics (SLO thresholds, color codes)
- Performance impact analysis
- Accessibility compliance statement

---

#### Task W3-3_4-DOC2: Playbooks & Release Notes

**Files**:
- `docs/playbooks/ADMIN_OPS_PLAYBOOK.md` (update)
- `docs/playbooks/PROJECT_MANAGER_PLAYBOOK.md` (update)
- `apps/corp-cockpit-astro/RELEASE_NOTES_v1.4.md` (new)

**Admin Ops Playbook Updates**:
```markdown
## Analytics Ops Dashboard

The Analytics Ops dashboard (`/analytics-ops`) provides real-time visibility into analytics system health.

### Accessing Live Ops
1. Navigate to **Admin** > **Analytics Operations**
2. View overall status (🟢 Healthy, 🟡 Degraded, 🔴 Down)

### Understanding Health Indicators
- **Green (Healthy)**: All SLOs met (p95 < 500ms, error rate < 1%)
- **Yellow (Degraded)**: Some SLOs violated (p95 500-1000ms, error rate 1-5%)
- **Red (Down)**: Severe issues (p95 > 1000ms, error rate > 5%)

### Troubleshooting
- High latency → Check cache hit rate, consider scaling
- High error rate → Check backend logs, Sentry for exceptions
- DQ remediation failures → Review data quality checks
```

**Release Notes** (`RELEASE_NOTES_v1.4.md`):
```markdown
# Release Notes - v1.4.0

**Date**: 2025-11-15
**Phase**: 3.4 - Analytics Observability & Live Ops UX

## 🚀 New Features

### Analytics Ops Dashboard
- **Live Ops View**: Real-time analytics system health monitoring for Admins, PMs, and Data Engineers
- **Health Indicators**: Traffic light system (🟢🟡🔴) for endpoint status
- **SLO Tracking**: Latency (p50/p95), error rates, cache health
- **DQ Remediation Activity**: View dry-run check counts and outcomes

### Advanced Analytics Visualizations
- **Trends Charts**: Line charts for metrics over time (behind `VITE_FEATURE_ANALYTICS_TRENDS`)
- **Engagement Metrics**: DAU/WAU/MAU cards with retention cohorts (behind `VITE_FEATURE_ANALYTICS_ENGAGEMENT`)
- **Period Selectors**: 7d, 30d, 90d, 1y time ranges

### Enhanced Observability
- **Sentry Integration**: Error tracking with analytics-specific tagging
- **Web Vitals Labeling**: Route grouping (`analytics` vs `core`) for performance monitoring
- **Feature Flag Context**: Sentry/OTel tags include enabled feature flags

## 🔧 Improvements
- Graceful degradation when backend analytics endpoints are unavailable
- Lazy-loaded chart components for improved performance
- Existing components reused (ErrorState, EmptyState, LoadingSkeleton)

## 📊 Performance
- Bundle impact: +~18 KB gzipped (within budget)
- LCP for analytics pages: < 2.5s (target met)
- INP for analytics interactions: < 300ms (target met)

## ♿ Accessibility
- WCAG 2.2 AA compliance maintained
- Keyboard navigation for all analytics controls
- Screen reader announcements for status changes

## 🧪 Testing
- 25+ unit tests (hooks, components, services)
- 25+ E2E tests (Live Ops, feature flags, RBAC)
- Visual regression baselines updated

## 🔐 Security & Privacy
- No PII in Sentry tags or breadcrumbs
- RBAC enforced (Admin/PM/DataEngineer for Live Ops)
- QA/Researcher access configurable (default: hidden)

## 📖 Documentation
- Admin Ops Playbook updated with Live Ops usage
- Project Manager Playbook updated with analytics interpretation
- Phase 3.4 completion summary published
```

---

## Priority Matrix

### P1 (Must Have)

| Task | Description | Risk |
|------|-------------|------|
| W3-3_4-API1 | Wire trends & engagement API calls | Low |
| W3-3_4-API2 | Create analytics hooks with feature flag support | Low |
| W3-3_4-UI1 | Implement Live Ops page | Medium |
| W3-3_4-OBS1 | Sentry integration | Low |
| W3-3_4-TEST2 | E2E tests for Live Ops RBAC | Medium |

### P2 (Nice to Have)

| Task | Description | Risk |
|------|-------------|------|
| W3-3_4-UI2 | Trends & engagement visualizations | Low |
| W3-3_4-OBS2 | Web Vitals route labeling | Low |
| W3-3_4-TEST3 | E2E tests for feature flags | Low |

---

## Role Visibility Matrix

| Role | Live Ops Access | Trends View | Engagement View | Notes |
|------|----------------|-------------|-----------------|-------|
| **Admin** | ✅ Full | ✅ Yes | ✅ Yes | Can manage all analytics features |
| **Project Manager** | ✅ Read-only | ✅ Yes | ✅ Yes | Can view analytics for reporting |
| **Data Engineer** | ✅ Full | ✅ Yes | ✅ Yes | Can troubleshoot analytics issues |
| **QA** | ❌ Hidden | ⚠️ Configurable | ⚠️ Configurable | Default: no access to ops view |
| **Researcher** | ❌ Hidden | ⚠️ Configurable | ⚠️ Configurable | Default: no access to ops view |

---

## SLO Thresholds

| Metric | Green (Good) | Yellow (Degraded) | Red (Critical) |
|--------|--------------|-------------------|----------------|
| **Availability** | > 99.5% | 95-99.5% | < 95% |
| **Latency (p95)** | < 500ms | 500-1000ms | > 1000ms |
| **Error Rate** | < 1% | 1-5% | > 5% |
| **Cache Hit Rate** | > 80% | 50-80% | < 50% |

---

## Backend Field Visualization

### Trends Endpoint Fields
- ✅ **timestamp** → X-axis on line chart
- ✅ **value** → Y-axis on line chart
- ✅ **change_pct** → Arrow indicator (↑↓→)
- ✅ **summary.trend_direction** → Overall trend badge

### Engagement Endpoint Fields
- ✅ **dau/wau/mau.current** → Metric cards
- ✅ **dau/wau/mau.change_pct** → Arrow indicators
- ✅ **retention.day_1/7/30** → Retention cohort table
- ✅ **chart_data[]** → Sparklines

### Health Endpoint Fields (Live Ops)
- ✅ **status** → Overall health badge
- ✅ **endpoints[].status** → Per-endpoint status badges
- ✅ **endpoints[].latency_p95** → Latency cards
- ✅ **endpoints[].error_rate** → Error rate percentage
- ✅ **cache.hit_rate** → Cache health gauge
- ✅ **dq_remediation.runs_24h** → DQ activity counter

---

## Constraints & Guardrails

### Performance
- ✅ No regression to existing analytics UX
- ✅ Lazy-load heavy chart components
- ✅ Bundle size increase < 20 KB gzipped
- ✅ LCP remains < 2.5s for analytics pages
- ✅ INP remains < 300ms for interactions

### Graceful Degradation
- ✅ Feature flags OFF → components not rendered (no errors)
- ✅ Backend unreachable → fallback UI with retry button
- ✅ Partial data → show what's available, mark missing data
- ✅ Slow backend → loading skeletons, timeout after 10s

### Privacy & Security
- ✅ No PII in Sentry tags/breadcrumbs
- ✅ User IDs anonymized/hashed
- ✅ RBAC enforced server-side (frontend is defense-in-depth)
- ✅ CSP compliant (no inline scripts)

### Accessibility
- ✅ WCAG 2.2 AA maintained
- ✅ Keyboard navigation for all controls
- ✅ ARIA labels for status indicators
- ✅ Screen reader announcements for live updates
- ✅ Color contrast ratios > 4.5:1

---

## Success Criteria

### Functional
- [ ] Trends API endpoint integrated, data displays in UI (when flag ON)
- [ ] Engagement API endpoint integrated, DAU/WAU/MAU visible (when flag ON)
- [ ] Live Ops page accessible to Admin/PM/DataEngineer
- [ ] Health indicators show correct status (green/yellow/red)
- [ ] Feature flags control visibility (OFF = components hidden)
- [ ] Backend errors handled gracefully (no crashes)

### Non-Functional
- [ ] Bundle size < 20 KB increase
- [ ] LCP < 2.5s for analytics pages
- [ ] INP < 300ms for analytics interactions
- [ ] Unit tests: 25+ passing
- [ ] E2E tests: 25+ passing
- [ ] WCAG 2.2 AA compliance maintained

### Observability
- [ ] Sentry receives analytics errors with correct tags
- [ ] Web Vitals labeled with `route_group=analytics`
- [ ] Feature flag context visible in Sentry/OTel
- [ ] No PII leaked in observability data

### Documentation
- [ ] Phase 3.4 completion summary published
- [ ] Admin Ops Playbook updated
- [ ] PM Playbook updated
- [ ] Release notes v1.4 published

---

## 30-Agent Swarm Allocation

### CLUSTER-API (5 agents: A1-A5)
- **A1**: Define TypeScript types for analytics endpoints
- **A2**: Implement `AnalyticsService` class
- **A3**: Create `useTrendsAnalytics` hook
- **A4**: Create `useEngagementAnalytics` hook
- **A5**: Create `useAnalyticsHealth` hook

### CLUSTER-UX (6 agents: X1-X6)
- **X1**: Define Live Ops UX requirements (SLOs, thresholds)
- **X2**: Design Live Ops layout and component tree
- **X3**: Define trends visualization UX (chart types, interactions)
- **X4**: Define engagement metrics UX (cards, sparklines)
- **X5**: Design graceful degradation flows (errors, loading, empty)
- **X6**: Define RBAC logic for Live Ops access

### CLUSTER-UI (5 agents: U1-U5)
- **U1**: Build `analytics-ops.astro` page
- **U2**: Build Live Ops components (`HealthCard`, `LatencyChart`, etc.)
- **U3**: Build `TrendsChart.tsx` component
- **U4**: Build `EngagementMetrics.tsx` component
- **U5**: Build error/loading/empty states for analytics

### CLUSTER-OBS (4 agents: O1-O4)
- **O1**: Implement `sentry.ts` initialization
- **O2**: Add Sentry context/breadcrumbs to analytics pages
- **O3**: Enhance Web Vitals with route grouping
- **O4**: Add feature flag context to OTel metrics

### CLUSTER-TEST (6 agents: T1-T6)
- **T1**: Write unit tests for analytics hooks
- **T2**: Write unit tests for Live Ops components
- **T3**: Write unit tests for API services
- **T4**: Write E2E tests for Live Ops RBAC
- **T5**: Write E2E tests for feature flag behavior
- **T6**: Write E2E tests for backend failure scenarios

### CLUSTER-DOC (4 agents: D1-D4)
- **D1**: Write Phase 3.4 completion summary
- **D2**: Update Admin Ops Playbook
- **D3**: Update PM Playbook
- **D4**: Write release notes v1.4

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 0**: Planning & docs | 1 hour | None |
| **Phase 1**: API integration | 2 hours | Phase 0 |
| **Phase 2**: UX & Live Ops | 3 hours | Phase 1 |
| **Phase 3**: Observability | 2 hours | Phase 2 |
| **Phase 4**: Tests | 3 hours | Phase 1-3 |
| **Phase 5**: Documentation | 1 hour | Phase 1-4 |
| **Total** | **12 hours** | - |

---

## Next Steps

1. ✅ Create this planning document
2. ⏭️ Start Phase 1 (CLUSTER-API) implementation
3. ⏭️ Proceed through Phases 2-5 sequentially
4. ⏭️ Commit and push to branch
5. ⏭️ Create PR for review

---

**Status**: 🚧 Ready to begin implementation
**Last Updated**: 2025-11-15
