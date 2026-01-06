import { Language } from '../inference/language_detection.js';
import { ClassificationOutput } from '../labels.js';

/**
 * Active Learning Queue for Human Review
 *
 * Implements disagreement sampling, uncertainty detection, and diversity
 * sampling to prioritize low-confidence predictions for human labeling.
 */

/**
 * Sample with metadata for active learning
 */
export interface ActiveLearningSample {
  id: string;
  text: string;
  prediction: ClassificationOutput;
  language: Language;
  tenantId?: string;
  timestamp: Date;

  // Uncertainty metrics
  confidence: number;
  entropy: number;
  marginScore: number;

  // Embedding for diversity sampling (optional)
  embedding?: number[];

  // Priority score (higher = more important to review)
  priorityScore: number;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Queue item with review status
 */
export interface QueueItem {
  sample: ActiveLearningSample;
  status: 'pending' | 'in_review' | 'labeled' | 'skipped';
  assignedTo?: string;
  addedAt: Date;
  reviewedAt?: Date;
  labeledBy?: string;
  groundTruth?: Record<string, any>;
}

/**
 * Active learning queue configuration
 */
export interface QueueConfig {
  maxQueueSize: number;
  confidenceThreshold: number;
  marginThreshold: number;
  diversityWeight: number;
  batchSize: number;
  tenantSpecific: boolean;
}

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxQueueSize: 1000,
  confidenceThreshold: 0.7, // Select samples with confidence < 0.7
  marginThreshold: 0.15,    // Select samples where top-2 probabilities differ by < 0.15
  diversityWeight: 0.3,     // Weight for diversity in priority scoring
  batchSize: 50,
  tenantSpecific: true
};

/**
 * Calculate entropy of probability distribution
 * Higher entropy = more uncertainty
 *
 * @param probabilities - Array of probabilities (must sum to 1.0)
 * @returns Entropy value (0 = certain, higher = uncertain)
 */
export function calculateEntropy(probabilities: number[]): number {
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Calculate margin score (difference between top-2 probabilities)
 * Lower margin = more uncertain
 *
 * @param probabilities - Array of probabilities (must sum to 1.0)
 * @returns Margin score (0 = very uncertain, 1 = very certain)
 */
export function calculateMargin(probabilities: number[]): number {
  if (probabilities.length < 2) {
    return 1.0; // Certain if only one class
  }

  // Sort probabilities in descending order
  const sorted = [...probabilities].sort((a, b) => b - a);

  // Margin = difference between top-2
  return sorted[0] - sorted[1];
}

/**
 * Extract confidence scores from classification output
 * Converts boolean predictions to probability-like scores
 *
 * @param classification - Classification output
 * @returns Array of confidence scores for each dimension
 */
function extractConfidenceScores(classification: ClassificationOutput): number[] {
  const scores: number[] = [];

  // Binary dimensions (convert to probabilities)
  const booleanDimensions = [
    classification.confidence_increase,
    classification.confidence_decrease,
    classification.belonging_increase,
    classification.belonging_decrease
  ];

  // For each boolean, use 0.8 for true, 0.2 for false
  // This simulates model confidence
  for (const bool of booleanDimensions) {
    scores.push(bool ? 0.8 : 0.2);
  }

  // Language comfort (convert enum to probabilities)
  const langComfortScores = {
    'low': [0.7, 0.2, 0.1],
    'medium': [0.2, 0.7, 0.1],
    'high': [0.1, 0.2, 0.7]
  };
  scores.push(...langComfortScores[classification.language_comfort]);

  return scores;
}

/**
 * Calculate overall confidence for a classification
 * Uses average of individual dimension confidences
 *
 * @param classification - Classification output
 * @returns Overall confidence score (0-1)
 */
export function calculateOverallConfidence(classification: ClassificationOutput): number {
  const scores = extractConfidenceScores(classification);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Calculate uncertainty metrics for a sample
 *
 * @param classification - Classification output
 * @returns Uncertainty metrics (confidence, entropy, margin)
 */
export function calculateUncertainty(classification: ClassificationOutput): {
  confidence: number;
  entropy: number;
  marginScore: number;
} {
  const confidenceScores = extractConfidenceScores(classification);

  // Normalize scores to sum to 1.0
  const sum = confidenceScores.reduce((a, b) => a + b, 0);
  const probabilities = confidenceScores.map(s => s / sum);

  return {
    confidence: calculateOverallConfidence(classification),
    entropy: calculateEntropy(probabilities),
    marginScore: calculateMargin(probabilities)
  };
}

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (-1 to 1)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate diversity score for a sample
 * Higher score = more diverse (less similar to existing samples)
 *
 * @param embedding - Sample embedding vector
 * @param existingEmbeddings - Embeddings of samples already in queue
 * @returns Diversity score (0 = very similar, 1 = very diverse)
 */
export function calculateDiversity(
  embedding: number[],
  existingEmbeddings: number[][]
): number {
  if (existingEmbeddings.length === 0) {
    return 1.0; // Maximally diverse if queue is empty
  }

  // Calculate average similarity to existing samples
  let totalSimilarity = 0;
  for (const existingEmb of existingEmbeddings) {
    const similarity = cosineSimilarity(embedding, existingEmb);
    totalSimilarity += similarity;
  }

  const avgSimilarity = totalSimilarity / existingEmbeddings.length;

  // Convert similarity to diversity (inverse relationship)
  // Clamp to [0, 1] range
  return Math.max(0, 1 - avgSimilarity);
}

/**
 * Calculate priority score for a sample
 * Combines uncertainty and diversity metrics
 *
 * @param uncertainty - Uncertainty metrics
 * @param diversityScore - Diversity score (optional)
 * @param config - Queue configuration
 * @returns Priority score (higher = more important to review)
 */
export function calculatePriorityScore(
  uncertainty: { confidence: number; entropy: number; marginScore: number },
  diversityScore: number = 1.0,
  config: Partial<QueueConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Uncertainty component (inverse of confidence)
  const uncertaintyScore = 1 - uncertainty.confidence;

  // Entropy component (normalized to 0-1)
  // Max entropy for binary classification is log2(n) where n is number of classes
  const maxEntropy = Math.log2(7); // 7 confidence scores
  const normalizedEntropy = Math.min(uncertainty.entropy / maxEntropy, 1.0);

  // Margin component (inverse - low margin = high priority)
  const marginScore = 1 - uncertainty.marginScore;

  // Combine components
  const uncertaintyComponent = (
    0.4 * uncertaintyScore +
    0.3 * normalizedEntropy +
    0.3 * marginScore
  );

  // Weighted combination with diversity
  const priorityScore = (
    (1 - cfg.diversityWeight) * uncertaintyComponent +
    cfg.diversityWeight * diversityScore
  );

  return priorityScore;
}

/**
 * Active Learning Queue Manager
 */
export class ActiveLearningQueue {
  private queue: Map<string, QueueItem>;
  private config: QueueConfig;
  private tenantQueues: Map<string, Set<string>>;

  constructor(config: Partial<QueueConfig> = {}) {
    this.queue = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tenantQueues = new Map();
  }

  /**
   * Add a sample to the queue if it meets uncertainty criteria
   *
   * @param sample - Sample to potentially add
   * @returns True if added, false if rejected
   */
  addSample(sample: ActiveLearningSample): boolean {
    // Check if sample already exists
    if (this.queue.has(sample.id)) {
      return false;
    }

    // Check uncertainty thresholds
    if (sample.confidence >= this.config.confidenceThreshold &&
        sample.marginScore >= this.config.marginThreshold) {
      return false; // Too confident, don't add
    }

    // Check queue capacity
    if (this.queue.size >= this.config.maxQueueSize) {
      // Remove lowest priority item if new sample has higher priority
      const lowestPriority = this.findLowestPrioritySample();
      if (lowestPriority && sample.priorityScore > lowestPriority.sample.priorityScore) {
        this.removeSample(lowestPriority.sample.id);
      } else {
        return false; // Queue full and this sample isn't high enough priority
      }
    }

    // Add to queue
    const queueItem: QueueItem = {
      sample,
      status: 'pending',
      addedAt: new Date()
    };

    this.queue.set(sample.id, queueItem);

    // Track tenant-specific queue if enabled
    if (this.config.tenantSpecific && sample.tenantId) {
      if (!this.tenantQueues.has(sample.tenantId)) {
        this.tenantQueues.set(sample.tenantId, new Set());
      }
      this.tenantQueues.get(sample.tenantId)!.add(sample.id);
    }

    return true;
  }

  /**
   * Create and add a sample from classification output
   *
   * @param id - Unique sample ID
   * @param text - Input text
   * @param prediction - Classification output
   * @param language - Detected language
   * @param options - Optional metadata
   * @returns True if added, false if rejected
   */
  createAndAddSample(
    id: string,
    text: string,
    prediction: ClassificationOutput,
    language: Language,
    options: {
      tenantId?: string;
      embedding?: number[];
      metadata?: Record<string, any>;
    } = {}
  ): boolean {
    // Calculate uncertainty metrics
    const uncertainty = calculateUncertainty(prediction);

    // Calculate diversity score if embeddings are available
    let diversityScore = 1.0;
    if (options.embedding) {
      const existingEmbeddings = Array.from(this.queue.values())
        .map(item => item.sample.embedding)
        .filter((emb): emb is number[] => emb !== undefined);

      diversityScore = calculateDiversity(options.embedding, existingEmbeddings);
    }

    // Calculate priority score
    const priorityScore = calculatePriorityScore(uncertainty, diversityScore, this.config);

    // Create sample
    const sample: ActiveLearningSample = {
      id,
      text,
      prediction,
      language,
      tenantId: options.tenantId,
      timestamp: new Date(),
      confidence: uncertainty.confidence,
      entropy: uncertainty.entropy,
      marginScore: uncertainty.marginScore,
      embedding: options.embedding,
      priorityScore,
      metadata: options.metadata
    };

    return this.addSample(sample);
  }

  /**
   * Get highest priority samples for review
   *
   * @param limit - Maximum number of samples to return
   * @param tenantId - Optional tenant filter
   * @returns Array of queue items sorted by priority
   */
  getTopPrioritySamples(limit?: number, tenantId?: string): QueueItem[] {
    let items = Array.from(this.queue.values());

    // Filter by tenant if specified
    if (tenantId && this.config.tenantSpecific) {
      const tenantSampleIds = this.tenantQueues.get(tenantId) || new Set();
      items = items.filter(item => tenantSampleIds.has(item.sample.id));
    }

    // Filter by status (only pending samples)
    items = items.filter(item => item.status === 'pending');

    // Sort by priority score (descending)
    items.sort((a, b) => b.sample.priorityScore - a.sample.priorityScore);

    // Apply limit
    if (limit) {
      items = items.slice(0, limit);
    }

    return items;
  }

  /**
   * Get a batch of samples for labeling
   *
   * @param batchSize - Number of samples to retrieve
   * @param tenantId - Optional tenant filter
   * @returns Array of queue items
   */
  getBatch(batchSize?: number, tenantId?: string): QueueItem[] {
    const size = batchSize || this.config.batchSize;
    return this.getTopPrioritySamples(size, tenantId);
  }

  /**
   * Mark a sample as labeled
   *
   * @param sampleId - Sample ID
   * @param groundTruth - Human-provided labels
   * @param labeledBy - Annotator ID
   */
  markAsLabeled(
    sampleId: string,
    groundTruth: Record<string, any>,
    labeledBy: string
  ): void {
    const item = this.queue.get(sampleId);
    if (!item) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    item.status = 'labeled';
    item.groundTruth = groundTruth;
    item.labeledBy = labeledBy;
    item.reviewedAt = new Date();
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalSize: number;
    byStatus: Record<string, number>;
    byLanguage: Record<string, number>;
    byTenant: Record<string, number>;
    avgPriorityScore: number;
    avgConfidence: number;
  } {
    const items = Array.from(this.queue.values());

    const byStatus: Record<string, number> = {
      pending: 0,
      in_review: 0,
      labeled: 0,
      skipped: 0
    };

    const byLanguage: Record<string, number> = {};
    const byTenant: Record<string, number> = {};

    let totalPriority = 0;
    let totalConfidence = 0;

    for (const item of items) {
      byStatus[item.status]++;

      const lang = item.sample.language;
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;

      if (item.sample.tenantId) {
        const tid = item.sample.tenantId;
        byTenant[tid] = (byTenant[tid] || 0) + 1;
      }

      totalPriority += item.sample.priorityScore;
      totalConfidence += item.sample.confidence;
    }

    return {
      totalSize: items.length,
      byStatus,
      byLanguage,
      byTenant,
      avgPriorityScore: items.length > 0 ? totalPriority / items.length : 0,
      avgConfidence: items.length > 0 ? totalConfidence / items.length : 0
    };
  }

  /**
   * Remove a sample from the queue
   */
  removeSample(sampleId: string): boolean {
    const item = this.queue.get(sampleId);
    if (!item) {
      return false;
    }

    // Remove from tenant queue
    if (item.sample.tenantId) {
      const tenantSamples = this.tenantQueues.get(item.sample.tenantId);
      if (tenantSamples) {
        tenantSamples.delete(sampleId);
      }
    }

    return this.queue.delete(sampleId);
  }

  /**
   * Find the sample with lowest priority score
   */
  private findLowestPrioritySample(): QueueItem | null {
    let lowest: QueueItem | null = null;
    let lowestScore = Infinity;

    for (const item of this.queue.values()) {
      if (item.sample.priorityScore < lowestScore) {
        lowest = item;
        lowestScore = item.sample.priorityScore;
      }
    }

    return lowest;
  }

  /**
   * Clear all samples (for testing or reset)
   */
  clear(): void {
    this.queue.clear();
    this.tenantQueues.clear();
  }

  /**
   * Export queue to JSON for persistence
   */
  exportQueue(): string {
    const items = Array.from(this.queue.entries()).map(([id, item]) => ({
      id,
      ...item
    }));

    return JSON.stringify({
      config: this.config,
      items,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import queue from JSON
   */
  importQueue(json: string): void {
    const data = JSON.parse(json);

    this.clear();

    if (data.config) {
      this.config = { ...DEFAULT_CONFIG, ...data.config };
    }

    for (const item of data.items || []) {
      const { id, ...queueItem } = item;
      this.queue.set(id, queueItem);

      // Rebuild tenant queues
      if (queueItem.sample.tenantId) {
        if (!this.tenantQueues.has(queueItem.sample.tenantId)) {
          this.tenantQueues.set(queueItem.sample.tenantId, new Set());
        }
        this.tenantQueues.get(queueItem.sample.tenantId)!.add(id);
      }
    }
  }
}
