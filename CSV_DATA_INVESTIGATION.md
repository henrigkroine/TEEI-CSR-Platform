# CSV Data Pipeline Investigation Report

**Investigator**: Cursor Worker 1 (Forensic Investigation)  
**Date**: 2025-01-27  
**Scope**: Language Connect for Ukraine & Mentors for Ukraine  
**Status**: ✅ Complete

---

## Executive Summary

**Answer: YES, CSV-based data pipelines exist and are wired into Corporate Cockpit.**

Both programs have documented CSV formats, functional import endpoints, and data flows that transform CSV data into dashboard metrics. The system is production-ready with batch tracking, error handling, and lineage support.

---

## Findings Summary

### ✅ CSV Formats Exist

**Location**: `docs/kintell/KINTELL_CSV_FORMATS.md`

Both programs have fully documented CSV schemas:

1. **Mentors for Ukraine** (Mentorship Sessions)
   - Schema Version: 1.0
   - Effective Date: 2025-01-01
   - Status: Active

2. **Language Connect for Ukraine** (Language Practice Sessions)
   - Schema Version: 1.1 (current)
   - Effective Date: 2025-06-01 (v1.1), 2025-01-01 (v1.0)
   - Status: Active

### ✅ CSV Parsing & Validation

**Location**: `services/kintell-connector/src/validation/csv-schema.ts`

- **Zod-based validation** with versioned schemas
- **Schema registry** supporting multiple versions
- **Auto-detection** of program type by filename or column presence
- **Error reporting** with row-level validation

**Key Functions**:
- `validateRow()` - Validates CSV rows against schema
- `detectSchemaVersion()` - Auto-detects schema version from headers
- `getLatestVersion()` - Returns latest supported version

### ✅ Import Endpoints

**Location**: `services/kintell-connector/src/routes/import.ts`

**Available Endpoints**:

1. **POST `/import/kintell-sessions`** - Bulk CSV import
   - Parses CSV using `csv-parse`
   - Maps rows to sessions via `mapCSVRowToSession()`
   - Inserts into `kintell_sessions` table
   - Emits `kintell.session.completed` events

2. **POST `/import/backfill/start`** - Start backfill job
   - Creates batch tracking record
   - Supports checkpoint/resume for large files
   - Returns job ID for status tracking

3. **GET `/import/backfill/:jobId/status`** - Get job progress
   - Returns processed/successful/failed row counts
   - Provides percent complete

4. **GET `/import/backfill/:jobId/errors`** - Download error CSV
   - Returns human-readable error file
   - Includes row numbers and error messages

5. **POST `/import/backfill/:jobId/resume`** - Resume from checkpoint
   - Supports resuming interrupted imports

### ✅ Data Flow Architecture

```
CSV File
  ↓
POST /import/kintell-sessions
  ↓
csv-parse (streaming parser)
  ↓
mapCSVRowToSession() (mapper)
  ↓
Validation (Zod schemas)
  ↓
User Lookup (participant_email, volunteer_email)
  ↓
Campaign Association (SWARM 6 - optional)
  ↓
INSERT INTO kintell_sessions
  ↓
Event: kintell.session.completed (NATS)
  ↓
Analytics Aggregation
  ↓
metrics_company_period table
  ↓
Corporate Cockpit API
  ↓
GET /metrics/company/:id/period/current
  ↓
Dashboard Display
```

### ✅ Storage & Database Schema

**Table**: `kintell_sessions` (defined in `packages/shared-schema/src/schema/kintell.ts`)

**Key Fields**:
- `externalSessionId` - CSV `session_id`
- `sessionType` - 'language' or 'mentorship' (from CSV or auto-detected)
- `participantId` - FK to `users` (resolved from `participant_email`)
- `volunteerId` - FK to `users` (resolved from `volunteer_email` or `mentor_email`)
- `scheduledAt` - From CSV `scheduled_at`
- `completedAt` - From CSV `completed_at`
- `durationMinutes` - From CSV `duration_minutes`
- `rating` - From CSV `rating` (normalized to 0-1)
- `feedbackText` - From CSV `feedback_text`
- `languageLevel` - From CSV `language_level` (Language program only)
- `programInstanceId` - FK to `program_instances` (SWARM 6)
- `batchId` - FK to `ingestion_batches` (lineage tracking)

**Batch Tracking Table**: `ingestion_batches`
- Tracks file name, hash, size, import date
- Prevents duplicate imports
- Links to `kintell_sessions` via `batchId`

### ✅ Metrics Aggregation

**Location**: `services/analytics/src/tiles/`

**Language Program Aggregator**: `language-aggregator.ts`
- Queries `kintell_sessions` WHERE `sessionType = 'language'`
- Calculates: sessions per week, volunteer hours, retention rate, attendance rate
- Aggregates by company and period

**Mentorship Program Aggregator**: `mentorship-aggregator.ts`
- Queries `kintell_sessions` WHERE `sessionType = 'mentorship'`
- Calculates: bookings, attendance rate, no-show rate, repeat mentoring
- Aggregates by company and period

**Metrics API**: `services/analytics/src/routes/metrics.ts`
- `GET /metrics/company/:companyId/period/:period` - Returns aggregated metrics
- `GET /metrics/sroi/:companyId` - Calculates SROI from sessions
- `GET /metrics/vis/:companyId` - Calculates VIS from sessions

### ✅ Corporate Cockpit Integration

**Location**: `apps/corp-cockpit-astro/src/pages/index.astro`

**Data Fetching**:
```typescript
// Fetch current period metrics
metrics = await apiClient.get(`/metrics/company/${companyId}/period/current`);

// Fetch previous period for comparison
previousMetrics = await apiClient.get(`/metrics/company/${companyId}/period/previous`);
```

**Displayed Metrics**:
- Participants count (from `metrics.participantsCount`)
- Volunteers count (from `metrics.volunteersCount`)
- Sessions count (from `metrics.sessionsCount`)
- Average integration score
- Average language level
- SROI ratio
- VIS score

**Impact Tiles**: `docs/cockpit/tiles.md`
- Language Learning Tile - Aggregates `kintell_sessions` (sessionType='language')
- Mentorship Tile - Aggregates `kintell_sessions` (sessionType='mentorship')

---

## File Paths

### Documentation
- `docs/kintell/KINTELL_CSV_FORMATS.md` - CSV schema specifications
- `docs/kintell/PROGRAM_INSTANCES.md` - Program instance detection logic
- `docs/kintell/DATA_LINEAGE.md` - Batch tracking and lineage
- `docs/cockpit/tiles.md` - Impact tiles documentation

### Implementation
- `services/kintell-connector/src/validation/csv-schema.ts` - Zod validation schemas
- `services/kintell-connector/src/routes/import.ts` - Import endpoints
- `services/kintell-connector/src/mappers/session-mapper.ts` - CSV row to session mapping
- `services/kintell-connector/src/utils/backfill.ts` - Backfill job processing
- `services/analytics/src/tiles/language-aggregator.ts` - Language metrics aggregation
- `services/analytics/src/tiles/mentorship-aggregator.ts` - Mentorship metrics aggregation
- `services/analytics/src/routes/metrics.ts` - Metrics API endpoints
- `apps/corp-cockpit-astro/src/pages/index.astro` - Dashboard page

### Sample Data (Testing Only)
- `services/kintell-connector/src/sample-data/kintell-sessions.csv` - Sample CSV for testing
- `services/kintell-connector/test.http` - Test HTTP requests

### Database Schema
- `packages/shared-schema/src/schema/kintell.ts` - `kintell_sessions` table definition
- `packages/shared-schema/src/schema/ingestion-batches.ts` - `ingestion_batches` table definition

---

## CSV Schemas

### Mentors for Ukraine (v1.0)

| Column Name | Type | Required | Format | Example |
|-------------|------|----------|--------|---------|
| `session_id` | string | ✅ Yes | 1-255 chars | `MS-2024-001` |
| `participant_email` | email | ✅ Yes | Valid email | `anna@example.com` |
| `mentor_email` | email | ✅ Yes | Valid email | `john@corp.com` |
| `scheduled_at` | datetime | ✅ Yes | ISO 8601 | `2025-11-13T10:00:00Z` |
| `completed_at` | datetime | ⚪ Optional | ISO 8601 | `2025-11-13T11:00:00Z` |
| `duration_minutes` | integer | ⚪ Optional | 1-480 | `60` |
| `rating` | decimal | ⚪ Optional | 0.0-1.0 or 1-5 | `0.95` or `5` |
| `feedback_text` | text | ⚪ Optional | 0-5000 chars | `"Great session"` |
| `focus_area` | string | ⚪ Optional | 0-255 chars | `career` |
| `goals_discussed` | string | ⚪ Optional | 0-1000 chars | `CV,interview,LinkedIn` |

### Language Connect for Ukraine (v1.1)

| Column Name | Type | Required | Format | Example |
|-------------|------|----------|--------|---------|
| `session_id` | string | ✅ Yes | 1-255 chars | `LS-2024-001` |
| `participant_email` | email | ✅ Yes | Valid email | `anna@example.com` |
| `volunteer_email` | email | ✅ Yes | Valid email | `tutor@corp.com` |
| `scheduled_at` | datetime | ✅ Yes | ISO 8601 | `2025-11-13T10:00:00Z` |
| `completed_at` | datetime | ⚪ Optional | ISO 8601 | `2025-11-13T11:00:00Z` |
| `duration_minutes` | integer | ⚪ Optional | 1-480 | `60` |
| `rating` | decimal | ⚪ Optional | 0.0-1.0 or 1-5 | `0.95` or `5` |
| `feedback_text` | text | ⚪ Optional | 0-5000 chars | `"Great progress"` |
| `language_level` | CEFR | ⚪ Optional | A1/A2/B1/B2/C1/C2 | `B2` |
| `topics` | string | ⚪ Optional | 0-1000 chars | `grammar,conversation` |
| `metadata` | JSON string | ⚪ Optional | 0-2000 chars | `{"focus":"pronunciation"}` |

---

## Update Mechanism

### Current Implementation

**Manual Upload** (Primary Method):
- CSV files uploaded via HTTP POST to `/import/kintell-sessions`
- Files can be uploaded via:
  - Direct API call (curl, Postman, etc.)
  - CLI tool (if implemented)
  - Web UI (if implemented)

**Backfill Jobs** (Large Files):
- For large CSV files, use `/import/backfill/start`
- Supports checkpoint/resume for reliability
- Generates error CSV for failed rows

### Auto-Detection Strategy

**By Filename**:
- `mentors-for-ukraine-2024-Q4.csv` → `program_type: mentors_ukraine`
- `language-for-ukraine-2024-11.csv` → `program_type: language_ukraine`
- `kintell-mentorship-export.csv` → `program_type: mentors_ukraine` (fuzzy match)
- `kintell-language-export.csv` → `program_type: language_ukraine` (fuzzy match)

**By Column Presence**:
- Has `language_level` column → Language program
- Has `focus_area` column → Mentors program
- Has `metadata` column → Language program (v1.1+)

**By Session ID Prefix**:
- `MS-*` or `MENTOR-*` → Mentors program
- `LS-*` or `LANG-*` → Language program

### Scheduled Import

**Status**: ❌ Not Currently Implemented

No scheduled/cron-based import mechanism found. All imports are manual/on-demand.

---

## Data Flow Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────┐
│ CSV File (mentors-for-ukraine-2024-Q4.csv)                      │
│ or (language-for-ukraine-2024-11.csv)                           │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /import/kintell-sessions                                    │
│ (services/kintell-connector/src/routes/import.ts)               │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ csv-parse (streaming parser)                                     │
│ - columns: true                                                  │
│ - skip_empty_lines: true                                         │
│ - trim: true                                                     │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ mapCSVRowToSession()                                             │
│ (services/kintell-connector/src/mappers/session-mapper.ts)     │
│ - Normalizes session type                                        │
│ - Normalizes rating (1-5 → 0-1)                                 │
│ - Maps CSV columns to internal format                           │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Validation (Zod schemas)                                         │
│ (services/kintell-connector/src/validation/csv-schema.ts)      │
│ - LanguageSessionSchemaV1 / V1_1                                │
│ - MentorshipSessionSchemaV1                                      │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ User Lookup                                                      │
│ - Find participant by participant_email                         │
│ - Find volunteer by volunteer_email or mentor_email             │
│ - Create users if not exists (identity resolution)              │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Campaign Association (SWARM 6 - optional)                        │
│ - Associate session to program_instance                         │
│ - Links to campaign for metrics                                 │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ INSERT INTO kintell_sessions                                     │
│ (PostgreSQL table)                                               │
│ - externalSessionId, sessionType, participantId, volunteerId    │
│ - scheduledAt, completedAt, durationMinutes, rating             │
│ - feedbackText, languageLevel, programInstanceId, batchId       │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Event: kintell.session.completed                                 │
│ (NATS event bus)                                                 │
│ - Triggers downstream processing                                 │
│ - Q2Q pipeline (qualitative → quantitative)                     │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Analytics Aggregation                                            │
│ (services/analytics/src/tiles/)                                  │
│ - aggregateLanguageTile() - Queries kintell_sessions            │
│ - aggregateMentorshipTile() - Queries kintell_sessions          │
│ - Calculates: sessions, hours, retention, attendance            │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ metrics_company_period table                                     │
│ (PostgreSQL)                                                     │
│ - Aggregated metrics per company per period                      │
│ - participantsCount, volunteersCount, sessionsCount             │
│ - avgIntegrationScore, avgLanguageLevel, sroiRatio, visScore   │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Corporate Cockpit API                                            │
│ GET /metrics/company/:id/period/current                         │
│ (services/analytics/src/routes/metrics.ts)                       │
│ - Returns aggregated metrics                                     │
│ - Cached (Redis) with 1-hour TTL                                │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Corporate Cockpit Dashboard                                      │
│ (apps/corp-cockpit-astro/src/pages/index.astro)                 │
│ - Displays: participants, volunteers, sessions, SROI, VIS       │
│ - Shows trends vs previous period                                │
│ - Impact tiles for Language & Mentorship programs                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboard vs Reports Usage

### ✅ Dashboard Usage (Real-time)

**Corporate Cockpit Dashboard** (`apps/corp-cockpit-astro/src/pages/index.astro`):
- **Data Source**: `metrics_company_period` table (aggregated from `kintell_sessions`)
- **Update Frequency**: Real-time queries (cached for 1 hour)
- **Metrics Displayed**:
  - Participants count
  - Volunteers count
  - Sessions count
  - Average integration score
  - Average language level
  - SROI ratio
  - VIS score

**Impact Tiles**:
- **Language Learning Tile**: Aggregates `kintell_sessions` WHERE `sessionType = 'language'`
- **Mentorship Tile**: Aggregates `kintell_sessions` WHERE `sessionType = 'mentorship'`

### ✅ Reports Usage

**SROI Reports** (`services/reporting/src/routes/gen-reports.ts`):
- Queries `kintell_sessions` for volunteer hours calculation
- Includes session data in evidence citations

**VIS Reports** (`services/reporting/src/calculators/vis.ts`):
- Queries `kintell_sessions` for volunteer engagement metrics
- Calculates volunteer impact scores

**Export Functions** (`apps/corp-cockpit-astro/src/lib/export.ts`):
- CSV export of metrics (not CSV import)
- Exports dashboard data to CSV for reporting

---

## Demo/Mock/Fixture Data

### Sample Data Files

**Location**: `services/kintell-connector/src/sample-data/kintell-sessions.csv`

**Status**: ✅ Exists (for testing only)

**Usage**:
- Referenced in `services/kintell-connector/test.http` for manual testing
- Used in E2E tests (`tests/e2e/csv-end-to-end.test.ts`)
- **NOT used in production dashboard** - only for development/testing

### Demo Mode Detection

**No demo mode found** in production code. The dashboard queries real database tables:
- `kintell_sessions` - Real session data
- `metrics_company_period` - Real aggregated metrics

**Fallback Behavior**:
- If no metrics found, dashboard shows `0` or `null` values
- No mock/demo data injected in production

---

## TODOs, Stubs, and Commented Code

### ✅ No Temporary CSV Demo Logic Found

**Investigation Results**:
- No `TODO: temporary CSV demo` comments found
- No `FIXME: replace CSV with API` comments found
- No stubbed CSV parsers found
- All CSV parsing logic is production-ready

### Minor TODOs Found (Non-blocking)

1. **Identity Resolution** (`services/kintell-connector/src/identity/resolution-strategy.md`):
   - `TODO: Check for name conflicts (same email, different name)`
   - **Impact**: Low - doesn't affect CSV import functionality

2. **Metrics Aggregation** (`services/analytics/src/consolidation/collectors/metric-collector.ts`):
   - `TODO: Get actual volunteer hours from a dedicated table`
   - **Impact**: Low - currently calculates from sessionsCount * avgHoursPerSession

3. **Currency Handling** (`services/analytics/src/consolidation/collectors/metric-collector.ts`):
   - `TODO: Add currency field to companies table`
   - **Impact**: Low - falls back to USD/EUR based on country

**Conclusion**: No blocking TODOs related to CSV functionality. All CSV import and processing logic is production-ready.

---

## Evidence of Production Usage

### ✅ Database Schema

**Migration**: `packages/shared-schema/migrations/0049_add_program_instance_to_sessions.sql`
- Adds `program_instance_id` to `kintell_sessions`
- Creates indexes for performance
- **Status**: Production migration (not demo)

### ✅ Batch Tracking

**Table**: `ingestion_batches`
- Tracks file hash to prevent duplicate imports
- Stores import metadata (fileName, fileSizeBytes, importedBy)
- Links to `kintell_sessions` via `batchId`
- **Status**: Production feature

### ✅ Error Handling

**Quarantine System**: `services/kintell-connector/src/quarantine/index.ts`
- Stores invalid rows for review
- Generates error CSV reports
- **Status**: Production feature

### ✅ Event Emission

**Event**: `kintell.session.completed`
- Emitted after each session import
- Triggers downstream processing (Q2Q pipeline)
- **Status**: Production integration

---

## Conclusion

### ✅ CSV Pipeline Status: PRODUCTION-READY

**Answer to Key Question**: **YES, CSV data is already powering the dashboard today.**

### Evidence:

1. ✅ **CSV formats documented** for both programs
2. ✅ **Import endpoints functional** and tested
3. ✅ **Data flows to database** (`kintell_sessions` table)
4. ✅ **Metrics aggregated** from session data
5. ✅ **Dashboard queries** aggregated metrics
6. ✅ **No demo/mock logic** - all production code
7. ✅ **Batch tracking** prevents duplicate imports
8. ✅ **Error handling** with quarantine system

### Architecture Quality:

- **Well-documented**: Comprehensive schema documentation
- **Versioned schemas**: Supports backward compatibility
- **Error handling**: Quarantine system for invalid rows
- **Lineage tracking**: Full audit trail via `ingestion_batches`
- **Performance**: Streaming parser for large files
- **Resumable**: Backfill jobs support checkpoint/resume

### Recommendations:

1. ✅ **No changes needed** - System is production-ready
2. ⚠️ **Consider**: Scheduled import mechanism (currently manual only)
3. ⚠️ **Consider**: Web UI for CSV upload (currently API-only)
4. ✅ **Monitor**: Batch tracking prevents duplicate imports effectively

---

## Appendix: Key Code References

### Import Route
```typescript
// services/kintell-connector/src/routes/import.ts
app.post('/kintell-sessions', async (request, reply) => {
  // Parses CSV, maps to sessions, inserts into database
});
```

### Session Mapper
```typescript
// services/kintell-connector/src/mappers/session-mapper.ts
export function mapCSVRowToSession(row: Record<string, string>): {
  externalSessionId: string;
  sessionType: 'language' | 'mentorship';
  // ... maps CSV columns to internal format
}
```

### Metrics Aggregation
```typescript
// services/analytics/src/tiles/language-aggregator.ts
export async function aggregateLanguageTile(params: LanguageTileParams) {
  // Queries kintell_sessions WHERE sessionType = 'language'
  // Aggregates into LanguageTile metrics
}
```

### Dashboard Query
```typescript
// apps/corp-cockpit-astro/src/pages/index.astro
metrics = await apiClient.get(`/metrics/company/${companyId}/period/current`);
// Displays: participants, volunteers, sessions, SROI, VIS
```

---

**Investigation Complete** ✅
