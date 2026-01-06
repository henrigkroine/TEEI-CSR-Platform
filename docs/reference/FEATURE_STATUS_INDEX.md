# TEEI CSR – Feature Status Index

Generated from the feature docs in `docs/features/` and the Feature Index.

| ID | Feature | Category | Status | What's Next (1‑liner) | Doc |
|----|---------|----------|--------|------------------------|-----|
| 01 | Unified Journey Tracking | Core | production | Add integration tests, journey visualization API, alerting, and rule editor UI. | [Spec](./features/01-unified-journey-tracking.md) |
| 02 | Q2Q AI Engine | AI & Analytics | production | Harden safety checks, add batch classification, implement local model fallback, enhance evidence extraction. | [Spec](./features/02-q2q-ai-engine.md) |
| 03 | SROI Calculation | Core | production | Add integration tests, wire into dashboard widgets, implement versioning, add forecasting capabilities. | [Spec](./features/03-sroi-calculation.md) |
| 04 | VIS Calculation | Core | production | Add integration tests, wire into dashboard widgets, implement trend calculation, add forecasting capabilities. | [Spec](./features/04-vis-calculation.md) |
| 05 | Corporate Cockpit Dashboard | Core | production | Complete Gen-AI report endpoint wiring, add approval workflows backend, enhance caching, add saved views. | [Spec](./features/05-corporate-cockpit-dashboard.md) |
| 06 | Natural Language Query (NLQ) | AI & Analytics | production | Enhance query template library, add query explanation, implement query history, add performance monitoring. | [Spec](./features/06-natural-language-query.md) |
| 07 | Analytics Engine | AI & Analytics | production | Add predictive analytics, implement anomaly detection, enhance cohort analysis, add real-time alerting. | [Spec](./features/07-analytics-engine.md) |
| 08 | Forecasting | AI & Analytics | production | Add seasonality detection, implement accuracy monitoring, add forecast comparison view, enhance scenario modeling. | [Spec](./features/08-forecasting.md) |
| 09 | Scenario Planner | AI & Analytics | in-progress | Complete backend integration with Forecasting service, add scenario comparison, implement saving/sharing, add export. | [Spec](./features/09-scenario-planner.md) |
| 10 | External Connectors | Integration | in-progress | Complete Goodera OAuth, implement Workday SOAP, add contract tests, enhance observability. | [Spec](./features/10-external-connectors.md) |
| 11 | Discord Integration | Integration | production | Add interactive buttons, implement scheduled digests, add multi-server support, enhance Q2Q integration. | [Spec](./features/11-discord-integration.md) |
| 12 | Webhooks | Integration | production | Add signature verification for outbound, implement replay functionality, add subscription management UI, enhance monitoring. | [Spec](./features/12-webhooks.md) |
| 13 | Report Generation | Reporting & Compliance | production | Add scheduled generation with cron, implement email delivery, enhance PPTX export, add versioning and diff visualization. | [Spec](./features/13-report-generation.md) |
| 14 | Evidence Lineage | Reporting & Compliance | production | Complete backend API implementation, add evidence detail drawer, implement real-time updates, enhance CSRD export. | [Spec](./features/14-evidence-lineage.md) |
| 15 | GDPR Compliance | Reporting & Compliance | production | Implement automated consent re-solicitation, add consent management UI, enhance DSAR portal, add data residency policies. | [Spec](./features/15-gdpr-compliance.md) |
| 16 | Audit Logging | Reporting & Compliance | production | Add retention policies and archival, implement advanced search/filtering, add export functionality, enhance visualization. | [Spec](./features/16-audit-logging.md) |
| 17 | Buddy Matching | User Management | production | Implement match recommendation algorithm, add conflict resolution, complete external platform integration, add quality scoring. | [Spec](./features/17-buddy-matching.md) |
| 18 | Program Management | User Management | production | Add template versioning, implement instance cloning, enhance capacity tracking, add performance analytics. | [Spec](./features/18-program-management.md) |
| 19 | Campaign Management | User Management | production | Add performance analytics and ROI tracking, implement A/B testing, enhance upsell detection with ML, add scheduling. | [Spec](./features/19-campaign-management.md) |
| 20 | Unified Profile | User Management | production | Add merge conflict resolution UI, implement bulk import, enhance completeness scoring, add photo storage. | [Spec](./features/20-unified-profile.md) |
| 21 | API Gateway | Platform | production | Add per-tenant throttling, implement API key management, enhance OAuth 2.0 flow, add webhook signature validation. | [Spec](./features/21-api-gateway.md) |
| 22 | Notifications | Platform | production | Add push notifications, implement Slack integration, enhance template library, add scheduling and recurring. | [Spec](./features/22-notifications.md) |
| 23 | Safety Moderation | Platform | production | Add manual review queue, implement appeal process, enhance content categories, add safety metrics dashboard. | [Spec](./features/23-safety-moderation.md) |
| 24 | Boardroom Mode | Platform | production | Add presentation controls, implement templates, add export to PDF/PPTX, enhance with presenter notes. | [Spec](./features/24-boardroom-mode.md) |
| 25 | PWA Support | Platform | production | Enhance offline sync with conflict resolution, add push notifications, implement background sync, add update notifications. | [Spec](./features/25-pwa-support.md) |
| 26 | Dark Mode | Platform | production | Add theme customization, implement scheduling, enhance contrast for AAA, add theme preview. | [Spec](./features/26-dark-mode.md) |
| 27 | Accessibility (A11y) | Platform | production | Enhance screen reader support, add keyboard shortcut customization, implement focus trap, add CI testing. | [Spec](./features/27-accessibility.md) |
| 28 | Internationalization (i18n) | Platform | production | Add more languages, enhance locale formatting, implement language detection, add translation management UI. | [Spec](./features/28-internationalization.md) |
| 29 | Benchmarks | Platform | production | Add advanced cohort builder UI, enhance percentile ribbons, implement benchmark alerts, add export functionality. | [Spec](./features/29-benchmarks.md) |
| 30 | Approvals Workflow | Platform | in-progress | Complete backend API, add notifications and reminders, implement delegation/escalation, add analytics. | [Spec](./features/30-approvals-workflow.md) |
| 31 | Deck Composer | Platform | production | Add collaborative editing, implement sharing/permissions, enhance template library, add analytics. | [Spec](./features/31-deck-composer.md) |
| 32 | Publications | Platform | production | Add analytics and view tracking, implement scheduling, enhance embed customization, add templates. | [Spec](./features/32-publications.md) |
| 33 | Admin Console | Platform | production | Add bulk user operations, implement role customization, enhance audit explorer, add health monitoring. | [Spec](./features/33-admin-console.md) |
| 34 | Identity & SSO | Platform | in-progress | Complete SAML/OIDC SSO backend, add SCIM provisioning endpoints, implement provider config UI, add testing tools. | [Spec](./features/34-identity-sso.md) |
| 35 | Data Trust & Catalog | Platform | in-progress | Complete Worker 5 implementation (OpenLineage, Great Expectations, dbt, Catalog UI), add freshness badges, implement lineage visualization. | [Spec](./features/35-data-trust-catalog.md) |

---

## Status Summary

- **Production**: 30 features
- **In Progress**: 5 features (Scenario Planner, External Connectors, Approvals Workflow, Identity & SSO, Data Trust & Catalog)
- **Not Started**: 0 features
- **Deprecated**: 0 features
- **Unknown**: 0 features

---

## Features Requiring Additional Information

The following features have status "in-progress" or may need additional codebase inspection to fully classify:

1. **Scenario Planner (09)**: Backend integration with Forecasting service may need verification
2. **External Connectors (10)**: Goodera and Workday integration status needs clarification
3. **Approvals Workflow (30)**: Backend API completion status needs verification
4. **Identity & SSO (34)**: Full SSO implementation status needs verification
5. **Data Trust & Catalog (35)**: Worker 5 implementation progress needs verification

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0



