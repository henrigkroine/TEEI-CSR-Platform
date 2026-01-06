# SWARM 10: Risk & Dependency Analysis

**Version**: 1.0
**Status**: PLAN MODE
**Created**: 2025-11-22

---

## Dependency Graph

### Level 1: Foundation (No Dependencies)
- **Agent 1.1** (product-strategist): Foundational positioning
- **Existing Systems**: Pricing (docs/commercial/), billing service, demo generators

### Level 2: Strategy Layer (Depends on Level 1)
- **Agents 1.2–1.6**: pricing-engineer, program-packaging-designer, beneficiary-market-mapper, value-prop-writer, case-study-framework-builder
  - **Dependency**: Agent 1.1 (product positioning)
  - **Risk**: If 1.1 delivers weak positioning, all messaging may need rework
  - **Mitigation**: 1.1 delivers in first 2 days for early review

### Level 3: Website Architecture (Depends on Levels 1–2)
- **Agent 2.1** (website-architect): Site structure, Astro scaffold
  - **Dependency**: Agents 1.1 (positioning), 1.5 (messaging)
  - **Risk**: Site structure misaligned with messaging
  - **Mitigation**: 2.1 collaborates with 1.5 on page hierarchy

### Level 4: Website Build (Depends on Level 3)
- **Agents 2.2–2.8**: landing-page-designer, product-page-builder, pricing-page-builder, seo-optimizer, social-preview-engineer, performance-optimizer, i18n-localizer
  - **Dependency**: Agent 2.1 (site scaffold)
  - **Risk**: Astro build failures block all UI work
  - **Mitigation**: 2.1 validates build before releasing to 2.2–2.8

### Level 5: Sales System (Depends on Level 4)
- **Agents 3.1–3.4**: lead-capture-engineer, crm-integrator, proposal-template-creator, quote-generator-builder
  - **Dependency**: Agent 2.1 (forms integrate with website)
  - **Risk**: Form validation complexity delays launch
  - **Mitigation**: Start with simple validation, iterate post-launch

- **Agent 3.5** (sales-dashboard-designer)
  - **Dependency**: Agents 3.1 (leads data), 3.2 (CRM integration)
  - **Risk**: Dashboard incomplete if leads data schema changes
  - **Mitigation**: Lock leads schema early (Zod contract)

### Level 6: Marketing Automation (Depends on Level 5)
- **Agents 4.1–4.2**: automation-architect, email-copywriter
  - **Dependency**: Agent 3.1 (form submission triggers emails)
  - **Risk**: Email deliverability issues (spam filters)
  - **Mitigation**: Use SendGrid/AWS SES with proper SPF/DKIM/DMARC

- **Agents 4.3–4.5**: impact-announcement-writer, webhook-integration-engineer, newsletter-engineer
  - **Dependency**: Agents 4.1 (sequences), 4.2 (templates), 3.2 (webhooks)
  - **Risk**: Webhook failures cause lost leads
  - **Mitigation**: NATS JetStream for reliable delivery + DLQ

### Level 7: Demo Sandbox (Depends on Levels 3–4)
- **Agent 5.1** (demo-data-generator)
  - **Dependency**: Existing demo generators (services/impact-in/src/demo/)
  - **Risk**: Synthetic data looks unrealistic
  - **Mitigation**: Add variance/noise to metrics; review with sales team

- **Agent 5.2** (demo-environment-builder)
  - **Dependency**: Agent 5.1 (demo data)
  - **Risk**: Read-only mode breaks existing cockpit features
  - **Mitigation**: Middleware-based read-only checks (no core changes)

- **Agent 5.3** (demo-scenario-writer)
  - **Dependency**: Agents 5.1 (data), 5.2 (environment)
  - **Risk**: Sales scripts don't resonate with prospects
  - **Mitigation**: Iterate based on early sales calls

### Level 8: Documentation & Launch (Depends on All)
- **Agents 6.1–6.2**: public-api-doc-writer, marketing-doc-writer
  - **Dependency**: Existing OpenAPI specs, Team 1 outputs
  - **Risk**: API docs out of sync with actual endpoints
  - **Mitigation**: Auto-generate docs from OpenAPI specs

- **Agent 6.3** (final-launch-reviewer)
  - **Dependency**: ALL agents (final verification)
  - **Risk**: Incomplete deliverables block launch
  - **Mitigation**: Weekly milestone reviews, early blocker escalation

---

## Risk Register

| Risk ID | Risk Description | Impact | Probability | Mitigation | Owner |
|---------|------------------|--------|-------------|------------|-------|
| **R1** | Scope creep (agents add features beyond requirements) | High | Medium | Strict agent task definitions, approval gates for new features | Orchestrator |
| **R2** | Website performance (Lighthouse <95) | Medium | Low | Agent 2.7 dedicated to performance, budgets enforced | Agent 2.7 |
| **R3** | CRM integration complexity (multiple vendors) | Medium | Medium | Start with webhook + CSV export, HubSpot API optional | Agent 3.2 |
| **R4** | Email deliverability (spam filters) | High | Medium | Use SendGrid/AWS SES, SPF/DKIM/DMARC, warm-up IPs | Agent 4.1 |
| **R5** | Demo data realism (synthetic data looks fake) | Medium | Low | Reuse existing generators, add noise/variance, sales team review | Agent 5.1 |
| **R6** | SEO indexing delay (Google takes weeks to index) | Low | High | Submit sitemaps early, focus on Core Web Vitals, schema.org | Agent 2.5 |
| **R7** | i18n translation quality (machine translation errors) | Medium | Medium | Start with EN/NO (native speakers), defer AR/UK if needed | Agent 2.8 |
| **R8** | Form spam (bots submitting lead forms) | Medium | High | reCAPTCHA v3, honeypot fields, rate limiting | Agent 3.1 |
| **R9** | DNS/SSL setup delays (domain not ready) | High | Low | Verify DNS + SSL early (Week 1), use staging subdomain for testing | Orchestrator |
| **R10** | Agent blockers cascade (one blocked agent delays all) | High | Medium | Daily standup, blocker escalation within 24h, parallel work where possible | Orchestrator |
| **R11** | Email service costs exceed budget | Medium | Low | Monitor send volumes, set budget alerts, negotiate SendGrid/SES rates | Agent 4.1 |
| **R12** | Demo sandbox breaks prod cockpit | High | Low | Separate subdomain (demo.teei.org), read-only middleware, no DB writes | Agent 5.2 |
| **R13** | API docs diverge from actual endpoints | Medium | Medium | Auto-generate from OpenAPI, CI check for spec drift | Agent 6.1 |
| **R14** | Launch delays due to incomplete QA | High | Medium | Phase-gate reviews (Week 2, 4, 6), smoke tests automated | Agent 6.3 |
| **R15** | Security vulnerabilities in lead forms | High | Low | Zod validation, CSRF tokens, rate limiting, security audit | Agent 3.1 |

---

## Dependency Map (Visual)

```
Week 1: Foundation
┌─────────────────────────────────────────────┐
│  1.1 (product-strategist)                   │
│  Delivers: product-positioning.md           │
└─────────────────┬───────────────────────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
    1.2–1.6            2.1
  (Strategy)     (Site Architect)
          │               │
          └───────┬───────┘
                  ▼
Week 2: Website Build
┌─────────────────────────────────────────────┐
│  2.2–2.8 (website pages, SEO, perf, i18n)   │
│  Delivers: public-website app               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
Week 3: Sales System
┌─────────────────────────────────────────────┐
│  3.1–3.5 (forms, CRM, proposals, dashboard) │
│  Delivers: lead capture + sales dashboard   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
Week 4: Marketing Automation
┌─────────────────────────────────────────────┐
│  4.1–4.5 (email sequences, automation)      │
│  Delivers: email automation service         │
└─────────────────┬───────────────────────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
Week 5: Demo        Week 6: Launch
┌──────────────┐  ┌──────────────────────────┐
│ 5.1–5.3      │  │ 6.1–6.3                  │
│ (Demo)       │  │ (Docs + QA)              │
└──────────────┘  └──────────────────────────┘
                           │
                           ▼
                      GO-LIVE
```

---

## Critical Path Analysis

**Longest Path (32 days)**:
```
1.1 (3 days) → 1.5 (2 days) → 2.1 (3 days) → 2.2 (4 days) →
2.7 (3 days) → 3.1 (4 days) → 4.1 (3 days) → 4.2 (3 days) →
5.1 (2 days) → 5.2 (2 days) → 5.3 (2 days) → 6.3 (1 day) = 32 days
```

**Shortest Path (22 days)** (if parallelization perfect):
```
Week 1 (5 days) + Week 2 (5 days) + Week 3 (4 days) +
Week 4 (3 days) + Week 5 (3 days) + Week 6 (2 days) = 22 days
```

**Realistic Estimate**: 28–32 days (4–5 weeks) accounting for:
- Agent handoffs (1 day overhead per phase)
- Review cycles (1 day per phase)
- Buffer for blockers (2 days across all phases)

---

## Resource Constraints

### Human Resources
- **Tech Lead (Orchestrator)**: 10 hrs/week (daily standup, blocker resolution)
- **Sales Team**: 5 hrs/week (review messaging, test demo sandbox)
- **Design Review**: 2 hrs (Week 2: website UX review)

### Infrastructure
- **DNS**: teei.org (existing), demo.teei.org (new subdomain)
- **Hosting**: Vercel or similar (static site hosting <$50/mo)
- **Email Service**: SendGrid Essentials ($20/mo) or AWS SES ($0.10/1K emails)
- **Analytics**: Plausible ($9/mo) or PostHog (free tier)
- **CRM**: Optional HubSpot/Pipedrive (defer if budget constrained)

### Budget
- **Hosting**: $50/mo
- **Email**: $20–50/mo (depends on send volume)
- **Analytics**: $9/mo
- **Domain**: $12/year (teei.org assumed existing)
- **SSL**: Free (Let's Encrypt or Vercel)
- **Total**: ~$100/mo operational cost

---

## Contingency Plans

### If Agent 1.1 Delivers Weak Positioning
- **Fallback**: Use existing docs/commercial/price_cards.md as baseline
- **Impact**: 2 days delay while Team 1 revises
- **Mitigation**: Orchestrator reviews 1.1 output within 24h

### If Website Build Fails (Agents 2.2–2.8)
- **Fallback**: Use simpler static HTML/CSS templates instead of Astro
- **Impact**: 3–5 days delay, lose some performance optimizations
- **Mitigation**: 2.1 validates Astro build on Day 1

### If CRM Integration Blocked (Agent 3.2)
- **Fallback**: Export leads to CSV manually, integrate CRM post-launch
- **Impact**: Manual lead management for first 30 days
- **Mitigation**: Document CSV schema for future automation

### If Email Deliverability Issues (Agent 4.1)
- **Fallback**: Use Mailchimp or ConvertKit for email sequences
- **Impact**: Higher cost ($30–50/mo vs. $20/mo SendGrid)
- **Mitigation**: Test email delivery in Week 4 (before launch)

### If Demo Sandbox Breaks Prod (Agent 5.2)
- **Fallback**: Demo sandbox as separate Astro app (isolated from cockpit)
- **Impact**: 2 days rework to clone cockpit UI
- **Mitigation**: Use middleware for read-only mode (no core changes)

### If Launch Delayed (Agent 6.3 Finds Issues)
- **Fallback**: Phased launch (website only, defer email/demo)
- **Impact**: Reduced initial capabilities, iterate post-launch
- **Mitigation**: Weekly milestone reviews (Weeks 2, 4, 6)

---

## Acceptance Criteria (Quality Gates)

### Week 1: Strategy Approval
- [ ] Product positioning doc approved by Tech Lead
- [ ] Messaging guide approved by sales team
- [ ] Site map approved (≥10 pages mapped)

### Week 2: Website Review
- [ ] Home page renders correctly (hero, CTAs, social proof)
- [ ] Pricing page shows 3 tiers + calculator
- [ ] 4 product pages complete
- [ ] Lighthouse Performance >90 (target >95 by Week 6)

### Week 3: Sales System Validation
- [ ] Demo request form submits successfully
- [ ] Contact sales form submits successfully
- [ ] Trial signup form submits successfully
- [ ] CRM webhook sends lead to test endpoint

### Week 4: Email Automation Test
- [ ] Welcome sequence sends on trial signup
- [ ] Nurture sequence sends on demo request
- [ ] Email templates render correctly (Gmail, Outlook, Apple Mail)
- [ ] Unsubscribe links functional

### Week 5: Demo Sandbox Review
- [ ] Demo sandbox accessible at demo.teei.org
- [ ] 3 demo companies pre-populated
- [ ] Read-only mode enforced (no create/edit/delete)
- [ ] Sales playbook complete

### Week 6: Launch Readiness
- [ ] All pages load (home, pricing, 4 products, demo, contact)
- [ ] All forms submit successfully
- [ ] Email sequences tested end-to-end
- [ ] Demo sandbox functional
- [ ] API docs published
- [ ] Lighthouse Performance >95
- [ ] SEO metadata validated (Google Search Console)

---

## Communication Cadence

### Daily
- **Standup**: 5 min async update in `/docs/swarm10/PROGRESS.md`
- **Format**: Agent ID, task status, blockers, ETA

### Weekly
- **Milestone Review**: End of each week (Weeks 1–6)
- **Format**: Demo deliverables, review quality, approve next phase

### Ad-Hoc
- **Blocker Escalation**: Within 24h of blocker identified
- **Format**: Post to `/docs/swarm10/BLOCKERS.md`, tag orchestrator

---

## Rollback Plan

### If Launch Fails (Critical Bugs)
1. **Revert DNS**: Point teei.org back to placeholder page
2. **Disable Forms**: Return 503 on lead submission endpoints
3. **Pause Emails**: Disable email sequences (stop cron jobs)
4. **Root Cause**: 24h incident review, fix critical bugs
5. **Re-Launch**: After fixes validated in staging

### Rollback SLA
- **DNS Revert**: <15 min (Cloudflare/Route53)
- **Form Disable**: <5 min (feature flag)
- **Email Pause**: <5 min (disable cron jobs)

---

## Success Metrics (Post-Launch)

### 30-Day Targets
- **Traffic**: 1,000+ unique visitors
- **Leads**: 50+ demo requests
- **Trials**: 10+ trial signups
- **Conversions**: 2+ paid subscriptions
- **Email Engagement**: 40%+ open rate, 10%+ click rate
- **Demo Usage**: 20+ sandbox sessions

### 90-Day Targets
- **Traffic**: 5,000+ unique visitors
- **Leads**: 200+ demo requests
- **Trials**: 50+ trial signups
- **Conversions**: 10+ paid subscriptions
- **Revenue**: $10K+ MRR

---

**END OF RISK & DEPENDENCY ANALYSIS**

*Proceed to orchestration after approval.*
