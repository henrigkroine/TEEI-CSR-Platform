# GDPR Compliance Guide

**Version**: 1.0
**Last Updated**: 2025-11-13
**Owner**: Compliance Lead

## Table of Contents

1. [Overview](#overview)
2. [Legal Framework](#legal-framework)
3. [Data Processing Activities](#data-processing-activities)
4. [Technical Controls](#technical-controls)
5. [Data Subject Rights](#data-subject-rights)
6. [Compliance Procedures](#compliance-procedures)
7. [Security Measures](#security-measures)
8. [Data Retention](#data-retention)
9. [Incident Response](#incident-response)
10. [Audit & Monitoring](#audit--monitoring)

---

## Overview

The TEEI CSR Platform processes personal data of program participants, volunteers, and company employees. As a data controller, we are committed to compliance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.

### Scope

This document covers GDPR compliance for:
- **Data Subjects**: Program participants, volunteers, mentors, company employees
- **Processing Activities**: CSR program management, mentorship matching, training tracking, outcome measurement
- **Geographic Scope**: EU/EEA data subjects

### Compliance Officer

**Role**: Data Protection Officer (DPO)
**Contact**: dpo@teei.com
**Responsibilities**: Oversee GDPR compliance, respond to data subject requests, maintain records of processing activities

---

## Legal Framework

### GDPR Articles Implemented

| Article | Right | Implementation |
|---------|-------|----------------|
| Article 15 | Right to Access | `/v1/privacy/export` endpoint |
| Article 16 | Right to Rectification | User profile update endpoints |
| Article 17 | Right to Erasure | `/v1/privacy/delete` endpoint with DSR orchestrator |
| Article 18 | Right to Restriction | Consent management system |
| Article 20 | Right to Data Portability | JSON/CSV export functionality |
| Article 21 | Right to Object | Consent withdrawal mechanism |
| Article 30 | Records of Processing | Audit logging system |
| Article 32 | Security Measures | Encryption, access controls, audit logs |
| Article 33 | Breach Notification | Incident response procedures |

### Legal Bases for Processing

We process personal data under the following legal bases:

1. **Consent** (Article 6(1)(a))
   - Marketing communications
   - Optional program features
   - Implementation: `encrypted_user_pii.consent_given` flag

2. **Contract** (Article 6(1)(b))
   - Program enrollment and participation
   - Service delivery
   - Implementation: Tracked in `program_enrollments` table

3. **Legal Obligation** (Article 6(1)(c))
   - Tax reporting
   - Employment law compliance
   - Implementation: Documented in audit logs

4. **Legitimate Interest** (Article 6(1)(f))
   - Fraud prevention
   - System security monitoring
   - Analytics for service improvement
   - Implementation: Audit logs with `gdpr_basis` field

---

## Data Processing Activities

### Personal Data Categories

#### 1. Identification Data
- **Fields**: Name, email, user ID
- **Location**: `users` table
- **Encryption**: Email encrypted in `encrypted_user_pii`
- **Retention**: 7 years after account deletion

#### 2. Contact Information
- **Fields**: Phone, address, emergency contact
- **Location**: `encrypted_user_pii` table
- **Encryption**: AES-256-GCM field-level encryption
- **Retention**: Duration of program participation + 2 years

#### 3. Demographic Data
- **Fields**: Date of birth, nationality
- **Location**: `encrypted_user_pii` table
- **Encryption**: AES-256-GCM field-level encryption
- **Retention**: Duration of program participation + 2 years

#### 4. Program Activity Data
- **Fields**: Enrollments, completions, matches, check-ins
- **Location**: Various tables (`program_enrollments`, `buddy_matches`, etc.)
- **Encryption**: Not encrypted (not directly identifiable)
- **Retention**: 5 years for reporting purposes

#### 5. System Access Data
- **Fields**: Login times, IP addresses, session data
- **Location**: `audit_logs` table
- **Encryption**: Not encrypted
- **Retention**: 90 days

### Data Flow Map

```
External Sources → API Gateway → Services → Database
     ↓                 ↓            ↓          ↓
  (HTTPS)       (JWT Auth)    (Encryption)  (PII Tables)
                     ↓
               Audit Logs
```

---

## Technical Controls

### 1. Encryption

#### At Rest
- **PII Fields**: AES-256-GCM encryption
  - Master key stored securely (AWS KMS / Azure Key Vault)
  - Key derivation per user/field (PBKDF2)
  - Key rotation supported with version tracking
- **Database**: PostgreSQL with encrypted tablespaces (optional)
- **Backups**: Encrypted using pgcrypto

#### In Transit
- **External**: TLS 1.3 for all API communications
- **Internal**: Service-to-service JWT authentication
- **Webhooks**: HMAC-SHA256 signature verification

**Implementation**:
```typescript
import { createPiiEncryption } from '@teei/compliance';

const piiEncryption = createPiiEncryption({
  masterKey: process.env.PII_MASTER_KEY,
  keyVersion: 'v1'
});

// Encrypt
const encrypted = piiEncryption.encrypt(email, userId, 'email');

// Decrypt
const email = piiEncryption.decrypt(encrypted, userId, 'email');
```

### 2. Access Control

#### Authentication
- RS256 JWT tokens with JWKS
- OIDC SSO for company administrators
- MFA support (planned)

#### Authorization
- Role-Based Access Control (RBAC)
- Tenant isolation enforcement
- Permission-based resource access

**Roles**:
- `super_admin`: Platform administrators (no tenant restrictions)
- `company_admin`: Company administrators (tenant-scoped)
- `company_user`: Regular employees (tenant-scoped, limited permissions)
- `participant`: Program participants (self-data only)
- `volunteer`: Volunteers/mentors (program data only)

**Implementation**:
```typescript
import { createTenantIsolationHook } from '@teei/compliance';

// Add to Fastify
const tenantHook = createTenantIsolationHook(db);
fastify.addHook('onRequest', tenantHook);
```

### 3. Audit Logging

Every significant action is logged:
- **Authentication events**: Login, logout, failed attempts
- **Data access**: Read operations on PII
- **Data modifications**: Create, update, delete
- **Privacy operations**: Export, deletion requests, consent changes
- **Administrative actions**: Role changes, permission grants

**Implementation**:
```typescript
import { createAuditLogger, AuditAction } from '@teei/compliance';

const auditLogger = createAuditLogger(db);

await auditLogger.logDataAccess({
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.role,
  resourceType: 'user_profile',
  resourceId: profileId,
});
```

### 4. Data Minimization

- Collect only necessary data
- Pseudonymization using surrogate keys (`external_id_mappings`)
- Anonymization after retention period
- Automatic data purging based on retention policies

---

## Data Subject Rights

### Article 15: Right to Access

**Endpoint**: `GET /v1/privacy/export`

**Process**:
1. User authenticates
2. System exports all personal data in JSON format
3. Includes: profile, PII, external IDs, program enrollments, activities
4. Audit log created

**Response Time**: Immediate (for self-service)

**Example**:
```bash
curl -X GET https://api.teei.com/v1/privacy/export \
  -H "Authorization: Bearer {token}"
```

### Article 16: Right to Rectification

**Endpoint**: `PUT /v1/profile`

**Process**:
1. User updates their profile
2. Changes validated and saved
3. Audit log created with before/after states
4. PII fields re-encrypted if changed

### Article 17: Right to Erasure

**Endpoint**: `POST /v1/privacy/delete`

**Process**:
1. User requests deletion
2. Request added to deletion queue with 30-day grace period
3. User notified with cancellation instructions
4. After grace period, DSR orchestrator executes deletion
5. Data deleted from all systems
6. User anonymized in audit logs (retain for legal compliance)
7. Verification hash created

**Grace Period**: 30 days (configurable)

**Example**:
```bash
curl -X POST https://api.teei.com/v1/privacy/delete \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"userId": "uuid", "reason": "User request"}'
```

**Cancellation**:
```bash
curl -X POST https://api.teei.com/v1/privacy/delete/{deletionId}/cancel \
  -H "Authorization: Bearer {token}"
```

### Article 18: Right to Restriction

**Implementation**: Consent management

- Users can withdraw consent for specific processing activities
- System restricts processing accordingly
- Audit log tracks consent changes

### Article 20: Right to Data Portability

**Endpoint**: `GET /v1/privacy/export?format=json`

**Format**: Machine-readable JSON
- Structured data export
- Includes all personal data
- Can be imported into other systems

### Article 21: Right to Object

**Implementation**: Consent withdrawal + opt-out mechanisms

- Users can object to processing for marketing
- Users can object to automated decision-making (Q2Q AI)
- Manual review available for disputed decisions

---

## Compliance Procedures

### Data Processing Impact Assessment (DPIA)

**Required for**:
- New data processing activities
- Significant changes to existing processing
- High-risk processing (e.g., profiling, special categories)

**Process**:
1. Identify processing activity
2. Assess necessity and proportionality
3. Identify risks to data subjects
4. Implement mitigating measures
5. Document assessment
6. Review annually

### Privacy by Design

**Principles**:
1. Proactive not reactive
2. Privacy as default setting
3. Privacy embedded in design
4. Full functionality (positive-sum, not zero-sum)
5. End-to-end security
6. Visibility and transparency
7. Respect for user privacy

**Implementation**:
- Default to most restrictive consent settings
- Encryption enabled by default
- Audit logging automatic
- Data minimization enforced at schema level
- Retention policies automated

### Data Protection Officer (DPO)

**Responsibilities**:
- Monitor GDPR compliance
- Advise on data protection impact assessments
- Cooperate with supervisory authorities
- Act as contact point for data subjects
- Maintain records of processing activities

**Contact**: dpo@teei.com

---

## Security Measures

### Article 32: Security of Processing

#### Technical Measures
- ✅ Encryption (at rest and in transit)
- ✅ Pseudonymization (surrogate keys)
- ✅ Access controls (RBAC, tenant isolation)
- ✅ Audit logging (immutable trail)
- ✅ Regular security testing
- ✅ Vulnerability scanning
- ✅ Penetration testing (annual)

#### Organizational Measures
- ✅ Staff training on data protection
- ✅ Confidentiality agreements
- ✅ Access control policies
- ✅ Incident response plan
- ✅ Data breach notification procedures
- ✅ Regular compliance audits

### Data Breach Response

**Detection**: Automated monitoring, security alerts, audit log analysis

**Response Plan**:
1. **Contain** (< 1 hour): Isolate affected systems
2. **Assess** (< 4 hours): Determine scope and impact
3. **Notify** (< 72 hours): Supervisory authority if high risk
4. **Communicate** (< 72 hours): Affected data subjects if high risk
5. **Remediate**: Fix vulnerability, restore from backups
6. **Review**: Post-incident analysis, update procedures

**Documentation**: All incidents logged in incident register

---

## Data Retention

### Retention Periods

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| User profiles | 7 years after account deletion | Legal obligation |
| PII | 2 years after program end | Contract fulfillment |
| Program activities | 5 years | Legitimate interest (reporting) |
| Audit logs (security) | 2 years | Legal obligation |
| Audit logs (financial) | 7 years | Legal obligation |
| Session logs | 90 days | Legitimate interest |

### Automated Deletion

**Implementation**:
```sql
-- Run nightly
DELETE FROM audit_logs
WHERE retention_until IS NOT NULL
  AND retention_until < NOW();
```

**Cron Job**: `/packages/db/src/retention-cleanup.ts` (runs daily)

### Manual Deletion

For data subject requests:
- Use DSR orchestrator
- 30-day grace period
- Multi-system coordination
- Verification hash for proof

---

## Audit & Monitoring

### Records of Processing Activities (Article 30)

**Documentation includes**:
- Name and contact details of controller
- Purposes of processing
- Categories of data subjects
- Categories of personal data
- Recipients of personal data
- Transfers to third countries
- Time limits for erasure
- Security measures

**Location**: `/docs/processing_activities.md` (to be created)

### Regular Audits

**Frequency**: Quarterly

**Scope**:
- Audit log review
- Access control verification
- Encryption key rotation
- Retention policy compliance
- Data breach register review
- Training completion

**Responsibilities**: DPO + Security Lead

### Compliance Dashboard

**Metrics**:
- Data subject requests (volume, response time)
- Consent rates
- Data breaches (count, severity)
- Audit log volume
- Encryption key age
- Retention policy violations

**Tool**: Grafana dashboard (planned)

---

## Contact & Resources

### Data Protection Officer
- **Email**: dpo@teei.com
- **Phone**: +1-XXX-XXX-XXXX

### Supervisory Authority
- **EU**: Local data protection authority
- **UK**: Information Commissioner's Office (ICO)

### Resources
- **GDPR Full Text**: https://gdpr-info.eu/
- **ICO Guidance**: https://ico.org.uk/for-organisations/guide-to-data-protection/
- **Internal Wiki**: `/docs/compliance/` (to be created)

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-13 | Initial version | Compliance Lead |

---

**Next Steps**:
1. ✅ Implement audit logging (completed)
2. ✅ Implement PII encryption (completed)
3. ✅ Implement GDPR endpoints (completed)
4. ⏳ Integrate endpoints with DSR orchestrator
5. ⏳ Create compliance dashboard
6. ⏳ Conduct staff training
7. ⏳ Perform DPIA for AI classification
8. ⏳ Establish data breach response team
