/**
 * FinOps Cost Forecasting
 * Simple linear regression and moving average methods
 */

import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  ForecastQueryParams,
  ForecastResponse,
  ForecastPoint,
  ForecastMethod,
  Currency,
} from '@teei/shared-types';

const logger = createServiceLogger('finops:forecast');

/**
 * Get historical cost data for forecasting
 */
async function getHistoricalCosts(
  tenantId: string,
  from: string,
  to: string
): Promise<{ date: string; amount: number }[]> {
  const client = getClickHouseClient();

  const query = `
    SELECT
      day AS date,
      sum(amount) AS amount
    FROM cost_facts
    WHERE tenant_id = '${tenantId}'
      AND day >= toDate('${from}')
      AND day <= toDate('${to}')
    GROUP BY day
    ORDER BY day ASC
  `;

  const result = await client.query({ query, format: 'JSONEachRow' });
  const data = await result.json();

  return data.map((row: any) => ({
    date: row.date,
    amount: parseFloat(row.amount || '0'),
  }));
}

/**
 * Simple linear regression forecast
 * y = mx + b
 */
function simpleLinearForecast(
  historical: { date: string; amount: number }[],
  forecastDays: number
): { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[] {
  if (historical.length === 0) {
    return [];
  }

  // Convert dates to numeric x values (days since first date)
  const startDate = new Date(historical[0].date);
  const dataPoints = historical.map((point, index) => ({
    x: index,
    y: point.amount,
  }));

  // Calculate linear regression: y = mx + b
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate standard error for confidence intervals
  const predictions = dataPoints.map((p) => slope * p.x + intercept);
  const residuals = dataPoints.map((p, i) => p.y - predictions[i]);
  const sumSquaredResiduals = residuals.reduce((sum, r) => sum + r * r, 0);
  const standardError = Math.sqrt(sumSquaredResiduals / (n - 2));

  // Generate forecast
  const forecast: { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[] = [];

  for (let i = 0; i < forecastDays; i++) {
    const x = n + i;
    const predictedAmount = slope * x + intercept;

    // 95% confidence interval (±1.96 * SE)
    const margin = 1.96 * standardError;
    const lowerBound = Math.max(0, predictedAmount - margin);
    const upperBound = predictedAmount + margin;

    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + x);

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedAmount: Math.max(0, predictedAmount),
      lowerBound,
      upperBound,
    });
  }

  return forecast;
}

/**
 * Moving average forecast (using exponential smoothing)
 * This is a simple implementation that averages recent data
 */
function movingAverageForecast(
  historical: { date: string; amount: number }[],
  forecastDays: number,
  windowSize: number = 7
): { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[] {
  if (historical.length === 0) {
    return [];
  }

  // Get the last date in historical data
  const lastDate = new Date(historical[historical.length - 1].date);

  // Calculate moving average from recent window
  const window = historical.slice(-windowSize);
  const average = window.reduce((sum, p) => sum + p.amount, 0) / window.length;

  // Calculate standard deviation for confidence intervals
  const variance = window.reduce((sum, p) => sum + Math.pow(p.amount - average, 2), 0) / window.length;
  const stdDev = Math.sqrt(variance);

  // Generate forecast (assume flat trend based on moving average)
  const forecast: { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[] = [];

  for (let i = 0; i < forecastDays; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i + 1);

    // Use moving average as prediction
    const predictedAmount = average;

    // 95% confidence interval (±1.96 * stdDev)
    const margin = 1.96 * stdDev;
    const lowerBound = Math.max(0, predictedAmount - margin);
    const upperBound = predictedAmount + margin;

    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedAmount: Math.max(0, predictedAmount),
      lowerBound,
      upperBound,
    });
  }

  return forecast;
}

/**
 * Generate cost forecast
 */
export async function generateForecast(params: ForecastQueryParams): Promise<ForecastResponse> {
  const {
    tenantId,
    from,
    to,
    forecastDays = 30,
    method = 'simple' as ForecastMethod,
  } = params;

  try {
    logger.info({ tenantId, from, to, forecastDays, method }, 'Generating cost forecast');

    // Get historical data
    const historical = await getHistoricalCosts(tenantId, from, to);

    if (historical.length === 0) {
      logger.warn({ tenantId, from, to }, 'No historical data found for forecast');
      return {
        tenantId,
        historicalRange: { from, to },
        forecastRange: {
          from: new Date(to).toISOString().split('T')[0],
          to: new Date(new Date(to).getTime() + forecastDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        method,
        forecast: [],
        metadata: {
          accuracy: 0,
          confidence: 0,
        },
      };
    }

    // Generate forecast based on method
    let forecastData: { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[];

    if (method === 'simple') {
      forecastData = simpleLinearForecast(historical, forecastDays);
    } else {
      // 'holtwinters' alias for moving average
      forecastData = movingAverageForecast(historical, forecastDays);
    }

    // Get currency from historical data query
    const client = getClickHouseClient();
    const currencyQuery = `
      SELECT any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
      LIMIT 1
    `;
    const currencyResult = await client.query({ query: currencyQuery, format: 'JSONEachRow' });
    const currencyData = await currencyResult.json();
    const currency = (currencyData.length > 0 ? currencyData[0].currency : 'USD') as Currency;

    // Map to ForecastPoint type
    const forecast: ForecastPoint[] = forecastData.map((point) => ({
      date: point.date,
      predictedAmount: point.predictedAmount,
      lowerBound: point.lowerBound,
      upperBound: point.upperBound,
      currency,
    }));

    // Calculate forecast range
    const forecastStartDate = forecast.length > 0 ? forecast[0].date : to;
    const forecastEndDate = forecast.length > 0 ? forecast[forecast.length - 1].date : to;

    // Calculate historical accuracy (if we have enough data)
    let accuracy = 0;
    if (historical.length > 7) {
      // Use last 7 days for validation
      const validationSize = Math.min(7, Math.floor(historical.length * 0.2));
      const trainData = historical.slice(0, -validationSize);
      const testData = historical.slice(-validationSize);

      let validationForecast: { date: string; predictedAmount: number; lowerBound: number; upperBound: number }[];
      if (method === 'simple') {
        validationForecast = simpleLinearForecast(trainData, validationSize);
      } else {
        validationForecast = movingAverageForecast(trainData, validationSize);
      }

      // Calculate MAPE (Mean Absolute Percentage Error)
      const errors = testData.map((actual, i) => {
        if (i >= validationForecast.length) return 0;
        const predicted = validationForecast[i].predictedAmount;
        return actual.amount > 0 ? Math.abs((actual.amount - predicted) / actual.amount) : 0;
      });

      const mape = errors.reduce((sum, e) => sum + e, 0) / errors.length;
      accuracy = Math.max(0, Math.min(100, (1 - mape) * 100));
    }

    logger.info(
      {
        tenantId,
        method,
        historicalPoints: historical.length,
        forecastPoints: forecast.length,
        accuracy: accuracy.toFixed(2),
      },
      'Forecast generated successfully'
    );

    return {
      tenantId,
      historicalRange: { from, to },
      forecastRange: {
        from: forecastStartDate,
        to: forecastEndDate,
      },
      method,
      forecast,
      metadata: {
        accuracy: parseFloat(accuracy.toFixed(2)),
        confidence: 95, // 95% confidence intervals
      },
    };
  } catch (error) {
    logger.error({ error, params }, 'Failed to generate forecast');
    throw error;
  }
}
