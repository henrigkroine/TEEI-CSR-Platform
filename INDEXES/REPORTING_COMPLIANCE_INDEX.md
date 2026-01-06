# Reporting & Compliance Features Index

**Generated**: 2025-01-27  
**Category**: Reporting & Compliance  
**Status**: Complete

---

## Table of Contents

1. [Report Generation](#report-generation)
2. [Evidence Lineage](#evidence-lineage)
3. [GDPR Compliance](#gdpr-compliance)
4. [Audit Logging](#audit-logging)

---

## Report Generation

**Description**: PDF/PPTX report generation with Gen-AI narratives

### Service Files

**`services/reporting/src/templates/`** (19 *.hbs files)

**Report Templates**:
- `quarterly-report.en.hbs` - Quarterly report template
- `annual-report.en.hbs` - Annual report template
- `investor-update.en.hbs` - Investor update template
- `impact-deep-dive.en.hbs` - Impact deep dive template
- Additional locale-specific templates (ES, FR, UK, NO)

**Report Generation Routes**:
- `services/reporting/src/routes/gen-reports.ts` - Report generation API
- `services/reporting/src/routes/campaign-dashboard.ts` - Campaign dashboard reports

**Gen-AI Integration**:
- `services/reporting/src/lib/citations.ts` - Citation validation
- `services/reporting/src/lib/evidenceLineageMapper.ts` - Evidence mapping
- PII redaction before LLM processing
- Cost telemetry for token tracking

**SRS Registry**:
- `services/reporting/src/srs/registry/sdg-targets.json` - SDG targets
- `services/reporting/src/srs/registry/csrd-esrs.json` - CSRD ESRS standards
- `services/reporting/src/srs/registry/gri-standards.json` - GRI standards

### UI Components

**`apps/corp-cockpit-astro/src/components/reports/`** (18 *.tsx files)
- Report generation UI
- Report preview components
- Report export components
- Report template selection

**`apps/corp-cockpit-astro/src/components/generators/`** (2 *.tsx files)
- Report generator components

### Documentation

- `docs/GenAI_Reporting.md` - Gen-AI reporting guide (729 lines)
- `docs/Reporting_Exports.md` - Report export documentation
- `docs/reporting/` - Reporting documentation (3 *.md files)
  - `regulatory_packs.md` - Regulatory packs
  - `templates.md` - Template documentation
- `services/reporting/docs/` - Service-specific documentation
- `docs/Cockpit_Boardroom_And_Exports.md` - Boardroom and exports guide

### Related Features
- Evidence Lineage
- Q2Q AI Engine
- Campaign Management

---

## Evidence Lineage

**Description**: Track evidence provenance and lineage

### Service Files

**`services/reporting/src/lib/`**
- `evidenceLineageMapper.ts` - Lineage mapping logic
- `citations.ts` - Citation validation and management

**`services/reporting/src/routes/`**
- `evidence.ts` - Evidence API routes
- `evidence-campaign-filter.test.ts` - Evidence campaign filter tests

**`services/reporting/src/controllers/`**
- `evidence.ts` - Evidence controllers

**`services/reporting/src/types/`**
- `evidence.ts` - Evidence type definitions

**`services/reporting/src/cache/`**
- `campaign-cache.ts` - Campaign caching (includes evidence)

### Schema Files

**`packages/shared-schema/src/schema/`**
- `evidence_ledger.ts` - Evidence ledger schema
- `lineage.ts` - Lineage tracking schema
- `metrics.ts` - Metrics schema (links to evidence)

### UI Components

**`apps/corp-cockpit-astro/src/components/evidence/`** (9 *.tsx files)
- Evidence explorer components
- Evidence display components
- Evidence linking components

**`apps/corp-cockpit-astro/src/components/EvidenceDrawer.tsx`** - Evidence drawer component

**`apps/corp-cockpit-astro/src/data/mockEvidence.ts`** - Mock evidence data

### Documentation

- `docs/Evidence_Lineage.md` - Evidence lineage documentation
- `docs/Metrics_Catalog.md` - Metrics catalog (includes evidence links)

### Related Features
- Report Generation
- SROI/VIS Calculation
- Campaign Management

---

## GDPR Compliance

**Description**: GDPR compliance and DSAR handling

### Service Files

**`services/privacy-orchestrator/`** (6 *.ts files)
- `src/index.ts` - Privacy orchestrator entry
- `src/routes/` - Privacy API routes
- `src/lib/` - DSAR orchestration logic
- `README.md` - Documentation

**`services/gdpr-service/`** (3 *.ts files - ⚠️ Stub only)
- `src/routes/` - Route stubs only
- ⚠️ **BROKEN** - No package.json, no entry point

**`packages/compliance/`** (5 *.ts files)
- `src/audit-logger.ts` - Audit logging
- `src/dsr-orchestrator.ts` - DSAR orchestrator
- `src/pii-encryption.ts` - PII encryption
- `src/tenant-isolation.ts` - Tenant isolation
- `src/index.ts` - Compliance exports

**`packages/data-masker/`** (12 *.ts files)
- PII data masking utilities
- `README.md` - Documentation

### UI Components

**`apps/corp-cockpit-astro/src/components/governance/`** (9 *.tsx files)
- GDPR compliance UI
- DSAR request handling
- Consent management
- Data deletion workflows

**`apps/corp-cockpit-astro/src/features/regulatory/`** (6 *.tsx files)
- Regulatory compliance features
- GDPR-specific components

### Documentation

- `docs/GDPR_Compliance.md` - GDPR compliance guide
- `docs/GDPR_DSR_Runbook.md` - DSAR runbook
- `docs/DSAR_Consent_Operations.md` - DSAR operations guide
- `docs/BENEFICIARY_GROUPS_PRIVACY.md` - Beneficiary groups privacy
- `docs/Data_Residency.md` - Data residency documentation
- `docs/compliance/` - Compliance documentation (6 *.md files)
  - `audit_explorer.md` - Audit explorer

### Related Features
- Audit Logging
- Data Residency
- Privacy Orchestration

---

## Audit Logging

**Description**: Comprehensive audit trail for compliance

### Package Files

**`packages/compliance/src/`**
- `audit-logger.ts` - Audit logger implementation
- `dsr-orchestrator.ts` - DSAR orchestrator (includes audit)
- `tenant-isolation.ts` - Tenant isolation (audit tracking)

### Schema Files

**`packages/shared-schema/src/schema/`**
- Audit log schema (if exists)
- Evidence ledger (audit trail)

### UI Components

**`apps/corp-cockpit-astro/src/components/admin/audit/`** (1 *.tsx file)
- Audit explorer UI
- Audit log viewer
- Audit trail display

**`apps/corp-cockpit-astro/src/components/governance/`** (9 *.tsx files)
- Governance components (includes audit)

### Documentation

- `docs/Audit_Log_Specification.md` - Audit log specification
- `docs/compliance/audit_explorer.md` - Audit explorer documentation
- `docs/Compliance_Backend_Additions.md` - Compliance backend additions

### Observability

**`observability/grafana/dashboards/`**
- `soc2-compliance.json` - SOC2 compliance dashboard
- `privacy-sla-dashboard.json` - Privacy SLA dashboard

### Related Features
- GDPR Compliance
- Evidence Lineage
- Governance

---

## File Statistics

| Feature | Service Files | Package Files | UI Files | Documentation | Total |
|---------|--------------|---------------|----------|---------------|-------|
| Report Generation | 19+ | 0 | 20 | 5 | ~44 |
| Evidence Lineage | 5+ | 1 | 10 | 2 | ~18 |
| GDPR Compliance | 9 | 17 | 15 | 6 | ~47 |
| Audit Logging | 0 | 3 | 10 | 3 | ~16 |
| **Total** | **33+** | **21** | **55** | **16** | **~125** |

---

## Compliance Standards

### CSRD/ESRS Compliance
- **Templates**: CSRD-aligned report templates
- **Registry**: `csrd-esrs.json` - ESRS standards registry
- **Documentation**: CSRD compliance guides

### GRI Standards
- **Registry**: `gri-standards.json` - GRI standards registry
- **Integration**: GRI-aligned reporting

### SDG Targets
- **Registry**: `sdg-targets.json` - SDG targets registry
- **Mapping**: SDG target mapping in reports

### SOC2 Compliance
- **Dashboard**: SOC2 compliance dashboard
- **Evidence**: SOC2 evidence collection scripts
- **Documentation**: SOC2 compliance documentation

---

## Dependencies

### Reporting & Compliance Dependency Graph

```
Report Generation
  ├── Evidence Lineage (source data)
  ├── Q2Q AI Engine (narratives)
  ├── Template System (Handlebars)
  └── Citation Validation

Evidence Lineage
  ├── Evidence Ledger (storage)
  ├── Metrics (links)
  └── Campaigns (associations)

GDPR Compliance
  ├── Privacy Orchestrator (DSAR handling)
  ├── Data Masker (PII protection)
  └── Audit Logging (compliance trail)

Audit Logging
  ├── Compliance Package (logger)
  └── Evidence Ledger (audit trail)
```

---

## Compliance Workflows

### DSAR Workflow
1. Request received via Privacy Orchestrator
2. Data identification across services
3. Data extraction with PII masking
4. Delivery to data subject
5. Audit log entry

### Report Generation Workflow
1. Template selection
2. Data collection (metrics, evidence)
3. Gen-AI narrative generation
4. Citation validation
5. PII redaction
6. PDF/PPTX generation
7. Audit log entry

### Evidence Lineage Workflow
1. Evidence creation/ingestion
2. Lineage mapping
3. Metric association
4. Citation generation
5. Report linking

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



