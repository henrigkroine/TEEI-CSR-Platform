# Multi-Agent Orchestration Structure

## [PROJECT_NAME]: Backend API Service

**Tech Stack**: [Node.js/Python/Go/Rust], [Express/FastAPI/Gin], [PostgreSQL/MongoDB], TypeScript/[Language]
**Purpose**: [CUSTOMIZE: Describe the business purpose, domain, and API scope]
**API Documentation**: [CUSTOMIZE: Link to API docs (OpenAPI/Swagger)]

---

## Build & Test Commands

```bash
# Install dependencies
npm install
# or
pnpm install / pip install

# Development server with auto-reload
npm run dev

# Type checking (TypeScript)
npm run typecheck

# Linting and formatting
npm run lint
npm run format

# Build for production
npm run build

# Database migrations
npm run db:migrate          # Run pending migrations
npm run db:rollback         # Rollback last migration
npm run db:seed             # Seed test data

# Run tests
npm run test                # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:integration   # Integration tests

# Code quality
npm run lint:fix           # Auto-fix linting issues
```

---

## Architecture Overview

### Repository Structure

```
[project]/
├── src/
│   ├── routes/                   # [CUSTOMIZE: Route handlers or controllers]
│   │   └── [domain]/            # Domain-specific routes
│   ├── controllers/              # [CUSTOMIZE: Business logic per endpoint]
│   │   └── [domain].controller.ts
│   ├── services/                 # Domain business logic
│   │   └── [domain].service.ts
│   ├── models/                   # Database models/schemas
│   ├── middleware/               # Custom middleware
│   │   ├── auth.ts              # Authentication
│   │   ├── validation.ts        # Input validation
│   │   └── error-handler.ts     # Error handling
│   ├── utils/                    # Utilities
│   │   ├── logger.ts            # Structured logging
│   │   ├── errors.ts            # Custom error classes
│   │   └── validators.ts        # Validation helpers
│   ├── types/                    # TypeScript interfaces
│   └── app.ts                    # App initialization
├── database/
│   ├── migrations/               # [CUSTOMIZE: DB migrations (Knex/Alembic)]
│   ├── seeds/                    # Test data seeds
│   └── schema.sql                # Database schema (reference)
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests with DB
│   └── fixtures/                 # Test data and mocks
├── .env.example                  # Environment variables template
├── .env.test                     # Test environment
├── docker-compose.yml            # [CUSTOMIZE: Local services (DB, Redis)]
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

- **Routes/Controllers**: HTTP endpoints and request routing
- **Services**: Business logic, calculations, domain operations
- **Models**: Database schema and ORM/query builders
- **Middleware**: Authentication, validation, error handling, logging
- **Database**: [CUSTOMIZE: Migration strategy, schema]
- **Error Handling**: Structured error responses with status codes

---

## Agent Team Structure

### Team 1: API Development (2 agents)
**Lead**: backend-lead
- **Agent 1.1**: api-endpoint-dev (Route handlers, endpoint logic, request/response)
- **Agent 1.2**: database-dev (Models, migrations, queries, schema)

### Team 2: Quality & Security (2 agents)
**Lead**: quality-lead
- **Agent 2.1**: testing-specialist (Unit, integration tests, coverage)
- **Agent 2.2**: security-dev (Authentication, validation, error handling)

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit secrets, database passwords, or API keys
- ❌ NEVER skip tests before submitting PR
- ❌ NEVER modify database schema without migration files
- ❌ NEVER push directly to main/master without PR review
- ❌ NEVER use `any` types in TypeScript (strict mode)
- ❌ NEVER hardcode environment-specific values
- ❌ NEVER skip input validation on API endpoints
- ❌ NEVER access database directly in route handlers (use services)

### ALWAYS (Required)
- ✅ ALWAYS run `npm run build` before submitting PR
- ✅ ALWAYS validate TypeScript (no errors or warnings)
- ✅ ALWAYS validate input with schemas (Zod/Joi)
- ✅ ALWAYS return consistent error responses with status codes
- ✅ ALWAYS log structured data with request IDs
- ✅ ALWAYS test error scenarios (missing data, invalid input, auth failures)
- ✅ ALWAYS use environment variables for configuration
- ✅ ALWAYS implement proper database transactions
- ✅ ALWAYS add API documentation (OpenAPI/Swagger comments)

---

## Quality Gates

- ✅ **Build**: Production build succeeds (`npm run build`)
- ✅ **TypeScript**: Strict mode, no errors or warnings
- ✅ **Linting**: ESLint passes with 0 warnings
- ✅ **Tests**: Unit coverage ≥80%, integration tests passing
- ✅ **Database**: All migrations applied, no pending migrations
- ✅ **Input Validation**: All endpoints validate input
- ✅ **Error Handling**: Consistent error responses
- ✅ **Security**: No hardcoded secrets, auth enforced
- ✅ **Code Review**: At least one approval before merge

---

## Agent Definitions

### Agent 1.1: API Endpoint Developer

**When to Invoke**: MUST BE USED when:
- Creating new API endpoints
- Modifying request/response contracts
- Implementing endpoint business logic
- Changing route structure or versioning
- Adding query parameters or filters

**Capabilities**:
- [CUSTOMIZE: Framework (Express/FastAPI/Gin)] route definition
- Request/response type definitions
- Query parameter and path parameter handling
- Pagination, filtering, sorting logic
- API documentation (OpenAPI/Swagger)
- Error response formatting

**Deliverables**:
- Route handler in `src/routes/`
- Type definitions for request/response
- API documentation comments
- Implementation report in `/reports/`

**Blocked By**:
- ❌ Blocks merge if endpoints lack input validation
- ❌ Blocks merge if error handling missing
- ❌ Blocks merge if response types not documented

---

### Agent 1.2: Database Developer

**When to Invoke**: MUST BE USED when:
- Creating new database models or tables
- Writing database migrations
- Modifying schema (add/remove/modify columns)
- Creating complex queries or aggregations
- Implementing data relationships
- Optimizing slow queries

**Capabilities**:
- [CUSTOMIZE: ORM (Prisma/TypeORM/SQLAlchemy)] model definition
- [CUSTOMIZE: Migration tool (Knex/Alembic)] migration creation
- Database query optimization
- Relationship definition (1-to-many, many-to-many)
- Data seeding and fixtures
- Query performance analysis

**Deliverables**:
- Database migrations in `database/migrations/`
- Models in `src/models/`
- Seed data in `database/seeds/`
- Database documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if migrations not included
- ❌ Blocks merge if schema changes lack migration
- ❌ Blocks merge if queries untested (no test fixtures)

---

### Agent 2.1: Testing Specialist

**When to Invoke**: MUST BE USED when:
- Writing unit tests for services
- Writing integration tests with database
- Testing error scenarios
- Measuring code coverage
- Setting up test fixtures

**Capabilities**:
- [CUSTOMIZE: Test framework (Jest/Pytest/Testing libraries)]
- Unit test patterns and fixtures
- Integration test setup with test database
- Mock API responses
- Coverage reporting

**Deliverables**:
- Test files in `tests/`
- Test fixtures in `tests/fixtures/`
- Coverage reports

**Blocked By**:
- ❌ Blocks merge if coverage <80%
- ❌ Blocks merge if integration tests fail

---

### Agent 2.2: Security & Validation Developer

**When to Invoke**: MUST BE USED when:
- Implementing authentication/authorization
- Creating input validation schemas
- Handling errors securely
- Implementing rate limiting
- Fixing security issues

**Capabilities**:
- Authentication middleware (JWT, API keys, OAuth)
- Input validation (Zod, Joi, Pydantic)
- Error handling without exposing internals
- Structured logging
- Rate limiting and throttling
- SQL injection prevention

**Deliverables**:
- Middleware in `src/middleware/`
- Validation schemas in `src/utils/`
- Error handling utilities
- Security documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if auth not enforced
- ❌ Blocks merge if validation missing
- ❌ Blocks merge if errors expose sensitive info

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **backend-lead**: Set up project structure, middleware, error handling
2. **database-dev**: Design schema, create initial migrations
3. **security-dev**: Implement authentication, validation framework

### Phase 2: Core Implementation (Week 2-3)
1. **api-endpoint-dev**: Build endpoints and request/response handlers
2. **database-dev**: Create models, queries, complex migrations
3. **testing-specialist**: Write unit and integration tests

### Phase 3: Testing & Security (Week 4)
1. **testing-specialist**: Measure coverage, test error scenarios
2. **security-dev**: Security audit, validate input/auth
3. All Leads: Final review, PR preparation

---

## Success Criteria

✅ Development server starts with `npm run dev`
✅ Production build succeeds with `npm run build`
✅ All database migrations applied successfully
✅ All endpoints return correct response types
✅ All endpoints validate input
✅ All error scenarios handled gracefully
✅ All tests pass with ≥80% coverage
✅ TypeScript strict mode passes
✅ ESLint and Prettier pass
✅ No hardcoded secrets in repository
✅ API documentation complete (OpenAPI/Swagger)
✅ No console errors in development or production
✅ PR includes endpoint examples and documentation

---

## Communication Protocol

- **Daily**: 5-min standup on blockers
- **Code Review**: All PRs reviewed before merge
- **Documentation**: Update `/reports/` and API docs after features
- **Testing**: No merge without passing tests

---

## Customization Checklist

- [ ] Replace [PROJECT_NAME] with actual project name
- [ ] Replace [CUSTOMIZE: ...] sections with project details
- [ ] Update Tech Stack (Node/Python/Go/Rust)
- [ ] Update Framework (Express/FastAPI/Gin)
- [ ] Update Database (PostgreSQL/MongoDB)
- [ ] Update ORM (Prisma/TypeORM/SQLAlchemy)
- [ ] Update Migration tool (Knex/Alembic/Flyway)
- [ ] Add API-specific safety constraints
- [ ] Update Repository Structure for your conventions
- [ ] Define domain-specific models and services
- [ ] Create team structure for your project size
- [ ] Update Build & Test Commands for your setup
