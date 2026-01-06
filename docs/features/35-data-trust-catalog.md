---
id: 35
key: data-trust-catalog
name: Data Trust & Catalog
category: Platform
status: in-progress
lastReviewed: 2025-01-27
---

# Data Trust & Catalog

## 1. Summary

- Data governance and lineage catalog system for tracking dataset freshness, quality, and lineage.
- Features dataset catalog, lineage tracking, data quality monitoring, freshness tracking, and catalog UI integration.
- Provides comprehensive data governance with OpenLineage events, Great Expectations test suites, and governed semantic layer (dbt/metrics).
- Used by data engineers, compliance teams, and analysts for data governance and quality assurance.

## 2. Current Status

- Overall status: `in-progress`

- Partially implemented Data Trust & Catalog with documentation (`docs/trust/data_trust_catalog.md`), lineage schema (`packages/shared-schema/src/schema/lineage.ts`), and Worker 5 implementation in progress. Core features include dataset catalog, lineage tracking, data quality monitoring, and freshness tracking. Worker 5 team is implementing OpenLineage instrumentation, Great Expectations test suites, dbt semantic layer, and catalog UI integration.

- Implementation includes OpenLineage events, ClickHouse sinks, PostgreSQL lineage tables, and catalog UI components. Documentation exists for data trust catalog concepts.

## 3. What's Next

- Complete Worker 5 implementation (OpenLineage, Great Expectations, dbt, Catalog UI).
- Add dataset freshness badges and quality indicators.
- Implement lineage sparkline visualization.
- Add drill-through from metrics to evidence in Evidence Explorer.

## 4. Code & Files

Backend / services:
- OpenLineage emitters (in progress)
- Great Expectations suites (in progress)
- dbt semantic layer (in progress)
- Catalog API (in progress)

Frontend / UI:
- Catalog UI components (in progress)

Shared / schema / docs:
- `docs/trust/data_trust_catalog.md` - Catalog documentation
- `packages/shared-schema/src/schema/lineage.ts` - Lineage schema

## 5. Dependencies

Consumes:
- OpenLineage for data lineage
- Great Expectations for data quality
- dbt for semantic layer
- Evidence Lineage for metric linking

Provides:
- Data catalog for Corporate Cockpit
- Lineage tracking for compliance
- Data quality monitoring for reliability

## 6. Notes

- Data Trust & Catalog is actively being implemented by Worker 5 team.
- OpenLineage instrumentation provides comprehensive data lineage tracking.
- Great Expectations test suites ensure data quality standards.
- dbt semantic layer provides governed metrics and transformations.
- Catalog UI integration enables data discovery and governance in Corporate Cockpit.



