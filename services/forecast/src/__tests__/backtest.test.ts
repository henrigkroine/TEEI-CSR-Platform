import { describe, it, expect } from 'vitest';
import {
  runBacktest,
  calculateMetrics,
  trainTestSplit,
  compareModels,
} from '../lib/backtest.js';
import { forecastETS } from '../models/ets.js';
import { forecastProphet } from '../models/prophet.js';
import { TimeSeriesDataPoint, ForecastFunction } from '../types.js';

describe('Back-testing Framework', () => {
  const generateTestData = (months: number): TimeSeriesDataPoint[] => {
    const data: TimeSeriesDataPoint[] = [];
    const startDate = new Date('2022-01-01');

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      const trend = i * 0.5;
      const seasonal = Math.sin((i / 12) * 2 * Math.PI) * 5;

      data.push({
        date: date.toISOString().split('T')[0],
        value: 100 + trend + seasonal,
      });
    }

    return data;
  };

  describe('calculateMetrics', () => {
    it('should calculate MAE correctly', () => {
      const actual = [100, 110, 120];
      const predicted = [98, 112, 118];

      const metrics = calculateMetrics(actual, predicted);

      expect(metrics.mae).toBeCloseTo(2, 2);
    });

    it('should calculate RMSE correctly', () => {
      const actual = [100, 110, 120];
      const predicted = [98, 112, 118];

      const metrics = calculateMetrics(actual, predicted);

      // RMSE = sqrt((4 + 4 + 4) / 3) = 2
      expect(metrics.rmse).toBeCloseTo(2, 2);
    });

    it('should calculate MAPE correctly', () => {
      const actual = [100, 100, 100];
      const predicted = [90, 110, 95];

      const metrics = calculateMetrics(actual, predicted);

      // MAPE = (10% + 10% + 5%) / 3 = 8.33%
      expect(metrics.mape).toBeCloseTo(8.33, 1);
    });

    it('should handle perfect predictions', () => {
      const actual = [100, 110, 120];
      const predicted = [100, 110, 120];

      const metrics = calculateMetrics(actual, predicted);

      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.mape).toBe(0);
    });

    it('should handle empty arrays', () => {
      const metrics = calculateMetrics([], []);

      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.mape).toBe(0);
    });

    it('should throw error for mismatched lengths', () => {
      expect(() => calculateMetrics([1, 2], [1])).toThrow(
        'Actual and predicted arrays must have same length'
      );
    });
  });

  describe('trainTestSplit', () => {
    it('should split data correctly', () => {
      const data = generateTestData(24);
      const { train, test } = trainTestSplit(data, 18);

      expect(train).toHaveLength(18);
      expect(test).toHaveLength(6);
      expect(train[0]).toBe(data[0]);
      expect(test[0]).toBe(data[18]);
    });

    it('should throw error with insufficient data', () => {
      const data = generateTestData(6);

      expect(() => trainTestSplit(data, 12)).toThrow('Insufficient data');
    });
  });

  describe('runBacktest', () => {
    const modelFn: ForecastFunction = async (data, horizon) => {
      return forecastETS(data, horizon, { method: 'holt' });
    };

    it('should perform walk-forward validation', async () => {
      const data = generateTestData(36);
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result = await runBacktest(data, modelFn, config);

      expect(result.folds.length).toBeGreaterThan(0);
      expect(result.avgMetrics).toBeDefined();
      expect(result.avgMetrics.mae).toBeGreaterThan(0);
    });

    it('should calculate average metrics across folds', async () => {
      const data = generateTestData(36);
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result = await runBacktest(data, modelFn, config);

      expect(result.avgMetrics.mae).toBeGreaterThan(0);
      expect(result.avgMetrics.rmse).toBeGreaterThan(0);
      expect(result.avgMetrics.mape).toBeGreaterThan(0);
    });

    it('should include fold details', async () => {
      const data = generateTestData(36);
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result = await runBacktest(data, modelFn, config);

      const fold = result.folds[0];
      expect(fold.trainPeriod).toBeDefined();
      expect(fold.testPeriod).toBeDefined();
      expect(fold.predictions).toBeDefined();
      expect(fold.mae).toBeGreaterThan(0);
    });

    it('should throw error with insufficient data', async () => {
      const data = generateTestData(12);
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 3,
      };

      await expect(runBacktest(data, modelFn, config)).rejects.toThrow(
        'Insufficient data'
      );
    });

    it('should respect stride parameter', async () => {
      const data = generateTestData(48);
      const config1 = {
        trainMonths: 18,
        testMonths: 6,
        stride: 3,
      };
      const config2 = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result1 = await runBacktest(data, modelFn, config1);
      const result2 = await runBacktest(data, modelFn, config2);

      // Smaller stride should produce more folds
      expect(result1.folds.length).toBeGreaterThan(result2.folds.length);
    });
  });

  describe('compareModels', () => {
    it('should compare multiple models', async () => {
      const data = generateTestData(36);
      const models = {
        'ets-simple': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'simple' }),
        'ets-holt': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'holt' }),
      };
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result = await compareModels(data, models, config);

      expect(result.modelComparison).toBeDefined();
      expect(result.modelComparison).toHaveLength(2);
      expect(result.modelComparison?.[0]).toHaveProperty('modelName');
      expect(result.modelComparison?.[0]).toHaveProperty('avgMAE');
      expect(result.modelComparison?.[0]).toHaveProperty('avgRMSE');
    });

    it('should sort models by accuracy', async () => {
      const data = generateTestData(36);
      const models = {
        'model-a': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'simple' }),
        'model-b': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'holt' }),
      };
      const config = {
        trainMonths: 18,
        testMonths: 6,
        stride: 6,
      };

      const result = await compareModels(data, models, config);

      // Results should be sorted by MAE (ascending)
      if (result.modelComparison && result.modelComparison.length > 1) {
        expect(result.modelComparison[0].avgMAE).toBeLessThanOrEqual(
          result.modelComparison[1].avgMAE
        );
      }
    });
  });
});
