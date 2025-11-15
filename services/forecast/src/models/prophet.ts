import { addMonths, differenceInMonths, format, parseISO } from 'date-fns';
import { linearRegression, linearRegressionLine, mean, standardDeviation } from 'simple-statistics';
import {
  TimeSeriesDataPoint,
  ProphetConfig,
  ForecastResult,
  TimeSeriesComponents,
} from '../types.js';
import { calculateConfidenceBands, calculateResiduals } from '../lib/confidence.js';
import { calculateMetrics } from '../lib/backtest.js';

/**
 * Simplified Prophet-like Forecasting
 *
 * Decomposes time series into trend, seasonality, and residuals
 * Similar to Facebook Prophet but simplified for production use
 *
 * @param historicalData - Historical time series data
 * @param horizonMonths - Number of months to forecast
 * @param config - Prophet configuration
 * @returns Forecast result with predictions and confidence bands
 */
export async function forecastProphet(
  historicalData: TimeSeriesDataPoint[],
  horizonMonths: number,
  config: ProphetConfig
): Promise<ForecastResult> {
  if (historicalData.length < 3) {
    throw new Error('Need at least 3 data points for Prophet forecasting');
  }

  const values = historicalData.map((d) => d.value);
  const dates = historicalData.map((d) => parseISO(d.date));

  // Convert dates to numeric time indices (months since start)
  const startDate = dates[0];
  const timeIndices = dates.map((date) => differenceInMonths(date, startDate));

  // Detect changepoints if not provided
  const changepoints = config.changepoints
    ? config.changepoints.map((cp) => differenceInMonths(parseISO(cp), startDate))
    : detectChangepoints(timeIndices, values);

  // Fit piecewise linear trend
  const trendComponent = fitPiecewiseLinearTrend(
    timeIndices,
    values,
    changepoints,
    config.growth
  );

  // Detrend the data
  const detrended = values.map((val, i) => val - trendComponent[i]);

  // Fit seasonal components
  const seasonalComponent = fitSeasonality(
    timeIndices,
    detrended,
    config.seasonality
  );

  // Calculate residuals
  const fittedValues = values.map(
    (_, i) => trendComponent[i] + seasonalComponent[i]
  );
  const residuals = calculateResiduals(values, fittedValues);

  // Forecast future values
  const lastTimeIndex = timeIndices[timeIndices.length - 1];
  const futureTimeIndices = Array.from(
    { length: horizonMonths },
    (_, i) => lastTimeIndex + i + 1
  );

  // Project trend
  const futureTrend = projectTrend(
    futureTimeIndices,
    trendComponent,
    timeIndices,
    changepoints,
    config.growth
  );

  // Project seasonality
  const futureSeasonality = futureTimeIndices.map((t) =>
    getSeasonalValue(t, seasonalComponent, timeIndices.length)
  );

  // Combine components
  const predictions = futureTrend.map((trend, i) => trend + futureSeasonality[i]);

  // Generate forecast dates
  const lastDate = dates[dates.length - 1];
  const forecastDates = futureTimeIndices.map((_, i) =>
    format(addMonths(lastDate, i + 1), 'yyyy-MM-dd')
  );

  const forecastPredictions = forecastDates.map((date, i) => ({
    date,
    value: parseFloat(predictions[i].toFixed(2)),
  }));

  // Calculate confidence bands
  const confidenceBands = calculateConfidenceBands(predictions, residuals);

  // Calculate metrics
  const metrics = calculateMetrics(values, fittedValues);

  return {
    predictions: forecastPredictions,
    confidenceBands,
    components: {
      level: trendComponent,
      trend: trendComponent.slice(1).map((val, i) => val - trendComponent[i]),
      seasonal: seasonalComponent,
    },
    metrics,
  };
}

/**
 * Detect changepoints using derivative analysis
 */
function detectChangepoints(timeIndices: number[], values: number[]): number[] {
  const changepoints: number[] = [];
  const windowSize = Math.max(3, Math.floor(values.length / 10));

  for (let i = windowSize; i < values.length - windowSize; i++) {
    const leftSlope = calculateSlope(
      timeIndices.slice(i - windowSize, i),
      values.slice(i - windowSize, i)
    );
    const rightSlope = calculateSlope(
      timeIndices.slice(i, i + windowSize),
      values.slice(i, i + windowSize)
    );

    // Significant change in slope
    if (Math.abs(rightSlope - leftSlope) > 0.5) {
      changepoints.push(timeIndices[i]);
    }
  }

  // Limit to top 3 changepoints
  return changepoints.slice(0, 3);
}

/**
 * Calculate slope using linear regression
 */
function calculateSlope(x: number[], y: number[]): number {
  if (x.length < 2) return 0;

  const regression = linearRegression(x.map((xi, i) => [xi, y[i]]));
  return regression.m;
}

/**
 * Fit piecewise linear trend
 */
function fitPiecewiseLinearTrend(
  timeIndices: number[],
  values: number[],
  changepoints: number[],
  growth: 'linear' | 'logistic'
): number[] {
  if (growth === 'logistic') {
    // Simplified logistic growth (use linear as fallback for now)
    // Full implementation would require non-linear optimization
    return fitLinearTrend(timeIndices, values);
  }

  // Piecewise linear trend
  const segments = buildSegments(timeIndices, changepoints);
  const trend: number[] = [];

  for (let i = 0; i < timeIndices.length; i++) {
    const t = timeIndices[i];
    const segment = segments.find((s) => t >= s.start && t <= s.end);

    if (segment) {
      const segmentIndices = timeIndices.filter(
        (ti) => ti >= segment.start && ti <= segment.end
      );
      const segmentValues = values.filter(
        (_, idx) => timeIndices[idx] >= segment.start && timeIndices[idx] <= segment.end
      );

      if (segmentIndices.length >= 2) {
        const points = segmentIndices.map((ti, idx) => [ti, segmentValues[idx]]);
        const regression = linearRegression(points);
        const predict = linearRegressionLine(regression);
        trend.push(predict(t));
      } else {
        trend.push(values[i]);
      }
    } else {
      trend.push(values[i]);
    }
  }

  return trend;
}

/**
 * Fit simple linear trend
 */
function fitLinearTrend(timeIndices: number[], values: number[]): number[] {
  const points = timeIndices.map((t, i) => [t, values[i]]);
  const regression = linearRegression(points);
  const predict = linearRegressionLine(regression);

  return timeIndices.map((t) => predict(t));
}

/**
 * Build time segments based on changepoints
 */
function buildSegments(
  timeIndices: number[],
  changepoints: number[]
): { start: number; end: number }[] {
  const segments: { start: number; end: number }[] = [];
  const sortedChangepoints = [...changepoints].sort((a, b) => a - b);

  let start = timeIndices[0];
  for (const cp of sortedChangepoints) {
    segments.push({ start, end: cp });
    start = cp;
  }
  segments.push({ start, end: timeIndices[timeIndices.length - 1] });

  return segments;
}

/**
 * Fit seasonality using Fourier series
 */
function fitSeasonality(
  timeIndices: number[],
  detrended: number[],
  seasonality: {
    yearly?: boolean;
    quarterly?: boolean;
    monthly?: boolean;
  }
): number[] {
  const seasonal: number[] = Array(timeIndices.length).fill(0);

  // Yearly seasonality (period = 12 months)
  if (seasonality.yearly) {
    const yearlyComponent = fourierSeries(timeIndices, detrended, 12, 3);
    for (let i = 0; i < seasonal.length; i++) {
      seasonal[i] += yearlyComponent[i];
    }
  }

  // Quarterly seasonality (period = 3 months)
  if (seasonality.quarterly) {
    const quarterlyComponent = fourierSeries(timeIndices, detrended, 3, 2);
    for (let i = 0; i < seasonal.length; i++) {
      seasonal[i] += quarterlyComponent[i];
    }
  }

  // Monthly seasonality (period = 1 month, not very meaningful)
  // Omitted for simplicity

  return seasonal;
}

/**
 * Fourier series approximation for seasonality
 */
function fourierSeries(
  timeIndices: number[],
  values: number[],
  period: number,
  numTerms: number
): number[] {
  const seasonal: number[] = Array(timeIndices.length).fill(0);

  // Fit Fourier coefficients
  for (let k = 1; k <= numTerms; k++) {
    let a_k = 0;
    let b_k = 0;

    for (let i = 0; i < timeIndices.length; i++) {
      const t = timeIndices[i];
      a_k += values[i] * Math.cos((2 * Math.PI * k * t) / period);
      b_k += values[i] * Math.sin((2 * Math.PI * k * t) / period);
    }

    a_k /= timeIndices.length;
    b_k /= timeIndices.length;

    // Apply Fourier terms
    for (let i = 0; i < timeIndices.length; i++) {
      const t = timeIndices[i];
      seasonal[i] +=
        a_k * Math.cos((2 * Math.PI * k * t) / period) +
        b_k * Math.sin((2 * Math.PI * k * t) / period);
    }
  }

  return seasonal;
}

/**
 * Project trend into the future
 */
function projectTrend(
  futureTimeIndices: number[],
  trendComponent: number[],
  historicalTimeIndices: number[],
  changepoints: number[],
  growth: 'linear' | 'logistic'
): number[] {
  // Use last segment's slope for projection
  const lastTrend = trendComponent[trendComponent.length - 1];
  const secondLastTrend = trendComponent[trendComponent.length - 2];
  const slope = lastTrend - secondLastTrend;

  return futureTimeIndices.map((_, i) => lastTrend + (i + 1) * slope);
}

/**
 * Get seasonal value for a future time index
 */
function getSeasonalValue(
  futureTimeIndex: number,
  seasonalComponent: number[],
  historicalLength: number
): number {
  // Use modulo to repeat seasonal pattern
  const period = 12; // Assume yearly seasonality
  const idx = futureTimeIndex % period;
  const historicalIdx = Math.min(idx, seasonalComponent.length - 1);

  return seasonalComponent[historicalIdx] || 0;
}
