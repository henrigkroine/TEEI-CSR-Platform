import { describe, it, expect } from 'vitest';
import { validateRule, validateRules, type Rule } from '../src/rules/schema.js';

describe('Rule Schema Validation', () => {
  describe('validateRule', () => {
    it('should validate a valid rule', () => {
      const validRule: Rule = {
        id: 'test_rule_001',
        name: 'Test Rule',
        description: 'A test rule',
        flag: 'test_flag',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '>=',
            count_value: 3,
          },
        ],
        actions: [
          {
            type: 'set_flag',
            flag: 'test_flag',
            value: true,
          },
        ],
        priority: 10,
        active: true,
      };

      const result = validateRule(validRule);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject rule with missing required fields', () => {
      const invalidRule = {
        id: 'test_rule_002',
        name: 'Invalid Rule',
        // Missing description, flag, conditions, actions, priority, active
      };

      const result = validateRule(invalidRule);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate count condition', () => {
      const rule: Rule = {
        id: 'count_test',
        name: 'Count Test',
        description: 'Test count condition',
        flag: 'test',
        conditions: [
          {
            type: 'count',
            entity: 'kintell_sessions',
            field: 'session_type',
            value: 'language',
            count: '>=',
            count_value: 3,
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate exists condition', () => {
      const rule: Rule = {
        id: 'exists_test',
        name: 'Exists Test',
        description: 'Test exists condition',
        flag: 'test',
        conditions: [
          {
            type: 'exists',
            entity: 'program_enrollments',
            field: 'status',
            operator: '=',
            value: 'active',
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate value condition', () => {
      const rule: Rule = {
        id: 'value_test',
        name: 'Value Test',
        description: 'Test value condition',
        flag: 'test',
        conditions: [
          {
            type: 'value',
            entity: 'kintell_sessions',
            field: 'avg_rating',
            operator: '>=',
            value: 4.0,
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate time_since condition', () => {
      const rule: Rule = {
        id: 'time_test',
        name: 'Time Test',
        description: 'Test time_since condition',
        flag: 'test',
        conditions: [
          {
            type: 'time_since',
            entity: 'buddy_events',
            field: 'last_activity',
            duration: '14 days',
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate all_of condition', () => {
      const rule: Rule = {
        id: 'all_of_test',
        name: 'All Of Test',
        description: 'Test all_of condition',
        flag: 'test',
        conditions: [
          {
            type: 'all_of',
            conditions: [
              {
                type: 'count',
                entity: 'buddy_matches',
                count: '>=',
                count_value: 1,
              },
              {
                type: 'exists',
                entity: 'program_enrollments',
              },
            ],
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate any_of condition', () => {
      const rule: Rule = {
        id: 'any_of_test',
        name: 'Any Of Test',
        description: 'Test any_of condition',
        flag: 'test',
        conditions: [
          {
            type: 'any_of',
            conditions: [
              {
                type: 'count',
                entity: 'buddy_matches',
                count: '>=',
                count_value: 1,
              },
              {
                type: 'count',
                entity: 'kintell_sessions',
                count: '>=',
                count_value: 1,
              },
            ],
          },
        ],
        actions: [{ type: 'set_flag', flag: 'test', value: true }],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate emit_event action', () => {
      const rule: Rule = {
        id: 'emit_event_test',
        name: 'Emit Event Test',
        description: 'Test emit_event action',
        flag: 'test',
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
            type: 'emit_event',
            event: 'orchestration.milestone.reached',
            payload: {
              milestone: 'test',
              reason: 'Test reason',
            },
          },
        ],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });

    it('should validate clear_flag action', () => {
      const rule: Rule = {
        id: 'clear_flag_test',
        name: 'Clear Flag Test',
        description: 'Test clear_flag action',
        flag: 'test',
        conditions: [
          {
            type: 'count',
            entity: 'buddy_matches',
            count: '<',
            count_value: 1,
          },
        ],
        actions: [
          {
            type: 'clear_flag',
            flag: 'test',
          },
        ],
        priority: 10,
        active: true,
      };

      const result = validateRule(rule);
      expect(result.success).toBe(true);
    });
  });

  describe('validateRules', () => {
    it('should validate multiple valid rules', () => {
      const rules: Rule[] = [
        {
          id: 'rule_001',
          name: 'Rule 1',
          description: 'First rule',
          flag: 'flag_1',
          conditions: [
            {
              type: 'count',
              entity: 'buddy_matches',
              count: '>=',
              count_value: 1,
            },
          ],
          actions: [{ type: 'set_flag', flag: 'flag_1', value: true }],
          priority: 10,
          active: true,
        },
        {
          id: 'rule_002',
          name: 'Rule 2',
          description: 'Second rule',
          flag: 'flag_2',
          conditions: [
            {
              type: 'count',
              entity: 'kintell_sessions',
              count: '>=',
              count_value: 1,
            },
          ],
          actions: [{ type: 'set_flag', flag: 'flag_2', value: true }],
          priority: 20,
          active: true,
        },
      ];

      const result = validateRules(rules);
      expect(result.success).toBe(true);
      expect(result.validRules.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should handle mix of valid and invalid rules', () => {
      const rules = [
        {
          id: 'valid_rule',
          name: 'Valid',
          description: 'Valid rule',
          flag: 'test',
          conditions: [
            {
              type: 'count',
              entity: 'buddy_matches',
              count: '>=',
              count_value: 1,
            },
          ],
          actions: [{ type: 'set_flag', flag: 'test', value: true }],
          priority: 10,
          active: true,
        },
        {
          id: 'invalid_rule',
          name: 'Invalid',
          // Missing required fields
        },
      ];

      const result = validateRules(rules);
      expect(result.success).toBe(false);
      expect(result.validRules.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].index).toBe(1);
    });
  });
});
