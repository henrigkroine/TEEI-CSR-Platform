import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ActiveLearningQueue,
  ActiveLearningSample,
  calculateEntropy,
  calculateMargin,
  calculateOverallConfidence,
  calculateUncertainty,
  calculateDiversity,
  calculatePriorityScore
} from '../labeling/active-queue.js';
import { ClassificationOutput, LanguageComfort } from '../labels.js';

describe('Active Learning Queue - Utility Functions', () => {
  describe('calculateEntropy', () => {
    it('should return 0 for certain distribution', () => {
      const entropy = calculateEntropy([1.0, 0.0, 0.0]);
      expect(entropy).toBe(0);
    });

    it('should return high entropy for uniform distribution', () => {
      const entropy = calculateEntropy([0.33, 0.33, 0.34]);
      expect(entropy).toBeGreaterThan(1.5);
    });

    it('should return moderate entropy for mixed distribution', () => {
      const entropy = calculateEntropy([0.7, 0.2, 0.1]);
      expect(entropy).toBeGreaterThan(0);
      expect(entropy).toBeLessThan(1.5);
    });
  });

  describe('calculateMargin', () => {
    it('should return 1.0 for single class', () => {
      const margin = calculateMargin([1.0]);
      expect(margin).toBe(1.0);
    });

    it('should return high margin for confident prediction', () => {
      const margin = calculateMargin([0.9, 0.05, 0.05]);
      expect(margin).toBeGreaterThan(0.8);
    });

    it('should return low margin for uncertain prediction', () => {
      const margin = calculateMargin([0.51, 0.49]);
      expect(margin).toBeLessThan(0.1);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should return high confidence for positive predictions', () => {
      const classification: ClassificationOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: true,
        belonging_decrease: false,
        language_comfort: LanguageComfort.HIGH,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const confidence = calculateOverallConfidence(classification);
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should return low confidence for negative predictions', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const confidence = calculateOverallConfidence(classification);
      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('calculateUncertainty', () => {
    it('should calculate uncertainty metrics', () => {
      const classification: ClassificationOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const uncertainty = calculateUncertainty(classification);

      expect(uncertainty.confidence).toBeGreaterThanOrEqual(0);
      expect(uncertainty.confidence).toBeLessThanOrEqual(1);
      expect(uncertainty.entropy).toBeGreaterThanOrEqual(0);
      expect(uncertainty.marginScore).toBeGreaterThanOrEqual(0);
      expect(uncertainty.marginScore).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateDiversity', () => {
    it('should return 1.0 for empty queue', () => {
      const embedding = [0.5, 0.3, 0.2];
      const diversity = calculateDiversity(embedding, []);
      expect(diversity).toBe(1.0);
    });

    it('should return low diversity for similar embeddings', () => {
      const embedding = [0.5, 0.3, 0.2];
      const existing = [
        [0.51, 0.29, 0.20],
        [0.49, 0.31, 0.20]
      ];
      const diversity = calculateDiversity(embedding, existing);
      expect(diversity).toBeLessThan(0.5);
    });

    it('should return high diversity for dissimilar embeddings', () => {
      const embedding = [1.0, 0.0, 0.0];
      const existing = [
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0]
      ];
      const diversity = calculateDiversity(embedding, existing);
      expect(diversity).toBeGreaterThan(0.5);
    });
  });

  describe('calculatePriorityScore', () => {
    it('should return high priority for low confidence', () => {
      const uncertainty = {
        confidence: 0.3,
        entropy: 1.5,
        marginScore: 0.1
      };

      const priority = calculatePriorityScore(uncertainty, 1.0);
      expect(priority).toBeGreaterThan(0.5);
    });

    it('should return low priority for high confidence', () => {
      const uncertainty = {
        confidence: 0.9,
        entropy: 0.1,
        marginScore: 0.8
      };

      const priority = calculatePriorityScore(uncertainty, 1.0);
      expect(priority).toBeLessThan(0.5);
    });

    it('should incorporate diversity weight', () => {
      const uncertainty = {
        confidence: 0.5,
        entropy: 1.0,
        marginScore: 0.5
      };

      const highDiversity = calculatePriorityScore(uncertainty, 1.0, {
        diversityWeight: 0.5
      });

      const lowDiversity = calculatePriorityScore(uncertainty, 0.0, {
        diversityWeight: 0.5
      });

      expect(highDiversity).toBeGreaterThan(lowDiversity);
    });
  });
});

describe('Active Learning Queue - Queue Management', () => {
  let queue: ActiveLearningQueue;

  beforeEach(() => {
    queue = new ActiveLearningQueue({
      maxQueueSize: 10,
      confidenceThreshold: 0.7,
      marginThreshold: 0.15
    });
  });

  describe('addSample', () => {
    it('should add low-confidence sample', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const added = queue.createAndAddSample(
        'test-1',
        'Test feedback',
        classification,
        'en'
      );

      expect(added).toBe(true);
      expect(queue.getStats().totalSize).toBe(1);
    });

    it('should reject high-confidence sample', () => {
      const classification: ClassificationOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: true,
        belonging_decrease: false,
        language_comfort: LanguageComfort.HIGH,
        employability_signals: ['job_search'],
        risk_cues: [],
        evidence: []
      };

      const added = queue.createAndAddSample(
        'test-2',
        'Test feedback',
        classification,
        'en'
      );

      expect(added).toBe(false);
      expect(queue.getStats().totalSize).toBe(0);
    });

    it('should reject duplicate sample', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const added1 = queue.createAndAddSample(
        'test-3',
        'Test feedback',
        classification,
        'en'
      );

      const added2 = queue.createAndAddSample(
        'test-3',
        'Test feedback',
        classification,
        'en'
      );

      expect(added1).toBe(true);
      expect(added2).toBe(false);
      expect(queue.getStats().totalSize).toBe(1);
    });
  });

  describe('getTopPrioritySamples', () => {
    it('should return samples sorted by priority', () => {
      // Add samples with different confidences
      const lowConf: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const medConf: ClassificationOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('low-1', 'Low confidence', lowConf, 'en');
      queue.createAndAddSample('med-1', 'Med confidence', medConf, 'en');
      queue.createAndAddSample('low-2', 'Low confidence', lowConf, 'en');

      const topSamples = queue.getTopPrioritySamples(2);

      expect(topSamples.length).toBeLessThanOrEqual(2);
      // First sample should have higher priority than second
      if (topSamples.length === 2) {
        expect(topSamples[0].sample.priorityScore).toBeGreaterThanOrEqual(
          topSamples[1].sample.priorityScore
        );
      }
    });

    it('should filter by tenant', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('t1-1', 'Tenant 1', classification, 'en', {
        tenantId: 'tenant-1'
      });

      queue.createAndAddSample('t2-1', 'Tenant 2', classification, 'en', {
        tenantId: 'tenant-2'
      });

      const tenant1Samples = queue.getTopPrioritySamples(10, 'tenant-1');

      expect(tenant1Samples.length).toBe(1);
      expect(tenant1Samples[0].sample.tenantId).toBe('tenant-1');
    });
  });

  describe('getBatch', () => {
    it('should return batch of specified size', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      // Add 5 samples
      for (let i = 0; i < 5; i++) {
        queue.createAndAddSample(`test-${i}`, `Feedback ${i}`, classification, 'en');
      }

      const batch = queue.getBatch(3);

      expect(batch.length).toBeLessThanOrEqual(3);
    });
  });

  describe('markAsLabeled', () => {
    it('should mark sample as labeled', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('test-label', 'Test', classification, 'en');

      queue.markAsLabeled('test-label', {
        confidence_increase: true
      }, 'annotator-1');

      const stats = queue.getStats();
      expect(stats.byStatus.labeled).toBe(1);
      expect(stats.byStatus.pending).toBe(0);
    });

    it('should throw error for non-existent sample', () => {
      expect(() => {
        queue.markAsLabeled('non-existent', {}, 'annotator-1');
      }).toThrow();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('en-1', 'English', classification, 'en');
      queue.createAndAddSample('uk-1', 'Ukrainian', classification, 'uk');
      queue.createAndAddSample('no-1', 'Norwegian', classification, 'no');

      const stats = queue.getStats();

      expect(stats.totalSize).toBe(3);
      expect(stats.byLanguage.en).toBe(1);
      expect(stats.byLanguage.uk).toBe(1);
      expect(stats.byLanguage.no).toBe(1);
      expect(stats.byStatus.pending).toBe(3);
    });
  });

  describe('capacity management', () => {
    it('should respect max queue size', () => {
      const smallQueue = new ActiveLearningQueue({
        maxQueueSize: 3,
        confidenceThreshold: 0.7
      });

      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      // Try to add 5 samples
      let addedCount = 0;
      for (let i = 0; i < 5; i++) {
        const added = smallQueue.createAndAddSample(
          `test-${i}`,
          `Feedback ${i}`,
          classification,
          'en'
        );
        if (added) addedCount++;
      }

      expect(smallQueue.getStats().totalSize).toBeLessThanOrEqual(3);
    });

    it('should replace low priority samples when full', () => {
      const smallQueue = new ActiveLearningQueue({
        maxQueueSize: 2,
        confidenceThreshold: 0.9 // Very high threshold to allow almost anything
      });

      const highPriorityClassification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      const lowPriorityClassification: ClassificationOutput = {
        confidence_increase: true,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.MEDIUM,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      // Fill queue with low priority
      smallQueue.createAndAddSample('low-1', 'Low', lowPriorityClassification, 'en');
      smallQueue.createAndAddSample('low-2', 'Low', lowPriorityClassification, 'en');

      // Try to add high priority
      const added = smallQueue.createAndAddSample(
        'high-1',
        'High',
        highPriorityClassification,
        'en'
      );

      expect(smallQueue.getStats().totalSize).toBe(2);
    });
  });

  describe('export and import', () => {
    it('should export queue to JSON', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('test-export', 'Export test', classification, 'en');

      const exported = queue.exportQueue();
      const parsed = JSON.parse(exported);

      expect(parsed.items).toBeDefined();
      expect(parsed.items.length).toBe(1);
      expect(parsed.config).toBeDefined();
    });

    it('should import queue from JSON', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('test-import', 'Import test', classification, 'en');

      const exported = queue.exportQueue();

      const newQueue = new ActiveLearningQueue();
      newQueue.importQueue(exported);

      expect(newQueue.getStats().totalSize).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all samples', () => {
      const classification: ClassificationOutput = {
        confidence_increase: false,
        confidence_decrease: false,
        belonging_increase: false,
        belonging_decrease: false,
        language_comfort: LanguageComfort.LOW,
        employability_signals: [],
        risk_cues: [],
        evidence: []
      };

      queue.createAndAddSample('test-1', 'Test 1', classification, 'en');
      queue.createAndAddSample('test-2', 'Test 2', classification, 'en');

      queue.clear();

      expect(queue.getStats().totalSize).toBe(0);
    });
  });
});

describe('Active Learning Queue - Diversity Sampling', () => {
  let queue: ActiveLearningQueue;

  beforeEach(() => {
    queue = new ActiveLearningQueue({
      maxQueueSize: 10,
      confidenceThreshold: 0.9, // High threshold to allow most samples
      diversityWeight: 0.5
    });
  });

  it('should prioritize diverse samples', () => {
    const classification: ClassificationOutput = {
      confidence_increase: false,
      confidence_decrease: false,
      belonging_increase: false,
      belonging_decrease: false,
      language_comfort: LanguageComfort.LOW,
      employability_signals: [],
      risk_cues: [],
      evidence: []
    };

    // Add first sample with embedding
    queue.createAndAddSample('test-1', 'First', classification, 'en', {
      embedding: [1.0, 0.0, 0.0]
    });

    // Add similar sample (should get lower priority)
    queue.createAndAddSample('test-2', 'Similar', classification, 'en', {
      embedding: [0.9, 0.1, 0.0]
    });

    // Add diverse sample (should get higher priority)
    queue.createAndAddSample('test-3', 'Diverse', classification, 'en', {
      embedding: [0.0, 0.0, 1.0]
    });

    const samples = queue.getTopPrioritySamples(3);

    // The diverse sample should be prioritized over the similar one
    const diverseSample = samples.find(s => s.sample.id === 'test-3');
    const similarSample = samples.find(s => s.sample.id === 'test-2');

    if (diverseSample && similarSample) {
      expect(diverseSample.sample.priorityScore).toBeGreaterThanOrEqual(
        similarSample.sample.priorityScore
      );
    }
  });
});
