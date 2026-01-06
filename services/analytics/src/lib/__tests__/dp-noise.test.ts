/**
 * Unit tests for differential privacy noise addition
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addLaplaceNoise,
  applyDPToAggregates,
  applyDPToMetric,
  composePrivacyBudget,
  isNoiseAcceptable,
  getRecommendedEpsilon,
  generatePrivacyNotice,
} from '../dp-noise.js';

describe('differential privacy noise', () => {
  describe('addLaplaceNoise', () => {
    it('should add noise to value', () => {
      const value = 100;
      const noised = addLaplaceNoise(value, 1, 0.1);

      // Noise should change the value (probabilistically, not guaranteed but very likely)
      // We can only test statistical properties over many runs
      expect(typeof noised).toBe('number');
      expect(noised).toBeGreaterThanOrEqual(0); // Non-negative clamping
    });

    it('should produce non-negative values (clamping)', () => {
      const value = 5;
      // High noise with low epsilon might produce negative values without clamping
      const noised = addLaplaceNoise(value, 10, 0.01);

      expect(noised).toBeGreaterThanOrEqual(0);
    });

    it('should add more noise with smaller epsilon', () => {
      const value = 100;
      const runs = 1000;

      // Collect noise magnitudes for different epsilon values
      const noiseMagnitudes: { [key: string]: number[] } = {
        high: [], // epsilon = 1.0 (less noise)
        low: [],  // epsilon = 0.1 (more noise)
      };

      for (let i = 0; i < runs; i++) {
        const highEpsilonNoised = addLaplaceNoise(value, 1, 1.0);
        const lowEpsilonNoised = addLaplaceNoise(value, 1, 0.1);

        noiseMagnitudes.high.push(Math.abs(highEpsilonNoised - value));
        noiseMagnitudes.low.push(Math.abs(lowEpsilonNoised - value));
      }

      // Calculate average noise magnitude
      const avgHighNoise = noiseMagnitudes.high.reduce((a, b) => a + b, 0) / runs;
      const avgLowNoise = noiseMagnitudes.low.reduce((a, b) => a + b, 0) / runs;

      // Lower epsilon should produce more noise on average
      expect(avgLowNoise).toBeGreaterThan(avgHighNoise);
    });

    it('should scale noise with sensitivity', () => {
      const value = 100;
      const runs = 1000;

      const noiseMagnitudes: { [key: string]: number[] } = {
        lowSensitivity: [], // sensitivity = 1
        highSensitivity: [], // sensitivity = 10
      };

      for (let i = 0; i < runs; i++) {
        const lowSensNoised = addLaplaceNoise(value, 1, 0.1);
        const highSensNoised = addLaplaceNoise(value, 10, 0.1);

        noiseMagnitudes.lowSensitivity.push(Math.abs(lowSensNoised - value));
        noiseMagnitudes.highSensitivity.push(Math.abs(highSensNoised - value));
      }

      const avgLowSensNoise = noiseMagnitudes.lowSensitivity.reduce((a, b) => a + b, 0) / runs;
      const avgHighSensNoise = noiseMagnitudes.highSensitivity.reduce((a, b) => a + b, 0) / runs;

      // Higher sensitivity should produce more noise
      expect(avgHighSensNoise).toBeGreaterThan(avgLowSensNoise);
    });

    it('should throw error for non-positive epsilon', () => {
      expect(() => addLaplaceNoise(100, 1, 0)).toThrow('Epsilon must be positive');
      expect(() => addLaplaceNoise(100, 1, -0.5)).toThrow('Epsilon must be positive');
    });

    it('should throw error for non-positive sensitivity', () => {
      expect(() => addLaplaceNoise(100, 0, 0.1)).toThrow('Sensitivity must be positive');
      expect(() => addLaplaceNoise(100, -1, 0.1)).toThrow('Sensitivity must be positive');
    });

    it('should handle zero value', () => {
      const noised = addLaplaceNoise(0, 1, 0.1);
      expect(typeof noised).toBe('number');
      expect(noised).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small values', () => {
      const value = 0.001;
      const noised = addLaplaceNoise(value, 1, 0.1);
      expect(typeof noised).toBe('number');
      expect(noised).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large values', () => {
      const value = 1000000;
      const noised = addLaplaceNoise(value, 1, 0.1);
      expect(typeof noised).toBe('number');
      expect(noised).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyDPToAggregates', () => {
    it('should apply noise to all aggregate fields', () => {
      const stats = {
        avg: 82.5,
        p10: 65,
        p50: 80,
        p90: 95,
        count: 127,
      };

      const result = applyDPToAggregates(stats);

      expect(result.noiseApplied).toBe(true);
      expect(result.epsilon).toBe(0.1); // Default
      expect(result.sensitivity).toBe(1);

      // All fields should be non-negative numbers
      expect(result.value.avg).toBeGreaterThanOrEqual(0);
      expect(result.value.p10).toBeGreaterThanOrEqual(0);
      expect(result.value.p50).toBeGreaterThanOrEqual(0);
      expect(result.value.p90).toBeGreaterThanOrEqual(0);
      expect(result.value.count).toBeGreaterThanOrEqual(0);

      // Count should be rounded to integer
      expect(Number.isInteger(result.value.count)).toBe(true);
    });

    it('should use custom epsilon when provided', () => {
      const stats = {
        avg: 82.5,
        p10: 65,
        p50: 80,
        p90: 95,
        count: 127,
      };

      const result = applyDPToAggregates(stats, { epsilon: 0.5 });

      expect(result.epsilon).toBe(0.5);
    });

    it('should use custom sensitivity when provided', () => {
      const stats = {
        avg: 82.5,
        p10: 65,
        p50: 80,
        p90: 95,
        count: 127,
      };

      const result = applyDPToAggregates(stats, { sensitivity: 5 });

      expect(result.sensitivity).toBe(5);
    });

    it('should handle zero values in stats', () => {
      const stats = {
        avg: 0,
        p10: 0,
        p50: 0,
        p90: 0,
        count: 0,
      };

      const result = applyDPToAggregates(stats);

      expect(result.value.avg).toBeGreaterThanOrEqual(0);
      expect(result.value.count).toBeGreaterThanOrEqual(0);
    });

    it('should round count to nearest integer', () => {
      const stats = {
        avg: 82.5,
        p10: 65,
        p50: 80,
        p90: 95,
        count: 100,
      };

      const result = applyDPToAggregates(stats);

      expect(Number.isInteger(result.value.count)).toBe(true);
    });
  });

  describe('applyDPToMetric', () => {
    it('should apply noise to single metric', () => {
      const value = 3.42;
      const config = { epsilon: 0.1, sensitivity: 1 };

      const result = applyDPToMetric(value, config);

      expect(result.noiseApplied).toBe(true);
      expect(result.epsilon).toBe(0.1);
      expect(result.sensitivity).toBe(1);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(typeof result.value).toBe('number');
    });

    it('should use provided config values', () => {
      const value = 100;
      const config = { epsilon: 0.5, sensitivity: 2 };

      const result = applyDPToMetric(value, config);

      expect(result.epsilon).toBe(0.5);
      expect(result.sensitivity).toBe(2);
    });
  });

  describe('composePrivacyBudget', () => {
    it('should sum epsilon values for sequential composition', () => {
      const queries = [0.1, 0.1, 0.05];
      const total = composePrivacyBudget(queries);

      expect(total).toBe(0.25);
    });

    it('should handle single query', () => {
      const queries = [0.1];
      const total = composePrivacyBudget(queries);

      expect(total).toBe(0.1);
    });

    it('should handle empty array', () => {
      const queries: number[] = [];
      const total = composePrivacyBudget(queries);

      expect(total).toBe(0);
    });

    it('should handle many queries', () => {
      const queries = Array(10).fill(0.1);
      const total = composePrivacyBudget(queries);

      expect(total).toBeCloseTo(1.0, 10);
    });

    it('should handle varying epsilon values', () => {
      const queries = [0.5, 0.2, 0.1, 0.05, 0.01];
      const total = composePrivacyBudget(queries);

      expect(total).toBeCloseTo(0.86, 10);
    });
  });

  describe('isNoiseAcceptable', () => {
    it('should accept noise within threshold', () => {
      const originalValue = 100;
      const noisedValue = 110; // 10% noise
      const acceptable = isNoiseAcceptable(originalValue, noisedValue, 0.3);

      expect(acceptable).toBe(true);
    });

    it('should reject excessive noise', () => {
      const originalValue = 100;
      const noisedValue = 150; // 50% noise
      const acceptable = isNoiseAcceptable(originalValue, noisedValue, 0.3);

      expect(acceptable).toBe(false);
    });

    it('should handle negative noise (decrease)', () => {
      const originalValue = 100;
      const noisedValue = 75; // 25% decrease
      const acceptable = isNoiseAcceptable(originalValue, noisedValue, 0.3);

      expect(acceptable).toBe(true);
    });

    it('should handle zero original value', () => {
      const originalValue = 0;
      const noisedValue = 10;
      const acceptable = isNoiseAcceptable(originalValue, noisedValue);

      expect(acceptable).toBe(true); // No baseline to compare
    });

    it('should use custom max noise ratio', () => {
      const originalValue = 100;
      const noisedValue = 115; // 15% noise
      const acceptable = isNoiseAcceptable(originalValue, noisedValue, 0.1);

      expect(acceptable).toBe(false); // 15% > 10% threshold
    });

    it('should handle exactly threshold boundary', () => {
      const originalValue = 100;
      const noisedValue = 130; // Exactly 30% noise
      const acceptable = isNoiseAcceptable(originalValue, noisedValue, 0.3);

      expect(acceptable).toBe(true); // <= threshold
    });
  });

  describe('getRecommendedEpsilon', () => {
    it('should recommend smallest epsilon for large cohorts', () => {
      const epsilon = getRecommendedEpsilon(100);
      expect(epsilon).toBe(0.05);
    });

    it('should recommend moderate epsilon for medium cohorts', () => {
      const epsilon = getRecommendedEpsilon(50);
      expect(epsilon).toBe(0.1);
    });

    it('should recommend higher epsilon for small cohorts', () => {
      const epsilon = getRecommendedEpsilon(20);
      expect(epsilon).toBe(0.2);
    });

    it('should recommend weaker privacy for very small cohorts', () => {
      const epsilon = getRecommendedEpsilon(10);
      expect(epsilon).toBe(0.3);
    });

    it('should recommend minimal privacy for tiny cohorts', () => {
      const epsilon = getRecommendedEpsilon(5);
      expect(epsilon).toBe(0.5);
    });

    it('should handle boundary values', () => {
      expect(getRecommendedEpsilon(99)).toBe(0.1);
      expect(getRecommendedEpsilon(100)).toBe(0.05);
      expect(getRecommendedEpsilon(49)).toBe(0.2);
      expect(getRecommendedEpsilon(50)).toBe(0.1);
    });

    it('should handle very large cohorts', () => {
      const epsilon = getRecommendedEpsilon(1000);
      expect(epsilon).toBe(0.05); // Strongest privacy
    });

    it('should handle edge case of 1 company', () => {
      const epsilon = getRecommendedEpsilon(1);
      expect(epsilon).toBe(0.5);
    });
  });

  describe('generatePrivacyNotice', () => {
    it('should generate notice for strong privacy', () => {
      const notice = generatePrivacyNotice(0.1, 50);
      expect(notice).toContain('strong');
      expect(notice).toContain('ε=0.10');
      expect(notice).toContain('n=50');
      expect(notice).toContain('Individual company data cannot be reverse-engineered');
    });

    it('should generate notice for moderate privacy', () => {
      const notice = generatePrivacyNotice(0.2, 30);
      expect(notice).toContain('moderate');
      expect(notice).toContain('ε=0.20');
    });

    it('should generate notice for basic privacy', () => {
      const notice = generatePrivacyNotice(0.5, 10);
      expect(notice).toContain('basic');
      expect(notice).toContain('ε=0.50');
    });

    it('should handle very small epsilon', () => {
      const notice = generatePrivacyNotice(0.01, 200);
      expect(notice).toContain('strong');
      expect(notice).toContain('ε=0.01');
    });

    it('should format epsilon with 2 decimal places', () => {
      const notice = generatePrivacyNotice(0.123, 50);
      expect(notice).toContain('ε=0.12');
    });

    it('should include cohort size', () => {
      const notice = generatePrivacyNotice(0.1, 75);
      expect(notice).toContain('n=75');
    });
  });

  describe('statistical properties (Monte Carlo)', () => {
    it('should produce Laplace-distributed noise with correct mean', () => {
      const value = 100;
      const runs = 10000;
      const epsilon = 0.1;
      const sensitivity = 1;

      const noises: number[] = [];
      for (let i = 0; i < runs; i++) {
        const noised = addLaplaceNoise(value, sensitivity, epsilon);
        noises.push(noised - value);
      }

      // Mean should be close to 0 (symmetric distribution)
      const mean = noises.reduce((a, b) => a + b, 0) / runs;
      expect(Math.abs(mean)).toBeLessThan(1); // Within 1 unit of 0
    });

    it('should produce noise with scale approximately λ = Δf/ε', () => {
      const value = 100;
      const runs = 10000;
      const epsilon = 0.1;
      const sensitivity = 1;
      const expectedScale = sensitivity / epsilon; // 10

      const noises: number[] = [];
      for (let i = 0; i < runs; i++) {
        const noised = addLaplaceNoise(value, sensitivity, epsilon);
        noises.push(noised - value);
      }

      // Estimate scale from MAD (Median Absolute Deviation)
      const absNoises = noises.map(Math.abs).sort((a, b) => a - b);
      const median = absNoises[Math.floor(absNoises.length / 2)];
      const estimatedScale = median / Math.log(2); // For Laplace, median = λ * ln(2)

      // Allow 20% tolerance due to statistical variance
      expect(estimatedScale).toBeGreaterThan(expectedScale * 0.8);
      expect(estimatedScale).toBeLessThan(expectedScale * 1.2);
    });
  });
});
