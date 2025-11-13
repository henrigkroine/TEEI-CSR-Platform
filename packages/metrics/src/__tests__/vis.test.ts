import { describe, it, expect } from 'vitest';
import { calculateVIS, calculateVISTrend } from '../vis/calculator.js';

describe('VIS Calculator', () => {
  describe('calculateVIS', () => {
    it('should calculate VIS correctly with default weights', () => {
      const result = calculateVIS({
        totalHours: 500,
        avgQualityScore: 0.8,
        outcomeLift: 0.65,
        placementRate: 0.40,
      });

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('weights');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate VIS with custom weights', () => {
      const result = calculateVIS({
        totalHours: 500,
        avgQualityScore: 0.8,
        outcomeLift: 0.65,
        placementRate: 0.40,
        hoursWeight: 0.4,
        qualityWeight: 0.3,
        outcomeWeight: 0.2,
        placementWeight: 0.1,
      });

      expect(result.weights.hours).toBe(0.4);
      expect(result.weights.quality).toBe(0.3);
      expect(result.weights.outcome).toBe(0.2);
      expect(result.weights.placement).toBe(0.1);
    });

    it('should normalize hours component correctly', () => {
      const result1 = calculateVIS({
        totalHours: 100,
        avgQualityScore: 1.0,
        outcomeLift: 1.0,
        placementRate: 1.0,
      });

      const result2 = calculateVIS({
        totalHours: 500,
        avgQualityScore: 1.0,
        outcomeLift: 1.0,
        placementRate: 1.0,
      });

      // More hours should result in higher score
      expect(result2.components.hours).toBeGreaterThan(result1.components.hours);
    });

    it('should cap hours at 100 points', () => {
      const result = calculateVIS({
        totalHours: 2000, // Double the max threshold
        avgQualityScore: 1.0,
        outcomeLift: 1.0,
        placementRate: 1.0,
      });

      expect(result.components.hours).toBe(100);
    });

    it('should convert quality score to 0-100 scale', () => {
      const result = calculateVIS({
        totalHours: 500,
        avgQualityScore: 0.75,
        outcomeLift: 0.5,
        placementRate: 0.5,
      });

      expect(result.components.quality).toBe(75);
    });

    it('should handle zero hours gracefully', () => {
      const result = calculateVIS({
        totalHours: 0,
        avgQualityScore: 0.8,
        outcomeLift: 0.65,
        placementRate: 0.40,
      });

      expect(result.components.hours).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle perfect scores', () => {
      const result = calculateVIS({
        totalHours: 1000,
        avgQualityScore: 1.0,
        outcomeLift: 1.0,
        placementRate: 1.0,
      });

      expect(result.score).toBe(100);
      expect(result.components.hours).toBe(100);
      expect(result.components.quality).toBe(100);
      expect(result.components.outcome).toBe(100);
      expect(result.components.placement).toBe(100);
    });

    it('should throw error for negative hours', () => {
      expect(() => {
        calculateVIS({
          totalHours: -100,
          avgQualityScore: 0.8,
          outcomeLift: 0.65,
          placementRate: 0.40,
        });
      }).toThrow('Total hours cannot be negative');
    });

    it('should throw error for invalid quality score', () => {
      expect(() => {
        calculateVIS({
          totalHours: 500,
          avgQualityScore: 1.5,
          outcomeLift: 0.65,
          placementRate: 0.40,
        });
      }).toThrow('Average quality score must be between 0 and 1');

      expect(() => {
        calculateVIS({
          totalHours: 500,
          avgQualityScore: -0.1,
          outcomeLift: 0.65,
          placementRate: 0.40,
        });
      }).toThrow('Average quality score must be between 0 and 1');
    });

    it('should throw error for invalid weights', () => {
      expect(() => {
        calculateVIS({
          totalHours: 500,
          avgQualityScore: 0.8,
          outcomeLift: 0.65,
          placementRate: 0.40,
          hoursWeight: 0.5,
          qualityWeight: 0.5,
          outcomeWeight: 0.5,
          placementWeight: 0.5,
        });
      }).toThrow('Weights must sum to 1.0');
    });
  });

  describe('calculateVISTrend', () => {
    it('should calculate positive trend correctly', () => {
      const current = {
        score: 80,
        components: { hours: 80, quality: 80, outcome: 80, placement: 80 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const previous = {
        score: 60,
        components: { hours: 60, quality: 60, outcome: 60, placement: 60 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const trend = calculateVISTrend(current, previous);
      // (80 - 60) / 60 * 100 = 33.33%
      expect(trend).toBeCloseTo(33.33, 1);
    });

    it('should calculate negative trend correctly', () => {
      const current = {
        score: 50,
        components: { hours: 50, quality: 50, outcome: 50, placement: 50 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const previous = {
        score: 75,
        components: { hours: 75, quality: 75, outcome: 75, placement: 75 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const trend = calculateVISTrend(current, previous);
      // (50 - 75) / 75 * 100 = -33.33%
      expect(trend).toBeCloseTo(-33.33, 1);
    });

    it('should handle zero previous score', () => {
      const current = {
        score: 80,
        components: { hours: 80, quality: 80, outcome: 80, placement: 80 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const previous = {
        score: 0,
        components: { hours: 0, quality: 0, outcome: 0, placement: 0 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const trend = calculateVISTrend(current, previous);
      expect(trend).toBe(100); // 100% increase from zero
    });

    it('should handle no change', () => {
      const current = {
        score: 70,
        components: { hours: 70, quality: 70, outcome: 70, placement: 70 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const previous = {
        score: 70,
        components: { hours: 70, quality: 70, outcome: 70, placement: 70 },
        weights: { hours: 0.3, quality: 0.3, outcome: 0.25, placement: 0.15 },
      };

      const trend = calculateVISTrend(current, previous);
      expect(trend).toBe(0);
    });
  });
});
