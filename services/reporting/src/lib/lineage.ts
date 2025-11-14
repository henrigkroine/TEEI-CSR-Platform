import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { reportLineage, reportSections, reportCitations } from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';
import { randomUUID } from 'crypto';

const logger = createServiceLogger('reporting:lineage');

export interface LineageMetadata {
  reportId: string;
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  modelName: string;
  modelVersion?: string;
  providerName: string;
  promptVersion: string;
  promptTemplate?: string;
  locale: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCostUsd: string;
  deterministic: boolean;
  temperature?: string;
  sections: string[];
  citationCount: number;
  evidenceSnippetIds: string[];
  requestId?: string;
  durationMs?: number;
  createdBy?: string;
}

export interface SectionMetadata {
  sectionType: string;
  content: string;
  citationIds: string[];
  wordCount: number;
  characterCount: number;
}

export interface CitationMetadata {
  citationNumber: number;
  snippetId: string;
  snippetText: string;
  relevanceScore?: string;
  positionInText?: number;
}

/**
 * Lineage tracker - stores provenance and audit trail for generated reports
 */
export class LineageTracker {
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    const client = postgres(connectionString);
    this.db = drizzle(client);
    logger.info('Lineage tracker initialized');
  }

  /**
   * Store complete report lineage
   */
  async storeLineage(
    metadata: LineageMetadata,
    sections: SectionMetadata[],
    citations: CitationMetadata[]
  ): Promise<string> {
    try {
      const startTime = Date.now();

      // Insert report lineage record
      const [lineageRecord] = await this.db.insert(reportLineage).values({
        reportId: metadata.reportId,
        companyId: metadata.companyId,
        periodStart: metadata.periodStart,
        periodEnd: metadata.periodEnd,
        modelName: metadata.modelName,
        modelVersion: metadata.modelVersion,
        providerName: metadata.providerName,
        promptVersion: metadata.promptVersion,
        promptTemplate: metadata.promptTemplate,
        locale: metadata.locale,
        tokensInput: metadata.tokensInput,
        tokensOutput: metadata.tokensOutput,
        tokensTotal: metadata.tokensTotal,
        estimatedCostUsd: metadata.estimatedCostUsd,
        deterministic: metadata.deterministic as any,
        temperature: metadata.temperature,
        sections: metadata.sections as any,
        citationCount: metadata.citationCount,
        evidenceSnippetIds: metadata.evidenceSnippetIds as any,
        requestId: metadata.requestId,
        durationMs: metadata.durationMs,
        createdBy: metadata.createdBy,
      }).returning();

      const lineageId = lineageRecord.id;

      // Insert section records
      const sectionRecords = [];
      for (const section of sections) {
        const [sectionRecord] = await this.db.insert(reportSections).values({
          lineageId,
          sectionType: section.sectionType,
          content: section.content,
          citationIds: section.citationIds as any,
          wordCount: section.wordCount,
          characterCount: section.characterCount,
        }).returning();

        sectionRecords.push(sectionRecord);
      }

      // Insert citation records
      const citationRecords = [];
      for (const citation of citations) {
        // Find the section this citation belongs to
        const sectionRecord = sectionRecords.find(s =>
          s.citationIds && (s.citationIds as any).includes(citation.snippetId)
        );

        const [citationRecord] = await this.db.insert(reportCitations).values({
          lineageId,
          sectionId: sectionRecord?.id,
          citationNumber: citation.citationNumber,
          snippetId: citation.snippetId,
          snippetText: citation.snippetText,
          relevanceScore: citation.relevanceScore,
          positionInText: citation.positionInText,
        }).returning();

        citationRecords.push(citationRecord);
      }

      const duration = Date.now() - startTime;
      logger.info(`Stored lineage for report ${metadata.reportId} in ${duration}ms`, {
        lineageId,
        sectionCount: sections.length,
        citationCount: citations.length,
      });

      return lineageId;
    } catch (error: any) {
      logger.error(`Failed to store lineage: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Retrieve lineage for a report
   */
  async getLineage(reportId: string): Promise<any> {
    try {
      // This would implement the retrieval logic
      // For now, returning a placeholder
      logger.info(`Retrieving lineage for report ${reportId}`);
      return null;
    } catch (error: any) {
      logger.error(`Failed to retrieve lineage: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Calculate metrics from content
   */
  static calculateContentMetrics(content: string): {
    wordCount: number;
    characterCount: number;
  } {
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const characterCount = content.length;

    return { wordCount, characterCount };
  }

  /**
   * Extract citation positions from content
   */
  static extractCitationPositions(content: string): Map<string, number> {
    const positions = new Map<string, number>();
    const citationRegex = /\[cite:([^\]]+)\]/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      const citationId = match[1];
      const position = match.index;
      if (!positions.has(citationId)) {
        positions.set(citationId, position);
      }
    }

    return positions;
  }
}

/**
 * Create lineage tracker from environment variables
 */
export function createLineageTracker(): LineageTracker {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  return new LineageTracker(connectionString);
}

/**
 * Build lineage metadata from generation result
 */
export function buildLineageMetadata(params: {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  modelName: string;
  providerName: string;
  promptVersion: string;
  locale: string;
  tokensInput: number;
  tokensOutput: number;
  sections: string[];
  citationIds: string[];
  deterministic?: boolean;
  temperature?: number;
  durationMs?: number;
  requestId?: string;
  createdBy?: string;
}): LineageMetadata {
  const reportId = randomUUID();
  const tokensTotal = params.tokensInput + params.tokensOutput;

  // Estimate cost
  const estimatedCostUsd = estimateCost(
    params.providerName,
    params.modelName,
    params.tokensInput,
    params.tokensOutput
  );

  return {
    reportId,
    companyId: params.companyId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    modelName: params.modelName,
    providerName: params.providerName,
    promptVersion: params.promptVersion,
    locale: params.locale,
    tokensInput: params.tokensInput,
    tokensOutput: params.tokensOutput,
    tokensTotal,
    estimatedCostUsd,
    deterministic: params.deterministic || false,
    temperature: params.temperature?.toString(),
    sections: params.sections,
    citationCount: params.citationIds.length,
    evidenceSnippetIds: params.citationIds,
    requestId: params.requestId,
    durationMs: params.durationMs,
    createdBy: params.createdBy,
  };
}

/**
 * Estimate cost based on tokens and model
 */
function estimateCost(
  provider: string,
  model: string,
  tokensInput: number,
  tokensOutput: number
): string {
  // Pricing as of 2024 (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-sonnet-20240229': { input: 3, output: 15 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  };

  const modelPricing = pricing[model] || { input: 5, output: 15 };
  const inputCost = (tokensInput / 1_000_000) * modelPricing.input;
  const outputCost = (tokensOutput / 1_000_000) * modelPricing.output;
  const totalCost = inputCost + outputCost;

  return totalCost.toFixed(6);
}
