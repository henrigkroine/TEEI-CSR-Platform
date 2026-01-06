import { describe, it, expect } from 'vitest';
import {
  evaluatePerLanguage,
  evaluateAllLanguages,
  checkFairnessParity,
  formatFairnessReport,
  generateLocaleReport,
  formatLocaleReport,
  generateComprehensiveReport,
  FAIRNESS_PARITY_THRESHOLD,
  EvalSample
} from '../eval/multilingual.js';

describe('Multilingual Evaluation - Fairness Parity', () => {
  // Sample test dataset
  const createTestDataset = (): EvalSample[] => {
    return [
      // English samples - high accuracy
      {
        text: 'I feel confident',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
        prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
        language: 'en'
      },
      {
        text: 'I feel isolated',
        groundTruth: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: true },
        prediction: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: true },
        language: 'en'
      },
      {
        text: 'Great progress',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: true, belonging_decrease: false },
        prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: true, belonging_decrease: false },
        language: 'en'
      },

      // Ukrainian samples - medium accuracy (some errors)
      {
        text: 'Я впевнений',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
        prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
        language: 'uk'
      },
      {
        text: 'Почуваюся самотнім',
        groundTruth: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: true },
        prediction: { confidence_increase: false, confidence_decrease: true, belonging_increase: false, belonging_decrease: false }, // Wrong!
        language: 'uk'
      },
      {
        text: 'Добрий прогрес',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: true, belonging_decrease: false },
        prediction: { confidence_increase: false, confidence_decrease: false, belonging_increase: true, belonging_decrease: false }, // Wrong!
        language: 'uk'
      },

      // Norwegian samples - low accuracy (more errors)
      {
        text: 'Jeg føler meg sikker',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
        prediction: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: false }, // Wrong!
        language: 'no'
      },
      {
        text: 'Føler meg isolert',
        groundTruth: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: true },
        prediction: { confidence_increase: false, confidence_decrease: false, belonging_increase: false, belonging_decrease: false }, // Wrong!
        language: 'no'
      },
      {
        text: 'God fremgang',
        groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: true, belonging_decrease: false },
        prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false }, // Partial
        language: 'no'
      }
    ];
  };

  describe('checkFairnessParity', () => {
    it('should detect fairness violations when accuracy gaps exceed threshold', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations);

      // Should detect violations due to accuracy differences between en/uk/no
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.overallParity).toBe(false);
    });

    it('should not report violations when all languages perform equally', () => {
      // Create balanced dataset with equal performance
      const balancedDataset: EvalSample[] = [
        {
          text: 'English positive',
          groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          language: 'en'
        },
        {
          text: 'Ukrainian positive',
          groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          language: 'uk'
        },
        {
          text: 'Norwegian positive',
          groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          language: 'no'
        }
      ];

      const evaluations = evaluateAllLanguages(balancedDataset);
      const report = checkFairnessParity(evaluations);

      expect(report.overallParity).toBe(true);
      expect(report.violations.length).toBe(0);
    });

    it('should categorize violation severity correctly', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations, 0.01); // Very strict threshold

      // Check that violations have severity assigned
      for (const violation of report.violations) {
        expect(['low', 'medium', 'high']).toContain(violation.severity);

        // High severity for large gaps
        if (violation.gap > 0.15) {
          expect(violation.severity).toBe('high');
        }
      }
    });

    it('should respect custom threshold', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);

      const strictReport = checkFairnessParity(evaluations, 0.01);
      const lenientReport = checkFairnessParity(evaluations, 0.50);

      expect(strictReport.violations.length).toBeGreaterThanOrEqual(lenientReport.violations.length);
    });

    it('should track maximum gap', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations);

      expect(report.maxGap).toBeGreaterThan(0);

      if (report.violations.length > 0) {
        const maxViolationGap = Math.max(...report.violations.map(v => v.gap));
        expect(report.maxGap).toBe(maxViolationGap);
      }
    });

    it('should generate meaningful summary', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations);

      expect(report.summary).toBeDefined();
      expect(report.summary.length).toBeGreaterThan(0);

      if (report.overallParity) {
        expect(report.summary).toContain('✓');
      } else {
        expect(report.summary).toContain('⚠');
        expect(report.summary).toContain('violations');
      }
    });
  });

  describe('formatFairnessReport', () => {
    it('should format report as readable text', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations);
      const formatted = formatFairnessReport(report);

      expect(formatted).toContain('Fairness Parity Report');
      expect(formatted).toContain(report.summary);
    });

    it('should include violations in formatted output', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations, 0.01); // Strict to ensure violations
      const formatted = formatFairnessReport(report);

      if (report.violations.length > 0) {
        expect(formatted).toContain('Violations');
        expect(formatted).toContain('Gap:');
      }
    });

    it('should show language pairs in violations', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const report = checkFairnessParity(evaluations, 0.01);
      const formatted = formatFairnessReport(report);

      if (report.violations.length > 0) {
        const firstViolation = report.violations[0];
        expect(formatted).toContain(firstViolation.language1);
        expect(formatted).toContain(firstViolation.language2);
      }
    });
  });

  describe('generateLocaleReport', () => {
    it('should generate comprehensive locale report', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);

        expect(report.locale).toBe('en');
        expect(report.sampleCount).toBe(3);
        expect(report.accuracy).toBeGreaterThanOrEqual(0);
        expect(report.accuracy).toBeLessThanOrEqual(1);
        expect(report.macroF1).toBeGreaterThanOrEqual(0);
        expect(report.macroF1).toBeLessThanOrEqual(1);
      }
    });

    it('should identify strengths and weaknesses', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);

      for (const [_, evaluation] of evaluations) {
        const report = generateLocaleReport(evaluation);

        expect(Array.isArray(report.strengths)).toBe(true);
        expect(Array.isArray(report.weaknesses)).toBe(true);
      }
    });

    it('should assess data quality', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval, 50); // Require 50 samples

        expect(report.dataQuality).toBeDefined();
        expect(typeof report.dataQuality.sufficientData).toBe('boolean');
        expect(typeof report.dataQuality.balanced).toBe('boolean');
        expect(report.dataQuality.minSamplesNeeded).toBe(50);

        // Our test dataset has < 50 samples
        expect(report.dataQuality.sufficientData).toBe(false);
      }
    });

    it('should respect custom minimum sample threshold', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const reportLow = generateLocaleReport(enEval, 2);
        const reportHigh = generateLocaleReport(enEval, 100);

        expect(reportLow.dataQuality.sufficientData).toBe(true);
        expect(reportHigh.dataQuality.sufficientData).toBe(false);
      }
    });

    it('should extract per-label F1 scores', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);

        expect(Object.keys(report.perLabelF1).length).toBeGreaterThan(0);

        for (const [label, f1] of Object.entries(report.perLabelF1)) {
          expect(typeof label).toBe('string');
          expect(f1).toBeGreaterThanOrEqual(0);
          expect(f1).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('formatLocaleReport', () => {
    it('should format locale report as readable text', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);
        const formatted = formatLocaleReport(report);

        expect(formatted).toContain('Locale Performance Report');
        expect(formatted).toContain('EN');
        expect(formatted).toContain('Sample Count:');
        expect(formatted).toContain('Overall Accuracy:');
        expect(formatted).toContain('Macro F1 Score:');
      }
    });

    it('should include data quality assessment', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);
        const formatted = formatLocaleReport(report);

        expect(formatted).toContain('Data Quality');
      }
    });

    it('should show strengths if present', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);
        const formatted = formatLocaleReport(report);

        if (report.strengths.length > 0) {
          expect(formatted).toContain('Strengths');
          expect(formatted).toContain('F1 > 80%');
        }
      }
    });

    it('should show weaknesses if present', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const noEval = evaluations.get('no'); // Norwegian has lower accuracy in test data

      if (noEval) {
        const report = generateLocaleReport(noEval);
        const formatted = formatLocaleReport(report);

        if (report.weaknesses.length > 0) {
          expect(formatted).toContain('Weaknesses');
          expect(formatted).toContain('F1 < 60%');
        }
      }
    });

    it('should provide recommendations', () => {
      const dataset = createTestDataset();
      const evaluations = evaluateAllLanguages(dataset);
      const enEval = evaluations.get('en');

      if (enEval) {
        const report = generateLocaleReport(enEval);
        const formatted = formatLocaleReport(report);

        expect(formatted).toContain('Recommendations');
      }
    });
  });

  describe('generateComprehensiveReport', () => {
    it('should generate full multilingual report', () => {
      const dataset = createTestDataset();
      const report = generateComprehensiveReport(dataset);

      expect(report).toContain('MULTILINGUAL EVALUATION REPORT');
      expect(report).toContain('Cross-Language Comparison');
      expect(report).toContain('Fairness Parity Report');
      expect(report).toContain('PER-LOCALE DETAILED REPORTS');
      expect(report).toContain('OVERALL RECOMMENDATIONS');
    });

    it('should include all languages from dataset', () => {
      const dataset = createTestDataset();
      const report = generateComprehensiveReport(dataset);

      expect(report).toContain('en');
      expect(report).toContain('uk');
      expect(report).toContain('no');
    });

    it('should flag fairness issues if present', () => {
      const dataset = createTestDataset();
      const report = generateComprehensiveReport(dataset);

      // Our test data has accuracy disparities
      expect(report).toContain('FAIRNESS');
    });

    it('should check for missing locales', () => {
      // Dataset with only English
      const limitedDataset: EvalSample[] = [
        {
          text: 'English only',
          groundTruth: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          prediction: { confidence_increase: true, confidence_decrease: false, belonging_increase: false, belonging_decrease: false },
          language: 'en'
        }
      ];

      const report = generateComprehensiveReport(limitedDataset);

      expect(report).toContain('MISSING EVALUATION DATA');
      expect(report).toContain('uk');
      expect(report).toContain('no');
    });

    it('should provide actionable recommendations', () => {
      const dataset = createTestDataset();
      const report = generateComprehensiveReport(dataset);

      expect(report).toContain('•'); // Bullet points for recommendations
    });
  });

  describe('FAIRNESS_PARITY_THRESHOLD', () => {
    it('should be defined and reasonable', () => {
      expect(FAIRNESS_PARITY_THRESHOLD).toBeDefined();
      expect(FAIRNESS_PARITY_THRESHOLD).toBeGreaterThan(0);
      expect(FAIRNESS_PARITY_THRESHOLD).toBeLessThan(1);
      expect(FAIRNESS_PARITY_THRESHOLD).toBe(0.05); // 5% as specified
    });
  });
});
