---
id: 04
key: vis-calculation
name: VIS Calculation
category: Core
status: production
lastReviewed: 2025-01-27
---

# VIS Calculation

## 1. Summary

- Volunteer Impact Score (VIS) calculation engine that measures volunteer engagement effectiveness across multiple dimensions.
- Formula: `VIS = (hours × 0.3) + (quality × 0.3) + (outcome × 0.25) + (placement × 0.15)` with weighted scoring.
- Calculates individual volunteer VIS scores and campaign-level aggregate VIS with distribution bands.
- Used by Corporate Cockpit Dashboard for volunteer performance tracking and campaign effectiveness measurement.

## 2. Current Status

- Overall status: `production`

- Fully implemented VIS calculator in `services/reporting/src/calculators/vis.ts` (473 lines) with comprehensive scoring algorithm. Includes individual volunteer VIS calculation, campaign-level aggregate VIS with top volunteers list, distribution bands (exceptional ≥90, high_impact ≥75, good ≥60, developing ≥40, needs_improvement <40), hours normalization to 0-100 scale (1000 hours = 100 points), and consistency scoring. Test suite exists in `services/reporting/src/calculators/vis.test.ts` and `services/reporting/src/calculators/campaign-vis.test.ts`. Documentation includes `docs/VIS_Model.md` and `docs/SROI_VIS_Calibration.md`.

- Additional VIS calculator exists in `packages/metrics/src/vis/calculator.ts` showing multiple implementations. Corporate Cockpit dashboard displays VIS metrics in analytics widgets. Campaign VIS response includes volunteer count, top volunteers list, and distribution counts.

## 3. What's Next

- Add integration tests for VIS calculator with real database queries in `services/reporting/src/calculators/vis.integration.test.ts`.
- Wire VIS results into Corporate Cockpit dashboard widgets with real-time SSE updates in `apps/corp-cockpit-astro/src/components/analytics/`.
- Implement VIS trend calculation for period-over-period comparison in campaign analysis.
- Add VIS forecasting capabilities using historical volunteer engagement patterns.

## 4. Code & Files

Backend / services:
- `services/reporting/src/calculators/vis.ts` - VIS calculator (473 lines)
- `services/reporting/src/calculators/vis.test.ts` - VIS unit tests
- `services/reporting/src/calculators/campaign-vis.test.ts` - Campaign VIS tests
- `packages/metrics/src/vis/calculator.ts` - Core metrics library VIS calculator

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/analytics/` - VIS dashboard components

Shared / schema / docs:
- `docs/VIS_Model.md` - VIS model documentation
- `docs/SROI_VIS_Calibration.md` - Calibration guide

## 5. Dependencies

Consumes:
- Buddy Service for volunteer hours and session data
- Q2Q AI Engine for outcome impact scores
- Program Management for campaign and participant data
- Analytics Engine for volunteer engagement metrics

Provides:
- VIS metrics displayed in Corporate Cockpit Dashboard
- VIS data used by Report Generation for volunteer impact reports
- VIS calculations consumed by Campaign Management for volunteer effectiveness analysis

## 6. Notes

- VIS formula uses weighted scoring: hours (30%), quality (30%), outcome (25%), placement (15%).
- Hours are normalized to 0-100 scale where 1000 hours = 100 points.
- Campaign VIS bands use higher thresholds than individual bands (campaigns aggregate multiple volunteers).
- Distribution bands help identify exceptional volunteers and campaigns needing improvement.
- Multiple calculator implementations exist (reporting service, metrics package) - may need consolidation.



