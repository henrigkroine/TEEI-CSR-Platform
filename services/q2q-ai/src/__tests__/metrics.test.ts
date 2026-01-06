import { describe, it, expect } from 'vitest';
import {
  calculateLabelMetrics,
  buildConfusionMatrix,
  calculateEvaluationResults
} from '../calibration/metrics';
import type { PredictionResult } from '../calibration/types';

describe('metrics', () => {
  const mockPredictions: PredictionResult[] = [
    {
      sampleId: '1',
      text: 'text 1',
      trueLabel: 'positive',
      predictedLabel: 'positive',
      confidence: 0.9,
      latencyMs: 100
    },
    {
      sampleId: '2',
      text: 'text 2',
      trueLabel: 'positive',
      predictedLabel: 'negative',
      confidence: 0.7,
      latencyMs: 110
    },
    {
      sampleId: '3',
      text: 'text 3',
      trueLabel: 'negative',
      predictedLabel: 'negative',
      confidence: 0.95,
      latencyMs: 90
    },
    {
      sampleId: '4',
      text: 'text 4',
      trueLabel: 'negative',
      predictedLabel: 'negative',
      confidence: 0.85,
      latencyMs: 105
    }
  ];

  describe('calculateLabelMetrics', () => {
    it('should calculate correct metrics for a label', () => {
      const metrics = calculateLabelMetrics(
        mockPredictions,
        'positive',
        ['positive', 'negative']
      );

      expect(metrics.label).toBe('positive');
      expect(metrics.truePositives).toBe(1); // Sample 1
      expect(metrics.falsePositives).toBe(0);
      expect(metrics.falseNegatives).toBe(1); // Sample 2
      expect(metrics.support).toBe(2); // Samples 1 and 2 are truly positive
      expect(metrics.precision).toBe(1.0); // 1 / (1 + 0)
      expect(metrics.recall).toBe(0.5); // 1 / (1 + 1)
      expect(metrics.f1Score).toBeCloseTo(0.667, 2); // 2 * (1 * 0.5) / (1 + 0.5)
    });

    it('should handle labels with no predictions', () => {
      const metrics = calculateLabelMetrics(
        mockPredictions,
        'neutral',
        ['positive', 'negative', 'neutral']
      );

      expect(metrics.label).toBe('neutral');
      expect(metrics.precision).toBe(0);
      expect(metrics.recall).toBe(0);
      expect(metrics.f1Score).toBe(0);
      expect(metrics.support).toBe(0);
    });
  });

  describe('buildConfusionMatrix', () => {
    it('should build correct confusion matrix', () => {
      const cm = buildConfusionMatrix(
        mockPredictions,
        ['positive', 'negative']
      );

      expect(cm.labels).toEqual(['positive', 'negative']);
      expect(cm.matrix).toHaveLength(2);
      expect(cm.matrix[0]).toHaveLength(2);

      // positive → positive: 1 (sample 1)
      expect(cm.matrix[0][0]).toBe(1);
      // positive → negative: 1 (sample 2)
      expect(cm.matrix[0][1]).toBe(1);
      // negative → positive: 0
      expect(cm.matrix[1][0]).toBe(0);
      // negative → negative: 2 (samples 3 and 4)
      expect(cm.matrix[1][1]).toBe(2);
    });

    it('should handle empty predictions', () => {
      const cm = buildConfusionMatrix([], ['positive', 'negative']);

      expect(cm.labels).toEqual(['positive', 'negative']);
      expect(cm.matrix).toEqual([[0, 0], [0, 0]]);
    });
  });

  describe('calculateEvaluationResults', () => {
    it('should calculate overall evaluation results', () => {
      const results = calculateEvaluationResults(mockPredictions, 0.05);

      expect(results.totalSamples).toBe(4);
      expect(results.correctPredictions).toBe(3); // Samples 1, 3, 4
      expect(results.accuracy).toBe(0.75); // 3/4
      expect(results.totalCost).toBe(0.05);
      expect(results.averageLatencyMs).toBeCloseTo(101.25, 1); // (100+110+90+105)/4
      expect(results.labelMetrics).toHaveLength(2); // positive and negative
      expect(results.confusionMatrix).toBeDefined();
      expect(results.predictions).toHaveLength(4);
    });

    it('should handle predictions with errors', () => {
      const predictionsWithError: PredictionResult[] = [
        ...mockPredictions,
        {
          sampleId: '5',
          text: 'text 5',
          trueLabel: 'positive',
          predictedLabel: 'error',
          confidence: 0,
          latencyMs: 50,
          error: 'API error'
        }
      ];

      const results = calculateEvaluationResults(predictionsWithError, 0.05);

      expect(results.totalSamples).toBe(5);
      expect(results.correctPredictions).toBe(3); // Still only 3 correct
      expect(results.accuracy).toBe(0.6); // 3/5
      // Average latency should exclude the error (100+110+90+105)/4
      expect(results.averageLatencyMs).toBeCloseTo(101.25, 1);
    });
  });
});
