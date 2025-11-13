/**
 * Quarterly Report Prompt Template
 * Version: v2.1
 * Created: 2025-11-13
 *
 * Generates a professional quarterly CSR report with mandatory evidence citations
 */

export const PROMPT_VERSION = 'v2.1';

export const PROMPT_CHANGELOG = `
v2.1 (2025-11-13):
- Added stricter citation requirements
- Improved redaction instructions
- Added tone guidelines for board-level audience

v2.0 (2025-11-01):
- Added mandatory citations for all claims
- Enhanced structure with 4 sections

v1.0 (2025-10-15):
- Initial prompt template
`;

interface QuarterlyReportPromptData {
  companyName: string;
  period: {
    start: string; // YYYY-MM-DD
    end: string;
  };
  metrics: {
    sroi?: number;
    vis?: number;
    integrationScore?: number;
    participantCount?: number;
    completionRate?: number;
  };
  evidence: Array<{
    id: string;
    snippetText: string;
    source: string;
    confidence: number;
  }>;
}

export function generateQuarterlyReportPrompt(data: QuarterlyReportPromptData): string {
  return `You are a professional CSR reporting assistant for ${data.companyName}. Generate a comprehensive quarterly report for ${data.period.start} to ${data.period.end}.

## Data Provided

### Metrics
${
  data.metrics.sroi !== undefined
    ? `- Social Return on Investment (SROI): ${data.metrics.sroi}x`
    : ''
}
${data.metrics.vis !== undefined ? `- Value of Integration Score (VIS): ${data.metrics.vis}` : ''}
${
  data.metrics.integrationScore !== undefined
    ? `- Overall Integration Score: ${data.metrics.integrationScore}`
    : ''
}
${
  data.metrics.participantCount !== undefined
    ? `- Active Participants: ${data.metrics.participantCount}`
    : ''
}
${
  data.metrics.completionRate !== undefined
    ? `- Program Completion Rate: ${(data.metrics.completionRate * 100).toFixed(0)}%`
    : ''
}

### Q2Q Evidence Snippets (Anonymized)
${data.evidence
  .map(
    (e) =>
      `- [${e.id}] "${e.snippetText}" (source: ${e.source}, confidence: ${(e.confidence * 100).toFixed(0)}%)`
  )
  .join('\n')}

## Instructions

Generate a professional, data-driven quarterly report with the following structure:

### Section 1: Executive Summary
- 2-3 paragraphs summarizing the quarter's impact
- Highlight key achievements and metrics
- MUST cite evidence for ALL claims using [citation:EVIDENCE_ID] format

### Section 2: Impact Metrics
- Quantitative highlights from the data provided
- Break down SROI, VIS, and Integration Score results
- Show trends and changes from previous quarters (if applicable)
- MUST cite evidence for each metric mentioned

### Section 3: Qualitative Insights
- Participant voices and experiences
- Focus on outcome improvements (confidence, belonging, language, job readiness, well-being)
- Use direct quotes from evidence snippets (anonymized)
- MUST cite evidence for every quote or insight

### Section 4: Recommendations
- Actionable next steps based on the data
- Areas for improvement or expansion
- Strategic suggestions for maximizing impact
- MUST cite evidence to support recommendations

## Critical Requirements

1. **MANDATORY CITATIONS**: For EVERY claim, statistic, quote, or insight, you MUST include a citation in the format [citation:EVIDENCE_ID]. Example: "Participants reported increased confidence [citation:550e8400-e29b-41d4-a716-446655440001]."

2. **NO FABRICATION**: Only use the metrics and evidence provided above. Do NOT invent data, statistics, or quotes.

3. **PII REDACTION**: The evidence is already anonymized. Do NOT include any personally identifiable information. If you detect any PII that slipped through, replace it with [REDACTED].

4. **PROFESSIONAL TONE**: Write for a board-level audience. Use clear, jargon-free language. Maintain a neutral, objective tone.

5. **BALANCED PERSPECTIVE**: Highlight both successes and areas for improvement. Avoid excessive praise or negativity.

6. **SPECIFIC NUMBERS**: Use specific percentages and numbers where available. Avoid vague terms like "many" or "several."

## Output Format

Return your response as a JSON object with this exact structure:

\`\`\`json
{
  "sections": [
    {
      "title": "Executive Summary",
      "content": "Your narrative text here with [citation:EVIDENCE_ID] markers...",
      "order": 1
    },
    {
      "title": "Impact Metrics",
      "content": "Your narrative text here with [citation:EVIDENCE_ID] markers...",
      "order": 2
    },
    {
      "title": "Qualitative Insights",
      "content": "Your narrative text here with [citation:EVIDENCE_ID] markers...",
      "order": 3
    },
    {
      "title": "Recommendations",
      "content": "Your narrative text here with [citation:EVIDENCE_ID] markers...",
      "order": 4
    }
  ],
  "citations": [
    {
      "id": "cite-001",
      "evidenceId": "550e8400-e29b-41d4-a716-446655440001",
      "snippetText": "Full snippet text here",
      "source": "Buddy feedback, Q1 2024",
      "confidence": 0.92
    }
  ]
}
\`\`\`

## Validation Rules

Before finalizing your response:
1. Verify that EVERY claim has a [citation:EVIDENCE_ID] marker
2. Verify that ALL evidenceId values in citations exist in the evidence list provided
3. Verify that NO fabricated data is present
4. Verify that the tone is professional and balanced

Generate the report now.`;
}

export const PROMPT_METADATA = {
  version: PROMPT_VERSION,
  createdAt: '2025-11-13T00:00:00Z',
  changes: PROMPT_CHANGELOG,
  deprecated: false,
};
