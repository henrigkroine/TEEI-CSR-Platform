/**
 * Scenario Engine Tests
 *
 * Tests for deterministic scenario calculations
 * REQUIREMENT: Same inputs MUST produce same outputs
 */

import { describe, it, expect } from 'vitest';
import { runScenarioEngine, validateScenarioParameters } from '../lib/scenario-engine.js';
import type { BaselineMetrics, ScenarioParameters } from '@teei/shared-types';

// Baseline test data
const BASE_METRICS: BaselineMetrics = {
  sroi: 3.5,
  vis: 75.0,
  socialValue: 5250.0,
  investment: 1500.0,
  sdgCoverage: [
    { goalId: 4, coverage: 65.0 },
    { goalId: 8, coverage: 55.0 },
    { goalId: 10, coverage: 45.0 },
    { goalId: 17, coverage: 40.0 },
  ],
  activityCounts: {
    matches: 15,
    events: 24,
    skillShares: 9,
    feedback: 30,
    milestones: 6,
    checkins: 36,
  },
  programAllocations: {
    buddySystem: 40,
    skillShare: 30,
    mentorship: 20,
    communityEvents: 10,
  },
  period: {
    start: '2025-01-01',
    end: '2025-03-31',
  },
};

describe('Scenario Engine - Determinism', () => {
  it('should produce identical results for the same inputs', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
      investmentMultiplier: 1.2,
    };

    const result1 = runScenarioEngine('test-scenario-1', BASE_METRICS, params);
    const result2 = runScenarioEngine('test-scenario-1', BASE_METRICS, params);

    // Core metrics must be identical
    expect(result1.projected.sroi).toBe(result2.projected.sroi);
    expect(result1.projected.vis).toBe(result2.projected.vis);
    expect(result1.projected.socialValue).toBe(result2.projected.socialValue);
    expect(result1.projected.investment).toBe(result2.projected.investment);

    // Activity counts must be identical
    expect(result1.projected.activityCounts).toEqual(result2.projected.activityCounts);

    // Confidence must be identical
    expect(result1.confidence).toBe(result2.confidence);
  });

  it('should run in <800ms for p95 performance requirement', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
      programMix: {
        buddySystem: 50,
        skillShare: 30,
        mentorship: 15,
        communityEvents: 5,
      },
    };

    const startTime = Date.now();
    runScenarioEngine('perf-test', BASE_METRICS, params);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(800);
  });
});

describe('Scenario Engine - Cohort Size Multiplier', () => {
  it('should correctly scale activity counts with 1.5x multiplier', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
    };

    const result = runScenarioEngine('scale-test', BASE_METRICS, params);

    // Activity counts should scale by 1.5x (rounded)
    expect(result.projected.activityCounts.matches).toBe(Math.round(15 * 1.5)); // 23
    expect(result.projected.activityCounts.events).toBe(Math.round(24 * 1.5)); // 36
    expect(result.projected.activityCounts.skillShares).toBe(Math.round(9 * 1.5)); // 14
  });

  it('should correctly scale activity counts with 0.5x multiplier', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 0.5,
    };

    const result = runScenarioEngine('scale-down-test', BASE_METRICS, params);

    // Activity counts should scale down
    expect(result.projected.activityCounts.matches).toBe(Math.round(15 * 0.5)); // 8
    expect(result.projected.activityCounts.events).toBe(Math.round(24 * 0.5)); // 12
  });

  it('should increase VIS proportionally to activity increases', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 2.0,
    };

    const result = runScenarioEngine('vis-scale-test', BASE_METRICS, params);

    // VIS should roughly double (may not be exact due to rounding)
    expect(result.projected.vis).toBeGreaterThan(BASE_METRICS.vis * 1.8);
    expect(result.projected.vis).toBeLessThan(BASE_METRICS.vis * 2.2);
  });
});

describe('Scenario Engine - Investment Changes', () => {
  it('should correctly apply investment multiplier', () => {
    const params: ScenarioParameters = {
      investmentMultiplier: 1.5,
    };

    const result = runScenarioEngine('investment-test', BASE_METRICS, params);

    expect(result.projected.investment).toBe(BASE_METRICS.investment * 1.5);
    expect(result.projected.investmentDelta).toBe(BASE_METRICS.investment * 0.5);
    expect(result.projected.investmentPercentChange).toBe(50.0);
  });

  it('should correctly apply grant amount delta', () => {
    const params: ScenarioParameters = {
      grantAmountDelta: 1000,
    };

    const result = runScenarioEngine('grant-test', BASE_METRICS, params);

    expect(result.projected.investment).toBe(BASE_METRICS.investment + 1000);
    expect(result.projected.investmentDelta).toBe(1000);
  });

  it('should combine investment multiplier and grant delta', () => {
    const params: ScenarioParameters = {
      investmentMultiplier: 1.2,
      grantAmountDelta: 500,
    };

    const result = runScenarioEngine('combined-investment-test', BASE_METRICS, params);

    const expectedInvestment = BASE_METRICS.investment * 1.2 + 500;
    expect(result.projected.investment).toBe(expectedInvestment);
  });
});

describe('Scenario Engine - SROI Calculation', () => {
  it('should recalculate SROI after changes', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 2.0,
      investmentMultiplier: 1.5,
    };

    const result = runScenarioEngine('sroi-test', BASE_METRICS, params);

    // SROI = social value / investment
    // Social value should ~double, investment should increase by 1.5x
    // So SROI should increase
    expect(result.projected.sroi).toBeGreaterThan(BASE_METRICS.sroi);
    expect(result.projected.sroiDelta).toBeGreaterThan(0);
  });

  it('should handle improved efficiency (same investment, more impact)', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
      investmentMultiplier: 1.0,
    };

    const result = runScenarioEngine('efficiency-test', BASE_METRICS, params);

    // SROI should improve significantly
    expect(result.projected.sroiPercentChange).toBeGreaterThan(40);
  });
});

describe('Scenario Engine - Program Mix', () => {
  it('should accept valid program mix summing to 100', () => {
    const params: ScenarioParameters = {
      programMix: {
        buddySystem: 50,
        skillShare: 30,
        mentorship: 15,
        communityEvents: 5,
      },
    };

    const result = runScenarioEngine('program-mix-test', BASE_METRICS, params);

    expect(result.warnings).toBeUndefined();
  });

  it('should warn about invalid program mix', () => {
    const params: ScenarioParameters = {
      programMix: {
        buddySystem: 60,
        skillShare: 30,
        mentorship: 20,
        communityEvents: 10,
      },
    };

    const result = runScenarioEngine('program-mix-invalid-test', BASE_METRICS, params);

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
    expect(result.warnings?.[0]).toContain('120%');
  });

  it('should affect SDG coverage based on program mix', () => {
    const skillShareHeavy: ScenarioParameters = {
      programMix: {
        buddySystem: 20,
        skillShare: 60,
        mentorship: 15,
        communityEvents: 5,
      },
    };

    const result = runScenarioEngine('sdg-mix-test', BASE_METRICS, skillShareHeavy);

    // SDG 4 (Education) should increase with more skill share focus
    const sdg4 = result.projected.sdgCoverage.find((s) => s.goalId === 4);
    expect(sdg4?.delta).toBeGreaterThan(0);
  });
});

describe('Scenario Engine - Confidence Scoring', () => {
  it('should have high confidence for realistic parameters', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.2,
      investmentMultiplier: 1.1,
    };

    const result = runScenarioEngine('confidence-high-test', BASE_METRICS, params);

    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should reduce confidence for extreme cohort size changes', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 5.0,
    };

    const result = runScenarioEngine('confidence-low-test', BASE_METRICS, params);

    expect(result.confidence).toBeLessThan(0.8);
  });

  it('should warn about extreme multipliers', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 4.0,
    };

    const result = runScenarioEngine('extreme-test', BASE_METRICS, params);

    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some((w) => w.includes('200%'))).toBe(true);
  });
});

describe('Scenario Engine - Cohort Duration', () => {
  it('should extend duration and increase activity counts', () => {
    const params: ScenarioParameters = {
      cohortDurationMonths: 6, // Double from 3 months baseline
    };

    const result = runScenarioEngine('duration-test', BASE_METRICS, params);

    // Activity counts should roughly double
    expect(result.projected.activityCounts.matches).toBeGreaterThan(BASE_METRICS.activityCounts.matches * 1.8);
  });

  it('should shorten duration and reduce activity counts', () => {
    const params: ScenarioParameters = {
      cohortDurationMonths: 1, // Reduce from 3 months
    };

    const result = runScenarioEngine('duration-short-test', BASE_METRICS, params);

    // Activity counts should be reduced
    expect(result.projected.activityCounts.matches).toBeLessThan(BASE_METRICS.activityCounts.matches);
  });
});

describe('Parameter Validation', () => {
  it('should validate valid parameters', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
      investmentMultiplier: 1.2,
      programMix: {
        buddySystem: 40,
        skillShare: 30,
        mentorship: 20,
        communityEvents: 10,
      },
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should reject negative cohort multiplier', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: -1,
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should reject zero investment multiplier', () => {
    const params: ScenarioParameters = {
      investmentMultiplier: 0,
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(false);
  });

  it('should reject excessive multipliers', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 15,
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('10x'))).toBe(true);
  });

  it('should reject invalid cohort duration', () => {
    const params: ScenarioParameters = {
      cohortDurationMonths: 0,
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('at least 1 month'))).toBe(true);
  });

  it('should reject program mix with invalid percentages', () => {
    const params: ScenarioParameters = {
      programMix: {
        buddySystem: 150,
        skillShare: 30,
        mentorship: 20,
        communityEvents: 10,
      },
    };

    const validation = validateScenarioParameters(params);

    expect(validation.valid).toBe(false);
  });
});

describe('Scenario Engine - Edge Cases', () => {
  it('should handle empty parameters (no changes)', () => {
    const params: ScenarioParameters = {};

    const result = runScenarioEngine('no-change-test', BASE_METRICS, params);

    // No changes should result in baseline = projected
    expect(result.projected.sroi).toBe(BASE_METRICS.sroi);
    expect(result.projected.vis).toBe(BASE_METRICS.vis);
    expect(result.projected.sroiDelta).toBe(0);
    expect(result.projected.visDelta).toBe(0);
  });

  it('should handle multiple simultaneous changes', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.5,
      investmentMultiplier: 1.3,
      cohortDurationMonths: 6,
      programMix: {
        buddySystem: 50,
        skillShare: 30,
        mentorship: 15,
        communityEvents: 5,
      },
    };

    const result = runScenarioEngine('multi-change-test', BASE_METRICS, params);

    // Should complete without errors
    expect(result.projected.sroi).toBeGreaterThan(0);
    expect(result.calculationDurationMs).toBeLessThan(800);
  });

  it('should include calculation duration in metadata', () => {
    const params: ScenarioParameters = {
      cohortSizeMultiplier: 1.2,
    };

    const result = runScenarioEngine('metadata-test', BASE_METRICS, params);

    expect(result.calculationDurationMs).toBeGreaterThan(0);
    expect(result.calculatedAt).toBeDefined();
  });
});
