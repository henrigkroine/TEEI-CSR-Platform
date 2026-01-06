# Pilot Scorecard: Globex Inc

**Template Version**: 1.0
**Report Date**: 2025-11-15
**Prepared by**: Marcus Johnson, CSM Lead

---

## Tenant Overview

| Field | Value |
|-------|-------|
| **Company Name** | Globex Inc |
| **Industry** | Manufacturing & Logistics |
| **User Count** | 180 (Licensed: 150) |
| **Pilot Start Date** | 2025-09-08 |
| **Pilot End Date** | 2025-11-15 |
| **Pilot Duration** | 10 weeks |
| **Primary Contact** | David Rajesh (d.rajesh@globex.com) |
| **CSM Assigned** | Marcus Johnson |
| **Environment** | Production |

---

## Adoption Metrics

### Activation & Onboarding

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **Activation Rate** | ≥ 70% | 68% | 🟡 | → |
| **FTUE Completion Rate** | ≥ 85% | 79% | 🟡 | ↗ |
| **TTFV (Time to First Value)** | ≤ 48 hours | 56 hours | 🟡 | → |
| **Avg. Time to First Report** | ≤ 72 hours | 84 hours | 🟡 | ↗ |

**Notes**:
- Activation just below target (68% vs 70%) due to delayed onboarding for APAC region (timezone challenges)
- FTUE completion improved from 72% (Week 3) to 79% (Week 10) after adding video tutorials
- TTFV hampered by data integration delays in first 3 weeks (Goodera API authentication issues)

### User Engagement

| Metric | Target | Actual | Status | Trend |
|--------|--------|--------|--------|-------|
| **WAU (Weekly Active Users)** | ≥ 60% of activated | 64% | 🟢 | ↗ |
| **MAU (Monthly Active Users)** | ≥ 80% of activated | 76% | 🟡 | → |
| **Avg. Session Duration** | ≥ 8 minutes | 9.8 min | 🟢 | → |
| **Repeat Visit Rate (7-day)** | ≥ 40% | 38% | 🟡 | ↗ |

**Engagement Trend Chart** (Text Description):
```
Weekly Active Users (% of activated):
- Week 1-2: 48% WAU (slow start, integration issues)
- Week 3-4: 56% WAU (post-fix recovery)
- Week 5-7: 62% WAU (steady climb)
- Week 8-10: 64-66% WAU (plateau just above target)
Overall trend: Improving but slower ramp than expected, stabilizing at 64%
```

---

## Delivery SLA Performance

### Platform Integration Status

| Platform | Status | On-Time Delivery % | Retry Rate | Avg. Latency | SLA Target |
|----------|--------|-------------------|------------|--------------|------------|
| **Benevity** | 🟢 | 96.8% | 2.8% | 387 ms | ≥ 95% @ ≤500ms |
| **Goodera** | 🟡 | 92.4% | 6.2% | 518 ms | ≥ 95% @ ≤500ms |
| **Workday** | 🔴 | 89.1% | 9.7% | 672 ms | ≥ 95% @ ≤500ms |
| **SAP SuccessFactors** | N/A | - | - | - | - |
| **Impact-In (Outbound)** | 🟢 | 98.1% | 1.4% | 267 ms | ≥ 98% @ ≤300ms |

**Overall SLA Compliance**: 93.2% (Target: ≥ 95%) 🟡

### Delivery Performance Details

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Total Events Delivered** | N/A | 28,947 | - |
| **Failed Deliveries** | ≤ 2% | 3.1% | 🟡 |
| **Events Requiring Retry** | ≤ 5% | 6.8% | 🟡 |
| **Max Retry Attempts Hit** | ≤ 0.5% | 1.2% | 🔴 |
| **Dead Letter Queue Rate** | ≤ 0.1% | 0.18% | 🟡 |

**Latency Distribution**:
```
P50: 341 ms (Target: ≤ 300ms) ⚠️ Slightly above target
P95: 623 ms (Target: ≤ 500ms) ⚠️ Above target
P99: 1,247 ms (Target: ≤ 1000ms) ❌ Exceeds threshold
```

**Notes**:
- **Workday Integration Issues**: Firewall rules not configured correctly until Week 4, causing 11% failure rate in Weeks 1-3. Post-fix (Week 5+): improved to 94% but still below 95% target.
- **Goodera Throttling**: API rate limits hit during peak hours (8-10am PT), causing retries. Workaround: staggered batch processing implemented Week 6.
- **P99 Latency Spike**: Attributed to Workday's legacy SOAP API response times (external dependency, not platform issue).

---

## Engagement Metrics

### Feature Adoption

| Feature | Adoption Rate | Avg. Usage Freq. | Power Users (>5x/week) |
|---------|---------------|------------------|------------------------|
| **Reports Dashboard** | 76% | 5.2x/week | 24% |
| **Evidence Explorer** | 58% | 2.1x/week | 11% |
| **Lineage Drawer** | 42% | 1.3x/week | 6% |
| **PDF Export** | 71% | 3.8x/week | 19% |
| **PPTX Export (Exec Pack)** | 34% | 0.9x/week | 5% |
| **Scheduled Reports** | 28% | 6 active | 28% |
| **Approval Workflow** | 19% | 0.7x/week | 8% |
| **Audit Mode** | 12% | 0.4x/week | 3% |
| **Benchmarking** | 49% | 2.2x/week | 14% |
| **SSO Integration** | 100% | N/A | N/A |

**Feature Adoption Score**: 49% of available features actively used (Target: ≥ 60%) 🟡

### Content Generation & Exports

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Reports Generated/User/Month** | ≥ 4 | 3.6 | 🟡 |
| **PDF Exports Downloaded** | ≥ 2/user/month | 2.8 | 🟢 |
| **PPTX Exec Packs Created** | ≥ 1/user/month | 0.7 | 🟡 |
| **Evidence Items Explored** | ≥ 10/user/month | 6.2 | 🟡 |
| **Avg. Report Customization** | ≥ 30% | 24% | 🟡 |

**Notes**:
- Lower report generation tied to slower TTFV and initial data integration delays
- PPTX adoption lagging—users report preference for PDF (cultural/workflow fit issue)
- Evidence exploration below target suggests users treating platform as "reporting tool" rather than "insight discovery platform"
- Scheduled reports have low adoption (28%) but those using it are highly engaged (power user overlap)

---

## NPS/CSAT Scores

### Quantitative Feedback

| Metric | Target | Actual | Status | Benchmark |
|--------|--------|--------|--------|-----------|
| **Net Promoter Score (NPS)** | ≥ 30 | 24 | 🟡 | Industry avg: 25-35 |
| **Customer Satisfaction (CSAT)** | ≥ 4.0/5.0 | 3.9/5.0 | 🟡 | SaaS avg: 3.8-4.2 |
| **Feature Satisfaction** | ≥ 4.2/5.0 | 3.8/5.0 | 🟡 | - |
| **Support Response Satisfaction** | ≥ 4.5/5.0 | 4.3/5.0 | 🟡 | - |
| **Survey Response Rate** | ≥ 40% | 43% | 🟢 | - |

**NPS Distribution**:
- Promoters (9-10): 42%
- Passives (7-8): 40%
- Detractors (0-6): 18%

### Qualitative Feedback Highlights

**Top Positive Themes** (from user interviews & surveys):
1. **PDF Export Quality**: "The PDF reports look professional and are easy to share with external auditors. Layout is clean and data is accurate."
2. **SSO Integration**: "Single sign-on made adoption seamless. No one had to remember another password, which helped with rollout."
3. **Benevity Data Sync**: "Seeing our Benevity volunteer hours auto-populate in reports saved our team hours of manual data entry."

**Top Pain Points**:
1. **Workday Integration Reliability**: "The first month was frustrating—reports kept showing stale data. It's better now, but trust was damaged." [9 mentions]
2. **Steep Learning Curve**: "The platform has lots of features, but it took weeks to understand what each does. More guided walkthroughs would help." [7 mentions]
3. **PPTX Export Not Meeting Needs**: "We tried the PowerPoint export, but it doesn't match our corporate template. Easier to just export PDFs and copy-paste." [6 mentions]

**Feature Requests** (ranked by frequency):
1. Custom report templates (align with corporate branding) - **PRIORITY: HIGH**
2. Slack/Teams notifications for report completion - **PRIORITY: MEDIUM**
3. Bulk user provisioning via CSV upload - **PRIORITY: LOW**

---

## Incident Summary

### Incident Breakdown

| Severity | Count | MTTR (Avg.) | MTTR Target | Status |
|----------|-------|-------------|-------------|--------|
| **P0 (Critical)** | 1 | 87 min | ≤ 60 min | 🔴 |
| **P1 (High)** | 4 | 5.2 hours | ≤ 4 hours | 🟡 |
| **P2 (Medium)** | 7 | 18 hours | ≤ 24 hours | 🟢 |
| **P3 (Low)** | 11 | 3.8 days | ≤ 5 days | 🟢 |

**Total Incidents**: 23 (Target: ≤ 10 during pilot) 🔴

### Notable Incidents

| Incident ID | Date | Severity | Description | Resolution Time | Postmortem |
|-------------|------|----------|-------------|-----------------|------------|
| INC-1256 | 2025-09-14 | P0 | Workday integration down (firewall misconfiguration, 2hr outage) | 87 min | [Completed](link) |
| INC-1271 | 2025-09-22 | P1 | Goodera webhook authentication failure (8hr data lag) | 7.8 hours | [Completed](link) |
| INC-1298 | 2025-10-09 | P1 | Database connection pool exhaustion (500 errors for 3 hours) | 4.1 hours | [Completed](link) |
| INC-1334 | 2025-10-28 | P1 | SSE message backlog causing 20min delay in real-time updates | 5.6 hours | [In Progress](link) |

**Postmortem Completion Rate**: 75% (3 of 4 P1s complete; P0 complete) 🟡

### Reliability Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **System Uptime** | ≥ 99.5% | 99.2% | 🟡 |
| **API Success Rate** | ≥ 99.9% | 99.3% | 🟡 |
| **Data Freshness SLA** | ≥ 95% | 91.7% | 🟡 |
| **Support Ticket Volume** | ≤ 20/month | 28/month | 🔴 |
| **Escalation Rate** | ≤ 10% | 14% | 🔴 |

---

## Go/No-Go Recommendation

### Overall Health Score

**Composite Score**: 68/100 🟡 **YELLOW**

**Category Breakdown**:
- **Adoption**: 13/20 - 🟡 (65%)
- **Delivery SLA**: 12/20 - 🟡 (60%)
- **Engagement**: 12/20 - 🟡 (60%)
- **Satisfaction**: 14/20 - 🟡 (70%)
- **Reliability**: 17/20 - 🟡 (85%)

**Scoring Rubric**:
- **Green (80-100)**: Exceeds targets, ready for GA
- **Yellow (60-79)**: Meets most targets, conditional GO with action plan ⚠️
- **Red (<60)**: Below targets, NO-GO or extended pilot required

### Key Successes

1. **Recovery Trajectory**: After initial integration challenges (Weeks 1-4), metrics improved significantly. WAU climbed from 48% → 64%, and SLA compliance improved from 87% → 94% post-fixes.

2. **Support Responsiveness**: Despite 23 incidents, support team maintained 99.2% uptime and resolved 75% of incidents within SLA targets. Customer appreciated communication during outages.

3. **Core Feature Adoption**: Reports Dashboard (76%), PDF Export (71%), and SSO (100%) show strong adoption of essential workflows, proving baseline value delivery.

### Key Concerns

1. **Workday Integration Reliability**: 89.1% on-time delivery and P99 latency of 1,247ms remain below SLA targets despite fixes. **Root Cause**: Legacy SOAP API limitations (external dependency). **Mitigation**:
   - Implement aggressive caching layer (reduce API calls by 40%)
   - Add fallback to REST API where available (Workday REST coverage: ~60% of needed endpoints)
   - Target: Achieve ≥94% SLA within 4 weeks post-GA

2. **Incident Volume**: 23 incidents (2.3x target of 10) and 14% escalation rate indicate platform stress under production load. **Mitigation**:
   - Database connection pool tuning (completed Week 9)
   - SSE backlog monitoring + auto-scaling (scheduled for GA Week 1)
   - Proactive monitoring alerts for Goodera/Workday API health (GA Week 2)

3. **Advanced Feature Discovery**: Low adoption of Exec Pack (34%), Lineage Drawer (42%), and Approval Workflow (19%) suggests onboarding/training gaps. **Mitigation**:
   - Deploy interactive product tours (Appcues/Pendo integration, GA Week 1)
   - Weekly "Feature Friday" webinars for first 8 weeks post-GA
   - Assign dedicated CSM for first 90 days

### Recommendation

**Decision**: ⚠️ **CONDITIONAL GO - PROCEED WITH ACTION PLAN**

**Rationale**:
Globex Inc demonstrates **adequate pilot performance** with a composite score of 68/100, landing in the "Yellow" zone. While the pilot did not achieve the green threshold (80+), key indicators suggest the platform can succeed at scale with targeted improvements:

**Why GO**:
- Core functionality (reporting, PDF export, SSO) adopted and valued
- Recovery trajectory shows resilience after early integration challenges
- NPS of 24 is at lower end of industry benchmark but not alarming
- User feedback indicates fixable pain points (training, Workday API, templates)
- Support team proved capable of managing incidents effectively

**Why NOT GO without Conditions**:
- Workday SLA performance (89.1%) materially below target (95%)
- Incident volume (23 vs 10 target) indicates need for stability hardening
- Feature adoption score (49%) suggests users not extracting full platform value
- Escalation rate (14%) above tolerance (10%)

**Conditions for GA Launch**:

1. **BLOCKER - Must Complete Before GA** (Target: Week 1 Post-Pilot):
   - ✅ Deploy Workday caching layer + REST API fallback (Engineering commitment: 5 days)
   - ✅ Complete SSE backlog monitoring + auto-scaling (Engineering commitment: 3 days)
   - ✅ Finish outstanding P1 postmortem (INC-1334)

2. **COMMIT - Must Achieve Within 30 Days of GA**:
   - 🎯 Workday SLA ≥94% for 2 consecutive weeks
   - 🎯 Incident volume ≤4/month (50% reduction)
   - 🎯 Escalation rate ≤10%
   - 🎯 Feature adoption score ≥55% (via product tours + webinars)

3. **MONITOR - Track Closely for 90 Days**:
   - 📊 Weekly SLA reviews with David Rajesh (Primary Contact)
   - 📊 Monthly NPS check-ins (target: NPS ≥30 by Day 90)
   - 📊 Bi-weekly CSM touchpoints to address feature adoption gaps

**Next Steps**:
- ⚠️ **PRE-GA (Week 1)**: Engineering sprint to complete Blockers #1-3
- ⚠️ **GA Day**: Deploy with enhanced monitoring + 24/7 on-call for first 2 weeks
- ⚠️ **Week 2-4**: Daily standups with CSM + Engineering to track Commit metrics
- ✅ **Day 30**: Go/No-Go review based on Commit achievement (decision point: continue or rollback)

**Risk Assessment**: **MEDIUM**
- Mitigated by: Clear action plan, engineering commitment, CSM white-glove support
- Residual risk: Workday API remains external dependency (can cache but can't control uptime)

---

## Appendix

### Data Sources
- Activation & Engagement: Amplitude analytics (Sep 8 - Nov 15, 2025)
- Delivery SLA: Grafana event-bus dashboard + Datadog APM
- NPS/CSAT: Qualtrics survey (3 waves: Week 3, Week 7, Week 10)
- Incidents: Jira incident tracker + PagerDuty alert log

### Review History
| Date | Reviewer | Notes |
|------|----------|-------|
| 2025-09-29 | Marcus Johnson (CSM) | Week 3 checkpoint - integration issues flagged |
| 2025-10-20 | Marcus Johnson + Eng Lead | Mid-pilot review - recovery plan in place |
| 2025-11-15 | Marcus Johnson + Launch Team | Final assessment - conditional GO |

### Supporting Materials
- [Globex Pilot Kickoff Deck](link)
- [Workday Integration Postmortem (INC-1256)](link)
- [Engineering Action Plan: Caching Layer + SSE Improvements](link)
- [NPS Survey Detailed Results + Verbatims](link)
- [User Interview Summary (n=8)](link)
- [30-Day Post-GA Success Plan](link)

---

**Document Owner**: Marcus Johnson, CSM Lead
**Stakeholders**: David Rajesh (Globex), Launch Lead, Engineering Lead, Product VP, CTO
**Distribution**: Internal (Pilot Team + Executive Stakeholders + Engineering)
**Confidentiality**: Internal Use Only
**Follow-Up**: 30-Day Review scheduled for 2025-12-15
