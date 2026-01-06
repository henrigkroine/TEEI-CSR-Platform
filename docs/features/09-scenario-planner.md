---
id: 09
key: scenario-planner
name: Scenario Planner
category: AI & Analytics
status: in-progress
lastReviewed: 2025-01-27
---

# Scenario Planner

## 1. Summary

- Scenario planning and what-if analysis tool for impact projections and strategic planning.
- Features what-if analysis, scenario modeling, and impact projections for different program configurations.
- Used by program managers and executives to evaluate different investment strategies and program designs.

## 2. Current Status

- Overall status: `in-progress`

- Partially implemented scenario planner in `apps/corp-cockpit-astro/src/components/scenario-planner/` with 7 files. Documentation exists in `docs/analytics/scenario_planner.md` (53 lines) describing scenario planning concepts. UI components exist but may need backend integration with Forecasting service for scenario calculations. Scenario modeling functionality may be partially implemented in Forecast service (`services/forecast/src/lib/scenarios.ts` and `services/forecast/src/routes/scenarios.ts`).

- Integration with Forecasting service for scenario calculations may be incomplete. What-if analysis capabilities may need additional backend endpoints for scenario comparison and impact projection.

## 3. What's Next

- Complete backend integration with Forecasting service for scenario calculations in `apps/corp-cockpit-astro/src/api/scenarios.ts`.
- Add scenario comparison view to compare multiple scenarios side-by-side.
- Implement scenario saving and sharing functionality for collaborative planning.
- Add scenario export to PDF/PPTX for executive presentations.

## 4. Code & Files

Backend / services:
- `services/forecast/src/lib/scenarios.ts` - Scenario generation logic
- `services/forecast/src/routes/scenarios.ts` - Scenario API endpoints

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/scenario-planner/` - Scenario planner components (7 files)

Shared / schema / docs:
- `docs/analytics/scenario_planner.md` - Scenario planning documentation

## 5. Dependencies

Consumes:
- Forecasting service for scenario calculations
- Analytics Engine for historical data and metrics
- SROI/VIS calculators for impact projections

Provides:
- Scenario analysis consumed by Corporate Cockpit Dashboard
- Scenario data used by Report Generation for strategic planning sections

## 6. Notes

- Scenario planner enables what-if analysis for program investment decisions.
- Integration with Forecasting service provides predictive scenario modeling.
- Impact projections help evaluate ROI of different program configurations.
- UI components exist but may need backend API completion for full functionality.



