/**
 * Agent 25: config-resolver-tester
 * Unit tests for configuration resolution and validation
 */

import { describe, it, expect } from 'vitest';
import { deepMerge, resolveConfig, validateConfig } from '../lib/config-resolver.js';
import { z } from 'zod';

describe('Config Resolver', () => {
  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const base = { a: 1, b: 2 };
      const override = { b: 3, c: 4 };

      const result = deepMerge(base, override);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const base = {
        session: { duration: 60, frequency: 'weekly' },
        matching: { autoMatch: false },
      };

      const override = {
        session: { duration: 90 },
      };

      const result = deepMerge(base, override);

      expect(result).toEqual({
        session: { duration: 90, frequency: 'weekly' },
        matching: { autoMatch: false },
      });
    });

    it('should handle multiple overrides in order', () => {
      const base = { a: 1, b: 2, c: 3 };
      const override1 = { b: 20 };
      const override2 = { c: 30 };

      const result = deepMerge(base, override1, override2);

      expect(result).toEqual({ a: 1, b: 20, c: 30 });
    });

    it('should replace arrays instead of merging them', () => {
      const base = { topics: ['math', 'science'] };
      const override = { topics: ['history'] };

      const result = deepMerge(base, override);

      expect(result).toEqual({ topics: ['history'] });
    });

    it('should ignore undefined values', () => {
      const base = { a: 1, b: 2 };
      const override = { b: undefined, c: 3 };

      const result = deepMerge(base, override);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should handle deeply nested structures', () => {
      const base = {
        level1: {
          level2: {
            level3: {
              value: 'original',
            },
          },
        },
      };

      const override = {
        level1: {
          level2: {
            level3: {
              value: 'updated',
            },
          },
        },
      };

      const result = deepMerge(base, override);

      expect(result.level1.level2.level3.value).toBe('updated');
    });
  });

  describe('resolveConfig', () => {
    it('should resolve template → program → campaign config hierarchy', () => {
      const templateDefaults = {
        session: { duration: 60, frequency: 'weekly' },
        matching: { autoMatch: false },
        impact: { sroiWeights: { session: 10 } },
      };

      const programOverrides = {
        session: { duration: 90 },
      };

      const campaignOverrides = {
        matching: { autoMatch: true },
      };

      const { effective } = resolveConfig(
        templateDefaults,
        programOverrides,
        campaignOverrides
      );

      expect(effective).toEqual({
        session: { duration: 90, frequency: 'weekly' },
        matching: { autoMatch: true },
        impact: { sroiWeights: { session: 10 } },
      });
    });

    it('should track which keys were overridden', () => {
      const templateDefaults = {
        session: { duration: 60 },
        matching: { autoMatch: false },
      };

      const programOverrides = {
        session: { duration: 90 },
      };

      const { overridden } = resolveConfig(templateDefaults, programOverrides);

      expect(overridden).toContain('session');
    });

    it('should work with no overrides', () => {
      const templateDefaults = {
        session: { duration: 60 },
      };

      const { effective } = resolveConfig(templateDefaults);

      expect(effective).toEqual(templateDefaults);
    });

    it('should handle empty objects gracefully', () => {
      const templateDefaults = {};
      const programOverrides = { a: 1 };

      const { effective } = resolveConfig(templateDefaults, programOverrides);

      expect(effective).toEqual({ a: 1 });
    });
  });

  describe('validateConfig', () => {
    it('should validate config against Zod schema', () => {
      const config = {
        session: { defaultDurationMinutes: 60 },
        matching: { autoMatch: false },
      };

      const schema = z.object({
        session: z.object({
          defaultDurationMinutes: z.number().int().min(15).max(180),
        }),
        matching: z.object({
          autoMatch: z.boolean(),
        }),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid config', () => {
      const config = {
        session: { defaultDurationMinutes: 999 },
      };

      const schema = z.object({
        session: z.object({
          defaultDurationMinutes: z.number().int().min(15).max(180),
        }),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate required fields', () => {
      const config = {};

      const schema = z.object({
        requiredField: z.string(),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('requiredField is required');
    });

    it('should validate nested structures', () => {
      const config = {
        session: {
          defaultDurationMinutes: 60,
          topics: ['math', 123], // Invalid: number in string array
        },
      };

      const schema = z.object({
        session: z.object({
          defaultDurationMinutes: z.number(),
          topics: z.array(z.string()),
        }),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
    });

    it('should validate array constraints', () => {
      const config = {
        sdgGoals: [1, 2, 18], // Invalid: 18 is out of range
      };

      const schema = z.object({
        sdgGoals: z.array(z.number().int().min(1).max(17)),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
    });

    it('should validate enum values', () => {
      const config = {
        frequency: 'daily', // Invalid: not in enum
      };

      const schema = z.object({
        frequency: z.enum(['weekly', 'biweekly', 'monthly']),
      });

      const result = validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle mentorship template configuration', () => {
      const templateDefaults = {
        session: {
          defaultDurationMinutes: 60,
          recommendedFrequency: 'weekly',
          minSessionsForCompletion: 10,
        },
        matching: {
          autoMatch: false,
          criteria: {
            skills: [],
            interests: [],
          },
        },
        impact: {
          sroiWeights: {
            session_completed: 10.0,
            milestone_reached: 25.0,
          },
        },
      };

      const ukrainianProgramOverrides = {
        session: {
          minSessionsForCompletion: 8, // Shorter program for Ukrainian refugees
        },
        matching: {
          criteria: {
            skills: ['ukrainian_language'],
          },
        },
      };

      const companyCampaignOverrides = {
        session: {
          defaultDurationMinutes: 45, // Company prefers shorter sessions
        },
      };

      const { effective } = resolveConfig(
        templateDefaults,
        ukrainianProgramOverrides,
        companyCampaignOverrides
      );

      expect(effective.session.defaultDurationMinutes).toBe(45); // Campaign override
      expect(effective.session.minSessionsForCompletion).toBe(8); // Program override
      expect(effective.session.recommendedFrequency).toBe('weekly'); // Template default
      expect(effective.matching.criteria.skills).toEqual(['ukrainian_language']);
    });

    it('should handle language template configuration', () => {
      const templateDefaults = {
        cefr: {
          targetLevels: ['A1', 'A2', 'B1', 'B2'],
          assessmentIntervals: 90,
        },
        session: {
          defaultDurationMinutes: 45,
          topicLibrary: [
            { category: 'daily_life', topics: ['shopping', 'dining'] },
          ],
        },
      };

      const programOverrides = {
        cefr: {
          targetLevels: ['A1', 'A2'], // Beginner-focused program
        },
      };

      const { effective } = resolveConfig(templateDefaults, programOverrides);

      expect(effective.cefr.targetLevels).toEqual(['A1', 'A2']);
      expect(effective.cefr.assessmentIntervals).toBe(90); // Preserved from template
      expect(effective.session.topicLibrary).toBeDefined();
    });

    it('should handle buddy template configuration', () => {
      const templateDefaults = {
        matching: {
          algorithm: 'hybrid',
          criteria: {
            interests: [],
            location: 'same_city',
          },
        },
        milestones: {
          integrationStages: [
            {
              key: 'first_meeting',
              name: 'First Meeting',
              criteria: { eventsAttended: 1 },
              impactPoints: 10,
            },
          ],
        },
      };

      const programOverrides = {
        matching: {
          criteria: {
            interests: ['sports', 'cooking'],
          },
        },
      };

      const { effective } = resolveConfig(templateDefaults, programOverrides);

      expect(effective.matching.algorithm).toBe('hybrid'); // Template default
      expect(effective.matching.criteria.interests).toEqual(['sports', 'cooking']); // Program override
      expect(effective.matching.criteria.location).toBe('same_city'); // Template default
      expect(effective.milestones).toBeDefined();
    });
  });
});
