import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Forecast API', () => {
  describe('Request Validation', () => {
    const ForecastRequestSchema = z.object({
      companyId: z.string().uuid(),
      metric: z.enum(['sroi_ratio', 'vis_score']),
      horizonMonths: z.number().int().min(1).max(24).default(6),
      model: z.enum(['ets', 'prophet', 'ensemble', 'auto']).default('ensemble'),
      includeBacktest: z.boolean().default(false),
      includeScenarios: z.boolean().default(true),
    });

    it('should validate correct request', () => {
      const validRequest = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metric: 'sroi_ratio',
        horizonMonths: 6,
        model: 'ensemble',
        includeBacktest: false,
        includeScenarios: true,
      };

      const result = ForecastRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidRequest = {
        companyId: 'not-a-uuid',
        metric: 'sroi_ratio',
      };

      const result = ForecastRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid metric', () => {
      const invalidRequest = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metric: 'invalid_metric',
      };

      const result = ForecastRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject horizon months out of range', () => {
      const invalidRequest = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metric: 'sroi_ratio',
        horizonMonths: 25,
      };

      const result = ForecastRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const minimalRequest = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        metric: 'vis_score',
      };

      const result = ForecastRequestSchema.parse(minimalRequest);
      expect(result.horizonMonths).toBe(6);
      expect(result.model).toBe('ensemble');
      expect(result.includeBacktest).toBe(false);
      expect(result.includeScenarios).toBe(true);
    });

    it('should accept all valid models', () => {
      const models = ['ets', 'prophet', 'ensemble', 'auto'];

      for (const model of models) {
        const request = {
          companyId: '123e4567-e89b-12d3-a456-426614174000',
          metric: 'sroi_ratio',
          model,
        };

        const result = ForecastRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });

    it('should accept both metrics', () => {
      const metrics = ['sroi_ratio', 'vis_score'];

      for (const metric of metrics) {
        const request = {
          companyId: '123e4567-e89b-12d3-a456-426614174000',
          metric,
        };

        const result = ForecastRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Response Structure', () => {
    it('should have required fields in response', () => {
      const mockResponse = {
        forecast: {
          predictions: [
            { date: '2025-01-01', value: 3.8 },
          ],
          confidenceBands: {
            lower80: [3.2],
            upper80: [4.4],
            lower95: [2.9],
            upper95: [4.7],
          },
        },
        scenarios: {
          optimistic: [{ date: '2025-01-01', value: 4.4 }],
          realistic: [{ date: '2025-01-01', value: 3.8 }],
          pessimistic: [{ date: '2025-01-01', value: 3.2 }],
        },
        metadata: {
          modelUsed: 'ets-holt-winters',
          historicalMonths: 24,
          generatedAt: '2025-11-15T10:00:00Z',
          latencyMs: 450,
          cached: false,
        },
      };

      expect(mockResponse).toHaveProperty('forecast');
      expect(mockResponse).toHaveProperty('scenarios');
      expect(mockResponse).toHaveProperty('metadata');
      expect(mockResponse.forecast).toHaveProperty('predictions');
      expect(mockResponse.forecast).toHaveProperty('confidenceBands');
      expect(mockResponse.metadata).toHaveProperty('modelUsed');
      expect(mockResponse.metadata).toHaveProperty('latencyMs');
    });

    it('should have correct prediction structure', () => {
      const prediction = { date: '2025-01-01', value: 3.8 };

      expect(prediction).toHaveProperty('date');
      expect(prediction).toHaveProperty('value');
      expect(typeof prediction.date).toBe('string');
      expect(typeof prediction.value).toBe('number');
    });

    it('should have all confidence band levels', () => {
      const bands = {
        lower80: [3.2],
        upper80: [4.4],
        lower95: [2.9],
        upper95: [4.7],
      };

      expect(bands).toHaveProperty('lower80');
      expect(bands).toHaveProperty('upper80');
      expect(bands).toHaveProperty('lower95');
      expect(bands).toHaveProperty('upper95');
    });
  });
});
