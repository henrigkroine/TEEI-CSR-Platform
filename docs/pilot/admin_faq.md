# Admin FAQ - TEEI CSR Platform

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Worker 1 - Identity & SSO Team
**Audience**: Tenant Administrators, IT Support, Help Desk

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [SSO & Authentication](#sso--authentication)
3. [SCIM User Provisioning](#scim-user-provisioning)
4. [Role Management](#role-management)
5. [Dashboard Access](#dashboard-access)
6. [Admin Console](#admin-console)
7. [Troubleshooting](#troubleshooting)
8. [Support & Escalation](#support--escalation)

---

## Getting Started

### Q: What is the TEEI CSR Platform?

**A:** The TEEI CSR Platform is a corporate social responsibility management system that helps organizations track, measure, and report on their CSR programs. It includes features for:
- Program enrollment and participant management
- Volunteer/mentor matching
- Training and skills development tracking
- Impact measurement (SROI, VIS calculations)
- Executive reporting and dashboards
- Integration with HR systems via SSO and SCIM

---

### Q: What is my company's unique URL?

**A:** Your company-specific cockpit URL follows this format:

```
https://app.teei-platform.com/en/cockpit/{your-company-id}
```

Your Company ID was provided during onboarding. Examples:
- `https://app.teei-platform.com/en/cockpit/acme-corp-001`
- `https://app.teei-platform.com/en/cockpit/global-tech-inc`

**Bookmark this URL** for quick access. You can also access it via your IdP's application portal (e.g., Azure AD "My Apps").

---

### Q: What are the different user roles?

**A:** The TEEI platform has four roles:

| Role | Permissions | Typical Users |
|------|-------------|---------------|
| **VIEWER** | View dashboards and reports only (no editing or exporting) | All employees, program participants |
| **MANAGER** | View, create reports, export data (CSV/PDF) | Team managers, program coordinators |
| **ADMIN** | Full admin console access (except API keys), user management, SSO/SCIM configuration | IT administrators, HR leads |
| **SUPER_ADMIN** | Full platform access including API key management, tenant settings | CTO, IT Director |

**Note**: Roles are assigned automatically via role mappings based on your IdP group membership.

---

### Q: How do I become an admin?

**A:** You need to be added to the appropriate group in your Identity Provider (IdP):

1. **Azure AD**: Ask your Azure AD administrator to add you to the TEEI admin group (e.g., "TEEI-Admins")
2. **Okta**: Request membership in the TEEI admin group
3. **Google Workspace**: Join the TEEI admin Google Group

After being added to the group, wait 15 minutes for SCIM to sync, then log out and log back in. Your role should update automatically.

If your role doesn't update, see [Troubleshooting: Role Assignment Issues](#troubleshooting-role-assignment-issues).

---

### Q: Can I have multiple users with SUPER_ADMIN access?

**A:** Yes, but we recommend limiting SUPER_ADMIN to 2-5 users for security reasons. SUPER_ADMIN users can:
- Manage API keys (which grant programmatic access)
- Modify SSO/SCIM configuration
- Delete tenant data
- Override all permissions

**Best Practice**:
- Assign SUPER_ADMIN to CTO, IT Director, or equivalent
- Use ADMIN role for day-to-day administration
- Implement MFA for all SUPER_ADMIN accounts

---

## SSO & Authentication

### Q: Which SSO protocols are supported?

**A:** TEEI supports:
- **SAML 2.0** (recommended for Azure AD, Okta, OneLogin)
- **OIDC** (OpenID Connect) (recommended for Google Workspace)

Both provide secure, enterprise-grade authentication.

---

### Q: How do users log in with SSO?

**A:**

1. Navigate to your company's cockpit URL
2. Click "Sign in with SSO" button
3. You'll be redirected to your company's login page (Azure AD, Okta, Google, etc.)
4. Enter your company credentials
5. Complete MFA if required
6. You'll be redirected back to TEEI and automatically logged in

**No separate password needed** - TEEI uses your existing company identity.

---

### Q: Can users still use username/password instead of SSO?

**A:** Once SSO is enabled for your tenant, **only SSO authentication is allowed** for security and compliance reasons. This ensures:
- Centralized access control
- Consistent password policies
- MFA enforcement
- Audit trail in your IdP
- Easy offboarding (disable in IdP = instant TEEI access removal)

**Exception**: The initial Super Admin account created during onboarding may have a local password for emergency access. This should only be used if SSO is unavailable.

---

### Q: What happens if SSO goes down?

**A:** If your IdP is unavailable:

1. **Existing sessions continue to work** (for up to 8 hours, depending on session timeout)
2. **New logins will fail** until IdP is restored
3. **Emergency access**: Contact TEEI support for temporary local authentication if needed (SUPER_ADMIN only, requires approval)

**Best Practice**: Configure IdP high availability and monitor uptime. Most enterprise IdPs (Azure AD, Okta, Google) have 99.9%+ uptime SLAs.

---

### Q: How do I test SSO without affecting all users?

**A:** During onboarding, TEEI provides a staging environment:

```
Staging: https://staging.teei-platform.com/en/cockpit/{company-id}
Production: https://app.teei-platform.com/en/cockpit/{company-id}
```

**Testing Steps**:
1. Configure SSO in staging first
2. Test with a small group of pilot users
3. Verify login flow, user attributes, role assignment
4. Once validated, replicate configuration to production

---

### Q: Can we use different SSO providers for different user groups?

**A:** No, each tenant can have **one SSO provider** configured (either SAML or OIDC). All users must authenticate through the same IdP.

**Workaround**: If you have multiple IdPs (e.g., Azure AD for employees, Okta for contractors), configure federation in your primary IdP so all users can authenticate through one entry point.

---

### Q: How do I update SSO metadata after IdP certificate rotation?

**A:**

**Method 1: Admin Console (Recommended)**
1. Download new metadata XML from your IdP
2. Login to TEEI admin console: `/en/cockpit/{company-id}/admin`
3. Navigate to "SSO Configuration"
4. Click "Upload New Metadata"
5. Select the new metadata file
6. Click "Save"
7. Test login with a test user

**Method 2: API**
```bash
curl -X POST https://app.teei-platform.com/api/identity/sso/{company-id}/metadata \
  -H "Authorization: Bearer {admin_api_key}" \
  -H "Content-Type: application/xml" \
  --data-binary @new-metadata.xml
```

**Timing**: Update metadata **before** the old certificate expires to avoid login outages.

---

## SCIM User Provisioning

### Q: What is SCIM and why do I need it?

**A:** SCIM (System for Cross-domain Identity Management) is a standard protocol for automatically syncing users and groups from your IdP to TEEI.

**Benefits**:
- **Automatic user creation**: New employees get TEEI access automatically
- **Automatic updates**: Email changes, name changes sync automatically
- **Automatic deactivation**: Offboarded employees lose access immediately
- **No manual user management**: IT admins don't need to manually create/delete users

**Without SCIM**: You'd need to manually create each user in TEEI, update their info manually, and remember to deactivate them when they leave.

---

### Q: How often does SCIM sync?

**A:** By default, SCIM syncs every **15 minutes**. This means:
- New users appear in TEEI within 15 minutes
- Updates (email, name, group changes) sync within 15 minutes
- Deactivated users lose access within 15 minutes

**Manual sync**: Admins can trigger an immediate sync via the admin console or API if needed.

---

### Q: Can I manually create users instead of using SCIM?

**A:** Yes, but it's not recommended for the following reasons:

**Manual user creation**:
- ❌ Time-consuming for large user bases
- ❌ Prone to errors (typos in emails, wrong roles)
- ❌ Users not deactivated when they leave the company
- ❌ No automatic role updates when group membership changes

**SCIM provisioning**:
- ✅ Fully automated
- ✅ Always in sync with your IdP
- ✅ Security best practice
- ✅ Required for enterprise compliance

**Use Case for Manual Creation**: Small pilot with < 10 users, or temporary test accounts.

---

### Q: Which IdPs support SCIM?

**A:** TEEI supports SCIM 2.0 with the following IdPs:

- ✅ **Azure Active Directory** (Azure AD Premium required)
- ✅ **Okta** (SCIM built-in)
- ✅ **OneLogin** (SCIM built-in)
- ✅ **Google Workspace** (via SCIM connector)
- ✅ **JumpCloud**
- ❌ **Basic Azure AD** (requires Premium license for SCIM)

**Not sure if your IdP supports SCIM?** Contact TEEI support with your IdP name and version.

---

### Q: What user attributes are synced via SCIM?

**A:** TEEI syncs the following attributes:

| Attribute | Required | SCIM Field | Example |
|-----------|----------|------------|---------|
| Email | Yes | `emails[0].value` | `john.doe@company.com` |
| First Name | Yes | `name.givenName` | `John` |
| Last Name | Yes | `name.familyName` | `Doe` |
| Username | Yes | `userName` | `john.doe@company.com` |
| Active Status | Yes | `active` | `true` / `false` |
| Groups | No | `groups` | `["TEEI-Admins", "Managers"]` |

**Note**: Groups are used for role mapping (see [Role Management](#role-management)).

---

### Q: What happens if a user is deactivated in the IdP?

**A:**

1. **Within 15 minutes** (next SCIM sync), the user's status is updated to `active: false` in TEEI
2. **Immediate effect**: User cannot log in via SSO (login will fail at IdP)
3. **Existing sessions**: User is logged out on next page refresh
4. **Data retention**: User data is NOT deleted, only access is revoked
5. **Re-activation**: If user is re-activated in IdP, access is restored on next sync

**Best Practice**: Always deactivate users in your IdP (not in TEEI directly) to ensure consistency.

---

### Q: Can I test SCIM sync without affecting production?

**A:** Yes, use the **SCIM Test** feature:

1. Login to admin console
2. Navigate to "SCIM Provisioning" > "Test Sync"
3. Click "Run Dry-Run Test"
4. Review preview of changes (users to create/update/delete)
5. Verify expected results
6. If correct, enable SCIM provisioning

**Dry-run mode**: Queries IdP and shows what would happen, but doesn't make any changes.

---

### Q: How do I monitor SCIM sync status?

**A:**

**Via Admin Console**:
1. Navigate to "SCIM Provisioning" > "Status"
2. View:
   - Last sync timestamp
   - Sync status (success/failed)
   - Users/groups synced
   - Error count
   - Next sync time

**Via API**:
```bash
curl -X GET https://app.teei-platform.com/api/identity/scim/{company-id}/status \
  -H "Authorization: Bearer {admin_api_key}"
```

**Error Notifications**: Admins receive email alerts if SCIM sync fails 3 consecutive times.

---

### Q: Why are some users not syncing from IdP?

**Common causes**:

1. **User not assigned to TEEI application** in IdP
   - Fix: In IdP, assign user to TEEI enterprise application

2. **Provisioning scope set to "selected groups only"**
   - Fix: In IdP provisioning settings, change scope to include user's group

3. **User missing required attributes** (email, firstName, lastName)
   - Fix: Populate required fields in IdP user profile

4. **SCIM token expired or invalid**
   - Fix: Regenerate SCIM token in TEEI admin console, update in IdP

5. **IdP provisioning turned off**
   - Fix: In IdP, set "Provisioning Status" to "On"

**Debugging**: Check SCIM logs in admin console for specific error messages.

---

## Role Management

### Q: How do I assign roles to users?

**A:** Roles are assigned automatically via **role mappings** based on IdP group membership.

**Setup Process**:

1. **Create groups in your IdP**:
   - `TEEI-Super-Admins` → SUPER_ADMIN role
   - `TEEI-Admins` → ADMIN role
   - `TEEI-Managers` → MANAGER role
   - `TEEI-Users` → VIEWER role (default)

2. **Configure role mappings in TEEI**:
   - Login to admin console
   - Navigate to "Role Mappings"
   - Create mapping: `groups = "TEEI-Admins"` → `ADMIN`
   - Set priority (100 = highest)

3. **Add users to groups in IdP**:
   - Users automatically get correct role on next SCIM sync (15 min)

**Manual role assignment**: Not recommended, as it breaks sync with IdP.

---

### Q: Can a user have multiple roles?

**A:** No, each user has **one role** at a time. If a user is in multiple groups with different role mappings, the **highest priority mapping wins**.

**Example**:
```
User John is in:
- "TEEI-Users" (priority 10) → VIEWER
- "TEEI-Admins" (priority 90) → ADMIN

Result: John gets ADMIN role (priority 90 > priority 10)
```

**Best Practice**: Keep group membership mutually exclusive to avoid confusion.

---

### Q: How do I create a role mapping?

**A:**

**Via Admin Console**:
1. Navigate to "Role Mappings"
2. Click "+ Add Mapping"
3. Configure:
   - **IdP Claim**: `groups` (for group-based mapping)
   - **Claim Value**: `TEEI-Managers` (exact group name from IdP)
   - **TEEI Role**: `MANAGER`
   - **Priority**: `80` (higher = more important)
   - **Enabled**: Yes
   - **Description**: "Team managers who can create reports"
4. Click "Save"
5. Test with a user in that group

**Via API**:
```bash
curl -X POST https://app.teei-platform.com/api/identity/scim/{company-id}/mappings \
  -H "Authorization: Bearer {admin_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "idp_claim": "groups",
    "claim_value": "TEEI-Managers",
    "teei_role": "MANAGER",
    "priority": 80,
    "enabled": true,
    "description": "Team managers who can create reports"
  }'
```

---

### Q: What if a user's group name changes in the IdP?

**A:** You need to update the role mapping:

1. Navigate to "Role Mappings"
2. Find the mapping with the old group name
3. Click "Edit"
4. Update "Claim Value" to new group name
5. Click "Save"

**Alternative**: Keep IdP group names stable. If renaming, create new group, migrate users, then delete old group.

---

### Q: Can I use email domain for role mapping?

**A:** Yes! You can map by email domain for default roles:

**Example**:
```yaml
IdP Claim: email
Claim Value: *@company.com
TEEI Role: VIEWER
Priority: 10
Description: Default role for all company employees
```

This acts as a **fallback** - users not in any specific group get VIEWER role.

**Wildcard support**: `*` matches any characters
- `*@company.com` → all company emails
- `admin-*@company.com` → admin emails only

---

### Q: How do I troubleshoot incorrect role assignments?

**A:** Use the **Test Mapping** feature:

1. Navigate to "Role Mappings"
2. Click "Test User"
3. Enter user's email
4. View results:
   - User's IdP groups
   - Matching mappings
   - Final assigned role
   - Priority calculation

**Common Issues**:
- User not in any mapped group → Falls back to lowest priority (usually VIEWER)
- User in multiple groups → Highest priority mapping wins
- Mapping disabled → Ignored even if user in group

---

## Dashboard Access

### Q: Why can't users see the dashboard after logging in?

**Common causes**:

1. **User role is VIEWER, dashboard not published** for viewers
   - Fix: Publish dashboard to all roles in admin console

2. **Tenant not fully activated**
   - Fix: Verify tenant status in admin console (should be "Active")

3. **Browser cache issue**
   - Fix: Clear cache (Ctrl+Shift+Delete) and reload

4. **User has no program enrollments**
   - Fix: Enroll user in at least one program, or grant them a role that allows viewing all programs

5. **JavaScript errors in browser**
   - Fix: Open browser console (F12), check for errors, report to support

---

### Q: What browsers are supported?

**A:** TEEI supports the latest versions of:

- ✅ **Google Chrome** (recommended)
- ✅ **Microsoft Edge** (Chromium-based)
- ✅ **Mozilla Firefox**
- ✅ **Apple Safari** (macOS and iOS)
- ⚠️ **Internet Explorer 11** (deprecated, limited support)

**Recommendation**: Use Chrome or Edge for best experience.

---

### Q: Can users access TEEI on mobile devices?

**A:** Yes! TEEI is fully responsive and works on:

- 📱 **Mobile phones** (iOS, Android)
- 📱 **Tablets** (iPad, Android tablets)
- 💻 **Laptops and desktops**

**Mobile App**: Currently web-only. A native mobile app is on the roadmap for 2026.

---

### Q: How do I grant users access to specific programs?

**A:** Program access is controlled by:

1. **User role** (VIEWER, MANAGER, ADMIN, SUPER_ADMIN)
2. **Program enrollment** (users see programs they're enrolled in)
3. **Admin/Manager permissions** (see all programs in tenant)

**To grant access**:
- **Individual participation**: Enroll user in program (via admin console or API)
- **Oversight/reporting**: Assign MANAGER or ADMIN role (via role mapping)

---

### Q: Why can't VIEWER users export data?

**A:** By design, VIEWER role is read-only:

- ✅ View dashboards and reports
- ❌ Create new reports
- ❌ Export data (CSV, PDF, PPTX)
- ❌ Edit program data
- ❌ Access admin console

**Rationale**: Prevents data exfiltration, ensures data governance.

**Solution**: If user needs export access, promote to MANAGER role (via IdP group membership).

---

## Admin Console

### Q: How do I access the admin console?

**A:**

1. Ensure you have **ADMIN** or **SUPER_ADMIN** role
2. Navigate to: `https://app.teei-platform.com/en/cockpit/{company-id}/admin`
3. Or click "Admin Console" link in the user menu (top-right corner)

**If you see "Access Denied"**: You don't have admin permissions. Contact your IT administrator to add you to the TEEI admin group in your IdP.

---

### Q: What can I do in the admin console?

**A:**

**ADMIN role**:
- ✅ View SSO/SCIM configuration (read-only)
- ✅ Manage role mappings
- ✅ View user directory
- ✅ View audit logs
- ✅ Configure integration settings (Impact-In, Benevity, etc.)
- ✅ Customize SROI/VIS weights
- ❌ Manage API keys (SUPER_ADMIN only)
- ❌ Delete tenant data (SUPER_ADMIN only)

**SUPER_ADMIN role**:
- ✅ All ADMIN capabilities
- ✅ Create/revoke API keys
- ✅ Modify SSO/SCIM configuration
- ✅ Delete tenant data
- ✅ Override all permissions

---

### Q: How do I create an API key?

**A:** (SUPER_ADMIN only)

1. Navigate to admin console > "API Keys"
2. Click "+ Generate API Key"
3. Configure:
   - **Name**: "Integration Service" (descriptive name)
   - **Scopes**: Select permissions (read, write, admin)
   - **Expiration**: 90 days (recommended) or never
4. Click "Generate"
5. **COPY THE KEY IMMEDIATELY** (shown only once)
6. Store securely (e.g., password manager, secrets vault)

**Security Best Practices**:
- Use least privilege (only grant required scopes)
- Set expiration date (rotate keys regularly)
- Never commit keys to version control
- Revoke keys immediately if compromised
- Use separate keys for different services

---

### Q: How do I revoke an API key?

**A:**

1. Navigate to admin console > "API Keys"
2. Find the key to revoke
3. Click "Revoke"
4. Confirm action

**Effect**: Key stops working immediately. Any services using this key will get "401 Unauthorized" errors.

**Note**: Keep key names descriptive so you know what breaks when you revoke them.

---

### Q: Can I see who accessed what data?

**A:** Yes, via **Audit Logs**:

1. Navigate to admin console > "Audit Logs"
2. Filter by:
   - **User**: Specific user email
   - **Action**: Login, data access, configuration change, etc.
   - **Date range**: Last 7 days, 30 days, custom range
   - **Resource type**: User, program, report, etc.

**Audit log retention**: 90 days for security events, 2 years for compliance events.

**API access**:
```bash
curl -X GET "https://app.teei-platform.com/api/audit/logs?user=john@company.com&limit=100" \
  -H "Authorization: Bearer {admin_api_key}"
```

---

### Q: How do I customize SROI/VIS calculation weights?

**A:**

1. Navigate to admin console > "Calculation Settings"
2. Select "SROI Weights" or "VIS Weights"
3. Adjust weights for different categories (training, mentorship, volunteering)
4. Preview impact on sample calculations
5. Click "Save Changes"

**Warning**: Changing weights affects all future calculations. Historical data is not recalculated.

**Recommendation**: Consult with your CSR leadership before changing weights.

---

### Q: Can I white-label the platform with our company branding?

**A:** Limited white-labeling is available:

**Currently supported**:
- ✅ Company logo (top-left corner)
- ✅ Primary color theme
- ✅ Custom domain (e.g., `csr.yourcompany.com` → CNAME to TEEI)

**Not yet supported** (roadmap):
- ❌ Full color palette customization
- ❌ Custom fonts
- ❌ Custom email templates

**To configure**: Contact your Customer Success Manager with logo assets and brand guidelines.

---

## Troubleshooting

### SSO Issues

#### Problem: "SAML response signature validation failed"

**Cause**: IdP certificate mismatch or expired

**Fix**:
1. Re-download IdP metadata from your IdP
2. Upload updated metadata to TEEI admin console (SSO Configuration)
3. Test login with a test user

**Prevention**: Set calendar reminder to update metadata before certificate expiry (usually 1-3 years).

---

#### Problem: "User not found after SSO login"

**Cause**: User not provisioned via SCIM

**Fix**:
1. Verify SCIM is enabled: Admin Console > SCIM Provisioning > Status
2. Check user is assigned to TEEI application in IdP
3. Manually trigger SCIM sync: Admin Console > SCIM > "Sync Now"
4. Wait 15 minutes for sync to complete
5. Try logging in again

**Workaround**: Manually create user in TEEI (not recommended for long-term).

---

#### Problem: "Redirect URI mismatch" (OIDC)

**Cause**: Redirect URI configured in IdP doesn't match TEEI's callback URL

**Fix**:
1. Verify TEEI callback URL: `https://app.teei-platform.com/api/auth/oidc/{company-id}/callback`
2. In IdP, update "Authorized Redirect URIs" to match exactly
3. Save IdP configuration
4. Test login

**Common mistake**: Using staging URL in production or vice versa.

---

#### Problem: Users redirected to login page immediately after logging in

**Cause**: Session cookies not being set (browser issue or HTTPS misconfiguration)

**Fix**:
1. Verify accessing site via HTTPS (not HTTP)
2. Check browser cookie settings (3rd-party cookies allowed)
3. Disable browser extensions (ad blockers, privacy tools)
4. Try incognito/private browsing mode
5. Clear browser cache and cookies

**Still not working?** Contact TEEI support with browser name and version.

---

### SCIM Issues

#### Problem: SCIM sync failing with "401 Unauthorized"

**Cause**: SCIM token invalid or expired

**Fix**:
1. Navigate to admin console > SCIM Provisioning
2. Click "Generate New Token"
3. Copy token immediately
4. Update token in IdP provisioning configuration
5. Test connection in IdP
6. Verify next sync succeeds

---

#### Problem: Users not syncing from IdP to TEEI

**Cause**: Multiple possible causes

**Debugging steps**:
1. Check SCIM sync status: Admin Console > SCIM > Status
2. Review SCIM logs: Admin Console > SCIM > Logs (filter: errors only)
3. Verify IdP provisioning status is "On"
4. Check user is assigned to TEEI application in IdP
5. Run SCIM test: Admin Console > SCIM > Test Sync (dry-run)

**Common errors in logs**:
- `Duplicate email`: User with this email already exists (merge or delete duplicate)
- `Missing required field`: User missing email, firstName, or lastName in IdP
- `Invalid email format`: Email field contains non-email value

---

#### Problem: User deactivated in IdP but still has access in TEEI

**Cause**: SCIM sync delay or sync errors

**Fix**:
1. Wait 15 minutes for next SCIM sync
2. Manually trigger sync: Admin Console > SCIM > "Sync Now"
3. Verify user's `active` status updated to `false` in TEEI user directory
4. User should be logged out on next page refresh

**Immediate action**: If urgent (security breach), SUPER_ADMIN can manually deactivate user in TEEI admin console.

---

### Role Assignment Issues

#### Problem: User has wrong role (too high or too low)

**Cause**: Role mapping misconfiguration or priority conflict

**Fix**:
1. Navigate to admin console > Role Mappings
2. Click "Test User"
3. Enter user's email
4. Review:
   - User's IdP groups
   - Matching mappings
   - Priority calculation
5. Identify issue:
   - User in wrong IdP group → Move user to correct group in IdP
   - Mapping priority wrong → Adjust priorities
   - Mapping disabled → Enable mapping
6. Wait 15 minutes for SCIM sync, or trigger manually
7. User logs out and logs back in to refresh role

---

#### Problem: Role mapping not working for newly created groups

**Cause**: Group not synced to TEEI yet, or mapping not created

**Fix**:
1. Verify group created in IdP
2. Verify group has members
3. Create role mapping in TEEI for new group
4. Trigger SCIM sync
5. Verify group appears in TEEI: Admin Console > Groups

---

### Performance Issues

#### Problem: Dashboard loading slowly (> 5 seconds)

**Potential causes**:

1. **Large data volume**: Too many programs or participants
   - Fix: Contact support for database optimization

2. **Network latency**: User far from server region
   - Fix: Contact support to discuss multi-region deployment

3. **Browser performance**: Old browser or too many tabs
   - Fix: Close unused tabs, update browser, restart browser

4. **Ad blockers/extensions**: Blocking resources
   - Fix: Whitelist `*.teei-platform.com` in ad blocker

**Immediate workaround**: Use "Lite Dashboard" mode (coming soon).

---

#### Problem: SCIM sync taking hours instead of minutes

**Cause**: Large user base (> 5,000 users)

**Fix**:
1. Contact TEEI support to increase sync batch size
2. Verify IdP not rate-limiting requests
3. Consider scheduling sync during off-hours (if supported by IdP)

**Expectation**:
- < 1,000 users: < 5 minutes
- 1,000 - 5,000 users: 5-15 minutes
- > 5,000 users: 15-60 minutes (may require custom configuration)

---

### Data Issues

#### Problem: User data not updating after profile change in IdP

**Cause**: SCIM sync delay or attribute mapping issue

**Fix**:
1. Wait 15 minutes for SCIM sync
2. Manually trigger sync
3. Verify attribute mapping in IdP provisioning settings:
   - `givenName` → `name.givenName`
   - `surname` → `name.familyName`
   - `mail` → `emails[0].value`
4. If mapping correct but data still not updating, contact support

---

#### Problem: User sees data from another company

**Cause**: **CRITICAL SECURITY ISSUE** - tenant isolation failure

**Fix**:
1. **IMMEDIATE ACTION**: Screenshot the issue, note user details, time
2. **ESCALATE TO P1**: Contact TEEI security team immediately: security@teei.com or +1-XXX-XXX-XXXX
3. **DO NOT** share details publicly (customer confidentiality)
4. TEEI will investigate and resolve within 4 hours

**Note**: Tenant isolation issues are extremely rare but treated as highest priority.

---

## Support & Escalation

### Support Channels

| Channel | Use Case | Response Time |
|---------|----------|---------------|
| **Email**: support@teei.com | General questions, non-urgent issues | 24 hours |
| **Slack**: #teei-support | Quick questions, troubleshooting | 4 hours (business hours) |
| **Ticketing**: Jira Service Desk | Bug reports, feature requests | 24 hours |
| **Phone**: +1-XXX-XXX-XXXX | Critical issues (P1 only) | 1 hour |

---

### Priority Levels

| Priority | Definition | Response Time | Resolution Time | Examples |
|----------|------------|---------------|-----------------|----------|
| **P1 (Critical)** | Production down, data breach, security incident | 1 hour | 4 hours | SSO completely broken, all users locked out |
| **P2 (High)** | Major feature broken, SCIM failing, affecting multiple users | 4 hours | 24 hours | SCIM sync failing for 24+ hours, role mappings broken |
| **P3 (Medium)** | Minor feature broken, workaround available | 1 business day | 3 business days | Dashboard widget not loading, export timing out |
| **P4 (Low)** | Cosmetic issue, feature request, documentation question | 2 business days | Best effort | UI text typo, "how do I..." question |

---

### What Information to Provide When Contacting Support

To help us resolve your issue quickly, please include:

**Always include**:
- [ ] Company ID (e.g., `acme-corp-001`)
- [ ] Your name and email
- [ ] Affected user(s) email(s)
- [ ] Issue description
- [ ] Steps to reproduce
- [ ] Expected vs. actual behavior

**For SSO issues**:
- [ ] IdP type (Azure AD, Okta, Google, etc.)
- [ ] SSO protocol (SAML or OIDC)
- [ ] Error message (screenshot)
- [ ] Timestamp of error (including timezone)
- [ ] Browser and version

**For SCIM issues**:
- [ ] IdP provisioning logs (screenshot)
- [ ] TEEI SCIM logs (from admin console)
- [ ] Number of affected users
- [ ] Last successful sync timestamp

**For role/permission issues**:
- [ ] User's IdP groups (screenshot from IdP)
- [ ] Expected role vs. actual role
- [ ] Role mapping configuration (screenshot from admin console)
- [ ] "Test User" results (screenshot)

**For performance issues**:
- [ ] Browser and version
- [ ] Network connection type (corporate, home, mobile)
- [ ] Time to load (in seconds)
- [ ] Browser console errors (F12 > Console, screenshot)

---

### Escalation Path

**Level 1 → Level 2 → Level 3 → Emergency**

1. **L1: Support Engineer** (support@teei.com)
   - Initial triage
   - Common issues resolution
   - Documentation links

2. **L2: Solutions Engineer** (via support ticket escalation)
   - Complex technical issues
   - Configuration assistance
   - Integration debugging

3. **L3: Engineering Team** (via L2 escalation)
   - Platform bugs
   - Code fixes
   - Database issues

4. **Emergency: Security/Leadership** (security@teei.com, P1 hotline)
   - Data breach
   - Critical outage
   - Security vulnerability

**When to escalate**:
- Issue unresolved after 2 business days (P3/P4)
- Issue unresolved after 24 hours (P2)
- Issue unresolved after 4 hours (P1)
- Customer request for escalation

---

### Self-Service Resources

Before contacting support, check:

- **Admin Console Help**: Click "?" icon in admin console for contextual help
- **Tenant Onboarding Guide**: `/docs/pilot/tenant_onboarding_guide.md`
- **API Documentation**: `https://docs.teei.com/api`
- **GDPR Compliance Guide**: `/docs/GDPR_Compliance.md`
- **Release Notes**: `https://docs.teei.com/releases` (what's new, known issues)
- **Status Page**: `https://status.teei.com` (current incidents, planned maintenance)

---

### Scheduled Maintenance

**Frequency**: Monthly (typically first Saturday of the month)
**Window**: 2:00 AM - 6:00 AM UTC
**Duration**: Usually < 2 hours
**Notification**: 1 week in advance via email and status page

**During maintenance**:
- TEEI platform unavailable
- SSO login unavailable
- SCIM sync paused (resumes automatically after maintenance)

**Emergency maintenance**: Rare, minimum 24 hours notice unless critical security patch.

---

### Customer Success Manager

Each tenant is assigned a dedicated Customer Success Manager (CSM):

**Your CSM**:
- Name: [Assigned during onboarding]
- Email: csm@teei.com
- Calendar link: [Provided during onboarding]

**CSM Responsibilities**:
- Quarterly Business Reviews (QBRs)
- Feature adoption analysis
- Success plan updates
- Executive escalations
- Product roadmap input

**When to contact your CSM**:
- Strategic questions (not tactical support)
- Feature requests
- Expansion discussions
- Contract/billing questions
- Executive-level concerns

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| **Add new admin** | 1. Add user to TEEI admin group in IdP<br>2. Wait 15 min for SCIM sync<br>3. User logs out and back in |
| **Update SSO metadata** | 1. Download new metadata from IdP<br>2. Upload to Admin Console > SSO Configuration<br>3. Test login |
| **Regenerate SCIM token** | 1. Admin Console > SCIM > Generate New Token<br>2. Copy token<br>3. Update in IdP provisioning config |
| **Check sync status** | Admin Console > SCIM > Status |
| **View audit logs** | Admin Console > Audit Logs > Filter by user/date/action |
| **Create role mapping** | Admin Console > Role Mappings > Add Mapping |
| **Test user's role** | Admin Console > Role Mappings > Test User > Enter email |
| **Manually sync users** | Admin Console > SCIM > Sync Now |
| **Revoke API key** | Admin Console > API Keys > Find key > Revoke |

---

### Keyboard Shortcuts (Admin Console)

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` (Cmd+K on Mac) | Open command palette |
| `Ctrl+/` | Toggle keyboard shortcuts help |
| `G` then `D` | Go to Dashboard |
| `G` then `U` | Go to Users |
| `G` then `R` | Go to Role Mappings |
| `G` then `S` | Go to SCIM Status |
| `G` then `A` | Go to Audit Logs |

---

### URLs Quick Reference

```
Production Cockpit:  https://app.teei-platform.com/en/cockpit/{company-id}
Staging Cockpit:     https://staging.teei-platform.com/en/cockpit/{company-id}
Admin Console:       https://app.teei-platform.com/en/cockpit/{company-id}/admin
API Base URL:        https://app.teei-platform.com/api
API Documentation:   https://docs.teei.com/api
Status Page:         https://status.teei.com
Support Portal:      https://support.teei.com
```

---

### Emergency Contacts

```
P1 Support Hotline:  +1-XXX-XXX-XXXX (24/7)
Security Incidents:  security@teei.com (24/7)
General Support:     support@teei.com (business hours)
DPO (Privacy):       dpo@teei.com (GDPR requests)
```

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **ACS** | Assertion Consumer Service - SAML callback endpoint |
| **Claim** | User attribute in SSO token (e.g., email, groups) |
| **DPA** | Data Processing Agreement |
| **DPIA** | Data Protection Impact Assessment |
| **IdP** | Identity Provider (Azure AD, Okta, Google, etc.) |
| **JWT** | JSON Web Token - authentication token format |
| **OIDC** | OpenID Connect - modern SSO protocol |
| **RBAC** | Role-Based Access Control |
| **SAML** | Security Assertion Markup Language - SSO protocol |
| **SCIM** | System for Cross-domain Identity Management |
| **SLO** | Single Logout - SAML logout endpoint |
| **SSO** | Single Sign-On |
| **TLS** | Transport Layer Security (encryption) |

---

### Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-15 | Initial version | SSO Onboarding Specialist (Worker 1) |

---

**Questions not answered here?**

Contact support@teei.com or your Customer Success Manager.
