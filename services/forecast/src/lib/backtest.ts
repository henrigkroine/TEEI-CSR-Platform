import { mean } from 'simple-statistics';
import {
  TimeSeriesDataPoint,
  BacktestConfig,
  BacktestResult,
  BacktestFold,
  ForecastFunction,
  PerformanceMetrics,
} from '../types.js';

/**
 * Run walk-forward back-testing on time series data
 *
 * Splits data into multiple train/test folds and evaluates
 * forecast accuracy on each fold
 *
 * @param data - Historical time series data
 * @param modelFn - Forecast function to test
 * @param config - Back-testing configuration
 * @returns Back-test results with performance metrics
 */
export async function runBacktest(
  data: TimeSeriesDataPoint[],
  modelFn: ForecastFunction,
  config: BacktestConfig
): Promise<BacktestResult> {
  const { trainMonths, testMonths, stride } = config;

  // Validate data length
  const minDataPoints = trainMonths + testMonths;
  if (data.length < minDataPoints) {
    throw new Error(
      `Insufficient data for back-testing. Need at least ${minDataPoints} months, got ${data.length}`
    );
  }

  const folds: BacktestFold[] = [];
  let startIdx = 0;

  // Create rolling folds
  while (startIdx + trainMonths + testMonths <= data.length) {
    const trainEnd = startIdx + trainMonths;
    const testEnd = Math.min(trainEnd + testMonths, data.length);

    const trainData = data.slice(startIdx, trainEnd);
    const testData = data.slice(trainEnd, testEnd);

    if (testData.length === 0) break;

    // Run forecast
    const forecastResult = await modelFn(trainData, testData.length);

    // Calculate metrics for this fold
    const predictions = testData.map((actual, i) => ({
      date: actual.date,
      actual: actual.value,
      predicted: forecastResult.predictions[i]?.value || 0,
    }));

    const metrics = calculateMetrics(
      predictions.map((p) => p.actual),
      predictions.map((p) => p.predicted)
    );

    folds.push({
      trainPeriod: {
        start: trainData[0]?.date || '',
        end: trainData[trainData.length - 1]?.date || '',
      },
      testPeriod: {
        start: testData[0]?.date || '',
        end: testData[testData.length - 1]?.date || '',
      },
      predictions,
      ...metrics,
    });

    startIdx += stride;
  }

  // Calculate average metrics across all folds
  const avgMetrics: PerformanceMetrics = {
    mae: mean(folds.map((f) => f.mae)),
    rmse: mean(folds.map((f) => f.rmse)),
    mape: mean(folds.map((f) => f.mape)),
  };

  return {
    folds,
    avgMetrics,
  };
}

/**
 * Calculate performance metrics
 *
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns Performance metrics (MAE, RMSE, MAPE)
 */
export function calculateMetrics(
  actual: number[],
  predicted: number[]
): PerformanceMetrics {
  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have same length');
  }

  if (actual.length === 0) {
    return { mae: 0, rmse: 0, mape: 0 };
  }

  // Mean Absolute Error
  const mae =
    actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / actual.length;

  // Root Mean Squared Error
  const mse =
    actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length;
  const rmse = Math.sqrt(mse);

  // Mean Absolute Percentage Error
  const mape =
    (actual.reduce((sum, val, i) => {
      if (val === 0) return sum; // Skip zeros to avoid division by zero
      return sum + Math.abs((val - predicted[i]) / val);
    }, 0) /
      actual.filter((v) => v !== 0).length) *
    100;

  return {
    mae: parseFloat(mae.toFixed(4)),
    rmse: parseFloat(rmse.toFixed(4)),
    mape: parseFloat(mape.toFixed(2)),
  };
}

/**
 * Compare multiple models using back-testing
 *
 * @param data - Historical time series data
 * @param models - Map of model name to forecast function
 * @param config - Back-testing configuration
 * @returns Comparison results
 */
export async function compareModels(
  data: TimeSeriesDataPoint[],
  models: Record<string, ForecastFunction>,
  config: BacktestConfig
): Promise<BacktestResult> {
  const modelNames = Object.keys(models);
  const modelResults: Record<string, BacktestResult> = {};

  // Run back-test for each model
  for (const modelName of modelNames) {
    const modelFn = models[modelName];
    if (modelFn) {
      modelResults[modelName] = await runBacktest(data, modelFn, config);
    }
  }

  // Use first model's folds as base
  const firstModelName = modelNames[0] || '';
  const firstResult = modelResults[firstModelName];
  if (!firstResult) {
    throw new Error('No model results available');
  }

  const baseFolds = firstResult.folds;

  // Create comparison
  const modelComparison = modelNames.map((name) => {
    const result = modelResults[name];
    return {
      modelName: name,
      avgMAE: result?.avgMetrics.mae || 0,
      avgRMSE: result?.avgMetrics.rmse || 0,
    };
  });

  // Sort by MAE (best first)
  modelComparison.sort((a, b) => a.avgMAE - b.avgMAE);

  return {
    folds: baseFolds,
    avgMetrics: firstResult.avgMetrics,
    modelComparison,
  };
}

/**
 * Split data into train and test sets
 */
export function trainTestSplit(
  data: TimeSeriesDataPoint[],
  trainMonths: number
): {
  train: TimeSeriesDataPoint[];
  test: TimeSeriesDataPoint[];
} {
  if (data.length < trainMonths) {
    throw new Error('Insufficient data for train/test split');
  }

  return {
    train: data.slice(0, trainMonths),
    test: data.slice(trainMonths),
  };
}
