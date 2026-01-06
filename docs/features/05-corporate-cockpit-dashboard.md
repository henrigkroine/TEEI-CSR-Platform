---
id: 05
key: corporate-cockpit-dashboard
name: Corporate Cockpit Dashboard
category: Core
status: production
lastReviewed: 2025-01-27
---

# Corporate Cockpit Dashboard

## 1. Summary

- Executive dashboard application (Astro 5 + React) providing real-time impact metrics and analytics visualization.
- Features real-time metrics via Server-Sent Events (SSE), interactive KPI cards, charts, boardroom mode, dark mode, and PWA capabilities.
- Displays SROI, VIS, and at-a-glance widgets with evidence explorer and lineage tracking.
- Used by corporate executives, program managers, and stakeholders for impact monitoring and decision-making.

## 2. Current Status

- Overall status: `production`

- Fully implemented Corporate Cockpit dashboard in `apps/corp-cockpit-astro/` with 581 files. Core features include login with JWT authentication, multi-language routing (EN, NO, UK), tenant selector, dashboard with real-time SSE updates, SROI/VIS/At-A-Glance widgets, Evidence Explorer with lineage, admin console UI, report generation modal, and web-vitals collection. Dashboard components include `DashboardWithSSE.tsx` for real-time updates, `Chart.tsx` for visualization, and widget system in `src/components/widgets/`. Boardroom mode, dark mode, and PWA support are implemented.

- Application is operational with 75% completion status. Some features like Gen-AI report generation endpoint are stubbed, and approval workflows backend may need additional work. Documentation includes boardroom and dark mode implementation guides.

## 3. What's Next

- Complete Gen-AI report generation endpoint wiring in `apps/corp-cockpit-astro/src/api/reports.ts`.
- Add approval workflows backend integration for draft→review→approve flows.
- Enhance dashboard caching strategy for improved performance (see `docs/features/dashboard_caching.md`).
- Add saved views functionality for personalized dashboard configurations.

## 4. Code & Files

Backend / services:
- Dashboard consumes APIs from: Reporting Service (SROI/VIS), Analytics Engine, Q2Q AI, Evidence API

Frontend / UI:
- `apps/corp-cockpit-astro/` - Main dashboard app (581 files)
- `apps/corp-cockpit-astro/src/components/dashboard/` - Dashboard components
- `apps/corp-cockpit-astro/src/components/widgets/` - Dashboard widgets
- `apps/corp-cockpit-astro/src/components/Chart.tsx` - Chart components
- `apps/corp-cockpit-astro/src/components/DashboardWithSSE.tsx` - SSE dashboard
- `apps/corp-cockpit-astro/src/components/boardroom/` - Boardroom mode components (9 files)
- `apps/corp-cockpit-astro/src/components/theme/` - Theme components (4 files)
- `apps/corp-cockpit-astro/src/components/pwa/` - PWA components (2 files)
- `apps/corp-cockpit-astro/src/features/offline/` - Offline support (6 files)

Shared / schema / docs:
- `apps/corp-cockpit-astro/BOARDROOM_IMPLEMENTATION_SUMMARY.md` - Boardroom docs
- `apps/corp-cockpit-astro/DARK_MODE_IMPLEMENTATION.md` - Dark mode docs
- `docs/features/dashboard_caching.md` - Dashboard caching guide
- `docs/features/sse_real_time_updates.md` - SSE updates guide

## 5. Dependencies

Consumes:
- SROI Calculation for impact metrics
- VIS Calculation for volunteer scores
- Analytics Engine for time-series data
- NLQ for natural language insights
- Report Generation for PDF/PPTX exports
- Evidence Lineage for audit trails

Provides:
- Dashboard UI consumed by all user roles (admin, company_admin, participant, volunteer)
- Real-time metrics displayed to executives and program managers
- Boardroom mode for executive presentations

## 6. Notes

- Built with Astro 5 for SSR and React islands for interactivity.
- Real-time updates use Server-Sent Events (SSE) with last-event-id replay for connection recovery.
- PWA capabilities include service worker, offline cache, and app manifest for install prompts.
- Dark mode supports system preference detection and WCAG contrast compliance.
- Multi-language support includes EN, NO, UK with RTL support for Arabic/Hebrew.



