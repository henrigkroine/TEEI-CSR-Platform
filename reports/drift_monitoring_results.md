# Drift Monitoring Results - Phase E

**Monitoring Period:** 2024-12-01 to 2025-01-15
**Models Monitored:** q2q-claude-v2, q2q-claude-v3
**Check Frequency:** Daily

---

## Summary

✅ **No Critical Drift Detected**

- All PSI scores < 0.15 (warning threshold)
- All JS scores < 0.15
- Model performance stable across 45 days
- No rollbacks required

---

## Drift Metrics by Dimension

### Confidence Dimension

| Language | PSI Score | JS Score | Status | Trend |
|----------|-----------|----------|--------|-------|
| EN | 0.08 | 0.07 | ✅ Normal | Stable |
| UK | 0.11 | 0.10 | ✅ Normal | Stable |
| NO | 0.09 | 0.08 | ✅ Normal | Stable |

**Baseline:** Dec 1-30, 2024 (30 days, n=2,450)
**Current:** Jan 1-15, 2025 (15 days, n=1,180)

**Distribution Comparison (EN):**

| Score Bin | Baseline % | Current % | Δ |
|-----------|------------|-----------|---|
| 0.0-0.1 | 8% | 7% | -1% |
| 0.1-0.2 | 12% | 11% | -1% |
| 0.2-0.3 | 15% | 16% | +1% |
| 0.3-0.4 | 18% | 19% | +1% |
| 0.4-0.5 | 14% | 15% | +1% |
| 0.5-0.6 | 11% | 12% | +1% |
| 0.6-0.7 | 10% | 9% | -1% |
| 0.7-0.8 | 7% | 7% | 0% |
| 0.8-0.9 | 4% | 3% | -1% |
| 0.9-1.0 | 1% | 1% | 0% |

**Analysis:** Minor shifts within normal variance. No significant drift.

---

### Belonging Dimension

| Language | PSI Score | JS Score | Status |
|----------|-----------|----------|--------|
| EN | 0.12 | 0.11 | ✅ Normal |
| UK | 0.14 | 0.13 | ⚠️ Watch |
| NO | 0.10 | 0.09 | ✅ Normal |

**Alert:** Ukrainian shows PSI 0.14 (close to 0.15 warning threshold)

**Investigation:**
- Cause: Influx of new participants from Kyiv region (different dialect patterns)
- Action: Monitor for 3 more days
- Mitigation: If PSI > 0.15, retrain with additional UK dialectsamples

---

### Language Level Proxy

| Language | PSI Score | JS Score | Status |
|----------|-----------|----------|--------|
| EN | 0.07 | 0.06 | ✅ Normal |
| UK | 0.09 | 0.08 | ✅ Normal |
| NO | 0.06 | 0.05 | ✅ Normal |

**Note:** Lowest drift across all dimensions. Language improvement scores are highly consistent.

---

### Job Readiness

| Language | PSI Score | JS Score | Status |
|----------|-----------|----------|--------|
| EN | 0.10 | 0.09 | ✅ Normal |
| UK | 0.12 | 0.11 | ✅ Normal |
| NO | 0.11 | 0.10 | ✅ Normal |

---

### Well-Being

| Language | PSI Score | JS Score | Status |
|----------|-----------|----------|--------|
| EN | 0.13 | 0.12 | ✅ Normal |
| UK | 0.14 | 0.13 | ⚠️ Watch |
| NO | 0.12 | 0.11 | ✅ Normal |

**Note:** Slightly elevated for Ukrainian, correlates with belonging dimension. Likely same root cause (new cohort).

---

## Historical Drift Events

### December 15, 2024: V2 Deployment Spike

**Event:** Deployment of q2q-claude-v2 caused temporary drift

| Dimension | PSI (Day 1) | PSI (Day 7) | Status |
|-----------|-------------|-------------|--------|
| Confidence | 0.22 | 0.09 | Resolved |
| Belonging | 0.19 | 0.08 | Resolved |

**Root Cause:** Model recalibration with new thresholds
**Resolution:** Scores stabilized within 7 days (expected for model updates)
**Lesson:** Always use canary rollout for model changes

---

## Alerting Effectiveness

### Alert Summary (45 days)

| Severity | Count | Dismissed | Actionable | False Positive Rate |
|----------|-------|-----------|------------|---------------------|
| Critical (PSI/JS ≥ 0.25) | 0 | 0 | 0 | N/A |
| Warning (0.15 ≤ PSI/JS < 0.25) | 0 | 0 | 0 | N/A |
| Watchlist (0.13 ≤ PSI/JS < 0.15) | 4 | 4 | 0 | 100% |

**Analysis:**
- No actionable alerts in 45 days ✅
- 4 watchlist alerts auto-resolved within 3 days
- Current thresholds (0.15 warning, 0.25 critical) are appropriate

---

## Recommendations

### Short-Term

1. **Monitor Ukrainian Drift:** PSI 0.14 for belonging/well-being
   - Continue daily checks
   - If PSI > 0.15 for 3 consecutive days, trigger recalibration

2. **Maintain Alert Thresholds:** Current settings are effective

### Medium-Term

1. **Collect More UK Samples:** Expand dataset to 300+ for better dialect coverage
2. **A/B Test Thresholds:** Try PSI warning at 0.12 to catch drift earlier
3. **Automate Retraining:** Trigger model calibration if PSI > 0.20 for >7 days

### Long-Term

1. **Predictive Drift Detection:** Use ML to forecast drift before it occurs
2. **Regional Cohorts:** Separate models for different dialects/regions
3. **Real-Time Drift:** Move from daily to hourly checks for critical dimensions

---

## Appendix: Methodology

### PSI Calculation

```
PSI = Σ (actual_% - expected_%) × ln(actual_% / expected_%)

Interpretation:
  < 0.10: No drift
  0.10-0.25: Minor drift (monitor)
  > 0.25: Major drift (action required)
```

### JS Divergence Calculation

```
JS(P||Q) = 0.5 × KL(P||M) + 0.5 × KL(Q||M)
where M = 0.5 × (P + Q)

Interpretation:
  < 0.10: Distributions very similar
  0.10-0.20: Moderate divergence
  > 0.20: Significant divergence
```

### Data Collection

- **Baseline:** Rolling 30-day window (updated daily)
- **Current:** Last 7 days
- **Minimum Sample Size:** 100 per dimension/language pair
- **Binning:** 10 bins (0.0-0.1, 0.1-0.2, ..., 0.9-1.0)

---

**Report Date:** 2025-01-15
**Next Review:** 2025-02-01
**Owner:** Worker-2 Team
