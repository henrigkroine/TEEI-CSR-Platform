# Apollo-AI-Outreach Multi-Agent Orchestration

## CRITICAL NOTICE: Ecosystem C Isolation Boundary

**⚠️ THIS REPOSITORY FORMS THE ISOLATION BOUNDARY BETWEEN YPAI AND TEEI ORGANIZATIONS ⚠️**

Apollo-AI-Outreach is **THE SINGLE SOURCE OF TRUTH** for org_id isolation between two discrete customer organizations.
Every line of code, every database query, every API endpoint MUST enforce organization isolation.
Data leakage between organizations is a **CRITICAL SECURITY INCIDENT**.

---

## Project Overview

**Repository**: `apollo-ai-outreach`
**Type**: TypeScript Backend Service
**Database**: PostgreSQL
**Primary Role**: AI-driven outreach and engagement orchestration with strict cross-org isolation
**Criticality Level**: 🔴 **CRITICAL** (Security & Data Integrity)
**Ecosystem**: C (YPAI ↔ TEEI Isolation Boundary)

### Mission

Provide secure, org-isolated AI-powered outreach orchestration between YPAI (Young Professional AI) and TEEI (Tech Education Excellence Initiative)
with zero tolerance for cross-organization data leakage, comprehensive audit trails, and deterministic isolation enforcement.

### Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Apollo-AI-Outreach Service                   │
│                   (Ecosystem C Boundary Layer)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Request → AuthZ & OrgID Extract → Isolation Valve              │
│                      ↓                                           │
│              (FAIL FAST if org_id missing)                      │
│                      ↓                                           │
│  PostgreSQL Query Execution (all queries scoped to org_id)      │
│                      ↓                                           │
│  Response → OrgID Validation → AuditLog Entry                   │
│                      ↓                                           │
│            (REJECT if response touches other org)               │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Org 1 (YPAI)    │ Isolation Barrier │    Org 2 (TEEI)         │
└─────────────────────────────────────────────────────────────────┘
```

Every request flows through three isolation checkpoints:
1. **Ingress**: AuthZ extracts org_id; FAIL FAST if absent
2. **Query**: WHERE org_id = $extracted_org_id on ALL queries
3. **Egress**: Validate every response record belongs to org_id

---

## Build & Test Commands

### Development

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development server (with hot reload)
npm run dev

# TypeScript type-check
npm run typecheck

# Linting (ESLint)
npm run lint
npm run lint:fix

# Code formatting (Prettier)
npm run format
npm run format:check
```

### Testing

```bash
# Run all unit tests
npm run test

# Unit tests with coverage (MUST be ≥85%)
npm run test:coverage

# Integration tests (org isolation scenarios)
npm run test:integration

# E2E tests (cross-org leak detection)
npm run test:e2e

# Security audit (npm audit + OWASP checks)
npm run audit

# Org isolation validation suite (NON-NEGOTIABLE)
npm run test:isolation

# Pre-commit validation
npm run validate
```

### Database

```bash
# Run migrations
npm run db:migrate

# Seed test data (with org boundaries)
npm run db:seed

# Reset database (DEV ONLY)
npm run db:reset

# Validate schema isolation constraints
npm run db:validate-isolation
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start

# Health check endpoint
curl http://localhost:3000/health
```

---

## Architecture Summary

### Service Structure

```
apollo-ai-outreach/
├── src/
│   ├── auth/
│   │   ├── extractOrgId.ts          (CRITICAL: org_id extraction)
│   │   ├── validateOrgId.ts         (CRITICAL: org_id validation)
│   │   └── orgIsolationMiddleware.ts (CRITICAL: isolation gate)
│   ├── db/
│   │   ├── client.ts
│   │   ├── migrations/              (ALL have org_id scope)
│   │   └── seeds/
│   ├── routes/
│   │   ├── health.ts
│   │   ├── outreach.ts              (CRITICAL: isolation enforced)
│   │   ├── campaigns.ts             (CRITICAL: isolation enforced)
│   │   ├── engagements.ts           (CRITICAL: isolation enforced)
│   │   └── audit-logs.ts            (CRITICAL: audit trail)
│   ├── services/
│   │   ├── outreachService.ts       (CRITICAL: org-scoped queries)
│   │   ├── campaignService.ts       (CRITICAL: org-scoped queries)
│   │   └── auditService.ts          (CRITICAL: logging all ops)
│   ├── models/
│   │   ├── Campaign.ts              (has org_id PK component)
│   │   ├── Outreach.ts              (has org_id PK component)
│   │   └── AuditLog.ts
│   ├── middleware/
│   │   ├── orgIsolation.ts          (CRITICAL: enforce isolation)
│   │   ├── audit.ts                 (CRITICAL: audit all ops)
│   │   └── errorHandler.ts
│   ├── types/
│   │   ├── org.ts                   (org isolation types)
│   │   └── audit.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── errors.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── auth.test.ts
│   │   ├── isolation.test.ts        (CRITICAL)
│   │   └── services.test.ts
│   ├── integration/
│   │   └── isolation-scenarios.test.ts (CRITICAL)
│   └── e2e/
│       └── cross-org-leak-detection.test.ts (CRITICAL)
├── db/
│   ├── schema.sql                   (WITH org_id constraints)
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── ISOLATION-SPECIFICATION.md   (NON-NEGOTIABLE)
│   ├── ORG-ID-HANDLING.md           (CRITICAL)
│   └── AUDIT-TRAIL-DESIGN.md        (CRITICAL)
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── AGENTS.md (this file)
```

### Org Isolation Architecture

**NON-NEGOTIABLE Principles**:

1. **Every database table has `org_id` as part of primary key or unique constraint**
   ```sql
   CREATE TABLE campaigns (
     id UUID,
     org_id UUID NOT NULL,
     name VARCHAR(255),
     created_at TIMESTAMP,
     PRIMARY KEY (org_id, id),  -- org_id FIRST
     CHECK (org_id IS NOT NULL)  -- FAIL FAST
   );
   ```

2. **Every query MUST include `WHERE org_id = $1` (first parameter)**
   ```typescript
   async function getCampaign(orgId: string, campaignId: string) {
     return db.query(
       'SELECT * FROM campaigns WHERE org_id = $1 AND id = $2',
       [orgId, campaignId]  // orgId ALWAYS first
     );
   }
   ```

3. **Every API endpoint MUST extract and validate org_id BEFORE query**
   ```typescript
   router.get('/campaigns/:id',
     extractOrgIdMiddleware,     // FIRST
     validateOrgIdMiddleware,    // SECOND
     async (req, res) => {       // THEN handler
       const { orgId } = req.orgContext;
       const campaign = await campaignService.getCampaign(orgId, req.params.id);
       res.json(campaign);
     }
   );
   ```

4. **Every response MUST be validated to belong to extracted org_id**
   ```typescript
   async function sendCampaign(data: any, orgId: string) {
     validateResponseOrgId(data, orgId);  // FAIL if mismatch
     res.json(data);
   }
   ```

5. **ALL database changes MUST be audit logged with org_id**
   ```typescript
   await auditService.log({
     org_id: orgId,
     entity_type: 'campaign',
     operation: 'CREATE',
     record_id: campaignId,
     timestamp: new Date(),
     user_id: userId
   });
   ```

---

## ⚠️ CRITICAL SAFETY CONSTRAINTS (NON-NEGOTIABLE)

**BLOCKING CONDITIONS** - Any violation is an instant merge blocker and must be escalated immediately:

### 1. Org Isolation Enforcement (ZERO TOLERANCE)

❌ **FAIL MERGE if**:
- ANY route handler missing `extractOrgIdMiddleware`
- ANY database query missing `WHERE org_id = ...` clause
- ANY query using org_id AFTER positional params (MUST be $1)
- ANY response record lacking org_id validation before JSON send
- ANY table missing org_id in PRIMARY KEY or UNIQUE constraint
- Org isolation test coverage < **95%** (NOT 80%, NOT 85% - 95%)
- ANY test passing org_id as non-first parameter
- ANY hardcoded org_id string in code (BANNED - extract from request context)
- ANY cross-org query pattern detected (SELECT ... JOIN ... with different orgs)

### 2. Audit Trail Enforcement (MANDATORY)

❌ **FAIL MERGE if**:
- ANY CREATE/UPDATE/DELETE operation NOT logged to audit_logs
- Audit log missing: org_id, entity_type, operation, record_id, user_id, timestamp
- Audit entries missing in test coverage for mutation endpoints
- Audit service NOT called before response is sent

### 3. Authentication & Authorization (MANDATORY)

❌ **FAIL MERGE if**:
- Request handler NOT protected by auth middleware
- Org_id NOT extracted from JWT claims or headers
- Missing validation that user_id belongs to extracted org_id
- Any endpoint accepting org_id as request parameter (MUST be extracted only)
- No RBAC enforcement for sensitive operations (admin-only, write-only)

### 4. Database Schema Isolation (MANDATORY)

❌ **FAIL MERGE if**:
- New table created WITHOUT org_id in PRIMARY KEY
- Existing table altered without backfilling org_id WHERE NULL
- Foreign key constraint NOT including org_id component
- No database-level CHECK constraint (org_id IS NOT NULL)
- Migration missing rollback instructions
- NO test validating that org_id constraint is enforced at DB level

### 5. Error Handling & Logging (MANDATORY)

❌ **FAIL MERGE if**:
- Errors logged with user input (PII risk) without redaction
- Org_id NOT included in all error logs for audit trail
- Generic 404 responses NOT masking org isolation violations
- No rate limiting per org_id to prevent org enumeration attacks
- Stack traces exposed in error responses (information leak)

### 6. Testing Coverage (NON-NEGOTIABLE)

❌ **FAIL MERGE if**:
- Org isolation tests < **95%** coverage (measured by: test branches that explicitly validate isolation)
- No test attempting cross-org query injection (negative test)
- No test for: org_id missing → 403 response
- No test for: malformed org_id → 400 response
- No test for: user from Org A accessing Org B data → 403 + audit log
- No integration test simulating concurrent requests from different orgs
- No E2E test for: bulk operations maintaining org isolation
- Unit tests NOT using fixtures with explicit org_id boundaries

### 7. Secrets & Configuration (ZERO TOLERANCE)

❌ **FAIL MERGE if**:
- Database password in .env file committed to repo (MUST use Vault)
- JWT secret hardcoded (MUST use external Secret Manager)
- org_id examples or test data containing real customer IDs
- Encryption keys committed to repo
- API keys for external services in code

### 8. Performance & Security (MANDATORY)

❌ **FAIL MERGE if**:
- No index on (org_id, id) for tables with frequent lookups
- Query execution time > 500ms for org_id-scoped queries
- Missing prepared statements (SQL injection risk)
- N+1 queries discovered in load tests
- No connection pooling for PostgreSQL
- Rate limiting NOT enforced per org_id

---

## Quality Gates & Enforcement

### Pre-Commit Validation

```bash
npm run validate
```

**MUST PASS**:
1. TypeScript compilation (0 errors)
2. ESLint (0 errors, not warnings)
3. Unit tests: ≥85% coverage
4. Org isolation tests: **≥95%** coverage (CRITICAL)
5. No committed .env files, secrets, API keys
6. No SQL injection patterns detected
7. No hardcoded org_ids

### CI/CD Pipeline

```
┌─────────────────────────────────────────┐
│  Push to Branch                         │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  1. Lint & Type Check                   │
│     npm run typecheck && npm run lint   │
│     ⏱️  Timeout: 5 min                  │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  2. Unit Tests (≥85% coverage)          │
│     npm run test:coverage               │
│     ⏱️  Timeout: 10 min                 │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  3. ORG ISOLATION TESTS (≥95% coverage) │ ◄─── CRITICAL GATE
│     npm run test:isolation              │
│     ⏱️  Timeout: 15 min                 │
│     ❌ BLOCKS MERGE IF ANY TEST FAILS   │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  4. Integration Tests                   │
│     npm run test:integration            │
│     ⏱️  Timeout: 10 min                 │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  5. Security Audit                      │
│     npm run audit                       │
│     ⏱️  Timeout: 5 min                  │
│     ❌ BLOCKS MERGE IF VULNERABILITIES  │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  6. E2E Tests (cross-org leak detection)│
│     npm run test:e2e                    │
│     ⏱️  Timeout: 20 min                 │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  ✅ PASS → Ready for Code Review        │
│  ❌ FAIL → Block & Escalate to Lead     │
└─────────────────────────────────────────┘
```

### PR Review Checklist (MANDATORY)

**Every PR must include**:

- [ ] Org isolation changes documented in PR description
- [ ] All new endpoints have `extractOrgIdMiddleware`
- [ ] All queries use `WHERE org_id = $1` as first clause
- [ ] Response validation for org_id ownership added
- [ ] Audit log entries created for mutations
- [ ] Unit tests cover ≥95% isolation scenarios
- [ ] No hardcoded org_ids or customer data
- [ ] Database schema changes include org_id constraints
- [ ] No secrets, API keys, or passwords committed
- [ ] TypeScript strict mode enabled on all new files
- [ ] Error messages do NOT leak organization data

---

## Recommended Agent Team Structure

### Tech Lead Orchestrator: `ecosystem-c-lead`

**Responsibilities**:
- Own Ecosystem C isolation specification
- Unblock team on org isolation architecture decisions
- Escalate security violations immediately
- Maintain /docs/ISOLATION-SPECIFICATION.md
- Conduct isolation architecture reviews on all PRs
- Weekly security audit of isolation implementation
- Coordinates communication with YPAI + TEEI security teams

---

### Agent 1: `ecosystem-isolation-specialist` (CRITICAL ROLE)

**Expertise**: Cross-org isolation, org_id handling, isolation testing, audit trails

**Responsibilities**:
- Design and implement `orgIsolationMiddleware.ts`
- Create `extractOrgIdMiddleware.ts` and `validateOrgIdMiddleware.ts`
- Implement response validation (`validateResponseOrgId`)
- Create org isolation test suite (≥95% coverage)
- Write E2E tests for cross-org leak detection
- Conduct security audits on org isolation enforcement
- **BLOCKING**: Must review and approve ALL changes touching isolation logic
- Document isolation patterns in /docs/ORG-ID-HANDLING.md

**Must Know**:
- Database isolation patterns (org_id in PK, foreign keys with org_id)
- JWT token structure and org_id claim extraction
- Row-level security (RLS) concepts
- SQL injection prevention with parameterized queries
- Testing isolation scenarios (negative tests)

**Quality Gate Ownership**: ≥95% org isolation test coverage

---

### Agent 2: `database-schema-engineer`

**Expertise**: PostgreSQL, schema design, migrations, org isolation constraints

**Responsibilities**:
- Design database schema with org_id isolation (PRIMARY KEY includes org_id)
- Create migrations ensuring org_id is ALWAYS present
- Implement database-level CHECK constraints (org_id IS NOT NULL)
- Add indexes on (org_id, id) for performance
- Validate foreign key constraints include org_id
- Create seed data with org boundaries (Org A and Org B)
- Build `db:validate-isolation` script to verify schema compliance
- **BLOCKING**: Must review and approve ALL schema changes

**Prevents**:
- Tables created without org_id in PK
- Queries missing org_id scope at database level
- N+1 queries on org-scoped lookups

---

### Agent 3: `auth-and-rbac-engineer`

**Expertise**: JWT, OAuth2, RBAC, org-scoped authorization

**Responsibilities**:
- Extract org_id from JWT claims or headers
- Validate user_id belongs to extracted org_id
- Implement RBAC per operation (CREATE, UPDATE, DELETE require elevated roles)
- Build secret management integration (Vault, AWS Secrets Manager)
- Create org context middleware (`req.orgContext = { orgId, userId, role }`)
- Implement rate limiting per org_id
- Build role-based audit logging
- **BLOCKING**: Must review and approve ALL auth/authz changes

**Prevents**:
- Requests without org_id
- Users from Org A impersonating Org B
- Hardcoded secrets

---

### Agent 4: `audit-and-compliance-engineer`

**Expertise**: Audit logging, compliance, forensics, data lineage

**Responsibilities**:
- Implement comprehensive audit logging service
- Create audit_logs table: (org_id, entity_type, operation, record_id, user_id, timestamp, changes_json)
- Ensure EVERY mutation (CREATE/UPDATE/DELETE) is logged
- Build audit log API endpoint with org_id filtering
- Create audit report generation (`npm run audit:report`)
- Implement immutable audit log storage (append-only)
- Redact PII from logs before persistence
- **BLOCKING**: Must review and approve ALL audit-related changes

**Prevents**:
- Untracked mutations
- Data changes without user attribution
- PII leakage in logs

---

### Agent 5: `integration-and-api-engineer`

**Expertise**: API design, HTTP, response handling, error codes

**Responsibilities**:
- Implement REST endpoints with org isolation middleware
- Design API contract with org_id implicit (never in request body)
- Implement response validation middleware
- Create error response standards (403 for org isolation violations)
- Build API documentation with isolation examples
- Implement request/response logging (scrubbed of PII)
- Create OpenAPI spec with org context example
- **BLOCKING**: Must review and approve ALL route/endpoint changes

**Prevents**:
- Endpoints missing org isolation middleware
- Information leakage in error messages
- API contracts allowing org_id as parameter

---

### Agent 6: `test-and-security-engineer`

**Expertise**: Unit testing, integration testing, E2E testing, security testing, OWASP

**Responsibilities**:
- Create org isolation test suite (unit, integration, E2E)
- Build test fixtures with explicit org boundaries (Org A, Org B)
- Implement negative tests (cross-org access → 403)
- Write E2E test for concurrent requests from different orgs
- Implement SQL injection test suite
- Create load tests to detect N+1 queries
- Build security audit CI job
- Implement vulnerability scanning (npm audit, OWASP dependency check)
- **BLOCKING**: Must verify ≥95% org isolation test coverage before merge

**Test Categories** (MUST ALL PASS):
1. Unit: org_id extraction, validation, middleware logic
2. Integration: end-to-end query flow with isolation
3. E2E: cross-org leak detection, concurrent requests
4. Negative: org_id missing, invalid, cross-org access
5. Load: isolation under stress, rate limiting
6. Security: SQL injection, info leakage, secret exposure

---

### Agent 7: `documentation-and-runbooks`

**Expertise**: Technical writing, architecture docs, runbooks, incident response

**Responsibilities**:
- Maintain /docs/ISOLATION-SPECIFICATION.md (canonical reference)
- Create /docs/ORG-ID-HANDLING.md (how-to guide for devs)
- Build /docs/AUDIT-TRAIL-DESIGN.md (audit architecture)
- Write runbook: "Incident: Suspected Cross-Org Data Leak"
- Create developer onboarding guide emphasizing isolation
- Build architecture diagrams (isolation boundary, request flow)
- Document all custom error codes and messages
- Maintain CHANGELOG with isolation-related changes

**Templates to Create**:
- Route handler template with isolation middleware
- Database migration template with org_id enforcement
- Test template for org isolation scenarios
- Audit log query examples

---

## Delivery Slices (D1–D4)

### Slice D1: Foundation & Auth (Week 1)
**Lead**: `ecosystem-c-lead` + `ecosystem-isolation-specialist` + `auth-and-rbac-engineer`

**Deliverables**:
- ✅ `extractOrgIdMiddleware.ts` - extract org_id from JWT/headers
- ✅ `validateOrgIdMiddleware.ts` - reject if org_id missing
- ✅ `orgIsolationMiddleware.ts` - scope requests to org_id
- ✅ Auth routes protected with org extraction
- ✅ JWT secret management (Vault integration)
- ✅ RBAC enforcement (admin, editor, viewer roles)
- ✅ Unit tests: ≥95% auth/middleware coverage
- ✅ /docs/ORG-ID-HANDLING.md published

**Quality Gate**: All auth/authz unit tests passing, 0 hardcoded secrets

**Blocking PR merge if**: Any middleware missing, org_id not extracted first

---

### Slice D2: Database & Schema (Week 1)
**Lead**: `ecosystem-c-lead` + `database-schema-engineer` + `audit-and-compliance-engineer`

**Deliverables**:
- ✅ Database schema with org_id in PRIMARY KEY for all tables
- ✅ Migrations: users, campaigns, outreaches, audit_logs, engagement_events
- ✅ Database-level CHECK constraints (org_id IS NOT NULL)
- ✅ Foreign key constraints include org_id
- ✅ Indexes on (org_id, id) for frequent queries
- ✅ Seed data with Org A (YPAI) and Org B (TEEI) boundaries
- ✅ `db:validate-isolation` script (validates schema compliance)
- ✅ Integration tests: org_id scope enforced at DB level

**Quality Gate**: Schema passes validation script, no tables missing org_id PK

**Blocking PR merge if**: New table without org_id in PK, FK constraint missing org_id

---

### Slice D3: API & Service Layer (Week 2)
**Lead**: `ecosystem-c-lead` + `integration-and-api-engineer` + `ecosystem-isolation-specialist`

**Deliverables**:
- ✅ REST endpoints: GET/POST/PUT/DELETE campaigns, outreaches, engagements
- ✅ ALL endpoints protected with `extractOrgIdMiddleware` + `validateOrgIdMiddleware`
- ✅ ALL queries use `WHERE org_id = $1` (org_id as $1 parameter)
- ✅ Response validation middleware (`validateResponseOrgId`)
- ✅ Error responses: 403 for org isolation violations, 401 for missing auth
- ✅ Service layer methods: `campaignService.getCampaign(orgId, campaignId)`
- ✅ API documentation with isolation examples (OpenAPI/Swagger)
- ✅ Unit tests: ≥85% coverage on service layer
- ✅ Integration tests: ≥90% coverage on API endpoints

**Quality Gate**: All endpoints tested with org isolation, response validation enforced

**Blocking PR merge if**: Missing middleware, org_id not $1, response validation missing

---

### Slice D4: Audit Trail & Testing (Week 2)
**Lead**: `ecosystem-c-lead` + `audit-and-compliance-engineer` + `test-and-security-engineer`

**Deliverables**:
- ✅ Audit logging service: logs all CREATE/UPDATE/DELETE operations
- ✅ Audit log schema: org_id, entity_type, operation, record_id, user_id, timestamp, changes_json
- ✅ Audit log API endpoint with org_id filtering
- ✅ Pre/post-mutation audit hook in all service methods
- ✅ PII redaction in audit logs before persistence
- ✅ Org isolation test suite: ≥95% coverage (unit + integration)
- ✅ Negative tests: missing org_id, invalid org_id, cross-org access
- ✅ E2E tests: concurrent requests from different orgs
- ✅ SQL injection test suite
- ✅ Load test: isolation under stress
- ✅ Security audit CI job: npm run audit (BLOCKING)
- ✅ /docs/AUDIT-TRAIL-DESIGN.md published
- ✅ /docs/ISOLATION-SPECIFICATION.md published (canonical reference)

**Quality Gate**: ≥95% org isolation test coverage, security audit passing, 0 vulnerabilities

**Blocking PR merge if**: Org isolation tests < 95%, audit logs missing, security audit fails

---

## Quality Gates Summary

| Gate | Requirement | Enforcement |
|------|------------|-------------|
| **Org Isolation Tests** | ≥95% coverage | ❌ BLOCKS MERGE |
| **Unit Tests** | ≥85% coverage | ❌ BLOCKS MERGE |
| **TypeScript** | 0 compilation errors | ❌ BLOCKS MERGE |
| **ESLint** | 0 errors (warnings OK) | ❌ BLOCKS MERGE |
| **Security Audit** | 0 vulnerabilities | ❌ BLOCKS MERGE |
| **Middleware** | All routes protected | ❌ BLOCKS MERGE |
| **Org ID as $1** | ALL queries | ❌ BLOCKS MERGE |
| **Response Validation** | ALL endpoints | ❌ BLOCKS MERGE |
| **Audit Logs** | ALL mutations logged | ❌ BLOCKS MERGE |
| **Database Constraints** | org_id in PK/UK | ❌ BLOCKS MERGE |
| **Secrets** | None in repo | ❌ BLOCKS MERGE |

---

## Communication Protocol

### Daily Standup (30 mins, 9 AM)
- `ecosystem-c-lead` facilitates
- Each agent reports: completed, blocked, next
- **Escalation rule**: Any isolation violation escalated immediately to lead
- **Blocker rule**: Lead unblocks within 2 hours or escalates to CISO

### PR Review Process (MANDATORY)
1. **Author** creates PR with isolation checklist completed
2. **Ecosystem Isolation Specialist** reviews isolation logic first (BLOCKING review)
3. **Database Engineer** reviews schema changes
4. **Auth Engineer** reviews auth/authz changes
5. **Audit Engineer** reviews audit logging
6. **Test Engineer** verifies ≥95% isolation test coverage
7. **Lead** approves after all BLOCKING reviews complete
8. **Merge**: Only after ALL quality gates pass

### Escalation Path
1. **Agent blocked** (>30 mins) → Lead (immediate)
2. **Test failure** → Lead (immediate)
3. **Security audit failure** → CISO + Lead (immediate)
4. **Org isolation violation** → CISO + Lead (CRITICAL - stop everything)

### Weekly Sync
- Review isolation metrics (test coverage %, incident count)
- Discuss architecture questions (lead-led)
- Audit recent PRs for isolation patterns
- Update /reports/apollo-ai-outreach-readout.md

---

## Agent Coordination Rules

### NON-NEGOTIABLE

1. **Ecosystem Isolation Specialist is BLOCKING reviewer on ALL PRs**
   - No exceptions
   - Reviews isolation middleware, org_id extraction, response validation
   - Can veto any change that violates isolation patterns

2. **Org isolation tests MUST reach ≥95% coverage**
   - NOT 85%, NOT 90% - exactly **95%** or reject PR
   - Test branches cover: missing org_id, invalid org_id, cross-org access, valid access

3. **No implementation without test first** (TDD)
   - Write org isolation test → implement feature → verify test passes
   - Applies to: middleware, queries, endpoints, audit logging

4. **No hardcoded org_ids**
   - BANNED: `WHERE org_id = 'abc123-def456'`
   - REQUIRED: `WHERE org_id = $1` with extracted from context

5. **All database changes require migration + rollback**
   - Schema changes must include up() and down() methods
   - Migrations must backfill org_id where applicable
   - Test data must use explicit org boundaries (Org A, Org B)

6. **Secrets are Vault-managed, never committed**
   - .env files: Git-ignored
   - Migrations: No hardcoded passwords
   - Config: Use environment variables

7. **Documentation is code**
   - /docs/ISOLATION-SPECIFICATION.md is canonical reference (updated with every isolation change)
   - /docs/ORG-ID-HANDLING.md is developer guide
   - /docs/AUDIT-TRAIL-DESIGN.md documents audit architecture
   - All templates must include isolation examples

8. **Incidents are postmortems**
   - Cross-org data leak → full incident review
   - Root cause analysis for all security failures
   - Action items tracked in Issues
   - /docs/INCIDENT-LOG.md updated

---

## Success Criteria

### Slice D1: Auth Foundation
✅ org_id extracted from JWT claims without error
✅ Missing org_id returns 403 Forbidden
✅ RBAC enforced (admin/editor/viewer roles)
✅ No hardcoded secrets in code
✅ Auth unit tests ≥95% coverage
✅ /docs/ORG-ID-HANDLING.md published

### Slice D2: Database Schema
✅ All tables have org_id in PRIMARY KEY
✅ Database-level CHECK constraints (org_id IS NOT NULL) enforced
✅ Foreign key constraints include org_id
✅ Indexes on (org_id, id) created
✅ Seed data reflects org boundaries (Org A, Org B)
✅ `db:validate-isolation` passes all checks

### Slice D3: API & Service Layer
✅ ALL REST endpoints protected with org isolation middleware
✅ ALL queries follow `WHERE org_id = $1` pattern
✅ ALL responses validated to belong to extracted org_id
✅ ALL error responses hide org isolation violations (403 + generic message)
✅ Service layer tests ≥85% coverage
✅ API integration tests ≥90% coverage
✅ OpenAPI spec includes org isolation examples

### Slice D4: Audit & Testing
✅ ALL mutations (CREATE/UPDATE/DELETE) logged to audit_logs
✅ Audit logs contain: org_id, entity_type, operation, record_id, user_id, timestamp
✅ PII redacted from logs before persistence
✅ Org isolation test suite ≥95% coverage
✅ Negative tests pass: missing org_id → 403, invalid org_id → 400, cross-org → 403
✅ E2E tests pass: concurrent requests from different orgs maintain isolation
✅ Security audit: 0 vulnerabilities (npm audit, OWASP checks)
✅ /docs/ISOLATION-SPECIFICATION.md published (canonical reference)
✅ /docs/AUDIT-TRAIL-DESIGN.md published
✅ CI/CD pipeline enforces all quality gates

---

## Final Pre-Merge Checklist

Every PR author must complete this checklist before requesting review:

### Isolation & Security
- [ ] org_id extracted from auth context (not request params)
- [ ] ALL queries include `WHERE org_id = $1` (org_id is $1)
- [ ] ALL responses validated with `validateResponseOrgId()`
- [ ] ALL mutations logged to audit_logs with org_id
- [ ] No hardcoded org_ids, customer names, or test data with real IDs
- [ ] No API keys, database passwords, or secrets committed
- [ ] TypeScript strict mode enabled on all new files

### Database Changes
- [ ] New tables have org_id in PRIMARY KEY
- [ ] Foreign key constraints include org_id
- [ ] Database-level CHECK constraint (org_id IS NOT NULL) added
- [ ] Indexes on (org_id, id) created for lookups
- [ ] Migration includes rollback (down method)
- [ ] Seed data uses explicit org boundaries (Org A, Org B)

### Testing
- [ ] org isolation tests ≥95% coverage
- [ ] Negative tests: missing org_id → 403, cross-org → 403
- [ ] Unit tests ≥85% coverage
- [ ] Integration tests ≥90% coverage
- [ ] CI pipeline passes (lint, typecheck, test:isolation, security audit)

### API & Middleware
- [ ] All new routes use `extractOrgIdMiddleware` + `validateOrgIdMiddleware`
- [ ] Error responses do NOT leak org isolation information (403 + generic message)
- [ ] Rate limiting per org_id implemented
- [ ] OpenAPI spec updated with org context examples

### Documentation
- [ ] PR description explains isolation impact
- [ ] /docs/ISOLATION-SPECIFICATION.md updated (if applicable)
- [ ] /docs/ORG-ID-HANDLING.md updated (if applicable)
- [ ] Code comments explain org isolation logic (why, not what)

### Review Signoffs (MANDATORY)
- [ ] ecosystem-isolation-specialist approved (BLOCKING)
- [ ] database-schema-engineer approved (if schema changes)
- [ ] auth-and-rbac-engineer approved (if auth changes)
- [ ] audit-and-compliance-engineer approved (if audit changes)
- [ ] test-and-security-engineer approved (test coverage verified)
- [ ] ecosystem-c-lead final approval

---

## Incident Response: Suspected Data Leak

**IF you suspect cross-org data exposure**:

1. **STOP ALL CHANGES** (immediately)
2. **Escalate to CISO + ecosystem-c-lead** (within 1 minute)
3. **Document**: What data? Which orgs? How exposed?
4. **Isolate**: Kill affected service instance (if running)
5. **Investigate**: Check audit_logs for unauthorized access
6. **Notify**: Affected organizations (compliance requirement)
7. **Postmortem**: Root cause analysis + prevention action items
8. **Update**: /docs/INCIDENT-LOG.md with lessons learned

---

## Repository Rules

- **Main Branch**: `main` (production-ready)
- **Feature Branches**: `feature/[agent-name]/[ticket-id]` (e.g., `feature/ecosystem-isolation-specialist/apollo-123`)
- **Commit Message**: `[ISOLATION] Fix org_id extraction in middleware` or `[AUDIT] Log campaign deletion`
- **PR Title**: Include `[CRITICAL]` if touching isolation logic, `[SECURITY]` if touching auth, `[AUDIT]` if touching logging
- **PR Description**: MUST include isolation checklist completion and testing evidence

---

## Resources

- **Canonical Reference**: /docs/ISOLATION-SPECIFICATION.md
- **Developer Guide**: /docs/ORG-ID-HANDLING.md
- **Audit Design**: /docs/AUDIT-TRAIL-DESIGN.md
- **Incident Playbook**: /docs/INCIDENT-RESPONSE.md
- **Schema Repo**: /db/schema.sql
- **Test Fixtures**: /tests/fixtures/orgs.ts (Org A, Org B test data)
- **Architecture Diagram**: /docs/architecture/isolation-boundary.drawio

---

## Questions or Concerns?

**Contact**: `ecosystem-c-lead`
**Escalation**: CISO (for data leak concerns)
**Slack Channel**: #apollo-ai-outreach-ecosystem-c
**Weekly Sync**: Wednesdays 10 AM UTC

---

**Last Updated**: 2025-11-17
**Next Review**: 2025-12-17 (monthly)
**Owner**: ecosystem-c-lead
**Status**: 🟢 Active (Ecosystem C Critical Path)
