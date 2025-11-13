# Smoke Test Checklist - Phase C Pilot

## Overview

This document provides manual smoke tests to verify Phase C deployment. Run these tests immediately after deployment to staging to catch critical issues before user acceptance testing.

**Test Environment**: Staging
**Test Duration**: ~30 minutes
**Test Users Required**: 3 (VIEWER, MANAGER, ADMIN)

---

## Pre-Test Setup

### Test Accounts

Ensure the following test accounts exist:

| Email | Role | Company | Password |
|-------|------|---------|----------|
| viewer@test.com | VIEWER | test-company-123 | (See password manager) |
| manager@test.com | MANAGER | test-company-123 | (See password manager) |
| admin@test.com | ADMIN | test-company-123 | (See password manager) |
| superadmin@test.com | SUPER_ADMIN | test-company-123 | (See password manager) |

### Test Data

Verify test company exists:
```sql
SELECT id, name, slug FROM companies WHERE slug = 'test-company-123';
```

If not, create:
```sql
INSERT INTO companies (id, name, slug, tenant_enabled)
VALUES (gen_random_uuid(), 'Test Company 123', 'test-company-123', true);
```

---

## Test Suite

### ✅ Test 1: Multi-Tenant Routing (A.1)

#### 1.1: Valid Tenant Access

**Steps**:
1. Navigate to `https://staging.teei-platform.com/en/cockpit/test-company-123`
2. Login as `admin@test.com`
3. Verify dashboard loads

**Expected**:
- [ ] URL contains `/en/cockpit/test-company-123`
- [ ] Dashboard displays with widgets
- [ ] Company ID shown in header: `test-company-123`
- [ ] No 404/401 errors

#### 1.2: Invalid Tenant ID

**Steps**:
1. Navigate to `https://staging.teei-platform.com/en/cockpit/invalid-company-id`
2. Observe response

**Expected**:
- [ ] 404 page displayed
- [ ] Error reason shown: "invalid_company_id" or similar
- [ ] "Go to Home" button present

#### 1.3: Tenant ID Validation (SQL Injection Prevention)

**Steps**:
1. Try navigating to `https://staging.teei-platform.com/en/cockpit/'; DROP TABLE companies; --`
2. Try `https://staging.teei-platform.com/en/cockpit/../../../etc/passwd`

**Expected**:
- [ ] 404 page displayed for both attempts
- [ ] No database errors in logs
- [ ] Server logs show "Invalid company ID" warning

#### 1.4: Cross-Tenant Access Prevention

**Steps**:
1. Login as `admin@test.com` (company: test-company-123)
2. Navigate to `https://staging.teei-platform.com/en/cockpit/other-company-456`

**Expected**:
- [ ] 401 Unauthorized page displayed
- [ ] Error reason: "unauthorized_company_access"
- [ ] User's company ID shown in error details
- [ ] Security notice: "This access attempt has been logged"

---

### ✅ Test 2: RBAC System (A.2)

#### 2.1: Role Hierarchy

**Steps**:
1. Login as `viewer@test.com`
2. Navigate to `/en/cockpit/test-company-123/admin`

**Expected**:
- [ ] 401 page displayed
- [ ] Message: "Permission Required"
- [ ] User role shown: VIEWER
- [ ] Required permission shown: ADMIN_CONSOLE

#### 2.2: Widget Permissions

**Steps**:
1. Login as `viewer@test.com`
2. View dashboard
3. Look for Export buttons

**Expected**:
- [ ] Export buttons **not visible** (VIEWER lacks EXPORT_DATA permission)
- [ ] At-a-Glance widget visible
- [ ] SROI/VIS panels visible
- [ ] Q2Q Feed visible

**Steps**:
1. Login as `manager@test.com`
2. View dashboard

**Expected**:
- [ ] Export buttons **visible** (MANAGER has EXPORT_DATA permission)
- [ ] All widgets from VIEWER test also visible

#### 2.3: Route Protection

**Test Admin Routes**:

| Route | VIEWER | MANAGER | ADMIN | Expected |
|-------|--------|---------|-------|----------|
| `/cockpit/test-company-123` | ✅ | ✅ | ✅ | All can access |
| `/cockpit/test-company-123/admin` | ❌ | ❌ | ✅ | ADMIN only |
| `/cockpit/test-company-123/admin/api-keys` | ❌ | ❌ | ✅ | ADMIN only |
| `/cockpit/test-company-123/reports/schedule` | ❌ | ❌ | ✅ | ADMIN only |

**Expected**:
- [ ] All route restrictions enforced
- [ ] 401 pages show specific permission required

#### 2.4: Session Scoping

**Steps**:
1. Login as `admin@test.com`
2. Open browser DevTools → Application → Cookies
3. Find `teei_session` cookie
4. Decode JWT payload (base64 decode middle section)

**Expected**:
- [ ] Cookie contains `companyId: "test-company-123"`
- [ ] Cookie contains `role: "ADMIN"`
- [ ] Cookie has expiry timestamp
- [ ] Cookie is `HttpOnly` and `Secure`

---

### ✅ Test 3: Admin Console (A.3)

#### 3.1: Admin Console Access

**Steps**:
1. Login as `admin@test.com`
2. Navigate to `/en/cockpit/test-company-123/admin`

**Expected**:
- [ ] Admin console loads
- [ ] Breadcrumb shows: Dashboard › Admin
- [ ] Role badge shows: ADMIN
- [ ] Four sections visible:
  - [ ] API Keys
  - [ ] Impact-In Integrations
  - [ ] Calculation Weight Overrides
  - [ ] Audit Log

#### 3.2: API Key Management

**Create API Key**:
1. Click "Create New Key"
2. Fill form:
   - Name: "Test API Key"
   - Scopes: read:metrics, read:reports
   - Expires: 365 days
3. Click "Create Key"

**Expected**:
- [ ] Success message shown
- [ ] Full API key displayed once: `teei_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] Copy button present
- [ ] Warning: "You won't be able to see it again"

**Verify API Key**:
- [ ] Key appears in table
- [ ] Only prefix shown: `teei_xxx...`
- [ ] Scopes badges visible: `read:metrics`, `read:reports`
- [ ] Created date shown
- [ ] "Never" in Last Used column
- [ ] Expiry date shown (365 days from now)

**Revoke API Key**:
1. Click "Revoke" button
2. Confirm in popup

**Expected**:
- [ ] Confirmation dialog appears
- [ ] After confirming, key removed from table
- [ ] Audit log shows API_KEY_REVOKE action

#### 3.3: Impact-In Toggles

**Enable Integration**:
1. Find Benevity card
2. Toggle switch to ON

**Expected**:
- [ ] Toggle animates to enabled state
- [ ] Integration details section expands
- [ ] Status shows: "○ Not synced" (if never synced)
- [ ] "Test Connection" button visible
- [ ] "View Deliveries" link visible
- [ ] "API Docs ↗" link visible

**Test Connection**:
1. Click "Test Connection"
2. Wait for response

**Expected**:
- [ ] Button shows "Testing..." during request
- [ ] Alert appears with result
- [ ] If test fails (expected in staging without real API keys): Alert shows "Connection test failed: [error details]"
- [ ] Status updates if successful

**Disable Integration**:
1. Toggle switch to OFF

**Expected**:
- [ ] Toggle animates to disabled state
- [ ] Details section collapses
- [ ] Changes persisted (refresh page to verify)

#### 3.4: Weight Overrides

**SROI Weights**:
1. Click "SROI Weights" tab
2. Adjust "Volunteer Hour Value" slider from 29.95 to 35.00
3. Note the `*` indicator appears
4. Click "Save Changes"

**Expected**:
- [ ] Slider and numeric input sync
- [ ] Modified indicator (`*`) appears on changed values
- [ ] Default value shown: "Default: 29.95"
- [ ] Success message after save
- [ ] "Last modified" timestamp updates

**VIS Weights**:
1. Click "VIS Weights" tab
2. Adjust Hours Weight: 0.4
3. Adjust Consistency Weight: 0.3
4. Adjust Impact Weight: 0.3
5. Observe validation

**Expected**:
- [ ] All three sliders functional
- [ ] Validation message shown: "✓ VIS weights sum to 1.0"
- [ ] If weights don't sum to 1.0, error message shown: "⚠ VIS weights must sum to 1.0"
- [ ] Cannot save if validation fails

**Reset to Defaults**:
1. Click "Reset to Defaults"
2. Confirm in dialog

**Expected**:
- [ ] Confirmation dialog appears
- [ ] All values revert to defaults
- [ ] Modified indicators (`*`) disappear

#### 3.5: Audit Log

**View Audit Log**:
1. Scroll to Audit Log section
2. Observe entries

**Expected**:
- [ ] Log entries shown in reverse chronological order
- [ ] Each entry shows:
  - [ ] Action icon (e.g., 🔑 for API_KEY_CREATE)
  - [ ] Action name (e.g., "API_KEY_CREATE")
  - [ ] Resource (e.g., "api_keys")
  - [ ] Timestamp
  - [ ] User name and role
  - [ ] IP address (if tracked)
  - [ ] Details (JSON or formatted text)
  - [ ] Severity indicator (colored bar on left)

**Filter Audit Log**:
1. Type "API_KEY" in search box
2. Observe results

**Expected**:
- [ ] Only API key related actions shown
- [ ] Search is case-insensitive
- [ ] Results update as you type

**Severity Filter**:
1. Select "Warning" from dropdown
2. Observe results

**Expected**:
- [ ] Only warning-level entries shown
- [ ] Entry count updates

**Pagination**:
1. If more than 20 entries, check pagination
2. Click "Next →"

**Expected**:
- [ ] Page 2 loaded
- [ ] Page indicator shows: "Page 2"
- [ ] "← Previous" button enabled
- [ ] Entries are different from page 1

---

### ✅ Test 4: Dashboard Functionality

#### 4.1: Widget Rendering

**Steps**:
1. Login as `admin@test.com`
2. Navigate to dashboard

**Expected**:
- [ ] All 5 widgets render:
  - [ ] At-a-Glance
  - [ ] SROI Panel
  - [ ] VIS Panel
  - [ ] Q2Q Feed
  - [ ] Export Buttons (for ADMIN)
- [ ] No JavaScript errors in console
- [ ] No broken images or icons
- [ ] Loading states show briefly if needed

#### 4.2: Responsive Design

**Steps**:
1. Resize browser to mobile width (375px)
2. Check layout

**Expected**:
- [ ] Widgets stack vertically
- [ ] No horizontal scroll
- [ ] Header nav collapses or stacks
- [ ] Touch targets >= 44x44px

#### 4.3: Language Switcher

**Steps**:
1. Find language switcher
2. Switch from `en` to `no` (Norwegian)
3. Observe URL and content

**Expected**:
- [ ] URL changes to `/no/cockpit/test-company-123`
- [ ] UI text updates to Norwegian (if translations exist)
- [ ] Dashboard still functions
- [ ] Switch back to `en` works

---

### ✅ Test 5: Authentication & Session

#### 5.1: Login Flow

**Steps**:
1. Navigate to `/en/cockpit/test-company-123` (not logged in)
2. Observe redirect

**Expected**:
- [ ] Redirected to `/login?redirect=/en/cockpit/test-company-123`
- [ ] Login form displayed
- [ ] Email and password fields present
- [ ] "Sign In" button present

**Steps**:
1. Enter `admin@test.com` and password
2. Click "Sign In"

**Expected**:
- [ ] Redirected back to `/en/cockpit/test-company-123`
- [ ] Dashboard loads
- [ ] Welcome message: "Welcome back, [name]"

#### 5.2: Session Expiry

**Steps**:
1. Login as `admin@test.com`
2. Open DevTools → Application → Cookies
3. Delete `teei_session` cookie
4. Navigate to any cockpit page

**Expected**:
- [ ] Redirected to `/login`
- [ ] Redirect parameter preserved in URL

#### 5.3: Logout

**Steps**:
1. Login as `admin@test.com`
2. Click "Sign Out" button
3. Observe result

**Expected**:
- [ ] Redirected to `/login` or home page
- [ ] Session cookie removed
- [ ] Cannot access protected routes without logging in again

---

### ✅ Test 6: Error Handling

#### 6.1: Network Errors

**Steps**:
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Navigate to dashboard

**Expected**:
- [ ] Error message shown: "Unable to load data"
- [ ] No blank white screen
- [ ] Error boundary catches failure
- [ ] Option to retry visible

#### 6.2: Widget Errors

**Steps**:
1. (If possible) Force a widget to fail by corrupting API response
2. Observe dashboard

**Expected**:
- [ ] Failed widget shows error fallback UI
- [ ] Other widgets continue to work
- [ ] Error boundary prevents full page crash
- [ ] Error logged to console

---

### ✅ Test 7: Performance

#### 7.1: Page Load Time

**Steps**:
1. Open DevTools → Network tab
2. Hard refresh dashboard (Ctrl+Shift+R)
3. Check "Load" time

**Expected**:
- [ ] Page fully loaded in < 3 seconds
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] No render-blocking resources

#### 7.2: Memory Leaks

**Steps**:
1. Open DevTools → Performance Monitor
2. Navigate between pages 10 times
3. Observe memory usage

**Expected**:
- [ ] Memory usage stable (no continuous increase)
- [ ] No "Detached DOM tree" warnings
- [ ] Heap size returns to baseline after navigations

---

## Test Results Summary

| Test Suite | Status | Issues Found | Blocker? |
|------------|--------|--------------|----------|
| 1. Multi-Tenant Routing | ⬜ | | |
| 2. RBAC System | ⬜ | | |
| 3. Admin Console | ⬜ | | |
| 4. Dashboard Functionality | ⬜ | | |
| 5. Authentication & Session | ⬜ | | |
| 6. Error Handling | ⬜ | | |
| 7. Performance | ⬜ | | |

**Legend**:
- ✅ Pass
- ⚠️ Pass with minor issues
- ❌ Fail
- ⬜ Not tested

---

## Issue Reporting Template

If a test fails, document using this format:

```markdown
### Issue #[ID]: [Short Description]

**Test**: [Test number and name]
**Severity**: Critical | High | Medium | Low
**Browser**: Chrome 120 / Firefox 121 / Safari 17
**User Role**: VIEWER | MANAGER | ADMIN
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach screenshots if applicable]

**Console Errors**:
```
[Copy any JavaScript errors from console]
```

**Network Errors**:
[Any failed API requests]

**Blocker**: Yes / No
```

---

## Sign-Off

**Tester Name**: _________________________

**Date**: _________________________

**Deployment Commit**: _________________________

**Overall Status**: ✅ Pass | ⚠️ Pass with Issues | ❌ Fail

**Notes**:
________________________________
________________________________
________________________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Run Before**: Every staging deployment
**Run After**: Any Phase C changes
