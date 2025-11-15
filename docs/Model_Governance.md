# AI Model Governance Framework

**Version:** 1.0.0
**Effective Date:** 2025-01-15
**Owner:** Worker-2 Team
**Review Cycle:** Quarterly

## Executive Summary

This document establishes the governance framework for AI models powering the TEEI CSR Platform's Q2Q (Qualitative-to-Quantitative) classification system. It defines model lifecycle management, deployment controls, drift monitoring, and compliance requirements to ensure reliable, auditable, and ethical AI operations.

---

## Model Lifecycle

### 1. Development

**Research & Experimentation:**
- Hypothesis formation for model improvements
- Dataset collection and annotation
- Prompt engineering and calibration
- Initial evaluation on dev set (20% split)

**Deliverables:**
- Model card with architecture, performance metrics
- Evaluation report (F1, latency, cost)
- Risk assessment (bias, privacy, errors)

### 2. Testing

**Evaluation Criteria:**
- Macro F1 ≥ 0.80 on test set (unseen data)
- Latency p95 < 2000ms
- Cost per 1K requests < $2.00
- Citation coverage = 100%
- PII leakage rate = 0%

**Test Sets:**
- EN: 150 samples (50 per complexity level)
- UK: 100 samples
- NO: 100 samples

**Sign-off Required:** AI Lead + Product Owner

### 3. Staging

**Canary Deployment:**
- Initial weight: 5% of traffic
- Increment step: 5% every 24 hours
- Success criteria:
  - F1 ≥ baseline model F1
  - Latency p95 < baseline + 10%
  - Error rate < 2%
- Automatic rollback on criteria failure

**Duration:** Minimum 7 days (≥1000 samples)

### 4. Production

**Activation:**
- Deactivate previous production model
- Update `model_registry.active = true`
- Log migration in `formula_migrations` table

**Monitoring (24/7):**
- Drift detection (daily PSI/JS checks)
- Cost tracking (monthly budget enforcement)
- Latency monitoring (p95/p99 alerts)
- Error rate tracking (>5% triggers alert)

### 5. Retirement

**Triggers:**
- Replaced by better-performing model
- Drift alert remains critical for >7 days
- Security vulnerability discovered
- Cost exceeds budget by >20%

**Process:**
- Mark model inactive in registry
- Retain for 90 days for audit/rollback
- Archive evaluation results and lineage data
- Document retirement reason

---

## Model Registry

### Registry Structure

YAML-based registry synced to PostgreSQL (`model_registry` table):

```yaml
modelId: q2q-claude-v3
provider: claude
modelName: claude-3-5-sonnet-20250219
promptVersion: v2.1.0
thresholds:
  confidence: 0.7
  belonging: 0.65
  lang_level_proxy: 0.70
  job_readiness: 0.68
  well_being: 0.66
effectiveFrom: 2025-01-15T00:00:00Z
active: true
```

### Version Naming Convention

Format: `q2q-{provider}-v{major}`

Examples:
- `q2q-claude-v3`
- `q2q-openai-v2`
- `q2q-gemini-v1`

**Semantic Versioning:**
- Major: Architecture change (e.g., new provider, base model)
- Minor: Prompt or threshold tuning
- Patch: Bug fixes, config updates

---

## Canary Rollout System

### Configuration

```typescript
{
  modelId: "q2q-claude-v3",
  initialWeight: 0.05,          // 5% traffic
  targetWeight: 1.0,             // 100% at completion
  incrementStep: 0.05,           // +5% per step
  incrementInterval: 24,         // hours
  successCriteria: {
    minF1Score: 0.82,
    maxLatencyMs: 1800,
    minSampleSize: 100,
    maxErrorRate: 0.02
  },
  rollbackCriteria: {
    f1Degradation: 5.0,          // % drop vs baseline
    latencyIncrease: 15.0,       // % increase vs baseline
    errorRateThreshold: 0.05     // absolute threshold
  }
}
```

### Promotion Path

```
5% → 10% → 15% → ... → 95% → 100%
 ↓     ↓      ↓            ↓      ↓
[24h] [24h] [24h]  ...  [24h]  [24h]
```

**Minimum Duration:** 19 days (5% to 100%)
**Typical Duration:** 21-28 days (accounting for pauses at milestones)

### Rollback Scenarios

**Automatic Rollback Triggers:**
1. F1 drops >5% below baseline
2. Latency increases >15% above baseline
3. Error rate exceeds 5%
4. Cost exceeds budget by >25%

**Manual Rollback:**
- Security incident
- Data privacy violation
- Regulatory non-compliance
- Executive decision

---

## Drift Detection

### Metrics

**Population Stability Index (PSI):**
```
PSI = Σ (actual_% - expected_%) × ln(actual_% / expected_%)
```

**Jensen-Shannon Divergence (JS):**
```
JS(P||Q) = 0.5 × KL(P||M) + 0.5 × KL(Q||M)
where M = 0.5 × (P + Q)
```

### Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| PSI | 0.15 | 0.25 |
| JS | 0.15 | 0.25 |

### Check Frequency

- **Dimensions:** confidence, belonging, lang_level_proxy, job_readiness, well_being
- **Languages:** en, uk, no
- **Schedule:** Daily at 02:00 UTC
- **Baseline:** Rolling 30-day window
- **Current:** Last 7 days

### Alert Response

**Warning (PSI/JS 0.15-0.24):**
- Monitor for 3 days
- If persists, trigger model recalibration

**Critical (PSI/JS ≥ 0.25):**
- Immediate notification to AI Lead
- Pause canary rollouts
- Initiate root cause analysis
- Consider rolling back to previous model

---

## Cost & Budget Management

### Budget Allocation

**Monthly Budgets (per company):**
- Tier 1 (10-50 employees): $50/month
- Tier 2 (51-250 employees): $200/month
- Tier 3 (251+ employees): $500/month

**Enforcement:**
- Soft limit: Warning at 80% budget
- Hard limit: Block requests at 100% budget
- Overage: Require approval for additional budget

### Cost Tracking

**Per-Request:**
```typescript
{
  tokens: { input: 450, output: 380 },
  cost: {
    inputCost: 0.000675,   // 450 tokens × $0.0015/1K
    outputCost: 0.00228,   // 380 tokens × $0.006/1K
    totalCost: 0.002955
  },
  provider: "claude",
  model: "claude-3-5-sonnet"
}
```

**Monthly Aggregation:**
- Total cost per company
- Cost per dimension
- Cost per language
- Average cost per classification

### Cost Optimization

**Caching:**
- Target hit rate: ≥60%
- Estimated savings: 60% × avg_cost = 60% × $0.003 = $0.0018 saved per hit

**Batching:**
- Batch size: 10 requests
- Latency trade-off: +50ms, cost -15%

**Model Selection:**
- High volume → cheaper model (GPT-4o mini)
- High stakes → best model (Claude Opus, GPT-4)

---

## Privacy & Compliance

### PII Detection

**Layers:**
1. Regex-based (email, phone, SSN, credit card)
2. Pattern-based (names, addresses)
3. Context-based (DOB, IDs)

**Action:** Auto-redact all detected PII before storage

### Differential Privacy

**Use Case:** Aggregate statistics in reports

**Implementation:**
- Laplace noise addition
- Epsilon budget: ε = 1.0 (per query)
- Sensitivity: Domain-specific (e.g., 1 for counts)

**Example:**
```typescript
noisyCount = actualCount + Laplace(sensitivity / epsilon)
```

### Data Retention

**Evidence Snippets:** 2 years
**Classifications:** 5 years
**Lineage Data:** 7 years (audit requirement)
**Personal Identifiers:** Redacted after 90 days

---

## Audit & Lineage

### Lineage Tracking

**Required Metadata:**
- Report ID
- Model used (ID, version, provider)
- Prompt version
- Input tokens, output tokens, cost
- All citations with evidence IDs
- Generation timestamp, duration

**Export Formats:**
- JSON (programmatic access)
- DOT (Graphviz visualization)
- Mermaid (documentation)
- HTML/PDF (audit reports)

### Audit Requirements

**Quarterly Reviews:**
- Model performance trends
- Drift incidents and resolutions
- Cost vs. budget analysis
- Privacy compliance report

**Annual Certification:**
- Full lineage audit for 100 random reports
- Citation coverage validation
- PII leakage testing (must be 0%)
- Bias assessment across demographics

---

## Roles & Responsibilities

| Role | Responsibilities |
|------|------------------|
| **AI Lead** | Model selection, performance sign-off, drift response |
| **Data Engineer** | Pipeline maintenance, data quality, schema evolution |
| **ML Engineer** | Model training, calibration, evaluation |
| **Security Officer** | PII detection, redaction policies, audit compliance |
| **Product Owner** | Business requirements, acceptance criteria |
| **DevOps** | Infrastructure, monitoring, incident response |

---

## Incident Response

### Severity Levels

**P0 (Critical):**
- PII leakage detected
- Model producing harmful/biased outputs
- Complete service outage

**P1 (High):**
- Drift alert critical for >3 days
- Cost overrun >50%
- Latency p95 >3000ms

**P2 (Medium):**
- Drift warning
- Cost overrun 20-50%
- Non-critical errors

### Response SLAs

- P0: 15 minutes (immediate rollback)
- P1: 2 hours (mitigation plan)
- P2: 24 hours (investigation)

---

## Change Management

### Model Updates

**Minor Changes (prompt tuning, threshold adjustment):**
- Approval: AI Lead
- Testing: Dev set validation
- Deployment: Direct to staging

**Major Changes (new base model, architecture):**
- Approval: AI Lead + Product Owner
- Testing: Full test suite + human evaluation
- Deployment: Canary rollout (21-day minimum)

### Registry Updates

All changes to model registry require:
1. Pull request with change rationale
2. Code review by 2+ team members
3. Automated tests passing
4. Approval from AI Lead

---

## Compliance

### GDPR

- Right to explanation: Lineage provides citation trails
- Right to be forgotten: Delete evidence snippets on request
- Data minimization: Only store necessary fields

### SOC 2

- Access controls: Role-based permissions
- Audit trails: All model changes logged
- Incident response: Documented procedures

### AI Act (EU)

- Transparency: Model cards published
- Risk assessment: Documented for high-risk use cases
- Human oversight: Manual review for appeals

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-15
**Next Review:** 2025-04-15
**Approved By:** AI Lead, Security Officer, Product Owner
