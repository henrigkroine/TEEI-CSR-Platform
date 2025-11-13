# Multi-Agent Orchestration Structure

## Worker 3: Corporate Cockpit & Metrics Team

**Tech Lead Orchestrator**: Coordinates 30 specialist agents across 5 teams

## Team Structure (30 Agents / 5 Leads)

### Team 1: Frontend Engineering (6 agents)
**Lead**: Frontend Architect
- **Agent 1.1**: Astro 5 Setup Specialist (routing, SSR, islands)
- **Agent 1.2**: React Component Developer (widgets, charts)
- **Agent 1.3**: UI/UX Designer (layouts, responsive design)
- **Agent 1.4**: A11y Specialist (WCAG 2.2 AA compliance)
- **Agent 1.5**: i18n Engineer (en/uk/no, SEO, hreflang)
- **Agent 1.6**: State Management Developer (auth, RBAC, context)

### Team 2: Backend & Data Services (7 agents)
**Lead**: Backend Architect
- **Agent 2.1**: Reporting API Engineer (metrics endpoints)
- **Agent 2.2**: Database Schema Designer (PostgreSQL models)
- **Agent 2.3**: SROI Calculator Engineer (formula implementation)
- **Agent 2.4**: VIS Calculator Engineer (volunteer scoring)
- **Agent 2.5**: Export Service Developer (CSV/JSON/PDF)
- **Agent 2.6**: Rate Limiting & Security Engineer
- **Agent 2.7**: API Documentation Specialist (OpenAPI/Swagger)

### Team 3: Integration & External APIs (6 agents)
**Lead**: Integration Architect
- **Agent 3.1**: Impact-In API Developer (outbound push)
- **Agent 3.2**: Benevity Connector Engineer (stub + mapper)
- **Agent 3.3**: Goodera Connector Engineer (stub + mapper)
- **Agent 3.4**: Workday Connector Engineer (stub + mapper)
- **Agent 3.5**: Discord Bot Developer (feedback hooks)
- **Agent 3.6**: Webhook & Event System Engineer

### Team 4: AI & Q2Q Pipeline (5 agents)
**Lead**: AI/ML Engineer
- **Agent 4.1**: Q2Q Feed Generator (qualitative to quantitative)
- **Agent 4.2**: Evidence Lineage Tracker (provenance)
- **Agent 4.3**: Insight Scoring Engine (confidence ratings)
- **Agent 4.4**: NLP Preprocessor (feedback analysis)
- **Agent 4.5**: ML Model Evaluator (quality metrics)

### Team 5: DevOps, QA & Documentation (6 agents)
**Lead**: QA & DevOps Lead
- **Agent 5.1**: Test Engineer (unit, integration tests)
- **Agent 5.2**: E2E Test Specialist (Playwright scenarios)
- **Agent 5.3**: CI/CD Engineer (build, deploy pipelines)
- **Agent 5.4**: Technical Writer (docs, playbooks)
- **Agent 5.5**: Demo & Sample Data Engineer
- **Agent 5.6**: Performance & Monitoring Engineer

## Orchestration Workflow

### Phase 1: Foundation (Leads 1, 2, 5)
1. Frontend Lead: Set up Astro 5 app structure
2. Backend Lead: Create service skeletons
3. QA Lead: Initialize test frameworks

### Phase 2: Core Services (Leads 2, 4)
1. Backend Lead: Implement reporting endpoints
2. AI Lead: Build Q2Q pipeline
3. Backend Lead: SROI/VIS calculators

### Phase 3: UI & Integration (Leads 1, 3)
1. Frontend Lead: Build dashboard widgets
2. Integration Lead: Create Impact-In API
3. Integration Lead: Discord bot setup

### Phase 4: Polish & Demo (All Leads)
1. Frontend Lead: A11y audit and i18n
2. Integration Lead: Test all connectors
3. QA Lead: Sample data and demo
4. QA Lead: Documentation review

## Communication Protocol

- **Daily**: Lead standup (5 mins)
- **Blockers**: Escalate to Tech Lead immediately
- **Commits**: Small, atomic, tested slices
- **Documentation**: Update `MULTI_AGENT_PLAN.md` after each milestone

## Success Criteria

✅ All endpoints return shaped data
✅ UI builds and runs with `pnpm -w dev`
✅ SROI/VIS formulas tested and documented
✅ Discord bot receives feedback
✅ Demo dashboard renders with mock data
✅ A11y baseline passes (WCAG 2.2 AA)
✅ i18n works for en/uk/no
✅ Export functions download files
✅ No secrets in repo
✅ PR ready with screenshots

## Agent Coordination Rules

1. **No specialist does the Tech Lead's orchestration**
2. **No implementation overlap** - clear ownership
3. **Dependencies mapped** - blocked work escalated early
4. **Test coverage required** - no merges without tests
5. **Documentation mandatory** - every formula, API, decision documented
