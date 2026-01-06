# Corporate Cockpit: Executive Walkthrough

**Version**: 1.0
**Date**: 2025-11-14
**Audience**: C-Suite Executives (CEO, CFO, COO, Chief Impact Officer)
**Duration**: 20-30 minutes

---

## Overview: What is the Corporate Cockpit?

The Corporate Cockpit is your organization's command center for Corporate Social Responsibility (CSR) and impact measurement. It transforms raw volunteer engagement data, donations, and sustainability initiatives into actionable insights that drive strategic decisions.

**Key Value Propositions:**
- **Real-time visibility** into CSR program performance
- **Evidence-based reporting** with full audit trails
- **AI-powered insights** that uncover hidden value
- **Executive-ready outputs** in minutes, not days
- **Industry benchmarking** to validate your impact

---

## 1. Dashboard Tour: Key Metrics at a Glance

**URL**: `/dashboard`

### What You'll See:
- **SROI (Social Return on Investment)**: For every $1 invested in CSR, how much social value is created?
  - *Example*: SROI of 4.2:1 means $4.20 of social value per $1 spent
  - *Business Impact*: Demonstrates ROI to board and stakeholders

- **VIS (Volunteer Impact Score)**: Composite score measuring engagement quality, not just hours
  - *Range*: 0-100 (weighted by skill level, cause alignment, outcomes)
  - *Business Impact*: Identifies high-performing programs for replication

- **Participation Rate**: Percentage of employees actively engaged in CSR
  - *Benchmark*: Top performers see 60%+ participation
  - *Business Impact*: Correlates with retention, culture, and employer brand

### Demo Steps:
1. Point out the real-time nature (SSE updates every 5 seconds)
2. Hover over a metric to see evidence summary
3. Click "Drill Down" to explore underlying data
4. Note the trend arrows (↑ 12% vs. last quarter)

### Talking Points:
- "These metrics update in real-time as employees log volunteer hours."
- "The SROI calculation is based on industry-standard frameworks (SROI Network)."
- "We can benchmark these against peer companies in your industry."

---

## 2. Evidence Explorer: "Why This Metric?"

**URL**: `/evidence`

### What You'll See:
A searchable repository of every data point that feeds into your metrics, with full provenance.

### Demo Steps:
1. Search for "volunteer hours Q4 2024"
2. Select an evidence item (e.g., "Team fundraiser for disaster relief")
3. View:
   - **Source**: Where the data came from (Benevity, manual entry, etc.)
   - **Validation**: Who approved it and when
   - **Usage**: Which reports and metrics reference this evidence
   - **Lineage**: The transformation chain from raw data to final metric

### Talking Points:
- "Every number in our reports traces back to a specific, verifiable source."
- "This is critical for audits, ESG disclosures, and stakeholder trust."
- "If a board member asks 'How did we calculate this?', we can show them in 30 seconds."

---

## 3. Generative Reports: AI-Powered Narratives

**URL**: `/reports/generate`

### What You'll See:
An AI assistant that drafts executive summaries, ESG disclosures, and impact stories.

### Demo Steps:
1. Click "Create New Report"
2. Select report type (e.g., "Quarterly Impact Summary")
3. Choose narrative tone:
   - **Professional**: Board-ready, formal language
   - **Inspirational**: Stakeholder-facing, storytelling focus
   - **Technical**: Detailed methodology for auditors
4. Set length: Brief (2-3 pages), Standard (5-7 pages), Detailed (10+ pages)
5. Click "Generate"
6. Watch as the AI drafts an introduction, summarizes metrics, and suggests visualizations
7. Edit inline if needed (keeps AI suggestions in sidebar)
8. Export as PDF or PPTX

### Talking Points:
- "The AI reads your data and writes like a seasoned impact analyst."
- "It cites evidence inline, so every claim is backed by data."
- "A report that used to take 8 hours now takes 20 minutes—and it's more accurate."
- "The AI suggests which charts to include based on what will resonate with your audience."

---

## 4. Approvals & Audit: Compliance Workflow

**URL**: `/reports/approvals`

### What You'll See:
A structured approval process for reports destined for external stakeholders or regulatory filings.

### Demo Steps:
1. View a draft report in "Review" status
2. As an approver, click "Review Report"
3. See:
   - **Metric validation**: Green checkmarks for verified data
   - **Evidence completeness**: % of claims with supporting evidence
   - **Compliance tags**: GDPR-compliant, GRI-aligned, etc.
4. Add approval notes: "Approved for Q4 board deck"
5. Click "Approve & Lock"
6. Report transitions to "Locked" status
7. A tamper-evident watermark appears on all pages
8. Version history tracks every change, approval, and export

### Talking Points:
- "Locking a report makes it immutable—no one can edit it post-approval."
- "The watermark includes a cryptographic hash. If someone modifies a single character, the hash breaks."
- "This meets SOC 2 and ISO 27001 requirements for data integrity."
- "Audit mode (demonstrated next) lets external auditors inspect without fear of accidental changes."

---

## 5. Audit Mode: Forensic Transparency

**URL**: `/dashboard` (toggle Audit Mode in top-right)

### What You'll See:
The UI becomes read-only. Hovering over any metric reveals evidence IDs and lineage chains.

### Demo Steps:
1. Enable Audit Mode via toggle
2. Notice all edit buttons are disabled (grayed out)
3. Hover over SROI metric:
   - Evidence ID appears: `EV-A3F8B92C`
   - Click to open lineage drawer
4. In the lineage drawer, see:
   - **Source**: "Benevity export, 2024-12-01"
   - **Transformations**: 3 steps (aggregation → normalization → SROI calculation)
   - **Confidence**: 95% (high data quality)
5. Click a transformation to see the formula
6. Click "Export Lineage as PDF" for auditor records
7. Disable Audit Mode to resume normal operations

### Talking Points:
- "This is invaluable during ESG audits or due diligence."
- "Auditors can trace every metric to its origin without needing admin training."
- "The session log captures what the auditor viewed—no 'he said, she said' later."

---

## 6. Executive Packs: Export to PDF/PPTX

**URL**: `/reports/{id}/export`

### What You'll See:
A polished export wizard that generates board-ready decks and one-pagers.

### Demo Steps:
1. Open an approved report
2. Click "Export"
3. Select format:
   - **PDF**: Formatted for printing, includes watermark
   - **PPTX**: Editable slides for embedding in board decks
4. Customize:
   - **Branding**: Company logo, color scheme (auto-detects theme)
   - **Sections**: Choose which sections to include (executive summary, metrics, evidence, appendix)
   - **Narrative tone**: Professional / Inspirational / Technical
5. Click "Generate Executive Pack"
6. Watch progress: Analyzing metrics → Generating narrative → Creating slides → Finalizing
7. Download appears (e.g., `Q4_2024_Impact_Report.pptx`)

### Key Features:
- **Watermarking**: Every page shows company name, period, and tamper-evident hash
- **Signature block**: On approved reports, shows approver name and digital signature
- **Whitelabel**: Partners can export with client branding (no platform logos)

### Talking Points:
- "The PPTX has speaker notes pre-filled with key talking points."
- "Charts are native PowerPoint objects, so you can edit them if needed."
- "The PDF is print-ready and includes a QR code linking to the interactive dashboard."

---

## 7. Benchmarks: Compare to Industry Peers

**URL**: `/benchmarks`

### What You'll See:
Interactive charts comparing your CSR metrics to anonymized peer cohorts.

### Demo Steps:
1. View the cohort comparator chart:
   - Your company (highlighted in blue)
   - Industry median (dashed line)
   - Top quartile range (shaded area)
2. Select cohort filters:
   - **Industry**: Technology, Finance, Healthcare, etc.
   - **Company size**: 1,000-5,000 employees
   - **Region**: North America
3. Switch metrics to see how you rank on:
   - SROI
   - VIS
   - Participation rate
   - Donation match ratio
4. View percentile ranking: "You're in the 68th percentile for VIS"
5. Read AI-generated insights: "Companies with VIS > 75 see 23% higher retention"

### Talking Points:
- "Benchmarking answers the question: Are we doing enough?"
- "You can filter to apples-to-apples comparisons—no skewed data from companies 10x your size."
- "The insights flag where you're ahead (to leverage in employer branding) and where to improve."
- "Data is anonymized and aggregated—no one sees your raw numbers except you."

---

## 8. Governance: Consent, DSAR, and Audit Logs

**URL**: `/governance`

### What You'll See:
Compliance tools for GDPR, CCPA, and SOC 2 requirements.

### Demo Steps:
1. **Consent Management**:
   - View consent status table (granted, pending, revoked)
   - See which employees have opted into data sharing
   - Bulk export consent receipts for regulators
2. **DSAR Queue** (Data Subject Access Requests):
   - View pending requests (e.g., "John Doe requests data deletion")
   - Assign to compliance officer
   - Fulfill request with one click (auto-exports user data)
   - Track fulfillment timeline (must complete within 30 days per GDPR)
3. **Retention Notices**:
   - View data slated for deletion per retention policies
   - Approve or extend retention for active investigations
4. **Export Audit Log**:
   - Every data export is logged: who, what, when, where
   - Filter by user, date, or data type
   - Export log for SOC 2 audits

### Talking Points:
- "This isn't just a nice-to-have—it's required by GDPR, CCPA, and most data privacy laws."
- "The DSAR queue automates a process that used to take legal teams weeks."
- "The audit log shows we take data stewardship seriously—critical for enterprise sales and partnerships."

---

## 9. SSO & SCIM: Enterprise Identity

**URL**: `/admin/settings/sso`

### What You'll See:
Single Sign-On (SSO) and SCIM provisioning for seamless user management.

### Demo Steps:
1. **SSO Configuration**:
   - View SAML metadata (Entity ID, ACS URL)
   - Copy metadata for pasting into Okta/Azure AD
   - Test SSO connection with one click
2. **SCIM Role Mapping**:
   - Map IdP groups to platform roles:
     - "Engineering" group → Admin role
     - "Marketing" group → User role
   - Test sync to verify users auto-provision
3. **Token Management**:
   - View bearer token (masked)
   - Regenerate if compromised

### Talking Points:
- "SSO means employees use their existing corporate credentials—no new passwords."
- "SCIM auto-provisions users when they join and deactivates them when they leave."
- "This reduces IT overhead and improves security (no orphaned accounts)."
- "We support SAML 2.0 and OpenID Connect—compatible with all major IdPs."

---

## 10. PWA & Boardroom Mode: Offline and Presentation

**URL**: `/dashboard` (install PWA, then go offline)

### What You'll See:
The dashboard works offline, perfect for boardrooms with spotty Wi-Fi or airplane presentations.

### Demo Steps:
1. **Install PWA**:
   - Click browser's "Install" button
   - App icon appears on desktop/home screen
   - Opens in standalone window (no browser chrome)
2. **Download for Offline**:
   - Click "Download for Offline" in PWA settings
   - Progress bar shows caching (dashboard, reports, charts)
3. **Go Offline**:
   - Disable Wi-Fi or airplane mode
   - Open dashboard—it loads instantly
   - Banner appears: "You are offline. Showing cached data."
   - Metrics still visible, charts still interactive
4. **Reconnect**:
   - Re-enable Wi-Fi
   - Banner disappears
   - SSE reconnects with Last-Event-ID (no duplicate events)
   - Dashboard updates with latest data

### Talking Points:
- "No more scrambling for Wi-Fi passwords in the boardroom."
- "The PWA uses ~50MB of cache—won't fill up your device."
- "When you reconnect, it seamlessly syncs without duplicating data."
- "This is built on web standards—no app store approval needed."

---

## 11. Q&A: Common Executive Questions

### Q: "How do we know the SROI calculation is accurate?"
**A**: The SROI formula is based on the SROI Network's Principles of Good Practice. We use industry-standard conversion factors (e.g., volunteer hour valued at $31.80 per IRS guidelines). Every calculation can be audited in Evidence Explorer.

### Q: "Can we customize metrics for our industry?"
**A**: Yes. In Settings > Metrics, you can define custom KPIs, set targets, and choose which metrics appear on the dashboard.

### Q: "What if our data is in multiple systems (Benevity, Workday, custom spreadsheets)?"
**A**: The platform has pre-built connectors for Benevity, Goodera, Workday, and Impact-In. For custom sources, we provide API endpoints and CSV import templates.

### Q: "How does this compare to hiring a consulting firm for impact reports?"
**A**: A firm might charge $50,000 and take 8 weeks for a single report. This platform generates equivalent reports in minutes, on-demand. The ROI typically pays for itself within 2 quarters.

### Q: "Is our data secure?"
**A**: Yes. We're SOC 2 Type II certified, GDPR-compliant, and use bank-grade encryption (TLS 1.3 in transit, AES-256 at rest). Data residency options available for EU customers.

### Q: "Can we white-label this for our partners?"
**A**: Absolutely. The Partner Portal allows you to create branded exports with your logo, colors, and domain. Perfect for consulting firms and multi-brand enterprises.

### Q: "What's the implementation timeline?"
**A**: Pilot deployment: 2 weeks. Full rollout: 4-6 weeks (includes data migration, user training, and SSO setup).

---

## Demo Data Setup Instructions

To run this demo, ensure the following demo data is seeded:

1. **Users**:
   - `executive@example.com` / `password123` (Executive role)
   - `admin@example.com` / `admin123` (Admin role)
   - `auditor@example.com` / `password123` (Auditor role)

2. **Reports**:
   - Draft report: "Q4 2024 Impact Report"
   - Approved/locked report: "Annual 2024 Impact Report"

3. **Evidence**:
   - At least 10 evidence items with sources (Benevity, manual, etc.)
   - Include lineage chains (3-4 transformations per evidence)

4. **Benchmarks**:
   - Populate peer cohorts (Technology, 1000-5000 employees, North America)
   - Seed metrics: SROI (3.5-5.2 range), VIS (60-85 range), Participation (40-70%)

5. **Governance**:
   - 5 consent records (3 granted, 1 pending, 1 revoked)
   - 2 DSAR requests (1 pending, 1 fulfilled)
   - 3 retention notices (2 active, 1 expired)
   - 20 audit log entries (mix of exports, accesses, deletions)

6. **SSO/SCIM**:
   - Pre-configure SAML metadata (can be dummy values)
   - Create 2 role mappings (Engineering→Admin, Marketing→User)

7. **PWA**:
   - Ensure service worker registered
   - Cache dashboard API responses

---

## Additional Resources

- **User Guide**: `/docs/cockpit/user-guide.md`
- **Technical Documentation**: `/docs/cockpit/technical-specs.md`
- **Video Tutorials**: `https://platform.example.com/tutorials`
- **Support**: `support@example.com` | 1-800-CSR-HELP

---

**End of Walkthrough**

*This demo script is designed to be delivered by a Solutions Engineer or sales representative. Adjust talking points based on the executive's priorities (CFO = ROI, CIO = security, Chief Impact Officer = metrics).*
