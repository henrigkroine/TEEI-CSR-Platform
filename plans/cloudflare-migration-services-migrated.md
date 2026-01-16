# Services Migration Summary
**Date:** 2025-01-27  
**Status:** ✅ Complete

---

## Overview

Successfully migrated 3 high-priority microservices to Astro API routes with D1 database support:

1. **Reporting Service** (port 3001) - SROI/VIS calculations
2. **Analytics Service** (port 3007) - Metrics endpoints
3. **Campaigns Service** (port 3002) - Campaign management

---

## Files Created

### Calculator Libraries (Migrated Logic)

1. **`apps/corp-cockpit-astro/src/lib/calculators/sroi.ts`**
   - Ported SROI calculation logic from `services/reporting/src/calculators/sroi.ts`
   - Includes `calculateSROI()` function and `getSROIForCompany()` D1 query function
   - SROI weights and constants preserved

2. **`apps/corp-cockpit-astro/src/lib/calculators/vis.ts`**
   - Ported VIS calculation logic from `services/reporting/src/calculators/vis.ts`
   - Includes `calculateVIS()` function and `getVISForCompany()` D1 query function
   - VIS weights and constants preserved

### API Routes (Replaced Microservice Endpoints)

3. **`apps/corp-cockpit-astro/src/pages/api/companies/[companyId]/sroi.ts`**
   - GET `/api/companies/:companyId/sroi?period=2024-Q1`
   - Replaces: `http://localhost:3001/companies/:id/sroi`

4. **`apps/corp-cockpit-astro/src/pages/api/companies/[companyId]/vis.ts`**
   - GET `/api/companies/:companyId/vis?period=2024-Q1&top=10`
   - Replaces: `http://localhost:3001/companies/:id/vis`

5. **`apps/corp-cockpit-astro/src/pages/api/campaigns.ts`** (Updated)
   - GET `/api/campaigns?companyId=xxx&status=active&limit=50&offset=0`
   - Replaces: `http://localhost:3002/api/campaigns`
   - Now uses D1 directly instead of proxying

6. **`apps/corp-cockpit-astro/src/pages/api/campaigns/[id].ts`** (New)
   - GET `/api/campaigns/:id`
   - Replaces: `http://localhost:3002/api/campaigns/:id`

7. **`apps/corp-cockpit-astro/src/pages/api/campaigns/[id]/transition.ts`** (New)
   - POST `/api/campaigns/:id/transition`
   - Replaces: `http://localhost:3002/api/campaigns/:id/transition`

8. **`apps/corp-cockpit-astro/src/pages/api/analytics/metrics/company/[companyId]/period/[period].ts`** (New)
   - GET `/api/analytics/metrics/company/:companyId/period/:period`
   - Replaces: `http://localhost:3007/v1/analytics/metrics/company/:companyId/period/:period`

### Frontend Updates

9. **`apps/corp-cockpit-astro/src/api/dashboard.ts`** (Updated)
   - Updated all service URLs to use Astro API routes
   - Changed from microservice URLs to relative paths
   - Functions updated:
     - `fetchSROI()` → `/api/companies/:id/sroi`
     - `fetchVIS()` → `/api/companies/:id/vis`
     - `fetchAICoverage()` → `/api/analytics/metrics/company/:id/period/:period`
     - `fetchMetricsWithTrend()` → `/api/analytics/metrics/company/:id/period/:period`

---

## Database Schema Requirements

The migrated routes expect the following D1 tables (from migration plan):

### Core Tables
- `companies` - Tenant companies
- `volunteers` - Volunteer data
- `volunteer_sessions` - Volunteer activities
- `outcome_scores` - Outcome measurements
- `campaigns` - Campaign management
- `sroi_snapshots` - Calculated SROI metrics

### Key Fields Used

**volunteer_sessions:**
- `volunteer_id`, `company_id`, `duration_minutes`, `session_date`

**outcome_scores:**
- `company_id`, `dimension`, `score`, `confidence`, `period`

**campaigns:**
- `id`, `name`, `company_id`, `status`, `start_date`, `end_date`, `quarter`, etc.

**sroi_snapshots:**
- `company_id`, `period`, `period_start`, `period_end`, `sroi_ratio`, `avg_vis_score`

---

## Migration Notes

### SQLite/D1 Differences

1. **Date Functions:**
   - PostgreSQL: `EXTRACT(YEAR FROM date)`, `EXTRACT(QUARTER FROM date)`
   - SQLite: `strftime('%Y', date)`, `CAST(strftime('%m', date) AS INTEGER)`

2. **Date Arithmetic:**
   - PostgreSQL: `MAX(date) - MIN(date)`
   - SQLite: `julianday(MAX(date)) - julianday(MIN(date))`

3. **Parameter Binding:**
   - Both use `?` placeholders, but D1 uses `.bind()` instead of array parameters

### Simplified Queries

Some complex PostgreSQL queries were simplified for D1:
- Removed complex CTEs where possible
- Simplified date filtering
- Used basic aggregations

### Missing Features (To Be Implemented)

1. **Caching:** Original services used Redis caching - need Cloudflare KV or remove caching
2. **Complex Analytics:** Some advanced analytics features may need simplification
3. **Background Jobs:** Campaign metrics aggregation jobs need Cloudflare Workers/Cron
4. **Validation:** Some Zod schemas from campaigns service not yet ported

---

## Testing Checklist

- [ ] Test SROI calculation with sample data
- [ ] Test VIS calculation with sample data
- [ ] Test campaign listing with filters
- [ ] Test campaign state transitions
- [ ] Test analytics metrics endpoint
- [ ] Verify frontend dashboard still works
- [ ] Test error handling (missing data, invalid IDs)
- [ ] Test period parsing (YYYY-Q1, YYYY-MM formats)

---

## Next Steps

1. **Create D1 Database Schema** - Run migrations from Phase 3 of migration plan
2. **Test Endpoints** - Verify all routes work with D1
3. **Update Remaining API Clients** - Check for other files using old service URLs
4. **Remove Microservice Dependencies** - Clean up unused service references
5. **Add Error Handling** - Improve error messages and validation
6. **Add Caching** - Implement Cloudflare KV caching if needed

---

## Breaking Changes

### API Response Format

Some endpoints may return slightly different response formats:
- Campaigns API now returns `{ success: true, campaigns: [...] }` instead of direct array
- Metrics API structure may differ slightly

### Environment Variables

The following env vars are no longer needed (can be removed):
- `PUBLIC_REPORTING_API_URL`
- `PUBLIC_ANALYTICS_SERVICE_URL`
- `PUBLIC_CAMPAIGNS_SERVICE_URL`

---

## Performance Considerations

1. **Database Queries:** D1 queries may be slower than PostgreSQL for complex aggregations
2. **Caching:** Consider adding Cloudflare KV caching for expensive calculations
3. **Rate Limiting:** Cloudflare Pages has request limits - monitor usage
4. **Cold Starts:** First request after inactivity may be slower

---

**Migration Status:** ✅ Complete  
**Ready for Testing:** Yes  
**Ready for Production:** After testing and D1 schema creation
