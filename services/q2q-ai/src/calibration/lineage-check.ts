/**
 * Lineage Verification
 * Ensures evidence citations and lineage remain valid after calibration changes
 *
 * This module verifies that:
 * 1. Evidence IDs are preserved across calibration runs
 * 2. Citations remain valid and traceable
 * 3. No lineage breaks are introduced by parameter changes
 * 4. Outcome scores can still be traced back to source evidence
 */

import type { Q2QWeights, Q2QThresholds } from '@teei/model-registry';

/**
 * Evidence citation linking prediction to source
 */
export interface EvidenceCitation {
  evidenceId: string;        // Unique identifier for source evidence
  sourceType: 'feedback' | 'survey' | 'observation' | 'document';
  sourceId: string;          // ID in source system
  extractedText: string;     // Text snippet used for prediction
  timestamp: string;         // ISO 8601 timestamp
  confidence: number;        // Confidence in citation (0-1)
}

/**
 * Prediction with lineage metadata
 */
export interface PredictionWithLineage {
  predictionId: string;
  sampleId: string;
  dimension: string;
  score: number;
  threshold: number;
  classifications: string[];  // Labels assigned
  citations: EvidenceCitation[];
  modelVersion: string;
  weightsHash: string;        // Hash of weights used
  thresholdsHash: string;     // Hash of thresholds used
  timestamp: string;
}

/**
 * Lineage verification result
 */
export interface LineageVerificationResult {
  isValid: boolean;
  errors: LineageError[];
  warnings: LineageWarning[];
  metrics: {
    totalPredictions: number;
    validCitations: number;
    invalidCitations: number;
    missingEvidence: number;
    brokenLinks: number;
  };
}

/**
 * Lineage error (blocking issue)
 */
export interface LineageError {
  type: 'missing_evidence' | 'broken_citation' | 'invalid_hash' | 'orphaned_prediction';
  predictionId: string;
  evidenceId?: string;
  message: string;
}

/**
 * Lineage warning (non-blocking issue)
 */
export interface LineageWarning {
  type: 'low_confidence' | 'stale_evidence' | 'inconsistent_metadata';
  predictionId: string;
  evidenceId?: string;
  message: string;
}

/**
 * Evidence store interface (to be implemented by caller)
 */
export interface EvidenceStore {
  /**
   * Check if evidence ID exists
   */
  exists(evidenceId: string): Promise<boolean>;

  /**
   * Get evidence by ID
   */
  get(evidenceId: string): Promise<EvidenceCitation | null>;

  /**
   * Verify citation links to valid source
   */
  verifyCitation(citation: EvidenceCitation): Promise<boolean>;
}

/**
 * Hash weights for comparison
 */
function hashWeights(weights: Q2QWeights): string {
  const str = JSON.stringify({
    confidence: weights.confidence.toFixed(6),
    belonging: weights.belonging.toFixed(6),
    language_proficiency: weights.language_proficiency.toFixed(6),
    job_readiness: weights.job_readiness.toFixed(6),
    wellbeing: weights.wellbeing.toFixed(6),
  });

  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Hash thresholds for comparison
 */
function hashThresholds(thresholds: Q2QThresholds): string {
  const str = JSON.stringify({
    confidence: thresholds.confidence.toFixed(6),
    belonging: thresholds.belonging.toFixed(6),
    language_proficiency: thresholds.language_proficiency.toFixed(6),
    job_readiness: thresholds.job_readiness.toFixed(6),
    wellbeing: thresholds.wellbeing.toFixed(6),
  });

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Verify that evidence citations remain valid
 *
 * @param predictions - Predictions with lineage metadata
 * @param evidenceStore - Evidence store implementation
 * @returns Verification result
 */
export async function verifyCitations(
  predictions: PredictionWithLineage[],
  evidenceStore: EvidenceStore
): Promise<LineageVerificationResult> {
  const errors: LineageError[] = [];
  const warnings: LineageWarning[] = [];
  let validCitations = 0;
  let invalidCitations = 0;
  let missingEvidence = 0;
  let brokenLinks = 0;

  for (const prediction of predictions) {
    // Check each citation
    for (const citation of prediction.citations) {
      // Verify evidence exists
      const exists = await evidenceStore.exists(citation.evidenceId);
      if (!exists) {
        errors.push({
          type: 'missing_evidence',
          predictionId: prediction.predictionId,
          evidenceId: citation.evidenceId,
          message: `Evidence ${citation.evidenceId} not found in store`,
        });
        missingEvidence++;
        invalidCitations++;
        continue;
      }

      // Verify citation is valid
      const isValid = await evidenceStore.verifyCitation(citation);
      if (!isValid) {
        errors.push({
          type: 'broken_citation',
          predictionId: prediction.predictionId,
          evidenceId: citation.evidenceId,
          message: `Citation to ${citation.evidenceId} is invalid or broken`,
        });
        brokenLinks++;
        invalidCitations++;
        continue;
      }

      // Check citation confidence
      if (citation.confidence < 0.5) {
        warnings.push({
          type: 'low_confidence',
          predictionId: prediction.predictionId,
          evidenceId: citation.evidenceId,
          message: `Citation confidence is low (${citation.confidence.toFixed(2)})`,
        });
      }

      // Check evidence age (warn if older than 1 year)
      const evidenceAge = Date.now() - new Date(citation.timestamp).getTime();
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (evidenceAge > oneYearMs) {
        warnings.push({
          type: 'stale_evidence',
          predictionId: prediction.predictionId,
          evidenceId: citation.evidenceId,
          message: `Evidence is older than 1 year`,
        });
      }

      validCitations++;
    }

    // Check for orphaned predictions (no citations)
    if (prediction.citations.length === 0) {
      errors.push({
        type: 'orphaned_prediction',
        predictionId: prediction.predictionId,
        message: `Prediction has no evidence citations`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalPredictions: predictions.length,
      validCitations,
      invalidCitations,
      missingEvidence,
      brokenLinks,
    },
  };
}

/**
 * Compare predictions before and after calibration
 * Ensures no lineage breaks were introduced
 *
 * @param beforePredictions - Predictions before calibration
 * @param afterPredictions - Predictions after calibration
 * @returns Verification result
 */
export function compareLineage(
  beforePredictions: PredictionWithLineage[],
  afterPredictions: PredictionWithLineage[]
): LineageVerificationResult {
  const errors: LineageError[] = [];
  const warnings: LineageWarning[] = [];

  // Create maps for quick lookup
  const beforeMap = new Map(beforePredictions.map(p => [p.sampleId, p]));
  const afterMap = new Map(afterPredictions.map(p => [p.sampleId, p]));

  // Check for missing predictions
  for (const sampleId of beforeMap.keys()) {
    if (!afterMap.has(sampleId)) {
      errors.push({
        type: 'orphaned_prediction',
        predictionId: beforeMap.get(sampleId)!.predictionId,
        message: `Prediction missing after calibration for sample ${sampleId}`,
      });
    }
  }

  // Compare citations for matching predictions
  let validCitations = 0;
  let invalidCitations = 0;

  for (const [sampleId, afterPred] of afterMap.entries()) {
    const beforePred = beforeMap.get(sampleId);
    if (!beforePred) continue;

    // Build sets of evidence IDs
    const beforeEvidenceIds = new Set(beforePred.citations.map(c => c.evidenceId));
    const afterEvidenceIds = new Set(afterPred.citations.map(c => c.evidenceId));

    // Check for missing evidence IDs
    for (const evidenceId of beforeEvidenceIds) {
      if (!afterEvidenceIds.has(evidenceId)) {
        warnings.push({
          type: 'inconsistent_metadata',
          predictionId: afterPred.predictionId,
          evidenceId,
          message: `Evidence ${evidenceId} present before but missing after calibration`,
        });
        invalidCitations++;
      } else {
        validCitations++;
      }
    }

    // Check for new evidence IDs (informational only)
    for (const evidenceId of afterEvidenceIds) {
      if (!beforeEvidenceIds.has(evidenceId)) {
        warnings.push({
          type: 'inconsistent_metadata',
          predictionId: afterPred.predictionId,
          evidenceId,
          message: `New evidence ${evidenceId} added after calibration`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalPredictions: afterPredictions.length,
      validCitations,
      invalidCitations,
      missingEvidence: 0,
      brokenLinks: 0,
    },
  };
}

/**
 * Verify calibration change preserves lineage
 *
 * @param tenantId - Tenant identifier
 * @param predictions - Predictions with current lineage
 * @param newWeights - New calibrated weights
 * @param newThresholds - New calibrated thresholds
 * @param evidenceStore - Evidence store implementation
 * @returns Verification result with compatibility check
 */
export async function verifyCalibrationChange(
  tenantId: string,
  predictions: PredictionWithLineage[],
  newWeights: Q2QWeights,
  newThresholds: Q2QThresholds,
  evidenceStore: EvidenceStore
): Promise<LineageVerificationResult & { compatible: boolean }> {
  // First verify existing citations
  const citationResult = await verifyCitations(predictions, evidenceStore);

  // Calculate new hashes
  const newWeightsHash = hashWeights(newWeights);
  const newThresholdsHash = hashThresholds(newThresholds);

  // Check if any predictions would be invalidated
  const errors = [...citationResult.errors];
  const warnings = [...citationResult.warnings];

  for (const prediction of predictions) {
    // Check if weights/thresholds have changed significantly
    const weightsChanged = prediction.weightsHash !== newWeightsHash;
    const thresholdsChanged = prediction.thresholdsHash !== newThresholdsHash;

    if (weightsChanged || thresholdsChanged) {
      warnings.push({
        type: 'inconsistent_metadata',
        predictionId: prediction.predictionId,
        message: `Prediction metadata will be inconsistent after calibration change`,
      });
    }
  }

  // Consider compatible if no errors (warnings are acceptable)
  const compatible = errors.length === 0;

  return {
    ...citationResult,
    errors,
    warnings,
    compatible,
  };
}

/**
 * Generate lineage report for audit purposes
 *
 * @param result - Verification result
 * @returns Formatted report string
 */
export function generateLineageReport(result: LineageVerificationResult): string {
  const lines: string[] = [];

  lines.push('=== Lineage Verification Report ===');
  lines.push('');
  lines.push(`Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
  lines.push('');

  lines.push('Metrics:');
  lines.push(`  Total Predictions: ${result.metrics.totalPredictions}`);
  lines.push(`  Valid Citations: ${result.metrics.validCitations}`);
  lines.push(`  Invalid Citations: ${result.metrics.invalidCitations}`);
  lines.push(`  Missing Evidence: ${result.metrics.missingEvidence}`);
  lines.push(`  Broken Links: ${result.metrics.brokenLinks}`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  [${error.type}] ${error.message}`);
      if (error.evidenceId) {
        lines.push(`    Evidence ID: ${error.evidenceId}`);
      }
      lines.push(`    Prediction ID: ${error.predictionId}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  [${warning.type}] ${warning.message}`);
      if (warning.evidenceId) {
        lines.push(`    Evidence ID: ${warning.evidenceId}`);
      }
      lines.push(`    Prediction ID: ${warning.predictionId}`);
    }
    lines.push('');
  }

  lines.push('=== End of Report ===');

  return lines.join('\n');
}

/**
 * Create parameter hashes for tracking
 */
export function createParameterHashes(
  weights: Q2QWeights,
  thresholds: Q2QThresholds
): {
  weightsHash: string;
  thresholdsHash: string;
} {
  return {
    weightsHash: hashWeights(weights),
    thresholdsHash: hashThresholds(thresholds),
  };
}

/**
 * Validate prediction lineage metadata
 */
export function validatePredictionMetadata(
  prediction: PredictionWithLineage,
  expectedWeights: Q2QWeights,
  expectedThresholds: Q2QThresholds
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const expectedHashes = createParameterHashes(expectedWeights, expectedThresholds);

  if (prediction.weightsHash !== expectedHashes.weightsHash) {
    errors.push('Weights hash mismatch');
  }

  if (prediction.thresholdsHash !== expectedHashes.thresholdsHash) {
    errors.push('Thresholds hash mismatch');
  }

  if (prediction.citations.length === 0) {
    errors.push('No evidence citations');
  }

  for (const citation of prediction.citations) {
    if (!citation.evidenceId || citation.evidenceId.trim() === '') {
      errors.push('Empty evidence ID');
    }
    if (citation.confidence < 0 || citation.confidence > 1) {
      errors.push('Invalid citation confidence');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
