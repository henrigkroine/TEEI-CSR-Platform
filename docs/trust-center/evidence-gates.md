# Evidence Gates Implementation

## Overview

Evidence Gates is a multi-layered validation system designed to prevent AI hallucinations in generated reports by enforcing the principle: **no evidence → no sentence**. This system ensures that every claim in AI-generated reports is backed by verifiable evidence from the platform's data sources.

## Purpose

Evidence Gates addresses the critical challenge of AI hallucination in enterprise reporting by:

1. **Pre-LLM Enforcement**: Instructing the AI model to cite evidence for every claim
2. **Post-LLM Validation**: Automatically verifying that all generated content includes proper citations
3. **Evidence Gate Blocking**: Rejecting reports that fail citation requirements with HTTP 422 errors
4. **Audit Trail**: Logging all validation results for compliance and transparency

## Three-Layer Defense

### Layer 1: Pre-LLM Prompt Engineering

**Purpose**: Instruct the AI model to cite evidence before generating content

**Implementation**:
```typescript
const systemPrompt = `
You are a professional CSR report writer. For every factual claim you make,
you MUST cite evidence using [cite:EVIDENCE_ID] format.

CRITICAL RULES:
1. Every paragraph MUST contain at least ${minCitationsPerParagraph} citation(s)
2. Aim for ${citationDensity} citations per 100 words
3. Only cite evidence IDs that exist in the provided evidence set
4. Place citations immediately after the claim they support
5. DO NOT generate content without supporting evidence

Example:
"Volunteers reported 85% satisfaction with buddy matching [cite:ev-001],
with 72% of participants showing improved confidence scores [cite:ev-002]."
`;
```

**Token Budget**:
- System prompt: ~200 tokens
- Evidence context: Variable (3,000-8,000 tokens depending on evidence count)
- Output budget: 2,000-5,000 tokens (configurable by template)

### Layer 2: Post-LLM Citation Validation

**Purpose**: Verify that generated content meets citation requirements

**Implementation**: `/services/reporting/src/lib/citations.ts:227-273`

```typescript
interface CitationValidationResult {
  valid: boolean;
  errors: string[];         // Blocking errors (if strictValidation: true)
  warnings: string[];       // Non-blocking warnings
  citationCount: number;
  paragraphCount: number;
  citationDensity: number; // Citations per 100 words
}

class CitationExtractor {
  validateCitations(
    content: string,
    evidenceSnippets: EvidenceSnippet[]
  ): CitationValidationResult {
    // 1. Extract all citations using regex: /\[cite:([^\]]+)\]/g
    // 2. Verify all citation IDs exist in evidenceSnippets
    // 3. Check citation density (citations per 100 words)
    // 4. Parse paragraphs and count citations per paragraph
    // 5. Return validation result with errors/warnings
  }
}
```

**Validation Checks**:
1. **Citation Count**: Ensure at least 1 citation exists
2. **Citation ID Validity**: All `[cite:ID]` references must match valid evidence IDs
3. **Citation Density**: Must meet minimum threshold (default: 0.5 per 100 words)
4. **Per-Paragraph Citations**: Each paragraph must have minimum citations (default: 1)

### Layer 3: Evidence Gate Enforcement

**Purpose**: Block report generation if citations are insufficient

**Implementation**: `/services/reporting/src/routes/gen-reports.ts:224-241`

```typescript
// Configuration
const citationConfig = {
  enforceEvidenceGates: true,        // NEW: Enable blocking
  blockOnMissingEvidence: true,      // NEW: Return 422 vs warning
  minCitationsPerParagraph: 1,       // Minimum per paragraph
  minCitationDensity: 0.5,           // Per 100 words
  strictValidation: true             // Throw errors vs warnings
};

// Validation
const validation = citationExtractor.validateCitations(
  generatedContent,
  evidenceSnippets
);

// Evidence Gate: Block if invalid
if (citationConfig.enforceEvidenceGates && !validation.valid) {
  return res.status(422).json({
    error: 'EvidenceGateViolation',
    message: `Report rejected: ${validation.errors.length} citation violations`,
    violations: validation.errors.map(error => ({
      type: 'CITATION_MISSING',
      message: error,
      severity: 'high'
    })),
    citationStats: {
      totalCitations: validation.citationCount,
      paragraphs: validation.paragraphCount,
      density: validation.citationDensity,
      minRequired: citationConfig.minCitationDensity
    }
  });
}
```

## Configuration

### Environment Variables

```bash
# Enable Evidence Gates
PUBLIC_FEATURE_EVIDENCE_GATES=true

# Minimum citations per paragraph (default: 1)
CITATION_MIN_PER_PARAGRAPH=1

# Minimum citation density per 100 words (default: 0.5)
CITATION_MIN_DENSITY=0.5

# Strict validation mode (errors vs warnings)
CITATION_STRICT_VALIDATION=true

# Block on missing evidence (HTTP 422)
CITATION_BLOCK_ON_MISSING=true
```

### Template-Specific Configuration

Different report templates can have different citation requirements:

```typescript
const templateConfigs = {
  'quarterly-report': {
    minCitationsPerParagraph: 1,
    minCitationDensity: 0.5,
    enforceEvidenceGates: true
  },
  'annual-report': {
    minCitationsPerParagraph: 2,      // Higher standard for annual
    minCitationDensity: 0.8,
    enforceEvidenceGates: true
  },
  'investor-update': {
    minCitationsPerParagraph: 1,
    minCitationDensity: 0.6,
    enforceEvidenceGates: true
  },
  'impact-deep-dive': {
    minCitationsPerParagraph: 2,      // Highest standard
    minCitationDensity: 1.0,
    enforceEvidenceGates: true
  }
};
```

## Error Response Format

### HTTP 422 Unprocessable Entity

When Evidence Gates block a report due to insufficient citations:

```json
{
  "error": "EvidenceGateViolation",
  "message": "Report rejected: 3 paragraphs lack citations",
  "violations": [
    {
      "type": "CITATION_MISSING",
      "paragraph": "This is a paragraph without evidence. It makes claims about volunteer satisfaction and program outcomes but provides no supporting evidence.",
      "citationCount": 0,
      "requiredCount": 1,
      "severity": "high"
    },
    {
      "type": "CITATION_DENSITY_LOW",
      "message": "Citation density 0.3 per 100 words is below minimum 0.5 (need 8 citations for 1,600 words)",
      "currentDensity": 0.3,
      "requiredDensity": 0.5,
      "severity": "high"
    }
  ],
  "citationStats": {
    "totalCitations": 5,
    "paragraphs": 8,
    "density": 0.3,
    "minRequired": 0.5,
    "wordCount": 1600
  },
  "suggestedActions": [
    "Add citations to paragraphs lacking evidence",
    "Increase citation density to meet threshold",
    "Remove unsupported claims from report",
    "Request additional evidence from data sources"
  ]
}
```

## Paragraph Parsing Logic

The citation validator uses intelligent paragraph parsing to avoid false positives:

```typescript
private parseParagraphs(content: string): string[] {
  const paragraphs = content.split(/\n\n+/).filter(p => {
    const trimmed = p.trim();

    // Skip empty lines
    if (trimmed.length === 0) return false;

    // Skip headers (starts with #)
    if (trimmed.startsWith('#')) return false;

    // Skip short paragraphs (<10 words or <50 chars)
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 10 || trimmed.length < 50) return false;

    return true;
  });

  return paragraphs;
}
```

**Exclusions**:
- Headers (lines starting with `#`)
- Short paragraphs (<10 words or <50 characters)
- Empty lines
- Table of contents
- Metadata sections

## Citation Format

### Standard Format

```markdown
Volunteers reported 85% satisfaction [cite:ev-001] with buddy matching,
and 72% showed improved confidence scores [cite:ev-002] after three sessions.
```

### Multiple Citations

```markdown
Program outcomes exceeded targets [cite:ev-003][cite:ev-004] across all
dimensions, with SROI reaching 4.2:1 [cite:ev-005].
```

### Invalid Formats

```markdown
❌ Volunteers reported high satisfaction (no citation)
❌ [cite:invalid-id] Citation with non-existent ID
❌ [cite ev-001] Missing colon
❌ cite:ev-001 Missing brackets
```

## Evidence Snippet Requirements

Evidence snippets must meet quality thresholds to be included:

```typescript
interface EvidenceSnippet {
  id: string;                    // UUID
  text: string;                  // Redacted snippet text
  dimension: string;             // e.g., "confidence", "job_readiness"
  relevanceScore?: number;       // 0.0 - 1.0 (ML-generated)
  outcomeScore?: number;         // Outcome dimension score
  source: string;                // Data source (survey, API, manual)
  confidence?: number;           // Data confidence level
  timestamp: string;             // Collection timestamp
  verified: boolean;             // Manual verification flag
}
```

**Quality Filters**:
- Relevance score ≥ 0.7 (configurable)
- Text length ≥ 20 characters
- PII redaction applied
- Verified or confidence ≥ 0.8

## Code References

### Implementation Files

| File | Purpose | Lines of Code |
|------|---------|---------------|
| `services/reporting/src/lib/citations.ts` | Citation extraction and validation | 400+ |
| `services/reporting/src/routes/gen-reports.ts` | Evidence gate enforcement | 500+ |
| `services/reporting/src/lib/evidence-gates.test.ts` | Unit tests | 300+ |
| `packages/event-contracts/src/reporting/evidence-gate-violation.ts` | Event contract | 50+ |

### Key Functions

**Citation Validation**:
```typescript
// File: services/reporting/src/lib/citations.ts:227-310
validateCitations(content: string, evidenceSnippets: EvidenceSnippet[]): CitationValidationResult
```

**Evidence Gate Enforcement**:
```typescript
// File: services/reporting/src/routes/gen-reports.ts:224-241
if (config.enforceEvidenceGates && !validation.valid) {
  return res.status(422).json({ /* ... */ });
}
```

**Paragraph Parsing**:
```typescript
// File: services/reporting/src/lib/citations.ts:205-218
parseParagraphs(content: string): string[]
```

## Testing

### Unit Tests

Run citation validation tests:

```bash
# Run evidence gates tests
pnpm test services/reporting/src/lib/evidence-gates.test.ts

# Run with coverage
pnpm test:coverage services/reporting/src/lib/evidence-gates.test.ts
```

**Test Coverage**:
- ✅ Citation format validation
- ✅ Citation ID existence checks
- ✅ Citation density calculation
- ✅ Per-paragraph citation counting
- ✅ Paragraph parsing logic
- ✅ HTTP 422 error responses
- ✅ Configuration overrides

### Integration Tests

```bash
# Run E2E tests including evidence gates
pnpm e2e:run tests/e2e/gen-reports.spec.ts
```

**Scenarios**:
1. Report with sufficient citations → 200 OK
2. Report with missing citations → 422 Unprocessable Entity
3. Report with invalid citation IDs → 422 Unprocessable Entity
4. Report with low citation density → 422 Unprocessable Entity
5. Evidence gates disabled → 200 OK (warnings only)

## Load Testing

Validate performance under load:

```bash
# Run k6 load tests
pnpm k6:run tests/load/k6-evidence-gates.js
```

**Performance Targets**:
- Citation validation: <50ms per report
- Evidence gate check: <10ms
- Total overhead: <100ms added to report generation

## Monitoring & Alerting

### Metrics to Track

1. **Evidence Gate Violations**:
   - Metric: `evidence_gate_violations_total`
   - Alert: >10% rejection rate (warning)
   - Dashboard: Grafana "Gen-AI Reporting" panel

2. **Citation Density**:
   - Metric: `citation_density_histogram`
   - Alert: p50 < 0.4 (warning - quality issue)
   - Dashboard: Histogram of citation density distribution

3. **Validation Performance**:
   - Metric: `citation_validation_duration_ms`
   - Alert: p95 > 100ms (performance degradation)
   - Dashboard: Response time panel

4. **Citation Count**:
   - Metric: `citation_count_per_report`
   - Alert: Mean < 10 (warning - insufficient evidence)
   - Dashboard: Time series chart

### Grafana Dashboard

```yaml
panels:
  - title: "Evidence Gate Violations"
    query: rate(evidence_gate_violations_total[5m])
    threshold: 0.1 # 10% rejection rate

  - title: "Citation Density Distribution"
    query: histogram_quantile(0.5, citation_density_histogram)

  - title: "Validation Performance (p95)"
    query: histogram_quantile(0.95, citation_validation_duration_ms)
    threshold: 100 # 100ms max

  - title: "Citations per Report (mean)"
    query: avg(citation_count_per_report)
```

## Troubleshooting

### High Rejection Rate

**Symptoms**: >20% of reports rejected by Evidence Gates

**Causes**:
- Insufficient evidence in data sources
- AI model not following citation instructions
- Citation thresholds too strict

**Solutions**:
1. Review prompt engineering (Layer 1)
2. Adjust `minCitationDensity` or `minCitationsPerParagraph`
3. Verify evidence extraction is pulling sufficient snippets
4. Check AI model temperature (lower = more conservative)

### Invalid Citation IDs

**Symptoms**: Reports contain `[cite:invalid-id]` with non-existent IDs

**Causes**:
- AI model hallucinating citation IDs
- Evidence snippets not properly passed to prompt

**Solutions**:
1. Strengthen system prompt: "ONLY cite IDs from this list: [ev-001, ev-002, ...]"
2. Verify evidence snippets are included in prompt context
3. Increase relevance score threshold to reduce evidence set size

### Performance Degradation

**Symptoms**: Citation validation takes >200ms

**Causes**:
- Large report size (>10,000 words)
- High paragraph count (>100 paragraphs)
- Inefficient regex matching

**Solutions**:
1. Cache validation results for identical content
2. Parallelize paragraph validation
3. Optimize regex pattern matching
4. Consider pagination for very large reports

## Best Practices

### For Developers

1. **Always Test with Real Evidence**:
   - Use production-like evidence snippets in tests
   - Validate citation IDs exist in evidence set
   - Test edge cases (0 citations, all invalid IDs)

2. **Monitor Validation Performance**:
   - Set up Grafana dashboards
   - Alert on p95 > 100ms
   - Profile slow validation runs

3. **Tune Configuration Per Template**:
   - Annual reports: Higher citation standards
   - Quarterly reports: Moderate standards
   - Investor updates: Focus on key metrics

### For Report Consumers

1. **Verify Citations in Trust Boardroom**:
   - Hover over evidence badges to see sources
   - Click through to Evidence Explorer for full context
   - Check evidence hash for tamper detection

2. **Review Rejected Reports**:
   - Check `violations` array in error response
   - Identify paragraphs lacking citations
   - Request additional evidence or revise content

3. **Trust the Evidence Gates**:
   - Reports that pass gates have verified citations
   - All claims are backed by platform data
   - Tamper detection ensures integrity

## Related Documentation

- [Evidence Ledger](./evidence-ledger.md) - Append-only audit trail for citations
- [Trust API Endpoints](../api/trust-endpoints.md) - Evidence and ledger APIs
- [GenAI Reporting](../GenAI_Reporting.md) - Complete Gen-AI reporting guide
- [Executive Packs](../cockpit/executive_packs.md) - Report export formats

## Future Enhancements

Planned improvements for Evidence Gates:

- [ ] Real-time citation validation during draft editing
- [ ] Citation suggestion engine (recommend missing citations)
- [ ] Evidence gap analysis (identify under-cited dimensions)
- [ ] Multi-language citation validation
- [ ] Citation quality scoring (not just count)
- [ ] Visual citation heatmap in report preview

## Support

For assistance with Evidence Gates:
- **Documentation**: `/docs/trust-center/evidence-gates.md`
- **Code**: `/services/reporting/src/lib/citations.ts`
- **Tests**: `/services/reporting/src/lib/evidence-gates.test.ts`
- **GitHub Issues**: Tag with `evidence-gates` label

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintained By**: Agent 5.1 - Technical Writer
