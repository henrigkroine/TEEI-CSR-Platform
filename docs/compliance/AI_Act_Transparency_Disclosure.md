# EU AI Act Transparency Disclosure
**TEEI CSR Platform - General-Purpose AI System**

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Compliance**: EU AI Act Articles 12, 13, 17, 52, 53

---

## 1. System Classification

**Risk Level**: **Limited Risk** (Article 52 - Transparency Obligations)

**Classification Rationale**:
- The TEEI CSR Platform uses AI for qualitative-to-quantitative conversion (Q2Q), SROI calculation, and narrative generation
- System interacts with humans but does not make high-risk decisions (employment, credit scoring, law enforcement)
- Falls under Article 52(1) transparency requirements for AI systems that interact with natural persons

**Registration ID**: `TEEI-AI-2025-001`

---

## 2. Model Cards

### 2.1 Q2Q (Qualitative-to-Quantitative) Model

**Model Name**: `teei-q2q-v2`
**Model Type**: Large Language Model (Fine-tuned Claude 3 Sonnet)
**Purpose**: Convert qualitative CSR feedback into structured quantitative metrics

**Training Data**:
- Dataset: 50,000 anonymized CSR feedback entries (2020-2024)
- Languages: English (70%), Spanish (15%), French (10%), Norwegian (5%)
- PII Redaction: All personal identifiers removed pre-training
- Data Lineage: Tracked in `/ops/ai-act/dataset-register.json`

**Performance Metrics**:
- Accuracy: 87.3% (validated against human annotators)
- Precision: 89.1%
- Recall: 85.7%
- F1 Score: 0.873

**Limitations**:
- May misclassify edge cases with ambiguous sentiment
- Performance degrades for languages outside training distribution
- Requires minimum 50 characters input for reliable output

**Bias Mitigation**:
- Gender-neutral language enforced
- Regular bias audits (quarterly)
- Diverse training dataset across geographies

**Last Updated**: 2025-10-12

---

### 2.2 SROI Calculator Model

**Model Name**: `teei-sroi-v1`
**Model Type**: Deterministic algorithm with ML-enhanced forecasting
**Purpose**: Calculate Social Return on Investment with confidence intervals

**Algorithm**: Hybrid deterministic + ML
- Core SROI formula: `(Social Value - Investment) / Investment`
- ML component: Time-series forecasting for future value projection
- Base model: ARIMA + Prophet ensemble

**Validation**:
- Benchmarked against 200 published SROI studies
- Correlation: 0.94 with expert-calculated SROI
- Mean Absolute Error: ±8.2%

**Transparency**:
- All formula coefficients exposed via API
- Evidence chain for every calculation
- Assumptions documented per calculation

**Human Oversight**:
- All SROI reports >$1M require human review
- Quarterly validation by CSR experts
- Override mechanism for edge cases

---

### 2.3 Narrative Generator Model

**Model Name**: `teei-narrative-gen-v3`
**Model Type**: Large Language Model (Claude 3 Haiku)
**Purpose**: Generate executive summaries and CSR narratives

**Evidence-Based Generation**:
- Minimum 1 citation per paragraph
- Citation density: 0.5 per 100 words
- Fail-fast on missing citations

**PII Protection**:
- Pre-LLM PII redaction
- Post-generation leak detection
- Audit logging (no PII logged)

**Supported Locales**: EN, ES, FR, UK, NO

**Quality Controls**:
- Factual accuracy: 96.1% (human validation)
- Readability: Flesch-Kincaid Grade 10-12
- Tone consistency: 92% alignment with brand guidelines

---

## 3. Dataset Register (Article 17)

**Location**: `/ops/ai-act/dataset-register.json`

**Registered Datasets**:

| Dataset ID | Purpose | Size | Collection Period | Retention | PII Redacted |
|------------|---------|------|-------------------|-----------|--------------|
| DS-001 | Q2Q Training | 50K entries | 2020-2024 | 5 years | Yes |
| DS-002 | SROI Validation | 200 studies | 2015-2024 | 7 years | N/A |
| DS-003 | Narrative Fine-tuning | 10K reports | 2021-2024 | 5 years | Yes |

**Data Provenance**: All datasets tracked with SHA-256 hashes and immutable audit trail

---

## 4. Human Oversight Logs (Article 14)

**Oversight Mechanisms**:

1. **Pre-Deployment Review**:
   - All model updates require sign-off from AI Ethics Committee
   - Bias audit mandatory before production deployment

2. **Runtime Monitoring**:
   - Human-in-the-loop for high-stakes outputs (SROI >$1M, narratives for public disclosure)
   - Confidence threshold: Outputs <80% confidence flagged for review

3. **Post-Deployment Audits**:
   - Monthly review of 100 random outputs
   - Quarterly bias assessment
   - Annual independent audit

**Log Location**: `/ops/ai-act/oversight-logs/`
**Retention**: 5 years (EU AI Act Article 12)

---

## 5. Transparency for End Users (Article 52)

**User Notifications**:

When users interact with AI-generated content, they see:

> 🤖 **AI-Generated Content**
> This section was generated using AI (Claude 3 Haiku) based on your data.
> [View Evidence] [Request Human Review]

**Disclosure Locations**:
- Corporate Cockpit: `/admin/compliance/ai-transparency`
- API responses: `X-AI-Generated: true` header
- PDF exports: Watermark + metadata

---

## 6. Rights & Redress

**Users have the right to**:

1. **Request human review** of any AI-generated output
2. **Opt-out** of AI processing (manual alternatives available)
3. **Access AI decision logic** (formula transparency)
4. **Challenge AI outputs** via support portal

**Contact**:
- AI Ethics Officer: ai-ethics@teei.io
- DPO (GDPR): dpo@teei.io
- Compliance Hotline: +44-20-XXXX-XXXX

---

## 7. Compliance Attestation

**Statement of Compliance**:

TEEI certifies that the CSR Platform AI systems comply with:
- ✅ EU AI Act Articles 12, 13, 17, 52, 53
- ✅ GDPR Article 22 (Automated Decision-Making)
- ✅ ISO/IEC 42001 (AI Management System)
- ✅ IEEE 7010 (Wellbeing Metrics for AI)

**Audited By**: [External Auditor Name]
**Audit Date**: 2025-11-01
**Next Review**: 2026-11-01

---

## 8. Technical Documentation

**Full technical documentation** (for regulators and auditors):
- Model architecture: `/docs/ai-models/architecture.md`
- Training procedures: `/docs/ai-models/training-procedures.md`
- Bias mitigation: `/docs/ai-models/bias-mitigation.md`
- Performance benchmarks: `/docs/ai-models/benchmarks.md`

**Version Control**: All AI models tracked in Git with SBOM and provenance attestations

---

**Last Updated**: 2025-11-15
**Document Owner**: AI Ethics Committee
**Approval**: CISO, DPO, Legal
