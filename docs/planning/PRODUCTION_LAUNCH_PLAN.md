# Production Launch Execution Plan

This document tracks the seven launch-readiness workstreams we discussed. Each section summarizes the target state, current blockers, and concrete next actions so we can execute sequentially without losing sight of dependencies.

---

## 1. Infrastructure & Operations

**Goal:** Harden local/dev orchestration into production-ready deployments with monitoring, logging, and conflict-free ports.

- **Status (2025‑11‑27)** ✅  
  - `ecosystem.config.cjs` now defines **per-service PM2 apps** with memory ceilings, port/env overrides, and individual log files (`logs/<service>-out.log`). See `docs/operations/INFRASTRUCTURE_READINESS.md#1-pm2-process-model`.
  - Production topology, logging/monitoring plan, port override matrix, and backup/restore baseline captured in `docs/operations/INFRASTRUCTURE_READINESS.md`.
  - Port 4321 conflicts mitigated via `ASTRO_PORT` env + PM2 args; table lists all overrides.
  - Backup cadence for Postgres, ClickHouse, Redis, NATS documented with restore drills.
- **Remaining follow-ups**
  1. Implement OTEL collector configuration + service instrumentation (tracked under Workstream 5).
  2. Containerize services / author Helm charts to realize the described production topology.
  3. Wire structured logging + log shipping into each service (pending code changes).

---

## 2. Data Trust & Quality (Worker 5)

**Goal:** Meet J1–J7 acceptance criteria for lineage, quality, semantic layer, catalog UI, retention, SLOs, and documentation.

- **Actions by slice**
  - **J1 OpenLineage:** Instrument `impact-in`, `reporting`, `q2q-ai`, `analytics`; wire ClickHouse/Postgres sinks; add `pnpm lineage:validate`.
  - **J2 Great Expectations:** Ship suites for eight critical tables with ≥90 % pass enforced by `pnpm dq:ci`.
  - **J3 dbt Semantic Layer:** Build stg/marts/metrics, exposures, docs, compare metrics to service calculators.
  - **J4 Catalog UI:** Implement `/cockpit/[companyId]/catalog` dataset cards, freshness/test badges, lineage drill-through.
  - **J5 Retention:** Tag GDPR categories + residency, set TTL policies, integrate DSAR hooks.
  - **J6 Data SLOs:** Grafana dashboard + burn-rate alerts for freshness/test/lineage coverage.
  - **J7 Docs:** Publish `/docs/data/*` runbooks + `reports/worker5_data_trust_readout.md`.

---

## 3. Application Layer (UX, Identity, Reports, Perf)

**Goal:** Deliver outstanding work items for Worker 3 teams (UX, Identity, Reports, Perf/A11y, QA/Compliance) plus finalize Astro routing fixes.

- **Actions**
  1. Team 1: Approvals workflow, audit mode overlay, partner portal, benchmarks UI, consent/incident modules.
  2. Team 2: SSO metadata display, SCIM mapping UX, role sync, whitelabel validation, export log UI, widget-level error boundaries.
  3. Team 3: PDF watermarking, PPTX export, narrative controls, chart perf improvements, exec docs.
  4. Team 4: Service worker/offline cache, SSE resume banners, screen-reader scripts, keyboard focus maps, WCAG target-size compliance, Trusted Types + CSP.
  5. Team 5: Visual regression baselines, SRI hashes, E2E flows (approvals/PWA/SSO/exec packs, etc.).
  6. Astro i18n: Keep middleware + `/home` redirect fix, reintroduce `site` per environment during prod build.

---

## 4. Backend & Services

**Goal:** Ensure each microservice is deployable independently with health checks, scaling rules, and consistent migrations/seeding.

- **Actions**
  1. Containerize services (or run as PM2 cluster) with readiness/liveness endpoints.
  2. Formalize Drizzle migration workflow (CLI generation + CI enforcement).
  3. Add health endpoints (where missing) and central service registry.
  4. Implement rate limiting, circuit breakers, and JetStream monitoring.
  5. Harden secrets management (vaulted credentials, no plain-text `.env` in production).

---

## 5. Testing & QA

**Goal:** Meet coverage gates (unit ≥80 %, E2E ≥60 %) and layer in visual/a11y/perf testing.

- **Actions**
  1. Audit existing test suites, close gaps, and report coverage to CI.
  2. Build Playwright scenarios per Worker 3 QA team responsibilities.
  3. Add Storybook/Ladle visual regression pipeline with baselines.
  4. Run axe-core + manual WCAG sweeps on key flows.
  5. Integrate Web Vitals RUM + budgets into CI.

---

## 6. Security & Compliance

**Goal:** Enforce PII safeguards, GDPR retention, DSAR workflows, RBAC hardening, and CSP/Trusted Types.

- **Actions**
  1. Extend PII redaction, audit logging, and citation checks across all services.
  2. Implement GDPR category/residency tagging + TTL enforcement (ties to Worker 5 J5).
  3. Automate DSAR hooks for selective deletion.
  4. Tighten authentication/session policies (MFA, refresh tokens, secure cookies).
  5. Deploy nonce-based CSP + Trusted Types, monitor violations via reporting endpoints.

---

## 7. Documentation & Launch Procedures

**Goal:** Produce comprehensive runbooks, deployment guides, incident response plans, and final go-live checklist.

- **Actions**
  1. Consolidate docs (`CLAUDE.md`, `RUN_PROJECT.md`, `LOCAL_DEV_OPTIMIZATION.md`, etc.) into a production-ready handbook.
  2. Create deployment/rollback SOPs for dev→staging→prod with approval gates.
  3. Author Ops on-call playbooks (alert response, DSAR, retention policy execution).
  4. Update `MULTI_AGENT_PLAN.md` and `/reports/worker5_data_trust_readout.md` after each milestone.
  5. Capture staging validation evidence (screens, logs, test results) before launch.

---

### Execution Notes

- Workstreams are interdependent—e.g., Catalog UI (J4) needs GE/OL data ready; PM2/infra updates must align with QA test harnesses.
- Track progress in this document as PRs land; reference ticket IDs and owners.
- When a section hits acceptance, note test evidence and attach PR links for auditability.

