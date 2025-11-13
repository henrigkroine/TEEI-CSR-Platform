# MULTI-AGENT PLAN: TEEI CSR Platform

**Version:** 1.0
**Last Updated:** 2025-11-13
**Coordinator:** Worker 1 (Tech Lead Orchestrator)

## 🎯 Mission

Bootstrap a production-ready monorepo for the TEEI CSR Platform that enables Workers 2 and 3 to build services and UI in parallel with confidence. Establish shared context, 30-agent team, dev tooling, CI/CD, and local infrastructure.

## 📋 Plan Status

- **Phase:** Foundation Bootstrap
- **Worker:** Worker 1
- **Branch:** `claude/bootstrap-monorepo-governance-011CV5pUpY9oJLAZEYYh3EvN`
- **Overall Progress:** In Progress

## 🏗️ Architecture Overview

```
teei-csr-platform/
├── apps/
│   └── corp-cockpit-astro/          # Corporate admin dashboard
├── services/
│   ├── buddy-service/                # Buddy matching & management
│   ├── kintell-connector/            # Language/Mentorship integration
│   ├── upskilling-connector/         # Training platform integration
│   ├── unified-profile/              # Aggregated stakeholder data
│   ├── q2q-ai/                       # Question-to-question AI
│   ├── reporting/                    # Impact & analytics
│   ├── safety-moderation/            # Content moderation
│   ├── discord-bot/                  # Community engagement
│   ├── notifications/                # Multi-channel notifications
│   └── api-gateway/                  # Unified API layer
├── packages/
│   ├── shared-schema/                # Drizzle schemas & migrations
│   ├── event-contracts/              # Event-driven contracts
│   ├── shared-types/                 # TypeScript types
│   └── shared-utils/                 # Common utilities
└── reports/                          # Agent deliverable reports
```

## 🤖 Agent Team Structure (30 Agents)

### Lead Agents (5)

1. **Frontend Lead** - Manages Astro, React, UI/UX specialists
2. **Backend Lead** - Manages Node.js, API, service specialists
3. **Data Lead** - Manages DB, schema, analytics specialists
4. **AI Lead** - Manages NLP, ML, embeddings specialists
5. **QA/DevEx Lead** - Manages testing, CI/CD, tooling specialists

### Specialist Agents (~25)

Each lead manages 4-8 specialists. See `.claude/agents/` for full definitions.

**Frontend Specialists (6):**
- astro-specialist
- react-specialist
- tailwind-specialist
- accessibility-specialist
- state-management-specialist
- frontend-testing-specialist

**Backend Specialists (7):**
- nodejs-api-specialist
- event-driven-specialist
- auth-specialist
- integration-specialist
- api-gateway-specialist
- service-mesh-specialist
- backend-testing-specialist

**Data Specialists (5):**
- postgres-specialist
- drizzle-orm-specialist
- clickhouse-specialist
- data-migration-specialist
- analytics-specialist

**AI Specialists (4):**
- nlp-specialist
- embeddings-specialist
- prompt-engineering-specialist
- ai-safety-specialist

**QA/DevEx Specialists (5):**
- ci-cd-specialist
- docker-specialist
- monitoring-specialist
- performance-specialist
- security-specialist

## 📦 Deliverables Tracker

### ✅ Completed

- [x] Monorepo directory structure
- [x] PNPM workspace configuration
- [x] Turbo build system setup

### 🚧 In Progress

- [ ] MULTI_AGENT_PLAN.md (this file)
- [ ] AGENTS.md (architecture & standards)
- [ ] Agent team bootstrap

### ⏳ Pending

- [ ] Root configuration files
- [ ] ESLint/Prettier/TypeScript setup
- [ ] Husky + commitlint
- [ ] GitHub Actions CI
- [ ] Docker Compose infrastructure
- [ ] Shared schema with Drizzle
- [ ] Environment variables template
- [ ] Governance docs
- [ ] Architecture documentation
- [ ] PR templates
- [ ] Verification tests

## 🔄 Communication Protocol

### File-Based Coordination

1. **Read MULTI_AGENT_PLAN.md** before starting any task
2. **Update status** when beginning/completing tasks
3. **Write reports** to `/reports/<agent-name>_<task>.md`
4. **Reference AGENTS.md** for standards and patterns
5. **No direct agent-to-agent calls** - communicate through files

### Agent Invocation Pattern

```markdown
When: <condition>
Invoked by: @<lead-agent>
Reads: AGENTS.md, MULTI_AGENT_PLAN.md, relevant package files
Writes: /reports/<deliverable>.md, code to proper paths
Updates: This plan with completion status
```

## 🎯 Success Criteria

### Build Validation
- [ ] `pnpm install` succeeds without errors
- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w lint` passes
- [ ] `pnpm -w build` succeeds

### Infrastructure Validation
- [ ] `docker compose up` launches all services
- [ ] Health checks pass for Postgres, ClickHouse, MinIO, NATS
- [ ] Database migrations run successfully

### Documentation Validation
- [ ] AGENTS.md complete with architecture & standards
- [ ] CLAUDE.md references @AGENTS.md
- [ ] 30 agent definitions with actionable descriptions
- [ ] All services have README.md with purpose

### Security Validation
- [ ] `.env.example` created (no secrets)
- [ ] `.gitignore` prevents secret commits
- [ ] SECURITY.md with reporting process
- [ ] CODEOWNERS assigned

## 📊 Task Ownership Map

| Task Category | Lead Agent | Specialists | Status |
|---------------|------------|-------------|--------|
| Monorepo Setup | QA/DevEx Lead | ci-cd, docker | In Progress |
| Agent Bootstrap | Tech Lead Orchestrator | config-generator | In Progress |
| Frontend Scaffold | Frontend Lead | astro, react | Pending |
| Backend Scaffold | Backend Lead | nodejs-api, event-driven | Pending |
| Schema Design | Data Lead | postgres, drizzle-orm | Pending |
| AI Foundation | AI Lead | embeddings, prompt-engineering | Pending |
| CI/CD Pipeline | QA/DevEx Lead | ci-cd, security | Pending |
| Local Infra | QA/DevEx Lead | docker, postgres | Pending |

## 🔐 Security Baseline

### Privacy by Design
- All PII stored encrypted at rest
- Field-level encryption for sensitive data
- GDPR compliance patterns in shared-schema
- No secrets in code or git history

### Dependency Security
- Automated vulnerability scanning in CI
- Lock files committed for reproducibility
- Regular dependency updates via Renovate

### Access Control
- CODEOWNERS for service ownership
- Branch protection on main
- Required PR reviews before merge

## 🚀 Next Steps

1. **Immediate (Worker 1):**
   - Complete AGENTS.md
   - Generate 30 agent definitions
   - Set up CI/CD and Docker
   - Verify build pipeline

2. **Handoff to Worker 2 (Services):**
   - unified-profile service
   - API gateway
   - Event contracts
   - Service authentication

3. **Handoff to Worker 3 (Frontend):**
   - Corp Cockpit UI shell
   - Design system
   - Dashboard layouts
   - State management

## 📝 Notes

- **No matching implementation** - Kintell remains the booking system
- **Event-driven by default** - Use NATS for service communication
- **Privacy first** - Encryption patterns in shared-schema
- **Test coverage required** - Minimum 80% for shared packages
- **Type safety enforced** - Strict TypeScript mode enabled

## 🔗 Key References

- Architecture: `docs/Platform_Architecture.md`
- Standards: `AGENTS.md`
- Team Config: `.claude/agents/`
- Reports: `reports/`

---

**Last Action:** Created MULTI_AGENT_PLAN.md foundation
**Next Action:** Create AGENTS.md with standards and patterns
