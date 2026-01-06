---
id: 19
key: campaign-management
name: Campaign Management
category: User Management
status: production
lastReviewed: 2025-01-27
---

# Campaign Management

## 1. Summary

- Campaign lifecycle and monetization system for creating and managing sellable CSR products.
- Features campaign CRUD operations, capacity tracking with alerts, pricing insights, upsell detection, billing integration, and evidence association.
- Links program templates, beneficiary groups, companies, and commercial terms into sellable campaigns.
- Used by sales teams, program coordinators, and company admins for campaign creation, monitoring, and monetization.

## 2. Current Status

- Overall status: `production`

- Fully implemented Campaign Service with 37 TypeScript files. Core features include campaign CRUD operations, program template instantiation, capacity tracking with alerts (80%, 90%, 100%, 110% thresholds), pricing insights, upsell opportunity detection, billing integration, evidence association, activity tracking, seat/credit tracking, commercial terms management, and state transitions. Service includes campaign instantiator, lifecycle manager, capacity tracker, pricing signals, upsell analyzer, metrics aggregator, and billing integrator. Test suite includes 14 TypeScript test files. OpenAPI specification exists for API documentation.

- Documentation includes `docs/CAMPAIGN_LIFECYCLE.md` and `docs/CAMPAIGN_MONETIZATION_QUICK_REF.md` with comprehensive campaign lifecycle and monetization guides. UI components exist in `apps/corp-cockpit-astro/src/components/campaigns/` with 11 files.

## 3. What's Next

- Add campaign performance analytics and ROI tracking.
- Implement campaign A/B testing for optimization.
- Enhance upsell detection with ML-based recommendations.
- Add campaign scheduling and automated activation.

## 4. Code & Files

Backend / services:
- `services/campaigns/` - Campaign service (37 *.ts files)
- `services/campaigns/src/lib/campaign-instantiator.ts` - Campaign creation
- `services/campaigns/src/lib/lifecycle-manager.ts` - Lifecycle management
- `services/campaigns/src/lib/capacity-tracker.ts` - Capacity tracking
- `services/campaigns/src/lib/pricing-signals.ts` - Pricing logic
- `services/campaigns/src/lib/upsell-analyzer.ts` - Upsell analysis
- `services/campaigns/src/routes/campaigns.ts` - Campaign CRUD routes

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/campaigns/` - Campaign UI (11 files)

Shared / schema / docs:
- `docs/CAMPAIGN_LIFECYCLE.md` - Campaign lifecycle docs
- `docs/CAMPAIGN_MONETIZATION_QUICK_REF.md` - Monetization quick reference
- `docs/CAMPAIGN_PRICING_MODELS.md` - Pricing models documentation

## 5. Dependencies

Consumes:
- Program Management for templates
- Billing service for monetization
- Reporting for metrics
- Evidence Lineage for associations

Provides:
- Campaign data consumed by Corporate Cockpit Dashboard
- Campaign instances used by Program Management
- Campaign metrics for Reporting

## 6. Notes

- Campaigns link program templates, beneficiary groups, companies, and commercial terms.
- Capacity tracking supports all pricing models (seats, credits, IAAS, bundle).
- Capacity alerts trigger at 80%, 90%, 100%, and 110% thresholds with smart throttling.
- Pricing insights provide data-driven pricing recommendations.
- Upsell detection identifies opportunities for campaign expansion.
- Evidence association links campaigns to impact evidence for reporting.



