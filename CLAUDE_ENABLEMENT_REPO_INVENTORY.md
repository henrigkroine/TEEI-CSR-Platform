# Claude Enablement - Repository Inventory

**Created**: 2025-11-17
**Purpose**: Track Claude/agent configuration status across TEEI and YPAI repositories
**Last Updated**: 2025-11-17

---

## Inventory Status

### Phase 1: Reference Implementation ✅

| Repo | Path | CLAUDE.md | AGENTS.md | .claude/agents | Agent Count | Status | Notes |
|------|------|-----------|-----------|----------------|-------------|--------|-------|
| **TEEI-CSR-Platform** | `/home/user/TEEI-CSR-Platform` | ✅ | ✅ | ✅ | 34 agents | ✅ **Complete** | Reference implementation with 5 leads + 29 specialists |

---

## Phase 2: Target Repositories (Pending)

The following repos are identified as high-priority candidates for Claude/agent standardization:

### TEEI Ecosystem

| # | Repo Name | Estimated Path | Priority | Tech Stack | Notes |
|---|-----------|----------------|----------|------------|-------|
| 1 | **CSR & Grants Intelligence Database** | `D:\Dev\VS Projects\TEEI\CSR & Grants Intelligence Database` | **High** | PostgreSQL, TypeScript, Node.js | Apollo backend + DB migrations, critical for Ecosystem C |
| 2 | **TEEI Website (Astro)** | `D:\Dev\VS Projects\TEEI\TEEI - Website\teei-astro` | **High** | Astro 5, React, TailwindCSS | Marketing site with SEO focus |
| 3 | **Buddy System** | TBD | Medium | TBD | Peer-to-peer matching system |
| 4 | **Grant Automation** | TBD | Medium | TBD | Grant application automation |

### YPAI Ecosystem

| # | Repo Name | Estimated Path | Priority | Tech Stack | Notes |
|---|-----------|----------------|----------|------------|-------|
| 5 | **YPAI.SheetsWriter** | `D:\Dev\VS Projects\YPAI.SheetsWriter` | **High** | Serverless, Google Sheets API | Video pipeline automation |
| 6 | **pdf-orchestrator** | `D:\Dev\VS Projects\pdf-orchestrator` | **High** | Node.js, InDesign scripting | PDF generation orchestrator |
| 7 | **Website YPAI** | `D:\Dev\VS Projects\Website YPAI` | Medium | Astro/React (assumed) | Marketing/landing pages |

### Ecosystem C (CRITICAL: Isolation Required)

| # | Repo Name | Estimated Path | Priority | Tech Stack | Notes |
|---|-----------|----------------|----------|------------|-------|
| 8 | **Apollo-AI-Outreach** | `D:\Dev\VS Projects\Projects\Apollo-AI-Outreach` | **CRITICAL** | TypeScript, Node.js, PostgreSQL | **MUST enforce YPAI/TEEI org isolation** |

---

## Detailed Repository Assessments

### 1. TEEI-CSR-Platform ✅ (Reference Implementation)

**Status**: Complete
**Location**: `/home/user/TEEI-CSR-Platform`
**Branch**: `claude/standardize-agent-setup-01CfgUZZGxhn2Pkaty1U786R`

**Current Setup**:
- ✅ CLAUDE.md: Single line `@AGENTS.md`
- ✅ AGENTS.md: 387 lines, comprehensive multi-agent orchestration
- ✅ .claude/agents/: 34 agent definitions
  - 5 Lead agents: frontend-lead, backend-lead, qa-devex-lead, ai-lead, data-lead
  - 29 Specialists: astro, react, tailwind, nodejs-api, postgres, etc.

**Tech Stack**:
- Frontend: Astro 5, React, TailwindCSS
- Backend: Node.js, tRPC, Express
- Data: PostgreSQL, ClickHouse, Drizzle ORM
- Messaging: NATS
- Monorepo: pnpm workspaces, Turborepo

**Quality Gates**:
- Unit test coverage ≥80%
- E2E test coverage ≥60%
- TypeScript strict mode
- Security audits (Snyk, git-secrets)
- Accessibility (WCAG 2.2 AA for UI)

**Safety Constraints**:
- ❌ Never modify secrets
- ❌ Never push to main/master
- ❌ Never skip tests
- ❌ No PII in repo

**Next Actions**: None (reference implementation complete)

---

### 2. CSR & Grants Intelligence Database (Pending)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\TEEI\CSR & Grants Intelligence Database`
**Priority**: **High** (Ecosystem C critical)

**Expected Structure**:
- Apollo backend
- PostgreSQL database
- TypeScript API layer
- Database migrations (Drizzle or similar)

**Recommended Agents** (to be created):
- database-schema-lead
- postgres-migration-specialist
- apollo-api-specialist
- data-quality-specialist
- security-specialist

**Safety Constraints** (critical for Ecosystem C):
- ❌ NEVER access YPAI org IDs from TEEI-scoped queries
- ❌ NEVER expose TEEI org IDs to YPAI-scoped queries
- ✅ ALWAYS validate org isolation in tests

**Next Actions**:
1. Access repo and assess current state
2. Create CLAUDE.md and AGENTS.md
3. Define 5-8 specialist agents
4. Add Ecosystem C isolation rules to AGENTS.md

---

### 3. TEEI Website (Astro) (Pending)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\TEEI\TEEI - Website\teei-astro`
**Priority**: **High**

**Expected Structure**:
- Astro 5 static site
- Marketing content
- SEO optimization
- Multi-locale support (likely en/uk/no)

**Recommended Agents**:
- astro-specialist (can reuse from CSR Platform)
- seo-specialist
- content-specialist
- accessibility-specialist
- frontend-testing-specialist

**Next Actions**:
1. Access repo and assess current state
2. Create CLAUDE.md and AGENTS.md
3. Symlink shared agents from CSR Platform (.claude/agents-shared/)
4. Define SEO-specific agents

---

### 4. Apollo-AI-Outreach (Pending - CRITICAL)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\Projects\Apollo-AI-Outreach`
**Priority**: **CRITICAL** (Ecosystem C isolation boundary)

**Expected Structure**:
- TypeScript backend
- PostgreSQL database
- API layer connecting YPAI and TEEI
- Org isolation logic

**Recommended Agents**:
- ecosystem-isolation-specialist (MUST BE USED for any org-related changes)
- apollo-backend-specialist
- database-specialist
- integration-testing-specialist

**CRITICAL Safety Constraints**:
```markdown
## Ecosystem C Isolation Rules (NON-NEGOTIABLE)

### NEVER (Blocking - CI Fails)
- ❌ NEVER access YPAI org IDs from TEEI-scoped code
- ❌ NEVER access TEEI org IDs from YPAI-scoped code
- ❌ NEVER bypass org isolation checks
- ❌ NEVER merge without isolation tests passing

### ALWAYS (Required)
- ✅ ALWAYS validate org isolation in integration tests
- ✅ ALWAYS use org-scoped queries with explicit org_id filters
- ✅ ALWAYS document org boundary crossings in code comments

### Quality Gates
- ✅ Org isolation tests ≥95% coverage
- ✅ No cross-org data leaks (validated by test suite)
- ✅ All API endpoints enforce org_id scoping
```

**Next Actions**:
1. Access repo and assess current isolation implementation
2. Create CLAUDE.md and AGENTS.md with CRITICAL isolation rules
3. Define ecosystem-isolation-specialist agent
4. Add org isolation tests to CI gates

---

### 5. YPAI.SheetsWriter (Pending)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\YPAI.SheetsWriter`
**Priority**: **High**

**Expected Structure**:
- Serverless functions (AWS Lambda, Google Cloud Functions, or similar)
- Google Sheets API integration
- Video pipeline data processing

**Recommended Agents**:
- serverless-specialist
- google-api-specialist
- data-transformation-specialist
- integration-testing-specialist

**Next Actions**:
1. Access repo and assess current state
2. Create CLAUDE.md and AGENTS.md
3. Define serverless-specific agents
4. Document API integration patterns

---

### 6. pdf-orchestrator (Pending)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\pdf-orchestrator`
**Priority**: **High**

**Expected Structure**:
- Node.js orchestration layer
- InDesign scripting (ExtendScript or similar)
- PDF generation pipeline

**Recommended Agents**:
- indesign-scripting-specialist
- pdf-generation-specialist
- pipeline-orchestrator
- quality-assurance-specialist

**Next Actions**:
1. Access repo and assess current state
2. Create CLAUDE.md and AGENTS.md
3. Define InDesign/PDF-specific agents
4. Document pipeline workflow

---

### 7. Website YPAI (Pending)

**Status**: Not yet assessed
**Estimated Location**: `D:\Dev\VS Projects\Website YPAI`
**Priority**: Medium

**Expected Structure**:
- Likely Astro or React-based
- Marketing content
- SEO optimization

**Recommended Agents**:
- Can likely reuse agents from TEEI Website
- marketing-specialist
- seo-specialist

**Next Actions**:
1. Access repo and assess current state
2. Create CLAUDE.md and AGENTS.md
3. Symlink shared agents from TEEI Website

---

## Shared Agent Library (Future Phase)

### Proposed Structure

```
D:\Dev\VS Projects\.claude\
└── agents-shared/
    ├── frontend/
    │   ├── astro-specialist.md
    │   ├── react-specialist.md
    │   └── tailwind-specialist.md
    ├── backend/
    │   ├── nodejs-api-specialist.md
    │   ├── postgres-specialist.md
    │   └── event-driven-specialist.md
    ├── devops/
    │   ├── ci-cd-specialist.md
    │   ├── docker-specialist.md
    │   └── monitoring-specialist.md
    ├── qa/
    │   ├── frontend-testing-specialist.md
    │   ├── backend-testing-specialist.md
    │   └── security-specialist.md
    └── meta/
        ├── agent-team-configurator.md
        └── docs-scribe.md
```

### Usage Pattern

Repos can symlink shared agents:
```bash
cd <repo>/.claude/agents
ln -s ../../../.claude/agents-shared/frontend/astro-specialist.md .
ln -s ../../../.claude/agents-shared/backend/postgres-specialist.md .
```

Or reference them in AGENTS.md:
```markdown
## Available Agents

### Shared (from parent library)
- astro-specialist
- postgres-specialist
- ci-cd-specialist

### Repo-Specific
- apollo-isolation-specialist (defined in .claude/agents/)
```

---

## Success Metrics

### By End of Phase 2 (Target: 6-8 repos)
- [ ] 6-8 repos have CLAUDE.md + AGENTS.md
- [ ] At least 3 repos share common agents via symlinks
- [ ] Ecosystem C isolation rules documented in Apollo-AI-Outreach
- [ ] All critical repos have safety constraints documented
- [ ] Shared agent library created at parent directory level

### By End of Phase 3 (30-Agent Swarm Validation)
- [ ] 30-agent swarm successfully operates across 3+ repos
- [ ] Zero org isolation violations in Ecosystem C
- [ ] CI gates enforce agent-defined quality thresholds
- [ ] Documentation coverage ≥90% for all agents

---

## Notes & Observations

### Lessons from TEEI-CSR-Platform
1. **CLAUDE.md should be minimal**: Single line `@AGENTS.md` prevents duplication
2. **AGENTS.md is for agents AND humans**: Write in imperative language
3. **Trigger conditions must be specific**: "MUST BE USED when..." is clearer than "Can be used for..."
4. **Decision frameworks prevent drift**: Lead agents need clear conventions
5. **Least-privilege tooling**: UI agents don't need Bash access

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Agents modify secrets | Add "NEVER modify secrets" to all AGENTS.md files |
| Org isolation breach (Ecosystem C) | Critical safety constraints in Apollo-AI-Outreach AGENTS.md |
| Duplicate agent definitions | Use shared library with symlinks |
| Stale documentation | Make AGENTS.md the single source of truth |

---

## Appendix: Template Checklist for New Repos

Use this checklist when adding Claude/agent setup to a new repo:

### Pre-Setup
- [ ] Identify repo purpose and tech stack
- [ ] List 3-5 most common development tasks
- [ ] Identify safety constraints (secrets, org isolation, etc.)

### File Creation
- [ ] Create CLAUDE.md with `@AGENTS.md`
- [ ] Create AGENTS.md with all required sections
- [ ] Create .claude/agents/ directory
- [ ] Define 3-5 initial agents (or symlink from shared library)

### Content
- [ ] AGENTS.md includes project overview
- [ ] AGENTS.md includes build/test commands
- [ ] AGENTS.md includes architecture summary
- [ ] AGENTS.md includes safety constraints
- [ ] Each agent has "When to Invoke" triggers
- [ ] Each agent has clear deliverables

### Validation
- [ ] Test with Claude Code CLI or Web
- [ ] Verify agents are correctly invoked
- [ ] No secrets in .md files
- [ ] Safety constraints enforced

### Documentation
- [ ] Update this inventory with repo status
- [ ] Document any repo-specific patterns
- [ ] Share learnings in CLAUDE_ENABLEMENT_BEST_PRACTICES.md
