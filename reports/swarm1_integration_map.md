# SWARM 1: Integration Map
## Monorepo Structure & Integration Points

**Date**: 2025-11-22
**Agent**: repo-cartographer
**Status**: ✅ Complete

---

## Executive Summary

Mapped the TEEI CSR Platform monorepo structure to identify where Kintell ingestion code should live and how it integrates with shared packages. **Key Finding**: A well-structured `services/kintell-connector` service already exists with ~80% of needed infrastructure. Swarm 1 will **enhance** this service rather than build from scratch.

---

## Monorepo Structure

```
TEEI-CSR-Platform/
├── apps/
│   ├── corp-cockpit-astro/          # Frontend dashboard (Astro 5)
│   └── trust-center/                # Trust & compliance UI
├── packages/                         # Shared libraries
│   ├── shared-schema/               # ★ Database schemas (Drizzle ORM)
│   ├── shared-types/                # TypeScript type definitions
│   ├── shared-utils/                # ★ Logging, event bus, utilities
│   ├── event-contracts/             # ★ Event type definitions (NATS)
│   ├── observability/               # Metrics, tracing (Prometheus, OTel)
│   ├── compliance/                  # GDPR, consent management
│   └── [12 other packages]/
├── services/                         # Backend microservices
│   ├── kintell-connector/           # ★★★ PRIMARY WORK AREA ★★★
│   ├── buddy-connector/             # Buddy program ingestion
│   ├── upskilling-connector/        # Upskilling program ingestion
│   ├── q2q-ai/                      # Q2Q AI pipeline (consumes kintell data)
│   ├── analytics/                   # SROI/VIS calculations
│   ├── reporting/                   # Report generation
│   ├── unified-profile/             # User identity management
│   └── [15 other services]/
├── docs/                             # Documentation
├── reports/                          # Agent artifacts (new for Swarm 1)
└── scripts/                          # Build, deployment, seeding scripts
```

---

## Primary Work Area: `services/kintell-connector`

### **Current Structure**

```
services/kintell-connector/
├── src/
│   ├── index.ts                          # ✅ Fastify server entry point
│   ├── routes/
│   │   ├── import.ts                     # ★ CSV import routes (will enhance)
│   │   └── webhooks.ts                   # Webhook handlers (future)
│   ├── mappers/
│   │   └── session-mapper.ts             # ★ CSV → Domain mapping (will enhance)
│   ├── validation/
│   │   └── csv-schema.ts                 # ★ Zod schemas (will extend)
│   ├── utils/
│   │   ├── backfill.ts                   # ✅ Checkpoint/resume logic (robust!)
│   │   ├── idempotency.ts                # ✅ Deduplication (webhook-focused)
│   │   └── dlq.ts                        # Dead letter queue
│   ├── middleware/
│   │   └── signature.ts                  # Webhook signature verification
│   ├── health/
│   │   └── index.ts                      # Health checks
│   ├── quarantine/
│   │   └── index.ts                      # Failed message handling
│   ├── sample-data/
│   │   └── kintell-sessions.csv          # ★ Sample CSV (will expand)
│   ├── webhooks/
│   │   └── signature.ts                  # Signature validation
│   └── __tests__/
│       ├── backfill.test.ts              # ✅ Backfill tests exist
│       └── webhooks.test.ts              # ✅ Webhook tests exist
├── package.json                          # Dependencies: csv-parse, zod, fastify
├── tsconfig.json
└── README.md (TODO: Add comprehensive docs)
```

### **What Already Works**

1. **✅ Fastify Server** (`index.ts`)
   - Multipart file upload support (@fastify/multipart)
   - Health checks
   - Graceful shutdown
   - Event bus connection (NATS)

2. **✅ CSV Parsing** (`routes/import.ts`)
   - Streams large CSV files (no memory issues)
   - Row-by-row processing
   - Error collection and reporting

3. **✅ Backfill Infrastructure** (`utils/backfill.ts`)
   - Checkpoint system (resume from row N)
   - Progress tracking (processedRows, successfulRows, failedRows)
   - Error file generation (failed rows → CSV)
   - Batch processing (500 rows/batch)
   - Progress updates every 1000 rows
   - **This is production-grade!** 👏

4. **✅ Idempotency** (`utils/idempotency.ts`)
   - SHA-256 payload hashing
   - Delivery ID tracking
   - Retry logic (max 3 attempts)
   - Status tracking (pending, processed, failed)

5. **✅ Validation** (`validation/csv-schema.ts`)
   - Versioned Zod schemas (v1.0, v1.1)
   - Language and Mentorship formats
   - Email, date, rating validators
   - Schema auto-detection

6. **✅ Event Emission** (`routes/import.ts`)
   - Publishes `kintell.session.completed` events to NATS
   - Uses `@teei/event-contracts` for type safety

### **What Needs Enhancement** (Swarm 1 Scope)

1. **❌ User Creation** (`routes/import.ts` lines 54-72)
   - Currently assumes users exist (fails if not found)
   - **Need**: `upsertUser()` function

2. **❌ Program Instance Modeling**
   - No concept of "Mentors for Ukraine" vs "Language for Ukraine" instances
   - **Need**: `program_instances` table + resolution logic

3. **❌ Batch Lineage** (`utils/backfill.ts`)
   - `backfill_jobs` table exists but missing:
     - `programType` field
     - `programInstanceId` FK
     - `fileHash` for re-import detection
   - **Need**: `ingestion_batches` table + linking

4. **❌ Program Enrollments**
   - Not created during import
   - **Need**: `enrollUserInProgram()` function

5. **❌ Enhanced Sample Data**
   - Only 3 rows in `kintell-sessions.csv`
   - **Need**: 50+ rows with edge cases

6. **❌ Documentation**
   - No README, runbook, or schema docs
   - **Need**: Comprehensive docs (Swarm 1 Phase 5)

7. **❌ CLI Tooling**
   - Import only via HTTP POST to `/v1/import/kintell-sessions`
   - **Need**: CLI for local imports (`pnpm import:csv --file path.csv`)

---

## Integration Points

### **1. Database Layer: `@teei/shared-schema`**

**Current Usage**:
```typescript
// services/kintell-connector/src/routes/import.ts
import { db, kintellSessions, users } from '@teei/shared-schema';
```

**How It Works**:
- `@teei/shared-schema` exports Drizzle ORM schemas + `db` singleton
- Connection configured via `DATABASE_URL` env var
- All services share the same PostgreSQL instance (tenant-isolated)

**Swarm 1 Changes**:
- ✅ Add new tables: `program_instances`, `ingestion_batches`
- ✅ Extend `kintell_sessions` with FKs: `batchId`, `programInstanceId`
- ✅ Populate `user_external_ids` during import
- ✅ Generate migrations via `pnpm --filter @teei/shared-schema db:generate`

**Testing**:
- Local dev DB: `postgres://localhost:5432/teei_dev`
- Migrations run via: `pnpm --filter @teei/shared-schema db:migrate`

---

### **2. Event Bus: `@teei/event-contracts` + `@teei/shared-utils`**

**Current Usage**:
```typescript
// services/kintell-connector/src/routes/import.ts
import { getEventBus } from '@teei/shared-utils';
import type { KintellSessionCompleted } from '@teei/event-contracts';

const eventBus = getEventBus();
const event = eventBus.createEvent<KintellSessionCompleted>('kintell.session.completed', { ... });
await eventBus.publish(event);
```

**How It Works**:
- NATS JetStream for event streaming
- Events consumed by: `q2q-ai`, `analytics`, `reporting`
- Type-safe via `@teei/event-contracts`

**Swarm 1 Changes**:
- ⚠️ Extend event payload to include `programInstanceId`, `batchId`?
- **Decision**: Not required for Swarm 1. Keep events minimal. Add later if needed.

---

### **3. Logging: `@teei/shared-utils`**

**Current Usage**:
```typescript
import { createServiceLogger } from '@teei/shared-utils';
const logger = createServiceLogger('kintell-connector:import');

logger.info({ count: records.length }, 'Processing CSV records');
logger.error({ error, row: i + 1 }, 'Error processing row');
```

**How It Works**:
- Structured JSON logging (pino)
- Log levels: trace, debug, info, warn, error, fatal
- Supports log masking (PII redaction)

**Swarm 1 Changes**:
- ✅ Mask emails in logs: `anna@example.com` → `a***@example.com`
- ✅ Add batch context to all logs: `{ batchId, programType }`

---

### **4. Observability: `@teei/observability`**

**Current Usage**:
- Not yet used in `kintell-connector`

**Swarm 1 Changes**:
- ✅ Add Prometheus metrics:
  - `kintell_rows_processed_total{program_type, status}`
  - `kintell_import_duration_seconds{program_type}`
- ⚠️ OTel tracing (optional, low priority)

---

## Downstream Consumers

### **1. `services/q2q-ai`** - Q2Q Pipeline

**What It Needs**:
```typescript
// Query kintell_sessions for feedback text extraction
const sessions = await db.select()
  .from(kintellSessions)
  .where(and(
    eq(kintellSessions.feedbackText, isNotNull),
    gte(kintellSessions.completedAt, startDate)
  ));

// Extract feedback → outcome_scores
// textType: 'kintell_feedback'
// textId: kintell_sessions.id
```

**Compatibility**:
- ✅ No breaking changes from Swarm 1
- ✅ `feedbackText` field remains unchanged

---

### **2. `services/analytics`** - SROI/VIS Calculations

**What It Needs**:
```typescript
// SROI calculation by program type
const sessions = await db.select()
  .from(kintellSessions)
  .join(programInstances, eq(kintellSessions.programInstanceId, programInstances.id))
  .where(and(
    eq(programInstances.programType, 'mentors_ukraine'),
    between(kintellSessions.completedAt, periodStart, periodEnd)
  ));

// VIS calculation for volunteers
const volunteerSessions = await db.select()
  .from(kintellSessions)
  .where(eq(kintellSessions.volunteerId, userId));
```

**Compatibility**:
- ⚠️ **New FK**: `programInstanceId` enables program-level filtering
- ⚠️ **Breaking Change?** No - FK is nullable initially, can be populated gradually
- ✅ Existing queries continue to work (without program filtering)

---

### **3. `services/reporting`** - Report Generation

**What It Needs**:
```typescript
// Generate report with data lineage
const sessions = await db.select()
  .from(kintellSessions)
  .join(ingestionBatches, eq(kintellSessions.batchId, ingestionBatches.id))
  .where(eq(kintellSessions.companyId, companyId));

// Show provenance: "Data imported from mentors-for-ukraine-2024-Q4.csv on 2024-11-22"
```

**Compatibility**:
- ✅ New `batchId` FK enables lineage tracking
- ✅ Non-breaking (FK nullable, optional feature)

---

## Dependencies

### **Core Dependencies** (Already in `kintell-connector/package.json`)

```json
{
  "dependencies": {
    "@teei/event-contracts": "workspace:*",      // ✅ Event types
    "@teei/shared-schema": "workspace:*",        // ✅ Database schemas
    "@teei/shared-utils": "workspace:*",         // ✅ Logging, event bus
    "@fastify/multipart": "^8.1.0",              // ✅ File uploads
    "csv-parse": "^5.5.3",                       // ✅ CSV parsing
    "fastify": "^4.25.2",                        // ✅ HTTP server
    "zod": "^3.22.4"                             // ✅ Validation
  }
}
```

### **New Dependencies Needed** (Swarm 1)

None! All required packages already present. 🎉

---

## File System Conventions

### **Where to Add New Code**

| Task | Location | Example |
|------|----------|---------|
| New DB schemas | `packages/shared-schema/src/schema/` | `program-instances.ts`, `ingestion-batches.ts` |
| User upsert logic | `services/kintell-connector/src/users/` | `upsert.ts` |
| Program enrollment | `services/kintell-connector/src/programs/` | `enrollment.ts` |
| Batch tracking | `services/kintell-connector/src/batches/` | `tracker.ts` |
| Enhanced mappers | `services/kintell-connector/src/mappers/` | `mentors-mapper.ts`, `language-mapper.ts` |
| Identity resolution | `services/kintell-connector/src/identity/` | `resolution.ts`, `dedupe.ts` |
| CLI tools | `services/kintell-connector/src/cli/` | `import.ts` |
| Observability | `services/kintell-connector/src/observability/` | `metrics.ts` |
| Unit tests | `services/kintell-connector/src/**/__tests__/` | Co-located with source |
| Integration tests | `services/kintell-connector/src/__tests__/integration/` | `import-flow.test.ts` |
| Sample data | `services/kintell-connector/src/sample-data/` | `mentors-for-ukraine.csv` |
| Documentation | `docs/kintell/` | `RUNBOOK.md`, `CSV_SCHEMAS.md` |
| Agent reports | `reports/` | `swarm1_*.md` |

---

## Development Workflow

### **1. Local Development**

```bash
# Install dependencies (from repo root)
pnpm install

# Run migrations
pnpm --filter @teei/shared-schema db:migrate

# Start kintell-connector in dev mode
pnpm --filter @teei/kintell-connector dev
# Server runs on http://localhost:3002

# Run tests
pnpm --filter @teei/kintell-connector test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### **2. Testing CSV Import Locally**

```bash
# Upload CSV via HTTP
curl -X POST http://localhost:3002/v1/import/kintell-sessions \
  -F "file=@/path/to/mentors-for-ukraine.csv"

# Check backfill job status
curl http://localhost:3002/v1/import/backfill/{jobId}/status

# Download error CSV
curl http://localhost:3002/v1/import/backfill/{jobId}/errors --output errors.csv
```

### **3. Future CLI (Swarm 1 will add)**

```bash
# Direct CSV import (bypasses HTTP server)
pnpm --filter @teei/kintell-connector import:csv \
  --file /path/to/mentors-for-ukraine.csv \
  --program-type mentors_ukraine \
  --dry-run
```

---

## Environment Variables

### **Required for `kintell-connector`**

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/teei_dev

# NATS Event Bus
NATS_URL=nats://localhost:4222
NATS_USER=teei
NATS_PASSWORD=secret

# Service Config
PORT_KINTELL_CONNECTOR=3002
NODE_ENV=development

# Optional: Observability
PROMETHEUS_PUSHGATEWAY_URL=http://localhost:9091
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

---

## Testing Strategy

### **Unit Tests** (via Vitest)
- Mock DB calls with `@teei/shared-schema` factories
- Test validation logic in isolation
- Test mappers with sample data
- Coverage target: ≥80% for new code

### **Integration Tests** (via Vitest + real DB)
- Use test DB: `postgres://localhost:5432/teei_test`
- Seed minimal data (users, companies)
- Import real CSV files
- Assert DB state after import
- Coverage target: ≥60% for import flows

### **E2E Tests** (via Playwright - optional for Swarm 1)
- Full stack: DB + services + frontend
- Import CSV → verify dashboard shows data
- Lower priority (focus on unit + integration)

---

## Monorepo Commands (Reference)

```bash
# Build all packages (needed before services)
pnpm -r --filter './packages/**' build

# Build specific service
pnpm --filter @teei/kintell-connector build

# Run all tests
pnpm test

# Run tests for specific service
pnpm --filter @teei/kintell-connector test

# Generate DB migrations
pnpm --filter @teei/shared-schema db:generate

# Run DB migrations
pnpm --filter @teei/shared-schema db:migrate

# Open Drizzle Studio (DB GUI)
pnpm --filter @teei/shared-schema db:studio

# Lint entire monorepo
pnpm lint

# Format code
pnpm format
```

---

## Key Architectural Decisions

### **Decision 1: Enhance Existing Service (Not Create New Package)**

**Rationale**:
- `kintell-connector` already has 80% of needed infrastructure
- Backfill logic is production-grade
- Validation schemas are well-structured
- No need for duplicate code

**Impact**: Faster implementation, less code, easier maintenance

---

### **Decision 2: Add Tables to `@teei/shared-schema` (Not Local to Service)**

**Rationale**:
- Other services need to query `program_instances`, `ingestion_batches`
- Drizzle ORM is monorepo-wide standard
- Shared schema ensures consistency

**Impact**: Requires migration generation + review

---

### **Decision 3: Keep Events Minimal (Don't Add Program Context Yet)**

**Rationale**:
- Consumers (q2q-ai, analytics) can query DB for program context
- Events should be lightweight (core data only)
- Can extend later if needed

**Impact**: No event contract changes in Swarm 1

---

### **Decision 4: CLI + HTTP Endpoints (Dual Access)**

**Rationale**:
- HTTP for production automation (future Kintell webhooks)
- CLI for local dev and manual imports
- Both use same underlying logic

**Impact**: Slightly more code, but better DX

---

## Risks & Mitigations

### **Risk 1: Breaking Downstream Queries**

**Mitigation**:
- Make all new FKs nullable
- Existing queries work without program filtering
- Gradual migration (backfill old sessions later)

### **Risk 2: Migration Conflicts**

**Mitigation**:
- Generate migrations early in Swarm 1
- Review SQL before applying
- Test on local DB first

### **Risk 3: Large CSV Performance**

**Mitigation**:
- Existing backfill logic handles 10K+ rows efficiently
- Batch processing (500 rows/transaction)
- Progress checkpoints every 1000 rows

---

## Success Criteria

✅ All new code lives in `services/kintell-connector/src/**`
✅ All new schemas in `packages/shared-schema/src/schema/**`
✅ All docs in `docs/kintell/**`
✅ All reports in `reports/swarm1_**`
✅ No breaking changes to downstream consumers
✅ Builds successfully: `pnpm build`
✅ Type checks: `pnpm typecheck`
✅ Tests pass: `pnpm test`
✅ Migrations apply cleanly: `pnpm db:migrate`

---

## Conclusion

✅ **Monorepo structure is well-organized** with clear separation of concerns
✅ **Kintell-connector service is production-ready foundation** (80% complete)
✅ **Integration points are well-defined** (db, events, logging, observability)
✅ **No new dependencies needed** - all tools already available
✅ **Clear file system conventions** - agents know where to add code
✅ **Testing strategy defined** - unit + integration + e2e
✅ **Low risk of breaking changes** - all additions are non-breaking

**Next Step**: Proceed to Batch 1B (Parallel design tasks: schema-architect, identity-unifier, program-instance-modeler, data-lineage-designer)

---

## Appendix: Service Dependency Graph

```
services/kintell-connector
├─ depends on → packages/shared-schema (DB tables)
├─ depends on → packages/shared-utils (logging, event bus)
├─ depends on → packages/event-contracts (event types)
└─ publishes events to:
   ├─ services/q2q-ai (consumes kintell.session.completed)
   ├─ services/analytics (consumes for SROI/VIS)
   └─ services/reporting (consumes for reports)
```
