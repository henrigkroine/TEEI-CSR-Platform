# Claude Agent Setup Migration Guide

**For**: Teams migrating existing repositories to Claude agent orchestration
**Time**: 15-30 minutes for basic setup, plus customization for your project
**Status**: Production-ready guide based on TEEI-CSR-Platform implementations

---

## Table of Contents

1. [Prerequisites Checklist](#prerequisites-checklist)
2. [Step-by-Step Migration Process](#step-by-step-migration-process)
3. [Decision Tree for Agent Selection](#decision-tree-for-agent-selection)
4. [Repository Type Examples](#repository-type-examples)
5. [Common Pitfalls and How to Avoid Them](#common-pitfalls-and-how-to-avoid-them)
6. [Testing and Validation Steps](#testing-and-validation-steps)
7. [Rollback Procedure](#rollback-procedure)
8. [Customization Guide](#customization-guide)
9. [FAQ and Troubleshooting](#faq-and-troubleshooting)

---

## Prerequisites Checklist

Before starting migration, verify you have:

### Repository Access & Tools
- [ ] Git repository access with push permissions
- [ ] Claude Code CLI installed (`claude-code --version` works)
- [ ] Node.js/npm or Python/pip (language-appropriate package manager)
- [ ] Text editor or IDE with markdown support
- [ ] Terminal/shell access

### Repository Health
- [ ] Repository is clean (no uncommitted changes)
- [ ] `.gitignore` properly configured (excludes dependencies, secrets, builds)
- [ ] Main branch is stable (all tests passing)
- [ ] Repository structure follows standard conventions:
  - Frontend: `src/`, `package.json`, linter config
  - Backend: `src/` or `app/`, test directory, configuration
  - Fullstack: Both frontend and backend structures
  - Serverless: `src/functions/`, `serverless.yml` or equivalent

### Documentation
- [ ] README.md exists and describes the project
- [ ] Tech stack is clearly identified (framework versions, languages)
- [ ] Build and test commands are documented
- [ ] Architecture overview or repository structure documented
- [ ] Key files and directories identified

### Team Readiness
- [ ] At least one team member familiar with Claude Code
- [ ] Identified tech lead for orchestration
- [ ] List of specialized roles needed (e.g., frontend specialist, backend specialist)
- [ ] Definition of "done" for agent-driven development

---

## Step-by-Step Migration Process

### Phase 1: Analyze Your Repository (5 minutes)

#### 1.1 Identify Your Repository Type

Answer these questions:

- **Is it frontend or backend?**
  - Frontend: React, Vue, Svelte, Astro, etc.
  - Backend: Node.js, Python, Go, Java, etc.
  - Fullstack: Both
  - Serverless: AWS Lambda, Google Cloud Functions, etc.

- **What are the core concerns?**
  - Frontend: UI components, state management, styling, accessibility
  - Backend: APIs, databases, authentication, integrations
  - Fullstack: All of above + DevOps, deployment
  - Serverless: Functions, API Gateway, cloud services, data pipelines

- **What's the team size?**
  - Solo developer: 2-3 specialist agents
  - Small team (2-3): 5-8 agents, 1-2 lead roles
  - Medium team (4-8): 10-20 agents, 2-3 leads
  - Large team (8+): 20+ agents, 4+ leads

#### 1.2 Document Your Tech Stack

Create a file `TECH_STACK.md` in your repo root:

```markdown
# Tech Stack

## Frontend
- **Framework**: React 18 (or Astro, Vue, Svelte, etc.)
- **Styling**: TailwindCSS (or CSS-in-JS, SCSS, etc.)
- **State Management**: Zustand (or Redux, Context, etc.)
- **Testing**: Vitest + React Testing Library
- **Build Tool**: Vite (or Webpack, Esbuild, etc.)

## Backend (if applicable)
- **Runtime**: Node.js 20 (or Python 3.11, Go 1.21, etc.)
- **Framework**: Express.js (or Fastify, Django, Flask, etc.)
- **Database**: PostgreSQL (or MongoDB, DynamoDB, etc.)
- **Testing**: Jest (or pytest, go test, etc.)
- **Deployment**: Docker / Kubernetes (or serverless, etc.)

## Shared
- **Package Manager**: pnpm (or npm, yarn, pip, etc.)
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions (or GitLab CI, Jenkins, etc.)
```

#### 1.3 List Key Build Commands

Document all standard commands (from your `package.json` or `Makefile`):

```markdown
# Build & Test Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Type checking (TypeScript) |
| `pnpm lint` | Linting checks |
| `pnpm lint:fix` | Auto-fix linting issues |
| `pnpm test:coverage` | Generate coverage reports |
```

---

### Phase 2: Select Agent Structure (5 minutes)

Use the **Decision Tree** section below to determine:

1. How many teams do you need?
2. Which specialist roles are critical?
3. Who is the tech lead/orchestrator?

**Quick example for a React app:**

```
Repository Type: Frontend (React + TypeScript)
Team Size: 3 people
=> 1 lead (Frontend Architect) + 3 specialists
   1. React Component Developer
   2. Styling & Design Specialist
   3. Testing & Quality Specialist
```

---

### Phase 3: Create CLAUDE.md (2 minutes)

Create `/CLAUDE.md` in repository root:

```markdown
@AGENTS.md
```

This simple file tells Claude Code to load the full agent definition from `AGENTS.md`.

**Why this pattern?**
- ✅ Keeps agent definitions in single file (AGENTS.md)
- ✅ CLAUDE.md is thin and stable (rarely changes)
- ✅ Easy to reference from other contexts

---

### Phase 4: Create AGENTS.md (15-20 minutes)

This is the core file. Follow the structure below:

```markdown
# Multi-Agent Orchestration Structure

## [Your Project Name]

**Tech Stack**: [List from Phase 1.2]

**Purpose**: [2-3 sentence description of what this repo does]

---

## Build & Test Commands

\`\`\`bash
[Copy from Phase 1.3 - all dev commands]
\`\`\`

---

## Architecture Overview

### Repository Structure

\`\`\`
[Diagram of your repo structure]
\`\`\`

### Key Components

- **Component 1**: Description
- **Component 2**: Description

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER [critical blocking rule 1]
- ❌ NEVER [critical blocking rule 2]
- ❌ NEVER [critical blocking rule 3]

### ALWAYS (Required)
- ✅ ALWAYS [required practice 1]
- ✅ ALWAYS [required practice 2]
- ✅ ALWAYS [required practice 3]

---

## Quality Gates

### Testing Requirements
- ✅ Unit test coverage ≥80%
- ✅ All critical paths tested
- ✅ No console errors in prod build

### Code Quality
- ✅ TypeScript: Strict mode, no `any` types
- ✅ ESLint + Prettier: 100% pass
- ✅ Build succeeds with no warnings

### Documentation
- ✅ New features documented in code
- ✅ API endpoints documented
- ✅ Complex logic has explanation comments

---

## Agent Team Structure

### Team 1: [Domain] ([X agents])
**Lead**: [lead-name]

#### Agent 1.1: [Specialist Name]
**Role**: [Expert description]

**When to Invoke**:
MUST BE USED when:
- [Trigger 1]
- [Trigger 2]

**Capabilities**:
- [Capability 1]
- [Capability 2]

**Context Required**:
- @AGENTS.md
- [Specific files/docs]

**Deliverables**:
Creates/modifies:
- [File paths and descriptions]

**Blocks merge if**:
- [Blocking condition 1]
- [Blocking condition 2]

---

## Decision Framework

[Architecture decisions and conventions]

---

## Orchestration Workflow

### Phase 1: Foundation
1. [First step]
2. [Second step]

### Phase 2: Implementation
1. [Implementation steps]

### Phase 3: Testing & Polish
1. [Testing steps]

---

## Success Criteria

✅ [Success 1]
✅ [Success 2]
✅ [Success 3]

---

## Communication Protocol

- **Daily**: [Standup timing if applicable]
- **Commits**: Small, atomic, tested slices
- **Documentation**: Update after features
- **Escalation**: Blockers → Tech Lead immediately
```

**👉 Copy template examples from** `/enablement-templates/repos/` for your repository type.

---

### Phase 5: Test the Setup (3 minutes)

#### 5.1 Verify CLAUDE.md and AGENTS.md are in Root

```bash
# From repository root
ls -la | grep -E "CLAUDE|AGENTS"
# Should output:
# CLAUDE.md
# AGENTS.md
```

#### 5.2 Test with Claude Code

```bash
# Test that Claude can read your configuration
claude-code "Show me the agent team structure for this repo"

# Should return your AGENTS.md content or summary
```

#### 5.3 Verify Build Commands Work

```bash
# Test each command from your AGENTS.md
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All commands should succeed before proceeding.

#### 5.4 Create Initial Commit

```bash
git add CLAUDE.md AGENTS.md
git commit -m "chore: Add Claude agent setup and AGENTS.md orchestration"
```

---

## Decision Tree for Agent Selection

Use this flowchart to determine your agent structure:

```
START: New Repository
  |
  ├─ Is it primarily code or infrastructure?
  |  |
  |  ├─ CODE (app, service, library)
  |  |  |
  |  |  ├─ Frontend? (UI, React, Astro, etc.)
  |  |  |  |
  |  |  |  ├─ Single-page app (React, Vue)?
  |  |  |  |  └─> Teams: UI Components, State Mgmt, Styling, Testing
  |  |  |  |      Specialists: React Dev, Designer, Test Engineer
  |  |  |  |
  |  |  |  ├─ Static site (Astro, Hugo)?
  |  |  |  |  └─> Teams: Content, Pages, Optimization
  |  |  |  |      Specialists: Content, Astro, SEO, A11y
  |  |  |  |
  |  |  |  └─ Mobile (React Native, Flutter)?
  |  |  |     └─> Teams: Mobile UI, Sync, Testing
  |  |  |         Specialists: Mobile Dev, Backend Integration, QA
  |  |  |
  |  |  ├─ Backend? (API, service, microservice)
  |  |  |  |
  |  |  |  ├─ REST API (Express, Flask, Django)?
  |  |  |  |  └─> Teams: Endpoints, Database, Auth, Testing
  |  |  |  |      Specialists: API Dev, Database, Security, Test Engineer
  |  |  |  |
  |  |  |  ├─ GraphQL API?
  |  |  |  |  └─> Teams: Schema, Resolvers, Performance, Testing
  |  |  |  |      Specialists: GraphQL Dev, Performance, Test Engineer
  |  |  |  |
  |  |  |  ├─ Data Service (pipeline, ETL, analytics)?
  |  |  |  |  └─> Teams: Pipelines, Quality, Monitoring
  |  |  |  |      Specialists: Data Eng, Data Quality, Observability
  |  |  |  |
  |  |  |  └─ Worker/Task Queue?
  |  |  |     └─> Teams: Queue Logic, Tasks, Monitoring
  |  |  |         Specialists: Queue Specialist, Monitoring, Test Engineer
  |  |  |
  |  |  ├─ Fullstack? (Frontend + Backend)
  |  |  |  |
  |  |  |  ├─ Monorepo?
  |  |  |  |  └─> Teams: Frontend (3-4), Backend (3-4), DevOps (1-2)
  |  |  |  |      Leads: Frontend Lead, Backend Lead, DevOps Lead
  |  |  |  |
  |  |  |  └─ Separate apps?
  |  |  |     └─> Setup separate AGENTS.md for each app
  |  |  |         Create MULTI_AGENT_PLAN.md for orchestration
  |  |  |
  |  |  └─ Serverless? (Lambda, Cloud Functions)
  |  |     |
  |  |     ├─ Single function?
  |  |     |  └─> 2-3 specialists (Serverless, Data, Testing)
  |  |     |
  |  |     └─ Multiple functions/pipelines?
  |  |        └─> 5+ specialists + Data specialist
  |  |
  |  └─> Question 2: Team Size?
  |     |
  |     ├─ Solo developer (1)
  |     |  └─> 2-3 agents, simplified leads
  |     |
  |     ├─ Small team (2-3)
  |     |  └─> 5-8 agents, 1 lead
  |     |
  |     ├─ Medium team (4-8)
  |     |  └─> 10-15 agents, 2 leads
  |     |
  |     └─ Large team (8+)
  |        └─> 20+ agents, 3+ leads
  |
  └─ INFRASTRUCTURE (DevOps, platforms, tools)
     |
     ├─ CI/CD Pipelines?
     |  └─> CI/CD Specialist, Release Manager
     |
     ├─ Kubernetes / Docker?
     |  └─> DevOps Specialist, Platform Engineer
     |
     └─ Monitoring / Infrastructure?
        └─> Observability Specialist, SRE
```

---

## Repository Type Examples

### 1. Frontend Repository (React/Vue/Svelte)

**Setup Time**: 20 minutes

#### A. Identify Your Needs

```yaml
Framework: React 18
Styling: TailwindCSS
Testing: Vitest + React Testing Library
Linting: ESLint + Prettier
Team Size: 3 people
```

#### B. Create AGENTS.md Structure

```markdown
# Multi-Agent Orchestration Structure

## Frontend Application

**Tech Stack**: React 18, TypeScript, TailwindCSS, Vitest

**Purpose**: High-performance web application with real-time data updates and complex UI state.

---

## Build & Test Commands

\`\`\`bash
pnpm install
pnpm dev              # Start dev server (Vite)
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm test             # Run tests (Vitest)
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint + Prettier checks
pnpm lint:fix         # Auto-fix linting issues
\`\`\`

---

## Agent Team Structure

### Team 1: Component Development (2 agents)
**Lead**: frontend-lead

#### Agent 1.1: React Component Developer
**Role**: Expert in React components, hooks, state management, and performance optimization.

**When to Invoke**:
MUST BE USED when:
- Creating or modifying React components
- Implementing custom hooks or state management
- Optimizing component rendering performance
- Adding new features to existing components

**Capabilities**:
- React component development (functional components, hooks)
- Custom hooks for logic reuse
- Zustand / Context API for state management
- Component memoization and performance optimization
- TypeScript component patterns and interfaces
- Event handling and form management

**Quality Gates**:
- Unit test coverage ≥80% for all components
- TypeScript: No `any` types, strict mode enabled
- No console errors in development or production build
- Lighthouse score ≥90 on component pages
- Accessibility (WCAG 2.1 AA) on all interactive components

---

#### Agent 1.2: Styling & Design Specialist
**Role**: Expert in TailwindCSS, responsive design, theming, and design system consistency.

**When to Invoke**:
MUST BE USED when:
- Implementing new UI designs or layouts
- Adding responsive breakpoints
- Implementing dark mode or theming
- Creating reusable utility classes
- Ensuring design consistency across components

**Capabilities**:
- TailwindCSS utility-first styling
- Responsive design (mobile-first approach)
- Dark mode / theme implementation
- Design token system (colors, spacing, typography)
- CSS performance optimization
- Print styles and accessibility-focused design

---

### Team 2: Testing & Quality (1 agent)
**Lead**: qa-lead

#### Agent 2.1: Test Engineer
**Role**: Expert in testing React applications with unit, integration, and E2E tests.

**When to Invoke**:
MUST BE USED when:
- Writing unit tests for components
- Creating integration tests for features
- Setting up E2E tests (critical user paths)
- Analyzing test coverage gaps
- Debugging test failures

**Capabilities**:
- Vitest unit testing framework
- React Testing Library for component testing
- Playwright for E2E testing
- Mock data factories and fixtures
- Code coverage analysis

---

## Success Criteria

✅ All components have ≥80% unit test coverage
✅ TypeScript strict mode: no errors or warnings
✅ ESLint + Prettier: 100% pass
✅ Production build succeeds with no warnings
✅ Lighthouse score ≥90 on all pages
✅ WCAG 2.1 AA compliance on all interactive elements
✅ No unresolved TypeScript errors
✅ All critical user paths have E2E tests
```

#### C. Example Workflow

1. **Day 1: Component Development**
   ```bash
   claude-code "Build a reusable Button component with variants (primary, secondary, danger)"
   # Invokes: React Component Developer (component + tests)
   # Invokes: Styling & Design Specialist (TailwindCSS styling)
   # Invokes: Test Engineer (unit tests for variants)
   ```

2. **Day 2: Feature Implementation**
   ```bash
   claude-code "Add user profile page with avatar, bio, edit functionality"
   # Invokes: React Component Developer (page component + state)
   # Invokes: Styling & Design Specialist (responsive layout)
   # Invokes: Test Engineer (E2E test for editing flow)
   ```

---

### 2. Backend Repository (Node.js/Express API)

**Setup Time**: 20 minutes

#### A. Identify Your Needs

```yaml
Framework: Express.js + TypeScript
Database: PostgreSQL
Testing: Jest
Deployment: Docker / Kubernetes
Team Size: 4 people
```

#### B. Create AGENTS.md Structure

```markdown
# Multi-Agent Orchestration Structure

## Backend API Service

**Tech Stack**: Node.js 20, Express.js, TypeScript, PostgreSQL

**Purpose**: RESTful API serving real-time data with authentication, validation, and business logic.

---

## Build & Test Commands

\`\`\`bash
pnpm install
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript
pnpm start            # Run compiled app
pnpm test             # Run tests
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint checks
\`\`\`

---

## Agent Team Structure

### Team 1: API Development (2 agents)
**Lead**: backend-lead

#### Agent 1.1: API Endpoint Developer
**Role**: Expert in Express.js, REST API design, request validation, and error handling.

**When to Invoke**:
MUST BE USED when:
- Creating new API endpoints
- Modifying request/response contracts
- Implementing validation schemas
- Adding authentication/authorization middleware
- Handling errors and edge cases

**Capabilities**:
- Express.js routing and middleware
- Request validation (Zod/Joi schemas)
- Error handling and structured responses
- Authentication (JWT, OAuth2)
- API documentation

---

#### Agent 1.2: Database Specialist
**Role**: Expert in PostgreSQL schema design, migrations, queries, and performance optimization.

**When to Invoke**:
MUST BE USED when:
- Creating or modifying database schemas
- Writing database migrations
- Optimizing queries (indexes, query plans)
- Implementing complex data transformations
- Managing database transactions

**Capabilities**:
- PostgreSQL schema design and migrations
- Query optimization and indexing
- ORM/Query builder usage (Knex, TypeORM, Prisma)
- Data integrity and constraints
- Performance profiling (EXPLAIN ANALYZE)

---

### Team 2: Security & Quality (2 agents)
**Lead**: security-lead

#### Agent 2.1: Auth & Security Specialist
**Role**: Expert in authentication, authorization, encryption, and security best practices.

**When to Invoke**:
MUST BE USED when:
- Implementing authentication flows
- Setting up authorization/RBAC
- Handling secrets and credentials
- Implementing audit logging
- Addressing security vulnerabilities

---

#### Agent 2.2: Test Engineer
**Role**: Expert in unit, integration, and E2E testing for Node.js APIs.

**When to Invoke**:
MUST BE USED when:
- Writing unit tests for business logic
- Creating integration tests (database, external APIs)
- Testing error scenarios
- Analyzing coverage gaps

---

## Success Criteria

✅ All endpoints have unit tests (≥80% coverage)
✅ All database queries have integration tests
✅ TypeScript strict mode: no errors
✅ Authentication and authorization tested
✅ API documentation up-to-date
✅ No security vulnerabilities (dependency audit passing)
```

---

### 3. Fullstack Repository (Monorepo)

**Setup Time**: 25 minutes

#### A. Repository Structure

```
monorepo/
├── apps/
│   ├── web/                    # Frontend (React/Next.js)
│   │   ├── src/
│   │   ├── package.json
│   │   └── AGENTS.md          # Frontend-specific agents
│   │
│   └── api/                    # Backend (Express/GraphQL)
│       ├── src/
│       ├── package.json
│       └── AGENTS.md          # Backend-specific agents
│
├── packages/                   # Shared code
│   ├── types/
│   ├── utils/
│   └── AGENTS.md              # Shared package agents
│
├── MULTI_AGENT_PLAN.md        # Orchestration across apps
├── CLAUDE.md                  # References MULTI_AGENT_PLAN.md
└── AGENTS.md                  # Root-level coordination (optional)
```

#### B. Create Root CLAUDE.md

```markdown
@MULTI_AGENT_PLAN.md
```

#### C. Create MULTI_AGENT_PLAN.md

```markdown
# Multi-Agent Orchestration - Fullstack Monorepo

**Purpose**: Coordinate frontend, backend, and shared package development.

---

## Overall Architecture

### Frontend App (apps/web/)
- **Tech**: React 18, TypeScript, TailwindCSS
- **Lead**: frontend-lead
- **Agents**: Component Dev, Designer, Test Engineer
- **See**: apps/web/AGENTS.md

### Backend App (apps/api/)
- **Tech**: Express.js, PostgreSQL, TypeScript
- **Lead**: backend-lead
- **Agents**: API Dev, Database Specialist, Security Specialist
- **See**: apps/api/AGENTS.md

### Shared Packages (packages/)
- **Tech**: TypeScript, shared types and utilities
- **Lead**: tech-lead
- **Agents**: TypeScript Architect, Package Maintainer

---

## Integration Points

**API Contract**:
- Frontend → Backend: REST endpoints in `packages/types/api.ts`
- Shared Types: Database models in `packages/types/models.ts`
- Test Data: Fixtures in `packages/fixtures/`

**Dependency Management**:
- All apps use pnpm workspaces
- Shared packages versioned independently
- Breaking changes documented in CHANGELOG.md

---

## Orchestration Workflow

### Feature Development (Cross-Team)

**Example: Add user profile feature**

1. **tech-lead** (Shared): Design type interfaces in `packages/types/`
2. **backend-lead**: Implement endpoints in `apps/api/`
3. **frontend-lead**: Build UI in `apps/web/`
4. **All leads**: Integration test across frontend ↔ backend

---

## Quality Gates (Monorepo)

✅ All apps build successfully (`pnpm build`)
✅ All tests pass (`pnpm test`)
✅ No breaking changes to shared types (packages/types/)
✅ API contracts match frontend expectations

---

## Communication Protocol

- **Daily**: Tech lead standup (5 min)
- **APIs**: Breaking changes announced 24h in advance
- **Shared Code**: Code review from 1 lead before merge
- **Deployment**: Coordinated release (apps/ dependencies)
```

#### D. Create app-specific AGENTS.md

Create `apps/web/AGENTS.md` (similar to Frontend example)
Create `apps/api/AGENTS.md` (similar to Backend example)

---

### 4. Serverless Repository (Lambda/Cloud Functions)

**Setup Time**: 20 minutes

#### A. Repository Structure

```
serverless-app/
├── src/
│   ├── functions/           # Lambda entry points
│   │   ├── create-user.ts
│   │   ├── get-user.ts
│   │   └── process-webhook.ts
│   ├── services/            # Business logic
│   │   ├── user-service.ts
│   │   └── auth-service.ts
│   └── types/               # Shared types
│       └── api.ts
├── tests/
│   ├── unit/
│   └── integration/
├── serverless.yml           # Function definitions
├── AGENTS.md               # Agent orchestration
└── CLAUDE.md
```

#### B. Create AGENTS.md

```markdown
# Multi-Agent Orchestration - Serverless

**Tech Stack**: AWS Lambda, Node.js 20, TypeScript, Serverless Framework

**Purpose**: Data pipeline processing video analytics and writing to Google Sheets.

---

## Build & Test Commands

\`\`\`bash
pnpm install
pnpm dev                # Local serverless-offline
pnpm build              # Compile functions
pnpm deploy:dev         # Deploy to dev
pnpm deploy:prod        # Deploy to production
pnpm test               # Run tests
pnpm typecheck          # TypeScript validation
\`\`\`

---

## Agent Team Structure

### Team 1: Serverless Development (2 agents)
**Lead**: serverless-lead

#### Agent 1.1: Serverless Specialist
**Role**: Expert in AWS Lambda, deployment, and serverless framework configuration.

**When to Invoke**:
MUST BE USED when:
- Modifying serverless.yml or function configuration
- Adding new Lambda functions
- Setting up environment variables
- Configuring API Gateway or S3 triggers
- Debugging deployment failures

**Capabilities**:
- Serverless Framework configuration
- AWS Lambda lifecycle and permissions
- API Gateway setup
- CloudWatch logging
- Deployment and versioning

---

#### Agent 1.2: Data Transformation Specialist
**Role**: Expert in data pipelines, validation, and business logic.

**When to Invoke**:
MUST BE USED when:
- Implementing data transformations
- Adding validation schemas
- Calculating metrics or aggregations
- Writing golden tests

**Capabilities**:
- Event processing and transformation
- Data validation (Zod/Joi)
- Business logic implementation
- Testing with sample data

---

### Team 2: Quality & Security (1 agent)
**Lead**: qa-lead

#### Agent 2.1: Test Engineer
**Role**: Expert in testing Lambda functions locally and in cloud.

---

## Success Criteria

✅ All functions deployable locally (`pnpm dev`)
✅ Unit tests pass with ≥80% coverage
✅ Integration tests pass (mocked AWS services)
✅ Deployment to dev succeeds
✅ No secrets in code or configuration
```

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: AGENTS.md is Too Large or Unfocused

**Symptom**: AGENTS.md is 500+ lines, agents overlap, unclear responsibilities

**Root Cause**: Trying to define every possible detail instead of focusing on key decisions

**Solution**:
```markdown
# ✅ Good: Focused AGENTS.md

1. Clear team structure (max 3 teams for small repos)
2. Each agent has specific "When to Invoke" triggers
3. Deliverables tied to specific files/directories
4. Quality gates are measurable (coverage %, test results)
5. Decision framework is concise (3-5 key decisions)

# ❌ Bad: Unfocused AGENTS.md

- Lists every possible feature
- Agents with overlapping responsibilities
- Vague "When to Invoke" triggers
- Quality gates that are hard to measure
- 10+ teams for a 2-person repository
```

**Fix**: Start with minimal structure (2-3 agents), add complexity only when needed.

---

### Pitfall 2: Agents Have Unclear Boundaries

**Symptom**: Multiple agents claim same work, merge conflicts, finger-pointing

**Root Cause**: Overlapping "When to Invoke" triggers, no clear file ownership

**Solution**:

```markdown
# ❌ Bad: Overlapping agents

Agent 1 (Database Specialist):
  MUST BE USED when:
  - Creating database schemas
  - Writing queries
  - Optimizing performance

Agent 2 (Query Optimization Specialist):
  MUST BE USED when:
  - Writing queries
  - Optimizing performance
  - Creating indexes

# ✅ Good: Clear boundaries

Agent 1 (Database Specialist):
  MUST BE USED when:
  - Creating/modifying database schemas (src/migrations/)
  - Writing ORM models (src/models/)
  - Managing relationships and constraints
  - Setting up migrations

  Delegates to: Query Optimization Specialist for query tuning

Agent 2 (Query Optimization Specialist):
  MUST BE USED when:
  - Analyzing slow queries (EXPLAIN ANALYZE)
  - Adding indexes (works with DB Specialist on schema)
  - Optimizing N+1 queries
  - Profiling database performance
```

**Fix**: Assign file ownership to specific agents, clarify delegation boundaries.

---

### Pitfall 3: Quality Gates Aren't Enforced

**Symptom**: Quality gates listed in AGENTS.md, but not actually checked in CI/CD

**Root Cause**: Gates defined but no automation, no consequences for failing

**Solution**:

```bash
# ✅ Add quality gates to CI/CD

# 1. Add GitHub Actions workflow (.github/workflows/quality-gates.yml)
name: Quality Gates

on: [pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm test --coverage
      - name: Check coverage ≥80%
        run: |
          coverage=$(pnpm test --coverage --silent | grep Lines | awk '{print $2}' | cut -d'%' -f1)
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80% threshold"
            exit 1
          fi
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm typecheck

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm lint
```

**Fix**: Implement quality gates in CI pipeline with failure conditions.

---

### Pitfall 4: AGENTS.md Not Updated When Code Changes

**Symptom**: AGENTS.md describes old architecture, real code is different

**Root Cause**: AGENTS.md created once, never maintained

**Solution**:

```markdown
# ✅ Keep AGENTS.md in sync

1. **When updating code**: Check if AGENTS.md still applies
2. **When architecture changes**: Update AGENTS.md first
3. **When adding/removing agents**: Reflect in orchestration workflow
4. **Before merging large features**: Update relevant agent definitions

# Example: Updating AGENTS.md when adding new service

COMMIT 1: Add new service structure
COMMIT 2: Update AGENTS.md with new team/agent
COMMIT 3: Implement service with new agent
COMMIT 4: Add tests and documentation
```

**Fix**: Include AGENTS.md in PR review checklist, update synchronously with code changes.

---

### Pitfall 5: Agents Lack Context About Specialized Files

**Symptom**: Agents working on wrong files, missing imports, duplicating logic

**Root Cause**: AGENTS.md doesn't specify file locations or interdependencies

**Solution**:

```markdown
# ✅ Good: Specific file context

Agent: React Component Developer

Context Required:
- @AGENTS.md for standards
- src/components/ - all React components
- src/types/ - TypeScript interfaces
- tests/unit/ - test files
- src/hooks/ - custom hooks

Deliverables:
Creates/modifies:
- src/components/[ComponentName].tsx - component file
- src/components/__tests__/[ComponentName].test.tsx - unit test
- src/types/components.ts - type definitions (when extending)

# ❌ Bad: Vague context

Agent: React Component Developer

Context Required:
- React documentation
- TypeScript handbook
- Project structure

Deliverables:
- React components
- Tests
```

**Fix**: List specific directories and file naming conventions in AGENTS.md.

---

### Pitfall 6: No Rollback Procedure Documented

**Symptom**: Agent setup causes issues, no clear way to revert

**Root Cause**: Migration guide doesn't include rollback steps

**Solution**: See [Rollback Procedure](#rollback-procedure) section below.

---

### Pitfall 7: Tool Permissions Too Broad

**Symptom**: Agents with Bash access delete critical files, modify databases

**Root Cause**: No least-privilege access control

**Solution**:

```markdown
# ✅ Good: Least-privilege tools

Agent: React Component Developer
Allowed Tools:
- Read: src/components/, src/types/, package.json
- Write: src/components/, tests/unit/
- Glob: src/components/
# No Bash, no Bash for file operations

Agent: Backend Infrastructure Specialist
Allowed Tools:
- Read: All
- Write: All
- Bash: Deployment commands, Docker, CI/CD scripts (limited scope)

# ❌ Bad: Too much access

Agent: Junior Developer
Allowed Tools:
- Full Bash access
- Full file write access
- All tools
```

**Fix**: Define minimal required tools per agent, escalate for risky operations.

---

## Testing and Validation Steps

### Pre-Migration Testing (Baseline)

Before adding Claude agents, establish baseline:

```bash
# 1. Verify all tests pass
pnpm test
# Expected: All tests pass, coverage ≥80%

# 2. Verify build succeeds
pnpm build
# Expected: Build completes with 0 warnings

# 3. Verify linting passes
pnpm lint
# Expected: 0 lint errors

# 4. Verify type checking passes
pnpm typecheck
# Expected: 0 TypeScript errors

# Store results:
echo "Baseline established: $(date)" > MIGRATION_BASELINE.md
pnpm test --coverage > /tmp/baseline-coverage.txt
```

### Post-Migration Testing (Validation)

After adding CLAUDE.md and AGENTS.md:

#### Test 1: Verify Files Exist and Are Valid

```bash
# Check files exist
test -f CLAUDE.md && echo "✓ CLAUDE.md exists" || echo "✗ CLAUDE.md missing"
test -f AGENTS.md && echo "✓ AGENTS.md exists" || echo "✗ AGENTS.md missing"

# Check CLAUDE.md references AGENTS.md
grep -q "@AGENTS.md" CLAUDE.md && echo "✓ CLAUDE.md references AGENTS.md" || echo "✗ CLAUDE.md doesn't reference AGENTS.md"

# Check AGENTS.md is valid markdown
head -1 AGENTS.md | grep -q "^#" && echo "✓ AGENTS.md is valid markdown" || echo "✗ AGENTS.md invalid"
```

#### Test 2: Verify Build Still Works

```bash
# Ensure no build regressions from adding CLAUDE.md / AGENTS.md
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Should all pass with same results as baseline
```

#### Test 3: Test with Claude Code

```bash
# Test that Claude Code loads your agent structure
claude-code "Show me the tech stack for this repository"
# Should return AGENTS.md tech stack section

claude-code "List the agents and their roles"
# Should return agent team structure from AGENTS.md

claude-code "What are the quality gates for this project?"
# Should return quality gates section
```

#### Test 4: Verify No Secrets in AGENTS.md

```bash
# Check for accidental secrets
grep -i -E "(password|api.?key|secret|token|credential)" AGENTS.md
# Should return 0 results (only mentions in example code blocks are OK)

# Check for file paths with credentials
grep -E "\.(env|key|pem|p12)" AGENTS.md
# Should return 0 results (only in .gitignore patterns are OK)
```

#### Test 5: Create Validation Checklist

Create `MIGRATION_VALIDATION.md`:

```markdown
# Migration Validation Checklist

## Pre-Migration Baseline
- [ ] Unit tests pass: ____%  coverage
- [ ] Build succeeds
- [ ] Linting passes
- [ ] TypeScript passes
- [ ] Baseline date: ________

## Post-Migration Verification
- [ ] CLAUDE.md exists in root
- [ ] AGENTS.md exists in root
- [ ] CLAUDE.md contains: `@AGENTS.md`
- [ ] AGENTS.md has all sections:
  - [ ] Tech Stack
  - [ ] Build & Test Commands
  - [ ] Architecture Overview
  - [ ] Safety Constraints (NEVER/ALWAYS)
  - [ ] Quality Gates
  - [ ] Agent Team Structure
  - [ ] Decision Framework
  - [ ] Orchestration Workflow
  - [ ] Success Criteria
  - [ ] Communication Protocol

## Functionality Tests
- [ ] `claude-code "Show tech stack"` returns AGENTS.md content
- [ ] `claude-code "List agents"` returns agent team structure
- [ ] `claude-code "What are quality gates?"` returns quality gates
- [ ] No secrets found in CLAUDE.md or AGENTS.md
- [ ] All build commands work: `pnpm test`, `pnpm build`, `pnpm lint`
- [ ] Tests still pass with same coverage ≥80%

## Team Readiness
- [ ] Tech lead reviewed AGENTS.md
- [ ] All agents understand their roles and "When to Invoke" triggers
- [ ] Quality gates understood and enforced in CI/CD
- [ ] Team trained on Claude Code workflow

## Sign-Off
- [ ] Tech lead approval: ________ Date: ________
- [ ] QA approval: ________ Date: ________
- [ ] Ready for production: ________ Date: ________
```

---

## Rollback Procedure

If agent setup causes issues, rollback is simple since you only added files:

### Immediate Rollback (Within Minutes)

```bash
# Option 1: Delete files (if not committed)
rm CLAUDE.md AGENTS.md

# Option 2: Uncommit if just committed
git reset --soft HEAD~1
git reset CLAUDE.md AGENTS.md

# Option 3: Revert commit
git revert --no-edit <commit-hash>
```

### If Already Merged to Main

```bash
# Create rollback commit
git checkout main
git pull origin main

# Remove agent files
rm CLAUDE.md AGENTS.md

# Commit rollback
git add -A
git commit -m "chore: Rollback Claude agent setup (temporary)"
git push origin main
```

### Lessons Learned Log

If rollback occurs, document why:

Create `ROLLBACK_ANALYSIS.md`:

```markdown
# Rollback Analysis

## What Happened
[Description of issue that triggered rollback]

## Root Cause
[What went wrong in AGENTS.md or process]

## How to Prevent
[Steps to avoid this issue on retry]

## Retry Plan
[When and how to re-attempt migration]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]
```

### Restart Migration (Improved)

After analyzing rollback:

```bash
# Make improvements to AGENTS.md
# - Fix agent boundaries
# - Simplify structure
# - Clarify quality gates
# - Better context for agents

# Re-submit for migration
git add CLAUDE.md AGENTS.md
git commit -m "chore: Re-add Claude agent setup with improvements"
git push origin <feature-branch>

# Create PR with analysis and improvements
```

---

## Customization Guide

### Adjusting for Different Team Sizes

**Solo Developer** (1 person):
```markdown
# Simplified Structure
- 1 Tech Lead (yourself) - handles all orchestration
- 2-3 Generalist Agents instead of specialists
- Minimal "When to Invoke" rules (you know when to use each role)
- Simplified quality gates (focus on critical 3-4)
```

**Small Team** (2-3 people):
```markdown
# Basic Structure
- 1 Tech Lead
- 4-6 Specialist Agents (pair people with agents)
- Clear agent boundaries
- 5-8 quality gates
- Weekly syncs instead of daily
```

**Medium Team** (4-8 people):
```markdown
# Structured
- 1 Tech Lead + 1-2 Sub-leads
- 10-15 Specialist Agents
- 2-3 teams with leads
- Comprehensive quality gates
- Daily standups
```

**Large Team** (8+):
```markdown
# Enterprise Structure
- Multiple leads (frontend, backend, devops, etc.)
- 20+ specialist agents
- 4+ sub-teams
- Complex orchestration workflows
- Formal communication protocols
```

### Adjusting for Different Tech Stacks

**Framework Change** (React → Vue):
```markdown
# Update AGENTS.md

OLD: React Component Developer
NEW: Vue Component Developer

Capabilities:
- Vue 3 composition API
- Vue templates and directives
- Pinia state management (instead of Zustand)
- Vue testing (Vitest + @vue/test-utils)
```

**Database Change** (PostgreSQL → MongoDB):
```markdown
# Update AGENTS.md

OLD: PostgreSQL Database Specialist
NEW: MongoDB Database Specialist

Capabilities:
- MongoDB schema design (collections, documents)
- Mongoose or native driver queries
- Indexing and query optimization for MongoDB
- Data migration from PostgreSQL
```

**Language Change** (TypeScript → Python):
```markdown
# Update AGENTS.md

OLD: TypeScript/Node.js environment
NEW: Python environment

Update:
- Build & Test Commands (pytest instead of Jest)
- Quality Gates (mypy for type checking)
- Safety Constraints (no `type: ignore`, proper typing)
```

### Adding Agent Specialists

When you realize you need more agents:

1. **Don't change existing agents** (clear boundaries)
2. **Create new agent** with specific role
3. **Define "When to Invoke"** that doesn't overlap
4. **Update orchestration workflow** to include new agent
5. **Document in decision framework** why new agent is needed

Example:

```markdown
# Original Teams
Team 1: Frontend (Component Dev, Designer, Test Engineer)

# Need: Performance optimization
# Solution: Add new agent

Team 1 (revised): Frontend (Component Dev, Designer, Perf Optimizer, Test Engineer)

Agent 1.4: Performance Optimizer (NEW)
**Role**: Expert in React performance, bundle optimization, and Core Web Vitals.

**When to Invoke**:
MUST BE USED when:
- Optimizing component rendering performance
- Analyzing bundle size
- Implementing code splitting
- Measuring Core Web Vitals

**Blocks merge if**:
- Lighthouse score regression >5%
- Bundle size regression >10KB

**Allowed Tools**:
- Read: src/, tests/
- Bash: pnpm build, webpack-bundle-analyzer, Lighthouse CLI
- No write access to source
```

---

## FAQ and Troubleshooting

### Q1: Should we use CLAUDE.md or AGENTS.md?

**A**: Use both:
- **CLAUDE.md**: Thin file in root that references `@AGENTS.md`
- **AGENTS.md**: Comprehensive agent definitions

Why? CLAUDE.md is stable (rarely changes), AGENTS.md is detailed (changes as team grows).

---

### Q2: How many teams/agents do we need?

**A**: Start small, add when needed:

```
Repository size < 10k LOC:     2-3 agents (no teams)
Repository size 10-50k LOC:    5-8 agents (1 team)
Repository size 50-200k LOC:   10-15 agents (2-3 teams)
Repository size > 200k LOC:    20+ agents (4+ teams)
```

Monorepos should have agent structure per app + 1 root orchestration.

---

### Q3: Can I use agent templates from enablement-templates/?

**A**: Yes! Copy and customize:

```bash
# Option 1: Copy template
cp enablement-templates/repos/teei-website-astro/AGENTS.md ./AGENTS.md
# Edit project name, team size, specific file paths

# Option 2: Use as reference
# Read teei-website-astro/AGENTS.md
# Adapt structure for your tech stack
# Copy only relevant agent definitions
```

---

### Q4: What if our tech stack isn't in examples?

**A**: Use the pattern, not the example:

1. Find closest example (e.g., "Fullstack monorepo" for your monorepo)
2. Understand the structure (teams, agents, quality gates)
3. Replace tech-specific parts:
   - Build commands → your build commands
   - Agent names → your domain (e.g., "GraphQL Resolver Dev" instead of "API Dev")
   - Quality gates → your standards (e.g., "0 N+1 queries" instead of "80% coverage")

---

### Q5: How do we know if agent setup is working?

**A**: Measurable signals:

```markdown
# Signals Agent Setup Is Working

✅ Claude Code invocations are correctly targeted
   - Users request specific agent roles
   - Right specialist is automatically invoked
   - No role confusion or overlap

✅ Quality gates are enforced
   - All PRs hit same gates (coverage %, lint, tests)
   - Merges blocked when gates fail
   - No "exceptions" to standards

✅ Team clarity increases
   - Clear ownership of code areas
   - Fewer merge conflicts
   - Faster code reviews (clear responsibility)

✅ Documentation improves
   - AGENTS.md becomes single source of truth
   - New team members onboard faster
   - Architecture decisions are documented

✅ Development velocity improves
   - Agents reduce back-and-forth
   - Clearer handoffs between roles
   - Fewer rework/refactoring cycles
```

---

### Q6: Can we modify quality gates after migration?

**A**: Yes, but carefully:

```markdown
# Modifying Quality Gates

❌ Don't: Reduce gates when PRs fail
   - Quality gates should be stable
   - If gate is too strict, relax it intentionally (not reactively)

✅ Do: Increase gates as codebase matures
   - Start with 80% test coverage
   - Move to 85-90% as team grows
   - Document reason for change

✅ Do: Add gates for new concerns
   - Adding accessibility? Add WCAG gate
   - Adding performance work? Add Lighthouse gate
   - Document why new gate is needed

Process:
1. Propose gate change in AGENTS.md
2. Get team consensus
3. Update AGENTS.md with new gate
4. Update CI/CD to enforce new gate
5. Commit: "chore: Update quality gates for [reason]"
```

---

### Q7: What if AGENTS.md becomes outdated?

**A**: Treat it like code:

```markdown
# Keeping AGENTS.md Fresh

1. **Include in code reviews**
   - When architecture changes, update AGENTS.md
   - Merge AGENTS.md changes with code changes
   - Don't separate them

2. **Version it with major changes**
   - "v1.0: Initial agent structure"
   - "v1.1: Added performance specialist"
   - "v2.0: Redesigned team structure"

3. **Review quarterly**
   - 1st week of each quarter: Review AGENTS.md
   - Remove unused agents
   - Add missing responsibilities
   - Update outdated tech stack info

4. **Treat as source of truth**
   - Real code should match AGENTS.md
   - If they diverge, prioritize AGENTS.md
   - Update both together

Commit: "docs: Update AGENTS.md after [team change]"
```

---

### Q8: How do we onboard new team members?

**A**: Use AGENTS.md as onboarding doc:

```bash
# 1. New person joins
git clone <repo>

# 2. Send onboarding guide
cat > ONBOARDING.md <<'EOF'
# Welcome to the Team!

1. Read CLAUDE.md (2 min)
   - Understand agent-driven development model

2. Read AGENTS.md (10 min)
   - Understand team structure
   - Find your agent role
   - Review quality gates

3. Read tech stack section (5 min)
   - Understand build/test commands
   - Clone and run `pnpm install && pnpm build`

4. Run first Claude Code request
   - Try: "Show me the codebase structure"
   - Understand how agents work in practice

5. Pair with onboarding buddy
   - Code review with mentor
   - Clarify your agent's responsibilities
   - Understand "When to Invoke" triggers

Done! You're ready to contribute.
EOF
```

---

### Q9: What if different parts of the repo have different agents?

**A**: Use MULTI_AGENT_PLAN.md for monorepos:

```markdown
# apps/web/AGENTS.md
- Frontend agents for React app

# apps/api/AGENTS.md
- Backend agents for Node.js API

# Root: MULTI_AGENT_PLAN.md
Coordinates across apps/web and apps/api

Or use separate repos for different domains
```

---

### Q10: How do we handle tool permissions (Bash, Write, etc.)?

**A**: Least privilege by role:

```markdown
# Tool Permission Matrix

                  | Read | Write | Bash | Notes
-----------------|------|-------|------|--------
Frontend Dev      | ✅   | ✅ UI | ❌   | UI only, no backend
Backend Dev       | ✅   | ✅ API| ✅   | Limited to tests, not prod
DevOps Specialist | ✅   | ✅    | ✅   | Full access for infra
Data Specialist   | ✅   | ✅ DB | ✅   | Migrations, queries
Test Engineer     | ✅   | ✅ T  | ✅   | Tests, fixtures only
Designer          | ✅   | ✅ UI | ❌   | UI/styles only
```

Document in AGENTS.md:

```markdown
Agent 1.1: Frontend Developer
Allowed Tools:
- Read: src/, package.json, docs/
- Write: src/components/, src/styles/, tests/
- Bash: pnpm dev, pnpm test, pnpm lint (limited scope)
- Note: No write access to src/api/ or configuration
```

---

## Next Steps

### After Migration (Week 1)

1. ✅ **Commit CLAUDE.md and AGENTS.md**
   ```bash
   git commit -m "chore: Add Claude agent setup and orchestration"
   git push
   ```

2. ✅ **Create PR for team review**
   - Include MIGRATION_VALIDATION.md results
   - Request feedback from tech lead
   - Address concerns about agent boundaries

3. ✅ **Announce to team**
   - Share AGENTS.md overview
   - Explain agent roles
   - Set expectations for Claude Code usage

4. ✅ **Set up CI/CD gates** (if not already present)
   - Add quality gate checks to GitHub Actions
   - Link to AGENTS.md success criteria

### After Migration (Week 2-4)

1. 📋 **Start using agents in real work**
   - Developers invoke specific agents in Claude Code
   - Track which agents are used most
   - Refine agent definitions based on usage

2. 📋 **Collect feedback**
   - Are agent boundaries clear?
   - Are quality gates working?
   - Do agents overlap?
   - What's missing?

3. 📋 **Iterate on AGENTS.md**
   - Refine agent definitions
   - Add/remove agents based on feedback
   - Update examples with real work

4. 📋 **Measure impact**
   - Track PR review time (should decrease)
   - Track merge conflicts (should decrease)
   - Track rework cycles (should decrease)

---

## References

- **enablement-templates/**: Repository examples (Astro, serverless, PDF, etc.)
- **CLAUDE_ENABLEMENT_BEST_PRACTICES.md**: Complete agent setup guide
- **Claude Code Documentation**: https://docs.claude.com/
- **Repository-specific examples**:
  - Frontend: `enablement-templates/repos/teei-website-astro/`
  - Serverless: `enablement-templates/repos/ypai-sheetswriter/`
  - Complex: `enablement-templates/repos/pdf-orchestrator/`

---

## Support & Feedback

- **Questions?** Ask your tech lead or team
- **Found issue?** File bug in repository
- **Suggestions?** Create discussion in repository
- **Template needed?** See enablement-templates/ or create one

---

**Version**: 1.0
**Last Updated**: 2025-11-17
**Status**: Production-ready
