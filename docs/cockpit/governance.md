# Governance & Compliance Guide

**Version**: 1.0 (Phase D)
**Date**: 2025-11-14
**Owner**: Agent Governance Engineer (Phase D)
**Status**: ✅ IMPLEMENTED

---

## Overview

The TEEI CSR Platform provides comprehensive governance and compliance tools to meet global data protection regulations (GDPR, CCPA, SOC 2) and corporate audit requirements. This guide covers consent management, DSAR fulfillment, retention policies, and audit trails.

---

## Consent Management

### Overview

Consent management ensures that all user data collection and processing complies with GDPR Article 6 (lawful basis) and CCPA opt-in/opt-out requirements.

### Consent Lifecycle

**States**:
1. **Pending**: Consent request sent, awaiting user response
2. **Granted**: User explicitly consented (with timestamp and method)
3. **Revoked**: User withdrew consent
4. **Expired**: Consent expired (per policy, e.g., 24 months)

### Database Schema

**Table**: `user_consents`

```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  consent_type VARCHAR(50) NOT NULL,        -- 'data_processing', 'marketing', 'analytics'
  status VARCHAR(20) NOT NULL,              -- 'pending' | 'granted' | 'revoked' | 'expired'
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  method VARCHAR(50),                       -- 'web_form', 'email_link', 'in_app_prompt'
  ip_address INET,
  user_agent TEXT,
  proof_url TEXT,                           -- URL to consent record (e.g., signed PDF)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_status ON user_consents(status);
CREATE INDEX idx_user_consents_expires_at ON user_consents(expires_at);
```

### Consent Workflows

#### 1. Requesting Consent

**Trigger**: New user registration, new data processing activity, or consent expiration

**API Endpoint**: `POST /governance/consent/request`

**Request**:
```typescript
interface ConsentRequest {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics';
  expiresInMonths?: number;     // Default: 24
  notificationMethod: 'email' | 'in_app' | 'both';
}
```

**Response**:
```typescript
interface ConsentResponse {
  consentId: string;
  status: 'pending';
  requestedAt: string;
  expiresAt: string;
  consentUrl: string;            // URL for user to grant consent
}
```

#### 2. Granting Consent

**Trigger**: User clicks consent link or submits consent form

**API Endpoint**: `POST /governance/consent/grant`

**Request**:
```typescript
interface GrantConsentRequest {
  consentId: string;
  ipAddress: string;
  userAgent: string;
}
```

**Response**:
```typescript
interface GrantConsentResponse {
  consentId: string;
  status: 'granted';
  grantedAt: string;
  expiresAt: string;
  proofUrl: string;             // Signed PDF with consent record
}
```

**Proof Generation**:
- Generate tamper-evident PDF with:
  - User name and ID
  - Consent type and purpose
  - Timestamp (ISO 8601 + timezone)
  - IP address (anonymized if GDPR-restricted)
  - Digital signature (SHA-256 hash)
- Store PDF in S3 with signed URL (expires in 7 years per GDPR retention)

#### 3. Revoking Consent

**Trigger**: User withdraws consent via settings or DSAR request

**API Endpoint**: `POST /governance/consent/revoke`

**Request**:
```typescript
interface RevokeConsentRequest {
  consentId: string;
  reason?: string;              // Optional: user-provided reason
}
```

**Response**:
```typescript
interface RevokeConsentResponse {
  consentId: string;
  status: 'revoked';
  revokedAt: string;
  dataRetentionAction: 'delete' | 'anonymize' | 'retain_legal';
}
```

**Post-Revocation Actions**:
1. **Stop Processing**: Immediately cease data processing for revoked purpose
2. **Data Handling**:
   - **Delete**: If no legal basis to retain (GDPR "right to erasure")
   - **Anonymize**: If data needed for analytics (GDPR-compliant)
   - **Retain (Legal Basis)**: If required for legal/contractual obligations
3. **Audit Log**: Record revocation and subsequent actions

### Consent Preferences Center

**URL**: `/governance/consent/preferences`

**Features**:
- View all consent requests (past and present)
- Grant/revoke consent per purpose
- Download consent receipts (PDF)
- View data processing purposes and legal bases
- Export consent history

**UI Components**:
- `ConsentStatusTable.tsx`: Display consents with filters
- `ConsentDetailModal.tsx`: View consent details and actions
- `ConsentReceiptDownload.tsx`: Generate and download PDF receipts

---

## DSAR (Data Subject Access Request)

### Overview

DSAR management automates the fulfillment of GDPR Article 15 (right to access), Article 17 (right to erasure), and CCPA Section 1798.100 (right to know) requests.

### DSAR Types

1. **Access Request**: Provide copy of all personal data
2. **Deletion Request**: Erase all personal data (with exceptions)
3. **Rectification Request**: Correct inaccurate data
4. **Portability Request**: Export data in machine-readable format
5. **Objection Request**: Stop processing for specific purpose

### Database Schema

**Table**: `dsar_requests`

```sql
CREATE TABLE dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(50) NOT NULL,        -- 'access' | 'deletion' | 'rectification' | 'portability' | 'objection'
  user_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(50) NOT NULL,              -- 'pending' | 'in_progress' | 'fulfilled' | 'rejected'
  priority VARCHAR(20) DEFAULT 'normal',    -- 'low' | 'normal' | 'high' | 'urgent'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,            -- 30 days from submission (GDPR)
  fulfilled_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id),    -- Compliance officer
  notes TEXT,
  rejection_reason TEXT,
  fulfillment_package_url TEXT,             -- S3 URL to exported data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dsar_requests_user_id ON dsar_requests(user_id);
CREATE INDEX idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX idx_dsar_requests_due_date ON dsar_requests(due_date);
```

### DSAR Lifecycle

#### 1. Submitting DSAR

**Trigger**: User submits request via web form or email

**API Endpoint**: `POST /governance/dsar/submit`

**Request**:
```typescript
interface DSARSubmitRequest {
  requestType: 'access' | 'deletion' | 'rectification' | 'portability' | 'objection';
  userId: string;
  details?: string;                         // Optional: user-provided context
}
```

**Response**:
```typescript
interface DSARSubmitResponse {
  requestId: string;
  status: 'pending';
  submittedAt: string;
  dueDate: string;                          // 30 days from submission
  estimatedFulfillmentDate: string;
}
```

**Auto-Assignment**:
- **Priority Calculation**:
  - **Urgent**: VIP user, legal escalation, or overdue
  - **High**: Executive-level user or repeat request
  - **Normal**: Standard user
  - **Low**: Test/demo account
- **Round-Robin Assignment**: Assign to least-loaded compliance officer

#### 2. Fulfilling DSAR

**Trigger**: Compliance officer processes request

**API Endpoint**: `POST /governance/dsar/fulfill`

**Request**:
```typescript
interface DSARFulfillRequest {
  requestId: string;
  fulfillmentNotes?: string;
}
```

**Fulfillment Process**:

**For Access/Portability Requests**:
1. **Data Aggregation**:
   - Query all tables with user_id foreign key
   - Include:
     - Profile data (name, email, etc.)
     - Activity logs (volunteer hours, donations)
     - Consent records
     - Audit trail (exports, logins)
     - Evidence contributions
2. **Data Export**:
   - Format: JSON (machine-readable) + PDF (human-readable)
   - Package as ZIP file
   - Generate README with data dictionary
3. **Storage**:
   - Upload to S3 with signed URL (expires in 7 days)
   - Encrypt at rest (AES-256)
4. **Notification**:
   - Email user with download link
   - Include instructions for interpreting data

**For Deletion Requests**:
1. **Legal Check**:
   - Verify no legal obligation to retain (e.g., active contract, legal hold)
   - Check if data is in "locked" reports (cannot delete)
2. **Data Deletion**:
   - **Hard Delete**: Remove from operational tables
   - **Soft Delete**: Mark as deleted, anonymize PII
   - **Archive**: Move to cold storage with retention policy
3. **Cascading Deletes**:
   - Delete user_consents
   - Anonymize audit_logs (replace user_id with placeholder)
   - Remove from user_profiles
4. **Verification**:
   - Run SQL query to confirm no orphaned records
   - Generate deletion certificate (PDF)
5. **Notification**:
   - Email confirmation with deletion certificate

**For Rectification Requests**:
1. **Identify Fields**: User specifies which fields to correct
2. **Validation**: Verify new data meets schema constraints
3. **Update**: Execute UPDATE queries with audit trail
4. **Notification**: Confirm changes with before/after summary

**Response**:
```typescript
interface DSARFulfillResponse {
  requestId: string;
  status: 'fulfilled';
  fulfilledAt: string;
  packageUrl?: string;                      // For access/portability
  deletionCertificateUrl?: string;          // For deletion
}
```

#### 3. Rejecting DSAR

**Trigger**: Request is invalid, duplicate, or legally unenforceable

**API Endpoint**: `POST /governance/dsar/reject`

**Request**:
```typescript
interface DSARRejectRequest {
  requestId: string;
  reason: string;                           // Required: legal justification
}
```

**Valid Rejection Reasons**:
- **Duplicate Request**: Already fulfilled within 12 months
- **Insufficient Verification**: Cannot confirm identity
- **Legal Obligation**: Data retention required by law
- **Technical Impossibility**: Data is anonymized, cannot be re-identified

---

## Retention Policies

### Overview

Retention policies define how long different data types are stored before automatic deletion or archival, per GDPR Article 5(1)(e) (storage limitation) and industry standards.

### Database Schema

**Table**: `retention_policies`

```sql
CREATE TABLE retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(100) NOT NULL,          -- 'user_profiles', 'activity_logs', 'consent_records'
  retention_period_days INT NOT NULL,       -- e.g., 2555 (7 years)
  action_on_expiry VARCHAR(50) NOT NULL,    -- 'delete' | 'anonymize' | 'archive'
  legal_basis TEXT,                         -- Justification (e.g., "SOX compliance requires 7 years")
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table**: `retention_notices`

```sql
CREATE TABLE retention_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES retention_policies(id) NOT NULL,
  record_id UUID NOT NULL,                  -- ID of record to be deleted/archived
  record_type VARCHAR(100) NOT NULL,        -- 'user_profiles', 'activity_logs', etc.
  scheduled_action VARCHAR(50) NOT NULL,    -- 'delete' | 'anonymize' | 'archive'
  scheduled_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',     -- 'pending' | 'executed' | 'cancelled'
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retention_notices_scheduled_date ON retention_notices(scheduled_date);
CREATE INDEX idx_retention_notices_status ON retention_notices(status);
```

### Default Retention Policies

| Data Type | Retention Period | Action on Expiry | Legal Basis |
|-----------|------------------|------------------|-------------|
| **User Profiles (Active)** | Indefinite | N/A | Active user |
| **User Profiles (Inactive)** | 3 years | Anonymize | GDPR minimization |
| **Activity Logs** | 2 years | Delete | Platform policy |
| **Consent Records** | 7 years | Archive | GDPR proof requirement |
| **Audit Logs** | 7 years | Archive | SOC 2 compliance |
| **Locked Reports** | Indefinite | N/A | Contractual obligation |
| **Draft Reports** | 90 days | Delete | Housekeeping |
| **DSAR Packages** | 7 days | Delete | Privacy best practice |
| **Export Packages** | 30 days | Delete | Storage cost optimization |

### Retention Workflow

#### 1. Daily Retention Scan

**Trigger**: Cron job (runs at 02:00 UTC daily)

**Process**:
1. **Identify Expired Records**:
   - Query each table with `created_at + retention_period_days < NOW()`
   - Exclude records with legal holds
2. **Generate Retention Notices**:
   - Insert into `retention_notices` table
   - Schedule action for 7 days in future (grace period)
3. **Notify Stakeholders**:
   - Email compliance officer with notice summary
   - Dashboard alert (if applicable)

#### 2. Executing Retention Actions

**Trigger**: Scheduled retention action reaches due date

**API Endpoint**: `POST /governance/retention/execute`

**Request**:
```typescript
interface ExecuteRetentionRequest {
  noticeId: string;
  confirmAction: boolean;                   // Must be true (safety check)
}
```

**Actions**:

**Delete**:
```sql
DELETE FROM user_profiles WHERE id = :record_id;
```

**Anonymize**:
```sql
UPDATE user_profiles
SET name = 'ANONYMIZED',
    email = CONCAT('anon_', id, '@example.com'),
    phone = NULL
WHERE id = :record_id;
```

**Archive**:
```sql
-- Move to cold storage table
INSERT INTO user_profiles_archive SELECT * FROM user_profiles WHERE id = :record_id;
DELETE FROM user_profiles WHERE id = :record_id;
```

#### 3. Retention Override (Legal Hold)

**Trigger**: Legal team places hold (e.g., litigation, audit)

**API Endpoint**: `POST /governance/retention/hold`

**Request**:
```typescript
interface RetentionHoldRequest {
  recordId: string;
  recordType: string;
  reason: string;                           // Required: legal justification
  expiresAt?: string;                       // Optional: hold duration
}
```

**Effect**:
- Retention notices for record are cancelled
- Record is flagged with `legal_hold = true`
- Retention scan skips record until hold is removed

---

## Export Audit Trail

### Overview

All data exports (reports, DSAR packages, analytics exports) are logged for compliance audits (SOC 2, ISO 27001).

### Database Schema

**Table**: `export_audit_log`

```sql
CREATE TABLE export_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(50) NOT NULL,         -- 'report_pdf', 'dsar_package', 'analytics_csv'
  exported_by UUID REFERENCES users(id) NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT NOW(),
  record_ids UUID[],                        -- Array of exported record IDs
  record_count INT,
  export_format VARCHAR(20),                -- 'pdf' | 'csv' | 'json' | 'zip'
  export_url TEXT,                          -- S3 URL (signed)
  export_size_bytes BIGINT,
  ip_address INET,
  user_agent TEXT,
  compliance_flags JSONB,                   -- { "watermarked": true, "encrypted": true }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_export_audit_log_exported_by ON export_audit_log(exported_by);
CREATE INDEX idx_export_audit_log_exported_at ON export_audit_log(exported_at);
CREATE INDEX idx_export_audit_log_export_type ON export_audit_log(export_type);
```

### Audit Trail API

**Endpoint**: `GET /governance/audit-log/exports`

**Query Parameters**:
- `exportType`: Filter by type (optional)
- `userId`: Filter by user (optional)
- `startDate`: Filter by date range (optional)
- `endDate`: Filter by date range (optional)
- `page`: Pagination (default: 1)
- `limit`: Page size (default: 50)

**Response**:
```typescript
interface ExportAuditLogResponse {
  logs: Array<{
    id: string;
    exportType: string;
    exportedBy: {
      id: string;
      name: string;
      email: string;
    };
    exportedAt: string;
    recordCount: number;
    exportFormat: string;
    exportSizeMB: number;
    complianceFlags: {
      watermarked: boolean;
      encrypted: boolean;
      approved: boolean;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Audit Log Retention

- **Retention Period**: 7 years (SOC 2 + GDPR requirement)
- **Action on Expiry**: Archive to cold storage
- **Access**: Compliance officers and auditors only

---

## Compliance Framework Alignment

### GDPR (EU)

| GDPR Article | Platform Feature |
|--------------|------------------|
| **Article 6**: Lawful Basis | Consent management with documented legal basis |
| **Article 15**: Right to Access | DSAR access request fulfillment |
| **Article 17**: Right to Erasure | DSAR deletion request with cascading deletes |
| **Article 20**: Right to Portability | DSAR portability with JSON/CSV export |
| **Article 25**: Data Protection by Design | Retention policies, anonymization |
| **Article 30**: Records of Processing | Export audit trail |
| **Article 32**: Security of Processing | Encryption, watermarking, access controls |

### CCPA (California)

| CCPA Section | Platform Feature |
|--------------|------------------|
| **1798.100**: Right to Know | DSAR access request |
| **1798.105**: Right to Delete | DSAR deletion request |
| **1798.115**: Right to Portability | DSAR portability request |
| **1798.120**: Right to Opt-Out | Consent management (revoke consent) |
| **1798.130**: Notice at Collection | Consent preferences center |

### SOC 2 Type II

| SOC 2 Criterion | Platform Feature |
|-----------------|------------------|
| **CC6.1**: Logical Access Controls | RBAC for governance functions |
| **CC6.6**: Audit Logging | Export audit trail with 7-year retention |
| **CC7.2**: Data Retention | Automated retention policies |
| **CC7.3**: Data Disposal | Secure deletion and anonymization |

---

## API Summary

### Consent Management
- `POST /governance/consent/request` - Request consent from user
- `POST /governance/consent/grant` - Grant consent
- `POST /governance/consent/revoke` - Revoke consent
- `GET /governance/consent/status/:userId` - Get user's consent status

### DSAR
- `POST /governance/dsar/submit` - Submit DSAR
- `POST /governance/dsar/fulfill` - Fulfill DSAR
- `POST /governance/dsar/reject` - Reject DSAR
- `GET /governance/dsar/queue` - View pending DSARs

### Retention
- `GET /governance/retention/policies` - List retention policies
- `GET /governance/retention/notices` - View scheduled deletions
- `POST /governance/retention/execute` - Execute retention action
- `POST /governance/retention/hold` - Place legal hold

### Audit
- `GET /governance/audit-log/exports` - View export audit trail
- `GET /governance/audit-log/consent` - View consent change history
- `GET /governance/audit-log/dsar` - View DSAR fulfillment history

---

## Best Practices

### For Compliance Officers
1. **Review DSAR Queue Daily**: Ensure requests are fulfilled within 30 days
2. **Monitor Consent Expiration**: Send renewal requests 30 days before expiry
3. **Audit Export Logs Weekly**: Check for unusual export patterns
4. **Test DSAR Fulfillment Quarterly**: Verify data exports are complete
5. **Review Retention Policies Annually**: Update based on regulatory changes

### For Developers
1. **Always Log Exports**: Use `export_audit_log` for all data exports
2. **Respect Consent Status**: Check consent before processing user data
3. **Use Retention Policies**: Don't manually delete data—use policies
4. **Test DSAR Flows**: Ensure cascading deletes work correctly
5. **Document Legal Basis**: Every data processing activity needs justification

---

## References

- GDPR Full Text: https://gdpr-info.eu/
- CCPA Full Text: https://oag.ca.gov/privacy/ccpa
- SOC 2 Framework: https://www.aicpa.org/soc2
- ICO (UK) Guidance: https://ico.org.uk/for-organisations/
- NIST Privacy Framework: https://www.nist.gov/privacy-framework

---

**Document Status**: ✅ IMPLEMENTED (Phase D)
**Last Updated**: 2025-11-14
**Owner**: Agent Governance Engineer

## Implementation Summary

All governance features documented above have been implemented in Phase D:
- Consent management system (`services/governance/src/consent.ts`)
- DSAR fulfillment engine (`services/governance/src/dsar.ts`)
- Retention policy automation (`services/governance/src/retention.ts`)
- Export audit trail (`services/governance/src/audit.ts`)
- Database schemas (`services/governance/src/db/schema/`)
- Frontend UI components (`apps/corp-cockpit-astro/src/components/governance/`)
- Comprehensive test coverage (unit + integration + E2E)
- See `reports/w3_phaseD_governance_ui.md` for full implementation details
