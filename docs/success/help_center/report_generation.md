# Report Generation Guide

**Target Audience**: All Users
**Estimated Reading Time**: 20 minutes
**Last Updated**: 2025-11-15

---

## Overview

TEEI's AI-powered report generation transforms your CSR metrics and participant evidence into professional, narrative-style reports. Every claim is backed by **evidence citations** for auditability and compliance.

### What You'll Learn

- How AI report generation works
- Step-by-step report creation
- Customizing report content and style
- Editing generated narratives
- Exporting in multiple formats
- Understanding citations and evidence links
- Best practices for quality reports

---

## How AI Report Generation Works

### The Generation Process

```
User Clicks
"Generate Report"
       ↓
Configure Parameters
(period, filters, options)
       ↓
System Fetches Data
• Metrics from database
• Q2Q evidence with lineage
• Program details
       ↓
Apply Prompt Template
• Structured instructions
• Context from your data
• Citation requirements
       ↓
LLM Generates Narrative
(GPT-4 or Claude)
• Executive summary
• Impact metrics
• Qualitative insights
• Recommendations
       ↓
Validate & Redact
• Check all citations exist
• Apply PII redaction
• Content policy check
       ↓
Return Report Preview
(30-60 seconds total)
```

### Why Evidence Citations Matter

**Every claim in your report includes a citation**:
- **Example**: "Participants reported increased confidence [citation:cite-001]"
- **Purpose**: Prove the claim is backed by real data
- **Compliance**: Required for CSRD, GRI, ESG reporting
- **Auditability**: Regulators can trace back to source evidence

**What's in a Citation**:
- Evidence ID (unique identifier)
- Evidence snippet text (redacted)
- Source (buddy feedback, check-in note, etc.)
- Confidence score (Q2Q classification confidence)

---

## Generating Your First Report

### Step 1: Access Report Generator

**Method 1: Main Navigation**
1. Click **"Generate Report"** in top navigation bar
2. Report generator modal opens

**Method 2: Dashboard**
1. From dashboard, click **"New Report"** button
2. Select "AI-Generated Report"

**Method 3: Keyboard Shortcut**
- Press `G` then `R`

### Step 2: Choose Report Template

TEEI offers several pre-configured templates:

| Template | Description | Best For |
|----------|-------------|----------|
| **Quarterly Report** | Comprehensive 4-6 page report | Regular board updates |
| **Executive Summary** | Brief 2-page overview | C-suite, time-constrained readers |
| **Compliance Report** | Detailed with maximum citations | CSRD, ESG, regulatory filing |
| **Program Deep Dive** | Focus on single program | Program evaluation |
| **Annual Review** | Year-end comprehensive report | Annual stakeholder reports |
| **Custom** | Build your own structure | Special purposes |

**Select Template**:
1. Click template card
2. Template name appears in header
3. Configuration options update

**Pro Tip**: Start with "Quarterly Report" for your first attempt. It's the most balanced template.

### Step 3: Configure Period

**Period Selection**:

**Option A: Quick Selectors**
- Last Month
- Last Quarter (Q1, Q2, Q3, Q4)
- Year to Date
- Last 12 Months
- Last Calendar Year

**Option B: Custom Date Range**
1. Click "Custom Range"
2. Start Date: Use date picker or type (YYYY-MM-DD)
3. End Date: Use date picker or type
4. Date range displays (e.g., "Jan 1, 2024 - Mar 31, 2024")

**Examples**:
- **Q1 2024**: Jan 1 - Mar 31, 2024
- **November 2024**: Nov 1 - Nov 30, 2024
- **2024 Annual**: Jan 1 - Dec 31, 2024

**Important**: Period must have sufficient data (at least 10 evidence snippets) or generation will fail.

### Step 4: Apply Filters (Optional)

Filters let you focus the report on specific aspects:

#### Program Filter

**Select Specific Programs**:
- Buddy Program
- Language Connect
- Job Readiness
- All Programs (default)

**Use Case**: "Generate a report only about our Buddy Program"

**How to Select**:
1. Click "Programs" dropdown
2. Check desired programs (multi-select)
3. Selected programs display as badges

#### Cohort Filter

**Select Specific Cohorts**:
- 2024-Q1, 2024-Q2, 2024-Q3, 2024-Q4
- New Arrivals
- Established Participants
- High Engagement
- All Cohorts (default)

**Use Case**: "Report on Q2 cohort performance only"

#### Metric Filter

**Select Specific Metrics**:
- SROI
- VIS
- Integration Score
- Participation Metrics
- All Metrics (default)

**Use Case**: "Focus report on SROI and VIS only"

**Pro Tip**: For first-time reports, leave filters at "All" to get a comprehensive view.

### Step 5: Set Report Options

#### Language

**Available Languages**:
- **English (en)**: Default, most tested
- **Norwegian Bokmål (no)**: Norsk rapport
- **Ukrainian (uk)**: Український звіт

**Note**: Language selection affects:
- Report narrative
- Section headings
- Evidence summaries
- Not the evidence snippets themselves (remain in original language, redacted)

#### Tone

**Choose Narrative Style**:

**Professional** (Default):
- Formal, objective language
- Suitable for board members, executives
- Example: "The data indicates a 15% improvement in participant confidence."

**Executive**:
- Concise, high-level
- Action-oriented
- Example: "Confidence up 15%. Recommend scaling Buddy Program."

**Technical**:
- Detailed, data-heavy
- More statistics and methodology
- Example: "Confidence scores increased from 0.72 to 0.83 (p<0.05, n=234)."

**Narrative**:
- Story-driven
- More participant voices
- Example: "Participants like [NAME] shared how the program transformed their confidence..."

#### Length

**Report Length Options**:

**Brief** (2 pages):
- Executive summary only
- Key metrics and top insights
- ~500 words
- Generation time: 20-30 seconds

**Standard** (4-6 pages):
- Full sections (summary, metrics, insights, recommendations)
- Balanced detail
- ~1500-2000 words
- Generation time: 40-60 seconds

**Detailed** (8-12 pages):
- Extended analysis
- More evidence citations
- Deeper recommendations
- ~3000-4000 words
- Generation time: 60-90 seconds

**Pro Tip**: Use "Brief" for quick monthly updates, "Standard" for quarterly reports, "Detailed" for annual reviews or compliance.

#### Include Charts

**Toggle**: ON / OFF

**When ON**:
- Charts embedded in report
- Trend analysis, program breakdown, outcome distribution
- Increases PDF file size
- Better for comprehensive reports

**When OFF**:
- Text and citations only
- Smaller file size
- Better for quick summaries

#### Advanced Options (Expandable)

Click **"Advanced Options"** to reveal:

**Model Selection**:
- GPT-4 Turbo (default, fastest)
- GPT-4o (more creative)
- Claude 3 Opus (most accurate)
- Claude 3 Sonnet (balanced)

**Temperature** (Creativity):
- 0.1 - 0.3: Conservative, consistent (default: 0.3)
- 0.4 - 0.6: Balanced
- 0.7 - 1.0: Creative, varied

**Max Tokens** (Length Limit):
- 2000: Brief
- 4000: Standard (default)
- 6000: Detailed

**Seed** (Reproducibility):
- Leave blank for random (default)
- Enter number (e.g., 42) for deterministic reports
- Use case: Generate identical report for testing

### Step 6: Generate Report

1. Review all settings in the summary panel (right side)
2. Click **"Generate Report"**
3. Loading screen appears with progress indicators:
   - ✅ Fetching metrics...
   - ✅ Analyzing evidence...
   - ⏳ Generating narrative...
   - ⏳ Validating citations...
4. Wait 30-90 seconds (depends on length and complexity)
5. Report preview loads

**Progress Indicators**:
- **Fetching metrics**: Retrieving KPI data
- **Analyzing evidence**: Fetching Q2Q evidence snippets
- **Generating narrative**: AI writing the report
- **Validating citations**: Ensuring all citations exist and are valid

**What Happens If Generation Fails?**
- Error message displays
- Common causes:
  - Insufficient data for period
  - API rate limit exceeded (wait 5 min)
  - LLM service temporarily unavailable
- Solutions: Try different period, wait and retry, contact support

---

## Understanding the Generated Report

### Report Structure

**Standard Report Includes**:

1. **Executive Summary** (2-3 paragraphs)
   - High-level overview
   - Key achievements
   - Notable metrics

2. **Impact Metrics** (1-2 pages)
   - SROI, VIS, Integration scores
   - Quantitative highlights
   - All backed by citations

3. **Qualitative Insights** (1-2 pages)
   - Participant voices (redacted quotes)
   - Themes and patterns
   - Evidence-based observations

4. **Recommendations** (1 page)
   - Actionable next steps
   - Data-driven suggestions
   - Priority actions

### Reading Citations

**Citation Format in Text**:
```
"In Q1 2024, your CSR programs achieved a 3.2x Social Return
on Investment [citation:cite-001] with significant improvements
in participant confidence [citation:cite-002]."
```

**Citation Details** (at end of section or report):
```
[cite-001]
Evidence ID: evidence-f47ac10b-58cc-4372-a567-0e02b2c3d479
Text: "Average SROI ratio across all programs: 3.2"
Source: Aggregated metrics, Q1 2024
Confidence: 0.95
```

**How to Use Citations**:
- **Validate Claims**: Click citation to view full evidence
- **Drill Down**: Citations link to Evidence Explorer
- **Audit Trail**: Evidence ID is traceable to source data
- **Compliance**: Show regulators the data lineage

### Example Report Section

```markdown
## Executive Summary

In Q1 2024, your Corporate Social Responsibility programs
demonstrated exceptional impact across all measured dimensions.
The Buddy Program achieved a 3.2x Social Return on Investment
[citation:cite-001], while participant integration scores
increased by 24% to 0.78 [citation:cite-002].

Participants consistently reported increased self-confidence
[citation:cite-003], with feedback such as "I feel more capable
in professional settings" [citation:cite-004] and "My
communication skills have improved significantly" [citation:cite-005].

The Language Connect program saw particularly strong outcomes,
with participants progressing an average of 1.2 CEFR levels
[citation:cite-006], exceeding the industry benchmark of 0.9
levels [citation:cite-007].

---

## Citations

[cite-001] SROI Calculation (evidence-abc123...)
"Average SROI across all programs: 3.2x"
Source: Metrics Database, Q1 2024
Confidence: 0.95

[cite-002] Integration Score (evidence-def456...)
"Integration score increased from 0.63 to 0.78"
Source: Q2Q Outcome Analysis
Confidence: 0.91

[... more citations ...]
```

---

## Editing Generated Reports

### Edit Mode

After generation, you can edit the narrative:

1. Click **"Edit Report"** button
2. Rich text editor opens
3. Edit text as needed
4. Click **"Save Changes"**

### What You Can Edit

**Allowed Edits**:
- ✅ Text content (narrative)
- ✅ Section headings
- ✅ Formatting (bold, italic, bullets)
- ✅ Order of sections (drag and drop)

**Protected Elements**:
- ❌ Citations (cannot remove or modify)
- ❌ Evidence IDs
- ❌ Confidence scores

**Why Citations Are Protected**:
- Ensures auditability
- Prevents fabricated claims
- Maintains compliance integrity

### Rich Text Editing Features

**Formatting Toolbar**:
- **Bold**: `Ctrl/Cmd + B`
- **Italic**: `Ctrl/Cmd + I`
- **Underline**: `Ctrl/Cmd + U`
- **Bullet List**: `Ctrl/Cmd + Shift + 8`
- **Numbered List**: `Ctrl/Cmd + Shift + 7`
- **Headings**: H1, H2, H3 dropdown
- **Alignment**: Left, Center, Right

**Undo/Redo**:
- Undo: `Ctrl/Cmd + Z`
- Redo: `Ctrl/Cmd + Shift + Z`

**Word Count**:
- Live word count displayed in bottom right
- Helps stay within target length

### Validation on Save

When you save edits:
1. System checks all citations still exist
2. Validates no PII added (rare, but checked)
3. Ensures content policy compliance
4. Saves new version

**If Validation Fails**:
- Error message displays
- Specific issues highlighted
- Cannot save until resolved

### Version History

**View Previous Versions**:
1. Click "Version History" icon
2. See list of all saved versions with timestamps
3. Click version to preview
4. Click "Restore" to revert

**Use Case**: Compare edits, revert to earlier version if needed.

---

## Exporting Reports

### Export Formats

#### PDF Export (Most Common)

**Features**:
- Professional watermarked PDF
- Company logo in header/footer
- Page numbers
- Evidence citations as footnotes
- Export metadata (who, when)

**How to Export**:
1. Click **"Export PDF"**
2. Choose template:
   - **Standard**: Logo + page numbers
   - **Confidential**: CONFIDENTIAL watermark + full metadata
   - **Compliance**: Maximum metadata for audits
   - **Public**: No confidential marks, professional
3. Click **"Download"**
4. PDF downloads to browser

**PDF Metadata**:
- Export Date: 2024-11-15 14:30 UTC
- Exported By: Jane Doe (jane@company.com)
- Report ID: report-uuid-123
- Period: Q3 2024
- Company: Acme Corp

**File Name**: `TEEI-Report-Q3-2024-Acme-Corp.pdf`

#### PPTX Export (PowerPoint)

**Features**:
- Presentation template with charts
- Cover slide with company logo
- KPI summary slide
- Chart slides (trend, breakdown, outcomes)
- Evidence summary slide
- Recommendations slide

**How to Export**:
1. Click **"Export PPTX"**
2. Choose template:
   - **Executive**: Concise, high-level
   - **Detailed**: Full analysis with notes
3. Click **"Download"**
4. PPTX downloads to browser

**Use Case**: Board presentations, stakeholder meetings

**Customization**:
- After download, edit in PowerPoint
- All slides are editable
- Maintain citations in speaker notes

#### DOCX Export (Word) - Enterprise Only

**Features**:
- Editable Word document
- Same content as PDF
- Citations as hyperlinks
- Full editing capability

**Use Case**: Further customization, collaboration

#### CSV/JSON Export (Raw Data)

**CSV Export**:
- All metrics in spreadsheet format
- Evidence snippets with metadata
- Use case: Custom analysis in Excel

**JSON Export**:
- Structured data for developers
- API integration
- Use case: Custom reporting tools

### Watermarking Options

**Logo Placement**:
- Header only
- Footer only
- Both header and footer

**Watermark Text**:
- None (default)
- CONFIDENTIAL
- INTERNAL USE ONLY
- DRAFT
- Custom text

**Confidential Mark**:
- Diagonal "CONFIDENTIAL" across pages
- 15% opacity (configurable)
- All pages or first page only

**Example Watermarked Page**:
```
┌────────────────────────────────────┐
│ [Logo] TEEI Report     Page 1 of 8 │ ← Header
├────────────────────────────────────┤
│                                    │
│     C O N F I D E N T I A L        │ ← Diagonal
│                                    │
│  Report content here...            │
│                                    │
├────────────────────────────────────┤
│ Exported: 2024-11-15 | J. Doe     │ ← Footer
└────────────────────────────────────┘
```

---

## Scheduled Report Generation

Automate report generation and delivery.

### Setting Up Scheduled Reports

1. Navigate to **Settings > Scheduled Reports**
2. Click **"New Scheduled Report"**
3. Configure:

**Report Configuration**:
- Template: Quarterly Report
- Filters: All Programs, All Cohorts
- Options: Standard length, Professional tone
- Language: English

**Schedule**:
- Frequency: Monthly (on 1st of month)
- Time: 08:00 UTC
- Period: Rolling last month

**Delivery**:
- Recipients: board@company.com, csr-team@company.com
- Subject: TEEI Monthly Report - {period}
- Format: PDF (Confidential template)
- Body: Custom email message

4. Click **"Save Schedule"**
5. Confirmation email sent to recipients

**Example Email**:
```
From: TEEI Platform <noreply@teei.io>
To: board@company.com
Subject: TEEI Monthly Report - November 2024

Dear Stakeholders,

Your scheduled TEEI CSR report for November 2024 is attached.

Report Highlights:
• SROI: 3.2x (+8% vs. Oct)
• VIS: 82 (+5 points)
• Integration: 0.78 (stable)
• Participants: 1,234 (+12%)

Please review and contact your CSR team with questions.

---
Generated by TEEI Platform on 2024-12-01 08:00 UTC
```

### Managing Scheduled Reports

**Actions**:
- **Edit**: Change schedule, recipients, or options
- **Pause**: Temporarily stop without deleting
- **Resume**: Restart paused schedule
- **Delete**: Permanently remove
- **Test Send**: Send immediately to verify

**View History**:
- See all past scheduled report runs
- Download previous reports
- Check delivery status

---

## Rate Limits & Quotas

### Generation Limits

**Standard Users**:
- 10 reports per hour
- 50 reports per day
- Standard templates only

**Admin/Power Users**:
- 20 reports per hour
- 100 reports per day
- All templates

**Enterprise**:
- Unlimited reports
- All templates
- Priority processing

**If You Hit Limit**:
- Wait for rate limit to reset (shown in countdown)
- Upgrade plan
- Contact support for exceptions

### Token Usage

Each report consumes tokens (LLM API units):

**Typical Usage**:
- Brief: ~1,500 tokens
- Standard: ~3,000 tokens
- Detailed: ~5,000 tokens

**Your Quota** (visible in Settings > Usage):
- Total tokens available
- Tokens used this month
- Estimated reports remaining

---

## Best Practices

### Before Generating

- [ ] Verify data is up-to-date (check last sync time)
- [ ] Ensure sufficient evidence (>10 snippets)
- [ ] Choose appropriate period (not too short/long)
- [ ] Select relevant filters
- [ ] Review previous reports for consistency

### During Generation

- [ ] Don't close browser tab
- [ ] Wait for full completion
- [ ] Check for error messages
- [ ] Review progress indicators

### After Generation

- [ ] Read full report (don't just export)
- [ ] Validate citations (click a few to verify)
- [ ] Check for anomalies or errors
- [ ] Edit for tone/style if needed
- [ ] Preview export before downloading

### For Quality Reports

- [ ] Use "Standard" or "Detailed" length
- [ ] Include charts
- [ ] Professional or Executive tone
- [ ] Review and edit narrative
- [ ] Add executive summary if custom template
- [ ] Watermark appropriately for audience

---

## Troubleshooting

### "Report Generation Failed"

**Error**: "Insufficient data for selected period"

**Solution**:
1. Expand date range (try 3 months instead of 1)
2. Remove restrictive filters
3. Check if data sync is working

**Error**: "Rate limit exceeded"

**Solution**:
1. Wait 10 minutes
2. Check usage quota
3. Contact admin to upgrade plan

**Error**: "LLM service unavailable"

**Solution**:
1. Wait 5 minutes and retry
2. Try different model (Advanced Options)
3. Contact support if persistent

### "Citations Missing or Invalid"

**Symptom**: Report shows "[citation:MISSING]"

**Cause**: Evidence was deleted between generation and viewing

**Solution**:
1. Regenerate report
2. Contact support if issue persists
3. Check evidence retention policy

### "Report Seems Inaccurate"

**Symptom**: Narrative doesn't match your expectations

**Possible Causes**:
1. Filters applied incorrectly
2. Wrong period selected
3. Data quality issue
4. Model hallucination (rare)

**Solutions**:
1. Verify all filters and period settings
2. Check evidence in Evidence Explorer
3. Regenerate with higher confidence threshold
4. Use more conservative temperature (0.2)
5. Report specific inaccuracies to support

---

## FAQ

**Q: Can I use my own report template?**
A: Enterprise plans support custom templates. Contact sales.

**Q: How long are generated reports stored?**
A: 90 days by default. Download important reports for archival.

**Q: Can I translate a report to a different language after generation?**
A: Yes, regenerate with different language option. Translations are automatic.

**Q: Are citations clickable in PDF exports?**
A: Not in PDF (static), but in the platform preview, yes.

**Q: Can I remove citations from a report?**
A: No, citations are required for auditability. You can request a citation-free export via support for internal use only.

**Q: How accurate are the AI-generated insights?**
A: Very accurate when backed by citations (95%+ reliability). Always verify key claims.

**Q: Can I generate reports for multiple companies at once?**
A: No, reports are per-tenant. Multi-tenant reports available in enterprise plans.

---

## Next Steps

Master report generation:

1. ✅ Generate a test report (Brief, last month)
2. ✅ Try editing and re-exporting
3. ✅ Set up a scheduled monthly report
4. ✅ Explore different templates
5. ✅ Watch the Report Generation video (10 min)
6. ✅ Read [Exports & Scheduling Guide](./exports_scheduling.md)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Feedback**: docs-feedback@teei.io
