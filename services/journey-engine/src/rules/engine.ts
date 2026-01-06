import type { Rule, Condition, Action } from './schema.js';
import { createServiceLogger } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { db } from '@teei/shared-schema';
import { journeyFlags } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

const logger = createServiceLogger('journey-engine:rule-engine');

/**
 * Context object passed to rule evaluation
 */
export interface EvaluationContext {
  userId: string;
  profile: any;
  counts: {
    buddy_matches?: number;
    buddy_events?: number;
    buddy_checkins?: number;
    kintell_sessions?: number;
    kintell_sessions_by_type?: Record<string, number>;
    learning_progress?: number;
  };
  aggregates: {
    avg_kintell_rating?: number;
    last_activity?: Date;
  };
  outcome_scores?: Array<{
    dimension: string;
    score: number;
    timestamp: Date;
  }>;
  program_enrollments?: Array<{
    programType: string;
    status: string;
    enrolledAt: Date;
  }>;
}

/**
 * Parse duration string to milliseconds
 * Supports: '14 days', '1 month', '2 weeks', '3 hours'
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s+(day|days|week|weeks|month|months|hour|hours)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000, // Approximate
    months: 30 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Compare two values using an operator
 */
export function compareValues(left: any, operator: string, right: any): boolean {
  switch (operator) {
    case '=':
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Evaluate a single condition
 */
export async function evaluateCondition(
  condition: Condition,
  context: EvaluationContext
): Promise<boolean> {
  try {
    switch (condition.type) {
      case 'count': {
        // Get count for entity
        let count = 0;
        if (condition.entity === 'buddy_matches') {
          count = context.counts.buddy_matches || 0;
        } else if (condition.entity === 'buddy_events') {
          count = context.counts.buddy_events || 0;
        } else if (condition.entity === 'buddy_checkins') {
          count = context.counts.buddy_checkins || 0;
        } else if (condition.entity === 'kintell_sessions') {
          // If filtering by field (e.g., session_type = language)
          if (condition.field && condition.value) {
            const byType = context.counts.kintell_sessions_by_type || {};
            count = byType[condition.value] || 0;
          } else {
            count = context.counts.kintell_sessions || 0;
          }
        } else if (condition.entity === 'learning_progress') {
          count = context.counts.learning_progress || 0;
        }

        // Compare count
        return compareValues(count, condition.count, condition.count_value);
      }

      case 'exists': {
        // Check if entity exists with optional field/value filter
        if (condition.entity === 'program_enrollments') {
          const enrollments = context.program_enrollments || [];
          if (condition.field && condition.operator && condition.value !== undefined) {
            return enrollments.some((e: any) =>
              compareValues(e[condition.field], condition.operator, condition.value)
            );
          }
          return enrollments.length > 0;
        }
        return false;
      }

      case 'value': {
        // Check specific field value
        if (condition.entity === 'kintell_sessions' && condition.field === 'avg_rating') {
          const avgRating = context.aggregates.avg_kintell_rating || 0;
          return compareValues(avgRating, condition.operator, condition.value);
        } else if (condition.entity === 'outcome_scores') {
          const scores = context.outcome_scores || [];
          // Find score matching the dimension
          if (condition.field === 'dimension') {
            // This is a filter condition, check next condition for actual score comparison
            return scores.some((s) => s.dimension === condition.value);
          } else if (condition.field === 'score') {
            // Find the most recent score for the dimension filter in previous condition
            const relevantScore = scores.find((s) => true); // In real implementation, track dimension from previous condition
            if (relevantScore) {
              return compareValues(relevantScore.score, condition.operator, condition.value);
            }
          }
        }
        return false;
      }

      case 'time_since': {
        // Check time elapsed since last activity
        const durationMs = parseDuration(condition.duration);
        const now = new Date();
        const lastActivity = context.aggregates.last_activity;

        if (!lastActivity) {
          // No activity recorded, consider it as exceeding duration
          return true;
        }

        const timeSinceMs = now.getTime() - lastActivity.getTime();
        return timeSinceMs >= durationMs;
      }

      case 'all_of': {
        // All nested conditions must be true
        const results = await Promise.all(
          condition.conditions.map((c) => evaluateCondition(c, context))
        );
        return results.every((r) => r === true);
      }

      case 'any_of': {
        // At least one nested condition must be true
        const results = await Promise.all(
          condition.conditions.map((c) => evaluateCondition(c, context))
        );
        return results.some((r) => r === true);
      }

      default:
        logger.warn({ condition }, 'Unknown condition type');
        return false;
    }
  } catch (error) {
    logger.error({ error, condition }, 'Error evaluating condition');
    return false;
  }
}

/**
 * Evaluate a rule (all conditions must be true)
 */
export async function evaluateRule(rule: Rule, context: EvaluationContext): Promise<boolean> {
  if (!rule.active) {
    return false;
  }

  try {
    // All conditions must be true (implicit AND)
    const results = await Promise.all(
      rule.conditions.map((condition) => evaluateCondition(condition, context))
    );

    const passed = results.every((r) => r === true);
    logger.debug({ ruleId: rule.id, passed, results }, 'Rule evaluated');
    return passed;
  } catch (error) {
    logger.error({ error, ruleId: rule.id }, 'Error evaluating rule');
    return false;
  }
}

/**
 * Execute actions for a rule
 */
export async function executeActions(
  actions: Action[],
  context: EvaluationContext,
  ruleId: string
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'set_flag': {
          // Update or insert flag in database
          const existing = await db
            .select()
            .from(journeyFlags)
            .where(
              and(eq(journeyFlags.userId, context.userId), eq(journeyFlags.flag, action.flag))
            )
            .limit(1);

          if (existing.length > 0) {
            // Update existing flag
            await db
              .update(journeyFlags)
              .set({
                value: action.value,
                setByRule: ruleId,
                setAt: new Date(),
              })
              .where(eq(journeyFlags.id, existing[0].id));
          } else {
            // Insert new flag
            await db.insert(journeyFlags).values({
              userId: context.userId,
              flag: action.flag,
              value: action.value,
              setByRule: ruleId,
              setAt: new Date(),
            });
          }

          logger.info(
            { userId: context.userId, flag: action.flag, value: action.value, ruleId },
            'Flag set'
          );
          break;
        }

        case 'emit_event': {
          // Publish event to event bus
          const eventBus = getEventBus();
          await eventBus.publish({
            id: crypto.randomUUID(),
            type: action.event as any,
            version: 'v1',
            timestamp: new Date().toISOString(),
            data: {
              userId: context.userId,
              ruleId,
              ...action.payload,
            },
          });

          logger.info(
            { userId: context.userId, event: action.event, ruleId },
            'Event emitted'
          );
          break;
        }

        case 'clear_flag': {
          // Delete flag from database
          await db
            .delete(journeyFlags)
            .where(
              and(eq(journeyFlags.userId, context.userId), eq(journeyFlags.flag, action.flag))
            );

          logger.info({ userId: context.userId, flag: action.flag, ruleId }, 'Flag cleared');
          break;
        }

        default:
          logger.warn({ action }, 'Unknown action type');
      }
    } catch (error) {
      logger.error({ error, action, ruleId }, 'Error executing action');
    }
  }
}

/**
 * Evaluate all rules for a user and execute matching actions
 * Rules are evaluated in priority order (highest first)
 */
export async function evaluateAllRules(
  rules: Rule[],
  context: EvaluationContext
): Promise<{
  evaluatedRules: string[];
  triggeredRules: string[];
}> {
  // Sort by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  const evaluatedRules: string[] = [];
  const triggeredRules: string[] = [];

  for (const rule of sortedRules) {
    evaluatedRules.push(rule.id);

    const passed = await evaluateRule(rule, context);
    if (passed) {
      triggeredRules.push(rule.id);
      await executeActions(rule.actions, context, rule.id);
    }
  }

  logger.info(
    {
      userId: context.userId,
      evaluatedCount: evaluatedRules.length,
      triggeredCount: triggeredRules.length,
      triggeredRules,
    },
    'Rules evaluation completed'
  );

  return {
    evaluatedRules,
    triggeredRules,
  };
}
