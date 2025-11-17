# Multi-Agent Orchestration Structure

## YPAI.SheetsWriter

**Tech Stack**: Serverless (AWS Lambda / Google Cloud Functions), Google Sheets API, TypeScript/Node.js
**Purpose**: Serverless data pipeline that writes video analytics and impact metrics to Google Sheets in real-time. Handles multi-tenant workspaces, transformation pipelines, and quote/rate limiting.

---

## Build & Test Commands

```bash
# Install dependencies
npm install
# or
pnpm install

# Development
npm run dev              # Start local serverless emulation (serverless-offline)
npm run test            # Run unit tests (Jest or Vitest)
npm run test:watch     # Watch mode for tests
npm run test:coverage  # Generate coverage reports

# Build
npm run build          # Build Lambda/Cloud Functions artifacts
npm run build:prod    # Production-optimized build

# Deployment
npm run deploy        # Deploy to staging
npm run deploy:prod   # Deploy to production
npm run deploy:dev    # Deploy to development

# Code Quality
npm run typecheck     # TypeScript validation
npm run lint          # ESLint + formatting checks
npm run lint:fix      # Auto-fix linting issues

# Local Testing
npm run invoke:local  # Test Lambda function locally
npm run logs         # Stream live function logs
```

---

## Architecture Overview

### Repository Structure

```
ypai-sheetswriter/
├── src/
│   ├── functions/           # Lambda/Cloud Function entry points
│   │   ├── write-metrics.ts # Main metrics write function
│   │   ├── sync-data.ts     # Data synchronization function
│   │   ├── webhooks.ts      # Webhook handlers
│   │   └── scheduled-jobs.ts # Cron/scheduled functions
│   ├── services/            # Business logic
│   │   ├── sheets-writer.ts # Google Sheets API wrapper
│   │   ├── transformer.ts   # Data transformation pipeline
│   │   ├── rate-limiter.ts  # API quota management
│   │   └── metrics-calculator.ts # Metric computation
│   ├── types/              # TypeScript interfaces
│   │   ├── metrics.ts       # Metric type definitions
│   │   ├── workspace.ts     # Workspace/tenant types
│   │   └── provider.ts      # Provider configuration types
│   ├── utils/              # Utilities
│   │   ├── auth.ts         # OAuth2 / API key handling
│   │   ├── validation.ts   # Input validation
│   │   ├── logger.ts       # Structured logging
│   │   └── errors.ts       # Error handling
│   └── middleware/         # Function middleware
│       ├── auth-middleware.ts    # Authentication/authorization
│       ├── validation-middleware.ts  # Request validation
│       └── error-middleware.ts    # Error handling
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests (API mocking)
│   └── fixtures/           # Test data and mocks
├── serverless.yml          # Serverless framework config
├── serverless.dev.yml      # Development-specific config
├── serverless.prod.yml     # Production-specific config
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

- **Write Metrics Function**: Receives video analytics data and writes to configured Google Sheets
- **Sheets Writer Service**: Google Sheets API wrapper with batching, quota management, and retry logic
- **Transformer**: Converts raw event data to metric format (SROI, volunteer hours, impact metrics)
- **Rate Limiter**: Enforces API quota per workspace, prevents hitting Google Sheets rate limits
- **Auth Service**: Manages OAuth2 tokens, refresh tokens, workspace credentials
- **Webhook Handlers**: Receives events from video platforms (HubSpot, custom webhooks)
- **Scheduled Jobs**: Periodic syncs, data reconciliation, quote cleanup
- **Logger**: Structured logging with request IDs for distributed tracing

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit Google OAuth tokens, API keys, or service account credentials
- ❌ NEVER hardcode workspace IDs or tenant secrets in source code
- ❌ NEVER modify `.env` files or secrets in version control
- ❌ NEVER push directly to main/master branch without PR review
- ❌ NEVER skip tests before deploying to production
- ❌ NEVER bypass rate limiting or quota enforcement
- ❌ NEVER write directly to user Google Sheets without validating ownership
- ❌ NEVER commit PII (email addresses, phone numbers) in test data
- ❌ NEVER access workspace data from other tenants (multi-tenant isolation)

### ALWAYS (Required)
- ✅ ALWAYS use environment variables for credentials (loaded from Vault/Secrets Manager)
- ✅ ALWAYS validate Google Sheets API quota before writing
- ✅ ALWAYS implement retry logic with exponential backoff for transient failures
- ✅ ALWAYS log audit events (who accessed which workspace, when, what changed)
- ✅ ALWAYS test functions locally with serverless-offline before deploying
- ✅ ALWAYS run full test suite with coverage >80% before merging
- ✅ ALWAYS validate TypeScript compilation (no errors or warnings)
- ✅ ALWAYS add request IDs to logs for traceability
- ✅ ALWAYS handle workspace isolation in integration tests

### Repo-Specific Constraints
- ❌ NEVER access TEEI workspace data from YPAI-scoped functions (org isolation)
- ❌ NEVER access YPAI workspace data from TEEI-scoped functions
- ✅ ALWAYS validate `workspace_id` matches authenticated user's workspace
- ✅ ALWAYS test quota enforcement with mock Google Sheets API responses
- ✅ ALWAYS ensure OAuth tokens are encrypted at rest

---

## Quality Gates

### Testing Requirements
- ✅ Unit test coverage ≥80% (Jest/Vitest with --coverage)
- ✅ Integration test coverage ≥60% (mocked Google Sheets API)
- ✅ All critical paths tested (auth, write, rate limit, error handling)
- ✅ No skipped tests in CI (no `.skip` or `.only`)

### Code Quality
- ✅ TypeScript strict mode: no `any` types, no implicit `unknown`
- ✅ ESLint pass with no warnings
- ✅ Prettier formatting enforced in CI
- ✅ No console.log in production code (use logger.ts)

### Build & Deployment
- ✅ Production build succeeds (`npm run build:prod`)
- ✅ Function deployment succeeds (`npm run deploy`)
- ✅ Deployed functions tested with smoke tests
- ✅ Logs are parseable JSON (structured logging)
- ✅ Error rates <1% in production (monitored via CloudWatch/Stackdriver)

### Security
- ✅ No secrets in `.env`, `package.json`, or Git history
- ✅ API key rotation tested in tests
- ✅ OAuth token refresh logic covered in tests
- ✅ Input validation prevents injection attacks
- ✅ CORS policy restricts webhook origins

### Data Quality
- ✅ Metrics transformed correctly (golden tests: sample input → expected output)
- ✅ Rate limiting prevents quota exhaustion
- ✅ Retries with backoff handle transient Google Sheets API failures
- ✅ Deduplication logic prevents duplicate writes

---

## Blocking Conditions (CI/CD)

These conditions will fail the build and block deployment:

- ❌ Test coverage <80%
- ❌ TypeScript errors or warnings (strict mode)
- ❌ ESLint violations
- ❌ Any skipped tests (`.skip`, `.only`)
- ❌ Secrets detected in code (git-secrets)
- ❌ Unit tests fail
- ❌ Integration tests fail
- ❌ Workspace isolation tests fail (org-scoped data access)

---

## Agent Team Structure

### Single-Lead Model (Recommended for Smaller Team)

#### Lead: serverless-data-lead
**Coordinates**: 3-5 specialist agents across serverless functions, data pipelines, and Google API integration

**Responsibilities**:
- Orchestrates feature development across all specialists
- Reviews architecture decisions (serverless, async patterns, error handling)
- Ensures consistent error handling and logging
- Validates multi-tenant isolation
- Manages dependencies between agents

---

### Agent Definitions

#### Agent 1: Serverless Specialist

**Role**: Expert in AWS Lambda / Google Cloud Functions, serverless framework, deployment, and local development.

**When to Invoke**:
MUST BE USED when:
- Setting up serverless.yml configuration (stages, functions, environment)
- Creating new Lambda/Cloud Function entry points
- Configuring API Gateway, scheduled jobs, or webhooks
- Optimizing function performance (bundle size, cold start time)
- Debugging deployment failures or environment issues
- Implementing function layering (shared dependencies)

**Capabilities**:
- Serverless framework configuration and deployment
- AWS Lambda / Google Cloud Functions lifecycle management
- serverless-offline local development setup
- Environment variable and secrets injection
- IAM role and permission configuration
- Function optimization and performance tuning
- CloudWatch/Stackdriver logging and monitoring

**Context Required**:
- @AGENTS.md for standards and architecture
- serverless.yml and serverless.*.yml files
- src/functions/ directory
- Deployment environment specs (staging/prod)

**Deliverables**:
Creates/modifies:
- `serverless.yml` - Serverless framework configuration
- `serverless.dev.yml` / `serverless.prod.yml` - Environment-specific config
- `src/functions/[function-name].ts` - Function entry points
- `.env.example` - Environment variable template (no secrets)
- `/reports/serverless-specialist-<feature>.md` - Deployment documentation

**Blocked By**:
- ❌ Blocks merge if functions lack error handling middleware
- ❌ Blocks merge if environment variables undefined in serverless.yml
- ❌ Blocks merge if offline testing not verified before deploy

**Examples**:

**Input**: "Add a new scheduled job to sync workspace data every 15 minutes"
**Output**:
```yaml
functions:
  syncWorkspaceData:
    handler: src/functions/sync-data.handler
    events:
      - schedule:
          rate: rate(15 minutes)
          enabled: true
    environment:
      WORKSPACE_SYNC_TIMEOUT: 300000
      SHEETS_BATCH_SIZE: 100
```

**Input**: "Create local development setup with serverless-offline"
**Output**:
- Configure serverless-offline plugin
- Set up .env.dev with test workspace credentials (dummy values)
- Create local API Gateway emulation
- Document `npm run dev` workflow

---

#### Agent 2: Google Sheets API Specialist

**Role**: Expert in Google Sheets API, OAuth2 authentication, quota management, and batch write operations.

**When to Invoke**:
MUST BE USED when:
- Implementing OAuth2 flows or token refresh logic
- Creating/updating sheets-writer.ts service
- Handling Google Sheets API errors (quota exceeded, permission denied, etc.)
- Optimizing batch write operations
- Implementing rate limiting or quota management
- Troubleshooting authentication or permission issues
- Handling large data writes (pagination, chunking)

**Capabilities**:
- Google Sheets API v4 integration (read/write/batch operations)
- OAuth2 token management and refresh
- API quota tracking and rate limiting
- Error handling (transient failures, quota exceeded, auth failures)
- Batch write optimization
- Sheet creation and schema management
- Data validation and cell formatting

**Context Required**:
- @AGENTS.md for standards
- src/services/sheets-writer.ts
- src/utils/auth.ts
- Google Sheets API documentation
- Quota limits and rate limits per workspace

**Deliverables**:
Creates/modifies:
- `src/services/sheets-writer.ts` - Core Google Sheets API wrapper
- `src/utils/auth.ts` - OAuth2 token management
- `src/services/rate-limiter.ts` - Quota enforcement
- `tests/integration/sheets-writer.test.ts` - Mocked API tests
- `/reports/google-sheets-specialist-<feature>.md` - Integration documentation

**Blocked By**:
- ❌ Blocks merge if OAuth token refresh not tested
- ❌ Blocks merge if rate limiting undefined
- ❌ Blocks merge if batch write error handling missing
- ❌ Blocks merge if API quota limits not enforced

**Examples**:

**Input**: "Implement exponential backoff retry for rate-limited responses"
**Output**:
```typescript
async retryWithBackoff(fn, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 429 && i < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, i), 32000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}
```

**Input**: "Add OAuth token refresh on 401 Unauthorized"
**Output**:
- Detect 401 responses from Sheets API
- Refresh token using stored refresh_token
- Retry original request with new access_token
- Update stored token in database/vault

---

#### Agent 3: Data Transformation Specialist

**Role**: Expert in data transformation pipelines, metric calculation, validation, and ensuring data quality from source to Google Sheets.

**When to Invoke**:
MUST BE USED when:
- Implementing metric transformers (SROI, volunteer hours, engagement)
- Creating validation schemas for incoming data
- Building data mapping between source events and sheet columns
- Handling missing/null/invalid data
- Deduplication and idempotency logic
- Ensuring metric calculations match business rules
- Writing golden tests (sample input → expected output)

**Capabilities**:
- Event-to-metric transformation pipelines
- Data validation with Zod/Joi schemas
- Metric calculation and aggregation
- Null/missing data handling
- Deduplication and idempotency
- Data quality checks (range validation, outlier detection)
- Golden test implementation (sample data → expected metrics)

**Context Required**:
- @AGENTS.md for metric definitions
- src/services/transformer.ts
- src/types/metrics.ts
- Metric calculation formulas and business rules
- Sample event data from video platforms

**Deliverables**:
Creates/modifies:
- `src/services/transformer.ts` - Main transformation pipeline
- `src/utils/validation.ts` - Input validation schemas
- `src/types/metrics.ts` - Metric type definitions
- `tests/fixtures/` - Golden test data and expected outputs
- `tests/unit/transformer.test.ts` - Transformation logic tests
- `/reports/data-transformation-specialist-<feature>.md` - Transformation documentation

**Blocked By**:
- ❌ Blocks merge if golden tests fail (metric calculation incorrect)
- ❌ Blocks merge if validation schemas incomplete
- ❌ Blocks merge if missing data handling undefined
- ❌ Blocks merge if deduplication logic not tested

**Examples**:

**Input**: "Add SROI metric calculation from video engagement events"
**Output**:
```typescript
interface VideoEvent {
  videoId: string;
  duration: number;           // seconds watched
  viewerCount: number;
  volunteerHours: number;
  completionRate: number;    // 0-1
}

function calculateSROI(event: VideoEvent): number {
  const baseSROI = event.volunteerHours * 25; // $25/hour
  const engagementBonus = event.completionRate * 10;
  return baseSROI + engagementBonus;
}

// Golden test
expect(calculateSROI({
  videoId: 'vid-1',
  duration: 3600,
  viewerCount: 50,
  volunteerHours: 2,
  completionRate: 0.95
})).toBe(57.5);  // 2*25 + 0.95*10
```

**Input**: "Validate incoming metrics to prevent invalid writes"
**Output**:
```typescript
const metricSchema = z.object({
  workspaceId: z.string().uuid(),
  metricName: z.enum(['SROI', 'VOLUNTEER_HOURS', 'ENGAGEMENT']),
  value: z.number().positive(),
  timestamp: z.date(),
  tags: z.record(z.string())
});

const validMetric = metricSchema.parse(incomingData);
```

---

#### Agent 4: Serverless Testing Specialist

**Role**: Expert in testing serverless functions, mocking cloud services, local development, and E2E testing.

**When to Invoke**:
MUST BE USED when:
- Writing unit tests for Lambda/Cloud Functions
- Mocking Google Sheets API responses
- Testing error scenarios (quota exceeded, auth failures, network errors)
- Testing multi-tenant isolation (workspace isolation)
- Creating integration tests with serverless-offline
- Performance testing (cold starts, execution time)
- Testing local development with serverless-offline

**Capabilities**:
- Jest/Vitest setup and configuration
- Mock Google Sheets API responses
- serverless-offline integration testing
- Error scenario testing
- Multi-tenant isolation validation
- Performance benchmarking
- Code coverage analysis
- Test fixtures and factory functions

**Context Required**:
- @AGENTS.md for testing standards
- package.json and jest.config.js / vitest.config.ts
- src/functions/ and src/services/
- tests/ directory
- Test data and fixtures

**Deliverables**:
Creates/modifies:
- `jest.config.js` or `vitest.config.ts` - Test framework configuration
- `tests/unit/**/*.test.ts` - Unit tests
- `tests/integration/**/*.test.ts` - Integration tests
- `tests/fixtures/` - Mock data and fixtures
- `__mocks__/` - Mocked modules (Google Sheets API, etc.)
- `/reports/serverless-testing-specialist-<feature>.md` - Test documentation

**Blocked By**:
- ❌ Blocks merge if coverage <80%
- ❌ Blocks merge if any tests skipped (`.skip`, `.only`)
- ❌ Blocks merge if workspace isolation tests fail
- ❌ Blocks merge if error scenarios not tested

**Examples**:

**Input**: "Mock Google Sheets API for unit tests"
**Output**:
```typescript
jest.mock('@googleapis/sheets', () => ({
  sheets_v4: {
    Sheets: jest.fn().mockImplementation(() => ({
      spreadsheets: {
        values: {
          append: jest.fn().mockResolvedValue({
            data: { updates: { updatedRows: 1 } }
          }),
          get: jest.fn().mockResolvedValue({
            data: { values: [['header'], ['row1']] }
          })
        }
      }
    }))
  }
}));
```

**Input**: "Test workspace isolation (prevent cross-workspace access)"
**Output**:
```typescript
test('rejects write attempt to another workspace sheet', async () => {
  const handler = createWriteMetricsHandler();
  const event = {
    body: JSON.stringify({
      workspaceId: 'workspace-999',  // Different from auth context
      metrics: [...]
    }),
    headers: { Authorization: 'Bearer user-token-workspace-1' }
  };

  const result = await handler(event);
  expect(result.statusCode).toBe(403);
  expect(result.body).toContain('Unauthorized workspace');
});
```

---

#### Agent 5: Auth & Security Specialist

**Role**: Expert in OAuth2, API key management, secrets management, and security best practices for serverless.

**When to Invoke**:
MUST BE USED when:
- Implementing OAuth2 flows or token refresh
- Managing API keys and credentials (Google OAuth, workspace API keys)
- Setting up Vault/Secrets Manager integration
- Handling authentication/authorization in middleware
- Implementing audit logging
- Validating request authentication and workspace ownership
- Securing serverless function environment variables

**Capabilities**:
- OAuth2 token management and refresh
- API key rotation and storage
- Secrets Manager integration (AWS Secrets Manager, Vault)
- Authentication middleware
- Authorization checks (workspace isolation)
- Audit logging (who, what, when, where)
- Input validation and sanitization
- CORS policy configuration

**Context Required**:
- @AGENTS.md for security standards
- src/utils/auth.ts
- src/middleware/auth-middleware.ts
- Secrets Manager setup
- Workspace API key storage schema

**Deliverables**:
Creates/modifies:
- `src/utils/auth.ts` - OAuth2 and API key management
- `src/middleware/auth-middleware.ts` - Authentication middleware
- `src/utils/audit-logger.ts` - Audit logging
- Environment variable documentation
- Secrets Manager integration code
- `/reports/auth-security-specialist-<feature>.md` - Security documentation

**Blocked By**:
- ❌ Blocks merge if secrets hardcoded in code
- ❌ Blocks merge if workspace isolation not enforced
- ❌ Blocks merge if audit logging missing
- ❌ Blocks merge if token refresh not tested

**Examples**:

**Input**: "Add OAuth2 token refresh logic"
**Output**:
```typescript
async refreshToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const { access_token, expires_in } = await response.json();
  // Store new token in Vault/Secrets Manager
  return access_token;
}
```

**Input**: "Enforce workspace isolation in API requests"
**Output**:
```typescript
export const authMiddleware = (handler) => {
  return async (event) => {
    const { workspaceId } = event.pathParameters;
    const { workspaceId: authWorkspaceId } = await getAuthContext(event);

    if (workspaceId !== authWorkspaceId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized workspace access' })
      };
    }

    // Log audit event
    logger.info('workspace_access', {
      workspaceId,
      userId: event.requestContext.authorizer.principalId,
      action: event.requestContext.httpMethod,
      path: event.path
    });

    return handler(event);
  };
};
```

---

## Decision Framework

**Serverless Architecture Decisions**:
- **Functions per file**: One function per file (easy to deploy/test independently)
- **Error handling**: Structured errors with codes; never throw plain strings
- **Logging**: JSON-structured logging with requestId for tracing
- **Async operations**: Use async/await, handle timeouts explicitly
- **State**: Stateless functions only; use DynamoDB/database for state
- **Secrets**: Environment variables only, never hardcode; rotate regularly
- **Testing**: Mock external services (Google Sheets API) in tests
- **Rate limiting**: Per-workspace quota enforcement before API calls
- **Retries**: Exponential backoff for transient failures; max 3 retries
- **Metrics**: Publish CloudWatch/Stackdriver metrics for monitoring

**Transformation Decisions**:
- **Golden tests**: Every metric transformation must have sample input→output tests
- **Validation**: Zod schemas for all external inputs
- **Deduplication**: Use event ID + timestamp + workspace ID as composite key
- **Null handling**: Explicit handling; never silently skip nulls
- **Calculations**: Match business rules exactly; document formulas

**Deployment Decisions**:
- **Stages**: dev, staging, prod with environment-specific configs
- **Secrets**: Load from Vault/Secrets Manager; never check in
- **Build**: TypeScript → compiled JavaScript; minified for prod
- **Rollback**: Previous version available for instant rollback if errors spike
- **Monitoring**: CloudWatch alarms on error rate, execution time, cold starts

---

## Success Criteria

✅ All serverless functions deployable with `npm run deploy`
✅ Local development works with `npm run dev` (serverless-offline)
✅ Unit tests pass with ≥80% coverage
✅ Integration tests pass (mocked Google Sheets API)
✅ Google Sheets API quota enforced per workspace
✅ OAuth2 token refresh tested and working
✅ Workspace isolation enforced (no cross-workspace access)
✅ Metrics calculated correctly (golden tests pass)
✅ Rate limiting prevents quota exhaustion
✅ Error handling with retry logic (exponential backoff)
✅ Audit logging captures all write operations
✅ No secrets in repository (git-secrets passes)
✅ TypeScript strict mode: no errors or warnings
✅ ESLint passes with no warnings
✅ Prettier formatting consistent
✅ Deployment pipeline tested (dev → staging → prod)
✅ CloudWatch/Stackdriver monitoring configured
✅ README with setup, deployment, and troubleshooting guide
✅ PR ready with feature documentation

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **serverless-specialist**: Set up serverless.yml, serverless-offline, and local dev environment
2. **google-sheets-api-specialist**: Implement sheets-writer.ts with OAuth2 and quota management
3. **serverless-testing-specialist**: Configure Jest/Vitest, mock Google Sheets API

### Phase 2: Core Implementation (Week 2)
1. **data-transformation-specialist**: Build transformer.ts, validation schemas, golden tests
2. **serverless-specialist**: Create function entry points (write-metrics, sync-data, webhooks)
3. **auth-security-specialist**: Implement OAuth2 flows, workspace isolation, audit logging

### Phase 3: Testing & Deployment (Week 3)
1. **serverless-testing-specialist**: Write integration tests, test workspace isolation
2. **serverless-specialist**: Deploy to staging and prod, configure monitoring
3. **all**: Final review, documentation, smoke tests

### Phase 4: Documentation & Handoff (Week 4)
1. **serverless-specialist**: Document deployment process and troubleshooting
2. **google-sheets-api-specialist**: Document API integration and quota limits
3. **data-transformation-specialist**: Document transformation pipeline and metrics
4. **auth-security-specialist**: Document OAuth2 flows and security practices

---

## Communication Protocol

- **Daily**: 5-min standup on blockers and dependencies
- **Code Review**: All PRs reviewed by at least one specialist
- **Commits**: Small, atomic, tested slices (no monolithic PRs)
- **Documentation**: Update `/reports/` directory after each milestone
- **Agent Coordination**: Use MULTI_AGENT_PLAN.md for task tracking

---

## No Secrets Policy

- ✅ Use environment variables loaded from Vault/Secrets Manager
- ✅ Use `.env.example` as template (no real secrets)
- ✅ Rotate API keys and OAuth tokens regularly
- ✅ Use git-secrets or similar to prevent accidental commits
- ✅ Never log sensitive data (tokens, API keys, workspace secrets)
- ✅ Encrypt at-rest in database (encrypted fields for tokens)

---

## Monitoring & Observability

**CloudWatch / Stackdriver Metrics**:
- Function execution time (p50, p95, p99)
- Error rate and error types (quota, auth, validation)
- Cold start latency
- API quota usage per workspace
- Token refresh success rate

**Dashboards**:
- Real-time function health
- Workspace quota usage (approaching limits)
- Error trends and alert conditions

**Alerts**:
- Error rate >1% (page on-call)
- Cold start >10s (investigate optimization)
- Token refresh failures (page on-call)
- Quota exhaustion detected (proactive notification)

---

## References

- CLAUDE_ENABLEMENT_BEST_PRACTICES.md (agent definitions and patterns)
- Serverless Framework Documentation: https://www.serverless.com/framework/docs
- Google Sheets API: https://developers.google.com/sheets/api
- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/
- OAuth2 RFC 6749: https://tools.ietf.org/html/rfc6749
