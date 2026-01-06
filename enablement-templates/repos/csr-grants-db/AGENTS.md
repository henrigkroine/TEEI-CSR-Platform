# Multi-Agent Orchestration Structure: CSR & Grants Intelligence Database

## Repository Overview

**Repository Name**: CSR & Grants Intelligence Database
**Tech Stack**: Apollo GraphQL, TypeScript, PostgreSQL, Drizzle ORM, Node.js
**Purpose**: Centralized data service for Corporate Social Responsibility (CSR) programs and grant intelligence data. Provides GraphQL API for querying and managing CSR initiatives, grant opportunities, compliance data, and program metrics across the TEEI ecosystem.
**Part of**: Ecosystem C (TEEI Side)

---

## Build & Test Commands

```bash
# Installation
pnpm install
pnpm install --frozen-lockfile  # CI/production

# Development
pnpm dev                          # Start development server with hot reload
pnpm dev:debug                    # Start with debug logging enabled

# Build & Compilation
pnpm build                        # Production build
pnpm typecheck                    # TypeScript validation (strict mode)

# Testing
pnpm test                         # Run all unit tests
pnpm test:watch                   # Watch mode for unit tests
pnpm test:coverage                # Generate coverage reports

# Database
pnpm db:migrate                   # Run pending migrations
pnpm db:migrate:dev               # Run migrations in development
pnpm db:seed                      # Seed database with sample data
pnpm db:reset                     # Drop all tables and reseed (dev only)
pnpm db:generate                  # Generate Drizzle migration files
pnpm db:studio                    # Open Drizzle Studio for exploration

# Code Quality
pnpm lint                         # Run ESLint
pnpm lint:fix                     # Auto-fix lint issues
pnpm format                       # Format code with Prettier

# GraphQL
pnpm gql:generate                 # Generate TypeScript types from schema
pnpm gql:validate                 # Validate GraphQL schema
```

---

## Architecture Overview

### Repository Structure

```
csr-grants-db/
├── src/
│   ├── generated/                    # Generated GraphQL types (auto)
│   ├── graphql/
│   │   ├── schema.graphql            # GraphQL type definitions
│   │   ├── resolvers/
│   │   │   ├── query/                # Query resolvers
│   │   │   ├── mutation/             # Mutation resolvers
│   │   │   └── subscription/         # Subscription resolvers (if applicable)
│   │   └── directives/               # Custom GraphQL directives
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema definitions
│   │   ├── client.ts                 # Database client initialization
│   │   ├── migrations/               # Migration files
│   │   └── seeds/                    # Database seed scripts
│   ├── services/
│   │   ├── csr-programs.ts           # CSR program logic
│   │   ├── grants.ts                 # Grant intelligence logic
│   │   ├── compliance.ts             # Compliance data logic
│   │   ├── metrics.ts                # Metrics calculation logic
│   │   └── auth.ts                   # Authentication/authorization
│   ├── middleware/
│   │   ├── auth.ts                   # Auth middleware
│   │   ├── logging.ts                # Request logging
│   │   └── error-handling.ts         # Error handling middleware
│   ├── utils/
│   │   ├── validation.ts             # Input validation schemas
│   │   ├── formatters.ts             # Data formatting utilities
│   │   └── errors.ts                 # Custom error classes
│   ├── context.ts                    # Apollo context factory
│   ├── server.ts                     # Apollo server setup
│   └── index.ts                      # Entry point
├── drizzle.config.ts                 # Drizzle configuration
├── codegen.ts                        # GraphQL Code Generator config
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Test configuration
├── .env.example                      # Environment variables template
├── package.json
└── README.md
```

### Key Components

- **GraphQL API (Apollo Server)**: Type-safe GraphQL schema with resolvers for CSR programs, grants, compliance data
- **PostgreSQL Database**: Primary data store with Drizzle ORM for type-safe queries
- **Database Migrations**: Version-controlled schema changes using Drizzle
- **Service Layer**: Business logic isolation from resolvers
- **Authentication**: JWT or OAuth integration for secure API access
- **Validation**: Zod schemas for input validation
- **Context**: Apollo context for passing auth, loaders, and services to resolvers

---

## Safety Constraints

### NEVER (Blocking)
- ❌ **NEVER** commit database credentials or connection strings directly
- ❌ **NEVER** modify production database directly (use migrations only)
- ❌ **NEVER** skip database migrations when changing schema
- ❌ **NEVER** push directly to main/master branches without PR review
- ❌ **NEVER** commit `.env` files or sensitive configuration
- ❌ **NEVER** access YPAI organization data from TEEI-scoped code (Ecosystem C isolation)
- ❌ **NEVER** skip tests before committing database schema changes
- ❌ **NEVER** use raw SQL queries without parameterized queries (SQL injection risk)
- ❌ **NEVER** run destructive commands (DROP TABLE, TRUNCATE) in production

### ALWAYS (Required)
- ✅ **ALWAYS** run migrations before starting the development server
- ✅ **ALWAYS** create a migration for any schema changes
- ✅ **ALWAYS** validate TypeScript compilation (no errors in strict mode)
- ✅ **ALWAYS** run tests before proposing commits
- ✅ **ALWAYS** validate GraphQL schema consistency with TypeScript types
- ✅ **ALWAYS** check for secrets before committing (use git-secrets or similar)
- ✅ **ALWAYS** document breaking API changes in commit messages
- ✅ **ALWAYS** verify ecosystem isolation in tests (TEEI data only)

### Ecosystem C Isolation (Critical)
- ✅ Validate all queries filter by organization scope (org_id, tenant_id)
- ✅ Verify authentication context includes org isolation checks
- ✅ Ensure seed data and tests use TEEI test organization IDs only
- ✅ Block any cross-organization data leakage in resolvers
- ✅ Audit logs must include organization context for all mutations

---

## Quality Gates

### Code Quality
- ✅ TypeScript compilation: **0 errors** in strict mode
- ✅ Unit test coverage: **≥80%** for services and resolvers
- ✅ Linting: **0 errors** with ESLint
- ✅ Code formatting: Consistent with Prettier configuration

### Database
- ✅ Migration files: **Must exist** for all schema changes
- ✅ Migration tests: **≥80%** coverage of migration logic
- ✅ Schema validation: Drizzle schema matches database state
- ✅ Data integrity: Foreign key constraints enforced

### GraphQL API
- ✅ Schema validation: Valid GraphQL schema (no introspection errors)
- ✅ Resolver coverage: All schema types have resolvers
- ✅ Type safety: Generated TypeScript types match schema
- ✅ Authentication: All mutations require valid authentication

### Integration & E2E
- ✅ E2E test coverage: **≥60%** of critical user flows
- ✅ Integration tests: Database + Apollo integration tested
- ✅ Seed data: Database can be seeded without errors
- ✅ Ecosystem isolation: TEEI data only, no cross-org leakage

### Security
- ✅ No secrets in repository
- ✅ SQL injection prevention: All queries parameterized
- ✅ Authentication: All protected resolvers validate auth context
- ✅ Authorization: Role-based access control enforced (if applicable)

### CI/CD Gates
- ✅ `pnpm typecheck` passes
- ✅ `pnpm lint` passes
- ✅ `pnpm test` passes with coverage reports
- ✅ `pnpm build` succeeds
- ✅ Database migrations can be applied cleanly

---

## Agent Team Structure

### Team 1: Data Engineering & Database (2 agents)
**Lead**: database-lead

- **Agent 1.1**: postgres-specialist
  - **Expertise**: PostgreSQL, schema design, query optimization
  - **MUST BE USED when**:
    - Designing or modifying database schema (tables, columns, constraints)
    - Creating or reviewing SQL queries and indices
    - Optimizing database performance
    - Setting up replication or backup strategies
  - **Deliverables**: Schema designs, migration scripts, query optimizations

- **Agent 1.2**: migration-specialist
  - **Expertise**: Drizzle ORM, database migrations, schema versioning
  - **MUST BE USED when**:
    - Creating migration files for schema changes
    - Reviewing migration strategy and rollback plans
    - Automating migration processes
    - Testing migration safety (no data loss)
  - **Deliverables**: Migration files, migration tests, rollback procedures

### Team 2: API & GraphQL (2 agents)
**Lead**: api-lead

- **Agent 2.1**: apollo-specialist
  - **Expertise**: Apollo Server, GraphQL schema design, resolvers
  - **MUST BE USED when**:
    - Designing GraphQL schema and type definitions
    - Implementing resolvers for queries, mutations, subscriptions
    - Setting up Apollo Server configuration and middleware
    - Implementing authentication in GraphQL context
  - **Deliverables**: GraphQL schema, resolver implementations, Apollo configuration

- **Agent 2.2**: typescript-api-specialist
  - **Expertise**: TypeScript, Node.js API patterns, service layer architecture
  - **MUST BE USED when**:
    - Implementing business logic services
    - Designing API interfaces and contracts
    - Setting up dependency injection and middleware
    - Creating type-safe service abstractions
  - **Deliverables**: Service implementations, type definitions, API contracts

### Team 3: Testing & Quality (1 agent)
**Lead**: qa-specialist

- **Agent 3.1**: test-automation-specialist
  - **Expertise**: Jest, integration testing, database testing, GraphQL testing
  - **MUST BE USED when**:
    - Writing unit tests for services and resolvers
    - Creating integration tests (database + API)
    - Setting up test fixtures and mocks
    - Implementing database seed strategies for testing
    - Testing ecosystem isolation and security boundaries
  - **Deliverables**: Test suites, test fixtures, test documentation

### Recommended Agent Team Summary

| Agent ID | Name | Domain | MUST BE USED For |
|----------|------|--------|------------------|
| 1.1 | postgres-specialist | Database | Schema design, query optimization, indices |
| 1.2 | migration-specialist | Database Migrations | Creating migrations, testing rollback, versioning |
| 2.1 | apollo-specialist | GraphQL API | Schema design, resolvers, context, subscriptions |
| 2.2 | typescript-api-specialist | Backend Services | Business logic, service layer, type safety |
| 3.1 | test-automation-specialist | QA & Testing | Unit/integration tests, fixtures, seed data |

---

## Decision Framework

### Database Decisions
- **ORM**: Drizzle ORM for type-safe queries (required, no raw SQL)
- **Migrations**: Drizzle migrations for all schema changes (required)
- **Connections**: Single primary PostgreSQL instance (read replicas optional for scaling)
- **Transactions**: Use database transactions for multi-step operations
- **Constraints**: Foreign key constraints enforced for referential integrity

### GraphQL API Decisions
- **Schema**: Apollo Server with type-first approach (schema.graphql is source of truth)
- **Resolvers**: Co-located with schema, organized by domain (query, mutation, subscription)
- **Context**: Passed to resolvers for auth, loaders, services (no global state)
- **Authentication**: JWT tokens with org_id in payload for isolation
- **Authorization**: Implement at resolver level, verify org scope on all queries/mutations
- **Error Handling**: Structured errors with codes, no internal error details exposed

### TypeScript Decisions
- **Strict Mode**: All files in strict mode (no implicit any)
- **Validation**: Zod schemas for all GraphQL inputs and outputs
- **Services**: Business logic isolated in service classes/functions
- **Types**: Generated from GraphQL schema where applicable
- **Testing**: Jest with TypeScript support, type-safe test fixtures

### Testing Decisions
- **Unit Tests**: Services, utilities, validators (Jest, ≥80% coverage)
- **Integration Tests**: Database + GraphQL integration (use test database)
- **Isolation**: Tests use isolated transactions or test database seed
- **Fixtures**: Factory functions or seed data for consistent test state
- **Mocking**: Mock external services, use real database for integration tests

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **database-lead**: Initialize PostgreSQL schema and Drizzle configuration
2. **migration-specialist**: Set up migration infrastructure and first migration
3. **api-lead**: Design GraphQL schema and Apollo Server setup

### Phase 2: API Implementation (Week 2)
1. **apollo-specialist**: Implement resolvers for core entities (CSR programs, grants)
2. **typescript-api-specialist**: Build service layer for business logic
3. **postgres-specialist**: Optimize queries and set up indices for performance

### Phase 3: Testing & Integration (Week 3)
1. **test-automation-specialist**: Write integration tests for API and database
2. **migration-specialist**: Test migration safety and rollback scenarios
3. **api-lead**: Validate API contracts and error handling

### Phase 4: Security & Validation (Week 4)
1. All agents: Verify ecosystem isolation (TEEI data only)
2. **test-automation-specialist**: Execute security boundary tests
3. All leads: PR review, documentation, demo prep

---

## Success Criteria

✅ **GraphQL API Ready**: Apollo Server serves valid GraphQL schema with ≥90% resolver coverage
✅ **Database Operational**: PostgreSQL with Drizzle ORM, all migrations pass
✅ **Type Safety**: TypeScript in strict mode, 0 errors, generated types match schema
✅ **Testing Complete**: Unit tests ≥80%, integration tests ≥60%, all gates pass
✅ **Ecosystem Isolation**: All queries/mutations filter by org_id, no cross-org data leakage
✅ **Documentation**: Schema documented, README explains architecture, API examples provided
✅ **Security**: No secrets in repo, all inputs validated, auth enforced
✅ **CI/CD Ready**: All build and test scripts passing in CI pipeline
✅ **PR Ready**: Clean commit history, PR description, screenshots/examples if applicable

---

## Allowed Tools by Agent

### database-lead
- **Read, Write**: Database configuration, migration files, schema files
- **Bash**: `pnpm db:*`, `pnpm typecheck`, `pnpm test` only
- **Prohibited**: Production database access, direct credential modification

### postgres-specialist
- **Read, Write**: Schema files, SQL query files, test data fixtures
- **Bash**: `pnpm db:studio`, `pnpm db:migrate:dev`, `pnpm test:db` only
- **Prohibited**: Production database access, shell commands outside pnpm

### migration-specialist
- **Read, Write**: Migration files, migration tests, rollback procedures
- **Bash**: `pnpm db:migrate`, `pnpm db:generate`, `pnpm test` only
- **Prohibited**: Production migrations, direct database modifications

### apollo-specialist
- **Read, Write**: GraphQL schema, resolver files, Apollo configuration
- **Bash**: `pnpm dev`, `pnpm gql:generate`, `pnpm test` only
- **Prohibited**: Database modification, infrastructure changes

### typescript-api-specialist
- **Read, Write**: Service files, utility files, type definitions
- **Bash**: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck` only
- **Prohibited**: Database access, infrastructure modification

### test-automation-specialist
- **Read, Write**: Test files, test fixtures, test configuration
- **Bash**: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage` only
- **Prohibited**: Modifying source code directly, database access in tests (use fixtures)

---

## Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **PR Process**: Clear commit messages, link to requirements, include screenshots/examples
- **Documentation**: Update README and schema docs after major changes
- **Agent Artifacts**: Team writes to `/reports/` directory and updates this file after each milestone

---

## Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does tech lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early
   - **Example**: API development depends on schema → schema design first
   - **Example**: Migration testing depends on schema → schema finalized before migration
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every schema change, migration, resolver documented
6. **Least-privilege tools** - Agents use minimum required tools (no unnecessary shell access)

---

## Additional Resources

- **Drizzle Documentation**: https://orm.drizzle.team/
- **Apollo Server Documentation**: https://www.apollographql.com/docs/apollo-server/
- **GraphQL Best Practices**: https://graphql.org/learn/best-practices/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

**Last Updated**: 2025-11-17
**Maintained By**: CSR & Grants Intelligence Database Team
