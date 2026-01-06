/**
 * Plan Safety Verifier - plan-safety-verifier
 * Validates query plans against allow/deny lists, budgets, and security rules
 */

import { z } from 'zod';
import type { QueryPlan } from '../planner/semantic.js';
import {
  getMetric,
  isMetricAllowed,
  isJoinAllowed,
  validateJoinPath,
  DEFAULT_BUDGETS,
  ENTERPRISE_BUDGETS,
  type QueryBudgets,
  validateNoDeniedKeywords,
  validateFunctions,
  isPiiField,
} from '../ontology/index.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('plan-safety-verifier');

export const VerificationResultSchema = z.object({
  valid: z.boolean(),
  violations: z.array(z.string()),
  warnings: z.array(z.string()),
  estimatedCost: z.number(),
  estimatedTimeMs: z.number(),
  piiFields: z.array(z.string()),
  requiresRedaction: z.boolean(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export class SafetyVerifier {
  private budgets: QueryBudgets;

  constructor(options: { tier?: 'standard' | 'enterprise' } = {}) {
    this.budgets = options.tier === 'enterprise' ? ENTERPRISE_BUDGETS : DEFAULT_BUDGETS;
  }

  /**
   * Verify query plan against all safety rules
   * MUST return 100% pass rate for valid queries
   */
  async verifyPlan(plan: QueryPlan): Promise<VerificationResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    const piiFields: string[] = [];

    // 1. Verify tenant ID is present (row-level security)
    if (!plan.tenantId) {
      violations.push('Missing tenant ID - required for row-level security');
    }

    // 2. Verify all metrics are allowed
    for (const metric of plan.metrics) {
      if (!isMetricAllowed(metric.id)) {
        violations.push(`Metric not allowed: ${metric.id}`);
      } else {
        const metricDef = getMetric(metric.id);
        if (metricDef) {
          // Check aggregation is allowed
          if (!metricDef.allowedAggregations.includes(metric.aggregation as any)) {
            violations.push(`Aggregation '${metric.aggregation}' not allowed for metric '${metric.id}'`);
          }

          // Check PII fields
          piiFields.push(...metricDef.piiFields);
        }
      }
    }

    // 3. Verify all joins are allowed
    for (const join of plan.joins) {
      if (!isJoinAllowed(join.fromTable, join.toTable)) {
        violations.push(`Join not allowed: ${join.fromTable} -> ${join.toTable}`);
      }
    }

    // 4. Verify no join cycles
    const tables = [
      ...new Set([
        ...plan.metrics.map((m) => getMetric(m.id)?.sourceTable || ''),
        ...plan.joins.map((j) => j.fromTable),
        ...plan.joins.map((j) => j.toTable),
      ]),
    ];
    if (!validateJoinPath(tables)) {
      violations.push('Join path contains cycles');
    }

    // 5. Verify join count within budget
    if (plan.joins.length > this.budgets.maxJoins) {
      violations.push(`Too many joins: ${plan.joins.length} (max ${this.budgets.maxJoins})`);
    }

    // 6. Verify dimension count within budget
    if (plan.dimensions.length > this.budgets.maxGroupByDimensions) {
      violations.push(`Too many GROUP BY dimensions: ${plan.dimensions.length} (max ${this.budgets.maxGroupByDimensions})`);
    }

    // 7. Check PII fields in dimensions
    for (const dim of plan.dimensions) {
      if (isPiiField(dim.column)) {
        piiFields.push(`${dim.table}.${dim.column}`);
        warnings.push(`PII field in GROUP BY: ${dim.table}.${dim.column} - will be redacted`);
      }
    }

    // 8. Verify time range constraints
    if (plan.timeRange) {
      const start = new Date(plan.timeRange.start);
      const end = new Date(plan.timeRange.end);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Check against metric-specific max time range
      for (const metric of plan.metrics) {
        const metricDef = getMetric(metric.id);
        if (metricDef?.maxTimeRangeDays && daysDiff > metricDef.maxTimeRangeDays) {
          violations.push(
            `Time range too large for metric '${metric.id}': ${daysDiff} days (max ${metricDef.maxTimeRangeDays})`
          );
        }
      }

      if (daysDiff > 1825) {
        // 5 years absolute max
        violations.push(`Time range exceeds maximum: ${daysDiff} days (max 1825)`);
      }

      if (daysDiff < 0) {
        violations.push('Invalid time range: start date after end date');
      }
    } else {
      violations.push('Missing time range');
    }

    // 9. Verify limit is reasonable
    if (plan.limit && plan.limit > this.budgets.maxRowsReturned) {
      violations.push(`LIMIT too high: ${plan.limit} (max ${this.budgets.maxRowsReturned})`);
    }

    // 10. Estimate cost and verify budget
    const estimatedCost = this.estimateCost(plan);
    if (estimatedCost > this.budgets.maxCostPoints) {
      violations.push(`Estimated cost too high: ${estimatedCost} points (max ${this.budgets.maxCostPoints})`);
    }

    // 11. Estimate execution time
    const estimatedTimeMs = this.estimateExecutionTime(plan);
    if (estimatedTimeMs > this.budgets.maxExecutionTimeMs) {
      warnings.push(
        `Estimated execution time: ${estimatedTimeMs}ms (may exceed ${this.budgets.maxExecutionTimeMs}ms budget)`
      );
    }

    // 12. Check for SQL injection patterns in filter values
    for (const filter of plan.filters) {
      const sqlInjectionCheck = this.checkSqlInjection(String(filter.value));
      if (!sqlInjectionCheck.safe) {
        violations.push(`Potential SQL injection in filter value: ${sqlInjectionCheck.reason}`);
      }
    }

    const result: VerificationResult = {
      valid: violations.length === 0,
      violations,
      warnings,
      estimatedCost,
      estimatedTimeMs,
      piiFields: [...new Set(piiFields)],
      requiresRedaction: piiFields.length > 0,
    };

    logger.info({ plan: plan.intent, result }, 'Plan verification complete');

    return result;
  }

  /**
   * Estimate query cost
   */
  private estimateCost(plan: QueryPlan): number {
    let cost = 10; // Base cost

    // Metric costs
    for (const metric of plan.metrics) {
      const metricDef = getMetric(metric.id);
      if (metricDef) {
        cost += metricDef.costWeight * 5;

        // count_distinct is more expensive
        if (metric.aggregation === 'count_distinct') {
          cost += 10;
        }
      }
    }

    // Join costs
    cost += plan.joins.length * 15;

    // Dimension costs (GROUP BY)
    cost += plan.dimensions.length * 3;

    // Filter costs
    cost += plan.filters.length * 2;

    // Time range cost
    if (plan.timeRange) {
      const start = new Date(plan.timeRange.start);
      const end = new Date(plan.timeRange.end);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      cost += Math.min(daysDiff / 30, 20); // Cap at 20 points
    }

    return Math.round(cost);
  }

  /**
   * Estimate execution time in milliseconds
   */
  private estimateExecutionTime(plan: QueryPlan): number {
    let timeMs = 100; // Base time

    // Metrics
    timeMs += plan.metrics.length * 50;

    // Joins (expensive)
    timeMs += plan.joins.length * 300;

    // Dimensions (GROUP BY)
    timeMs += plan.dimensions.length * 100;

    // Filters (can help or hurt depending on selectivity)
    timeMs += plan.filters.length * 20;

    // Time range (more data = slower)
    if (plan.timeRange) {
      const start = new Date(plan.timeRange.start);
      const end = new Date(plan.timeRange.end);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      timeMs += daysDiff * 0.5; // 0.5ms per day
    }

    // count_distinct is slow
    for (const metric of plan.metrics) {
      if (metric.aggregation === 'count_distinct') {
        timeMs += 500;
      }
    }

    return Math.round(timeMs);
  }

  /**
   * Check for SQL injection patterns
   */
  private checkSqlInjection(value: string): { safe: boolean; reason?: string } {
    if (typeof value !== 'string') {
      return { safe: true };
    }

    // Check for dangerous keywords
    const keywordCheck = validateNoDeniedKeywords(value);
    if (!keywordCheck.valid) {
      return { safe: false, reason: `Contains denied keywords: ${keywordCheck.violations.join(', ')}` };
    }

    // Check for function calls (simplified)
    const funcCheck = validateFunctions(value);
    if (!funcCheck.valid) {
      return { safe: false, reason: `Contains invalid functions: ${funcCheck.violations.join(', ')}` };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /--/, // SQL comments
      /\/\*.*\*\//, // Block comments
      /;\s*DROP/i,
      /;\s*DELETE/i,
      /;\s*INSERT/i,
      /;\s*UPDATE/i,
      /UNION.*SELECT/i,
      /EXEC\s*\(/i,
      /EXECUTE\s*\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        return { safe: false, reason: `Matches suspicious pattern: ${pattern}` };
      }
    }

    return { safe: true };
  }

  /**
   * Verify SQL/CHQL string (for double-checking generated queries)
   */
  verifySql(sql: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check denied keywords
    const keywordCheck = validateNoDeniedKeywords(sql);
    if (!keywordCheck.valid) {
      violations.push(...keywordCheck.violations.map((v) => `Denied keyword: ${v}`));
    }

    // Check functions
    const funcCheck = validateFunctions(sql);
    if (!funcCheck.valid) {
      violations.push(...funcCheck.violations);
    }

    // Must contain WHERE clause with tenant_id (row-level security)
    if (!sql.toUpperCase().includes('WHERE')) {
      violations.push('Missing WHERE clause');
    }

    if (!sql.toLowerCase().includes('tenant_id')) {
      violations.push('Missing tenant_id filter (row-level security violation)');
    }

    return { valid: violations.length === 0, violations };
  }
}
