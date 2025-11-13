import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { OutcomeDimension } from './taxonomy.js';
import { getInferenceDriver } from './inference/driver.js';
import { classificationToLegacyScores, ClassificationOutput } from './labels.js';

/**
 * Classification result for a text sample
 */
export interface ClassificationResult {
  scores: Record<OutcomeDimension, number>;
  metadata: {
    textLength: number;
    wordCount: number;
    timestamp: string;
    provider?: string;
    modelName?: string;
    tokens?: any;
    cost?: any;
    latencyMs?: number;
  };
  rawClassification?: ClassificationOutput;
}

/**
 * Production AI Classifier
 *
 * Uses provider-agnostic inference driver to classify text using
 * Claude, OpenAI, or Gemini based on configuration.
 */
export async function classifyText(
  text: string,
  options: { correlationId?: string; userId?: string } = {}
): Promise<ClassificationResult> {
  // Calculate basic text metadata
  const textLength = text.length;
  const wordCount = text.trim().split(/\s+/).length;

  try {
    // Get inference driver and classify text
    const driver = getInferenceDriver();
    const inferenceResult = await driver.classify({
      text,
      correlationId: options.correlationId,
      userId: options.userId
    });

    // Convert classification to legacy dimension scores
    const scores = classificationToLegacyScores(inferenceResult.classification);

    return {
      scores: scores as Record<OutcomeDimension, number>,
      metadata: {
        textLength,
        wordCount,
        timestamp: inferenceResult.timestamp,
        provider: inferenceResult.provider,
        modelName: inferenceResult.modelName,
        tokens: inferenceResult.tokens,
        cost: inferenceResult.cost,
        latencyMs: inferenceResult.latencyMs
      },
      rawClassification: inferenceResult.classification
    };
  } catch (error: any) {
    console.error('Classification failed, falling back to neutral scores:', error.message);

    // Fallback to neutral scores if inference fails
    const scores: Record<OutcomeDimension, number> = {
      [OutcomeDimension.CONFIDENCE]: 0.5,
      [OutcomeDimension.BELONGING]: 0.5,
      [OutcomeDimension.LANG_LEVEL_PROXY]: 0.5,
      [OutcomeDimension.JOB_READINESS]: 0.5,
      [OutcomeDimension.WELL_BEING]: 0.5
    };

    return {
      scores,
      metadata: {
        textLength,
        wordCount,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Extract evidence snippets from AI classification result
 *
 * Returns snippets with metadata including position, reasoning, and hash
 */
export function extractEvidenceSnippets(
  text: string,
  classification: ClassificationOutput
): Array<{
  snippet: string;
  hash: string;
  labelType: string;
  reasoning: string;
  positionStart?: number;
  positionEnd?: number;
}> {
  const snippets: Array<{
    snippet: string;
    hash: string;
    labelType: string;
    reasoning: string;
    positionStart?: number;
    positionEnd?: number;
  }> = [];

  // Extract evidence from classification
  for (const evidence of classification.evidence) {
    // Generate hash for deduplication
    const hash = createHash('sha256')
      .update(evidence.snippet)
      .digest('hex');

    snippets.push({
      snippet: evidence.snippet,
      hash,
      labelType: evidence.label_type,
      reasoning: evidence.reasoning,
      positionStart: evidence.position_start,
      positionEnd: evidence.position_end
    });
  }

  return snippets;
}

/**
 * Legacy function for backward compatibility
 * Extracts a simple snippet when raw classification is not available
 */
export function extractEvidenceSnippetsLegacy(
  text: string,
  dimension: OutcomeDimension,
  score: number
): string[] {
  const maxLength = 100;
  const snippet = text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;

  return [snippet];
}
