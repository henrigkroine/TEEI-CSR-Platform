import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateCondition,
  evaluateRule,
  parseDuration,
  compareValues,
  type EvaluationContext,
} from '../src/rules/engine.js';
import type { Rule, Condition } from '../src/rules/schema.js';

describe('Rule Engine', () => {
  let mockContext: EvaluationContext;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user-123',
      profile: {
        id: 'test-user-123',
        email: 'test@example.com',
        role: 'participant',
      },
      counts: {
        buddy_matches: 5,
        buddy_events: 10,
        buddy_checkins: 3,
        kintell_sessions: 8,
        kintell_sessions_by_type: {
          language: 4,
          mentorship: 3,
          cultural: 1,
        },
        learning_progress: 2,
      },
      aggregates: {
        avg_kintell_rating: 4.5,
        last_activity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      outcome_scores: [
        {
          dimension: 'language_comfort',
          score: 0.75,
          timestamp: new Date(),
        },
        {
          dimension: 'cultural_integration',
          score: 0.6,
          timestamp: new Date(),
        },
      ],
      program_enrollments: [
        {
          programType: 'buddy',
          status: 'active',
          enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ],
    };
  });

  describe('parseDuration', () => {
    it('should parse days', () => {
      expect(parseDuration('14 days')).toBe(14 * 24 * 60 * 60 * 1000);
      expect(parseDuration('1 day')).toBe(24 * 60 * 60 * 1000);
    });

    it('should parse weeks', () => {
      expect(parseDuration('2 weeks')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
      expect(parseDuration('1 week')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should parse months', () => {
      expect(parseDuration('1 month')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(parseDuration('3 months')).toBe(3 * 30 * 24 * 60 * 60 * 1000);
    });

    it('should parse hours', () => {
      expect(parseDuration('24 hours')).toBe(24 * 60 * 60 * 1000);
      expect(parseDuration('1 hour')).toBe(60 * 60 * 1000);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseDuration('invalid')).toThrow();
      expect(() => parseDuration('14')).toThrow();
    });
  });

  describe('compareValues', () => {
    it('should compare with =', () => {
      expect(compareValues(5, '=', 5)).toBe(true);
      expect(compareValues(5, '=', 6)).toBe(false);
    });

    it('should compare with !=', () => {
      expect(compareValues(5, '!=', 6)).toBe(true);
      expect(compareValues(5, '!=', 5)).toBe(false);
    });

    it('should compare with >', () => {
      expect(compareValues(6, '>', 5)).toBe(true);
      expect(compareValues(5, '>', 5)).toBe(false);
    });

    it('should compare with >=', () => {
      expect(compareValues(5, '>=', 5)).toBe(true);
      expect(compareValues(6, '>=', 5)).toBe(true);
      expect(compareValues(4, '>=', 5)).toBe(false);
    });

    it('should compare with <', () => {
      expect(compareValues(4, '<', 5)).toBe(true);
      expect(compareValues(5, '<', 5)).toBe(false);
    });

    it('should compare with <=', () => {
      expect(compareValues(5, '<=', 5)).toBe(true);
      expect(compareValues(4, '<=', 5)).toBe(true);
      expect(compareValues(6, '<=', 5)).toBe(false);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate count condition (simple)', async () => {
      const condition: Condition = {
        type: 'count',
        entity: 'buddy_matches',
        count: '>=',
        count_value: 3,
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true); // 5 >= 3
    });

    it('should evaluate count condition (with filter)', async () => {
      const condition: Condition = {
        type: 'count',
        entity: 'kintell_sessions',
        field: 'session_type',
        value: 'language',
        count: '>=',
        count_value: 3,
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true); // 4 >= 3
    });

    it('should evaluate count condition (failing)', async () => {
      const condition: Condition = {
        type: 'count',
        entity: 'buddy_matches',
        count: '>=',
        count_value: 10,
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(false); // 5 >= 10 is false
    });

    it('should evaluate exists condition', async () => {
      const condition: Condition = {
        type: 'exists',
        entity: 'program_enrollments',
        field: 'status',
        operator: '=',
        value: 'active',
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true);
    });

    it('should evaluate value condition', async () => {
      const condition: Condition = {
        type: 'value',
        entity: 'kintell_sessions',
        field: 'avg_rating',
        operator: '>=',
        value: 4.0,
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true); // 4.5 >= 4.0
    });

    it('should evaluate time_since condition (within duration)', async () => {
      const condition: Condition = {
        type: 'time_since',
        entity: 'buddy_events',
        field: 'last_activity',
        duration: '14 days',
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(false); // 7 days < 14 days
    });

    it('should evaluate time_since condition (exceeded duration)', async () => {
      const condition: Condition = {
        type: 'time_since',
        entity: 'buddy_events',
        field: 'last_activity',
        duration: '3 days',
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true); // 7 days > 3 days
    });

    it('should evaluate all_of condition (all true)', async () => {
      const condition: Condition = {
        type: 'all_of',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 3,
          },
          {
            type: 'exists',
            entity: 'program_enrollments',
          },
        ],
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true);
    });

    it('should evaluate all_of condition (one false)', async () => {
      const condition: Condition = {
        type: 'all_of',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 10, // False
          },
          {
            type: 'exists',
            entity: 'program_enrollments',
          },
        ],
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(false);
    });

    it('should evaluate any_of condition (at least one true)', async () => {
      const condition: Condition = {
        type: 'any_of',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 10, // False
          },
          {
            type: 'exists',
            entity: 'program_enrollments',
          }, // True
        ],
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(true);
    });

    it('should evaluate any_of condition (all false)', async () => {
      const condition: Condition = {
        type: 'any_of',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 10, // False
          },
          {
            type: 'count',
            entity: 'kintell_sessions',
            count: '>=',
            count_value: 20, // False
          },
        ],
      };

      const result = await evaluateCondition(condition, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('evaluateRule', () => {
    it('should evaluate rule with all conditions true', async () => {
      const rule: Rule = {
        id: 'mentor_ready_001',
        name: 'Mentor Ready',
        description: 'Participant has completed 3+ language sessions with high ratings',
        flag: 'mentor_ready',
        priority: 10,
        active: true,
        conditions: [
          {
            type: 'count',
            entity: 'kintell_sessions',
            field: 'session_type',
            value: 'language',
            count: '>=',
            count_value: 3,
          },
          {
            type: 'value',
            entity: 'kintell_sessions',
            field: 'avg_rating',
            operator: '>=',
            value: 4.0,
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'mentor_ready',
            value: true,
          },
        ],
      };

      const result = await evaluateRule(rule, mockContext);
      expect(result).toBe(true);
    });

    it('should evaluate rule with one condition false', async () => {
      const rule: Rule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test',
        flag: 'test',
        priority: 10,
        active: true,
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 3,
          }, // True
          {
            type: 'count',
            entity: 'kintell_sessions',
            count: '>=',
            count_value: 20,
          }, // False
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'test',
            value: true,
          },
        ],
      };

      const result = await evaluateRule(rule, mockContext);
      expect(result).toBe(false);
    });

    it('should return false for inactive rule', async () => {
      const rule: Rule = {
        id: 'inactive_rule',
        name: 'Inactive',
        description: 'Inactive rule',
        flag: 'test',
        priority: 10,
        active: false, // Inactive
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 1,
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'test',
            value: true,
          },
        ],
      };

      const result = await evaluateRule(rule, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should evaluate mentor_ready scenario', async () => {
      const context: EvaluationContext = {
        userId: 'participant-123',
        profile: { id: 'participant-123', email: 'participant@test.com', role: 'participant' },
        counts: {
          kintell_sessions: 5,
          kintell_sessions_by_type: {
            language: 4,
          },
        },
        aggregates: {
          avg_kintell_rating: 4.5,
        },
        outcome_scores: [],
        program_enrollments: [],
      };

      const mentorReadyRule: Rule = {
        id: 'mentor_ready_001',
        name: 'Mentor Ready',
        description: 'Participant ready to be a mentor',
        flag: 'mentor_ready',
        priority: 10,
        active: true,
        conditions: [
          {
            type: 'count',
            entity: 'kintell_sessions',
            field: 'session_type',
            value: 'language',
            count: '>=',
            count_value: 3,
          },
          {
            type: 'value',
            entity: 'kintell_sessions',
            field: 'avg_rating',
            operator: '>=',
            value: 4.0,
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'mentor_ready',
            value: true,
          },
          {
            type: 'emit_event',
            event: 'orchestration.milestone.reached',
            payload: {
              milestone: 'mentor_ready',
              reason: 'Completed 3+ language sessions with avg rating >= 4.0',
            },
          },
        ],
      };

      const result = await evaluateRule(mentorReadyRule, context);
      expect(result).toBe(true);
    });

    it('should evaluate followup_needed scenario', async () => {
      const context: EvaluationContext = {
        userId: 'participant-456',
        profile: { id: 'participant-456', email: 'participant2@test.com', role: 'participant' },
        counts: {},
        aggregates: {
          last_activity: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        },
        outcome_scores: [],
        program_enrollments: [
          {
            programType: 'buddy',
            status: 'active',
            enrolledAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ],
      };

      const followupRule: Rule = {
        id: 'followup_needed_001',
        name: 'Followup Needed',
        description: 'No activity in last 14 days',
        flag: 'followup_needed',
        priority: 20,
        active: true,
        conditions: [
          {
            type: 'time_since',
            entity: 'buddy_events',
            field: 'last_activity',
            duration: '14 days',
          },
          {
            type: 'exists',
            entity: 'program_enrollments',
            field: 'status',
            operator: '=',
            value: 'active',
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'followup_needed',
            value: true,
          },
        ],
      };

      const result = await evaluateRule(followupRule, context);
      expect(result).toBe(true);
    });

    it('should evaluate language_support_needed scenario', async () => {
      const context: EvaluationContext = {
        userId: 'participant-789',
        profile: { id: 'participant-789', email: 'participant3@test.com', role: 'participant' },
        counts: {},
        aggregates: {},
        outcome_scores: [
          {
            dimension: 'language_comfort',
            score: 0.3, // Low score
            timestamp: new Date(),
          },
        ],
        program_enrollments: [],
      };

      const languageSupportRule: Rule = {
        id: 'language_support_needed_001',
        name: 'Language Support Needed',
        description: 'Low language comfort detected',
        flag: 'language_support_needed',
        priority: 15,
        active: true,
        conditions: [
          {
            type: 'value',
            entity: 'outcome_scores',
            field: 'dimension',
            operator: '=',
            value: 'language_comfort',
          },
          {
            type: 'value',
            entity: 'outcome_scores',
            field: 'score',
            operator: '<',
            value: 0.5,
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'language_support_needed',
            value: true,
          },
        ],
      };

      const result = await evaluateRule(languageSupportRule, context);
      expect(result).toBe(true);
    });
  });
});
