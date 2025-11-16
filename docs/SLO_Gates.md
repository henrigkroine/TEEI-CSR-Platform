# SLO Gates - Deployment Gating Based on Service Level Objectives

**TEEI CSR Platform - Production Stability Framework**

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: SRE Team
**Contact**: sre@teei.io

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Gate Types](#gate-types)
4. [Integration Points](#integration-points)
5. [How It Works](#how-it-works)
6. [Usage Guide](#usage-guide)
7. [Emergency Overrides](#emergency-overrides)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Case Studies](#case-studies)
10. [FAQ](#faq)

---

## Overview

**SLO Gates** are automated deployment gates that **block deployments when Service Level Objectives (SLOs) are breaching**. This prevents deploying new changes during an incident, which could worsen the situation.

### The Problem

Traditional deployment processes allow deployments regardless of production health:

- ❌ Deploy during an incident → Make outage worse
- ❌ Deploy when error budget exhausted → No room for mistakes
- ❌ Deploy when SLOs breaching → Degrade customer experience further

### The Solution

SLO Gates automatically check production health before deploying:

- ✅ Block deployment if SLOs are breaching
- ✅ Block deployment if error budget <10%
- ✅ Block deployment if fast burn rate detected
- ✅ Allow emergency overrides with audit trail

### Benefits

1. **Prevent Deploying During Incidents**: Automatically block deployments when production is unhealthy
2. **Protect Error Budget**: Ensure sufficient error budget before deploying risky changes
3. **Data-Driven Decisions**: Use SLO metrics to objectively determine deployment readiness
4. **Transparent Overrides**: Emergency deployments require approval and are audited
5. **Improved Reliability**: Force teams to fix production issues before adding new features

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                       SLO Gate Architecture                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Prometheus  │─────▶│ SLO Recording│─────▶│ SLO Metrics  │
│   Metrics    │      │    Rules     │      │   (SLIs)     │
└──────────────┘      └──────────────┘      └──────────────┘
                                                     │
                                                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   GitHub     │─────▶│  SLO Gate    │◀─────│   Grafana    │
│   Actions    │      │    Check     │      │  Dashboard   │
└──────────────┘      └──────────────┘      └──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Deployment Gate │
                    │   Decision      │
                    └─────────────────┘
                       │            │
                  ALLOWED      BLOCKED
                       │            │
                       ▼            ▼
              ┌──────────────┐   ┌──────────────┐
              │ Argo Rollouts│   │   Require    │
              │  Canary/     │   │   Override   │
              │  Blue-Green  │   │   Approval   │
              └──────────────┘   └──────────────┘
```

### Key Components

1. **Prometheus**: Collects metrics from services
2. **SLO Recording Rules**: Pre-calculates SLIs (Service Level Indicators)
3. **Argo Rollouts Analysis**: Deployment gate checks during rollout
4. **GitHub Actions**: Pre-merge SLO checks on PRs
5. **Grafana Dashboard**: Real-time SLO visibility
6. **SLO Gate Script**: CLI tool for manual checks and overrides

---

## Gate Types

### 1. Pre-Deployment Gate (GitHub Actions)

**Purpose**: Check SLOs before merging PR to main branch

**When**: On pull request to `main` or `production` branches

**What it checks**:
- Error budget >10% for all services
- No fast burn rate (>14.4x)
- No GDPR violations
- All SLOs meeting targets

**Action if blocked**:
- PR build fails
- Comment posted on PR with SLO status
- Requires fixing SLO breach before merge

**Example**:
```yaml
# .github/workflows/slo-gate-check.yaml
on:
  pull_request:
    branches: [main, production]

jobs:
  slo-gate-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check SLO gate
        run: ./scripts/infra/slo-gate.sh check
```

---

### 2. Pre-Rollout Gate (Argo Rollouts)

**Purpose**: Check SLOs before starting canary/blue-green rollout

**When**: Before Argo Rollouts starts deploying new version

**What it checks**:
- Same checks as pre-deployment gate
- Verifies production is healthy before starting rollout

**Action if blocked**:
- Rollout paused
- Alert sent to `#sre-alerts`
- Requires manual approval or SLO recovery

**Example**:
```yaml
# k8s/rollouts/analysis/slo-gate-analysis.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: slo-pre-deployment-gate
spec:
  metrics:
  - name: api-gateway-availability-slo
    successCondition: result >= 0.999
    provider:
      prometheus:
        query: sli:availability:api_gateway:ratio
```

---

### 3. During-Canary Gate (Argo Rollouts)

**Purpose**: Monitor SLOs during canary rollout

**When**: Continuously during canary rollout (10% → 50% → 100%)

**What it checks**:
- Canary error rate vs stable error rate (must be <2x)
- Canary latency vs stable latency (must be <1.5x)
- Overall service SLO not degrading
- No burn rate spike

**Action if blocked**:
- **Automatic rollback** to stable version
- Incident declared
- Post-mortem required

**Example**:
```yaml
# Rollout with canary gate
strategy:
  canary:
    steps:
    - setWeight: 10
    - analysis:
        templates:
        - templateName: slo-canary-gate
    - setWeight: 100
```

---

### 4. Post-Deployment Gate (Argo Rollouts)

**Purpose**: Verify SLOs after full rollout

**When**: After 100% of traffic shifted to new version

**What it checks**:
- SLO maintained after rollout
- No error rate spike
- Latency within targets
- No GDPR violations introduced

**Action if blocked**:
- **Automatic rollback** to previous version
- Incident declared
- Deployment marked as failed

---

## Integration Points

### GitHub Actions (CI/CD)

**File**: `.github/workflows/slo-gate-check.yaml`

**Triggers**:
- Pull request to `main` or `production`
- Manual workflow dispatch

**Outputs**:
- PR comment with SLO status
- Build success/failure
- Slack notification

**Override Process**:
1. Manually trigger workflow
2. Provide override reason (e.g., `security_vulnerability`)
3. Provide approver email
4. Audit log created
5. Post-mortem issue auto-created

---

### Argo Rollouts (Kubernetes)

**File**: `k8s/rollouts/analysis/slo-gate-analysis.yaml`

**Analysis Templates**:
- `slo-pre-deployment-gate`: Check before rollout
- `slo-canary-gate`: Monitor during canary
- `slo-post-deployment-gate`: Verify after rollout

**Prometheus Integration**:
- Queries Prometheus for SLI metrics
- Uses recording rules for fast queries (<1s)

**Failure Actions**:
- `failureLimit: 1`: Abort after 1 failed check
- Automatic rollback to stable version

---

### Prometheus (Metrics)

**Recording Rules**: `observability/prometheus/recording-rules/slo-rules.yaml`

**SLI Metrics**:
- `sli:availability:api_gateway:ratio`: API Gateway availability (99.9% target)
- `sli:latency:api_gateway:p95_ms`: API Gateway p95 latency (<200ms target)
- `sli:error_rate:5xx:ratio`: 5xx error rate (<0.1% target)
- `burn_rate:api_gateway:1h`: Error budget burn rate (1h window)

**Alert Rules**:
- `SLOFastBurn_APIGateway`: Fast burn rate >14.4x
- `SLOSlowBurn_APIGateway`: Slow burn rate >6x
- `ErrorBudgetExhausted_APIGateway`: Error budget <10%
- `GDPRResidencyViolation`: GDPR violation detected

---

### Grafana (Dashboards)

**Dashboard**: `observability/grafana/dashboards/slo-overview.json`

**Panels**:
- Error budget gauges (green/yellow/orange/red)
- Deployment gate status (ALLOWED/BLOCKED)
- Availability SLI timeseries
- Latency SLI timeseries
- Burn rate graphs (1h and 6h windows)
- Regional SLO status
- GDPR violation counter

**URL**: https://grafana.teei.io/d/slo-overview

---

## How It Works

### Step-by-Step: Deployment with SLO Gates

#### Scenario: Deploy API Gateway v2.5.0

**Step 1: Developer Creates PR**

```bash
git checkout -b feature/api-v2.5.0
git commit -m "Add new endpoint /api/v2/users"
git push origin feature/api-v2.5.0
# Create PR on GitHub
```

**Step 2: GitHub Actions Pre-Deployment Check**

```yaml
# Workflow runs automatically on PR
- name: SLO gate check
  run: ./scripts/infra/slo-gate.sh check

# Queries Prometheus:
# - error_budget:api_gateway:remaining_ratio > 0.10? ✅
# - burn_rate:api_gateway:1h < 14.4? ✅
# - sli:gdpr_violations:count == 0? ✅
# - sli:availability:api_gateway:ratio >= 0.999? ✅

# Result: ALLOWED ✅
```

**Step 3: PR Merged, Argo Rollouts Triggered**

```bash
# Argo Rollouts detects new image
kubectl get rollout api-gateway -n production
# NAME           DESIRED   CURRENT   UP-TO-DATE   AVAILABLE
# api-gateway    10        10        0            10
```

**Step 4: Pre-Rollout Gate (Argo Analysis)**

```yaml
# Argo runs slo-pre-deployment-gate
# Checks same SLO metrics as GitHub Actions
# Result: ALLOWED ✅

# Rollout proceeds to canary
```

**Step 5: Canary Rollout (10% traffic)**

```yaml
# Argo shifts 10% traffic to new version
strategy:
  canary:
    steps:
    - setWeight: 10  # 10% to canary, 90% to stable

# During-canary gate monitors:
# - Canary error rate vs stable error rate
# - Canary latency vs stable latency
# - Overall SLO health

# 10-minute observation window
```

**Step 6: Canary Gate Analysis**

```yaml
# Argo runs slo-canary-gate every 1 minute for 10 iterations

# Check 1: Canary error rate comparison
canary_error_rate / stable_error_rate < 2.0? ✅

# Check 2: Canary latency comparison
canary_p95_latency / stable_p95_latency < 1.5? ✅

# Check 3: Overall SLO health
sli:availability:api_gateway:ratio >= 0.999? ✅

# Result: ALLOWED ✅
```

**Step 7: Full Rollout (100% traffic)**

```yaml
# Canary gate passed, proceed to full rollout
- setWeight: 50   # 50% to canary
- setWeight: 100  # 100% to canary (stable deprecated)
```

**Step 8: Post-Deployment Gate**

```yaml
# Argo runs slo-post-deployment-gate

# Verify SLOs maintained after full rollout
# - Availability: 99.95% ✅
# - Latency p95: 150ms ✅
# - Error rate: 0.05% ✅

# Result: DEPLOYMENT SUCCESS ✅
```

---

### Scenario: Blocked Deployment (SLO Breach)

**Step 1: Production Incident (Database Slow Queries)**

```
# Error budget consumed due to slow queries
error_budget:api_gateway:remaining_ratio = 8% (RED threshold <10%)
```

**Step 2: Developer Creates PR (Unrelated Feature)**

```bash
git push origin feature/new-dashboard
# PR created
```

**Step 3: GitHub Actions Pre-Deployment Check**

```yaml
# Workflow runs
- name: SLO gate check
  run: ./scripts/infra/slo-gate.sh check

# Queries Prometheus:
# - error_budget:api_gateway:remaining_ratio > 0.10? ❌ (8% < 10%)

# Result: BLOCKED 🚫
```

**Step 4: PR Build Fails**

```
❌ SLO Gate Check Failed

Deployment BLOCKED:
- API Gateway error budget <10% (current: 8%)

Action Required:
1. Fix SLO breach before deploying
2. Or use emergency override (requires CTO approval)

Dashboard: https://grafana.teei.io/d/slo-overview
```

**Step 5: Developer Options**

**Option A: Fix SLO Breach (Recommended)**
```bash
# SRE investigates and fixes slow queries
# Error budget recovers to 25%
# Re-run SLO gate check → ALLOWED ✅
```

**Option B: Emergency Override** (if critical hotfix)
```bash
# Manually trigger workflow with override
gh workflow run slo-gate-check.yaml \
  -f override_reason=production_outage_fix \
  -f approver_email=cto@teei.io \
  -f incident_id=INC-2025-11-15-001

# CTO approves override
# Deployment proceeds with audit trail
# Post-mortem issue auto-created
```

---

## Usage Guide

### For Developers

#### Check SLO Status Before Creating PR

```bash
# Check current SLO status
./scripts/infra/slo-gate.sh status

# Example output:
API Gateway:
  Availability:     99.95% (SLO: 99.9%)
  Error Budget:     45% remaining [YELLOW]
  Burn Rate (1h):   2.5x (threshold: 14.4x)

# Yellow status: Deployment allowed but requires approval
```

#### Check If Deployment Will Be Allowed

```bash
# Run gate check
./scripts/infra/slo-gate.sh check

# Output:
✅ Deployment gate: ALLOWED

All SLOs are healthy. Deployment may proceed.
```

#### Handle Blocked Deployment

If deployment is blocked:

1. **Check Grafana Dashboard**: https://grafana.teei.io/d/slo-overview
2. **Identify SLO Breach**: Which service is breaching?
3. **Notify SRE Team**: Slack `#sre-alerts`
4. **Wait for Resolution**: SRE fixes breach
5. **Re-run Gate Check**: Verify gate now allows deployment

---

### For SREs

#### Monitor SLO Health

```bash
# Check all SLO status
./scripts/infra/slo-gate.sh status

# Generate weekly report
./scripts/infra/slo-gate.sh report
```

#### Approve Emergency Overrides

When a developer requests an emergency override:

1. **Assess Justification**: Is this truly an emergency?
   - Security vulnerability? ✅
   - Data loss prevention? ✅
   - New feature? ❌

2. **Review SLO Impact**: How much error budget remains?
   - >10%: Lower risk
   - <10%: High risk

3. **Approve Override** (if justified):
```bash
./scripts/infra/slo-gate.sh override \
  security_vulnerability \
  sre-lead@teei.io \
  CVE-2025-12345
```

4. **Monitor Deployment**: Watch SLO dashboard during deployment

5. **Post-Mortem**: Ensure post-mortem scheduled within 48 hours

---

### For Engineering Managers

#### Weekly SLO Review

```bash
# Generate weekly report
./scripts/infra/slo-gate.sh report

# Review with team:
# - Which services consumed most error budget?
# - Were any deployments blocked?
# - Do we need to prioritize reliability work?
```

#### Prioritize Reliability vs Features

Use error budget status to guide sprint planning:

| Error Budget Remaining | Feature Velocity | Reliability Work |
|------------------------|------------------|------------------|
| >50% (Green) | 80% features, 20% reliability | Normal |
| 20-50% (Yellow) | 60% features, 40% reliability | Increase |
| 10-20% (Orange) | 20% features, 80% reliability | Focus |
| <10% (Red) | 0% features, 100% reliability | Critical |

---

## Emergency Overrides

### When to Override

Override SLO gates **only** for:

1. **Security Vulnerability**: CVE patch, zero-day fix
2. **Data Loss Prevention**: Urgent fix to prevent data corruption
3. **GDPR Compliance Fix**: Regulatory violation fix
4. **Production Outage Fix**: Hotfix to restore service

### When NOT to Override

❌ **Do not override** for:

- New features
- Performance optimizations (non-critical)
- Refactoring
- Documentation updates
- Test improvements

### Override Process

#### 1. Request Override (Developer/SRE)

```bash
./scripts/infra/slo-gate.sh override \
  <reason> \
  <approver_email> \
  [incident_id]

# Example:
./scripts/infra/slo-gate.sh override \
  security_vulnerability \
  cto@teei.io \
  CVE-2025-12345
```

#### 2. Approval Required

| Error Budget Level | Approver Required |
|--------------------|-------------------|
| Yellow (20-50%) | Engineering Lead |
| Orange (10-20%) | VP Engineering |
| Red (<10%) | CTO |

#### 3. Audit Trail

All overrides are logged to `/var/log/slo-gate-audit.log`:

```json
{
  "timestamp": "2025-11-15T14:30:00Z",
  "event_type": "slo_gate_override",
  "reason": "security_vulnerability",
  "approver": "cto@teei.io",
  "incident_id": "CVE-2025-12345",
  "deployment_id": "deploy-9876",
  "error_budget_before": "8%"
}
```

#### 4. Post-Mortem Required

All overrides require a post-mortem within **48 hours**:

- GitHub issue auto-created
- Assigned to developer who requested override
- Must document:
  - Why override was necessary
  - What went wrong
  - How to prevent future overrides

---

## Monitoring and Alerting

### Key Alerts

| Alert | Severity | Action | Runbook |
|-------|----------|--------|---------|
| `SLOFastBurn_APIGateway` | Critical (Page) | Investigate immediately | [Link](https://runbooks.teei.io/slo-fast-burn) |
| `SLOSlowBurn_APIGateway` | Warning | Create ticket | [Link](https://runbooks.teei.io/slo-slow-burn) |
| `ErrorBudgetExhausted_APIGateway` | Critical (Page) | Declare incident | [Link](https://runbooks.teei.io/error-budget-exhausted) |
| `GDPRResidencyViolation` | Critical (Page) | Escalate to DPO | [Link](https://runbooks.teei.io/gdpr-violation) |
| `DeploymentBlocked_SLOBreach` | Warning | Fix SLO breach | [Link](https://runbooks.teei.io/deployment-gate-blocked) |

### Dashboards

- **SLO Overview**: https://grafana.teei.io/d/slo-overview
- **Error Budget Tracking**: https://grafana.teei.io/d/error-budget
- **Deployment Gates**: https://grafana.teei.io/d/deployment-gates

---

## Case Studies

### Case Study 1: Gate Blocked Bad Deployment

**Date**: 2025-10-15

**Scenario**: Database migration caused slow queries, error budget at 12% (orange)

**What Happened**:
1. Developer attempted to deploy new feature
2. SLO gate check blocked deployment (error budget <10% threshold)
3. PR build failed with clear error message
4. SRE investigated and found database slow queries
5. Database indexes added, error budget recovered to 40%
6. Deployment re-attempted and succeeded

**Outcome**:
- Gate prevented deploying during instability
- New feature would have made outage worse
- Error budget protected

**Lessons Learned**:
- SLO gates work as designed
- Clear error messages helped developer understand why blocked
- Database monitoring improved

---

### Case Study 2: Emergency Override for Security Patch

**Date**: 2025-11-01

**Scenario**: Critical CVE discovered, error budget at 8% (red)

**What Happened**:
1. Security team discovered CVE-2025-12345 (SQL injection)
2. Hotfix prepared, but SLO gate blocked deployment
3. Security team requested override (reason: `security_vulnerability`)
4. CTO approved override
5. Hotfix deployed successfully
6. SLOs monitored closely during deployment (no degradation)
7. Post-mortem completed within 48 hours

**Outcome**:
- Security vulnerability patched quickly
- Override process worked smoothly
- Audit trail logged
- Post-mortem documented lessons learned

**Lessons Learned**:
- Emergency overrides necessary for security
- Override process fast (<30 minutes)
- Audit trail ensures accountability

---

## FAQ

### Q1: What happens if I try to deploy when SLOs are breaching?

**A**: Your deployment will be automatically **blocked** at multiple stages:

1. **PR Build**: GitHub Actions will fail your PR build
2. **Argo Rollouts**: Pre-deployment gate will pause rollout
3. **Manual Deploy**: SLO gate script will return exit code 1

You must either:
- Fix the SLO breach first
- Request an emergency override (with approval)

---

### Q2: How long does a gate check take?

**A**: Typically **<1 minute**.

Gate checks query Prometheus recording rules, which are pre-calculated. The actual query execution is <1 second.

---

### Q3: Can I override a blocked gate?

**A**: Yes, but only for **emergency reasons**:

- Security vulnerability
- Data loss prevention
- GDPR compliance fix
- Production outage fix

You need **approval** from:
- Engineering Lead (yellow threshold)
- VP Engineering (orange threshold)
- CTO (red threshold)

And a **post-mortem is required** within 48 hours.

---

### Q4: What if Prometheus is down?

**A**: The gate check will **fail safe** (block deployment).

Rationale: If we can't query SLO metrics, we can't verify production is healthy, so we block deployment.

Emergency override still available for critical hotfixes.

---

### Q5: Do gates apply to hotfixes?

**A**: **Yes**, gates apply to all deployments.

However, hotfixes for critical issues (security, outages) can use the **emergency override** process.

---

### Q6: How do I know which SLO is breaching?

**A**: Check the **Grafana SLO Dashboard**: https://grafana.teei.io/d/slo-overview

Or run: `./scripts/infra/slo-gate.sh status`

This will show:
- Error budget remaining for each service
- Current burn rate
- Which SLO is breaching

---

### Q7: What's the difference between fast burn and slow burn?

**A**:

- **Fast Burn** (1h window, 14.4x burn rate):
  - Consuming 2% of monthly error budget in 1 hour
  - Time to exhaustion: ~36 hours
  - **Action**: Page on-call, declare incident

- **Slow Burn** (6h window, 6x burn rate):
  - Consuming 5% of monthly error budget in 6 hours
  - Time to exhaustion: ~6 days
  - **Action**: Create ticket, investigate

---

### Q8: Can I test the gate locally before pushing?

**A**: Yes!

```bash
# Check gate locally
./scripts/infra/slo-gate.sh check

# Output:
✅ Deployment gate: ALLOWED
# or
🚫 Deployment gate: BLOCKED
```

---

### Q9: What happens during a canary rollout if SLOs degrade?

**A**: **Automatic rollback** to the stable version.

Argo Rollouts continuously monitors:
- Canary error rate vs stable error rate
- Canary latency vs stable latency
- Overall SLO health

If any check fails, Argo automatically rolls back to the previous (stable) version.

---

### Q10: How often is error budget reset?

**A**: **Monthly**, on the 1st of each month at 00:00 UTC.

Error budgets do **not** carry over from month to month. Each month starts fresh.

---

## References

- [SLO Definitions](/observability/slo/slo-definitions.yaml)
- [Prometheus Recording Rules](/observability/prometheus/recording-rules/slo-rules.yaml)
- [Argo Rollouts Analysis](/k8s/rollouts/analysis/slo-gate-analysis.yaml)
- [Grafana Dashboard](/observability/grafana/dashboards/slo-overview.json)
- [Error Budget Policy](/docs/Error_Budget_Policy.md)
- [SLO Incident Response](/docs/SLO_Incident_Response.md)
- [SLO Gate Script](/scripts/infra/slo-gate.sh)
- [GitHub Actions Workflow](/.github/workflows/slo-gate-check.yaml)
- [Google SRE Book: SLO Engineering](https://sre.google/workbook/implementing-slos/)

---

## Quick Links

- 📊 **SLO Dashboard**: https://grafana.teei.io/d/slo-overview
- 📖 **Error Budget Policy**: /docs/Error_Budget_Policy.md
- 🚨 **Incident Response**: /docs/SLO_Incident_Response.md
- 🛠️ **SLO Gate Script**: /scripts/infra/slo-gate.sh
- 🤖 **GitHub Workflow**: /.github/workflows/slo-gate-check.yaml

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-15 | SRE Team | Initial release |

**Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SRE Lead | TBD | TBD | TBD |
| VP Engineering | TBD | TBD | TBD |
| CTO | TBD | TBD | TBD |
