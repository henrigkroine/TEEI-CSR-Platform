# Gen-AI Reporting System

**Version**: 1.0 (Phase D)
**Last Updated**: 2025-11-14
**Status**: ✅ Production Ready (Pilot)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Report Templates](#report-templates)
4. [Evidence & Citations](#evidence--citations)
5. [PII Redaction](#pii-redaction)
6. [API Reference](#api-reference)
7. [Security & Compliance](#security--compliance)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

The Gen-AI Reporting System generates evidence-based CSR impact reports using Large Language Models (LLMs) with strict citation and redaction requirements. All generated narratives must cite source evidence and contain zero PII leaks.

### Key Features

✅ **4 Report Templates**: Quarterly, Annual, Investor Update, Impact Deep Dive
✅ **Evidence Lineage**: Every claim linked to source evidence IDs
✅ **Citation Enforcement**: Minimum 1 citation per paragraph, configurable density
✅ **PII Redaction**: Automatic scrubbing before LLM processing with leak detection
✅ **Cost Tracking**: Per-report token usage and cost logging
✅ **CSRD Alignment**: Annual reports aligned with EU reporting standards
✅ **Multi-locale**: Support for EN, ES, FR, UK, NO

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│          POST /gen-reports/generate                     │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  1. Evidence Extraction   │  ← Query outcome_scores + evidence_snippets
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  2. PII Redaction         │  ← Redact email, phone, SSN, etc.
    │     + Leak Detection      │  ← Validate no PII in redacted text
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  3. Metrics Fetch         │  ← SROI, VIS, outcome scores
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  4. Template Rendering    │  ← Handlebars prompt + evidence
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  5. LLM Generation        │  ← OpenAI / Anthropic API
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  6. Citation Validation   │  ← Fail if min density not met
    │     (Strict Mode)         │  ← Check 1+ citation per paragraph
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  7. Lineage Storage       │  ← Store metadata, citations, cost
    └───────────┬───────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │  8. Response              │  ← Report ID, sections, warnings
    └───────────────────────────┘
```

---

## Report Templates

### 1. Quarterly Report

**Use Case**: Internal stakeholders, program managers, HR leadership
**Frequency**: Quarterly (Q1-Q4)
**Length**: 750-1000 words
**Sections**:
- Executive Summary (100-150 words)
- Program Highlights (200-250 words)
- Outcome Analysis (200-250 words)
- SROI & Value Creation (150-200 words)
- Next Quarter Outlook (100-120 words)

**Template**: `quarterly-report.en.hbs`

**Example Request**:
```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "period": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  },
  "reportType": "quarterly-report",
  "locale": "en",
  "deterministic": true,
  "temperature": 0.3,
  "maxTokens": 3000
}
```

**Key Metrics**:
- Participants, sessions, volunteers
- SROI ratio, VIS score
- 5 outcome dimensions (confidence, belonging, job readiness, language, well-being)
- Quarter-over-quarter trends

---

### 2. Annual Report

**Use Case**: Board of Directors, external auditors, ESG investors, regulatory bodies
**Frequency**: Annually
**Length**: 2000-2500 words
**Framework**: CSRD-aligned, ESRS S3, GRI 413

**Sections**:
- Letter from Leadership (200-250 words)
- Program Overview & Theory of Change (300-350 words)
- Double Materiality Assessment (250-300 words)
- Outcome Analysis by Dimension (500-600 words, 5 dimensions)
- SROI & Economic Value Creation (300-350 words)
- Assurance & Governance (200-250 words)
- Forward-Looking Statements (150-200 words)

**Template**: `annual-report.en.hbs`

**CSRD Alignment**:
- **ESRS S3** (Affected Communities): Social integration metrics
- **GRI 413** (Local Communities): Participant outcomes
- **UN SDGs**: SDG 4 (Education), SDG 8 (Decent Work), SDG 10 (Reduced Inequalities)

**Materiality**:
- **Financial Materiality**: Talent pipeline, workforce diversity, license to operate
- **Impact Materiality**: Employment, well-being, social inclusion

---

### 3. Investor Update

**Use Case**: Impact investors, ESG funds, CSR investment committees, philanthropic partners
**Frequency**: Ad-hoc (quarterly or semi-annual)
**Length**: 1200-1500 words
**Focus**: SROI, ROI, ESG risk mitigation

**Sections**:
- Executive Summary (120-150 words) - Lead with SROI
- SROI Methodology & Assumptions (250-300 words)
- Portfolio Performance: Outcome Dimensions (300-350 words)
- Volunteer Capital Efficiency (VIS Deep Dive) (200-250 words)
- ESG Risk Mitigation & Upside (200-250 words)
- Forward Guidance & Investment Case (120-150 words)

**Template**: `investor-update.en.hbs`

**SROI Calculation**:
```
SROI = Social Value Created / Investment

Investment (Denominator):
- Volunteer time @ market rate (€X/hour × hours)
- Program operational costs
- Overhead allocation

Social Value (Numerator):
- Employment outcomes (salary × duration)
- Tax revenue contributions
- Reduced social service costs
- Well-being improvements (QALYs)
```

**VIS (Volunteer Impact Score)**: Measures volunteer leverage and effectiveness (0-100 scale)

---

### 4. Impact Deep Dive

**Use Case**: Program designers, academic partners, impact evaluators, foundation officers
**Frequency**: Ad-hoc (when deep analysis needed)
**Length**: 3500-4000 words
**Methodology**: Q2Q mixed-methods analysis

**Sections**:
- Introduction: Study Design & Q2Q Methodology (250-300 words)
- 5 Outcome Dimension Deep Dives (400-450 words each):
  * Confidence & Self-Efficacy
  * Social Integration & Belonging
  * Economic Empowerment (Job Readiness)
  * Language Acquisition Proxy
  * Psychological Well-being
- Cross-Cutting Themes & Interactions (250-300 words)
- Volunteer Impact & VIS Analysis (250-300 words)
- Limitations & Future Research (200-250 words)
- Synthesis & Recommendations (250-300 words)

**Template**: `impact-deep-dive.en.hbs`

**Q2Q Methodology**:
- AI-powered extraction of outcome signals from participant feedback
- Data sources: buddy check-ins, session feedback, mentor notes
- AI classification with confidence scores (0-1 scale)
- Human validation and inter-rater reliability checks

---

## Evidence & Citations

### Evidence Extraction

Evidence snippets are extracted from the `evidence_snippets` and `outcome_scores` tables:

```typescript
evidenceSnippets = await citationExtractor.extractEvidence(
  companyId,
  periodStart,
  periodEnd,
  dimensions // optional filter
);
```

**Filtering**:
- **Period**: Only evidence within start/end dates
- **Confidence**: Minimum 0.5 confidence score (configurable)
- **Relevance**: Scored by formula: `(outcome_score × 0.5) + (confidence × 0.3) + (text_quality × 0.2)`
- **Balance**: Max 5 snippets per dimension (configurable)

### Citation Format

Citations use the format `[cite:EVIDENCE_ID]` inline:

```
Participants showed 85% confidence improvement [cite:abc-123]
and reported increased belonging [cite:def-456] through
mentor relationships [cite:ghi-789].
```

### Citation Validation

**Strict Mode** (enabled by default in Phase D):

| Metric | Requirement | Configurable |
|--------|-------------|--------------|
| **Minimum per paragraph** | 1 citation | ✅ `minCitationsPerParagraph` |
| **Citation density** | 0.5 per 100 words | ✅ `minCitationDensity` |
| **Valid IDs** | All IDs must exist in evidence set | ❌ |
| **Fail-fast** | Throw error if validation fails | ✅ `strictValidation` |

**Configuration**:
```typescript
{
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5,
  strictValidation: true
}
```

**Validation Output**:
```typescript
{
  valid: boolean,
  errors: string[],      // Fatal errors (fail generation)
  warnings: string[],    // Non-fatal issues
  citationCount: number,
  paragraphCount: number,
  citationDensity: number // per 100 words
}
```

**Edge Cases**:
- Headers (lines starting with `#`) are skipped
- Short paragraphs (<50 chars) are skipped
- Empty paragraphs are skipped

---

## PII Redaction

### Why Redaction?

Participant feedback may contain personally identifiable information (PII). Before sending evidence to LLMs, all PII must be redacted to comply with GDPR and prevent data leaks.

### Redaction Process

```
┌─────────────────────┐
│ Original Evidence   │  "My email is john@example.com and I got the job!"
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PII Detection       │  Detect: email pattern
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Redaction           │  "My email is [EMAIL_REDACTED_0] and I got the job!"
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validation          │  Check: no PII in redacted text
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send to LLM         │  ✅ Safe to process
└─────────────────────┘
```

### PII Patterns

| Type | Pattern | Placeholder | Aggressive Mode |
|------|---------|-------------|-----------------|
| **Email** | `user@domain.com` | `[EMAIL_REDACTED]` | Always |
| **Phone** | `+47 123 45 678` | `[PHONE_REDACTED]` | Always |
| **SSN** | `123-45-6789` | `[SSN_REDACTED]` | Always |
| **Credit Card** | `1234-5678-9012-3456` | `[CARD_REDACTED]` | Always |
| **IP Address** | `192.168.1.1` | `[IP_REDACTED]` | Always |
| **Names** | `John Smith` | `[NAME_REDACTED]` | Only in aggressive mode |

**Aggressive Mode**: Set `REDACTION_AGGRESSIVE=true` to redact possible names. Use with caution as it may over-redact.

### Redaction Validation

After redaction, all snippets are validated:

```typescript
for (const snippet of redactedSnippets) {
  const validation = redactionEnforcer.validate(snippet.text);
  if (!validation.isValid) {
    throw new Error(`PII leak detected: ${validation.violations.join(', ')}`);
  }
}
```

If any PII pattern is detected **after** redaction, the entire generation fails with an error.

### Audit Logging

Redaction events are logged for audit:

```json
{
  "event": "PII_REDACTION_COMPLETE",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "totalSnippets": 25,
  "totalRedactions": 7,
  "redactionTimeMs": 45,
  "timestamp": "2024-11-14T10:30:00Z"
}
```

**No PII is logged** - only redaction counts.

---

## API Reference

### POST /gen-reports/generate

Generate an AI-powered report with citations.

**Request**:
```typescript
{
  companyId: string;          // UUID of company
  period: {
    start: string;            // ISO 8601 date
    end: string;              // ISO 8601 date
  };
  reportType?: 'quarterly-report' | 'annual-report' | 'investor-update' | 'impact-deep-dive';
  sections?: string[];        // Alternative to reportType (legacy)
  locale?: 'en' | 'es' | 'fr' | 'uk' | 'no';  // Default: 'en'
  deterministic?: boolean;    // Use fixed seed for reproducibility
  temperature?: number;       // 0-2, default varies by model
  maxTokens?: number;         // 100-8000, default varies by template
}
```

**Response**:
```typescript
{
  reportId: string;           // UUID for lineage tracking
  sections: [
    {
      type: string;           // Section/report type
      content: string;        // Generated narrative with citations
      citations: [
        {
          id: string;         // Citation UUID
          snippetId: string;  // Evidence snippet ID
          text: string;       // Evidence text (redacted)
          relevanceScore?: number;
        }
      ],
      wordCount: number,
      characterCount: number
    }
  ],
  lineage: {
    modelName: string;        // e.g., "gpt-4-turbo"
    promptVersion: string;    // e.g., "quarterly-report-en-v1.0"
    timestamp: string,
    tokensUsed: number,
    tokensInput: number,
    tokensOutput: number,
    estimatedCostUsd: string  // e.g., "0.0245"
  },
  warnings?: string[]         // Non-fatal issues
}
```

**Error Responses**:

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Validation error | Invalid request schema |
| `403` | Access denied | User lacks access to company |
| `500` | Citation validation failed | Insufficient citations or invalid IDs |
| `500` | PII redaction failed | PII detected after redaction |
| `500` | LLM API error | OpenAI/Anthropic API failure |
| `429` | Rate limit exceeded | Too many requests |

**Example**:
```bash
curl -X POST https://api.teei.io/v1/gen-reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "period": {
      "start": "2024-01-01",
      "end": "2024-03-31"
    },
    "reportType": "quarterly-report",
    "locale": "en",
    "deterministic": true
  }'
```

---

### GET /gen-reports/cost-summary

Get cost summary for generated reports.

**Response**:
```typescript
{
  totalRequests: number,
  totalTokensInput: number,
  totalTokensOutput: number,
  totalTokens: number,
  totalCostUsd: string,
  averageCostPerRequest: string,
  models: {
    [modelName: string]: {
      requests: number,
      tokens: number,
      costUsd: string
    }
  }
}
```

**Example**:
```bash
curl https://api.teei.io/v1/gen-reports/cost-summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security & Compliance

### GDPR Compliance

✅ **Data Minimization**: Only relevant evidence snippets extracted
✅ **PII Redaction**: Automatic scrubbing before LLM processing
✅ **Leak Detection**: Validation ensures no PII in generated content
✅ **Audit Trail**: All redactions logged (counts only, no PII)
✅ **Access Control**: RBAC enforces company-scoped access
✅ **Data Retention**: Reports stored with configurable TTL

### CSRD (Corporate Sustainability Reporting Directive)

✅ **Double Materiality**: Annual reports assess financial + impact materiality
✅ **ESRS Standards**: Aligned with ESRS S3 (Affected Communities)
✅ **Evidence Lineage**: Every claim traceable to source data
✅ **Assurance Ready**: Citation system supports external audit
✅ **Stakeholder Disclosure**: Participant outcomes as stakeholder impact

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **PII Leak to LLM** | Pre-LLM redaction with validation |
| **PII Leak in Output** | Post-generation validation (future enhancement) |
| **Invalid Citations** | Strict validation, fail-fast on missing citations |
| **Cross-Tenant Access** | RBAC enforcement, company-scoped queries |
| **LLM Prompt Injection** | Evidence snippets are data, not instructions |
| **Cost Overruns** | Rate limiting, token budgets, cost tracking |

---

## Troubleshooting

### Error: "Citation validation failed"

**Symptom**: Report generation fails with citation errors.

**Causes**:
1. LLM did not include enough citations
2. Citation IDs don't match evidence set
3. Paragraphs missing citations

**Solutions**:
1. Increase `maxTokens` to allow more detailed output
2. Lower `temperature` for more deterministic citations
3. Check evidence availability for the period
4. Adjust `minCitationsPerParagraph` if too strict

**Temporary Workaround** (non-production):
```typescript
// Disable strict validation (NOT recommended for production)
const citationExtractor = createCitationExtractor({
  strictValidation: false,
  minCitationsPerParagraph: 0
});
```

---

### Error: "PII redaction failed"

**Symptom**: Report generation fails with PII leak error.

**Causes**:
1. Redaction pattern missed a PII variant
2. New PII type not in patterns

**Solutions**:
1. Enable aggressive mode: `REDACTION_AGGRESSIVE=true`
2. Add custom PII patterns to `/lib/redaction.ts`
3. Report false positives to the platform team

**Check Redaction**:
```typescript
const redactionEnforcer = createRedactionEnforcer();
const result = redactionEnforcer.redact("Test text with john@example.com");
console.log(result.redactedText); // "Test text with [EMAIL_REDACTED_0]"
console.log(result.piiDetected);  // ["email"]
```

---

### Error: "Insufficient evidence found"

**Symptom**: Warning in response, low-quality report.

**Causes**:
1. No data for the specified period
2. Outcome scores not yet generated (Q2Q pipeline lag)
3. Company has no participants in period

**Solutions**:
1. Check Q2Q pipeline status
2. Verify participant activity in period
3. Adjust period dates to include more data
4. Check evidence extraction filters

---

### High Costs

**Symptom**: LLM costs higher than expected.

**Causes**:
1. Long reports (e.g., Impact Deep Dive at 3500-4000 words)
2. High `maxTokens` setting
3. Expensive model (gpt-4-turbo vs gpt-3.5-turbo)
4. Large evidence set passed to LLM

**Solutions**:
1. Use cheaper models for non-critical reports: `claude-3-haiku`, `gpt-3.5-turbo`
2. Reduce `maxTokens`: Quarterly (3000), Investor (4000), Annual (6000), Deep Dive (8000)
3. Enable `deterministic: true` to cache prompts
4. Limit evidence snippets with `maxSnippetsPerDimension: 3`

**Cost Estimation** (approximate):
| Report Type | Model | Tokens | Cost (USD) |
|-------------|-------|--------|------------|
| Quarterly | GPT-4 Turbo | ~3000 | $0.10 |
| Annual | GPT-4 Turbo | ~6000 | $0.20 |
| Investor | GPT-4 Turbo | ~4000 | $0.13 |
| Deep Dive | GPT-4 Turbo | ~8000 | $0.27 |

---

## Best Practices

### 1. Choose the Right Report Type

| Report Type | Audience | Frequency | Detail Level |
|-------------|----------|-----------|--------------|
| **Quarterly** | Internal | Quarterly | Medium |
| **Annual** | External/Board | Annually | High |
| **Investor** | Investors/Funds | Ad-hoc | ROI-focused |
| **Deep Dive** | Researchers | Ad-hoc | Very High |

### 2. Optimize Evidence Quality

**Before Generation**:
1. Ensure Q2Q pipeline has processed recent feedback
2. Verify outcome scores are up-to-date
3. Check evidence snippet count for period
4. Review confidence scores (aim for >0.7 avg)

**During Generation**:
1. Use `deterministic: true` for consistent results
2. Set appropriate `temperature`: 0.3 for factual, 0.7 for creative
3. Provide specific `sections` if not using full report type

### 3. Citation Density Guidelines

| Report Type | Expected Density | Min Citations (1000 words) |
|-------------|------------------|----------------------------|
| Quarterly | 1.0-1.5 per 100 words | 10-15 |
| Annual | 1.5-2.0 per 100 words | 15-20 |
| Investor | 1.0-1.5 per 100 words | 10-15 |
| Deep Dive | 2.0-3.0 per 100 words | 20-30 |

### 4. PII Redaction Best Practices

1. **Always use aggressive mode for investor reports**: `REDACTION_AGGRESSIVE=true`
2. **Test redaction before production**: Use `/lib/redaction.ts` utility
3. **Audit logs regularly**: Check for high redaction counts (may indicate data quality issues)
4. **Never restore PII**: The `restore()` function is for debugging only

### 5. Cost Optimization

**Use Case-Appropriate Models**:
- **Production/Board Reports**: GPT-4 Turbo, Claude 3 Opus (highest quality)
- **Internal Quarterly Reports**: GPT-4, Claude 3 Sonnet (good quality, lower cost)
- **Drafts/Testing**: GPT-3.5 Turbo, Claude 3 Haiku (fast, cheap)

**Token Budget Recommendations**:
```typescript
{
  "quarterly-report": { maxTokens: 3000, temperature: 0.3 },
  "annual-report": { maxTokens: 6000, temperature: 0.2 },
  "investor-update": { maxTokens: 4000, temperature: 0.3 },
  "impact-deep-dive": { maxTokens: 8000, temperature: 0.5 }
}
```

### 6. Error Handling

**Retry Logic**:
```typescript
async function generateWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch('/gen-reports/generate', { body: request });
    } catch (error) {
      if (error.message.includes('rate limit')) {
        await sleep(2 ** i * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Graceful Degradation**:
- If citations fail, fall back to template-only mode (future enhancement)
- If evidence sparse, show warning but allow generation
- If LLM unavailable, queue request for async processing

---

## Appendix: Template Metadata

| Template | Version | Word Count | Avg Tokens | Avg Cost (GPT-4) | CSRD Aligned | Pilot Ready |
|----------|---------|------------|------------|------------------|--------------|-------------|
| `quarterly-report.en.hbs` | v1.0 | 750-1000 | 3000 | $0.10 | ❌ | ✅ |
| `annual-report.en.hbs` | v1.0 | 2000-2500 | 6000 | $0.20 | ✅ | ✅ |
| `investor-update.en.hbs` | v1.0 | 1200-1500 | 4000 | $0.13 | Partial | ✅ |
| `impact-deep-dive.en.hbs` | v1.0 | 3500-4000 | 8000 | $0.27 | ❌ | ✅ |

---

## Support

**Documentation**: `/docs/GenAI_Reporting.md` (this file)
**API Docs**: `/docs/api/gen-reports.yaml` (OpenAPI)
**Runbook**: `/docs/Exports_Scheduling.md` (future)
**Issues**: Report bugs at [GitHub Issues](https://github.com/henrigkroine/TEEI-CSR-Platform/issues)

**Contact**:
- Platform Team: [email protected]
- Security Issues: [email protected]

---

**End of Document**
