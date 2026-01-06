---
id: 13
key: report-generation
name: Report Generation
category: Reporting & Compliance
status: production
lastReviewed: 2025-01-27
---

# Report Generation

## 1. Summary

- AI-powered report generation system that creates evidence-based CSR impact reports using Large Language Models (LLMs) with strict citation and redaction requirements.
- Features 4 report templates (Quarterly, Annual, Investor Update, Impact Deep Dive), PDF/PPTX export, citation enforcement, PII redaction, and cost tracking.
- Generates narratives with mandatory evidence citations (minimum 1 per paragraph) and zero PII leaks.
- Used by corporate executives and compliance teams for regulatory reporting (CSRD/ESG) and stakeholder communications.

## 2. Current Status

- Overall status: `production`

- Fully implemented Gen-AI Reporting system (Phase D complete) with production-ready status. Core features include 4 report templates with multi-locale support (EN, ES, FR, UK, NO), evidence lineage with every claim linked to source evidence IDs, citation enforcement (minimum 1 citation per paragraph, configurable density), PII redaction with automatic scrubbing before LLM processing and leak detection, cost tracking with per-report token usage logging, CSRD alignment for annual reports, PDF export with Playwright rendering, PPTX export with template-based generation, and narrative controls (tone, length, audience). Documentation includes `docs/GenAI_Reporting.md` (729 lines) with comprehensive guide.

- Service includes 19 Handlebars templates in `services/reporting/src/templates/`, report generation routes in `services/reporting/src/routes/gen-reports.ts`, citation validation in `services/reporting/src/lib/citations.ts`, and PII redaction in `services/reporting/src/privacy/enhanced-redaction.ts` (330 lines). UI components exist in `apps/corp-cockpit-astro/src/components/reports/` with 18 TypeScript files.

## 3. What's Next

- Add scheduled report generation with cron jobs for monthly/quarterly auto-generation.
- Implement email delivery integration for automated report distribution.
- Enhance PPTX export with more sophisticated chart embedding and animations.
- Add report versioning and diff visualization for approval workflows.

## 4. Code & Files

Backend / services:
- `services/reporting/src/templates/` - Report templates (19 *.hbs files)
- `services/reporting/src/routes/gen-reports.ts` - Report generation routes
- `services/reporting/src/routes/exports.presentations.ts` - PDF/PPTX export routes
- `services/reporting/src/lib/citations.ts` - Citation validation
- `services/reporting/src/privacy/enhanced-redaction.ts` - PII redaction (330 lines)
- `services/reporting/src/utils/pptxGenerator.ts` - PPTX generator

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/reports/` - Report UI components (18 *.tsx files)
- `apps/corp-cockpit-astro/src/components/reports/GenerateReportModal.tsx` - Report generation modal
- `apps/corp-cockpit-astro/src/components/reports/ExportExecutivePack.tsx` - Export interface

Shared / schema / docs:
- `docs/GenAI_Reporting.md` - Gen-AI reporting guide (729 lines)
- `docs/Reporting_Exports.md` - Export documentation
- `docs/Cockpit_Boardroom_And_Exports.md` - Boardroom and exports guide

## 5. Dependencies

Consumes:
- Q2Q AI Engine for narrative generation
- Evidence Lineage for source data and citations
- SROI/VIS calculators for impact metrics
- Analytics Engine for time-series data
- Template system (Handlebars) for report formatting

Provides:
- Generated reports consumed by Corporate Cockpit Dashboard
- PDF/PPTX exports for executive presentations
- Report data used by External Connectors for Impact-In delivery

## 6. Notes

- All generated narratives must cite source evidence with minimum 1 citation per paragraph.
- Citation density is configurable (default: 0.5 per 100 words).
- PII redaction is applied before LLM processing with post-redaction leak detection.
- Cost tracking monitors token usage and estimated costs per report.
- CSRD alignment ensures annual reports meet EU reporting standards.
- Report templates support multi-locale with proper formatting for EN, ES, FR, UK, NO.



