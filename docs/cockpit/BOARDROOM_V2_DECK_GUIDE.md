# Boardroom Mode v2 - Deck Generator & PPTX Export

**Version**: 2.0.0
**Last Updated**: 2025-11-17
**Owner**: Worker 2 - Boardroom & Deck Team

---

## Overview

Boardroom Mode v2 extends the existing Boardroom Live presentation mode with a powerful deck generator and branded PPTX export system. Create executive-ready presentation decks with citations, evidence lineage, and multi-locale support.

## What's New in v2

### Deck Generator
- **Pre-built Templates**: Quarterly, Annual, Investor Update, Impact Deep Dive
- **Tile Picker**: Customize slides for your presentation
- **Multi-locale Support**: EN, ES, FR, NO, UK, HE, AR
- **RTL Layout**: Automatic right-to-left layout for Hebrew and Arabic
- **Theme Configuration**: Brand colors and logos

### PPTX Export
- **Server-side Rendering**: PptxGenJS for reliable PPTX generation
- **Branded Themes**: Tenant colors and logos automatically applied
- **Watermarking**: DRAFT, PENDING APPROVAL, CONFIDENTIAL
- **Evidence Lineage**: Full citation trails in slide notes
- **Chart Embedding**: Server-side chart rendering via Chart.js
- **Performance SLA**: p95 ≤ 10 seconds

### Citations & Evidence
- **Per-paragraph Citation Counts**: Visual badges showing evidence backing
- **Explainer Panels**: "Why this section?" context for each slide
- **Evidence ID Tooltips**: Hover to see evidence IDs
- **Full Lineage**: Complete audit trail in PPTX notes

---

## Quick Start

### 1. Create a Deck

```tsx
import { DeckComposer } from '@/components/deck/DeckComposer';

<DeckComposer
  companyId="550e8400-e29b-41d4-a716-446655440000"
  period={{ start: "2024-10-01", end: "2024-12-31" }}
  onDeckCreated={(deck) => navigate(`/deck/${deck.id}`)}
/>
```

### 2. Select Template

Choose from 4 pre-built templates:

| Template | Slides | Use Case |
|----------|--------|----------|
| **Quarterly Report** | 8 | Board presentations, quarterly reviews |
| **Annual Report** | 14 | Comprehensive yearly reviews, CSRD alignment |
| **Investor Update** | 10 | ESG reporting, stakeholder updates |
| **Impact Deep Dive** | 14 | Methodology transparency, impact audits |

### 3. Customize & Export

- **Locale**: EN, ES, FR, NO, UK, HE (RTL), AR (RTL)
- **Theme**: Auto-applies tenant colors and logo
- **Watermark**: Optional (auto-suggested for drafts)
- **Export**: PPTX, PDF, or both

---

## Templates

### Quarterly Report (8 slides)

**Purpose**: Board presentations, quarterly impact summaries

**Slides**:
1. Title - Company name, period
2. Metrics Grid - SROI, VIS, beneficiaries, hours, value, engagement
3. Key Achievements - Bullet list with citations
4-6. Charts - Outcome trends, volunteer hours, program distribution
7. Evidence Summary - Evidence count and validation
8. Closing - Thank you message

**Locale Support**: EN, ES, FR, NO, UK, HE, AR

---

### Annual Report (14 slides)

**Purpose**: Comprehensive reviews, CSRD-aligned reporting

**Slides**:
1. Title - Company name, year
2. Executive Summary - High-level narrative with citations
3. Metrics Grid - Full metrics overview
4. SROI Deep Dive - Calculation methodology
5. VIS Deep Dive - Scoring breakdown
6. Key Achievements - Major accomplishments
7-10. Charts - Comprehensive visualizations
11. Evidence Summary - Evidence lineage
12. Year in Review - Narrative highlights
13. Looking Forward - Future priorities
14. Closing - Thank you

**Locale Support**: EN, ES, FR, NO, UK, HE, AR

---

### Investor Update (10 slides)

**Purpose**: ESG reporting, investor stakeholder updates

**Slides**:
1. Title - ESG Impact focus
2. Investment Thesis - ESG value proposition
3. Metrics Grid - Impact KPIs
4. SROI Analysis - Return on investment
5-7. Charts - Trend analysis
8. ESG Alignment - UN SDG mapping, governance
9. Evidence & Validation - Credibility backing
10. Closing - Contact info

**Locale Support**: EN, ES, FR, NO, UK

---

### Impact Deep Dive (14 slides)

**Purpose**: Methodology transparency, impact audits, academic reviews

**Slides**:
1. Title - Methodology focus
2. Methodology Overview - Evidence collection, Q2Q, citations
3. Impact Framework - Theory of Change
4. Metrics Grid - Data overview
5. SROI Calculation - Detailed formula, proxy values
6. VIS Calculation - Scoring algorithm
7-10. Charts - Supporting visualizations
11. Evidence Lineage - Full traceability
12. Quality Assurance - Validation steps
13. Limitations & Assumptions - Transparency
14. Closing - Methodology summary

**Locale Support**: EN, ES, FR, NO, UK

---

## API Reference

### Create Deck

```
POST /api/v2/deck/create
```

**Request**:
```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "template": "quarterly",
  "period": {
    "start": "2024-10-01",
    "end": "2024-12-31"
  },
  "locale": "en"
}
```

**Response**:
```json
{
  "id": "deck-uuid",
  "title": "Company ABC - Quarterly Impact Report",
  "subtitle": "2024-10-01 to 2024-12-31",
  "template": "quarterly",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "period": {"start": "2024-10-01", "end": "2024-12-31"},
  "locale": "en",
  "slides": [...],
  "metadata": {
    "author": "TEEI CSR Platform",
    "createdAt": "2025-11-17T14:00:00Z",
    "updatedAt": "2025-11-17T14:00:00Z",
    "version": "2.0",
    "approvalStatus": "draft"
  }
}
```

---

### Export Deck

```
POST /api/v2/deck/:deckId/export
```

**Request**:
```json
{
  "format": "pptx",
  "options": {
    "includeWatermark": true,
    "watermarkText": "DRAFT",
    "includeNotes": true,
    "includeEvidence": true,
    "compressImages": true
  }
}
```

**Response (202 Accepted)**:
```json
{
  "exportId": "export-uuid",
  "statusUrl": "/api/v2/deck/export/export-uuid/status"
}
```

---

### Check Export Status

```
GET /api/v2/deck/export/:exportId/status
```

**Response**:
```json
{
  "exportId": "export-uuid",
  "status": "completed",
  "progress": 100,
  "message": "Export ready for download",
  "pptxUrl": "https://cdn.teei.io/exports/export-uuid.pptx",
  "completedAt": "2025-11-17T14:32:10Z"
}
```

---

## Citations & Evidence

### Per-Paragraph Citation Counts

Each narrative paragraph displays citation counts:

```tsx
// Narrative block with citations
<NarrativeBlock>
  <p>Company ABC achieved significant impact...</p>
  <CitationBadge count={3} evidenceIds={["ev-001", "ev-002", "ev-003"]} />
</NarrativeBlock>
```

**Display**:
- Badge: "3 citations"
- Tooltip: Shows evidence IDs on hover
- Link: Click to view evidence details

### "Why This Section?" Explainer

Each slide can include an explainer panel:

```tsx
{
  title: "Why this section?",
  content: "These core metrics provide a snapshot of your overall impact..."
}
```

**Usage**: Click "❓ Why this section?" button in slide header

### Evidence Lineage in PPTX Notes

Exported PPTX includes full evidence lineage in slide notes:

```
Speaker Notes:
Key metrics overview. SROI = Social Return on Investment, VIS = Volunteer Impact Score.

Evidence Trail:
- ev-001: Buddy feedback, 2024-Q4
- ev-002: Kintell learning progress
- ev-003: Survey responses
```

---

## Internationalization

### Supported Locales

| Locale | Language | RTL | Status |
|--------|----------|-----|--------|
| `en` | English | No | ✅ Complete |
| `es` | Español | No | ✅ Complete |
| `fr` | Français | No | ✅ Complete |
| `no` | Norsk | No | ✅ Complete |
| `uk` | Українська | No | ✅ Complete |
| `he` | עברית | Yes | ✅ Complete |
| `ar` | العربية | Yes | ✅ Complete |

### RTL Layout

Hebrew and Arabic decks automatically apply right-to-left layout:

- Text alignment: right-to-left
- Icon positions: mirrored
- Navigation: reversed arrow keys
- Slide numbering: right-aligned

**Implementation**:
```tsx
const RTL_LOCALES = ['he', 'ar'];
const isRTL = RTL_LOCALES.includes(locale);

<div dir={isRTL ? 'rtl' : 'ltr'}>
  {/* RTL-aware content */}
</div>
```

---

## Accessibility

### WCAG 2.2 AA Compliance

✅ **Keyboard Navigation**
- Arrow keys: Navigate slides
- Tab: Focus management
- Enter/Space: Activate buttons
- Esc: Close dialogs

✅ **Screen Reader Support**
- ARIA labels on all interactive elements
- `role="dialog"` for modals
- `role="progressbar"` for export progress
- `aria-live` regions for status updates

✅ **Visual Accessibility**
- Color contrast ratios ≥ 4.5:1 (AA)
- Focus indicators on all interactive elements
- Text resizable up to 200%
- No reliance on color alone

---

## Performance

### Export SLA

- **Target**: p95 ≤ 10 seconds for PPTX generation
- **Typical**: 6-8 seconds for 10-15 slide decks
- **Memory Cap**: 512 MB per export job
- **Concurrency**: 10 parallel exports max

### Optimization

1. **Server-Side Chart Rendering**
   - Pre-render charts as PNG
   - Embed as base64 in PPTX
   - Avoid client-side overhead

2. **Image Compression**
   - Optional (60% file size reduction)
   - Quality: 85% JPEG

3. **Template Caching**
   - Cache metadata
   - Reuse layouts
   - Minimize DB queries

---

## Testing

### Unit Tests

```bash
# Test deck template generators
pnpm test services/reporting/src/export/pptx/deckTemplates.test.ts
```

**Coverage**:
- Template generation (all 4 templates)
- Slide block conversion
- Citation mapping
- Evidence lineage

### E2E Tests

```bash
# Test export flow
pnpm test:e2e tests/e2e/deck-export.spec.ts
```

**Scenarios**:
1. Create deck → Preview → Export → Download
2. Multi-locale deck (EN, ES, HE)
3. Watermarked vs. non-watermarked
4. Export progress polling
5. Failed export handling

---

## Troubleshooting

### Export Stuck at "Generating..."

**Cause**: Chart rendering timeout or memory limit

**Solution**:
1. Check logs: `docker logs reporting-service | grep "PPTX Export"`
2. Reduce chart count
3. Enable image compression
4. Retry export

### RTL Layout Issues

**Cause**: Locale not in RTL_LOCALES

**Solution**:
1. Verify locale code (`he` or `ar`)
2. Check `dir` attribute in DOM
3. Inspect CSS `direction` property

### Citation Counts Not Displaying

**Cause**: Missing citation info

**Solution**:
1. Ensure `citations` array in `SlideBlock`
2. Check `paragraphIndex` matches paragraph order
3. Verify `citationCount > 0`

---

## FAQ

**Q: Can I customize slide templates?**
A: Yes, edit `services/reporting/src/export/pptx/deckTemplates.ts`

**Q: How do I add a new locale?**
A: Add to `LOCALES` array in `DeckComposer.tsx` and create translation files

**Q: Can I export to PDF?**
A: Yes, select "PDF" or "Both" in export options

**Q: Maximum deck size?**
A: 50 slides (soft limit). Larger decks may exceed performance SLA

**Q: How long are exports stored?**
A: 7 days on CDN, then deleted

---

## Roadmap

### v2.1 (Planned)
- [ ] Custom slide templates (user-defined)
- [ ] Collaborative deck editing
- [ ] Video embed support
- [ ] Advanced chart types

### v2.2 (Future)
- [ ] AI-powered slide suggestions
- [ ] Voice narration export
- [ ] Interactive slides
- [ ] Version history

---

## Support

**Documentation**: https://docs.teei.io/boardroom-v2
**Issues**: https://github.com/teei/csr-platform/issues
**Slack**: #boardroom-v2
