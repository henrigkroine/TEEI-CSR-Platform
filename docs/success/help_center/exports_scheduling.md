# Exports & Scheduling Guide

**Target Audience**: All Users
**Estimated Reading Time**: 15 minutes
**Last Updated**: 2025-11-15

---

## Overview

The TEEI platform provides comprehensive export and scheduling capabilities for dashboards, reports, evidence, and raw data. This guide covers all export formats, scheduling options, audit logging, and best practices.

---

## Quick Export

### One-Click Export from Dashboard

**Access**: Click the **Export** icon (⬇) in top navigation

**Export Current View**:
1. Click "Export" button
2. Choose format: PDF, CSV, PNG
3. Click "Download"
4. File downloads instantly

**What's Included**:
- All visible KPI cards
- All visible charts
- Current filters applied
- Period displayed
- Export metadata

**File Name Format**: `Dashboard-[Company]-[Period]-[Date].pdf`

**Use Case**: Share current dashboard view with stakeholders quickly.

---

## Export Formats

### PDF Exports

**Features**:
- Professional, print-ready format
- Watermarked with company logo
- Page numbers and metadata
- Charts embedded as high-res images
- Evidence citations preserved

#### PDF Templates

**Standard Template**:
- Company logo in header
- Page numbers in footer
- Export date and user
- Clean, professional look

**Confidential Template**:
- All features of Standard
- Diagonal "CONFIDENTIAL" watermark (15% opacity)
- Enhanced metadata (Report ID, evidence hash)
- Suitable for internal distribution only

**Compliance Template**:
- All features of Confidential
- Maximum metadata for audit trail:
  - Export user with email
  - Export timestamp (UTC)
  - Report ID with hash
  - Evidence lineage IDs
  - Q2Q confidence scores
- Suitable for CSRD, ESG, regulatory reporting

**Public Template**:
- Clean design, no confidential marks
- Company logo and branding
- Minimal metadata
- Suitable for external stakeholders, annual reports

**Minimal Template**:
- Page numbers only
- No watermarks or extensive metadata
- Smallest file size
- Suitable for internal drafts

#### PDF Configuration Options

**When exporting to PDF**:

**Watermark Settings**:
- Logo Position: Header, Footer, Both
- Watermark Text: None, CONFIDENTIAL, INTERNAL USE ONLY, DRAFT, Custom
- Confidential Mark: Enable/disable diagonal watermark

**Page Settings**:
- Page Size: A4 (default), Letter, Legal
- Orientation: Portrait (default), Landscape
- Margins: Normal, Narrow, Wide

**Content Options**:
- Include Charts: Yes/No
- Include Evidence Citations: Yes/No (always Yes for compliance)
- Chart Resolution: Standard (96 DPI), High (144 DPI), Print (300 DPI)

**Metadata**:
- Include Export User: Yes/No
- Include Timestamp: Yes/No
- Include Report ID: Yes/No

**Example Configuration**:
```
Template: Confidential
Logo Position: Header
Watermark Text: CONFIDENTIAL
Confidential Mark: Enabled
Page Size: A4
Orientation: Portrait
Chart Resolution: High (144 DPI)
Include Export User: Yes
```

### CSV Exports

**Features**:
- Spreadsheet-compatible
- All data in tabular format
- Opens in Excel, Google Sheets, LibreOffice
- Ideal for custom analysis

**What's Exported**:
- All metrics for selected period
- Row per time unit (day, month, quarter)
- Columns for each KPI
- Additional metadata columns

**Example CSV Output**:
```csv
Period,SROI,VIS,Integration_Score,Participants,Completion_Rate
2024-01,3.1,78,0.75,1150,87
2024-02,3.2,80,0.76,1200,88
2024-03,3.3,82,0.78,1234,89
```

**Use Cases**:
- Custom analysis in Excel
- Data visualization in Tableau, Power BI
- Statistical analysis in R, Python
- Import into other systems

### JSON Exports (Advanced)

**Features**:
- Structured data format
- Machine-readable
- Includes nested objects (evidence, citations, metadata)
- Ideal for API integrations, developers

**Example JSON Structure**:
```json
{
  "companyId": "uuid-company-123",
  "period": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  },
  "metrics": {
    "sroi": 3.2,
    "vis": 82,
    "integrationScore": 0.78,
    "participants": 1234
  },
  "evidence": [
    {
      "id": "evidence-uuid-789",
      "snippetText": "I feel more confident...",
      "q2qScores": { "dimension": "confidence", "score": 0.85 },
      "provenance": { "source": "buddy_feedback", "date": "2024-02-15" }
    }
  ]
}
```

**Use Cases**:
- Custom reporting tools
- API integration
- Data science pipelines
- Archive for data lakes

### PNG/SVG Chart Exports

**Features**:
- Individual charts as images
- High-resolution for presentations
- Transparent backgrounds (PNG)
- Scalable vector graphics (SVG)

**How to Export Charts**:
1. Hover over any chart
2. Click the export icon (⬇) in chart header
3. Choose format: PNG or SVG
4. Select resolution (PNG only): 1x, 2x, 3x
5. Click "Download"

**Use Cases**:
- Insert into presentations (PowerPoint, Keynote)
- Include in custom reports
- Social media graphics
- Print materials

### PowerPoint (PPTX) Exports

**Features**:
- Complete presentation deck
- Cover slide with company logo
- KPI summary slide
- Individual chart slides
- Evidence summary slide
- Recommendations slide

**Template Slides**:
1. **Cover**: Company logo, report title, period, date
2. **Executive Summary**: Key highlights (bullet points)
3. **Metrics Overview**: 4 KPI cards on one slide
4. **Trend Analysis**: Line chart with interpretation
5. **Program Breakdown**: Bar/pie chart
6. **Outcome Distribution**: Radar chart
7. **Evidence Highlights**: Top 5 evidence snippets
8. **Recommendations**: Actionable next steps
9. **Appendix**: Methodology, citations

**Customization**:
- After export, fully editable in PowerPoint
- Speaker notes included with data insights
- Consistent branding (your colors, fonts)

**Use Cases**:
- Board presentations
- Stakeholder meetings
- Conference talks
- Executive briefings

---

## Export Options by User Role

### Standard User

**Allowed Exports**:
- Dashboard PDF (Standard template)
- CSV metrics
- PNG charts (standard resolution)

**Limits**:
- 10 exports per day
- Max file size: 10 MB
- Standard templates only

### Admin

**Allowed Exports**:
- All formats
- All templates
- Evidence exports
- Audit logs

**Limits**:
- 50 exports per day
- Max file size: 50 MB

### Compliance Officer

**Allowed Exports**:
- All formats
- Compliance template (required)
- Evidence lineage
- Export audit logs

**Limits**:
- Unlimited exports
- No file size limit
- Special compliance features (evidence hashes, full metadata)

---

## Scheduled Exports

Automate data and report exports on a recurring schedule.

### Setting Up Scheduled Exports

1. Navigate to **Settings > Scheduled Exports**
2. Click **"New Scheduled Export"**
3. Configure export:

#### Export Configuration

**Export Type**:
- Dashboard Snapshot
- Metrics CSV
- Generated Report (AI)
- Evidence Lineage
- Custom Query (enterprise)

**Format**:
- PDF, CSV, JSON, PPTX
- Multiple formats simultaneously

**Filters**:
- Period: Rolling (last month, last quarter, YTD)
- Programs: Specific or all
- Cohorts: Specific or all

#### Schedule Configuration

**Frequency**:
- Daily
- Weekly (choose day: Monday - Sunday)
- Monthly (choose day: 1-31 or Last Day)
- Quarterly (choose day of quarter)
- Annually (choose date)

**Time**:
- Select time in your timezone
- System converts to UTC
- Example: 08:00 CET → 07:00 UTC (winter) / 06:00 UTC (summer)

**Start Date**:
- Immediate (next occurrence)
- Custom start date

**End Date** (Optional):
- Never (runs indefinitely)
- After X occurrences
- On specific date

#### Delivery Configuration

**Email Delivery**:
- Recipients: Add email addresses (comma-separated)
- CC/BCC: Optional
- Subject Line: Supports variables (`{company_name}`, `{period}`, `{date}`)
- Body Message: Custom text or template

**Email Variables**:
- `{company_name}`: Your company name
- `{period}`: Report period (e.g., "November 2024")
- `{date}`: Export date
- `{metric_sroi}`: SROI value
- `{metric_vis}`: VIS value

**Example Email Configuration**:
```
To: board@company.com, csr-team@company.com
CC: executive-team@company.com
Subject: TEEI Monthly Dashboard - {company_name} - {period}

Body:
Dear Team,

Attached is your automated TEEI dashboard export for {period}.

Key Highlights:
• SROI: {metric_sroi}
• VIS: {metric_vis}

Please review and contact the CSR team with questions.

Best regards,
TEEI Platform
```

**FTP/SFTP Upload** (Enterprise):
- Server: ftp.example.com
- Port: 21 (FTP) / 22 (SFTP)
- Path: /reports/teei/
- Credentials: Encrypted

**Webhook** (Enterprise):
- URL: https://your-system.com/webhook
- Method: POST
- Headers: Custom headers
- Body: JSON payload with export data

### Example Scheduled Export Configurations

#### Monthly Board Report

```
Export Type: Dashboard Snapshot
Format: PDF (Confidential template)
Frequency: Monthly (1st of month)
Time: 08:00 CET
Recipients: board@company.com
Subject: TEEI Monthly Report - {period}
```

#### Weekly CSV Metrics

```
Export Type: Metrics CSV
Format: CSV
Frequency: Weekly (Monday)
Time: 06:00 CET
Recipients: analytics-team@company.com
Subject: Weekly Metrics Export - {date}
```

#### Quarterly Compliance Report

```
Export Type: Generated Report
Format: PDF (Compliance template)
Frequency: Quarterly (Last day of quarter)
Time: 17:00 CET
Recipients: compliance@company.com, external-auditor@example.com
Subject: Q{quarter} {year} CSRD Compliance Report
```

### Managing Scheduled Exports

**Actions**:
- **Edit**: Modify schedule, recipients, or format
- **Pause**: Temporarily stop without deleting
- **Resume**: Restart paused export
- **Delete**: Permanently remove schedule
- **Test Run**: Execute immediately to verify
- **View History**: See all past executions

**Export History**:
- Execution date/time
- Status: Success, Failed, Skipped
- File size
- Recipients
- Download previous exports
- View error logs (if failed)

**Notifications**:
- Email notification on failure
- Admin dashboard alert
- Retry policy: 3 attempts with exponential backoff

---

## Export Audit Logging

Every export is automatically logged for compliance and security.

### What's Logged

**Export Audit Entry**:
- **Export ID**: Unique identifier
- **Timestamp**: When export occurred (UTC)
- **Export Type**: PDF, CSV, JSON, PPTX
- **User**: Who initiated export (user ID, name)
- **Tenant**: Company ID
- **Data**: What was exported (report ID, period, filters)
- **File Size**: In bytes
- **Status**: Success, Failed
- **IP Address**: User's IP (masked for privacy: 192.168.*.*)
- **User Agent**: Browser/client
- **Error Message**: If failed

### Accessing Export Audit Logs

**Admin/Compliance Officer Access**:
1. Navigate to **Settings > Audit Logs > Export Logs**
2. Filter by:
   - Date range
   - User
   - Export type
   - Status (success/failed)
3. View detailed log entries
4. Export audit logs to CSV

**Example Audit Log Entry**:
```
Export ID: exp_1699564800000_a1b2c3d4e5f6
Timestamp: 2024-11-15 14:30:00 UTC
Type: PDF
User: Jane Doe (jane@company.com)
User ID: user-456
Tenant: Acme Corp (tenant-123)
Report: Q3 2024 Dashboard
File Size: 1,024,567 bytes (1.02 MB)
Status: Success
IP Address: 192.168.***.***
User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
```

### Audit Log Statistics

**View aggregated statistics**:
- Total exports (by period)
- Exports by type (PDF, CSV, etc.)
- Exports by user
- Success vs. failure rate
- Total data exported (bytes)
- Average file size

**Example Stats**:
```
Period: November 2024
Total Exports: 142
By Type:
  • PDF: 89 (63%)
  • CSV: 32 (23%)
  • JSON: 15 (11%)
  • PPTX: 6 (4%)
Success Rate: 98.6%
Total Data Exported: 145 MB
Average File Size: 1.02 MB
```

### Compliance & Retention

**GDPR Compliance**:
- User names masked in logs: "J*** D***"
- IP addresses masked: "192.168.***.***"
- Logs retained for 90 days (configurable)
- Export logs available for DSAR (Data Subject Access Requests)

**SOC 2 / ISO 27001**:
- Full audit trail for all data exports
- Immutable logs (cannot be edited)
- Encrypted at rest
- Available for compliance audits

---

## PDF Watermarking Details

### Watermark Components

**Header**:
- Company logo (left, center, or right)
- Report title (optional)
- Period (optional)

**Footer**:
- Page numbers (Page X of Y)
- Export metadata:
  - "Exported by: Jane Doe"
  - "Date: 2024-11-15 14:30 UTC"
  - "Report ID: report-uuid-123" (compliance template only)
- Custom footer text

**Diagonal Watermark** (Confidential/Internal):
- Text: "CONFIDENTIAL", "INTERNAL USE ONLY", "DRAFT", Custom
- Opacity: 10-30% (default: 15%)
- Rotation: -45 degrees
- Color: Gray #999999
- Font: Arial Bold, 60pt

### Example Watermarked Page

```
┌────────────────────────────────────────────────┐
│ [Logo]  Q3 2024 Impact Report     Page 1 of 8  │ ← Header
├────────────────────────────────────────────────┤
│                                                │
│              C O N F I D E N T I A L           │ ← Diagonal
│                                                │
│  Executive Summary                             │
│                                                │
│  In Q3 2024, your CSR programs achieved...     │
│                                                │
├────────────────────────────────────────────────┤
│ Exported by: Jane Doe | 2024-11-15 14:30 UTC  │ ← Footer
└────────────────────────────────────────────────┘
```

### Customizing Watermarks (Admin)

**Settings > Tenant > Export Configuration**:

**Logo Settings**:
- Upload company logo (PNG/JPG, max 500 KB)
- Position: Header Left, Header Center, Header Right, Footer
- Size: Small (60px), Medium (80px), Large (100px)

**Watermark Settings**:
- Enable diagonal watermark: Yes/No
- Watermark text: Custom text (max 50 characters)
- Opacity: 5-50% (slider)
- Color: Custom hex color

**Metadata Settings**:
- Include export user: Yes/No
- Include timestamp: Yes/No
- Include report ID: Yes/No (compliance only)
- Custom footer text: (max 100 characters)

---

## Best Practices

### Before Exporting

**Checklist**:
- [ ] Verify data is current (check last refresh time)
- [ ] Apply appropriate filters
- [ ] Select correct period
- [ ] Choose suitable template for audience
- [ ] Preview before exporting (if available)

### Choosing Export Format

**Use PDF when**:
- Sharing with executives, board members
- Formal presentations
- Archival/compliance
- Print materials

**Use CSV when**:
- Custom analysis needed
- Import into other tools
- Statistical analysis
- Data science work

**Use PPTX when**:
- Presenting to groups
- Need to edit slides
- Multiple stakeholders
- Interactive discussions

**Use JSON when**:
- API integration
- Developer workflows
- Data pipelines
- Archival in data lakes

### Scheduled Export Best Practices

**Frequency**:
- Daily: Only for critical metrics or high-change data
- Weekly: Good for operational teams
- Monthly: Best for executives, board members
- Quarterly: Suitable for compliance, strategic reviews

**Timing**:
- Schedule for early morning (before business hours)
- Avoid overlapping schedules (stagger by 15+ minutes)
- Consider recipient timezones
- Allow processing time (don't schedule at midnight)

**Recipients**:
- Keep distribution lists current
- Use mailing lists, not individual emails (easier to manage)
- Add unsubscribe option for non-critical reports
- CC compliance/audit team for regulatory exports

### File Management

**Naming Conventions**:
- Include date: `TEEI-Report-2024-11-15.pdf`
- Include company: `Acme-Corp-Q3-2024.pdf`
- Include type: `Dashboard-Export-2024-11.csv`
- Use consistent format across organization

**Storage**:
- Download to secure location (not desktop)
- Use encrypted drives for confidential exports
- Implement file retention policy
- Archive old exports (after 90 days)

---

## Troubleshooting

### "Export Failed"

**Common Causes**:
1. File too large (>50 MB)
2. Timeout during generation
3. Insufficient permissions
4. Server issue

**Solutions**:
1. **Too Large**: Reduce date range, remove charts, use CSV instead
2. **Timeout**: Retry, simplify filters, contact support
3. **Permissions**: Check role, contact admin
4. **Server**: Wait 5 minutes, retry, contact support

### "Scheduled Export Not Received"

**Check**:
1. Settings > Scheduled Exports > History
2. Look for error message
3. Verify email address correct
4. Check spam/junk folder

**Common Issues**:
- Email server rejected (SPF/DKIM issue)
- Export failed (check history)
- Schedule paused
- Recipient limit exceeded

**Solutions**:
- Whitelist noreply@teei.io in email settings
- Review export history for errors
- Resume schedule if paused
- Reduce recipient count

### "Watermark Not Appearing"

**Possible Causes**:
- Wrong template selected (Minimal has no watermark)
- Logo URL broken
- PDF viewer issue

**Solutions**:
- Verify template is Confidential or Compliance
- Re-upload logo in Settings
- Try different PDF viewer (Adobe Reader, Chrome, Firefox)

### "CSV Export Empty or Incomplete"

**Possible Causes**:
- Filters too restrictive
- No data for period
- Export limit hit

**Solutions**:
- Remove filters, retry
- Expand date range
- Check export quota in Settings > Usage

---

## FAQ

**Q: Can I export data for multiple companies at once?**
A: No, exports are per-tenant. Multi-tenant exports available in enterprise plans.

**Q: How long are exports stored on the platform?**
A: Scheduled exports are stored for 30 days. Manual exports are not stored (download immediately).

**Q: Can I export un-redacted evidence?**
A: No, all evidence is redacted for privacy and GDPR compliance.

**Q: Are there file size limits for exports?**
A: Yes. Standard: 10 MB, Admin: 50 MB, Enterprise: 100 MB.

**Q: Can I schedule exports to external systems (FTP, API)?**
A: Yes, available in enterprise plans. Contact support.

**Q: How do I increase my export quota?**
A: Contact your admin or upgrade your plan.

**Q: Can I customize PDF templates?**
A: Yes, enterprise plans support custom templates. Contact sales.

---

## Next Steps

Master exports and scheduling:

1. ✅ Export your first dashboard to PDF
2. ✅ Download a CSV for analysis
3. ✅ Set up a monthly scheduled export
4. ✅ Review export audit logs (if admin)
5. ✅ Customize watermark settings (if admin)
6. ✅ Watch the Exports & Scheduling video (12 min)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Feedback**: docs-feedback@teei.io
