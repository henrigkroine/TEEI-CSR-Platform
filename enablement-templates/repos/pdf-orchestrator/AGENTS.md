# Multi-Agent Orchestration Structure: PDF Orchestrator

**Tech Stack**: Node.js, ExtendScript (InDesign), TypeScript, PDF.js, Express.js
**Purpose**: Enterprise-grade PDF generation and orchestration platform using InDesign as the rendering engine. Provides template-based PDF creation, file processing pipelines, and document automation for regulated industries.

---

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run all tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Production build
pnpm build

# Run InDesign script validation
pnpm validate:scripts

# Test PDF generation pipeline
pnpm test:pdf

# Performance benchmarks
pnpm bench
```

---

## Architecture Overview

### Repository Structure

```
pdf-orchestrator/
├── apps/
│   ├── api/                       # Node.js Express API server
│   │   ├── src/
│   │   │   ├── routes/           # API endpoints (queue, status, webhooks)
│   │   │   ├── controllers/      # Request handlers
│   │   │   ├── middleware/       # Auth, validation, error handling
│   │   │   └── utils/            # Helpers, constants
│   │   └── tests/
│   └── web/                       # Dashboard UI (monitoring, template mgmt)
│
├── services/
│   ├── pdf-generator/            # Core PDF generation orchestrator
│   │   ├── src/
│   │   │   ├── engine/          # PDF generation engine (orchestrates InDesign)
│   │   │   ├── queue/           # Job queue management (Bull/RabbitMQ)
│   │   │   ├── templates/       # Template loading & caching
│   │   │   ├── validators/      # PDF quality validation
│   │   │   └── types/           # TypeScript interfaces
│   │   └── tests/
│   │
│   ├── indesign-bridge/         # InDesign integration layer
│   │   ├── scripts/             # ExtendScript files (.jsx)
│   │   │   ├── pdf-export.jsx   # PDF export script
│   │   │   ├── template-renderer.jsx  # Template rendering
│   │   │   ├── data-binding.jsx # Data injection into template
│   │   │   └── validation.jsx   # Output validation
│   │   ├── src/
│   │   │   ├── client.ts        # Node->InDesign communication
│   │   │   ├── script-manager.ts # Script lifecycle
│   │   │   └── error-handler.ts # InDesign error handling
│   │   └── tests/
│   │
│   ├── file-processor/           # File handling & storage
│   │   ├── src/
│   │   │   ├── storage/         # S3/local file ops
│   │   │   ├── metadata/        # File metadata tracking
│   │   │   ├── cleanup/         # Temp file management
│   │   │   └── validation/      # File integrity checks
│   │   └── tests/
│   │
│   └── pdf-validator/           # Output quality assurance
│       ├── src/
│       │   ├── checks/          # PDF validation rules
│       │   ├── ocr/             # Text extraction & verification
│       │   ├── rendering/       # Visual validation
│       │   └── compliance/      # Regulatory checks (A/3, encryption)
│       └── tests/
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   ├── constants/               # Shared constants & config schemas
│   ├── logger/                  # Centralized logging
│   └── error-handler/           # Structured error handling
│
├── scripts/
│   ├── indesign/               # ExtendScript utilities & helpers
│   └── deployment/             # CI/CD helper scripts
│
├── .github/
│   └── workflows/              # GitHub Actions
│       ├── ci.yml             # Linting, tests, builds
│       ├── pdf-validation.yml # PDF quality gate
│       └── deploy.yml         # Deploy to staging/prod
│
├── docs/
│   ├── ARCHITECTURE.md         # System design & pipeline
│   ├── INDESIGN_SETUP.md      # InDesign environment & licensing
│   ├── API.md                 # API endpoints & webhooks
│   ├── TEMPLATES.md           # Template authoring guide
│   ├── PIPELINE.md            # PDF generation workflow
│   └── TROUBLESHOOTING.md     # Common issues & solutions
│
└── docker-compose.yml          # Dev environment (InDesign server, queue, S3)
```

### Key Components

- **PDF Generator Service**: Orchestrates job queue, manages InDesign instances, handles retries
- **InDesign Bridge**: Communicates with InDesign server via ExtendScript, manages document lifecycle
- **Queue System**: Bull (Redis) for job processing with retry logic, DLQ for failed jobs
- **File Processor**: Manages template inputs, generated PDFs, temp files with cleanup
- **PDF Validator**: Ensures quality (OCR text extraction, visual rendering, compliance checks)
- **API Server**: REST endpoints for job submission, status, download, webhooks for completion
- **Dashboard**: Real-time monitoring, template management, job history, error analysis

---

## Agent Instructions

### Safety Constraints

#### NEVER (Blocking)
- ❌ NEVER modify secrets, API keys, or environment variables directly (use `.env.example` templates)
- ❌ NEVER push directly to main/master branches without PR review
- ❌ NEVER skip tests or PDF validation before committing
- ❌ NEVER commit PII, license keys, or InDesign credentials
- ❌ NEVER run destructive commands without confirmation (rm -rf, DELETE FROM, etc.)
- ❌ NEVER execute InDesign scripts outside of sandboxed Docker environment
- ❌ NEVER modify shared ExtendScript files without validation testing
- ❌ NEVER process PDFs with unvalidated templates
- ❌ NEVER deploy without PDF output quality validation passing
- ❌ NEVER use production file storage credentials in development

#### ALWAYS (Required)
- ✅ ALWAYS run `pnpm test` and `pnpm typecheck` before committing
- ✅ ALWAYS run `pnpm validate:scripts` before modifying ExtendScript files
- ✅ ALWAYS verify PDF output with `pnpm test:pdf` after template changes
- ✅ ALWAYS check for secrets using `git-secrets` or similar before pushing
- ✅ ALWAYS document breaking changes in commit messages
- ✅ ALWAYS test InDesign changes on the target version (document which version in tests)
- ✅ ALWAYS handle file cleanup to prevent disk exhaustion
- ✅ ALWAYS validate file permissions before processing
- ✅ ALWAYS use structured error logging with trace IDs for debugging
- ✅ ALWAYS update `/docs/TROUBLESHOOTING.md` when resolving InDesign-specific issues

#### Repo-Specific Constraints
- ❌ NEVER use synchronous file operations (use async/await)
- ❌ NEVER hold file locks without timeout protection
- ❌ NEVER spawn unlimited InDesign processes (enforce pool size limits)
- ❌ NEVER write PDFs to memory without size checks (potential OOM)
- ✅ ALWAYS validate template syntax before submission to queue
- ✅ ALWAYS implement exponential backoff for InDesign timeouts
- ✅ ALWAYS tag log entries with job ID and template name for traceability

---

## Quality Gates

### Unit & Integration Tests
- ✅ Unit test coverage ≥80% (enforced per service)
- ✅ Integration tests ≥60% for critical paths (queue→InDesign→PDF)
- ✅ All async operations tested with proper error scenarios
- ✅ Template validation logic 100% covered

### Type Safety
- ✅ TypeScript strict mode enabled (no `any`, `unknown` requires explicit handling)
- ✅ No type errors on build (`pnpm typecheck` passes)
- ✅ All API responses typed with Zod schemas

### PDF Quality
- ✅ PDF Validator succeeds on all generated output (no missing text, corrupted fonts)
- ✅ OCR text extraction ≥95% accuracy on test documents
- ✅ Visual rendering matches template (pixel-perfect or documented variance)
- ✅ All compliance checks pass (encryption, accessibility, A/3 format)
- ✅ File size within thresholds (no bloated PDFs from InDesign)

### Performance
- ✅ PDF generation <30s per document (single job, tuned InDesign instance)
- ✅ Queue throughput ≥100 jobs/minute at 90th percentile
- ✅ Memory usage <2GB per InDesign instance under load
- ✅ Disk cleanup runs every 24h (configurable), removes files >7 days old

### InDesign Script Validation
- ✅ ExtendScript syntax validated (`pnpm validate:scripts`)
- ✅ Scripts tested on target InDesign version (CC 2024+ or specified version)
- ✅ No hardcoded paths (use parameterized templates)
- ✅ Error handling returns structured JSON for orchestrator parsing
- ✅ Script execution <60s timeout with graceful failure

### Security & Compliance
- ✅ No secrets in logs (redact API keys, passwords)
- ✅ File access controls enforced (no path traversal)
- ✅ PDF encryption keys managed via Vault/Secrets Manager
- ✅ All API endpoints require authentication
- ✅ Audit log captures job submissions, completions, failures with user/IP

### CI/CD Gates
- ✅ Lint passes (`pnpm lint`)
- ✅ Typecheck passes (`pnpm typecheck`)
- ✅ Unit tests pass with ≥80% coverage
- ✅ Integration tests pass (`pnpm test:pdf`)
- ✅ PDF output validation passes on sample templates
- ✅ InDesign scripts validate (`pnpm validate:scripts`)
- ✅ Security audit passes (dependencies, secrets)
- ✅ No unresolved merge conflicts

---

## Agent Team Structure

### Team 1: PDF Generation & Orchestration (4 agents)
**Lead**: `pdf-generation-lead`

#### Agent 1.1: PDF Generation Specialist
**Role**: Expert in Node.js PDF orchestration, job queues, and pipeline architecture.

**When to Invoke**:
MUST BE USED when:
- Implementing job queue logic, retries, and DLQ handling
- Adding new PDF generation endpoints or webhooks
- Optimizing queue throughput or job scheduling
- Handling concurrent InDesign instance management
- Implementing result caching and deduplication

Blocks merge if:
- Queue logic lacks retry/exponential backoff
- Job timeout handling missing
- No structured error logging with trace IDs

**Capabilities**:
- Bull/RabbitMQ queue design and optimization
- Node.js async/await patterns for concurrent operations
- File system operations (temp file cleanup, atomic writes)
- Performance monitoring and optimization
- Error handling and recovery strategies

**Context Required**:
- @AGENTS.md for architecture and constraints
- services/pdf-generator/src/queue documentation
- Queue schema and job types in packages/types

**Deliverables**:
- `services/pdf-generator/src/engine/*` - Orchestration logic
- `services/pdf-generator/src/queue/*` - Queue management
- Test suites in `services/pdf-generator/tests/`
- `/reports/pdf-generation-<feature>.md` - Implementation details

**Allowed Tools**:
- Read, Write: Core service files
- Bash: Run `pnpm test`, `pnpm typecheck`, `docker-compose up`
- Glob: Find test files, queue handlers

**Examples**:
**Input**: "Implement job retry with exponential backoff (1s→32s max 5 retries)"
**Output**:
- Bull queue configuration with `attempts`, `backoff`
- Error handler captures failure reason in DLQ
- Metrics emitted for retry attempts
- Tests cover success after retry and final failure paths

**Input**: "Add webhook callback when PDF generation completes"
**Output**:
- New endpoint for job completion event
- Webhook retry logic (3 attempts with backoff)
- Secure webhook signing (HMAC-SHA256)
- Idempotency key support to prevent duplicate processing

---

#### Agent 1.2: InDesign Scripting Specialist
**Role**: Expert in ExtendScript, InDesign server automation, and document lifecycle management.

**When to Invoke**:
MUST BE USED when:
- Writing or modifying ExtendScript files (.jsx)
- Debugging InDesign rendering or export issues
- Implementing new template data binding mechanisms
- Optimizing InDesign process pooling or resource usage
- Adding InDesign version compatibility layers

Blocks merge if:
- ExtendScript syntax invalid or untested on target version
- Scripts lack error handling (must return structured JSON)
- No timeout protection (scripts run indefinitely)
- Hardcoded paths/credentials in scripts

**Capabilities**:
- ExtendScript syntax and InDesign DOM
- Document lifecycle (open, modify, export, close)
- Data injection into text frames, tables, images
- PDF export configuration and optimization
- Process communication (stdin/stdout, file-based IPC)
- InDesign version compatibility (CC 2021+)
- Error handling and structured JSON responses

**Context Required**:
- @AGENTS.md for safety constraints
- services/indesign-bridge/ source code
- Adobe ExtendScript documentation and InDesign API
- /docs/INDESIGN_SETUP.md for environment details

**Deliverables**:
- `services/indesign-bridge/scripts/*.jsx` - ExtendScript files
- `services/indesign-bridge/src/client.ts` - Node↔InDesign communication
- Test suites in `services/indesign-bridge/tests/`
- `/reports/indesign-scripting-<feature>.md` - Implementation with version notes

**Allowed Tools**:
- Read, Write: ExtendScript and bridge files
- Bash: Validate scripts (`pnpm validate:scripts`), run tests in Docker
- Glob: Find .jsx files, template files

**Examples**:
**Input**: "Implement data binding to inject company name into text frame [CompanyName]"
**Output**:
```javascript
// pdf-export.jsx
function bindData(doc, dataObject) {
  var textFrames = doc.textFrames;
  for (var i = 0; i < textFrames.length; i++) {
    var frame = textFrames[i];
    if (frame.name === "[CompanyName]" && dataObject.companyName) {
      frame.contents = dataObject.companyName;
    }
  }
  return { success: true, boundFields: 1 };
}
```
- Validates data types before injection
- Returns structured error if binding fails
- Tested on InDesign CC 2024

**Input**: "Add timeout protection to PDF export (max 60s, return error if exceeds)"
**Output**:
- Wrapper script with timeout logic
- Graceful document cleanup on timeout
- Structured error JSON: `{ success: false, error: "TIMEOUT", message: "PDF export exceeded 60s" }`

---

#### Agent 1.3: PDF Quality Validation Specialist
**Role**: Expert in PDF validation, OCR, rendering checks, and compliance verification.

**When to Invoke**:
MUST BE USED when:
- Implementing PDF quality checks (visual, text, compliance)
- Adding OCR text extraction and verification
- Creating accessibility or A/3 compliance validators
- Debugging PDF output issues (missing text, font corruption)
- Setting quality thresholds and SLOs

Blocks merge if:
- Validator coverage <90% on critical checks
- No handling for corrupted PDF scenarios
- Accessibility checks missing from compliance
- OCR accuracy threshold not defined/tested

**Capabilities**:
- PDF.js text extraction and content analysis
- Visual PDF validation (rendering, fonts, images)
- OCR text accuracy verification
- PDF metadata inspection and compliance (encryption, A/3 format)
- File integrity and corruption detection
- Performance profiling of validation operations

**Context Required**:
- @AGENTS.md for quality gates
- services/pdf-validator/ source code
- PDF specification and A/3 accessibility standards
- /docs/TEMPLATES.md for expected output specs

**Deliverables**:
- `services/pdf-validator/src/checks/*` - Validation rules
- `services/pdf-validator/src/ocr/*` - Text extraction logic
- Test suites in `services/pdf-validator/tests/`
- `/reports/pdf-validation-<feature>.md` - Validation specs and thresholds

**Allowed Tools**:
- Read, Write: Validator service files, test PDFs
- Bash: Run PDF validation tests, benchmark validators
- Glob: Find PDF test fixtures, check files

**Examples**:
**Input**: "Verify OCR text extraction accuracy ≥95% (test with sample PDFs)"
**Output**:
- OCR engine selection (Tesseract, AWS Textract, or PDF.js)
- Accuracy measurement against golden PDFs
- Confidence scoring per extracted text block
- Benchmark results showing 95%+ accuracy on test suite

**Input**: "Add PDF/A-3 compliance check (encryption, font embedding)"
**Output**:
- Metadata validator checks for PDF/A-3 conformance
- Font embedding verification
- Encryption key validation against Vault
- Test cases cover compliant and non-compliant PDFs

---

#### Agent 1.4: File Processing & Storage Specialist
**Role**: Expert in file handling, temporary file management, and storage systems (S3, local).

**When to Invoke**:
MUST BE USED when:
- Implementing file upload/download endpoints
- Managing temporary file cleanup and disk space
- Integrating S3 or cloud storage
- Handling file metadata and access controls
- Implementing atomic writes and corruption detection

Blocks merge if:
- No cleanup of temporary files (disk exhaustion risk)
- File locks not protected with timeouts
- Path traversal vulnerabilities in file access
- No file integrity checks (checksums, size validation)

**Capabilities**:
- Async file operations (read, write, stream, delete)
- Temporary file management with automatic cleanup
- S3 SDK integration and optimization
- File metadata tracking and versioning
- Access control and permission checks
- File integrity validation (size, checksum, magic bytes)
- Streaming for large files (memory-efficient)

**Context Required**:
- @AGENTS.md for safety constraints
- services/file-processor/ source code
- S3 API documentation
- Disk space and performance requirements

**Deliverables**:
- `services/file-processor/src/storage/*` - File operations
- `services/file-processor/src/cleanup/*` - Maintenance tasks
- Test suites in `services/file-processor/tests/`
- `/reports/file-processing-<feature>.md` - Implementation details

**Allowed Tools**:
- Read, Write: File processor service files
- Bash: Run cleanup scripts, test storage operations
- Glob: Find storage handlers, test fixtures

**Examples**:
**Input**: "Implement temp file cleanup (delete files >7 days old, run daily)"
**Output**:
- Scheduled job (cron via node-cron or Bull)
- Filters files by mtime > 7 days
- Logs deleted file count and reclaimed space
- Handles cleanup failures gracefully (continue vs. abort)
- Tested with mock filesystem

**Input**: "Add S3 storage with fallback to local files"
**Output**:
- S3 client with retry logic and exponential backoff
- Local file fallback if S3 unavailable
- Atomic rename (no partial uploads)
- Checksum validation post-upload
- Tests cover both success and failure paths

---

### Team 2: API & Integration (3 agents)
**Lead**: `api-integration-lead`

#### Agent 2.1: API Endpoint Developer
**Role**: Expert in Express.js, REST API design, request/response validation, and authentication.

**When to Invoke**:
MUST BE USED when:
- Creating or modifying API endpoints (/api/jobs, /api/templates, etc.)
- Implementing request validation (Zod schemas)
- Adding authentication/authorization middleware
- Designing webhook callback mechanisms
- Handling error responses and status codes

Blocks merge if:
- Endpoints lack input validation (Zod schema)
- No authentication on protected endpoints
- Error responses not structured (missing error code)
- No integration tests for endpoints

**Capabilities**:
- Express.js routing and middleware
- Zod schema validation for requests/responses
- JWT or OAuth authentication
- Error handling with structured responses
- API documentation (OpenAPI/Swagger)
- Rate limiting and throttling
- Webhook retries and idempotency

**Context Required**:
- @AGENTS.md for API standards
- apps/api/ source code
- API endpoint specs and schemas
- Integration test examples

**Deliverables**:
- `apps/api/src/routes/*` - New endpoints
- `apps/api/src/controllers/*` - Request handlers
- Test suites in `apps/api/tests/`
- Updated API documentation
- `/reports/api-<feature>.md` - Endpoint specifications

**Allowed Tools**:
- Read, Write: API service files
- Bash: Run API tests, start dev server
- Glob: Find route files, test fixtures

**Examples**:
**Input**: "Create POST /api/jobs endpoint (submit template + data for PDF generation)"
**Output**:
```typescript
// Request body validation with Zod
const jobRequestSchema = z.object({
  templateId: z.string().uuid(),
  data: z.record(z.string(), z.any()),
  options: z.object({ encryption: z.boolean().optional() })
});

// Route handler
router.post('/api/jobs', authenticate, async (req, res) => {
  const validated = jobRequestSchema.parse(req.body);
  const jobId = await queuePdfJob(validated);
  res.status(201).json({ jobId, statusUrl: `/api/jobs/${jobId}` });
});
```
- Input validation with Zod
- Structured error response on validation failure
- Integration test covers success and validation error

**Input**: "Add webhook callback for job completion with retry logic"
**Output**:
- New field `webhookUrl` in job submission schema
- Callback triggered on completion (success/failure)
- Retry mechanism: 3 attempts with exponential backoff
- Webhook signature (HMAC-SHA256) for security
- Idempotency key support to prevent duplicates

---

#### Agent 2.2: Dashboard & Monitoring Specialist
**Role**: Expert in React/frontend dashboards, real-time monitoring, and data visualization.

**When to Invoke**:
MUST BE USED when:
- Building dashboard UI (template management, job monitoring)
- Displaying real-time job status and metrics
- Implementing charts/graphs for performance analytics
- Creating error analysis and debugging views
- Adding user management or access controls

Blocks merge if:
- Dashboard components lack error boundaries
- Real-time updates not tested (WebSocket/polling)
- No accessibility (WCAG 2.1 AA) on new components
- Performance metrics not displayed for transparency

**Capabilities**:
- React component development and state management
- Real-time data updates (WebSocket, Server-Sent Events)
- Data visualization (charts, tables, timelines)
- Error boundaries and graceful degradation
- Accessibility (WCAG 2.1 AA) and keyboard navigation
- Responsive design for mobile/tablet

**Context Required**:
- @AGENTS.md for standards
- apps/web/ source code
- UI/UX requirements
- Real-time data APIs (job status, metrics)

**Deliverables**:
- `apps/web/src/components/*` - New components
- `apps/web/src/pages/*` - New pages
- Test suites in `apps/web/tests/`
- `/reports/dashboard-<feature>.md` - UI specifications

**Allowed Tools**:
- Read, Write: Web app files
- Bash: Run dev server, run component tests
- Glob: Find component files

**Examples**:
**Input**: "Create job status dashboard (live job count, success rate, avg time)"
**Output**:
- Real-time metrics via Server-Sent Events
- Charts showing throughput and success rate over time
- Job table with status, template, duration, error details
- Filtering/sorting by status, template, date range
- Auto-refresh every 5 seconds with loading indicator

---

#### Agent 2.3: Integration & Webhook Specialist
**Role**: Expert in webhook handling, external service integration, and async communication.

**When to Invoke**:
MUST BE USED when:
- Implementing callbacks/webhooks for job completion
- Integrating with external systems (e.g., document management, email)
- Handling webhook retries and idempotency
- Designing event schemas and contracts
- Debugging integration issues

Blocks merge if:
- Webhooks lack retry logic
- No idempotency key support
- Event schema not versioned
- Missing webhook security (HMAC signature verification)

**Capabilities**:
- Webhook design and retry patterns
- Event schema versioning and contracts
- External service integration (APIs, databases)
- Async job handling and error recovery
- Security (HMAC verification, encrypted payloads)
- Monitoring and alerting for integration health

**Context Required**:
- @AGENTS.md for standards
- Webhook specification and external systems
- Event schema documentation
- Integration test examples

**Deliverables**:
- Webhook handlers and retry logic
- Event schema definitions
- Test suites covering retry scenarios
- Integration documentation
- `/reports/integration-<feature>.md` - Integration specifications

---

### Team 3: Testing & Quality Assurance (2 agents)
**Lead**: `qa-lead`

#### Agent 3.1: Test Engineer
**Role**: Expert in unit, integration, and E2E testing for PDF generation pipelines.

**When to Invoke**:
MUST BE USED when:
- Writing unit tests for PDF generation logic
- Creating integration tests (queue→InDesign→PDF)
- Implementing E2E tests for API endpoints
- Setting up test fixtures and mocks
- Analyzing test coverage and gaps

Blocks merge if:
- Unit test coverage <80% on modified files
- Integration test coverage <60% on critical paths
- No E2E tests for new API endpoints
- Tests fail or are skipped

**Capabilities**:
- Vitest unit testing framework
- Mock/stub external dependencies (InDesign, S3)
- Integration testing with real services
- Playwright E2E testing
- Test fixture management (sample PDFs, templates)
- Code coverage analysis
- Performance benchmarking

**Context Required**:
- @AGENTS.md for quality gates
- Test suite examples in services/
- PDF validation test fixtures
- Integration test patterns

**Deliverables**:
- Unit tests in `services/*/tests/unit/`
- Integration tests in `services/*/tests/integration/`
- E2E tests in `apps/api/tests/e2e/`
- Test fixtures and mocks
- Coverage reports
- `/reports/test-<feature>.md` - Test plan and results

**Allowed Tools**:
- Read, Write: Test files and fixtures
- Bash: Run tests, generate coverage reports
- Glob: Find test files, fixtures

**Examples**:
**Input**: "Create integration test: submit PDF job → verify queue entry → check completion"
**Output**:
- Test fixture with sample template and data
- Mock InDesign service (returns fake PDF)
- Queue integration test (Bull Redis)
- Assertion: PDF generated and stored
- Test covers success and timeout failure

---

#### Agent 3.2: Performance & Reliability Specialist
**Role**: Expert in performance optimization, load testing, and reliability engineering.

**When to Invoke**:
MUST BE USED when:
- Profiling and optimizing PDF generation speed
- Load testing queue and API
- Setting up performance monitoring/alerting
- Implementing circuit breakers and degradation strategies
- Analyzing bottlenecks (InDesign, I/O, memory)

Blocks merge if:
- Performance regressions not measured
- No load test results for capacity planning
- Memory leaks in long-running processes
- No graceful degradation on failures

**Capabilities**:
- Performance profiling (CPU, memory, I/O)
- Load testing with k6, autocannon, or Artillery
- Bottleneck identification and optimization
- Circuit breakers and retry strategies
- Monitoring and alerting setup
- Capacity planning and SLO definition

**Context Required**:
- @AGENTS.md for performance gates
- Performance benchmarking requirements
- Load test scenarios
- Monitoring tools (Prometheus, Grafana)

**Deliverables**:
- Performance benchmarks and results
- Load test scenarios and reports
- Optimization recommendations
- Monitoring configurations
- `/reports/performance-<feature>.md` - Analysis and improvements

**Allowed Tools**:
- Read, Write: Config and test files
- Bash: Run benchmarks, load tests
- Glob: Find config files

---

### Communication & Documentation (1 agent)
**Lead**: `documentation-specialist`

#### Agent 4.1: Documentation & Runbooks Specialist
**Role**: Expert in technical documentation, troubleshooting guides, and runbooks.

**When to Invoke**:
MUST BE USED when:
- Writing architecture or design documentation
- Creating troubleshooting guides for common issues
- Authoring InDesign setup and configuration docs
- Documenting template authoring process
- Creating operational runbooks (scaling, monitoring, incidents)

Blocks merge if:
- Major features lack documentation
- No troubleshooting guide for new functionality
- Setup instructions incomplete or outdated
- Critical operational knowledge not captured

**Capabilities**:
- Technical writing and documentation structure
- Architecture documentation and diagrams
- Runbook creation for operations teams
- Troubleshooting guide development
- API documentation and examples
- Change log and version history management

**Context Required**:
- @AGENTS.md for standards
- Feature specifications and implementation details
- Operational requirements and known issues
- User feedback and support tickets

**Deliverables**:
- `/docs/*.md` - Architecture, setup, troubleshooting guides
- Runbooks for common operations
- API documentation updates
- Troubleshooting guide for known issues
- `/reports/documentation-<feature>.md` - Content index

**Allowed Tools**:
- Read, Write: Documentation files
- Glob: Find existing documentation

**Examples**:
**Input**: "Create troubleshooting guide for 'InDesign timeout' errors"
**Output**:
- Root causes (script complexity, large documents, resource contention)
- Diagnostic steps (check logs, monitor resources)
- Solutions (increase timeout, optimize script, scale InDesign instances)
- Escalation path for unresolved issues
- Links to monitoring dashboards

---

## Decision Framework

### PDF Generation Architecture
- **Pipeline**: Template Load → Data Binding → InDesign Render → PDF Export → Validation → Delivery
- **Concurrency**: Use Bull queue with worker pool (tuned to InDesign licensing)
- **Caching**: Cache parsed templates, validated PDFs for duplicate data
- **Error Handling**: Structured JSON errors with trace IDs for debugging

### InDesign Integration
- **Version Support**: CC 2021+ (specify target version in commits)
- **Process Model**: Docker container per InDesign instance (no direct access)
- **Communication**: stdin/stdout with JSON protocol (not direct API)
- **Timeout**: 60s max per script execution, graceful cleanup on timeout
- **Error Reporting**: All scripts return `{ success: bool, ...result }`

### Quality & Compliance
- **Validation**: Multi-layer (syntax, rendering, OCR accuracy, A/3 compliance)
- **Accessibility**: PDF/A-3 format with embedded fonts and metadata
- **Performance**: <30s per PDF at p90, ≥100 jobs/min throughput
- **Security**: Encryption key management, webhook HMAC signing, audit logging

### Testing Strategy
- **Unit**: ≥80% coverage on services, mocked external dependencies
- **Integration**: ≥60% on critical paths, real queue/file ops in Docker
- **E2E**: API endpoints, job lifecycle, error scenarios
- **Performance**: Benchmarks for PDF generation, queue throughput, memory usage

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **api-integration-lead**: Set up Express.js structure, queue infrastructure (Bull + Redis)
2. **pdf-generation-lead**: Initialize job queue, error handling, logging framework
3. **indesign-scripting-specialist**: Set up Docker environment, test InDesign communication

### Phase 2: Core Services (Week 2)
1. **pdf-generation-specialist**: Implement queue logic, job scheduling, retries
2. **indesign-scripting-specialist**: Develop ExtendScript templates, data binding
3. **file-processing-specialist**: Build file storage layer (S3/local), cleanup jobs

### Phase 3: Quality & Integration (Week 3)
1. **pdf-quality-validation-specialist**: Implement validators (OCR, compliance, rendering)
2. **api-endpoint-developer**: Create job submission/status endpoints, webhooks
3. **test-engineer**: Write integration and E2E tests

### Phase 4: Monitoring & Optimization (Week 4)
1. **performance-specialist**: Set up dashboards, load testing, bottleneck analysis
2. **dashboard-specialist**: Build monitoring UI, real-time status views
3. **documentation-specialist**: Write setup guides, troubleshooting docs

### Phase 5: Polish & Demo (Week 5)
1. **All leads**: Final PR reviews, security audit, performance validation
2. **documentation-specialist**: Finalize runbooks and operational guides
3. **qa-lead**: Execute test suite, demo PDF generation end-to-end

---

## Success Criteria

✅ **Foundation**: Bull queue operational, InDesign Docker container running, test PDF generated
✅ **Core Services**: PDF generation <30s per document, queue throughput ≥100 jobs/min
✅ **Quality**: PDF validation passes (text accuracy ≥95%, compliance checks pass)
✅ **Integration**: API endpoints functional, webhooks retrying successfully
✅ **Monitoring**: Dashboard live, job status tracking, performance metrics visible
✅ **Testing**: Unit ≥80%, integration ≥60%, E2E covers critical paths
✅ **Documentation**: Architecture guide, InDesign setup, troubleshooting runbook published
✅ **Operability**: Cleanup jobs run, temp files cleaned daily, memory leaks investigated
✅ **Security**: No secrets in repo, webhook HMAC verification, audit logging enabled
✅ **Demo Ready**: End-to-end PDF generation demo, performance benchmarks, screenshots

---

## Quality Gates & Enforcement

### Blocking Conditions (Fail CI)
- ❌ Unit test coverage <80% on modified files
- ❌ TypeScript errors or type mismatches
- ❌ Linting failures (ESLint)
- ❌ ExtendScript validation fails (`pnpm validate:scripts`)
- ❌ PDF quality validation fails (OCR accuracy, compliance checks)
- ❌ Integration test failures on queue/InDesign/validation paths
- ❌ Secrets detected in code or commits
- ❌ Performance regression >10% on PDF generation time

### Enforcement Tools
- **Pre-commit**: husky hook runs lint, type check, secrets scan
- **CI Pipeline**: GitHub Actions runs full test suite, PDF validation, security audit
- **Code Review**: Require 1+ approval from domain lead before merge
- **Performance**: Benchmark on merge (compare to baseline, fail if regression >10%)

---

## Agent Coordination Rules

1. **Orchestrator-only planning**: pdf-generation-lead owns architecture decisions, phases
2. **No implementation overlap**: Clear ownership per agent (InDesign scripts = specialist, queues = generator specialist)
3. **Dependencies mapped**: File processor depends on queue, validator depends on file processor
4. **Test coverage required**: No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory**: Every template, endpoint, ExtendScript file documented
6. **Least-privilege tools**: UI agents (dashboard) don't access Bash; infrastructure agents (InDesign bridge) do
7. **Tracing & Observability**: All agents log with trace IDs, job IDs for correlation

---

## Common Issues & Troubleshooting

### InDesign Timeouts
**Symptom**: Jobs timeout after 60s with TIMEOUT error
**Causes**: Complex template, large document, resource contention
**Solutions**:
- Check `/reports/performance-analysis.md` for bottlenecks
- Optimize script (reduce DOM traversals, cache selections)
- Increase InDesign instance resources or pool size
- See `/docs/TROUBLESHOOTING.md` for detailed steps

### PDF Validation Failures
**Symptom**: OCR text accuracy <95%, fonts missing
**Causes**: InDesign rendering issues, font embedding, corrupt PDF
**Solutions**:
- Validate InDesign version matches template requirements
- Check font availability in Docker container
- Review PDFValidator logs for specific failures
- See `/docs/TEMPLATES.md` for best practices

### Disk Space Exhaustion
**Symptom**: "No space left on device" errors
**Causes**: Temp files not cleaned, PDFs not garbage collected
**Solutions**:
- Verify cleanup job running: `pnpm cleanup:logs`
- Check temp directory: `du -sh /tmp/pdf-*`
- Increase cleanup frequency if needed
- See `/docs/TROUBLESHOOTING.md` for recovery steps

---

## References

- `/docs/ARCHITECTURE.md` - System design and pipeline
- `/docs/INDESIGN_SETUP.md` - InDesign environment setup
- `/docs/API.md` - API endpoint specifications
- `/docs/TEMPLATES.md` - Template authoring guide
- `/docs/PIPELINE.md` - PDF generation workflow
- `/docs/TROUBLESHOOTING.md` - Common issues and solutions
- CLAUDE_ENABLEMENT_BEST_PRACTICES.md - Agent setup guidelines
