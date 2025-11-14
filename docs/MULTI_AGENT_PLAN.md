# TEEI Corporate Cockpit - Multi-Agent Development Plan

**Project**: Enterprise-Grade Corporate Cockpit
**TECH-LEAD ORCHESTRATOR**: Claude (Worker-3)
**Last Updated**: 2025-11-14

---

## Phase Overview

### Phase A-C: Foundation & Pilot (COMPLETE ✅)
- **Phase A**: Multi-tenant routing, RBAC, Admin Console
- **Phase B**: Evidence Explorer, lineage visualization, PII redaction
- **Phase C**: SSE infrastructure, report generation, dashboard caching
- **Status**: 16 commits, ~17,000 lines, 66% performance improvement

### Phase D: Production Launch (IN PROGRESS 🚧)
- **Objective**: Enterprise-grade features for production deployment
- **Timeline**: 3-4 weeks
- **Team**: 30 agents (5 leads + 25 specialists)
- **Deliverables**: 11 major features (A-K)

---

## Phase D Deliverables

### A. Approvals & Audit Mode
**Owner**: `enterprise-ux-lead`
**Status**: 🔴 Not Started
**Priority**: P0 (Execute first)
**Estimated Effort**: 1.5 weeks

#### Description
Multi-step approval workflow with watermarking and version history for compliance.

#### Milestones
1. **A.1**: Approval state machine (draft → review → approve → locked)
   - Owner: `approval-workflow-specialist`
   - Deliverable: State transition logic with RBAC guards
   - Target: Week 1, Day 1-2

2. **A.2**: PDF/PNG watermarking
   - Owner: `audit-watermark-specialist`
   - Deliverable: Server-side watermarking (PDFKit or Puppeteer)
   - Dependencies: Report generation API (Phase C)
   - Target: Week 1, Day 3-4

3. **A.3**: Version history tracking
   - Owner: `audit-watermark-specialist`
   - Deliverable: Document versioning with diff viewer
   - Target: Week 1, Day 5-6

4. **A.4**: Approval UI components
   - Owner: `enterprise-ux-lead`
   - Deliverable: Approval buttons, comment threads, notification badges
   - Target: Week 1, Day 7

#### Acceptance Criteria
- [ ] User can submit report for approval (draft → review)
- [ ] Reviewer can request changes or approve (review → approved)
- [ ] Approver can lock final version (approved → locked)
- [ ] All approved reports have visible watermark with timestamp + approver name
- [ ] Version history shows all edits with diffs
- [ ] Locked reports are read-only (cannot be edited or deleted)
- [ ] Email notifications sent on status changes

#### Dependencies
- Phase C: Report generation API
- Worker-1: Email notification service

---

### B. Partner Portal & Whitelabel Packs
**Owner**: `enterprise-ux-lead`
**Status**: 🔴 Not Started
**Priority**: P1
**Estimated Effort**: 1 week

#### Description
Partner-scoped portal with whitelabel theming for multi-client deployments.

#### Milestones
1. **B.1**: Partner routing architecture
   - Owner: `partner-portal-specialist`
   - Deliverable: `/[lang]/partner/[partnerId]/clients` routing
   - Target: Week 2, Day 1-2

2. **B.2**: Whitelabel theme builder
   - Owner: `whitelabel-pack-specialist`
   - Deliverable: CSS variable configurator (colors, fonts, logos)
   - Target: Week 2, Day 3-4

3. **B.3**: Partner dashboard UI
   - Owner: `partner-portal-specialist`
   - Deliverable: Multi-client overview, aggregated metrics
   - Target: Week 2, Day 5-6

4. **B.4**: Logo injection & branding
   - Owner: `tenant-branding-specialist`
   - Deliverable: Dynamic logo/favicon, email templates
   - Target: Week 2, Day 7

#### Acceptance Criteria
- [ ] Partner user can view all assigned clients
- [ ] Partner can switch between client contexts
- [ ] Each client has unique theme (logo, colors, fonts)
- [ ] Theme changes persist across sessions
- [ ] Reports/exports include client branding
- [ ] Partner cannot access other partners' clients

#### Dependencies
- Phase A: RBAC with PARTNER role
- Worker-1: Multi-tenant asset storage

---

### C. SSO & SCIM UX
**Owner**: `identity-access-lead`
**Status**: 🔴 Not Started
**Priority**: P0 (Execute first)
**Estimated Effort**: 1.5 weeks

#### Description
SSO integration UI with SAML/OIDC metadata display and SCIM provisioning status.

#### Milestones
1. **C.1**: SSO settings page (read-only)
   - Owner: `sso-integration-specialist`
   - Deliverable: Display SAML/OIDC configuration (metadata URL, entity ID, ACS URL)
   - Dependencies: Worker-1 SSO backend
   - Target: Week 1, Day 1-2

2. **C.2**: Role mapping table
   - Owner: `role-mapping-specialist`
   - Deliverable: UI to show IdP claims → RBAC role mappings
   - Target: Week 1, Day 3-4

3. **C.3**: SCIM provisioning status
   - Owner: `scim-provisioning-specialist`
   - Deliverable: Last sync timestamp, user/group counts, error logs
   - Dependencies: Worker-1 SCIM API
   - Target: Week 1, Day 5-6

4. **C.4**: MFA enrollment flow
   - Owner: `mfa-flow-specialist`
   - Deliverable: TOTP setup wizard, backup codes
   - Target: Week 1, Day 7

#### Acceptance Criteria
- [ ] Admin can view SSO configuration (cannot edit)
- [ ] Role mapping table shows all IdP → RBAC mappings
- [ ] SCIM sync status displayed with last sync timestamp
- [ ] User can enroll in MFA (TOTP or SMS)
- [ ] MFA required for ADMIN/SUPER_ADMIN roles
- [ ] Session timeout enforced (configurable)

#### Dependencies
- Worker-1: SSO backend (SAML/OIDC), SCIM API, MFA service
- Phase A: RBAC guards

---

### D. Executive Packs
**Owner**: `reports-pack-lead`
**Status**: 🔴 Not Started
**Priority**: P0 (Execute first)
**Estimated Effort**: 1.5 weeks

#### Description
Board-ready report exports with PDF watermarking, PPTX generation, and narrative controls.

#### Milestones
1. **D.1**: PDF stamping service
   - Owner: `pdf-stamping-specialist`
   - Deliverable: Server-side watermarking API (PDFKit or Puppeteer)
   - Target: Week 1, Day 1-3

2. **D.2**: PPTX export engine
   - Owner: `pptx-generation-specialist`
   - Deliverable: PowerPoint export with embedded charts
   - Libraries: pptxgenjs or node-pptx
   - Target: Week 1, Day 4-6

3. **D.3**: Narrative editor
   - Owner: `narrative-editor-specialist`
   - Deliverable: Rich text editor for exec summaries (TipTap or Lexical)
   - Target: Week 1, Day 7-9

4. **D.4**: Chart embedding
   - Owner: `chart-embedding-specialist`
   - Deliverable: SVG/PNG export for charts (Chart.js to image)
   - Target: Week 2, Day 1-2

5. **D.5**: Executive templates
   - Owner: `executive-template-specialist`
   - Deliverable: 3 board-ready templates (Quarterly, Annual, Investor)
   - Target: Week 2, Day 3-4

#### Acceptance Criteria
- [ ] PDF reports have configurable watermark (text, position, opacity)
- [ ] PPTX export includes cover slide, charts, data tables
- [ ] Narrative editor supports bold, italic, lists, headings
- [ ] Charts export as high-res images (300 DPI)
- [ ] All 3 executive templates available in report wizard
- [ ] Exports download with correct MIME types and filenames

#### Dependencies
- Phase C: Report generation API
- Phase A: Approval workflow (watermark approved reports)

---

### E. PWA Boardroom Mode
**Owner**: `perf-a11y-lead`
**Status**: 🔴 Not Started
**Priority**: P1
**Estimated Effort**: 1 week

#### Description
Progressive Web App with offline caching and last-event replay for board meetings.

#### Milestones
1. **E.1**: Service worker setup
   - Owner: `pwa-specialist`
   - Deliverable: Workbox-based caching (runtime + precache)
   - Target: Week 2, Day 1-2

2. **E.2**: Offline page strategy
   - Owner: `pwa-specialist`
   - Deliverable: Cache dashboard data, show stale-while-revalidate
   - Target: Week 2, Day 3-4

3. **E.3**: Last-event replay
   - Owner: `offline-sync-specialist`
   - Deliverable: Queue SSE events in IndexedDB, replay on reconnect
   - Target: Week 2, Day 5-6

4. **E.4**: PWA manifest & install prompt
   - Owner: `pwa-specialist`
   - Deliverable: manifest.json, iOS meta tags, install banner
   - Target: Week 2, Day 7

#### Acceptance Criteria
- [ ] App works offline with cached dashboard data
- [ ] User sees "Last updated: X minutes ago" when offline
- [ ] SSE events replayed when reconnected (no data loss)
- [ ] User can install as PWA on desktop and mobile
- [ ] Lighthouse PWA score >90
- [ ] Offline page shows helpful message (not browser default)

#### Dependencies
- Phase C: SSE infrastructure
- Worker-1: Service worker CORS headers

---

### F. Benchmarks & Cohorts UI
**Owner**: `qa-compliance-lead`
**Status**: 🔴 Not Started
**Priority**: P1
**Estimated Effort**: 1 week

#### Description
Peer comparison visualizations backed by Worker-2 data warehouse.

#### Milestones
1. **F.1**: Benchmarks API integration
   - Owner: `benchmarks-ui-specialist`
   - Deliverable: Fetch cohort data from Worker-2 DW
   - Dependencies: Worker-2 benchmarks API
   - Target: Week 2, Day 1-2

2. **F.2**: Cohort selector UI
   - Owner: `benchmarks-ui-specialist`
   - Deliverable: Dropdown to select industry, size, geography
   - Target: Week 2, Day 3-4

3. **F.3**: Comparison charts
   - Owner: `benchmarks-ui-specialist`
   - Deliverable: Bar/radar charts showing company vs. cohort
   - Target: Week 2, Day 5-6

4. **F.4**: Percentile indicators
   - Owner: `benchmarks-ui-specialist`
   - Deliverable: "You rank in top 25%" badges
   - Target: Week 2, Day 7

#### Acceptance Criteria
- [ ] User can select cohort (industry, size, geography)
- [ ] Charts show company metrics vs. cohort average/median
- [ ] Percentile ranking displayed for each metric
- [ ] Data refreshes daily from Worker-2 DW
- [ ] No PII visible (aggregated cohort data only)
- [ ] Tooltips explain calculation methodology

#### Dependencies
- Worker-2: Benchmarks API, DW aggregations
- Phase C: Dashboard caching (cache cohort data)

---

### G. Governance UI
**Owner**: `qa-compliance-lead`
**Status**: 🔴 Not Started
**Priority**: P2
**Estimated Effort**: 1 week

#### Description
GDPR/privacy controls: consent management, DSAR status, export logs.

#### Milestones
1. **G.1**: Consent management UI
   - Owner: `governance-ui-specialist`
   - Deliverable: Manage user consents (analytics, marketing, necessary)
   - Target: Week 3, Day 1-2

2. **G.2**: DSAR request status
   - Owner: `governance-ui-specialist`
   - Deliverable: Show data subject access request status
   - Dependencies: Worker-1 DSAR API
   - Target: Week 3, Day 3-4

3. **G.3**: Export logs viewer
   - Owner: `governance-ui-specialist`
   - Deliverable: Audit log of all data exports (who, what, when)
   - Dependencies: Worker-2 audit tables
   - Target: Week 3, Day 5-6

4. **G.4**: Data retention policies
   - Owner: `governance-ui-specialist`
   - Deliverable: Display retention periods, upcoming deletions
   - Target: Week 3, Day 7

#### Acceptance Criteria
- [ ] User can view/update their consent preferences
- [ ] DSAR requests show status (pending, in-progress, completed)
- [ ] Export logs filterable by user, date, data type
- [ ] Data retention policies displayed per data category
- [ ] All actions logged to audit trail
- [ ] GDPR-compliant consent language

#### Dependencies
- Worker-1: DSAR API, consent service
- Worker-2: Audit log tables
- Phase A: RBAC (only admins view export logs)

---

### H. Advanced A11y & Performance
**Owner**: `perf-a11y-lead`
**Status**: 🔴 Not Started
**Priority**: P2
**Estimated Effort**: 1 week

#### Description
WCAG 2.2 AAA compliance, Web Vitals monitoring, Lighthouse budgets.

#### Milestones
1. **H.1**: Screen reader optimization
   - Owner: `a11y-specialist`
   - Deliverable: ARIA labels, live regions, skip links
   - Target: Week 3, Day 1-2

2. **H.2**: Keyboard navigation
   - Owner: `a11y-specialist`
   - Deliverable: Focus management, keyboard shortcuts
   - Target: Week 3, Day 3-4

3. **H.3**: Web Vitals RUM
   - Owner: `web-vitals-specialist`
   - Deliverable: Real User Monitoring with OpenTelemetry
   - Dependencies: Worker-1 observability stack
   - Target: Week 3, Day 5-6

4. **H.4**: Lighthouse CI budgets
   - Owner: `lighthouse-budget-specialist`
   - Deliverable: Performance budgets enforced in CI
   - Target: Week 3, Day 7

#### Acceptance Criteria
- [ ] WCAG 2.2 AA compliance (axe-core 100% pass)
- [ ] AAA compliance for contrast, text size, focus indicators
- [ ] All interactive elements keyboard-accessible
- [ ] Screen reader announces state changes (SSE updates)
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] Lighthouse CI fails on budget violations

#### Dependencies
- Worker-1: OpenTelemetry collector
- Phase C: SSE infrastructure (announce updates)

---

### I. CSP & Trusted Types Compliance
**Owner**: `qa-compliance-lead`
**Status**: 🔴 Not Started
**Priority**: P2
**Estimated Effort**: 3 days

#### Description
Content Security Policy (strict mode) and Trusted Types for DOM XSS prevention.

#### Milestones
1. **I.1**: CSP header configuration
   - Owner: `csp-specialist`
   - Deliverable: Nonce-based CSP with strict-dynamic
   - Dependencies: Worker-1 reverse proxy
   - Target: Week 3, Day 1-2

2. **I.2**: Trusted Types enforcement
   - Owner: `trusted-types-specialist`
   - Deliverable: Sanitize all innerHTML/outerHTML assignments
   - Target: Week 3, Day 3

#### Acceptance Criteria
- [ ] CSP header includes nonce for inline scripts
- [ ] No `unsafe-inline` or `unsafe-eval` in CSP
- [ ] All third-party scripts use Subresource Integrity (SRI)
- [ ] Trusted Types enforced (no DOM XSS violations)
- [ ] CSP violation reports sent to Worker-1 logging

#### Dependencies
- Worker-1: CSP violation endpoint, reverse proxy
- Phase B: PII redaction (sanitize evidence HTML)

---

### J. Status & SLO Surface
**Owner**: `qa-compliance-lead`
**Status**: 🔴 Not Started
**Priority**: P2
**Estimated Effort**: 2 days

#### Description
Read-only status page showing platform health from Worker-1 and Worker-2.

#### Milestones
1. **J.1**: Status page UI
   - Owner: `qa-compliance-lead`
   - Deliverable: Display service uptime, incident history
   - Dependencies: Worker-1 status API
   - Target: Week 3, Day 4-5

#### Acceptance Criteria
- [ ] User can view platform status (operational, degraded, outage)
- [ ] SLO metrics displayed (99.9% uptime target)
- [ ] Incident history with timestamps and resolution times
- [ ] Auto-refresh every 60 seconds
- [ ] Links to detailed status page (Worker-1)

#### Dependencies
- Worker-1: Status API, incident management
- Worker-2: Data warehouse uptime metrics

---

### K. Docs, Demos, Tests
**Owner**: `qa-compliance-lead`
**Status**: 🔴 Not Started
**Priority**: P1
**Estimated Effort**: 1 week

#### Description
E2E tests, visual regression, Storybook demos, API documentation.

#### Milestones
1. **K.1**: E2E test suite
   - Owner: `e2e-test-specialist`
   - Deliverable: Playwright tests for critical paths (login, report gen, evidence)
   - Target: Week 4, Day 1-3

2. **K.2**: Visual regression tests
   - Owner: `e2e-test-specialist`
   - Deliverable: Percy or Chromatic snapshots
   - Target: Week 4, Day 4-5

3. **K.3**: Storybook demos
   - Owner: `qa-compliance-lead`
   - Deliverable: Component library with usage examples
   - Target: Week 4, Day 6-7

4. **K.4**: API documentation
   - Owner: `qa-compliance-lead`
   - Deliverable: OpenAPI specs, Postman collections
   - Target: Week 4, Day 7

#### Acceptance Criteria
- [ ] E2E tests cover 10+ critical user flows
- [ ] Visual regression catches UI changes
- [ ] Storybook published with 50+ components
- [ ] API docs auto-generated from OpenAPI schemas
- [ ] All tests run in CI on every PR
- [ ] Test coverage >80% (unit + E2E)

#### Dependencies
- All deliverables A-J (tests validate features)

---

## Execution Order

### Week 1: P0 Deliverables
- **Days 1-7**: A (Approvals & Audit Mode)
- **Days 1-7**: C (SSO & SCIM UX) [parallel]
- **Days 1-7**: D (Executive Packs) [parallel]

### Week 2: PWA & Benchmarks
- **Days 1-7**: E (PWA Boardroom Mode)
- **Days 1-7**: F (Benchmarks & Cohorts) [parallel]
- **Days 1-4**: B (Partner Portal) [parallel]

### Week 3: Governance & Compliance
- **Days 1-7**: G (Governance UI)
- **Days 1-7**: H (Advanced A11y & Performance) [parallel]
- **Days 1-3**: I (CSP & Trusted Types) [parallel]
- **Days 4-5**: J (Status & SLO Surface) [parallel]

### Week 4: Testing & Launch Prep
- **Days 1-7**: K (Docs, Demos, Tests)
- **Days 5-7**: Final integration testing
- **Day 7**: Production launch readiness review

---

## Risk Register

| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| Worker-1 SSO API delayed | High | Medium | Implement mock SSO for testing | identity-access-lead |
| Worker-2 benchmarks API not ready | Medium | Low | Show placeholder cohort data | qa-compliance-lead |
| PPTX generation library issues | Medium | Medium | Fallback to PDF-only exports | reports-pack-lead |
| PWA service worker bugs in Safari | Medium | High | Graceful degradation, test extensively | perf-a11y-lead |
| CSP breaks third-party scripts | High | Medium | Whitelist known CDNs, use SRI | csp-specialist |
| E2E tests flaky in CI | Low | High | Retry logic, increase timeouts | e2e-test-specialist |
| Tight timeline (4 weeks) | High | Medium | Daily standups, ruthless prioritization | TECH-LEAD |

---

## Success Criteria

### Functional
- [ ] All 11 deliverables (A-K) complete with acceptance criteria met
- [ ] Zero P0/P1 bugs in staging
- [ ] All critical paths covered by E2E tests

### Non-Functional
- [ ] Lighthouse score >90 (Performance, A11y, Best Practices, SEO)
- [ ] WCAG 2.2 AA compliant (AAA target)
- [ ] Core Web Vitals pass (LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] CSP strict mode enforced (no unsafe-inline)
- [ ] Test coverage >80%

### Operational
- [ ] Production deployment runbook complete
- [ ] Incident response playbook documented
- [ ] Rollback procedure tested
- [ ] On-call rotation staffed

---

## Sign-Offs

| Stakeholder | Role | Sign-Off Date | Status |
|-------------|------|---------------|--------|
| Product Owner | Business | TBD | ⏳ Pending |
| Worker-1 Lead | Platform/Security | TBD | ⏳ Pending |
| Worker-2 Lead | Data Warehouse | TBD | ⏳ Pending |
| TECH-LEAD ORCHESTRATOR | Worker-3 | TBD | ⏳ Pending |
| QA Lead | Testing | TBD | ⏳ Pending |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-14 | Claude (Worker-3) | Initial Phase D plan with deliverables A-K |
