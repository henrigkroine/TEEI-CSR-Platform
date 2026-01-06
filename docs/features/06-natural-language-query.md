---
id: 06
key: natural-language-query
name: Natural Language Query (NLQ)
category: AI & Analytics
status: production
lastReviewed: 2025-01-27
---

# Natural Language Query (NLQ)

## 1. Summary

- Natural language query interface that translates plain English questions into safe SQL/ClickHouse queries using LLMs (Claude/GPT).
- Includes comprehensive safety guardrails (SQL injection prevention, table access control, keyword blocking) and smart caching with Redis.
- Features query templates, performance optimization (concurrent limits, timeouts, row limits), and event publishing for analytics.
- Used by corporate executives and analysts to explore CSR data without writing SQL queries.

## 2. Current Status

- Overall status: `production`

- Fully implemented NLQ service (port 3009) with 85 TypeScript files. Core features include natural language to SQL/CHQL conversion, multi-LLM support (Claude Anthropic and GPT OpenAI), safety guardrails with SQL injection prevention and table access control, query templates for common questions, Redis-backed smart caching with automatic warming, performance optimization (concurrent limits, timeouts, result row limits), NATS integration for query analytics, and comprehensive monitoring (health checks, Prometheus metrics, structured logging). UI components exist in `apps/corp-cockpit-astro/src/components/nlq/` with 25 files including query input, result display, chart generation, and accessibility support.

- Service includes intent classification, slot extraction, query generation, confidence scoring, lineage visualization, and evidence linking. Comprehensive test suite exists with unit tests, integration tests, and E2E tests. Documentation includes 14 markdown files in `docs/insights/` covering API guides, architecture, and accessibility.

## 3. What's Next

- Enhance query template library with more domain-specific templates for CSR metrics.
- Add query explanation feature to help users understand how their question was translated to SQL.
- Implement query history and saved queries functionality for frequently asked questions.
- Add query performance monitoring and optimization recommendations.

## 4. Code & Files

Backend / services:
- `services/insights-nlq/` - NLQ service (85 TypeScript files)
- `services/insights-nlq/src/routes/nlq.ts` - NLQ API routes (POST /v1/nlq/ask, GET /v1/nlq/queries/:queryId, GET /v1/nlq/history)
- `services/insights-nlq/src/routes/templates.ts` - Template management routes
- `services/insights-nlq/src/routes/feedback.ts` - Feedback collection routes
- `services/insights-nlq/src/lib/query-generator.ts` - SQL/CHQL query generation
- `services/insights-nlq/src/lib/intent-classifier.ts` - Intent classification
- `services/insights-nlq/src/lib/slot-extractor.ts` - Entity extraction
- `services/insights-nlq/src/lib/query-executor.ts` - Query execution
- `services/insights-nlq/src/lib/confidence-scorer.ts` - Confidence scoring
- `services/insights-nlq/src/lib/lineage-visualizer.ts` - Lineage visualization
- `services/insights-nlq/src/cache/` - Redis caching layer
- `services/insights-nlq/src/validators/safety-guardrails.ts` - Safety validation

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/nlq/` - NLQ UI components (25 files)
- `apps/corp-cockpit-astro/src/components/nlq/charts/` - Chart generation components

Shared / schema / docs:
- `docs/insights/` - NLQ documentation (14 *.md files)
- `docs/insights/NLQ_API_GUIDE.md` - API usage guide
- `docs/insights/NLQ_ARCHITECTURE.md` - Architecture documentation

## 5. Dependencies

Consumes:
- LLM providers: Claude (Anthropic), OpenAI GPT APIs
- PostgreSQL and ClickHouse databases for query execution
- Redis for query result caching
- NATS for event publishing
- Evidence database for lineage linking

Provides:
- Natural language insights consumed by Corporate Cockpit Dashboard
- Query results displayed in NLQ UI components
- Query analytics for usage monitoring

## 6. Notes

- Safety guardrails prevent SQL injection and restrict table access based on RBAC.
- Query templates provide pre-built queries for common CSR questions.
- Smart caching reduces LLM API calls and improves response times.
- Lineage visualization shows data provenance for query results.
- Accessibility support includes screen reader compatibility and keyboard navigation.



