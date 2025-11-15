# Evidence Explorer Guide

**Target Audience**: Company Users, Compliance Officers, Admins
**Estimated Reading Time**: 12 minutes
**Last Updated**: 2025-11-15

---

## What is Evidence Explorer?

Evidence Explorer provides **full traceability** from high-level KPIs down to the individual evidence snippets that support them. This enables you to:

- Validate that metrics are backed by real data
- Investigate anomalies or spikes in KPIs
- Ensure quality through Q2Q classification confidence
- Demonstrate compliance and auditability
- Find compelling participant stories (anonymized)

---

## Understanding Evidence Lineage

TEEI follows a **three-tier data architecture**:

```
┌─────────────────┐
│   METRICS       │  ← High-level KPIs (SROI, VIS, Integration)
│  (Aggregated)   │
└────────┬────────┘
         │ Aggregated from
         ▼
┌─────────────────┐
│ OUTCOME SCORES  │  ← Q2Q Classification Results
│  (Individual)   │     • Dimension (confidence, belonging, etc.)
└────────┬────────┘     • Score (0.000 - 1.000)
         │ Generated from      • Confidence level
         ▼
┌─────────────────┐
│   EVIDENCE      │  ← Original Text (Redacted)
│   SNIPPETS      │     • Feedback, check-ins, notes
└─────────────────┘     • Source references
```

### Example Lineage Flow

**User Journey**:
1. You see SROI = 3.2x on dashboard
2. Click "View Evidence" → Opens evidence drawer
3. See 50 evidence snippets supporting this metric
4. Each snippet shows:
   - Original text (redacted)
   - Q2Q scores (which dimensions it supports)
   - Provenance (where it came from)
5. You can validate the metric is real and not fabricated

---

## Accessing Evidence Explorer

### Method 1: From KPI Cards (Quickest)

1. Navigate to Dashboard
2. Find any KPI card (SROI, VIS, Integration, etc.)
3. Click **"View Evidence"** button
4. Evidence drawer opens showing snippets for that metric

**Use Case**: Quick validation of a specific KPI

### Method 2: From Generated Reports

1. Open a generated report (Quarterly, Executive, etc.)
2. Find an inline citation (e.g., `[citation:cite-001]`)
3. Click the citation link
4. Evidence drawer opens showing that specific evidence

**Use Case**: Verify a claim in a report

### Method 3: From Main Navigation

1. Click **"Evidence"** in the top navigation
2. Evidence Explorer page loads
3. Select filters (company, period, program)
4. View all evidence for your selections

**Use Case**: Comprehensive evidence review, bulk export

### Method 4: From Quick Search

1. Press `Ctrl/Cmd + K` to open quick search
2. Type your search query (e.g., "confidence evidence")
3. Select an evidence result
4. Evidence detail page opens

**Use Case**: Find specific evidence by keyword

---

## Evidence Drawer Interface

The evidence drawer slides in from the right side of the screen.

### Drawer Sections

```
┌──────────────────────────────────┐
│  Evidence for: SROI (Q3 2024)    │ ← Header
│  [×] Close                        │
├──────────────────────────────────┤
│  Filters: ▼ Dimension ▼ Source   │ ← Filters
├──────────────────────────────────┤
│                                   │
│  ┌────────────────────────────┐  │
│  │ Evidence Snippet 1         │  │
│  │ "I feel more confident..." │  │ ← Snippets
│  │ Q2Q: Confidence 0.85       │  │   (scrollable)
│  │ Source: Buddy Feedback     │  │
│  └────────────────────────────┘  │
│                                   │
│  ┌────────────────────────────┐  │
│  │ Evidence Snippet 2         │  │
│  │ "Belonging improved..."    │  │
│  └────────────────────────────┘  │
│                                   │
├──────────────────────────────────┤
│  ← Previous  |  Page 1 of 5  | Next → │ ← Pagination
├──────────────────────────────────┤
│  [Export CSV] [Export PDF]     │ ← Actions
└──────────────────────────────────┘
```

### Header Section

**Displays**:
- **Metric Name**: Which KPI you're viewing evidence for
- **Period**: Date range (e.g., "Q3 2024" or "November 2024")
- **Evidence Count**: Total snippets (e.g., "42 evidence snippets")
- **Close Button**: X icon to close drawer

### Filter Section

**Available Filters**:

**By Dimension** (Q2Q categories):
- All Dimensions
- Confidence
- Belonging
- Language Level Proxy
- Job Readiness
- Well-being

**By Source Type**:
- All Sources
- Buddy Feedback
- Language Assessments
- Check-in Notes
- Kintell Feedback
- Manual Entries

**By Confidence Level**:
- All Confidence Levels
- Very High (0.90+)
- High (0.70-0.89)
- Moderate (0.50-0.69)
- Low (<0.50)

**By Date Range**:
- Use date picker to narrow within the period
- Example: Within Q3, show only July evidence

**How to Apply Filters**:
1. Click filter dropdown
2. Select option(s)
3. Drawer updates automatically
4. Filter badges appear below filters
5. Click badge X to remove filter

---

## Understanding Evidence Entries

Each evidence snippet displays detailed information:

### 1. Snippet Text (Redacted)

**Example**:
```
"I feel more confident speaking *** in professional settings.
The buddy program helped me connect with [NAME] and I now
have friends at work."
```

**Redaction Applied** (automatic, server-side):

| Original | Redacted |
|----------|----------|
| john.doe@example.com | ***@***.com |
| 555-123-4567 | ***-***-**** |
| John Smith | [NAME] |
| 123 Main Street | *** |
| Norwegian | *** (language) |

**Why Redaction?**
- **GDPR Compliance**: No PII stored or transmitted
- **Privacy Protection**: Participant anonymity preserved
- **Regulatory Requirements**: CSRD, CCPA compliance

**Note**: Redaction happens **before** text reaches your browser. You never see unredacted text.

### 2. Q2Q Scores

**Displays**:
- **Dimension**: Which outcome this evidence supports
- **Score**: Numerical score (0.000 - 1.000)
- **Confidence**: How confident the model is (0.000 - 1.000)

**Example**:
```
┌─────────────────────────────────┐
│ Q2Q Scores                      │
│ Dimension: Confidence           │
│ Score: 0.85 (High)              │
│ Confidence: 0.92 (Very High)    │
└─────────────────────────────────┘
```

**Interpreting Scores**:

**Score Ranges**:
- **0.00-0.29**: Negative outcome (rare, flags need for intervention)
- **0.30-0.49**: Below average
- **0.50-0.69**: Average/Moderate
- **0.70-0.84**: Good
- **0.85-1.00**: Excellent

**Confidence Ranges**:
- **0.90-1.00**: Very High (use with full confidence)
- **0.70-0.89**: High (generally reliable)
- **0.50-0.69**: Moderate (use with caution, may need review)
- **0.00-0.49**: Low (flag for manual review)

**Visual Indicators**:
- Score and confidence are color-coded:
  - 🟢 Green: High/Very High
  - 🟡 Yellow: Moderate
  - 🔴 Red: Low

### 3. Provenance Information

**Displays**:
- **Source Type**: Where this evidence came from
- **Date Collected**: When the evidence was created
- **Classification Method**: How it was scored
- **Model Version**: AI model used (if applicable)
- **Provider**: AI provider (Claude, OpenAI, Gemini)

**Example**:
```
┌─────────────────────────────────┐
│ Provenance                      │
│ Source: Buddy Feedback          │
│ Date: 2024-09-15 14:30 UTC      │
│ Method: AI Classifier           │
│ Model: claude-3-sonnet-20240229 │
│ Provider: Anthropic Claude      │
└─────────────────────────────────┘
```

**Classification Methods**:

**AI Classifier**:
- Most evidence uses AI (GPT-4, Claude)
- Automatic, fast, scalable
- Confidence scores indicate reliability

**Rule-Based**:
- Simple keyword matching
- Used for specific, well-defined categories
- Always high confidence (1.00)

**Manual**:
- Human-reviewed and scored
- Used for edge cases or quality audits
- Confidence = reviewer's assessment

**Why Provenance Matters**:
- **Auditability**: Know exactly where data came from
- **Reproducibility**: Trace back to original source
- **Quality Control**: Identify low-confidence sources
- **Compliance**: Show data lineage for regulators

### 4. Evidence ID

Every snippet has a unique ID (displayed on hover):

**Format**: `evidence-uuid-[random]`

**Example**: `evidence-f47ac10b-58cc-4372-a567-0e02b2c3d479`

**Uses**:
- Reference in reports
- Audit trail
- Evidence linking
- DSAR (Data Subject Access Requests)

---

## Filtering & Searching Evidence

### Filter by Dimension

**Use Case**: "Show me all evidence supporting Confidence outcomes"

**Steps**:
1. Click "Dimension" dropdown
2. Select "Confidence"
3. Evidence list updates to show only confidence-related snippets
4. Badge appears: "Dimension: Confidence [×]"

**Result**: You see evidence like:
- "I feel more confident speaking ***"
- "My self-confidence improved significantly"
- "I'm now confident in my abilities"

### Filter by Source Type

**Use Case**: "Show me only evidence from buddy feedback"

**Steps**:
1. Click "Source Type" dropdown
2. Select "Buddy Feedback"
3. Evidence list updates
4. Badge appears: "Source: Buddy Feedback [×]"

**Result**: You see only feedback from buddy program participants.

### Filter by Confidence Level

**Use Case**: "Show me only high-confidence evidence for a compliance report"

**Steps**:
1. Click "Confidence" dropdown
2. Select "Very High (0.90+)"
3. Evidence list updates
4. Badge appears: "Confidence: Very High [×]"

**Result**: You see only evidence with confidence ≥ 0.90, suitable for regulatory reports.

### Combining Filters

**Use Case**: "Show me high-confidence Belonging evidence from check-ins in July"

**Steps**:
1. Dimension: Belonging
2. Source Type: Check-in Notes
3. Confidence: Very High (0.90+)
4. Date Range: July 1-31, 2024
5. All filters are combined with AND logic

**Result**: Highly targeted evidence list.

### Search Within Evidence

**Feature**: Full-text search across evidence snippets

**How to Use**:
1. Type in the search box (top of evidence list)
2. Search is case-insensitive
3. Matches highlight in yellow
4. Results update as you type

**Example Searches**:
- "confidence" → finds all snippets mentioning confidence
- "job" → finds job-related evidence
- "improved" → finds improvement-related feedback

**Note**: Search respects active filters.

---

## Pagination & Navigation

Evidence is displayed 10 snippets per page.

### Pagination Controls

**Located at**: Bottom of evidence drawer

**Options**:
- **Previous**: Go to previous page
- **Page Number**: Shows current page (e.g., "Page 3 of 7")
- **Next**: Go to next page
- **Jump to Page**: Click page number to type page directly

**Keyboard Shortcuts**:
- `←` (Left Arrow): Previous page
- `→` (Right Arrow): Next page
- `Home`: First page
- `End`: Last page

### Infinite Scroll (Optional)

**Enable in Settings** > Evidence > "Enable Infinite Scroll"

**Behavior**:
- Automatically loads next page when you scroll to bottom
- No manual pagination clicks needed
- More seamless for large evidence sets

---

## Exporting Evidence

### Export Options

**CSV Export**:
- All evidence snippets (respects filters)
- Includes all metadata (scores, provenance)
- Opens in Excel, Google Sheets, etc.
- Use case: Data analysis, custom reporting

**PDF Export**:
- Professional formatted document
- Watermarked with your logo
- Page numbers and export metadata
- Use case: Compliance audits, stakeholder sharing

**JSON Export** (Advanced):
- Raw structured data
- For developers/data scientists
- Use case: Custom analysis, integrations

### How to Export

1. Click **"Export"** button (bottom of drawer)
2. Select format (CSV, PDF, JSON)
3. Choose options:
   - **Include Filters**: Apply current filters or export all
   - **Include Metadata**: Full provenance or minimal
   - **Redaction Level**: Standard (default) or enhanced
4. Click **"Download"**
5. File downloads to your browser's download folder

**File Naming**:
- Format: `evidence-[metric]-[period]-[date].csv`
- Example: `evidence-SROI-2024Q3-20241115.csv`

### Export Limits

**Standard Users**:
- Max 1000 evidence snippets per export
- 10 exports per day

**Admin/Compliance Officers**:
- Max 10,000 evidence snippets per export
- Unlimited exports

**Need More?**: Contact support for bulk export assistance.

---

## Quality Assurance with Evidence Explorer

### Reviewing Evidence Quality

**Steps**:
1. Open Evidence Explorer for a metric
2. Sort by confidence (low to high)
3. Review low-confidence evidence (<0.70)
4. Identify patterns or issues
5. Flag for manual review if needed

**Red Flags**:
- Many snippets with confidence <0.50
- Evidence doesn't match metric name
- Source types seem inconsistent
- Dates outside expected range

**Actions**:
- Contact admin or support
- Request manual review
- Check data ingestion settings

### Validating Metric Accuracy

**Use Case**: "Is our SROI of 3.2x legitimate?"

**Steps**:
1. View evidence for SROI metric
2. Sample 10-20 random snippets
3. Read the redacted text
4. Verify they support positive outcomes
5. Check confidence scores are high (>0.80)
6. Confirm source types are diverse (not all from one program)

**What to Look For**:
- ✅ Diverse evidence sources
- ✅ High confidence scores
- ✅ Text clearly supports claimed outcome
- ✅ Dates align with metric period

**Red Flags**:
- ❌ All evidence from single source
- ❌ Low confidence scores
- ❌ Text doesn't match metric
- ❌ Dates outside metric period

### Investigating Anomalies

**Scenario**: "SROI suddenly jumped from 2.8x to 3.5x. Why?"

**Investigation Steps**:
1. Filter evidence to new period
2. Compare evidence count vs. previous period
3. Check if new programs or cohorts were added
4. Review confidence scores (did quality change?)
5. Look at source distribution
6. Check for data ingestion changes

**Possible Explanations**:
- New high-impact program launched
- Improved participant outcomes
- Better data collection
- Cohort change (e.g., high-performers)
- Data quality improvement

---

## Advanced Features

### Evidence Timeline View

**Access**: Settings > Evidence > "Enable Timeline View"

**Shows**:
- Evidence plotted on a timeline
- Clustered by date
- Hover to see snippet
- Click to view details

**Use Case**: Visualize evidence distribution over time, spot gaps.

### Evidence Heatmap

**Access**: Click "Heatmap" tab in Evidence Explorer

**Shows**:
- Day-by-day evidence collection intensity
- Color-coded (darker = more evidence)
- Hover for count

**Use Case**: Identify data collection patterns, plan interventions.

### Linked Evidence

**Feature**: See all evidence linked to a specific participant or cohort

**Access**:
1. From participant detail page
2. Click "View Evidence"
3. See all evidence from that participant (anonymized)

**Use Case**: Track individual journeys (while maintaining anonymity).

---

## Compliance & Auditing

### GDPR Compliance

**Right to Erasure**:
- Participants can request evidence deletion
- Admin can delete via Settings > GDPR > DSAR Queue
- Deletion cascades (evidence → scores → metrics recalculated)

**Data Retention**:
- Default: 90 days for evidence
- Configurable per tenant
- Automatic cleanup after retention period
- Compliance notices sent before deletion

### Audit Trail

**Every Evidence View is Logged**:
- Who viewed evidence
- When (timestamp)
- Which metric/period
- Which evidence IDs
- Export actions

**Access Logs**:
- Admin: Settings > Audit Logs > Evidence Access
- Compliance Officer: Full access
- Regular Users: Cannot view

**Use Case**: Demonstrate compliance, investigate unauthorized access.

### CSRD Reporting

**Evidence Export for CSRD**:
1. Navigate to Evidence Explorer
2. Filter to reporting period (e.g., 2024 full year)
3. Export as PDF (Compliance template)
4. Includes:
   - Full evidence lineage
   - Q2Q scores with confidence
   - Provenance details
   - Export metadata (who, when)
   - Watermark and page numbers

**CSRD-Ready**: Our evidence system meets CSRD double materiality requirements.

---

## Troubleshooting

### "No Evidence Available"

**Possible Causes**:
1. No data collected for period
2. Filters too restrictive
3. Q2Q processing not complete
4. Metric not yet calculated

**Solutions**:
1. Expand date range
2. Remove filters (click "Reset All")
3. Wait 24-48 hours for Q2Q processing
4. Check with admin on data connections

### "Evidence Doesn't Match Metric"

**Possible Causes**:
1. Wrong metric selected
2. Data quality issue
3. Q2Q classifier error

**Solutions**:
1. Verify you're viewing the correct metric
2. Check confidence scores (low = unreliable)
3. Report to support with evidence IDs

### "Low Confidence Scores"

**Possible Causes**:
1. Ambiguous source text
2. Model uncertainty
3. Edge case not in training data

**Solutions**:
1. Flag for manual review
2. Request human classification
3. Provide feedback to improve model

---

## Best Practices

### Daily Evidence Monitoring

**For Compliance Officers**:
- [ ] Review new evidence daily
- [ ] Check confidence score distribution
- [ ] Flag low-confidence snippets
- [ ] Monitor evidence count trends

### Weekly Evidence Audits

**For Admins**:
- [ ] Sample 20 random evidence snippets
- [ ] Verify redaction is working
- [ ] Check source type distribution
- [ ] Review classification method breakdown

### Monthly Quality Reviews

**For All Users**:
- [ ] Review evidence for key metrics
- [ ] Validate metric accuracy
- [ ] Export evidence for reporting
- [ ] Provide feedback on quality

---

## FAQ

**Q: Can I see un-redacted evidence?**
A: No. PII is redacted server-side for privacy and compliance. No user ever sees un-redacted text.

**Q: How is confidence calculated?**
A: AI models (GPT-4, Claude) output confidence scores indicating how certain they are about classifications.

**Q: Can I manually override a Q2Q score?**
A: Yes, admins can request manual reclassification via Settings > Evidence > Manual Review Queue.

**Q: How long is evidence stored?**
A: Default 90 days. Configurable per tenant. Check Settings > Data Retention.

**Q: Can I link evidence to specific participants?**
A: Evidence is anonymized. You cannot identify individuals, only cohort-level patterns.

**Q: What if I find PII that wasn't redacted?**
A: Report immediately to support@teei.io with evidence ID. This is a critical security issue.

---

## Next Steps

Now that you understand Evidence Explorer:

1. ✅ Practice filtering evidence by dimension
2. ✅ Export evidence to CSV for analysis
3. ✅ Read [Report Generation Guide](./report_generation.md) to see how evidence appears in reports
4. ✅ Watch the Evidence Lineage video (8 min)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Feedback**: docs-feedback@teei.io
