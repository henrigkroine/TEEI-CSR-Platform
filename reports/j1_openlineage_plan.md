# J1: OpenLineage Instrumentation — Technical Plan

**Owner**: lineage-lead
**Agents**: 3.1–3.6, 1.1, 1.5
**Target**: ≥90% critical pipelines emit OL events; dataset→metric lineage resolvable

---

## Overview

This slice adds OpenLineage-spec event emission to 4 critical services, establishes ClickHouse and PostgreSQL sinks for lineage storage, and ensures column-level lineage tracking where feasible.

### Existing Foundation
- ✅ **PostgreSQL tables**: `metric_lineage`, `report_lineage` (already tracking basic lineage)
- ✅ **Lineage service**: `/services/analytics/src/services/lineage-service.ts` (functions for storing/retrieving lineage)
- ✅ **SROI calculator**: Already has optional lineage tracking via `saveSROICalculation({ trackLineage: true })`

### Gap Analysis
- ❌ **OpenLineage spec compliance**: Current lineage is custom, not OL-spec
- ❌ **Column-level lineage**: Only tracking table/metric-level currently
- ❌ **ClickHouse sink**: No dedicated lineage events warehouse
- ❌ **Dataset profiling**: No freshness/quality tracking in dedicated table
- ❌ **Standardized event types**: Using custom schema instead of OL START_RUN, COMPLETE_RUN, etc.

---

## Architecture

### OpenLineage Event Flow
```
┌─────────────────┐
│  Service Layer  │  (impact-in, reporting, q2q-ai, analytics)
│  ┌───────────┐  │
│  │ OL Emitter│  │  Async emission (non-blocking)
│  └─────┬─────┘  │
└────────┼────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│            OpenLineage Event Bus (NATS)                │
└───┬─────────────────────────────────────┬──────────────┘
    │                                     │
    ▼                                     ▼
┌──────────────────┐            ┌──────────────────┐
│ ClickHouse Sink  │            │ PostgreSQL Sink  │
│ lineage_events   │            │ dataset_profiles │
│ (long-term)      │            │ (freshness)      │
└──────────────────┘            └──────────────────┘
         │                               │
         ▼                               ▼
    Compaction Job                  Freshness SLO
    (30d → 1y archive)              (Grafana alerts)
```

### OpenLineage Event Types
| Event Type | When | Contains |
|------------|------|----------|
| **START** | Pipeline/job starts | Run ID, job name, inputs (datasets) |
| **RUNNING** | Progress update | % complete, records processed |
| **COMPLETE** | Success | Outputs (datasets), row counts, checksums |
| **FAIL** | Error | Error message, stack trace (sanitized) |
| **DATASET** | Referenced by job | Namespace, name, schema, facets (column stats) |

---

## Agent Work Plans

### Agent 1.1: pipeline-instrumentation-dev
**MUST BE USED**: When adding OL emitters to any service

#### Task: Create reusable OL emitter library
**Files to create**:
- `/packages/openlineage/src/emitter.ts` — Core OL emitter class
- `/packages/openlineage/src/types.ts` — TypeScript types for OL spec
- `/packages/openlineage/src/nats-transport.ts` — NATS transport layer
- `/packages/openlineage/package.json` — New shared package

**Implementation**:
```typescript
// packages/openlineage/src/emitter.ts
import { NatsConnection } from 'nats';
import { OpenLineageEvent, RunEvent, DatasetEvent } from './types.js';

export class OpenLineageEmitter {
  constructor(
    private natsClient: NatsConnection,
    private namespace: string, // e.g., 'teei.reporting'
    private serviceName: string
  ) {}

  async emitRunEvent(event: RunEvent): Promise<void> {
    const olEvent: OpenLineageEvent = {
      eventType: event.eventType, // START, RUNNING, COMPLETE, FAIL
      eventTime: new Date().toISOString(),
      run: {
        runId: event.runId,
        facets: event.facets || {},
      },
      job: {
        namespace: this.namespace,
        name: event.jobName,
        facets: event.jobFacets || {},
      },
      inputs: event.inputs || [],
      outputs: event.outputs || [],
      producer: `teei-platform/${this.serviceName}`,
      schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
    };

    // Emit to NATS subject: openlineage.events
    await this.natsClient.publish(
      'openlineage.events',
      JSON.stringify(olEvent)
    );
  }

  async emitDatasetEvent(dataset: DatasetEvent): Promise<void> {
    // Emit dataset metadata (schema, stats, quality)
  }

  createRunId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Acceptance Criteria**:
- [ ] Package `@teei/openlineage` created with emitter class
- [ ] NATS transport for async event publishing
- [ ] TypeScript types matching OpenLineage 1.0.5 spec
- [ ] Unit tests: emitter publishes to NATS subject correctly
- [ ] Documentation: How to use emitter in services

---

### Agent 1.2: clickhouse-sink-engineer
**MUST BE USED**: For ClickHouse lineage_events table + compaction job

#### Task: Create ClickHouse sink for OpenLineage events

**Files to create**:
- `/services/analytics/src/clickhouse/lineage_events.sql` — Schema DDL
- `/services/analytics/src/sinks/openlineage-sink.ts` — NATS subscriber → ClickHouse writer
- `/k8s/jobs/lineage-compaction.yaml` — CronJob for compaction (30d → 1y archive)

**ClickHouse Schema**:
```sql
-- /services/analytics/src/clickhouse/lineage_events.sql
CREATE TABLE IF NOT EXISTS lineage_events (
  event_time DateTime64(3) CODEC(Delta, ZSTD),
  event_type Enum8('START' = 1, 'RUNNING' = 2, 'COMPLETE' = 3, 'FAIL' = 4) CODEC(ZSTD),
  run_id String CODEC(ZSTD),
  job_namespace String CODEC(ZSTD),
  job_name String CODEC(ZSTD),

  -- Input datasets (array of names)
  input_datasets Array(String) CODEC(ZSTD),
  input_namespaces Array(String) CODEC(ZSTD),

  -- Output datasets
  output_datasets Array(String) CODEC(ZSTD),
  output_namespaces Array(String) CODEC(ZSTD),
  output_row_counts Array(UInt64) CODEC(ZSTD),

  -- Metadata
  producer String CODEC(ZSTD),
  duration_ms Nullable(UInt32) CODEC(ZSTD),
  error_message Nullable(String) CODEC(ZSTD),

  -- Full event JSON for facets
  event_json String CODEC(ZSTD),

  -- Partition key: by month for efficient pruning
  partition_key Date MATERIALIZED toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(partition_key)
ORDER BY (job_namespace, job_name, event_time)
TTL partition_key + INTERVAL 395 DAY DELETE
SETTINGS index_granularity = 8192;

-- Index for fast run_id lookups
ALTER TABLE lineage_events ADD INDEX idx_run_id run_id TYPE bloom_filter GRANULARITY 4;

-- Index for dataset lineage queries
ALTER TABLE lineage_events ADD INDEX idx_inputs input_datasets TYPE bloom_filter GRANULARITY 4;
ALTER TABLE lineage_events ADD INDEX idx_outputs output_datasets TYPE bloom_filter GRANULARITY 4;
```

**Sink Implementation**:
```typescript
// /services/analytics/src/sinks/openlineage-sink.ts
import { NatsConnection } from 'nats';
import { ClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('openlineage-sink');

export async function startOpenLineageSink(
  natsClient: NatsConnection,
  clickhouseClient: ClickHouseClient
): Promise<void> {
  const sub = natsClient.subscribe('openlineage.events');

  for await (const msg of sub) {
    try {
      const event = JSON.parse(msg.data.toString());
      await insertLineageEvent(clickhouseClient, event);
      msg.respond(); // ACK
    } catch (error) {
      logger.error({ error }, 'Failed to process lineage event');
      // Dead-letter queue or retry logic here
    }
  }
}

async function insertLineageEvent(
  client: ClickHouseClient,
  event: any
): Promise<void> {
  await client.insert({
    table: 'lineage_events',
    values: [{
      event_time: new Date(event.eventTime),
      event_type: event.eventType,
      run_id: event.run.runId,
      job_namespace: event.job.namespace,
      job_name: event.job.name,
      input_datasets: event.inputs?.map((d: any) => d.name) || [],
      input_namespaces: event.inputs?.map((d: any) => d.namespace) || [],
      output_datasets: event.outputs?.map((d: any) => d.name) || [],
      output_namespaces: event.outputs?.map((d: any) => d.namespace) || [],
      output_row_counts: event.outputs?.map((d: any) => d.facets?.stats?.rowCount || 0) || [],
      producer: event.producer,
      duration_ms: event.run.facets?.timing?.durationMs || null,
      error_message: event.run.facets?.error?.message || null,
      event_json: JSON.stringify(event),
    }],
    format: 'JSONEachRow',
  });
}
```

**Compaction Job**:
```yaml
# /k8s/jobs/lineage-compaction.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: lineage-compaction
spec:
  schedule: "0 2 * * 0" # Weekly on Sunday 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: compaction
            image: clickhouse/clickhouse-client:latest
            command:
            - /bin/sh
            - -c
            - |
              clickhouse-client --host=clickhouse --query="
                OPTIMIZE TABLE lineage_events PARTITION tuple(toYYYYMM(now() - INTERVAL 30 DAY)) FINAL;
              "
```

**Acceptance Criteria**:
- [ ] ClickHouse table `lineage_events` created with schema above
- [ ] NATS subscriber ingests OL events into ClickHouse
- [ ] Partitioning by month (efficient pruning for queries)
- [ ] TTL: 395 days (13 months for compliance)
- [ ] Bloom filter indexes on run_id, input_datasets, output_datasets
- [ ] Compaction CronJob runs weekly
- [ ] Monitoring: Row insert rate, sink lag (NATS queue depth)

---

### Agent 1.3: postgres-lineage-enhancer
**MUST BE USED**: When extending PostgreSQL dataset_profiles table

#### Task: Create dataset_profiles table for freshness tracking

**Files to create**:
- `/packages/shared-schema/src/schema/dataset_profiles.ts` — Drizzle schema
- `/packages/shared-schema/src/migrations/004_dataset_profiles.sql` — Migration

**Schema**:
```typescript
// /packages/shared-schema/src/schema/dataset_profiles.ts
import { pgTable, uuid, varchar, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const datasetProfiles = pgTable(
  'dataset_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    namespace: varchar('namespace', { length: 255 }).notNull(), // e.g., 'teei.postgres.public'
    name: varchar('name', { length: 255 }).notNull(), // e.g., 'users'

    // Freshness tracking
    lastLoadTime: timestamp('last_load_time', { withTimezone: true }),
    lastModifiedTime: timestamp('last_modified_time', { withTimezone: true }),
    rowCount: integer('row_count'),
    sizeBytes: integer('size_bytes'),

    // Schema info (from OL dataset facets)
    schemaFields: jsonb('schema_fields').$type<Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>(),

    // Data quality metadata
    qualityScore: varchar('quality_score', { length: 10 }), // 0.00-1.00
    testPassRate: varchar('test_pass_rate', { length: 10 }), // % from GE (populated by J2)

    // Tags for governance
    gdprCategory: varchar('gdpr_category', { length: 50 }), // PII, Sensitive, Public (populated by J5)
    residency: varchar('residency', { length: 50 }), // EU, US, UK, Global

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    namespaceNameIdx: index('dataset_profiles_namespace_name_idx').on(table.namespace, table.name),
    lastLoadTimeIdx: index('dataset_profiles_last_load_time_idx').on(table.lastLoadTime),
  })
);
```

**Migration**:
```sql
-- /packages/shared-schema/src/migrations/004_dataset_profiles.sql
CREATE TABLE dataset_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,

  last_load_time TIMESTAMPTZ,
  last_modified_time TIMESTAMPTZ,
  row_count INTEGER,
  size_bytes INTEGER,

  schema_fields JSONB,
  quality_score VARCHAR(10),
  test_pass_rate VARCHAR(10),

  gdpr_category VARCHAR(50),
  residency VARCHAR(50),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(namespace, name)
);

CREATE INDEX dataset_profiles_namespace_name_idx ON dataset_profiles(namespace, name);
CREATE INDEX dataset_profiles_last_load_time_idx ON dataset_profiles(last_load_time);

COMMENT ON TABLE dataset_profiles IS 'Dataset metadata for freshness, quality, and governance tracking';
COMMENT ON COLUMN dataset_profiles.namespace IS 'Dataset namespace (e.g., teei.postgres.public)';
COMMENT ON COLUMN dataset_profiles.gdpr_category IS 'GDPR classification: PII, Sensitive, Public';
```

**Profile Updater** (consumes OL events):
```typescript
// /services/analytics/src/sinks/dataset-profile-updater.ts
import { db } from '@teei/shared-schema/db';
import { datasetProfiles } from '@teei/shared-schema';
import { sql } from 'drizzle-orm';

export async function updateDatasetProfile(olEvent: any): Promise<void> {
  if (olEvent.eventType !== 'COMPLETE') return; // Only on successful completions

  for (const dataset of olEvent.outputs || []) {
    await db
      .insert(datasetProfiles)
      .values({
        namespace: dataset.namespace,
        name: dataset.name,
        lastLoadTime: new Date(olEvent.eventTime),
        lastModifiedTime: new Date(olEvent.eventTime),
        rowCount: dataset.facets?.stats?.rowCount || null,
        sizeBytes: dataset.facets?.stats?.bytes || null,
        schemaFields: dataset.facets?.schema?.fields || null,
      })
      .onConflictDoUpdate({
        target: [datasetProfiles.namespace, datasetProfiles.name],
        set: {
          lastLoadTime: new Date(olEvent.eventTime),
          rowCount: dataset.facets?.stats?.rowCount || null,
          sizeBytes: dataset.facets?.stats?.bytes || null,
          updatedAt: new Date(),
        },
      });
  }
}
```

**Acceptance Criteria**:
- [ ] PostgreSQL table `dataset_profiles` created
- [ ] Unique constraint on (namespace, name)
- [ ] Indexes on namespace+name and last_load_time (for freshness queries)
- [ ] Profile updater consumes OL COMPLETE events
- [ ] Upsert logic: update lastLoadTime, rowCount on each successful pipeline run
- [ ] GDPR and residency columns ready for J5 tagging

---

### Agent 3.1: lineage-emitter-impact-in
**MUST BE USED**: When instrumenting services/impact-in with OL events

#### Task: Add OpenLineage emitters to impact-in service

**Critical Pipelines** (connector jobs):
1. **Benevity sync** (`/services/impact-in/src/connectors/benevity.ts`)
2. **Goodera sync** (`/services/impact-in/src/connectors/goodera.ts`)
3. **Workday sync** (`/services/impact-in/src/connectors/workday.ts`)

**Files to modify**:
- `/services/impact-in/src/connectors/benevity.ts`
- `/services/impact-in/src/connectors/goodera.ts`
- `/services/impact-in/src/connectors/workday.ts`
- `/services/impact-in/src/index.ts` (initialize OL emitter)

**Example Instrumentation** (Benevity connector):
```typescript
// /services/impact-in/src/connectors/benevity.ts
import { OpenLineageEmitter } from '@teei/openlineage';

export async function syncBenevityData(
  olEmitter: OpenLineageEmitter
): Promise<void> {
  const runId = olEmitter.createRunId();
  const jobName = 'benevity-sync';

  try {
    // START event
    await olEmitter.emitRunEvent({
      eventType: 'START',
      runId,
      jobName,
      inputs: [
        {
          namespace: 'benevity.api',
          name: 'volunteer_hours',
          facets: {
            dataSource: {
              name: 'Benevity API',
              uri: 'https://api.benevity.com/v2/volunteer_hours',
            },
          },
        },
      ],
    });

    // Fetch data from Benevity API
    const data = await fetchBenevityVolunteerHours();

    // Transform and insert into buddy_events table
    const insertedRows = await insertBuddyEvents(data);

    // COMPLETE event
    await olEmitter.emitRunEvent({
      eventType: 'COMPLETE',
      runId,
      jobName,
      outputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'buddy_events',
          facets: {
            stats: {
              rowCount: insertedRows.length,
              bytes: JSON.stringify(insertedRows).length,
            },
            schema: {
              fields: [
                { name: 'event_id', type: 'UUID' },
                { name: 'event_type', type: 'VARCHAR' },
                { name: 'volunteer_id', type: 'UUID' },
                { name: 'hours', type: 'NUMERIC' },
                { name: 'timestamp', type: 'TIMESTAMPTZ' },
              ],
            },
          },
        },
      ],
      facets: {
        timing: { durationMs: Date.now() - startTime },
      },
    });
  } catch (error) {
    // FAIL event
    await olEmitter.emitRunEvent({
      eventType: 'FAIL',
      runId,
      jobName,
      facets: {
        error: {
          message: error.message,
          stackTrace: error.stack?.split('\n').slice(0, 5).join('\n'), // Sanitized
        },
      },
    });
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] Benevity connector emits START, COMPLETE/FAIL events
- [ ] Goodera connector emits START, COMPLETE/FAIL events
- [ ] Workday connector emits START, COMPLETE/FAIL events
- [ ] Input datasets: External API URIs (Benevity, Goodera, Workday)
- [ ] Output datasets: `buddy_events`, `buddy_matches`, etc. with row counts
- [ ] Error handling: FAIL events with sanitized stack traces (no PII)
- [ ] Integration tests: Mock NATS client, verify events emitted

---

### Agent 3.2: lineage-emitter-reporting
**MUST BE USED**: When instrumenting services/reporting with OL events

#### Task: Add OpenLineage emitters to reporting service

**Critical Pipelines**:
1. **Report generation** (`/services/reporting/src/routes/gen-reports.ts`)
2. **PDF export** (`/services/reporting/src/routes/export.ts`)
3. **Scheduled reports** (`/services/reporting/src/schedulers/report-scheduler.ts`)

**Files to modify**:
- `/services/reporting/src/routes/gen-reports.ts`
- `/services/reporting/src/routes/export.ts`
- `/services/reporting/src/schedulers/report-scheduler.ts`
- `/services/reporting/src/index.ts` (initialize OL emitter)

**Example Instrumentation** (Report generation):
```typescript
// /services/reporting/src/routes/gen-reports.ts
import { OpenLineageEmitter } from '@teei/openlineage';

export async function generateReport(
  req: FastifyRequest,
  olEmitter: OpenLineageEmitter
): Promise<Report> {
  const runId = olEmitter.createRunId();
  const jobName = 'report-generation';

  const { companyId, periodStart, periodEnd, sections } = req.body;

  try {
    // START event
    await olEmitter.emitRunEvent({
      eventType: 'START',
      runId,
      jobName,
      inputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'metrics_company_period',
          facets: {
            dataSource: {
              query: `SELECT * FROM metrics_company_period WHERE company_id = '${companyId}' AND period >= '${periodStart}'`,
            },
          },
        },
        {
          namespace: 'teei.postgres.public',
          name: 'evidence_snippets',
        },
        {
          namespace: 'anthropic.claude',
          name: 'claude-3-opus-20240229',
          facets: {
            llm: {
              model: 'claude-3-opus-20240229',
              temperature: 0.3,
              maxTokens: 4096,
            },
          },
        },
      ],
      jobFacets: {
        reportConfig: {
          sections,
          locale: req.body.locale || 'en',
          evidenceBased: true,
        },
      },
    });

    // Generate report (existing logic)
    const report = await doGenerateReport(companyId, periodStart, periodEnd, sections);

    // COMPLETE event
    await olEmitter.emitRunEvent({
      eventType: 'COMPLETE',
      runId,
      jobName,
      outputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'report_lineage',
          facets: {
            stats: {
              rowCount: 1,
            },
            reportMetadata: {
              reportId: report.id,
              tokensUsed: report.tokensTotal,
              citationCount: report.citationCount,
              estimatedCostUsd: report.estimatedCostUsd,
            },
          },
        },
      ],
      facets: {
        timing: { durationMs: report.durationMs },
      },
    });

    return report;
  } catch (error) {
    await olEmitter.emitRunEvent({
      eventType: 'FAIL',
      runId,
      jobName,
      facets: {
        error: { message: error.message },
      },
    });
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] Report generation emits START, COMPLETE/FAIL events
- [ ] Input datasets: metrics_company_period, evidence_snippets, LLM model
- [ ] Output datasets: report_lineage with token usage, cost, citation count
- [ ] PDF export emits events (input: report_lineage, output: blob storage)
- [ ] Scheduled reports emit events (cron job as producer)
- [ ] LLM model tracked as "dataset" with facets (model name, temperature, tokens)

---

### Agent 3.3: lineage-emitter-q2q-ai
**MUST BE USED**: When instrumenting services/q2q-ai with OL events

#### Task: Add OpenLineage emitters to Q2Q pipeline

**Critical Pipelines**:
1. **Feedback ingestion** (`/services/q2q-ai/src/routes/ingest.ts`)
2. **Q2Q transformation** (`/services/q2q-ai/src/pipelines/transform.ts`)
3. **Evidence extraction** (`/services/q2q-ai/src/pipelines/extract-evidence.ts`)

**Files to modify**:
- `/services/q2q-ai/src/routes/ingest.ts`
- `/services/q2q-ai/src/pipelines/transform.ts`
- `/services/q2q-ai/src/pipelines/extract-evidence.ts`
- `/services/q2q-ai/src/index.ts` (initialize OL emitter)

**Example Instrumentation** (Evidence extraction):
```typescript
// /services/q2q-ai/src/pipelines/extract-evidence.ts
import { OpenLineageEmitter } from '@teei/openlineage';

export async function extractEvidence(
  feedbackBatch: Feedback[],
  olEmitter: OpenLineageEmitter
): Promise<EvidenceSnippet[]> {
  const runId = olEmitter.createRunId();
  const jobName = 'q2q-evidence-extraction';

  try {
    // START event
    await olEmitter.emitRunEvent({
      eventType: 'START',
      runId,
      jobName,
      inputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'buddy_feedback',
          facets: {
            stats: { rowCount: feedbackBatch.length },
          },
        },
        {
          namespace: 'anthropic.claude',
          name: 'claude-3-haiku-20240307',
          facets: {
            llm: {
              model: 'claude-3-haiku-20240307',
              temperature: 0,
              systemPrompt: 'Extract factual evidence from feedback...',
            },
          },
        },
      ],
    });

    // Run Q2Q pipeline
    const snippets = await doExtractEvidence(feedbackBatch);

    // COMPLETE event
    await olEmitter.emitRunEvent({
      eventType: 'COMPLETE',
      runId,
      jobName,
      outputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'evidence_snippets',
          facets: {
            stats: {
              rowCount: snippets.length,
            },
            columnLineage: {
              // Column-level lineage: which input columns → output columns
              mappings: [
                { input: 'buddy_feedback.feedback_text', output: 'evidence_snippets.snippet_text' },
                { input: 'buddy_feedback.sentiment', output: 'evidence_snippets.confidence_score' },
              ],
            },
          },
        },
      ],
    });

    return snippets;
  } catch (error) {
    await olEmitter.emitRunEvent({
      eventType: 'FAIL',
      runId,
      jobName,
      facets: {
        error: { message: error.message },
      },
    });
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] Feedback ingestion emits START, COMPLETE/FAIL events
- [ ] Q2Q transformation emits events with column-level lineage (feedback → snippets)
- [ ] Evidence extraction emits events with LLM model metadata
- [ ] Input datasets: buddy_feedback with row counts
- [ ] Output datasets: evidence_snippets with confidence scores
- [ ] Column-level lineage facets where feasible (input columns → output columns)

---

### Agent 3.4: lineage-emitter-analytics
**MUST BE USED**: When instrumenting services/analytics with OL events

#### Task: Add OpenLineage emitters to analytics service

**Critical Pipelines**:
1. **SROI calculation** (`/services/analytics/src/calculators/sroi-calculator.ts`)
2. **VIS calculation** (`/services/analytics/src/calculators/vis-calculator.ts`)
3. **Aggregation pipeline** (`/services/analytics/src/pipelines/aggregate.ts`)

**Files to modify**:
- `/services/analytics/src/calculators/sroi-calculator.ts`
- `/services/analytics/src/calculators/vis-calculator.ts` (if exists)
- `/services/analytics/src/pipelines/aggregate.ts`
- `/services/analytics/src/index.ts` (initialize OL emitter)

**Example Instrumentation** (SROI calculator):
```typescript
// /services/analytics/src/calculators/sroi-calculator.ts
import { OpenLineageEmitter } from '@teei/openlineage';

export async function calculateSROI(
  params: SROICalculationParams,
  olEmitter: OpenLineageEmitter
): Promise<SROICalculation> {
  const runId = olEmitter.createRunId();
  const jobName = 'sroi-calculation';

  try {
    // START event
    await olEmitter.emitRunEvent({
      eventType: 'START',
      runId,
      jobName,
      inputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'buddy_system_events',
          facets: {
            dataSource: {
              query: `SELECT * FROM buddy_system_events WHERE timestamp BETWEEN '${params.periodStart}' AND '${params.periodEnd}'`,
            },
          },
        },
        {
          namespace: 'teei.postgres.public',
          name: 'sroi_valuation_weights',
        },
      ],
      jobFacets: {
        calculation: {
          formula: 'social_value / investment',
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
        },
      },
    });

    // Perform SROI calculation (existing logic)
    const result = await doCalculateSROI(params);

    // Fetch event IDs for lineage
    const eventIds = await fetchEventIds(params.periodStart, params.periodEnd, params.programType);

    // COMPLETE event
    await olEmitter.emitRunEvent({
      eventType: 'COMPLETE',
      runId,
      jobName,
      outputs: [
        {
          namespace: 'teei.postgres.public',
          name: 'sroi_calculations',
          facets: {
            stats: { rowCount: 1 },
            metricValue: {
              sroiRatio: result.sroiRatio,
              socialValue: result.socialValue,
              investment: result.investment,
              confidence: result.confidence,
            },
          },
        },
        {
          namespace: 'teei.postgres.public',
          name: 'metric_lineage',
          facets: {
            stats: { rowCount: 1 },
            lineage: {
              sourceEventCount: eventIds.length,
              metricType: 'sroi',
            },
          },
        },
      ],
      facets: {
        timing: { durationMs: Date.now() - startTime },
      },
    });

    return result;
  } catch (error) {
    await olEmitter.emitRunEvent({
      eventType: 'FAIL',
      runId,
      jobName,
      facets: {
        error: { message: error.message },
      },
    });
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] SROI calculation emits START, COMPLETE/FAIL events
- [ ] VIS calculation emits START, COMPLETE/FAIL events
- [ ] Aggregation pipeline emits events
- [ ] Input datasets: buddy_system_events, sroi_valuation_weights
- [ ] Output datasets: sroi_calculations, metric_lineage with confidence scores
- [ ] Metric values in facets (SROI ratio, social value, investment)

---

### Agent 3.5: lineage-sink-builder-clickhouse
**Tasks covered in Agent 1.2** (consolidated)

---

### Agent 3.6: lineage-sink-builder-postgres
**Tasks covered in Agent 1.3** (consolidated)

---

### Agent 1.5: transformation-tracker
**MUST BE USED**: For tracking dbt run lineage (deferred to J3 coordination)

#### Task: Add OpenLineage emitters to dbt runs
**Note**: This agent will coordinate with J3 (dbt semantic layer) to ensure dbt transformations emit OL events.

**Placeholder**:
- dbt has native OpenLineage integration via `openlineage-dbt` package
- Will be configured in `analytics/dbt/profiles.yml` once dbt project is created in J3
- Events will be emitted automatically on `dbt run`, `dbt test`

---

## Integration & Testing

### Integration Tests
**File**: `/packages/openlineage/__tests__/integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NatsConnection, connect } from 'nats';
import { OpenLineageEmitter } from '../src/emitter.js';

describe('OpenLineage Integration', () => {
  let natsClient: NatsConnection;
  let emitter: OpenLineageEmitter;

  beforeAll(async () => {
    natsClient = await connect({ servers: 'nats://localhost:4222' });
    emitter = new OpenLineageEmitter(natsClient, 'teei.test', 'test-service');
  });

  afterAll(async () => {
    await natsClient.close();
  });

  it('should emit START event to NATS', async () => {
    const runId = emitter.createRunId();

    const receivedEvents: any[] = [];
    const sub = natsClient.subscribe('openlineage.events');
    (async () => {
      for await (const msg of sub) {
        receivedEvents.push(JSON.parse(msg.data.toString()));
        sub.unsubscribe();
      }
    })();

    await emitter.emitRunEvent({
      eventType: 'START',
      runId,
      jobName: 'test-job',
    });

    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for event

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].eventType).toBe('START');
    expect(receivedEvents[0].job.name).toBe('test-job');
  });
});
```

### E2E Tests
**File**: `/services/analytics/__tests__/lineage-e2e.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ClickHouseClient } from '../src/lib/clickhouse-client.js';

describe('Lineage E2E', () => {
  it('should track SROI calculation lineage end-to-end', async () => {
    // 1. Trigger SROI calculation
    const result = await calculateSROI({
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
    });

    // 2. Wait for lineage events to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Query ClickHouse lineage_events
    const clickhouse = new ClickHouseClient();
    const events = await clickhouse.query({
      query: `
        SELECT * FROM lineage_events
        WHERE job_name = 'sroi-calculation'
        AND event_time >= now() - INTERVAL 1 MINUTE
        ORDER BY event_time ASC
      `,
    });

    // 4. Verify START and COMPLETE events exist
    expect(events.data).toHaveLength(2);
    expect(events.data[0].event_type).toBe('START');
    expect(events.data[1].event_type).toBe('COMPLETE');
    expect(events.data[1].output_datasets).toContain('sroi_calculations');

    // 5. Query PostgreSQL dataset_profiles
    const profile = await db
      .select()
      .from(datasetProfiles)
      .where(sql`namespace = 'teei.postgres.public' AND name = 'sroi_calculations'`)
      .limit(1);

    expect(profile).toHaveLength(1);
    expect(profile[0].lastLoadTime).toBeInstanceOf(Date);
  });
});
```

---

## Success Criteria (J1)

- [ ] **Package created**: `@teei/openlineage` with emitter class, NATS transport, TypeScript types
- [ ] **ClickHouse sink**: `lineage_events` table, NATS subscriber, compaction job
- [ ] **PostgreSQL sink**: `dataset_profiles` table, freshness tracking
- [ ] **4 services instrumented**:
  - [ ] impact-in: Benevity, Goodera, Workday connectors
  - [ ] reporting: Report generation, PDF export, scheduled reports
  - [ ] q2q-ai: Feedback ingestion, Q2Q transformation, evidence extraction
  - [ ] analytics: SROI, VIS calculations, aggregation pipeline
- [ ] **Event types**: START, RUNNING, COMPLETE, FAIL emitted correctly
- [ ] **Column-level lineage**: Q2Q pipeline tracks feedback → snippets
- [ ] **OL spec compliance**: Events match OpenLineage 1.0.5 schema
- [ ] **≥90% pipeline coverage**: All critical pipelines emit OL events
- [ ] **Dataset→metric lineage resolvable**: Can trace SROI back to buddy_system_events
- [ ] **Monitoring**: Grafana dashboard shows OL event rate, sink lag
- [ ] **Documentation**: `/docs/data/openlineage_guide.md` published (J7)

---

## Dependencies

- **Blocks**: J4 (Catalog UI needs dataset_profiles table)
- **Blocks**: J6 (Data SLO dashboards need lineage_events for coverage SLO)
- **Blocked by**: None (can start immediately)
- **Coordinates with**: J3 (dbt run lineage via Agent 1.5)

---

## Rollout Plan

### Phase 1: Foundation (Week 1)
- Agent 1.1: Create `@teei/openlineage` package
- Agent 1.2: Create ClickHouse `lineage_events` table + sink
- Agent 1.3: Create PostgreSQL `dataset_profiles` table

### Phase 2: Service Instrumentation (Week 2)
- Agent 3.1: Instrument impact-in service
- Agent 3.2: Instrument reporting service
- Agent 3.3: Instrument q2q-ai service
- Agent 3.4: Instrument analytics service

### Phase 3: Testing & Validation (Week 2 end)
- Integration tests: Verify events flow to NATS → ClickHouse/PostgreSQL
- E2E tests: End-to-end lineage tracing (event → metric → report)
- Performance tests: Ensure <5ms overhead per OL emission

### Phase 4: Monitoring & Rollout (Week 3)
- Deploy Grafana dashboard (OL event rate, sink lag)
- Enable OL emitters in production (feature flag)
- Monitor for 48h, verify no performance degradation
- Document in `/docs/data/openlineage_guide.md` (J7)

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **OL emission overhead >10ms** | Medium | Medium | Async emission (fire-and-forget); batch mode for high-volume pipelines |
| **NATS queue backlog** | Low | High | Monitor queue depth; scale sink workers horizontally |
| **ClickHouse insert latency** | Low | Medium | Batch inserts (1000 events/batch); use async inserts |
| **Column lineage complexity** | High | Low | Start with table-level lineage; defer column-level to Phase 2 |
| **Schema drift in OL events** | Medium | Medium | Validate against OL JSON schema; CI check for spec compliance |

---

**Next Steps**: Proceed to J2 (Great Expectations coverage) planning.
