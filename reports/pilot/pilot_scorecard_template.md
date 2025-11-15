# Pilot Scorecard Template

**Template Version**: 1.0
**Last Updated**: 2025-11-15
**Prepared by**: CSM Lead / Launch Team

---

## Tenant Overview

| Field | Value |
|-------|-------|
| **Company Name** | [COMPANY_NAME] |
| **Industry** | [INDUSTRY] |
| **User Count** | [TOTAL_USERS] (Licensed: [LICENSED_USERS]) |
| **Pilot Start Date** | [START_DATE] |
| **Pilot End Date** | [END_DATE] |
| **Pilot Duration** | [DURATION_WEEKS] weeks |
| **Primary Contact** | [CONTACT_NAME] ([CONTACT_EMAIL]) |
| **CSM Assigned** | [CSM_NAME] |
| **Environment** | [PRODUCTION/STAGING] |

---

## Adoption Metrics

### Activation & Onboarding

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **Activation Rate** | ≥ 70% | [ACTUAL]% | [🟢/🟡/🔴] | [↗/→/↘] |
| **FTUE Completion Rate** | ≥ 85% | [ACTUAL]% | [🟢/🟡/🔴] | [↗/→/↘] |
| **TTFV (Time to First Value)** | ≤ 48 hours | [ACTUAL] hours | [🟢/🟡/🔴] | [↗/→/↘] |
| **Avg. Time to First Report** | ≤ 72 hours | [ACTUAL] hours | [🟢/🟡/🔴] | [↗/→/↘] |

**Notes**:
- Activation Rate = % of invited users who completed account setup and first login
- FTUE Completion Rate = % of users who completed the First Time User Experience tutorial
- TTFV = Median time from account activation to first meaningful action (report view, export, or evidence exploration)

### User Engagement

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **WAU (Weekly Active Users)** | ≥ 60% of activated | [ACTUAL]% | [🟢/🟡/🔴] | [↗/→/↘] |
| **MAU (Monthly Active Users)** | ≥ 80% of activated | [ACTUAL]% | [🟢/🟡/🔴] | [↗/→/↘] |
| **Avg. Session Duration** | ≥ 8 minutes | [ACTUAL] min | [🟢/🟡/🔴] | [↗/→/↘] |
| **Repeat Visit Rate (7-day)** | ≥ 40% | [ACTUAL]% | [🟢/🟡/🔴] | [↗/→/↘] |

**Engagement Trend Chart** (Text Description):
```
[Describe weekly engagement trend over pilot period:
- Week 1: XX% WAU
- Week 2: XX% WAU
- Week 3: XX% WAU
- Week 4: XX% WAU
- Overall trend: increasing/stable/declining]
```

---

## Delivery SLA Performance

### Platform Integration Status

| Platform | Status | On-Time Delivery % | Retry Rate | Avg. Latency | SLA Target |
|----------|--------|-------------------|------------|--------------|------------|
| **Benevity** | [🟢/🟡/🔴] | [ACTUAL]% | [ACTUAL]% | [ACTUAL] ms | ≥ 95% @ ≤500ms |
| **Goodera** | [🟢/🟡/🔴] | [ACTUAL]% | [ACTUAL]% | [ACTUAL] ms | ≥ 95% @ ≤500ms |
| **Workday** | [🟢/🟡/🔴] | [ACTUAL]% | [ACTUAL]% | [ACTUAL] ms | ≥ 95% @ ≤500ms |
| **SAP SuccessFactors** | [🟢/🟡/🔴/N/A] | [ACTUAL]% | [ACTUAL]% | [ACTUAL] ms | ≥ 95% @ ≤500ms |
| **Impact-In (Outbound)** | [🟢/🟡/🔴] | [ACTUAL]% | [ACTUAL]% | [ACTUAL] ms | ≥ 98% @ ≤300ms |

**Overall SLA Compliance**: [ACTUAL]% (Target: ≥ 95%)

### Delivery Performance Details

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Total Events Delivered** | N/A | [ACTUAL] | - |
| **Failed Deliveries** | ≤ 2% | [ACTUAL]% | [🟢/🟡/🔴] |
| **Events Requiring Retry** | ≤ 5% | [ACTUAL]% | [🟢/🟡/🔴] |
| **Max Retry Attempts Hit** | ≤ 0.5% | [ACTUAL]% | [🟢/🟡/🔴] |
| **Dead Letter Queue Rate** | ≤ 0.1% | [ACTUAL]% | [🟢/🟡/🔴] |

**Latency Distribution**:
```
P50: [ACTUAL] ms (Target: ≤ 300ms)
P95: [ACTUAL] ms (Target: ≤ 500ms)
P99: [ACTUAL] ms (Target: ≤ 1000ms)
```

**Notes**:
[Any specific delivery issues, platform-specific challenges, or notable patterns]

---

## Engagement Metrics

### Feature Adoption

| Feature | Adoption Rate | Avg. Usage Freq. | Power Users (>5x/week) |
|---------|---------------|------------------|------------------------|
| **Reports Dashboard** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **Evidence Explorer** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **Lineage Drawer** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **PDF Export** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **PPTX Export (Exec Pack)** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **Scheduled Reports** | [ACTUAL]% | [ACTUAL] active | [ACTUAL]% |
| **Approval Workflow** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **Audit Mode** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **Benchmarking** | [ACTUAL]% | [ACTUAL]x/week | [ACTUAL]% |
| **SSO Integration** | [ACTUAL]% | N/A | N/A |

**Feature Adoption Score**: [ACTUAL]% of available features actively used (Target: ≥ 60%)

### Content Generation & Exports

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Reports Generated/User/Month** | ≥ 4 | [ACTUAL] | [🟢/🟡/🔴] |
| **PDF Exports Downloaded** | ≥ 2/user/month | [ACTUAL] | [🟢/🟡/🔴] |
| **PPTX Exec Packs Created** | ≥ 1/user/month | [ACTUAL] | [🟢/🟡/🔴] |
| **Evidence Items Explored** | ≥ 10/user/month | [ACTUAL] | [🟢/🟡/🔴] |
| **Avg. Report Customization** | ≥ 30% | [ACTUAL]% | [🟢/🟡/🔴] |

**Notes**:
[Patterns in report usage, popular export formats, customization preferences]

---

## NPS/CSAT Scores

### Quantitative Feedback

| Metric | Target | Actual | Status | Benchmark |
|--------|--------|--------|--------|-----------|
| **Net Promoter Score (NPS)** | ≥ 30 | [ACTUAL] | [🟢/🟡/🔴] | Industry avg: 25-35 |
| **Customer Satisfaction (CSAT)** | ≥ 4.0/5.0 | [ACTUAL]/5.0 | [🟢/🟡/🔴] | SaaS avg: 3.8-4.2 |
| **Feature Satisfaction** | ≥ 4.2/5.0 | [ACTUAL]/5.0 | [🟢/🟡/🔴] | - |
| **Support Response Satisfaction** | ≥ 4.5/5.0 | [ACTUAL]/5.0 | [🟢/🟡/🔴] | - |
| **Survey Response Rate** | ≥ 40% | [ACTUAL]% | [🟢/🟡/🔴] | - |

**NPS Distribution**:
- Promoters (9-10): [ACTUAL]%
- Passives (7-8): [ACTUAL]%
- Detractors (0-6): [ACTUAL]%

### Qualitative Feedback Highlights

**Top Positive Themes** (from user interviews & surveys):
1. [THEME_1]: "[SAMPLE_QUOTE]"
2. [THEME_2]: "[SAMPLE_QUOTE]"
3. [THEME_3]: "[SAMPLE_QUOTE]"

**Top Pain Points**:
1. [PAIN_POINT_1]: "[SAMPLE_QUOTE]"
2. [PAIN_POINT_2]: "[SAMPLE_QUOTE]"
3. [PAIN_POINT_3]: "[SAMPLE_QUOTE]"

**Feature Requests** (ranked by frequency):
1. [REQUEST_1] - [PRIORITY: HIGH/MED/LOW]
2. [REQUEST_2] - [PRIORITY: HIGH/MED/LOW]
3. [REQUEST_3] - [PRIORITY: HIGH/MED/LOW]

---

## Incident Summary

### Incident Breakdown

| Severity | Count | MTTR (Avg.) | MTTR Target | Status |
|----------|-------|-------------|-------------|--------|
| **P0 (Critical)** | [ACTUAL] | [ACTUAL] min | ≤ 60 min | [🟢/🟡/🔴] |
| **P1 (High)** | [ACTUAL] | [ACTUAL] hours | ≤ 4 hours | [🟢/🟡/🔴] |
| **P2 (Medium)** | [ACTUAL] | [ACTUAL] hours | ≤ 24 hours | [🟢/🟡/🔴] |
| **P3 (Low)** | [ACTUAL] | [ACTUAL] days | ≤ 5 days | [🟢/🟡/🔴] |

**Total Incidents**: [ACTUAL] (Target: ≤ 10 during pilot)

### Notable Incidents

| Incident ID | Date | Severity | Description | Resolution Time | Postmortem |
|-------------|------|----------|-------------|-----------------|------------|
| [INC-XXX] | [DATE] | [P0/P1/P2] | [BRIEF_DESC] | [DURATION] | [LINK/STATUS] |
| [INC-XXX] | [DATE] | [P0/P1/P2] | [BRIEF_DESC] | [DURATION] | [LINK/STATUS] |

**Postmortem Completion Rate**: [ACTUAL]% (Target: 100% for P0/P1)

### Reliability Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **System Uptime** | ≥ 99.5% | [ACTUAL]% | [🟢/🟡/🔴] |
| **API Success Rate** | ≥ 99.9% | [ACTUAL]% | [🟢/🟡/🔴] |
| **Data Freshness SLA** | ≥ 95% | [ACTUAL]% | [🟢/🟡/🔴] |
| **Support Ticket Volume** | ≤ 20/month | [ACTUAL] | [🟢/🟡/🔴] |
| **Escalation Rate** | ≤ 10% | [ACTUAL]% | [🟢/🟡/🔴] |

---

## Go/No-Go Recommendation

### Overall Health Score

**Composite Score**: [SCORE]/100 (🟢 Green | 🟡 Yellow | 🔴 Red)

**Category Breakdown**:
- **Adoption**: [SCORE]/20 - [🟢/🟡/🔴]
- **Delivery SLA**: [SCORE]/20 - [🟢/🟡/🔴]
- **Engagement**: [SCORE]/20 - [🟢/🟡/🔴]
- **Satisfaction**: [SCORE]/20 - [🟢/🟡/🔴]
- **Reliability**: [SCORE]/20 - [🟢/🟡/🔴]

**Scoring Rubric**:
- **Green (80-100)**: Exceeds targets, ready for GA
- **Yellow (60-79)**: Meets most targets, conditional GO with action plan
- **Red (<60)**: Below targets, NO-GO or extended pilot required

### Key Successes

1. **[SUCCESS_1]**: [Description and impact]
2. **[SUCCESS_2]**: [Description and impact]
3. **[SUCCESS_3]**: [Description and impact]

### Key Concerns

1. **[CONCERN_1]**: [Description, impact, and mitigation plan]
2. **[CONCERN_2]**: [Description, impact, and mitigation plan]
3. **[CONCERN_3]**: [Description, impact, and mitigation plan]

### Recommendation

**Decision**: [✅ GO | ⚠️ CONDITIONAL GO | ❌ NO-GO]

**Rationale**:
[Detailed explanation of recommendation based on:
- Quantitative metrics performance vs targets
- Qualitative feedback themes
- Business readiness assessment
- Technical stability evaluation
- User adoption trajectory]

**Conditions for GA Launch** (if Conditional GO):
1. [CONDITION_1]
2. [CONDITION_2]
3. [CONDITION_3]

**Next Steps**:
- [ACTION_1] - Owner: [NAME] - Due: [DATE]
- [ACTION_2] - Owner: [NAME] - Due: [DATE]
- [ACTION_3] - Owner: [NAME] - Due: [DATE]

---

## Appendix

### Data Sources
- Activation & Engagement: Analytics dashboard (Mixpanel/Amplitude)
- Delivery SLA: Event-bus monitoring (Grafana)
- NPS/CSAT: Survey platform (Typeform/Qualtrics)
- Incidents: Incident management system (PagerDuty/Jira)

### Review History
| Date | Reviewer | Notes |
|------|----------|-------|
| [DATE] | [NAME] | Initial scorecard |
| [DATE] | [NAME] | Mid-pilot review |
| [DATE] | [NAME] | Final assessment |

---

**Document Owner**: CSM Lead
**Stakeholders**: Launch Lead, Product VP, CTO, Customer Success Team
**Distribution**: Internal (Pilot Team + Executive Stakeholders)
