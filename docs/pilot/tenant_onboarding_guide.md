# Tenant Onboarding Guide - TEEI CSR Platform Pilot

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Worker 1 - Identity & SSO Team
**Audience**: Implementation Consultants, Customer Success, Tenant Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Onboarding Timeline](#onboarding-timeline)
4. [Phase 1: Pre-Onboarding (Week 0)](#phase-1-pre-onboarding-week-0)
5. [Phase 2: SSO Configuration (Week 1)](#phase-2-sso-configuration-week-1)
6. [Phase 3: SCIM Provisioning (Week 1-2)](#phase-3-scim-provisioning-week-1-2)
7. [Phase 4: Testing & Validation (Week 2)](#phase-4-testing--validation-week-2)
8. [Phase 5: Go-Live (Week 2-3)](#phase-5-go-live-week-2-3)
9. [Post-Onboarding](#post-onboarding)
10. [Troubleshooting](#troubleshooting)
11. [Support & Escalation](#support--escalation)

---

## Overview

This guide provides step-by-step instructions for onboarding new tenants to the TEEI CSR Platform pilot environment. The onboarding process typically takes **2 weeks** from kickoff to go-live and includes SSO configuration, SCIM provisioning, role mapping, and comprehensive testing.

### What is Included

- ✅ Multi-tenant Corporate Cockpit access
- ✅ SSO integration (SAML 2.0 or OIDC)
- ✅ SCIM 2.0 user provisioning
- ✅ Role-based access control (RBAC)
- ✅ Data privacy compliance (GDPR/DPIA)
- ✅ Admin console configuration
- ✅ Training materials and support

### Success Criteria

A successful onboarding is achieved when:
- ✅ Users can authenticate via company SSO
- ✅ User provisioning is automated via SCIM
- ✅ Role mappings correctly assign TEEI roles
- ✅ Admins can access the admin console
- ✅ All security and compliance checks pass
- ✅ Stakeholders are trained and confident

---

## Prerequisites

### Tenant Requirements

#### Technical Access
- [ ] **Identity Provider (IdP) Access**
  - Admin credentials for IdP (Azure AD, Okta, Google Workspace, OneLogin)
  - Ability to create SAML/OIDC applications
  - Ability to configure SCIM endpoints

- [ ] **Network & Security**
  - Whitelist TEEI platform IPs (if firewall restrictions apply)
  - TLS 1.2+ support for HTTPS connections
  - Ability to configure webhooks/callbacks

- [ ] **Stakeholder Availability**
  - IT Administrator (IdP configuration)
  - Security/Compliance Officer (DPIA review)
  - Business Owner (requirements validation)
  - Super Admin designee (platform configuration)

#### Documentation Required
- [ ] **Organization Information**
  - Legal company name
  - Primary domain(s) for email matching
  - Company identifier (provided by TEEI)
  - Billing contact information

- [ ] **User Directory Structure**
  - Groups/roles in IdP that map to TEEI roles
  - Expected user count (for capacity planning)
  - Organizational structure (departments, locations)

- [ ] **Compliance Artifacts**
  - Signed Data Processing Agreement (DPA)
  - Completed Data Protection Impact Assessment (DPIA)
  - Security questionnaire responses
  - Approved vendor assessment (if required)

### TEEI Platform Preparation

- [ ] Tenant provisioned in staging environment
- [ ] Company ID assigned (`{companyId}`)
- [ ] Database tenant schema created
- [ ] API keys generated (read-only for initial setup)
- [ ] TEEI contacts assigned (Implementation Consultant, Customer Success Manager)

---

## Onboarding Timeline

**Total Duration**: 2 weeks (10 business days)

```
Week 0 (Pre-Work)        Week 1                    Week 2
═══════════════════════════════════════════════════════════════
│                │                    │                    │
│ Kickoff        │ SSO Config         │ Testing            │ Go-Live
│ ├─ Requirements│ ├─ SAML/OIDC Setup │ ├─ UAT             │ ├─ Production Switch
│ ├─ DPIA Review │ ├─ SCIM Setup      │ ├─ Role Validation │ ├─ Monitoring
│ └─ DPA Signing │ └─ Role Mapping    │ └─ Security Review │ └─ Retrospective
│                │                    │                    │
Day -2          Day 0               Day 5               Day 10
```

### Milestones

| Milestone | Day | Deliverable |
|-----------|-----|-------------|
| Kickoff Meeting | Day 0 | Requirements documented, roles assigned |
| DPIA Approved | Day 2 | Signed DPIA, security questionnaire complete |
| SSO Configured | Day 5 | Test users can login via SSO |
| SCIM Provisioned | Day 7 | Users auto-provisioned, roles synced |
| UAT Complete | Day 9 | All test scenarios passed |
| Go-Live | Day 10 | Production access enabled |

---

## Phase 1: Pre-Onboarding (Week 0)

**Duration**: 2-3 days
**Owner**: TEEI Implementation Consultant + Tenant IT Administrator

### Step 1.1: Kickoff Meeting

**Participants**:
- TEEI: Implementation Consultant, Customer Success Manager, Solutions Engineer
- Tenant: IT Administrator, Security Officer, Business Owner

**Agenda** (60 minutes):
1. Introductions and roles (10 min)
2. Platform overview and demo (15 min)
3. Technical architecture review (15 min)
4. Requirements gathering (15 min)
5. Timeline and milestones (5 min)

**Deliverables**:
- ✅ Requirements document completed
- ✅ Roles and responsibilities assigned
- ✅ Technical contact information exchanged
- ✅ Next steps scheduled

**Template**: Use [requirements_template.md](./requirements_template.md)

---

### Step 1.2: Requirements Gathering

Complete the following information:

#### Identity Provider Details
```yaml
idp_provider: Azure AD | Okta | Google Workspace | OneLogin | Other
idp_version: # e.g., Azure AD Premium P1
sso_protocol: SAML 2.0 | OIDC
scim_supported: Yes | No
scim_version: 2.0 | 1.1
```

#### User & Group Mapping
```yaml
expected_users: 250
active_users_monthly: 200
user_groups:
  - name: "TEEI-Admins"
    count: 5
    teei_role: ADMIN
  - name: "TEEI-Managers"
    count: 20
    teei_role: MANAGER
  - name: "TEEI-Users"
    count: 225
    teei_role: VIEWER
```

#### Email Domains
```yaml
primary_domain: company.com
additional_domains:
  - subsidiary.com
  - legacy-domain.com
```

#### Security Requirements
```yaml
mfa_required: Yes | No
session_timeout_minutes: 60
ip_whitelist_required: Yes | No
data_residency: EU | US | Other
```

---

### Step 1.3: Security Review

**Action**: Tenant completes security documentation (see [security_review_template.md](./security_review_template.md))

**Required Documents**:
1. **Data Protection Impact Assessment (DPIA)**
   - Processing activities description
   - Data flow mapping
   - Risk assessment and mitigation
   - Approval signatures

2. **Data Processing Agreement (DPA)**
   - Legal entity details
   - Data categories and processing purposes
   - Security commitments
   - Sub-processor list
   - Signed by authorized representatives

3. **Security Questionnaire**
   - SOC 2 Type II attestation review
   - ISO 27001 certification review
   - Penetration test results review
   - Encryption standards confirmation

**Timeline**: 2-3 business days for review and approval

**Approval**: Required from Tenant Security/Compliance Officer and TEEI DPO

---

### Step 1.4: Tenant Provisioning

**Owner**: TEEI Platform Engineering

**Actions**:
1. Create tenant record in database:
   ```sql
   INSERT INTO tenants (id, name, domain, status, created_at)
   VALUES ('acme-corp-001', 'Acme Corporation', 'acme.com', 'onboarding', NOW());
   ```

2. Generate company identifier:
   ```
   Company ID: acme-corp-001
   Staging URL: https://staging.teei-platform.com/en/cockpit/acme-corp-001
   ```

3. Create initial Super Admin user:
   ```sql
   INSERT INTO users (id, email, role, company_id, sso_enabled)
   VALUES (uuid_generate_v4(), 'admin@acme.com', 'SUPER_ADMIN', 'acme-corp-001', false);
   ```

4. Generate API keys for configuration:
   ```bash
   # Admin API key (for SSO/SCIM configuration)
   teei-cli api-key create --company acme-corp-001 --scope admin --name "Onboarding Admin Key"
   ```

**Deliverables**:
- ✅ Tenant URL provided to customer
- ✅ Super Admin credentials shared (via secure channel)
- ✅ API documentation links sent

---

## Phase 2: SSO Configuration (Week 1)

**Duration**: 2-3 days
**Owner**: Tenant IT Administrator (with TEEI support)

### Step 2.1: Choose SSO Protocol

**SAML 2.0** (Recommended for enterprise IdPs)
- ✅ Mature standard, widely supported
- ✅ Strong security with signed assertions
- ✅ Works with Azure AD, Okta, OneLogin
- ⚠️ More complex configuration

**OIDC** (Recommended for Google Workspace, modern IdPs)
- ✅ Modern standard, simpler configuration
- ✅ Native Google Workspace support
- ✅ JSON-based (easier debugging)
- ⚠️ Requires IdP to support OIDC

**Decision**: Document choice in requirements template

---

### Step 2.2: SAML 2.0 Configuration

**For**: Azure AD, Okta, OneLogin, etc.

#### A. Get TEEI SAML Metadata

**Endpoint**:
```
GET https://staging.teei-platform.com/api/auth/saml/{companyId}/metadata.xml
```

**Example Response**:
```xml
<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://teei.platform/saml/acme-corp-001">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="https://staging.teei-platform.com/api/auth/saml/acme-corp-001/acs"
                              index="0"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

**Key Values to Note**:
- **Entity ID**: `https://teei.platform/saml/acme-corp-001`
- **ACS URL**: `https://staging.teei-platform.com/api/auth/saml/acme-corp-001/acs`
- **Logout URL**: `https://staging.teei-platform.com/api/auth/saml/acme-corp-001/slo`

---

#### B. Configure IdP (Azure AD Example)

1. **Create Enterprise Application**:
   - Navigate to Azure Portal > Azure Active Directory > Enterprise Applications
   - Click "+ New application" > "Create your own application"
   - Name: "TEEI CSR Platform"
   - Select: "Integrate any other application you don't find in the gallery (Non-gallery)"
   - Click "Create"

2. **Configure SAML SSO**:
   - Go to application > Single sign-on > SAML
   - Click "Edit" on Basic SAML Configuration
   - **Identifier (Entity ID)**: `https://teei.platform/saml/acme-corp-001`
   - **Reply URL (ACS)**: `https://staging.teei-platform.com/api/auth/saml/acme-corp-001/acs`
   - **Sign on URL**: `https://staging.teei-platform.com/en/cockpit/acme-corp-001`
   - Click "Save"

3. **Configure Attributes & Claims**:
   - Edit "Attributes & Claims"
   - Ensure the following claims are mapped:
     ```
     Name ID: user.mail (Email format)
     email: user.mail
     firstName: user.givenname
     lastName: user.surname
     groups: user.groups (for role mapping)
     ```
   - Click "Save"

4. **Download IdP Metadata**:
   - Scroll to "SAML Signing Certificate"
   - Click "Download" next to "Federation Metadata XML"
   - Save as `azure-ad-metadata.xml`

5. **Assign Users**:
   - Go to application > Users and groups
   - Click "+ Add user/group"
   - Select test users or groups
   - Click "Assign"

---

#### C. Upload IdP Metadata to TEEI

**Method 1: Via Admin Console** (Recommended)
1. Login to TEEI admin console: `https://staging.teei-platform.com/en/cockpit/acme-corp-001/admin`
2. Navigate to "SSO Configuration"
3. Click "Upload IdP Metadata"
4. Select `azure-ad-metadata.xml`
5. Review parsed configuration
6. Click "Save & Enable"

**Method 2: Via API**
```bash
curl -X POST https://staging.teei-platform.com/api/identity/sso/acme-corp-001/metadata \
  -H "Authorization: Bearer {admin_api_key}" \
  -H "Content-Type: application/xml" \
  --data-binary @azure-ad-metadata.xml
```

**Verification**:
```bash
# Retrieve SSO configuration
curl -X GET https://staging.teei-platform.com/api/identity/sso/acme-corp-001/metadata \
  -H "Authorization: Bearer {admin_api_key}"
```

**Expected Response**:
```json
{
  "saml": {
    "enabled": true,
    "entity_id": "https://teei.platform/saml/acme-corp-001",
    "acs_url": "https://staging.teei-platform.com/api/auth/saml/acme-corp-001/acs",
    "metadata_url": "https://staging.teei-platform.com/api/auth/saml/acme-corp-001/metadata.xml",
    "certificate_fingerprint": "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD",
    "sign_requests": true,
    "want_assertions_signed": true,
    "name_id_format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  }
}
```

---

### Step 2.3: OIDC Configuration

**For**: Google Workspace, modern IdPs

#### A. Get TEEI OIDC Configuration

**Endpoint**:
```
GET https://staging.teei-platform.com/api/identity/sso/{companyId}/metadata
```

**Response** (OIDC section):
```json
{
  "oidc": {
    "enabled": false,
    "issuer": "https://accounts.google.com",
    "client_id": "teei-acme-corp-001.apps.googleusercontent.com",
    "redirect_uri": "https://staging.teei-platform.com/api/auth/oidc/acme-corp-001/callback",
    "scopes": ["openid", "profile", "email"],
    "response_type": "code",
    "grant_type": "authorization_code"
  }
}
```

#### B. Configure IdP (Google Workspace Example)

1. **Create OAuth 2.0 Client**:
   - Navigate to Google Cloud Console > APIs & Services > Credentials
   - Click "+ Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "TEEI CSR Platform"
   - Authorized redirect URIs:
     ```
     https://staging.teei-platform.com/api/auth/oidc/acme-corp-001/callback
     ```
   - Click "Create"

2. **Note Client Credentials**:
   ```
   Client ID: teei-acme-corp-001.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxx
   ```
   ⚠️ **SECURITY**: Store client secret securely. Never commit to version control.

3. **Configure OAuth Consent Screen**:
   - User Type: "Internal" (for Google Workspace)
   - App name: "TEEI CSR Platform"
   - Support email: `support@teei.com`
   - Scopes: `openid`, `profile`, `email`
   - Save and continue

#### C. Configure TEEI with OIDC Credentials

**Via Admin Console**:
1. Login to admin console
2. Navigate to "SSO Configuration" > "OIDC"
3. Enter:
   - **Issuer**: `https://accounts.google.com`
   - **Client ID**: `teei-acme-corp-001.apps.googleusercontent.com`
   - **Client Secret**: (paste securely)
   - **Scopes**: `openid profile email`
4. Click "Test Connection"
5. If successful, click "Save & Enable"

---

### Step 2.4: Test SSO Login

**Test Procedure**:

1. **Initiate SSO Login**:
   - Navigate to: `https://staging.teei-platform.com/en/cockpit/acme-corp-001`
   - Click "Sign in with SSO"
   - Should redirect to IdP login page

2. **Authenticate at IdP**:
   - Enter test user credentials
   - Complete MFA if required
   - Consent to application access (first time only)

3. **Verify Callback**:
   - Should redirect back to TEEI platform
   - User should be logged in
   - Dashboard should load

4. **Check User Profile**:
   - Navigate to user profile
   - Verify attributes populated:
     - Email
     - First name
     - Last name
     - Groups (if configured)

**Troubleshooting**:
- If login fails, check [Troubleshooting](#troubleshooting) section
- Review SAML/OIDC logs in admin console
- Verify IdP configuration matches TEEI metadata

---

## Phase 3: SCIM Provisioning (Week 1-2)

**Duration**: 2-3 days
**Owner**: Tenant IT Administrator (with TEEI support)

### Step 3.1: Enable SCIM in TEEI

**Via Admin Console**:
1. Login to admin console
2. Navigate to "SCIM Provisioning"
3. Click "Enable SCIM 2.0"
4. Configure settings:
   ```yaml
   sync_frequency_minutes: 15
   supported_operations:
     - CREATE
     - UPDATE
     - DELETE
     - PATCH
   user_attributes:
     - userName (required)
     - name.givenName
     - name.familyName
     - emails[0].value (primary)
     - active
   group_attributes:
     - displayName
     - members
   ```
5. Click "Generate SCIM Token"
6. **IMPORTANT**: Copy token immediately (shown only once)
   ```
   Token: scim_acme_corp_001_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
   ```

**SCIM Endpoint**:
```
Base URL: https://staging.teei-platform.com/api/scim/v2
Authentication: Bearer {scim_token}
```

---

### Step 3.2: Configure SCIM in IdP (Azure AD Example)

1. **Navigate to Provisioning**:
   - Go to Azure Portal > Enterprise Applications > TEEI CSR Platform
   - Click "Provisioning" in left menu
   - Click "Get started"

2. **Configure Provisioning Settings**:
   - **Provisioning Mode**: "Automatic"
   - **Tenant URL**: `https://staging.teei-platform.com/api/scim/v2`
   - **Secret Token**: `scim_acme_corp_001_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456`
   - Click "Test Connection"
   - Should show "✓ The supplied credentials are authorized to enable provisioning"
   - Click "Save"

3. **Configure Attribute Mappings**:
   - Click "Provisioning" > "Mappings"
   - Edit "Provision Azure Active Directory Users"
   - Verify mappings:
     ```
     Azure AD Attribute        SCIM Attribute
     ─────────────────────    ───────────────
     userPrincipalName        userName
     givenName                name.givenName
     surname                  name.familyName
     mail                     emails[0].value
     accountEnabled           active
     ```
   - Edit "Provision Azure Active Directory Groups" (if using groups)
   - Verify mappings:
     ```
     Azure AD Attribute        SCIM Attribute
     ─────────────────────    ───────────────
     displayName              displayName
     members                  members
     ```
   - Click "Save"

4. **Configure Scope**:
   - Click "Settings"
   - **Scope**: "Sync only assigned users and groups" (recommended for pilot)
   - Click "Save"

5. **Start Provisioning**:
   - Set "Provisioning Status" to "On"
   - Click "Save"
   - **Initial sync** will begin (may take 20-40 minutes)

---

### Step 3.3: Monitor SCIM Sync

**Via TEEI Admin Console**:
1. Navigate to "SCIM Provisioning" > "Status"
2. Monitor sync progress:
   ```
   Last Sync: 2025-11-15 10:30:00 UTC
   Status: In Progress
   Users Synced: 47 / 250
   Groups Synced: 3 / 12
   Errors: 0
   ```

**Via API**:
```bash
curl -X GET https://staging.teei-platform.com/api/identity/scim/acme-corp-001/status \
  -H "Authorization: Bearer {admin_api_key}"
```

**Expected Response** (after successful sync):
```json
{
  "config": {
    "enabled": true,
    "endpoint": "https://staging.teei-platform.com/api/scim/v2",
    "sync_frequency_minutes": 15,
    "supported_operations": ["CREATE", "UPDATE", "DELETE", "PATCH"]
  },
  "sync_status": {
    "last_sync_at": "2025-11-15T10:45:00Z",
    "last_sync_status": "success",
    "next_sync_at": "2025-11-15T11:00:00Z",
    "users_synced": 250,
    "groups_synced": 12,
    "errors_count": 0,
    "duration_ms": 3420
  },
  "metrics": {
    "total_users": 250,
    "total_groups": 12,
    "users_created_last_sync": 250,
    "users_updated_last_sync": 0,
    "users_deleted_last_sync": 0,
    "groups_created_last_sync": 12,
    "groups_updated_last_sync": 0,
    "groups_deleted_last_sync": 0
  }
}
```

---

### Step 3.4: Verify User Provisioning

**Manual Verification**:
1. Login to TEEI admin console
2. Navigate to "Users" > "User Directory"
3. Verify users appear in list
4. Spot-check user details:
   - Email matches IdP
   - Name populated correctly
   - Group membership synced
   - Status = Active

**API Verification**:
```bash
# List all users for tenant
curl -X GET https://staging.teei-platform.com/api/users?company_id=acme-corp-001 \
  -H "Authorization: Bearer {admin_api_key}"
```

**Test User Login**:
1. Ask provisioned user to login via SSO
2. Verify they can access dashboard
3. Verify role is correctly assigned

---

## Phase 4: Testing & Validation (Week 2)

**Duration**: 2-3 days
**Owner**: TEEI QA + Tenant IT Administrator

### Step 4.1: Role Mapping Configuration

**Objective**: Map IdP groups/claims to TEEI roles

**TEEI Roles**:
- `VIEWER`: Read-only dashboard access
- `MANAGER`: Can create reports, export data
- `ADMIN`: Full access to admin console (except API keys)
- `SUPER_ADMIN`: Full platform access including API key management

**Mapping Strategy**:
```yaml
IdP Group                 TEEI Role        Priority
──────────────────────   ──────────────   ────────
TEEI-Super-Admins        SUPER_ADMIN      100
TEEI-Admins              ADMIN            90
TEEI-Managers            MANAGER          80
TEEI-CSR-Team            VIEWER           70
*@acme.com               VIEWER           10  # Default fallback
```

**Create Mappings via Admin Console**:
1. Navigate to "Role Mappings"
2. Click "+ Add Mapping"
3. Configure mapping:
   ```yaml
   IdP Claim: groups
   Claim Value: TEEI-Super-Admins
   TEEI Role: SUPER_ADMIN
   Priority: 100
   Enabled: Yes
   Description: Company super administrators with full platform access
   ```
4. Click "Save"
5. Repeat for all role mappings

**Create Mappings via API**:
```bash
curl -X POST https://staging.teei-platform.com/api/identity/scim/acme-corp-001/mappings \
  -H "Authorization: Bearer {admin_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "idp_claim": "groups",
    "claim_value": "TEEI-Admins",
    "teei_role": "ADMIN",
    "priority": 90,
    "enabled": true,
    "description": "Company administrators and report reviewers"
  }'
```

**Validation**:
- ✅ Verify all expected groups mapped
- ✅ Test priority order (higher priority wins)
- ✅ Test fallback mapping (default role)

---

### Step 4.2: User Acceptance Testing (UAT)

**Test Scenarios**:

#### Scenario 1: SSO Login Flow
```gherkin
Given I am a user in the IdP
When I navigate to https://staging.teei-platform.com/en/cockpit/acme-corp-001
And I click "Sign in with SSO"
Then I should be redirected to IdP login
When I enter valid credentials
Then I should be redirected back to TEEI
And I should see my dashboard
And my user profile should be populated
```

**Test Users**:
- `viewer@acme.com` → Expected role: VIEWER
- `manager@acme.com` → Expected role: MANAGER
- `admin@acme.com` → Expected role: ADMIN
- `superadmin@acme.com` → Expected role: SUPER_ADMIN

**Verification Checklist**:
- [ ] All test users can login via SSO
- [ ] User attributes populated correctly
- [ ] Roles assigned per mapping rules
- [ ] Session persists across page navigation
- [ ] Logout works correctly

---

#### Scenario 2: SCIM Provisioning
```gherkin
Given SCIM provisioning is enabled
When a new user is created in IdP
Then the user should appear in TEEI within 15 minutes
And the user should have correct attributes
And the user should be assigned to correct groups

When a user is updated in IdP
Then the changes should sync to TEEI within 15 minutes

When a user is deactivated in IdP
Then the user should be marked inactive in TEEI
And the user should not be able to login
```

**Test Actions**:
1. Create new user in IdP → Wait 15 minutes → Verify in TEEI
2. Update user email in IdP → Wait 15 minutes → Verify in TEEI
3. Add user to group in IdP → Wait 15 minutes → Verify role change
4. Deactivate user in IdP → Wait 15 minutes → Verify cannot login

**Verification Checklist**:
- [ ] New users provisioned automatically
- [ ] User updates synced correctly
- [ ] Group membership updates role
- [ ] Deactivated users cannot login
- [ ] No errors in SCIM logs

---

#### Scenario 3: Role-Based Access Control
```gherkin
Given I am logged in as a VIEWER
When I try to access the admin console
Then I should see "Access Denied" error
And I should not see admin menu items

Given I am logged in as an ADMIN
When I access the admin console
Then I should see all admin features except API key management

Given I am logged in as a SUPER_ADMIN
When I access the admin console
Then I should see all features including API key management
```

**Verification Checklist**:
- [ ] VIEWER cannot access admin console
- [ ] VIEWER can view dashboard but not export
- [ ] MANAGER can export data
- [ ] ADMIN can configure SSO/SCIM
- [ ] SUPER_ADMIN can manage API keys

---

#### Scenario 4: Multi-Tenant Isolation
```gherkin
Given I am a user of Company A
When I try to access Company B's cockpit URL
Then I should see "Access Denied" error
And I should not see any Company B data
```

**Test Actions**:
1. Login as Company A user
2. Attempt to navigate to Company B URL
3. Verify 403 Forbidden or redirect to Company A

**Verification Checklist**:
- [ ] Users cannot access other tenants' data
- [ ] Cross-tenant API calls blocked
- [ ] Tenant ID validated on all routes

---

### Step 4.3: Security Validation

**Security Test Checklist**:

#### Authentication & Authorization
- [ ] SSO certificate validation enforced
- [ ] Invalid SAML assertions rejected
- [ ] Expired tokens rejected
- [ ] Role escalation prevented
- [ ] API key permissions enforced

#### Data Protection
- [ ] PII encrypted at rest
- [ ] TLS 1.2+ enforced for all connections
- [ ] Session cookies have Secure and HttpOnly flags
- [ ] CSRF protection enabled
- [ ] No secrets in browser console/network logs

#### Compliance
- [ ] DPIA approved and signed
- [ ] DPA executed
- [ ] Audit logs capture SSO/SCIM events
- [ ] Data retention policies configured
- [ ] GDPR endpoints functional (`/v1/privacy/export`)

---

### Step 4.4: Performance Testing

**Load Test Scenarios**:

1. **SSO Login Storm**:
   - Simulate 50 concurrent logins
   - Verify response time < 2 seconds
   - Verify no failed logins

2. **SCIM Sync**:
   - Provision 500 users in IdP
   - Verify sync completes within 10 minutes
   - Verify no errors in logs

3. **Dashboard Load**:
   - 20 concurrent users viewing dashboard
   - Verify page load < 3 seconds
   - Verify no database connection pool exhaustion

**Tools**:
- Apache JMeter (load testing)
- Lighthouse (frontend performance)
- New Relic / DataDog (monitoring)

---

## Phase 5: Go-Live (Week 2-3)

**Duration**: 1-2 days
**Owner**: TEEI Operations + Tenant Stakeholders

### Step 5.1: Pre-Launch Checklist

**Technical Readiness**:
- [ ] All UAT scenarios passed
- [ ] Security validation complete
- [ ] Performance tests passed
- [ ] Monitoring and alerts configured
- [ ] Runbooks documented
- [ ] Support team trained

**Business Readiness**:
- [ ] Stakeholders trained on platform
- [ ] User communication sent (launch announcement)
- [ ] Support process documented
- [ ] Escalation paths defined
- [ ] Success metrics defined

**Compliance Readiness**:
- [ ] DPIA signed and filed
- [ ] DPA executed
- [ ] Privacy policy updated
- [ ] User consent mechanisms active
- [ ] Data processing records updated

---

### Step 5.2: Production Cutover

**Cutover Plan**:

1. **Maintenance Window** (if required):
   - Schedule: Saturday 2:00 AM - 6:00 AM UTC
   - Notify users 1 week in advance
   - Set up status page

2. **Database Migration** (if schema changes):
   ```bash
   # Backup production database
   pg_dump -h prod-db -U teei_admin -d teei_platform > backup_pre_cutover.sql

   # Run migrations
   pnpm db:migrate --env production

   # Verify migration
   pnpm db:status --env production
   ```

3. **SSO Configuration Update**:
   - Update IdP redirect URLs from `staging.teei-platform.com` to `app.teei-platform.com`
   - Update SCIM endpoint URL
   - Regenerate SCIM token for production

4. **DNS/Routing Update**:
   - Update DNS to point to production environment
   - Verify SSL certificate valid
   - Test health endpoints

5. **Enable Production Access**:
   - Flip feature flag: `TENANT_ACME_CORP_001_ENABLED=true`
   - Restart application servers
   - Verify health checks passing

---

### Step 5.3: Post-Launch Monitoring

**Monitor for 48 Hours**:

**Metrics to Watch**:
- SSO login success rate (target: > 99%)
- SCIM sync errors (target: 0)
- API response times (target: p95 < 500ms)
- Error rate (target: < 0.1%)
- User engagement (dashboard views, report creation)

**Monitoring Tools**:
- New Relic / DataDog dashboard
- TEEI admin console (SCIM status, audit logs)
- IdP provisioning logs
- Slack alerts for errors

**Daily Standups** (Days 1-3):
- Review metrics
- Address user-reported issues
- Adjust monitoring thresholds if needed

---

### Step 5.4: Hypercare Period

**Duration**: 2 weeks post-launch

**Activities**:
- Daily check-ins with tenant stakeholders
- Review support tickets and resolution time
- Optimize performance based on usage patterns
- Collect user feedback
- Address quick wins and minor issues

**Success Metrics**:
- User satisfaction score > 4/5
- Support ticket volume < 5 per day
- Zero critical incidents
- SSO login success rate > 99%

---

## Post-Onboarding

### Training & Enablement

**Provided Materials**:
- ✅ Admin console user guide
- ✅ End-user quick start guide
- ✅ Video tutorials (SSO login, report creation)
- ✅ FAQ document (see [admin_faq.md](./admin_faq.md))

**Live Training Sessions**:
- **Session 1**: Admin Console Overview (60 min)
  - Audience: Admins, Super Admins
  - Topics: User management, role mappings, SCIM monitoring

- **Session 2**: End User Training (30 min)
  - Audience: All users
  - Topics: Login, dashboard navigation, report viewing

**Office Hours**:
- Weekly for first month
- Bi-weekly for months 2-3
- On-demand after month 3

---

### Ongoing Support

**Support Tiers**:

| Priority | Response Time | Resolution Time | Examples |
|----------|---------------|-----------------|----------|
| P1 (Critical) | 1 hour | 4 hours | SSO down, cannot login |
| P2 (High) | 4 hours | 24 hours | SCIM sync failing, role mapping broken |
| P3 (Medium) | 1 business day | 3 business days | Feature request, minor bug |
| P4 (Low) | 2 business days | Best effort | Documentation update, general question |

**Support Channels**:
- **Email**: support@teei.com
- **Slack**: `#teei-support` (shared channel with tenant)
- **Ticketing System**: Jira Service Management
- **Emergency Hotline**: +1-XXX-XXX-XXXX (P1 only)

**Customer Success Manager**:
- Assigned CSM for each tenant
- Quarterly Business Reviews (QBRs)
- Feature adoption analysis
- Success plan updates

---

### Continuous Improvement

**Review Cadence**:
- **Weekly** (first month): SCIM sync health, error rates
- **Monthly**: Usage analytics, feature adoption
- **Quarterly**: QBR with stakeholder feedback
- **Annually**: Contract renewal, roadmap alignment

**Feedback Mechanisms**:
- In-app feedback widget
- User satisfaction surveys (quarterly)
- Admin roundtables (bi-monthly)
- Feature request voting board

---

## Troubleshooting

### SSO Issues

#### Problem: "SAML response signature validation failed"

**Cause**: IdP certificate mismatch or expired

**Resolution**:
1. Re-download IdP metadata from IdP
2. Upload updated metadata to TEEI admin console
3. Verify certificate fingerprint matches:
   ```bash
   curl -X GET https://staging.teei-platform.com/api/identity/sso/acme-corp-001/metadata
   # Check certificate_fingerprint field
   ```
4. Test SSO login again

---

#### Problem: "User not provisioned after SSO login"

**Cause**: SCIM not enabled or user not in scope

**Resolution**:
1. Verify SCIM enabled: Admin Console > SCIM Provisioning > Status
2. Check user is assigned to application in IdP
3. Manually trigger SCIM sync:
   ```bash
   curl -X POST https://staging.teei-platform.com/api/identity/scim/acme-corp-001/sync \
     -H "Authorization: Bearer {admin_api_key}"
   ```
4. Check SCIM logs for errors

---

#### Problem: "Invalid role assigned to user"

**Cause**: Role mapping priority conflict or misconfiguration

**Resolution**:
1. Review role mappings: Admin Console > Role Mappings
2. Check user's group membership in IdP
3. Verify mapping priority (higher = more important)
4. Test mapping with dry-run:
   ```bash
   curl -X POST https://staging.teei-platform.com/api/identity/scim/acme-corp-001/test-mapping \
     -H "Authorization: Bearer {admin_api_key}" \
     -d '{"user_id": "test@acme.com"}'
   ```

---

### SCIM Issues

#### Problem: "SCIM sync failing with 401 Unauthorized"

**Cause**: SCIM token invalid or expired

**Resolution**:
1. Regenerate SCIM token: Admin Console > SCIM Provisioning > Generate Token
2. Update token in IdP provisioning configuration
3. Test connection in IdP
4. Monitor next sync cycle

---

#### Problem: "Users not syncing from IdP"

**Cause**: Provisioning not enabled or scoping issue

**Resolution**:
1. Verify provisioning status in IdP (should be "On")
2. Check scope setting (should include assigned users/groups)
3. Check IdP provisioning logs for errors
4. Manually trigger sync in IdP (if supported)
5. Check TEEI SCIM logs:
   ```bash
   curl -X GET "https://staging.teei-platform.com/api/identity/scim/acme-corp-001/logs?error_only=true" \
     -H "Authorization: Bearer {admin_api_key}"
   ```

---

### Performance Issues

#### Problem: "Dashboard loading slowly"

**Cause**: Too many users, large data volume, or network latency

**Resolution**:
1. Check network latency: `ping staging.teei-platform.com`
2. Review browser console for errors
3. Clear browser cache
4. Contact support if issue persists (may need performance optimization)

---

#### Problem: "SCIM sync taking too long"

**Cause**: Large user base or rate limiting

**Resolution**:
1. Check user count (> 1000 users may need batching)
2. Review SCIM logs for rate limit errors
3. Increase sync frequency if needed
4. Contact support for bulk import option

---

## Support & Escalation

### Internal TEEI Contacts

| Role | Name | Contact | Responsibility |
|------|------|---------|----------------|
| Implementation Consultant | TBD | impl@teei.com | Onboarding, configuration |
| Customer Success Manager | TBD | csm@teei.com | Ongoing support, QBRs |
| Solutions Engineer | TBD | solutions@teei.com | Technical deep-dives |
| Support Engineer | TBD | support@teei.com | Issue resolution |
| DPO (Data Protection Officer) | TBD | dpo@teei.com | Privacy, compliance |

### Escalation Path

**Level 1 → Level 2 → Level 3**

1. **L1 Support** (support@teei.com)
   - Initial triage
   - Common issues resolution
   - Documentation guidance

2. **L2 Support** (Solutions Engineer)
   - Complex technical issues
   - Configuration problems
   - Integration debugging

3. **L3 Support** (Engineering Team)
   - Platform bugs
   - Critical incidents
   - Code fixes required

**Escalation Triggers**:
- Issue unresolved after 2 business days (P3/P4)
- Issue unresolved after 24 hours (P2)
- Issue unresolved after 4 hours (P1)
- Customer request for escalation

---

## Appendix

### A. Terminology

| Term | Definition |
|------|------------|
| **IdP** | Identity Provider (e.g., Azure AD, Okta) |
| **SSO** | Single Sign-On |
| **SAML** | Security Assertion Markup Language |
| **OIDC** | OpenID Connect |
| **SCIM** | System for Cross-domain Identity Management |
| **ACS** | Assertion Consumer Service (SAML callback endpoint) |
| **DPA** | Data Processing Agreement |
| **DPIA** | Data Protection Impact Assessment |
| **RBAC** | Role-Based Access Control |

### B. Reference Links

- [Worker 1 Identity API Contract](/docs/api/worker1-identity-api-contract.md)
- [Security Review Template](/docs/pilot/security_review_template.md)
- [Admin FAQ](/docs/pilot/admin_faq.md)
- [GDPR Compliance Guide](/docs/GDPR_Compliance.md)
- [Staging Rollout Playbook](/docs/pilot/staging_rollout.md)

### C. Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-15 | Initial version | SSO Onboarding Specialist |

---

**Questions?** Contact the onboarding team at onboarding@teei.com or your assigned Implementation Consultant.
