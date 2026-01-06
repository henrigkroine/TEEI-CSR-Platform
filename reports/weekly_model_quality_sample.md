# Weekly Model Quality Dashboard

**Report Period**: 2025-11-08 to 2025-11-15 (7 days)
**Generated**: 2025-11-15T12:00:00.000Z

---

## Global Summary

| Metric | Value |
|--------|-------|
| Total Requests | 37,050 |
| Total Cost | $401.86 |
| Avg Accuracy | 88.30% |
| Avg Latency P95 | 783ms |
| Total Drift Alerts | 7 |
| Active Rollouts | 1 |
| Completed Rollouts | 2 |
| Aborted Rollouts | 0 |

## Tenant Performance

### Accuracy Delta vs Baseline

| Tenant | Requests | Accuracy | Baseline | Delta | Status |
|--------|----------|----------|----------|-------|--------|
| Acme Corporation | 12,450 | 89.00% | 87.00% | +2.00% | ✅ |
| Globex Industries | 8,920 | 91.00% | 90.00% | +1.00% | ✅ |
| Umbrella Corp | 15,680 | 85.00% | 88.00% | -3.00% | ⚠️ |

### Latency Performance (P95)

| Tenant | P50 | P95 | P99 | Status |
|--------|-----|-----|-----|--------|
| Acme Corporation | 245ms | 780ms | 1250ms | ✅ |
| Globex Industries | 210ms | 650ms | 980ms | ✅ |
| Umbrella Corp | 310ms | 920ms | 1450ms | ⚡ |

### Cost Analysis

| Tenant | Total Cost | Cost/Request | Delta | Status |
|--------|------------|--------------|-------|--------|
| Acme Corporation | $124.50 | $0.0100 | -0.20% | ✅ |
| Globex Industries | $89.20 | $0.0100 | +0.10% | ✅ |
| Umbrella Corp | $188.16 | $0.0120 | +0.30% | ⚡ |

## Drift Alerts

| Tenant | Label | Language | PSI | JS | Severity | Timestamp |
|--------|-------|----------|-----|----|-----------| ----------|
| umbrella | confidence | en | 0.2500 | 0.1100 | ⚠️ high | 2025-11-14T10:30:00Z |
| umbrella | belonging | en | 0.3100 | 0.1400 | 🚨 critical | 2025-11-14T15:45:00Z |
| acme-corp | job_readiness | no | 0.2200 | 0.0900 | ℹ️ medium | 2025-11-13T08:20:00Z |

## Shadow Evaluation Results

| Tenant | Experiment | Samples | Control Acc | Variant Acc | Delta | Winner |
|--------|------------|---------|-------------|-------------|-------|--------|
| acme-corp | shadow-001 | 500 | 87.00% | 89.00% | +2.00% | 🏆 variant |
| globex | shadow-002 | 450 | 90.00% | 91.00% | +1.00% | 🏆 variant |

## Canary Rollout Outcomes

| Tenant | From Version | To Version | Phase | Outcome | Started | Completed |
|--------|--------------|------------|-------|---------|---------|-----------|
| acme-corp | 1.2.2 | 1.2.3 | complete | ✅ completed | 2025-11-12T14:00:00Z | 2025-11-13T16:30:00Z |
| globex | 2.0.0 | 2.0.1 | complete | ✅ completed | 2025-11-10T09:00:00Z | 2025-11-11T12:15:00Z |
| umbrella | 1.1.9 | 1.2.0 | phase2 | ⏳ in_progress | 2025-11-14T11:00:00Z | In Progress |

## Recommendations

- ⚠️  **Accuracy Drop**: Umbrella Corp experienced >2% accuracy drop. Consider rollback or recalibration.
- 🚨 **Critical Drift**: 1 critical drift alerts detected. Immediate investigation required.

---

**Next Steps**:
1. Review drift alerts and investigate root causes
2. Monitor in-progress rollouts for completion
3. Address any accuracy or latency regressions
4. Update tenant overrides as needed

