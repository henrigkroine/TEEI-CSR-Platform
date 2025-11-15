# Phase H2: Ops & Compliance GA - Comprehensive Infrastructure Map

**Date**: 2025-11-15  
**Repository**: TEEI CSR Platform  
**Phase**: H2 (Operations & Compliance General Availability)

---

## Executive Summary

### Current State (What Exists)
The platform has foundational infrastructure in place for security, compliance, and observability:
- **Audit Logging**: Comprehensive audit logger with GDPR basis tracking
- **Security**: JWT RS256, OIDC SSO, webhook HMAC-SHA256, WAF, service auth
- **Compliance**: AI Act Risk Log, Model Cards, GDPR compliance framework
- **Supply Chain**: SBOM generation (Syft), image signing (Cosign), vulnerability scanning
- **Admin Cockpit**: Partial admin console with API keys, branding, theme, audit log tabs
- **Analytics**: Analytics Operations dashboard for real-time health monitoring
- **AI Costs**: Token usage tracking, budget limits, Prometheus metrics (100% consumption)

### Critical Gaps (What Needs to Be Built)
- **Billing/Metering**: No customer-facing metering, pricing tiers, or usage-based billing
- **SIEM/DLP**: No centralized SIEM, DLP scanners, or data exfiltration detection
- **Compliance Dashboard**: No centralized compliance status, policy management, or audit reports
- **Supply Chain Evidence**: No SLSA provenance, artifact attestations, or build reproducibility
- **Admin Compliance Pages**: Limited compliance-specific admin pages (no DLP, SIEM, policy management)

---

## 1. Billing & Metering Infrastructure

### What Exists ✅
**AI Cost Tracking** (`/packages/observability/src/ai-costs.ts`)
- ✅ Prometheus metrics: `ai_tokens_used_total`, `ai_cost_dollars_total`, `ai_budget_remaining_dollars`
- ✅ Per-tenant monthly budget tracking (default $100/month)
- ✅ Alert thresholds: 80%, 90%, 100%
- ✅ Hard stop enforcement at 100% budget (429 error)
- ✅ Grafana dashboard with 5 panels
- ✅ Budget API endpoints: `GET /v1/gen-reports/budget`, `PUT /v1/admin/budgets/{companyId}`
- ✅ Audit trail in `audit_logs` table

### What's Missing ❌
| Component | Status | Details |
|-----------|--------|---------|
| **Usage-Based Billing** | ❌ | No pricing models, SKUs, or customer tiers |
| **Metering Collectors** | ❌ | Only AI costs tracked; no API call counts, data storage, or compute metering |
| **Billing Service** | ❌ | No billing engine, invoice generation, or payment processing |
| **Usage Dashboard** | ❌ | No customer-facing usage analytics or consumption trends |
| **Quota Management** | ❌ | No per-feature quotas (reports/month, API calls, data ingestion) |
| **Chargeback Allocation** | ❌ | No cost attribution by feature, department, or user |
| **Billing Admin Pages** | ❌ | No admin console for managing customer plans, overrides, or discounts |

### Phase H2 Build Checklist
- [ ] Design pricing tiers (Starter, Professional, Enterprise)
- [ ] Implement metering collectors for all billable metrics
- [ ] Build billing service with invoice generation
- [ ] Create customer-facing usage dashboard
- [ ] Implement quota enforcement middleware
- [ ] Add billing admin pages to compliance cockpit
- [ ] Integrate Stripe/Chargebee for payment processing
- [ ] Implement chargeback allocation logic

**Files to Create**:
- `/services/billing/src/` - Billing microservice
- `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/billing.astro`
- `/apps/corp-cockpit-astro/src/components/admin/BillingManager.tsx`

---

## 2. Security Infrastructure (SIEM & DLP)

### What Exists ✅
**Security Scanning & Hardening**:
- ✅ Security scanning workflow: Snyk, CodeQL, TruffleHog, Checkov
- ✅ JWT RS256 with JWKS endpoint
- ✅ OIDC SSO (Google, Azure AD)
- ✅ Webhook HMAC-SHA256 verification (Kintell, Upskilling)
- ✅ Service-to-service auth (RS256 JWT, 5-min lifetime)
- ✅ WAF: rate limiting, payload validation, threat detection (SQL/XSS), security headers
- ✅ CSP enforcement with nonce-based policy
- ✅ Trusted Types for DOM XSS prevention
- ✅ SRI for CDN resources
- ✅ Audit logging with AuditLogger class

**Audit Infrastructure**:
- ✅ Comprehensive audit logger: `AuditLogger` class with 8 action categories
- ✅ Audit log entries: actor, action, resource, before/after state
- ✅ GDPR legal basis tracking (consent, contract, legal obligation, etc.)
- ✅ Retention policies with automatic purge
- ✅ Query interface for log retrieval

### What's Missing ❌
| Component | Status | Details |
|-----------|--------|---------|
| **SIEM Integration** | ❌ | No Datadog, Splunk, or ELK Stack integration |
| **Log Aggregation** | ❌ | Audit logs only; no centralized collection |
| **Threat Detection** | ❌ | No anomaly detection, brute-force detection, or behavioral analytics |
| **DLP Scanners** | ❌ | No PII detection in logs, no data loss prevention policies |
| **Incident Response** | ❌ | No automated incident tickets, no alert routing |
| **Security Dashboard** | ❌ | No admin page for viewing security events, threats, or DLP status |
| **Compliance Reporting** | ❌ | No security incident reports for compliance audits |

### Phase H2 Build Checklist
- [ ] Integrate Datadog or Splunk for SIEM
- [ ] Implement log aggregation (fluentd/filebeat)
- [ ] Add anomaly detection (statistical, ML-based)
- [ ] Build DLP scanner for PII in logs
- [ ] Create security event admin pages
- [ ] Implement incident response automation
- [ ] Add compliance security report generation

**Files to Create**:
- `/services/siem/src/` - SIEM aggregation service
- `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/security.astro`
- `/apps/corp-cockpit-astro/src/components/admin/SecurityDashboard.tsx`

---

## 3. Compliance Frameworks

### What Exists ✅
**Compliance Documentation**:
- ✅ AI Act Risk Log: 7 risks documented with controls (bias, PII, drift, misuse, provider vulnerabilities, training data representativeness)
- ✅ Model Cards: Q2Q, SROI, VIS with intended use, limitations, bias analysis
- ✅ AI Act Classification: Q2Q = Limited Risk, SROI/VIS = Minimal Risk
- ✅ GDPR compliance: consent, DSAR, deletion, encryption, audit logging
- ✅ Incident response plan: 5 phases (detection → remediation)
- ✅ Monitoring: quarterly risk reviews, annual audits, trigger-based escalations

**Governance Infrastructure**:
- ✅ Consent management schema (user_consents table)
- ✅ DSAR orchestrator (consent, deletion workflows)
- ✅ Retention policies (GDPR Article 5)
- ✅ Audit logging with legal basis

### What's Missing ❌
| Component | Status | Details |
|-----------|--------|---------|
| **Policy Management** | ❌ | No admin interface for managing compliance policies |
| **Compliance Dashboard** | ❌ | No centralized view of compliance status |
| **SOC 2 Evidence Collection** | ❌ | No automated controls evidence, no audit artifacts |
| **Certification Tracking** | ❌ | No ISO 27001, SOC 2 Type II tracking |
| **Control Effectiveness** | ❌ | No metrics on control performance |
| **Audit Report Generation** | ❌ | No automated audit reports for regulators |
| **Regulatory Mapping** | ❌ | No mapping of controls to GDPR/HIPAA/PCI-DSS articles |
| **Evidence Archive** | ❌ | No secure archive for compliance evidence |

### Phase H2 Build Checklist
- [ ] Create compliance policy management UI
- [ ] Build centralized compliance dashboard
- [ ] Implement SOC 2 evidence collection automation
- [ ] Add certification tracking (ISO 27001, SOC 2 Type II)
- [ ] Build control effectiveness metrics
- [ ] Implement audit report generation
- [ ] Create regulatory mapping framework

**Files to Create**:
- `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/compliance.astro`
- `/apps/corp-cockpit-astro/src/components/admin/ComplianceDashboard.tsx`
- `/apps/corp-cockpit-astro/src/components/admin/PolicyManager.tsx`

---

## 4. Supply Chain Security

### What Exists ✅
**Image Signing & SBOMs**:
- ✅ SBOM generation with Syft (SPDX-JSON format, 90-day retention)
- ✅ Container image signing with Cosign (keyless/OIDC flow)
- ✅ Trivy container vulnerability scanning (SARIF output, HIGH/CRITICAL severity)
- ✅ Build artifact storage in GitHub Actions
- ✅ Image metadata and tag management (semantic versioning)

**Code Scanning**:
- ✅ Snyk dependency scanning (npm, docker)
- ✅ CodeQL static analysis (JavaScript, TypeScript)
- ✅ TruffleHog secret scanning
- ✅ Checkov IaC scanning (Dockerfile, GitHub Actions)
- ✅ License compliance checking

**Data Provenance**:
- ✅ Evidence lineage tracking in database
- ✅ Q2Q classifier provenance (source, confidence, timestamp)
- ✅ Evidence snippets with source traceability

### What's Missing ❌
| Component | Status | Details |
|-----------|--------|---------|
| **SLSA Provenance** | ❌ | No SLSA v1.0 attestations, no build provenance |
| **Artifact Attestations** | ❌ | No in-toto attestations for code/image artifacts |
| **Build Reproducibility** | ❌ | No reproducible builds, no build environment verification |
| **Dependency Attestations** | ❌ | No attestations that dependencies are scanned |
| **Runtime Verification** | ❌ | No policy-as-code for container runtime (Kyverno, OPA) |
| **Supply Chain Policy** | ❌ | No documented supply chain security policy |
| **Artifact Repository** | ❌ | No secure artifact repository with access controls |

### Phase H2 Build Checklist
- [ ] Implement SLSA Level 3 provenance generation
- [ ] Add in-toto attestations for artifacts
- [ ] Enable reproducible builds with build info recording
- [ ] Implement dependency attestation pipeline
- [ ] Set up Kyverno/OPA policies for runtime verification
- [ ] Document supply chain security policy
- [ ] Create artifact repository admin page

**Files to Create**:
- `/services/supply-chain/src/` - Supply chain verification service
- `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/supply-chain.astro`

---

## 5. Admin Cockpit Pages

### What Exists ✅
**Current Admin Pages** (`/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/`):
- ✅ `/admin.astro` - Main admin console with tabs
- ✅ `/admin/governance.astro` - Governance & compliance
- ✅ `/admin/sso.astro` - SSO/SCIM configuration

**Admin Tab Components** (`/apps/corp-cockpit-astro/src/components/admin/`):
- ✅ `AdminSettings.tsx` - Tab router (6 tabs)
- ✅ `BrandingConfig.tsx` - Logo, colors
- ✅ `ThemeEditor.tsx` - Custom themes
- ✅ `APIKeyManager.tsx` - API key generation/revocation
- ✅ `AuditLog.tsx` - Audit log viewer
- ✅ `WeightOverrides.tsx` - SROI/VIS weight configuration
- ✅ `ImpactInToggles.tsx` - Benevity, Goodera, Workday toggles

**Analytics Operations Dashboard**:
- ✅ `/analytics-ops.astro` - Real-time system health
- ✅ Components for endpoint health, cache, DQ remediation

### What's Missing ❌
| Page | Status | Details |
|------|--------|---------|
| **Billing Admin** | ❌ | Customer plans, tier overrides, discounts, invoices |
| **Security Dashboard** | ❌ | Security events, DLP violations, threat detection |
| **Compliance Dashboard** | ❌ | Compliance status, policy management, evidence archive |
| **Supply Chain Audit** | ❌ | SBOM viewer, attestation verification, provenance audit |
| **Audit Report Generator** | ❌ | Export audit logs, compliance reports, incident reports |
| **Usage Analytics** | ❌ | Customer usage trends, quota consumption, predictions |
| **SIEM Integration Status** | ❌ | SIEM health, log ingestion status, alert configuration |
| **DLP Policy Manager** | ❌ | Define DLP rules, manage sensitive data categories |

### Phase H2 Build Checklist
- [ ] Add Billing tab to AdminSettings
- [ ] Add Security tab to AdminSettings
- [ ] Add Compliance tab to AdminSettings
- [ ] Add Supply Chain tab to AdminSettings
- [ ] Create standalone audit report generator page
- [ ] Create usage analytics dashboard page
- [ ] Create policy manager pages for DLP/SIEM

**Files to Create**:
- `/apps/corp-cockpit-astro/src/components/admin/BillingManager.tsx`
- `/apps/corp-cockpit-astro/src/components/admin/SecurityDashboard.tsx`
- `/apps/corp-cockpit-astro/src/components/admin/ComplianceDashboard.tsx`
- `/apps/corp-cockpit-astro/src/components/admin/SupplyChainAudit.tsx`
- `/apps/corp-cockpit-astro/src/components/admin/AuditReportGenerator.tsx`

---

## 6. Evidence Collection & Attestations

### What Exists ✅
**Evidence Infrastructure**:
- ✅ Evidence lineage tracking (source, confidence, timestamp, redaction)
- ✅ PII redaction (99.8% rate) before LLM processing
- ✅ Evidence Explorer UI with filtering
- ✅ Evidence snippets with source traceability
- ✅ Model lineage documentation

**Security Scanning Evidence**:
- ✅ Snyk vulnerability reports (JSON, SARIF)
- ✅ CodeQL analysis results (SARIF)
- ✅ Trivy container scan reports (SARIF, JSON)
- ✅ TruffleHog secret scan results
- ✅ License compliance reports (JSON)

### What's Missing ❌
| Component | Status | Details |
|-----------|--------|---------|
| **SOC 2 Control Evidence** | ❌ | No automated collection of control implementation evidence |
| **Audit Trail Artifacts** | ❌ | No signed audit logs, no immutable evidence storage |
| **Attestation Storage** | ❌ | No secure storage for SLSA/in-toto attestations |
| **Evidence Chain of Custody** | ❌ | No tracking of evidence access, modification, deletion |
| **Compliance Artifact Archive** | ❌ | No long-term archive for regulatory evidence |

### Phase H2 Build Checklist
- [ ] Implement SOC 2 control evidence collection
- [ ] Create audit log signing (asymmetric crypto)
- [ ] Build immutable evidence archive (append-only storage)
- [ ] Implement evidence access controls and tracking
- [ ] Create long-term retention policies

**Files to Create**:
- `/services/evidence-archive/src/` - Immutable evidence storage service
- `/packages/compliance/src/evidence-collector.ts` - SOC 2 evidence collection

---

## 7. Integration Points & Dependencies

### Data Flow for Phase H2
```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase H2 Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer Applications                                          │
│  ├─ API Gateway (rate limit, quota enforcement)               │
│  ├─ Services (billing metering, audit logging)                │
│  └─ Analytics (usage collection)                              │
│         ↓                                                       │
│  Metering Collectors                                           │
│  ├─ AI Cost Tracker (existing)                                │
│  ├─ API Call Counter (new)                                    │
│  ├─ Data Ingestion Meter (new)                                │
│  └─ Compute Meter (new)                                       │
│         ↓                                                       │
│  Observability Stack                                           │
│  ├─ Prometheus (metrics)                                       │
│  ├─ SIEM (Datadog/Splunk) (new)                               │
│  ├─ Audit Logger (existing)                                   │
│  └─ Evidence Archive (new)                                    │
│         ↓                                                       │
│  Admin Cockpit (Web UI)                                        │
│  ├─ Billing Dashboard (new)                                   │
│  ├─ Security Dashboard (new)                                  │
│  ├─ Compliance Dashboard (new)                                │
│  ├─ Supply Chain Audit (new)                                  │
│  └─ Analytics Operations (existing)                           │
│         ↓                                                       │
│  Compliance & Regulatory Reporting                            │
│  ├─ Audit Reports (new)                                       │
│  ├─ Incident Reports (new)                                    │
│  └─ Compliance Certifications (new)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Services to Extend
1. **API Gateway** - Add quota enforcement, metering hooks
2. **Audit Logger** - Extend with SIEM integration
3. **Notifications** - Add security alerts, compliance notifications
4. **Analytics** - Add billing analytics, compliance analytics
5. **Reporting** - Add compliance report templates

### External Integrations Needed
1. **Datadog/Splunk** - SIEM integration for log aggregation
2. **Stripe/Chargebee** - Payment processing for billing
3. **HashiCorp Vault** - Secrets management for SIEM API keys
4. **Keycloak/Auth0** - Extended SSO/SCIM for compliance
5. **GitHub API** - Build artifact verification for supply chain

---

## 8. Rollout Priority & Timeline

### Phase H2 Sequence (Recommended Order)
```
Week 1-2: Foundation
├─ Billing Service MVP (metering, budget enforcement)
├─ Compliance Dashboard (static compliance status)
└─ Security Dashboard stub

Week 3-4: Security & Compliance
├─ SIEM integration (Datadog/Splunk)
├─ DLP scanner implementation
├─ Security Dashboard (live data)
└─ Compliance Dashboard enhancement

Week 5-6: Supply Chain & Admin
├─ SLSA provenance generation
├─ in-toto attestations
├─ Supply Chain Audit page
└─ Admin page enhancements

Week 7-8: GA & Hardening
├─ Audit report generation
├─ Compliance report automation
├─ Performance tuning
└─ E2E testing & QA
```

### Risk Assessment
- **High Risk**: SIEM integration complexity (different vendors have different APIs)
- **Medium Risk**: SLSA/in-toto implementation (new technology, less documentation)
- **Low Risk**: Billing service (well-documented patterns)

---

## 9. Acceptance Criteria for Phase H2 GA

### Billing & Metering
- [ ] 95%+ accuracy of usage metering (validated against actual API logs)
- [ ] <100ms latency for quota checks (p99)
- [ ] 99.9% uptime SLA for billing service
- [ ] Customer-visible usage dashboard with >90% data freshness <1 hour

### Security & SIEM
- [ ] All security events in SIEM within <5 seconds of occurrence
- [ ] DLP scanner catches 99% of test PII patterns
- [ ] Zero undetected security incidents in penetration testing
- [ ] Security dashboard shows <10 second data freshness (real-time)

### Compliance
- [ ] All GDPR/AI Act controls automated and visible in dashboard
- [ ] Audit reports generate in <30 seconds for 1-year history
- [ ] 100% audit log completeness (no dropped events)
- [ ] Compliance status dashboard shows green/yellow/red status

### Supply Chain
- [ ] All container images signed and attestations verifiable
- [ ] SBOM generation for 100% of releases
- [ ] SLSA Level 3 provenance for all artifacts
- [ ] <5 minute time to verify supply chain integrity

### Admin Cockpit
- [ ] All admin pages load in <2 seconds (p95)
- [ ] Admin actions audit logged in <1 second
- [ ] RBAC enforced (SUPER_ADMIN > ADMIN > MANAGER)
- [ ] Export functionality for all compliance data

---

## Summary Table

| Area | Exists | Gap | Priority | Effort |
|------|--------|-----|----------|--------|
| AI Cost Tracking | ✅ 100% | 0% | - | Done |
| Usage Metering | 10% | 90% | P1 | High |
| SIEM | 0% | 100% | P1 | High |
| DLP | 0% | 100% | P1 | High |
| Compliance Dashboard | 5% | 95% | P1 | Medium |
| Supply Chain | 20% | 80% | P2 | High |
| Admin Pages | 40% | 60% | P2 | Medium |
| Evidence Archive | 20% | 80% | P3 | Medium |
| Audit Reports | 0% | 100% | P3 | Low |

**Total Effort**: ~16-20 weeks for full Phase H2 GA (assuming 2 engineers)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-15  
**Prepared By**: Code Assistant

