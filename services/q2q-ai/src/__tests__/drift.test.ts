import { describe, it, expect } from 'vitest';
import {
  calculatePSI,
  calculateJSDivergence,
  checkDrift,
  formatDriftReport,
  type Distribution
} from '../eval/drift.js';

describe('Drift Monitoring', () => {
  describe('calculatePSI', () => {
    it('should return 0 for identical distributions', () => {
      const baseline: Distribution = { a: 0.5, b: 0.5 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeLessThan(0.01); // Should be very close to 0
    });

    it('should detect significant drift', () => {
      const baseline: Distribution = { a: 0.9, b: 0.1 };
      const current: Distribution = { a: 0.1, b: 0.9 };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeGreaterThan(0.2); // Significant drift threshold
    });

    it('should detect moderate drift', () => {
      const baseline: Distribution = { a: 0.7, b: 0.3 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeGreaterThan(0.05);
      expect(psi).toBeLessThan(0.3);
    });

    it('should handle distributions with different keys', () => {
      const baseline: Distribution = { a: 0.8, b: 0.2 };
      const current: Distribution = { a: 0.6, b: 0.3, c: 0.1 };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeGreaterThan(0);
    });

    it('should handle empty distributions gracefully', () => {
      const baseline: Distribution = {};
      const current: Distribution = { a: 1.0 };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeGreaterThanOrEqual(0);
    });

    it('should calculate PSI for multi-class distribution', () => {
      const baseline: Distribution = {
        class1: 0.25,
        class2: 0.25,
        class3: 0.25,
        class4: 0.25
      };
      const current: Distribution = {
        class1: 0.4,
        class2: 0.3,
        class3: 0.2,
        class4: 0.1
      };

      const psi = calculatePSI(baseline, current);
      expect(psi).toBeGreaterThan(0);
      expect(psi).toBeLessThan(0.5);
    });
  });

  describe('calculateJSDivergence', () => {
    it('should return 0 for identical distributions', () => {
      const baseline: Distribution = { a: 0.5, b: 0.5 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const js = calculateJSDivergence(baseline, current);
      expect(js).toBeLessThan(0.01); // Should be very close to 0
    });

    it('should detect significant drift', () => {
      const baseline: Distribution = { a: 0.95, b: 0.05 };
      const current: Distribution = { a: 0.05, b: 0.95 };

      const js = calculateJSDivergence(baseline, current);
      expect(js).toBeGreaterThan(0.1); // Significant drift threshold
    });

    it('should detect moderate drift', () => {
      const baseline: Distribution = { a: 0.7, b: 0.3 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const js = calculateJSDivergence(baseline, current);
      expect(js).toBeGreaterThan(0);
      expect(js).toBeLessThan(0.3);
    });

    it('should be symmetric', () => {
      const baseline: Distribution = { a: 0.6, b: 0.4 };
      const current: Distribution = { a: 0.4, b: 0.6 };

      const js1 = calculateJSDivergence(baseline, current);
      const js2 = calculateJSDivergence(current, baseline);

      expect(Math.abs(js1 - js2)).toBeLessThan(0.001); // Should be nearly equal
    });

    it('should handle distributions with different keys', () => {
      const baseline: Distribution = { a: 0.8, b: 0.2 };
      const current: Distribution = { a: 0.6, b: 0.3, c: 0.1 };

      const js = calculateJSDivergence(baseline, current);
      expect(js).toBeGreaterThan(0);
    });

    it('should calculate JS for multi-class distribution', () => {
      const baseline: Distribution = {
        class1: 0.25,
        class2: 0.25,
        class3: 0.25,
        class4: 0.25
      };
      const current: Distribution = {
        class1: 0.4,
        class2: 0.3,
        class3: 0.2,
        class4: 0.1
      };

      const js = calculateJSDivergence(baseline, current);
      expect(js).toBeGreaterThan(0);
      expect(js).toBeLessThan(1);
    });
  });

  describe('checkDrift', () => {
    it('should not trigger alert for identical distributions', () => {
      const baseline: Distribution = { positive: 0.5, negative: 0.5 };
      const current: Distribution = { positive: 0.5, negative: 0.5 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      expect(result.alertTriggered).toBe(false);
      expect(result.psiScore).toBeLessThan(0.1);
      expect(result.jsScore).toBeLessThan(0.05);
    });

    it('should trigger alert for significant drift (PSI)', () => {
      const baseline: Distribution = { positive: 0.9, negative: 0.1 };
      const current: Distribution = { positive: 0.1, negative: 0.9 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      expect(result.alertTriggered).toBe(true);
      expect(result.psiScore).toBeGreaterThan(0.2);
    });

    it('should trigger alert for significant drift (JS)', () => {
      const baseline: Distribution = { positive: 0.95, negative: 0.05 };
      const current: Distribution = { positive: 0.05, negative: 0.95 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      expect(result.alertTriggered).toBe(true);
      expect(result.jsScore).toBeGreaterThan(0.1);
    });

    it('should not trigger alert for small drift', () => {
      const baseline: Distribution = { positive: 0.55, negative: 0.45 };
      const current: Distribution = { positive: 0.52, negative: 0.48 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      expect(result.alertTriggered).toBe(false);
    });

    it('should normalize distributions', () => {
      const baseline: Distribution = { positive: 90, negative: 10 }; // Not normalized
      const current: Distribution = { positive: 10, negative: 90 }; // Not normalized

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      // Should normalize to proportions
      expect(result.baselineDistribution.positive).toBeCloseTo(0.9);
      expect(result.currentDistribution.positive).toBeCloseTo(0.1);
    });

    it('should calculate sample size', () => {
      const baseline: Distribution = { positive: 50, negative: 50 };
      const current: Distribution = { positive: 70, negative: 30 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);

      expect(result.sampleSize).toBe(100);
    });

    it('should respect custom thresholds', () => {
      const baseline: Distribution = { positive: 0.7, negative: 0.3 };
      const current: Distribution = { positive: 0.6, negative: 0.4 };

      // Strict thresholds
      const strictResult = checkDrift('confidence_increase', 'en', baseline, current, 0.05, 0.02);
      expect(strictResult.alertTriggered).toBe(true);

      // Lenient thresholds
      const lenientResult = checkDrift('confidence_increase', 'en', baseline, current, 0.5, 0.5);
      expect(lenientResult.alertTriggered).toBe(false);
    });

    it('should include label and language in result', () => {
      const baseline: Distribution = { positive: 0.5, negative: 0.5 };
      const current: Distribution = { positive: 0.5, negative: 0.5 };

      const result = checkDrift('belonging_increase', 'uk', baseline, current);

      expect(result.label).toBe('belonging_increase');
      expect(result.language).toBe('uk');
    });

    it('should handle real-world scenario: gradual drift', () => {
      const baseline: Distribution = { low: 0.2, medium: 0.5, high: 0.3 };
      const current: Distribution = { low: 0.3, medium: 0.5, high: 0.2 };

      const result = checkDrift('language_comfort', 'no', baseline, current);

      expect(result.psiScore).toBeGreaterThan(0);
      expect(result.jsScore).toBeGreaterThan(0);
      // Might or might not trigger depending on magnitude
    });
  });

  describe('formatDriftReport', () => {
    it('should format drift report with all required fields', () => {
      const result = checkDrift(
        'confidence_increase',
        'en',
        { positive: 0.7, negative: 0.3 },
        { positive: 0.5, negative: 0.5 }
      );

      const report = formatDriftReport(result);

      expect(report).toContain('Drift Check Report');
      expect(report).toContain('confidence_increase');
      expect(report).toContain('en');
      expect(report).toContain('PSI Score');
      expect(report).toContain('JS Score');
      expect(report).toContain('Alert Triggered');
      expect(report).toContain('Baseline Distribution');
      expect(report).toContain('Current Distribution');
    });

    it('should show alert status', () => {
      const baseline: Distribution = { positive: 0.9, negative: 0.1 };
      const current: Distribution = { positive: 0.1, negative: 0.9 };

      const result = checkDrift('confidence_increase', 'en', baseline, current);
      const report = formatDriftReport(result);

      if (result.alertTriggered) {
        expect(report).toContain('YES');
      } else {
        expect(report).toContain('NO');
      }
    });

    it('should format percentages correctly', () => {
      const result = checkDrift(
        'confidence_increase',
        'en',
        { positive: 0.7, negative: 0.3 },
        { positive: 0.5, negative: 0.5 }
      );

      const report = formatDriftReport(result);

      expect(report).toMatch(/\d+\.\d{2}%/); // Should have percentages with 2 decimal places
    });

    it('should include both distributions', () => {
      const result = checkDrift(
        'confidence_increase',
        'en',
        { positive: 0.7, negative: 0.3 },
        { positive: 0.5, negative: 0.5 }
      );

      const report = formatDriftReport(result);

      expect(report).toContain('positive');
      expect(report).toContain('negative');
      expect(report).toContain('70.00%'); // Baseline positive
      expect(report).toContain('50.00%'); // Current positive
    });
  });

  describe('Edge cases and robustness', () => {
    it('should handle single-class distribution', () => {
      const baseline: Distribution = { only: 1.0 };
      const current: Distribution = { only: 1.0 };

      const result = checkDrift('test', 'en', baseline, current);
      expect(result.alertTriggered).toBe(false);
    });

    it('should handle zero probabilities', () => {
      const baseline: Distribution = { a: 1.0, b: 0 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const result = checkDrift('test', 'en', baseline, current);
      expect(result.psiScore).toBeGreaterThan(0);
      expect(result.jsScore).toBeGreaterThan(0);
    });

    it('should handle new categories appearing', () => {
      const baseline: Distribution = { a: 0.5, b: 0.5 };
      const current: Distribution = { a: 0.4, b: 0.4, c: 0.2 };

      const result = checkDrift('test', 'en', baseline, current);
      expect(result.alertTriggered).toBe(true); // New category is significant drift
    });

    it('should handle categories disappearing', () => {
      const baseline: Distribution = { a: 0.4, b: 0.4, c: 0.2 };
      const current: Distribution = { a: 0.5, b: 0.5 };

      const result = checkDrift('test', 'en', baseline, current);
      expect(result.alertTriggered).toBe(true); // Missing category is significant drift
    });
  });
});
