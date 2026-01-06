/**
 * Tenant Weight Calibrator
 * Optimizes Q2Q model weights for a specific tenant using ground-truth labels
 *
 * Supports two optimization strategies:
 * 1. Gradient Descent: Iterative optimization using gradient-based learning
 * 2. Grid Search: Exhaustive search over discretized weight space
 */

import type { Q2QWeights } from '@teei/model-registry';
import type { CalibrationSample, PredictionResult } from './types.js';

/**
 * Ground truth label with multi-dimensional outcomes
 */
export interface GroundTruthLabel {
  sampleId: string;
  outcomes: {
    confidence: number;      // 0-1
    belonging: number;       // 0-1
    language_proficiency: number;  // 0-1
    job_readiness: number;   // 0-1
    wellbeing: number;       // 0-1
  };
}

/**
 * Calibration result with optimized weights and metrics
 */
export interface CalibrationResult {
  tenantId: string;
  optimizedWeights: Q2QWeights;
  confidence: number;  // Confidence in calibration quality (0-1)
  metrics: {
    finalLoss: number;
    iterations: number;
    convergenceTime: number; // milliseconds
    validationAccuracy?: number;
  };
  strategy: 'gradient_descent' | 'grid_search';
}

/**
 * Calibration options
 */
export interface CalibrationOptions {
  strategy?: 'gradient_descent' | 'grid_search';
  learningRate?: number;      // For gradient descent (default: 0.01)
  maxIterations?: number;     // For gradient descent (default: 1000)
  convergenceThreshold?: number; // Loss change threshold (default: 0.0001)
  gridResolution?: number;    // For grid search (default: 20)
  validationSplit?: number;   // Fraction for validation (default: 0.2)
}

/**
 * Prediction function type - must be provided by caller
 * Takes weights and sample text, returns predicted outcome scores
 */
export type PredictFn = (weights: Q2QWeights, text: string) => Promise<{
  confidence: number;
  belonging: number;
  language_proficiency: number;
  job_readiness: number;
  wellbeing: number;
}>;

/**
 * Calculate Mean Squared Error between predictions and ground truth
 */
function calculateMSE(
  predictions: Array<{ confidence: number; belonging: number; language_proficiency: number; job_readiness: number; wellbeing: number }>,
  groundTruth: GroundTruthLabel[]
): number {
  let totalError = 0;
  const n = predictions.length;

  for (let i = 0; i < n; i++) {
    const pred = predictions[i];
    const truth = groundTruth[i].outcomes;

    // Sum squared errors across all dimensions
    totalError += Math.pow(pred.confidence - truth.confidence, 2);
    totalError += Math.pow(pred.belonging - truth.belonging, 2);
    totalError += Math.pow(pred.language_proficiency - truth.language_proficiency, 2);
    totalError += Math.pow(pred.job_readiness - truth.job_readiness, 2);
    totalError += Math.pow(pred.wellbeing - truth.wellbeing, 2);
  }

  return totalError / (n * 5); // Average across all dimensions and samples
}

/**
 * Normalize weights to sum to 1.0
 */
function normalizeWeights(weights: Q2QWeights): Q2QWeights {
  const sum = weights.confidence + weights.belonging + weights.language_proficiency +
              weights.job_readiness + weights.wellbeing;

  if (sum === 0) {
    // Return equal weights if sum is zero
    return {
      confidence: 0.2,
      belonging: 0.2,
      language_proficiency: 0.2,
      job_readiness: 0.2,
      wellbeing: 0.2,
    };
  }

  return {
    confidence: weights.confidence / sum,
    belonging: weights.belonging / sum,
    language_proficiency: weights.language_proficiency / sum,
    job_readiness: weights.job_readiness / sum,
    wellbeing: weights.wellbeing / sum,
  };
}

/**
 * Validate that weights sum to approximately 1.0
 */
function validateWeights(weights: Q2QWeights): boolean {
  const sum = weights.confidence + weights.belonging + weights.language_proficiency +
              weights.job_readiness + weights.wellbeing;
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Optimize weights using gradient descent
 */
async function optimizeWithGradientDescent(
  samples: CalibrationSample[],
  groundTruth: GroundTruthLabel[],
  predictFn: PredictFn,
  options: Required<CalibrationOptions>
): Promise<{ weights: Q2QWeights; metrics: CalibrationResult['metrics'] }> {
  const startTime = Date.now();

  // Initialize with equal weights
  let weights: Q2QWeights = {
    confidence: 0.2,
    belonging: 0.2,
    language_proficiency: 0.2,
    job_readiness: 0.2,
    wellbeing: 0.2,
  };

  let previousLoss = Infinity;
  let iterations = 0;

  for (let iter = 0; iter < options.maxIterations; iter++) {
    iterations++;

    // Get predictions with current weights
    const predictions = await Promise.all(
      samples.map(sample => predictFn(weights, sample.text))
    );

    // Calculate current loss
    const currentLoss = calculateMSE(predictions, groundTruth);

    // Check for convergence
    if (Math.abs(previousLoss - currentLoss) < options.convergenceThreshold) {
      break;
    }

    // Compute gradients (numerical approximation)
    const epsilon = 0.001;
    const gradients = {
      confidence: 0,
      belonging: 0,
      language_proficiency: 0,
      job_readiness: 0,
      wellbeing: 0,
    };

    for (const key of Object.keys(weights) as Array<keyof Q2QWeights>) {
      // Perturb weight slightly
      const perturbedWeights = { ...weights, [key]: weights[key] + epsilon };
      const normalizedPerturbed = normalizeWeights(perturbedWeights);

      // Get predictions with perturbed weights
      const perturbedPredictions = await Promise.all(
        samples.map(sample => predictFn(normalizedPerturbed, sample.text))
      );

      // Calculate loss with perturbed weights
      const perturbedLoss = calculateMSE(perturbedPredictions, groundTruth);

      // Numerical gradient
      gradients[key] = (perturbedLoss - currentLoss) / epsilon;
    }

    // Update weights using gradient descent
    weights = {
      confidence: weights.confidence - options.learningRate * gradients.confidence,
      belonging: weights.belonging - options.learningRate * gradients.belonging,
      language_proficiency: weights.language_proficiency - options.learningRate * gradients.language_proficiency,
      job_readiness: weights.job_readiness - options.learningRate * gradients.job_readiness,
      wellbeing: weights.wellbeing - options.learningRate * gradients.wellbeing,
    };

    // Normalize and ensure non-negative
    weights = normalizeWeights({
      confidence: Math.max(0, weights.confidence),
      belonging: Math.max(0, weights.belonging),
      language_proficiency: Math.max(0, weights.language_proficiency),
      job_readiness: Math.max(0, weights.job_readiness),
      wellbeing: Math.max(0, weights.wellbeing),
    });

    previousLoss = currentLoss;
  }

  const convergenceTime = Date.now() - startTime;

  return {
    weights,
    metrics: {
      finalLoss: previousLoss,
      iterations,
      convergenceTime,
    },
  };
}

/**
 * Optimize weights using grid search
 */
async function optimizeWithGridSearch(
  samples: CalibrationSample[],
  groundTruth: GroundTruthLabel[],
  predictFn: PredictFn,
  options: Required<CalibrationOptions>
): Promise<{ weights: Q2QWeights; metrics: CalibrationResult['metrics'] }> {
  const startTime = Date.now();
  const resolution = options.gridResolution;

  let bestWeights: Q2QWeights | null = null;
  let bestLoss = Infinity;
  let iterations = 0;

  // Generate grid points (simplified 3D grid over first 3 dimensions)
  // Last 2 dimensions computed to sum to 1.0
  const step = 1.0 / resolution;

  for (let i = 0; i <= resolution; i++) {
    const confidence = i * step;

    for (let j = 0; j <= resolution - i; j++) {
      const belonging = j * step;

      for (let k = 0; k <= resolution - i - j; k++) {
        const language_proficiency = k * step;

        for (let l = 0; l <= resolution - i - j - k; l++) {
          const job_readiness = l * step;
          const wellbeing = 1.0 - confidence - belonging - language_proficiency - job_readiness;

          if (wellbeing < 0 || wellbeing > 1) continue;

          iterations++;

          const weights: Q2QWeights = {
            confidence,
            belonging,
            language_proficiency,
            job_readiness,
            wellbeing,
          };

          // Get predictions with these weights
          const predictions = await Promise.all(
            samples.map(sample => predictFn(weights, sample.text))
          );

          // Calculate loss
          const loss = calculateMSE(predictions, groundTruth);

          if (loss < bestLoss) {
            bestLoss = loss;
            bestWeights = weights;
          }
        }
      }
    }
  }

  const convergenceTime = Date.now() - startTime;

  return {
    weights: bestWeights || {
      confidence: 0.2,
      belonging: 0.2,
      language_proficiency: 0.2,
      job_readiness: 0.2,
      wellbeing: 0.2,
    },
    metrics: {
      finalLoss: bestLoss,
      iterations,
      convergenceTime,
    },
  };
}

/**
 * Calibrate Q2Q weights for a specific tenant
 *
 * @param tenantId - Tenant identifier
 * @param samples - Calibration samples with text
 * @param groundTruth - Ground truth labels for each sample
 * @param predictFn - Function to generate predictions with given weights
 * @param options - Calibration options
 * @returns Calibration result with optimized weights and metrics
 *
 * @example
 * ```typescript
 * const result = await calibrateTenantWeights(
 *   'acme-corp',
 *   samples,
 *   groundTruth,
 *   async (weights, text) => {
 *     // Call your Q2Q model with these weights
 *     return await q2qModel.predict(text, weights);
 *   },
 *   { strategy: 'gradient_descent', maxIterations: 500 }
 * );
 * ```
 */
export async function calibrateTenantWeights(
  tenantId: string,
  samples: CalibrationSample[],
  groundTruth: GroundTruthLabel[],
  predictFn: PredictFn,
  options: CalibrationOptions = {}
): Promise<CalibrationResult> {
  // Validate inputs
  if (samples.length !== groundTruth.length) {
    throw new Error('Samples and ground truth labels must have the same length');
  }

  if (samples.length === 0) {
    throw new Error('Cannot calibrate with empty dataset');
  }

  // Set default options
  const opts: Required<CalibrationOptions> = {
    strategy: options.strategy || 'gradient_descent',
    learningRate: options.learningRate || 0.01,
    maxIterations: options.maxIterations || 1000,
    convergenceThreshold: options.convergenceThreshold || 0.0001,
    gridResolution: options.gridResolution || 20,
    validationSplit: options.validationSplit || 0.2,
  };

  // Split data into training and validation sets
  const splitIndex = Math.floor(samples.length * (1 - opts.validationSplit));
  const trainSamples = samples.slice(0, splitIndex);
  const trainTruth = groundTruth.slice(0, splitIndex);
  const valSamples = samples.slice(splitIndex);
  const valTruth = groundTruth.slice(splitIndex);

  // Optimize weights
  const { weights, metrics } = opts.strategy === 'gradient_descent'
    ? await optimizeWithGradientDescent(trainSamples, trainTruth, predictFn, opts)
    : await optimizeWithGridSearch(trainSamples, trainTruth, predictFn, opts);

  // Validate optimized weights
  if (!validateWeights(weights)) {
    throw new Error('Optimized weights do not sum to 1.0');
  }

  // Calculate validation accuracy if validation set exists
  let validationAccuracy: number | undefined;
  if (valSamples.length > 0) {
    const valPredictions = await Promise.all(
      valSamples.map(sample => predictFn(weights, sample.text))
    );
    const valLoss = calculateMSE(valPredictions, valTruth);
    validationAccuracy = 1 - valLoss; // Convert loss to accuracy-like metric
  }

  // Calculate confidence based on loss and sample size
  const confidence = Math.min(
    1.0,
    Math.max(
      0.0,
      (1 - metrics.finalLoss) * Math.min(1.0, samples.length / 100)
    )
  );

  return {
    tenantId,
    optimizedWeights: weights,
    confidence,
    metrics: {
      ...metrics,
      validationAccuracy,
    },
    strategy: opts.strategy,
  };
}

/**
 * Load ground truth labels from calibration dataset
 *
 * @param samples - Calibration samples
 * @returns Array of ground truth labels
 */
export function loadGroundTruthLabels(
  samples: Array<CalibrationSample & {
    outcomes: {
      confidence: number;
      belonging: number;
      language_proficiency: number;
      job_readiness: number;
      wellbeing: number;
    };
  }>
): GroundTruthLabel[] {
  return samples.map(sample => ({
    sampleId: sample.id,
    outcomes: sample.outcomes,
  }));
}
