# Worker 8: Moats, Notarization, Regional AI & i18n - Multi-Agent Plan

**Status**: 🚧 In Progress | **Started**: 2025-11-17
**Branch**: `claude/worker8-moats-notarization-regionalai-i18n-01PfvNmtHSbdxZQg5ZNiaC6L`

**Mission**: Implement three critical platform moats:
1. **Impact Notarization** - Cryptographic proof of report integrity
2. **Regional AI Controls** - Data residency-aware model selection
3. **i18n Parity & RTL** - Full internationalization with RTL support

---

## Team Structure (30 Agents / 5 Leads)

### Team 1: Impact Notarization (6 agents)
**Lead**: notarization-architect

**Agents**:
- **Agent 1.1**: crypto-signing-engineer (Ed25519 signing, digest generation)
- **Agent 1.2**: verification-api-engineer (REST API: `/trust/v1/impact-proof/:reportId`)
- **Agent 1.3**: notarization-storage-engineer (PostgreSQL schemas, audit trail)
- **Agent 1.4**: trust-center-ui-engineer (Public verification page)
- **Agent 1.5**: notarization-middleware (Auto-sign on report finalization)
- **Agent 1.6**: notarization-test-engineer (Crypto tests, performance validation)

**Scope**:
- `services/reporting/src/evidence/notarization/`
- `apps/trust-center/src/pages/impact-proof/`
- `docs/trust-center/impact_proof.md`

---

### Team 2: Regional AI Controls (8 agents)
**Lead**: regional-ai-architect

**Agents**:
- **Agent 2.1**: model-registry-region-engineer (Extend types with `regionPolicy`)
- **Agent 2.2**: region-selector-engineer (Region-aware model selection logic)
- **Agent 2.3**: data-residency-integrator (Connect model registry to residency service)
- **Agent 2.4**: reporting-region-middleware (Honor `X-Data-Region` headers)
- **Agent 2.5**: llm-client-region-patcher (Update LLM client to use region hints)
- **Agent 2.6**: region-policy-auditor (Log all region-based decisions)
- **Agent 2.7**: region-block-enforcer (Block cross-region calls by policy)
- **Agent 2.8**: region-test-engineer (Residency tests, latency validation)

**Scope**:
- `packages/model-registry/src/`
- `services/data-residency/src/`
- `services/reporting/src/lib/llm-client.ts`
- `services/reporting/src/middleware/region-enforcement.ts`

---

### Team 3: i18n & RTL Support (8 agents)
**Lead**: i18n-architect

**Agents**:
- **Agent 3.1**: i18n-parity-checker-engineer (CI script to validate key parity)
- **Agent 3.2**: rtl-layout-engineer (CSS direction:rtl, logical properties)
- **Agent 3.3**: ar-locale-validator (Arabic translation completeness)
- **Agent 3.4**: he-locale-validator (Hebrew translation completeness)
- **Agent 3.5**: rtl-smoke-tester (Visual regression for RTL layouts)
- **Agent 3.6**: i18n-ci-integrator (Wire parity check into CI pipeline)
- **Agent 3.7**: rtl-documentation-engineer (RTL best practices guide)
- **Agent 3.8**: i18n-test-engineer (Locale loading tests, parity validation)

**Scope**:
- `apps/corp-cockpit-astro/src/i18n/`
- `scripts/ci/i18n-parity-check.ts`
- `docs/i18n/rtl_guide.md`

---

### Team 4: Integration & E2E Testing (5 agents)
**Lead**: integration-lead

**Agents**:
- **Agent 4.1**: notarization-e2e-tester (End-to-end report signing & verification)
- **Agent 4.2**: region-latency-tester (Validate p95 latency ≤20ms overhead)
- **Agent 4.3**: region-enforcement-e2e-tester (Cross-region blocking scenarios)
- **Agent 4.4**: i18n-ci-e2e-tester (CI failure on missing keys)
- **Agent 4.5**: rtl-visual-e2e-tester (Playwright RTL layout screenshots)

**Scope**:
- `services/reporting/tests/notarization.e2e.ts`
- `packages/model-registry/tests/region-policy.test.ts`
- `scripts/ci/i18n-parity-check.test.ts`
- `apps/corp-cockpit-astro/tests/e2e/rtl.spec.ts`

---

### Team 5: Documentation & Compliance (3 agents)
**Lead**: docs-compliance-lead

**Agents**:
- **Agent 5.1**: trust-center-docs-writer (Public-facing impact proof guide)
- **Agent 5.2**: rtl-guide-writer (Developer RTL implementation guide)
- **Agent 5.3**: security-auditor (Crypto security review, residency compliance)

**Scope**:
- `docs/trust-center/impact_proof.md`
- `docs/i18n/rtl_guide.md`
- `reports/WORKER8_SECURITY_AUDIT.md`

---

## Implementation Slices (W1–W7)

### W1: Impact Notarization - Crypto Library
**Agents**: 1.1, 1.3, 1.6
**Deliverables**:
- `notarization/signer.ts` - Ed25519 signing with sodium-native
- `notarization/verifier.ts` - Signature verification
- `notarization/digest.ts` - SHA-256 report section digests
- PostgreSQL schema: `report_notarization` table
- Unit tests: signing, verification, tamper detection
- **Acceptance**: Crypto tests pass; signing latency <5ms p95

---

### W2: Notarization API & Middleware
**Agents**: 1.2, 1.5, 1.6
**Deliverables**:
- REST endpoint: `POST /api/v1/reports/:id/notarize`
- REST endpoint: `GET /trust/v1/impact-proof/:reportId`
- Middleware: Auto-sign on report finalization
- Audit logging: all notarization events
- Integration tests: API contract validation
- **Acceptance**: API returns signed proof; latency ≤20ms p95 end-to-end

---

### W3: Trust Center Verification UI
**Agents**: 1.4, 1.6, 5.1
**Deliverables**:
- Public page: `/apps/trust-center/src/pages/impact-proof/verify.astro`
- UI: Paste report ID → fetch proof → display verification status
- Visual: Green checkmark (valid) / Red warning (invalid/tampered)
- Public doc: `docs/trust-center/impact_proof.md`
- E2E test: Valid/invalid report verification flows
- **Acceptance**: Public verification works; doc published; screenshot in `/reports/`

---

### W4: Model Registry Regional Policy
**Agents**: 2.1, 2.2, 2.8
**Deliverables**:
- Extend `TenantOverride` schema with `regionPolicy?: RegionPolicy`
- Add `RegionPolicy` type: `{ allowedRegions: Region[], enforcementMode: 'strict' | 'advisory' }`
- Model selection logic: `getModelForRegion(tenantId, region): string`
- Unit tests: Region-aware model selection, fallback to primary region
- **Acceptance**: Model selection respects region policy; tests pass

---

### W5: Data Residency Integration
**Agents**: 2.3, 2.4, 2.5, 2.7
**Deliverables**:
- Middleware: `validateRegion(companyId, requestedRegion)` → block if violates policy
- LLM client patch: Honor `X-Data-Region` header when selecting model
- Audit logging: All region enforcement decisions logged
- Error responses: HTTP 403 with clear "Region not allowed" message
- Integration tests: Cross-region blocking scenarios
- **Acceptance**: Requests to disallowed regions fail with 403; audit trail complete

---

### W6: i18n Parity Check CI
**Agents**: 3.1, 3.6, 3.8
**Deliverables**:
- CI script: `scripts/ci/i18n-parity-check.ts`
  - Load base locale: `en.json`
  - Compare all locales: `ar.json`, `he.json`, `uk.json`, `no.json`
  - Fail if missing keys detected
  - Output: Missing key report with file paths
- CI integration: `pnpm i18n:check` in PR gate
- Unit tests: Parity checker validates known mismatches
- **Acceptance**: CI fails on missing keys; build passes when parity achieved

---

### W7: RTL Layout & Documentation
**Agents**: 3.2, 3.3, 3.4, 3.5, 3.7
**Deliverables**:
- RTL CSS: `[dir="rtl"]` styles using CSS logical properties
- Arabic locale: Resolve merge conflicts, ensure 100% key parity
- Hebrew locale: Ensure 100% key parity
- Visual regression: Playwright screenshots for RTL layouts
- RTL guide: `docs/i18n/rtl_guide.md` (CSS patterns, testing, gotchas)
- **Acceptance**: RTL layouts render correctly; visual regression tests pass; doc published

---

## Quality Gates & Guardrails

### Blocking Conditions (Fail CI):
- ❌ Notarization crypto tests fail
- ❌ Signing latency >20ms p95
- ❌ Region enforcement tests fail (cross-region calls succeed when they should be blocked)
- ❌ i18n parity check detects missing keys
- ❌ RTL visual regression tests fail (layout broken)
- ❌ Security audit flags crypto vulnerabilities

### Enforcement:
- Existing PR gates apply: lint, typecheck, unit ≥80%, E2E ≥60%, security audits, a11y
- New gates:
  - `pnpm notarization:test` (crypto + API tests)
  - `pnpm region:test` (residency enforcement tests)
  - `pnpm i18n:check` (parity validation)
  - `pnpm rtl:visual` (RTL visual regression)

### No Secrets Policy:
- Use existing Vault/Secrets Manager for crypto keys
- No private keys, API keys, or PII in repo

---

## Success Criteria

✅ **W1 (Notarization Crypto)**: Signing library functional; tests pass; latency <5ms p95
✅ **W2 (Notarization API)**: REST endpoints deployed; latency ≤20ms p95; audit trail complete
✅ **W3 (Trust Center UI)**: Public verification page live; doc published; screenshots in `/reports/`
✅ **W4 (Regional Policy)**: Model registry extended; region-aware selection functional; tests pass
✅ **W5 (Residency Integration)**: Cross-region blocking enforced; audit trail complete; HTTP 403 on violations
✅ **W6 (i18n Parity)**: CI script wired; build fails on missing keys; parity achieved across all locales
✅ **W7 (RTL Support)**: RTL layouts functional; visual regression tests pass; doc published

---

## Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **Documentation**: Update `/reports/WORKER8_PROGRESS.md` after each milestone
- **Agent Artifacts**: All agents write-to-file in `/reports/` + update this plan

---

## Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does Tech Lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early (e.g., Trust Center depends on API)
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every API, crypto library, policy documented
6. **Least-privilege tools** - Agents use minimum required tools

---

## Current Progress

- [x] Codebase survey complete
- [x] Arabic locale merge conflicts resolved
- [ ] Impact Notarization library
- [ ] Notarization API & middleware
- [ ] Trust Center verification UI
- [ ] Model registry regional policy
- [ ] Data residency integration
- [ ] i18n parity check CI
- [ ] RTL layout support
- [ ] Comprehensive tests
- [ ] Documentation
- [ ] Final PR & push

---

## Dependencies

### External:
- `sodium-native` - Ed25519 signing (crypto library)
- Existing `services/data-residency` - Region enforcement
- Existing `packages/model-registry` - Model configuration
- Existing i18n infrastructure - Locale loading

### Internal:
- W3 depends on W2 (Trust Center needs API)
- W5 depends on W4 (Residency integration needs registry extension)
- W7 depends on W6 (RTL tests need parity check)

---

## Risk Mitigation

1. **Crypto Security**: Use battle-tested libraries (sodium-native); external security audit
2. **Performance**: Benchmark notarization latency early; optimize if >20ms p95
3. **Region Enforcement**: Comprehensive test matrix (EU→US, US→EU, EU→EU, etc.)
4. **i18n Gaps**: Automated parity checker prevents drift; CI enforcement
5. **RTL Regressions**: Visual regression tests catch layout breaks early

---

**Next Step**: Begin W1 - Impact Notarization Crypto Library implementation.
