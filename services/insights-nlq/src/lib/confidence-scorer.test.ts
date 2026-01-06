/**
 * Unit tests for ConfidenceScorer
 */

import { describe, it, expect } from 'vitest';
import { ConfidenceScorer, DEFAULT_CONFIDENCE_CONFIG, type ConfidenceInputs } from './confidence-scorer.js';

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  describe('Configuration Validation', () => {
    it('should accept valid default configuration', () => {
      expect(() => new ConfidenceScorer()).not.toThrow();
    });

    it('should reject configuration with weights not summing to 1.0', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIDENCE_CONFIG,
        weights: {
          intent: 0.30,
          dataCompleteness: 0.25,
          sampleSize: 0.20,
          recency: 0.15,
          ambiguity: 0.05, // Sum = 0.95
        },
      };

      expect(() => new ConfidenceScorer(invalidConfig)).toThrow('must sum to 1.0');
    });

    it('should reject configuration with invalid thresholds', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIDENCE_CONFIG,
        mediumThreshold: 0.85,
        highThreshold: 0.65, // Lower than medium
      };

      expect(() => new ConfidenceScorer(invalidConfig)).toThrow('greater than medium threshold');
    });
  });

  describe('Input Validation', () => {
    const validInputs: ConfidenceInputs = {
      intentConfidence: 0.95,
      dataMetrics: {
        actualDataPoints: 100,
        expectedDataPoints: 100,
        hasMissingValues: false,
        fieldCompleteness: 1.0,
      },
      sampleMetrics: {
        sampleSize: 1000,
        minViableSampleSize: 30,
      },
      recencyMetrics: {
        mostRecentDate: new Date('2025-11-15'),
        oldestDate: new Date('2025-10-15'),
        queryTimestamp: new Date('2025-11-16'),
      },
      ambiguityMetrics: {
        multipleTemplateMatches: false,
        assumptionCount: 0,
        usedDefaultValues: false,
        parameterExtractionConfidence: 0.95,
      },
    };

    it('should accept valid inputs', () => {
      expect(() => scorer.calculate(validInputs)).not.toThrow();
    });

    it('should reject invalid intent confidence', () => {
      const invalidInputs = {
        ...validInputs,
        intentConfidence: 1.5, // > 1.0
      };

      expect(() => scorer.calculate(invalidInputs)).toThrow('Intent confidence must be between 0 and 1');
    });

    it('should reject negative data points', () => {
      const invalidInputs = {
        ...validInputs,
        dataMetrics: {
          ...validInputs.dataMetrics,
          actualDataPoints: -10,
        },
      };

      expect(() => scorer.calculate(invalidInputs)).toThrow('cannot be negative');
    });

    it('should reject invalid field completeness', () => {
      const invalidInputs = {
        ...validInputs,
        dataMetrics: {
          ...validInputs.dataMetrics,
          fieldCompleteness: 1.5,
        },
      };

      expect(() => scorer.calculate(invalidInputs)).toThrow('Field completeness must be between 0 and 1');
    });
  });

  describe('Perfect Score Scenario', () => {
    it('should give high confidence for perfect inputs', () => {
      const perfectInputs: ConfidenceInputs = {
        intentConfidence: 1.0,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1500, // Above optimal
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'), // 1 day ago
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 1.0,
        },
      };

      const result = scorer.calculate(perfectInputs);

      expect(result.overall).toBeGreaterThanOrEqual(0.95);
      expect(result.level).toBe('high');
      expect(result.components.intentConfidence).toBe(1.0);
      expect(result.components.dataCompleteness).toBe(1.0);
      expect(result.components.sampleSizeScore).toBe(1.0);
      expect(result.components.recencyScore).toBe(1.0);
      expect(result.components.ambiguityPenalty).toBe(0.0);
    });
  });

  describe('Low Confidence Scenarios', () => {
    it('should give low confidence for poor intent understanding', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.4, // Poor intent
        dataMetrics: {
          actualDataPoints: 50,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.6,
        },
        sampleMetrics: {
          sampleSize: 20, // Below minimum
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2024-05-16'), // 180 days ago
          oldestDate: new Date('2024-04-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: true,
          assumptionCount: 5,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.3,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.overall).toBeLessThan(0.65);
      expect(result.level).toBe('low');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should give low confidence for zero sample size', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 0,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 0.0,
        },
        sampleMetrics: {
          sampleSize: 0, // No data
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-15'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.sampleSizeScore).toBe(0.0);
      expect(result.components.dataCompleteness).toBeLessThanOrEqual(0.1);
      expect(result.level).toBe('low');
    });
  });

  describe('Medium Confidence Scenarios', () => {
    it('should give medium confidence for acceptable inputs with some limitations', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.75,
        dataMetrics: {
          actualDataPoints: 80,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 0.85,
        },
        sampleMetrics: {
          sampleSize: 150, // Moderate sample
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-10-16'), // ~30 days ago
          oldestDate: new Date('2025-09-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 1,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.8,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.overall).toBeGreaterThanOrEqual(0.65);
      expect(result.overall).toBeLessThan(0.85);
      expect(result.level).toBe('medium');
    });
  });

  describe('Data Completeness Scoring', () => {
    it('should score high when all data points present', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.dataCompleteness).toBeGreaterThanOrEqual(0.9);
    });

    it('should penalize missing values', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: true, // Has missing values
          fieldCompleteness: 0.7,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.dataCompleteness).toBeLessThan(0.9);
    });

    it('should handle partial data point coverage', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 50,
          expectedDataPoints: 100, // 50% coverage
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      // Should be around 0.7 (50% * 0.6 weight + 1.0 * 0.4 weight = 0.7)
      expect(result.components.dataCompleteness).toBeGreaterThan(0.5);
      expect(result.components.dataCompleteness).toBeLessThanOrEqual(0.7);
    });
  });

  describe('Sample Size Scoring', () => {
    it('should give maximum score for optimal sample size', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000, // Optimal
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.sampleSizeScore).toBe(1.0);
    });

    it('should give low score for below-minimum sample size', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 15, // Below minimum (30)
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.sampleSizeScore).toBeLessThan(0.3);
    });

    it('should scale linearly between min and optimal', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 500, // Midpoint between min (30) and optimal (1000)
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      // Should be between 0.3 and 1.0
      expect(result.components.sampleSizeScore).toBeGreaterThan(0.5);
      expect(result.components.sampleSizeScore).toBeLessThan(1.0);
    });
  });

  describe('Recency Scoring', () => {
    it('should give maximum score for fresh data', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'), // 1 day ago (within 30 day threshold)
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.recencyScore).toBe(1.0);
    });

    it('should give zero score for very stale data', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2023-11-16'), // 2 years ago
          oldestDate: new Date('2023-10-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.recencyScore).toBe(0.0);
    });

    it('should decay linearly between fresh and stale thresholds', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-05-16'), // ~6 months ago (between 30 and 365 days)
          oldestDate: new Date('2025-04-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      const result = scorer.calculate(inputs);

      // Should be between 0 and 1
      expect(result.components.recencyScore).toBeGreaterThan(0.0);
      expect(result.components.recencyScore).toBeLessThan(1.0);
    });
  });

  describe('Ambiguity Penalty', () => {
    it('should give zero penalty for clear query', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 1.0,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.ambiguityPenalty).toBe(0.0);
    });

    it('should penalize multiple template matches', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: true, // Ambiguous
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 1.0,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.ambiguityPenalty).toBeGreaterThan(0.1);
    });

    it('should penalize assumptions', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 3, // Made assumptions
          usedDefaultValues: false,
          parameterExtractionConfidence: 1.0,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.ambiguityPenalty).toBeGreaterThan(0.0);
    });

    it('should cap penalty at maximum', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: true,
          assumptionCount: 10, // Many assumptions
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.1,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.components.ambiguityPenalty).toBeLessThanOrEqual(0.5); // Max penalty
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for low confidence scores', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.5,
        dataMetrics: {
          actualDataPoints: 20,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.4,
        },
        sampleMetrics: {
          sampleSize: 10,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2024-11-16'),
          oldestDate: new Date('2024-10-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: true,
          assumptionCount: 4,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.4,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.recommendations.length).toBeGreaterThan(3);
      expect(result.recommendations.some(r => r.includes('specific'))).toBe(true);
    });

    it('should provide minimal recommendations for high confidence', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.95,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1500,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-01'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.95,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.recommendations.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero expected data points', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 0,
          expectedDataPoints: 0,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 0,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-15'),
          oldestDate: new Date('2025-11-15'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 0.9,
        },
      };

      expect(() => scorer.calculate(inputs)).not.toThrow();
      const result = scorer.calculate(inputs);
      // Intent is high (0.9), but zero data brings overall down significantly
      expect(result.overall).toBeLessThan(0.65);
    });

    it('should clamp overall score to [0, 1]', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 1.0,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 2000,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-11-16'),
          oldestDate: new Date('2025-11-15'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: false,
          assumptionCount: 0,
          usedDefaultValues: false,
          parameterExtractionConfidence: 1.0,
        },
      };

      const result = scorer.calculate(inputs);

      expect(result.overall).toBeLessThanOrEqual(1.0);
      expect(result.overall).toBeGreaterThanOrEqual(0.0);
    });
  });
});
