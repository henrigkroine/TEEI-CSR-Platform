# Pilot Scorecard: Initech Ltd

**Template Version**: 1.0
**Report Date**: 2025-11-15
**Prepared by**: Elena Rodriguez, CSM Lead

---

## Tenant Overview

| Field | Value |
|-------|-------|
| **Company Name** | Initech Ltd |
| **Industry** | Financial Services & Insurance |
| **User Count** | 320 (Licensed: 250) |
| **Pilot Start Date** | 2025-09-01 |
| **Pilot End Date** | 2025-11-15 |
| **Pilot Duration** | 11 weeks |
| **Primary Contact** | William Lumbergh (w.lumbergh@initech.com) |
| **CSM Assigned** | Elena Rodriguez |
| **Environment** | Staging (elevated to production Week 6) |

---

## Adoption Metrics

### Activation & Onboarding

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **Activation Rate** | ≥ 70% | 43% | 🔴 | → |
| **FTUE Completion Rate** | ≥ 85% | 52% | 🔴 | ↗ |
| **TTFV (Time to First Value)** | ≤ 48 hours | 127 hours | 🔴 | ↘ |
| **Avg. Time to First Report** | ≤ 72 hours | 156 hours | 🔴 | → |

**Notes**:
- **Critical Adoption Failure**: Only 43% of invited users completed account setup, well below 70% target
- **Root Causes Identified**:
  - Lack of executive sponsorship (no C-level champion identified)
  - Competing rollout with Workday HCM upgrade (user fatigue)
  - Initial deployment to staging environment caused confusion (production promotion delayed until Week 6)
  - Onboarding invites flagged as spam by corporate email filter (discovered Week 4)
- FTUE completion improved slightly (41% → 52%) after email filter fix, but damage to first impressions already done
- TTFV severely impacted by data integration issues and lack of user motivation

### User Engagement

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **WAU (Weekly Active Users)** | ≥ 60% of activated | 31% | 🔴 | ↘ |
| **MAU (Monthly Active Users)** | ≥ 80% of activated | 48% | 🔴 | → |
| **Avg. Session Duration** | ≥ 8 minutes | 4.2 min | 🔴 | ↘ |
| **Repeat Visit Rate (7-day)** | ≥ 40% | 18% | 🔴 | ↘ |

**Engagement Trend Chart** (Text Description):
```
Weekly Active Users (% of activated):
- Week 1-2: 38% WAU (initial curiosity)
- Week 3-4: 29% WAU (drop-off after staging confusion)
- Week 5-6: 24% WAU (continued decline)
- Week 7-8: 32% WAU (temporary bump post-production promotion)
- Week 9-11: 28-31% WAU (stabilized at low level)
Overall trend: Declining engagement, never reached target, plateaued at ~30% WAU
```

---

## Delivery SLA Performance

### Platform Integration Status

| Platform | Status | On-Time Delivery % | Retry Rate | Avg. Latency | SLA Target |
|----------|--------|-------------------|------------|--------------|------------|
| **Benevity** | 🔴 | 84.2% | 12.3% | 892 ms | ≥ 95% @ ≤500ms |
| **Goodera** | N/A | - | - | - | - |
| **Workday** | 🔴 | 78.6% | 18.7% | 1,342 ms | ≥ 95% @ ≤500ms |
| **SAP SuccessFactors** | 🔴 | 81.3% | 14.9% | 1,087 ms | ≥ 95% @ ≤500ms |
| **Impact-In (Outbound)** | 🟡 | 93.8% | 4.2% | 421 ms | ≥ 98% @ ≤300ms |

**Overall SLA Compliance**: 84.5% (Target: ≥ 95%) 🔴

### Delivery Performance Details

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Total Events Delivered** | N/A | 19,234 | - |
| **Failed Deliveries** | ≤ 2% | 8.7% | 🔴 |
| **Events Requiring Retry** | ≤ 5% | 15.1% | 🔴 |
| **Max Retry Attempts Hit** | ≤ 0.5% | 3.8% | 🔴 |
| **Dead Letter Queue Rate** | ≤ 0.1% | 0.94% | 🔴 |

**Latency Distribution**:
```
P50: 687 ms (Target: ≤ 300ms) ❌ Significantly above target
P95: 1,542 ms (Target: ≤ 500ms) ❌ 3x over target
P99: 3,218 ms (Target: ≤ 1000ms) ❌ Critical performance issue
```

**Notes**:
- **Catastrophic Integration Failures Across All Platforms**:
  - **Benevity**: OAuth token refresh logic incompatible with Initech's custom SSO (Okta + SAML). Caused 401 errors, requiring manual token regeneration every 3 hours (discovered Week 2, workaround Week 5, permanent fix Week 8).
  - **Workday**: Firewall rules never properly configured. IT security team required 3-week approval cycle for whitelist changes. Integration functional only from Week 9 onwards.
  - **SAP SuccessFactors**: API version mismatch (Initech using legacy v1.0, platform expects v2.0). Partial compatibility mode enabled Week 7, but 14.9% retry rate persists.
  - **Goodera**: Never integrated—Initech uses Benevity exclusively, Goodera connection attempted in error during setup.
- **P99 Latency Spike**: Database query timeout due to insufficient indexing on Initech's large dataset (320K employee records). Fix deployed Week 9 but damage to SLA already done.
- **Low Event Volume**: Only 19,234 events (vs ACME's 47,832) reflects low user adoption and integration failures.

---

## Engagement Metrics

### Feature Adoption

| Feature | Adoption Rate | Avg. Usage Freq. | Power Users (>5x/week) |
|---------|---------------|------------------|------------------------|
| **Reports Dashboard** | 48% | 1.8x/week | 7% |
| **Evidence Explorer** | 22% | 0.6x/week | 3% |
| **Lineage Drawer** | 14% | 0.3x/week | 1% |
| **PDF Export** | 38% | 1.2x/week | 5% |
| **PPTX Export (Exec Pack)** | 9% | 0.2x/week | 1% |
| **Scheduled Reports** | 6% | 2 active | 6% |
| **Approval Workflow** | 4% | 0.1x/week | 1% |
| **Audit Mode** | 3% | 0.1x/week | 0% |
| **Benchmarking** | 11% | 0.4x/week | 2% |
| **SSO Integration** | 100% | N/A | N/A |

**Feature Adoption Score**: 26% of available features actively used (Target: ≥ 60%) 🔴

### Content Generation & Exports

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Reports Generated/User/Month** | ≥ 4 | 1.4 | 🔴 |
| **PDF Exports Downloaded** | ≥ 2/user/month | 0.9 | 🔴 |
| **PPTX Exec Packs Created** | ≥ 1/user/month | 0.2 | 🔴 |
| **Evidence Items Explored** | ≥ 10/user/month | 2.1 | 🔴 |
| **Avg. Report Customization** | ≥ 30% | 11% | 🔴 |

**Notes**:
- Extremely low engagement across all content metrics
- Users treating platform as "check-the-box compliance tool" rather than active reporting solution
- PDF export usage suggests users generating reports for external auditors only (1x/quarter requirement)
- Virtually zero adoption of advanced features (Exec Pack, Audit Mode, Lineage)
- Scheduled reports (only 2 active) indicates lack of recurring use case

---

## NPS/CSAT Scores

### Quantitative Feedback

| Metric | Target | Actual | Status | Benchmark |
|--------|--------|--------|--------|-----------|
| **Net Promoter Score (NPS)** | ≥ 30 | -12 | 🔴 | Industry avg: 25-35 |
| **Customer Satisfaction (CSAT)** | ≥ 4.0/5.0 | 2.8/5.0 | 🔴 | SaaS avg: 3.8-4.2 |
| **Feature Satisfaction** | ≥ 4.2/5.0 | 2.6/5.0 | 🔴 | - |
| **Support Response Satisfaction** | ≥ 4.5/5.0 | 3.4/5.0 | 🔴 | - |
| **Survey Response Rate** | ≥ 40% | 28% | 🔴 | - |

**NPS Distribution**:
- Promoters (9-10): 14%
- Passives (7-8): 32%
- Detractors (0-6): 54%

### Qualitative Feedback Highlights

**Top Positive Themes** (from user interviews & surveys):
1. **SSO Integration**: "At least we didn't have to create another username/password. Single sign-on worked smoothly once we got logged in." [Limited positive feedback]
2. **Support Team Effort**: "The support team tried hard to fix our issues, even if it took weeks. They were responsive via Slack."
3. **Potential Value**: "If the integrations worked reliably, I could see this being useful. The concept is solid." [Emphasis on "if"]

**Top Pain Points**:
1. **Integration Reliability**: "We spent 8 weeks troubleshooting Benevity and Workday connections. By the time they worked, most users had given up." [21 mentions - #1 complaint]
2. **Lack of Executive Buy-In**: "No one at leadership level is championing this. It feels like another tool we're being forced to use." [14 mentions]
3. **Staging vs Production Confusion**: "Half the team didn't realize we were in staging for the first 6 weeks. When we migrated to production, we lost our data and had to start over." [12 mentions]
4. **Poor Data Quality**: "Reports showed 'No data available' for weeks. When data finally appeared, it was outdated by 2 weeks." [11 mentions]
5. **Feature Overload Without Training**: "There are so many buttons and options, but no one taught us what they do. We stick to the basics because we're afraid of breaking something." [9 mentions]

**Feature Requests** (ranked by frequency):
1. Better onboarding documentation / video tutorials - **PRIORITY: CRITICAL**
2. Simplified UI with fewer options (hide advanced features by default) - **PRIORITY: HIGH**
3. Data quality monitoring / alerts for stale data - **PRIORITY: HIGH**

---

## Incident Summary

### Incident Breakdown

| Severity | Count | MTTR (Avg.) | MTTR Target | Status |
|----------|-------|-------------|-------------|--------|
| **P0 (Critical)** | 3 | 248 min | ≤ 60 min | 🔴 |
| **P1 (High)** | 12 | 18.7 hours | ≤ 4 hours | 🔴 |
| **P2 (Medium)** | 24 | 42 hours | ≤ 24 hours | 🔴 |
| **P3 (Low)** | 31 | 8.2 days | ≤ 5 days | 🔴 |

**Total Incidents**: 70 (Target: ≤ 10 during pilot) 🔴 **CRITICAL**

### Notable Incidents

| Incident ID | Date | Severity | Description | Resolution Time | Postmortem |
|-------------|------|----------|-------------|-----------------|------------|
| INC-1249 | 2025-09-08 | P0 | Benevity OAuth token refresh failure (12hr outage, no data sync) | 4.2 hours | [Completed](link) |
| INC-1263 | 2025-09-21 | P0 | Database connection leak causing 503 errors (6hr outage) | 3.8 hours | [Completed](link) |
| INC-1287 | 2025-10-05 | P0 | Staging-to-production migration data loss (all user customizations lost) | 6.1 hours | [In Progress](link) |
| INC-1305 | 2025-10-14 | P1 | Workday integration blocked by firewall (17-day outage until firewall rules approved) | 408 hours | [Blocked](link) |
| INC-1321 | 2025-10-23 | P1 | SAP API version mismatch causing 100% failure rate (9-day resolution time) | 216 hours | [Completed](link) |

**Postmortem Completion Rate**: 58% (7 of 12 P1s complete; 3 of 3 P0s complete) 🔴

### Reliability Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **System Uptime** | ≥ 99.5% | 97.3% | 🔴 |
| **API Success Rate** | ≥ 99.9% | 94.8% | 🔴 |
| **Data Freshness SLA** | ≥ 95% | 67.2% | 🔴 |
| **Support Ticket Volume** | ≤ 20/month | 87/month | 🔴 |
| **Escalation Rate** | ≤ 10% | 34% | 🔴 |

**Incident Analysis**:
- **7x Incident Target**: 70 incidents vs 10 target represents catastrophic failure
- **Extended P1 Outages**: INC-1305 (17 days) and INC-1321 (9 days) caused by external dependencies (IT security, API version compatibility), but still reflect inadequate pilot planning
- **High Escalation Rate (34%)**: Support team overwhelmed, many issues required engineering escalation
- **Data Freshness Failure**: 67.2% (vs 95% target) means 1 in 3 reports showed stale data—unacceptable for production use

---

## Go/No-Go Recommendation

### Overall Health Score

**Composite Score**: 38/100 🔴 **RED - CRITICAL**

**Category Breakdown**:
- **Adoption**: 6/20 - 🔴 (30%)
- **Delivery SLA**: 8/20 - 🔴 (40%)
- **Engagement**: 5/20 - 🔴 (25%)
- **Satisfaction**: 4/20 - 🔴 (20%)
- **Reliability**: 15/20 - 🟡 (75%) [Note: Post-fixes, reliability improved to yellow]

**Scoring Rubric**:
- **Green (80-100)**: Exceeds targets, ready for GA
- **Yellow (60-79)**: Meets most targets, conditional GO with action plan
- **Red (<60)**: Below targets, NO-GO or extended pilot required ❌

### Key Successes

1. **Support Team Resilience**: Despite 70 incidents and 87 tickets/month, support team maintained 3.4/5.0 satisfaction. Post-mortem discipline remained strong (100% P0 completion).

2. **Technical Recovery**: After catastrophic failures in Weeks 1-6, engineering team stabilized platform by Weeks 9-11. Uptime improved from 94% → 99% in final 2 weeks (too late to recover pilot metrics).

3. **Lessons Learned for Future Pilots**: Initech pilot exposed critical gaps in pilot readiness checklist:
   - Need for executive sponsorship verification
   - Pre-pilot infrastructure readiness assessment (firewall rules, API versions)
   - Staging vs production communication plan
   - Integration compatibility testing before user onboarding

### Key Concerns

1. **Complete Adoption Failure**: 43% activation, 31% WAU, 26% feature adoption, NPS of -12. Users have abandoned the platform. **Root Causes**:
   - No executive champion to drive adoption
   - Integration failures destroyed user trust in first 6 weeks
   - Competing priorities (Workday HCM rollout) depleted change management bandwidth
   - Insufficient pre-pilot training and communication

2. **Integration Architecture Mismatch**: Platform assumptions (standard OAuth, modern APIs) incompatible with Initech's legacy systems:
   - Custom Okta SAML implementation
   - SAP SuccessFactors v1.0 (deprecated, but Initech upgrade blocked by compliance review)
   - Firewall approval process not accounted for (3-week lead time)

3. **Data Quality Catastrophe**: 67.2% data freshness SLA means reports are unreliable. Users explicitly mentioned "No data available" as reason for abandonment. This is **unrecoverable in pilot timeframe**.

4. **Organizational Readiness Gap**: Lack of executive sponsorship, competing rollout, and user fatigue indicate Initech was **not ready for this pilot**. Platform issues were compounded by organizational dysfunction.

### Recommendation

**Decision**: ❌ **NO-GO - RECOMMEND PILOT TERMINATION OR FULL RESET**

**Rationale**:
Initech Ltd pilot has **failed across all five scorecard dimensions**, achieving only 38/100 composite score. This is not a recoverable situation within reasonable timeframes:

**Why NO-GO**:
- **User Trust Destroyed**: NPS of -12 (54% detractors) and 2.8/5.0 CSAT indicate users actively dislike the platform. Recovering from this requires 6+ months of trust-building.
- **Adoption Below Viability Threshold**: 43% activation and 31% WAU mean majority of licensed users are not using the platform. Financial ROI is negative.
- **Technical Debt Accumulated**: 70 incidents, 34% escalation rate, and incomplete postmortems indicate platform is not production-ready for Initech's environment.
- **Integration Architecture Mismatch**: Legacy systems (SAP v1.0, custom SAML) require significant re-architecture work (8-12 week engineering effort).
- **Organizational Dysfunction**: Lack of executive sponsorship means even if platform is fixed, adoption will remain low.

**Why Not Conditional GO**:
- Conditional GO requires achievable action items within 30-90 days
- Initech's issues are structural (executive buy-in, legacy systems, competing priorities) and cannot be fixed by platform improvements alone
- Risk of further damaging brand reputation if we force GA launch

**Options for Path Forward**:

**Option 1: PILOT TERMINATION (RECOMMENDED)**
- **Timeline**: Immediate
- **Actions**:
  - Conduct exit interview with William Lumbergh (Primary Contact) to document lessons learned
  - Provide data export for Initech to retain (goodwill gesture)
  - Offer to revisit in 6-12 months if organizational readiness improves
- **Pros**: Clean exit, preserves relationship, frees up CSM resources
- **Cons**: Loss of pilot investment, negative reference risk

**Option 2: FULL RESET WITH 12-WEEK EXTENSION**
- **Timeline**: Reset pilot start date to Dec 1, 2025 (after Workday rollout completes)
- **Pre-Conditions (ALL must be met)**:
  1. ✅ Executive sponsor identified (VP-level or higher) with committed 10hr/month
  2. ✅ Integration architecture audit completed (2-week assessment: OAuth compatibility, API versions, firewall rules)
  3. ✅ Dedicated Initech project team (3 FTEs: Technical Lead, Change Manager, Data Analyst)
  4. ✅ Staging environment kept separate (no production promotion until Week 8)
  5. ✅ Pre-pilot training program (4-week curriculum: onboarding, feature walkthroughs, use-case workshops)
- **Pros**: Second chance to prove value, higher success probability with prep work
- **Cons**: Significant CSM/engineering investment, no guarantee of success, 12-week delay

**Option 3: DOWNGRADE TO "PROOF-OF-CONCEPT" (POC)**
- **Timeline**: Convert to limited-scope POC (4 weeks, 25 users, read-only mode)
- **Scope**: Focus exclusively on Reports Dashboard + PDF Export (disable advanced features)
- **Goal**: Demonstrate basic value before committing to full pilot
- **Pros**: Lower risk, focused scope, opportunity to rebuild trust incrementally
- **Cons**: Reduced ambition, may not address organizational readiness issues

**Recommended Path**: **Option 1 (Termination)** with offer to revisit in Q2 2026 if:
- Initech completes Workday rollout
- Identifies executive sponsor
- Upgrades SAP SuccessFactors to v2.0 (or migrates to modern HRIS)

**Account Closure Actions**:
- ⚠️ **Week 1**: Exit interview with William Lumbergh + IT leadership
- ⚠️ **Week 2**: Data export package delivered
- ⚠️ **Week 3**: Pilot retrospective with internal team (lessons learned documentation)
- ⚠️ **Week 4**: Relationship hand-off to Account Executive (keep door open for future)

**Key Lessons for Future Pilots**:
1. **Executive Sponsorship is Non-Negotiable**: Require VP-level champion before pilot starts
2. **Integration Readiness Assessment**: 2-week technical audit before user onboarding
3. **Organizational Change Management**: Screen for competing rollouts, user fatigue, change capacity
4. **Staging ≠ Production**: Never blur this line—clear migration plan required
5. **Data Quality Monitoring**: Real-time alerts for data freshness SLA breaches

---

## Appendix

### Data Sources
- Activation & Engagement: Amplitude analytics (Sep 1 - Nov 15, 2025)
- Delivery SLA: Grafana event-bus dashboard + New Relic APM
- NPS/CSAT: SurveyMonkey (2 waves: Week 5, Week 10; low response rate)
- Incidents: Jira incident tracker + PagerDuty alert log

### Review History
| Date | Reviewer | Notes |
|------|----------|-------|
| 2025-09-22 | Elena Rodriguez (CSM) | Week 3 checkpoint - red flags raised, escalated to Launch Lead |
| 2025-10-13 | Elena Rodriguez + Eng Lead | Emergency review - migration disaster, recovery plan initiated |
| 2025-11-01 | Launch Lead + Product VP | Go/No-Go pre-assessment - leaning towards termination |
| 2025-11-15 | Elena Rodriguez + Launch Team | Final assessment - recommend NO-GO |

### Supporting Materials
- [Initech Pilot Kickoff Deck](link)
- [Integration Failure Postmortems (INC-1249, INC-1263, INC-1287, INC-1305, INC-1321)](link)
- [NPS Survey Detailed Results (28% response rate, -12 NPS)](link)
- [Exit Interview Template for William Lumbergh](link)
- [Lessons Learned: Pilot Readiness Checklist v2.0](link)
- [Data Export Package for Initech (prepared but not delivered)](link)

### Risk Register
| Risk ID | Description | Probability | Impact | Mitigation |
|---------|-------------|-------------|---------|------------|
| RISK-101 | Initech becomes negative reference for prospects | HIGH | HIGH | Proactive communication, goodwill data export, exit interview |
| RISK-102 | Internal team morale impact (70 incidents, failed pilot) | MEDIUM | MEDIUM | Retrospective to celebrate learnings, recognition for support team |
| RISK-103 | Over-investment in Option 2 (reset) without success guarantee | MEDIUM | HIGH | Strict pre-conditions, kill-switch at Week 4 of reset |

---

**Document Owner**: Elena Rodriguez, CSM Lead
**Stakeholders**: William Lumbergh (Initech), Launch Lead, Product VP, CTO, CFO (financial impact assessment)
**Distribution**: Internal (Pilot Team + Executive Leadership + Legal)
**Confidentiality**: Highly Confidential - Internal Only
**Decision Authority**: CTO + Product VP (joint approval required for termination)
**Next Steps**: Executive review meeting scheduled for 2025-11-18 (Decision deadline: Nov 22)
