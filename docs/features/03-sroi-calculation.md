---
id: 03
key: sroi-calculation
name: SROI Calculation
category: Core
status: production
lastReviewed: 2025-01-27
---

# SROI Calculation

## 1. Summary

- Social Return on Investment (SROI) calculation engine that quantifies economic value generated per dollar invested in CSR programs.
- Formula: `SROI = (Total Social Value Created) / (Total Investment)` where investment includes volunteer hours and program costs.
- Calculates campaign-level and period-based SROI with evidence linking for auditability.
- Used by Corporate Cockpit Dashboard for executive reporting and impact measurement.

## 2. Current Status

- Overall status: `production`

- Fully implemented SROI calculator in `services/reporting/src/calculators/sroi.ts` with comprehensive formula implementation. Includes weighted dimension values (Integration $150, Language $500, Job Readiness $300), confidence discount logic (20% discount if average confidence < 0.7), and volunteer hour value ($29.95/hr from Independent Sector 2024). Calculator supports campaign-level and period-based calculations with evidence linking. Test suite exists in `services/reporting/src/calculators/sroi.test.ts`. Documentation includes `docs/SROI_Calculation.md` and `docs/SROI_VIS_Calibration.md` with calibration methodology.

- Additional SROI calculator exists in `services/analytics/src/calculators/sroi-calculator.ts` and `packages/metrics/src/sroi/calculator.ts` showing multiple implementations. Database schema includes SROI tables (migration `0011_add_sroi_tables.sql`). Corporate Cockpit dashboard displays SROI metrics in analytics widgets.

## 3. What's Next

- Add integration tests for SROI calculator with real database queries in `services/reporting/src/calculators/sroi.integration.test.ts`.
- Wire SROI results into Corporate Cockpit dashboard widgets with real-time SSE updates in `apps/corp-cockpit-astro/src/components/analytics/`.
- Implement SROI versioning system to track formula changes over time (planned v1.1.0 with updated volunteer hour value).
- Add SROI forecasting capabilities using time-series data from Analytics Engine.

## 4. Code & Files

Backend / services:
- `services/reporting/src/calculators/sroi.ts` - SROI calculator (338 lines)
- `services/reporting/src/calculators/sroi.test.ts` - SROI unit tests
- `services/analytics/src/calculators/sroi-calculator.ts` - Analytics SROI calculator
- `services/impact-calculator/` - Impact calculation service (if exists)
- `packages/metrics/src/sroi/calculator.ts` - Core metrics library SROI calculator
- `packages/metrics/src/sroi/config.ts` - SROI configuration and assumptions

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/analytics/` - SROI dashboard components

Shared / schema / docs:
- `docs/SROI_Calculation.md` - SROI calculation documentation
- `docs/SROI_VIS_Calibration.md` - Calibration guide with formula versioning
- `packages/shared-schema/migrations/0011_add_sroi_tables.sql` - SROI database schema

## 5. Dependencies

Consumes:
- Q2Q AI Engine for outcome scores (confidence, belonging, language, job readiness)
- Evidence Ledger for linking metrics to source data
- Analytics Engine for time-series data and period aggregations
- Program Management for program cost data

Provides:
- SROI metrics displayed in Corporate Cockpit Dashboard
- SROI data used by Report Generation for executive reports
- SROI calculations consumed by Campaign Management for ROI analysis

## 6. Notes

- Current formula version: v1.0.0 with validation metrics (MAE 0.15, RMSE 0.22, R² 0.78, n=150).
- Planned v1.1.0 will update volunteer hour value to $31.20 (2025 estimate) and add well-being dimension.
- Confidence discount applies 20% reduction if average confidence < 0.7 threshold.
- Dimension values are based on research: EU Social Cohesion Studies 2023, OECD Language-Employment Correlation, US Dept of Labor Employability Index.
- Multiple calculator implementations exist (reporting service, analytics service, metrics package) - may need consolidation.



