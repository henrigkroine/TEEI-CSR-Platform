# Multi-Agent Team Structure

## Worker 2: Backend Services & Data Contracts

**Tech Lead Orchestrator** - You are here
**Mission**: Stand up backend service layer, shared data contracts, Postgres schema, event contracts, and data ingestion paths.

### Team Structure (30 agents / 5 leads)

#### 1. **Data Modeling Lead** (6 agents)
- Schema Architect: Design Drizzle models for all entities
- Migration Engineer: Create versioned migrations + seed scripts
- Data Privacy Specialist: Ensure PII partitioning and surrogate keys
- Contract Designer: Define event contracts with versioning
- Validation Engineer: Zod schemas for all payloads
- Documentation Writer: Schema docs and ER diagrams

#### 2. **Connector Services Lead** (8 agents)
- Kintell Integration Engineer: Webhook receivers + CSV importer
- Buddy Integration Engineer: Match/event/checkin/feedback adapters
- Upskilling Integration Engineer: Course completion ingestion
- Mapper Specialist: Normalization rules for external data
- Event Publisher: Ensure all connectors emit proper events
- Test Engineer: Integration tests for each connector
- CSV Parser Specialist: Robust parsing with validation
- API Client Developer: External API adapters

#### 3. **Core Services Lead** (8 agents)
- Profile Service Engineer: GET/PUT profile, ID mapping
- Q2Q AI Architect: Outcome taxonomy + classifier skeleton
- Safety/Moderation Engineer: Text screening interface
- Event Bus Engineer: NATS client wrapper + SDK
- API Gateway Engineer: JWT auth, RBAC, reverse proxy
- Service Mesh Specialist: Inter-service communication
- Health Check Engineer: Monitoring endpoints
- Config Management: Environment-aware configuration

#### 4. **Infrastructure Lead** (4 agents)
- DevOps Engineer: Docker Compose setup (Postgres, NATS)
- Database Admin: Connection pooling, query optimization
- Deployment Specialist: Local dev scripts (pnpm -w dev)
- Observability Engineer: Logging and tracing setup

#### 5. **Quality & Testing Lead** (4 agents)
- Unit Test Engineer: Mappers and contracts tests
- Integration Test Engineer: End-to-end CSV → events → profile
- API Test Engineer: .http files for smoke tests
- QA Coordinator: Acceptance criteria validation

---

## Deliverables Ownership

| Deliverable | Lead | Specialists |
|------------|------|-------------|
| Event Contracts | Data Modeling | Contract Designer, Validation Engineer |
| Shared Schema | Data Modeling | Schema Architect, Migration Engineer, Data Privacy |
| Event Bus SDK | Core Services | Event Bus Engineer, Service Mesh |
| Unified Profile | Core Services | Profile Service Engineer, Health Check |
| Kintell Connector | Connector Services | Kintell Integration, CSV Parser, Mapper |
| Buddy Service | Connector Services | Buddy Integration, Event Publisher |
| Upskilling Connector | Connector Services | Upskilling Integration, API Client |
| Q2Q AI Skeleton | Core Services | Q2Q AI Architect |
| Safety/Moderation | Core Services | Safety Engineer |
| API Gateway | Core Services | API Gateway Engineer, Config Management |
| Docker/Local Dev | Infrastructure | DevOps, Database Admin, Deployment |
| Tests | Quality & Testing | All test engineers |

---

## Communication Protocol

1. **Orchestrator → Leads**: Task decomposition with acceptance criteria
2. **Leads → Specialists**: Specific implementation instructions
3. **Specialists → Leads**: Completed artifacts (code, tests, docs)
4. **Leads → Orchestrator**: Integration report + blockers
5. **All outputs**: File commits to repository

---

## Branch Strategy

**Development Branch**: `worker2/services-schema-ingestion`
**Commit Strategy**: Small, incremental commits per deliverable
**PR Target**: Main branch with comprehensive checklist

---

## Success Criteria

- ✅ Migrations run; seed data loads
- ✅ Importers accept sample CSVs; events published
- ✅ Q2Q skeleton writes tags/scores for dummy texts
- ✅ API Gateway exposes health endpoints for all services
- ✅ Integration test passes end-to-end
- ✅ All services documented in Platform_Architecture.md
