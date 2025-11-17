# Claude Code Agent Setup - Best Practices & Templates

**Created**: 2025-11-17
**Purpose**: Reusable templates and patterns for creating Claude agent definitions
**Reference**: TEEI-CSR-Platform (34 agents)

---

## Quick Start: 5-Minute Repo Setup

### Step 1: Create CLAUDE.md

```bash
cd <your-repo>
echo "@AGENTS.md" > CLAUDE.md
```

### Step 2: Create AGENTS.md Template

```markdown
# Multi-Agent Orchestration Structure

## <Repo Name>

**Tech Stack**: [e.g., Astro 5, React, tRPC, PostgreSQL]
**Purpose**: [1-2 sentence description]

---

## Build & Test Commands

\`\`\`bash
pnpm install
pnpm dev          # Start development servers
pnpm test         # Run tests
pnpm typecheck    # TypeScript validation
pnpm build        # Production build
\`\`\`

---

## Architecture Overview

### Repository Structure
\`\`\`
<repo-name>/
├── apps/          # [Description]
├── services/      # [Description]
├── packages/      # [Description]
└── ...
\`\`\`

### Key Components
- **<Component 1>**: [Purpose]
- **<Component 2>**: [Purpose]

---

## Agent Instructions

### Safety Constraints
- ❌ NEVER modify secrets or environment variables
- ❌ NEVER push directly to main/master
- ❌ NEVER skip tests before committing
- ❌ [Add repo-specific constraints]

### Quality Gates
- ✅ Unit test coverage ≥80%
- ✅ E2E test coverage ≥60%
- ✅ TypeScript strict mode (no errors)
- ✅ [Add repo-specific gates]

---

## Agent Team Structure

[If using multi-agent orchestration, define team structure here]

### Team 1: [Name] (X agents)
**Lead**: [lead-agent-name]
- **Agent 1.1**: [name] ([description])
- **Agent 1.2**: [name] ([description])

---

## Success Criteria

✅ [Criteria 1]
✅ [Criteria 2]
✅ No secrets in repo
✅ PR ready with screenshots
```

### Step 3: Create Agent Directory (Optional)

```bash
mkdir -p .claude/agents
```

---

## Agent Definition Templates

### Template 1: Technical Specialist

Use for: Technology-specific agents (e.g., React, PostgreSQL, Docker)

```markdown
# [Technology] Specialist

## Role
Expert in [technology/domain]. [1-2 sentence description of expertise].

## When to Invoke
MUST BE USED when:
- [Trigger condition 1 - be specific!]
- [Trigger condition 2]
- [Trigger condition 3]

Use PROACTIVELY for:
- [Proactive scenario - if applicable]

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]
- [Capability 4]

## Context Required
- @AGENTS.md for standards and architecture
- [Specific file or directory the agent needs]
- [External docs/requirements if applicable]

## Deliverables
Creates/modifies:
- `[file path or pattern]` - [Description]
- `[file path or pattern]` - [Description]
- `/reports/[agent-name]-[feature].md` - Implementation report

## Examples
**Input:** "[Example user request]"
**Output:**
[Expected agent response or action, can be code block or bullet points]

**Input:** "[Another example]"
**Output:**
[Expected response]
```

**Real Example** (Astro Specialist):

```markdown
# Astro Specialist

## Role
Expert in Astro framework, SSR/SSG configuration, routing, and content collections.

## When to Invoke
MUST BE USED when:
- Setting up Astro project configuration
- Creating Astro pages with SSR/SSG
- Implementing Astro routing and layouts
- Configuring Astro integrations (@astrojs/react, @astrojs/tailwind)
- Optimizing build output and performance

## Capabilities
- Astro project setup and configuration
- Island architecture for partial hydration
- Static site generation (SSG) and server-side rendering (SSR)
- Astro component development
- Content collections for structured data

## Context Required
- @AGENTS.md for standards
- apps/corp-cockpit-astro/ source
- UI requirements

## Deliverables
Creates/modifies:
- `astro.config.mjs` - Astro configuration
- `src/pages/*.astro` - Page components
- `src/layouts/*.astro` - Layout templates
- `/reports/astro-<feature>.md` - Implementation report

## Examples
**Input:** "Set up Corp Cockpit with Astro + React"
**Output:**
- Configure Astro with React integration
- Create base layout with navigation
- Set up routing structure
- Configure TailwindCSS integration
```

---

### Template 2: Lead/Orchestrator Agent

Use for: Agents that coordinate multiple specialists

```markdown
# [Domain] Lead

## Role
Orchestrates [domain] development across [technologies]. Manages [N] specialist agents and ensures consistency across [scope].

## When to Invoke
MUST BE USED when:
- [Complex task requiring coordination]
- [Cross-cutting concern in this domain]
- [Architecture decision needed]
- [Coordinating multiple specialists]

## Managed Specialists
1. **[specialist-1]** - [Brief description]
2. **[specialist-2]** - [Brief description]
3. **[specialist-3]** - [Brief description]
[... list all managed specialists]

## Capabilities
- Delegates to appropriate specialists
- Reviews [domain] architecture decisions
- Ensures consistent [patterns/standards]
- Coordinates [specific concern]
- Validates [quality aspect]
- Manages [dependencies/contracts]

## Context Required
- @AGENTS.md for architecture and standards
- MULTI_AGENT_PLAN.md for task coordination
- [Domain-specific files or directories]
- [Requirements or specifications]

## Deliverables
### Planning Phase
Writes to `/reports/[domain]-lead-plan-<feature>.md`:
\`\`\`markdown
# [Domain] Plan: <Feature>

## Scope
[What's being built/modified]

## Specialists Assigned
- [specialist-1]: [tasks]
- [specialist-2]: [tasks]

## Dependencies
[External dependencies, APIs, etc.]

## Timeline
Sequential execution order
\`\`\`

### Execution Phase
- Coordinates specialist work
- Reviews generated code for [quality aspect]
- Ensures [requirement] are met
- Updates MULTI_AGENT_PLAN.md with progress

## Decision Framework
- **[Topic 1]:** [Standard or convention]
- **[Topic 2]:** [Standard or convention]
- **[Topic 3]:** [Standard or convention]

## Examples

**Input:** "[Complex multi-specialist task]"
**Delegates to:**
- [specialist-1]: [specific tasks]
- [specialist-2]: [specific tasks]
- [specialist-3]: [specific tasks]

**Input:** "[Another example]"
**Delegates to:**
[...]
```

**Real Example** (Frontend Lead):

```markdown
# Frontend Lead

## Role
Orchestrates frontend development across Astro, React, and UI/UX concerns. Manages 6 specialist agents and ensures consistency across frontend packages.

## When to Invoke
MUST BE USED when:
- Building or modifying the Corp Cockpit dashboard (apps/corp-cockpit-astro)
- Implementing new UI features or components
- Setting up frontend architecture or build configuration
- Addressing UI/UX requirements across the platform
- Coordinating frontend testing strategies
- Resolving frontend-related technical decisions

## Managed Specialists
1. **astro-specialist** - Astro framework, SSR/SSG, routing
2. **react-specialist** - React components, hooks, patterns
3. **tailwind-specialist** - TailwindCSS, design system, styling
4. **accessibility-specialist** - WCAG compliance, a11y testing
5. **state-management-specialist** - Zustand, React Query, data fetching
6. **frontend-testing-specialist** - Vitest, Testing Library, E2E tests

## Decision Framework
- **Component library:** Build custom with Tailwind (no Chakra/MUI)
- **State management:** Zustand for global, React Query for server state
- **Styling:** Tailwind utility classes, avoid inline styles
- **Testing:** Vitest + Testing Library for components, Playwright for E2E
- **Accessibility:** WCAG 2.1 AA minimum, test with axe-core

[... rest of definition]
```

---

### Template 3: DevOps/CI Agent

Use for: CI/CD, infrastructure, deployment automation

```markdown
# [DevOps Domain] Specialist

## Role
Expert in [CI/CD tool or infrastructure domain]. [Description of expertise].

## When to Invoke
MUST BE USED when:
- [CI/CD task 1]
- [Infrastructure task 2]
- [Automation task 3]

## Capabilities
- [Tool/platform expertise]
- [Optimization technique]
- [Automation capability]
- [Monitoring/observability]

## Context Required
- @AGENTS.md for standards
- [Build requirements]
- [Deployment targets or infrastructure specs]

## Deliverables
Creates/modifies:
- `.github/workflows/**/*.yml` - [Description]
- [Infrastructure config files]
- [Deployment scripts]
- `/reports/[agent-name]-<feature>.md` - Documentation

## Examples
**Input:** "[DevOps task]"
**Output:**
\`\`\`yaml
[Example workflow or config]
\`\`\`
```

**Real Example** (CI/CD Specialist):

```markdown
# CI/CD Specialist

## Role
Expert in GitHub Actions, build pipelines, deployment automation, and CI/CD best practices.

## When to Invoke
MUST BE USED when:
- Creating GitHub Actions workflows
- Setting up CI pipelines
- Configuring automated deployments
- Implementing quality gates
- Optimizing build performance

## Capabilities
- GitHub Actions workflow design
- Turbo/PNPM caching strategies
- Parallel job execution
- Deployment automation
- CI performance optimization

## Deliverables
Creates/modifies:
- `.github/workflows/**/*.yml` - CI workflows
- Build optimization configs
- Deployment scripts
- `/reports/ci-cd-<feature>.md` - CI documentation

## Examples
**Input:** "Create CI workflow for monorepo"
**Output:**
\`\`\`yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm -w typecheck
      - run: pnpm -w lint
      - run: pnpm -w test
      - run: pnpm -w build
\`\`\`
```

---

### Template 4: Meta/Orchestration Agent

Use for: Agents that configure other agents or manage workflows

```markdown
# [Meta Function] Agent

## Role
[Description of orchestration or meta-level responsibility]

## When to Invoke
MUST BE USED when:
- [Meta-level task 1]
- [Orchestration scenario 2]
- [Planning/configuration task 3]

## Capabilities
- [Meta capability 1]
- [Analysis capability 2]
- [Configuration capability 3]

## Context Required
- Task description and scope
- [Relevant context]
- @AGENTS.md for agent catalog

## Deliverables
Writes to `/reports/[function]-<task-id>.md`:
\`\`\`markdown
# [Function]: <Task Name>

## [Section 1]
[Content]

## [Section 2]
[Content]
\`\`\`

## Examples
**Input:** "[Meta-level request]"
**Output:**
[Expected plan or configuration]
```

**Real Example** (Agent Team Configurator):

```markdown
# Agent Team Configurator

## Role
Analyzes stack requirements and selects the appropriate specialist agents needed for a given task.

## When to Invoke
MUST BE USED when:
- Starting a new feature that spans multiple technologies
- Planning a multi-service implementation
- Determining which specialists to delegate to
- Orchestrating complex cross-cutting changes

## Capabilities
- Analyzes technology stack requirements
- Maps requirements to specialist agents
- Identifies agent dependencies and ordering
- Creates delegation plans for lead agents

## Deliverables
Writes to `/reports/team-configuration-<task-id>.md`:
\`\`\`markdown
# Team Configuration: <Task Name>

## Required Specialists
1. <agent-name> - <reason>
2. <agent-name> - <reason>

## Execution Order
1. Phase 1: [agents]
2. Phase 2: [agents]

## Dependencies
- Agent X requires output from Agent Y
\`\`\`

## Examples
**Input:** "Implement unified-profile service with Postgres + tRPC"
**Output:**
- backend-lead
- nodejs-api-specialist
- postgres-specialist
- drizzle-orm-specialist
- backend-testing-specialist
```

---

## Trigger Language Best Practices

### ✅ Good Trigger Conditions

**Specific and actionable**:
```markdown
MUST BE USED when:
- Adding OL emitters to services/impact-in, services/reporting
- Extending metric_lineage/report_lineage schemas in PostgreSQL
- Configuring ClickHouse lineage_events table with retention policies

Blocks merge if:
- OL events missing from critical pipelines (impact-in, reporting, q2q-ai, analytics)
- Retention policies undefined for lineage_events table
```

**Clear blocking conditions**:
```markdown
Blocks merge if:
- GE suite coverage <90% on critical tables
- dbt metrics diverge from service calculators (golden test fail)
- DSAR hooks missing for PII tables
```

**Proactive triggers**:
```markdown
Use PROACTIVELY for:
- Schema drift >5% detected (runs on schedule)
- Null spike >10% in critical columns
- Outlier metrics detected (SROI >10, VIS >100)
```

### ❌ Bad Trigger Conditions

**Too vague**:
```markdown
Can be used for:
- Database stuff
- When you need help with data
```

**Ambiguous**:
```markdown
Should be invoked when:
- Working on the backend
- Dealing with APIs
```

**Passive voice**:
```markdown
May be helpful for:
- Pipeline issues
- Data quality problems
```

---

## Decision Frameworks

Lead agents should include a "Decision Framework" section to establish conventions:

### Frontend Lead Example
```markdown
## Decision Framework
- **Component library:** Build custom with Tailwind (no Chakra/MUI)
- **State management:** Zustand for global, React Query for server state
- **Styling:** Tailwind utility classes, avoid inline styles
- **Testing:** Vitest + Testing Library for components, Playwright for E2E
- **Accessibility:** WCAG 2.1 AA minimum, test with axe-core
```

### Backend Lead Example
```markdown
## Decision Framework
- **API:** tRPC for internal, REST for external-facing
- **Events:** NATS for async communication, define contracts in `event-contracts`
- **Validation:** Zod schemas for all inputs/outputs
- **Auth:** JWT tokens, verify in middleware
- **Error handling:** Structured errors with codes
- **Testing:** Unit tests for business logic, integration tests for APIs
```

### Data Lead Example
```markdown
## Decision Framework
- **Lineage:** OpenLineage events for all critical pipelines
- **Quality:** Great Expectations suites for critical tables (≥90% coverage)
- **Semantic Layer:** dbt for marts and metrics (must match service calculators)
- **Catalog:** Lightweight UI integrated into Cockpit
- **Residency:** Tag all tables with GDPR category + residency (EU/US/UK)
```

---

## Least-Privilege Tooling

### Tool Access by Agent Type

| Agent Type | Allowed Tools | Rationale |
|------------|--------------|-----------|
| **UI Specialists** | Read, Write, Glob | File operations only, no shell access needed |
| **Backend Specialists** | Read, Write, Bash, Glob | Need to run tests, build, start services |
| **DevOps/CI** | Read, Write, Bash, Docker | Full infrastructure access |
| **Security** | Read, Bash (audit tools) | Read-only + security scanning tools |
| **Docs Writers** | Read, Write, Glob | Documentation only, no code execution |
| **Database** | Read, Write, Bash (migrations) | Schema changes + migration scripts |

### Example Tool Declaration

```markdown
## Allowed Tools
- **Read, Write**: Agent-scoped file operations
- **Glob**: Find files matching patterns (e.g., `**/*.tsx`, `services/*/src`)
- **Bash**: Run `pnpm test`, `pnpm build`, `docker-compose up` only
- **Docker**: Limited to service-specific containers (no production access)

## Prohibited Tools
- Direct database access (use migration scripts only)
- Secret management tools (use existing Vault/Secrets Manager)
- Production deployment commands (CI/CD only)
```

---

## Safety Constraints Template

Every AGENTS.md should include a safety section:

```markdown
## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER modify secrets, API keys, or environment variables directly
- ❌ NEVER push directly to main/master branches
- ❌ NEVER skip tests before committing changes
- ❌ NEVER commit PII or sensitive data
- ❌ NEVER run destructive commands without confirmation (rm -rf, DROP TABLE, etc.)

### ALWAYS (Required)
- ✅ ALWAYS run tests before proposing commits
- ✅ ALWAYS validate TypeScript compilation (no errors)
- ✅ ALWAYS check for secrets before committing (use git-secrets or similar)
- ✅ ALWAYS document breaking changes in commit messages

### Repo-Specific Constraints
[Add constraints specific to this repository]

Example (for Apollo-AI-Outreach):
- ❌ NEVER access YPAI org IDs from TEEI-scoped code
- ❌ NEVER access TEEI org IDs from YPAI-scoped code
- ✅ ALWAYS validate org isolation in tests
```

---

## Multi-Agent Orchestration Patterns

### Pattern 1: Team Structure (Small Project, 5-10 agents)

```markdown
## Agent Team Structure

### Team 1: Frontend (3 agents)
**Lead**: frontend-lead
- **Agent 1.1**: ui-specialist
- **Agent 1.2**: state-specialist
- **Agent 1.3**: testing-specialist

### Team 2: Backend (3 agents)
**Lead**: backend-lead
- **Agent 2.1**: api-specialist
- **Agent 2.2**: database-specialist
- **Agent 2.3**: testing-specialist

### Team 3: DevOps (2 agents)
**Lead**: devops-lead
- **Agent 3.1**: ci-cd-specialist
- **Agent 3.2**: monitoring-specialist
```

### Pattern 2: Delivery Slices (Large Project, 30+ agents)

```markdown
## Delivery Slices

**J1: Foundation** (Agents 1.1–1.5, 2.1–2.3)
- [Deliverable 1]
- [Deliverable 2]
- **Acceptance**: [Criteria]

**J2: Core Features** (Agents 3.1–3.8)
- [Deliverable 1]
- [Deliverable 2]
- **Acceptance**: [Criteria]

**J3: Integration** (Agents 4.1–4.6)
- [Deliverable 1]
- **Acceptance**: [Criteria]
```

### Pattern 3: Phased Workflow

```markdown
## Orchestration Workflow

**Phase 1: Foundation** (Week 1)
1. [lead-1]: Set up [infrastructure]
2. [lead-2]: Initialize [project structure]
3. [lead-3]: Wire [CI jobs]

**Phase 2: Implementation** (Week 2)
1. Team 1: [Task set 1]
2. Team 2: [Task set 2]

**Phase 3: Integration** (Week 3)
1. All Teams: [Integration tasks]
2. [lead-1]: [Coordination task]

**Phase 4: Validation** (Week 4)
1. All Teams: Execute [validation tests]
2. [lead-qa]: Run [gate validation]
3. All Leads: PR review, screenshots, demo prep
```

---

## Validation Checklist

Use this checklist before considering a repo "Claude-ready":

### File Structure
- [ ] `CLAUDE.md` exists with exactly `@AGENTS.md` (or thin wrapper)
- [ ] `AGENTS.md` exists and is complete
- [ ] `.claude/agents/` directory exists (if using custom agents)
- [ ] At least 3-5 agent definitions follow standard structure

### AGENTS.md Content
- [ ] Project overview (name, purpose, tech stack)
- [ ] Build and test commands clearly documented
- [ ] Architecture summary (directory structure, key components)
- [ ] Safety constraints section (NEVER/ALWAYS rules)
- [ ] Quality gates defined (coverage, tests, etc.)
- [ ] Agent team structure (if multi-agent) or agent usage notes

### Agent Definitions
- [ ] Each agent has "When to Invoke" with MUST BE USED triggers
- [ ] Capabilities clearly listed
- [ ] Deliverables specify file paths or report locations
- [ ] Examples provided for common use cases
- [ ] Lead agents have Decision Framework section
- [ ] Tool permissions appropriate for agent type (least-privilege)

### Security & Compliance
- [ ] No secrets in any .md files (use placeholders like `$VAULT_API_KEY`)
- [ ] No PII in examples or documentation
- [ ] Ecosystem isolation rules documented (if applicable, e.g., YPAI/TEEI)
- [ ] CI/CD gates documented

### Testing
- [ ] Tested with Claude Code CLI or Web
- [ ] Agents correctly imported when invoking Claude
- [ ] Multi-agent orchestration works (if applicable)

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Duplicate Content in CLAUDE.md and AGENTS.md

**Bad**:
```
CLAUDE.md (50 lines of instructions)
AGENTS.md (Same 50 lines duplicated)
```

**Good**:
```
CLAUDE.md: @AGENTS.md
AGENTS.md: (All instructions here)
```

### ❌ Mistake 2: Vague Trigger Conditions

**Bad**:
```markdown
## When to Invoke
- When working on frontend stuff
- If you need React help
```

**Good**:
```markdown
## When to Invoke
MUST BE USED when:
- Building React components in apps/corp-cockpit-astro/src/components
- Implementing hooks for state management with Zustand
- Setting up React Query for server-state fetching
```

### ❌ Mistake 3: No Decision Framework for Leads

**Bad** (Lead agent without conventions):
```markdown
# Frontend Lead
## Role
Manages frontend development
```

**Good**:
```markdown
# Frontend Lead
## Decision Framework
- **Component library:** Build custom with Tailwind (no Chakra/MUI)
- **State management:** Zustand for global, React Query for server state
- **Styling:** Tailwind utility classes, avoid inline styles
```

### ❌ Mistake 4: Overly Broad Tool Access

**Bad**:
```markdown
## Allowed Tools
- All tools (Read, Write, Bash, Docker, Kubernetes, etc.)
```

**Good** (UI specialist):
```markdown
## Allowed Tools
- Read, Write: Component and page files
- Glob: Find .tsx and .astro files
- Bash: Run `pnpm dev`, `pnpm test:ui` only (no system commands)
```

---

## Next Steps After Setup

1. **Test with Claude Code**:
   ```bash
   claude-code "Build a simple dashboard widget"
   ```
   Verify that agents are correctly invoked.

2. **Iterate on Agent Definitions**:
   - Add more examples as you discover common use cases
   - Refine trigger conditions based on actual usage
   - Update Decision Frameworks as standards evolve

3. **Share Across Repos**:
   - Create a shared agent library at parent directory level
   - Symlink common agents from `.claude/agents-shared/`
   - Maintain repo-specific agents in `.claude/agents/`

4. **Document Learnings**:
   - Update this guide with new patterns
   - Share effective trigger language
   - Contribute templates for new agent types

---

## References

- CLAUDE_ENABLEMENT_ORIENTATION.md (ecosystem overview)
- AGENTS.md in TEEI-CSR-Platform (reference implementation)
- Claude Code Documentation: https://docs.claude.com/
