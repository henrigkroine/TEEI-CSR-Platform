import { describe, it, expect } from 'vitest';
import { forecastETS } from '../models/ets.js';
import { TimeSeriesDataPoint } from '../types.js';

describe('ETS Forecasting', () => {
  const generateTestData = (months: number, baseValue: number = 100): TimeSeriesDataPoint[] => {
    const data: TimeSeriesDataPoint[] = [];
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      // Add trend and seasonality
      const trend = i * 0.5;
      const seasonal = Math.sin((i / 12) * 2 * Math.PI) * 10;

      data.push({
        date: date.toISOString().split('T')[0],
        value: baseValue + trend + seasonal,
      });
    }

    return data;
  };

  describe('Simple Exponential Smoothing', () => {
    it('should generate forecasts with simple method', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'simple' });

      expect(result.predictions).toHaveLength(6);
      expect(result.predictions[0]).toHaveProperty('date');
      expect(result.predictions[0]).toHaveProperty('value');
      expect(result.metrics).toHaveProperty('mae');
      expect(result.metrics).toHaveProperty('rmse');
      expect(result.metrics).toHaveProperty('mape');
    });

    it('should have level component', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'simple' });

      expect(result.components).toBeDefined();
      expect(result.components?.level).toBeDefined();
      expect(result.components?.level.length).toBeGreaterThan(0);
    });
  });

  describe('Holt Method', () => {
    it('should generate forecasts with trend', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'holt' });

      expect(result.predictions).toHaveLength(6);
      expect(result.components?.trend).toBeDefined();
    });

    it('should forecast increasing trend', async () => {
      const data = generateTestData(12, 100);
      const result = await forecastETS(data, 6, { method: 'holt' });

      // With positive trend, forecasts should generally increase
      const firstPred = result.predictions[0].value;
      const lastPred = result.predictions[5].value;
      expect(lastPred).toBeGreaterThan(firstPred);
    });
  });

  describe('Holt-Winters Method', () => {
    it('should generate forecasts with seasonality', async () => {
      const data = generateTestData(24);
      const result = await forecastETS(data, 12, {
        method: 'holt-winters',
        seasonalPeriod: 12,
      });

      expect(result.predictions).toHaveLength(12);
      expect(result.components?.seasonal).toBeDefined();
    });

    it('should detect seasonal period automatically', async () => {
      const data = generateTestData(24);
      const result = await forecastETS(data, 6, { method: 'holt-winters' });

      expect(result.predictions).toHaveLength(6);
      expect(result.components?.seasonal).toBeDefined();
    });

    it('should fall back to Holt if insufficient data', async () => {
      const data = generateTestData(6);
      const result = await forecastETS(data, 3, {
        method: 'holt-winters',
        seasonalPeriod: 12,
      });

      // Should still produce forecasts
      expect(result.predictions).toHaveLength(3);
    });
  });

  describe('Confidence Bands', () => {
    it('should include confidence bands', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'holt' });

      expect(result.confidenceBands).toBeDefined();
      expect(result.confidenceBands.lower80).toHaveLength(6);
      expect(result.confidenceBands.upper80).toHaveLength(6);
      expect(result.confidenceBands.lower95).toHaveLength(6);
      expect(result.confidenceBands.upper95).toHaveLength(6);
    });

    it('should have wider 95% bands than 80% bands', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'holt' });

      const { lower80, upper80, lower95, upper95 } = result.confidenceBands;

      // 95% bands should be wider
      expect(lower95[0]).toBeLessThan(lower80[0]);
      expect(upper95[0]).toBeGreaterThan(upper80[0]);
    });

    it('should have prediction within confidence bands', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, { method: 'holt' });

      for (let i = 0; i < 6; i++) {
        const pred = result.predictions[i].value;
        const lower = result.confidenceBands.lower95[i];
        const upper = result.confidenceBands.upper95[i];

        expect(pred).toBeGreaterThanOrEqual(lower);
        expect(pred).toBeLessThanOrEqual(upper);
      }
    });
  });

  describe('Parameter Tuning', () => {
    it('should accept custom alpha parameter', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, {
        method: 'simple',
        alpha: 0.5,
      });

      expect(result.predictions).toHaveLength(6);
    });

    it('should accept custom alpha and beta', async () => {
      const data = generateTestData(12);
      const result = await forecastETS(data, 6, {
        method: 'holt',
        alpha: 0.7,
        beta: 0.3,
      });

      expect(result.predictions).toHaveLength(6);
    });
  });

  describe('Error Handling', () => {
    it('should throw error with insufficient data', async () => {
      const data = generateTestData(1);

      await expect(
        forecastETS(data, 6, { method: 'simple' })
      ).rejects.toThrow('Need at least 2 data points');
    });

    it('should throw error with invalid method', async () => {
      const data = generateTestData(12);

      await expect(
        forecastETS(data, 6, { method: 'invalid' as any })
      ).rejects.toThrow('Unknown ETS method');
    });
  });
});
