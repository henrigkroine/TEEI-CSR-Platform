import { z } from 'zod';

/**
 * Condition types for rule evaluation
 */
export const ConditionTypeSchema = z.enum([
  'count',       // Check if count of entities meets criteria
  'exists',      // Check if entity exists
  'value',       // Check specific field value
  'time_since',  // Check time elapsed since last activity
  'all_of',      // All nested conditions must be true (AND)
  'any_of',      // At least one nested condition must be true (OR)
]);

export type ConditionType = z.infer<typeof ConditionTypeSchema>;

/**
 * Entities that can be queried in conditions
 */
export const EntityTypeSchema = z.enum([
  'buddy_matches',
  'buddy_events',
  'buddy_checkins',
  'kintell_sessions',
  'learning_progress',
  'program_enrollments',
  'outcome_scores',
  'user_profile',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

/**
 * Comparison operators
 */
export const OperatorSchema = z.enum(['>=', '<=', '=', '!=', '>', '<']);

export type Operator = z.infer<typeof OperatorSchema>;

/**
 * Base condition interface
 */
export const BaseConditionSchema = z.object({
  type: ConditionTypeSchema,
  entity: EntityTypeSchema.optional(),
  field: z.string().optional(),
  operator: OperatorSchema.optional(),
  value: z.any().optional(),
});

/**
 * Count condition: Check if count of entities meets criteria
 * Example: At least 3 kintell sessions
 */
export const CountConditionSchema = BaseConditionSchema.extend({
  type: z.literal('count'),
  entity: EntityTypeSchema,
  field: z.string().optional(), // Field to filter by
  operator: OperatorSchema.optional(),
  value: z.any().optional(),
  count: OperatorSchema, // Operator for count comparison
  count_value: z.number(), // Expected count value
});

/**
 * Exists condition: Check if entity exists with optional criteria
 * Example: Has active enrollment
 */
export const ExistsConditionSchema = BaseConditionSchema.extend({
  type: z.literal('exists'),
  entity: EntityTypeSchema,
  field: z.string().optional(),
  operator: OperatorSchema.optional(),
  value: z.any().optional(),
});

/**
 * Value condition: Check specific field value
 * Example: Average rating >= 4.0
 */
export const ValueConditionSchema = BaseConditionSchema.extend({
  type: z.literal('value'),
  entity: EntityTypeSchema,
  field: z.string(),
  operator: OperatorSchema,
  value: z.any(),
});

/**
 * Time since condition: Check time elapsed since last activity
 * Example: No activity in last 14 days
 */
export const TimeSinceConditionSchema = BaseConditionSchema.extend({
  type: z.literal('time_since'),
  entity: EntityTypeSchema,
  field: z.string(),
  duration: z.string(), // e.g., '14 days', '1 month', '2 weeks'
});

/**
 * Logical conditions: all_of (AND) and any_of (OR)
 */
export const LogicalConditionSchema: z.ZodType<{
  type: 'all_of' | 'any_of';
  conditions: Condition[];
}> = z.lazy(() =>
  z.object({
    type: z.enum(['all_of', 'any_of']),
    conditions: z.array(ConditionSchema),
  })
);

/**
 * Union of all condition types
 */
export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    CountConditionSchema,
    ExistsConditionSchema,
    ValueConditionSchema,
    TimeSinceConditionSchema,
    LogicalConditionSchema,
  ])
);

export type Condition =
  | z.infer<typeof CountConditionSchema>
  | z.infer<typeof ExistsConditionSchema>
  | z.infer<typeof ValueConditionSchema>
  | z.infer<typeof TimeSinceConditionSchema>
  | {
      type: 'all_of' | 'any_of';
      conditions: Condition[];
    };

/**
 * Action types
 */
export const ActionTypeSchema = z.enum([
  'set_flag',    // Set a journey flag to true/false
  'emit_event',  // Emit an event to the event bus
  'clear_flag',  // Clear a journey flag
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

/**
 * Set flag action
 */
export const SetFlagActionSchema = z.object({
  type: z.literal('set_flag'),
  flag: z.string(),
  value: z.boolean(),
});

/**
 * Emit event action
 */
export const EmitEventActionSchema = z.object({
  type: z.literal('emit_event'),
  event: z.string(),
  payload: z.record(z.any()),
});

/**
 * Clear flag action
 */
export const ClearFlagActionSchema = z.object({
  type: z.literal('clear_flag'),
  flag: z.string(),
});

/**
 * Union of all action types
 */
export const ActionSchema = z.union([
  SetFlagActionSchema,
  EmitEventActionSchema,
  ClearFlagActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

/**
 * Complete rule definition
 */
export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  flag: z.string(), // Primary flag this rule manages
  conditions: z.array(ConditionSchema),
  actions: z.array(ActionSchema),
  priority: z.number(), // Higher number = higher priority
  active: z.boolean(),
});

export type Rule = z.infer<typeof RuleSchema>;

/**
 * Rule configuration for storage (includes metadata)
 */
export const RuleConfigSchema = RuleSchema.extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RuleConfig = z.infer<typeof RuleConfigSchema>;

/**
 * Validate a rule
 */
export function validateRule(rule: unknown): { success: boolean; data?: Rule; errors?: string[] } {
  const result = RuleSchema.safeParse(rule);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validate multiple rules
 */
export function validateRules(rules: unknown[]): {
  success: boolean;
  validRules: Rule[];
  errors: { index: number; errors: string[] }[];
} {
  const validRules: Rule[] = [];
  const errors: { index: number; errors: string[] }[] = [];

  rules.forEach((rule, index) => {
    const result = validateRule(rule);
    if (result.success && result.data) {
      validRules.push(result.data);
    } else if (result.errors) {
      errors.push({ index, errors: result.errors });
    }
  });

  return {
    success: errors.length === 0,
    validRules,
    errors,
  };
}
