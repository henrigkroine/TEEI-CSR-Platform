# Risk Register - Pilot Week 0

**Document Version**: 1.0
**Created**: 2025-11-15
**Owner**: risk-register-owner
**Next Review**: 2025-11-22

---

## Risk Register Overview

### Purpose
This risk register tracks all identified risks during the pilot execution phase. It serves as a living document to:
- Proactively identify potential issues before they impact the pilot
- Track mitigation strategies and their effectiveness
- Assign clear ownership for risk management
- Enable data-driven decision making during weekly reviews

### Update Frequency
- **Weekly reviews**: Every Friday at EOD
- **Ad-hoc updates**: When new risks emerge or status changes
- **Escalation**: High-priority risks (score ≥ 15) escalated immediately to pilot-execution-lead

### Risk Scoring Methodology
- **Likelihood** (1-5): 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
- **Impact** (1-5): 1=Minimal, 2=Minor, 3=Moderate, 4=Major, 5=Critical
- **Risk Score** = Likelihood × Impact
- **Priority Thresholds**:
  - **Critical** (20-25): Immediate action required
  - **High** (12-19): Prioritize mitigation
  - **Medium** (6-11): Monitor closely
  - **Low** (1-5): Accept or monitor

---

## Risk Inventory

### ONBOARDING RISKS

#### RISK-001: SSO/SCIM Integration Failure
- **Category**: Onboarding
- **Description**: Azure AD SAML/OIDC handshake fails or SCIM provisioning breaks, preventing pilot users from accessing the platform. Root causes could include certificate expiration, metadata misconfiguration, or network/firewall blocks.
- **Likelihood**: 3 (Possible)
- **Impact**: 5 (Critical - blocks all user access)
- **Score**: 15
- **Mitigation**:
  - Pre-flight SSO testing with pilot client 48h before go-live
  - Documented fallback to manual user provisioning
  - SSO health check endpoint monitored every 5 minutes
  - Certificate expiration alerts set 30 days in advance
  - sso-ui-engineer on standby during launch window
- **Owner**: identity-lead
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-002: DPIA Approval Delays
- **Category**: Onboarding
- **Description**: Data Protection Impact Assessment (DPIA) review delayed by legal/compliance teams, blocking pilot launch. Particularly risky if pilot processes sensitive personal data or crosses borders.
- **Likelihood**: 3 (Possible)
- **Impact**: 4 (Major - delays pilot start date)
- **Score**: 12
- **Mitigation**:
  - DPIA submitted 2 weeks before pilot start (already complete)
  - Weekly check-ins with compliance team
  - Pre-approved DPIA template reduces review time
  - Escalation path to CISO if delayed beyond 1 week
  - consent-ui-dev ensures UI reflects DPIA requirements
- **Owner**: compliance-guardian
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-003: Whitelabel Configuration Errors
- **Category**: Onboarding
- **Description**: Pilot client's brand assets (logo, colors, fonts) fail validation or render incorrectly, causing poor first impressions. WCAG contrast failures or oversized assets could break UI.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 3 (Moderate - damages brand perception)
- **Score**: 6
- **Mitigation**:
  - whitelabel-validator runs automated checks on all assets
  - Pre-launch review session with pilot client marketing team
  - Fallback to default TEEI theme if assets fail validation
  - Theme preview environment for client approval before go-live
- **Owner**: whitelabel-validator
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-004: Azure AD Provisioning Lag
- **Category**: Onboarding
- **Description**: SCIM sync delays cause new pilot users to wait hours/days for access after being added to Azure AD group. Could stem from webhook delivery failures or rate limiting.
- **Likelihood**: 3 (Possible)
- **Impact**: 3 (Moderate - frustrates early adopters)
- **Score**: 9
- **Mitigation**:
  - SCIM webhook retry logic with exponential backoff
  - Manual user sync button in admin UI for emergencies
  - scim-ui-engineer monitors provisioning queue during Week 1
  - Slack alert when provisioning lag exceeds 15 minutes
  - Test SCIM sync with 5 users 24h before pilot launch
- **Owner**: scim-ui-engineer
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### ADOPTION RISKS

#### RISK-005: Low Activation Rate (<30%)
- **Category**: Adoption
- **Description**: Fewer than 30% of provisioned pilot users log in during Week 1, indicating poor communication or lack of perceived value. Could signal training gaps or unclear value proposition.
- **Likelihood**: 4 (Likely)
- **Impact**: 4 (Major - threatens pilot success metrics)
- **Score**: 16
- **Mitigation**:
  - Pre-pilot email campaign explaining benefits and login steps
  - Live onboarding webinar scheduled for Day 1
  - Slack/Teams channel for pilot users to ask questions
  - Activation nudge emails at Day 2, Day 4 if no login detected
  - activation-tracker monitors daily and escalates if <20% by Day 3
  - Executive sponsor sends personal invite email
- **Owner**: activation-tracker
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-006: Poor Time-To-First-Value (TTFV > 10 min)
- **Category**: Adoption
- **Description**: Users spend >10 minutes navigating before seeing meaningful impact data, leading to abandonment. Complex UI or missing onboarding flow could be culprits.
- **Likelihood**: 3 (Possible)
- **Impact**: 3 (Moderate - reduces engagement)
- **Score**: 9
- **Mitigation**:
  - Onboarding checklist widget shows "Quick Wins" (e.g., view top SDG, export sample report)
  - ttfv-tracker uses OTel spans to measure actual time-to-value
  - Interactive tutorial overlay for first-time users
  - Pre-populated demo data visible immediately after login
  - Session recordings (with consent) to identify friction points
- **Owner**: ttfv-tracker
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-007: Inadequate User Training
- **Category**: Adoption
- **Description**: Pilot users lack understanding of key features (approvals workflow, narrative controls, export packs), leading to support tickets and poor feature adoption.
- **Likelihood**: 3 (Possible)
- **Impact**: 3 (Moderate - increases support burden)
- **Score**: 9
- **Mitigation**:
  - Video tutorials embedded in UI (max 2 min each)
  - "Getting Started" PDF sent 2 days before pilot
  - Live office hours: Tuesdays & Thursdays, Week 1-2
  - In-app tooltips on advanced features (narrative controls, audit mode)
  - FAQ chatbot seeded with common questions
  - docs-scribe maintains updated knowledge base
- **Owner**: docs-scribe
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-008: Stakeholder Resistance to AI Narratives
- **Category**: Adoption
- **Description**: Executive users distrust AI-generated narrative insights, preferring raw data. Could stem from hallucination concerns or lack of transparency in how narratives are generated.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 4 (Major - undermines core differentiator)
- **Score**: 8
- **Mitigation**:
  - Narrative controls UI clearly shows tone/length settings
  - "View Evidence" button links narrative claims to underlying data
  - Narrative disclaimer: "AI-generated summary, review data below"
  - Option to disable narratives and show raw metrics only
  - narrative-controls-dev adds confidence scores to each claim
  - Pilot feedback session in Week 2 to gather sentiment
- **Owner**: narrative-controls-dev
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### DELIVERY RISKS

#### RISK-009: Impact-In Export Failures
- **Category**: Delivery
- **Description**: Weekly CSV/JSON exports to Impact-In fail due to schema changes, API downtime, or rate limits. Pilot client relies on these exports for downstream systems.
- **Likelihood**: 3 (Possible)
- **Impact**: 5 (Critical - breaks client's primary use case)
- **Score**: 15
- **Mitigation**:
  - export-reliability-tracker validates every export before transmission
  - Retry logic: 3 attempts with exponential backoff
  - Fallback to manual download if API down >1 hour
  - Schema validation tests run pre-export
  - Slack alert to delivery-sla-monitor on first failure
  - Weekly export dry-run on Thursday (before Friday production export)
- **Owner**: export-reliability-tracker
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-010: SLA Breach (Report Generation >30s)
- **Category**: Delivery
- **Description**: Executive pack (PPTX) generation exceeds 30-second SLA during peak usage, causing timeout errors. Large datasets or unoptimized chart rendering could be root causes.
- **Likelihood**: 3 (Possible)
- **Impact**: 4 (Major - poor user experience for key feature)
- **Score**: 12
- **Mitigation**:
  - charts-perf-dev implements data windowing and virtualization
  - Async job queue for PPTX generation (user gets email when ready)
  - Performance budgets enforced in CI: 95th percentile <25s
  - Caching layer for frequently requested reports
  - delivery-sla-monitor tracks p50/p95/p99 latencies daily
  - Load testing with 50 concurrent export requests before pilot
- **Owner**: delivery-sla-monitor
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-011: Data Quality Issues in Reports
- **Category**: Delivery
- **Description**: Exported reports contain stale data, incorrect calculations, or missing lineage IDs, eroding user trust. Could stem from cache invalidation bugs or Q2Q pipeline failures.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 5 (Critical - damages credibility)
- **Score**: 10
- **Mitigation**:
  - Evidence lineage IDs stamped on every data point
  - Automated data freshness checks: flag data >24h old
  - Report watermarking shows generation timestamp
  - Pre-export validation: SROI formula unit tests, VIS score bounds checks
  - User feedback button on reports: "Report an issue"
  - Weekly data quality audit by QA team
- **Owner**: qa-compliance-lead
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### INTEGRATION RISKS

#### RISK-012: Slack/Teams Webhook Delivery Failures
- **Category**: Integration
- **Description**: Notification webhooks to pilot client's Slack/Teams channels fail due to firewall rules, webhook URL changes, or rate limiting. Users miss critical alerts (export ready, approval needed).
- **Likelihood**: 3 (Possible)
- **Impact**: 3 (Moderate - reduces responsiveness)
- **Score**: 9
- **Mitigation**:
  - Webhook health checks every 15 minutes
  - Fallback to email if webhook fails 3 times
  - Retry queue with 1h, 4h, 24h intervals
  - webhook-health-monitor logs all delivery attempts
  - Test webhooks with pilot client IT team 48h before go-live
  - User preference: "Receive notifications via email only"
- **Owner**: webhook-health-monitor
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-013: SMTP Deliverability Issues
- **Category**: Integration
- **Description**: Notification emails land in spam folders or are blocked by pilot client's email gateway. SPF/DKIM/DMARC misconfigurations or reputation issues could be causes.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 4 (Major - critical notifications missed)
- **Score**: 8
- **Mitigation**:
  - SPF, DKIM, DMARC records validated before pilot
  - Warm-up period: send test emails to pilot users 1 week early
  - Email reputation monitoring (Postmark/SendGrid dashboard)
  - "Whitelist this sender" instructions in onboarding docs
  - smtp-monitor tracks bounce rates and spam complaints
  - Backup: SMS alerts for critical events (if budget allows)
- **Owner**: smtp-monitor
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-014: Third-Party API Downtime (Benevity/Goodera)
- **Category**: Integration
- **Description**: External CSR platforms (Benevity, Goodera) experience outages, blocking data ingestion. Pilot client expects near-real-time updates.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 3 (Moderate - delays data updates)
- **Score**: 6
- **Mitigation**:
  - Polling fallback if webhooks fail (every 15 min)
  - Cached data shown with "Last updated: X mins ago" badge
  - Status page integration: show external API health
  - Retry logic with exponential backoff (up to 24h)
  - incident-ui-dev displays banner: "Benevity sync delayed"
  - Escalation to vendor support if downtime >2h
- **Owner**: incident-ui-dev
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### RELIABILITY RISKS

#### RISK-015: Synthetic Monitoring False Positives
- **Category**: Reliability
- **Description**: Synthetic checks (login, export, SSE stream) report failures when platform is actually healthy, causing alert fatigue and eroding confidence in monitoring.
- **Likelihood**: 3 (Possible)
- **Impact**: 2 (Minor - nuisance, masks real issues)
- **Score**: 6
- **Mitigation**:
  - synthetic-monitor uses canary user accounts, not production
  - Alert threshold: 2 consecutive failures before PagerDuty alert
  - Weekly review of false positive rate (target: <5%)
  - Runbook documentation: "How to validate if alert is real"
  - Monitoring stack health checks to detect monitoring failures
  - Tune synthetic check timeouts based on Week 1 baseline
- **Owner**: synthetic-monitor
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-016: Performance Degradation Under Load
- **Category**: Reliability
- **Description**: Platform slows significantly when >20 concurrent users active, causing poor UX. Database connection pool exhaustion or unoptimized queries could be culprits.
- **Likelihood**: 3 (Possible)
- **Impact**: 4 (Major - blocks scaling beyond pilot)
- **Score**: 12
- **Mitigation**:
  - Load testing completed pre-pilot: 50 concurrent users, 95th percentile <2s
  - Database connection pooling configured (max 100 connections)
  - Query optimization: all N+1 queries eliminated
  - web-vitals-rum tracks real user metrics (CLS, LCP, FID)
  - Auto-scaling rules: add backend instance if CPU >70%
  - Performance budget enforcement in CI
- **Owner**: web-vitals-rum
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-017: SSE Connection Drops
- **Category**: Reliability
- **Description**: Server-Sent Events (SSE) streams for real-time updates disconnect frequently, requiring manual page refreshes. Proxy timeouts or aggressive firewall rules could be causes.
- **Likelihood**: 3 (Possible)
- **Impact**: 3 (Moderate - degrades real-time UX)
- **Score**: 9
- **Mitigation**:
  - sse-resume-specialist implements automatic reconnection with last-event-id
  - Heartbeat messages every 30s to keep connection alive
  - Offline/online banners inform users of connection state
  - Fallback to polling if SSE unsupported (IE11, corporate proxies)
  - Network resilience testing: simulate packet loss, proxy timeouts
  - User education: "Data updates in real-time, refresh if stale"
- **Owner**: sse-resume-specialist
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-018: Database Connection Pool Exhaustion
- **Category**: Reliability
- **Description**: All database connections consumed during peak usage, causing new requests to timeout. Long-running queries or connection leaks could be root causes.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 5 (Critical - platform unavailable)
- **Score**: 10
- **Mitigation**:
  - Connection pool size tuned to handle 2x expected peak load
  - Query timeout enforcement: all queries <5s
  - Connection leak detection in development environment
  - Monitoring: alert if >80% connections in use
  - Emergency response: restart backend pods to clear stale connections
  - Weekly slow query log review to optimize bottlenecks
- **Owner**: perf-a11y-lead
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### CHANGE MANAGEMENT RISKS

#### RISK-019: Freeze Period Violations
- **Category**: Change Management
- **Description**: Emergency hotfix deployed during pilot freeze window without proper approval, introducing regressions or breaking changes.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 4 (Major - destabilizes pilot)
- **Score**: 8
- **Mitigation**:
  - freeze-guardian enforces freeze policy: no deploys Fri 5pm - Mon 9am
  - Exception process: CISO + pilot-execution-lead approval required
  - Pre-approved hotfix playbook for critical security issues
  - Deploy log audit: all changes reviewed in Monday standup
  - Rollback plan tested before pilot launch
  - Change calendar shared with pilot client
- **Owner**: freeze-guardian
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-020: Rollback Failures
- **Category**: Change Management
- **Description**: Attempt to rollback a bad deployment fails due to database migration incompatibility or config drift, prolonging outage.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 5 (Critical - extended downtime)
- **Score**: 10
- **Mitigation**:
  - All database migrations reversible (down scripts tested)
  - Blue-green deployment strategy: keep previous version running
  - Rollback drill completed 1 week before pilot
  - rollback-tester validates rollback path in staging weekly
  - Immutable infrastructure: rollback = redeploy previous container
  - Escalation path: DevOps on-call paged immediately
- **Owner**: rollback-tester
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-021: Configuration Drift Between Environments
- **Category**: Change Management
- **Description**: Production config differs from staging (e.g., feature flags, API keys), causing untested code paths to execute in pilot.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 3 (Moderate - unpredictable behavior)
- **Score**: 6
- **Mitigation**:
  - Infrastructure-as-code: all config in version control
  - Pre-deployment diff: staging vs production config comparison
  - Automated config validation: schema checks, required keys
  - Weekly config audit: drift detection report
  - freeze-guardian reviews config changes during deploy approval
  - Secret rotation tested in staging first
- **Owner**: freeze-guardian
- **Status**: Open
- **Last Updated**: 2025-11-15

---

### COMPLIANCE RISKS

#### RISK-022: GDPR Consent Violations
- **Category**: Compliance
- **Description**: Platform processes personal data without valid consent, or fails to honor withdrawal/DSAR requests within 30-day SLA, triggering regulatory action.
- **Likelihood**: 1 (Rare - mitigations strong)
- **Impact**: 5 (Critical - legal/financial penalties)
- **Score**: 5
- **Mitigation**:
  - consent-ui-dev shows consent status on every user profile
  - DSAR queue viewer for compliance team
  - Automated consent expiration checks (30-day renewal prompt)
  - Data processing logs auditable with evidence IDs
  - compliance-guardian runs weekly GDPR compliance scans
  - Legal team sign-off on DPIA before pilot
  - User data export tool (self-service DSAR)
- **Owner**: compliance-guardian
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-023: Audit Trail Gaps
- **Category**: Compliance
- **Description**: Critical actions (approvals, exports, data deletions) lack audit logs, preventing forensic investigation or compliance proof.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 4 (Major - regulatory risk, trust damage)
- **Score**: 8
- **Mitigation**:
  - audit-mode-dev captures all state changes with timestamps, user IDs
  - Immutable audit log (append-only table, no deletes)
  - Evidence IDs on hover for all data points
  - Weekly audit log completeness check
  - Export audit viewer links approval trail
  - Retention policy: audit logs kept 7 years
  - Third-party audit readiness: logs exportable as CSV
- **Owner**: audit-mode-dev
- **Status**: Open
- **Last Updated**: 2025-11-15

#### RISK-024: Data Retention Policy Violations
- **Category**: Compliance
- **Description**: Personal data retained beyond agreed retention period (e.g., 2 years), violating GDPR minimization principle.
- **Likelihood**: 2 (Unlikely)
- **Impact**: 4 (Major - regulatory penalties)
- **Score**: 8
- **Mitigation**:
  - Automated data expiration: flag records >18 months old
  - Retention notices shown to users 30 days before deletion
  - consent-ui-dev displays retention countdown
  - Weekly retention policy compliance report
  - Soft delete with 30-day grace period before hard delete
  - Legal review of retention policy annually
  - User opt-in for extended retention (explicit consent)
- **Owner**: consent-ui-dev
- **Status**: Open
- **Last Updated**: 2025-11-15

---

## Risk Heatmap

```
IMPACT ↑
   5 │ [001] [009]        │ [022]         │
   4 │ [002] [005] [010]  │ [008] [013]   │ [019]
   3 │ [003] [006] [007]  │ [012] [014]   │
     │    [017]           │    [021]      │
   2 │                    │ [015]         │
   1 │                    │               │
     └────────────────────┴───────────────┴──────────────→ LIKELIHOOD
       1       2       3         4            5

Priority Distribution:
  🔴 Critical (20-25): 0 risks
  🟠 High (12-19):     5 risks [001, 002, 005, 009, 010]
  🟡 Medium (6-11):    14 risks
  🟢 Low (1-5):        5 risks [022, 003, 014, 015, 021]
```

### Risk Heatmap Legend
- **Red Zone (Top-Right)**: Critical/High Priority - Immediate action required
- **Yellow Zone (Center)**: Medium Priority - Active mitigation in progress
- **Green Zone (Bottom-Left)**: Low Priority - Monitor and accept

---

## Top 5 High-Priority Risks

| Rank | Risk ID | Title | Score | Owner |
|------|---------|-------|-------|-------|
| 1 | RISK-005 | Low Activation Rate | 16 | activation-tracker |
| 2 | RISK-001 | SSO/SCIM Integration Failure | 15 | identity-lead |
| 3 | RISK-009 | Impact-In Export Failures | 15 | export-reliability-tracker |
| 4 | RISK-002 | DPIA Approval Delays | 12 | compliance-guardian |
| 5 | RISK-010 | SLA Breach (Report Generation) | 12 | delivery-sla-monitor |

---

## Risk Trend Analysis (Week 0 Baseline)

- **Total Risks Identified**: 24
- **New This Week**: 24 (initial baseline)
- **Closed This Week**: 0
- **Risks Trending Up**: N/A (baseline week)
- **Risks Trending Down**: N/A (baseline week)

**Key Themes**:
1. **Adoption is the biggest risk cluster** (4 risks): Low activation, poor TTFV, training gaps, AI narrative resistance
2. **Integration risks are contained** (4 risks): All have robust fallback mechanisms
3. **Compliance risks are LOW** (3 risks, all score ≤8): Strong GDPR controls already in place
4. **No critical-priority risks** (score 20-25): Good sign for pilot readiness

**Recommendations for Week 1**:
- Focus mitigation efforts on RISK-005 (activation) and RISK-001 (SSO)
- Pre-flight testing for SSO/SCIM 48h before launch (RISK-001, RISK-004)
- Activate email campaign and webinar for adoption (RISK-005, RISK-007)
- Monitor export reliability closely (RISK-009, RISK-010)

---

## Action Items for Next Week

| Action | Owner | Due Date | Related Risks |
|--------|-------|----------|---------------|
| Complete SSO pre-flight testing | identity-lead | 2025-11-17 | RISK-001, RISK-004 |
| Send pilot launch email campaign | activation-tracker | 2025-11-16 | RISK-005 |
| Test PPTX export performance (50 concurrent) | charts-perf-dev | 2025-11-18 | RISK-010 |
| Validate webhook delivery to pilot Slack | webhook-health-monitor | 2025-11-17 | RISK-012 |
| Review audit log completeness | audit-mode-dev | 2025-11-19 | RISK-023 |
| Run rollback drill in staging | rollback-tester | 2025-11-20 | RISK-020 |

---

## Weekly Review Template

**For Next Week's Update** (`risk_register_week_1.md`):
1. Update status for all Open risks
2. Add new risks discovered during pilot
3. Close mitigated risks with evidence
4. Recalculate scores based on actual pilot data
5. Update heatmap and priority distribution
6. Document lessons learned

**Escalation Criteria**:
- Any risk reaches score ≥20
- 3+ high-priority risks (score ≥12) remain Open for >2 weeks
- Pilot success metrics at risk (activation <30%, SLA breaches >5%)

---

**Document Control**
**Approved By**: pilot-execution-lead
**Distribution**: All Phase F leads, compliance-guardian, QA team
**Confidentiality**: Internal Use Only
