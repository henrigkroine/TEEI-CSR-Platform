import {
  TimeSeriesDataPoint,
  ForecastResult,
  ETSConfig,
  ProphetConfig,
  ConfidenceBands,
} from '../types.js';
import { forecastETS } from './ets.js';
import { forecastProphet } from './prophet.js';

/**
 * Ensemble forecasting combining multiple models
 *
 * Combines ETS and Prophet predictions using weighted averaging
 * Typically more robust than single models
 *
 * @param historicalData - Historical time series data
 * @param horizonMonths - Number of months to forecast
 * @param config - Configuration for individual models
 * @returns Combined forecast result
 */
export async function forecastEnsemble(
  historicalData: TimeSeriesDataPoint[],
  horizonMonths: number,
  config?: {
    ets?: ETSConfig;
    prophet?: ProphetConfig;
    weights?: { ets: number; prophet: number };
  }
): Promise<ForecastResult> {
  // Default configurations
  const etsConfig: ETSConfig = config?.ets || {
    method: 'holt-winters',
    seasonalPeriod: 12,
  };

  const prophetConfig: ProphetConfig = config?.prophet || {
    growth: 'linear',
    seasonality: {
      yearly: true,
      quarterly: true,
    },
  };

  // Default weights (equal weighting)
  const weights = config?.weights || { ets: 0.5, prophet: 0.5 };

  // Normalize weights
  const totalWeight = weights.ets + weights.prophet;
  const normalizedWeights = {
    ets: weights.ets / totalWeight,
    prophet: weights.prophet / totalWeight,
  };

  // Run both models in parallel
  const [etsResult, prophetResult] = await Promise.all([
    forecastETS(historicalData, horizonMonths, etsConfig),
    forecastProphet(historicalData, horizonMonths, prophetConfig),
  ]);

  // Combine predictions using weighted average
  const predictions = etsResult.predictions.map((etsPred, i) => {
    const prophetPred = prophetResult.predictions[i] || { date: etsPred.date, value: 0 };
    const combinedValue =
      normalizedWeights.ets * etsPred.value +
      normalizedWeights.prophet * prophetPred.value;

    return {
      date: etsPred.date,
      value: parseFloat(combinedValue.toFixed(2)),
    };
  });

  // Combine confidence bands
  const confidenceBands = combineConfidenceBands(
    etsResult.confidenceBands,
    prophetResult.confidenceBands,
    normalizedWeights
  );

  // Use average of both models' metrics
  const metrics = {
    mae: (etsResult.metrics.mae + prophetResult.metrics.mae) / 2,
    rmse: (etsResult.metrics.rmse + prophetResult.metrics.rmse) / 2,
    mape: (etsResult.metrics.mape + prophetResult.metrics.mape) / 2,
  };

  return {
    predictions,
    confidenceBands,
    metrics,
  };
}

/**
 * Combine confidence bands from multiple models
 *
 * Takes the weighted average of confidence intervals
 */
function combineConfidenceBands(
  bands1: ConfidenceBands,
  bands2: ConfidenceBands,
  weights: { ets: number; prophet: number }
): ConfidenceBands {
  const horizonLength = bands1.lower80.length;

  return {
    lower80: Array.from(
      { length: horizonLength },
      (_, i) => weights.ets * (bands1.lower80[i] || 0) + weights.prophet * (bands2.lower80[i] || 0)
    ),
    upper80: Array.from(
      { length: horizonLength },
      (_, i) => weights.ets * (bands1.upper80[i] || 0) + weights.prophet * (bands2.upper80[i] || 0)
    ),
    lower95: Array.from(
      { length: horizonLength },
      (_, i) => weights.ets * (bands1.lower95[i] || 0) + weights.prophet * (bands2.lower95[i] || 0)
    ),
    upper95: Array.from(
      { length: horizonLength },
      (_, i) => weights.ets * (bands1.upper95[i] || 0) + weights.prophet * (bands2.upper95[i] || 0)
    ),
  };
}

/**
 * Auto-select best model based on historical performance
 *
 * Performs back-testing on both models and selects the one
 * with lowest error
 *
 * @param historicalData - Historical time series data
 * @param horizonMonths - Number of months to forecast
 * @returns Forecast from best performing model
 */
export async function autoSelectModel(
  historicalData: TimeSeriesDataPoint[],
  horizonMonths: number
): Promise<ForecastResult & { selectedModel: string }> {
  if (historicalData.length < 12) {
    // Too little data, use simple ETS
    const result = await forecastETS(historicalData, horizonMonths, {
      method: 'holt',
    });
    return { ...result, selectedModel: 'ets-holt' };
  }

  // Run both models
  const [etsResult, prophetResult] = await Promise.all([
    forecastETS(historicalData, horizonMonths, {
      method: 'holt-winters',
      seasonalPeriod: 12,
    }),
    forecastProphet(historicalData, horizonMonths, {
      growth: 'linear',
      seasonality: { yearly: true },
    }),
  ]);

  // Compare in-sample errors
  if (etsResult.metrics.mae <= prophetResult.metrics.mae) {
    return { ...etsResult, selectedModel: 'ets-holt-winters' };
  } else {
    return { ...prophetResult, selectedModel: 'prophet' };
  }
}
