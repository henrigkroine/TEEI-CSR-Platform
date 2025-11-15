# Troubleshooting Guide

**Target Audience**: All Users
**Estimated Reading Time**: 20 minutes
**Last Updated**: 2025-11-15

---

## Quick Troubleshooting

**Before diving into detailed solutions, try these quick fixes:**

1. **Refresh the page**: `Ctrl/Cmd + Shift + R` (hard refresh)
2. **Clear browser cache**: Settings > Privacy > Clear browsing data
3. **Try a different browser**: Chrome, Firefox, or Edge recommended
4. **Check your internet connection**: Run speed test
5. **Contact support**: support@teei.io if issue persists

---

## Table of Contents

1. [Login & Authentication Issues](#login-authentication-issues)
2. [Dashboard Problems](#dashboard-problems)
3. [Report Generation Issues](#report-generation-issues)
4. [Export Failures](#export-failures)
5. [Evidence Explorer Problems](#evidence-explorer-problems)
6. [Performance Issues](#performance-issues)
7. [Data Accuracy Concerns](#data-accuracy-concerns)
8. [Scheduled Reports & Exports](#scheduled-reports-exports)
9. [User Management Issues](#user-management-issues)
10. [Browser & Compatibility](#browser-compatibility)

---

## Login & Authentication Issues

### Cannot Log In - "Invalid Credentials"

**Symptoms**:
- Entering email and password, but getting "Invalid email or password" error
- Account seems to exist but password doesn't work

**Solutions**:

**Step 1**: Verify Email Address
- Double-check email for typos
- Ensure you're using the correct company domain
- Try copy-pasting from invitation email

**Step 2**: Reset Password
1. Click "Forgot Password" on login page
2. Enter your email
3. Check inbox for reset link (within 5 minutes)
4. Check spam/junk folder
5. Click link and create new password
6. Ensure password meets requirements:
   - Minimum 12 characters
   - At least 1 uppercase letter
   - At least 1 number
   - At least 1 special character

**Step 3**: Check Account Status
- Contact your admin to verify account is active (not deactivated)
- Ensure you're on the correct tenant URL: `https://[your-company].teei.io`

**Still Not Working?**
- Contact support@teei.io with your email
- Include error message screenshot
- Support will verify account status

### 2FA (Two-Factor Authentication) Issues

#### "Invalid 2FA Code"

**Symptoms**:
- Entering 6-digit code from authenticator app, but it's rejected
- Error: "Invalid or expired code"

**Solutions**:

**Step 1**: Time Sync Issue
1. Most common cause: Device time is out of sync
2. On mobile device:
   - iOS: Settings > General > Date & Time > Set Automatically
   - Android: Settings > System > Date & Time > Use network-provided time
3. Wait 1 minute for sync
4. Generate new code
5. Retry login

**Step 2**: Use Backup Code
1. Click "Use backup code instead"
2. Enter one of your backup codes (saved during 2FA setup)
3. Login successful
4. Re-sync authenticator app time
5. Generate new backup codes (Settings > Security > 2FA)

**Step 3**: Reset 2FA
1. Contact your admin
2. Admin goes to Settings > Users > [Your Account]
3. Admin clicks "Reset 2FA"
4. You'll receive email to set up 2FA again
5. Follow setup wizard

**Lost Backup Codes?**
- Contact admin immediately
- Admin can reset your 2FA
- Save new backup codes securely (password manager recommended)

#### "SMS 2FA Code Not Received"

**Symptoms**:
- Waiting for SMS with 2FA code, but nothing arrives
- Waited 5+ minutes

**Solutions**:

**Step 1**: Check Phone Number
1. Verify phone number is correct in your profile
2. Ensure it includes country code (e.g., +47 for Norway)
3. Update if incorrect: Contact admin

**Step 2**: Network Issues
1. Check mobile signal strength
2. Restart phone
3. Wait 5 minutes
4. Request new code

**Step 3**: Use Alternative 2FA Method
1. On login screen, click "Use authenticator app instead"
2. Or click "Use email code instead"
3. Complete login with alternative method

**Step 4**: Contact Admin
- Admin can verify SMS delivery status
- Admin can switch you to authenticator app

### Account Locked

**Symptoms**:
- Error: "Account locked due to multiple failed login attempts"
- Cannot log in even with correct credentials

**Solutions**:

**Automatic Unlock**:
- Accounts auto-unlock after 30 minutes
- Wait and retry

**Manual Unlock**:
1. Contact your admin
2. Admin goes to Settings > Users > [Your Account]
3. Admin clicks "Unlock Account"
4. Retry login immediately

**Prevention**:
- Use password manager to avoid typos
- Enable 2FA for security
- Contact admin if forgotten password (don't guess)

---

## Dashboard Problems

### "No Data Available"

**Symptoms**:
- Dashboard loads but shows "No data available" message
- KPI cards show "--" instead of numbers
- Charts are empty

**Solutions**:

**Step 1**: Check Filters
1. Look at period selector (top of page)
2. Is period too narrow? (e.g., single day with no activity)
3. Click "Reset Filters" button
4. Try broader period (e.g., "Last Month" or "Last Quarter")

**Step 2**: Verify Data Collection
1. Contact admin: "Is data sync working?"
2. Admin checks Settings > Integrations > [Data Source]
3. Verify "Last Sync" timestamp is recent
4. If old, admin should trigger manual sync

**Step 3**: Check Permissions
1. Verify your role has access to dashboard
2. Contact admin to confirm permissions
3. Some tenants restrict data by department/program

**Step 4**: Wait for Processing
- New data can take 6-24 hours to appear
- Q2Q processing runs every 6 hours
- Check again later

**Still No Data?**
- Contact support@teei.io
- Include: Company name, period selected, filters applied
- Screenshot of dashboard

### KPI Values Seem Wrong

**Symptoms**:
- SROI shows 100x (impossibly high)
- Participant count is 0 but you know programs are running
- Values don't match previous reports

**Solutions**:

**Step 1**: Verify Period & Filters
1. Check period selector: Are you looking at the right month/quarter?
2. Check program filter: Did you accidentally filter to a single program?
3. Check cohort filter: Are you viewing a small subset?
4. Click "Reset All Filters"

**Step 2**: Compare to Evidence
1. Click "View Evidence" on the KPI card
2. Review evidence snippets
3. Do they support the metric value?
4. Check confidence scores (should be >0.70)

**Step 3**: Check Calculation
1. For SROI: Verify cost data is accurate
2. For VIS: Check volunteer activity logs
3. For Integration: Review Q2Q scores

**Step 4**: Report Data Quality Issue
1. Go to Help > "Report Data Issue"
2. Specify metric, period, expected vs. actual value
3. Support will investigate
4. Include evidence IDs if you suspect specific data issues

**Step 5**: Force Recalculation (Admin)
- Admin: Settings > Maintenance > "Recalculate Metrics"
- Select period
- Click "Recalculate"
- Wait 5-10 minutes

### Charts Not Loading

**Symptoms**:
- Dashboard loads but charts show "Loading..." indefinitely
- Charts show blank space or error icon

**Solutions**:

**Step 1**: Browser Issue
1. Hard refresh: `Ctrl/Cmd + Shift + R`
2. Clear browser cache:
   - Chrome: Settings > Privacy > Clear browsing data
   - Firefox: Options > Privacy > Clear Data
3. Try incognito/private mode
4. Try different browser (Chrome recommended)

**Step 2**: Ad Blocker / Extension Interference
1. Disable ad blockers (uBlock Origin, AdBlock Plus)
2. Disable privacy extensions (Privacy Badger, Ghostery)
3. Whitelist teei.io domain
4. Refresh page

**Step 3**: Network Issue
1. Check internet speed: speedtest.net
2. If slow (<5 Mbps), charts may timeout
3. Try different network (mobile hotspot, different WiFi)

**Step 4**: Browser Compatibility
- Ensure browser is up-to-date
- Supported browsers:
  - Chrome 90+
  - Firefox 88+
  - Edge 90+
  - Safari 14+
- Update browser to latest version

**Still Not Working?**
- Contact support with:
  - Browser name and version
  - Operating system
  - Screenshot of error (if visible)
  - Console errors (F12 > Console tab)

### Dashboard is Slow

**Symptoms**:
- Dashboard takes 10+ seconds to load
- Interactions feel sluggish
- Charts lag when hovering

**Solutions**:

**Step 1**: Reduce Data Scope
1. Use narrower date range (3 months instead of 12)
2. Filter to 1-2 programs instead of "All"
3. Disable auto-refresh (Settings > Dashboard > Auto-refresh: Off)

**Step 2**: Browser Optimization
1. Close unused tabs (especially other TEEI tabs)
2. Clear browser cache
3. Disable unnecessary extensions
4. Restart browser

**Step 3**: System Resources
1. Close other applications
2. Check RAM usage (Activity Monitor / Task Manager)
3. If low on RAM (<2GB free), close applications
4. Restart computer

**Step 4**: Network Optimization
1. Use wired connection instead of WiFi
2. Close bandwidth-heavy applications (streaming, downloads)
3. Contact IT if on corporate network with restrictions

**Step 5**: Adjust Display Settings (Admin)
- Settings > Dashboard > Performance
- Chart Animations: Disable
- Data Points Limit: Reduce to 50 (from 100)
- Auto-Refresh Interval: Increase to 30 minutes

---

## Report Generation Issues

### "Report Generation Failed"

**Symptoms**:
- Click "Generate Report" but get error message
- Loading spinner stops with error
- Error: "Report generation failed. Please try again."

**Solutions**:

**Error: "Insufficient data for selected period"**

**Cause**: Not enough evidence or metrics for the date range

**Solution**:
1. Expand date range (try 3 months instead of 1)
2. Remove restrictive filters (programs, cohorts)
3. Check dashboard first to verify data exists
4. Wait 24-48 hours if just started data collection

**Error: "Rate limit exceeded"**

**Cause**: Generated too many reports in short time

**Solution**:
1. Wait 10 minutes
2. Check quota: Settings > Usage
3. Standard users: 10 reports/hour, 50/day
4. Contact admin to increase quota or upgrade plan

**Error: "LLM service unavailable"**

**Cause**: AI service (GPT-4, Claude) is temporarily down

**Solution**:
1. Wait 5 minutes
2. Retry generation
3. Try different model (Advanced Options > Model)
4. Contact support if persistent (>30 min)

**Error: "Validation failed: Citations missing"**

**Cause**: Evidence was deleted between fetching and generating

**Solution**:
1. Retry generation (fresh data)
2. Contact admin if issue persists
3. May indicate data retention issue

### Report Quality Issues

#### Report Narrative Doesn't Match Data

**Symptoms**:
- Report says "confidence increased" but data shows decrease
- Numbers in narrative don't match dashboard

**Solutions**:

**Step 1**: Verify Period Alignment
1. Check report period
2. Compare to dashboard period
3. Ensure they match

**Step 2**: Check Evidence
1. Scroll to citations at end of report
2. Click citation links to view evidence
3. Verify evidence supports the claim

**Step 3**: Regenerate with Lower Temperature
1. Advanced Options > Temperature: 0.2 (more conservative)
2. Regenerate report
3. Lower temperature = more factual, less creative

**Step 4**: Report Inaccuracy
1. Help > "Report Data Issue"
2. Specify claim that's incorrect
3. Provide correct data from dashboard
4. Include citation IDs

#### Citations Missing or Broken

**Symptoms**:
- Report shows "[citation:MISSING]"
- Click citation but nothing happens
- Error: "Evidence not found"

**Solutions**:

**Step 1**: Regenerate Report
1. Delete current report
2. Generate fresh report
3. Issue may have been temporary

**Step 2**: Check Evidence Retention
1. Settings > Data Retention
2. Evidence may have expired (default: 90 days)
3. If generating old reports (>90 days), evidence may be deleted
4. Contact admin to adjust retention policy

**Step 3**: Contact Support
- If citations missing in new reports
- Critical data integrity issue
- Include report ID and period

---

## Export Failures

### PDF Export Failed

**Symptoms**:
- Click "Export PDF" but nothing downloads
- Error: "Export failed. Please try again."
- Download starts but file is corrupt

**Solutions**:

**Step 1**: File Size Issue
1. Report may be too large (>50 MB)
2. Try without charts: Uncheck "Include Charts"
3. Reduce date range
4. Contact admin to increase limit

**Step 2**: Browser Download Settings
1. Check browser downloads are not blocked
2. Chrome: Settings > Privacy > Site Settings > Downloads > Allow
3. Check download folder has space (>100 MB free)
4. Try different download location

**Step 3**: Try Different Format
1. Export as DOCX or CSV instead
2. If those work, PDF rendering issue
3. Contact support with report ID

**Step 4**: Popup Blocker
1. Check popup blocker is not blocking download
2. Whitelist teei.io
3. Try download again

### Scheduled Export Not Delivered

**Symptoms**:
- Set up scheduled export but didn't receive email
- Export history shows "Success" but no attachment received

**Solutions**:

**Step 1**: Check Email Address
1. Settings > Scheduled Exports > [Your Schedule]
2. Verify email address is correct (no typos)
3. Update and save

**Step 2**: Check Spam Folder
1. Search inbox for "TEEI" or "noreply@teei.io"
2. Check spam/junk folder
3. If found, mark as "Not Spam"
4. Add noreply@teei.io to contacts

**Step 3**: Email Server Settings
1. Contact IT department
2. Whitelist noreply@teei.io
3. Ensure SPF/DKIM allows TEEI emails
4. Some corporate email servers block automated emails

**Step 4**: Check Export History
1. Settings > Scheduled Exports > [Schedule] > History
2. Click latest execution
3. Check for error message
4. If error, contact admin

**Step 5**: File Size Too Large for Email
1. Some email servers limit attachment size (10-25 MB)
2. Reduce export file size:
   - Remove charts
   - Shorter period
   - CSV instead of PDF
3. Or use FTP delivery (enterprise)

---

## Evidence Explorer Problems

### "No Evidence Available"

**Symptoms**:
- Click "View Evidence" but drawer shows "No evidence available"
- Empty evidence list

**Solutions**:

**Step 1**: Check Filters
1. Click "Reset All Filters" in evidence drawer
2. Filters may be too restrictive
3. Remove dimension, source, and confidence filters
4. Retry

**Step 2**: Verify Data Exists
1. Go back to dashboard
2. Check if KPI has a value
3. If KPI is "--", no data means no evidence
4. Expand period or wait for data collection

**Step 3**: Q2Q Processing Delay
1. Evidence requires Q2Q classification
2. Processing runs every 6 hours
3. New data may take 6-24 hours to appear
4. Check again tomorrow

**Step 4**: Evidence Retention
1. Evidence older than retention period (default 90 days) is deleted
2. If viewing old periods, evidence may be gone
3. Contact admin to extend retention (Settings > Data Retention)

### Evidence Doesn't Match Metric

**Symptoms**:
- Viewing evidence for "Confidence" but snippets talk about job readiness
- Evidence seems unrelated to metric

**Solutions**:

**Step 1**: Check Metric Context
1. Verify which metric's evidence you're viewing
2. Header should say "Evidence for: [Metric Name]"
3. Ensure you clicked "View Evidence" on correct KPI card

**Step 2**: Review Q2Q Scores
1. Each evidence entry shows Q2Q dimension
2. Check if dimension matches metric
3. Evidence can support multiple dimensions simultaneously
4. Filter by specific dimension if needed

**Step 3**: Check Confidence Scores
1. Low confidence (<0.70) = less reliable
2. Filter to "Very High Confidence Only"
3. Higher confidence = more accurate classification

**Step 4**: Report Data Quality Issue
1. If evidence clearly doesn't match
2. Note evidence IDs
3. Help > "Report Data Issue"
4. Support will review Q2Q classifier

---

## Performance Issues

### Platform is Slow Overall

**Symptoms**:
- Every page takes 5+ seconds to load
- Interactions are laggy
- Timeouts occur

**Solutions**:

**Step 1**: Check Internet Speed
1. Run speedtest.net
2. Minimum recommended: 5 Mbps down, 1 Mbps up
3. If slower, contact ISP or switch networks

**Step 2**: Check System Resources
1. Open Task Manager (Windows) or Activity Monitor (Mac)
2. Check CPU usage (<80%)
3. Check RAM usage (>2 GB free)
4. Close unnecessary applications

**Step 3**: Browser Optimization
1. Update browser to latest version
2. Disable extensions (especially ad blockers, VPNs)
3. Clear cache and cookies
4. Try incognito/private mode
5. Try different browser

**Step 4**: Network Optimization
1. Use wired connection if possible
2. Disable VPN (if not required)
3. Close bandwidth-heavy apps
4. Restart router

**Step 5**: Check Platform Status
1. Visit status.teei.io
2. Check for ongoing incidents
3. Subscribe to status updates
4. Contact support if widespread outage

### Specific Pages are Slow

**Dashboard Slow**:
- Reduce date range
- Filter to fewer programs
- Disable auto-refresh
- Reduce chart complexity (Settings > Dashboard > Data Points Limit)

**Evidence Explorer Slow**:
- Apply filters to reduce result set
- Use pagination (don't load all evidence at once)
- Disable infinite scroll (Settings > Evidence > Infinite Scroll: Off)

**Reports Slow to Generate**:
- Use "Brief" length instead of "Detailed"
- Remove charts
- Reduce date range
- Use lower max tokens (Advanced Options > Max Tokens: 2000)

---

## Data Accuracy Concerns

### Metrics Don't Match Previous Period

**Symptoms**:
- SROI was 3.2x last month, now shows 2.8x retroactively
- Historical data changed

**Solutions**:

**Step 1**: Understand Recalculations
1. Metrics can be recalculated if:
   - New evidence added retroactively
   - Data corrections made
   - Q2Q classifier improved
   - Cost data updated
2. This is normal and ensures accuracy

**Step 2**: Check Audit Logs (Admin)
1. Settings > Audit Logs > Metric Changes
2. See history of recalculations
3. Reason should be logged

**Step 3**: Compare with Exported Reports
1. Find old exported reports (PDF/CSV from that period)
2. Compare values
3. If discrepancy, report to admin

**Step 4**: Request Data Freeze (Compliance)
1. For compliance periods (e.g., CSRD reporting)
2. Admin can freeze metrics for a period
3. Settings > Compliance > Freeze Period
4. Prevents recalculations

### Evidence Text Doesn't Make Sense

**Symptoms**:
- Evidence snippet is gibberish or truncated
- Redaction seems excessive (entire sentence is ***)

**Solutions**:

**Step 1**: Understand Redaction
1. All PII is automatically redacted
2. Sometimes aggressive redaction is necessary
3. Example: "I improved my [NAME] skills" (language was PII)

**Step 2**: Check Original Source
1. If you have access to original feedback forms
2. Compare to verify redaction accuracy
3. Report over-redaction if it obscures meaning

**Step 3**: Report Evidence Quality Issue
1. Note evidence ID
2. Help > "Report Data Issue"
3. Describe issue (e.g., "Evidence truncated mid-sentence")
4. Support will investigate

---

## Scheduled Reports & Exports

### Scheduled Report Not Running

**Symptoms**:
- Set up scheduled report but it never ran
- Expected weekly report but didn't receive

**Solutions**:

**Step 1**: Check Schedule Status
1. Settings > Scheduled Reports > [Your Schedule]
2. Status should be "Active"
3. If "Paused", click "Resume"

**Step 2**: Check Schedule Configuration
1. Verify frequency: Weekly, Monthly, etc.
2. Check day and time
3. Ensure start date is in past
4. End date (if set) is in future

**Step 3**: Check Execution History
1. Click "View History"
2. See if any executions happened
3. Check for errors
4. If "No executions", schedule may be misconfigured

**Step 4**: Check Permissions
1. User who created schedule must have report generation permission
2. If user was deactivated, schedule stops
3. Admin: Re-assign schedule to active user

**Step 5**: Test Send
1. Click "Test Send" button
2. Sends immediately to verify configuration
3. If test works, wait for next scheduled execution
4. If test fails, review error and fix

---

## User Management Issues

### Cannot Add New User (Admin)

**Symptoms**:
- Click "Add User" but get error
- Error: "User limit reached"
- Invitation email not sent

**Solutions**:

**Error: "User limit reached"**

**Cause**: Exceeded plan limit (e.g., 10 users on Starter plan)

**Solution**:
1. Check current user count: Settings > Users
2. Check plan limit: Settings > Subscription
3. Deactivate unused users
4. Or upgrade plan: Contact sales

**Error: "Email already exists"**

**Cause**: User already has account

**Solution**:
1. Search existing users
2. Reactivate if deactivated
3. Or user already accepted invitation

**Invitation Email Not Sent**

**Cause**: Email delivery issue

**Solution**:
1. Check email address for typos
2. Ensure corporate email server allows external emails
3. Check spam folder
4. Resend invitation: Settings > Users > [User] > "Resend Invitation"

### User Cannot Access Feature

**Symptoms**:
- User reports "You don't have permission" error
- Feature is hidden or grayed out

**Solutions**:

**Step 1**: Check User Role
1. Settings > Users > [User]
2. View assigned role
3. Compare to role permissions matrix

**Step 2**: Verify Feature Availability
1. Some features are plan-specific (e.g., Benchmarks = Enterprise only)
2. Check Settings > Subscription > Features
3. Upgrade plan if needed

**Step 3**: Adjust Role (Admin)
1. If user needs more access:
2. Settings > Users > [User] > Edit
3. Change role (e.g., "Company User" → "Admin")
4. Save
5. User must log out and back in

---

## Browser & Compatibility

### Browser-Specific Issues

#### Chrome

**Issue**: "Unsafe site" warning

**Solution**:
1. Verify URL is `https://[company].teei.io` (not HTTP)
2. If HTTPS, click "Advanced" > "Proceed to site"
3. Contact support if persistent

**Issue**: Downloads blocked

**Solution**:
1. Chrome Settings > Privacy > Site Settings > Downloads
2. Find teei.io
3. Change to "Allow"

#### Firefox

**Issue**: "Connection is not secure"

**Solution**:
1. Check URL is HTTPS
2. Update Firefox to latest
3. Clear SSL cache: Options > Privacy > Certificates > Clear
4. Retry

**Issue**: Charts not rendering

**Solution**:
1. Disable Enhanced Tracking Protection for teei.io
2. Click shield icon in address bar
3. Toggle "Enhanced Tracking Protection" off
4. Refresh page

#### Safari

**Issue**: Page not loading

**Solution**:
1. Safari > Preferences > Privacy
2. Uncheck "Prevent cross-site tracking" (temporarily)
3. Refresh page
4. Re-enable after login

**Issue**: Cookies blocked

**Solution**:
1. Safari > Preferences > Privacy
2. Cookies: "Allow from websites I visit"
3. Clear cache: Safari > Clear History
4. Retry

#### Edge

**Issue**: Slow performance

**Solution**:
1. Edge Settings > System > "Use hardware acceleration" = ON
2. Clear cache: Settings > Privacy > Clear browsing data
3. Update Edge: Settings > About Edge

### Mobile Issues

**Issue**: Dashboard not responsive on mobile

**Solution**:
1. Use latest mobile browser (Chrome, Safari)
2. Enable JavaScript
3. Rotate to landscape for better view
4. Some features work best on tablet/desktop

**Issue**: Cannot upload files on mobile

**Solution**:
1. iOS: Allow file access in browser settings
2. Android: Grant storage permission
3. Use desktop for bulk uploads

---

## Getting Help

### Self-Service Resources

**Help Center**:
- [Getting Started](./getting_started.md)
- [Dashboard Navigation](./dashboard_navigation.md)
- [Report Generation](./report_generation.md)
- [Evidence Explorer](./evidence_explorer.md)
- [Exports & Scheduling](./exports_scheduling.md)

**Video Tutorials**:
- https://teei.io/videos
- Step-by-step walkthroughs
- 5-15 minute videos

**Community Forum**:
- https://community.teei.io
- Ask questions
- Share tips
- Learn from others

### Contact Support

**Email**: support@teei.io
- Response within 24 hours (business days)
- Include:
  - Company name
  - User email
  - Description of issue
  - Steps to reproduce
  - Screenshots (if applicable)
  - Browser and OS version

**Live Chat**:
- Click chat icon (bottom right)
- Available Mon-Fri, 9:00-17:00 CET
- Instant responses for common issues

**Phone**: +47 XXX XX XXX
- Mon-Fri, 9:00-17:00 CET
- For urgent issues only

**Emergency** (Critical Issues Only): critical@teei.io
- 24/7 response
- For: Data breaches, platform outages, critical bugs
- Not for: Password resets, feature requests

### Escalation

**If issue is not resolved**:

1. **Level 1**: Support agent (support@teei.io)
2. **Level 2**: Technical team (if L1 escalates)
3. **Level 3**: Engineering team (for bugs)
4. **Level 4**: Product team (for feature requests)

**SLA (Enterprise)**:
- Critical: 1-hour response
- High: 4-hour response
- Medium: 24-hour response
- Low: 48-hour response

---

## Preventive Maintenance

### Regular Maintenance Tasks

**Weekly**:
- [ ] Clear browser cache
- [ ] Update browser to latest version
- [ ] Check for TEEI platform updates (release notes)

**Monthly**:
- [ ] Review user access (Admin)
- [ ] Check scheduled reports/exports are running
- [ ] Review audit logs for anomalies (Admin)
- [ ] Test critical workflows (generate report, export)

**Quarterly**:
- [ ] Review data retention policies
- [ ] Audit user roles and permissions
- [ ] Review integration health (Settings > Integrations)
- [ ] Archive old exports

### Best Practices to Avoid Issues

1. **Use supported browsers**: Chrome, Firefox, Edge (latest versions)
2. **Keep browser updated**: Enable auto-update
3. **Use strong passwords**: 12+ characters, unique per site
4. **Enable 2FA**: Authenticator app recommended
5. **Save backup codes**: Store securely (password manager)
6. **Bookmark correct URL**: Avoid phishing
7. **Check email allowlist**: Whitelist noreply@teei.io
8. **Monitor quotas**: Settings > Usage (avoid hitting limits)
9. **Regular exports**: Don't rely solely on scheduled reports
10. **Test before critical use**: Generate test reports before deadlines

---

## Error Code Reference

| Code | Meaning | Solution |
|------|---------|----------|
| **AUTH-001** | Invalid credentials | Reset password |
| **AUTH-002** | Account locked | Wait 30 min or contact admin |
| **AUTH-003** | 2FA failure | Check time sync, use backup code |
| **DATA-001** | Insufficient data | Expand date range, remove filters |
| **DATA-002** | Data sync failed | Contact admin, check integrations |
| **EXPORT-001** | File too large | Reduce scope, remove charts |
| **EXPORT-002** | Export quota exceeded | Wait or upgrade plan |
| **REPORT-001** | Generation failed | Retry, check data availability |
| **REPORT-002** | Rate limit exceeded | Wait 10 minutes |
| **REPORT-003** | LLM unavailable | Wait 5 minutes, retry |
| **NETWORK-001** | Timeout | Check connection, retry |
| **PERMISSION-001** | Access denied | Contact admin for role change |

**To find error code**: Check browser console (F12 > Console) or error message on screen.

---

## FAQ

**Q: Why do I keep getting logged out?**
A: Session timeout after 2 hours of inactivity. Extend in Settings > Security > Session Timeout (Admin only).

**Q: Can I use TEEI on multiple devices?**
A: Yes, log in from any device. Sessions are independent.

**Q: What if I accidentally delete a scheduled report?**
A: Contact support within 30 days. We may be able to restore.

**Q: How do I report a security vulnerability?**
A: Email security@teei.io (not public support). Include details, do not disclose publicly.

**Q: Can support see my data?**
A: Support has read-only access for troubleshooting. All access is logged (Settings > Audit Logs).

---

## Still Having Issues?

If this guide didn't resolve your issue:

1. **Search Community Forum**: https://community.teei.io
2. **Contact Support**: support@teei.io
3. **Schedule Office Hours**: Book 1-on-1 session
4. **Request Feature**: If issue is missing functionality

**Help us improve this guide**: Send feedback to docs-feedback@teei.io

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Feedback**: docs-feedback@teei.io
