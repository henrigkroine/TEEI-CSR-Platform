# Shared Agents Catalog

**Last Updated**: 2025-11-17
**Total Agents**: 41 (34 Core + 7 Template)
**Locations**:
- Core Agents: `/.claude/agents/`
- Template Agents: `/enablement-templates/agents/`

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Core Agents (34)](#core-agents)
   - [Leadership Roles](#leadership-roles)
   - [Frontend](#frontend)
   - [Backend & APIs](#backend--apis)
   - [Data & Analytics](#data--analytics)
   - [AI & NLP](#ai--nlp)
   - [DevOps & Infrastructure](#devops--infrastructure)
   - [Quality & Testing](#quality--testing)
   - [Utility Agents](#utility-agents)
3. [Template Agents (7)](#template-agents)
4. [When to Create Repo-Specific vs Shared Agents](#when-to-create-repo-specific-vs-shared-agents)
5. [Agent Selection Guide](#agent-selection-guide)
6. [Cross-Repository Usage](#cross-repository-usage)

---

## Quick Reference

### By Technology Stack

**Frontend/Web**
- `frontend-lead`, `astro-specialist`, `react-specialist`, `tailwind-specialist`, `accessibility-specialist`, `state-management-specialist`, `frontend-testing-specialist`, `seo-specialist`

**Backend/Services**
- `backend-lead`, `nodejs-api-specialist`, `auth-specialist`, `event-driven-specialist`, `integration-specialist`, `api-gateway-specialist`, `service-mesh-specialist`, `backend-testing-specialist`

**Database & Data**
- `data-lead`, `postgres-specialist`, `drizzle-orm-specialist`, `clickhouse-specialist`, `analytics-specialist`, `data-migration-specialist`, `database-migration-specialist`

**AI & Learning**
- `ai-lead`, `nlp-specialist`, `embeddings-specialist`, `prompt-engineering-specialist`, `ai-safety-specialist`

**Infrastructure & DevOps**
- `qa-devex-lead`, `ci-cd-specialist`, `docker-specialist`, `monitoring-specialist`, `performance-specialist`, `security-specialist`, `serverless-specialist`

**Advanced Specializations**
- `apollo-graphql-specialist`, `google-api-specialist`, `ecosystem-isolation-specialist`, `content-specialist`, `agent-config-generator`, `agent-team-configurator`

---

## Core Agents

### Leadership Roles

#### 1. **Frontend Lead**
**File**: `/.claude/agents/frontend-lead.md`

**Role**: Orchestrates frontend development across Astro, React, and UI/UX concerns. Manages 6 specialist agents.

**When to Use**:
- Building or modifying the Corp Cockpit dashboard (apps/corp-cockpit-astro)
- Implementing new UI features or components
- Setting up frontend architecture or build configuration
- Coordinating frontend testing strategies
- Resolving frontend-related technical decisions

**Manages**: astro-specialist, react-specialist, tailwind-specialist, accessibility-specialist, state-management-specialist, frontend-testing-specialist

**Primary Use**: TEEI-CSR-Platform, YPAI Portal (any Astro/React frontend)

---

#### 2. **Backend Lead**
**File**: `/.claude/agents/backend-lead.md`

**Role**: Orchestrates backend service development across Node.js, tRPC, event-driven architecture, and API design. Manages 7 specialist agents.

**When to Use**:
- Building or modifying any service in `services/`
- Designing tRPC APIs or REST endpoints
- Implementing event-driven communication (NATS)
- Setting up service authentication/authorization
- Building integrations with external systems
- Designing API gateway routing
- Coordinating backend testing strategies

**Manages**: nodejs-api-specialist, event-driven-specialist, auth-specialist, integration-specialist, api-gateway-specialist, service-mesh-specialist, backend-testing-specialist

**Primary Use**: All backend services (impact-in, reporting, analytics, q2q-ai, buddy-service, etc.)

---

#### 3. **Data Lead**
**File**: `/.claude/agents/data-lead.md`

**Role**: Orchestrates data architecture, schema design, migrations, and analytics. Manages 5 specialist agents.

**When to Use**:
- Designing database schemas in `packages/shared-schema`
- Creating or modifying Drizzle migrations
- Building analytics queries or reports
- Setting up ClickHouse for time-series data
- Implementing data aggregation pipelines
- Addressing data privacy or encryption requirements

**Manages**: postgres-specialist, drizzle-orm-specialist, clickhouse-specialist, data-migration-specialist, analytics-specialist

**Primary Use**: Database design, migrations, analytics pipelines

---

#### 4. **AI Lead**
**File**: `/.claude/agents/ai-lead.md`

**Role**: Orchestrates AI/ML features including Q2Q AI, embeddings, content moderation, and NLP. Manages 4 specialist agents.

**When to Use**:
- Building or modifying the Q2Q AI service (`services/q2q-ai`)
- Implementing content moderation (`services/safety-moderation`)
- Designing embedding strategies for semantic search
- Building NLP features (sentiment analysis, entity extraction)
- Implementing prompt engineering for LLMs
- Addressing AI safety or bias concerns

**Manages**: nlp-specialist, embeddings-specialist, prompt-engineering-specialist, ai-safety-specialist

**Primary Use**: Q2Q AI service, content moderation, semantic search, NLP processing

---

#### 5. **QA/DevEx Lead**
**File**: `/.claude/agents/qa-devex-lead.md`

**Role**: Orchestrates testing strategies, CI/CD pipelines, developer tooling, and infrastructure. Manages 5 specialist agents.

**When to Use**:
- Setting up CI/CD workflows (`.github/workflows`)
- Configuring Docker or docker-compose infrastructure
- Implementing monitoring, logging, or observability
- Addressing performance bottlenecks or optimization
- Setting up security scanning or vulnerability detection
- Coordinating testing strategies across the monorepo
- Improving developer experience or tooling

**Manages**: ci-cd-specialist, docker-specialist, monitoring-specialist, performance-specialist, security-specialist

**Primary Use**: CI/CD, infrastructure, monitoring, performance tuning, security

---

### Frontend

#### 6. **Astro Specialist**
**File**: `/.claude/agents/astro-specialist.md`

**Role**: Expert in Astro framework, SSR/SSG configuration, routing, and content collections.

**When to Use**:
- Setting up Astro project configuration
- Creating Astro pages with SSR/SSG
- Implementing Astro routing and layouts
- Configuring Astro integrations (@astrojs/react, @astrojs/tailwind)
- Optimizing build output and performance

**Deliverables**: Astro configuration, pages, layouts, implementation reports

**Primary Use**: Corp Cockpit (Astro 5 SSR/SSG patterns)

---

#### 7. **React Specialist**
**File**: `/.claude/agents/react-specialist.md`

**Role**: Expert in React components, hooks, patterns, and best practices.

**When to Use**:
- Building React components for the Corp Cockpit
- Implementing React hooks (useState, useEffect, custom hooks)
- Creating compound components or render props patterns
- Optimizing React performance (useMemo, useCallback, React.memo)
- Implementing forms with controlled/uncontrolled components

**Deliverables**: React components, custom hooks, implementation reports

**Primary Use**: Apps/corp-cockpit-astro components, shared component libraries

---

#### 8. **Tailwind Specialist**
**File**: `/.claude/agents/tailwind-specialist.md`

**Role**: Expert in TailwindCSS, design systems, responsive design, and utility-first styling.

**When to Use**:
- Configuring Tailwind theme and design tokens
- Implementing responsive layouts
- Creating reusable style patterns
- Building design system components with Tailwind
- Optimizing CSS bundle size

**Deliverables**: Tailwind configuration, global styles, component styling, reports

**Primary Use**: Corp Cockpit styling, design system components

---

#### 9. **Accessibility Specialist**
**File**: `/.claude/agents/accessibility-specialist.md`

**Role**: Expert in WCAG compliance, ARIA, keyboard navigation, and accessible UI patterns.

**When to Use**:
- Auditing components for accessibility
- Implementing keyboard navigation
- Adding ARIA labels and roles
- Testing with screen readers
- Ensuring WCAG 2.1 AA compliance

**Deliverables**: Accessible components, ARIA implementation, audit reports

**Primary Use**: Corp Cockpit accessibility compliance, component audits

---

#### 10. **State Management Specialist**
**File**: `/.claude/agents/state-management-specialist.md`

**Role**: Expert in Zustand, React Query, state patterns, and data fetching strategies.

**When to Use**:
- Setting up global state with Zustand
- Implementing data fetching with React Query
- Designing state structure and selectors
- Optimizing re-renders and performance
- Managing server state vs client state

**Deliverables**: Zustand stores, React Query hooks, implementation reports

**Primary Use**: Corp Cockpit state management, API integration

---

#### 11. **Frontend Testing Specialist**
**File**: `/.claude/agents/frontend-testing-specialist.md`

**Role**: Expert in Vitest, Testing Library, E2E testing with Playwright, and frontend test strategies.

**When to Use**:
- Writing unit tests for React components
- Creating integration tests for user flows
- Setting up E2E tests with Playwright
- Implementing test utilities and mocks
- Achieving coverage targets

**Deliverables**: Component tests, E2E tests, test configuration, test reports

**Primary Use**: Corp Cockpit testing, component test suites

---

#### 12. **SEO Specialist**
**File**: `/enablement-templates/agents/seo-specialist.md`

**Role**: Expert in search engine optimization across web properties. Implements meta tags, structured data, sitemaps, Core Web Vitals optimization, and multi-locale hreflang tags.

**When to Use**:
- Adding or modifying meta tags (title, description, keywords, Open Graph)
- Implementing JSON-LD structured data
- Generating or updating XML sitemaps
- Configuring robots.txt rules
- Optimizing Core Web Vitals metrics
- Setting up hreflang tags for multi-locale content

**Deliverables**: Meta tag injection, JSON-LD schemas, sitemaps, Core Web Vitals optimization, SEO audit reports

**Primary Use**: Corp Cockpit public pages, TEEI/YPAI websites

---

### Backend & APIs

#### 13. **Node.js API Specialist**
**File**: `/.claude/agents/nodejs-api-specialist.md`

**Role**: Expert in Node.js, tRPC, Express, API design, and RESTful/RPC patterns.

**When to Use**:
- Building tRPC routers and procedures
- Designing API endpoints and schemas
- Implementing Express middleware
- Structuring service entry points
- Error handling and validation

**Deliverables**: tRPC routers, API handlers, server configuration, API documentation

**Primary Use**: All backend services (impact-in, reporting, analytics, q2q-ai)

---

#### 14. **Auth Specialist**
**File**: `/.claude/agents/auth-specialist.md`

**Role**: Expert in authentication, authorization, JWT, OAuth, RBAC, and session management.

**When to Use**:
- Implementing JWT authentication
- Setting up OAuth providers
- Designing role-based access control (RBAC)
- Creating auth middleware
- Managing sessions and tokens

**Deliverables**: Auth middleware, auth logic, JWT utilities, auth documentation

**Primary Use**: All services requiring authentication, unified-profile service

---

#### 15. **Event-Driven Specialist**
**File**: `/.claude/agents/event-driven-specialist.md`

**Role**: Expert in NATS, event contracts, pub/sub patterns, and async messaging.

**When to Use**:
- Publishing events to NATS
- Subscribing to events from other services
- Designing event contracts and schemas
- Implementing event handlers
- Setting up event-driven architecture

**Deliverables**: Event schemas, event publishers, event subscribers, event documentation

**Primary Use**: Cross-service communication, event-driven pipelines

---

#### 16. **Integration Specialist**
**File**: `/.claude/agents/integration-specialist.md`

**Role**: Expert in external API integrations, webhooks, REST clients, and third-party services.

**When to Use**:
- Integrating with Kintell API
- Building connectors for upskilling platforms
- Implementing webhook handlers
- Designing API client libraries
- Handling external service errors and retries

**Deliverables**: API clients, webhook handlers, integration tests, integration documentation

**Primary Use**: Impact-In connector, Benevity/Goodera connectors, Discord bot integration

---

#### 17. **API Gateway Specialist**
**File**: `/.claude/agents/api-gateway-specialist.md`

**Role**: Expert in API gateways, routing, rate limiting, CORS, and request/response transformation.

**When to Use**:
- Building the API gateway service
- Configuring routing to backend services
- Implementing rate limiting
- Setting up CORS policies
- Request/response transformation

**Deliverables**: Gateway routes, middleware, rate limiting configuration, gateway documentation

**Primary Use**: API Gateway service (central routing)

---

#### 18. **Service Mesh Specialist**
**File**: `/.claude/agents/service-mesh-specialist.md`

**Role**: Expert in service discovery, health checks, circuit breakers, and resilience patterns.

**When to Use**:
- Implementing service-to-service communication
- Setting up health check endpoints
- Designing circuit breaker patterns
- Implementing retry logic with backoff
- Service discovery configuration

**Deliverables**: Health check endpoints, circuit breaker implementation, retry logic, resilience documentation

**Primary Use**: Service resilience patterns, health check configuration

---

#### 19. **Backend Testing Specialist**
**File**: `/.claude/agents/backend-testing-specialist.md`

**Role**: Expert in Vitest, integration testing, API testing, mocking, and backend test strategies.

**When to Use**:
- Writing unit tests for services
- Creating integration tests for APIs
- Mocking databases and external services
- Testing event publishers/subscribers
- Achieving coverage targets

**Deliverables**: Unit tests, integration tests, test fixtures, test coverage reports

**Primary Use**: All backend services, API testing

---

#### 20. **Apollo GraphQL Specialist**
**File**: `/enablement-templates/agents/apollo-graphql-specialist.md`

**Role**: Expert in Apollo GraphQL ecosystem covering Apollo Server setup, GraphQL schema design, resolvers, data source integration, query optimization, subscriptions, and Apollo Client integration.

**When to Use**:
- Setting up or configuring Apollo Server instances
- Designing GraphQL schemas, types, and resolvers
- Implementing data sources and database integrations
- Optimizing GraphQL queries and resolving N+1 query problems
- Implementing GraphQL subscriptions (real-time updates)
- Integrating Apollo Client in frontend applications
- Setting up federation or schema stitching

**Deliverables**: GraphQL schema, resolvers, data sources, Apollo Client setup, GraphQL tests

**Primary Use**: GraphQL API services (if adopted), reporting service GraphQL layer

---

### Data & Analytics

#### 21. **Postgres Specialist**
**File**: `/.claude/agents/postgres-specialist.md`

**Role**: Expert in PostgreSQL, indexing, performance tuning, extensions, and query optimization.

**When to Use**:
- Designing database indexes
- Optimizing slow queries
- Configuring PostgreSQL extensions (pgcrypto, pg_trgm, pgvector)
- Implementing full-text search
- Performance tuning and EXPLAIN analysis

**Deliverables**: Index definitions, query optimizations, performance reports

**Primary Use**: Database optimization, query performance tuning

---

#### 22. **Drizzle ORM Specialist**
**File**: `/.claude/agents/drizzle-orm-specialist.md`

**Role**: Expert in Drizzle ORM, schema definitions, migrations, and type-safe queries.

**When to Use**:
- Defining database schemas with Drizzle
- Creating migrations
- Writing type-safe queries
- Implementing relations and joins
- Setting up Drizzle configuration

**Deliverables**: Schema definitions, migrations, query builders, Drizzle configuration

**Primary Use**: All database schema work (packages/shared-schema)

---

#### 23. **ClickHouse Specialist**
**File**: `/.claude/agents/clickhouse-specialist.md`

**Role**: Expert in ClickHouse, OLAP queries, time-series data, and analytics workloads.

**When to Use**:
- Designing ClickHouse tables for analytics
- Building aggregation queries
- Implementing materialized views
- Optimizing time-series queries
- Setting up data replication

**Deliverables**: ClickHouse table schemas, aggregation queries, materialized views, analytics documentation

**Primary Use**: Analytics queries, time-series data, reporting aggregations

---

#### 24. **Analytics Specialist**
**File**: `/.claude/agents/analytics-specialist.md`

**Role**: Expert in data aggregations, reporting queries, dashboards, and business intelligence.

**When to Use**:
- Building reporting queries
- Designing aggregation pipelines
- Creating dashboard data APIs
- Implementing KPI calculations
- Optimizing report performance

**Deliverables**: Aggregation queries, report APIs, KPI calculation logic, report documentation

**Primary Use**: Reporting service, dashboard APIs, KPI calculations

---

#### 25. **Data Migration Specialist**
**File**: `/.claude/agents/data-migration-specialist.md`

**Role**: Expert in database migrations, data transformations, backfills, and migration safety.

**When to Use**:
- Creating database migrations
- Planning schema changes
- Implementing data backfills
- Rolling back migrations
- Migrating data between systems

**Deliverables**: Migration SQL files, backfill scripts, rollback procedures, migration plans

**Primary Use**: Schema changes, data transformations, data backfills

---

#### 26. **Database Migration Specialist**
**File**: `/enablement-templates/agents/database-migration-specialist.md`

**Role**: Expert in database schema evolution, migration automation, and zero-downtime deployments. Specializes in Drizzle ORM and Prisma migrations with comprehensive versioning, testing, and rollback strategies.

**When to Use**:
- Creating new database migrations
- Implementing data migrations with transformation logic
- Designing zero-downtime migration strategies
- Setting up migration versioning and rollback procedures
- Optimizing migration performance for large tables
- Setting up migration CI/CD pipelines

**Deliverables**: Migration files, migration testing, rollback strategies, CI/CD workflows, migration runbooks

**Primary Use**: Schema evolution, zero-downtime deployments, migration automation

---

### AI & NLP

#### 27. **NLP Specialist**
**File**: `/.claude/agents/nlp-specialist.md`

**Role**: Expert in natural language processing, text analysis, sentiment analysis, and entity extraction.

**When to Use**:
- Extracting entities from text
- Performing sentiment analysis
- Implementing text classification
- Building keyword extraction
- Text preprocessing and tokenization

**Deliverables**: NLP processing functions, entity extraction logic, sentiment analysis APIs, NLP documentation

**Primary Use**: Q2Q AI, feedback analysis, text classification

---

#### 28. **Embeddings Specialist**
**File**: `/.claude/agents/embeddings-specialist.md`

**Role**: Expert in vector embeddings, semantic search, RAG, and vector databases.

**When to Use**:
- Generating text embeddings
- Implementing semantic search
- Building RAG (Retrieval-Augmented Generation) systems
- Setting up vector similarity search
- Optimizing embedding storage

**Deliverables**: Embedding generation functions, vector search queries, RAG implementation, embeddings documentation

**Primary Use**: Semantic search, buddy matching, RAG pipelines, Q2Q AI

---

#### 29. **Prompt Engineering Specialist**
**File**: `/.claude/agents/prompt-engineering-specialist.md`

**Role**: Expert in LLM prompts, chain-of-thought, few-shot learning, and prompt optimization.

**When to Use**:
- Designing system prompts for LLMs
- Implementing few-shot examples
- Building chain-of-thought reasoning
- Optimizing prompt performance
- Version controlling prompts

**Deliverables**: Prompt templates, few-shot examples, prompt evaluation results, prompt documentation

**Primary Use**: Q2Q AI, content moderation, prompt optimization

---

#### 30. **AI Safety Specialist**
**File**: `/.claude/agents/ai-safety-specialist.md`

**Role**: Expert in content moderation, bias detection, safety guidelines, and responsible AI.

**When to Use**:
- Implementing content moderation
- Detecting hate speech or inappropriate content
- Testing for AI bias
- Building safety filters
- Defining moderation policies

**Deliverables**: Moderation logic, safety filter rules, bias test reports, safety documentation

**Primary Use**: Content moderation service, AI safety validation

---

### DevOps & Infrastructure

#### 31. **CI/CD Specialist**
**File**: `/.claude/agents/ci-cd-specialist.md`

**Role**: Expert in GitHub Actions, build pipelines, deployment automation, and CI/CD best practices.

**When to Use**:
- Creating GitHub Actions workflows
- Setting up CI pipelines
- Configuring automated deployments
- Implementing quality gates
- Optimizing build performance

**Deliverables**: CI/CD workflows, build optimization configs, deployment scripts, CI/CD documentation

**Primary Use**: GitHub Actions workflows, deployment automation

---

#### 32. **Docker Specialist**
**File**: `/.claude/agents/docker-specialist.md`

**Role**: Expert in Docker, docker-compose, containerization, and container optimization.

**When to Use**:
- Creating Dockerfiles for services
- Setting up docker-compose for local dev
- Optimizing container builds
- Implementing multi-stage builds
- Configuring container networking

**Deliverables**: Dockerfiles, docker-compose configuration, container optimization, Docker documentation

**Primary Use**: Service containerization, local development infrastructure

---

#### 33. **Monitoring Specialist**
**File**: `/.claude/agents/monitoring-specialist.md`

**Role**: Expert in logging, metrics, observability, alerting, and monitoring infrastructure.

**When to Use**:
- Setting up structured logging
- Implementing metrics collection
- Configuring observability tools
- Creating alerts and dashboards
- Debugging production issues

**Deliverables**: Logging configuration, metrics collection code, dashboard definitions, monitoring documentation

**Primary Use**: Observability infrastructure, production monitoring

---

#### 34. **Performance Specialist**
**File**: `/.claude/agents/performance-specialist.md`

**Role**: Expert in profiling, optimization, load testing, and performance tuning.

**When to Use**:
- Identifying performance bottlenecks
- Optimizing slow queries or APIs
- Implementing caching strategies
- Load testing services
- Analyzing bundle sizes

**Deliverables**: Performance optimizations, caching implementation, load test scripts, performance reports

**Primary Use**: Performance optimization, load testing, cache optimization

---

#### 35. **Security Specialist**
**File**: `/.claude/agents/security-specialist.md`

**Role**: Expert in vulnerability scanning, secret detection, SAST/DAST, and security best practices.

**When to Use**:
- Setting up security scanning
- Implementing secret detection
- Addressing security vulnerabilities
- Configuring dependency scanning
- Performing security audits

**Deliverables**: Security scanning configs, .github/dependabot.yml, SECURITY.md policy, security audit reports

**Primary Use**: Security scanning, vulnerability management, SAST/DAST

---

#### 36. **Serverless Specialist**
**File**: `/enablement-templates/agents/serverless-specialist.md`

**Role**: Expert in serverless architecture, cloud functions, and deployment automation. Specializes in AWS Lambda, Google Cloud Functions, and Cloud Run deployments with optimized cold starts, environment management, and CI/CD integration.

**When to Use**:
- Setting up serverless functions (AWS Lambda, Google Cloud Functions, Cloud Run)
- Configuring Serverless Framework deployments
- Optimizing cold start performance
- Creating API Gateway or Cloud Run endpoints
- Managing environment variables and secrets
- Implementing deployment automation

**Deliverables**: serverless.yml configuration, function handlers, Lambda layers, deployment workflows, serverless documentation

**Primary Use**: Serverless services (if adopted), cloud function deployment

---

### Quality & Testing

#### 37. **Agent Config Generator**
**File**: `/.claude/agents/agent-config-generator.md`

**Role**: Generates standardized agent definition files based on role specifications.

**When to Use**:
- Creating new specialist agent definitions
- Updating agent capabilities
- Standardizing agent documentation
- Expanding the agent team

**Deliverables**: Agent definition markdown files with standardized format

**Primary Use**: New agent onboarding, agent template generation

---

#### 38. **Agent Team Configurator**
**File**: `/.claude/agents/agent-team-configurator.md`

**Role**: Analyzes stack requirements and selects the appropriate specialist agents needed for a given task.

**When to Use**:
- Starting a new feature that spans multiple technologies
- Planning a multi-service implementation
- Determining which specialists to delegate to
- Orchestrating complex cross-cutting changes

**Deliverables**: Team configuration plans, delegation roadmaps

**Primary Use**: Feature planning, multi-agent coordination

---

### Utility Agents

These agents provide specialized support across multiple domains and are typically invoked by lead agents.

### Template Agents

#### 39. **Google APIs Specialist**
**File**: `/enablement-templates/agents/google-api-specialist.md`

**Role**: Expert in Google Sheets API, Google Drive API, OAuth 2.0 authentication, service account management, and quota optimization. Implements secure, scalable Google Workspace integrations.

**When to Use**:
- Setting up Google Sheets API for data import/export
- Implementing Google Drive API for file storage
- Configuring OAuth 2.0 authentication flows
- Setting up service accounts for automated access
- Implementing batch operations for bulk data processing
- Designing rate limiting and quota management strategies

**Deliverables**: Google API clients, OAuth authentication, quota managers, integration tests, API documentation

**Primary Use**: Google Workspace integrations, data import/export from sheets

---

#### 40. **Ecosystem Isolation Specialist**
**File**: `/enablement-templates/agents/ecosystem-isolation-specialist.md`

**Role**: Expert in enforcing organizational boundary isolation and preventing cross-ecosystem data access. Specializes in org ID validation, query scoping enforcement, and audit logging.

**When to Use**:
- Adding or modifying any database query that filters by org_id
- Implementing new API endpoints that accept org_id parameters
- Creating cross-service communication patterns
- Modifying authentication/authorization middleware
- Adding tenant isolation logic
- Integrating third-party services
- Creating reports or data delivery mechanisms

**Deliverables**: Org isolation validation code, audit logs, isolation test suites, isolation runbooks

**Primary Use**: Multi-tenant isolation, org boundary enforcement, YPAI/TEEI ecosystem separation

---

#### 41. **Content Specialist**
**File**: `/enablement-templates/agents/content-specialist.md`

**Role**: Expert in content management systems, Astro Content Collections, Markdown/MDX processing, and multi-locale content strategy. Handles structured content authoring, CMS integration, content validation, image optimization, and internationalization workflows.

**When to Use**:
- Creating or modifying Astro Content Collections
- Processing Markdown or MDX files
- Integrating CMS systems
- Implementing content validation workflows
- Optimizing images for content
- Setting up multi-locale content management
- Creating content-heavy pages
- Implementing content authoring workflows

**Deliverables**: Content collection schemas, Markdown/MDX files, content utilities, image optimization functions, content validation scripts, content audit reports

**Primary Use**: Corp Cockpit content, blog/documentation pages, CMS integration

---

## When to Create Repo-Specific vs Shared Agents

### Use Shared Agents When:

1. **Multiple repositories need the same expertise**
   - Example: `frontend-lead` is used across TEEI-CSR-Platform, YPAI Portal, and any other Astro/React frontends

2. **Best practices are consistent across projects**
   - Example: `security-specialist` uses the same vulnerability scanning approach everywhere

3. **Technology stack is standardized**
   - Example: All services use Node.js + tRPC, so `nodejs-api-specialist` is shared

4. **Training/onboarding benefits from consistency**
   - New developers learn one way to structure React components, migrations, etc.

### Create Repo-Specific Agents When:

1. **Unique domain expertise required**
   - Example: A project with specialized machine learning pipelines might need a custom ML-Ops agent

2. **Proprietary tools or frameworks**
   - Example: If adopting a custom internal framework, create specialized agents for it

3. **Organization-specific patterns**
   - Example: Custom authentication flow unique to your org

4. **High complexity in single domain**
   - Break out hyper-specialized agents when lead agents need more delegation help

**Recommendation**: Start with shared agents. Create repo-specific agents only when you've identified a repeated need that doesn't fit existing specialists.

---

## Agent Selection Guide

### By Use Case

#### "I'm building a new feature"

1. Identify the technology stack involved (Frontend? Backend? Data?)
2. Use `agent-team-configurator` to determine which agents you need
3. Invoke the appropriate **Lead Agent** first:
   - `frontend-lead` for UI work
   - `backend-lead` for API/service work
   - `data-lead` for database/schema work
   - `ai-lead` for AI/NLP features
   - `qa-devex-lead` for infrastructure/testing

4. The Lead Agent will delegate to specialists

#### "I need to optimize performance"

1. Start with `performance-specialist` for profiling
2. Combine with domain experts:
   - `postgres-specialist` for query optimization
   - `react-specialist` for component optimization
   - `docker-specialist` for containerization overhead
   - `clickhouse-specialist` for analytics query optimization

#### "I'm setting up a new service"

1. `backend-lead` for overall service design
2. `nodejs-api-specialist` for API structure
3. `auth-specialist` for authentication
4. `event-driven-specialist` for event contracts
5. `backend-testing-specialist` for test setup
6. `ci-cd-specialist` for deployment automation

#### "I'm deploying to production"

1. `qa-devex-lead` for overall deployment strategy
2. `ci-cd-specialist` for GitHub Actions workflows
3. `docker-specialist` for container setup
4. `database-migration-specialist` for schema changes
5. `monitoring-specialist` for observability setup
6. `security-specialist` for vulnerability scanning

#### "I need to add AI capabilities"

1. `ai-lead` for overall AI strategy
2. `nlp-specialist` for text processing
3. `embeddings-specialist` for semantic search
4. `prompt-engineering-specialist` for LLM prompts
5. `ai-safety-specialist` for content moderation

---

## Cross-Repository Usage

### TEEI-CSR-Platform
All 41 agents are available and should be used.

### YPAI Portal (if separate)
**Recommended Shared Agents**:
- `frontend-lead`, `astro-specialist`, `react-specialist`, `tailwind-specialist`
- `accessibility-specialist`, `state-management-specialist`, `frontend-testing-specialist`
- `seo-specialist`
- `security-specialist`, `monitoring-specialist`, `performance-specialist`

### New Projects/Repos
Reference this catalog to select which agents apply to your tech stack.

**Example: Standalone Data Warehouse**
- `data-lead`, `postgres-specialist`, `drizzle-orm-specialist`
- `clickhouse-specialist`, `analytics-specialist`
- `ci-cd-specialist`, `docker-specialist`, `monitoring-specialist`

**Example: Mobile App (if built)**
- Create repo-specific agents or extend existing ones
- Reuse: `auth-specialist`, `integration-specialist`, `security-specialist`

---

## Agent Tooling & Constraints

### Tools Each Agent Can Use

**All Agents**:
- `Read` (file reading)
- `Glob` (pattern matching)
- `Grep` (content search)

**Code-Focused Agents** (add):
- `Write` (file modification)
- `Edit` (in-place editing)

**Infrastructure Agents** (add):
- `Bash` (command execution)
- For CI/CD, Docker, database agents only

**Specialized Agents** (add):
- `WebFetch` (seo-specialist for research, google-api-specialist for API calls)

### Safety Constraints

**All agents MUST respect**:
- No hardcoded secrets (use environment variables/Vault)
- No direct production access (use CI/CD pipelines)
- No destructive operations without approval
- Follow existing code patterns and conventions

**Lead agents additionally**:
- Must coordinate with other leads before cross-cutting changes
- Must validate quality gates are met before approving merges
- Must track delegation and progress in MULTI_AGENT_PLAN.md

---

## Quick Start: Adding a New Agent

1. **Create the agent file**: `/.claude/agents/new-agent-name.md`
2. **Use the template**:
   ```markdown
   # Agent Name

   ## Role
   Brief description of purpose

   ## When to Invoke
   MUST BE USED when:
   - Condition 1
   - Condition 2

   ## Capabilities
   - Capability 1
   - Capability 2

   ## Context Required
   - Required context

   ## Deliverables
   - Output files and format

   ## Examples
   **Input**: "Example task"
   **Output**: Example result
   ```

3. **Register in AGENTS.md** if it's a new specialist (add to appropriate team)
4. **Update this catalog** with the new agent entry

---

## Glossary

- **Lead Agent**: Orchestrates multiple specialists; uses delegation to manage complexity
- **Specialist Agent**: Expert in one technology or domain; can be managed by a lead
- **Context**: Required files, information, or standards the agent needs
- **Deliverables**: Files created/modified and documentation produced
- **When to Invoke**: Specific triggers that require the agent's expertise

---

## Support & Questions

- **For new agents**: Reference the `agent-config-generator` and `agent-team-configurator`
- **For team composition**: Use `agent-team-configurator` with your use case
- **For agent updates**: Edit the `.md` file directly and update this catalog
- **For best practices**: Review examples in each agent's documentation

---

**Last Updated**: 2025-11-17
**Maintained By**: Tech Lead Orchestrators
**Review Frequency**: Quarterly
