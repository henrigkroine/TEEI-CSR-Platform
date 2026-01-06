import { describe, it, expect } from 'vitest';
import {
  calculateIntegrationScore,
  cefrToComfortScore,
  calculateSocialBelonging,
  calculateJobAccess,
} from '../integration/score.js';

describe('Integration Score Calculator', () => {
  describe('calculateIntegrationScore', () => {
    it('should calculate integration score correctly with default weights', () => {
      const result = calculateIntegrationScore({
        languageComfort: 0.5,
        socialBelonging: 0.6,
        jobAccess: 0.4,
      });

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('level');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate integration score with custom weights', () => {
      const result = calculateIntegrationScore({
        languageComfort: 0.5,
        socialBelonging: 0.6,
        jobAccess: 0.4,
        languageWeight: 0.5,
        socialWeight: 0.3,
        jobWeight: 0.2,
      });

      expect(result.weights.language).toBe(0.5);
      expect(result.weights.social).toBe(0.3);
      expect(result.weights.jobAccess).toBe(0.2);
    });

    it('should classify low integration correctly', () => {
      const result = calculateIntegrationScore({
        languageComfort: 0.2,
        socialBelonging: 0.2,
        jobAccess: 0.1,
      });

      expect(result.level).toBe('low');
      expect(result.score).toBeLessThan(34);
    });

    it('should classify medium integration correctly', () => {
      const result = calculateIntegrationScore({
        languageComfort: 0.5,
        socialBelonging: 0.5,
        jobAccess: 0.5,
      });

      expect(result.level).toBe('medium');
      expect(result.score).toBeGreaterThanOrEqual(34);
      expect(result.score).toBeLessThan(67);
    });

    it('should classify high integration correctly', () => {
      const result = calculateIntegrationScore({
        languageComfort: 0.9,
        socialBelonging: 0.8,
        jobAccess: 0.85,
      });

      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(67);
    });

    it('should handle perfect integration score', () => {
      const result = calculateIntegrationScore({
        languageComfort: 1.0,
        socialBelonging: 1.0,
        jobAccess: 1.0,
      });

      expect(result.score).toBe(100);
      expect(result.level).toBe('high');
    });

    it('should throw error for invalid language comfort', () => {
      expect(() => {
        calculateIntegrationScore({
          languageComfort: 1.5,
          socialBelonging: 0.6,
          jobAccess: 0.4,
        });
      }).toThrow('Language comfort must be between 0 and 1');
    });

    it('should throw error for invalid weights', () => {
      expect(() => {
        calculateIntegrationScore({
          languageComfort: 0.5,
          socialBelonging: 0.6,
          jobAccess: 0.4,
          languageWeight: 0.5,
          socialWeight: 0.5,
          jobWeight: 0.5,
        });
      }).toThrow('Weights must sum to 1.0');
    });
  });

  describe('cefrToComfortScore', () => {
    it('should map A1 to 0.17', () => {
      expect(cefrToComfortScore('A1')).toBe(0.17);
    });

    it('should map A2 to 0.33', () => {
      expect(cefrToComfortScore('A2')).toBe(0.33);
    });

    it('should map B1 to 0.50', () => {
      expect(cefrToComfortScore('B1')).toBe(0.50);
    });

    it('should map B2 to 0.67', () => {
      expect(cefrToComfortScore('B2')).toBe(0.67);
    });

    it('should map C1 to 0.83', () => {
      expect(cefrToComfortScore('C1')).toBe(0.83);
    });

    it('should map C2 to 1.0', () => {
      expect(cefrToComfortScore('C2')).toBe(1.0);
    });

    it('should be case insensitive', () => {
      expect(cefrToComfortScore('b1')).toBe(0.50);
      expect(cefrToComfortScore('C2')).toBe(1.0);
    });

    it('should return 0 for null or undefined', () => {
      expect(cefrToComfortScore(null)).toBe(0);
      expect(cefrToComfortScore(undefined)).toBe(0);
    });

    it('should return 0 for unknown level', () => {
      expect(cefrToComfortScore('D1')).toBe(0);
      expect(cefrToComfortScore('')).toBe(0);
    });
  });

  describe('calculateSocialBelonging', () => {
    it('should calculate social belonging with all components', () => {
      const score = calculateSocialBelonging(2, 10, 15);
      // matchScore: 0.4 (has matches)
      // eventScore: 0.3 (10/5 capped at 1.0 * 0.3)
      // checkinScore: 0.3 (15/10 capped at 1.0 * 0.3)
      expect(score).toBe(1.0);
    });

    it('should handle no engagement', () => {
      const score = calculateSocialBelonging(0, 0, 0);
      expect(score).toBe(0);
    });

    it('should give partial score for only matches', () => {
      const score = calculateSocialBelonging(1, 0, 0);
      expect(score).toBe(0.4); // Match score only
    });

    it('should cap event score at 0.3', () => {
      const score = calculateSocialBelonging(1, 20, 0);
      // matchScore: 0.4
      // eventScore: 0.3 (20/5 = 4, capped at 1.0 * 0.3)
      expect(score).toBe(0.7);
    });

    it('should calculate proportional scores', () => {
      const score = calculateSocialBelonging(1, 2, 5);
      // matchScore: 0.4
      // eventScore: 0.12 (2/5 = 0.4 * 0.3)
      // checkinScore: 0.15 (5/10 = 0.5 * 0.3)
      expect(score).toBeCloseTo(0.67, 2);
    });
  });

  describe('calculateJobAccess', () => {
    it('should return 1.0 for employed', () => {
      const score = calculateJobAccess(true, 0, 0);
      expect(score).toBe(1.0);
    });

    it('should return 1.0 for employed regardless of courses', () => {
      const score = calculateJobAccess(true, 5, 3);
      expect(score).toBe(1.0);
    });

    it('should calculate score from completed courses', () => {
      const score = calculateJobAccess(false, 3, 0);
      // 3 * 0.15 = 0.45
      expect(score).toBe(0.45);
    });

    it('should calculate score from in-progress courses', () => {
      const score = calculateJobAccess(false, 0, 2);
      // 2 * 0.1 = 0.2
      expect(score).toBe(0.2);
    });

    it('should combine completed and in-progress courses', () => {
      const score = calculateJobAccess(false, 2, 2);
      // 2 * 0.15 + 2 * 0.1 = 0.3 + 0.2 = 0.5
      expect(score).toBe(0.5);
    });

    it('should cap completed courses score at 0.6', () => {
      const score = calculateJobAccess(false, 10, 0);
      // 10 * 0.15 = 1.5, capped at 0.6
      expect(score).toBe(0.6);
    });

    it('should cap in-progress courses score at 0.4', () => {
      const score = calculateJobAccess(false, 0, 10);
      // 10 * 0.1 = 1.0, capped at 0.4
      expect(score).toBe(0.4);
    });

    it('should cap total score at 1.0', () => {
      const score = calculateJobAccess(false, 10, 10);
      // Completed: 0.6, In-progress: 0.4 = 1.0
      expect(score).toBe(1.0);
    });

    it('should return 0 for no employment or training', () => {
      const score = calculateJobAccess(false, 0, 0);
      expect(score).toBe(0);
    });
  });
});
