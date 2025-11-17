# PDF Orchestrator - Agent Template

This directory contains a complete AGENTS.md template for the **PDF Orchestrator** repository, an enterprise-grade PDF generation and orchestration platform using InDesign as the rendering engine.

## Quick Start

### Using This Template in Your Repository

1. **Copy the files to your repo**:
   ```bash
   cp CLAUDE.md /path/to/pdf-orchestrator/
   cp AGENTS.md /path/to/pdf-orchestrator/
   ```

2. **Customize as needed**:
   - Update project-specific paths and file locations
   - Adjust tech stack if using different technologies (e.g., RabbitMQ instead of Bull)
   - Modify quality gates to match your standards

3. **Test with Claude Code**:
   ```bash
   cd /path/to/pdf-orchestrator
   claude code "Build PDF generation queue with retry logic"
   ```

## Template Contents

### CLAUDE.md
- Minimal file that references `@AGENTS.md`
- Allows Claude Code to load the full agent definition

### AGENTS.md
- **Project Overview**: Tech stack (Node.js, ExtendScript, TypeScript, Express.js)
- **Build & Test Commands**: Standard pnpm commands for dev, test, build
- **Architecture Overview**: Directory structure with service descriptions
- **Safety Constraints**: NEVER/ALWAYS rules specific to PDF orchestration
- **Quality Gates**: Unit/integration test coverage, PDF validation, performance SLOs
- **Agent Team Structure**: 4 multi-agent teams (10 total agents)
  - **Team 1**: PDF Generation & Orchestration (4 agents)
  - **Team 2**: API & Integration (3 agents)
  - **Team 3**: Testing & QA (2 agents)
  - **Team 4**: Documentation (1 agent)
- **Decision Framework**: Architecture choices and conventions
- **Orchestration Workflow**: 5-phase implementation plan
- **Success Criteria**: Acceptance criteria for launch

## Agent Descriptions

### Team 1: PDF Generation & Orchestration

**1. PDF Generation Specialist**
- Role: Node.js PDF orchestration, job queues, pipeline architecture
- Triggers: Queue logic, endpoints, concurrency, InDesign instance management
- Key files: `services/pdf-generator/src/engine/*`, `services/pdf-generator/src/queue/*`

**2. InDesign Scripting Specialist**
- Role: ExtendScript, InDesign server automation, document lifecycle
- Triggers: Writing/modifying .jsx files, rendering issues, template binding
- Key files: `services/indesign-bridge/scripts/*.jsx`, `services/indesign-bridge/src/`

**3. PDF Quality Validation Specialist**
- Role: PDF validation, OCR, rendering checks, compliance verification
- Triggers: Quality checks, OCR accuracy, A/3 compliance, debugging
- Key files: `services/pdf-validator/src/checks/*`, `services/pdf-validator/src/ocr/*`

**4. File Processing & Storage Specialist**
- Role: File handling, temp file management, S3/local storage
- Triggers: Upload/download endpoints, cleanup jobs, storage integration
- Key files: `services/file-processor/src/storage/*`, `services/file-processor/src/cleanup/*`

### Team 2: API & Integration

**1. API Endpoint Developer**
- Role: Express.js, REST API design, validation, authentication
- Triggers: Creating endpoints, validation schemas, auth middleware
- Key files: `apps/api/src/routes/*`, `apps/api/src/controllers/*`

**2. Dashboard & Monitoring Specialist**
- Role: React dashboards, real-time monitoring, data visualization
- Triggers: UI components, job monitoring, charts, error views
- Key files: `apps/web/src/components/*`, `apps/web/src/pages/*`

**3. Integration & Webhook Specialist**
- Role: Webhook handling, external integration, async communication
- Triggers: Callback implementation, integration issues, event design
- Key files: Webhook handlers, event schemas

### Team 3: Testing & QA

**1. Test Engineer**
- Role: Unit, integration, E2E testing for PDF pipelines
- Triggers: Writing tests, coverage analysis, test fixtures
- Key files: `*/tests/unit/*`, `*/tests/integration/*`, `apps/api/tests/e2e/*`

**2. Performance & Reliability Specialist**
- Role: Performance profiling, load testing, reliability engineering
- Triggers: Optimization, load testing, bottleneck analysis, monitoring
- Key files: Performance benchmarks, load test scenarios

### Team 4: Documentation

**1. Documentation & Runbooks Specialist**
- Role: Technical documentation, troubleshooting guides, runbooks
- Triggers: Architecture docs, setup guides, troubleshooting
- Key files: `/docs/*.md`, runbooks, API documentation

## Architecture Highlights

### Pipeline Flow
```
Template Load → Data Binding → InDesign Render → PDF Export → Validation → Delivery
```

### Key Components
- **PDF Generator Service**: Orchestrates job queue, manages InDesign instances
- **InDesign Bridge**: ExtendScript communication with document lifecycle
- **Queue System**: Bull (Redis) with retry logic and DLQ
- **File Processor**: Template inputs, generated PDFs, cleanup
- **PDF Validator**: Quality checks (OCR, rendering, compliance)
- **API Server**: REST endpoints for job submission, status, download
- **Dashboard**: Real-time monitoring, template management, history

## Safety Constraints

### Critical Rules
- ❌ Never modify secrets or environment variables directly
- ❌ Never push directly to main/master without PR review
- ❌ Never skip tests before committing
- ❌ Never execute InDesign scripts outside Docker
- ✅ Always validate ExtendScript files before committing
- ✅ Always verify PDF output with tests after template changes
- ✅ Always implement file cleanup to prevent disk exhaustion

## Quality Gates

- **Unit Tests**: ≥80% coverage
- **Integration Tests**: ≥60% on critical paths (queue→InDesign→PDF)
- **PDF Quality**: Text accuracy ≥95%, compliance checks pass
- **Performance**: PDF generation <30s per document
- **Security**: No secrets in repo, HMAC webhook signing

## Orchestration Workflow

### 5-Phase Implementation Plan

1. **Phase 1 (Week 1)**: Foundation
   - Set up Express.js structure, Bull queue infrastructure
   - Initialize Docker environment for InDesign
   - Establish logging and error handling framework

2. **Phase 2 (Week 2)**: Core Services
   - Implement queue logic with retries and DLQ
   - Develop ExtendScript templates and data binding
   - Build file storage layer with cleanup jobs

3. **Phase 3 (Week 3)**: Quality & Integration
   - Implement PDF validators (OCR, rendering, compliance)
   - Create job submission/status endpoints
   - Write integration and E2E tests

4. **Phase 4 (Week 4)**: Monitoring & Optimization
   - Set up monitoring dashboards
   - Load testing and bottleneck analysis
   - Write operational runbooks

5. **Phase 5 (Week 5)**: Polish & Demo
   - Final PR reviews and security audit
   - Finalize documentation
   - Execute test suite and demo

## Common Issues

### InDesign Timeouts
- Complex templates, large documents, resource contention
- Solution: Optimize scripts, increase resources, scale instances
- See `/docs/TROUBLESHOOTING.md`

### PDF Validation Failures
- InDesign rendering issues, font embedding, corrupt PDFs
- Solution: Validate versions, check fonts, review logs
- See `/docs/TEMPLATES.md`

### Disk Space Exhaustion
- Temp files not cleaned, PDFs not garbage collected
- Solution: Verify cleanup job, increase frequency
- See `/docs/TROUBLESHOOTING.md`

## Customization Guide

### Adjust for Different Tech Stack

**Using RabbitMQ instead of Bull**:
```markdown
Change in AGENTS.md:
- "Bull/RabbitMQ queue design" → "RabbitMQ queue design"
- Replace Bull-specific references with RabbitMQ API docs
- Update test examples to use RabbitMQ test helpers
```

**Using different PDF library (e.g., PyPDF2)**:
```markdown
Adjust PDF Validator agent:
- Replace PDF.js with chosen library
- Update OCR integration points
- Modify validation check examples
```

**Different cloud storage (e.g., Azure Blob, GCS)**:
```markdown
Update File Processing specialist:
- Add appropriate SDK documentation
- Modify storage examples
- Include provider-specific configuration
```

## Integration with Existing Repos

This template follows the CLAUDE_ENABLEMENT_BEST_PRACTICES.md standard, making it compatible with:
- TEEI-CSR-Platform agent orchestration patterns
- Multi-agent delegation workflows
- Decision frameworks for leads
- Least-privilege tooling guidelines

## References

- **CLAUDE_ENABLEMENT_BEST_PRACTICES.md** - Agent setup guidelines
- **AGENTS.md** - Full agent definitions (this file)
- **/docs/ARCHITECTURE.md** - System design (create in your repo)
- **/docs/INDESIGN_SETUP.md** - Environment setup (create in your repo)
- **/docs/TROUBLESHOOTING.md** - Common issues (create in your repo)

## Version History

- **v1.0** (2025-11-17): Initial template with 10 agents across 4 teams, complete AGENTS.md
