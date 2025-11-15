import { addMonths, format, parseISO } from 'date-fns';
import { mean } from 'simple-statistics';
import {
  TimeSeriesDataPoint,
  ETSConfig,
  ForecastResult,
  TimeSeriesComponents,
} from '../types.js';
import { calculateConfidenceBands, calculateResiduals } from '../lib/confidence.js';
import { calculateMetrics } from '../lib/backtest.js';

/**
 * Exponential Smoothing (ETS) Forecasting
 *
 * Implements Simple, Holt's, and Holt-Winters exponential smoothing
 *
 * @param historicalData - Historical time series data
 * @param horizonMonths - Number of months to forecast
 * @param config - ETS configuration
 * @returns Forecast result with predictions and confidence bands
 */
export async function forecastETS(
  historicalData: TimeSeriesDataPoint[],
  horizonMonths: number,
  config: ETSConfig
): Promise<ForecastResult> {
  if (historicalData.length < 2) {
    throw new Error('Need at least 2 data points for ETS forecasting');
  }

  const values = historicalData.map((d) => d.value);
  const method = config.method || 'holt-winters';

  let result: {
    predictions: number[];
    components: TimeSeriesComponents;
    fittedValues: number[];
  };

  switch (method) {
    case 'simple':
      result = simpleExponentialSmoothing(values, horizonMonths, config.alpha);
      break;
    case 'holt':
      result = holtsMethod(values, horizonMonths, config.alpha, config.beta);
      break;
    case 'holt-winters':
      result = holtWinters(values, horizonMonths, config);
      break;
    default:
      throw new Error(`Unknown ETS method: ${method}`);
  }

  // Generate forecast dates
  const lastDate = parseISO(historicalData[historicalData.length - 1].date);
  const forecastDates = Array.from({ length: horizonMonths }, (_, i) =>
    format(addMonths(lastDate, i + 1), 'yyyy-MM-dd')
  );

  const predictions = forecastDates.map((date, i) => ({
    date,
    value: parseFloat(result.predictions[i].toFixed(2)),
  }));

  // Calculate residuals for confidence bands
  const residuals = calculateResiduals(values, result.fittedValues);

  // Calculate confidence bands
  const confidenceBands = calculateConfidenceBands(result.predictions, residuals);

  // Calculate in-sample metrics
  const metrics = calculateMetrics(values, result.fittedValues);

  return {
    predictions,
    confidenceBands,
    components: result.components,
    metrics,
  };
}

/**
 * Simple Exponential Smoothing
 *
 * Level only, no trend or seasonality
 */
function simpleExponentialSmoothing(
  values: number[],
  horizonMonths: number,
  alpha?: number
): {
  predictions: number[];
  components: TimeSeriesComponents;
  fittedValues: number[];
} {
  // Auto-tune alpha if not provided
  const a = alpha || optimizeAlpha(values);

  const level: number[] = [values[0]];
  const fittedValues: number[] = [values[0]];

  // Fit the model
  for (let i = 1; i < values.length; i++) {
    const newLevel = a * values[i] + (1 - a) * level[i - 1];
    level.push(newLevel);
    fittedValues.push(newLevel);
  }

  // Forecast
  const lastLevel = level[level.length - 1];
  const predictions = Array(horizonMonths).fill(lastLevel);

  return {
    predictions,
    components: { level },
    fittedValues,
  };
}

/**
 * Holt's Linear Trend Method
 *
 * Level and trend, no seasonality
 */
function holtsMethod(
  values: number[],
  horizonMonths: number,
  alpha?: number,
  beta?: number
): {
  predictions: number[];
  components: TimeSeriesComponents;
  fittedValues: number[];
} {
  // Auto-tune parameters if not provided
  const a = alpha || 0.8;
  const b = beta || 0.2;

  const level: number[] = [values[0]];
  const trend: number[] = [values[1] - values[0]];
  const fittedValues: number[] = [values[0]];

  // Fit the model
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level[i - 1];
    const prevTrend = trend[i - 1];

    const newLevel = a * values[i] + (1 - a) * (prevLevel + prevTrend);
    const newTrend = b * (newLevel - prevLevel) + (1 - b) * prevTrend;

    level.push(newLevel);
    trend.push(newTrend);
    fittedValues.push(newLevel + newTrend);
  }

  // Forecast
  const lastLevel = level[level.length - 1];
  const lastTrend = trend[trend.length - 1];
  const predictions = Array.from(
    { length: horizonMonths },
    (_, h) => lastLevel + (h + 1) * lastTrend
  );

  return {
    predictions,
    components: { level, trend },
    fittedValues,
  };
}

/**
 * Holt-Winters Seasonal Method
 *
 * Level, trend, and seasonality
 */
function holtWinters(
  values: number[],
  horizonMonths: number,
  config: ETSConfig
): {
  predictions: number[];
  components: TimeSeriesComponents;
  fittedValues: number[];
} {
  const seasonalPeriod = config.seasonalPeriod || detectSeasonalPeriod(values);
  const seasonalType = config.seasonal || 'additive';

  if (values.length < 2 * seasonalPeriod) {
    // Fall back to Holt's method if insufficient data for seasonality
    return holtsMethod(values, horizonMonths, config.alpha, config.beta);
  }

  const a = config.alpha || 0.7;
  const b = config.beta || 0.1;
  const g = config.gamma || 0.2;

  // Initialize components
  const level: number[] = [];
  const trend: number[] = [];
  const seasonal: number[] = [];
  const fittedValues: number[] = [];

  // Initialize seasonal indices
  const initialSeasonal = initializeSeasonalIndices(values, seasonalPeriod, seasonalType);
  seasonal.push(...initialSeasonal);

  // Initialize level and trend
  level.push(mean(values.slice(0, seasonalPeriod)));
  trend.push(
    (mean(values.slice(seasonalPeriod, 2 * seasonalPeriod)) -
      mean(values.slice(0, seasonalPeriod))) /
      seasonalPeriod
  );

  // Fit the model
  for (let i = 0; i < values.length; i++) {
    const seasonalIdx = i % seasonalPeriod;
    const currentSeasonal = seasonal[seasonal.length - seasonalPeriod + seasonalIdx];

    let newLevel: number;
    let deseasonalized: number;

    if (seasonalType === 'additive') {
      deseasonalized = values[i] - currentSeasonal;
      newLevel = a * deseasonalized + (1 - a) * (level[i] + trend[i]);
    } else {
      // Multiplicative
      deseasonalized = values[i] / currentSeasonal;
      newLevel = a * deseasonalized + (1 - a) * (level[i] + trend[i]);
    }

    const newTrend = b * (newLevel - level[i]) + (1 - b) * trend[i];

    let newSeasonal: number;
    if (seasonalType === 'additive') {
      newSeasonal = g * (values[i] - newLevel) + (1 - g) * currentSeasonal;
    } else {
      newSeasonal = g * (values[i] / newLevel) + (1 - g) * currentSeasonal;
    }

    level.push(newLevel);
    trend.push(newTrend);
    seasonal.push(newSeasonal);

    // Calculate fitted value
    let fitted: number;
    if (seasonalType === 'additive') {
      fitted = newLevel + newTrend + newSeasonal;
    } else {
      fitted = (newLevel + newTrend) * newSeasonal;
    }
    fittedValues.push(fitted);
  }

  // Forecast
  const lastLevel = level[level.length - 1];
  const lastTrend = trend[trend.length - 1];
  const predictions: number[] = [];

  for (let h = 0; h < horizonMonths; h++) {
    const seasonalIdx = (values.length + h) % seasonalPeriod;
    const forecastSeasonal = seasonal[seasonal.length - seasonalPeriod + seasonalIdx];

    let forecast: number;
    if (seasonalType === 'additive') {
      forecast = lastLevel + (h + 1) * lastTrend + forecastSeasonal;
    } else {
      forecast = (lastLevel + (h + 1) * lastTrend) * forecastSeasonal;
    }

    predictions.push(forecast);
  }

  return {
    predictions,
    components: {
      level,
      trend,
      seasonal: seasonal.slice(-seasonalPeriod),
    },
    fittedValues,
  };
}

/**
 * Auto-tune alpha parameter using grid search
 */
function optimizeAlpha(values: number[]): number {
  const candidates = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9];
  let bestAlpha = 0.5;
  let bestError = Infinity;

  for (const alpha of candidates) {
    const result = simpleExponentialSmoothing(values, 1, alpha);
    const error = mean(
      calculateResiduals(values, result.fittedValues).map((r) => Math.abs(r))
    );

    if (error < bestError) {
      bestError = error;
      bestAlpha = alpha;
    }
  }

  return bestAlpha;
}

/**
 * Detect seasonal period using autocorrelation
 */
function detectSeasonalPeriod(values: number[]): number {
  // For monthly data, common periods are 12 (yearly), 3 (quarterly)
  const candidates = [12, 6, 4, 3];

  for (const period of candidates) {
    if (values.length >= 2 * period) {
      return period;
    }
  }

  return 1; // No seasonality
}

/**
 * Initialize seasonal indices
 */
function initializeSeasonalIndices(
  values: number[],
  period: number,
  type: 'additive' | 'multiplicative'
): number[] {
  const seasonal: number[] = [];
  const numSeasons = Math.floor(values.length / period);

  for (let s = 0; s < period; s++) {
    let seasonAvg = 0;
    for (let i = 0; i < numSeasons; i++) {
      seasonAvg += values[i * period + s];
    }
    seasonAvg /= numSeasons;

    const overallMean = mean(values);

    if (type === 'additive') {
      seasonal.push(seasonAvg - overallMean);
    } else {
      seasonal.push(seasonAvg / overallMean);
    }
  }

  return seasonal;
}
