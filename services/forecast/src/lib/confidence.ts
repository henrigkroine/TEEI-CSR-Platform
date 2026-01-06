import { standardDeviation } from 'simple-statistics';
import { ConfidenceBands } from '../types.js';

/**
 * Calculate confidence bands for predictions
 *
 * Uses residual standard deviation to compute prediction intervals
 * assuming normally distributed errors
 *
 * @param predictions - Point forecasts
 * @param residuals - Historical residuals (actual - predicted)
 * @returns Confidence bands at 80% and 95% levels
 */
export function calculateConfidenceBands(
  predictions: number[],
  residuals: number[]
): ConfidenceBands {
  // Calculate residual standard deviation
  const residualStd = standardDeviation(residuals);

  // Z-scores for different confidence levels
  // 80% CI: ±1.28, 95% CI: ±1.96
  const z80 = 1.28;
  const z95 = 1.96;

  const lower80: number[] = [];
  const upper80: number[] = [];
  const lower95: number[] = [];
  const upper95: number[] = [];

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i] || 0;

    // Forecast error grows with horizon (simple model)
    const errorMultiplier = Math.sqrt(1 + i * 0.1);
    const adjustedStd = residualStd * errorMultiplier;

    lower80.push(pred - z80 * adjustedStd);
    upper80.push(pred + z80 * adjustedStd);
    lower95.push(pred - z95 * adjustedStd);
    upper95.push(pred + z95 * adjustedStd);
  }

  return {
    lower80,
    upper80,
    lower95,
    upper95,
  };
}

/**
 * Calculate residuals from historical predictions
 */
export function calculateResiduals(
  actual: number[],
  predicted: number[]
): number[] {
  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have same length');
  }

  return actual.map((a, i) => a - predicted[i]);
}

/**
 * Bootstrap confidence intervals
 * More robust than parametric intervals, especially for non-normal errors
 *
 * @param predictions - Point forecasts
 * @param residuals - Historical residuals
 * @param numSamples - Number of bootstrap samples
 * @returns Confidence bands
 */
export function bootstrapConfidenceBands(
  predictions: number[],
  residuals: number[],
  numSamples: number = 1000
): ConfidenceBands {
  const horizonLength = predictions.length;
  const bootstrapPredictions: number[][] = Array(horizonLength)
    .fill(0)
    .map((): number[] => []);

  // Generate bootstrap samples
  for (let sample = 0; sample < numSamples; sample++) {
    for (let h = 0; h < horizonLength; h++) {
      // Randomly sample from residuals
      const randomResidual = residuals[Math.floor(Math.random() * residuals.length)] || 0;
      const predValue = predictions[h] || 0;
      const bootstrapArray = bootstrapPredictions[h];
      if (bootstrapArray) {
        bootstrapArray.push(predValue + randomResidual);
      }
    }
  }

  // Calculate percentiles
  const lower80: number[] = [];
  const upper80: number[] = [];
  const lower95: number[] = [];
  const upper95: number[] = [];

  for (let h = 0; h < horizonLength; h++) {
    const bootstrapArray = bootstrapPredictions[h];
    if (!bootstrapArray) continue;

    const sorted = bootstrapArray.sort((a, b) => a - b);

    lower95.push(sorted[Math.floor(numSamples * 0.025)] || 0);
    lower80.push(sorted[Math.floor(numSamples * 0.10)] || 0);
    upper80.push(sorted[Math.floor(numSamples * 0.90)] || 0);
    upper95.push(sorted[Math.floor(numSamples * 0.975)] || 0);
  }

  return {
    lower80,
    upper80,
    lower95,
    upper95,
  };
}
