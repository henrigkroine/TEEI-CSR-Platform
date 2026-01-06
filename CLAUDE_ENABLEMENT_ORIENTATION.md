# Claude Code Enablement - Orientation Guide

**Created**: 2025-11-17
**Purpose**: Document the standard Claude/agent setup pattern for replication across TEEI and YPAI repositories
**Reference Implementation**: TEEI-CSR-Platform

---

## Executive Summary

This document defines the **standardized Claude Code configuration pattern** discovered in TEEI-CSR-Platform and provides guidance for replicating this setup across other repositories in the TEEI and YPAI ecosystem.

### Why Standardize?

- **Consistency**: Future 30-agent swarms can work across repos with predictable conventions
- **Safety**: Clear "API contracts" prevent agents from touching restricted areas
- **Efficiency**: Agents know where to find build commands, test scripts, and architecture docs
- **Scalability**: New repos can adopt the pattern in <30 minutes

---

## Current State: TEEI-CSR-Platform

### Structure Overview

```
/home/user/TEEI-CSR-Platform/
├── CLAUDE.md                    # Imports AGENTS.md (single line: @AGENTS.md)
├── AGENTS.md                    # Single source of truth for agent instructions
└── .claude/
    └── agents/                  # 34 specialist agent definitions
        ├── frontend-lead.md
        ├── backend-lead.md
        ├── qa-devex-lead.md
        ├── ai-lead.md
        ├── data-lead.md
        ├── [29 specialist agents]
        └── ...
```

### Files by Role

| File | Purpose | Content Type |
|------|---------|-------------|
| **CLAUDE.md** | Entry point for Claude Code | Single line: `@AGENTS.md` |
| **AGENTS.md** | Master instructions, orchestration workflow, multi-agent structure | Markdown (387 lines) |
| **.claude/agents/*.md** | Individual agent definitions with trigger conditions, capabilities, deliverables | Markdown (avg 50-100 lines per agent) |

---

## The Three-File Pattern

### 1. CLAUDE.md (Thin Wrapper)

**Purpose**: Import AGENTS.md so Claude Code automatically loads agent instructions.

**Content** (literally):
```markdown
@AGENTS.md
```

**Why minimal?**
- AGENTS.md is the single source of truth
- Avoids duplicate/conflicting instructions
- Makes updates easier (edit one file, not two)

---

### 2. AGENTS.md (Single Source of Truth)

**Purpose**: Provide context for human developers AND Claude agents.

**Required Sections**:

1. **Project Overview**
   - What this repo does (1-2 sentences)
   - Primary tech stack (e.g., "Astro 5, React, tRPC, PostgreSQL, ClickHouse, NATS")

2. **Build & Test Commands**
   ```bash
   pnpm install
   pnpm -w dev          # Start all services
   pnpm -w test         # Run tests
   pnpm -w typecheck    # TypeScript validation
   ```

3. **Architecture Summary**
   - Monorepo structure (apps/, services/, packages/)
   - Key packages and their roles
   - Service boundaries (e.g., "services/reporting handles report generation")

4. **Agent Instructions**
   - Multi-agent orchestration workflow (if applicable)
   - Team structure (leads + specialists)
   - Quality gates (e.g., "≥80% unit test coverage", "No secrets in repo")

5. **Safety Constraints**
   - What agents MUST NOT do (e.g., "NEVER modify secrets", "NEVER push to main")
   - Ecosystem isolation rules (e.g., "YPAI org IDs must not be accessed from TEEI repos")

6. **Delivery Slices** (optional)
   - J1, J2, J3... style breakdown for large initiatives
   - Acceptance criteria per slice

**Example from TEEI-CSR-Platform**:
- Line 1-10: Multi-Agent Orchestration Structure header
- Line 11-50: Phase D team definitions (30 agents, 5 leads)
- Line 98-283: Worker 5 Data Trust team (30 agents, 5 leads)
- Line 285-387: Historical Phase 1-3 teams (reference)

**Key Principle**: Write for agents, not just humans. Use imperative language ("MUST BE USED when...", "Blocks merge if...").

---

### 3. .claude/agents/*.md (Agent Definitions)

**Purpose**: Define individual agent capabilities, trigger conditions, and deliverables.

**Standard Structure** (per agent):

```markdown
# [Agent Name]

## Role
[1-2 sentence description]

## When to Invoke
MUST BE USED when:
- [Trigger condition 1]
- [Trigger condition 2]
- [Trigger condition 3]

Use PROACTIVELY for:
- [Proactive scenario 1]

## Capabilities
- [Capability 1]
- [Capability 2]

## Context Required
- @AGENTS.md for [reason]
- [Other files/docs needed]

## Deliverables
Creates/modifies:
- [File or report path]
- [Expected output format]

## Examples
**Input:** "[User request]"
**Output:** [Expected agent response or action]
```

**Special Sections for Lead Agents**:

```markdown
## Managed Specialists
1. **specialist-name** - [Brief description]
2. **specialist-name** - [Brief description]

## Decision Framework
- **[Topic]:** [Standard or convention]
- **[Topic]:** [Standard or convention]
```

**Example Agents in TEEI-CSR-Platform**:
- **Leads** (5): frontend-lead, backend-lead, qa-devex-lead, ai-lead, data-lead
- **Specialists** (29): astro-specialist, react-specialist, nodejs-api-specialist, postgres-specialist, security-specialist, etc.

---

## Agent Definition Patterns

### Trigger Language (Use Imperatives)

✅ **Good**:
```markdown
MUST BE USED when:
- Adding OL emitters to services/impact-in
- Extending metric_lineage schema

Blocks merge if:
- OL events missing from critical pipelines
```

❌ **Bad** (Too vague):
```markdown
Can be used for:
- Lineage stuff
- When you need help with pipelines
```

### Least-Privilege Tooling

Agents should only request tools they actually need:
- **UI agents**: Read, Write, Glob (avoid Bash unless necessary)
- **Backend agents**: Read, Write, Bash (for running tests, building)
- **DevOps agents**: Full Bash, Docker commands
- **Docs agents**: Read, Write (no Bash)

Example:
```markdown
## Allowed Tools
- Read, Write: Agent-scoped file operations
- Glob: Find files matching patterns
- Bash: Run `pnpm test`, `pnpm build` only
```

---

## Quality Gates for Agent Setup

Before considering a repo "Claude-ready":

- [ ] CLAUDE.md exists with exactly `@AGENTS.md`
- [ ] AGENTS.md exists with:
  - [ ] Project overview
  - [ ] Build/test commands
  - [ ] Architecture summary
  - [ ] Agent instructions (if multi-agent)
  - [ ] Safety constraints
- [ ] .claude/agents/ directory exists (if using custom agents)
- [ ] At least 3-5 agent definitions follow standard structure
- [ ] No secrets in any .md files (use placeholders like `$VAULT_API_KEY`)

---

## Target Repos for First Wave

Based on YPAI_TEEI_HIGH_VALUE_PROJECTS_RESEARCH.md:

1. **TEEI-CSR-Platform** ✅ (Reference implementation - complete)
2. **CSR & Grants Intelligence Database** (Apollo backend + DB migrations)
3. **TEEI-Website (Astro)** (Marketing site with SEO)
4. **Apollo-AI-Outreach** (Ecosystem C: YPAI/TEEI isolation critical)
5. **YPAI.SheetsWriter** (Serverless video pipeline)
6. **pdf-orchestrator** (InDesign/PDF generation)
7. **Website YPAI** (Marketing/landing pages)

---

## Ecosystem Context

### TEEI Components
- CSR Platform (this repo)
- CSR & Grants DB
- TEEI Website (Astro)
- Buddy System
- Grant Automation
- Google Ads & SEO

### YPAI Components
- YPAI.SheetsWriter (video pipeline)
- pdf-orchestrator (PDF generation)
- Website YPAI (marketing)

### Ecosystem C (CRITICAL: Isolation Required)
- Apollo-AI-Outreach connects YPAI and TEEI
- **NEVER** allow YPAI org IDs to be accessed from TEEI repos
- **NEVER** allow TEEI org IDs to be accessed from YPAI repos
- Apollo acts as the isolation boundary

---

## Next Steps

1. **Phase 1**: Document this reference pattern (✅ complete)
2. **Phase 2**: Create repo-specific AGENTS.md for 6-7 target repos
3. **Phase 3**: Define shared agent library at parent directory level
4. **Phase 4**: Validate with a 30-agent swarm across multiple repos

---

## References

- TEEI_PROJECT_STATE_REPORT.md (ecosystem overview)
- YPAI_TEEI_HIGH_VALUE_PROJECTS_RESEARCH.md (28 use cases, 12 project ideas)
- AGENTS.md in this repo (current implementation)
