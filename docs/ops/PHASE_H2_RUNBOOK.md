# Phase H2 Operations Runbook
**TEEI Enterprise Ops & Compliance - Day 1 Operations Guide**

---

## Quick Reference

| Service | Port | Health Check | Logs |
|---------|------|--------------|------|
| Billing Service | 3010 | `curl localhost:3010/api/billing/health` | `/var/log/billing-service.log` |
| DLP Scanner | N/A | Exit code 0 | `/var/log/dlp-scanner.log` |
| SOC2 Harvester | N/A | Exit code 0 | `/var/log/soc2-harvester.log` |

---

## 1. Billing Service Operations

### Start Service
```bash
cd /services/billing
export PORT=3010
export STRIPE_API_KEY=stub  # Or sk_live_... for production
pnpm dev
```

### Monitor Budget Alerts
```bash
# Check tenant budget utilization
curl http://localhost:3010/api/billing/budgets/:tenantId

# Expected response:
{
  "budget": { "monthlyLimitUSD": 1000, ... },
  "currentMonth": { "utilizationPercent": 75.3, ... },
  "forecast": { "onTrackToExceed": false, ... }
}
```

### Generate Invoice (Manual Trigger)
```bash
curl -X POST http://localhost:3010/api/billing/invoices/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "uuid",
    "tenantName": "Acme Corp",
    "year": 2025,
    "month": 11
  }'
```

### Troubleshooting

**Issue**: Anomaly detection false positives
**Resolution**: Adjust `stdDevThreshold` in `BudgetConfig` (default: 2.5, increase to 3.0 or 3.5)

**Issue**: Stripe API timeouts
**Resolution**: Check `STRIPE_API_KEY` validity, verify network connectivity to `api.stripe.com`

---

## 2. SIEM/DLP Operations

### Run DLP Scanner (Weekly)
```bash
export SCAN_BUCKET=teei-data
export QUARANTINE_BUCKET=teei-quarantine
export AWS_REGION=eu-west-1

node /ops/dlp/scanners/s3-scanner.ts
```

### Review Quarantined Objects
```bash
# List quarantined objects
aws s3 ls s3://teei-quarantine/quarantine/ --recursive

# Approve release (requires approval workflow)
# See /ops/dlp/legal-hold-api.ts → releaseFromQuarantine()
```

### SIEM Alert Response

**CRITICAL Alert: EXFIL-001 (Mass Data Export)**
1. **Immediate**: Suspend API key via `POST /api/auth/suspend-key/:keyId`
2. **Investigation**: Check audit logs for user activity
3. **Evidence**: Preserve logs via legal hold API
4. **Communication**: Notify CISO, DPO, tenant admin
5. **Remediation**: Reset credentials, require re-authentication

**HIGH Alert: TOKEN-003 (Large Batch Request Spike)**
1. **Throttle**: Rate limit API key to 1000 req/hour
2. **Investigation**: Check if legitimate batch job or abuse
3. **Communication**: Notify tenant admin for justification
4. **Escalation**: If abuse confirmed, suspend API key

**MEDIUM Alert: AUTH-007 (After-Hours Admin Access)**
1. **Audit**: Review audit logs for session activity
2. **Verify**: Confirm with admin via secondary channel (email, phone)
3. **Documentation**: Require written justification
4. **Follow-up**: Review in weekly security meeting

### Tuning SIEM Rules

**Reduce False Positives**:
1. Edit `/ops/security/siem/rules/*.yml`
2. Adjust thresholds (e.g., `threshold: 5` → `threshold: 10`)
3. Add exceptions for known patterns
4. Reload SIEM configuration

**Example** (reduce AUTH-001 sensitivity):
```yaml
# Before
aggregation:
  threshold: 5  # 5 failed logins
  window: 5m

# After
aggregation:
  threshold: 10  # 10 failed logins
  window: 5m
```

---

## 3. SOC2 Evidence Collection

### Weekly Evidence Harvest
```bash
export EVIDENCE_DIR=/ops/evidence/archives
export KUBECONFIG=/path/to/kubeconfig

node /ops/evidence/harvesters/soc2-evidence-collector.ts
```

### Quarterly Access Audit
```bash
node /ops/evidence/harvesters/access-diff-auditor.ts

# Review output for unauthorized RBAC changes
# Follow up on any changes without approval tickets
```

### Pre-Audit Checklist

**30 Days Before Audit**:
- [ ] Run full evidence collection
- [ ] Generate 12-month binder (all evidence archives)
- [ ] Review for gaps (missing weeks/months)
- [ ] Remediate any findings

**7 Days Before Audit**:
- [ ] Fresh evidence snapshot
- [ ] Export to PDF (for auditors)
- [ ] Verify SHA-256 hashes for integrity
- [ ] Prepare incident drill results

**Binder Generation**:
```bash
cd /ops/evidence/archives
zip -r soc2-binder-$(date +%Y-%m-%d).zip 2024-* 2025-*
sha256sum soc2-binder-*.zip > checksums.txt
```

---

## 4. AI Act Compliance

### Update Model Cards

**When to Update**:
- Model retrained or fine-tuned
- Performance metrics change >5%
- New training data added
- Bias audit completed

**Steps**:
1. Edit `/docs/compliance/AI_Act_Transparency_Disclosure.md`
2. Update model version, performance metrics, last updated date
3. Run bias audit (if applicable)
4. Get AI Ethics Committee sign-off
5. Commit changes

### Dataset Register Maintenance

**Add New Dataset**:
```json
{
  "dataset_id": "DS-004",
  "name": "New Training Dataset",
  "purpose": "...",
  "model_id": "...",
  "pii_status": "redacted",
  "retention_period": "5y",
  "data_hash": "sha256:...",
  "ethical_review": {
    "reviewed_by": "AI Ethics Committee",
    "review_date": "YYYY-MM-DD",
    "approval_status": "approved"
  }
}
```

**Annual Review**:
- [ ] Verify dataset hashes (integrity check)
- [ ] Confirm retention periods
- [ ] Delete expired datasets
- [ ] Update ethical review dates

### Human Oversight Log

**Log High-Risk AI Outputs**:
```bash
echo '{
  "timestamp": "'$(date -Iseconds)'",
  "model": "teei-narrative-gen-v3",
  "output_id": "uuid",
  "confidence": 0.78,
  "human_reviewed": true,
  "reviewer": "user@teei.io",
  "outcome": "approved_with_edits",
  "edits": "Citation added for paragraph 3"
}' >> /ops/ai-act/oversight-logs/$(date +%Y-%m).jsonl
```

---

## 5. SLSA Level 3 Operations

### Verify Image Signatures

**Before Deployment**:
```bash
IMAGE="ghcr.io/teei-csr-platform/app:v1.2.3"

# 1. Verify Cosign signature
cosign verify \
  --certificate-identity-regexp="^https://github.com/teei-csr-platform/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  $IMAGE

# 2. Verify SLSA provenance
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp="^https://github.com/teei-csr-platform/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  $IMAGE

# 3. Download and inspect SBOM
cosign download sbom $IMAGE | jq .

# 4. Check for vulnerabilities
trivy image --severity HIGH,CRITICAL $IMAGE
```

### Admission Controller Monitoring

**Check Pod Rejections**:
```bash
# View admission controller logs
kubectl logs -n cosign-system deployment/webhook

# List recent rejections
kubectl get events --all-namespaces \
  --field-selector reason=FailedCreate \
  | grep "unsigned image"
```

**Approve Exception** (temporary, for migration):
```yaml
# Edit /k8s/policies/admission-controller.yml
exceptions:
  - images:
      - "legacy-app:v1.0.0"
    namespace: production
    until: "2026-01-31"
    reason: "Legacy app migration in progress"
    approved_by: "ciso@teei.io"
```

### SBOM Attestation Failure

**Symptoms**:
- Pod creation fails with "SBOM not found"
- Admission webhook rejects deployment

**Resolution**:
1. Check if SBOM was attached during build:
   ```bash
   cosign download sbom $IMAGE
   ```
2. If missing, re-run build pipeline (triggers SBOM generation)
3. Verify SBOM signature:
   ```bash
   cosign verify $IMAGE:sha256-xxxxx.sbom
   ```

---

## 6. Incident Response

### Billing Fraud

**Detection**: Anomaly alert (TOKEN-001, TOKEN-003)
**Response**:
1. **Suspend**: `POST /api/billing/budgets/:tenantId/check` → `shouldHardStop: true`
2. **Investigate**: Review usage logs, identify spike source
3. **Evidence**: Export invoice, usage metrics, anomaly report
4. **Communication**: Notify tenant via email + phone
5. **Remediation**: Reset API keys, adjust budget limits

### Data Exfiltration

**Detection**: SIEM EXFIL-001, EXFIL-003, EXFIL-006
**Response**:
1. **Contain**: Suspend user session, block IP
2. **Preserve**: Create legal hold on affected objects
3. **Investigate**: Audit logs, DLP scan results
4. **Notify**: CISO, DPO, Legal, affected data subjects (if GDPR breach)
5. **Report**: 72-hour GDPR breach notification (if applicable)

### Supply Chain Compromise

**Detection**: Admission controller rejects unsigned image, Trivy CRITICAL CVE
**Response**:
1. **Block**: Admission controller prevents deployment (automatic)
2. **Investigate**: Inspect SBOM for malicious dependencies
3. **Verify**: Check provenance attestation for build integrity
4. **Remediate**: Rebuild image with patched dependencies
5. **Audit**: Review all images for similar vulnerabilities

---

## 7. Scheduled Maintenance

### Daily
- [ ] Trivy vulnerability scans (automated via GitHub Actions)
- [ ] SIEM alert review (10-15 minutes)

### Weekly
- [ ] DLP scanner run (Sundays 02:00 UTC)
- [ ] SOC2 evidence collection (Fridays 18:00 UTC)
- [ ] Budget utilization review (all tenants)

### Monthly
- [ ] AI model performance review
- [ ] Dataset register integrity check (SHA-256 verification)
- [ ] Retention policy enforcement (delete expired data)
- [ ] Incident drill (tabletop exercise)

### Quarterly
- [ ] Access diff audit (RBAC changes)
- [ ] Bias audit (AI models)
- [ ] SOC2 evidence binder generation
- [ ] Compliance framework review (SOC2, GDPR, AI Act, SLSA)

### Annually
- [ ] AI Act transparency disclosure update
- [ ] External security audit (SOC2 Type 2 recertification)
- [ ] Dataset register annual review
- [ ] Disaster recovery drill (full restore test)

---

## 8. Escalation Matrix

| Severity | Examples | Response Time | Escalate To |
|----------|----------|---------------|-------------|
| **P0 - Critical** | Data breach, ransomware, EXFIL-001 | 15 minutes | CISO, DPO, Legal |
| **P1 - High** | Budget exceeded 105%, TOKEN-003, AUTH-003 | 1 hour | Security Team, Ops Lead |
| **P2 - Medium** | After-hours admin access, AUTH-007 | 4 hours | Ops Team |
| **P3 - Low** | DLP medium severity, TOKEN-005 | 24 hours | Data Owner |

### On-Call Rotation

**Primary**: Ops Team (24/7 on-call rotation)
**Secondary**: Security Team (AUTH, TOKEN, EXFIL alerts)
**Executive**: CISO (P0 incidents only)

**PagerDuty Integration**: Configure SIEM alerts to trigger PagerDuty incidents

---

## 9. Monitoring Dashboards

### Recommended Dashboards (Grafana/Prometheus)

**Dashboard 1: Billing Metrics**
- Tenant budget utilization (gauge)
- Anomaly alerts (time series)
- Invoice generation rate (counter)
- Top 10 tenants by cost (bar chart)

**Dashboard 2: SIEM Alerts**
- Alert count by severity (pie chart)
- Alert trends (time series)
- Top 10 alert rules (bar chart)
- MTTR (mean time to resolution) (gauge)

**Dashboard 3: DLP Findings**
- Findings by category (pie chart: PII, financial, health, secret)
- Quarantined objects (counter)
- Legal holds (counter)
- Scan duration (time series)

**Dashboard 4: SOC2 Evidence**
- Evidence collection status (gauge: completed/failed)
- Evidence count by TSC (bar chart)
- Last collection timestamp (stat)

**Dashboard 5: SLSA Quality**
- Build success rate (gauge)
- Vulnerability scan results (pie chart: pass/fail)
- Unsigned image rejections (counter)
- SBOM coverage (gauge: % of images with SBOM)

---

## 10. Contacts

### Internal
- **Ops Team**: ops@teei.io (Slack: #ops-oncall)
- **Security Team**: security@teei.io (Slack: #security-alerts)
- **CISO**: ciso@teei.io (Mobile: +44-XXX)
- **DPO**: dpo@teei.io (Mobile: +44-XXX)
- **AI Ethics Committee**: ai-ethics@teei.io

### External
- **AWS Support**: Enterprise support case (Severity: Urgent)
- **Stripe Support**: https://support.stripe.com (Dashboard → Get Help)
- **Sigstore/Cosign**: GitHub issues (best effort)

---

**Runbook Version**: 1.0.0
**Last Updated**: 2025-11-15
**Next Review**: 2026-02-15
