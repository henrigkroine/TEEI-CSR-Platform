import { describe, it, expect } from 'vitest';
import { calculateSROI, calculateSimpleSROI } from '../sroi/calculator.js';
import { DEFAULT_SROI_CONFIG, getSROIConfig } from '../sroi/config.js';

describe('SROI Calculator', () => {
  describe('calculateSROI', () => {
    it('should calculate SROI correctly with default parameters', () => {
      const result = calculateSROI({
        programCost: 100000,
        participantsWithOutcome: 20,
        avgWageLift: 15000,
      });

      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('totalBenefit');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('npvBenefit');
      expect(result).toHaveProperty('config');
      expect(result.totalCost).toBe(100000);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('should calculate SROI with custom parameters', () => {
      const result = calculateSROI({
        programCost: 50000,
        participantsWithOutcome: 10,
        avgWageLift: 20000,
        yearsOfBenefit: 5,
        employmentMultiplier: 2.0,
        discountRate: 0.05,
      });

      expect(result.config.yearsOfBenefit).toBe(5);
      expect(result.config.employmentMultiplier).toBe(2.0);
      expect(result.config.discountRate).toBe(0.05);
      expect(result.ratio).toBeGreaterThan(0);
    });

    it('should apply discount rate correctly', () => {
      const result1 = calculateSROI({
        programCost: 100000,
        participantsWithOutcome: 20,
        avgWageLift: 15000,
        discountRate: 0,
      });

      const result2 = calculateSROI({
        programCost: 100000,
        participantsWithOutcome: 20,
        avgWageLift: 15000,
        discountRate: 0.1,
      });

      // Higher discount rate should result in lower NPV and SROI
      expect(result2.npvBenefit).toBeLessThan(result1.npvBenefit);
      expect(result2.ratio).toBeLessThan(result1.ratio);
    });

    it('should handle zero participants gracefully', () => {
      const result = calculateSROI({
        programCost: 100000,
        participantsWithOutcome: 0,
        avgWageLift: 15000,
      });

      expect(result.npvBenefit).toBe(0);
      expect(result.totalBenefit).toBe(0);
      expect(result.ratio).toBe(-1); // (0 - 100000) / 100000 = -1
    });

    it('should throw error for invalid program cost', () => {
      expect(() => {
        calculateSROI({
          programCost: 0,
          participantsWithOutcome: 20,
          avgWageLift: 15000,
        });
      }).toThrow('Program cost must be greater than 0');

      expect(() => {
        calculateSROI({
          programCost: -1000,
          participantsWithOutcome: 20,
          avgWageLift: 15000,
        });
      }).toThrow('Program cost must be greater than 0');
    });

    it('should throw error for negative participants', () => {
      expect(() => {
        calculateSROI({
          programCost: 100000,
          participantsWithOutcome: -5,
          avgWageLift: 15000,
        });
      }).toThrow('Participants with outcome cannot be negative');
    });

    it('should throw error for invalid discount rate', () => {
      expect(() => {
        calculateSROI({
          programCost: 100000,
          participantsWithOutcome: 20,
          avgWageLift: 15000,
          discountRate: -0.1,
        });
      }).toThrow('Discount rate must be between 0 and 1');

      expect(() => {
        calculateSROI({
          programCost: 100000,
          participantsWithOutcome: 20,
          avgWageLift: 15000,
          discountRate: 1.5,
        });
      }).toThrow('Discount rate must be between 0 and 1');
    });
  });

  describe('calculateSimpleSROI', () => {
    it('should calculate simple SROI ratio correctly', () => {
      const ratio = calculateSimpleSROI(100000, 500000);
      // (500000 - 100000) / 100000 = 4.0
      expect(ratio).toBe(4.0);
    });

    it('should handle break-even scenario', () => {
      const ratio = calculateSimpleSROI(100000, 100000);
      // (100000 - 100000) / 100000 = 0
      expect(ratio).toBe(0);
    });

    it('should handle negative SROI', () => {
      const ratio = calculateSimpleSROI(100000, 50000);
      // (50000 - 100000) / 100000 = -0.5
      expect(ratio).toBe(-0.5);
    });

    it('should throw error for zero program cost', () => {
      expect(() => {
        calculateSimpleSROI(0, 100000);
      }).toThrow('Program cost must be greater than 0');
    });
  });

  describe('SROI Config', () => {
    it('should return default config when no region specified', () => {
      const config = getSROIConfig();
      expect(config).toEqual(DEFAULT_SROI_CONFIG);
    });

    it('should return default config for unknown region', () => {
      const config = getSROIConfig('unknown-region');
      expect(config).toEqual(DEFAULT_SROI_CONFIG);
    });

    it('should return regional config for us-west', () => {
      const config = getSROIConfig('us-west');
      expect(config.defaultAvgWageLift).toBe(22000);
      expect(config.defaultYearsOfBenefit).toBe(DEFAULT_SROI_CONFIG.defaultYearsOfBenefit);
    });

    it('should return regional config for canada', () => {
      const config = getSROIConfig('canada');
      expect(config.defaultAvgWageLift).toBe(20000);
    });
  });
});
