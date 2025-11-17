# Report Template Authoring Guide

**Worker 7: Generators - Case Study & Methods Whitepaper**

This guide documents the new report generators added to the TEEI CSR Platform: **Customer Case Study** and **VIS/SROI Methods Whitepaper**.

---

## Table of Contents

1. [Overview](#overview)
2. [Template Structure](#template-structure)
3. [Case Study Template](#case-study-template)
4. [Methods Whitepaper Template](#methods-whitepaper-template)
5. [Citation Requirements](#citation-requirements)
6. [Chart & Table Placeholders](#chart--table-placeholders)
7. [Multi-locale Support](#multi-locale-support)
8. [Evidence Gate Enforcement](#evidence-gate-enforcement)
9. [Export Options](#export-options)
10. [API Usage](#api-usage)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The TEEI reporting system now includes two new evidence-based report generators:

### 1. Customer Case Study (`case-study`)
- **Purpose**: Showcase program impact through a narrative arc: baseline → intervention → outcomes
- **Audience**: Prospective clients, partners, investors, marketing materials
- **Length**: 1200-1500 words
- **Tone**: Inspirational yet data-driven, storytelling with metrics
- **Key Features**:
  - Baseline conditions and challenges
  - Program intervention design
  - Transformation and outcomes achieved
  - SROI and VIS value analysis
  - Evidence-backed success stories
  - Chart integration (baseline, timeline, outcomes, SROI breakdown)

### 2. VIS/SROI Methods Whitepaper (`methods-whitepaper`)
- **Purpose**: Document calculation methodologies, data lineage, and quality frameworks
- **Audience**: Auditors, compliance officers, data scientists, academic researchers
- **Length**: 2000-2500 words
- **Tone**: Academic, precise, transparent about limitations
- **Key Features**:
  - SROI formula and component definitions
  - VIS formula and attribution modeling
  - Data sources and OpenLineage tracking
  - Great Expectations quality metrics
  - Calculation walkthrough (worked example)
  - Validation and auditing procedures
  - Table integration (component breakdowns, lineage maps, quality metrics)

---

## Template Structure

All templates are Handlebars (`.hbs`) files located in:
```
services/reporting/src/lib/prompts/
├── case-study.en.hbs
├── methods-whitepaper.en.hbs
└── [other templates...]
```

### Template Sections

Each template includes:
1. **Context Block**: Provides report metadata (company, period, audience)
2. **KPI Block**: Lists quantitative metrics (participants, SROI, VIS, outcomes)
3. **Evidence Base**: Array of evidence snippets with IDs for citation
4. **Instructions Block**: Detailed section-by-section generation guidelines
5. **Output Requirements**: Formatting, tone, length, citation rules
6. **Critical Rules**: Validation rules and factuality enforcement

---

## Case Study Template

### File Path
```
services/reporting/src/lib/prompts/case-study.en.hbs
```

### Required Data Fields

```typescript
{
  companyName: string;
  periodStart: string; // ISO 8601 date
  periodEnd: string;
  participantsCount: number;
  sessionsCount: number;
  volunteersCount: number;
  programType: string; // 'mentorship' | 'upskilling' | 'buddy-matching' | 'hybrid'
  targetDemographic: string;
  sroiRatio: number; // e.g., 5.23
  visScore: number; // 0-100 scale
  avgConfidence: number; // 0-1 scale
  avgBelonging: number;
  avgJobReadiness: number;
  avgLanguageLevel: number;
  avgWellBeing: number;
  confidenceDelta: number; // Change from baseline
  belongingDelta: number;
  jobReadinessDelta: number;
  languageLevelDelta: number;
  wellBeingDelta: number;
  evidenceSnippets: Array<{
    id: string;
    text: string;
    dimension: string;
    score: number;
    confidence: number;
  }>;
}
```

### Template Sections

1. **Executive Summary** (120-150 words)
   - Headline outcome or transformation
   - Challenge addressed
   - Solution/program name
   - Results (SROI, VIS, participation)
   - **Citations**: Minimum 2

2. **The Challenge: Baseline Conditions** (200-250 words)
   - Initial situation and needs
   - Baseline outcome scores
   - Participant struggles (from evidence)
   - Rationale for intervention
   - **Citations**: Minimum 1 per paragraph
   - **Chart**: `[[CHART: baseline-outcomes-bar]]`

3. **The Intervention: Program Design** (200-250 words)
   - Program structure
   - Unique features/innovations
   - Volunteer engagement model
   - Evidence of engagement
   - **Citations**: Minimum 1 per paragraph
   - **Chart**: `[[CHART: participation-timeline]]`

4. **The Transformation: Outcomes Achieved** (300-350 words)
   - Outcome growth across 5 dimensions
   - Participant success stories
   - Delta percentages
   - Unexpected benefits
   - **Citations**: Minimum 2 per paragraph
   - **Chart**: `[[CHART: outcome-growth-spider]]`

5. **Value Created: SROI & VIS Analysis** (200-250 words)
   - SROI ratio explanation
   - Social value components
   - Volunteer impact (VIS)
   - Economic and human value framing
   - **Citations**: Minimum 1 per paragraph
   - **Chart**: `[[CHART: sroi-breakdown-waterfall]]`

6. **Lessons Learned & Scalability** (150-200 words)
   - Key insights
   - What worked well
   - Scalability potential
   - Future outlook
   - **Citations**: Evidence-based recommendations

7. **Call to Action** (80-100 words)
   - Partnership opportunities
   - Evidence appendix reference
   - **Citations**: Minimum 1

### Example Usage

```bash
# API Call
POST /api/v1/gen-reports/generate
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "reportType": "case-study",
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "locale": "en",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

---

## Methods Whitepaper Template

### File Path
```
services/reporting/src/lib/prompts/methods-whitepaper.en.hbs
```

### Required Data Fields

```typescript
{
  companyName: string;
  periodStart: string;
  periodEnd: string;
  sroiRatio: number;
  visScore: number;
  evidenceCount: number;
  dataQualityScore: number; // 0-100
  lineageCoverage: number; // Percentage
  avgConfidence: number;
  avgBelonging: number;
  avgJobReadiness: number;
  avgLanguageLevel: number;
  avgWellBeing: number;
  schemaValidationPass: number; // Percentage
  nullRate: number; // Percentage
  outlierCount: number;
  refIntegrityPass: number; // Percentage
  freshnessStatus: string; // e.g., "On-time", "Delayed"
  visQualityFactor?: number;
  visAttribution?: number; // Percentage
  evidenceSnippets: Array<{
    id: string;
    text: string;
    dimension: string;
    score: number;
    confidence: number;
    lineageId?: string;
  }>;
}
```

### Template Sections

1. **Abstract** (150-200 words)
   - Purpose of whitepaper
   - SROI and VIS metrics
   - Data sources and lineage
   - Methodological rigor
   - **Citations**: Minimum 1 (provenance)

2. **Metric Definition: SROI** (400-500 words)
   - Formula: `SROI = (Social Value Created) / (Investment)`
   - Component definitions
   - 5 outcome dimensions and weightings
   - Financial proxy methodology
   - CSRD alignment
   - **Citations**: Minimum 2
   - **Table**: `[[TABLE: sroi-component-breakdown]]`

3. **Metric Definition: VIS** (400-500 words)
   - Formula: `VIS = (Volunteer Hours × Quality Factor × Outcome Attribution) / Benchmark`
   - Component definitions
   - 0-100 scaling
   - Confidence intervals and limitations
   - **Citations**: Minimum 2
   - **Table**: `[[TABLE: vis-calculation-table]]`

4. **Data Sources & Lineage** (300-350 words)
   - Primary data sources (Kintell, Buddy, Evidence, Outcomes)
   - OpenLineage instrumentation
   - Data pipeline (raw → staging → marts → metrics)
   - dbt semantic layer
   - **Citations**: Minimum 2 (with lineage IDs)
   - **Table**: `[[TABLE: data-lineage-map]]`

5. **Data Quality Framework** (300-350 words)
   - Great Expectations test suites
   - Validation rules (schema, range, referential integrity, freshness, outliers)
   - Data quality score calculation
   - Current metrics vs. targets
   - **Citations**: Minimum 1 (quality metadata)
   - **Table**: `[[TABLE: data-quality-metrics]]`

6. **Calculation Walkthrough** (300-350 words)
   - Worked example: SROI for the period
   - Worked example: VIS for the period
   - Step-by-step breakdown
   - **Citations**: Minimum 2 (attribution evidence)
   - **Chart**: `[[CHART: sroi-calculation-flowchart]]`

7. **Validation & Auditing** (250-300 words)
   - Golden tests (dbt vs. service calculators)
   - Lineage validation (≥90% coverage)
   - Citation validation (≥1 per claim)
   - PII redaction audit
   - Audit trail (report lineage, citation metadata, evidence hash)
   - GDPR and CSRD compliance
   - **Citations**: Minimum 1 (lineage coverage)

8. **Limitations & Future Enhancements** (200-250 words)
   - Financial proxy estimates
   - Attribution confidence intervals
   - Evidence sampling bias
   - Causality vs. correlation challenges
   - Future improvements
   - **Citations**: Evidence-based limitations

9. **Conclusion** (100-120 words)
   - Methodological rigor summary
   - Lineage and validation differentiators
   - Invitation for external validation
   - **Citations**: Minimum 1

### Example Usage

```bash
# API Call
POST /api/v1/gen-reports/generate
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "reportType": "methods-whitepaper",
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "locale": "en",
  "deterministic": true,
  "temperature": 0.3,
  "maxTokens": 6000
}
```

---

## Citation Requirements

### Enforcement Rules (Evidence Gate)

Both templates enforce **strict citation validation**:

1. **Minimum Citations Per Paragraph**: 1 citation required (configurable)
2. **Citation Density**: 0.5 citations per 100 words (minimum)
3. **Valid Citation IDs**: All `[cite:ID]` tags must reference actual evidence snippets
4. **Fail-Fast**: Generation fails if citation validation fails

### Citation Format

```
[cite:ev-001]
```

Where `ev-001` is the `id` field from an evidence snippet in the template data.

### Validation Logic

Located in: `services/reporting/src/lib/citations.ts`

```typescript
validateCitations(content: string, evidenceSnippets: EvidenceSnippet[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  citationCount: number;
  paragraphCount: number;
  citationDensity: number;
}
```

### Example Validation Error

```json
{
  "error": "Citation validation failed for section \"case-study\": Paragraph 3 has 0 citation(s), minimum 1 required; Citation density 0.42 per 100 words is below minimum 0.5"
}
```

---

## Chart & Table Placeholders

Templates can include placeholders for charts and tables that will be rendered in exports.

### Chart Placeholders (Case Study)

```
[[CHART: baseline-outcomes-bar]]
[[CHART: participation-timeline]]
[[CHART: outcome-growth-spider]]
[[CHART: sroi-breakdown-waterfall]]
```

### Table Placeholders (Methods Whitepaper)

```
[[TABLE: sroi-component-breakdown]]
[[TABLE: vis-calculation-table]]
[[TABLE: data-lineage-map]]
[[TABLE: data-quality-metrics]]
[[CHART: sroi-calculation-flowchart]]
```

### Rendering in Exports

- **PDF**: Placeholders are replaced with rendered chart images or formatted tables
- **PPTX**: Placeholders create dedicated slides with native PowerPoint charts/tables
- **HTML**: Placeholders render as interactive SVG charts or HTML tables

---

## Multi-locale Support

### Supported Locales

- `en` - English (default)
- `es` - Spanish
- `fr` - French
- `uk` - Ukrainian
- `no` - Norwegian

### Adding New Locale

1. Create new template file: `case-study.{locale}.hbs`
2. Translate all text (keep placeholders like `{{companyName}}` unchanged)
3. Template manager auto-loads on restart
4. Fallback to English if locale not found

### Example Locale Request

```json
{
  "reportType": "case-study",
  "locale": "es",
  ...
}
```

---

## Evidence Gate Enforcement

### What is Evidence Gate?

Evidence Gate ensures every claim in generated reports is backed by real evidence from the program data. It's a **fail-fast** mechanism that prevents publication of unfounded narratives.

### Enforcement Layers

1. **Pre-LLM Validation**:
   - Check evidence count > 0
   - Warn if evidence < threshold (e.g., <10 snippets)

2. **Post-LLM Validation**:
   - Parse all `[cite:ID]` tags
   - Verify each ID exists in evidence set
   - Check citation density ≥ 0.5 per 100 words
   - Check min citations per paragraph ≥ 1

3. **PII Protection**:
   - Redact PII before LLM processing
   - Post-redaction leak detection
   - Fail if PII detected after redaction

### Configuration

Located in: `services/reporting/src/lib/citations.ts`

```typescript
const DEFAULT_CONFIG: CitationConfig = {
  minRelevanceScore: 0.3,
  maxSnippetsPerDimension: 5,
  minConfidence: 0.5,
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5, // At least 1 citation per 200 words
  strictValidation: true, // Enforce strictly (throw errors, not warnings)
};
```

---

## Export Options

### PDF Export with TOC

```bash
POST /api/v1/export/pdf
{
  "reportId": "rpt_abc123",
  "options": {
    "includeCharts": true,
    "includeCitations": true,
    "includeTableOfContents": true,
    "watermark": {
      "enabled": true,
      "text": "DRAFT"
    }
  }
}
```

**Features**:
- Section table of contents with page numbers
- Watermarking (DRAFT, CONFIDENTIAL, etc.)
- ID stamping (report ID, evidence hash, timestamp)
- Citation footnotes
- Rendered charts and tables

### PPTX Export with TOC

```bash
POST /api/v1/exports/presentations
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "reportId": "rpt_abc123",
  "format": "pptx",
  "narrative": {
    "tone": "formal",
    "length": "standard",
    "audience": "board"
  }
}
```

**Features**:
- Cover slide with TOC
- Section slides with headers
- Chart slides (native PowerPoint charts)
- Evidence appendix slides
- Speaker notes with citations

---

## API Usage

### Generate Case Study

```typescript
// TypeScript SDK Example
import { reportingClient } from '@/api/reporting';

const result = await reportingClient.generateReport({
  reportType: 'case-study',
  period: {
    from: '2024-01-01',
    to: '2024-12-31',
  },
  locale: 'en',
  options: {
    tone: 'professional',
    length: 'standard',
    includeCharts: true,
    deterministic: false,
  },
}, companyId);

console.log(result.reportId);
console.log(result.sections[0].content);
console.log(result.sections[0].citations.length);
console.log(result.lineage.estimatedCostUsd);
```

### Generate Methods Whitepaper

```typescript
const result = await reportingClient.generateReport({
  reportType: 'methods-whitepaper',
  period: {
    from: '2024-01-01',
    to: '2024-12-31',
  },
  locale: 'en',
  options: {
    tone: 'technical',
    length: 'detailed',
    includeCharts: false, // Tables only for whitepapers
    deterministic: true, // Recommended for technical docs
  },
}, companyId);
```

### Export to PDF

```typescript
const response = await fetch('/api/v1/export/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reportId: result.reportId,
    options: {
      includeCharts: true,
      includeCitations: true,
      includeTableOfContents: true,
    },
  }),
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `case-study-${result.reportId}.pdf`;
a.click();
```

---

## Testing

### Unit Tests

Located in: `services/reporting/src/lib/prompts/index.test.ts`

```bash
pnpm --filter @teei/reporting test
```

**Test Coverage**:
- Template loading (all section types including new generators)
- Template rendering with mock data
- Chart/table placeholder presence
- Citation instruction presence
- Multi-locale fallback
- Handlebars helper functions
- Template versioning

### Snapshot Tests

```bash
pnpm --filter @teei/reporting test:snapshots
```

**Snapshots**:
- Full rendered template output for each generator
- Regression detection for template changes

### E2E Tests

Located in: `apps/corp-cockpit-astro/tests/e2e/generators.spec.ts`

```bash
pnpm --filter corp-cockpit-astro test:e2e
```

**E2E Scenarios**:
- Navigate to `/[lang]/cockpit/[companyId]/generators`
- Fill case study form
- Click "Generate Case Study"
- Verify report modal appears
- Verify citations are present
- Export to PDF
- Verify PDF download

---

## Troubleshooting

### Issue: Template Not Found

**Symptom**: Error: `Template not found: case-study.en`

**Solution**:
1. Verify file exists: `services/reporting/src/lib/prompts/case-study.en.hbs`
2. Restart the reporting service to reload templates
3. Check file permissions (must be readable)

### Issue: Citation Validation Failure

**Symptom**: Error: `Citation validation failed for section "case-study": Paragraph 3 has 0 citation(s), minimum 1 required`

**Solution**:
1. Check evidence snippets are being passed to template
2. Verify LLM is generating `[cite:ID]` tags
3. Adjust temperature (lower = more deterministic citations)
4. Increase `maxTokens` to give LLM more space
5. Review prompt instructions for citation emphasis

### Issue: Low Evidence Count

**Symptom**: Warning: `Insufficient evidence found for the period. Report quality may be limited.`

**Solution**:
1. Expand date range to include more evidence
2. Check data pipeline is running (no stale data)
3. Verify Q2Q feed is ingesting feedback
4. Lower `minConfidence` threshold in citation config
5. Check evidence snippets table has records for company/period

### Issue: PII Leak Detected

**Symptom**: Error: `PII redaction failed for snippet ev-001: EMAIL detected after redaction`

**Solution**:
1. Check redaction rules in `services/reporting/src/lib/redaction.ts`
2. Add missing PII patterns (emails, phones, SSNs, names)
3. Verify redaction is running pre-LLM (not just post)
4. Test redaction with sample data: `pnpm test:redaction`

### Issue: Chart Placeholders Not Rendering

**Symptom**: PDF shows `[[CHART: baseline-outcomes-bar]]` as text

**Solution**:
1. Verify chart rendering service is running
2. Check placeholder format matches exactly (case-sensitive)
3. Ensure export controller parses placeholders
4. Review export logs for errors
5. Fallback: Use static chart images

### Issue: Export Timeout

**Symptom**: Error: `Export generation timed out after 60 seconds`

**Solution**:
1. Increase export timeout in `export.ts`
2. Reduce `maxTokens` to speed up generation
3. Disable charts if not critical: `includeCharts: false`
4. Use async export with polling instead of sync
5. Check database query performance (evidence extraction)

### Issue: Multi-locale Fallback Not Working

**Symptom**: Error when requesting Spanish report: `Template not found: case-study.es`

**Solution**:
1. Verify fallback logic in `PromptTemplateManager.getTemplate()`
2. Check English template exists (fallback target)
3. Create Spanish template: `cp case-study.en.hbs case-study.es.hbs`
4. Translate text, keep Handlebars placeholders unchanged

---

## Best Practices

### Template Authoring

1. **Always include citation instructions** in CRITICAL RULES section
2. **Use specific numeric targets** (e.g., "200-250 words" not "short section")
3. **Provide examples** of desired output format
4. **Enforce factuality** with "If evidence insufficient, skip section" rules
5. **Version your templates** (update version string when changing prompts)

### Evidence Selection

1. **Relevance scoring** prioritizes high-relevance snippets
2. **Dimension balancing** ensures diversity across outcome dimensions
3. **Confidence filtering** excludes low-confidence evidence (default: <0.5)
4. **Max per dimension** prevents over-representation (default: 5 per dimension)

### Cost Optimization

1. **Use deterministic mode** for technical documents (lower temperature, reproducible)
2. **Set maxTokens appropriately**:
   - Case study: 4000 tokens (~2000 words)
   - Methods whitepaper: 6000 tokens (~3000 words)
3. **Monitor cost per report** via `/gen-reports/cost-summary` endpoint
4. **Cache common reports** to avoid regeneration

### Security

1. **Never log PII** (only log redaction counts, not actual data)
2. **Validate all citation IDs** to prevent injection attacks
3. **Rate limit report generation** to prevent abuse
4. **Audit all exports** via export logs (who, when, what)

---

## References

- **GenAI Reporting Docs**: `/docs/GenAI_Reporting.md`
- **OpenAPI Spec**: `/packages/openapi/v1-final/reporting.yaml`
- **Citation Validation**: `/services/reporting/src/lib/citations.ts`
- **PII Redaction**: `/services/reporting/src/lib/redaction.ts`
- **Template Manager**: `/services/reporting/src/lib/prompts/index.ts`
- **Generator UI**: `/apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/generators.astro`

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/teei/platform/issues
- **Internal Slack**: #teei-reporting-support
- **Email**: platform@teei.io

---

**Last Updated**: 2025-11-17
**Worker**: Worker 7 (Generators)
**Branch**: `claude/worker7-generators-case-study-01RisdpJ4jyc8S5DjNYdhTvV`
