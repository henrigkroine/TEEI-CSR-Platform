# Executive Packs - User Guide

## Overview

Executive Packs provide professional, board-ready exports of your impact reports in PDF and PowerPoint formats. These exports include watermarking, ID stamping, signature blocks, and customizable narrative controls to tailor reports for different audiences.

## Features

### 1. Export Formats

**PDF Export**
- Watermarked documents with company branding
- ID stamping on every page (Report ID, timestamp, page numbers)
- Evidence hash verification
- Approver signature blocks (for approved reports)
- Confidentiality notices
- Professional typography and layout
- Citation count badges on cover page

**PowerPoint Export (Boardroom v2 Deck Composer)**
- Executive presentation decks with automated slide generation
- Cover slide with company logo and period
- At-a-Glance metrics slide with KPI summary
- Key achievements slide with evidence badges
- KPI slides with chart visualizations (SROI, VIS, trends)
- Evidence reference slide with citation lineage
- Closing slide with disclaimers and verification links
- Supports 4 report templates (Quarterly, Annual, Investor Update, Impact Deep Dive)

**Bundle Export**
- Download both PDF and PPTX in a single request
- Consistent branding across formats
- Synchronized citation counts across documents

### 2. Report Templates

Executive Packs supports four AI-generated report templates with varying citation requirements:

#### Quarterly Report (`quarterly-report.en.hbs`)
- **Purpose**: Regular progress updates for stakeholders
- **Length**: 1,000-1,500 words (Standard)
- **Citation Requirements**:
  - Minimum 1 citation per paragraph
  - Citation density: 0.5 per 100 words
  - Estimated citations: 5-8 per report
- **Token Budget**: 2,000 tokens output
- **Sections**: Executive Summary, Key Metrics (SROI, VIS), Highlights, Next Quarter Goals
- **Locales**: EN, ES, FR, UK, NO

#### Annual Report (`annual-report.en.hbs`)
- **Purpose**: Comprehensive year-end reporting with CSRD alignment
- **Length**: 2,500-3,500 words (Detailed)
- **Citation Requirements**:
  - Minimum 2 citations per paragraph (higher standard)
  - Citation density: 0.8 per 100 words
  - Estimated citations: 20-28 per report
- **Token Budget**: 5,000 tokens output
- **Sections**: Year in Review, CSRD Narratives, Financial Impact, Social Value, Evidence Appendix
- **Locales**: EN, ES, FR, UK, NO

#### Investor Update (`investor-update.en.hbs`)
- **Purpose**: Impact metrics for investors and funders
- **Length**: 800-1,200 words (Brief to Standard)
- **Citation Requirements**:
  - Minimum 1 citation per paragraph
  - Citation density: 0.6 per 100 words (higher than quarterly)
  - Estimated citations: 5-7 per report
- **Token Budget**: 1,500 tokens output
- **Sections**: SROI Highlights, Beneficiary Outcomes, Evidence-Backed Achievements
- **Locales**: EN, ES, FR, UK, NO

#### Impact Deep Dive (`impact-deep-dive.en.hbs`)
- **Purpose**: Detailed analysis for auditors and researchers
- **Length**: 3,500+ words (Very Detailed)
- **Citation Requirements**:
  - Minimum 2 citations per paragraph (highest standard)
  - Citation density: 1.0 per 100 words (maximum rigor)
  - Estimated citations: 35+ per report
- **Token Budget**: 6,000 tokens output
- **Sections**: Methodology, Evidence Lineage, Dimension Analysis, Statistical Validation, Full Evidence Appendix
- **Locales**: EN, ES, FR, UK, NO

### 3. Narrative Controls

Customize the tone, length, and focus of your reports:

**Tone Options**
- **Formal**: Professional, executive-level language suitable for board presentations
- **Conversational**: Approachable, engaging narrative for stakeholder communications
- **Technical**: Data-driven, methodology-focused content for analysts

**Length Options**
- **Brief** (1-2 pages): Executive summary only, 300-500 words
- **Standard** (3-5 pages): Balanced overview with key details, 1,000-1,500 words
- **Detailed** (6+ pages): Comprehensive analysis with evidence, 2,500+ words

**Audience Options**
- **Board of Directors**: Strategic focus, high-level metrics, ROI emphasis
- **Management Team**: Operational details, KPIs, actionable recommendations
- **Public/Stakeholders**: Impact stories, community outcomes, transparency

### 4. Watermarking & Security

**Watermark Features**
- Company name and reporting period
- Evidence set hash (SHA-256) for verification
- Customizable watermark text
- Position options: header, footer, diagonal, corner
- Adjustable opacity and color

**ID Stamping**
- Report ID in format: `RPT-{company}-{period}-{timestamp}`
- Generation timestamp (ISO 8601 UTC)
- Page numbers (e.g., "Page 3 of 12")
- Evidence hash for integrity verification
- Verification URL: `teei-platform.com/verify/{reportId}`

**Signature Blocks** (Approved Reports Only)
- Approver name and title
- Approval date
- Digital signature (HMAC-SHA256)
- Invalidation notice for modifications

**Confidentiality Notices**
- Optional confidentiality footer
- Legal disclaimer about proprietary information
- Distribution restrictions

### 5. Evidence Appendix

Optionally include a complete evidence trail:
- Full list of evidence IDs with descriptions
- Evidence lineage and provenance
- Clickable links to evidence verification
- Adds approximately 10-15 pages to the report

## Boardroom v2 Deck Composer

### Overview

The Boardroom v2 Deck Composer is an automated PowerPoint generation engine that creates executive presentation decks from report data. It uses template-based slide generation with dynamic chart rendering and evidence integration.

### Architecture

```
services/reporting/src/utils/pptxGenerator.ts
├── createPresentation()         # Main entry point
├── addCoverSlide()               # Title slide with branding
├── addAtAGlanceSlide()           # KPI summary table
├── addKeyAchievementsSlide()     # Bullet points + evidence badges
├── addKPISlides()                # Chart slides (SROI, VIS, trends)
├── addEvidenceReferencesSlide()  # Citation list with lineage
└── addClosingSlide()             # Disclaimers + verification
```

### Template Selection

Deck composer automatically selects template based on report type:

```typescript
const templateMap = {
  'quarterly-report': 'quarterly_deck_template.pptx',
  'annual-report': 'annual_deck_template.pptx',
  'investor-update': 'investor_deck_template.pptx',
  'impact-deep-dive': 'impact_deep_dive_deck_template.pptx'
};
```

### Slide Generation

**Cover Slide**:
- Company logo (auto-scaled to 200x60px)
- Report title and period
- Generation date
- Citation count badge

**At-a-Glance Slide**:
- KPI summary table (SROI, VIS, participants, volunteers, hours, value)
- Color-coded metrics (green for positive, yellow for neutral)
- Evidence count indicator

**Key Achievements Slide**:
- Top 5 achievements (bullet points)
- Evidence badges with citation IDs
- Confidence score indicators

**KPI Slides** (3 slides):
- SROI Analysis: Bar chart with year-over-year comparison
- VIS Breakdown: Pie chart by dimension
- Trend Analysis: Line chart showing growth

**Evidence References Slide**:
- Table of all citations with IDs, sources, timestamps
- Clickable links to Evidence Explorer (if online)
- Hash verification instructions

**Closing Slide**:
- Methodology summary
- Verification URL: `teei-platform.com/verify/{reportId}`
- Contact information
- Legal disclaimers

### Export Workflow

```typescript
// 1. Generate report with AI
const report = await generateReport(companyId, period, template);

// 2. Validate citations (Evidence Gates)
const validation = validateCitations(report.content, report.evidence);
if (!validation.valid) {
  throw new EvidenceGateViolation(validation.errors);
}

// 3. Create PDF with watermarks
const pdf = await generatePDF(report, {
  watermark: true,
  includeSignature: true,
  includeEvidenceAppendix: false
});

// 4. Create PowerPoint deck
const pptx = await createPresentation(report, {
  template: report.template,
  includeCharts: true,
  includeEvidence: true
});

// 5. Return both formats
return {
  pdfUrl: uploadToS3(pdf),
  pptxUrl: uploadToS3(pptx),
  citationCount: validation.citationCount
};
```

### Citation Count Requirements by Template

| Template | Min Citations/Para | Density (per 100 words) | Estimated Total |
|----------|-------------------|-------------------------|-----------------|
| Quarterly Report | 1 | 0.5 | 5-8 |
| Annual Report | 2 | 0.8 | 20-28 |
| Investor Update | 1 | 0.6 | 5-7 |
| Impact Deep Dive | 2 | 1.0 | 35+ |

### Performance Targets

- PDF generation: <2.0s (p95)
- PPTX generation: <3.0s (p95)
- Chart rendering: <500ms per chart
- Total export time: <5.0s for bundle

## How to Generate an Executive Pack

### Step 1: Access the Export Function

1. Navigate to your company dashboard in the Corporate Cockpit
2. Open an existing report or generate a new one
3. Click the "Export Executive Pack" button in the report actions menu

### Step 2: Select Export Format

Choose your desired format:
- **PDF**: Watermarked document (recommended for formal distribution)
- **PowerPoint**: Executive presentation deck
- **Both**: Download both formats

### Step 3: Configure Narrative Settings

**Set the Tone**
- Select how the narrative should be written
- Preview example text for each tone option

**Choose the Length**
- Determine how much detail to include
- See estimated page count and word count

**Define the Audience**
- Tailor content for your specific readers
- Focus areas adjust based on audience selection

### Step 4: Configure Watermark & Security

**Enable Watermarking**
- Toggle watermarking on/off
- Enter custom watermark text (optional)
- Default: `{CompanyID} - {Period}`

**Signature Block** (if report is approved)
- Include approver signature block
- Digital signature for verification

**Confidentiality Notice**
- Add confidentiality footer
- Legal protection for proprietary information

### Step 5: Additional Options

**Evidence Appendix**
- Include full evidence trail
- Adds clickable evidence IDs
- Approximately 10-15 additional pages

### Step 6: Generate and Download

1. Click "Generate Export"
2. Monitor progress (typical generation time: 30-60 seconds)
3. Download files when ready:
   - PDF: `Executive_Report_{Period}_{Company}.pdf`
   - PPTX: `Executive_Deck_{Period}_{Company}.pptx`

## Branding Guidelines

### Logo Requirements

**Supported Formats**: PNG, JPG, SVG
**Recommended Size**: 200x60 pixels
**Maximum File Size**: 500 KB
**Background**: Transparent preferred

### Color Scheme

**Primary Color**: Used for headers, charts, accents
**Secondary Color**: Used for supporting elements
**Text Colors**: Dark gray (#111827) for body, lighter grays for metadata

Configure colors in: Settings > Company Profile > Branding

### Typography

**Headings**: System font stack (San Francisco, Segoe UI, Roboto)
**Body Text**: 11pt, line height 1.6
**Monospace**: Courier New for IDs and hashes

## Sample Output

### PDF Structure

```
Cover Page
├── Company Logo
├── Report Title
├── Reporting Period
└── Generation Date

Executive Summary (1-5 pages)
├── Narrative (customized by tone/length/audience)
├── Key Highlights
└── At-a-Glance Metrics

Key Metrics (1-2 pages)
├── SROI Table
├── VIS Breakdown
├── Participation Metrics
└── Social Value Created

Key Achievements (1 page)
├── Bullet-point highlights
└── Supporting evidence references

[Optional] Evidence Appendix (10-15 pages)
├── Evidence List with IDs
├── Lineage Diagrams
└── Verification Links

Signature Block (if approved)
├── Approver Name & Title
├── Approval Date
└── Digital Signature

Footer on Every Page
├── Report ID
├── Generation Timestamp
├── Page Number
└── Evidence Hash
```

### PowerPoint Structure

```
Slide 1: Cover
├── Company Logo
├── Report Title
├── Reporting Period
└── Date

Slide 2: At-a-Glance
├── Key Metrics Table
└── SROI, Beneficiaries, Hours, Value

Slide 3: Key Achievements
├── Bullet-point highlights
└── Evidence icons

Slide 4-6: KPI Slides
├── SROI Analysis (chart)
├── VIS Breakdown (chart)
└── Trend Analysis (chart)

Slide 7: Evidence References
├── Clickable evidence IDs
└── Verification links

Slide 8: Looking Forward
├── Closing remarks
├── Methodology note
└── Contact information
```

## API Integration

### Generate Export

```bash
POST /exports/presentations
Content-Type: application/json

{
  "format": "pdf" | "pptx" | "both",
  "companyId": "string",
  "reportId": "string (optional)",
  "period": "string",
  "narrative": {
    "tone": "formal" | "conversational" | "technical",
    "length": "brief" | "standard" | "detailed",
    "audience": "board" | "management" | "public"
  },
  "watermark": {
    "enabled": true,
    "text": "Custom watermark text",
    "includeSignature": true,
    "includeConfidentiality": true
  },
  "includeEvidenceAppendix": false
}
```

**Response (202 Accepted)**
```json
{
  "exportId": "RPT-COMPANY-2025Q4-abc123",
  "message": "Export generation started",
  "statusUrl": "/exports/RPT-COMPANY-2025Q4-abc123/status"
}
```

### Check Status

```bash
GET /exports/{exportId}/status
```

**Response (200 OK)**
```json
{
  "exportId": "RPT-COMPANY-2025Q4-abc123",
  "status": "completed",
  "progress": 100,
  "message": "Export completed",
  "pdfUrl": "/exports/.../report.pdf",
  "pptxUrl": "/exports/.../presentation.pptx",
  "completedAt": "2025-11-14T14:30:00Z"
}
```

### Download Export

```bash
GET /exports/{exportId}/download?format=pdf
```

**Response**: Redirects to download URL or streams file

## Verification

### Verify Report Integrity

1. Locate the Evidence Hash in the PDF footer
2. Visit: `https://teei-platform.com/verify/{reportId}`
3. Enter the Evidence Hash
4. System verifies:
   - Report ID matches
   - Evidence set hash matches
   - Report has not been tampered with

### Verify Digital Signature (Approved Reports)

1. Extract digital signature from PDF
2. Use verification API:

```bash
POST /verify/signature
Content-Type: application/json

{
  "reportId": "RPT-COMPANY-2025Q4-abc123",
  "signature": "hex-encoded-signature",
  "approverEmail": "approver@company.com",
  "approvedAt": "2025-11-14T10:00:00Z"
}
```

**Response**
```json
{
  "valid": true,
  "message": "Signature verified successfully"
}
```

## Troubleshooting

### Export Taking Too Long

**Symptoms**: Export stuck at < 50% for > 2 minutes
**Causes**:
- Large evidence appendix
- Complex charts rendering
- Server load

**Solutions**:
- Reduce report length to "Brief"
- Disable evidence appendix
- Try again during off-peak hours

### PDF Watermark Not Visible

**Symptoms**: Watermark not appearing in generated PDF
**Causes**:
- Watermarking disabled
- Opacity set too low
- Color matches background

**Solutions**:
- Ensure "Enable Watermarking" is checked
- Increase opacity to 0.3-0.5
- Use contrasting color (e.g., #666666)

### PowerPoint Slides Blank

**Symptoms**: PPTX has slides but no content
**Causes**:
- Missing data for the period
- Template rendering issue

**Solutions**:
- Verify data exists for the selected period
- Try PDF format first
- Contact support if issue persists

### Signature Block Missing

**Symptoms**: Approved report has no signature block
**Causes**:
- Report not approved
- "Include Signature" disabled

**Solutions**:
- Verify report status is "Approved"
- Enable "Approver Signature Block" in export options

## Best Practices

### For Board Presentations

- **Format**: PowerPoint
- **Tone**: Formal
- **Length**: Brief or Standard
- **Audience**: Board
- **Include**: Signature block, confidentiality notice
- **Exclude**: Evidence appendix (unless requested)

### For Regulatory Compliance

- **Format**: PDF
- **Tone**: Technical
- **Length**: Detailed
- **Audience**: Management
- **Include**: Watermarking, evidence appendix, signature block
- **Enable**: All security features

### For Public Reporting

- **Format**: PDF
- **Tone**: Conversational
- **Length**: Standard
- **Audience**: Public
- **Include**: Key achievements, impact stories
- **Exclude**: Confidentiality notice

## FAQs

**Q: Can I customize the template design?**
A: Template customization is available through Settings > Company Profile > Branding. You can upload a logo and set primary/secondary colors.

**Q: How long are exports stored?**
A: Exports are stored for 30 days. After 30 days, you can regenerate the export from the original report.

**Q: Can I schedule automatic exports?**
A: Yes, scheduled exports are available in Settings > Scheduled Reports. Configure frequency, format, and delivery options.

**Q: What if I need to modify an approved report?**
A: Approved reports are locked. To make changes, create a new draft version. The original approval and signature will not transfer to the new version.

**Q: Can I white-label the exports?**
A: Yes, enterprise plans include white-labeling. Contact support to remove "TEEI CSR Platform" branding.

**Q: Are exports accessible/WCAG compliant?**
A: PDFs generated meet WCAG 2.2 AA standards with proper heading structure, alt text for images, and semantic markup. PowerPoint decks include speaker notes and descriptive slide titles.

## Support

For assistance with Executive Packs:
- Email: support@teei-platform.com
- Documentation: docs.teei-platform.com/cockpit/executive-packs
- Video Tutorials: teei-platform.com/learn/executive-packs

---

*Last Updated: November 2025*
*Version: 1.1.0*
