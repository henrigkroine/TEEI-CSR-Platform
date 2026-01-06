---
id: 10
key: external-connectors
name: External Connectors
category: Integration
status: in-progress
lastReviewed: 2025-01-27
---

# External Connectors

## 1. Summary

- Integration with external CSR platforms (Benevity, Goodera, Workday) for data export and inbound webhook ingestion.
- Features multi-platform connectors with OAuth2 authentication, pagination, incremental sync, automatic retry, PII redaction, and idempotent ingestion.
- Includes Impact-In service for outbound delivery with delivery tracking, retry logic, SLA monitoring, and platform-specific data mapping.
- Used by corporate customers to export impact data to their existing CSR platforms and import data from external systems.

## 2. Current Status

- Overall status: `in-progress`

- Impact-In service (port 3010) is production-ready (91%) with ~9,600 lines of code. Benevity integration is production-ready and serves as reference implementation. Goodera integration needs hardening (core complete, missing OAuth clarification, idempotency, contract tests). Workday integration needs hardening (REST OAuth complete, SOAP undefined, token persistence needed). Impact-In service includes delivery routing, retry logic with exponential backoff, SLA tracking, webhook signature verification, delivery timeline visualization, and bulk replay functionality. Cockpit monitoring UI is complete with delivery monitoring, SLA dashboard, and retry controls.

- Internal connectors (Kintell, Upskilling, Buddy) are operational. Kintell connector (18 files) includes CSV import and webhook ingestion. Upskilling connector (8 files) includes course completion webhook. Buddy connector (35 files) includes match management. Documentation includes `docs/ImpactIn_Connectors.md` (641 lines) and `docs/integrations/CONNECTORS_GUIDE.md`.

## 3. What's Next

- Complete Goodera OAuth 2.0 implementation and clarify API key vs OAuth usage in `services/impact-in/src/connectors/goodera.ts`.
- Implement Workday SOAP client with WS-Security in `services/impact-in/src/connectors/workday.ts`.
- Add contract tests for all external connectors using Pact or similar framework.
- Enhance observability with distributed tracing and alerting dashboards.

## 4. Code & Files

Backend / services:
- `services/impact-in/` - Impact ingestion service (74 TypeScript files)
- `services/impact-in/src/connectors/benevity.ts` - Benevity connector
- `services/impact-in/src/connectors/goodera.ts` - Goodera connector
- `services/impact-in/src/connectors/workday.ts` - Workday connector
- `services/impact-in/src/routes/webhooks.ts` - Webhook routes (256 lines)
- `services/impact-in/src/routes/sla.ts` - SLA routes
- `services/impact-in/src/delivery-log.ts` - Delivery log tracking (86 lines)
- `services/kintell-connector/` - Kintell connector (18 files)
- `services/upskilling-connector/` - Upskilling connector (8 files)
- `services/buddy-connector/` - Buddy connector (35 files)

Frontend / UI:
- Corporate Cockpit monitoring UI for delivery tracking and SLA dashboard

Shared / schema / docs:
- `docs/ImpactIn_Connectors.md` - Connector documentation (641 lines)
- `docs/integrations/CONNECTORS_GUIDE.md` - Integration guide
- `docs/ImpactIn_Runbook.md` - Operations runbook (486 lines)

## 5. Dependencies

Consumes:
- External APIs: Benevity, Goodera, Workday platforms
- Reporting Service for impact metrics data
- Analytics Engine for time-series data
- Q2Q AI for outcome scores

Provides:
- Impact data exported to external CSR platforms
- Inbound data from external systems for analytics
- Webhook events for real-time updates

## 6. Notes

- Benevity serves as production-ready reference implementation.
- Impact-In service has robust retry logic with exponential backoff + jitter.
- Comprehensive Prometheus metrics instrumentation exists.
- Secrets vault with multi-backend support (AWS, HashiCorp).
- Rate limiting implemented for Goodera (600ms delay, 100 req/min).
- Goodera OAuth discrepancy: docs mention OAuth 2.0, code uses API Key only - needs clarification.
- Workday SOAP implementation is undefined and needs completion.



