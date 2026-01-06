import { ForecastResult, ScenarioForecast, ForecastPrediction } from '../types.js';

/**
 * Generate scenario forecasts from a base forecast
 *
 * Creates three scenarios:
 * - Optimistic: Upper 80% confidence band
 * - Realistic: Point estimate (median)
 * - Pessimistic: Lower 80% confidence band
 *
 * @param forecastResult - Base forecast with confidence bands
 * @returns Scenario forecast with assumptions
 */
export function generateScenarios(forecastResult: ForecastResult): ScenarioForecast {
  const { predictions, confidenceBands } = forecastResult;

  const optimistic: ForecastPrediction[] = predictions.map((pred, i) => ({
    date: pred.date,
    value: parseFloat((confidenceBands.upper80[i] || 0).toFixed(2)),
  }));

  const realistic: ForecastPrediction[] = predictions.map((pred) => ({
    date: pred.date,
    value: parseFloat(pred.value.toFixed(2)),
  }));

  const pessimistic: ForecastPrediction[] = predictions.map((pred, i) => ({
    date: pred.date,
    value: parseFloat((confidenceBands.lower80[i] || 0).toFixed(2)),
  }));

  return {
    scenarios: {
      optimistic,
      realistic,
      pessimistic,
    },
    assumptions: {
      optimistic:
        'Assumes favorable conditions with sustained growth trends and minimal disruptions',
      realistic:
        'Based on historical patterns and current trajectory with normal variance',
      pessimistic:
        'Accounts for potential headwinds, reduced engagement, or market challenges',
    },
  };
}

/**
 * Generate custom scenarios with growth multipliers
 *
 * @param baseScenario - Base realistic scenario
 * @param growthMultipliers - Growth adjustment for each scenario
 * @returns Custom scenario forecast
 */
export function generateCustomScenarios(
  baseScenario: ForecastPrediction[],
  growthMultipliers: {
    optimistic: number;
    pessimistic: number;
  }
): Pick<ScenarioForecast, 'scenarios'> {
  const optimistic = baseScenario.map((pred, i) => ({
    date: pred.date,
    // Apply compounding growth
    value: parseFloat(
      (pred.value * Math.pow(1 + growthMultipliers.optimistic, i + 1)).toFixed(2)
    ),
  }));

  const pessimistic = baseScenario.map((pred, i) => ({
    date: pred.date,
    // Apply compounding decline
    value: parseFloat(
      (pred.value * Math.pow(1 + growthMultipliers.pessimistic, i + 1)).toFixed(2)
    ),
  }));

  return {
    scenarios: {
      optimistic,
      realistic: baseScenario,
      pessimistic,
    },
  };
}

/**
 * Calculate probability of exceeding a target
 *
 * Uses confidence bands to estimate probability
 *
 * @param target - Target value to exceed
 * @param prediction - Point prediction
 * @param confidenceBands - Confidence bands
 * @param index - Index in prediction array
 * @returns Probability (0-1)
 */
export function calculateExceedanceProbability(
  target: number,
  _prediction: number,
  confidenceBands: { lower95: number[]; upper95: number[] },
  index: number
): number {
  const lower = confidenceBands.lower95[index] || 0;
  const upper = confidenceBands.upper95[index] || 0;

  if (target < lower) return 1.0; // Very likely to exceed
  if (target > upper) return 0.0; // Very unlikely to exceed

  // Linear interpolation (simplified)
  // Assumes normal distribution
  const range = upper - lower;
  const position = (target - lower) / range;

  // Convert to probability (inverse CDF approximation)
  return 1 - position;
}
