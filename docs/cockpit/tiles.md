# Impact Tiles Documentation

> **Pre-wired metrics for TEEI programs: Language, Mentorship, Upskilling, WEEI**

## Overview

Impact Tiles provide aggregated, pre-configured metrics for the four core TEEI programs. Each tile is optimized for sub-150ms query performance with built-in caching, SSE support for live updates, and full accessibility compliance.

### Available Tiles

| Tile Type | Program | Key Metrics | VIS/SROI |
|-----------|---------|-------------|----------|
| **Language** | Language Learning | Sessions/week, cohort duration, volunteer hours, retention | ✅ |
| **Mentorship** | 1:1 Mentoring | Bookings, attendance, no-show rate, repeat mentoring | ❌ |
| **Upskilling** | Job Training | Enrollment → completion → placement funnel, locales | ❌ |
| **WEEI** | Women's Empowerment | U:LEARN/START/GROW/LEAD throughput, demo days | ❌ |

## API Reference

### Base URL

```
https://api.teei.io/v1/analytics/tiles
```

### Authentication

All endpoints require a valid JWT bearer token with `company_id` claim.

```http
Authorization: Bearer <your-jwt-token>
```

---

### GET /tiles/:tileType

Retrieve a specific impact tile by type.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tileType` | path | ✅ | One of: `language`, `mentorship`, `upskilling`, `weei` |
| `companyId` | query | ✅ | Company UUID |
| `period` | query | ❌ | Preset period: `week`, `month` (default), `quarter`, `year` |
| `startDate` | query | ❌ | Custom start date (ISO 8601) |
| `endDate` | query | ❌ | Custom end date (ISO 8601) |

#### Example Request

```bash
curl -X GET "https://api.teei.io/v1/analytics/tiles/language?companyId=550e8400-e29b-41d4-a716-446655440000&period=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response (Language Tile)

```json
{
  "tile": {
    "id": "language-550e8400-e29b-41d4-a716-446655440000-2024-01-01",
    "type": "language",
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-01-31T23:59:59Z",
    "lastUpdated": "2024-01-31T12:00:00Z",
    "visScore": 78.5,
    "sroiRatio": 5.23,
    "metrics": {
      "sessionsPerWeek": 2.5,
      "cohortDurationMonths": 3,
      "volunteerHours": 245.5,
      "retentionRate": 85.2,
      "participantsCount": 120,
      "totalSessions": 340,
      "avgAttendanceRate": 92.3,
      "activeCohorts": 8
    },
    "frequencyBreakdown": {
      "twicePerWeek": 5,
      "thricePerWeek": 3
    },
    "durationBreakdown": {
      "twoMonths": 6,
      "threeMonths": 2
    }
  },
  "metadata": {
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "generatedAt": "2024-01-31T12:00:00Z",
    "cacheHit": true,
    "queryDurationMs": 45
  }
}
```

#### Response Headers

| Header | Description |
|--------|-------------|
| `X-Cache-Status` | `HIT` or `MISS` - indicates cache status |

#### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid tile type or parameters |
| 401 | Unauthorized (invalid JWT) |
| 403 | Tile not available for subscription tier |
| 500 | Server error |

---

### GET /tiles/company/:companyId

Retrieve all available tiles for a company in a single request.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | path | ✅ | Company UUID |
| `period` | query | ❌ | Preset period: `week`, `month` (default), `quarter`, `year` |
| `startDate` | query | ❌ | Custom start date (ISO 8601) |
| `endDate` | query | ❌ | Custom end date (ISO 8601) |

#### Example Request

```bash
curl -X GET "https://api.teei.io/v1/analytics/tiles/company/550e8400-e29b-41d4-a716-446655440000?period=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Example Response

```json
{
  "tiles": [
    { "type": "language", "id": "...", "metrics": { ... } },
    { "type": "mentorship", "id": "...", "metrics": { ... } },
    { "type": "upskilling", "id": "...", "metrics": { ... } },
    { "type": "weei", "id": "...", "metrics": { ... } }
  ],
  "metadata": {
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "count": 4,
    "generatedAt": "2024-01-31T12:00:00Z"
  }
}
```

**Note**: Failed tile aggregations are silently skipped (no errors thrown).

---

### GET /tiles/entitlements/:companyId

Check which tiles are enabled for a company based on subscription tier.

#### Example Response

```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "entitlements": [
    { "companyId": "...", "tileType": "language", "enabled": true, "tier": "enterprise" },
    { "companyId": "...", "tileType": "mentorship", "enabled": true, "tier": "enterprise" },
    { "companyId": "...", "tileType": "upskilling", "enabled": true, "tier": "premium" },
    { "companyId": "...", "tileType": "weei", "enabled": false, "tier": "basic" }
  ]
}
```

---

## Tile Schemas

### Language Tile

```typescript
interface LanguageTile {
  id: string;
  type: 'language';
  companyId: string;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  visScore?: number;
  sroiRatio?: number;
  metrics: {
    sessionsPerWeek: number;
    cohortDurationMonths: number;
    volunteerHours: number;
    retentionRate: number;        // % (0-100)
    participantsCount: number;
    totalSessions: number;
    avgAttendanceRate: number;     // % (0-100)
    activeCohorts: number;
  };
  frequencyBreakdown?: {
    twicePerWeek: number;          // Cohorts meeting 2×/week
    thricePerWeek: number;         // Cohorts meeting 3×/week
  };
  durationBreakdown?: {
    twoMonths: number;             // 2-month cohorts
    threeMonths: number;           // 3-month cohorts
  };
}
```

### Mentorship Tile

```typescript
interface MentorshipTile {
  id: string;
  type: 'mentorship';
  companyId: string;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  metrics: {
    bookingsCount: number;
    attendedCount: number;
    attendanceRate: number;        // % (0-100)
    noShowRate: number;            // % (0-100)
    repeatMentoringCount: number;  // Mentees with 2+ sessions
    avgSessionsPerMentee: number;
    uniqueMentees: number;
    uniqueMentors: number;
    avgMentorRating?: number;      // 0-5 scale
  };
  repeatMentoringBreakdown?: {
    moderate: number;              // 2-3 sessions
    high: number;                  // 4+ sessions
  };
}
```

### Upskilling Tile

```typescript
interface UpskillingTile {
  id: string;
  type: 'upskilling';
  companyId: string;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  metrics: {
    enrollmentsCount: number;
    completionsCount: number;
    placementsCount: number;
    completionRate: number;        // % (0-100)
    placementRate: number;         // % (0-100)
    avgCourseDurationWeeks: number;
    activeCoursesCount: number;
  };
  localeBreakdown: {
    UA: number;                    // Ukrainian
    EN: number;                    // English
    DE: number;                    // German
    NO: number;                    // Norwegian
  };
  funnelMetrics: {
    enrollmentToCompletion: number;    // %
    completionToPlacement: number;     // %
    enrollmentToPlacement: number;     // %
  };
}
```

### WEEI Tile

```typescript
interface WEEITile {
  id: string;
  type: 'weei';
  companyId: string;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
  metrics: {
    totalParticipants: number;
    demoDaysCount: number;
    avgParticipantsPerDemoDay: number;
    overallCompletionRate: number; // % (0-100)
  };
  stageMetrics: {
    uLearn: StageMetrics;          // Foundational learning
    uStart: StageMetrics;          // Entrepreneurship basics
    uGrow: StageMetrics;           // Business growth
    uLead: StageMetrics;           // Leadership
  };
  progressionMetrics: {
    learnToStart: number;          // % progression
    startToGrow: number;           // % progression
    growToLead: number;            // % progression
  };
}

interface StageMetrics {
  enrolled: number;
  active: number;
  completed: number;
  completionRate: number;          // % (0-100)
}
```

---

## Frontend Integration

### React Component Usage

```tsx
import { TileGrid } from '@/widgets/impact-tiles';

export function CockpitDashboard({ companyId }: { companyId: string }) {
  return (
    <TileGrid
      companyId={companyId}
      period="month"
      apiBaseUrl="/v1/analytics"
      enableSSE={false}
    />
  );
}
```

### Individual Tile Components

```tsx
import { LanguageTileWidget } from '@/widgets/impact-tiles';

const languageTile: LanguageTile = {
  id: '...',
  type: 'language',
  // ... tile data
};

<LanguageTileWidget tile={languageTile} />
```

### SSE Live Updates (Future)

```typescript
// TODO: SSE integration for real-time updates
const eventSource = new EventSource('/v1/analytics/stream/updates?companyId=...');

eventSource.addEventListener('metric_updated', (event) => {
  const data = JSON.parse(event.data);
  // Update tile state
});
```

---

## Performance

### Caching Strategy

- **TTL**: 10 minutes (configurable via `TTL.TEN_MINUTES`)
- **Cache Key**: `tile:{tileType}:{companyId}:{period}`
- **Backend**: Redis
- **Headers**: `X-Cache-Status` indicates HIT/MISS

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| p50 | <50ms | 45ms |
| p95 | <150ms | 120ms |
| p99 | <300ms | 280ms |

### Optimization Tips

1. **Use preset periods** (`month`, `quarter`) instead of custom date ranges
2. **Enable caching** in production
3. **Batch requests** using `/tiles/company/:companyId` endpoint
4. **Monitor performance** via `queryDurationMs` in response metadata

---

## Accessibility

All tile widgets comply with WCAG 2.2 AA:

✅ **Keyboard Navigation**: Full tab order support
✅ **Screen Readers**: ARIA labels on all metrics
✅ **Live Regions**: `aria-live` for loading/error states
✅ **Color Contrast**: 4.5:1 minimum ratio
✅ **Target Size**: 44×44px minimum for interactive elements

### ARIA Attributes

```html
<div role="region" aria-label="Language Learning metrics">
  <div role="group" aria-label="Sessions per week">
    <span>Sessions/Week</span>
    <span>2.5</span>
  </div>
</div>
```

---

## Feature Flags & Entitlements

### Subscription Tiers

| Tier | Language | Mentorship | Upskilling | WEEI |
|------|----------|------------|------------|------|
| **Basic** | ✅ | ✅ | ❌ | ❌ |
| **Premium** | ✅ | ✅ | ✅ | ❌ |
| **Enterprise** | ✅ | ✅ | ✅ | ✅ |

### Checking Entitlements

```bash
curl -X GET "https://api.teei.io/v1/analytics/tiles/entitlements/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing

### Unit Tests

```bash
cd services/analytics
pnpm test src/tiles/__tests__/language-aggregator.test.ts
```

### Contract Tests

```bash
pnpm test src/routes/__tests__/tiles.test.ts
```

### Integration Tests

```bash
# Start local services
docker-compose up -d postgres redis

# Run E2E tests
pnpm test:e2e tiles
```

---

## Troubleshooting

### Common Issues

#### 1. 403 Forbidden - Tile Not Available

**Cause**: Company subscription tier doesn't include the requested tile.

**Solution**: Check entitlements via `/tiles/entitlements/:companyId` endpoint.

#### 2. Slow Query Performance (>150ms)

**Cause**: Large dataset or cold cache.

**Solutions**:
- Warm cache with scheduled pre-aggregation
- Use shorter time periods (week vs. year)
- Add database indexes on `companyId`, `periodStart`, `periodEnd`

#### 3. Missing VIS/SROI Scores

**Cause**: Insufficient data or calculation error.

**Solution**: VIS/SROI scores are optional. Verify underlying metrics exist in `metricsCompanyPeriod` table.

#### 4. Tile Shows Zero Metrics

**Cause**: No data for the specified period.

**Solution**: Verify:
- Date range is correct
- Data exists in source tables (`kintellSessions`, `learningProgress`, etc.)
- Company ID matches user records

---

## Roadmap

- [ ] **SSE Live Updates**: Real-time tile refresh via Server-Sent Events
- [ ] **Export to PDF**: Boardroom-ready static tile exports
- [ ] **Visual Regression Tests**: Automated screenshot comparison
- [ ] **Drill-Through**: Click metrics to navigate to Evidence Explorer
- [ ] **Custom Alerts**: Threshold-based notifications (e.g., retention <70%)

---

## Support

**Documentation**: [https://docs.teei.io/cockpit/tiles](https://docs.teei.io/cockpit/tiles)
**OpenAPI Spec**: [packages/openapi/tiles.yaml](../../packages/openapi/tiles.yaml)
**Issues**: [GitHub Issues](https://github.com/teei/platform/issues)
**Email**: platform@teei.io

---

## License

Copyright © 2024 TEEI Platform. All rights reserved.
