# Report Generator Templates - Authoring Guide

**Last Updated**: 2025-11-17
**Owned By**: Worker 7 (Generators & Case Study Team)

---

## Table of Contents

1. [Overview](#overview)
2. [Generator Types](#generator-types)
3. [Template Architecture](#template-architecture)
4. [Citation Requirements (Evidence Gate)](#citation-requirements-evidence-gate)
5. [Authoring New Templates](#authoring-new-templates)
6. [Localization](#localization)
7. [Testing](#testing)
8. [API Usage](#api-usage)
9. [Export Formats](#export-formats)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The TEEI Reporting Service uses **Gen-AI powered report generation** with strict **evidence-based citation requirements**. All generated reports must pass the **Evidence Gate** validation before being returned to the user.

### Key Principles

1. **Citation-First**: Every paragraph must have ≥1 citation (configurable)
2. **Evidence Traceability**: All citations link to source evidence snippets (Q2Q-derived)
3. **PII Redaction**: All evidence is redacted before LLM processing
4. **Lineage Tracking**: Full audit trail from evidence → metric → report
5. **Fail-Fast**: Generation fails if citation requirements not met

---

## Generator Types

### 1. Case Study (`case-study`)

**Purpose**: Compelling customer case study for stakeholder communications
**Length**: 1800-2200 words
**Tone**: Inspiring, evidence-based, persuasive
**Audience**: Prospective clients, investors, board members, marketing materials

**Structure**:
1. Executive Summary (120-150 words)
2. The Challenge: Context & Baseline (250-300 words)
3. The Intervention: Program Design (250-300 words)
4. The Results: Measurable Outcomes (400-450 words)
5. The ROI: Value Creation Analysis (250-300 words)
6. Participant Stories: Voices from the Program (250-300 words)
7. Lessons Learned & Future Outlook (200-250 words)
8. Call to Action (100-120 words)

**Auto-Generated Charts**:
- Baseline vs. Current Outcomes (radar chart)
- SROI Value Breakdown (waterfall chart)
- Outcome Trends Over Time (line chart)
- Participant Journey Timeline
- VIS Score Components

**Citation Requirements**:
- Minimum 2 citations per paragraph
- Evidence density: 0.5 citations per 100 words
- Every claim must be backed by evidence

**Recommended LLM Settings**:
- Temperature: 0.7 (balanced creativity)
- Max Tokens: 4000
- Estimated Cost: $0.20-0.40

### 2. Methods Whitepaper (`methods-whitepaper`)

**Purpose**: Technical documentation of VIS/SROI calculation methodologies
**Length**: 2500-3000 words
**Tone**: Academic rigor, methodological transparency
**Audience**: Auditors, academic researchers, foundation officers, data scientists

**Structure**:
1. Executive Summary (150-180 words)
2. Introduction: Defining VIS and SROI (300-350 words)
3. Data Sources & Lineage (400-450 words)
4. VIS Calculation Methodology (500-600 words)
5. SROI Calculation Methodology (500-600 words)
6. Data Quality & Governance (350-400 words)
7. Limitations & Future Enhancements (250-300 words)
8. Conclusion & Transparency Commitment (200-250 words)

**Auto-Generated Tables**:
- Evidence Snippet Statistics
- GE Test Suite Coverage
- VIS Component Breakdown
- SROI Numerator Breakdown
- SROI Denominator Breakdown
- Lineage Metadata
- Data Quality SLOs

**Citation Requirements**:
- Minimum 2 citations per paragraph
- Every formula component must cite source evidence
- Transparency on data quality, limitations, proxies

**Recommended LLM Settings**:
- Temperature: 0.3 (deterministic, technical)
- Max Tokens: 6000
- Estimated Cost: $0.40-0.60

---

## Template Architecture

### Template Format: Handlebars (`.hbs`)

Templates are **LLM prompt templates** that structure the generation request. They combine:
1. **Context variables** (company, period, metrics)
2. **Evidence snippets** with `[cite:ID]` format
3. **Detailed instructions** on structure, tone, citation requirements
4. **Critical rules** enforcing Evidence Gate compliance

### File Structure

```
services/reporting/src/lib/prompts/
├── index.ts                       # Template manager
├── case-study.en.hbs              # English case study
├── case-study.es.hbs              # Spanish case study
├── case-study.fr.hbs              # French case study
├── case-study.uk.hbs              # Ukrainian case study
├── case-study.no.hbs              # Norwegian case study
├── methods-whitepaper.en.hbs      # English methods whitepaper
├── methods-whitepaper.es.hbs      # Spanish methods whitepaper
├── methods-whitepaper.fr.hbs      # French methods whitepaper
├── methods-whitepaper.uk.hbs      # Ukrainian methods whitepaper
├── methods-whitepaper.no.hbs      # Norwegian methods whitepaper
├── case-study.test.ts             # Unit tests
├── methods-whitepaper.test.ts     # Unit tests
└── __snapshots__/
    └── generator-templates.snap.ts # Snapshot tests
```

### Template Variables

#### Common Variables

```handlebars
{{companyName}}            # Company name
{{periodStart}}            # Period start date (ISO 8601)
{{periodEnd}}              # Period end date (ISO 8601)
{{participantsCount}}      # Number of participants
{{sessionsCount}}          # Total sessions delivered
{{volunteersCount}}        # Number of volunteers
{{sroiRatio}}              # SROI ratio (e.g., 5.23)
{{visScore}}               # VIS score (0-100)
{{avgConfidence}}          # Avg confidence score (0-1)
{{avgBelonging}}           # Avg belonging score (0-1)
{{avgJobReadiness}}        # Avg job readiness score (0-1)
{{avgLanguageLevel}}       # Avg language level score (0-1)
{{avgWellBeing}}           # Avg well-being score (0-1)
```

#### Evidence Snippets Loop

```handlebars
{{#each evidenceSnippets}}
[cite:{{this.id}}] "{{this.text}}" ({{this.dimension}}, confidence: {{formatPercent this.score}})
{{/each}}
```

#### Conditional Baseline Metrics (Case Study Only)

```handlebars
{{#if baselineMetrics}}
- **Confidence**: {{formatPercent baselineMetrics.avgConfidence}}
{{else}}
(Baseline data not available)
{{/if}}
```

#### Data Quality Metadata (Methods Whitepaper Only)

```handlebars
{{#if dataQuality}}
- **Evidence Snippet Count**: {{dataQuality.snippetCount}}
- **Average AI Confidence**: {{formatPercent dataQuality.avgConfidence}}
{{else}}
(Data quality metadata not available)
{{/if}}
```

### Handlebars Helpers

```javascript
{{formatNumber value decimals}}       // Format number to N decimals
{{formatPercent value}}                // Format as percentage
{{trend current previous}}             // "improving", "declining", "stable"
```

---

## Citation Requirements (Evidence Gate)

### Overview

The **Evidence Gate** is a strict validation layer that enforces citation quality. Reports **fail generation** if citation requirements are not met.

### Rules

1. **Minimum Citations Per Paragraph**: ≥1 citation (configurable: `minCitationsPerParagraph`)
2. **Citation Density**: ≥0.5 citations per 100 words (configurable: `minCitationDensity`)
3. **Valid Citation IDs**: All `[cite:ID]` must reference existing evidence snippets
4. **No Fabrication**: LLM cannot invent evidence; must use only provided snippets

### Citation Format

```
[cite:evidence-uuid-1234]
```

Example in generated content:
```
Participants reported increased confidence after program participation [cite:evidence-abc123].
One participant noted, "I feel more capable now" [cite:evidence-def456], while another shared,
"I applied for my first job" [cite:evidence-ghi789].
```

### Validation Process

1. **Pre-LLM**: Evidence snippets extracted from database, PII redacted
2. **LLM Generation**: Model receives evidence list and instructions to cite
3. **Post-LLM**: `CitationExtractor.validateCitations()` runs:
   - Extracts all `[cite:ID]` tags from generated content
   - Verifies each ID exists in evidence set
   - Counts citations per paragraph
   - Calculates citation density (citations / 100 words)
   - Fails if any rule violated

### Configuration

Default config (in `services/reporting/src/lib/citations.ts`):

```typescript
{
  minRelevanceScore: 0.3,
  maxSnippetsPerDimension: 5,
  minConfidence: 0.5,
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5,
  strictValidation: true  // Fail-fast mode
}
```

---

## Authoring New Templates

### Step 1: Create Template File

Create a new `.hbs` file in `services/reporting/src/lib/prompts/`:

```bash
touch services/reporting/src/lib/prompts/my-new-report.en.hbs
```

### Step 2: Structure the Template

```handlebars
You are an expert [role] crafting a [report type] for [audience].

**Report Context**:
- **Company**: {{companyName}}
- **Period**: {{periodStart}} to {{periodEnd}}
- **Type**: [Report Type]

**Key Metrics**:
- **SROI**: {{formatNumber sroiRatio 2}}:1
- **VIS**: {{formatNumber visScore 1}}/100

**Evidence Base** (cite with [cite:ID]):
{{#each evidenceSnippets}}
[cite:{{this.id}}] "{{this.text}}" ({{this.dimension}}, confidence: {{formatPercent this.score}})
{{/each}}

---

**INSTRUCTIONS**:

1. **Section 1: Title** (word count):
   - Instruction detail
   - CRITICAL: Minimum X citations per paragraph

2. **Section 2: Title** (word count):
   - Instruction detail
   - CRITICAL: Cite evidence [cite:ID]

---

**OUTPUT REQUIREMENTS**:
- **Total Length**: X-Y words
- **Tone**: [tone]
- **Format**: Plain text with section headers (use "# Section Name")
- **Citations**: Inline [cite:ID] format, minimum Z per paragraph
- **No PII**: Evidence is already redacted

**CRITICAL RULES**:
✅ Every paragraph must have at least Z citations
✅ Use only evidence snippets provided above (do not fabricate)
✅ If a claim cannot be cited, do not make it
✅ Plain text only (no markdown bold/italic)
✅ Section headers with "# " prefix for parsing

---

Generate the [Report Type] now:
```

### Step 3: Update Type Definitions

Edit `services/reporting/src/lib/prompts/index.ts`:

```typescript
export type SectionType =
  | 'impact-summary'
  | 'sroi-narrative'
  | 'outcome-trends'
  | 'quarterly-report'
  | 'annual-report'
  | 'investor-update'
  | 'impact-deep-dive'
  | 'case-study'
  | 'methods-whitepaper'
  | 'my-new-report'; // ADD THIS

private loadTemplates(): void {
  const sections: SectionType[] = [
    'impact-summary',
    'sroi-narrative',
    'outcome-trends',
    'quarterly-report',
    'annual-report',
    'investor-update',
    'impact-deep-dive',
    'case-study',
    'methods-whitepaper',
    'my-new-report', // ADD THIS
  ];
  // ...
}
```

### Step 4: Update Route Schema

Edit `services/reporting/src/routes/gen-reports.ts`:

```typescript
reportType: z.enum([
  'quarterly-report',
  'annual-report',
  'investor-update',
  'impact-deep-dive',
  'case-study',
  'methods-whitepaper',
  'my-new-report', // ADD THIS
]).optional(),
```

### Step 5: Update OpenAPI Schema

Edit `packages/openapi/reporting.yaml`:

```yaml
reportType:
  type: string
  enum:
    - quarterly-report
    - annual-report
    - investor-update
    - impact-deep-dive
    - case-study
    - methods-whitepaper
    - my-new-report  # ADD THIS
```

### Step 6: Write Tests

Create `services/reporting/src/lib/prompts/my-new-report.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { getTemplateManager } from './index.js';

describe('My New Report Template', () => {
  let templateManager: ReturnType<typeof getTemplateManager>;

  beforeAll(() => {
    templateManager = getTemplateManager();
  });

  it('should load my-new-report template', () => {
    expect(() => {
      templateManager.getTemplate('my-new-report', 'en');
    }).not.toThrow();
  });

  it('should render with data', () => {
    const rendered = templateManager.render('my-new-report', mockData, 'en');
    expect(rendered).toContain('Expected Content');
  });

  // Add more tests...
});
```

---

## Localization

### Supported Locales

- `en`: English
- `es`: Spanish (Español)
- `fr`: French (Français)
- `uk`: Ukrainian (Українська)
- `no`: Norwegian (Norsk)

### Adding a New Locale

1. Create localized template file: `my-report.{locale}.hbs`
2. Translate all instruction text, preserving:
   - Handlebars syntax: `{{variable}}`
   - Citation format: `[cite:ID]`
   - Section structure
   - Word count targets
3. Update `Locale` type in `index.ts`:

```typescript
export type Locale = 'en' | 'es' | 'fr' | 'uk' | 'no' | 'de'; // Add 'de' for German
```

4. Test with localized data

### Fallback Behavior

If a locale is not found, the template manager falls back to English (`en`).

---

## Testing

### Unit Tests

Run template unit tests:

```bash
cd services/reporting
pnpm test src/lib/prompts/case-study.test.ts
pnpm test src/lib/prompts/methods-whitepaper.test.ts
```

### Snapshot Tests

Generate snapshots:

```bash
pnpm test src/lib/prompts/__snapshots__/generator-templates.snap.ts
```

Update snapshots (if intentional change):

```bash
pnpm test -- -u
```

### Integration Tests

Test full generation flow:

```bash
curl -X POST http://localhost:3003/gen-reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "period": {
      "start": "2024-01-01",
      "end": "2024-03-31"
    },
    "locale": "en",
    "reportType": "case-study",
    "deterministic": false,
    "temperature": 0.7,
    "maxTokens": 4000
  }'
```

### E2E Tests

Test export functionality:

```bash
pnpm test:e2e tests/e2e/generators.spec.ts
```

---

## API Usage

### Generate Report

**Endpoint**: `POST /gen-reports/generate`

**Request**:

```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "period": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  },
  "locale": "en",
  "reportType": "case-study",
  "deterministic": false,
  "temperature": 0.7,
  "maxTokens": 4000
}
```

**Response**:

```json
{
  "reportId": "report-uuid-1234",
  "sections": [
    {
      "type": "case-study",
      "content": "# Executive Summary\n\nACME Corp's integration program...",
      "citations": [
        {
          "id": "cite-0",
          "snippetId": "evidence-abc123",
          "text": "I feel more confident now",
          "relevanceScore": 0.88
        }
      ],
      "wordCount": 2050,
      "characterCount": 12500
    }
  ],
  "lineage": {
    "modelName": "gpt-4",
    "promptVersion": "case-study-en-v1.0",
    "timestamp": "2024-11-17T12:00:00Z",
    "tokensUsed": 4200,
    "tokensInput": 1500,
    "tokensOutput": 2700,
    "estimatedCostUsd": "0.35"
  },
  "warnings": []
}
```

**Errors**:

```json
{
  "error": "Report generation failed",
  "message": "Citation validation failed for section \"case-study\": Paragraph 3 has 0 citation(s), minimum 1 required"
}
```

### Get Cost Summary

**Endpoint**: `GET /gen-reports/cost-summary`

**Response**:

```json
{
  "totalCostUsd": "12.45",
  "totalTokens": 150000,
  "requestCount": 42,
  "byModel": {
    "gpt-4": {
      "costUsd": "10.20",
      "tokens": 120000,
      "requests": 35
    },
    "claude-3": {
      "costUsd": "2.25",
      "tokens": 30000,
      "requests": 7
    }
  }
}
```

---

## Export Formats

### PDF Export

- Watermarking support
- Evidence hash stamping
- Professional layout with company branding
- Auto-inserted charts

**API**: `POST /export/pdf` (see `services/reporting/utils/pdfRenderer.ts`)

### PPTX Export

- Executive presentation template
- Cover + KPIs + Charts + Evidence links
- Section TOCs
- Evidence footnotes in slide notes

**API**: `POST /export/pptx` (see `services/reporting/src/utils/pptxGenerator.ts`)

---

## Troubleshooting

### Issue: "Citation validation failed"

**Cause**: LLM did not include enough citations in generated content.

**Solutions**:
1. Increase evidence snippet count (more source material)
2. Adjust LLM temperature (lower = more deterministic, better citation following)
3. Check if evidence snippets are relevant to report period
4. Review template instructions for clarity

### Issue: "Template not found"

**Cause**: Locale or section type not loaded.

**Solutions**:
1. Verify template file exists: `ls services/reporting/src/lib/prompts/*.hbs`
2. Check `SectionType` enum includes your report type
3. Restart service to reload templates

### Issue: "Insufficient evidence found"

**Cause**: No evidence snippets in database for period/company.

**Solutions**:
1. Verify Q2Q pipeline ran for this period
2. Check `evidence_snippets` table: `SELECT COUNT(*) FROM evidence_snippets WHERE ...`
3. Ensure participant feedback exists in source tables

### Issue: "PII leak detected"

**Cause**: Redaction failed, PII present in generated content.

**Solutions**:
1. Check `RedactionEnforcer` configuration
2. Review evidence snippets for unredacted PII
3. Add new PII patterns to redaction rules

---

## References

- [GenAI Reporting Guide](/docs/GenAI_Reporting.md)
- [OpenAPI Spec](/packages/openapi/reporting.yaml)
- [Citation Validation](/services/reporting/src/lib/citations.ts)
- [PII Redaction](/services/reporting/src/lib/redaction.ts)
- [Lineage Tracking](/services/reporting/src/lib/lineage.ts)

---

**Questions?** Contact Worker 7 lead or open an issue.
