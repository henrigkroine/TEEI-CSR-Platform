# Generative Reporting Assistant - Technical Documentation

**Version**: 1.1
**Date**: 2025-11-14
**Owner**: AI & Safety Lead (Worker 3)
**Status**: ✅ IMPLEMENTED

---

## Overview

The Generative Reporting Assistant is an AI-powered feature that transforms quantitative metrics and qualitative evidence into comprehensive, narrative-style CSR reports. Every claim in the generated report is backed by **evidence citations** for auditability and regulatory compliance (CSRD, GRI, etc.).

---

## Architecture

### System Flow

```
User clicks "Generate Report"
       ↓
Frontend (GenerateReportModal.tsx)
       ↓
POST /reporting/gen-reports:generate
       ↓
Backend (gen-reports.ts)
       ├→ Fetch metrics from database
       ├→ Fetch Q2Q evidence with lineage
       ├→ Apply prompt template
       ├→ Call LLM API (OpenAI/Claude)
       ├→ Parse response + extract citations
       ├→ Apply PII redaction rules
       ├→ Validate citations exist
       └→ Return narrative + citations
       ↓
Frontend displays preview
       ↓
User edits text (optional)
       ↓
Export to PDF (with citations in footnotes)
```

---

## API Endpoint

### `POST /reporting/gen-reports:generate`

**Authentication**: Bearer token (JWT)
**Authorization**: `company_user` or `admin` role
**Rate Limit**: 10 requests per 10 minutes per user

#### Request Body

```typescript
interface GenerateReportRequest {
  companyId: string;           // Tenant ID
  period: {
    start: string;             // ISO 8601 date (e.g., "2025-10-01")
    end: string;               // ISO 8601 date (e.g., "2025-12-31")
  };
  filters?: {
    programs?: string[];       // e.g., ["buddy", "language"]
    cohorts?: string[];        // e.g., ["cohort-2025-Q4"]
    metrics?: string[];        // e.g., ["sroi", "vis", "integration_score"]
  };
  options?: {
    seed?: number;             // Deterministic seed for reproducibility
    maxTokens?: number;        // Token budget (default: 4000)
    temperature?: number;      // Model creativity (default: 0.3)
    language?: "en" | "no" | "uk"; // Report language (default: "en")
  };
}
```

#### Response Body

```typescript
interface GenerateReportResponse {
  reportId: string;            // Unique report ID (for audit log)
  generatedAt: string;         // ISO 8601 timestamp
  narrative: {
    sections: Section[];       // Structured narrative sections
    citations: Citation[];     // Evidence citations
  };
  metadata: {
    model: string;             // e.g., "gpt-4-turbo-2025-05-13"
    promptVersion: string;     // e.g., "v2.1"
    tokensUsed: number;        // Total tokens consumed
    seed?: number;             // Seed used (if provided)
  };
}

interface Section {
  title: string;               // e.g., "Executive Summary"
  content: string;             // Narrative text with [citation:ID] markers
  order: number;               // Display order
}

interface Citation {
  id: string;                  // Citation ID (e.g., "cite-001")
  evidenceId: string;          // Q2Q evidence snippet ID
  snippetText: string;         // Anonymized snippet (redacted)
  source: string;              // e.g., "Buddy feedback, 2025-Q4"
  confidence: number;          // Model confidence (0-1)
}
```

#### Example Request

```json
{
  "companyId": "uuid-company-123",
  "period": {
    "start": "2025-10-01",
    "end": "2025-12-31"
  },
  "filters": {
    "programs": ["buddy", "language"],
    "metrics": ["sroi", "vis", "integration_score"]
  },
  "options": {
    "seed": 42,
    "maxTokens": 3000,
    "temperature": 0.3,
    "language": "en"
  }
}
```

#### Example Response

```json
{
  "reportId": "report-uuid-456",
  "generatedAt": "2025-11-14T14:30:00Z",
  "narrative": {
    "sections": [
      {
        "title": "Executive Summary",
        "content": "In Q4 2025, your CSR programs achieved a 3.2x Social Return on Investment (SROI) [citation:cite-001] with significant improvements in participant confidence [citation:cite-002] and belonging [citation:cite-003]. The Buddy program saw 89% completion rates [citation:cite-004], while Language Connect participants progressed an average of 1.2 CEFR levels [citation:cite-005].",
        "order": 1
      },
      {
        "title": "Impact Metrics",
        "content": "Participants reported increased self-confidence [citation:cite-002], with feedback such as \"I feel more capable\" [citation:cite-006] and \"My communication skills improved\" [citation:cite-007]. Social integration scores increased by 24% [citation:cite-008].",
        "order": 2
      }
    ],
    "citations": [
      {
        "id": "cite-001",
        "evidenceId": "evidence-uuid-789",
        "snippetText": "Average SROI ratio across all programs: 3.2",
        "source": "Aggregated metrics, Q1 2024",
        "confidence": 0.95
      },
      {
        "id": "cite-002",
        "evidenceId": "evidence-uuid-790",
        "snippetText": "Confidence score increased from 0.65 to 0.82",
        "source": "Q2Q outcome analysis, Buddy program",
        "confidence": 0.88
      }
      // ... more citations
    ]
  },
  "metadata": {
    "model": "gpt-4-turbo-2025-05-13",
    "promptVersion": "v2.1",
    "tokensUsed": 2847,
    "seed": 42
  }
}
```

---

## Prompt Engineering

### Prompt Template Structure

**Prompt file**: `services/reporting/prompts/quarterlyReport.ts`

```typescript
export const quarterlyReportPrompt = (
  metrics: Metrics,
  evidence: Evidence[],
  period: Period,
  company: Company
) => `
You are a CSR reporting assistant for ${company.name}. Generate a professional quarterly report for ${period.start} to ${period.end}.

## Data Provided

Metrics:
- SROI: ${metrics.sroi}
- VIS: ${metrics.vis}
- Integration Score: ${metrics.integrationScore}
- Participants: ${metrics.participantCount}
- Completion Rate: ${metrics.completionRate}

Evidence Snippets (Q2Q analyzed):
${evidence.map(e => `- [${e.id}] ${e.snippetText} (confidence: ${e.confidence}, source: ${e.source})`).join('\n')}

## Instructions

1. Write a professional, data-driven report with the following sections:
   - Executive Summary (2-3 paragraphs)
   - Impact Metrics (quantitative highlights)
   - Qualitative Insights (participant voices)
   - Recommendations (actionable next steps)

2. **CRITICAL**: For EVERY claim, cite evidence using [citation:ID] format.
   - Example: "Participants reported increased confidence [citation:evidence-uuid-790]."

3. Use clear, jargon-free language suitable for board-level stakeholders.

4. Highlight both successes and areas for improvement.

5. Include specific numbers and percentages where available.

6. Do NOT fabricate data. Only use the provided metrics and evidence.

7. Do NOT include personally identifiable information (PII). Evidence is pre-redacted.

8. Maintain a neutral, objective tone.

## Output Format

Return JSON:
{
  "sections": [
    {
      "title": "Executive Summary",
      "content": "...[citation:ID]...",
      "order": 1
    },
    // ... more sections
  ],
  "citations": [
    {
      "id": "cite-001",
      "evidenceId": "evidence-uuid-789",
      "snippetText": "...",
      "source": "...",
      "confidence": 0.95
    },
    // ... more citations
  ]
}
`;
```

**Example with current dates**:
```typescript
const prompt = quarterlyReportPrompt(
  {
    sroi: 3.2,
    vis: 4.8,
    integrationScore: 0.87,
    participantCount: 156,
    completionRate: 0.89
  },
  evidenceSnippets,
  { start: '2025-10-01', end: '2025-12-31' },
  { name: 'Example Corp' }
);
```

### Prompt Versioning

**Version control**: Store prompts in Git with version tags.

**Schema**:
```typescript
interface PromptVersion {
  version: string;           // e.g., "v2.1"
  createdAt: string;
  changes: string;           // Changelog
  deprecated?: boolean;
}
```

**Example versions**:
- `v1.0`: Initial prompt (basic sections)
- `v2.0`: Added mandatory citations
- `v2.1`: Improved redaction instructions

---

## Guardrails

### 1. Token Budget

**Limit**: 4000 tokens per report (configurable)
**Rationale**: Prevent runaway costs, ensure reasonable report length

**Implementation**:
```typescript
const maxTokens = options?.maxTokens ?? 4000;

const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: prompt }],
  max_tokens: maxTokens,
  temperature: options?.temperature ?? 0.3,
  seed: options?.seed,
});
```

---

### 2. PII Redaction

**Rules**:
- Email addresses → `[REDACTED_EMAIL]`
- Phone numbers → `[REDACTED_PHONE]`
- Addresses → `[REDACTED_ADDRESS]`
- Names (if detected in evidence) → `Participant A`, `Volunteer B`

**Implementation**: `services/reporting/utils/redaction.ts`

```typescript
export function redactPII(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{1,5}\s\w+\s(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[REDACTED_ADDRESS]');
}
```

**Apply to**:
- Evidence snippets BEFORE sending to LLM
- Generated narrative AFTER receiving from LLM (double-check)

---

### 3. Content Policy

**Prohibited in generated reports**:
- Hate speech
- Profanity
- Political bias
- Religious bias
- Discriminatory language
- Fabricated data

**Implementation**: Use safety moderation service (Worker 2)

```typescript
const moderationResult = await fetch('/safety/screen/text', {
  method: 'POST',
  body: JSON.stringify({ text: narrative }),
});

if (moderationResult.flagged) {
  throw new Error('Generated content violates content policy');
}
```

---

### 4. Citation Validation

**Rule**: Every claim must cite evidence.

**Implementation**:
```typescript
function validateCitations(narrative: string, citations: Citation[]): boolean {
  const citationIds = citations.map(c => c.id);
  const referencedIds = [...narrative.matchAll(/\[citation:([^\]]+)\]/g)].map(m => m[1]);

  // Check: All referenced IDs exist in citations array
  const allValid = referencedIds.every(id => citationIds.includes(id));

  // Check: Evidence IDs exist in database
  const evidenceExists = await Promise.all(
    citations.map(c => db.select().from(evidenceSnippets).where(eq(evidenceSnippets.id, c.evidenceId)))
  );

  return allValid && evidenceExists.every(e => e.length > 0);
}
```

**If validation fails**: Reject report, log error, alert admin.

---

## Deterministic Reports

**Use case**: Reproducible reports for auditing.

**Implementation**: Provide `seed` in request.

```typescript
const seed = options?.seed ?? undefined;

const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: prompt }],
  seed: seed, // Deterministic if provided
});
```

**Note**: Determinism is best-effort (LLM providers don't guarantee 100% reproducibility).

---

## Model Selection

**Supported Providers**:
- OpenAI (GPT-4 Turbo, GPT-4o)
- Anthropic (Claude 3 Opus, Claude 3 Sonnet)

**Configuration**: Environment variable or database setting.

```typescript
const modelProvider = process.env.LLM_PROVIDER ?? 'openai'; // 'openai' | 'anthropic'

const model = modelProvider === 'openai'
  ? 'gpt-4-turbo-2025-05-13'
  : 'claude-3-opus-20250109';
```

**Abstraction**: Use unified interface for provider switching.

```typescript
interface LLMClient {
  generate(prompt: string, options: GenerateOptions): Promise<GenerateResponse>;
}

class OpenAIClient implements LLMClient { /* ... */ }
class AnthropicClient implements LLMClient { /* ... */ }

const llm: LLMClient = modelProvider === 'openai'
  ? new OpenAIClient(process.env.OPENAI_API_KEY)
  : new AnthropicClient(process.env.ANTHROPIC_API_KEY);
```

---

## Error Handling

### Common Errors

**1. Token Limit Exceeded**
- Cause: Prompt too large or response too long
- Mitigation: Reduce evidence count, increase max_tokens, or summarize metrics
- User message: "Report generation failed: input too large. Try reducing the date range."

**2. API Rate Limit**
- Cause: Too many requests to LLM API
- Mitigation: Exponential backoff, queue system
- User message: "Report generation is temporarily unavailable. Please try again in 5 minutes."

**3. Citation Validation Failure**
- Cause: LLM didn't cite evidence, or cited non-existent evidence
- Mitigation: Retry with stricter prompt, or reject report
- User message: "Report generation failed: unable to validate citations. Please contact support."

**4. Content Policy Violation**
- Cause: LLM generated prohibited content
- Mitigation: Reject report, log incident, alert admin
- User message: "Report generation failed: content policy violation. Please contact support."

---

## Retry Logic

**Strategy**: Exponential backoff with max retries.

```typescript
async function generateWithRetry(
  prompt: string,
  options: GenerateOptions,
  maxRetries = 3
): Promise<GenerateResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await llm.generate(prompt, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Audit Logging

**Log every report generation**:
```typescript
interface ReportAuditLog {
  id: string;
  companyId: string;
  userId: string;
  reportId: string;
  generatedAt: string;
  model: string;
  promptVersion: string;
  tokensUsed: number;
  citationCount: number;
  status: 'success' | 'failed';
  errorMessage?: string;
}
```

**Table**: `report_audit_logs`

**Use cases**:
- Compliance audits
- Cost tracking (tokens used)
- Debugging (prompt version, model)

---

## Frontend Integration

### GenerateReportModal.tsx

**Flow**:
1. User clicks "Generate Quarterly Report"
2. Modal opens with filters (period, programs, metrics)
3. User submits → POST /reporting/gen-reports:generate
4. Loading spinner (30-60 seconds)
5. Response → Display preview in ReportPreview.tsx
6. User can edit text (minor edits only, citations preserved)
7. User clicks "Export PDF" → PDF renders with citations in footnotes

**Code snippet**:
```tsx
const GenerateReportModal: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GenerateReportResponse | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/reporting/gen-reports:generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: currentCompany.id,
          period: { start: '2025-10-01', end: '2025-12-31' },
          filters: selectedFilters,
        }),
      });
      const data = await response.json();
      setReport(data);
    } catch (error) {
      toast.error('Report generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      {loading ? (
        <Spinner text="Generating report (30-60 seconds)..." />
      ) : report ? (
        <ReportPreview report={report} onExport={handleExportPDF} />
      ) : (
        <ReportFilters onGenerate={handleGenerate} />
      )}
    </Dialog>
  );
};
```

---

## Failure Modes

### Scenario 1: LLM Refuses to Generate
- Cause: Prompt violates LLM provider's content policy
- Mitigation: Review prompt template, ensure no prohibited content
- User message: "Report generation failed. Please contact support."

### Scenario 2: No Evidence Available
- Cause: No Q2Q evidence for the selected period
- Mitigation: Display warning, suggest expanding date range
- User message: "Insufficient data for report generation. Try selecting a longer period."

### Scenario 3: Citation Extraction Fails
- Cause: LLM response doesn't match expected JSON format
- Mitigation: Parse with fallback, or retry with stricter prompt
- User message: "Report generation failed. Please try again."

---

## Performance Considerations

**Generation Time**: 30-60 seconds (depends on prompt size, model speed)
**Optimization**:
- Cache metrics queries (ETag)
- Parallelize evidence fetching
- Use faster model (GPT-4o instead of GPT-4 Turbo)

**Cost**: ~$0.10-0.30 per report (depends on token count, model)
**Budget**: Monitor token usage, set alerts at $100/day

---

## Future Enhancements

- **Multi-language reports**: Translate prompts to Norwegian, Ukrainian
- **Custom templates**: Allow companies to define report structure
- **Interactive editing**: Inline citation editing in UI
- **Report history**: Save generated reports for comparison
- **Scheduled generation**: Auto-generate monthly reports

---

## References

- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- Anthropic API Docs: https://docs.anthropic.com/claude/reference
- CSRD Reporting Standards: https://www.efrag.org/lab6
- GRI Standards: https://www.globalreporting.org/standards/

---

**Document Status**: ✅ IMPLEMENTED (Phase D)
**Last Updated**: 2025-11-14
**Owner**: AI & Safety Lead (Worker 3)
