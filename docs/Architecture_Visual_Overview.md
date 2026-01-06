# Phase A Architecture - Visual Overview

## Service Topology

```
                        ┌─────────────────────────────────────┐
                        │    API GATEWAY (Port 3000)         │
                        │    - JWT Auth                       │
                        │    - Rate Limiting                  │
                        │    - Reverse Proxy                  │
                        │    - Health Aggregation             │
                        └────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┬─────────────────┬──────────────────┐
                 │                       │                       │                 │                  │
                 ▼                       ▼                       ▼                 ▼                  ▼
        ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
        │ Unified Profile │  │ Kintell Conn.    │  │ Buddy Service    │  │Upskilling    │  │ Q2Q AI Service   │
        │ (Port 3001)     │  │ (Port 3002)      │  │ (Port 3003)      │  │ (Port 3004)  │  │ (Port 3005)      │
        │                 │  │                  │  │                  │  │              │  │                  │
        │ - Profile CRUD  │  │ - CSV Import     │  │ - Buddy Matches  │  │ - Courses    │  │ - Text Classify  │
        │ - ID Mapping    │  │ - Session Map.   │  │ - Events Logging │  │ - Progress   │  │ - Outcomes       │
        │ - Journey Track │  │ - Rating Norm.   │  │ - Check-ins      │  │ - Credentials│  │ - Taxonomy       │
        └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  └──────┬───────────┘
                 │                    │                      │                   │                │
                 └────────────────────┼──────────────────────┼───────────────────┼────────────────┘
                                      │                      │
                          ┌───────────┴──────────┬──────────┴───────────┐
                          │                      │                      │
                          ▼                      ▼                      ▼
                    ┌─────────────┐         ┌──────────┐         ┌─────────────────┐
                    │  NATS Bus   │         │PostgreSQL│         │Safety Moderation│
                    │ (JetStream) │         │(Port 5432)         │ (Port 3006)     │
                    │(Port 4222)  │         │          │         │                 │
                    │             │         │ - Users  │         │ - Screen Content│
                    │ - Events    │         │ - Sessions         │ - PII Detection │
                    │ - Pubsub    │         │ - Buddies          │ - Flag & Review │
                    │ - Topics    │         │ - Progress         └─────────────────┘
                    └─────────────┘         │ - Scores │
                                            │ - Safety │
                                            └──────────┘
```

## Data Flow - Event-Driven Architecture

```
CSV Import (Kintell)
        ↓
  ┌─────────────────────────────────────┐
  │ Map & Validate (Zod Schemas)        │
  │ - Session Type Normalization        │
  │ - Rating Scale Conversion (1-5→0-1) │
  │ - Email → User ID Lookup            │
  └─────────────────────────────────────┘
        ↓
  ┌─────────────────────────────────────┐
  │ Publish Event to NATS               │
  │ Event: kintell.session.completed    │
  └─────────────────────────────────────┘
        ↓
        ├──→ [Unified Profile Subscriber]
        │    - Update user journey
        │    - Aggregate profile
        │
        ├──→ [Q2Q AI Subscriber]
        │    - Extract outcomes from feedback
        │    - Generate scores
        │
        └──→ [Metrics Calculator]
             - Aggregate KPIs
             - Calculate SROI

Events Flow Through Shared Event Bus
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Frontend)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CORS Validation                    ✅ Implemented          │
│  2. Rate Limiting                      ✅ Implemented (100/min) │
│  3. JWT Validation (HS256)             ✅ Implemented          │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                    AUTHORIZATION LAYER                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  4. Role-Based Access Control (RBAC)  ✅ Implemented (4 roles) │
│  5. Claims-Based Validation            ✅ Implemented          │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                            │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  6. Input Validation (Zod)             ✅ Implemented          │
│  7. SQL Injection Protection           ✅ Drizzle ORM         │
│  8. Error Masking (Prod)               ✅ Implemented          │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│                     DATABASE LAYER                              │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  9. Connection Pooling                 ✅ Implemented (10 max) │
│ 10. Field Encryption (PII)             ❌ Not Implemented      │
│ 11. Audit Logging                      ⚠️  Partial             │
│                                                                  │
└────────────────────────────────────────────────────────────────┘

Legend: ✅ = Implemented, ⚠️ = Partial, ❌ = Missing
```

## Database Schema - Relationship Diagram

```
                    ┌──────────────┐
                    │    USERS     │
                    │  (id: uuid)  │
                    │  role        │
                    │  email       │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┬───────────────┐
        │                  │                  │               │
        ▼                  ▼                  ▼               ▼
    ┌────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
    │ COMPANY    │  │KINTELL_     │  │BUDDY_       │  │LEARNING_     │
    │USERS       │  │SESSIONS     │  │MATCHES      │  │PROGRESS      │
    │(JOIN)      │  │(session_id) │  │(match_id)   │  │(user_id)     │
    └────────────┘  │(participant │  │(participant │  │(provider)    │
                    │_id, vol_id) │  │_id, buddy_id│  │(course_id)   │
                    └─────┬───────┘  └─────┬───────┘  └──────────────┘
                          │                │
                          ▼                ▼
                    ┌─────────────┐  ┌─────────────┐
                    │BUDDY_       │  │BUDDY_       │
                    │FEEDBACK     │  │CHECKINS     │
                    │(match_id)   │  │(match_id)   │
                    └─────────────┘  └─────────────┘

        ┌────────────────────────────────────────┐
        │     Q2Q AI / OUTCOMES                  │
        ├────────────────────────────────────────┤
        │  OUTCOME_SCORES                        │
        │  (text_id, dimension, score: 0-1)      │
        │           │                            │
        │           └──→ EVIDENCE_SNIPPETS       │
        │               (embedding_ref)          │
        └────────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SAFETY_FLAGS                       │
│  (content_id, flag_reason,          │
│   review_status, requires_review)   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  METRICS_COMPANY_PERIOD             │
│  (company_id, sroi, vis, avg_*)     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  EXTERNAL_ID_MAPPINGS               │
│  (user_id, external_system,         │
│   external_id)                      │
└─────────────────────────────────────┘
```

## Service Dependencies (Workspace)

```
shared-utils
├── logger.ts         (Pino configuration)
├── event-bus.ts      (NATS client)
├── errors.ts         (Error classes)
└── correlation.ts    (Tracing support)
    ↑
    ├── depends on: event-contracts
    │
    └── used by ALL services

event-contracts
├── base.ts           (Event envelope)
├── buddy/            (Buddy events)
├── kintell/          (Session events)
├── upskilling/       (Course events)
├── safety/           (Safety events)
├── orchestration/    (Journey events)
    ↑
    └── used by: event-bus, all services

shared-schema
├── db.ts             (Drizzle client)
├── schema/
│   ├── users.ts
│   ├── buddy.ts
│   ├── kintell.ts
│   ├── upskilling.ts
│   ├── q2q.ts
│   ├── safety.ts
│   └── metrics.ts
├── migrate.ts        (Migration runner)
├── seed/             (Test data)
    ↑
    └── used by: all services

Services:
api-gateway      → shared-utils
unified-profile  → shared-utils, shared-schema, event-contracts
kintell-conn.    → shared-utils, shared-schema, event-contracts
buddy-service    → shared-utils, shared-schema, event-contracts
upskilling-conn. → shared-utils, shared-schema, event-contracts
q2q-ai           → shared-utils, shared-schema, event-contracts
safety-moder.    → shared-utils, shared-schema, event-contracts
```

## Port Assignment & Service Discovery

```
Service                  Port    Health Endpoint    Proxy Route
─────────────────────────────────────────────────────────────────
API Gateway              3000    GET /health        / (root)
Unified Profile          3001    GET /health        /profile
Kintell Connector        3002    GET /health        /kintell
Buddy Service            3003    GET /health        /buddy
Upskilling Connector     3004    GET /health        /upskilling
Q2Q AI Service           3005    GET /health        /q2q
Safety Moderation        3006    GET /health        /safety
─────────────────────────────────────────────────────────────────
PostgreSQL               5432    pg_isready         (direct)
NATS                     4222    :8222/healthz      (direct)
PgAdmin (dev)            5050    Web UI             (direct)
```

## Development Workflow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Install & Setup                                           │
├──────────────────────────────────────────────────────────────┤
│ $ pnpm install                                               │
│ $ cp .env.example .env                                       │
│ $ docker compose up -d                                       │
│ $ pnpm db:migrate && pnpm db:seed                           │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Development                                               │
├──────────────────────────────────────────────────────────────┤
│ $ pnpm dev           # All services concurrently             │
│ $ pnpm lint          # ESLint check                          │
│ $ pnpm typecheck     # TypeScript check                      │
│ $ pnpm test          # Run tests (currently skipped)         │
│ $ pnpm build         # Production build                      │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. Testing                                                   │
├──────────────────────────────────────────────────────────────┤
│ Manual: Use *.http files in VSCode Rest Client extension     │
│ Unit:   vitest (zero tests currently)                        │
│ Int'l:  vitest + Docker services                            │
│ E2E:    HTTP tests + sample CSV imports                      │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. CI/CD Pipeline (GitHub Actions)                          │
├──────────────────────────────────────────────────────────────┤
│ Lint → Typecheck → Test → Build → [Optional: Deploy]        │
└──────────────────────────────────────────────────────────────┘
```

---

**Report Generated**: 2025-11-13
**Codebase**: TEEI CSR Platform @ /home/user/TEEI-CSR-Platform
**Branch**: claude/phase-b-hardening-011CV5sicbJ5JUw8qXjjCsYW

