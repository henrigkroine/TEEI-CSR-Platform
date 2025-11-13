# TEEI CSR Platform - Architecture Documentation

**Version**: 1.0
**Date**: 2025-11-13
**Status**: Active Development (Worker 2 Complete)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Service Layer](#service-layer)
4. [Data Layer](#data-layer)
5. [Event-Driven Architecture](#event-driven-architecture)
6. [Security & Privacy](#security--privacy)
7. [Deployment Architecture](#deployment-architecture)

---

## Overview

The TEEI CSR Platform is a unified impact measurement and AI-powered ecosystem for corporate social responsibility programs. It integrates multiple youth empowerment programs (Buddy, Language Connect, Mentorship, Upskilling) into a single platform that converts qualitative social impact into quantifiable business outcomes.

### Core Mission

Transform qualitative social impact data into quantifiable business outcomes that corporates can measure, report, and optimize.

### Key Capabilities

- **Unified Journey Tracking**: Track participants across Buddy → Language → Upskilling → Mentorship → Employment
- **Q2Q AI Engine**: Convert qualitative feedback into quantitative outcome scores
- **Real-time Impact Metrics**: Live SROI, VIS, and integration scores
- **Corporate Reporting**: Executive dashboards with CSR-grade reporting
- **Privacy-First Design**: GDPR-compliant with PII partitioning

---

## System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Corporate Cockpit                          │
│                    (Astro 5 + React Islands)                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│          JWT Auth │ RBAC │ Rate Limiting │ Reverse Proxy        │
└──────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Unified    │ │   Kintell    │ │    Buddy     │ │  Upskilling  │
│   Profile    │ │  Connector   │ │   Service    │ │  Connector   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   NATS Event Bus │
              └──────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────┐              ┌──────────────┐
│   Q2Q AI     │              │    Safety    │
│   Engine     │              │  Moderation  │
└──────────────┘              └──────────────┘
         │                             │
         └──────────────┬──────────────┘
                        ▼
              ┌──────────────────┐
              │   PostgreSQL +   │
              │     pgvector     │
              └──────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Astro 5 + React | Corporate dashboards, participant portals |
| **API Gateway** | Fastify + TypeScript | Unified entry point, auth, RBAC |
| **Services** | Fastify + TypeScript | Microservices for each domain |
| **Event Bus** | NATS | Async event-driven communication |
| **Database** | PostgreSQL 15+ | Primary data store |
| **ORM** | Drizzle | Type-safe database queries |
| **Validation** | Zod | Runtime schema validation |
| **AI/ML** | OpenAI / Claude API | Q2Q classifier (future) |
| **Vector DB** | pgvector | Embedding storage for evidence |
| **Monitoring** | OpenTelemetry | Observability (future) |

---

## Service Layer

### 1. API Gateway (Port 3000)

**Responsibilities**:
- Single entry point for all external requests
- JWT token validation
- Role-based access control (RBAC)
- Rate limiting (100 req/min per user)
- Request/response logging with correlation IDs
- Reverse proxy to internal services

**Routes**:
- `/health` - Gateway health check
- `/health/all` - Aggregated health check
- `/profile/*` → Unified Profile Service
- `/kintell/*` → Kintell Connector
- `/buddy/*` → Buddy Service
- `/upskilling/*` → Upskilling Connector
- `/q2q/*` → Q2Q AI Engine
- `/safety/*` → Safety Moderation
- `/journey/*` → Journey Engine

**Roles**:
- `admin` - Full platform access
- `company_user` - Company dashboard access
- `participant` - Own profile access
- `volunteer` - Volunteer-specific features

---

### 2. Unified Profile Service (Port 3001)

**Responsibilities**:
- Single source of truth for user identity
- Aggregate view of user journey across programs
- External ID mapping (Kintell, Discord, Buddy)
- Journey flag management

**Endpoints**:
- `GET /profile/:id` - Retrieve aggregated profile
- `PUT /profile/:id` - Update user profile
- `POST /profile/mapping` - Link external system IDs

**Event Subscriptions**:
- `upskilling.course.completed` → Update completion flags
- `kintell.session.completed` → Update language/mentorship flags
- `buddy.match.created` → Update buddy match flag

**Data Tables**:
- `users`
- `external_id_mappings`
- `program_enrollments`

---

### 3. Kintell Connector (Port 3002)

**Responsibilities**:
- Ingest data from Kintell platform (Language Connect + Mentorship)
- Normalize Kintell data formats to internal schema
- CSV bulk import support
- Webhook receivers (placeholder)

**Endpoints**:
- `POST /import/kintell-sessions` - Bulk CSV import
- `POST /webhooks/session` - Session completion webhook (stub)
- `POST /webhooks/rating` - Rating webhook (stub)

**Events Emitted**:
- `kintell.session.completed` - Session finished
- `kintell.rating.created` - Rating submitted

**Normalization Rules**:
- Session type: "Language Connect" → `language`, "Mentorship" → `mentorship`
- Ratings: 1-5 scale → 0-1 normalized
- Language levels: Uppercase CEFR format (A1, B1, etc.)

**CSV Format**:
```csv
session_id,session_type,participant_email,volunteer_email,date,duration_min,rating,feedback_text,language_level
```

---

### 4. Buddy Service (Port 3003)

**Responsibilities**:
- Ingest buddy program data (matches, events, checkins, feedback)
- Support for CSV and API ingestion
- Event emission for downstream processing

**Endpoints**:
- `POST /import/matches` - Import buddy matches
- `POST /import/events` - Import buddy events (hangouts, activities)
- `POST /import/checkins` - Import periodic checkins
- `POST /import/feedback` - Import participant/buddy feedback

**Events Emitted**:
- `buddy.match.created` - New buddy match
- `buddy.event.logged` - Event/activity logged
- `buddy.checkin.completed` - Checkin completed
- `buddy.feedback.submitted` - Feedback submitted

**Data Tables**:
- `buddy_matches`
- `buddy_events`
- `buddy_checkins`
- `buddy_feedback`

---

### 5. Upskilling Connector (Port 3004)

**Responsibilities**:
- Ingest course completions and credentials from learning providers
- Support multiple providers (eCornell, itslearning, generic CSV)
- Track learning progress and credential issuance

**Endpoints**:
- `POST /import/course-completions` - Bulk import completions
- `POST /import/credentials` - Import issued credentials
- `POST /webhooks/provider/:provider_id` - Generic webhook (future)

**Events Emitted**:
- `upskilling.course.completed` - Course completion
- `upskilling.credential.issued` - Credential issued
- `upskilling.progress.updated` - Progress update

**Providers Supported**:
- eCornell
- itslearning
- Generic CSV format

**Data Tables**:
- `learning_progress`

---

### 6. Q2Q AI Engine (Port 3005) - SKELETON

**Responsibilities**:
- Convert qualitative feedback text into quantitative outcome scores
- Extract evidence snippets for traceability
- Support multiple outcome dimensions

**Outcome Dimensions**:
- **Confidence**: Self-confidence and self-efficacy
- **Belonging**: Social integration and connection
- **Language Level Proxy**: Language improvement signals
- **Job Readiness**: Employability indicators
- **Well-being**: Mental health and satisfaction

**Endpoints**:
- `POST /classify/text` - Analyze text and return outcome scores
- `GET /taxonomy` - Get outcome dimension definitions

**Current Implementation**: STUB ONLY
- Returns random scores (0-1) for each dimension
- Placeholder for future AI/ML model integration
- Model provider interface abstracted (OpenAI, Claude, local)

**Data Tables**:
- `outcome_scores` - Dimension scores per text
- `evidence_snippets` - Text snippets supporting scores

---

### 7. Safety/Moderation Service (Port 3006) - STUB

**Responsibilities**:
- Screen user-generated content for policy violations
- Flag content for human review
- Manage review queue

**Endpoints**:
- `POST /screen/text` - Screen content for violations
- `GET /review-queue` - Get pending reviews
- `PUT /review/:id` - Mark review complete

**Policy Rules** (Stub):
- Profanity detection
- PII leakage detection
- Hate speech detection

**Events Emitted**:
- `safety.flag.raised` - Content flagged for review
- `safety.review.completed` - Review completed

**Data Tables**:
- `safety_flags`

---

### 8. Journey Engine (Port 3009)

**Responsibilities**:
- Declarative rules-based orchestration of participant journeys
- Automatic computation of journey readiness flags
- Cross-program milestone tracking
- Event-driven workflow automation

**Journey Flags**:
- `mentor_ready` - Ready to become a mentor
- `followup_needed` - Inactive participant needing outreach
- `language_support_needed` - Low language comfort detected
- Custom flags via declarative rules

**Endpoints**:
- `GET /journey/flags/:userId` - Get all journey flags
- `POST /journey/flags/:userId/evaluate` - Manual rule evaluation
- `GET /journey/milestones/:userId` - Get reached milestones
- `POST /journey/milestones/:userId/:milestone` - Trigger milestone
- `GET /journey/rules` - List all rules (admin)
- `POST /journey/rules` - Create rule (admin)
- `PUT /journey/rules/:id` - Update rule (admin)
- `DELETE /journey/rules/:id` - Delete rule (admin)
- `POST /journey/rules/:id/activate` - Activate rule (admin)
- `POST /journey/rules/:id/deactivate` - Deactivate rule (admin)

**Event Subscriptions**:
- `buddy.match.created` → Evaluate journey rules
- `buddy.event.logged` → Evaluate journey rules
- `buddy.checkin.completed` → Evaluate journey rules
- `buddy.feedback.submitted` → Evaluate journey rules
- `kintell.session.completed` → Evaluate journey rules
- `kintell.rating.created` → Evaluate journey rules
- `upskilling.course.completed` → Evaluate journey rules
- `upskilling.credential.issued` → Evaluate journey rules

**Events Emitted**:
- `orchestration.milestone.reached` - Milestone achieved
- `orchestration.flag.updated` - Flag value changed

**Rule Engine Features**:
- Declarative YAML-based rules (editable without code changes)
- Condition types: count, exists, value, time_since, all_of, any_of
- Action types: set_flag, emit_event, clear_flag
- Priority-based evaluation (higher priority first)
- Idempotent rule execution
- Profile context caching (5 min TTL)
- Rules caching (1 min TTL)

**Default Rules**:
1. **mentor_ready_001**: 3+ language sessions with avg rating >= 4.0
2. **followup_needed_001**: No activity in 14 days despite active enrollment
3. **language_support_needed_001**: Q2Q detected low language comfort (< 0.5)

**Data Tables**:
- `journey_flags` - Computed journey flags
- `journey_rules` - Rule definitions
- `journey_milestones` - Milestone achievements

**Documentation**:
- [Journey Engine Guide](./Journey_Engine.md)
- [Default Rules Reference](../reports/journey_engine_rules.md)

---

## Data Layer

### Database: PostgreSQL 15+

**Extensions**:
- `uuid-ossp` - UUID generation
- `pgcrypto` - Encryption functions
- `pgvector` - Vector similarity (future)

### Schema Structure

#### Core Tables

**users**
- `id` (UUID, PK)
- `email` (unique)
- `role` (admin, company_user, participant, volunteer)
- `first_name`, `last_name`
- `created_at`, `updated_at`

**companies**
- `id` (UUID, PK)
- `name`
- `industry`, `country`
- `created_at`

**company_users** (Junction)
- `id` (UUID, PK)
- `company_id` (FK)
- `user_id` (FK)
- `joined_at`

**program_enrollments**
- `id` (UUID, PK)
- `user_id` (FK)
- `program_type` (buddy, language, mentorship, upskilling)
- `status` (active, completed, dropped)
- `enrolled_at`, `completed_at`

**external_id_mappings** (Surrogate Keys)
- `id` (UUID, PK)
- `user_id` (FK)
- `external_system` (kintell, discord, buddy)
- `external_id`
- `created_at`

#### Program-Specific Tables

**kintell_sessions**
- Session data from Language Connect & Mentorship
- Fields: `session_type`, `participant_id`, `volunteer_id`, `duration_minutes`, `rating`, `feedback_text`, `language_level`

**buddy_matches**, **buddy_events**, **buddy_checkins**, **buddy_feedback**
- Buddy program data with normalized structures

**learning_progress**
- Course enrollment, progress, and completion data
- Fields: `provider`, `course_id`, `status`, `progress_percent`, `credential_ref`

#### AI & Analytics Tables

**outcome_scores**
- Q2Q AI output scores
- Fields: `text_id`, `text_type`, `dimension`, `score`, `confidence`, `model_version`

**evidence_snippets**
- Supporting evidence for outcome scores
- Fields: `outcome_score_id`, `snippet_text`, `snippet_hash`, `embedding_ref`

**metrics_company_period**
- Aggregated company metrics per time period
- Fields: `company_id`, `period_start`, `period_end`, `participants_count`, `avg_integration_score`, `sroi_ratio`, `vis_score`

#### Safety Tables

**safety_flags**
- Content flagged for moderation
- Fields: `content_id`, `content_type`, `flag_reason`, `confidence`, `review_status`, `reviewed_by`

#### Journey Orchestration Tables

**journey_flags**
- Computed journey readiness flags for participants
- Fields: `user_id`, `flag`, `value`, `set_by_rule`, `set_at`, `expires_at`

**journey_rules**
- Declarative rule definitions for journey orchestration
- Fields: `rule_id`, `name`, `description`, `rule_config`, `active`, `priority`, `created_at`, `updated_at`

**journey_milestones**
- Tracks when participants reach significant milestones
- Fields: `user_id`, `milestone`, `reached_at`, `triggered_by_rule`, `metadata`

### Data Privacy Strategy

1. **Surrogate Keys**: All external IDs mapped to internal UUIDs
2. **PII Partitioning**: Sensitive data in separate tables (future)
3. **Field-Level Encryption**: For highly sensitive fields (future)
4. **Audit Logging**: All data modifications tracked
5. **GDPR Compliance**: Right to erasure, data export support (future)

---

## Event-Driven Architecture

### Event Bus: NATS

**Features**:
- Lightweight, high-performance messaging
- Pub/sub patterns
- Request-reply support
- JetStream for persistence (enabled)

### Event Naming Convention

```
<domain>.<entity>.<action>
```

Examples:
- `buddy.match.created`
- `kintell.session.completed`
- `upskilling.course.completed`

### Event Catalog

#### Buddy Events
- `buddy.match.created` - New buddy match
- `buddy.event.logged` - Activity logged
- `buddy.checkin.completed` - Checkin completed
- `buddy.feedback.submitted` - Feedback submitted

#### Kintell Events
- `kintell.session.completed` - Session finished
- `kintell.rating.created` - Rating submitted
- `kintell.session.scheduled` - Session scheduled (future)

#### Upskilling Events
- `upskilling.course.completed` - Course completed
- `upskilling.credential.issued` - Credential issued
- `upskilling.progress.updated` - Progress updated

#### Orchestration Events
- `orchestration.milestone.reached` - Milestone reached (Journey Engine)
- `orchestration.flag.updated` - Journey flag changed (Journey Engine)
- `orchestration.profile.updated` - Profile updated

#### Safety Events
- `safety.flag.raised` - Content flagged
- `safety.review.completed` - Review completed

### Event Versioning

All events include a `version` field (default: "v1"). Breaking changes require new version.

### Event Metadata

All events include:
- `id` - Unique event ID (UUID)
- `timestamp` - ISO 8601 datetime
- `correlationId` - Request trace ID (optional)
- `causationId` - Originating event ID (optional)
- `metadata` - Additional context (optional)

---

## Security & Privacy

### Authentication

**JWT Tokens**:
- HS256 signing algorithm (symmetric)
- Expiry: 24 hours (configurable)
- Payload includes: `userId`, `email`, `role`

**Future**: Asymmetric keys (RS256) for production

### Authorization (RBAC)

**Roles**:
- `admin` - Full platform access
- `company_user` - Company dashboard + reports
- `participant` - Own profile + journey data
- `volunteer` - Volunteer portal + match data

**Permission Matrix**:

| Resource | Admin | Company User | Participant | Volunteer |
|----------|-------|--------------|-------------|-----------|
| All Profiles | R/W | R (company) | R (self) | R (matches) |
| Import Data | R/W | - | - | - |
| Company Metrics | R/W | R (own) | - | - |
| Q2Q AI | R/W | - | - | - |
| Safety Review | R/W | - | - | - |

### Rate Limiting

- 100 requests per minute per user/IP
- Configurable per endpoint
- Redis-backed for distributed systems (future)

### Data Protection

1. **Surrogate Keys**: External IDs never stored raw
2. **PII Minimization**: Only store necessary fields
3. **Encryption at Rest**: Database-level encryption (future)
4. **Encryption in Transit**: TLS for all connections (future)
5. **Audit Logging**: All data access logged

---

## Deployment Architecture

### Local Development

```
Docker Compose:
- PostgreSQL (port 5432)
- NATS (port 4222)
- pgAdmin (port 5050)

Node.js Services:
- All 7 services running via pnpm dev
- Hot reload with tsx watch
```

### Production (Future)

```
Cloud Provider (AWS/GCP/Azure):
- Kubernetes cluster
- Managed PostgreSQL (RDS/Cloud SQL)
- Managed NATS (CloudFlare Queues / NATS Cloud)
- Load balancer (ALB/GLB)
- Horizontal autoscaling
- OpenTelemetry → Grafana
```

---

## API Documentation

### API Gateway Base URL

**Local**: `http://localhost:3000`
**Production**: TBD

### Authentication Header

```
Authorization: Bearer <jwt_token>
```

### Health Check

```http
GET /health/all
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "unified-profile": { "status": "healthy", "responseTime": 5 },
    "kintell-connector": { "status": "healthy", "responseTime": 3 },
    ...
  },
  "timestamp": "2025-11-13T10:00:00Z"
}
```

### Error Responses

All services return consistent error format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}
```

---

## Performance Characteristics

### Expected Load (Phase A)

- **Users**: < 1,000
- **Events/day**: < 10,000
- **Requests/second**: < 50
- **Database size**: < 10 GB

### Scaling Strategy

- **Vertical**: Single instance per service initially
- **Horizontal**: Add replicas when > 100 req/s
- **Database**: Read replicas when > 1000 queries/s
- **Cache**: Redis for hot data when needed

### Latency Targets

- **API Gateway**: < 10ms
- **Profile Lookup**: < 50ms
- **CSV Import**: < 5s for 1000 rows
- **Event Processing**: < 100ms

---

## Monitoring & Observability (Future)

### Metrics

- Request rate, latency, error rate per service
- Event processing rate and lag
- Database connection pool utilization
- Memory and CPU usage

### Logging

- Structured logging with Pino
- Correlation IDs for request tracing
- Log levels: error, warn, info, debug

### Tracing (Future)

- OpenTelemetry instrumentation
- Distributed tracing across services
- Span context propagation via NATS

---

## Development Guidelines

### Code Organization

```
packages/             # Shared packages
  event-contracts/    # Type-safe event schemas
  shared-schema/      # Drizzle database models
  shared-utils/       # Common utilities (logger, event bus)

services/             # Microservices
  <service-name>/
    src/
      index.ts        # Entry point
      routes/         # Fastify route handlers
      subscribers/    # Event subscribers (if applicable)
    test.http         # HTTP test file
    package.json
    tsconfig.json
```

### Commit Conventions

- `feat: Add new feature`
- `fix: Fix bug`
- `docs: Update documentation`
- `refactor: Code refactoring`
- `test: Add tests`
- `chore: Tooling updates`

### Testing Strategy

- **Unit Tests**: Mappers, validators, business logic
- **Integration Tests**: API endpoints + database
- **E2E Tests**: Full user flows (future)

---

## Roadmap

### Phase A - Foundations ✅

- Unified Profile Service
- Kintell Connector
- Buddy Service
- Upskilling Connector
- Q2Q AI Skeleton
- Safety Moderation Stub
- API Gateway
- Event Bus (NATS)
- Database Schema (Drizzle)

### Phase B - Outcomes & Reporting 🔄

- Real Q2Q AI model integration (OpenAI/Claude)
- SROI & VIS calculators
- Evidence lineage and traceability
- Company metrics aggregation
- Corporate Cockpit v1 (dashboard)

### Phase C - Orchestration 🔄

- Journey Engine (milestone tracking) ✅
- Discord Bot integration 📋
- Real safety/moderation rules 📋
- Automated referrals (Language → Upskilling) 📋

### Phase D - Enterprise Polish 🎯

- Advanced analytics (ClickHouse)
- Generative reporting (AI summaries)
- Custom KPI builder
- Benevity/Goodera/Workday integrations
- Multi-tenancy & white-labeling

---

## References

- **Multi-Agent Plan**: `MULTI_AGENT_PLAN.md`
- **Team Structure**: `AGENTS.md`
- **Quick Start**: `QUICKSTART.md`
- **Implementation Report**: `reports/worker2_services.md`
- **Event Contracts**: `packages/event-contracts/src/`
- **Database Schema**: `packages/shared-schema/src/schema/`

---

**Last Updated**: 2025-11-13
**Document Owner**: TEEI Platform Team (Henrik Røine)
