# TEEI Corporate Cockpit - Agent Team Structure

**Phase D: Production Launch - Enterprise-Grade Features**

## Team Overview

**TECH-LEAD ORCHESTRATOR (Worker-3)**: Claude
- Total Team Size: 30 agents (5 leads + 25 specialists)
- Coordination: Worker-1 (Platform/Security), Worker-2 (Data Warehouse)
- Objective: Enterprise-grade cockpit ready for production launch

---

## Team Structure

### 1. Enterprise UX Lead (1 lead + 5 specialists)

**Lead**: `enterprise-ux-lead`
- Owns: Approvals workflow, Partner Portal, Whitelabel Packs
- Reports to: TECH-LEAD ORCHESTRATOR

**Specialists**:
1. `approval-workflow-specialist` - Multi-step approval state machine
2. `audit-watermark-specialist` - PDF/PNG watermarking, version history
3. `partner-portal-specialist` - Partner-scoped routing and UI
4. `whitelabel-pack-specialist` - Theme builder, logo injection
5. `tenant-branding-specialist` - CSS variables, brand guidelines

**Deliverables**: A, B

---

### 2. Identity & Access Lead (1 lead + 5 specialists)

**Lead**: `identity-access-lead`
- Owns: SSO, SAML, OIDC, SCIM provisioning
- Reports to: TECH-LEAD ORCHESTRATOR

**Specialists**:
1. `sso-integration-specialist` - SAML/OIDC metadata display
2. `scim-provisioning-specialist` - User/group sync automation
3. `role-mapping-specialist` - IdP claims → RBAC roles
4. `session-management-specialist` - JWT refresh, session timeouts
5. `mfa-flow-specialist` - Multi-factor authentication UI

**Deliverables**: C

---

### 3. Reports & Executive Packs Lead (1 lead + 5 specialists)

**Lead**: `reports-pack-lead`
- Owns: PDF watermarking, PPTX export, narrative controls
- Reports to: TECH-LEAD ORCHESTRATOR

**Specialists**:
1. `pdf-stamping-specialist` - Server-side watermarking (PDFKit/Puppeteer)
2. `pptx-generation-specialist` - PowerPoint export with charts
3. `narrative-editor-specialist` - Rich text controls for exec summaries
4. `chart-embedding-specialist` - SVG/PNG chart exports
5. `executive-template-specialist` - Board-ready templates

**Deliverables**: D

---

### 4. Performance & Accessibility Lead (1 lead + 5 specialists)

**Lead**: `perf-a11y-lead`
- Owns: PWA, offline mode, Web Vitals, WCAG 2.2 AAA
- Reports to: TECH-LEAD ORCHESTRATOR

**Specialists**:
1. `pwa-specialist` - Service worker, offline cache, manifest
2. `web-vitals-specialist` - RUM, OpenTelemetry, Lighthouse budgets
3. `a11y-specialist` - Screen readers, keyboard nav, ARIA
4. `lighthouse-budget-specialist` - Performance budgets, CI enforcement
5. `offline-sync-specialist` - Last-event replay, conflict resolution

**Deliverables**: E, H

---

### 5. QA & Compliance Lead (1 lead + 5 specialists)

**Lead**: `qa-compliance-lead`
- Owns: CSP, Trusted Types, E2E tests, governance UI
- Reports to: TECH-LEAD ORCHESTRATOR

**Specialists**:
1. `csp-specialist` - Content Security Policy (nonce-based, strict)
2. `trusted-types-specialist` - DOM XSS prevention
3. `e2e-test-specialist` - Playwright tests, visual regression
4. `governance-ui-specialist` - Consent, DSAR status, export logs
5. `benchmarks-ui-specialist` - Cohorts visualization (Worker-2 API)

**Deliverables**: F, G, I, J, K

---

## Cross-Team Coordination

### Worker-1 Dependencies
- **Status & SLO Surface (J)**: Read-only display of platform health
- **CSP & Trusted Types (I)**: Alignment with platform security policies
- **SSO/SCIM (C)**: Integration with central identity provider

### Worker-2 Dependencies
- **Benchmarks & Cohorts (F)**: DW API for peer comparison data
- **Report Generation (D)**: Data warehouse queries for executive packs
- **Governance UI (G)**: Export logs from DW audit tables

---

## Agent Communication Protocols

### Daily Stand-ups (Async)
- Each lead posts progress to `/reports/daily_standup_YYYYMMDD.md`
- Blockers escalated immediately to TECH-LEAD ORCHESTRATOR
- Dependencies tracked in MULTI_AGENT_PLAN.md

### Code Review Process
1. Specialist completes feature → PR created
2. Lead reviews PR → requests changes or approves
3. TECH-LEAD ORCHESTRATOR merges to branch
4. CI/CD runs smoke tests

### Testing Protocol
- Unit tests: 80% coverage minimum
- E2E tests: Critical paths only
- Visual regression: Storybook snapshots
- Accessibility: axe-core automated + manual

---

## Escalation Path

**Level 1**: Specialist → Lead (technical blockers)
**Level 2**: Lead → TECH-LEAD ORCHESTRATOR (cross-team dependencies)
**Level 3**: TECH-LEAD ORCHESTRATOR → Worker-1/Worker-2 (platform/data blockers)
**Level 4**: All Workers → Human Product Owner (business decisions)

---

## Success Metrics

### Velocity
- Story points per sprint: 50-70 across all teams
- Cycle time: 3-5 days per feature
- PR merge time: <24 hours

### Quality
- Zero critical security vulnerabilities
- <5 P1 bugs in staging
- 100% WCAG 2.2 AA compliance (AAA target)
- Lighthouse score >90 (Performance, Accessibility, Best Practices, SEO)

### Delivery
- Phase D completion: 3-4 weeks
- Production launch: Week 5
- Post-launch support: Week 6-8

---

## Agent Availability

**Full-time (40h/week)**: All 5 leads
**Part-time (20h/week)**: 25 specialists (5 per lead)
**On-call**: TECH-LEAD ORCHESTRATOR (24/7)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Claude (Worker-3) | Initial Phase D team structure |
