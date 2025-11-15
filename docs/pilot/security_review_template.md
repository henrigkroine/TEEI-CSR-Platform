# Security Review Template - TEEI CSR Platform

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Worker 1 - DPIA Writer & Security Team
**Audience**: Tenant Security Officers, Compliance Teams, Legal Counsel

---

## Table of Contents

1. [Overview](#overview)
2. [Data Protection Impact Assessment (DPIA)](#data-protection-impact-assessment-dpia)
3. [Data Processing Agreement (DPA)](#data-processing-agreement-dpa)
4. [Security Questionnaire](#security-questionnaire)
5. [Compliance Checklist](#compliance-checklist)
6. [Evidence Collection Requirements](#evidence-collection-requirements)

---

## Overview

This document provides templates for security and compliance documentation required for TEEI CSR Platform tenant onboarding. All sections must be completed and approved before go-live.

### Required Approvals

| Document | Tenant Approver | TEEI Approver | Timeline |
|----------|----------------|---------------|----------|
| DPIA | Security/Compliance Officer | DPO | Day 2 |
| DPA | Legal Counsel | Legal Counsel | Day 3 |
| Security Questionnaire | IT Security Lead | Security Architect | Day 2 |
| Compliance Checklist | Compliance Officer | Compliance Lead | Day 5 |

### Document Storage

- **Tenant Copy**: Secure internal document repository
- **TEEI Copy**: Encrypted storage in compliance archive
- **Retention**: 7 years after contract termination (legal requirement)

---

## Data Protection Impact Assessment (DPIA)

**Reference**: GDPR Article 35
**Requirement**: Mandatory for high-risk processing activities
**Frequency**: Initial onboarding + annually + when processing changes

---

### DPIA Template

#### Section 1: Processing Activity Overview

**1.1 Basic Information**

```yaml
Company Name: ____________________________________
Company ID: ____________________________________
Assessment Date: ____________________________________
Prepared By: ____________________________________ (Name, Title)
Reviewed By: ____________________________________ (Name, Title)
Approved By: ____________________________________ (Name, Title, Signature, Date)
```

**1.2 Description of Processing**

**What personal data will be processed?**

- [ ] Employee identification data (name, email, employee ID)
- [ ] Contact information (phone, address)
- [ ] Demographic data (date of birth, nationality)
- [ ] Program participation data (enrollments, completions, feedback)
- [ ] Authentication data (SSO attributes, login times)
- [ ] Volunteer activity data (matches, check-ins, hours logged)
- [ ] Other: _______________________________

**Purpose of processing:**

CSR program management, mentorship tracking, impact measurement, reporting

**Legal basis for processing** (select all that apply):

- [ ] Consent (GDPR Article 6(1)(a))
- [ ] Contract (GDPR Article 6(1)(b))
- [ ] Legal obligation (GDPR Article 6(1)(c))
- [ ] Legitimate interest (GDPR Article 6(1)(f))

**Special categories of personal data** (GDPR Article 9):

- [ ] None
- [ ] Racial/ethnic origin
- [ ] Political opinions
- [ ] Religious beliefs
- [ ] Trade union membership
- [ ] Genetic data
- [ ] Biometric data
- [ ] Health data
- [ ] Sexual orientation

If special categories selected, legal basis: _______________________________

---

#### Section 2: Data Flow Mapping

**2.1 Data Sources**

Where does personal data come from?

- [ ] Identity Provider (IdP) via SSO/SCIM
  - Provider: Azure AD / Okta / Google Workspace / OneLogin / Other: ___________
- [ ] Direct user input (profile updates)
- [ ] Program administrators (manual enrollments)
- [ ] Integration partners (Benevity, Goodera, Workday)
- [ ] Other: _______________________________

**2.2 Data Recipients**

Who has access to personal data?

| Recipient Category | Access Level | Purpose | Location |
|-------------------|--------------|---------|----------|
| TEEI Platform (controller) | Full | Service delivery | EU/US (specify) |
| Company Admins | Tenant-scoped | User management | __________ |
| Company Managers | Limited | Reporting | __________ |
| Sub-processors (list below) | Limited | Infrastructure | __________ |

**Sub-processors:**

| Name | Service | Data Accessed | Location | DPA Signed |
|------|---------|---------------|----------|------------|
| AWS | Infrastructure | All | US/EU | ☐ Yes ☐ No |
| Google Cloud | Infrastructure | All | US/EU | ☐ Yes ☐ No |
| SendGrid | Email delivery | Email addresses | US | ☐ Yes ☐ No |
| DataDog | Monitoring | Logs (pseudonymized) | US | ☐ Yes ☐ No |
| ________ | ________ | ________ | ________ | ☐ Yes ☐ No |

**2.3 International Data Transfers**

Will personal data be transferred outside the EU/EEA?

- [ ] No
- [ ] Yes → Complete below:

| Destination Country | Safeguard Mechanism | Date Implemented |
|---------------------|---------------------|------------------|
| United States | Standard Contractual Clauses (SCCs) | __________ |
| _____________ | __________________________________ | __________ |

**Transfer Impact Assessment (TIA) completed?**
- [ ] Yes (attach TIA document)
- [ ] No (required if transferring to non-adequate countries)

---

#### Section 3: Necessity and Proportionality

**3.1 Necessity Assessment**

**Is the data processing necessary to achieve the stated purpose?**

- [ ] Yes
- [ ] No (if no, do not proceed)

**Justification:**

_The processing is necessary to deliver the CSR platform service, manage program enrollments, track participant progress, measure impact, and fulfill reporting obligations to stakeholders._

**Could the purpose be achieved with less data or less intrusive processing?**

- [ ] No, current data collection is minimal
- [ ] Yes, could be reduced (explain): _______________________________

**3.2 Proportionality Assessment**

**Data minimization measures:**

- [ ] Only collect data explicitly required for service delivery
- [ ] Pseudonymization used where possible (external ID mappings)
- [ ] Anonymization applied to reporting/analytics data
- [ ] Retention periods defined and enforced

**Retention periods:**

| Data Category | Retention Period | Justification |
|---------------|------------------|---------------|
| User profiles | 7 years post-deletion | Legal obligation (tax, employment law) |
| Encrypted PII | 2 years post-program | Contract fulfillment |
| Program activities | 5 years | Reporting, analytics (legitimate interest) |
| Audit logs (security) | 2 years | Legal obligation, security |
| Session logs | 90 days | Legitimate interest (fraud prevention) |

---

#### Section 4: Risk Assessment

**4.1 Risks to Data Subjects**

For each risk, rate **Likelihood** (Low/Medium/High) and **Impact** (Low/Medium/High):

| Risk | Likelihood | Impact | Risk Level |
|------|------------|--------|------------|
| Unauthorized access to personal data | Low | High | Medium |
| Data breach / exfiltration | Low | High | Medium |
| Loss of data due to system failure | Low | Medium | Low |
| Inaccurate or incomplete data | Medium | Low | Low |
| Excessive data retention | Low | Medium | Low |
| Lack of transparency to data subjects | Low | Medium | Low |
| Inability to exercise data subject rights | Low | High | Medium |
| Unauthorized international data transfer | Low | High | Medium |
| Function creep (data used for unintended purposes) | Low | Medium | Low |
| Identity theft or fraud | Low | High | Medium |

**Risk Level Calculation**: Likelihood × Impact
- Low × Low = Low
- Low × Medium = Low
- Low × High = Medium
- Medium × Medium = Medium
- Medium × High = High
- High × High = Critical

---

#### Section 5: Mitigation Measures

**5.1 Technical Safeguards**

| Risk | Mitigation Measure | Status | Responsible Party |
|------|-------------------|--------|-------------------|
| Unauthorized access | AES-256-GCM encryption at rest | ✅ Implemented | TEEI Engineering |
| Unauthorized access | TLS 1.3 encryption in transit | ✅ Implemented | TEEI Engineering |
| Unauthorized access | Role-based access control (RBAC) | ✅ Implemented | TEEI Engineering |
| Unauthorized access | Multi-tenant isolation enforcement | ✅ Implemented | TEEI Engineering |
| Data breach | Intrusion detection system (IDS) | ✅ Implemented | TEEI Security |
| Data breach | Automated vulnerability scanning | ✅ Implemented | TEEI Security |
| Data breach | Annual penetration testing | ✅ Implemented | TEEI Security |
| Data loss | Automated daily backups (encrypted) | ✅ Implemented | TEEI Operations |
| Data loss | Point-in-time recovery capability | ✅ Implemented | TEEI Operations |
| Inaccurate data | User self-service profile updates | ✅ Implemented | TEEI Engineering |
| Inaccurate data | SCIM sync for IdP changes | ✅ Implemented | TEEI Engineering |
| Excessive retention | Automated data deletion (retention policies) | ✅ Implemented | TEEI Engineering |
| Data subject rights | Privacy API endpoints (export, delete) | ✅ Implemented | TEEI Engineering |
| Unauthorized transfer | Standard Contractual Clauses (SCCs) with sub-processors | ✅ Implemented | TEEI Legal |

**5.2 Organizational Safeguards**

| Measure | Description | Status | Evidence |
|---------|-------------|--------|----------|
| Privacy by Design | Privacy requirements in software development lifecycle | ✅ Implemented | Design docs |
| Staff Training | Annual data protection training for all staff | ✅ Implemented | Training records |
| Confidentiality Agreements | All staff sign NDAs and confidentiality clauses | ✅ Implemented | HR records |
| Access Control Policy | Principle of least privilege enforced | ✅ Implemented | Policy doc |
| Incident Response Plan | Breach notification procedures documented | ✅ Implemented | IRP doc |
| Data Protection Officer | DPO appointed and contactable | ✅ Implemented | Contact: dpo@teei.com |
| Audit Logging | All data access logged and monitored | ✅ Implemented | Audit logs |
| Vendor Management | Sub-processor due diligence and DPAs | ✅ Implemented | Vendor registry |

**5.3 Residual Risks**

After mitigation, any remaining risks?

- [ ] No residual risks
- [ ] Yes, residual risks remain (describe below):

| Residual Risk | Risk Level | Acceptance Rationale |
|---------------|------------|----------------------|
| ___________ | Low/Medium | ____________________ |

**Approved by Data Protection Officer:**

Signature: ____________________________ Date: __________

---

#### Section 6: Consultation and Approval

**6.1 Stakeholder Consultation**

| Stakeholder | Consulted? | Feedback Summary |
|-------------|------------|------------------|
| Data subjects (employees) | ☐ Yes ☐ No | ________________ |
| IT Security | ☐ Yes ☐ No | ________________ |
| Legal Counsel | ☐ Yes ☐ No | ________________ |
| Works Council / Employee Representatives | ☐ Yes ☐ No | ________________ |
| Data Protection Officer | ☐ Yes ☐ No | ________________ |

**6.2 Supervisory Authority Consultation**

Is prior consultation with supervisory authority required?

- [ ] No (residual risk is low)
- [ ] Yes (high residual risk after mitigation)

If yes, consultation status:
- [ ] Submitted to authority on: __________
- [ ] Authority response received on: __________
- [ ] Authority feedback addressed: ☐ Yes ☐ No

**6.3 Final Approval**

**This DPIA is approved for implementation:**

| Name | Title | Signature | Date |
|------|-------|-----------|------|
| ________________ | Data Protection Officer | _____________ | ______ |
| ________________ | Security Officer | _____________ | ______ |
| ________________ | Legal Counsel | _____________ | ______ |

**Next Review Date**: __________ (annual or upon significant processing change)

---

## Data Processing Agreement (DPA)

**Reference**: GDPR Article 28
**Parties**: Tenant (Data Controller) and TEEI (Data Processor)
**Requirement**: Mandatory before processing begins

---

### DPA Template

**This Data Processing Agreement ("DPA") is entered into between:**

**CONTROLLER** (the "Controller"):
```
Legal Entity Name: _________________________________
Registered Address: _________________________________
                    _________________________________
Company Number: _________________________________
Contact Person: _________________________________
Email: _________________________________
Phone: _________________________________
```

**PROCESSOR** (the "Processor"):
```
Legal Entity Name: TEEI Platform Services Ltd.
Registered Address: [TEEI Address]
Company Number: [TEEI Company Number]
Contact Person: Data Protection Officer
Email: dpo@teei.com
Phone: +1-XXX-XXX-XXXX
```

**Effective Date**: __________________

---

#### 1. Definitions

**1.1** "Personal Data" means any information relating to an identified or identifiable natural person processed under this Agreement.

**1.2** "Processing" has the meaning given in GDPR Article 4(2).

**1.3** "Data Subject" means the individual to whom Personal Data relates.

**1.4** "GDPR" means Regulation (EU) 2016/679.

**1.5** "Supervisory Authority" means the relevant data protection authority.

**1.6** "Sub-processor" means any processor engaged by TEEI to process Personal Data.

---

#### 2. Scope and Purpose of Processing

**2.1 Subject Matter of Processing**

CSR program management platform services, including user authentication, program enrollment, mentorship matching, training tracking, impact measurement, and reporting.

**2.2 Duration of Processing**

From the Effective Date until termination of the Service Agreement, plus retention period as specified in Annex A.

**2.3 Nature of Processing**

- Collection
- Storage
- Organization
- Structuring
- Retrieval
- Consultation
- Use
- Disclosure by transmission
- Erasure or destruction

**2.4 Categories of Data Subjects**

- Company employees
- Program participants
- Volunteers and mentors
- Company administrators

**2.5 Categories of Personal Data**

See **Annex A: Data Processing Details**

---

#### 3. Processor Obligations

**3.1 Lawful Processing**

The Processor shall process Personal Data only on documented instructions from the Controller, including with regard to transfers of Personal Data to third countries or international organizations, unless required to do so by EU or Member State law.

**3.2 Confidentiality**

The Processor shall ensure that persons authorized to process Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

**3.3 Security Measures**

The Processor shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, as detailed in **Annex B: Security Measures**.

**3.4 Sub-processors**

The Controller provides general authorization for the Processor to engage sub-processors from the list in **Annex C: Sub-processors**. The Processor shall:
- Inform the Controller of any intended changes (additions/replacements)
- Provide 30 days' notice before engaging new sub-processors
- Allow Controller to object on reasonable grounds
- Impose same data protection obligations on sub-processors

**3.5 Data Subject Rights**

The Processor shall assist the Controller in responding to requests from Data Subjects to exercise their rights under GDPR, including:
- Right of access (Article 15)
- Right to rectification (Article 16)
- Right to erasure (Article 17)
- Right to restriction (Article 18)
- Right to data portability (Article 20)
- Right to object (Article 21)

**3.6 Assistance to Controller**

The Processor shall assist the Controller in:
- Ensuring compliance with security obligations (Article 32)
- Conducting Data Protection Impact Assessments (Article 35)
- Prior consultation with supervisory authority (Article 36)

**3.7 Data Breach Notification**

The Processor shall notify the Controller without undue delay (and in any event within 24 hours) of becoming aware of a personal data breach.

**3.8 Return or Deletion of Data**

At the choice of the Controller, the Processor shall delete or return all Personal Data after the end of provision of services, and delete existing copies unless EU or Member State law requires storage.

**3.9 Audits**

The Processor shall make available to the Controller all information necessary to demonstrate compliance with Article 28 GDPR and allow for and contribute to audits, including inspections, conducted by the Controller or an auditor mandated by the Controller.

---

#### 4. Controller Obligations

**4.1** The Controller warrants that it has all necessary rights and legal bases to disclose Personal Data to the Processor for processing.

**4.2** The Controller shall provide clear, documented instructions to the Processor regarding processing activities.

**4.3** The Controller shall promptly notify the Processor of any changes to required processing activities.

---

#### 5. Liability and Indemnity

**5.1** Each party's liability under this DPA shall be subject to the limitation of liability provisions in the Service Agreement.

**5.2** The Processor shall indemnify the Controller against any losses, damages, costs, or expenses arising from the Processor's breach of this DPA.

---

#### 6. Term and Termination

**6.1** This DPA shall commence on the Effective Date and continue until the termination of the Service Agreement.

**6.2** Upon termination, the Processor shall delete or return all Personal Data in accordance with Section 3.8.

---

#### 7. Governing Law

This DPA shall be governed by and construed in accordance with the laws of:

- [ ] England and Wales
- [ ] Ireland
- [ ] Germany
- [ ] Norway
- [ ] Other: __________

---

#### 8. Signatures

**CONTROLLER:**

Name: __________________________
Title: __________________________
Signature: __________________________
Date: __________________________

**PROCESSOR (TEEI):**

Name: __________________________
Title: Data Protection Officer
Signature: __________________________
Date: __________________________

---

### Annex A: Data Processing Details

#### Categories of Personal Data

| Category | Data Fields | Purpose | Retention Period |
|----------|-------------|---------|------------------|
| Identification | Name, email, employee ID | User authentication, contact | 7 years post-deletion |
| Contact | Phone, address, emergency contact | Communication, safety | 2 years post-program |
| Demographic | Date of birth, nationality | Program eligibility, reporting | 2 years post-program |
| Authentication | SSO attributes, IP address, login timestamps | Security, access control | 90 days |
| Program Activity | Enrollments, completions, matches, check-ins | Service delivery, impact measurement | 5 years |
| Feedback | Survey responses, comments | Service improvement | 5 years (anonymized) |

#### Legal Basis

- **Contract** (GDPR Article 6(1)(b)): Program enrollment and service delivery
- **Consent** (GDPR Article 6(1)(a)): Marketing communications
- **Legitimate Interest** (GDPR Article 6(1)(f)): Security monitoring, service improvement

---

### Annex B: Security Measures

#### Technical Measures

| Measure | Implementation |
|---------|----------------|
| Encryption at rest | AES-256-GCM for PII fields |
| Encryption in transit | TLS 1.3 for all connections |
| Access control | Role-based access control (RBAC), multi-tenant isolation |
| Authentication | SSO (SAML/OIDC), RS256 JWT tokens |
| Pseudonymization | Surrogate keys, external ID mappings |
| Logging | Immutable audit logs for all data access |
| Backup | Daily encrypted backups, 30-day retention |
| Vulnerability Management | Automated scanning, annual penetration testing |
| Network Security | Firewall, IDS/IPS, DDoS protection |

#### Organizational Measures

| Measure | Implementation |
|---------|----------------|
| Privacy by Design | Privacy requirements in SDLC |
| Staff Training | Annual data protection training |
| Access Control Policy | Least privilege, regular access reviews |
| Incident Response | Documented breach notification procedures (< 24 hours to Controller) |
| Data Protection Officer | Appointed and contactable (dpo@teei.com) |
| Vendor Management | Sub-processor due diligence and DPAs |
| Compliance Audits | Annual SOC 2 Type II, ISO 27001 certification |

---

### Annex C: Sub-processors

| Sub-processor | Service | Personal Data Accessed | Location | DPA in Place |
|---------------|---------|------------------------|----------|--------------|
| Amazon Web Services (AWS) | Cloud infrastructure | All | EU (Frankfurt) / US | Yes |
| Google Cloud Platform | Cloud infrastructure | All | EU / US | Yes |
| SendGrid (Twilio) | Email delivery | Email addresses, names | US | Yes |
| DataDog | Application monitoring | Logs (pseudonymized IPs, user IDs) | US | Yes |

**Sub-processor Change Process:**
1. TEEI notifies Controller 30 days in advance
2. Controller may object on reasonable data protection grounds within 14 days
3. If Controller objects, parties negotiate in good faith
4. If no resolution, Controller may terminate Service Agreement

---

## Security Questionnaire

**Purpose**: Assess TEEI platform security posture and compliance
**Audience**: Tenant IT Security, InfoSec, Risk Management teams
**Completion**: By TEEI Security Architect

---

### Section 1: Organizational Security

**1.1 Security Certifications**

Which security certifications does TEEI hold?

- [x] SOC 2 Type II (latest report date: __________)
- [x] ISO 27001:2013 (certificate expiry: __________)
- [ ] ISO 27017 (Cloud Security)
- [ ] ISO 27018 (Cloud Privacy)
- [ ] PCI DSS
- [ ] FedRAMP
- [ ] Other: __________

**Can audit reports be shared with customers?**
- [x] Yes, under NDA
- [ ] No

**1.2 Security Policies**

Does TEEI maintain the following security policies?

- [x] Information Security Policy
- [x] Access Control Policy
- [x] Incident Response Policy
- [x] Business Continuity/Disaster Recovery Policy
- [x] Data Retention and Disposal Policy
- [x] Vulnerability Management Policy
- [x] Secure Development Lifecycle Policy
- [x] Third-Party Risk Management Policy

**1.3 Security Organization**

- **Chief Information Security Officer (CISO)**: ☐ Yes ☐ No
- **Dedicated Security Team**: ☐ Yes ☐ No (size: ____ FTEs)
- **Security Steering Committee**: ☐ Yes ☐ No
- **Data Protection Officer (DPO)**: ☐ Yes ☐ No (contact: dpo@teei.com)

---

### Section 2: Infrastructure Security

**2.1 Cloud Infrastructure**

**Primary cloud provider(s):**
- [x] AWS (regions: EU-West-1, US-East-1)
- [ ] Google Cloud Platform (regions: __________)
- [ ] Microsoft Azure (regions: __________)
- [ ] Other: __________

**Infrastructure-as-Code (IaC) used?**
- [x] Yes (tool: Terraform / CloudFormation)
- [ ] No

**2.2 Network Security**

- **Firewall**: ☐ Yes ☐ No (vendor: __________)
- **Intrusion Detection/Prevention (IDS/IPS)**: ☐ Yes ☐ No
- **DDoS Protection**: ☐ Yes ☐ No (vendor: Cloudflare / AWS Shield)
- **Web Application Firewall (WAF)**: ☐ Yes ☐ No
- **VPN for remote access**: ☐ Yes ☐ No
- **Network segmentation**: ☐ Yes ☐ No (describe: __________)

**2.3 Data Centers**

**Physical data center security (if self-hosted):**
- [ ] Not applicable (cloud-only)
- [ ] Physical access controls (biometrics, badge)
- [ ] 24/7 security personnel
- [ ] CCTV monitoring
- [ ] Environmental controls (fire suppression, HVAC)

---

### Section 3: Application Security

**3.1 Secure Development**

**Secure Development Lifecycle (SDL) implemented?**
- [x] Yes
- [ ] No

**SDL activities:**
- [x] Threat modeling
- [x] Secure code review
- [x] Static Application Security Testing (SAST)
- [x] Dynamic Application Security Testing (DAST)
- [x] Software Composition Analysis (SCA) for dependencies
- [x] Security training for developers

**3.2 Vulnerability Management**

- **Vulnerability scanning frequency**: ☐ Daily ☐ Weekly ☐ Monthly
- **Penetration testing frequency**: ☐ Annually ☐ Bi-annually ☐ Quarterly
- **Bug bounty program**: ☐ Yes ☐ No (platform: __________)
- **Patch management SLA**: Critical patches within ____ hours/days

**3.3 Authentication & Authorization**

- **Multi-Factor Authentication (MFA) supported**: ☐ Yes ☐ No
- **SSO protocols supported**: ☐ SAML 2.0 ☐ OIDC ☐ OAuth 2.0
- **Password policy enforced**: ☐ Yes ☐ No (min length: ____, complexity: ____)
- **Session timeout**: ____ minutes of inactivity
- **Role-Based Access Control (RBAC)**: ☐ Yes ☐ No

**3.4 Encryption**

| Data State | Encryption | Algorithm | Key Management |
|------------|------------|-----------|----------------|
| Data at rest | ☐ Yes ☐ No | AES-256-GCM | AWS KMS / Azure Key Vault |
| Data in transit | ☐ Yes ☐ No | TLS 1.3 | Certificate Authority |
| Backups | ☐ Yes ☐ No | AES-256 | AWS KMS / Azure Key Vault |

**Key rotation frequency**: Every ____ days/months

---

### Section 4: Data Protection

**4.1 Data Classification**

Does TEEI classify data by sensitivity?

- [x] Yes (levels: Public, Internal, Confidential, Restricted)
- [ ] No

**4.2 Data Residency**

Can customer data be stored in specific geographic regions?

- [x] Yes (available regions: EU, US)
- [ ] No

**Default data storage location**: __________

**4.3 Data Backup & Recovery**

- **Backup frequency**: ☐ Real-time ☐ Hourly ☐ Daily ☐ Weekly
- **Backup retention**: ____ days/months
- **Backup encryption**: ☐ Yes ☐ No
- **Backup testing frequency**: ☐ Monthly ☐ Quarterly ☐ Annually
- **Recovery Time Objective (RTO)**: ____ hours
- **Recovery Point Objective (RPO)**: ____ hours

**4.4 Data Disposal**

**Secure data deletion method:**
- [x] Cryptographic erasure (destroy encryption keys)
- [ ] Overwriting (DoD 5220.22-M standard)
- [ ] Physical destruction (for hardware)

**Data deletion verification**: ☐ Yes ☐ No

---

### Section 5: Compliance & Privacy

**5.1 Regulatory Compliance**

Which regulations does TEEI comply with?

- [x] GDPR (EU General Data Protection Regulation)
- [x] UK GDPR
- [ ] CCPA (California Consumer Privacy Act)
- [ ] HIPAA (Health Insurance Portability and Accountability Act)
- [ ] FERPA (Family Educational Rights and Privacy Act)
- [ ] Other: __________

**5.2 Privacy Controls**

- **Data Protection Impact Assessments (DPIA)**: ☐ Yes ☐ No
- **Privacy by Design**: ☐ Yes ☐ No
- **Data Subject Rights API**: ☐ Yes ☐ No (export, delete, portability)
- **Consent management**: ☐ Yes ☐ No
- **Anonymization/Pseudonymization**: ☐ Yes ☐ No

**5.3 Audit & Logging**

- **Audit logging enabled**: ☐ Yes ☐ No
- **Log retention period**: ____ days/months
- **Logs include**: ☐ Authentication ☐ Data access ☐ Configuration changes ☐ Admin actions
- **Log integrity protection**: ☐ Yes ☐ No (immutable logs)
- **SIEM integration**: ☐ Yes ☐ No (tool: __________)

---

### Section 6: Business Continuity & Disaster Recovery

**6.1 Business Continuity Plan (BCP)**

- **BCP documented**: ☐ Yes ☐ No
- **BCP testing frequency**: ☐ Annually ☐ Bi-annually ☐ Quarterly
- **Last BCP test date**: __________

**6.2 Disaster Recovery Plan (DRP)**

- **DRP documented**: ☐ Yes ☐ No
- **DRP testing frequency**: ☐ Annually ☐ Bi-annually ☐ Quarterly
- **Last DRP test date**: __________
- **High Availability (HA) architecture**: ☐ Yes ☐ No
- **Geographic redundancy**: ☐ Yes ☐ No (regions: __________)

**6.3 Availability**

- **Uptime SLA**: _____ % (e.g., 99.9%)
- **Planned maintenance window**: ☐ Yes ☐ No (frequency: __________)
- **Incident notification process**: Email / Status page / SMS

---

### Section 7: Incident Response

**7.1 Incident Response Plan (IRP)**

- **IRP documented**: ☐ Yes ☐ No
- **IRP testing frequency**: ☐ Annually ☐ Bi-annually ☐ Quarterly
- **24/7 incident response team**: ☐ Yes ☐ No

**7.2 Data Breach Notification**

**Notification timeline to customers:**
- [ ] Within 24 hours
- [ ] Within 72 hours
- [ ] Other: __________

**Notification methods:**
- [x] Email
- [ ] Phone
- [x] Customer portal
- [ ] Other: __________

**7.3 Forensics**

- **Digital forensics capability**: ☐ Yes ☐ No
- **Evidence preservation**: ☐ Yes ☐ No
- **Third-party forensics partner**: ☐ Yes ☐ No

---

### Section 8: Vendor & Supply Chain Security

**8.1 Third-Party Risk Management**

- **Vendor security assessments**: ☐ Yes ☐ No (frequency: __________)
- **Sub-processor DPAs in place**: ☐ Yes ☐ No
- **Sub-processor list provided to customers**: ☐ Yes ☐ No

**8.2 Sub-processors** (see also DPA Annex C)

**Total number of sub-processors**: ____

**Can customers object to new sub-processors?**
- [x] Yes (with 30 days' notice)
- [ ] No

---

### Section 9: Physical & Environmental Security

**9.1 Office Security**

- **Physical access control**: ☐ Yes ☐ No (badge, biometric)
- **Visitor management**: ☐ Yes ☐ No
- **CCTV surveillance**: ☐ Yes ☐ No
- **Clean desk policy**: ☐ Yes ☐ No

**9.2 Device Security**

- **Endpoint protection (antivirus)**: ☐ Yes ☐ No
- **Full disk encryption**: ☐ Yes ☐ No (required for all devices)
- **Mobile Device Management (MDM)**: ☐ Yes ☐ No
- **Device inventory**: ☐ Yes ☐ No

---

### Section 10: Human Resources Security

**10.1 Employee Screening**

- **Background checks**: ☐ Yes ☐ No (for all employees / certain roles)
- **Reference checks**: ☐ Yes ☐ No

**10.2 Training & Awareness**

- **Security awareness training**: ☐ Yes ☐ No (frequency: __________)
- **Privacy training**: ☐ Yes ☐ No (frequency: __________)
- **Phishing simulation**: ☐ Yes ☐ No (frequency: __________)

**10.3 Offboarding**

- **Access revocation**: Within ____ hours of termination
- **Device return**: ☐ Yes ☐ No
- **NDA signing**: ☐ Yes ☐ No

---

## Compliance Checklist

**Purpose**: Ensure all compliance requirements met before go-live
**Owner**: Tenant Compliance Officer + TEEI Compliance Lead

---

### GDPR Compliance

- [ ] **Lawful Basis Documented**: Processing purpose and legal basis identified
- [ ] **Privacy Notice Updated**: Transparent information provided to data subjects
- [ ] **DPIA Completed**: High-risk processing assessed and approved
- [ ] **DPA Signed**: Data Processing Agreement executed
- [ ] **Data Subject Rights Enabled**: Export, delete, rectify, restrict endpoints functional
- [ ] **Consent Mechanisms**: Opt-in/opt-out implemented where applicable
- [ ] **Breach Notification**: Procedures documented (24-hour notification to Controller)
- [ ] **International Transfers**: SCCs in place for non-EU transfers
- [ ] **Records of Processing**: Article 30 records maintained
- [ ] **DPO Contact**: Data Protection Officer contactable

---

### SOC 2 Type II Compliance

- [ ] **Latest Audit Report Reviewed**: Report date within last 12 months
- [ ] **Trust Services Criteria Met**:
  - [ ] Security
  - [ ] Availability
  - [ ] Processing Integrity
  - [ ] Confidentiality
  - [ ] Privacy
- [ ] **Exceptions Reviewed**: Any exceptions/qualifications addressed
- [ ] **Remediation Plans**: Open findings have remediation timelines

---

### ISO 27001 Compliance

- [ ] **Certificate Valid**: Expiry date verified
- [ ] **Scope Covers TEEI Services**: Platform services within certification scope
- [ ] **Surveillance Audits**: Annual surveillance audits conducted
- [ ] **Corrective Actions**: Non-conformities addressed

---

### Industry-Specific Compliance (if applicable)

#### CCPA (California Consumer Privacy Act)
- [ ] Data inventory completed
- [ ] "Do Not Sell" option implemented
- [ ] Privacy policy updated with CCPA disclosures

#### HIPAA (if processing health data)
- [ ] Business Associate Agreement (BAA) signed
- [ ] HIPAA Security Rule controls implemented
- [ ] Encryption at rest and in transit

---

### Contractual & Legal

- [ ] **Service Agreement Signed**: Master Service Agreement executed
- [ ] **DPA Signed**: Data Processing Agreement executed
- [ ] **Order Form/SOW Signed**: Statement of Work with pricing
- [ ] **SLA Defined**: Service Level Agreement with uptime commitments
- [ ] **Insurance Certificates**: Cyber liability insurance verified
- [ ] **Indemnification**: Liability and indemnification clauses reviewed

---

### Security & Technical

- [ ] **Penetration Test Results**: No critical/high vulnerabilities unresolved
- [ ] **Vulnerability Scan Clean**: No unpatched critical vulnerabilities
- [ ] **Encryption Verified**: TLS 1.3 in transit, AES-256 at rest
- [ ] **SSO Configured**: SAML/OIDC tested and functional
- [ ] **SCIM Provisioning**: User sync tested and validated
- [ ] **Access Controls**: RBAC enforced, least privilege applied
- [ ] **Audit Logging**: All required events logged (authentication, data access, admin actions)
- [ ] **Backup Tested**: Restore tested successfully

---

## Evidence Collection Requirements

**Purpose**: Gather evidence for compliance validation and audits
**Storage**: Secure, encrypted repository with access controls

---

### Required Evidence Documents

| Document | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Completed DPIA | Tenant Security Officer | Day 2 | ☐ |
| Signed DPA | Tenant Legal + TEEI Legal | Day 3 | ☐ |
| Security Questionnaire | TEEI Security Architect | Day 2 | ☐ |
| SOC 2 Type II Report | TEEI Compliance | Day 0 | ☐ |
| ISO 27001 Certificate | TEEI Compliance | Day 0 | ☐ |
| Penetration Test Report | TEEI Security | Day 0 | ☐ |
| Sub-processor List | TEEI Legal | Day 0 | ☐ |
| Sub-processor DPAs | TEEI Legal | Day 0 | ☐ |
| Privacy Notice (updated) | Tenant Legal | Day 5 | ☐ |
| User Consent Records | Tenant Compliance | Day 7 | ☐ |
| Audit Log Samples | TEEI Engineering | Day 7 | ☐ |
| Backup Test Results | TEEI Operations | Day 7 | ☐ |
| SSO Configuration Screenshots | Tenant IT | Day 5 | ☐ |
| SCIM Sync Logs | TEEI Engineering | Day 7 | ☐ |
| Incident Response Plan | TEEI Security | Day 0 | ☐ |
| Business Continuity Plan | TEEI Operations | Day 0 | ☐ |

---

### Evidence Retention

**Retention Period**: 7 years after contract termination (legal requirement)

**Storage**:
- Tenant: Internal secure document repository
- TEEI: Encrypted compliance archive (AWS S3 with versioning, access logging)

**Access Control**:
- Need-to-know basis only
- Audit logging for all access
- Annual access reviews

---

## Appendix

### Useful Resources

- **GDPR Full Text**: https://gdpr-info.eu/
- **ICO DPIA Guidance**: https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-impact-assessments/
- **EDPB Guidelines**: https://edpb.europa.eu/our-work-tools/general-guidance_en
- **Standard Contractual Clauses**: https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en
- **TEEI GDPR Compliance Guide**: /docs/GDPR_Compliance.md
- **TEEI Identity API Contract**: /docs/api/worker1-identity-api-contract.md

---

### Contact

**TEEI Data Protection Officer**
- Email: dpo@teei.com
- Phone: +1-XXX-XXX-XXXX

**TEEI Security Team**
- Email: security@teei.com
- Security Incident Hotline: +1-XXX-XXX-XXXX (24/7)

**TEEI Compliance Team**
- Email: compliance@teei.com

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Next Review**: 2026-11-15 (annual)
**Owner**: DPIA Writer & Security Team (Worker 1)
