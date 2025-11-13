# VIS Model (Volunteer Impact Score)

**Version**: 1.0.0
**Last Updated**: 2025-11-13
**Owner**: Worker 3 - Backend Team

## Overview

The Volunteer Impact Score (VIS) is a composite metric (0-100 scale) that measures individual volunteer effectiveness across three dimensions: time commitment, engagement consistency, and participant outcome improvement.

## Formula

```
VIS = (Hours × 0.3) + (Consistency × 0.3) + (Outcome Impact × 0.4)
```

All components are normalized to a 0-100 scale.

## Components

### 1. Hours Score (Weight: 30%)

Measures total time commitment.

**Calculation:**
```
Hours Score = min(100, (Total Hours / 100) × 100)
```

**Thresholds:**
- **100+ hours**: 100 score (capped)
- **50+ hours**: Excellent (50 score)
- **20+ hours**: Good (20 score)
- **5+ hours**: Fair (5 score)

**Rationale**: Linear scaling up to 100 hours, then capped to avoid over-weighting marathon volunteers.

### 2. Consistency Score (Weight: 30%)

Measures regularity of engagement (sessions per month).

**Calculation:**
```
If sessions/month >= 8: 100 score (2+ per week)
If sessions/month >= 4: 75 score (weekly)
If sessions/month >= 2: 50 score (bi-weekly)
If sessions/month > 0: 25 score (emerging)
Otherwise: 0
```

**Rationale**: Regular, predictable engagement is more valuable than sporadic high-intensity bursts. Participants benefit from consistency.

### 3. Outcome Impact Score (Weight: 40%)

Measures average participant improvement across outcome dimensions.

**Calculation:**
```
If avg_improvement < 0.1: 0 score (below threshold)
Otherwise: ((avg_improvement - 0.1) / 0.9) × 100
```

**Minimum Threshold**: 10% improvement required to count.

**Rationale**: Volunteers are judged by participant outcomes, not just activity. This is the most important component (40% weight).

## Scoring Bands

| Band | Score Range | Description |
|------|-------------|-------------|
| **Exceptional** | 76-100 | Sustained high impact across all dimensions |
| **High Impact** | 51-75 | Strong performance, significant outcomes |
| **Contributing** | 26-50 | Positive engagement, moderate outcomes |
| **Emerging** | 0-25 | Early-stage or sporadic involvement |

## Example Calculations

### Example 1: Typical Active Volunteer

**Inputs:**
- Total Hours: 30
- Sessions per Month: 4 (weekly)
- Avg Participant Improvement: 0.6 (60%)

**Calculation:**
```
Hours Score = (30 / 100) × 100 = 30
Consistency Score = 75 (weekly sessions)
Outcome Impact = ((0.6 - 0.1) / 0.9) × 100 = 55.56

VIS = (30 × 0.3) + (75 × 0.3) + (55.56 × 0.4)
    = 9 + 22.5 + 22.22
    = 53.72 (High Impact)
```

### Example 2: Exceptional Volunteer

**Inputs:**
- Total Hours: 120
- Sessions per Month: 10 (2-3 per week)
- Avg Participant Improvement: 0.9 (90%)

**Calculation:**
```
Hours Score = min(100, 120) = 100 (capped)
Consistency Score = 100 (8+ sessions/month)
Outcome Impact = ((0.9 - 0.1) / 0.9) × 100 = 88.89

VIS = (100 × 0.3) + (100 × 0.3) + (88.89 × 0.4)
    = 30 + 30 + 35.56
    = 95.56 (Exceptional)
```

### Example 3: High Hours, Low Consistency

**Inputs:**
- Total Hours: 100
- Sessions per Month: 0.5 (very sporadic)
- Avg Participant Improvement: 0.3

**Calculation:**
```
Hours Score = 100
Consistency Score = 25 (emerging)
Outcome Impact = ((0.3 - 0.1) / 0.9) × 100 = 22.22

VIS = (100 × 0.3) + (25 × 0.3) + (22.22 × 0.4)
    = 30 + 7.5 + 8.89
    = 46.39 (Contributing)
```

**Insight**: High total hours but inconsistent engagement results in lower VIS.

## Use Cases

### 1. Recognition Programs
- **Exceptional (76+)**: Featured on company dashboards, special recognition
- **High Impact (51-75)**: Quarterly appreciation, certificates
- **Contributing (26-50)**: Thank-you notes, milestone badges
- **Emerging (0-25)**: Onboarding support, engagement nudges

### 2. Volunteer Leaderboards
- Rank volunteers by VIS within company
- Filter by time period (quarterly, annual, all-time)
- Display top 10 volunteers on Corporate Cockpit

### 3. Impact Attribution
- Allocate SROI value proportional to VIS
- Weight testimonials by volunteer VIS
- Identify high-impact volunteers for case studies

### 4. Engagement Optimization
- **Low Hours, High Consistency**: Encourage more time
- **High Hours, Low Consistency**: Improve scheduling
- **Low Outcome Impact**: Training or re-matching

## Comparison to Industry Benchmarks

| Metric | Industry Typical | TEEI VIS |
|--------|------------------|----------|
| Measurement Frequency | Annual | Quarterly |
| Components | Hours only | Hours + Consistency + Outcomes |
| Outcome Attribution | Subjective | Data-driven (Q2Q) |
| Normalization | None | 0-100 scale |

## Limitations

1. **Outcome Attribution**: Assumes volunteer is primary driver of participant improvement
2. **Lag Effect**: Outcomes may manifest after volunteer engagement ends
3. **Confounding Factors**: Participant motivation, external support not isolated
4. **Sample Size**: Small participant samples may have high variance

## Change Control

All modifications to VIS weights require:

1. **Documentation**: Rationale, research sources, stakeholder approval
2. **Version Bump**: Update version number in this doc and `visWeights.ts`
3. **Audit Trail**: Git commit with detailed explanation
4. **Notification**: Inform volunteers of methodology changes

### Change History

| Version | Date | Change | Rationale |
|---------|------|--------|-----------|
| 1.0.0 | 2025-11-13 | Initial model | Balanced weighting of hours, consistency, outcomes |

## Future Enhancements

- [ ] Add qualitative feedback sentiment score (volunteer-side NPS)
- [ ] Incorporate participant retention rate
- [ ] Adjust for difficulty (e.g., working with refugees vs. students)
- [ ] Multi-activity weighting (buddy vs. mentorship)
- [ ] Predictive VIS (forecast based on trajectory)

## References

1. Points of Light. (2022). *Volunteer Impact Measurement Framework*.
2. VolunteerMatch. (2023). *Engagement Metrics for Corporate Volunteering*.
3. Deloitte. (2021). *Skills-Based Volunteering Impact Study*.
4. Harvard Business Review. (2020). *The Business Case for Volunteer Engagement*.

## Contact

For questions about VIS methodology:
- **Technical**: Backend Team Lead (Worker 3)
- **Analytics**: QA/DevOps Team Lead (Worker 3)
- **Recognition Programs**: Corporate Cockpit Product Owner

---

**Last Review**: 2025-11-13
**Next Review**: 2025-Q2 (after first quarter of production data)
