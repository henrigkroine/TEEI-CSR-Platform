# Multi-Agent Orchestration Structure

## [PROJECT_NAME]: Full-Stack Monorepo

**Tech Stack**: Monorepo ([pnpm workspace / Yarn workspace / Turborepo]), Frontend: [React/Vue], Backend: [Node.js/Python], Database: [PostgreSQL/MongoDB]
**Purpose**: [CUSTOMIZE: Describe the end-to-end product and business purpose]
**Repository**: [CUSTOMIZE: Link to GitHub/GitLab]

---

## Build & Test Commands

```bash
# Install all workspace dependencies
pnpm install
# or: yarn install

# Development: Start frontend + backend in parallel
pnpm dev                    # or: pnpm -w dev

# Type checking (all workspaces)
pnpm typecheck

# Linting and formatting (all workspaces)
pnpm lint
pnpm format

# Build all workspaces for production
pnpm build

# Run all tests
pnpm test                   # All tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report
pnpm test:integration      # Integration tests (frontend + backend)

# Database commands (backend)
pnpm -F @[org]/api db:migrate
pnpm -F @[org]/api db:seed

# Workspace-specific commands
pnpm -F @[org]/web dev     # Frontend only
pnpm -F @[org]/api dev     # Backend only
```

---

## Architecture Overview

### Monorepo Structure

```
[project]/
├── packages/
│   ├── web/                          # Frontend (React/Vue SPA)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/             # API client (calls backend)
│   │   │   ├── types/
│   │   │   └── App.[tsx/jsx]
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── api/                          # Backend (Node.js/Express)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   └── app.ts
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── shared/                       # [OPTIONAL] Shared types, utilities
│       ├── src/
│       │   ├── types/               # Shared TypeScript types
│       │   ├── utils/               # Shared utilities
│       │   └── constants/           # Shared constants
│       └── package.json
│
├── .env.example                      # Environment variables template
├── .env.test                         # Test environment
├── docker-compose.yml                # [CUSTOMIZE: Local services]
├── pnpm-workspace.yaml               # Monorepo workspace config
├── tsconfig.base.json                # Base TypeScript config
├── package.json                      # Root package.json
└── README.md
```

### Key Features

- **Shared Types**: Use `packages/shared` for types shared between frontend and backend
- **API Client**: Frontend calls backend API via `/api/` routes
- **Database**: Backend manages schema and migrations
- **Monorepo Tooling**: [CUSTOMIZE: pnpm workspace / Yarn workspace / Turborepo]
- **Dependency Management**: Single `pnpm-lock.yaml` or equivalence

---

## Agent Team Structure

### Team 1: Frontend Development (2 agents)
**Lead**: frontend-lead
- **Agent 1.1**: component-developer (Components, pages, routing, UI)
- **Agent 1.2**: api-client-dev (API client, state management, data fetching)

### Team 2: Backend Development (2 agents)
**Lead**: backend-lead
- **Agent 2.1**: api-endpoint-dev (Route handlers, business logic)
- **Agent 2.2**: database-dev (Models, migrations, queries)

### Team 3: Quality & Integration (2 agents)
**Lead**: quality-lead
- **Agent 3.1**: testing-specialist (Unit, integration, E2E tests)
- **Agent 3.2**: integration-dev (Frontend-backend integration, API contracts)

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit secrets or credentials to any workspace
- ❌ NEVER skip tests before PR submission
- ❌ NEVER modify another workspace without coordination
- ❌ NEVER create circular dependencies between workspaces
- ❌ NEVER use `any` types in TypeScript (strict mode)
- ❌ NEVER hardcode API URLs (use environment variables)
- ❌ NEVER commit database with live data
- ❌ NEVER change shared types without updating both frontend and backend

### ALWAYS (Required)
- ✅ ALWAYS run full monorepo build (`pnpm build`) before PR
- ✅ ALWAYS run tests in all affected workspaces
- ✅ ALWAYS validate TypeScript in all workspaces
- ✅ ALWAYS test frontend-backend integration
- ✅ ALWAYS document API contract changes
- ✅ ALWAYS use shared types for frontend-backend communication
- ✅ ALWAYS run `pnpm lint && pnpm format` before PR
- ✅ ALWAYS coordinate changes between frontend/backend
- ✅ ALWAYS update environment variable templates

---

## Quality Gates

- ✅ **Build**: `pnpm build` succeeds in all workspaces
- ✅ **TypeScript**: Strict mode, no errors or warnings in any workspace
- ✅ **Linting**: ESLint passes with 0 warnings
- ✅ **Tests**: Coverage ≥80% in all workspaces, all tests passing
- ✅ **Integration**: Frontend-backend integration tests passing
- ✅ **Database**: Migrations clean, no pending migrations
- ✅ **API Contract**: Request/response types match shared types
- ✅ **Code Review**: At least one approval before merge
- ✅ **No Secrets**: No credentials in any workspace

---

## Agent Definitions

### Agent 1.1: Frontend Component Developer

**When to Invoke**: MUST BE USED when:
- Creating components in `packages/web/`
- Building pages and page-level layouts
- Implementing routing and navigation
- Refactoring component structure

**Coordination**: MUST coordinate with **api-client-dev** when components need data

**Capabilities**:
- [CUSTOMIZE: React/Vue] component development
- Component composition and reusability
- Page routing
- Props and type definitions

**Deliverables**:
- Components in `packages/web/src/components/`
- Pages in `packages/web/src/pages/`
- TypeScript type definitions

**Blocked By**:
- ❌ Blocks merge if components lack types
- ❌ Blocks merge if components untested

---

### Agent 1.2: API Client Developer

**When to Invoke**: MUST BE USED when:
- Creating or updating API client in `packages/web/src/services/`
- Implementing data fetching and state management
- Handling API errors and loading states
- Managing frontend-backend communication

**Coordination**: MUST coordinate with **api-endpoint-dev** for API contract

**Capabilities**:
- API client implementation
- [CUSTOMIZE: State management (Zustand/Redux/Pinia)]
- Data fetching patterns
- Error and loading state management
- Type-safe API calls

**Deliverables**:
- API client in `packages/web/src/services/api.ts`
- State management in `packages/web/src/store/`
- Type definitions matching backend responses

**Blocked By**:
- ❌ Blocks merge if API errors not handled
- ❌ Blocks merge if loading/error states missing

---

### Agent 2.1: Backend API Endpoint Developer

**When to Invoke**: MUST BE USED when:
- Creating endpoints in `packages/api/src/routes/`
- Modifying endpoint contracts (request/response)
- Implementing business logic in controllers
- Changing API versioning or structure

**Coordination**: MUST coordinate with **api-client-dev** for API contract

**Capabilities**:
- [CUSTOMIZE: Express/FastAPI] route definition
- Request validation and response formatting
- API documentation
- Error handling

**Deliverables**:
- Routes in `packages/api/src/routes/`
- Controllers in `packages/api/src/controllers/`
- API documentation

**Blocked By**:
- ❌ Blocks merge if validation missing
- ❌ Blocks merge if response types undefined
- ❌ Blocks merge if breaking changes not documented

---

### Agent 2.2: Database Developer

**When to Invoke**: MUST BE USED when:
- Creating database migrations
- Adding or modifying models in `packages/api/src/models/`
- Changing schema structure
- Implementing complex queries

**Coordination**: MUST coordinate with **api-endpoint-dev** when models change

**Capabilities**:
- [CUSTOMIZE: ORM (Prisma/TypeORM)] model definition
- [CUSTOMIZE: Migration tool (Knex/Alembic)] migration creation
- Query optimization
- Data relationships

**Deliverables**:
- Migrations in `packages/api/database/migrations/`
- Models in `packages/api/src/models/`
- Query implementations

**Blocked By**:
- ❌ Blocks merge if migrations missing
- ❌ Blocks merge if schema changes lack migration

---

### Agent 3.1: Testing Specialist

**When to Invoke**: MUST BE USED when:
- Writing unit tests for any workspace
- Writing integration tests (frontend + backend)
- Measuring coverage
- Testing error scenarios

**Capabilities**:
- Unit testing ([CUSTOMIZE: Jest/Vitest/Pytest])
- Integration testing
- Mock setup for APIs
- Coverage analysis

**Deliverables**:
- Tests in `tests/` directories across workspaces
- Test fixtures
- Coverage reports

**Blocked By**:
- ❌ Blocks merge if coverage <80%
- ❌ Blocks merge if integration tests fail

---

### Agent 3.2: Integration Developer

**When to Invoke**: MUST BE USED when:
- Coordinating frontend-backend changes
- Defining or updating API contracts
- Implementing API-frontend integration
- Testing end-to-end flows

**Capabilities**:
- Frontend-backend coordination
- API contract definition (OpenAPI/Swagger)
- E2E test implementation
- Integration validation

**Deliverables**:
- E2E tests in `tests/integration/`
- API contract documentation
- Integration guides

**Blocked By**:
- ❌ Blocks merge if API contract broken
- ❌ Blocks merge if E2E tests fail

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **frontend-lead + backend-lead**: Set up monorepo structure, shared types, configuration
2. **database-dev**: Design schema, create initial migrations
3. **api-client-dev**: Design API client and state management
4. **testing-specialist**: Configure testing framework for all workspaces

### Phase 2: Core Development (Week 2-3)
1. **api-endpoint-dev**: Build backend endpoints and contracts
2. **api-client-dev**: Implement frontend API client
3. **component-developer**: Build frontend components
4. **database-dev**: Create models and queries
5. **testing-specialist**: Write unit and integration tests

### Phase 3: Integration & Testing (Week 4)
1. **integration-dev**: Validate frontend-backend integration
2. **testing-specialist**: Run E2E tests and measure coverage
3. All Leads: Final review, coordination, PR preparation

---

## Success Criteria

✅ Full monorepo builds with `pnpm build`
✅ Frontend dev server starts with `pnpm -F @[org]/web dev`
✅ Backend dev server starts with `pnpm -F @[org]/api dev`
✅ All database migrations applied
✅ Frontend and backend tests pass with ≥80% coverage
✅ Integration tests validate frontend-backend contract
✅ TypeScript strict mode passes in all workspaces
✅ ESLint and Prettier pass in all workspaces
✅ API client correctly calls backend endpoints
✅ Error handling works end-to-end
✅ No hardcoded secrets in any workspace
✅ Shared types keep frontend and backend in sync
✅ All circular dependencies resolved
✅ PR includes integration screenshots

---

## Communication Protocol

- **Daily**: 5-min standup on blockers and dependencies
- **Code Review**: All PRs reviewed before merge
- **Coordination**: Frontend-backend changes require mutual approval
- **Documentation**: Update `/reports/` and API contracts after features
- **Testing**: No merge without passing tests across all affected workspaces

---

## Customization Checklist

- [ ] Replace [PROJECT_NAME] with actual project name
- [ ] Replace [CUSTOMIZE: ...] sections with project details
- [ ] Replace [@[org]] with actual organization/namespace
- [ ] Update Tech Stack (Frontend framework, Backend runtime, Database)
- [ ] Update Monorepo tooling (pnpm/Yarn/Turborepo)
- [ ] Define shared types structure
- [ ] Update API versioning strategy
- [ ] Add domain-specific models and services
- [ ] Create team structure for your project size
- [ ] Define frontend-backend contract standards
- [ ] Add project-specific safety constraints
- [ ] Update Build & Test Commands for your setup
