# SWARM 10: 30-Agent Task Delegation Matrix

**Status**: PLAN MODE – Awaiting Approval
**Created**: 2025-11-22

---

## Quick Reference

| Team | Agents | Focus | Duration | Dependencies |
|------|--------|-------|----------|--------------|
| **Team 1: Strategy** | 1.1–1.6 | Product positioning, messaging | Week 1 | None (foundational) |
| **Team 2: Website** | 2.1–2.8 | Public website build | Week 2 | Team 1 outputs |
| **Team 3: Sales** | 3.1–3.5 | Lead capture, CRM, quotes | Week 3 | Team 2 (forms) |
| **Team 4: Marketing** | 4.1–4.5 | Email automation, sequences | Week 4 | Team 3 (leads) |
| **Team 5: Demo** | 5.1–5.3 | Demo sandbox, sales playbook | Week 5 | Team 2 (website) |
| **Team 6: Launch** | 6.1–6.3 | API docs, final QA | Week 6 | All teams |

---

## Detailed Task Matrix

### TEAM 1: Product Strategy & Positioning

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **1.1** | `product-strategist` | Define GTM strategy, product positioning, competitive analysis | None | Read, Write | - `/docs/swarm10/product-positioning.md`<br>- `/docs/swarm10/competitive-analysis.md`<br>- `/docs/swarm10/target-personas.md` | Positioning doc covers all 5 products (Mentors, Language, Buddy, Upskilling, Platform); competitive analysis vs. 3+ competitors; 3 target personas defined |
| **1.2** | `pricing-engineer` | Build interactive pricing calculator, feature comparison tables | 1.1 | Read, Write, Edit | - `apps/public-website/src/components/pricing/PricingCalculator.tsx`<br>- `apps/public-website/src/components/pricing/ComparisonTable.tsx` | Calculator generates accurate quotes (seats × $20 + plan base); comparison table shows 15+ features; L2I bundle selector functional |
| **1.3** | `program-packaging-designer` | Productize 4 programs (Mentors, Language, Buddy, Upskilling) | 1.1 | Read, Write | - `/docs/swarm10/programs/mentors-for-refugees.md`<br>- `/docs/swarm10/programs/language-for-refugees.md`<br>- `/docs/swarm10/programs/buddy-integration.md`<br>- `/docs/swarm10/programs/upskilling-kintell.md` | Each program one-pager includes: features, benefits, outcomes (SROI/VIS), pricing, integration requirements |
| **1.4** | `beneficiary-market-mapper` | Define 20+ beneficiary group verticals, targeting guide | 1.3 | Read, Write | - `/docs/swarm10/beneficiary-taxonomy.md`<br>- `/docs/swarm10/market-targeting-guide.md` | Taxonomy includes ≥20 beneficiary groups (refugees, migrants, women, veterans, etc.); targeting guide maps groups to programs |
| **1.5** | `value-prop-writer` | Write messaging for all product pages (hero copy, CTAs, taglines) | 1.1, 1.3 | Read, Write | - `/docs/swarm10/messaging-guide.md`<br>- `/apps/public-website/src/content/copy.json` | Messaging guide includes: home hero, 4 product pages, 5 CTAs, 10 benefit statements; copy is concise (<50 words/section) |
| **1.6** | `case-study-framework-builder` | Create templates for customer case studies | 1.1 | Read, Write | - `/docs/swarm10/case-study-template.md`<br>- `/docs/swarm10/impact-story-framework.md` | Case study template includes: challenge, solution, results, metrics (SROI/VIS); impact story framework for Q2Q integration |

---

### TEAM 2: Website Engineering & UX

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **2.1** | `website-architect` | Design site structure, navigation, scaffold Astro 5 app | 1.1, 1.5 | Read, Write, Bash | - `apps/public-website/` (new Astro 5 app)<br>- `/docs/swarm10/site-map.md` | Site map includes ≥10 pages; Astro app builds successfully; routing structure matches site map |
| **2.2** | `landing-page-designer` | Build home page (hero, social proof, features, CTAs) | 2.1, 1.5 | Read, Write, Edit | - `apps/public-website/src/pages/index.astro`<br>- `apps/public-website/src/components/Hero.astro` | Home page includes: hero (headline + CTA), social proof (logos/testimonials), 3–5 feature highlights, 2+ CTAs |
| **2.3** | `product-page-builder` | Build 4 product pages (Mentors, Language, Buddy, Platform) | 1.3, 1.5 | Read, Write, Edit | - `apps/public-website/src/pages/products/mentors.astro`<br>- `apps/public-website/src/pages/products/language.astro`<br>- `apps/public-website/src/pages/products/buddy.astro`<br>- `apps/public-website/src/pages/products/platform.astro` | Each page includes: features list, impact metrics (SROI/VIS), integration callouts, CTA (demo request) |
| **2.4** | `pricing-page-builder` | Build pricing page (grid, calculator, L2I bundles) | 1.2 | Read, Write, Edit | - `apps/public-website/src/pages/pricing.astro` | Pricing page shows: 3 plan tiers, feature comparison table, 4 L2I bundles, interactive calculator |
| **2.5** | `seo-optimizer` | SEO infrastructure (meta tags, schema.org, sitemap) | 2.1 | Read, Write, Edit | - `apps/public-website/src/components/SEOHead.astro`<br>- `apps/public-website/src/pages/sitemap.xml.ts`<br>- `apps/public-website/public/robots.txt` | All pages have unique meta tags (title, description); schema.org markup for Product, Organization; sitemap.xml generated |
| **2.6** | `social-preview-engineer` | OpenGraph images, Twitter cards | 2.1 | Read, Write, Edit | - `apps/public-website/public/og-images/` (home, pricing, products)<br>- Social metadata in SEOHead | OpenGraph images (1200×630) for home + 4 product pages; Twitter card meta tags; previews render correctly on Twitter/LinkedIn |
| **2.7** | `performance-optimizer` | Lighthouse >95, Core Web Vitals optimization | All Team 2 | Read, Edit, Bash | - Performance budget config<br>- `/docs/swarm10/performance-report.md` | Lighthouse Performance >95; LCP <2.5s, FID <100ms, CLS <0.1; all pages statically generated |
| **2.8** | `i18n-localizer` | Multi-locale support (EN/NO/DE/AR/UK) | 2.1 | Read, Write, Edit | - `apps/public-website/src/i18n/`<br>- `apps/public-website/src/components/LanguageSwitcher.astro` | i18n infrastructure supports ≥2 locales (EN + NO); translation keys for all UI strings; language switcher functional |

---

### TEAM 3: Sales System & CRM

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **3.1** | `lead-capture-engineer` | Build lead capture forms (demo, contact, trial) | 2.1 | Read, Write, Edit | - `apps/public-website/src/components/forms/DemoRequestForm.tsx`<br>- `apps/public-website/src/components/forms/ContactSalesForm.tsx`<br>- `apps/public-website/src/components/forms/TrialSignupForm.tsx`<br>- `services/api-gateway/src/routes/leads.ts` | 3 forms functional (demo request, contact sales, trial signup); Zod validation; submissions tracked in PostgreSQL |
| **3.2** | `crm-integrator` | Export leads to CSV/webhook/HubSpot API | 3.1 | Read, Write, Edit | - `services/api-gateway/src/lib/crm-integration.ts`<br>- `/docs/swarm10/crm-integration-guide.md` | Webhook sends leads to configurable endpoint; CSV export functional; HubSpot API integration (optional); lead deduplication |
| **3.3** | `proposal-template-creator` | PDF proposal templates with branding | 1.1 | Read, Write, Edit | - `services/reporting/src/templates/proposal.ts`<br>- `services/reporting/src/routes/proposals.ts` | Proposal template includes: cover, exec summary, pricing, next steps; TEEI branding (logo, colors); dynamic data (company name, tier) |
| **3.4** | `quote-generator-builder` | Auto-generate pricing quotes based on selections | 1.2 | Read, Write, Edit | - `services/billing/src/routes/quotes.ts`<br>- `services/billing/src/lib/quote-generator.ts` | Quote calculator generates accurate totals; PDF quote generation; quote tracking (ID, expiration, acceptance) |
| **3.5** | `sales-dashboard-designer` | Internal TEEI sales dashboard (leads, pipeline) | 3.1, 3.2 | Read, Write, Edit | - `apps/corp-cockpit-astro/src/pages/admin/sales.astro`<br>- `apps/corp-cockpit-astro/src/components/sales/LeadsTable.tsx` | Sales dashboard shows: leads table (name, email, status), pipeline chart, conversion metrics (lead → trial → paid) |

---

### TEAM 4: Marketing Automation

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **4.1** | `automation-architect` | Email sequence design (welcome, nurture, onboarding, renewal) | 3.1 | Read, Write | - `/docs/swarm10/email-sequences.md`<br>- `services/notifications/src/sequences/` | 4 email sequences defined: welcome (3 emails), nurture (5 emails), onboarding (4 emails), renewal (3 emails); timing/triggers documented |
| **4.2** | `email-copywriter` | Write email templates (subject lines, body, CTAs) | 4.1 | Read, Write | - `services/notifications/src/templates/emails/` (12+ .hbs templates) | 12+ email templates with: subject lines, body copy, CTAs, personalization tags ({{firstName}}, {{companyName}}); A/B test variants for key emails |
| **4.3** | `impact-announcement-writer` | Automated impact story emails (from Q2Q) | Existing Q2Q | Read, Write, Edit | - `services/notifications/src/templates/emails/impact-story.hbs`<br>- `services/notifications/src/lib/q2q-integration.ts` | Impact story email template integrates Q2Q API; fetches learner stories, embeds metrics (SROI/VIS); opt-in/opt-out management |
| **4.4** | `webhook-integration-engineer` | Connect forms → CRM → email automation | 3.1, 3.2, 4.1 | Read, Write, Edit | - `services/api-gateway/src/lib/webhook-dispatcher.ts`<br>- `services/notifications/src/routes/webhooks.ts` | Webhook plumbing functional (form submit → CRM → email trigger); NATS JetStream integration; retry logic for failed webhooks |
| **4.5** | `newsletter-engineer` | Monthly CSR newsletter template, send scheduling | 4.2 | Read, Write, Edit | - `services/notifications/src/templates/emails/newsletter.hbs`<br>- `services/notifications/src/jobs/newsletter-sender.ts` | Newsletter template (header, feature story, metrics, CTA); subscriber management (opt-in/unsubscribe); cron job for monthly send |

---

### TEAM 5: Demo Sandbox

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **5.1** | `demo-data-generator` | Synthetic VIS/SROI/Q2Q data for 3 demo companies | Existing generators | Read, Write, Edit | - `services/impact-in/src/demo/companies/` (3 configs)<br>- `scripts/demo/seed-sandbox.ts` | 3 demo companies (Tech Startup, Retail, Finance) with realistic data; SROI 3.5–5.2, VIS 75–92; 100+ Q2Q snippets per company |
| **5.2** | `demo-environment-builder` | Sandbox CSR Portal (read-only, pre-populated) | 5.1 | Read, Write, Edit, Bash | - `apps/corp-cockpit-astro/src/middleware/demo-mode.ts`<br>- `/docs/swarm10/demo-environment-setup.md` | Demo subdomain (demo.teei.org) accessible; read-only mode enforced; 3 companies pre-populated; login-less access |
| **5.3** | `demo-scenario-writer` | Sales scripts, walkthrough guides, use cases | 5.1, 5.2 | Read, Write | - `/docs/swarm10/demo-playbook.md`<br>- `/docs/swarm10/sales-scripts.md`<br>- `/docs/swarm10/guided-tour.md` | 3 demo scenarios (exec reporting, impact tracking, connectors); sales scripts with talking points; guided tour with screenshots; FAQ |

---

### TEAM 6: Documentation & Launch QA

| Agent ID | Agent Name | Task | Dependencies | Tools | Deliverables | Success Criteria |
|----------|-----------|------|--------------|-------|--------------|------------------|
| **6.1** | `public-api-doc-writer` | Developer portal (OpenAPI → public docs) | Existing OpenAPI | Read, Write, Edit | - `apps/api-docs/` (Redoc/Stoplight)<br>- `/docs/swarm10/api-authentication-guide.md` | Public API docs portal live; authentication guide (API keys, OAuth); endpoint reference with code examples (curl, JS, Python) |
| **6.2** | `marketing-doc-writer` | Product docs, sales playbooks, messaging guide | All Team 1 | Read, Write | - `/docs/swarm10/product-tier-guide.md`<br>- `/docs/swarm10/sales-playbook.md`<br>- `/docs/swarm10/messaging-guide.md` | Product tier comparison guide; sales playbook (qualification, demo, objections, close); messaging guide (elevator pitch, benefits); FAQ |
| **6.3** | `final-launch-reviewer` | Readiness checklist, smoke tests, launch plan | ALL agents | Read, Write, Bash | - `/docs/swarm10/LAUNCH_READINESS_REPORT.md`<br>- `/docs/swarm10/go-live-checklist.md`<br>- `/docs/swarm10/smoke-test-results.md` | Launch readiness checklist complete; smoke tests pass (all pages load, forms submit, emails send); go-live plan (DNS, monitoring, rollback) |

---

## Execution Workflow

### Phase 1: Foundation (Week 1)
**Agents**: 1.1 → (1.2, 1.3, 1.4, 1.5, 1.6), 2.1
- **Sequential**: 1.1 runs first (foundational positioning)
- **Parallel**: 1.2–1.6 run concurrently (depend on 1.1 output)
- **Parallel**: 2.1 runs concurrently with 1.2–1.6 (uses 1.1 + 1.5 outputs)

### Phase 2: Website (Week 2)
**Agents**: 2.2, 2.3, 2.4, 2.5, 2.6 → 2.7, 2.8
- **Parallel**: 2.2–2.6 run concurrently (all depend on 2.1)
- **Sequential**: 2.7 runs after 2.2–2.6 (performance optimization)
- **Parallel**: 2.8 runs concurrently with 2.7 (i18n infrastructure)

### Phase 3: Sales (Week 3)
**Agents**: 3.1, 3.2, 3.3, 3.4 → 3.5
- **Parallel**: 3.1–3.4 run concurrently
- **Sequential**: 3.5 runs after 3.1 + 3.2 (depends on leads data)

### Phase 4: Marketing (Week 4)
**Agents**: (4.1, 4.2) → (4.3, 4.4, 4.5)
- **Parallel**: 4.1 + 4.2 run concurrently (sequence design + copywriting)
- **Parallel**: 4.3, 4.4, 4.5 run concurrently after 4.1 + 4.2

### Phase 5: Demo (Week 5)
**Agents**: 5.1 → 5.2 → 5.3
- **Sequential**: 5.1 (data) → 5.2 (environment) → 5.3 (playbook)

### Phase 6: Launch (Week 6)
**Agents**: (6.1, 6.2) → 6.3
- **Parallel**: 6.1 + 6.2 run concurrently
- **Sequential**: 6.3 runs last (final review)

---

## Critical Path

```
1.1 (positioning)
  ↓
1.2–1.6 (parallel: pricing, programs, messaging)
  ↓
2.1 (site architecture)
  ↓
2.2–2.6 (parallel: pages, SEO, social)
  ↓
2.7–2.8 (parallel: performance, i18n)
  ↓
3.1–3.4 (parallel: forms, CRM, proposals, quotes)
  ↓
3.5 (sales dashboard)
  ↓
4.1–4.2 (parallel: email sequences, copy)
  ↓
4.3–4.5 (parallel: impact emails, webhooks, newsletter)
  ↓
5.1 (demo data) → 5.2 (demo env) → 5.3 (playbook)
  ↓
6.1–6.2 (parallel: API docs, sales docs)
  ↓
6.3 (final review)
  ↓
LAUNCH
```

**Estimated Duration**: 4–6 weeks (depending on parallelization efficiency)

---

## Blocked Agent Management

**If an agent is blocked**:
1. Agent posts blocker to `/docs/swarm10/BLOCKERS.md`
2. Orchestrator (Tech Lead) escalates or reassigns
3. Blocked agent moves to next independent task (if available)

**Common Blockers**:
- Agent 2.2–2.8 blocked if 2.1 (site scaffold) incomplete
- Agent 3.5 blocked if 3.1 + 3.2 (leads data) incomplete
- Agent 5.2 blocked if 5.1 (demo data) incomplete
- Agent 6.3 blocked if any prior agent incomplete

---

## Agent Output Verification

Each agent must:
1. ✅ **Create deliverables** (files listed in matrix)
2. ✅ **Update PROGRESS.md** (mark task complete, link to PR)
3. ✅ **Write tests** (unit ≥80%, E2E ≥60% for code deliverables)
4. ✅ **Update documentation** (inline comments, README updates)
5. ✅ **Pass quality gates** (lint, typecheck, Lighthouse if UI)

---

## Success Criteria Summary

| Team | Success Metric | Target |
|------|---------------|--------|
| **Team 1** | Positioning docs complete | 6 documents (positioning, competitive, personas, programs, messaging, case study) |
| **Team 2** | Website live | Home + pricing + 4 product pages; Lighthouse >95 |
| **Team 3** | Lead capture functional | 3 forms working; CRM integration; sales dashboard |
| **Team 4** | Email automation live | 12+ templates; 4 sequences; webhook integration |
| **Team 5** | Demo sandbox accessible | 3 companies; read-only mode; sales playbook |
| **Team 6** | Launch ready | API docs; sales playbook; readiness report |

---

**END OF TASK MATRIX**

*Proceed to orchestration after approval.*
