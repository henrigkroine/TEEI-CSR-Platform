# AI Act Risk Log: TEEI CSR Platform

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Compliance Lead
**Review Frequency**: Quarterly
**Legal Framework**: EU AI Act (2024)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Legal Classification](#legal-classification)
3. [Risk Register](#risk-register)
4. [Monitoring & Review](#monitoring--review)
5. [Incident Response](#incident-response)
6. [Compliance Checklist](#compliance-checklist)

---

## Executive Summary

### Scope

This risk log documents AI Act compliance for the TEEI CSR Platform's AI systems:
- **Q2Q Classifier**: Large Language Model for feedback classification
- **SROI Calculator**: Algorithmic social value calculation (non-AI)
- **VIS Calculator**: Algorithmic volunteer scoring (non-AI)

### Overall Risk Classification

| System | AI Act Classification | Justification |
|--------|----------------------|---------------|
| **Q2Q Classifier** | **Limited Risk** | Transparency obligations apply (Article 52) |
| **SROI Calculator** | **Minimal Risk** | Deterministic formula, no AI |
| **VIS Calculator** | **Minimal Risk** | Deterministic formula, no AI |

**No High-Risk Systems Deployed**: Platform does not perform critical infrastructure assessment, law enforcement, biometric identification, or employment decisions.

### Key Findings

- ✅ No high-risk AI systems in scope
- ✅ Transparency requirements met for Q2Q classifier
- ⚠️ Human oversight required for Q2Q-based decisions
- ⚠️ Bias monitoring ongoing for demographic parity
- ⚠️ Data quality monitoring needed to prevent drift

---

## Legal Classification

### AI Act Risk Taxonomy

#### High-Risk AI Systems (Article 6)
**None deployed on TEEI platform.**

Excluded categories:
- ❌ Biometric identification (not used)
- ❌ Critical infrastructure management (not used)
- ❌ Education/vocational training access decisions (Q2Q is advisory only, not decisional)
- ❌ Employment decisions (VIS used for recognition, not hiring/firing)
- ❌ Law enforcement (not applicable)
- ❌ Migration/border control (not applicable)

#### Limited-Risk AI Systems (Article 52)
**Q2Q Classifier falls here.**

Transparency obligations:
- ✅ Users informed that AI is used (privacy policy, consent forms)
- ✅ Model limitations documented (model card)
- ✅ Human oversight in place (confidence thresholds, manual review)

#### Minimal-Risk AI Systems
**SROI and VIS calculators fall here.**

No specific obligations beyond general product safety.

### Justification for Q2Q as Limited-Risk

**Why not High-Risk?**
1. **Not used for access to education/training**: Q2Q classifies feedback for program improvement, not participant admission/progression
2. **Not used for employment decisions**: VIS is advisory for volunteer recognition, not hiring/termination
3. **Human oversight**: All consequential decisions require human review
4. **Advisory nature**: Q2Q outputs are one input among many for program decisions

**Why Limited-Risk?**
1. **Interacts with natural persons**: Classifies participant feedback
2. **Could influence decisions**: Program funding, resource allocation
3. **Transparency needed**: Stakeholders should know AI is used
4. **Compliance**: Article 52 transparency obligations apply

---

## Risk Register

### Risk #1: Bias in Outcome Classification

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier |
| **Risk ID** | AI-RISK-001 |
| **Risk Category** | Bias & Fairness |
| **AI Act Article** | Article 10 (Data Governance) |

#### Risk Description
Q2Q classifier may systematically underestimate or overestimate outcomes for certain demographic groups (e.g., non-English speakers, specific cultural backgrounds), leading to unfair representation of program impact.

#### Likelihood & Impact
- **Likelihood**: Medium (8% language parity gap observed)
- **Impact**: Medium (affects program evaluation, not individual decisions)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 10(2): Training data shall be relevant, representative, free of errors
- Article 10(3): Examination of possible biases
- Article 15: Accuracy, robustness, cybersecurity

#### Controls in Place
1. **Bias Testing**: Demographic parity metrics calculated quarterly
   - Language groups (en, no, uk, ar)
   - Feedback source types (Kintell, Buddy, Check-in)
   - Text length categories
2. **Calibration**: Per-language, per-dimension calibration
   - Separate thresholds for low-resource languages
   - Confidence discounting for non-English text
3. **Evaluation Sets**: Stratified by language and source type
4. **Monitoring**: Weekly drift detection (PSI, JS divergence)

#### Residual Risk
- **Likelihood**: Low (with controls)
- **Impact**: Medium
- **Residual Risk Score**: **Low-Medium**

#### Mitigation Roadmap
- [ ] Implement differential privacy for small-group statistics (Q2 2026)
- [ ] Develop bias correction factors for non-English languages (Q3 2026)
- [ ] Conduct external fairness audit (Q4 2026)

#### Monitoring
- **Metric**: Demographic parity gap (max difference in F1 scores)
- **Threshold**: ≤0.10 (10% difference)
- **Frequency**: Quarterly
- **Owner**: NLP Lead
- **Alert**: Automated alert if gap >0.12

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: Major model updates, new languages added, parity gap breach

---

### Risk #2: Privacy Breach (PII Leakage)

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier, Evidence Lineage |
| **Risk ID** | AI-RISK-002 |
| **Risk Category** | Privacy & Data Protection |
| **AI Act Article** | Article 10(5) (Personal Data Processing) |

#### Risk Description
Personal Identifiable Information (PII) from participant feedback may be exposed through:
1. Inadequate redaction before LLM classification
2. Evidence snippets displayed in dashboards
3. Audit logs or exports containing PII

#### Likelihood & Impact
- **Likelihood**: Low (99.8% redaction rate)
- **Impact**: High (GDPR violation, reputational damage)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 10(5): Processing of personal data shall comply with GDPR
- GDPR Article 32: Security of processing
- GDPR Article 33: Breach notification (<72 hours)

#### Controls in Place
1. **Server-Side Redaction**: All PII redacted before LLM API calls
   - Regex-based: emails, phones, credit cards, SSNs
   - NER-based: names, addresses
   - Redaction rate: 99.8% (measured on labeled test set)
2. **Evidence Snippet Redaction**: All snippets redacted before UI display
3. **No Raw Feedback to Frontend**: Only aggregated metrics exposed
4. **Field-Level Encryption**: PII encrypted at rest (AES-256-GCM)
5. **Access Controls**: RBAC enforced, tenant isolation

#### Residual Risk
- **Likelihood**: Very Low (with controls)
- **Impact**: High
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Implement server-side redaction (completed)
- [x] Add redaction unit tests (completed)
- [ ] Conduct penetration testing on redaction logic (Q1 2026)
- [ ] Implement automated PII detection in production logs (Q2 2026)

#### Monitoring
- **Metric**: PII detection in production logs
- **Threshold**: 0 instances per month
- **Frequency**: Daily automated scan
- **Owner**: Security Lead
- **Alert**: Immediate (critical severity)

#### Incident Response
If PII leak detected:
1. **Immediate**: Stop affected service (<15 minutes)
2. **Assess**: Determine scope and affected individuals (<4 hours)
3. **Notify**: DPO and supervisory authority (<72 hours if GDPR breach)
4. **Remediate**: Fix vulnerability, rotate keys, notify affected users
5. **Review**: Post-incident analysis, update controls

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: PII leak incident, redaction failure, regulatory changes

---

### Risk #3: Automated Decision-Making Without Human Oversight

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier (if misused) |
| **Risk ID** | AI-RISK-003 |
| **Risk Category** | Human Rights & Oversight |
| **AI Act Article** | Article 14 (Human Oversight) |

#### Risk Description
Consequential decisions (program funding, participant eligibility, volunteer termination) made solely based on Q2Q or VIS scores without human review, violating human oversight requirements.

#### Likelihood & Impact
- **Likelihood**: Low (human review policy in place)
- **Impact**: High (unfair decisions, legal liability)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 14: High-risk AI systems designed for human oversight
- GDPR Article 22: Right not to be subject to automated decision-making
- AI Act Article 52: Transparency for systems interacting with humans

#### Controls in Place
1. **Policy**: Written policy prohibits automated decisions without human review
2. **Confidence Thresholds**: Low-confidence Q2Q results (<0.70) flagged for manual review
3. **Audit Trail**: All decisions logged with responsible human actor
4. **Training**: Staff trained on appropriate AI use and limitations
5. **Appeal Process**: Participants and volunteers can appeal AI-informed decisions

#### Residual Risk
- **Likelihood**: Very Low (with controls)
- **Impact**: High
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Document human oversight policy (completed)
- [ ] Implement technical controls preventing auto-decisions (Q1 2026)
- [ ] Conduct user training on AI ethics (Q2 2026)
- [ ] Establish independent ethics review board (Q3 2026)

#### Monitoring
- **Metric**: % decisions with documented human review
- **Threshold**: 100%
- **Frequency**: Monthly audit
- **Owner**: Compliance Lead
- **Alert**: Manual alert if <95%

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: Policy violations, regulatory guidance updates

---

### Risk #4: Model Drift & Performance Degradation

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier |
| **Risk ID** | AI-RISK-004 |
| **Risk Category** | Technical Robustness |
| **AI Act Article** | Article 15 (Accuracy, Robustness) |

#### Risk Description
Q2Q model performance degrades over time due to:
- Input distribution shift (new participant populations, seasonal programs)
- Concept drift (evolving language, program changes)
- Training data staleness (LLM provider updates)

Leading to inaccurate outcome classifications.

#### Likelihood & Impact
- **Likelihood**: Medium (drift detected in 15% of monitoring periods)
- **Impact**: Medium (reduced classification accuracy)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 15(1): AI systems shall achieve appropriate accuracy, robustness
- Article 15(3): Systems shall be resilient against errors, faults
- Article 61: Post-market monitoring obligations

#### Controls in Place
1. **Drift Detection**: Weekly PSI and JS divergence calculations
   - PSI threshold: 0.2 (alert if exceeded)
   - JS threshold: 0.1 (alert if exceeded)
2. **Performance Monitoring**: Monthly F1 score tracking per language/dimension
3. **Model Registry**: Version control for all Q2Q model configurations
4. **Rollback Capability**: One-click rollback to previous model version
5. **Evaluation Harness**: Automated re-evaluation on held-out test set

#### Residual Risk
- **Likelihood**: Low (with monitoring)
- **Impact**: Medium
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Implement drift detection (completed)
- [x] Implement model registry (completed)
- [ ] Automate retraining triggers when drift detected (Q2 2026)
- [ ] Expand test set to 2000+ samples per language (Q3 2026)

#### Monitoring
- **Metric**: PSI score, JS divergence, F1 score
- **Threshold**: PSI >0.2, JS >0.1, F1 drop >10%
- **Frequency**: Weekly (drift), Monthly (F1)
- **Owner**: NLP Lead
- **Alert**: Automated alert on threshold breach

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: Drift alert, F1 degradation, major input shift

---

### Risk #5: Misuse for Surveillance or Discrimination

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier, VIS Calculator |
| **Risk ID** | AI-RISK-005 |
| **Risk Category** | Misuse & Abuse |
| **AI Act Article** | Article 5 (Prohibited AI Practices) |

#### Risk Description
System misused for purposes outside intended use:
- Surveillance of participants or volunteers
- Discriminatory profiling (e.g., blacklisting based on VIS score)
- Unauthorized data sharing with third parties (e.g., law enforcement, immigration)

#### Likelihood & Impact
- **Likelihood**: Very Low (access controls, audit logs)
- **Impact**: Very High (human rights violations, legal liability)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 5: Prohibited AI practices (social scoring, real-time biometric identification)
- GDPR Article 6: Lawful basis for processing
- GDPR Article 9: Special categories of personal data

#### Controls in Place
1. **Access Controls**: RBAC limits who can access participant/volunteer data
2. **Purpose Limitation**: GDPR policy restricts data use to stated purposes
3. **Audit Logging**: All data access logged with actor, timestamp, justification
4. **Legal Review**: Terms of service prohibit misuse
5. **Ethical Guidelines**: Published acceptable use policy

#### Residual Risk
- **Likelihood**: Very Low (with controls)
- **Impact**: Very High
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Implement RBAC and audit logging (completed)
- [ ] Publish acceptable use policy (Q1 2026)
- [ ] Conduct ethics training for all users (Q2 2026)
- [ ] Implement automated anomaly detection for misuse (Q3 2026)

#### Monitoring
- **Metric**: Audit log review for unusual access patterns
- **Threshold**: 0 confirmed misuse cases per quarter
- **Frequency**: Monthly audit log review
- **Owner**: Compliance Lead
- **Alert**: Manual investigation on suspicious activity

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: Misuse incident, regulatory enforcement actions

---

### Risk #6: Third-Party LLM Provider Vulnerabilities

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier (Claude/OpenAI/Gemini) |
| **Risk ID** | AI-RISK-006 |
| **Risk Category** | Supply Chain & Cybersecurity |
| **AI Act Article** | Article 15(4) (Cybersecurity) |

#### Risk Description
Vulnerabilities in third-party LLM providers:
- Provider data breach exposing TEEI feedback data
- Provider service outage disrupting Q2Q classification
- Provider model poisoning or adversarial attacks
- Provider terms of service changes restricting usage

#### Likelihood & Impact
- **Likelihood**: Low (reputable providers with SOC 2 compliance)
- **Impact**: High (data breach, service disruption)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 15(4): Resilience against cyberattacks
- Article 28: Obligations on providers of AI systems
- GDPR Article 28: Processor agreements

#### Controls in Place
1. **Multi-Provider Strategy**: Support for Claude, OpenAI, Gemini (failover capability)
2. **Data Minimization**: Only redacted feedback sent to LLM providers
3. **Provider Agreements**: Data Processing Agreements (DPAs) with all providers
4. **No Training on TEEI Data**: Opt-out of LLM training on TEEI inputs
5. **Local Fallback**: Rule-based classifier as backup if all LLMs unavailable

#### Residual Risk
- **Likelihood**: Very Low (with diversification)
- **Impact**: Medium (temporary service disruption)
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Implement multi-provider support (completed)
- [x] Sign DPAs with providers (completed)
- [ ] Implement automated provider health checks (Q1 2026)
- [ ] Evaluate on-premises LLM deployment (Q4 2026)

#### Monitoring
- **Metric**: Provider uptime, error rates
- **Threshold**: 99.5% uptime, <1% error rate
- **Frequency**: Real-time monitoring
- **Owner**: DevOps Lead
- **Alert**: Automated alert on downtime or error spike

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: Provider incidents, contract renewals, new providers added

---

### Risk #7: Inadequate Training Data Representativeness

| Attribute | Value |
|-----------|-------|
| **System** | Q2Q Classifier |
| **Risk ID** | AI-RISK-007 |
| **Risk Category** | Data Quality & Governance |
| **AI Act Article** | Article 10 (Data Governance) |

#### Risk Description
Q2Q evaluation data not representative of production population:
- Over-representation of English feedback
- Under-representation of low-resource languages (Arabic, Ukrainian)
- Lack of diversity in feedback sources (Kintell vs. free-text)
- Temporal bias (training on recent data only)

Leading to poor performance on underrepresented groups.

#### Likelihood & Impact
- **Likelihood**: Medium (observed language imbalance)
- **Impact**: Medium (reduced accuracy for minorities)
- **Risk Score**: **Medium** (Likelihood × Impact)

#### Legal Obligations
- Article 10(2)(d): Training data relevant, representative, free of errors
- Article 10(3): Examination of possible biases
- Article 61(3): Post-market monitoring of performance

#### Controls in Place
1. **Stratified Evaluation Sets**: Balanced by language, source, length
2. **Per-Group Performance**: Separate F1 scores for each language
3. **Data Collection Plan**: Target balanced representation
4. **Annotation Quality**: Inter-annotator agreement >90%
5. **Regular Refresh**: Evaluation set updated quarterly

#### Residual Risk
- **Likelihood**: Low (with balanced sets)
- **Impact**: Medium
- **Residual Risk Score**: **Low**

#### Mitigation Roadmap
- [x] Create stratified evaluation sets (completed)
- [ ] Expand Arabic and Ukrainian test sets to 500+ samples (Q2 2026)
- [ ] Implement active learning for underrepresented groups (Q3 2026)
- [ ] Partner with community organizations for diverse feedback (Q4 2026)

#### Monitoring
- **Metric**: Evaluation set composition (% per language, source, length)
- **Threshold**: Each group ≥15% of total samples
- **Frequency**: Quarterly
- **Owner**: NLP Lead
- **Alert**: Manual review if imbalance detected

#### Review Schedule
- **Next Review**: 2026-02-15
- **Trigger Reviews**: New language added, significant population shift

---

## Monitoring & Review

### Continuous Monitoring

| Risk ID | Metric | Threshold | Frequency | Owner | Alert Channel |
|---------|--------|-----------|-----------|-------|---------------|
| AI-RISK-001 | Demographic parity gap | ≤0.10 | Quarterly | NLP Lead | Email + Dashboard |
| AI-RISK-002 | PII detection | 0 instances | Daily | Security Lead | PagerDuty (critical) |
| AI-RISK-003 | % decisions with human review | 100% | Monthly | Compliance Lead | Email |
| AI-RISK-004 | PSI/JS drift | PSI≤0.2, JS≤0.1 | Weekly | NLP Lead | Email + Dashboard |
| AI-RISK-005 | Misuse incidents | 0 per quarter | Monthly | Compliance Lead | Email |
| AI-RISK-006 | Provider uptime | 99.5% | Real-time | DevOps Lead | PagerDuty |
| AI-RISK-007 | Data representativeness | ≥15% per group | Quarterly | NLP Lead | Email |

### Quarterly Risk Review

**Process**:
1. **Gather Metrics**: Automated data collection from monitoring dashboards
2. **Review Residual Risks**: Assess if controls are effective
3. **Identify New Risks**: Emerging threats, regulatory changes
4. **Update Mitigation Plans**: Adjust roadmaps based on priority
5. **Report to Stakeholders**: Executive summary to leadership

**Next Quarterly Review**: 2026-02-15

### Annual Comprehensive Audit

**Scope**:
- All AI systems (Q2Q, SROI, VIS)
- All risk categories
- External fairness audit
- Regulatory compliance check (AI Act, GDPR, CCPA)

**Next Annual Audit**: 2026-11-15

### Trigger-Based Reviews

Reviews conducted immediately upon:
- **Incident**: PII leak, misuse, discrimination complaint
- **Drift Alert**: Sustained drift for >30 days
- **Regulatory Change**: New AI Act guidance, enforcement actions
- **Model Update**: Major version change, new provider added
- **Stakeholder Request**: User complaint, audit finding

---

## Incident Response

### Incident Classification

| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| **Critical** | PII leak, discrimination, misuse | <1 hour | CEO, DPO, Legal |
| **High** | Drift alert unresolved, provider breach | <4 hours | CTO, Compliance Lead |
| **Medium** | Parity gap breach, performance degradation | <24 hours | NLP Lead |
| **Low** | Minor configuration issue | <72 hours | Engineering Team |

### Incident Response Plan

#### Phase 1: Detection (<1 hour)
- Automated monitoring alerts
- Manual reports (user complaints, audits)
- Security scans (penetration tests, log reviews)

#### Phase 2: Containment (<4 hours)
- **Critical**: Immediately disable affected system
- **High**: Rollback to previous model version
- **Medium**: Flag for manual review
- **Low**: Log issue for next sprint

#### Phase 3: Assessment (<24 hours)
- Determine scope (# affected users, data types)
- Identify root cause (code bug, configuration error, misuse)
- Assess legal obligations (GDPR breach notification?)

#### Phase 4: Remediation (<72 hours)
- Fix vulnerability
- Notify affected users (if required)
- Update controls to prevent recurrence
- Document lessons learned

#### Phase 5: Review (<30 days)
- Post-incident analysis
- Update risk register
- Adjust monitoring thresholds
- Conduct training if needed

### Incident Log

All incidents documented in `/docs/compliance/incident_log.csv` with:
- Date, severity, risk ID
- Description, root cause
- Remediation actions, responsible party
- Follow-up items, closure date

---

## Compliance Checklist

### AI Act Compliance

| Article | Requirement | Status | Evidence |
|---------|-------------|--------|----------|
| **Article 5** | No prohibited AI practices | ✅ Compliant | Risk #5 controls |
| **Article 10** | Data governance | ✅ Compliant | Stratified eval sets, bias testing |
| **Article 11** | Technical documentation | ✅ Compliant | Model cards, architecture docs |
| **Article 12** | Record-keeping | ✅ Compliant | Audit logs, model registry |
| **Article 13** | Transparency & information | ✅ Compliant | Privacy policy, consent forms |
| **Article 14** | Human oversight | ✅ Compliant | Risk #3 controls |
| **Article 15** | Accuracy & robustness | ✅ Compliant | Drift monitoring, performance tracking |
| **Article 52** | Transparency for users | ✅ Compliant | AI disclosure in UI, docs |
| **Article 61** | Post-market monitoring | ✅ Compliant | Weekly drift, quarterly reviews |

### GDPR Compliance

| Article | Requirement | Status | Evidence |
|---------|-------------|--------|----------|
| **Article 6** | Lawful basis | ✅ Compliant | Consent, contract, legitimate interest |
| **Article 9** | Special categories | ⚠️ N/A | No special category data processed |
| **Article 22** | Automated decisions | ✅ Compliant | Risk #3 human oversight |
| **Article 25** | Privacy by design | ✅ Compliant | Server-side redaction, encryption |
| **Article 28** | Processor agreements | ✅ Compliant | DPAs with LLM providers |
| **Article 32** | Security measures | ✅ Compliant | Encryption, RBAC, audit logs |
| **Article 33** | Breach notification | ✅ Compliant | Incident response plan (<72 hours) |

### Outstanding Actions

- [ ] Publish acceptable use policy (Q1 2026)
- [ ] Conduct external fairness audit (Q4 2026)
- [ ] Implement automated anomaly detection (Q3 2026)
- [ ] Expand test sets for low-resource languages (Q2 2026)
- [ ] Establish independent ethics review board (Q3 2026)

---

## Appendices

### Appendix A: Risk Assessment Matrix

| Likelihood | Impact: Low | Impact: Medium | Impact: High | Impact: Very High |
|------------|-------------|----------------|--------------|-------------------|
| **Very High** | Medium | High | Critical | Critical |
| **High** | Medium | High | High | Critical |
| **Medium** | Low | Medium | Medium | High |
| **Low** | Low | Low | Medium | Medium |
| **Very Low** | Low | Low | Low | Medium |

### Appendix B: Regulatory References

- **EU AI Act (2024)**: Regulation (EU) 2024/XXX on Artificial Intelligence
- **GDPR (2016)**: Regulation (EU) 2016/679 on Data Protection
- **AI Act Implementing Acts**: Commission guidelines (ongoing)
- **ISO/IEC 23894**: Information technology - AI - Risk management

### Appendix C: Contact Information

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **Compliance Lead** | [Name] | compliance@teei.com | [Phone] |
| **Data Protection Officer** | [Name] | dpo@teei.com | [Phone] |
| **NLP Lead** | [Name] | nlp-lead@teei.com | [Phone] |
| **Security Lead** | [Name] | security@teei.com | [Phone] |

---

**Document Status**: ✅ Complete
**Last Reviewed**: 2025-11-15
**Next Review**: 2026-02-15
**Maintained By**: Compliance Lead
**Contact**: compliance@teei.com
