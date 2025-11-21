# Impact Tiles Documentation

**Worker 3: Corporate Cockpit & Metrics Team**

## Overview

Impact Tiles provide pre-wired, performance-optimized metrics dashboards for TEEI programs. Each tile aggregates program-specific data with P95 latency ≤150ms through intelligent caching and optimized queries.

## Available Tile Types

### 1. Language Learning Tile 🗣️

**Data Source**: `kintell_sessions` (sessionType='language')

**Metrics**:
- **Sessions Per Week**: Average number of language sessions per week
  - Target: 2-3 sessions/week
  - Indicator: On-track if within target range
- **Cohort Duration**: Program duration in weeks
  - Target: 8-12 weeks (2-3 months)
- **Volunteer Hours**: Total volunteer time invested
  - Total hours, per-session average, unique volunteers
- **Retention**: Participant engagement and completion
  - Enrollments, active participants (2+ sessions), completions (8+ sessions)
  - Dropout rate and retention rate
- **Language Levels** (optional): CEFR level progression (A1, A2, B1, B2, C1, C2)
- **Impact Scores** (optional): VIS and SROI if available

**Use Cases**:
- Monitor language program engagement
- Track volunteer contribution
- Identify retention risks
- Measure program completion rates

---

### 2. Mentorship Tile 🤝

**Data Source**: `kintell_sessions` (sessionType='mentorship')

**Metrics**:
- **Bookings**: Total, scheduled, completed, cancelled sessions
- **Attendance**: Attendance rate, avg session duration, total sessions
- **No-Show Rate**: Percentage of scheduled sessions not attended
  - Target: <10%
  - Calculated as: (scheduled - completed - cancelled) / scheduled
- **Repeat Mentoring**: Engagement depth
  - Unique mentors, unique mentees
  - Avg sessions per mentee
  - Mentors with 2+ sessions
  - Repeat rate (% of mentees with 2+ sessions)
- **Feedback** (optional): Mentor/mentee ratings (0-5 stars), feedback count
- **Impact Scores** (optional): VIS and SROI if available

**Use Cases**:
- Monitor mentorship engagement quality
- Identify no-show trends
- Track repeat mentoring relationships
- Measure mentor/mentee satisfaction

---

### 3. Upskilling Tile 🎓

**Data Source**: `learning_progress` table

**Metrics**:
- **Learner Funnel**: Enrollments → In Progress → Completions → Placements
  - Completion rate (completions / enrollments)
  - Placement rate (placements / completions)
- **Course Locales**: Enrollment breakdown by language
  - UA (Ukrainian), EN (English), DE (German), NO (Norwegian)
- **Course Details**:
  - Total courses, active courses
  - Avg course duration (weeks)
  - Top 5 courses by enrollment
- **Skills Acquired** (optional):
  - Total skills acquired
  - Avg skills per learner
  - Top 5 skills
- **Impact Scores** (optional): VIS and SROI if available

**Use Cases**:
- Track learner progression through upskilling programs
- Monitor course localization effectiveness
- Identify high-performing courses
- Measure job placement outcomes

---

### 4. WEEI Tile 👩‍💼

**Women's Economic Empowerment Initiative**

**Data Source**: `learning_progress` table (WEEI-tagged courses)

**Metrics**:
- **Program Stages**: U:LEARN, U:START, U:GROW, U:LEAD
  - Enrollments, completions, completion rate per stage
- **Overall Throughput**:
  - Total enrollments, total completions
  - Overall completion rate, avg time to complete (weeks)
- **Stage Progression**:
  - U:LEARN → U:START progression rate
  - U:START → U:GROW progression rate
  - U:GROW → U:LEAD progression rate
- **Demo Days**:
  - Demo days held, total presentations
  - Unique participants, avg presentations per demo day
- **Business Outcomes** (optional):
  - Businesses started, jobs created, revenue generated (USD)
- **Impact Scores** (optional): VIS and SROI if available

**Use Cases**:
- Monitor women's entrepreneurship pipeline
- Track progression through empowerment stages
- Measure business creation outcomes
- Evaluate demo day effectiveness

---

## API Usage

### Base URL

```
http://localhost:3008/v1/analytics/tiles
```

### Authentication

Tiles are tenant-scoped by `companyId`. In production, ensure API Gateway enforces:
- JWT authentication
- Company-level authorization
- Rate limiting (100 req/min per company)

---

### Get a Specific Tile

**Endpoint**: `GET /v1/analytics/tiles/:tileType`

**Parameters**:
- `tileType` (path, required): `language`, `mentorship`, `upskilling`, or `weei`
- `companyId` (query, required): Company UUID
- `startDate` (query, optional): Period start (ISO 8601: YYYY-MM-DD)
- `endDate` (query, optional): Period end (ISO 8601: YYYY-MM-DD)

**Example**:
```bash
curl "http://localhost:3008/v1/analytics/tiles/language?companyId=123e4567-e89b-12d3-a456-426614174000&startDate=2024-01-01&endDate=2024-03-31"
```

**Response** (200 OK):
```json
{
  "tile": {
    "metadata": {
      "tileId": "tile-uuid",
      "companyId": "company-uuid",
      "programType": "language",
      "period": {
        "start": "2024-01-01",
        "end": "2024-03-31"
      },
      "calculatedAt": "2024-11-17T12:34:56Z",
      "dataFreshness": "cached_1h"
    },
    "data": {
      "sessionsPerWeek": 2.8,
      "targetSessionsPerWeek": 2.5,
      "cohortDurationWeeks": 12,
      "targetDurationWeeks": 10,
      "volunteerHours": {
        "total": 150.5,
        "perSession": 1.2,
        "uniqueVolunteers": 15
      },
      "retention": {
        "enrollments": 25,
        "activeParticipants": 20,
        "completions": 18,
        "dropoutRate": 0.20,
        "retentionRate": 0.80
      }
    }
  },
  "entitlements": {
    "canExport": true,
    "canViewDetails": true,
    "canViewBenchmarks": false
  },
  "cacheTTL": 3600
}
```

---

### Get All Tiles for a Company

**Endpoint**: `GET /v1/analytics/tiles`

**Parameters**:
- `companyId` (query, required): Company UUID
- `startDate` (query, optional): Period start
- `endDate` (query, optional): Period end
- `types` (query, optional): Comma-separated tile types (default: all)

**Example**:
```bash
curl "http://localhost:3008/v1/analytics/tiles?companyId=123e4567-e89b-12d3-a456-426614174000&types=language,mentorship"
```

**Response** (200 OK):
```json
{
  "companyId": "company-uuid",
  "tiles": [
    { /* LanguageTile */ },
    { /* MentorshipTile */ }
  ],
  "availableTileTypes": ["language", "mentorship"],
  "period": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  }
}
```

---

### Health Check

**Endpoint**: `GET /v1/analytics/tiles/health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "availableTileTypes": ["language", "mentorship", "upskilling", "weei"],
  "timestamp": "2024-11-17T12:34:56Z"
}
```

---

## Frontend Integration

### Using the Impact Tiles Container

```tsx
import { ImpactTilesContainer } from '@/widgets/impact-tiles';

export default function CockpitPage({ companyId }: { companyId: string }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Impact Dashboard</h1>

      <ImpactTilesContainer
        companyId={companyId}
        period={{ start: '2024-01-01', end: '2024-03-31' }}
        tileTypes={['language', 'mentorship', 'upskilling', 'weei']}
      />
    </div>
  );
}
```

### Using Individual Tile Widgets

```tsx
import { LanguageTileWidget, MentorshipTileWidget } from '@/widgets/impact-tiles';
import type { LanguageTile, MentorshipTile } from '@teei/shared-types';

export default function CustomDashboard() {
  const [languageTile, setLanguageTile] = useState<LanguageTile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch tile data
    fetch('/api/tiles/language?companyId=...')
      .then(res => res.json())
      .then(data => setLanguageTile(data.tile))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6">
      {languageTile && (
        <LanguageTileWidget
          tile={languageTile}
          loading={loading}
          onExport={() => {
            // Custom export logic
            const dataStr = JSON.stringify(languageTile, null, 2);
            downloadFile(dataStr, 'language-tile.json');
          }}
        />
      )}
    </div>
  );
}
```

---

## Performance

### Caching Strategy

Tiles are cached at multiple layers:
1. **Redis Cache**: 1-hour TTL for aggregated tiles
2. **CDN Cache** (production): Edge caching for static exports
3. **Browser Cache**: Client-side caching via `Cache-Control` headers

**Cache Keys**:
```
tiles:{tileType}:{companyId}:{startDate}:{endDate}
```

**Cache Invalidation**:
- Automatic after 1 hour
- Manual via `/metrics/aggregate` endpoint (triggers recalculation)

### Performance Targets

- **P95 Latency**: ≤150ms (target)
- **P99 Latency**: ≤300ms
- **Cache Hit Rate**: ≥95%
- **Throughput**: 100+ req/sec per instance

### Optimization Techniques

1. **Query Optimization**:
   - Indexed queries on `companyId`, `scheduledAt`, `startedAt`
   - Aggregations pushed to database layer
   - Limit subqueries with `LIMIT` clauses

2. **Data Denormalization**:
   - Pre-computed metrics in `metrics_company_period` table
   - Incremental aggregation via scheduled jobs

3. **Parallel Fetching**:
   - Fetch all tiles concurrently with `Promise.all()`
   - Independent tile calculations (no cross-tile dependencies)

---

## Feature Flags & Entitlements

Tiles support feature-gated access based on company tier:

```typescript
interface TileEntitlements {
  canExport: boolean;        // Export tile data as JSON/CSV
  canViewDetails: boolean;   // Drill-down into evidence/lineage
  canViewBenchmarks: boolean; // Compare against industry benchmarks (premium)
}
```

**Implementation** (in API route):
```typescript
const entitlements = {
  canExport: true,
  canViewDetails: true,
  canViewBenchmarks: company.tier === 'enterprise', // Premium feature
};
```

**Frontend Usage**:
```tsx
{entitlements.canExport && (
  <button onClick={handleExport}>Export Data</button>
)}
```

---

## Accessibility

### WCAG 2.2 AA Compliance

- **Keyboard Navigation**: All tiles are keyboard-accessible
  - `Tab` to navigate between tiles
  - `Enter`/`Space` to activate export buttons
  - `Escape` to close modals
- **Screen Readers**: ARIA labels on all interactive elements
  - `role="region"` on tile containers
  - `aria-label` on metric rows
  - `role="progressbar"` on progress bars with `aria-valuenow`/`aria-valuemax`
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text
- **Focus Indicators**: Visible focus outlines on all interactive elements

### Testing

Run accessibility audits with:
```bash
# Axe DevTools
pnpm dlx @axe-core/cli http://localhost:4321/cockpit/[companyId]

# Pa11y
pnpm dlx pa11y --runner axe http://localhost:4321/cockpit/[companyId]
```

---

## Testing

### Unit Tests

Run tile aggregator tests:
```bash
cd services/analytics
pnpm test src/__tests__/tiles.test.ts
```

**Test Coverage**:
- Zero-data scenarios
- Sample data calculations
- Retention/funnel metrics
- Locale aggregation
- Stage progression (WEEI)

### Contract Tests

API contract tests (via Playwright):
```bash
cd services/analytics
pnpm test:contract
```

**Validates**:
- Request/response schemas (Zod validation)
- HTTP status codes
- Cache headers
- Error handling

### Visual Regression Tests

Visual snapshot tests for tile widgets:
```bash
cd apps/corp-cockpit-astro
pnpm test:visual
```

**Snapshots**:
- Loading states
- Error states
- Populated tiles with sample data

---

## Troubleshooting

### Tiles Not Loading

**Symptoms**: Empty tiles or "No data available"

**Checks**:
1. Verify `companyId` is correct and has data
2. Check period dates are valid (start < end)
3. Ensure analytics service is running (`curl http://localhost:3008/health`)
4. Check database connectivity (`curl http://localhost:3008/health/dependencies`)

**Logs**:
```bash
docker logs teei-analytics-service --tail=100
```

### Slow Tile Performance

**Symptoms**: Tiles take >2 seconds to load

**Checks**:
1. Check cache hit rate: `curl http://localhost:3008/v1/analytics/metrics/cache/stats`
2. Verify Redis is running: `redis-cli ping` (should return `PONG`)
3. Check database query performance:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM kintell_sessions WHERE ...
   ```
4. Monitor ClickHouse queries (if using ClickHouse sink)

**Solutions**:
- Warm cache: Call `/metrics/aggregate` for recent periods
- Increase cache TTL (default: 1 hour)
- Add database indexes on `scheduledAt`, `startedAt`, `companyId`

### Incorrect Metrics

**Symptoms**: Tile metrics don't match expected values

**Checks**:
1. Verify source data exists in database
2. Check period boundaries (inclusive/exclusive)
3. Validate filter logic (e.g., `sessionType='language'`)
4. Review aggregation logic in `services/analytics/src/tiles/*.ts`

**Debugging**:
```typescript
// Add logging to tile aggregators
console.log('Sessions found:', sessions.length);
console.log('Period:', actualPeriod);
```

---

## Deployment

### Environment Variables

```bash
# Analytics Service
PORT_ANALYTICS=3008
DATABASE_URL=postgresql://user:pass@localhost:5432/teei
REDIS_URL=redis://localhost:6379
CLICKHOUSE_URL=http://localhost:8123
NATS_URL=nats://localhost:4222

# Frontend (Astro)
PUBLIC_ANALYTICS_URL=http://localhost:3008
```

### Production Checklist

- [ ] Enable Redis caching with 1-hour TTL
- [ ] Set up CDN caching for static exports
- [ ] Configure rate limiting (100 req/min per company)
- [ ] Enable JWT authentication via API Gateway
- [ ] Set up Grafana dashboards for tile API metrics
- [ ] Configure alerting for P95 latency >150ms
- [ ] Run security audit: `pnpm audit`
- [ ] Run accessibility audit: `pnpm a11y:audit`
- [ ] Verify OpenAPI spec is up-to-date: `packages/openapi/tiles.yaml`

---

## OpenAPI Specification

Full API specification available at:
```
/packages/openapi/tiles.yaml
```

Import into Postman, Insomnia, or Swagger UI for interactive API documentation.

---

## Support

For issues or questions, contact:
- **Worker 3 Team**: Corporate Cockpit & Metrics
- **GitHub**: Open an issue with `[Worker 3]` prefix
- **Slack**: #worker3-cockpit

---

## Changelog

### v1.0.0 (2024-11-17)
- Initial release
- 4 tile types: Language, Mentorship, Upskilling, WEEI
- Backend aggregators with caching
- Frontend React/Astro widgets
- OpenAPI specification
- Unit and contract tests
- WCAG 2.2 AA compliance
