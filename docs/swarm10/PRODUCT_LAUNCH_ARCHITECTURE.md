# SWARM 10: PRODUCT LAUNCH ARCHITECTURE
## TEEI CSR Platform – Public Website, Sales System, Marketing Automation

**Version**: 1.0
**Status**: PLAN MODE – Awaiting Approval
**Created**: 2025-11-22
**Branch**: `claude/product-packaging-sales-01KDSgjEi2SFjfaWAA68SGJQ`

---

## Executive Summary

**Mission**: Transform the TEEI CSR Platform from an internal product into a market-ready SaaS offering with public-facing marketing website, sales funnel, demo environment, and commercial infrastructure.

**Scope**: 30 specialized agents across 6 teams delivering:
- Public marketing website (home, product, pricing, programs)
- Sales CRM integration & lead capture
- Marketing automation & email sequences
- Demo sandbox with synthetic data
- Public API documentation portal
- SEO infrastructure & social metadata
- Product packaging & positioning

**Timeline**: 4-6 weeks (6 parallel execution phases)

**Dependencies**:
- ✅ Existing: Pricing structure (docs/commercial/), billing service, demo data generators
- ✅ Existing: Corp cockpit (internal), trust center, API gateway
- ⏳ New: Public website app, marketing automation service, demo sandbox environment

---

## Current State Assessment

### ✅ What Exists
1. **Product Infrastructure**: 40+ microservices (impact-in, reporting, analytics, q2q-ai, etc.)
2. **Internal Apps**: corp-cockpit-astro (B2B dashboard), trust-center (compliance portal)
3. **Pricing Defined**: 3 tiers (Essentials $499/mo, Professional $1,499/mo, Enterprise $4,999/mo)
4. **L2I Bundles**: 4 SKUs ($5K–$100K/year) for impact funding
5. **Demo Data**: Generators in services/impact-in/src/demo/ (sessions, buddy, enrollments, volunteers)
6. **Billing Service**: Stripe integration, subscription management, entitlements
7. **Programs**: Mentors for Refugees, Language for Refugees, Buddy Integration, Upskilling (Kintell)

### ❌ What's Missing (SWARM 10 Deliverables)
1. **Public Website**: No marketing site (teei.org home, product pages, pricing)
2. **Product Pages**: No dedicated pages for Mentors, Language, Buddy programs
3. **Demo Sandbox**: No prospect-facing demo environment
4. **Lead Capture**: No forms, CRM integration, sales workflows
5. **Marketing Automation**: No email sequences, nurturing flows
6. **Public API Docs**: No developer portal (OpenAPI specs exist but not public)
7. **SEO Infrastructure**: No meta tags, OpenGraph, schema.org markup
8. **Sales Materials**: No proposal templates, quote generators, sales decks

---

## 30-Agent Team Structure

### Team 1: Product Strategy & Positioning (Agents 1–6)
**Lead**: product-strategy-lead
**Mission**: Define go-to-market strategy, product messaging, value propositions

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **1.1** | `product-strategist` | GTM strategy, product positioning | Product positioning doc, competitive analysis |
| **1.2** | `pricing-engineer` | Pricing page structure, calculator logic | Interactive pricing calculator, comparison tables |
| **1.3** | `program-packaging-designer` | Productize Mentors/Language/Buddy/Upskilling | Program one-pagers, value prop statements |
| **1.4** | `beneficiary-market-mapper` | Define 20+ beneficiary group verticals | Beneficiary taxonomy, targeting guide |
| **1.5** | `value-prop-writer` | Messaging for each product page | Copy for all product pages, taglines, CTAs |
| **1.6** | `case-study-framework-builder` | Templates for future customer stories | Case study template, impact story framework |

**Phase 1 Output**: Product positioning document, messaging guide, program one-pagers

---

### Team 2: Website Engineering & UX (Agents 7–14)
**Lead**: website-architect-lead
**Mission**: Build public-facing marketing website (Astro 5)

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **2.1** | `website-architect` | Site structure, navigation, routing | Site map, page hierarchy, routing config |
| **2.2** | `landing-page-designer` | Home page hero, CTAs, conversion flows | Home page (Astro), hero components |
| **2.3** | `product-page-builder` | Pages: Mentors, Language, Buddy, Platform | 4 product pages with features, screenshots |
| **2.4** | `pricing-page-builder` | Pricing grid, feature comparison, L2I bundles | Pricing page with interactive calculator |
| **2.5** | `seo-optimizer` | Meta tags, schema.org, sitemap.xml | SEO metadata, structured data, sitemaps |
| **2.6** | `social-preview-engineer` | OpenGraph images, Twitter cards | Social share previews, OG images |
| **2.7** | `performance-optimizer` | Static generation, caching, CDN config | Lighthouse score >95, Core Web Vitals |
| **2.8** | `i18n-localizer` | Multi-locale support (EN/NO/DE/AR/UK) | i18n infrastructure, translation keys |

**Phase 2 Output**: Public website (`apps/public-website/`) with home, pricing, 4 product pages

---

### Team 3: Sales System & CRM (Agents 15–19)
**Lead**: sales-system-lead
**Mission**: Build lead capture, CRM integration, proposal/quote generation

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **3.1** | `lead-capture-engineer` | Forms (demo request, contact sales, trial signup) | Lead capture forms, validation, tracking |
| **3.2** | `crm-integrator` | Export leads to CSV/webhook/HubSpot API | CRM webhook integration, lead export |
| **3.3** | `proposal-template-creator` | PDF proposal templates with branding | Proposal generator (PDF), template library |
| **3.4** | `quote-generator-builder` | Auto-generate pricing quotes based on selections | Quote calculator, PDF quote generator |
| **3.5** | `sales-dashboard-designer` | Internal TEEI sales dashboard (leads, pipeline) | Sales admin dashboard in cockpit |

**Phase 3 Output**: Lead forms, CRM integration, proposal/quote generators, sales dashboard

---

### Team 4: Marketing Automation (Agents 20–24)
**Lead**: marketing-automation-lead
**Mission**: Email sequences, nurturing flows, product announcements

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **4.1** | `automation-architect` | Email sequence design, triggers, timing | Email automation flows (welcome, nurture, renewal) |
| **4.2** | `email-copywriter` | Write emails: welcome, lead nurture, onboarding | 12+ email templates with copy |
| **4.3** | `impact-announcement-writer` | Automated impact story emails (from Q2Q) | Impact story email template, AI integration |
| **4.4** | `webhook-integration-engineer` | Connect forms → CRM → email automation | Webhook plumbing, event triggers |
| **4.5** | `newsletter-engineer` | Monthly CSR newsletter template | Newsletter template, send scheduling |

**Phase 4 Output**: Email automation service, 12+ email templates, webhook integrations

---

### Team 5: Demo Sandbox (Agents 25–27)
**Lead**: demo-sandbox-lead
**Mission**: Prospect-facing demo environment with synthetic data

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **5.1** | `demo-data-generator` | Synthetic VIS/SROI/Q2Q data for 3 demo companies | Demo data scripts, 3 demo companies |
| **5.2** | `demo-environment-builder` | Sandbox CSR Portal (read-only, pre-populated) | Demo environment config, access controls |
| **5.3** | `demo-scenario-writer` | Sales scripts, walkthrough guides, use cases | Demo playbook, sales scripts, guided tours |

**Phase 5 Output**: Demo sandbox at `demo.teei.org` with 3 pre-populated companies, sales playbook

---

### Team 6: Documentation & Launch QA (Agents 28–30)
**Lead**: docs-launch-lead
**Mission**: Public API docs, launch readiness, final QA

| Agent ID | Agent Name | Primary Responsibility | Key Deliverables |
|----------|-----------|------------------------|------------------|
| **6.1** | `public-api-doc-writer` | Developer portal (OpenAPI → docs) | Public API docs portal, authentication guide |
| **6.2** | `marketing-doc-writer` | Product docs, sales playbooks, messaging guide | Product tier guide, sales playbook, FAQs |
| **6.3** | `final-launch-reviewer` | Readiness checklist, smoke tests, launch plan | Launch readiness report, go-live checklist |

**Phase 6 Output**: Public API documentation, sales playbooks, launch readiness report

---

## Detailed Task Breakdown (30 Agents)

### TEAM 1: Product Strategy & Positioning

#### Agent 1.1: `product-strategist`
**Objective**: Define GTM strategy and product positioning
**Dependencies**: None (foundational)
**Success Criteria**:
- Product positioning document (Mentors, Language, Buddy, Upskilling, Platform)
- Competitive analysis (vs. Benevity, YourCause, Goodera)
- Target personas (CSR Directors, HR VPs, Sustainability Officers)
- Value proposition framework

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/product-positioning.md`
- `/docs/swarm10/competitive-analysis.md`
- `/docs/swarm10/target-personas.md`

---

#### Agent 1.2: `pricing-engineer`
**Objective**: Build interactive pricing calculator and comparison tables
**Dependencies**: Agent 1.1 (product positioning)
**Success Criteria**:
- Pricing calculator (seats, storage, connectors → quote)
- Feature comparison matrix (Essentials vs Professional vs Enterprise)
- L2I bundle selector with impact preview

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/components/pricing/PricingCalculator.tsx`
- `apps/public-website/src/components/pricing/ComparisonTable.tsx`
- `apps/public-website/src/pages/pricing.astro`

---

#### Agent 1.3: `program-packaging-designer`
**Objective**: Productize programs (Mentors, Language, Buddy, Upskilling)
**Dependencies**: Agent 1.1 (product positioning)
**Success Criteria**:
- Program one-pagers (features, benefits, outcomes, pricing)
- Impact metrics for each program (SROI, VIS, engagement)
- Integration requirements (connectors, data flows)

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/programs/mentors-for-refugees.md`
- `/docs/swarm10/programs/language-for-refugees.md`
- `/docs/swarm10/programs/buddy-integration.md`
- `/docs/swarm10/programs/upskilling-kintell.md`

---

#### Agent 1.4: `beneficiary-market-mapper`
**Objective**: Define 20+ beneficiary group verticals
**Dependencies**: Agent 1.3 (program packaging)
**Success Criteria**:
- Beneficiary taxonomy (refugees, migrants, women, veterans, etc.)
- Targeting guide (which programs serve which groups)
- Market sizing (addressable beneficiaries per vertical)

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/beneficiary-taxonomy.md`
- `/docs/swarm10/market-targeting-guide.md`

---

#### Agent 1.5: `value-prop-writer`
**Objective**: Write messaging for all product pages
**Dependencies**: Agents 1.1, 1.3 (positioning, program packaging)
**Success Criteria**:
- Hero copy for home page
- Product page copy (Mentors, Language, Buddy, Upskilling, Platform)
- CTAs (demo request, trial signup, contact sales)
- Taglines and benefit statements

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/messaging-guide.md`
- `/apps/public-website/src/content/copy.json`

---

#### Agent 1.6: `case-study-framework-builder`
**Objective**: Create templates for future customer case studies
**Dependencies**: Agent 1.1 (product positioning)
**Success Criteria**:
- Case study template (challenge, solution, results, metrics)
- Impact story framework (learner stories, SROI, VIS)
- Interview guide for customers

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/case-study-template.md`
- `/docs/swarm10/impact-story-framework.md`

---

### TEAM 2: Website Engineering & UX

#### Agent 2.1: `website-architect`
**Objective**: Design site structure and navigation
**Dependencies**: Agent 1.1 (product positioning), Agent 1.5 (messaging)
**Success Criteria**:
- Site map (pages, hierarchy, routing)
- Navigation structure (header, footer, mega menu)
- URL structure (/pricing, /products/mentors, /demo, etc.)
- Astro 5 project scaffold

**Tools**: Read, Write, Bash
**Deliverables**:
- `apps/public-website/` (new Astro 5 app)
- `apps/public-website/astro.config.mjs`
- `apps/public-website/src/pages/` (routing structure)
- `/docs/swarm10/site-map.md`

---

#### Agent 2.2: `landing-page-designer`
**Objective**: Build home page with hero, CTAs, conversion flows
**Dependencies**: Agent 2.1 (site structure), Agent 1.5 (copy)
**Success Criteria**:
- Hero section (headline, subhead, CTA, screenshot/video)
- Social proof (logos, testimonials, metrics)
- Feature highlights (3-5 key benefits)
- CTA sections (demo request, trial signup)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/pages/index.astro`
- `apps/public-website/src/components/Hero.astro`
- `apps/public-website/src/components/SocialProof.astro`

---

#### Agent 2.3: `product-page-builder`
**Objective**: Build 4 product pages (Mentors, Language, Buddy, Platform)
**Dependencies**: Agent 1.3 (program packaging), Agent 1.5 (copy)
**Success Criteria**:
- 4 product pages with features, screenshots, testimonials
- Impact metrics (SROI, VIS, learners served)
- Integration callouts (connectors, APIs)
- CTAs (request demo, start trial)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/pages/products/mentors.astro`
- `apps/public-website/src/pages/products/language.astro`
- `apps/public-website/src/pages/products/buddy.astro`
- `apps/public-website/src/pages/products/platform.astro`

---

#### Agent 2.4: `pricing-page-builder`
**Objective**: Build pricing page with calculator and L2I bundles
**Dependencies**: Agent 1.2 (pricing calculator)
**Success Criteria**:
- Pricing grid (Essentials, Professional, Enterprise)
- Feature comparison table
- L2I bundle cards (Impact Starter → Launcher)
- Interactive calculator (seats → quote)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/pages/pricing.astro`
- `apps/public-website/src/components/pricing/` (calculator, tables)

---

#### Agent 2.5: `seo-optimizer`
**Objective**: SEO infrastructure (meta tags, schema.org, sitemaps)
**Dependencies**: Agent 2.1 (site structure)
**Success Criteria**:
- Meta tags (title, description) for all pages
- Schema.org structured data (Product, Organization, FAQPage)
- Sitemap.xml generation
- robots.txt

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/components/SEOHead.astro`
- `apps/public-website/src/pages/sitemap.xml.ts`
- `apps/public-website/public/robots.txt`

---

#### Agent 2.6: `social-preview-engineer`
**Objective**: OpenGraph images, Twitter cards, social share previews
**Dependencies**: Agent 2.1 (site structure)
**Success Criteria**:
- OpenGraph meta tags (og:image, og:title, og:description)
- Twitter card meta tags
- Social share images (1200x630) for key pages

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/public/og-images/` (home, pricing, products)
- Social metadata in SEOHead component

---

#### Agent 2.7: `performance-optimizer`
**Objective**: Lighthouse score >95, Core Web Vitals optimization
**Dependencies**: All Team 2 agents (after website built)
**Success Criteria**:
- Lighthouse Performance >95
- LCP <2.5s, FID <100ms, CLS <0.1
- Static generation for all marketing pages
- CDN config (Cloudflare/Vercel)

**Tools**: Read, Edit, Bash
**Deliverables**:
- Astro static generation config
- Performance budget enforcement
- `/docs/swarm10/performance-report.md`

---

#### Agent 2.8: `i18n-localizer`
**Objective**: Multi-locale support (EN/NO/DE/AR/UK)
**Dependencies**: Agent 2.1 (site structure)
**Success Criteria**:
- i18n infrastructure (astro-i18next or similar)
- Translation keys for all UI strings
- Locale routing (/en/, /no/, /de/, /ar/, /uk/)
- Language switcher component

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/i18n/` (locales, translations)
- `apps/public-website/src/components/LanguageSwitcher.astro`

---

### TEAM 3: Sales System & CRM

#### Agent 3.1: `lead-capture-engineer`
**Objective**: Build lead capture forms (demo, contact, trial)
**Dependencies**: Agent 2.1 (site structure)
**Success Criteria**:
- Demo request form (name, email, company, employees, message)
- Contact sales form
- Trial signup form (email, password, company)
- Form validation (Zod schemas)
- Submission tracking (analytics events)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/public-website/src/components/forms/DemoRequestForm.tsx`
- `apps/public-website/src/components/forms/ContactSalesForm.tsx`
- `apps/public-website/src/components/forms/TrialSignupForm.tsx`
- `services/api-gateway/src/routes/leads.ts` (API endpoint)

---

#### Agent 3.2: `crm-integrator`
**Objective**: Export leads to CSV/webhook/HubSpot API
**Dependencies**: Agent 3.1 (lead forms)
**Success Criteria**:
- Webhook integration (POST leads to CRM)
- CSV export for manual upload
- HubSpot API integration (optional)
- Lead deduplication

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/api-gateway/src/lib/crm-integration.ts`
- `/docs/swarm10/crm-integration-guide.md`

---

#### Agent 3.3: `proposal-template-creator`
**Objective**: PDF proposal templates with branding
**Dependencies**: Agent 1.1 (product positioning)
**Success Criteria**:
- Proposal template (cover, executive summary, pricing, next steps)
- Branding (TEEI logo, colors, fonts)
- Dynamic data (company name, pricing tier, selected programs)
- PDF generation (PDFKit or similar)

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/reporting/src/templates/proposal.ts`
- `services/reporting/src/routes/proposals.ts`

---

#### Agent 3.4: `quote-generator-builder`
**Objective**: Auto-generate pricing quotes based on selections
**Dependencies**: Agent 1.2 (pricing calculator)
**Success Criteria**:
- Quote calculator (seats + storage + connectors → total)
- PDF quote generation
- Quote tracking (quote ID, expiration, acceptance)

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/billing/src/routes/quotes.ts`
- `services/billing/src/lib/quote-generator.ts`

---

#### Agent 3.5: `sales-dashboard-designer`
**Objective**: Internal TEEI sales dashboard (leads, pipeline)
**Dependencies**: Agent 3.1 (lead forms), Agent 3.2 (CRM integration)
**Success Criteria**:
- Sales dashboard in corp-cockpit (leads table, pipeline chart)
- Lead statuses (new, contacted, demo scheduled, closed)
- Conversion metrics (lead → trial → paid)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/corp-cockpit-astro/src/pages/admin/sales.astro`
- `apps/corp-cockpit-astro/src/components/sales/LeadsTable.tsx`

---

### TEAM 4: Marketing Automation

#### Agent 4.1: `automation-architect`
**Objective**: Email sequence design, triggers, timing
**Dependencies**: Agent 3.1 (lead forms)
**Success Criteria**:
- Welcome sequence (3 emails: welcome, product tour, demo invite)
- Lead nurturing (5 emails over 2 weeks)
- Onboarding sequence (post-trial signup)
- Renewal reminders (30/15/7 days before expiration)

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/email-sequences.md`
- `services/notifications/src/sequences/` (email sequence configs)

---

#### Agent 4.2: `email-copywriter`
**Objective**: Write emails (welcome, nurture, onboarding, renewal)
**Dependencies**: Agent 4.1 (email sequences)
**Success Criteria**:
- 12+ email templates with subject lines, body, CTAs
- Personalization tags ({{firstName}}, {{companyName}})
- A/B test variants for key emails

**Tools**: Read, Write
**Deliverables**:
- `services/notifications/src/templates/emails/` (12+ .hbs templates)

---

#### Agent 4.3: `impact-announcement-writer`
**Objective**: Automated impact story emails (from Q2Q)
**Dependencies**: Existing Q2Q AI service
**Success Criteria**:
- Impact story email template (learner story, metrics, next steps)
- Integration with Q2Q AI (fetch stories, embed in emails)
- Opt-in/opt-out management

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/notifications/src/templates/emails/impact-story.hbs`
- `services/notifications/src/lib/q2q-integration.ts`

---

#### Agent 4.4: `webhook-integration-engineer`
**Objective**: Connect forms → CRM → email automation
**Dependencies**: Agent 3.1 (forms), Agent 3.2 (CRM), Agent 4.1 (email sequences)
**Success Criteria**:
- Webhook plumbing (form submit → CRM → email trigger)
- Event bus integration (NATS JetStream)
- Retry logic for failed webhooks

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/api-gateway/src/lib/webhook-dispatcher.ts`
- `services/notifications/src/routes/webhooks.ts`

---

#### Agent 4.5: `newsletter-engineer`
**Objective**: Monthly CSR newsletter template
**Dependencies**: Agent 4.2 (email copywriter)
**Success Criteria**:
- Newsletter template (header, feature story, impact metrics, CTA)
- Subscriber management (opt-in, unsubscribe)
- Send scheduling (cron job)

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/notifications/src/templates/emails/newsletter.hbs`
- `services/notifications/src/jobs/newsletter-sender.ts`

---

### TEAM 5: Demo Sandbox

#### Agent 5.1: `demo-data-generator`
**Objective**: Synthetic VIS/SROI/Q2Q data for 3 demo companies
**Dependencies**: Existing demo data generators (services/impact-in/src/demo/)
**Success Criteria**:
- 3 demo companies (Tech Startup, Retail Chain, Financial Services)
- Synthetic enrollments, sessions, buddy matches, volunteer hours
- Realistic VIS/SROI metrics (SROI: 3.5–5.2, VIS: 75–92)
- Q2Q evidence snippets (100+ per company)

**Tools**: Read, Write, Edit
**Deliverables**:
- `services/impact-in/src/demo/companies/` (3 company configs)
- `scripts/demo/seed-sandbox.ts` (seed script)

---

#### Agent 5.2: `demo-environment-builder`
**Objective**: Sandbox CSR Portal (read-only, pre-populated)
**Dependencies**: Agent 5.1 (demo data)
**Success Criteria**:
- Demo subdomain (demo.teei.org or sandbox.teei.org)
- Read-only mode (no create/edit/delete)
- Pre-populated with 3 demo companies
- Login-less access (anonymous user with limited permissions)

**Tools**: Read, Write, Edit, Bash
**Deliverables**:
- `apps/corp-cockpit-astro/src/middleware/demo-mode.ts`
- `/docs/swarm10/demo-environment-setup.md`

---

#### Agent 5.3: `demo-scenario-writer`
**Objective**: Sales scripts, walkthrough guides, use cases
**Dependencies**: Agent 5.1 (demo data), Agent 5.2 (demo environment)
**Success Criteria**:
- 3 demo scenarios (exec reporting, impact tracking, connector setup)
- Sales scripts with talking points
- Guided tour (annotated screenshots)
- FAQ (common objections, feature requests)

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/demo-playbook.md`
- `/docs/swarm10/sales-scripts.md`
- `/docs/swarm10/guided-tour.md`

---

### TEAM 6: Documentation & Launch QA

#### Agent 6.1: `public-api-doc-writer`
**Objective**: Developer portal (OpenAPI → public docs)
**Dependencies**: Existing OpenAPI specs (packages/openapi/)
**Success Criteria**:
- Public API documentation portal
- Authentication guide (API keys, OAuth)
- Endpoint reference (dashboards, metrics, campaigns, reports)
- Code examples (curl, JavaScript, Python)

**Tools**: Read, Write, Edit
**Deliverables**:
- `apps/api-docs/` (new Astro app or Redoc/Stoplight)
- `/docs/swarm10/api-authentication-guide.md`

---

#### Agent 6.2: `marketing-doc-writer`
**Objective**: Product docs, sales playbooks, messaging guide
**Dependencies**: Agents 1.1–1.6 (all Team 1 outputs)
**Success Criteria**:
- Product tier comparison guide
- Sales playbook (qualification, demo, objection handling, close)
- Messaging guide (elevator pitch, benefit statements)
- FAQ (pricing, features, integrations)

**Tools**: Read, Write
**Deliverables**:
- `/docs/swarm10/product-tier-guide.md`
- `/docs/swarm10/sales-playbook.md`
- `/docs/swarm10/messaging-guide.md`

---

#### Agent 6.3: `final-launch-reviewer`
**Objective**: Readiness checklist, smoke tests, launch plan
**Dependencies**: ALL agents (after all deliverables complete)
**Success Criteria**:
- Launch readiness checklist (website, forms, CRM, email, demo, docs)
- Smoke test results (all pages load, forms submit, emails send)
- Go-live plan (DNS cutover, monitoring, rollback plan)
- Post-launch metrics (traffic, conversions, leads)

**Tools**: Read, Write, Bash
**Deliverables**:
- `/docs/swarm10/LAUNCH_READINESS_REPORT.md`
- `/docs/swarm10/go-live-checklist.md`
- `/docs/swarm10/smoke-test-results.md`

---

## Parallel Execution Phases

### Phase 1: Foundation & Strategy (Week 1)
**Agents**: 1.1–1.6, 2.1
**Duration**: 3–5 days
**Parallelization**: All agents run concurrently (no dependencies)
**Output**: Product positioning, messaging, site architecture

**Deliverables**:
- Product positioning doc
- Messaging guide
- Program one-pagers (4)
- Site map & Astro scaffold

---

### Phase 2: Website Build (Week 2)
**Agents**: 2.2–2.8
**Duration**: 5–7 days
**Parallelization**: Agents 2.2–2.6 run concurrently, then 2.7–2.8 (sequential)
**Output**: Public website with home, pricing, 4 product pages

**Deliverables**:
- Home page
- Pricing page
- 4 product pages
- SEO metadata
- Social previews

---

### Phase 3: Sales System (Week 3)
**Agents**: 3.1–3.5
**Duration**: 5–7 days
**Parallelization**: 3.1–3.4 run concurrently, then 3.5 (depends on 3.1+3.2)
**Output**: Lead forms, CRM integration, proposal/quote generators

**Deliverables**:
- Lead capture forms (3)
- CRM webhook integration
- Proposal template
- Quote generator
- Sales dashboard

---

### Phase 4: Marketing Automation (Week 4)
**Agents**: 4.1–4.5
**Duration**: 5–7 days
**Parallelization**: 4.1+4.2 run first, then 4.3–4.5 concurrently
**Output**: Email sequences, automation flows, newsletter

**Deliverables**:
- Email sequences (welcome, nurture, onboarding, renewal)
- 12+ email templates
- Impact story automation
- Newsletter template
- Webhook integration

---

### Phase 5: Demo Sandbox (Week 5)
**Agents**: 5.1–5.3
**Duration**: 3–5 days
**Parallelization**: 5.1 → 5.2 → 5.3 (sequential)
**Output**: Demo environment with 3 companies, sales playbook

**Deliverables**:
- 3 demo companies with data
- Demo sandbox environment
- Sales scripts & guided tour

---

### Phase 6: Documentation & Launch (Week 6)
**Agents**: 6.1–6.3
**Duration**: 3–5 days
**Parallelization**: 6.1+6.2 run concurrently, then 6.3 (final review)
**Output**: API docs, sales playbooks, launch readiness report

**Deliverables**:
- Public API docs portal
- Sales playbook
- Launch readiness report
- Go-live checklist

---

## Technology Stack

### Public Website (`apps/public-website/`)
- **Framework**: Astro 5 (static generation, islands architecture)
- **UI**: React components + Tailwind CSS
- **Routing**: File-based routing (`src/pages/`)
- **SEO**: Built-in Astro SEO support
- **i18n**: astro-i18next or @astrojs/i18n
- **Forms**: React Hook Form + Zod validation
- **Analytics**: Plausible or PostHog (privacy-friendly)

### Sales System
- **Lead Capture**: Astro API routes → PostgreSQL
- **CRM Integration**: Webhook → HubSpot/Pipedrive API
- **Proposals**: PDFKit (reuse existing reporting/src/templates/)
- **Quotes**: Billing service (`services/billing/`)

### Marketing Automation
- **Email Service**: Extend `services/notifications/`
- **Templates**: Handlebars (.hbs)
- **Delivery**: SendGrid or AWS SES
- **Scheduling**: Node-cron or NATS JetStream delayed messages

### Demo Sandbox
- **Data**: Extend `services/impact-in/src/demo/`
- **Environment**: Subdomain routing (demo.teei.org)
- **Access**: Middleware for read-only mode

### API Documentation
- **Portal**: Redoc or Stoplight Elements
- **Specs**: Existing OpenAPI YAML (packages/openapi/)
- **Hosting**: Static site or Astro app

---

## Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Scope creep** (agents add features beyond requirements) | High | Medium | Strict agent task definitions, approval gates |
| **Website performance** (Lighthouse <95) | Medium | Low | Agent 2.7 dedicated to performance, budgets enforced |
| **CRM integration complexity** (multiple CRM vendors) | Medium | Medium | Start with webhook + CSV export, HubSpot API optional |
| **Email deliverability** (spam filters) | High | Medium | Use SendGrid/AWS SES, SPF/DKIM/DMARC setup, warm-up IPs |
| **Demo data realism** (synthetic data looks fake) | Medium | Low | Reuse existing generators, add noise/variance |
| **SEO indexing delay** (Google takes weeks to index) | Low | High | Submit sitemaps early, focus on Core Web Vitals |
| **i18n translation quality** (machine translation errors) | Medium | Medium | Start with EN/NO (native speakers), defer AR/UK if needed |
| **Form spam** (bots submitting lead forms) | Medium | High | reCAPTCHA v3, honeypot fields, rate limiting |

---

## Success Metrics

### Launch Readiness (Week 6)
- [ ] **Website Live**: Public website at teei.org (home, pricing, 4 product pages)
- [ ] **Forms Functional**: Demo request, contact sales, trial signup forms working
- [ ] **CRM Integration**: Leads exported to CSV/webhook
- [ ] **Email Automation**: Welcome sequence sends on trial signup
- [ ] **Demo Sandbox**: 3 demo companies accessible at demo.teei.org
- [ ] **API Docs**: Public API docs portal live
- [ ] **Performance**: Lighthouse Performance >95, LCP <2.5s
- [ ] **SEO**: All pages have meta tags, schema.org markup, sitemap.xml
- [ ] **i18n**: EN + NO locales functional

### Post-Launch (30 days)
- [ ] **Traffic**: 1,000+ unique visitors/month
- [ ] **Leads**: 50+ demo requests
- [ ] **Trials**: 10+ trial signups
- [ ] **Conversions**: 2+ paid subscriptions
- [ ] **Email Engagement**: 40%+ open rate, 10%+ click rate
- [ ] **Demo Usage**: 20+ sandbox sessions

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
- ✅ Form validation tests (valid/invalid inputs)
- ✅ Email template rendering tests (Handlebars compilation)

---

## Dependencies & Constraints

### External Dependencies
- **Domain**: teei.org (DNS configured)
- **Subdomain**: demo.teei.org (for sandbox)
- **Email Service**: SendGrid or AWS SES account
- **Analytics**: Plausible or PostHog account
- **CRM**: Optional HubSpot/Pipedrive account

### Internal Dependencies
- ✅ Pricing structure defined (docs/commercial/)
- ✅ Billing service exists (services/billing/)
- ✅ Demo data generators exist (services/impact-in/src/demo/)
- ✅ OpenAPI specs exist (packages/openapi/)
- ✅ Notification service exists (services/notifications/)

### Constraints
- **No breaking changes** to existing services
- **No PII/secrets** in public website repo
- **GDPR compliance** for lead forms (consent checkboxes)
- **Budget**: Target <$500/mo for email service + analytics

---

## Agent Coordination Rules

1. **Orchestrator-only planning**: No specialist does Tech Lead's orchestration
2. **No implementation overlap**: Clear ownership per agent
3. **Dependencies mapped**: Blocked work escalated early
4. **Test coverage required**: No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory**: Every page, form, email template documented
6. **Least-privilege tools**: Agents use minimum required tools

---

## Communication Protocol

- **Daily**: Lead standup (5 mins via MULTI_AGENT_PLAN.md updates)
- **Commits**: Small, atomic, tested slices (no monolithic PRs)
- **Documentation**: Update `/docs/swarm10/PROGRESS.md` after each milestone
- **Agent Artifacts**: All agents write deliverables to `/docs/swarm10/` or code

---

## Final Checklist

### Pre-Launch
- [ ] All 30 agents completed tasks
- [ ] Website smoke tests pass (all pages load, forms submit)
- [ ] Email sequences tested (send to test accounts)
- [ ] Demo sandbox accessible (3 companies, read-only)
- [ ] API docs published
- [ ] DNS configured (teei.org → public website, demo.teei.org → sandbox)
- [ ] Analytics tracking verified
- [ ] CRM webhook tested
- [ ] SEO metadata validated (Google Search Console)
- [ ] Performance budgets met (Lighthouse >95)

### Post-Launch
- [ ] Monitor traffic (1,000+ visitors target)
- [ ] Track conversions (leads, trials, paid)
- [ ] Monitor email deliverability (bounce rate <5%)
- [ ] Monitor demo sandbox usage
- [ ] Collect feedback (sales team, prospects)
- [ ] Iterate on messaging (A/B test CTAs)

---

## Appendix: File Structure

```
/home/user/TEEI-CSR-Platform/
├── apps/
│   ├── public-website/              # NEW: Public marketing website (Astro 5)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro      # Home page
│   │   │   │   ├── pricing.astro    # Pricing page
│   │   │   │   ├── products/
│   │   │   │   │   ├── mentors.astro
│   │   │   │   │   ├── language.astro
│   │   │   │   │   ├── buddy.astro
│   │   │   │   │   └── platform.astro
│   │   │   │   ├── demo.astro       # Demo request page
│   │   │   │   └── contact.astro    # Contact sales page
│   │   │   ├── components/
│   │   │   │   ├── Hero.astro
│   │   │   │   ├── pricing/
│   │   │   │   │   ├── PricingCalculator.tsx
│   │   │   │   │   └── ComparisonTable.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── DemoRequestForm.tsx
│   │   │   │   │   ├── ContactSalesForm.tsx
│   │   │   │   │   └── TrialSignupForm.tsx
│   │   │   │   └── SEOHead.astro
│   │   │   └── i18n/                # i18n locales
│   │   └── public/
│   │       ├── og-images/           # Social share images
│   │       └── robots.txt
│   ├── api-docs/                    # NEW: Public API documentation portal
│   ├── corp-cockpit-astro/          # EXISTING: Internal dashboard
│   │   └── src/pages/admin/
│   │       └── sales.astro          # NEW: Sales dashboard
│   └── trust-center/                # EXISTING: Compliance portal
├── services/
│   ├── api-gateway/
│   │   └── src/routes/
│   │       ├── leads.ts             # NEW: Lead capture API
│   │       └── demo/                # ENHANCED: Demo mode
│   ├── billing/
│   │   └── src/routes/
│   │       ├── quotes.ts            # NEW: Quote generator
│   │       └── proposals.ts         # NEW: Proposal generator
│   ├── notifications/
│   │   ├── src/
│   │   │   ├── sequences/           # NEW: Email sequences
│   │   │   ├── templates/emails/    # NEW: Email templates
│   │   │   └── jobs/
│   │   │       └── newsletter-sender.ts  # NEW: Newsletter job
│   │   └── ...
│   └── impact-in/
│       └── src/demo/
│           └── companies/           # NEW: 3 demo company configs
├── docs/
│   └── swarm10/                     # NEW: SWARM 10 documentation
│       ├── PRODUCT_LAUNCH_ARCHITECTURE.md  # This document
│       ├── PROGRESS.md
│       ├── product-positioning.md
│       ├── messaging-guide.md
│       ├── sales-playbook.md
│       ├── demo-playbook.md
│       └── LAUNCH_READINESS_REPORT.md
└── scripts/
    └── demo/
        └── seed-sandbox.ts          # NEW: Demo data seeder
```

---

## Next Steps

1. **Review & Approve**: Review this architecture document
2. **Kickoff**: Spawn agents in parallel batches (Phase 1 → Phase 6)
3. **Daily Updates**: Agents update `/docs/swarm10/PROGRESS.md`
4. **Quality Gates**: Enforce Lighthouse >95, unit tests ≥80%, E2E ≥60%
5. **Launch**: Week 6 go-live with smoke tests
6. **Monitor**: Track metrics (traffic, leads, conversions)

---

**END OF ARCHITECTURE DOCUMENT**

*Awaiting approval to proceed with agent spawning.*
