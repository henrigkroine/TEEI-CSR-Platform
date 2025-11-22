# SWARM 10: Executive Summary
## Product Launch – Public Website, Sales System, Marketing Automation

**Status**: PLAN MODE – Awaiting Approval
**Created**: 2025-11-22
**Branch**: `claude/product-packaging-sales-01KDSgjEi2SFjfaWAA68SGJQ`

---

## Mission

Transform the TEEI CSR Platform from an internal product into a **market-ready SaaS offering** with:
- Public-facing marketing website
- Sales funnel & CRM integration
- Demo sandbox for prospects
- Marketing automation
- Public API documentation

**Go-Live Target**: 4–6 weeks from approval

---

## What We're Building

### 1. Public Marketing Website (`apps/public-website/`)
- **Home page**: Hero, social proof, features, CTAs
- **Pricing page**: 3 tiers (Essentials, Professional, Enterprise) + L2I bundles
- **4 Product pages**: Mentors for Refugees, Language for Refugees, Buddy Integration, Upskilling (Kintell)
- **SEO**: Meta tags, schema.org, sitemap.xml, OpenGraph images
- **Performance**: Lighthouse >95, Core Web Vitals optimized
- **i18n**: Multi-locale support (EN/NO, defer DE/AR/UK)

### 2. Sales System
- **Lead capture forms**: Demo request, contact sales, trial signup
- **CRM integration**: Webhook → HubSpot/Pipedrive (or CSV export)
- **Proposal generator**: Branded PDF proposals
- **Quote generator**: Auto-calculate pricing quotes
- **Sales dashboard**: Internal admin view (leads, pipeline, conversions)

### 3. Marketing Automation
- **Email sequences**: Welcome (3 emails), nurture (5 emails), onboarding (4 emails), renewal (3 emails)
- **Email templates**: 12+ Handlebars templates with personalization
- **Impact story automation**: Integrate Q2Q AI for learner stories
- **Newsletter**: Monthly CSR newsletter template
- **Webhook integration**: Forms → CRM → email triggers

### 4. Demo Sandbox
- **3 demo companies**: Tech Startup, Retail Chain, Financial Services
- **Synthetic data**: Realistic VIS/SROI/Q2Q metrics
- **Read-only portal**: Prospect-facing demo at demo.teei.org
- **Sales playbook**: Scripts, guided tours, use cases

### 5. Public API Documentation
- **Developer portal**: Redoc or Stoplight (from existing OpenAPI specs)
- **Authentication guide**: API keys, OAuth flows
- **Code examples**: curl, JavaScript, Python

---

## 30-Agent Team Structure

| Team | Agents | Focus | Duration |
|------|--------|-------|----------|
| **Team 1: Strategy** | 1.1–1.6 | Product positioning, messaging, program packaging | Week 1 (5 days) |
| **Team 2: Website** | 2.1–2.8 | Astro 5 website, SEO, performance, i18n | Week 2 (5–7 days) |
| **Team 3: Sales** | 3.1–3.5 | Lead forms, CRM, proposals, quotes, dashboard | Week 3 (5–7 days) |
| **Team 4: Marketing** | 4.1–4.5 | Email automation, sequences, webhooks | Week 4 (5–7 days) |
| **Team 5: Demo** | 5.1–5.3 | Demo data, sandbox environment, playbook | Week 5 (3–5 days) |
| **Team 6: Launch** | 6.1–6.3 | API docs, sales playbook, final QA | Week 6 (3–5 days) |

**Total**: 30 agents, 6 teams, 4–6 weeks (28–32 days)

---

## Key Deliverables

### Documentation
- [ ] Product positioning document
- [ ] Messaging guide (hero copy, CTAs, taglines)
- [ ] 4 program one-pagers (Mentors, Language, Buddy, Upskilling)
- [ ] Sales playbook (qualification, demo, objections, close)
- [ ] Demo playbook (scenarios, scripts, guided tour)
- [ ] API authentication guide

### Code Artifacts
- [ ] `apps/public-website/` (new Astro 5 app)
- [ ] `apps/api-docs/` (public API docs portal)
- [ ] `services/api-gateway/src/routes/leads.ts` (lead capture API)
- [ ] `services/billing/src/routes/quotes.ts` (quote generator)
- [ ] `services/reporting/src/routes/proposals.ts` (proposal generator)
- [ ] `services/notifications/src/sequences/` (email automation)
- [ ] `services/notifications/src/templates/emails/` (12+ email templates)
- [ ] `apps/corp-cockpit-astro/src/pages/admin/sales.astro` (sales dashboard)
- [ ] `services/impact-in/src/demo/companies/` (3 demo companies)

### Infrastructure
- [ ] DNS: teei.org → public website, demo.teei.org → sandbox
- [ ] Email service: SendGrid or AWS SES
- [ ] Analytics: Plausible or PostHog
- [ ] Hosting: Vercel or similar (static site)

---

## Success Metrics

### Launch Readiness (Week 6)
✅ Website live at teei.org (5 pages minimum)
✅ 3 forms functional (demo, contact, trial)
✅ Email automation working (welcome sequence)
✅ Demo sandbox accessible (3 companies)
✅ API docs published
✅ Lighthouse Performance >95
✅ SEO metadata complete

### 30-Day Post-Launch
🎯 1,000+ unique visitors
🎯 50+ demo requests
🎯 10+ trial signups
🎯 2+ paid subscriptions

---

## Risk Highlights

| Risk | Mitigation |
|------|------------|
| **Email deliverability** (spam filters) | Use SendGrid/AWS SES with SPF/DKIM/DMARC |
| **Form spam** (bots) | reCAPTCHA v3, honeypot fields, rate limiting |
| **Demo sandbox breaks prod** | Separate subdomain, read-only middleware |
| **Scope creep** | Strict agent task definitions, approval gates |
| **Website performance** | Dedicated agent (2.7) for Lighthouse optimization |

---

## Budget

### One-Time Costs
- Domain (teei.org): Assumed existing
- SSL: Free (Let's Encrypt or Vercel)
- Design assets: Reuse existing branding

### Recurring Costs (Monthly)
- Hosting (Vercel): ~$50/mo
- Email service (SendGrid Essentials): ~$20/mo
- Analytics (Plausible): ~$9/mo
- **Total**: ~$100/mo

---

## Timeline

```
Week 1: Strategy & Positioning
  ├─ Product positioning
  ├─ Messaging guide
  ├─ Program one-pagers
  └─ Site architecture

Week 2: Website Build
  ├─ Home page
  ├─ Pricing page
  ├─ 4 product pages
  ├─ SEO metadata
  └─ Performance optimization

Week 3: Sales System
  ├─ Lead capture forms
  ├─ CRM integration
  ├─ Proposal/quote generators
  └─ Sales dashboard

Week 4: Marketing Automation
  ├─ Email sequences (4)
  ├─ Email templates (12+)
  ├─ Impact story automation
  └─ Webhook integration

Week 5: Demo Sandbox
  ├─ Demo data (3 companies)
  ├─ Sandbox environment
  └─ Sales playbook

Week 6: Documentation & Launch
  ├─ API documentation
  ├─ Final QA & smoke tests
  └─ GO-LIVE
```

---

## Critical Dependencies

### External
- DNS configured (teei.org, demo.teei.org)
- Email service account (SendGrid or AWS SES)
- Analytics account (Plausible or PostHog)

### Internal
✅ Pricing defined (docs/commercial/)
✅ Billing service exists (services/billing/)
✅ Demo generators exist (services/impact-in/src/demo/)
✅ OpenAPI specs exist (packages/openapi/)
✅ Notification service exists (services/notifications/)

---

## Quality Gates

All existing PR gates apply:
- ✅ Lint (ESLint)
- ✅ Typecheck (TypeScript)
- ✅ Unit tests (80%+ coverage)
- ✅ E2E tests (60%+ coverage)
- ✅ Security audits (npm audit, Snyk)
- ✅ A11y (WCAG 2.2 AA on UI pages)

**New gates for SWARM 10**:
- ✅ Lighthouse Performance >95
- ✅ Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
- ✅ SEO audit (meta tags, schema.org, sitemap)
- ✅ Form validation tests
- ✅ Email template rendering tests

---

## Next Actions (After Approval)

1. **Week 1**: Spawn Team 1 (6 agents) → product positioning, messaging, site architecture
2. **Week 2**: Spawn Team 2 (8 agents) → build public website
3. **Week 3**: Spawn Team 3 (5 agents) → sales system
4. **Week 4**: Spawn Team 4 (5 agents) → marketing automation
5. **Week 5**: Spawn Team 5 (3 agents) → demo sandbox
6. **Week 6**: Spawn Team 6 (3 agents) → documentation, launch QA

---

## Approval Required

**Question**: Does this plan meet the SWARM 10 objectives?

**If YES**:
- Proceed to spawn agents (Phase 1: Team 1)
- Begin with Agents 1.1 (product-strategist) → 1.2–1.6 + 2.1 (parallel)

**If CHANGES NEEDED**:
- Specify adjustments (scope, timeline, team structure, etc.)
- Revise plan before execution

---

## Appendix: Full Documentation

For detailed task breakdowns, see:
- **Architecture**: `/docs/swarm10/PRODUCT_LAUNCH_ARCHITECTURE.md` (729 lines, comprehensive)
- **Task Matrix**: `/docs/swarm10/AGENT_TASK_MATRIX.md` (30-agent delegation table)
- **Risk Analysis**: `/docs/swarm10/RISK_DEPENDENCY_ANALYSIS.md` (risk register, mitigation)

---

**END OF EXECUTIVE SUMMARY**

*Awaiting approval to proceed with agent orchestration.*
