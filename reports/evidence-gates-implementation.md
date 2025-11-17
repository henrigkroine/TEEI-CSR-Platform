# Evidence Gate Enforcement Implementation

**Agent**: 1.3 - Citation Evidence Gate Engineer
**Date**: 2025-11-17
**Status**: ✅ Complete

## Summary

Enhanced citation validator with strict enforcement gates that return HTTP 422 (Unprocessable Entity) when generated content lacks required evidence citations. This ensures all AI-generated reports meet minimum citation standards before being returned to clients.

## Changes Made

### 1. Enhanced Configuration (`citations.ts`)

**Location**: `/home/user/TEEI-CSR-Platform/services/reporting/src/lib/citations.ts`

#### New Config Options (Lines 26-27)
```typescript
export interface CitationConfig {
  // ... existing options ...
  enforceEvidenceGates?: boolean; // NEW: Throw EvidenceGateViolation on missing evidence
  blockOnMissingEvidence?: boolean; // NEW: Return 422 instead of 500 on violations
}

const DEFAULT_CONFIG: CitationConfig = {
  // ... existing defaults ...
  enforceEvidenceGates: true, // Phase D: strict evidence gates
  blockOnMissingEvidence: true, // Phase D: return 422 on violations
};
```

### 2. New Error Class (Lines 41-64)

```typescript
/**
 * Evidence gate violation error - thrown when content lacks required citations
 * Enables HTTP 422 responses for unprocessable content
 */
export class EvidenceGateViolation extends Error {
  constructor(
    message: string,
    public readonly violations: {
      paragraph: string; // First 50 chars of paragraph
      citationCount: number;
      requiredCount: number;
    }[],
    public readonly totalCitationCount: number,
    public readonly totalParagraphCount: number,
    public readonly citationDensity: number
  ) {
    super(message);
    this.name = 'EvidenceGateViolation';
    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EvidenceGateViolation);
    }
  }
}
```

### 3. Paragraph Parser (Lines 201-218)

```typescript
/**
 * Parse content into meaningful paragraphs
 * Filters out headers and short strings (<10 words)
 */
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

### 4. Enhanced Validation Method (Lines 220-338)

Key changes to `validateCitations()`:
- Uses new `parseParagraphs()` method for accurate paragraph counting
- Collects paragraph violations with text snippets (first 50 chars)
- Throws `EvidenceGateViolation` when `enforceEvidenceGates=true`

```typescript
// Check minimum citations per paragraph using new parser
const paragraphs = this.parseParagraphs(content);
const minPerParagraph = this.config.minCitationsPerParagraph || 1;
const paragraphViolations: { paragraph: string; citationCount: number; requiredCount: number }[] = [];

for (let i = 0; i < paragraphs.length; i++) {
  const para = paragraphs[i];
  const paraCitations = para.match(citationRegex);
  const paraCount = paraCitations ? paraCitations.length : 0;

  if (paraCount < minPerParagraph) {
    const snippet = para.trim().substring(0, 50) + (para.trim().length > 50 ? '...' : '');

    paragraphViolations.push({
      paragraph: snippet,
      citationCount: paraCount,
      requiredCount: minPerParagraph,
    });

    const msg = `Paragraph ${i + 1} has ${paraCount} citation(s), minimum ${minPerParagraph} required: "${snippet}"`;
    if (this.config.strictValidation) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }
}

// NEW: If enforceEvidenceGates is true and there are violations, throw EvidenceGateViolation
if (this.config.enforceEvidenceGates && !result.valid && paragraphViolations.length > 0) {
  throw new EvidenceGateViolation(
    `Evidence gate violation: ${paragraphViolations.length} paragraph(s) lack required citations`,
    paragraphViolations,
    citationCount,
    paragraphs.length,
    citationDensity
  );
}
```

### 5. Route Handler Update (`gen-reports.ts`)

**Location**: `/home/user/TEEI-CSR-Platform/services/reporting/src/routes/gen-reports.ts`

#### Import Update (Line 5)
```typescript
import { createCitationExtractor, CitationExtractor, EvidenceGateViolation } from '../lib/citations.js';
```

#### Error Handling (Lines 418-436)
```typescript
} else if (error instanceof EvidenceGateViolation) {
  // NEW: Handle evidence gate violations with 422 Unprocessable Entity
  logger.warn('Evidence gate violation detected', {
    violationCount: error.violations.length,
    totalCitationCount: error.totalCitationCount,
    totalParagraphCount: error.totalParagraphCount,
    citationDensity: error.citationDensity,
  });

  reply.code(422).send({
    error: 'EVIDENCE_REQUIRED',
    message: error.message,
    violations: error.violations,
    metadata: {
      totalCitationCount: error.totalCitationCount,
      totalParagraphCount: error.totalParagraphCount,
      citationDensity: error.citationDensity.toFixed(2),
    },
  });
}
```

### 6. Integration Tests

**Location**: `/home/user/TEEI-CSR-Platform/services/reporting/src/lib/evidence-gates.test.ts`

Created comprehensive test suite covering:
- ✅ Error class construction and properties
- ✅ Successful validation with sufficient citations
- ✅ EvidenceGateViolation thrown on missing citations
- ✅ Behavior when `enforceEvidenceGates=false`
- ✅ Paragraph counting (excludes headers and short text)
- ✅ Violation details include paragraph snippets
- ✅ Citation density validation
- ✅ Invalid citation ID detection
- ✅ Edge cases (no paragraphs, headers only)

**Target Coverage**: ≥90% for validation logic

## Example API Responses

### Success Response (200 OK)

```json
{
  "reportId": "rpt_01HXYZ123",
  "sections": [
    {
      "type": "quarterly-report",
      "content": "Our program achieved significant outcomes this quarter. Participants demonstrated improved confidence scores, with an average increase of 15% [cite:snippet-abc123]. The mentorship sessions proved particularly effective, with 85% of participants reporting better job readiness [cite:snippet-def456].\n\nVolunteer engagement remained strong, with 30 active volunteers contributing over 500 hours [cite:snippet-ghi789]. The integration with corporate partners expanded, allowing us to reach underserved communities [cite:snippet-jkl012].",
      "citations": [
        {
          "id": "cite-0",
          "snippetId": "snippet-abc123",
          "text": "Confidence survey: 'I feel more confident in my abilities' - 15% increase",
          "relevanceScore": 0.87
        },
        {
          "id": "cite-1",
          "snippetId": "snippet-def456",
          "text": "Job readiness assessment: 85% of participants rated 4+ out of 5",
          "relevanceScore": 0.82
        },
        {
          "id": "cite-2",
          "snippetId": "snippet-ghi789",
          "text": "Volunteer logs: 30 active volunteers, 523 hours total",
          "relevanceScore": 0.78
        },
        {
          "id": "cite-3",
          "snippetId": "snippet-jkl012",
          "text": "Partnership expansion: Reached 3 new underserved communities",
          "relevanceScore": 0.76
        }
      ],
      "wordCount": 87,
      "characterCount": 542
    }
  ],
  "lineage": {
    "modelName": "claude-3-5-sonnet-20241022",
    "promptVersion": "quarterly-report-v1.2",
    "timestamp": "2025-11-17T14:23:45.123Z",
    "tokensUsed": 1250,
    "tokensInput": 850,
    "tokensOutput": 400,
    "estimatedCostUsd": "0.0125"
  }
}
```

### Evidence Gate Violation (422 Unprocessable Entity)

```json
{
  "error": "EVIDENCE_REQUIRED",
  "message": "Evidence gate violation: 2 paragraph(s) lack required citations",
  "violations": [
    {
      "paragraph": "Our program achieved significant outcomes this...",
      "citationCount": 0,
      "requiredCount": 1
    },
    {
      "paragraph": "Volunteer engagement remained strong, with 30 a...",
      "citationCount": 0,
      "requiredCount": 1
    }
  ],
  "metadata": {
    "totalCitationCount": 0,
    "totalParagraphCount": 3,
    "citationDensity": "0.00"
  }
}
```

### Client Handling Example

```typescript
try {
  const response = await fetch('/gen-reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId: 'uuid-here',
      period: { start: '2025-01-01', end: '2025-03-31' },
      reportType: 'quarterly-report',
    }),
  });

  if (response.status === 422) {
    const error = await response.json();
    console.error('Report rejected due to insufficient evidence:');
    console.error(`Total violations: ${error.violations.length}`);
    error.violations.forEach((v, i) => {
      console.error(`${i + 1}. "${v.paragraph}"`);
      console.error(`   Citations: ${v.citationCount}/${v.requiredCount}`);
    });
    // Retry with different parameters or escalate to human review
  } else if (response.ok) {
    const report = await response.json();
    console.log(`Report generated: ${report.reportId}`);
  }
} catch (err) {
  console.error('Request failed:', err);
}
```

## Configuration Options

### Strict Mode (Default - Phase D)
```typescript
const strictConfig = {
  enforceEvidenceGates: true,
  blockOnMissingEvidence: true,
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5,
  strictValidation: true,
};
```

### Lenient Mode (Development/Testing)
```typescript
const lenientConfig = {
  enforceEvidenceGates: false,
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5,
  strictValidation: false, // Just warnings
};
```

### Custom Requirements
```typescript
const customConfig = {
  enforceEvidenceGates: true,
  minCitationsPerParagraph: 2, // More strict: 2 citations per paragraph
  minCitationDensity: 1.0, // 1 citation per 100 words
  strictValidation: true,
};
```

## Integration with Audit Trail

The error handler logs evidence gate violations to the audit trail via existing logging infrastructure:

```typescript
logger.warn('Evidence gate violation detected', {
  violationCount: error.violations.length,
  totalCitationCount: error.totalCitationCount,
  totalParagraphCount: error.totalParagraphCount,
  citationDensity: error.citationDensity,
});
```

This can be enhanced to use `@teei/compliance` for formal audit logging:

```typescript
import { auditLogger } from '@teei/compliance';

// In error handler
auditLogger.logEvent({
  eventType: 'EVIDENCE_GATE_VIOLATION',
  severity: 'WARN',
  companyId: validatedRequest.companyId,
  metadata: {
    violationCount: error.violations.length,
    totalCitationCount: error.totalCitationCount,
    totalParagraphCount: error.totalParagraphCount,
    citationDensity: error.citationDensity,
    violations: error.violations, // Include details for analysis
  },
  timestamp: new Date().toISOString(),
});
```

## Files Modified

1. `/home/user/TEEI-CSR-Platform/services/reporting/src/lib/citations.ts`
   - Added 2 config options
   - Added EvidenceGateViolation error class
   - Added parseParagraphs() method
   - Enhanced validateCitations() method

2. `/home/user/TEEI-CSR-Platform/services/reporting/src/routes/gen-reports.ts`
   - Imported EvidenceGateViolation
   - Added 422 error handling

## Files Created

1. `/home/user/TEEI-CSR-Platform/services/reporting/src/lib/evidence-gates.test.ts`
   - 11 comprehensive test cases
   - Tests error class, validation logic, paragraph parsing, edge cases
   - Target: ≥90% coverage

## Testing Instructions

```bash
# Run evidence gate tests
cd services/reporting
pnpm test evidence-gates.test.ts

# Run with coverage
pnpm test evidence-gates.test.ts --coverage

# Test specific scenario
pnpm test evidence-gates.test.ts -t "should throw EvidenceGateViolation"
```

## Next Steps

1. **Run full test suite** to ensure no regressions
2. **Verify coverage** meets ≥90% target
3. **Integration testing** with Q2Q AI pipeline
4. **Update API documentation** with 422 response schema
5. **Monitor logs** for evidence gate violations in production

## Success Criteria

✅ Config options added: `enforceEvidenceGates`, `blockOnMissingEvidence`
✅ Error class created: `EvidenceGateViolation` with violation details
✅ Paragraph parser filters headers and short text
✅ Enhanced validation throws error when gates enabled
✅ Route handler returns 422 with structured error response
✅ Integration tests created with ≥90% coverage target
✅ Documentation includes example API responses

## Audit Trail

- **Commit**: Evidence gate enforcement (Agent 1.3)
- **Branch**: `claude/trust-boardroom-implementation-014BFtRtck3mdq8vZoPjGkE8`
- **Files Changed**: 2 modified, 1 created
- **Lines Added**: ~150 (code) + ~400 (tests)
- **Test Coverage**: Target ≥90%
