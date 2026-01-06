/**
 * Insights Copilot - Narrative Composer
 *
 * Generates audited narratives with citations and cost control
 */

import Anthropic from '@anthropic-ai/sdk';
import { Anomaly } from './anomaly-detector.js';

export interface NarrativeRequest {
  anomalies: Anomaly[];
  context: {
    companyId: string;
    metric: string;
    dateRange: { start: string; end: string };
    benchmarks?: any[];
    forecasts?: any[];
  };
  options: {
    tone: 'executive' | 'technical' | 'casual';
    length: 'brief' | 'standard' | 'detailed';
    includeAssumptions: boolean;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface Citation {
  id: string;
  source: string;
  type: 'anomaly' | 'benchmark' | 'forecast' | 'data';
  content: string;
  timestamp?: string;
}

export interface NarrativeResult {
  narrative: string;
  citations: Citation[];
  citationDensity: number; // Citations per 100 words
  sections: {
    executive_summary: string;
    key_findings: string;
    anomalies: string;
    assumptions_limitations: string;
  };
  metadata: {
    wordCount: number;
    citationCount: number;
    tokensUsed: number;
    costUSD: number;
    tone: string;
    length: string;
  };
}

/**
 * Narrative Composer
 */
export class NarrativeComposer {
  private claude: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.claude = new Anthropic({ apiKey });
    }
  }

  /**
   * Compose narrative with citations
   */
  async compose(request: NarrativeRequest): Promise<NarrativeResult> {
    if (!this.claude) {
      throw new Error('Claude API not configured');
    }

    // Build prompt with citation requirements
    const prompt = this.buildPrompt(request);

    // Call Claude with token budget
    const maxTokens = request.options.maxTokens || (
      request.options.length === 'brief' ? 500 :
      request.options.length === 'standard' ? 1000 : 2000
    );

    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature: request.options.temperature || 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    const rawNarrative = content.type === 'text' ? content.text : '';

    // Extract citations from narrative
    const { narrative, citations } = this.extractCitations(rawNarrative);

    // Validate citation requirements
    const citationValidation = this.validateCitations(narrative, citations);
    if (!citationValidation.valid) {
      throw new Error(`Citation requirements not met: ${citationValidation.errors.join(', ')}`);
    }

    // Parse sections
    const sections = this.parseSections(narrative);

    // Calculate cost
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const costUSD = (tokensUsed / 1_000_000) * 3.0; // Claude Sonnet pricing

    return {
      narrative,
      citations,
      citationDensity: this.calculateCitationDensity(narrative, citations),
      sections,
      metadata: {
        wordCount: narrative.split(/\s+/).length,
        citationCount: citations.length,
        tokensUsed,
        costUSD,
        tone: request.options.tone,
        length: request.options.length
      }
    };
  }

  /**
   * Build prompt for narrative generation
   */
  private buildPrompt(request: NarrativeRequest): string {
    const { anomalies, context, options } = request;

    const toneInstructions = {
      executive: 'Write in a clear, executive-friendly tone suitable for C-suite presentation.',
      technical: 'Write in a detailed, technical tone suitable for data analysts.',
      casual: 'Write in a conversational, accessible tone suitable for general audiences.'
    };

    const lengthInstructions = {
      brief: '300-400 words',
      standard: '600-800 words',
      detailed: '1200-1500 words'
    };

    return `You are an insights analyst generating a narrative report on CSR program metrics.

**Tone**: ${toneInstructions[options.tone]}
**Length**: ${lengthInstructions[options.length]}

**Citation Requirements** (CRITICAL):
- Include AT LEAST one citation per paragraph
- Mark citations as [1], [2], [3], etc.
- List all citations at the end in ## Citations section
- Citation density should be at least 0.5 citations per 100 words
- Every quantitative claim MUST have a citation

**Report Structure**:

## Executive Summary
[2-3 sentences summarizing key findings with citations]

## Key Findings
[3-5 bullet points with citations]

## Anomalies Detected
[Detailed analysis of anomalies with citations]

${options.includeAssumptions ? `## Assumptions & Limitations
[List key assumptions and data limitations]` : ''}

## Citations
[Numbered list of all citations]

**Input Data**:

Metric: ${context.metric}
Date Range: ${context.dateRange.start} to ${context.dateRange.end}

Anomalies (${anomalies.length} detected):
${anomalies.map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.type}: ${a.description} (${a.timestamp})`).join('\n')}

${context.benchmarks ? `\nBenchmarks:\n${JSON.stringify(context.benchmarks, null, 2)}` : ''}
${context.forecasts ? `\nForecasts:\n${JSON.stringify(context.forecasts, null, 2)}` : ''}

Generate the report following the structure above, ensuring ALL citation requirements are met.`;
  }

  /**
   * Extract citations from narrative
   */
  private extractCitations(narrative: string): { narrative: string; citations: Citation[] } {
    const citations: Citation[] = [];
    const citationRegex = /\[(\d+)\]/g;
    const citationSection = narrative.match(/## Citations([\s\S]*?)(?=##|$)/);

    if (citationSection) {
      const citationText = citationSection[1];
      const citationLines = citationText.split('\n').filter(l => l.trim());

      for (const line of citationLines) {
        const match = line.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          citations.push({
            id: match[1],
            source: match[2].trim(),
            type: 'data',
            content: match[2].trim()
          });
        }
      }
    }

    return { narrative, citations };
  }

  /**
   * Validate citation requirements
   */
  private validateCitations(
    narrative: string,
    citations: Citation[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Minimum 1 citation per paragraph
    const paragraphs = narrative.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
    const citationReferences = narrative.match(/\[\d+\]/g) || [];

    if (citations.length === 0) {
      errors.push('No citations found in narrative');
    }

    if (citationReferences.length < paragraphs.length * 0.5) {
      errors.push(`Insufficient citation density: ${citationReferences.length} citations for ${paragraphs.length} paragraphs`);
    }

    // Check citation density (0.5 per 100 words)
    const wordCount = narrative.split(/\s+/).length;
    const requiredCitations = Math.ceil(wordCount / 200);

    if (citations.length < requiredCitations) {
      errors.push(`Citation density too low: ${citations.length} citations for ${wordCount} words (need at least ${requiredCitations})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse narrative sections
   */
  private parseSections(narrative: string): NarrativeResult['sections'] {
    const sections: any = {
      executive_summary: '',
      key_findings: '',
      anomalies: '',
      assumptions_limitations: ''
    };

    const summaryMatch = narrative.match(/## Executive Summary([\s\S]*?)(?=##|$)/);
    if (summaryMatch) sections.executive_summary = summaryMatch[1].trim();

    const findingsMatch = narrative.match(/## Key Findings([\s\S]*?)(?=##|$)/);
    if (findingsMatch) sections.key_findings = findingsMatch[1].trim();

    const anomaliesMatch = narrative.match(/## Anomalies Detected([\s\S]*?)(?=##|$)/);
    if (anomaliesMatch) sections.anomalies = anomaliesMatch[1].trim();

    const assumptionsMatch = narrative.match(/## Assumptions & Limitations([\s\S]*?)(?=##|$)/);
    if (assumptionsMatch) sections.assumptions_limitations = assumptionsMatch[1].trim();

    return sections;
  }

  /**
   * Calculate citation density
   */
  private calculateCitationDensity(narrative: string, citations: Citation[]): number {
    const wordCount = narrative.split(/\s+/).length;
    return (citations.length / wordCount) * 100;
  }
}
