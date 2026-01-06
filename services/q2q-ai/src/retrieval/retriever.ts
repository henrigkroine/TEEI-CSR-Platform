/**
 * RAG Retriever for evidence-based Q2Q classification
 * Retrieves relevant evidence snippets using vector similarity search
 */

import { db } from '@teei/shared-schema/db';
import { evidenceSnippets, outcomeScores } from '@teei/shared-schema/schema/q2q';
import { eq, sql, and, desc } from 'drizzle-orm';
import { EmbeddingFactory, cosineSimilarity } from './embeddings.js';
import { TextChunker, FeedbackChunker } from './chunker.js';
import crypto from 'crypto';

export interface RetrievalConfig {
  topK: number; // Number of results to return
  minSimilarity: number; // Minimum cosine similarity threshold (0-1)
  dimensions?: number; // Embedding dimensions (for model selection)
  includeMetadata?: boolean; // Include outcome scores and metadata
  diversityWeight?: number; // Weight for diversity vs pure similarity (0-1)
}

export interface RetrievedEvidence {
  snippetId: string;
  text: string;
  similarity: number;
  outcomeScoreId?: string;
  dimension?: string;
  score?: number;
  confidence?: number;
  language?: string;
  sourceRef?: string;
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 10,
  minSimilarity: 0.7,
  dimensions: 1536, // OpenAI text-embedding-3-small default
  includeMetadata: true,
  diversityWeight: 0.2
};

/**
 * Main RAG retriever class
 */
export class EvidenceRetriever {
  private embedder: ReturnType<typeof EmbeddingFactory.getDefault>;
  private chunker: TextChunker;
  private config: RetrievalConfig;

  constructor(config: Partial<RetrievalConfig> = {}) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
    this.embedder = EmbeddingFactory.getDefault();
    this.chunker = new FeedbackChunker();
  }

  /**
   * Retrieve relevant evidence snippets for a query
   */
  async retrieve(query: string, config?: Partial<RetrievalConfig>): Promise<RetrievedEvidence[]> {
    const effectiveConfig = { ...this.config, ...config };

    // 1. Generate query embedding
    const queryEmbedding = await this.embedder.embed(query, effectiveConfig.dimensions);

    // 2. Fetch all evidence snippets with embeddings
    // Note: In production, this should use pgvector extension for efficient similarity search
    const snippets = await db
      .select({
        id: evidenceSnippets.id,
        snippetText: evidenceSnippets.snippetText,
        embedding: evidenceSnippets.embedding,
        outcomeScoreId: evidenceSnippets.outcomeScoreId,
        sourceRef: evidenceSnippets.sourceRef,
        ...(effectiveConfig.includeMetadata && {
          dimension: outcomeScores.dimension,
          score: outcomeScores.score,
          confidence: outcomeScores.confidence,
          language: outcomeScores.language
        })
      })
      .from(evidenceSnippets)
      .leftJoin(outcomeScores, eq(evidenceSnippets.outcomeScoreId, outcomeScores.id))
      .where(sql`${evidenceSnippets.embedding} IS NOT NULL`)
      .limit(1000); // Safety limit

    // 3. Calculate similarities
    const results: RetrievedEvidence[] = [];

    for (const snippet of snippets) {
      if (!snippet.embedding || !snippet.snippetText) continue;

      try {
        const snippetEmbedding = JSON.parse(snippet.embedding);
        const similarity = cosineSimilarity(queryEmbedding.embedding, snippetEmbedding);

        if (similarity >= effectiveConfig.minSimilarity) {
          results.push({
            snippetId: snippet.id,
            text: snippet.snippetText,
            similarity,
            outcomeScoreId: snippet.outcomeScoreId || undefined,
            dimension: snippet.dimension || undefined,
            score: snippet.score ? parseFloat(snippet.score) : undefined,
            confidence: snippet.confidence ? parseFloat(snippet.confidence) : undefined,
            language: snippet.language || undefined,
            sourceRef: snippet.sourceRef || undefined
          });
        }
      } catch (error) {
        console.warn(`Failed to parse embedding for snippet ${snippet.id}:`, error);
        continue;
      }
    }

    // 4. Sort by similarity and apply diversity
    const ranked = this.rankResults(results, effectiveConfig);

    // 5. Return top K
    return ranked.slice(0, effectiveConfig.topK);
  }

  /**
   * Retrieve evidence for a specific dimension (e.g., 'confidence', 'job_readiness')
   */
  async retrieveForDimension(
    query: string,
    dimension: string,
    config?: Partial<RetrievalConfig>
  ): Promise<RetrievedEvidence[]> {
    const allResults = await this.retrieve(query, config);

    // Filter by dimension
    return allResults.filter(r => r.dimension === dimension);
  }

  /**
   * Retrieve diverse evidence across all dimensions
   */
  async retrieveDiverseEvidence(
    query: string,
    config?: Partial<RetrievalConfig>
  ): Promise<RetrievedEvidence[]> {
    const effectiveConfig = { ...this.config, ...config };
    const allResults = await this.retrieve(query, { ...effectiveConfig, topK: 50 });

    // Group by dimension
    const byDimension = new Map<string, RetrievedEvidence[]>();
    for (const result of allResults) {
      const dim = result.dimension || 'unknown';
      if (!byDimension.has(dim)) {
        byDimension.set(dim, []);
      }
      byDimension.get(dim)!.push(result);
    }

    // Take top N from each dimension
    const diverse: RetrievedEvidence[] = [];
    const perDimension = Math.ceil(effectiveConfig.topK / byDimension.size);

    for (const [dim, results] of byDimension) {
      diverse.push(...results.slice(0, perDimension));
    }

    // Sort by similarity and return top K
    return diverse.sort((a, b) => b.similarity - a.similarity).slice(0, effectiveConfig.topK);
  }

  /**
   * Index new evidence snippet (chunk + embed + store)
   */
  async indexEvidence(
    text: string,
    outcomeScoreId: string,
    language = 'en'
  ): Promise<string[]> {
    const snippetIds: string[] = [];

    // 1. Chunk the text
    const chunks = this.chunker.chunk(text, language);

    for (const chunk of chunks) {
      // 2. Generate hash for deduplication
      const hash = crypto.createHash('sha256').update(chunk.text).digest('hex');

      // 3. Check if snippet already exists
      const existing = await db
        .select()
        .from(evidenceSnippets)
        .where(eq(evidenceSnippets.snippetHash, hash))
        .limit(1);

      if (existing.length > 0) {
        snippetIds.push(existing[0].id);
        continue;
      }

      // 4. Generate embedding
      const embeddingResult = await this.embedder.embed(chunk.text, this.config.dimensions);

      // 5. Store snippet
      const [inserted] = await db
        .insert(evidenceSnippets)
        .values({
          outcomeScoreId,
          snippetText: chunk.text,
          snippetHash: hash,
          embedding: JSON.stringify(embeddingResult.embedding),
          embeddingRef: `${embeddingResult.model}:${embeddingResult.dimensions}`,
          sourceRef: `chunk:${chunk.chunkIndex}:${chunk.start}-${chunk.end}`
        })
        .returning();

      snippetIds.push(inserted.id);
    }

    return snippetIds;
  }

  /**
   * Batch index multiple evidence texts
   */
  async indexBatch(
    items: Array<{ text: string; outcomeScoreId: string; language?: string }>
  ): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    for (const item of items) {
      const snippetIds = await this.indexEvidence(
        item.text,
        item.outcomeScoreId,
        item.language || 'en'
      );
      results.set(item.outcomeScoreId, snippetIds);
    }

    return results;
  }

  /**
   * Rank results with optional diversity
   */
  private rankResults(
    results: RetrievedEvidence[],
    config: RetrievalConfig
  ): RetrievedEvidence[] {
    if (!config.diversityWeight || config.diversityWeight === 0) {
      // Pure similarity ranking
      return results.sort((a, b) => b.similarity - a.similarity);
    }

    // Maximal Marginal Relevance (MMR) for diversity
    // Score = λ × similarity - (1 - λ) × max_similarity_to_selected
    const ranked: RetrievedEvidence[] = [];
    const remaining = [...results].sort((a, b) => b.similarity - a.similarity);
    const lambda = 1 - config.diversityWeight;

    // Add highest similarity first
    if (remaining.length > 0) {
      ranked.push(remaining.shift()!);
    }

    // Iteratively add most diverse
    while (remaining.length > 0 && ranked.length < config.topK) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Calculate max similarity to already selected
        let maxSim = 0;
        for (const selected of ranked) {
          // Simple text similarity (in production, use embeddings)
          const sim = this.textSimilarity(candidate.text, selected.text);
          maxSim = Math.max(maxSim, sim);
        }

        // MMR score
        const score = lambda * candidate.similarity - (1 - lambda) * maxSim;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      ranked.push(remaining.splice(bestIdx, 1)[0]);
    }

    return ranked;
  }

  /**
   * Simple text similarity (Jaccard on words)
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }
}

/**
 * Helper function to retrieve evidence for a company's outcomes
 */
export async function getCompanyEvidence(
  companyId: string,
  startDate?: Date,
  endDate?: Date
): Promise<RetrievedEvidence[]> {
  const retriever = new EvidenceRetriever();

  // Fetch all outcome scores for company in period
  const scores = await db
    .select()
    .from(outcomeScores)
    .where(
      and(
        // Note: Would need to join through participants/buddies to filter by company
        // This is simplified - production needs proper company filtering
        startDate ? sql`${outcomeScores.createdAt} >= ${startDate}` : undefined,
        endDate ? sql`${outcomeScores.createdAt} <= ${endDate}` : undefined
      )
    );

  const allEvidence: RetrievedEvidence[] = [];

  for (const score of scores) {
    const snippets = await db
      .select()
      .from(evidenceSnippets)
      .where(eq(evidenceSnippets.outcomeScoreId, score.id));

    for (const snippet of snippets) {
      if (!snippet.snippetText) continue;

      allEvidence.push({
        snippetId: snippet.id,
        text: snippet.snippetText,
        similarity: 1.0, // Direct retrieval, not query-based
        outcomeScoreId: score.id,
        dimension: score.dimension,
        score: parseFloat(score.score),
        confidence: score.confidence ? parseFloat(score.confidence) : undefined,
        language: score.language || undefined,
        sourceRef: snippet.sourceRef || undefined
      });
    }
  }

  return allEvidence;
}
