import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeScenario,
  type BaselineData,
  type ScenarioContext,
} from '../lib/scenario-engine';
import type { ScenarioParameters, SDGTarget } from '@teei/shared-types';

describe('Scenario Engine', () => {
  let baselineData: BaselineData;
  let scenarioId: string;

  beforeEach(() => {
    scenarioId = 'test-scenario-001';

    baselineData = {
      visScore: 45.5,
      totalVolunteerHours: 1200,
      totalParticipants: 150,
      activityBreakdown: {
        matches: 50,
        events: 120,
        skill_shares: 30,
        feedback: 75,
        milestones: 15,
        checkins: 200,
      },
      sroiRatio: 3.2,
      totalGrantAmount: 100000,
      totalSocialValue: 320000,
      sdgTargets: [
        { goal: 4, target: '4.4', description: 'Skills for employment' },
        { goal: 8, target: '8.5', description: 'Decent work and employment' },
        { goal: 10, target: '10.2', description: 'Social inclusion' },
      ],
      programMix: {
        buddy: 0.25,
        language: 0.25,
        mentorship: 0.25,
        upskilling: 0.25,
      },
    };
  });

  describe('Baseline Scenario', () => {
    it('should return baseline values when no parameters changed', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 1.0 },
          grantAmount: { adjustment: 1.0, currency: 'EUR' },
          cohortSize: { adjustment: 1.0 },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.scenarioId).toBe(scenarioId);
      expect(result.metrics.vis).toBeDefined();
      expect(result.metrics.vis?.baseline).toBe(45.5);
      expect(result.metrics.vis?.delta).toBeCloseTo(0, 1);
      expect(result.metrics.sroi).toBeDefined();
      expect(result.metadata.calculationDurationMs).toBeGreaterThan(0);
    });
  });

  describe('Volunteer Hours Impact', () => {
    it('should increase VIS when volunteer hours increase', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 1.5 }, // +50% hours
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.vis?.delta).toBeGreaterThan(0);
      expect(result.metrics.vis?.scenario).toBeGreaterThan(result.metrics.vis?.baseline || 0);
      expect(result.metrics.totalVolunteerHours?.scenario).toBe(1800); // 1200 * 1.5
    });

    it('should decrease VIS when volunteer hours decrease', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 0.7 }, // -30% hours
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.vis?.delta).toBeLessThan(0);
      expect(result.metrics.vis?.scenario).toBeLessThan(result.metrics.vis?.baseline || 0);
      expect(result.metrics.totalVolunteerHours?.scenario).toBe(840); // 1200 * 0.7
    });
  });

  describe('Grant Amount Impact', () => {
    it('should affect SROI when grant amount changes', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          grantAmount: { adjustment: 1.5, currency: 'EUR' }, // +50% funding
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.sroi?.baseline).toBe(3.2);
      expect(result.metrics.totalGrantAmount?.scenario).toBe(150000);
      // SROI should decrease when investment increases (assuming social value doesn't scale linearly)
      expect(result.metrics.sroi?.scenario).toBeLessThan(result.metrics.sroi?.baseline || 0);
    });
  });

  describe('Cohort Size Impact', () => {
    it('should increase metrics when cohort size increases', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          cohortSize: { adjustment: 2.0 }, // Double participants
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.totalParticipants?.scenario).toBe(300); // 150 * 2
      expect(result.metrics.vis?.delta).toBeGreaterThan(0);
      expect(result.metrics.sroi?.delta).toBeGreaterThan(0);
    });
  });

  describe('Program Mix Impact', () => {
    it('should affect VIS based on program weights', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          programMix: {
            buddy: 0.1,
            language: 0.1,
            mentorship: 0.7, // Focus on mentorship (1.1x weight)
            upskilling: 0.1,
          },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.vis).toBeDefined();
      // Mentorship has higher VIS potential (1.1x vs 1.0x for buddy)
      expect(result.metrics.vis?.delta).toBeGreaterThan(0);
    });

    it('should affect SROI based on program value multipliers', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          programMix: {
            buddy: 0.1,
            language: 0.1,
            mentorship: 0.1,
            upskilling: 0.7, // Focus on upskilling (1.2x value multiplier)
          },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.sroi).toBeDefined();
      // Upskilling has highest social value per participant
      expect(result.metrics.sroi?.delta).toBeGreaterThan(0);
    });
  });

  describe('SDG Coverage Impact', () => {
    it('should maintain SDG coverage with same program mix', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 1.2 },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.sdgCoverage?.baseline.length).toBe(3);
      expect(result.sdgCoverage?.scenario.length).toBe(3);
      expect(result.sdgCoverage?.newTargets.length).toBe(0);
      expect(result.sdgCoverage?.lostTargets.length).toBe(0);
    });

    it('should add new SDG targets when program mix changes', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          programMix: {
            buddy: 0.05,
            language: 0.85, // Focus on language (adds SDG 4.4)
            mentorship: 0.05,
            upskilling: 0.05,
          },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.sdgCoverage).toBeDefined();
      expect(result.sdgCoverage?.scenario.length).toBeGreaterThanOrEqual(result.sdgCoverage?.baseline.length || 0);
    });
  });

  describe('Performance', () => {
    it('should execute within performance budget (<800ms)', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 1.5 },
          grantAmount: { adjustment: 1.2, currency: 'EUR' },
          cohortSize: { adjustment: 1.3 },
          programMix: { buddy: 0.3, language: 0.3, mentorship: 0.2, upskilling: 0.2 },
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metadata.calculationDurationMs).toBeLessThan(800);
    });
  });

  describe('Delta Calculations', () => {
    it('should calculate correct delta percentages', async () => {
      const context: ScenarioContext = {
        companyId: 'test-company',
        period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        baseline: baselineData,
        parameters: {
          volunteerHours: { adjustment: 1.5 }, // +50%
        },
      };

      const result = await executeScenario(context, scenarioId);

      expect(result.metrics.totalVolunteerHours?.deltaPercent).toBeCloseTo(50, 0);
      expect(result.metrics.vis?.deltaPercent).toBeGreaterThan(0);
    });
  });
});
