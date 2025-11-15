/**
 * Evidence Linker - evidence-linker
 * Maps result tokens to lineage snippets and citations
 */

import { z } from 'zod';
import { getMetric } from '../ontology/metrics.js';
import type { QueryPlan } from '../planner/semantic.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('evidence-linker');

export const CitationSchema = z.object({
  id: z.string(), // Unique citation ID
  sourceSystem: z.string(), // e.g., "impact-in", "benevity"
  sourceEntity: z.string(), // e.g., "volunteer_activities"
  sourceRecordIds: z.array(z.string()), // IDs of source records
  metricId: z.string(),
  aggregatedValue: z.number(),
  sampleSize: z.number(), // Number of records aggregated
  snippet: z.string(), // Human-readable lineage snippet
  confidence: z.number(), // 0-1
  timestamp: z.string(), // ISO date
});

export type Citation = z.infer<typeof CitationSchema>;

export const AnswerWithEvidenceSchema = z.object({
  answer: z.string(), // Natural language answer
  citations: z.array(CitationSchema), // Evidence citations
  citationDensity: z.number(), // Citations per 100 words
  minCitationsPerParagraph: z.number(),
  meetsStandard: z.boolean(), // Passes citation validation
});

export type AnswerWithEvidence = z.infer<typeof AnswerWithEvidenceSchema>;

export class EvidenceLinker {
  private minCitationsPerParagraph = 1;
  private targetCitationDensity = 0.5; // per 100 words

  /**
   * Link query results to evidence lineage
   */
  async linkEvidence(
    plan: QueryPlan,
    results: any[],
    options: {
      includeSampleRecords?: boolean;
      maxSampleSize?: number;
    } = {}
  ): Promise<Citation[]> {
    const citations: Citation[] = [];

    // For each metric in the plan, create citations
    for (const metric of plan.metrics) {
      const metricDef = getMetric(metric.id);
      if (!metricDef || !metricDef.evidenceLineage.traceable) {
        continue;
      }

      // Aggregate value from results
      const aggregatedValue = this.extractAggregatedValue(results, metric.alias || metric.id);

      // Create citation
      const citation: Citation = {
        id: this.generateCitationId(metric.id, plan.tenantId),
        sourceSystem: metricDef.evidenceLineage.sourceSystem,
        sourceEntity: metricDef.evidenceLineage.sourceEntity,
        sourceRecordIds: this.extractSourceRecordIds(results, options.maxSampleSize || 10),
        metricId: metric.id,
        aggregatedValue,
        sampleSize: results.length,
        snippet: this.generateLineageSnippet(metricDef, aggregatedValue, results.length, plan),
        confidence: this.calculateConfidence(results.length),
        timestamp: new Date().toISOString(),
      };

      citations.push(citation);
      logger.debug({ citation }, 'Created evidence citation');
    }

    return citations;
  }

  /**
   * Generate natural language answer with citations
   */
  async generateAnswerWithCitations(
    plan: QueryPlan,
    results: any[],
    citations: Citation[]
  ): Promise<AnswerWithEvidence> {
    // Generate natural language answer based on plan intent and results
    const answer = await this.generateAnswer(plan, results, citations);

    // Calculate citation metrics
    const wordCount = answer.split(/\s+/).length;
    const paragraphCount = answer.split(/\n\n/).length;
    const citationCount = citations.length;

    const citationDensity = (citationCount / wordCount) * 100;
    const citationsPerParagraph = citationCount / paragraphCount;

    const meetsStandard =
      citationCount >= 1 && // At least 1 citation total
      citationsPerParagraph >= this.minCitationsPerParagraph &&
      citationDensity >= this.targetCitationDensity;

    if (!meetsStandard) {
      logger.warn(
        {
          citationCount,
          citationDensity,
          citationsPerParagraph,
          wordCount,
          paragraphCount,
        },
        'Answer does not meet citation standards'
      );
    }

    return {
      answer,
      citations,
      citationDensity,
      minCitationsPerParagraph: citationsPerParagraph,
      meetsStandard,
    };
  }

  /**
   * Validate citation density meets standards
   */
  validateCitations(answer: AnswerWithEvidence): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (answer.citations.length === 0) {
      violations.push('No citations provided');
    }

    if (answer.minCitationsPerParagraph < this.minCitationsPerParagraph) {
      violations.push(
        `Insufficient citations per paragraph: ${answer.minCitationsPerParagraph.toFixed(2)} (min ${this.minCitationsPerParagraph})`
      );
    }

    if (answer.citationDensity < this.targetCitationDensity) {
      violations.push(
        `Insufficient citation density: ${answer.citationDensity.toFixed(2)} per 100 words (min ${this.targetCitationDensity})`
      );
    }

    // Check all citations have valid source systems
    for (const citation of answer.citations) {
      if (!citation.sourceSystem || !citation.sourceEntity) {
        violations.push(`Citation ${citation.id} missing source lineage`);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Generate natural language answer
   */
  private async generateAnswer(plan: QueryPlan, results: any[], citations: Citation[]): Promise<string> {
    // Simple template-based answer generation
    // In production, this could use LLM for more natural language

    const intent = plan.intent;
    const metricNames = plan.metrics.map((m) => getMetric(m.id)?.name || m.id).join(', ');

    let answer = `Based on the analysis of ${metricNames}:\n\n`;

    // Add key findings
    for (const citation of citations) {
      const metricDef = getMetric(citation.metricId);
      const metricName = metricDef?.name || citation.metricId;

      answer += `- **${metricName}**: ${this.formatValue(citation.aggregatedValue)} (based on ${citation.sampleSize} records from ${citation.sourceSystem}) [Citation: ${citation.id}]\n`;
    }

    answer += `\n`;
    answer += `Time period: ${plan.timeRange.start} to ${plan.timeRange.end}\n`;

    if (plan.dimensions.length > 0) {
      answer += `Grouped by: ${plan.dimensions.map((d) => d.column).join(', ')}\n`;
    }

    answer += `\n`;
    answer += `**Evidence**: All metrics are traceable to source systems (${citations.map((c) => c.sourceSystem).join(', ')}) with ${citations.reduce((sum, c) => sum + c.sampleSize, 0)} total records analyzed.\n`;

    return answer;
  }

  /**
   * Generate lineage snippet
   */
  private generateLineageSnippet(metricDef: any, value: number, sampleSize: number, plan: QueryPlan): string {
    return `${metricDef.name} of ${this.formatValue(value)} aggregated from ${sampleSize} records in ${metricDef.evidenceLineage.sourceEntity} (${metricDef.evidenceLineage.sourceSystem}) for period ${plan.timeRange.start} to ${plan.timeRange.end}`;
  }

  /**
   * Extract aggregated value from results
   */
  private extractAggregatedValue(results: any[], alias: string): number {
    if (results.length === 0) return 0;

    // If single result with aggregate
    if (results.length === 1 && alias in results[0]) {
      return Number(results[0][alias]) || 0;
    }

    // Sum across all results
    return results.reduce((sum, row) => sum + (Number(row[alias]) || 0), 0);
  }

  /**
   * Extract source record IDs from results
   */
  private extractSourceRecordIds(results: any[], maxSample: number): string[] {
    const ids: string[] = [];

    for (let i = 0; i < Math.min(results.length, maxSample); i++) {
      const row = results[i];
      // Try common ID field names
      const id = row.id || row.record_id || row._id || `row_${i}`;
      ids.push(String(id));
    }

    return ids;
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Simple confidence calculation
    // More samples = higher confidence
    if (sampleSize >= 1000) return 1.0;
    if (sampleSize >= 100) return 0.9;
    if (sampleSize >= 10) return 0.7;
    if (sampleSize >= 1) return 0.5;
    return 0.0;
  }

  /**
   * Generate unique citation ID
   */
  private generateCitationId(metricId: string, tenantId: string): string {
    const timestamp = Date.now();
    return `cite_${metricId}_${tenantId.slice(0, 8)}_${timestamp}`;
  }

  /**
   * Format numeric value
   */
  private formatValue(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toFixed(2);
  }
}
