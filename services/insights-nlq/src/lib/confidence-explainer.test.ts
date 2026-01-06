/**
 * Unit tests for ConfidenceExplainer
 */

import { describe, it, expect } from 'vitest';
import { ConfidenceExplainer } from './confidence-explainer.js';
import { ConfidenceScorer, type ConfidenceInputs, type ConfidenceScore } from './confidence-scorer.js';

describe('ConfidenceExplainer', () => {
  const scorer = new ConfidenceScorer();

  describe('Summary Generation', () => {
    it('should generate high confidence summary', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.95,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1234,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.summary).toContain('High confidence');
      expect(explanation.summary).toContain('1,234 data points');
      expect(explanation.summary).toContain('complete coverage');
    });

    it('should generate medium confidence summary', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.75,
        dataMetrics: {
          actualDataPoints: 80,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.85,
        },
        sampleMetrics: {
          sampleSize: 150,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-10-16'),
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.summary).toContain('Medium confidence');
      expect(explanation.summary).toContain('150 data points');
      expect(explanation.summary).toContain('limitations');
    });

    it('should generate low confidence summary', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.4,
        dataMetrics: {
          actualDataPoints: 20,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.5,
        },
        sampleMetrics: {
          sampleSize: 15,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2024-05-16'),
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.summary).toContain('Low confidence');
      expect(explanation.summary).toContain('Limited data');
    });
  });

  describe('Detailed Explanation', () => {
    it('should explain clearly understood queries', () => {
      const inputs: ConfidenceInputs = {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.details).toContain('clearly understood');
      expect(explanation.details).toContain('matched a known metric template');
    });

    it('should explain ambiguous queries', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.5,
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
          assumptionCount: 3,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.5,
        },
      };

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.details).toContain('unclear');
      expect(explanation.details).toContain('rephrasing');
    });

    it('should explain data quality issues', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 30,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.6,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.details).toContain('coverage');
      expect(explanation.details.toLowerCase()).toMatch(/limited|incomplete/);
    });
  });

  describe('Component Explanations', () => {
    it('should explain intent confidence levels', () => {
      const highIntentInputs: ConfidenceInputs = {
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

      const score = scorer.calculate(highIntentInputs);
      const explanation = ConfidenceExplainer.explain(score, highIntentInputs);

      expect(explanation.components.intent).toContain('Excellent match');
    });

    it('should explain data completeness with coverage percentage', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 50,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.dataCompleteness).toContain('50 of 100');
      expect(explanation.components.dataCompleteness).toContain('50% coverage');
    });

    it('should explain sample size with specific numbers', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 1234,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.sampleSize).toContain('1,234');
    });

    it('should explain recency with days since last update', () => {
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
          mostRecentDate: new Date('2025-11-09'), // 7 days ago
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.recency).toContain('7 days ago');
      expect(explanation.components.recency).toContain('Very fresh data');
    });

    it('should explain ambiguity issues', () => {
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
          assumptionCount: 3,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.6,
        },
      };

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.ambiguity).toContain('multiple template matches');
      expect(explanation.components.ambiguity).toContain('3 assumptions');
      expect(explanation.components.ambiguity).toContain('used default values');
    });

    it('should explain crystal clear queries', () => {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.ambiguity).toContain('Crystal clear');
      expect(explanation.components.ambiguity).toContain('no ambiguity');
    });
  });

  describe('Visual Indicators', () => {
    it('should use green indicator for high confidence', () => {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.indicator.color).toBe('green');
      expect(explanation.indicator.icon).toBe('✓');
      expect(explanation.indicator.label).toBe('High Confidence');
    });

    it('should use yellow indicator for medium confidence', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.75,
        dataMetrics: {
          actualDataPoints: 80,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 0.85,
        },
        sampleMetrics: {
          sampleSize: 150,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2025-10-16'),
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.indicator.color).toBe('yellow');
      expect(explanation.indicator.icon).toBe('⚠');
      expect(explanation.indicator.label).toBe('Medium Confidence');
    });

    it('should use red indicator for low confidence', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.4,
        dataMetrics: {
          actualDataPoints: 20,
          expectedDataPoints: 100,
          hasMissingValues: true,
          fieldCompleteness: 0.5,
        },
        sampleMetrics: {
          sampleSize: 15,
          minViableSampleSize: 30,
        },
        recencyMetrics: {
          mostRecentDate: new Date('2024-11-16'),
          oldestDate: new Date('2024-10-16'),
          queryTimestamp: new Date('2025-11-16'),
        },
        ambiguityMetrics: {
          multipleTemplateMatches: true,
          assumptionCount: 5,
          usedDefaultValues: true,
          parameterExtractionConfidence: 0.3,
        },
      };

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.indicator.color).toBe('red');
      expect(explanation.indicator.icon).toBe('✗');
      expect(explanation.indicator.label).toBe('Low Confidence');
    });
  });

  describe('Recommendations', () => {
    it('should include scorer recommendations', () => {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.recommendations.length).toBeGreaterThan(0);
      expect(explanation.recommendations).toEqual(score.recommendations);
    });

    it('should have no recommendations for perfect score', () => {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.recommendations.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero sample size gracefully', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 0,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 0.0,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.sampleSize).toContain('No data found');
    });

    it('should handle very old data', () => {
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.recency).toContain('Stale data');
      // Should be around 730 days (approximately 2 years)
      expect(explanation.components.recency).toMatch(/73[0-1] days ago/);
    });

    it('should handle below minimum sample size', () => {
      const inputs: ConfidenceInputs = {
        intentConfidence: 0.9,
        dataMetrics: {
          actualDataPoints: 100,
          expectedDataPoints: 100,
          hasMissingValues: false,
          fieldCompleteness: 1.0,
        },
        sampleMetrics: {
          sampleSize: 15,
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

      const score = scorer.calculate(inputs);
      const explanation = ConfidenceExplainer.explain(score, inputs);

      expect(explanation.components.sampleSize).toContain('below minimum viable');
      expect(explanation.components.sampleSize).toContain('15');
      expect(explanation.components.sampleSize).toContain('30');
    });
  });
});
