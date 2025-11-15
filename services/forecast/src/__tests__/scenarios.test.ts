import { describe, it, expect } from 'vitest';
import { generateScenarios, calculateExceedanceProbability } from '../lib/scenarios.js';
import { ForecastResult } from '../types.js';

describe('Scenario Modeling', () => {
  const mockForecastResult: ForecastResult = {
    predictions: [
      { date: '2025-01-01', value: 100 },
      { date: '2025-02-01', value: 105 },
      { date: '2025-03-01', value: 110 },
    ],
    confidenceBands: {
      lower80: [90, 93, 96],
      upper80: [110, 117, 124],
      lower95: [85, 87, 90],
      upper95: [115, 123, 130],
    },
    metrics: {
      mae: 2.5,
      rmse: 3.2,
      mape: 5.1,
    },
  };

  describe('generateScenarios', () => {
    it('should generate three scenarios', () => {
      const result = generateScenarios(mockForecastResult);

      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.optimistic).toBeDefined();
      expect(result.scenarios.realistic).toBeDefined();
      expect(result.scenarios.pessimistic).toBeDefined();
    });

    it('should have same length for all scenarios', () => {
      const result = generateScenarios(mockForecastResult);

      const { optimistic, realistic, pessimistic } = result.scenarios;

      expect(optimistic).toHaveLength(3);
      expect(realistic).toHaveLength(3);
      expect(pessimistic).toHaveLength(3);
    });

    it('should use upper 80% band for optimistic scenario', () => {
      const result = generateScenarios(mockForecastResult);

      const { optimistic } = result.scenarios;

      expect(optimistic[0].value).toBe(mockForecastResult.confidenceBands.upper80[0]);
      expect(optimistic[1].value).toBe(mockForecastResult.confidenceBands.upper80[1]);
      expect(optimistic[2].value).toBe(mockForecastResult.confidenceBands.upper80[2]);
    });

    it('should use point estimates for realistic scenario', () => {
      const result = generateScenarios(mockForecastResult);

      const { realistic } = result.scenarios;

      expect(realistic[0].value).toBe(mockForecastResult.predictions[0].value);
      expect(realistic[1].value).toBe(mockForecastResult.predictions[1].value);
      expect(realistic[2].value).toBe(mockForecastResult.predictions[2].value);
    });

    it('should use lower 80% band for pessimistic scenario', () => {
      const result = generateScenarios(mockForecastResult);

      const { pessimistic } = result.scenarios;

      expect(pessimistic[0].value).toBe(mockForecastResult.confidenceBands.lower80[0]);
      expect(pessimistic[1].value).toBe(mockForecastResult.confidenceBands.lower80[1]);
      expect(pessimistic[2].value).toBe(mockForecastResult.confidenceBands.lower80[2]);
    });

    it('should include assumptions for each scenario', () => {
      const result = generateScenarios(mockForecastResult);

      expect(result.assumptions).toBeDefined();
      expect(result.assumptions.optimistic).toBeTruthy();
      expect(result.assumptions.realistic).toBeTruthy();
      expect(result.assumptions.pessimistic).toBeTruthy();
      expect(typeof result.assumptions.optimistic).toBe('string');
      expect(typeof result.assumptions.realistic).toBe('string');
      expect(typeof result.assumptions.pessimistic).toBe('string');
    });

    it('should preserve dates across scenarios', () => {
      const result = generateScenarios(mockForecastResult);

      const { optimistic, realistic, pessimistic } = result.scenarios;

      for (let i = 0; i < 3; i++) {
        expect(optimistic[i].date).toBe(mockForecastResult.predictions[i].date);
        expect(realistic[i].date).toBe(mockForecastResult.predictions[i].date);
        expect(pessimistic[i].date).toBe(mockForecastResult.predictions[i].date);
      }
    });

    it('should have optimistic > realistic > pessimistic', () => {
      const result = generateScenarios(mockForecastResult);

      const { optimistic, realistic, pessimistic } = result.scenarios;

      for (let i = 0; i < 3; i++) {
        expect(optimistic[i].value).toBeGreaterThan(realistic[i].value);
        expect(realistic[i].value).toBeGreaterThan(pessimistic[i].value);
      }
    });

    it('should round values to 2 decimal places', () => {
      const result = generateScenarios(mockForecastResult);

      const { optimistic, realistic, pessimistic } = result.scenarios;

      for (let i = 0; i < 3; i++) {
        expect(optimistic[i].value.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
        expect(realistic[i].value.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
        expect(pessimistic[i].value.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('calculateExceedanceProbability', () => {
    const confidenceBands = {
      lower95: [85, 87, 90],
      upper95: [115, 123, 130],
    };

    it('should return 1.0 for targets below lower bound', () => {
      const prob = calculateExceedanceProbability(80, 100, confidenceBands, 0);
      expect(prob).toBe(1.0);
    });

    it('should return 0.0 for targets above upper bound', () => {
      const prob = calculateExceedanceProbability(120, 100, confidenceBands, 0);
      expect(prob).toBe(0.0);
    });

    it('should return value between 0 and 1 for targets within bounds', () => {
      const prob = calculateExceedanceProbability(100, 100, confidenceBands, 0);
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });

    it('should handle different indices', () => {
      const prob0 = calculateExceedanceProbability(100, 100, confidenceBands, 0);
      const prob1 = calculateExceedanceProbability(100, 100, confidenceBands, 1);

      // Probabilities may differ due to different confidence bands
      expect(typeof prob0).toBe('number');
      expect(typeof prob1).toBe('number');
    });
  });
});
