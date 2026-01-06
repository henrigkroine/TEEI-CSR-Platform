---
id: 08
key: forecasting
name: Forecasting
category: AI & Analytics
status: production
lastReviewed: 2025-01-27
---

# Forecasting

## 1. Summary

- Production-grade time-series forecasting service for SROI and VIS metrics using multiple forecasting models (ETS, Prophet-like, Ensemble).
- Features confidence bands (80% and 95% prediction intervals), back-testing with walk-forward validation, scenario modeling (optimistic/realistic/pessimistic), and performance optimization (p95 latency <2.5s).
- Used by Corporate Cockpit Dashboard for predictive analytics and executive planning.

## 2. Current Status

- Overall status: `production`

- Fully implemented Forecast service v2 with 19 TypeScript files. Core features include multiple forecasting models (ETS Simple/Holt/Holt-Winters, Prophet-like trend + seasonality, Ensemble combined models, Auto-selection based on historical performance), confidence bands (80% and 95% prediction intervals), back-testing with walk-forward validation (MAE/RMSE/MAPE metrics), scenario modeling (optimistic/realistic/pessimistic forecasts), Redis caching for performance (p95 latency <2.5s), and OpenTelemetry integration for tracing. Test suite includes unit tests for ETS models, back-testing, scenarios, and forecast API with 80%+ coverage.

- UI components exist in `apps/corp-cockpit-astro/src/components/forecast/` with 5 TypeScript files. Service includes health checks and comprehensive error handling. Documentation includes `services/forecast/README.md` with API usage examples.

## 3. What's Next

- Add seasonality detection and holiday effects for more accurate forecasts.
- Implement forecast accuracy monitoring and model performance tracking.
- Add forecast comparison view to compare different models side-by-side.
- Enhance scenario modeling with more granular what-if analysis options.

## 4. Code & Files

Backend / services:
- `services/forecast/` - Forecast service (19 TypeScript files)
- `services/forecast/src/models/ets.ts` - ETS forecasting models
- `services/forecast/src/models/prophet.ts` - Prophet-like models
- `services/forecast/src/models/ensemble.ts` - Ensemble models
- `services/forecast/src/lib/backtest.ts` - Back-testing framework
- `services/forecast/src/lib/confidence.ts` - Confidence band calculation
- `services/forecast/src/lib/scenarios.ts` - Scenario generation
- `services/forecast/src/lib/cache.ts` - Redis caching layer
- `services/forecast/src/routes/forecast.ts` - POST /v1/analytics/forecast/v2 endpoint
- `services/forecast/src/routes/scenarios.ts` - Scenario endpoints

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/forecast/` - Forecast UI components (5 *.tsx files)

Shared / schema / docs:
- `services/forecast/README.md` - Forecast service documentation

## 5. Dependencies

Consumes:
- Analytics Engine for historical time-series data
- Redis for forecast result caching
- OpenTelemetry for distributed tracing

Provides:
- Forecast predictions consumed by Corporate Cockpit Dashboard
- Scenario data used by Scenario Planner
- Forecast metrics for Report Generation

## 6. Notes

- Multiple forecasting models allow auto-selection based on historical performance.
- Confidence bands provide uncertainty quantification for decision-making.
- Back-testing validates model accuracy before deployment.
- Scenario modeling enables what-if analysis for strategic planning.
- Performance optimization ensures sub-2.5s p95 latency for real-time dashboards.



