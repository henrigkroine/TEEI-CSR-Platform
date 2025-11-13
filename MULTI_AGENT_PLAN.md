# Worker 2 Multi-Agent Execution Plan

**Status**: 🚧 In Progress
**Branch**: `worker2/services-schema-ingestion`
**Started**: 2025-11-13
**Target Completion**: TBD

---

## Phase 1: Foundation Setup ⏳

### 1.1 Monorepo Structure
- [ ] Create pnpm workspace configuration
- [ ] Set up TypeScript project references
- [ ] Configure ESLint + Prettier
- [ ] Set up shared tsconfig.json
- [ ] Create .env.example files

**Assigned**: Infrastructure Lead
**Status**: Not Started

### 1.2 Documentation
- [x] Create AGENTS.md
- [x] Create MULTI_AGENT_PLAN.md
- [ ] Create reports/worker2_services.md
- [ ] Update docs/Platform_Architecture.md
- [ ] Update docs/System_Diagram.md

**Assigned**: Tech Lead Orchestrator
**Status**: In Progress

---

## Phase 2: Data Layer 📊

### 2.1 Event Contracts Package
- [ ] Initialize packages/event-contracts
- [ ] Define buddy.* event types (match.created, event.logged, checkin.completed, feedback.submitted)
- [ ] Define kintell.* event types (session.completed, rating.created, session.scheduled)
- [ ] Define upskilling.* event types (course.completed, credential.issued, progress.updated)
- [ ] Define orchestration.* event types (journey.milestone.reached, profile.updated)
- [ ] Define safety.* event types (flag.raised, review.completed)
- [ ] Add Zod schemas for all payloads
- [ ] Implement event versioning (v1, v2, etc.)
- [ ] Write unit tests for validators

**Assigned**: Data Modeling Lead → Contract Designer, Validation Engineer
**Status**: Not Started
**Dependencies**: None

### 2.2 Shared Schema Package
- [ ] Initialize packages/shared-schema with Drizzle
- [ ] Create core tables: users, companies, company_users
- [ ] Create program_enrollments table
- [ ] Create kintell_sessions table (language|mentorship, mapping fields)
- [ ] Create buddy_* tables (matches, events, checkins, feedback)
- [ ] Create learning_progress table
- [ ] Create outcome_scores table (dimension, score, confidence)
- [ ] Create evidence_snippets table (hash, embedding pointers)
- [ ] Create metrics_company_period table (aggregates, sroi_ratio, vis_score)
- [ ] Add indexes for performance
- [ ] Implement PII partitioning strategy
- [ ] Create initial migration (0000_init.sql)
- [ ] Create seed script with sample data

**Assigned**: Data Modeling Lead → Schema Architect, Migration Engineer, Data Privacy
**Status**: Not Started
**Dependencies**: None

### 2.3 Event Bus SDK
- [ ] Initialize packages/shared-utils
- [ ] Create event-bus.ts with NATS client wrapper
- [ ] Implement publish() helper with validation
- [ ] Implement subscribe() helper with type safety
- [ ] Add connection pooling and retry logic
- [ ] Create logger utility
- [ ] Add correlation ID tracking
- [ ] Write unit tests

**Assigned**: Core Services Lead → Event Bus Engineer
**Status**: Not Started
**Dependencies**: 2.1 (Event Contracts)

---

## Phase 3: Core Services 🚀

### 3.1 Unified Profile Service
- [ ] Initialize services/unified-profile (Fastify + TS)
- [ ] Implement GET /profile/:id (aggregated view)
- [ ] Implement PUT /profile/:id (update flags)
- [ ] Implement POST /profile/mapping (link kintell_id, discord_id, etc.)
- [ ] Add journey flag management (is_buddy_matched, has_completed_language, etc.)
- [ ] Subscribe to events that update profile (course.completed, etc.)
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests

**Assigned**: Core Services Lead → Profile Service Engineer
**Status**: Not Started
**Dependencies**: 2.2 (Schema), 2.3 (Event Bus)

### 3.2 Kintell Connector Service
- [ ] Initialize services/kintell-connector
- [ ] Create webhook receiver endpoints (POST /webhooks/session, /webhooks/rating)
- [ ] Implement CSV import endpoint (POST /import/kintell-sessions)
- [ ] Create column mapper with normalization rules
- [ ] Add validation for incoming data
- [ ] Emit kintell.session.completed event
- [ ] Emit kintell.rating.created event
- [ ] Create mapping configuration file
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests for mapper
- [ ] Create sample CSV files

**Assigned**: Connector Services Lead → Kintell Integration, CSV Parser, Mapper
**Status**: Not Started
**Dependencies**: 2.1 (Contracts), 2.2 (Schema), 2.3 (Event Bus)

### 3.3 Buddy Service
- [ ] Initialize services/buddy-service
- [ ] Create CSV/API importer for matches
- [ ] Create CSV/API importer for events
- [ ] Create CSV/API importer for checkins
- [ ] Create CSV/API importer for feedback
- [ ] Add schema validators for each data type
- [ ] Emit buddy.match.created event
- [ ] Emit buddy.event.logged event
- [ ] Emit buddy.checkin.completed event
- [ ] Emit buddy.feedback.submitted event
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests
- [ ] Create sample CSV files

**Assigned**: Connector Services Lead → Buddy Integration, Event Publisher
**Status**: Not Started
**Dependencies**: 2.1, 2.2, 2.3

### 3.4 Upskilling Connector Service
- [ ] Initialize services/upskilling-connector
- [ ] Create endpoint POST /import/course-completions
- [ ] Create endpoint POST /import/credentials
- [ ] Add provider-specific adapters (eCornell, itslearning)
- [ ] Emit upskilling.course.completed event
- [ ] Emit upskilling.credential.issued event
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests
- [ ] Create sample data

**Assigned**: Connector Services Lead → Upskilling Integration, API Client
**Status**: Not Started
**Dependencies**: 2.1, 2.2, 2.3

### 3.5 Q2Q AI Service (Skeleton)
- [ ] Initialize services/q2q-ai
- [ ] Define outcome taxonomy (confidence, belonging, lang_level_proxy, job_readiness)
- [ ] Create outcome dimension enum
- [ ] Implement classifier stub (placeholder function)
- [ ] Add text tagging interface
- [ ] Implement outcome_scores write logic
- [ ] Implement evidence_snippets write logic (with hash)
- [ ] Create abstracted model provider interface
- [ ] Add configuration for model selection
- [ ] Add health endpoint
- [ ] Create .http test file with dummy texts
- [ ] Write unit tests for taxonomy

**Assigned**: Core Services Lead → Q2Q AI Architect
**Status**: Not Started
**Dependencies**: 2.2 (Schema)

### 3.6 Safety/Moderation Service (Stub)
- [ ] Initialize services/safety-moderation
- [ ] Create text screening interface
- [ ] Implement placeholder content policy rules
- [ ] Emit safety.flag.raised event
- [ ] Add human review queue stub
- [ ] Create policy configuration file
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests

**Assigned**: Core Services Lead → Safety Engineer
**Status**: Not Started
**Dependencies**: 2.1 (Contracts), 2.3 (Event Bus)

### 3.7 API Gateway
- [ ] Initialize services/api-gateway
- [ ] Implement JWT session middleware
- [ ] Implement RBAC role checking (admin, company_user, participant)
- [ ] Create reverse proxy to internal services
- [ ] Add rate limiting
- [ ] Add request logging with correlation IDs
- [ ] Expose health endpoints for all services (GET /health/*)
- [ ] Create .http test file
- [ ] Write unit tests for auth middleware

**Assigned**: Core Services Lead → API Gateway Engineer, Config Management
**Status**: Not Started
**Dependencies**: All services must have health endpoints

---

## Phase 4: Infrastructure & Testing 🏗️

### 4.1 Docker Infrastructure
- [ ] Create docker-compose.yml (Postgres, NATS, pgAdmin)
- [ ] Configure Postgres with extensions (pgvector, uuid-ossp)
- [ ] Configure NATS with monitoring
- [ ] Add connection health checks
- [ ] Create .env.example with all required vars

**Assigned**: Infrastructure Lead → DevOps, Database Admin
**Status**: Not Started
**Dependencies**: None

### 4.2 Development Scripts
- [ ] Create pnpm workspace root package.json
- [ ] Add "pnpm -w dev" script (starts all services + hot reload)
- [ ] Add "pnpm -w build" script
- [ ] Add "pnpm -w test" script
- [ ] Add "pnpm -w db:migrate" script
- [ ] Add "pnpm -w db:seed" script
- [ ] Add "pnpm -w db:reset" script
- [ ] Document usage in README

**Assigned**: Infrastructure Lead → Deployment Specialist
**Status**: Not Started
**Dependencies**: 4.1

### 4.3 Unit Tests
- [ ] Test event contract Zod validators
- [ ] Test Kintell CSV mapper normalization
- [ ] Test Buddy data validators
- [ ] Test Q2Q outcome taxonomy
- [ ] Test API Gateway auth middleware
- [ ] Configure Vitest/Jest
- [ ] Achieve >80% coverage on mappers

**Assigned**: Quality & Testing Lead → Unit Test Engineer
**Status**: Not Started
**Dependencies**: All services implemented

### 4.4 Integration Tests
- [ ] Create test: Ingest Kintell CSV → normalized rows in DB
- [ ] Create test: CSV ingestion → events published to NATS
- [ ] Create test: Event received → profile updated
- [ ] Create test: End-to-end flow (CSV → events → profile → API)
- [ ] Add test fixtures and sample data
- [ ] Configure test database (separate from dev)

**Assigned**: Quality & Testing Lead → Integration Test Engineer
**Status**: Not Started
**Dependencies**: All services + 4.1, 4.2

---

## Phase 5: Documentation & PR 📝

### 5.1 Architecture Documentation
- [ ] Update docs/Platform_Architecture.md with service map
- [ ] Update docs/System_Diagram.md with data flow
- [ ] Create docs/Event_Catalog.md
- [ ] Create docs/Database_Schema.md
- [ ] Document API endpoints in each service
- [ ] Create ER diagram (Mermaid or PNG)

**Assigned**: Data Modeling Lead → Documentation Writer
**Status**: Not Started
**Dependencies**: All implementation complete

### 5.2 Reports
- [ ] Create reports/worker2_services.md with summary
- [ ] Include acceptance criteria checklist
- [ ] Document any deviations or decisions
- [ ] Add performance notes
- [ ] List known limitations

**Assigned**: Tech Lead Orchestrator
**Status**: Not Started
**Dependencies**: All tasks complete

### 5.3 Pull Request
- [ ] Review all commits
- [ ] Ensure branch is up to date
- [ ] Create PR with comprehensive description
- [ ] Add checklist from acceptance criteria
- [ ] Tag reviewers
- [ ] Link to reports/worker2_services.md

**Assigned**: Tech Lead Orchestrator
**Status**: Not Started
**Dependencies**: 5.1, 5.2

---

## Blockers & Decisions

### Open Questions
- [ ] Which NATS deployment model? (Embedded vs separate container)
- [ ] JWT signing strategy? (Symmetric vs asymmetric keys)
- [ ] Embedding model for evidence_snippets? (OpenAI vs local)
- [ ] CSV upload size limits?

### Decisions Made
- ✅ Use Drizzle ORM for type safety
- ✅ Use Zod for runtime validation
- ✅ Use Fastify for performance
- ✅ NATS for event bus (not Kafka/RabbitMQ)
- ✅ Separate packages for contracts/schema/utils (enforces boundaries)

---

## Progress Tracking

**Overall**: 2 / 100 tasks complete (2%)

| Phase | Tasks | Complete | %  |
|-------|-------|----------|----|
| 1. Foundation | 10 | 2 | 20% |
| 2. Data Layer | 35 | 0 | 0% |
| 3. Core Services | 72 | 0 | 0% |
| 4. Infrastructure | 20 | 0 | 0% |
| 5. Documentation | 13 | 0 | 0% |

**Last Updated**: 2025-11-13 (Auto-updated by orchestrator)
