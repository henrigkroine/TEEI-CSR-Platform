---
id: 07
key: analytics-engine
name: Analytics Engine
category: AI & Analytics
status: production
lastReviewed: 2025-01-27
---

# Analytics Engine

## 1. Summary

- ClickHouse-based analytics and time-series processing service providing real-time analytics, trend analysis, cohort analysis, and funnel analysis.
- Features PostgreSQL→ClickHouse backfill, incremental sync, query budgets, and observability.
- Calculates SROI, VIS, and engagement metrics with percentile benchmarks across tenants.
- Used by Corporate Cockpit Dashboard for real-time dashboard data feeds and executive reporting.

## 2. Current Status

- Overall status: `production`

- Fully implemented Analytics service (port 3008) with ~10,800 lines of code and 85 files. Core features include ClickHouse data warehouse integration, SROI and VIS calculators, percentile benchmarks across tenants, time-series aggregations (daily, weekly, monthly, quarterly), data windowing for performance, incremental materialized views, and real-time dashboard data feeds. ClickHouse tables include `analytics.metrics_daily`, `analytics.metrics_monthly`, `analytics.cohort_analysis`, and `analytics.benchmarks`. PostgreSQL tables include `analytics_jobs` for ETL job tracking and `analytics_cache` for pre-computed aggregates.

- Service includes event sink for NATS events, incremental loader with checkpoint tracking, backfill support (Postgres → ClickHouse), and SSE streaming with reconnect/resume. Documentation includes `docs/Analytics_APIs.md`, `docs/Analytics_DW.md`, and `docs/AnalyticsDW_Runbook.md` (619 lines). Recent additions include SROI/VIS calibration and enhanced formula versioning.

## 3. What's Next

- Add predictive analytics for forecasting engagement trends.
- Implement anomaly detection for sudden metric drops or spikes.
- Enhance cohort analysis with advanced segmentation capabilities.
- Add real-time alerting for metric thresholds and SLA breaches.

## 4. Code & Files

Backend / services:
- `services/analytics/` - Analytics service (85 files)
- `services/analytics/src/lib/` - Analytics modules
- `services/analytics/src/calculators/sroi-calculator.ts` - SROI calculator
- `services/analytics/src/sinks/clickhouse.ts` - ClickHouse event sink
- `services/analytics/src/sinks/loader.ts` - Incremental loader
- `services/analytics/src/stream/` - SSE streaming
- `services/analytics/src/clickhouse/schema.sql` - ClickHouse schema
- `scripts/init-clickhouse.sql` - ClickHouse initialization

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/analytics/` - Analytics UI components

Shared / schema / docs:
- `docs/Analytics_APIs.md` - Analytics API documentation
- `docs/Analytics_DW.md` - Data warehouse documentation
- `docs/AnalyticsDW_Runbook.md` - Operations runbook

## 5. Dependencies

Consumes:
- ClickHouse database for columnar analytics storage
- PostgreSQL for source of truth data
- Redis for query result caching
- NATS for event streaming
- Reporting Service for SROI/VIS calculations

Provides:
- Analytics data consumed by Corporate Cockpit Dashboard
- Time-series metrics for Forecasting service
- Cohort data for Benchmarks feature
- Trend analysis for Report Generation

## 6. Notes

- ClickHouse provides high-performance OLAP queries with columnar storage.
- Event sink batches inserts (1000 events or 10 seconds) for efficiency.
- Incremental loader uses durable NATS consumer with checkpoint tracking.
- Materialized views provide <100ms p95 latency for dashboard queries.
- Data windowing optimizes performance for large time ranges.



