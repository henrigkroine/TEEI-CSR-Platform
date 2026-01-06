# TEEI CSR Platform: Backend Services Architecture Report

**Date**: 2025-11-14
**Exploration Depth**: MEDIUM
**Status**: Phase B Hardening in Progress
**Branch**: `claude/phase-b-hardening-011CV5sicbJ5JUw8qXjjCsYW`

---

## EXECUTIVE SUMMARY

The TEEI CSR Platform has established a **solid Phase A foundation** with 7 microservices, NATS event bus, PostgreSQL schema, and event contracts. The architecture supports:

- Multi-program integration (Buddy, Kintell, Upskilling, Mentorship)
- Event-driven data flow with NATS
- Q2Q AI skeleton for qualitative-to-quantitative conversion
- GDPR/PII compliance infrastructure
- Safety & moderation pipeline

**Critical Gap**: No production-grade reporting/analytics infrastructure exists yet. ClickHouse is mentioned in README but not implemented.

---

## 1. SERVICES INVENTORY

### 1.1 Current Services (7 services)

| Service | Port | Status | Dependencies | Purpose |
|---------|------|--------|--------------|---------|
| **API Gateway** | 3000 | ✅ Full | Fastify, JWT, Rate-limit | Single entry point; JWT auth, RBAC, reverse proxy |
| **Unified Profile** | 3001 | ✅ Full | Fastify, NATS, Drizzle | User identity aggregation across programs |
| **Kintell Connector** | 3002 | ✅ Full | Fastify, CSV parser, NATS | Webhook + CSV ingestion for language/mentorship |
| **Buddy Service** | 3003 | ✅ Full | Fastify, NATS | Buddy matching & event adapter |
| **Upskilling Connector** | 3004 | ✅ Full | Fastify, CSV parser, NATS | Course completion ingestion |
| **Q2Q AI Service** | 3005 | ⚠️ Stub | Fastify, Zod | Outcome classification (random scores for demo) |
| **Safety Moderation** | 3006 | ⚠️ Stub | Fastify, Zod | Content screening (not connected to event bus) |

### 1.2 Services NOT Yet Implemented

| Service | Purpose | Phase | Priority |
|---------|---------|-------|----------|
| **Reporting Service** | SROI/VIS/metrics reporting | Worker 2 | HIGH |
| **Notifications Service** | Email/SMS/push notifications | Future | MEDIUM |
| **Analytics Ingestion** | ClickHouse data pipeline | Future | HIGH |
| **Discord Bot Service** | Community engagement | Future | LOW |

### 1.3 Service Implementation Pattern

All services follow consistent Fastify-based pattern:
```typescript
// Pattern in services/*/src/index.ts
- Fastify initialization with logger
- Health check manager
- Routes registration (typically `/v1` prefix)
- Event bus connection (where applicable)
- Graceful shutdown with signal handlers
```

**Example**: `services/q2q-ai/src/index.ts` (lines 1-48)

---

## 2. DATABASE SCHEMA & TABLES

### 2.1 Core Tables

#### Users & Authorization
| Table | Purpose | Status |
|-------|---------|--------|
| `users` | Identity (email, role, name) | ✅ |
| `companies` | Employer/organization records | ✅ |
| `company_users` | User-company association | ✅ |
| `external_id_mappings` | Surrogate key mapping (kintell→UUID) | ✅ |
| `program_enrollments` | User journey tracking | ✅ |

#### Program Data
| Table | Purpose | Status |
|-------|---------|--------|
| `buddy_matches` | Buddy pairing records | ✅ |
| `buddy_events` | Hangouts, activities, workshops | ✅ |
| `buddy_checkins` | Mood & progress notes | ✅ |
| `buddy_feedback` | Peer ratings (0.0-1.0) | ✅ |
| `kintell_sessions` | Language/mentorship sessions | ✅ |
| `learning_progress` | Course enrollment & completion | ✅ |

#### Analytics & Outcomes (CRITICAL)
| Table | Purpose | Status | Schema |
|-------|---------|--------|--------|
| `outcome_scores` | AI-classified scores per dimension | ✅ | id (uuid), textId (uuid), textType (varchar), dimension, score (0-1), confidence, modelVersion, createdAt |
| `evidence_snippets` | Supporting text for scores | ✅ | id (uuid), outcomeScoreId, snippetText, snippetHash (SHA-256), embeddingRef, createdAt |
| `metrics_company_period` | Aggregated KPIs | ✅ | id, companyId, periodStart, periodEnd, participantsCount, volunteersCount, sessionsCount, avgIntegrationScore, avgLanguageLevel, avgJobReadiness, sroiRatio (5.23:1 format), visScore, createdAt |

#### Compliance & Security
| Table | Purpose | Status |
|-------|---------|--------|
| `audit_logs` | Immutable action trail | ✅ |
| `safety_flags` | Content moderation records | ✅ |
| `encrypted_user_pii` | PII (encrypted at rest) | ✅ |
| `pii_access_log` | PII access audit | ✅ |
| `pii_deletion_queue` | GDPR right-to-be-forgotten | ✅ |
| `encryptedUserPii` | Field-level encrypted sensitive data | ✅ |

### 2.2 Outcome Dimensions (Q2Q Model)

From `/services/q2q-ai/src/taxonomy.ts`:

```typescript
enum OutcomeDimension {
  CONFIDENCE = 'confidence'           // Self-assurance in abilities
  BELONGING = 'belonging'             // Inclusion/community connection
  LANG_LEVEL_PROXY = 'lang_level_proxy'  // Language proficiency proxy
  JOB_READINESS = 'job_readiness'     // Employment preparedness
  WELL_BEING = 'well_being'           // Mental/emotional wellness
}
```

**Score Format**: 0.000 - 1.000 (decimal precision 3 places)

### 2.3 Database Connection

From `packages/shared-schema/src/db.ts`:
```typescript
- Connection Pool: max 10 (configurable via DATABASE_POOL_MAX)
- Idle Timeout: 20 seconds
- Connect Timeout: 10 seconds
- Default URL: postgresql://teei:teei_dev_password@localhost:5432/teei_platform
```

---

## 3. EVENT BUS SETUP & EVENT TYPES

### 3.1 Event Bus Implementation

**Technology**: NATS (JetStream-enabled)
- URL: `nats://localhost:4222`
- Monitoring: `http://localhost:8222`
- Cluster Routing: 6222
- Implementation: `packages/shared-utils/src/event-bus.ts` (EventBus class)

**Features**:
- Subject-based routing (topics converted from dot-notation)
- Queue groups for consumer load-balancing
- Event envelopes with metadata (correlationId, causationId)
- Infinite reconnection retry (2s backoff)
- Singleton pattern: `getEventBus()`

### 3.2 Event Contracts

From `packages/event-contracts/src/index.ts`:

#### Domain Events (8 types)

**Buddy Events**:
- `BuddyMatchCreated` - Pair created
- `BuddyEventLogged` - Activity recorded
- `BuddyCheckinCompleted` - Mood/progress checkin
- `BuddyFeedbackSubmitted` - Peer rating submitted

**Kintell Events**:
- `KintellSessionScheduled` - Session booked
- `KintellSessionCompleted` - Session finished
- `KintellRatingCreated` - Feedback submitted

**Upskilling Events**:
- `UpskillingCourseCompleted` - Course finished
- `UpskillingCredentialIssued` - Certificate earned
- `UpskillingProgressUpdated` - Progress milestone

**Orchestration Events**:
- `OrchestrationJourneyMilestoneReached` - Major milestone achieved
- `OrchestrationProfileUpdated` - Profile aggregated

**Safety Events**:
- `SafetyFlagRaised` - Content flagged for review
- `SafetyReviewCompleted` - Moderation decision made

### 3.3 Event Envelope Structure

```typescript
{
  type: string;              // Event type (e.g., 'buddy.match.created')
  data: T;                   // Domain-specific payload
  metadata: {
    id: string;              // Unique event ID (UUID)
    version: string;         // Event schema version ('v1')
    timestamp: string;       // ISO 8601 timestamp
    correlationId?: string;  // Trace across services
    causationId?: string;    // Causation event ID
    metadata?: Record<string, unknown>;  // Custom context
  };
}
```

### 3.4 Event Subscriptions (Implemented)

**Unified Profile Service** subscribes to:
- `upskilling.course.completed` → Update journey flags
- `kintell.session.completed` → Update language/mentorship flags
- `buddy.match.created` → Update buddy match flag

**Q2Q AI Service** listens to:
- Feedback events → Classify text → Store `outcome_scores`

---

## 4. AI/LLM INTEGRATION

### 4.1 Q2Q AI Service Status

**Location**: `/services/q2q-ai/`

**Current State**: ⚠️ **STUB IMPLEMENTATION**

From `services/q2q-ai/src/classifier.ts` (lines 15-50):
```typescript
/**
 * STUB CLASSIFIER - PLACEHOLDER IMPLEMENTATION
 * Returns random scores for demonstration purposes.
 * TODO: Replace with actual classification logic using:
 * - Fine-tuned transformer models
 * - OpenAI/Claude API integration
 * - Local ML inference service
 * - Or other appropriate AI/ML solution
 */
export async function classifyText(text: string): Promise<ClassificationResult> {
  // Generate random scores between 0 and 1 for each dimension
  const scores: Record<OutcomeDimension, number> = {
    [OutcomeDimension.CONFIDENCE]: Math.random(),
    [OutcomeDimension.BELONGING]: Math.random(),
    // ...
  };
  // Returns textLength, wordCount, timestamp
}
```

### 4.2 Taxonomy Definition

**Location**: `/services/q2q-ai/src/taxonomy.ts`

- 5 outcome dimensions fully defined with:
  - English labels
  - Descriptions
  - Scale interpretations (0 = low, 1 = high)
  - CEFR language proficiency proxy

### 4.3 Evidence Extraction

From `classifier.ts`:
```typescript
export function extractEvidenceSnippets(
  text: string,
  dimension: OutcomeDimension,
  score: number
): string[] {
  // STUB: Returns first 100 chars + '...'
  // TODO: Use NLP to extract relevant phrases
}
```

### 4.4 Key Gaps

- ❌ No actual ML model integration
- ❌ No OpenAI/Claude API calls
- ❌ No vector embeddings (though pgvector ready)
- ❌ No prompt templates
- ❌ Random classification only

---

## 5. ANALYTICS INFRASTRUCTURE

### 5.1 Current State: ⚠️ PLANNED BUT NOT IMPLEMENTED

**Status**: Mentioned in README, agent definitions exist, no code.

**In README.md**:
```
"Analytics": ClickHouse for time-series data
"services/reporting/" - Impact analytics
```

**Agent Definitions Exist**:
- `.claude/agents/analytics-specialist.md`
- `.claude/agents/clickhouse-specialist.md`

### 5.2 Metrics Available (PostgreSQL Only)

Table: `metrics_company_period`
- participantsCount (integer)
- volunteersCount (integer)
- sessionsCount (integer)
- avgIntegrationScore (0-1)
- avgLanguageLevel (0-1)
- avgJobReadiness (0-1)
- sroiRatio (format: 5.23 = 5.23:1)
- visScore (Volunteer Impact Score)

**Limitation**: No time-series analytics, no real-time dashboards, no ClickHouse ingestion pipeline.

### 5.3 What Needs to be Built

1. **ClickHouse Integration**
   - Schema for time-series metrics
   - Data pipeline from PostgreSQL → ClickHouse
   - Real-time ingestion triggers

2. **Reporting Service**
   - SROI calculation engine
   - VIS aggregation
   - Corporate dashboard APIs
   - Export (PDF, CSV)

3. **Analytics Queries**
   - Cohort analysis
   - Retention funnel
   - Impact attribution
   - Segment performance

---

## 6. NOTIFICATION & INTEGRATION INFRASTRUCTURE

### 6.1 Current State

**Status**: ❌ NOT IMPLEMENTED

No notification service exists yet. Planned for Future phases.

### 6.2 What Exists

**API Gateway GDPR Privacy Routes** (`/services/api-gateway/src/routes/privacy.ts`):
- `/v1/privacy/export` - Data export endpoint
- `/v1/privacy/delete` - Right to be forgotten
- Compliance audit hooks

### 6.3 What Needs to be Built

1. **Notification Service** (Email/SMS/Push)
   - Multi-channel support
   - Template system
   - Retry logic
   - Delivery tracking

2. **Integration APIs**
   - Benevity connector
   - Goodera connector
   - Workday integration
   - Slack/Teams webhooks

---

## 7. PHASE B PACKAGES THAT CAN BE LEVERAGED

### 7.1 Observability Package

**Location**: `/packages/observability/`

**Features**:
- OpenTelemetry distributed tracing
- Sentry error tracking
- Prometheus metrics collection
- Structured JSON logging
- Health checks (liveness, readiness, startup)
- StructuredLogger class
- HealthCheckManager class

**Status**: ✅ Implemented and documented

**Usage Pattern**:
```typescript
import {
  initializeOTel,
  initializeSentry,
  StructuredLogger,
  HealthCheckManager,
} from '@teei/observability';

const logger = new StructuredLogger({ serviceName: 'my-service' });
const healthManager = new HealthCheckManager('my-service', '1.0.0');
```

**Services Using It**: All services have basic health endpoints

### 7.2 Compliance Package

**Location**: `/packages/compliance/src/`

**Components**:
- `audit-logger.ts` - Compliance audit logging
- `dsr-orchestrator.ts` - Data Subject Request handling (GDPR)
- `pii-encryption.ts` - Field-level encryption
- `tenant-isolation.ts` - Multi-tenant data segregation

**Status**: ✅ Implemented and integrated with audit_logs table

### 7.3 Other Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `shared-schema` | Drizzle models, migrations | ✅ |
| `event-contracts` | Event type definitions | ✅ |
| `shared-utils` | Event bus, logger, correlation | ✅ |
| `http-client` | Circuit breaker, resilience | ✅ |
| `contracts` | Pact contract tests | ⚠️ Documented, not tested |
| `openapi` | OpenAPI specs (index.md) | ⏳ Planned |
| `auth` | OIDC/JWT auth (not in packages yet) | ⏳ In development |
| `events` | DLQ, retry logic | ✅ |

---

## 8. ARCHITECTURE STRENGTHS

### ✅ Well-Designed Foundations

1. **Type Safety**
   - Full TypeScript implementation
   - Zod runtime validation
   - Event contract versioning

2. **Event-Driven**
   - NATS for async communication
   - Event envelope pattern
   - Correlation IDs for tracing

3. **Privacy/Compliance**
   - PII encryption (separate table)
   - Audit logging (immutable)
   - GDPR infrastructure (DSR, deletion queue)
   - Tenant isolation ready

4. **Scalability**
   - Drizzle ORM (type-safe, zero-overhead)
   - NATS JetStream (persistent, distributed)
   - Queue groups for load-balancing
   - Connection pooling

5. **Observability**
   - Structured logging (Pino + custom)
   - Health checks (liveness/readiness)
   - OpenTelemetry ready
   - Correlation IDs

---

## 9. CRITICAL GAPS & MISSING PIECES

### 🔴 HIGH PRIORITY

| Gap | Impact | Worker Responsible |
|-----|--------|-------------------|
| **Q2Q AI real classifier** | Can't generate actual outcomes | Q2Q AI Architect |
| **Reporting/Analytics service** | No SROI/impact metrics | Analytics Lead (New) |
| **ClickHouse integration** | No time-series insights | ClickHouse Specialist |
| **Notification service** | No user communication | Notifications Engineer (New) |
| **Testing suite** | Untested code | QA Lead (Phase B) |

### 🟡 MEDIUM PRIORITY

| Gap | Impact | Worker Responsible |
|-----|--------|-------------------|
| **OpenAPI documentation** | No API specs | API Versioning Engineer |
| **Contract tests** | No service compatibility checks | Contract Test Engineer |
| **Production security** | HS256 JWT only | Security Lead (Phase B) |
| **Webhook signature validation** | No integrity verification | Webhook Security Engineer |

### 🟢 LOW PRIORITY

| Gap | Impact |
|-----|--------|
| **Discord bot** | Community engagement only |
| **Benevity/Goodera connectors** | External reporting only |
| **Workday integration** | HR system sync only |

---

## 10. RECOMMENDED ARCHITECTURE FOR NEW SERVICES

Based on Phase A patterns, Worker 2 should follow:

### Service Template

```typescript
// services/NEW_SERVICE/src/index.ts
import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('new-service');
const PORT = parseInt(process.env.PORT_NEW_SERVICE || '3007');

async function start() {
  const app = Fastify({ logger });
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  
  // Routes
  app.register(routes, { prefix: '/v1' });
  
  // Event bus (if applicable)
  const eventBus = getEventBus();
  await eventBus.connect();
  
  await app.listen({ port: PORT, host: '0.0.0.0' });
  healthManager.setReady(true);
}

start();
```

### Package Dependencies (Consistent)

```json
{
  "@teei/event-contracts": "workspace:*",
  "@teei/shared-schema": "workspace:*",
  "@teei/shared-utils": "workspace:*",
  "fastify": "^4.25.2",
  "zod": "^3.22.4"
}
```

### Health Checks

All services implement:
- `GET /health` - Quick liveness probe
- Health manager with states: alive, ready, shutting_down

---

## 11. DATABASE QUERY PATTERNS FOR REPORTING

### For Gen-AI Reporting Service

```sql
-- Get outcomes by dimension over time
SELECT
  dimension,
  DATE_TRUNC('day', created_at) as day,
  AVG(score::numeric) as avg_score,
  STDDEV(score::numeric) as stddev_score,
  COUNT(*) as count
FROM outcome_scores
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY dimension, DATE_TRUNC('day', created_at)
ORDER BY day, dimension;

-- Get evidence snippets for high-confidence scores
SELECT
  os.dimension,
  os.score,
  os.confidence,
  es.snippet_text,
  os.created_at
FROM outcome_scores os
LEFT JOIN evidence_snippets es ON es.outcome_score_id = os.id
WHERE os.confidence > 0.8
  AND os.created_at >= NOW() - INTERVAL '7 days'
ORDER BY os.score DESC;

-- Aggregate metrics by company
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT u.id) as total_participants,
  AVG(COALESCE(mcp.avg_integration_score, 0)) as avg_integration,
  AVG(COALESCE(mcp.sroi_ratio, 0)) as avg_sroi
FROM companies c
LEFT JOIN company_users cu ON cu.company_id = c.id
LEFT JOIN users u ON u.id = cu.user_id
LEFT JOIN metrics_company_period mcp ON mcp.company_id = c.id
GROUP BY c.id, c.name;
```

---

## 12. WORKER 2 ORCHESTRATION FOCUS AREAS

### Phase B Hardening (In Progress)

**5 Leads × 6 Specialists = 30 agents**

**Lead 1: Security** - JWT/OIDC/WAF (completed)
**Lead 2: Platform** - API versioning, contracts, DLQ (in progress)
**Lead 3: Reliability** - OTel, metrics, health (in progress)
**Lead 4: Data** - Migrations, privacy, idempotency (in progress)
**Lead 5: Quality** - Unit/integration/API tests (in progress)

### Worker 2 (NEW - Not Yet Started)

Recommended team structure:
- **Reporting Lead**: SROI/VIS calculation, metrics aggregation
- **Analytics Lead**: ClickHouse setup, time-series ingestion
- **Q2Q AI Lead**: Actual classifier implementation
- **Notifications Lead**: Email/SMS/push service
- **Integration Lead**: External API connectors (Benevity, Goodera, Workday)

---

## 13. SUMMARY TABLE: WHAT EXISTS VS WHAT'S NEEDED

| Component | Exists | Status | Worker2 Task |
|-----------|--------|--------|-------------|
| Database Schema | ✅ | Complete | Maintain & extend |
| Event Bus | ✅ | Complete | Add DLQ, resilience |
| Services (7x) | ✅ | Core complete | Add tests, hardening |
| Q2Q Classifier | ⚠️ | Stub only | **Replace with real ML** |
| Audit/Compliance | ✅ | Implemented | **Add audit queries** |
| Observability | ✅ | Framework ready | **Integrate into services** |
| Reporting Service | ❌ | Missing | **Build from scratch** |
| Analytics Pipeline | ❌ | Missing | **ClickHouse + ingestion** |
| Notifications | ❌ | Missing | **Build from scratch** |
| Tests | ❌ | Missing | **Build comprehensive suite** |
| OpenAPI Docs | ❌ | Planned | **Generate & publish** |

---

## 14. RECOMMENDED NEXT STEPS

1. **Immediate (This Sprint)**
   - Integrate observability into all services
   - Build comprehensive test suite
   - Generate OpenAPI specs

2. **Short-term (2-3 Sprints)**
   - Implement real Q2Q classifier (OpenAI/Claude)
   - Build Reporting Service with SROI calculation
   - Setup ClickHouse analytics pipeline

3. **Medium-term (1-2 Months)**
   - Build Notifications Service
   - Add external integrations (Benevity, etc.)
   - Performance optimization & load testing

---

## Files Referenced

- `/home/user/TEEI-CSR-Platform/packages/shared-schema/src/schema/*.ts`
- `/home/user/TEEI-CSR-Platform/services/*/src/index.ts`
- `/home/user/TEEI-CSR-Platform/packages/event-contracts/src/index.ts`
- `/home/user/TEEI-CSR-Platform/packages/shared-utils/src/event-bus.ts`
- `/home/user/TEEI-CSR-Platform/packages/observability/src/*.ts`
- `/home/user/TEEI-CSR-Platform/packages/compliance/src/*.ts`

---

**Report Generated**: 2025-11-14
**Exploration Thoroughness**: MEDIUM (targeted service & schema review)
