# TEEI CSR Platform - Administrator Walkthrough

**Version**: 1.0
**Date**: 2025-11-15
**Target Audience**: Tenant Administrators, CSR Managers
**Estimated Reading Time**: 30 minutes

---

## Welcome to the TEEI Corporate Cockpit

This guide will walk you through the TEEI CSR Platform's Corporate Cockpit, helping you understand how to navigate, generate reports, explore evidence, manage users, and configure your tenant settings.

### What You'll Learn

- Complete tour of the admin console
- Dashboard navigation and KPI interpretation
- Report generation workflows
- Evidence explorer for data validation
- Export and scheduling features
- User management and RBAC
- Best practices for daily operations

---

## 1. First Login & Orientation

### Accessing the Platform

1. Navigate to your tenant URL: `https://[your-company].teei.io`
2. Log in with your admin credentials
3. Complete two-factor authentication (2FA) if enabled
4. Accept Terms of Service and Privacy Policy on first login

### Dashboard Layout Overview

Upon login, you'll see the main dashboard with four key sections:

```
┌─────────────────────────────────────────────────────────┐
│  Header: Company Logo | Navigation | User Menu          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Filters: Period Selector | Program Filter | Cohort     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPI Cards: SROI | VIS | Integration | Participation    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Charts: Trend Analysis | Program Breakdown | Outcomes  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Screenshot Placeholder**: *Main dashboard showing KPI cards, trend charts, and filter controls*

---

## 2. Dashboard Navigation Guide

### Understanding Your KPIs

The dashboard displays key performance indicators (KPIs) as cards:

#### SROI (Social Return on Investment)

- **What it shows**: For every $1 invested, the social value created
- **Example**: "3.2x" means $3.20 of social value per $1 invested
- **Click for**: Drill-down into program-specific SROI
- **View Evidence**: Click "View Evidence" to see underlying data

**Screenshot Placeholder**: *SROI KPI card with trend arrow and "View Evidence" button*

#### VIS (Volunteer Impact Score)

- **What it shows**: Aggregated volunteer effectiveness (0-100 scale)
- **Factors**: Engagement, outcomes, consistency, feedback quality
- **Click for**: Individual volunteer contributions
- **Use case**: Identify high-impact volunteers for recognition

#### Integration Score

- **What it shows**: Participant integration into community/workplace (0-1 scale)
- **Dimensions**: Belonging, confidence, social connections
- **Click for**: Dimension breakdown
- **Use case**: Track program effectiveness over time

#### Participation Metrics

- **What it shows**: Total participants, completion rates, active programs
- **Click for**: Cohort details, dropout analysis
- **Use case**: Monitor program health, identify retention issues

### Using Filters

#### Period Selector

- **Monthly View**: Select specific month (e.g., "November 2024")
- **Quarterly View**: Select Q1, Q2, Q3, or Q4
- **Custom Range**: Set start and end dates
- **Year-to-Date**: Quick filter for current year

**Screenshot Placeholder**: *Period selector dropdown with calendar picker*

#### Program Filter

- Filter by program type: Buddy, Language, Job Readiness
- Multi-select: Compare multiple programs
- "All Programs" for aggregate view

#### Cohort Filter

- Filter by participant cohorts (e.g., "2024-Q1", "New Arrivals")
- Useful for tracking specific groups over time

### Interpreting Charts

#### Trend Analysis Chart

- **Type**: Line chart showing metrics over time
- **X-axis**: Time periods (months/quarters)
- **Y-axis**: Metric values (SROI, VIS, etc.)
- **Hover**: See exact values and dates
- **Export**: Download as PNG or CSV

**Screenshot Placeholder**: *Interactive trend chart with hover tooltip*

#### Program Breakdown Chart

- **Type**: Bar or pie chart
- **Shows**: Distribution of metrics across programs
- **Use case**: Identify best-performing programs
- **Click**: Drill into program details

#### Outcome Distribution Chart

- **Type**: Radar chart showing Q2Q dimensions
- **Dimensions**: Confidence, Belonging, Language Level, Job Readiness, Well-being
- **Use case**: Holistic view of participant outcomes

---

## 3. Report Generation Walkthrough

The TEEI platform includes AI-powered report generation that creates professional narratives backed by evidence.

### Generating Your First Quarterly Report

#### Step 1: Open Report Generator

1. Click **"Generate Report"** button in the top navigation
2. Select **"Quarterly Report"** from the template dropdown
3. The report generator modal opens

**Screenshot Placeholder**: *Generate Report modal with template options*

#### Step 2: Configure Report Parameters

**Period Selection**:
- Start Date: `2024-01-01`
- End Date: `2024-03-31`
- Or select "Q1 2024" from quick picker

**Filters** (optional):
- Programs: Select specific programs or "All"
- Cohorts: Select specific cohorts or "All"
- Metrics: Choose which KPIs to include

**Options**:
- **Language**: English, Norwegian (Bokmål), Ukrainian
- **Tone**: Professional, Executive, Technical
- **Length**: Brief (2 pages), Standard (4-6 pages), Detailed (8+ pages)
- **Include Charts**: Toggle chart embedding

**Screenshot Placeholder**: *Report configuration form with filters and options*

#### Step 3: Generate Report

1. Click **"Generate Report"** button
2. Loading screen appears (30-60 seconds)
3. Progress indicator shows: "Fetching metrics → Analyzing evidence → Generating narrative"

**What's Happening Behind the Scenes**:
- System retrieves metrics for the selected period
- AI fetches Q2Q evidence snippets with lineage
- Prompt template is applied with your configuration
- LLM (GPT-4 or Claude) generates narrative sections
- Citations are extracted and validated
- PII is redacted from all text

#### Step 4: Review Report Preview

The preview shows:

**Sections**:
1. **Executive Summary**: High-level overview (2-3 paragraphs)
2. **Impact Metrics**: Quantitative highlights with citations
3. **Qualitative Insights**: Participant voices (redacted)
4. **Recommendations**: Actionable next steps

**Citations**:
- Inline citations: `[citation:cite-001]`
- Footer references: Evidence ID, source, confidence score
- Click citation to view evidence details

**Screenshot Placeholder**: *Report preview with highlighted citations*

#### Step 5: Edit & Finalize

**Editing**:
- Click **"Edit"** to modify narrative text
- Citations are preserved and non-editable
- Use rich text editor for formatting (bold, italic, bullets)

**Validation**:
- System validates all citations exist
- Warns if PII detected (rare, but possible)
- Checks for content policy violations

**Screenshot Placeholder**: *Rich text editor with citation preservation*

#### Step 6: Export Report

**Export Formats**:
- **PDF**: Professional watermarked PDF with your logo
- **PPTX**: Executive presentation with charts and KPIs
- **DOCX**: Editable Word document (enterprise plan)

**PDF Export Options**:
- **Template**: Standard, Confidential, Compliance, Public
- **Watermark**: Add "CONFIDENTIAL" or custom text
- **Logo Position**: Header, Footer, Both
- **Page Numbers**: Include page numbering
- **Metadata**: Export date, user, report ID

**Screenshot Placeholder**: *Export options modal with watermark preview*

**Generated PDF Includes**:
- Company logo in header
- Page numbers in footer
- Export metadata (who, when)
- Evidence footnotes with IDs
- Watermark (if selected)

---

## 4. Evidence Explorer Usage

The Evidence Explorer provides traceability from metrics to the underlying evidence snippets.

### Why Use Evidence Explorer?

- **Validate Metrics**: Verify KPIs are backed by real data
- **Investigate Anomalies**: Understand spikes or drops in metrics
- **Quality Assurance**: Check Q2Q classification confidence
- **Compliance Audits**: Show evidence lineage for regulators
- **Data Storytelling**: Find compelling participant quotes (redacted)

### Opening Evidence Explorer

**Method 1: From KPI Card**
1. Hover over any KPI card
2. Click **"View Evidence"** button
3. Evidence drawer opens on the right

**Method 2: From Report**
1. Click any citation in a generated report
2. Evidence drawer opens showing that specific evidence

**Method 3: From Navigation**
1. Click **"Evidence"** in main navigation
2. Select company and period
3. Full evidence list loads

**Screenshot Placeholder**: *Evidence drawer showing snippets with Q2Q scores*

### Understanding Evidence Entries

Each evidence entry displays:

#### Snippet Text (Redacted)

Example:
```
"I feel more confident speaking *** in professional settings.
The buddy program helped me connect with [NAME]."
```

**Redaction Applied**:
- Names → `[NAME]`
- Emails → `***@***.com`
- Phone → `***-***-****`
- Specific locations → `***`

#### Q2Q Scores

- **Dimension**: Which outcome (confidence, belonging, etc.)
- **Score**: 0.000 - 1.000 scale
- **Confidence**: Model confidence in the score (0.000 - 1.000)

Example:
```
Dimension: Confidence
Score: 0.85 (High)
Confidence: 0.92 (Very High)
```

**Interpreting Confidence**:
- **0.90+**: Very high confidence, reliable
- **0.70-0.89**: High confidence, generally reliable
- **0.50-0.69**: Moderate confidence, use with caution
- **Below 0.50**: Low confidence, may need manual review

#### Provenance Information

- **Source Type**: buddy_feedback, kintell_feedback, checkin_note
- **Date**: When evidence was collected
- **Classification Method**: ai_classifier, rule_based, manual
- **Model Version**: AI model used (if applicable)
- **Provider**: claude, openai, gemini (if AI classified)

**Screenshot Placeholder**: *Evidence entry with all metadata fields labeled*

### Filtering Evidence

**By Dimension**:
- Select specific Q2Q dimension (Confidence, Belonging, etc.)
- See only evidence supporting that outcome

**By Source Type**:
- Filter by feedback source
- Compare quality across sources

**By Confidence Level**:
- High confidence only (0.90+)
- All confidence levels

**By Date Range**:
- Custom date picker
- Quick filters (Last 7 days, Last month, This quarter)

### Pagination & Export

**Pagination**:
- 10 evidence snippets per page
- Navigate with "Previous" / "Next" buttons
- Jump to specific page

**Export Evidence**:
- CSV: All evidence with metadata
- PDF: Evidence report with filters applied
- JSON: Raw data for analysis

---

## 5. Export & Scheduling Features

### Manual Exports

#### Exporting Dashboard Data

1. Click **"Export"** in the top navigation
2. Select data type:
   - **Current View**: Dashboard as shown
   - **Metrics Only**: CSV of KPI values
   - **Evidence**: Full evidence lineage
   - **Charts**: All charts as PNG images

3. Choose format: CSV, JSON, PDF
4. Click **"Download"**

**Export Audit**:
- All exports are logged for compliance
- View export history in Settings > Audit Logs
- Includes: Who exported, when, what data, file size

**Screenshot Placeholder**: *Export modal with format options*

#### PDF Export Features

**Watermarking**:
- Logo automatically added to header/footer
- Company name and export metadata
- Page numbers
- Confidential marking (if selected)

**Templates**:
- **Minimal**: Page numbers only
- **Standard**: Logo + page numbers + metadata
- **Confidential**: CONFIDENTIAL watermark + full metadata
- **Compliance**: Maximum metadata for audit trail

**Example PDF Header**:
```
[Your Company Logo]        TEEI CSR Platform        Q3 2024 Report
```

**Example PDF Footer**:
```
Page 1 of 12    |    Exported by: Jane Doe    |    Date: 2024-11-15 14:30 UTC
```

### Scheduled Reports

Automate report generation and delivery on a recurring schedule.

#### Creating a Scheduled Report

1. Navigate to **Settings > Scheduled Reports**
2. Click **"New Scheduled Report"**
3. Configure:

**Report Details**:
- **Name**: "Monthly Executive Summary"
- **Template**: Quarterly Report, Executive Pack, Compliance Report
- **Language**: English, Norwegian, Ukrainian

**Schedule**:
- **Frequency**: Daily, Weekly, Monthly, Quarterly
- **Day**: Select day of week/month
- **Time**: Select time (in your timezone)

**Filters**:
- Period: Rolling (last month, last quarter)
- Programs: All or specific
- Cohorts: All or specific

**Delivery**:
- **Email Recipients**: Add email addresses
- **Subject Line**: Custom subject (supports variables: `{company_name}`, `{period}`)
- **Body Message**: Custom email body
- **Attachments**: PDF, CSV, both

**Screenshot Placeholder**: *Scheduled report configuration form*

#### Example Configuration

```
Name: Monthly Board Report
Template: Executive Pack
Frequency: Monthly
Day: 1st of month
Time: 08:00 UTC
Period: Last month
Recipients: board@company.com, csr-manager@company.com
Subject: TEEI Monthly Report - {period}
Format: PDF (Confidential template)
```

#### Managing Scheduled Reports

**Actions**:
- **Edit**: Modify schedule or recipients
- **Pause**: Temporarily stop without deleting
- **Resume**: Restart paused reports
- **Delete**: Permanently remove schedule
- **Test Send**: Send immediately to verify configuration

**Screenshot Placeholder**: *Scheduled reports list with action buttons*

---

## 6. User Management & RBAC

### Understanding Roles

The TEEI platform uses Role-Based Access Control (RBAC):

#### Admin

**Permissions**:
- Full access to all features
- User management (create, edit, delete users)
- Tenant configuration
- Export audit logs
- Scheduled reports management
- SSO/SCIM configuration

**Use case**: IT admins, platform administrators

#### Company User

**Permissions**:
- View dashboards and reports
- Generate reports (with rate limits)
- Export data (with restrictions)
- View evidence (redacted)
- Cannot manage users or settings

**Use case**: CSR managers, program coordinators, analysts

#### Compliance Officer

**Permissions**:
- All Company User permissions
- Access to export audit logs
- Evidence lineage full access
- Compliance reports
- Cannot manage users or tenant settings

**Use case**: Compliance teams, auditors

#### Read-Only Viewer

**Permissions**:
- View dashboards only
- Cannot generate reports
- Cannot export data
- Limited evidence access

**Use case**: Executives, board members

**Screenshot Placeholder**: *Role permissions matrix table*

### Adding New Users

1. Navigate to **Settings > Users**
2. Click **"Add User"**
3. Fill in user details:

**Required Fields**:
- **Email**: User's email address
- **First Name**: User's first name
- **Last Name**: User's last name
- **Role**: Select from dropdown

**Optional Fields**:
- **Department**: User's department
- **Phone**: Contact number
- **Locale**: Preferred language (en, no, uk)

4. Click **"Send Invitation"**
5. User receives email with setup link
6. User completes 2FA setup and sets password

**Screenshot Placeholder**: *Add user form with role selector*

### Managing Existing Users

**Actions**:
- **Edit**: Change role, name, or locale
- **Deactivate**: Suspend access without deleting
- **Reactivate**: Restore deactivated user
- **Delete**: Permanently remove (requires confirmation)
- **Reset Password**: Send password reset link
- **Reset 2FA**: Clear 2FA devices (if user locked out)

**Bulk Actions**:
- Select multiple users
- Change role in bulk
- Deactivate in bulk
- Export user list to CSV

**Screenshot Placeholder**: *Users list with bulk action checkboxes*

### SSO Configuration (Enterprise)

If your tenant has SSO enabled:

1. Navigate to **Settings > Single Sign-On**
2. Select provider: SAML 2.0, OpenID Connect
3. Configure metadata:

**SAML 2.0**:
- **Entity ID**: Your identity provider's entity ID
- **SSO URL**: SAML login endpoint
- **Certificate**: X.509 certificate (PEM format)
- **Attribute Mapping**: Map email, firstName, lastName

**OpenID Connect**:
- **Issuer URL**: OIDC provider URL
- **Client ID**: Your application client ID
- **Client Secret**: Secure secret (encrypted)
- **Scopes**: openid, profile, email

4. Click **"Test Connection"** to verify
5. Enable SSO: Toggle "Enforce SSO for all users"

**Screenshot Placeholder**: *SSO configuration page with SAML metadata fields*

---

## 7. Advanced Features

### Approval Workflows

For enterprises requiring report approval:

#### Draft → Review → Approve Workflow

1. **Draft**: User generates report
2. **Submit for Review**: Sends to approver
3. **Review**: Approver reviews and comments
4. **Approve/Reject**: Approver decision
5. **Publish**: Approved report is finalized

**Screenshot Placeholder**: *Report approval interface with comment thread*

**Configuration**:
- Settings > Workflows > Report Approvals
- Add approvers (by role or specific users)
- Set approval stages (single or multi-stage)
- Configure notifications

### Audit Mode

Enable read-only audit mode for compliance reviews:

1. Navigate to Settings > Audit Mode
2. Click **"Enable Audit Mode"**
3. Platform enters read-only state
4. All interactions are logged
5. Evidence IDs displayed on hover
6. Freeze interactions (no edits allowed)

**Use case**: During regulatory audits, CSRD reporting periods

**Screenshot Placeholder**: *Audit mode banner with evidence ID tooltips*

### Partner Portal Access

If you work with partner organizations:

1. Navigate to Settings > Partner Portal
2. Add partner organization
3. Configure access:
   - **View Access**: Dashboard only
   - **Report Access**: Can view generated reports
   - **Data Access**: Limited evidence access

4. Partner receives invitation
5. Partner views tenant snapshot (read-only)

**Screenshot Placeholder**: *Partner portal configuration page*

### Benchmarking (Enterprise)

Compare your metrics against cohort benchmarks:

1. Navigate to Benchmarks in main navigation
2. Select cohort: Industry, Geography, Program Type
3. View percentile ribbons on charts
4. See your position: P25, P50 (median), P75, P90

**Screenshot Placeholder**: *Benchmark chart with percentile ribbons*

---

## 8. Settings & Configuration

### Tenant Settings

Navigate to **Settings > Tenant** to configure:

#### Company Information

- **Company Name**: Display name
- **Logo**: Upload logo (PNG/JPG, max 500KB)
- **Primary Color**: Brand color (hex code)
- **Timezone**: Default timezone for all users
- **Locale**: Default language (en, no, uk)

#### Privacy & GDPR

- **Data Retention**: Evidence retention period (default: 90 days)
- **PII Redaction**: Always enabled, non-configurable
- **Consent Management**: Track participant consents
- **DSAR Queue**: Data Subject Access Request viewer
- **Retention Notices**: Auto-notify before data deletion

#### Export Configuration

- **Default Template**: Standard, Confidential, Compliance
- **Logo Position**: Header, Footer, Both
- **Watermark Text**: Custom watermark (e.g., "INTERNAL USE ONLY")
- **Confidential Mark**: Enable diagonal CONFIDENTIAL watermark
- **Page Numbering**: Enable/disable page numbers

#### Notification Settings

- **Email Notifications**: Enable/disable
- **Digest Frequency**: Daily, Weekly, None
- **Alert Thresholds**: Set alerts for metric changes
- **Scheduled Reports**: Email delivery preferences

**Screenshot Placeholder**: *Tenant settings dashboard with sections*

### Integrations

Navigate to **Settings > Integrations**:

#### Impact-In API

- **API Key**: Generate or rotate API key
- **Webhook URL**: Configure webhook for real-time updates
- **Push Frequency**: Real-time, Hourly, Daily

#### Benevity / Goodera / Workday

- **Connection Status**: Connected, Disconnected
- **Sync Schedule**: Configure data sync frequency
- **Field Mapping**: Map external fields to TEEI fields

#### Discord / Slack

- **Webhook URL**: Paste webhook URL
- **Notification Events**: Select events to post
- **Channel**: Specify channel name

**Screenshot Placeholder**: *Integrations page with connected services*

---

## 9. Troubleshooting & Support

### Common Issues

#### "Report Generation Failed"

**Possible Causes**:
- Insufficient data for selected period
- API rate limit exceeded
- LLM service unavailable

**Solutions**:
1. Try a different date range (expand period)
2. Wait 5 minutes and retry (rate limit)
3. Contact support if persistent

#### "No Evidence Available"

**Possible Causes**:
- No data collected for period
- Q2Q processing not yet complete
- Filters too restrictive

**Solutions**:
1. Check date range alignment
2. Verify data collection is active
3. Remove filters and retry
4. Allow 24-48 hours for Q2Q processing

#### "Export Failed"

**Possible Causes**:
- File too large
- Timeout during generation
- Permission issue

**Solutions**:
1. Reduce date range or filters
2. Try a different format (CSV instead of PDF)
3. Check user permissions
4. Contact admin to verify export limits

### Getting Help

#### In-App Support

- Click **"?"** icon in top navigation
- Access Help Center articles
- Submit support ticket
- Live chat (if enabled)

#### Documentation

- Help Center: [https://help.teei.io](https://help.teei.io)
- API Docs: [https://api.teei.io/docs](https://api.teei.io/docs)
- Video Tutorials: [https://teei.io/videos](https://teei.io/videos)

#### Contact Support

- **Email**: support@teei.io
- **Phone**: +47 XXX XX XXX (Mon-Fri 9:00-17:00 CET)
- **Emergency**: critical@teei.io (24/7 for critical issues)

**Screenshot Placeholder**: *Help center access from navigation menu*

---

## 10. Best Practices for Daily Operations

### Morning Routine (5 minutes)

1. Log in and check dashboard
2. Review KPI changes from yesterday
3. Check scheduled report delivery status
4. Review any notifications or alerts

### Weekly Routine (15 minutes)

1. Generate weekly progress report
2. Review evidence quality (check confidence scores)
3. Export data for internal stakeholders
4. Check export audit logs
5. Review user activity (if admin)

### Monthly Routine (30 minutes)

1. Generate comprehensive monthly report
2. Schedule export to board/stakeholders
3. Review trends and anomalies
4. Update scheduled reports if needed
5. Review and adjust alert thresholds

### Quarterly Routine (1 hour)

1. Generate quarterly executive report
2. Deep dive into evidence lineage
3. Benchmark against industry cohorts (if available)
4. Review user access and roles
5. Audit data retention and compliance
6. Plan next quarter's reporting schedule

---

## 11. Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `G` then `D` | Go to Dashboard |
| `G` then `R` | Generate Report |
| `G` then `E` | Evidence Explorer |
| `G` then `S` | Settings |
| `?` | Help Center |
| `Esc` | Close drawer/modal |
| `Ctrl/Cmd + K` | Search |
| `Ctrl/Cmd + E` | Quick Export |

**Screenshot Placeholder**: *Keyboard shortcuts overlay (press `?`)*

---

## 12. Next Steps

### For New Admins

1. ✅ Complete this walkthrough
2. ✅ Configure tenant settings (logo, colors, timezone)
3. ✅ Add your team members and assign roles
4. ✅ Generate your first test report
5. ✅ Set up a scheduled monthly report
6. ✅ Explore evidence lineage
7. ✅ Bookmark help center for reference

### For New Users

1. ✅ Complete orientation
2. ✅ Familiarize yourself with dashboard
3. ✅ Generate a report for your area
4. ✅ Export data for your team
5. ✅ Ask questions via help center or support

### Additional Training

- **Live Webinar**: Join our monthly admin training webinar
- **Video Tutorials**: Watch step-by-step video guides
- **Office Hours**: Book 1-on-1 session with support
- **Certification**: Complete TEEI Platform Certification (optional)

---

## Appendix: Glossary

**SROI**: Social Return on Investment - ratio of social value to investment

**VIS**: Volunteer Impact Score - aggregated volunteer effectiveness metric

**Q2Q**: Qualitative to Quantitative - AI classification of text to scores

**Evidence Lineage**: Traceability from metrics to underlying data

**PII**: Personally Identifiable Information

**RBAC**: Role-Based Access Control

**SSO**: Single Sign-On

**SCIM**: System for Cross-domain Identity Management

**CSRD**: Corporate Sustainability Reporting Directive (EU)

**DSAR**: Data Subject Access Request (GDPR)

**WCAG**: Web Content Accessibility Guidelines

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: Worker 2 - Training & Success Team
**Review Frequency**: Quarterly
**Feedback**: admin-feedback@teei.io

---

**End of Administrator Walkthrough**
