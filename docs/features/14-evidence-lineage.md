---
id: 14
key: evidence-lineage
name: Evidence Lineage
category: Reporting & Compliance
status: production
lastReviewed: 2025-01-27
---

# Evidence Lineage

## 1. Summary

- Comprehensive evidence provenance and lineage tracking system that links metrics to source data with full audit trail.
- Features Evidence Explorer panel for browsing Q2Q evidence, Lineage Drawer for metric provenance ("Why this metric?"), citation management, and CSRD export with redacted text.
- Tracks evidence from creation through metric association to report citations with immutable audit trail.
- Used by compliance teams, auditors, and executives to verify metric calculations and ensure regulatory compliance (CSRD/ESG).

## 2. Current Status

- Overall status: `production`

- Fully implemented Evidence Lineage system (Phase C complete) with Evidence Explorer Panel (~1,200 LOC, 32 tests) and Lineage Drawer (~1,300 LOC, 52 tests). Core features include Evidence Explorer with Q2Q browser, privacy-first design with anonymized snippets, comprehensive filtering, CSRD export with redacted text, Lineage Drawer showing metric → evidence chain, 3 widget integrations (SROI, VIS, At-A-Glance), mock lineage for 5 metrics, backend APIs (`GET /evidence`, `GET /lineage/:metricId`), and multi-language support (EN, NO, UK). Documentation includes `docs/Evidence_Lineage.md` (381 lines) with comprehensive guide.

- Service includes lineage mapping in `services/reporting/src/lib/evidenceLineageMapper.ts`, citation management in `services/reporting/src/lib/citations.ts`, evidence routes in `services/reporting/src/routes/evidence.ts`, and evidence ledger schema in `packages/shared-schema/src/schema/evidence_ledger.ts`. UI components exist in `apps/corp-cockpit-astro/src/components/evidence/` with 9 TypeScript files.

## 3. What's Next

- Complete backend API implementation (currently uses mock data in some areas).
- Add evidence detail drawer for full snippet + metadata display.
- Implement real-time updates for lineage data changes.
- Enhance CSRD export with more granular redaction options.

## 4. Code & Files

Backend / services:
- `services/reporting/src/lib/evidenceLineageMapper.ts` - Lineage mapping logic
- `services/reporting/src/lib/citations.ts` - Citation validation and management
- `services/reporting/src/routes/evidence.ts` - Evidence API routes
- `services/reporting/src/controllers/evidence.ts` - Evidence controllers
- `packages/shared-schema/src/schema/evidence_ledger.ts` - Evidence ledger schema
- `packages/shared-schema/src/schema/lineage.ts` - Lineage tracking schema

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/evidence/` - Evidence UI components (9 *.tsx files)
- `apps/corp-cockpit-astro/src/components/EvidenceDrawer.tsx` - Evidence drawer component

Shared / schema / docs:
- `docs/Evidence_Lineage.md` - Evidence lineage documentation (381 lines)
- `docs/Metrics_Catalog.md` - Metrics catalog (includes evidence links)

## 5. Dependencies

Consumes:
- Q2Q AI Engine for evidence extraction
- Evidence Ledger for storage
- Metrics for linking
- Campaigns for associations

Provides:
- Evidence data consumed by Report Generation
- Lineage information displayed in Corporate Cockpit Dashboard
- Citation data used by SROI/VIS calculators

## 6. Notes

- All evidence snippets are pre-anonymized in database (no PII stored).
- Hash-based deduplication (SHA-256) prevents duplicate evidence.
- Evidence retention: 3 years for CSRD compliance, 5 years for audit trail.
- Lineage metadata provides full provenance chain from source to metric.
- CSRD export includes redacted text suitable for regulatory submissions.



