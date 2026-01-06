# Demo Mode Implementation

**Date**: 2025-01-27  
**Feature**: Enterprise Demo Hardening for Corporate Cockpit  
**Status**: ✅ Complete

---

## Overview

Demo mode enables the Corporate Cockpit executive dashboard to display live KPI numbers sourced from a CSV file for two programmes:
- **Language Connect for Ukraine**
- **Mentorship for Ukraine**

The implementation is isolated behind a single demo-mode switch, non-destructive (production API and SSE paths remain intact), and includes enterprise-level UX polish.

---

## How to Enable Demo Mode

### Environment Variable (Recommended)

Set the `DEMO_MODE_ENABLED` environment variable:

```bash
# Enable demo mode
export DEMO_MODE_ENABLED=true

# Or in .env file
DEMO_MODE_ENABLED=true
```

### Client-Side Override (Development)

For client-side testing, you can also enable demo mode via browser localStorage:

```javascript
localStorage.setItem('demo_mode_enabled', 'true');
```

To disable:
```javascript
localStorage.removeItem('demo_mode_enabled');
```

---

## CSV File Location

### Default Location

The demo CSV file should be placed at:

```
data/demo-metrics.csv
```

This is relative to the project root (`apps/corp-cockpit-astro/` when running from workspace root).

### Custom Location

You can specify a custom CSV path via environment variable:

```bash
export DEMO_CSV_PATH=/path/to/your/demo-metrics.csv
```

---

## Expected CSV Columns

The CSV file must include the following columns:

### Required Columns

| Column | Type | Description |
|--------|------|-------------|
| `programme` | string | Programme identifier: `language_connect` or `mentorship` |
| `participants` | integer | Number of active participants |
| `sessions` | integer | Total number of sessions |
| `active_mentors` | integer | Number of active mentors |
| `matches` | integer | Number of matches made |
| `completion` | float | Completion percentage (0-100) |
| `satisfaction` | float | Satisfaction score (0-100) |

### Optional Columns

| Column | Type | Description |
|--------|------|-------------|
| `total_hours` | integer | Total volunteer hours |
| `volunteers` | integer | Total number of volunteers |
| `integration_avg` | float | Average integration score (0-1) |
| `language_avg` | float | Average language proficiency (0-1) |
| `job_readiness_avg` | float | Average job readiness score (0-1) |
| `sroi_ratio` | float | Social Return on Investment ratio |
| `vis_score` | float | Volunteer Impact Score (0-100) |

### CSV Format

- **Header row**: Required, case-insensitive
- **Delimiter**: Comma (`,`)
- **Quoting**: Values may be quoted with double quotes
- **Encoding**: UTF-8

### Example CSV

```csv
programme,participants,sessions,active_mentors,matches,completion,satisfaction,total_hours,volunteers,integration_avg,language_avg,job_readiness_avg,sroi_ratio,vis_score
language_connect,150,320,45,120,85.5,92.3,1250,30,0.75,0.82,0.68,4.2,78
mentorship,200,450,60,180,78.2,88.7,1800,40,0.70,0.65,0.72,4.5,82
```

---

## How to Validate Dashboard is Reading Correct Data

### 1. Check Demo Mode Status

Visit the demo status endpoint:

```bash
curl http://localhost:4321/api/demo/status
```

Expected response when enabled:
```json
{
  "enabled": true,
  "csvExists": true,
  "csvPath": "data/demo-metrics.csv",
  "lastModified": "2025-01-27T10:30:00.000Z",
  "size": 234
}
```

### 2. Check Demo Metrics

Fetch the normalized metrics:

```bash
curl http://localhost:4321/api/demo/metrics
```

Expected response structure:
```json
{
  "language_connect": {
    "programme": "language_connect",
    "participants": 150,
    "sessions": 320,
    "active_mentors": 45,
    "matches": 120,
    "completion": 85.5,
    "satisfaction": 92.3,
    "total_hours": 1250,
    "volunteers": 30,
    "integration_avg": 0.75,
    "language_avg": 0.82,
    "job_readiness_avg": 0.68,
    "sroi_ratio": 4.2,
    "vis_score": 78
  },
  "mentorship": {
    "programme": "mentorship",
    "participants": 200,
    "sessions": 450,
    "active_mentors": 60,
    "matches": 180,
    "completion": 78.2,
    "satisfaction": 88.7,
    "total_hours": 1800,
    "volunteers": 40,
    "integration_avg": 0.70,
    "language_avg": 0.65,
    "job_readiness_avg": 0.72,
    "sroi_ratio": 4.5,
    "vis_score": 82
  },
  "aggregate": {
    "participants": 350,
    "sessions": 770,
    "active_mentors": 105,
    "matches": 300,
    "completion": 81.85,
    "satisfaction": 90.5,
    "total_hours": 3050,
    "volunteers": 70
  },
  "lastUpdated": "2025-01-27T10:30:00.000Z",
  "csvPath": "data/demo-metrics.csv"
}
```

### 3. Visual Validation on Dashboard

When demo mode is enabled, you should see:

1. **Demo Mode Banner**: Yellow banner at the top showing "Data source: Demo CSV" and last updated timestamp
2. **Programme Tabs**: Tabs to switch between "All Programmes", "Language Connect for Ukraine", and "Mentorship for Ukraine"
3. **Consistent Numbers**: All widgets should show consistent numbers that match the CSV data
4. **Loading States**: Deliberate loading animations when data is being fetched
5. **Empty State**: Clear message if CSV is missing, showing where to place it
6. **Error State**: Human-readable error messages with retry action if something goes wrong

### 4. Verify Widget Data

Check that widgets display data from CSV:

- **AtAGlance Widget**: Should show participants, sessions, hours, volunteers from CSV
- **SROI Panel**: Should calculate SROI using CSV data (or default 4.2x if not in CSV)
- **VIS Panel**: Should show VIS scores from CSV (or default 75 if not in CSV)

### 5. Programme Filtering

Test programme tabs:
- Select "Language Connect for Ukraine" → Widgets should show only language_connect data
- Select "Mentorship for Ukraine" → Widgets should show only mentorship data
- Select "All Programmes" → Widgets should show aggregate data

---

## Architecture

### Components

1. **Demo Data Service** (`src/lib/demo/demoDataService.ts`)
   - Reads and parses CSV file
   - Normalizes metrics by programme
   - Provides caching (1-minute TTL)

2. **Demo Config** (`src/lib/demo/demoConfig.ts`)
   - Centralized demo mode configuration
   - Environment variable and localStorage support

3. **Widget Adapter** (`src/lib/demo/widgetAdapter.ts`)
   - Transforms demo metrics into widget-specific formats
   - Supports programme filtering

4. **API Endpoints** (`src/pages/api/demo/`)
   - `/api/demo/metrics` - Returns normalized metrics
   - `/api/demo/status` - Returns demo mode status and CSV info

5. **React Hooks** (`src/hooks/useDemoData.ts`)
   - Client-side hook for fetching demo data
   - Handles loading, error, and empty states

6. **UI Components** (`src/components/demo/`)
   - `DemoModeBanner` - Shows demo mode indicator
   - `DemoEmptyState` - Shows when CSV is missing
   - `DemoErrorState` - Shows error with retry
   - `ProgrammeTabs` - Programme filter tabs

### Data Flow

```
CSV File → DemoDataService → API Endpoint → useDemoData Hook → Widgets
```

1. CSV file is read by `DemoDataService` (server-side)
2. Metrics are normalized and cached
3. API endpoints expose metrics to client
4. `useDemoData` hook fetches from API
5. Widgets use adapted data via hook

---

## Testing

### Unit Tests

Run unit tests for CSV parsing and widget adaptation:

```bash
cd apps/corp-cockpit-astro
pnpm test src/lib/demo/demoDataService.test.ts
pnpm test src/lib/demo/widgetAdapter.test.ts
```

### Integration Test

Run integration test for dashboard route:

```bash
cd apps/corp-cockpit-astro
pnpm test tests/integration/dashboard-demo.test.ts
```

---

## Troubleshooting

### CSV File Not Found

**Symptom**: Empty state shows "CSV file not found"

**Solution**:
1. Verify CSV file exists at `data/demo-metrics.csv` (relative to project root)
2. Check file permissions (must be readable)
3. Verify `DEMO_CSV_PATH` environment variable if using custom path

### Demo Mode Not Enabled

**Symptom**: Dashboard shows production data instead of demo data

**Solution**:
1. Set `DEMO_MODE_ENABLED=true` environment variable
2. Restart the development server
3. Check browser console for demo mode status

### Inconsistent Numbers Across Widgets

**Symptom**: Different widgets show different numbers

**Solution**:
1. Verify CSV data is consistent (aggregate = sum of programmes)
2. Clear demo data cache (restart server)
3. Check that all widgets are using demo data (not production API)

### Programme Tabs Not Working

**Symptom**: Programme tabs don't filter data

**Solution**:
1. Verify CSV has both `language_connect` and `mentorship` rows
2. Check that programme values are exactly `language_connect` or `mentorship` (case-sensitive)
3. Verify widgets are using `useDemoData` hook

---

## CSV Schema and Update Cadence

### Schema Documentation

The CSV schema is documented in the code at `src/lib/demo/demoDataService.ts`. Key points:

- Programme values must be exactly `language_connect` or `mentorship`
- Numeric columns should be valid numbers (integers or floats)
- Percentage columns (completion, satisfaction) should be 0-100
- Score columns (integration_avg, etc.) should be 0-1

### Update Cadence

The demo data service caches metrics for **1 minute** (60 seconds). To see updated data:

1. Update the CSV file
2. Wait up to 1 minute for cache to expire, OR
3. Restart the server to clear cache immediately

For production demos, consider:
- Updating CSV file daily/weekly
- Using a file watcher to auto-reload on CSV changes
- Implementing a cache invalidation endpoint

---

## Production Considerations

### Security

- Demo mode should **never** be enabled in production
- CSV file should not contain real PII or sensitive data
- Demo endpoints should be rate-limited

### Performance

- CSV parsing is cached (1-minute TTL)
- File is read synchronously (acceptable for demo use)
- For high-traffic demos, consider Redis caching

### Monitoring

- Monitor demo mode usage via analytics
- Log CSV parse errors
- Alert if demo mode is accidentally enabled in production

---

## Files Modified/Created

### New Files

- `src/lib/demo/demoDataService.ts` - CSV ingestion and normalization
- `src/lib/demo/demoConfig.ts` - Demo mode configuration
- `src/lib/demo/widgetAdapter.ts` - Widget data transformation
- `src/api/demo.ts` - Demo API client
- `src/hooks/useDemoData.ts` - React hook for demo data
- `src/components/demo/DemoModeBanner.tsx` - Demo mode indicator
- `src/components/demo/DemoEmptyState.tsx` - Empty state component
- `src/components/demo/DemoErrorState.tsx` - Error state component
- `src/components/demo/ProgrammeTabs.tsx` - Programme filter tabs
- `src/pages/api/demo/metrics.ts` - Metrics API endpoint
- `src/pages/api/demo/status.ts` - Status API endpoint
- `src/lib/demo/demoDataService.test.ts` - Unit tests
- `src/lib/demo/widgetAdapter.test.ts` - Unit tests
- `tests/integration/dashboard-demo.test.ts` - Integration test
- `data/demo-metrics.csv` - Example CSV file
- `DEMO_MODE_IMPLEMENTATION.md` - This documentation

### Modified Files

- `src/pages/[lang]/cockpit/[companyId]/index.astro` - Added demo mode banner

---

## Next Steps

1. **Widget Integration**: Update remaining widgets (SROIPanel, VISPanel) to use demo data
2. **Programme Tabs Integration**: Wire programme tabs to filter widget data
3. **CSV Validation**: Add CSV schema validation on file load
4. **Auto-refresh**: Implement auto-refresh when CSV file changes
5. **Export Demo Data**: Add ability to export current demo metrics to CSV

---

**Status**: ✅ Implementation Complete  
**Last Updated**: 2025-01-27
