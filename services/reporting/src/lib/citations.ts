import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { evidenceSnippets, outcomeScores } from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:citations');

export interface EvidenceSnippet {
  id: string;
  text: string;
  dimension: string;
  score: number;
  confidence?: number;
  relevanceScore?: number;
}

export interface CitationConfig {
  minRelevanceScore?: number;
  maxSnippetsPerDimension?: number;
  minConfidence?: number;
  // Validation config
  minCitationsPerParagraph?: number;
  minCitationDensity?: number; // Citations per 100 words
  strictValidation?: boolean; // If true, throw errors instead of warnings
  enforceEvidenceGates?: boolean; // NEW: Throw EvidenceGateViolation on missing evidence
  blockOnMissingEvidence?: boolean; // NEW: Return 422 instead of 500 on violations
}

const DEFAULT_CONFIG: CitationConfig = {
  minRelevanceScore: 0.3,
  maxSnippetsPerDimension: 5,
  minConfidence: 0.5,
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5, // At least 1 citation per 200 words
  strictValidation: true, // Phase D: enforce citations strictly
  enforceEvidenceGates: true, // Phase D: strict evidence gates
  blockOnMissingEvidence: true, // Phase D: return 422 on violations
};

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

/**
 * Citation extractor - queries evidence snippets from database
 * Scores and filters snippets for use in report generation
 */
export class CitationExtractor {
  private db: ReturnType<typeof drizzle>;
  private config: CitationConfig;

  constructor(connectionString: string, config: CitationConfig = {}) {
    const client = postgres(connectionString);
    this.db = drizzle(client);
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('Citation extractor initialized');
  }

  /**
   * Extract evidence snippets for a company and period
   */
  async extractEvidence(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    dimensions?: string[]
  ): Promise<EvidenceSnippet[]> {
    try {
      logger.info(`Extracting evidence for company ${companyId} from ${periodStart} to ${periodEnd}`);

      // Query outcome scores with their evidence snippets
      // Note: This is a simplified query. In production, we'd need to join with
      // the source tables (buddy_feedback, kintell_feedback, etc.) to filter by company
      const scores = await this.db
        .select({
          snippetId: evidenceSnippets.id,
          snippetText: evidenceSnippets.snippetText,
          dimension: outcomeScores.dimension,
          score: outcomeScores.score,
          confidence: outcomeScores.confidence,
          createdAt: outcomeScores.createdAt,
        })
        .from(outcomeScores)
        .innerJoin(evidenceSnippets, eq(evidenceSnippets.outcomeScoreId, outcomeScores.id))
        .where(
          and(
            gte(outcomeScores.createdAt, periodStart),
            lte(outcomeScores.createdAt, periodEnd)
          )
        )
        .orderBy(desc(outcomeScores.score))
        .limit(100); // Get top 100 to filter and score

      logger.info(`Found ${scores.length} evidence snippets in period`);

      // Filter by dimensions if specified
      let filteredScores = scores;
      if (dimensions && dimensions.length > 0) {
        filteredScores = scores.filter(s => dimensions.includes(s.dimension));
      }

      // Filter by confidence threshold
      if (this.config.minConfidence) {
        filteredScores = filteredScores.filter(s => {
          const conf = parseFloat(s.confidence as any);
          return !isNaN(conf) && conf >= (this.config.minConfidence || 0);
        });
      }

      // Score relevance and filter
      const scoredSnippets = filteredScores.map(s => ({
        id: s.snippetId,
        text: s.snippetText || '',
        dimension: s.dimension,
        score: parseFloat(s.score as any),
        confidence: s.confidence ? parseFloat(s.confidence as any) : undefined,
        relevanceScore: this.calculateRelevanceScore(s),
      }));

      // Filter by relevance threshold
      const relevant = scoredSnippets.filter(
        s => (s.relevanceScore || 0) >= (this.config.minRelevanceScore || 0)
      );

      // Limit per dimension
      const balanced = this.balanceByDimension(relevant);

      logger.info(`Filtered to ${balanced.length} relevant snippets`);

      return balanced;
    } catch (error: any) {
      logger.error(`Failed to extract evidence: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Calculate relevance score for a snippet
   * Combines outcome score, confidence, and text quality
   */
  private calculateRelevanceScore(snippet: any): number {
    const score = parseFloat(snippet.score);
    const confidence = snippet.confidence ? parseFloat(snippet.confidence) : 0.5;
    const textLength = snippet.snippetText?.length || 0;

    // Score formula: (outcome_score * 0.5) + (confidence * 0.3) + (text_quality * 0.2)
    const textQuality = Math.min(textLength / 200, 1); // Normalize to 0-1, prefer 200+ chars

    return (score * 0.5) + (confidence * 0.3) + (textQuality * 0.2);
  }

  /**
   * Balance snippets across dimensions
   * Ensure we don't have all snippets from one dimension
   */
  private balanceByDimension(snippets: EvidenceSnippet[]): EvidenceSnippet[] {
    const byDimension = new Map<string, EvidenceSnippet[]>();

    // Group by dimension
    for (const snippet of snippets) {
      const existing = byDimension.get(snippet.dimension) || [];
      existing.push(snippet);
      byDimension.set(snippet.dimension, existing);
    }

    // Take top N from each dimension
    const balanced: EvidenceSnippet[] = [];
    const maxPerDimension = this.config.maxSnippetsPerDimension || 5;

    for (const [dimension, snippets] of byDimension) {
      // Sort by relevance score descending
      const sorted = snippets.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      balanced.push(...sorted.slice(0, maxPerDimension));
    }

    return balanced;
  }

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

  /**
   * Validate citations in generated content
   * Ensures every citation ID exists in the evidence set
   * Enforces minimum citation density requirements
   *
   * @throws {EvidenceGateViolation} When enforceEvidenceGates is true and violations detected
   */
  validateCitations(
    content: string,
    evidenceSnippets: EvidenceSnippet[]
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    citationCount: number;
    paragraphCount: number;
    citationDensity: number; // Citations per 100 words
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const citationRegex = /\[cite:([^\]]+)\]/g;
    const matches = Array.from(content.matchAll(citationRegex));
    const citationCount = matches.length;

    // Calculate word count (exclude citation tags)
    const textWithoutCitations = content.replace(citationRegex, '');
    const wordCount = textWithoutCitations.trim().split(/\s+/).length;
    const citationDensity = wordCount > 0 ? (citationCount / wordCount) * 100 : 0;

    // Check minimum citations
    if (citationCount === 0) {
      const msg = 'CRITICAL: No citations found in generated content';
      if (this.config.strictValidation) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    const validIds = new Set(evidenceSnippets.map(s => s.id));

    // Validate all citation IDs exist
    for (const match of matches) {
      const citationId = match[1];
      if (!validIds.has(citationId)) {
        errors.push(`Invalid citation ID: ${citationId} (not found in evidence set)`);
      }
    }

    // Check citation density (citations per 100 words)
    const minDensity = this.config.minCitationDensity || 0.5;
    if (citationDensity < minDensity) {
      const msg = `Citation density ${citationDensity.toFixed(2)} per 100 words is below minimum ${minDensity} (need ${Math.ceil((minDensity * wordCount) / 100)} citations for ${wordCount} words)`;
      if (this.config.strictValidation) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

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

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
      citationCount,
      paragraphCount: paragraphs.length,
      citationDensity,
    };

    logger.info('Citation validation complete', {
      valid: result.valid,
      citationCount,
      paragraphCount: paragraphs.length,
      citationDensity: citationDensity.toFixed(2),
      errorCount: errors.length,
      warningCount: warnings.length,
    });

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

    return result;
  }

  /**
   * Extract citation IDs from content
   */
  extractCitationIds(content: string): string[] {
    const citationRegex = /\[cite:([^\]]+)\]/g;
    const matches = Array.from(content.matchAll(citationRegex));
    return matches.map(m => m[1]);
  }
}

/**
 * Create citation extractor from environment variables
 */
export function createCitationExtractor(config?: CitationConfig): CitationExtractor {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  return new CitationExtractor(connectionString, config);
}
