# Multi-Agent Orchestration Structure

## [PROJECT_NAME]: Serverless Service

**Tech Stack**: [AWS Lambda / Google Cloud Functions / Azure Functions], TypeScript/Node.js, [DynamoDB / Firestore / CosmosDB]
**Purpose**: [CUSTOMIZE: Describe the serverless workload, triggers, and business purpose]
**Framework**: [Serverless Framework / AWS SAM / Terraform / CloudFormation]

---

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Development: Start serverless-offline emulation
pnpm dev

# Type checking
pnpm typecheck

# Linting and formatting
pnpm lint
pnpm format

# Build for production
pnpm build

# Run tests
pnpm test                   # All tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report

# Deploy to cloud
pnpm deploy:dev            # Deploy to development
pnpm deploy:staging        # Deploy to staging
pnpm deploy:prod           # Deploy to production

# Local function invocation
pnpm invoke:local [function-name]

# View logs
pnpm logs:[env]            # View function logs
```

---

## Architecture Overview

### Repository Structure

```
[project]/
├── src/
│   ├── functions/                    # [CUSTOMIZE: Lambda/Cloud Function handlers]
│   │   ├── [function-name].ts       # Individual function entry points
│   │   └── ...
│   ├── services/                     # Business logic (called by functions)
│   │   ├── [domain].service.ts      # Domain-specific service
│   │   └── ...
│   ├── types/                        # TypeScript interfaces and types
│   ├── utils/                        # Utilities
│   │   ├── logger.ts                # Structured logging
│   │   ├── errors.ts                # Error handling
│   │   ├── validation.ts            # Input validation
│   │   └── secrets.ts               # Secrets management
│   └── middleware/                   # Shared middleware
│       ├── auth.ts                  # Authentication
│       └── error-handler.ts         # Error handling
├── tests/
│   ├── unit/                         # Unit tests for services
│   ├── integration/                  # Integration tests with cloud services
│   └── fixtures/                     # Mock data and fixtures
├── infrastructure/                   # [CUSTOMIZE: IaC (SAM/Terraform)]
│   ├── template.yaml                # [CUSTOMIZE: CloudFormation/SAM template]
│   └── variables.tf                 # [CUSTOMIZE: Terraform variables]
├── serverless.yml                    # [CUSTOMIZE: Serverless Framework config]
├── serverless.dev.yml               # Development environment config
├── serverless.prod.yml              # Production environment config
├── .env.example                      # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

- **Functions**: Lambda/Cloud Function entry points with specific triggers
- **Services**: Business logic called by functions (reusable, testable)
- **Types**: TypeScript interfaces for events, responses, and domain objects
- **Middleware**: Shared utilities (error handling, logging, auth)
- **Infrastructure**: IaC for cloud resources (functions, triggers, databases)

---

## Agent Team Structure

### Team 1: Serverless Development (2 agents)
**Lead**: serverless-lead
- **Agent 1.1**: serverless-specialist (Function configuration, deployment, infrastructure)
- **Agent 1.2**: service-developer (Business logic, services, error handling)

### Team 2: Quality & Testing (2 agents)
**Lead**: quality-lead
- **Agent 2.1**: testing-specialist (Unit, integration tests, mocking cloud services)
- **Agent 2.2**: security-dev (Authentication, validation, secrets management)

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit secrets, API keys, or credentials
- ❌ NEVER skip tests before deploying
- ❌ NEVER modify infrastructure without understanding the changes
- ❌ NEVER deploy directly to production without staging validation
- ❌ NEVER use `any` types in TypeScript (strict mode)
- ❌ NEVER hardcode environment-specific values
- ❌ NEVER store state in function code (use database/cache)
- ❌ NEVER ignore function cold start implications
- ❌ NEVER skip input validation on function events

### ALWAYS (Required)
- ✅ ALWAYS test functions locally with serverless-offline before deploying
- ✅ ALWAYS validate TypeScript (no errors or warnings)
- ✅ ALWAYS implement error handling with proper status codes
- ✅ ALWAYS log structured data with request IDs
- ✅ ALWAYS use environment variables for configuration
- ✅ ALWAYS validate input events with schemas (Zod/Joi)
- ✅ ALWAYS test error scenarios (timeout, permission denied, invalid input)
- ✅ ALWAYS implement retry logic for transient failures
- ✅ ALWAYS monitor function execution time and costs
- ✅ ALWAYS use secrets manager for sensitive data

---

## Quality Gates

- ✅ **Build**: Production build succeeds (`pnpm build`)
- ✅ **TypeScript**: Strict mode, no errors or warnings
- ✅ **Linting**: ESLint passes with 0 warnings
- ✅ **Tests**: Unit coverage ≥80%, integration tests passing
- ✅ **Local Testing**: `pnpm dev` works, functions invokable locally
- ✅ **Deployment**: Staging deployment succeeds and functions work
- ✅ **Error Handling**: Proper error responses with status codes
- ✅ **Security**: No hardcoded secrets, auth enforced
- ✅ **Performance**: Function execution time within SLA
- ✅ **Costs**: No unexpected cost increases (monitor concurrency, data transfer)

---

## Agent Definitions

### Agent 1.1: Serverless Specialist

**When to Invoke**: MUST BE USED when:
- Creating or modifying serverless.yml configuration
- Defining new functions or triggers
- Configuring API Gateway, scheduled jobs, or event sources
- Deploying to staging or production
- Optimizing function configuration (memory, timeout)
- Troubleshooting deployment failures

**Capabilities**:
- [CUSTOMIZE: Serverless Framework / AWS SAM] configuration
- [CUSTOMIZE: AWS Lambda / Google Cloud Functions] lifecycle management
- serverless-offline local development setup
- Environment variable and secrets injection
- [CUSTOMIZE: IAM] role and permission configuration
- Function performance tuning
- Monitoring and logging setup

**Deliverables**:
- `serverless.yml` and environment-specific configs
- Function entry points in `src/functions/`
- Infrastructure configuration
- Deployment documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if functions lack error handling
- ❌ Blocks merge if environment variables undefined
- ❌ Blocks merge if local testing not verified

---

### Agent 1.2: Service Developer

**When to Invoke**: MUST BE USED when:
- Implementing business logic in `src/services/`
- Creating data transformation logic
- Implementing integration with external APIs
- Handling database operations
- Implementing retry and recovery logic

**Capabilities**:
- Service implementation and design
- Business logic and domain operations
- Error handling and recovery strategies
- Data transformation and validation
- External API integration
- Database query implementation

**Deliverables**:
- Services in `src/services/`
- Type definitions in `src/types/`
- Utility functions in `src/utils/`
- Implementation documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if services lack error handling
- ❌ Blocks merge if validation missing

---

### Agent 2.1: Testing Specialist

**When to Invoke**: MUST BE USED when:
- Writing unit tests for services
- Writing integration tests with cloud services
- Testing error scenarios
- Measuring coverage
- Mocking cloud services

**Capabilities**:
- [CUSTOMIZE: Jest / Vitest] test framework
- Mocking [CUSTOMIZE: AWS / Google Cloud] services
- Mock cloud service responses
- Coverage analysis

**Deliverables**:
- Tests in `tests/`
- Mock fixtures in `tests/fixtures/`
- Coverage reports

**Blocked By**:
- ❌ Blocks merge if coverage <80%
- ❌ Blocks merge if error scenarios not tested

---

### Agent 2.2: Security Developer

**When to Invoke**: MUST BE USED when:
- Implementing authentication/authorization
- Creating input validation schemas
- Setting up secrets management
- Handling sensitive data securely
- Implementing rate limiting

**Capabilities**:
- Input validation (Zod, Joi)
- Authentication and authorization
- Secrets management integration
- Error handling without exposing internals
- Structured logging
- Rate limiting

**Deliverables**:
- Validation schemas
- Security utilities
- Middleware implementations
- Security documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if validation missing
- ❌ Blocks merge if secrets in code

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **serverless-lead**: Set up serverless configuration, local development, deployment pipeline
2. **security-dev**: Implement authentication, validation, secrets management
3. **testing-specialist**: Configure testing framework, mocks

### Phase 2: Function Development (Week 2-3)
1. **serverless-specialist**: Create function definitions and triggers
2. **service-developer**: Implement business logic and services
3. **testing-specialist**: Write unit and integration tests

### Phase 3: Testing & Deployment (Week 4)
1. **testing-specialist**: Measure coverage, test error scenarios
2. **serverless-specialist**: Deploy to staging and production
3. All Leads: Final review, monitoring setup, PR preparation

---

## Success Criteria

✅ Local development works with `pnpm dev` (serverless-offline)
✅ Production build succeeds (`pnpm build`)
✅ All functions deployable with `pnpm deploy:dev`
✅ All functions invokable locally with `pnpm invoke:local`
✅ All tests pass with ≥80% coverage
✅ TypeScript strict mode passes
✅ ESLint and Prettier pass
✅ Input validation enforced on all functions
✅ Error handling with proper status codes
✅ No hardcoded secrets in repository
✅ Secrets loaded from secrets manager
✅ Logging captures request IDs and useful context
✅ All error scenarios tested
✅ Deployment to staging succeeds
✅ Monitoring and alerts configured
✅ Cost and performance tracking enabled
✅ PR includes deployment and invocation examples

---

## Communication Protocol

- **Daily**: 5-min standup on blockers
- **Code Review**: All PRs reviewed before merge
- **Documentation**: Update `/reports/` after each milestone
- **Deployment**: Always deploy to staging first, validate, then production

---

## Customization Checklist

- [ ] Replace [PROJECT_NAME] with actual project name
- [ ] Replace [CUSTOMIZE: ...] sections with project details
- [ ] Update cloud provider (AWS / Google Cloud / Azure)
- [ ] Update runtime (Node.js, Python, etc.)
- [ ] Update database (DynamoDB / Firestore / CosmosDB)
- [ ] Update IaC approach (Serverless Framework / SAM / Terraform)
- [ ] Add function-specific triggers and events
- [ ] Define domain-specific services
- [ ] Create team structure for your project size
- [ ] Add function-specific safety constraints
- [ ] Update Build & Test Commands for your setup
- [ ] Define cost and performance budgets
- [ ] Plan monitoring and alerting strategy
