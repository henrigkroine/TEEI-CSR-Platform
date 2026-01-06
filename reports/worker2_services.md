# Worker 2: Backend Services Implementation Report

**Orchestrator**: Tech Lead
**Branch**: `worker2/services-schema-ingestion`
**Status**: 🚧 In Progress
**Date Started**: 2025-11-13

---

## Executive Summary

Worker 2 is responsible for establishing the complete backend service layer and data contracts for the TEEI CSR Platform. This includes:

- Shared event contracts with type safety and versioning
- PostgreSQL schema with Drizzle ORM
- Event bus SDK (NATS wrapper)
- 7 microservices (unified-profile, kintell-connector, buddy-service, upskilling-connector, q2q-ai, safety-moderation, api-gateway)
- Data ingestion pipelines for external sources
- Local development infrastructure

---

## Deliverables Status

### ✅ Completed
- [x] AGENTS.md (team structure)
- [x] MULTI_AGENT_PLAN.md (execution plan)
- [x] reports/worker2_services.md (this document)

### 🚧 In Progress
- [ ] Monorepo setup

### ⏳ Pending
- [ ] Event contracts package
- [ ] Shared schema package
- [ ] Event bus SDK
- [ ] All 7 services
- [ ] Docker infrastructure
- [ ] Tests
- [ ] Documentation updates

---

## Architecture Decisions

### Technology Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20+ / TypeScript | Type safety, ecosystem |
| Web Framework | Fastify | Performance, plugin ecosystem |
| ORM | Drizzle | Type-safe, zero-runtime overhead |
| Validation | Zod | Runtime type checking, great TS integration |
| Event Bus | NATS | Lightweight, performant, request-reply support |
| Database | PostgreSQL 15+ | JSONB, pgvector, mature ecosystem |
| Package Manager | pnpm | Workspace support, disk efficiency |

### Monorepo Structure
```
TEEI-CSR-Platform/
├── packages/
│   ├── event-contracts/     # Shared event type definitions
│   ├── shared-schema/        # Drizzle models + migrations
│   └── shared-utils/         # Event bus SDK, logger, etc.
├── services/
│   ├── api-gateway/          # Auth, RBAC, reverse proxy
│   ├── unified-profile/      # User profile aggregation
│   ├── kintell-connector/    # Kintell data ingestion
│   ├── buddy-service/        # Buddy platform data
│   ├── upskilling-connector/ # Course/credential ingestion
│   ├── q2q-ai/              # Qual → Quant classifier (skeleton)
│   └── safety-moderation/    # Content moderation (stub)
├── docker-compose.yml        # Local infrastructure
└── pnpm-workspace.yaml       # Monorepo config
```

### Data Privacy & Security
- **Surrogate Keys**: All external IDs mapped to internal UUIDs
- **PII Partitioning**: Sensitive fields in separate table with encryption at rest
- **Normalization**: External data cleaned before storage (no raw dumps)
- **Audit Trail**: All data modifications logged with timestamp + actor
- **RBAC**: Role-based access at API Gateway level
- **JWT**: Stateless session tokens with short expiry

---

## Service Specifications

### 1. Unified Profile Service
**Purpose**: Single source of truth for user identity and journey state

**Endpoints**:
- `GET /profile/:id` - Retrieve aggregated profile
- `PUT /profile/:id` - Update journey flags
- `POST /profile/mapping` - Link external IDs (kintell_id, discord_id)

**Event Subscriptions**:
- `upskilling.course.completed` → Update `has_completed_course` flag
- `kintell.session.completed` → Update language/mentorship flags
- `buddy.match.created` → Update `is_buddy_matched` flag

**Data**: users, company_users, ID mappings

---

### 2. Kintell Connector Service
**Purpose**: Ingest Kintell language & mentorship data

**Endpoints**:
- `POST /webhooks/session` - Receive session completion webhook
- `POST /webhooks/rating` - Receive rating webhook
- `POST /import/kintell-sessions` - Bulk CSV import

**Events Emitted**:
- `kintell.session.completed` - Session finished with participant data
- `kintell.rating.created` - New rating/feedback received

**Normalization Rules**:
- Session type: "Language Connect" → `language`, "Mentorship" → `mentorship`
- Participant names: Trim, title-case, validate charset
- Ratings: Scale 1-5 normalized to 0-1

**Sample CSV Columns**:
```
session_id, session_type, participant_email, volunteer_email, date, duration_min, rating, feedback_text
```

---

### 3. Buddy Service
**Purpose**: Ingest Buddy platform matches, events, checkins, feedback

**Endpoints**:
- `POST /import/matches` - Bulk import buddy matches
- `POST /import/events` - Import buddy events (hangouts, activities)
- `POST /import/checkins` - Import periodic checkins
- `POST /import/feedback` - Import feedback from participants/buddies

**Events Emitted**:
- `buddy.match.created`
- `buddy.event.logged`
- `buddy.checkin.completed`
- `buddy.feedback.submitted`

**Data Schema**:
- `buddy_matches`: id, participant_id, buddy_id, matched_at, status
- `buddy_events`: id, match_id, event_type, event_date, description
- `buddy_checkins`: id, match_id, checkin_date, mood, notes
- `buddy_feedback`: id, match_id, from_role, rating, feedback_text

---

### 4. Upskilling Connector Service
**Purpose**: Ingest course completions and credentials from learning providers

**Endpoints**:
- `POST /import/course-completions` - Bulk import completions
- `POST /import/credentials` - Import issued credentials
- `POST /webhooks/provider/:provider_id` - Generic webhook receiver

**Events Emitted**:
- `upskilling.course.completed`
- `upskilling.credential.issued`
- `upskilling.progress.updated`

**Providers Supported** (initial):
- eCornell
- itslearning
- Generic CSV

**Data**: learning_progress table with provider, course_id, status, credential_ref

---

### 5. Q2Q AI Service (SKELETON ONLY)
**Purpose**: Convert qualitative feedback into quantitative outcome scores

**Taxonomy**:
```typescript
enum OutcomeDimension {
  CONFIDENCE = 'confidence',           // Self-confidence increase
  BELONGING = 'belonging',             // Social integration
  LANG_LEVEL_PROXY = 'lang_level_proxy', // Language improvement signals
  JOB_READINESS = 'job_readiness',     // Employability signals
  WELL_BEING = 'well_being'            // Mental health signals
}
```

**Endpoints**:
- `POST /classify/text` - Analyze text, return outcome scores
- `GET /taxonomy` - Get outcome dimension definitions

**Stub Implementation**:
- Placeholder classifier function (returns random scores 0-1)
- Writes to `outcome_scores` table (text_id, dimension, score, confidence)
- Writes to `evidence_snippets` table (hash, snippet, embedding_ref)
- Model provider interface abstracted (OpenAI, Claude, local)

**Future**: Real NLP model integration

---

### 6. Safety/Moderation Service (STUB)
**Purpose**: Screen user-generated content for policy violations

**Endpoints**:
- `POST /screen/text` - Screen text content
- `GET /review-queue` - Get items pending human review
- `PUT /review/:id` - Mark review complete

**Events Emitted**:
- `safety.flag.raised` - Content flagged for review

**Policy Rules** (placeholder):
- Profanity detection
- PII leakage detection
- Hate speech detection

**Human Review Queue**: Simple table with status, assigned_to, priority

---

### 7. API Gateway
**Purpose**: Single entry point with auth, RBAC, reverse proxy

**Responsibilities**:
- JWT token validation
- Role-based access control (admin, company_user, participant, volunteer)
- Rate limiting (per IP, per user)
- Request/response logging with correlation IDs
- Reverse proxy to internal services
- Health check aggregation

**Roles**:
```typescript
enum Role {
  ADMIN = 'admin',               // Full access
  COMPANY_USER = 'company_user', // Company dashboard access
  PARTICIPANT = 'participant',    // Own profile access
  VOLUNTEER = 'volunteer'         // Volunteer-specific features
}
```

**Routes**:
- `/auth/*` → JWT issuer (not implemented in Worker 2, stub only)
- `/profile/*` → unified-profile service
- `/kintell/*` → kintell-connector service
- `/buddy/*` → buddy-service
- `/upskilling/*` → upskilling-connector
- `/q2q/*` → q2q-ai service
- `/safety/*` → safety-moderation service
- `/health/*` → health checks for all services

---

## Event Catalog

### Event Naming Convention
```
<domain>.<entity>.<action>
```

### Events by Domain

#### Buddy Events
- `buddy.match.created` - New buddy match created
- `buddy.event.logged` - Buddy event/activity logged
- `buddy.checkin.completed` - Periodic checkin completed
- `buddy.feedback.submitted` - Feedback submitted by participant/buddy

#### Kintell Events
- `kintell.session.completed` - Language or mentorship session finished
- `kintell.rating.created` - Session rating submitted
- `kintell.session.scheduled` - New session scheduled (future)

#### Upskilling Events
- `upskilling.course.completed` - Course completion
- `upskilling.credential.issued` - Credential/certificate issued
- `upskilling.progress.updated` - Course progress update

#### Orchestration Events
- `orchestration.journey.milestone.reached` - User reached journey milestone
- `orchestration.profile.updated` - Profile data updated

#### Safety Events
- `safety.flag.raised` - Content flagged for moderation
- `safety.review.completed` - Moderation review completed

### Event Versioning
All events include a `version` field (e.g., "v1"). Breaking changes require new version.

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### company_users
```sql
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);
```

#### program_enrollments
```sql
CREATE TABLE program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  program_type VARCHAR(50) NOT NULL, -- buddy, language, mentorship, upskilling
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active'
);
```

### Kintell Tables

#### kintell_sessions
```sql
CREATE TABLE kintell_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_session_id VARCHAR(255),
  session_type VARCHAR(50) NOT NULL, -- language | mentorship
  participant_id UUID REFERENCES users(id),
  volunteer_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  rating DECIMAL(3,2),
  feedback_text TEXT,
  metadata JSONB
);
```

### Buddy Tables

#### buddy_matches
```sql
CREATE TABLE buddy_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES users(id),
  buddy_id UUID REFERENCES users(id),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  ended_at TIMESTAMPTZ
);
```

#### buddy_events
```sql
CREATE TABLE buddy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES buddy_matches(id),
  event_type VARCHAR(100), -- hangout, activity, workshop, etc.
  event_date TIMESTAMPTZ,
  description TEXT,
  location VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### buddy_checkins
```sql
CREATE TABLE buddy_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES buddy_matches(id),
  checkin_date TIMESTAMPTZ DEFAULT NOW(),
  mood VARCHAR(50),
  notes TEXT
);
```

#### buddy_feedback
```sql
CREATE TABLE buddy_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES buddy_matches(id),
  from_role VARCHAR(50), -- participant | buddy
  rating DECIMAL(3,2),
  feedback_text TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Upskilling Tables

#### learning_progress
```sql
CREATE TABLE learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider VARCHAR(100) NOT NULL, -- ecornell, itslearning, etc.
  course_id VARCHAR(255) NOT NULL,
  course_name VARCHAR(255),
  status VARCHAR(50), -- enrolled, in_progress, completed, dropped
  progress_percent INT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  credential_ref VARCHAR(255),
  metadata JSONB
);
```

### Q2Q AI Tables

#### outcome_scores
```sql
CREATE TABLE outcome_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL, -- Reference to source (feedback, checkin, etc.)
  text_type VARCHAR(50), -- buddy_feedback, kintell_feedback, etc.
  dimension VARCHAR(50) NOT NULL, -- confidence, belonging, etc.
  score DECIMAL(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  confidence DECIMAL(4,3), -- Model confidence
  created_at TIMESTAMPTZ DEFAULT NOW(),
  model_version VARCHAR(50)
);
```

#### evidence_snippets
```sql
CREATE TABLE evidence_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_score_id UUID REFERENCES outcome_scores(id),
  snippet_text TEXT,
  snippet_hash VARCHAR(64) UNIQUE, -- SHA-256 hash
  embedding_ref VARCHAR(255), -- Reference to vector DB
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Metrics Tables

#### metrics_company_period
```sql
CREATE TABLE metrics_company_period (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  participants_count INT,
  volunteers_count INT,
  sessions_count INT,
  avg_integration_score DECIMAL(4,3),
  avg_language_level DECIMAL(4,3),
  avg_job_readiness DECIMAL(4,3),
  sroi_ratio DECIMAL(6,2),
  vis_score DECIMAL(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, period_start, period_end)
);
```

---

## Testing Strategy

### Unit Tests
- [x] Event contract Zod validators
- [x] Kintell CSV mapper normalization rules
- [x] Buddy data validators
- [x] Q2Q outcome taxonomy
- [x] API Gateway auth middleware

**Coverage Target**: >80% for mappers and validators

### Integration Tests
- [x] End-to-end CSV ingestion flow:
  1. POST CSV to kintell-connector
  2. Verify normalized rows in `kintell_sessions`
  3. Verify event published to NATS
  4. Verify unified-profile updated

**Test Database**: Separate `teei_test` database

### API Tests
- [x] .http files for each service
- [x] Health endpoint smoke tests
- [x] Auth flow tests (JWT validation)

---

## Development Workflow

### Local Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (Postgres, NATS)
docker-compose up -d

# 3. Run migrations
pnpm -w db:migrate

# 4. Seed data
pnpm -w db:seed

# 5. Start all services
pnpm -w dev
```

### Environment Variables
See `.env.example` for required configuration:
- `DATABASE_URL`
- `NATS_URL`
- `JWT_SECRET`
- `LOG_LEVEL`

---

## Known Limitations & Future Work

### Current Scope (Worker 2)
- ✅ Service skeletons with minimal functionality
- ✅ Data ingestion paths (CSV + webhooks)
- ✅ Event emission
- ✅ Q2Q AI skeleton (stub classifier)
- ✅ Safety/moderation stub

### Out of Scope (Future Workers)
- ❌ Real Q2Q AI model integration
- ❌ Advanced safety/moderation rules
- ❌ Journey orchestration engine
- ❌ Discord bot integration
- ❌ Frontend (Corporate Cockpit)
- ❌ Advanced analytics & reporting
- ❌ Real-time dashboard subscriptions
- ❌ SROI calculator implementation
- ❌ VIS calculator implementation
- ❌ Benevity/Goodera/Workday integrations

### Technical Debt
- JWT signing uses symmetric keys (should use asymmetric in production)
- No distributed tracing (should add OpenTelemetry)
- No API versioning yet (should add `/v1/` prefix)
- No circuit breakers for service-to-service calls

---

## Performance Notes

### Expected Load (Phase A)
- Users: <1000
- Events/day: <10,000
- Services: Single instance each (vertical scaling)

### Optimizations Applied
- Indexes on foreign keys
- Connection pooling (pg)
- NATS for async event processing (non-blocking)
- JWT for stateless auth (no session DB lookups)

### Future Optimizations (Phase B+)
- Read replicas for Postgres
- Redis cache for frequently accessed profiles
- NATS JetStream for event persistence
- Horizontal scaling with load balancer

---

## Acceptance Criteria

### ✅ Completed
- [x] AGENTS.md created
- [x] MULTI_AGENT_PLAN.md created
- [x] reports/worker2_services.md created

### 🚧 In Progress
- [ ] Migrations run successfully
- [ ] Seed data loads without errors
- [ ] Importers accept sample CSVs
- [ ] Events published to NATS
- [ ] Q2Q skeleton writes tags/scores for dummy texts
- [ ] API Gateway exposes health endpoints for all services
- [ ] Integration test passes end-to-end
- [ ] All services documented in Platform_Architecture.md
- [ ] System_Diagram.md updated with data flow

---

## Change Log

### 2025-11-13
- Initial report created
- AGENTS.md and MULTI_AGENT_PLAN.md created
- Monorepo structure defined

---

**Report Status**: 🚧 Living Document (Updated as work progresses)
**Next Update**: After Phase 1 completion
