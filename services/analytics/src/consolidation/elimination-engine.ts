/**
 * Elimination Engine
 *
 * Applies elimination rules to prevent double-counting in consolidation
 */

import type {
  TenantMetricData,
  EliminationMatch,
  EliminationRule,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import { eliminationRules } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

export class EliminationEngine {
  /**
   * Apply elimination rules to tenant metrics
   */
  async apply(
    orgId: string,
    metrics: TenantMetricData[],
    period: string
  ): Promise<EliminationMatch[]> {
    // Get active elimination rules for this org
    const rules = await db.select()
      .from(eliminationRules)
      .where(
        and(
          eq(eliminationRules.orgId, orgId),
          eq(eliminationRules.active, true)
        )
      );

    if (rules.length === 0) {
      return [];
    }

    const matches: EliminationMatch[] = [];

    for (const rule of rules) {
      const ruleMatches = this.applyRule(rule, metrics);
      matches.push(...ruleMatches);
    }

    return matches;
  }

  /**
   * Apply a single elimination rule
   */
  private applyRule(
    rule: EliminationRule,
    metrics: TenantMetricData[]
  ): EliminationMatch[] {
    const matches: EliminationMatch[] = [];

    switch (rule.ruleType) {
      case 'EVENT_SOURCE':
        return this.applyEventSourceRule(rule, metrics);
      case 'TENANT_PAIR':
        return this.applyTenantPairRule(rule, metrics);
      case 'TAG_BASED':
        return this.applyTagBasedRule(rule, metrics);
      case 'MANUAL':
        return this.applyManualRule(rule, metrics);
      default:
        return [];
    }
  }

  /**
   * Eliminate events from specific source
   */
  private applyEventSourceRule(
    rule: EliminationRule,
    metrics: TenantMetricData[]
  ): EliminationMatch[] {
    const pattern = rule.patternJson as { source?: string; tenantId?: string };
    const matches: EliminationMatch[] = [];

    for (const metric of metrics) {
      // Check if metric matches pattern
      const sourceMatch = !pattern.source || metric.metadata?.source === pattern.source;
      const tenantMatch = !pattern.tenantId || metric.tenantId === pattern.tenantId;

      if (sourceMatch && tenantMatch) {
        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          tenantId: metric.tenantId,
          metric: metric.metric,
          amount: metric.value,
          currency: metric.currency,
          reason: `Eliminated by ${rule.name}: source=${pattern.source}`,
        });
      }
    }

    return matches;
  }

  /**
   * Eliminate inter-company transactions between specific tenant pairs
   */
  private applyTenantPairRule(
    rule: EliminationRule,
    metrics: TenantMetricData[]
  ): EliminationMatch[] {
    const pattern = rule.patternJson as {
      pairs?: Array<{ tenantA: string; tenantB: string }>;
      metric?: string;
    };
    const matches: EliminationMatch[] = [];

    if (!pattern.pairs || pattern.pairs.length === 0) {
      return [];
    }

    for (const metric of metrics) {
      // Check if metric is from a tenant in an elimination pair
      for (const pair of pattern.pairs) {
        const inPair = metric.tenantId === pair.tenantA || metric.tenantId === pair.tenantB;
        const metricMatch = !pattern.metric || metric.metric === pattern.metric;

        if (inPair && metricMatch) {
          // Check if there's a corresponding transaction from the other tenant
          // For now, eliminate 50% from each tenant to avoid double-counting
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            tenantId: metric.tenantId,
            metric: metric.metric,
            amount: metric.value * 0.5, // Eliminate 50%
            currency: metric.currency,
            reason: `Eliminated 50% by ${rule.name}: inter-company transaction with ${pair.tenantA === metric.tenantId ? pair.tenantB : pair.tenantA}`,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Eliminate based on event tags
   */
  private applyTagBasedRule(
    rule: EliminationRule,
    metrics: TenantMetricData[]
  ): EliminationMatch[] {
    const pattern = rule.patternJson as {
      tags?: string[];
      metric?: string;
    };
    const matches: EliminationMatch[] = [];

    if (!pattern.tags || pattern.tags.length === 0) {
      return [];
    }

    for (const metric of metrics) {
      const metricTags = (metric.metadata?.tags || []) as string[];
      const hasMatchingTag = pattern.tags.some(tag => metricTags.includes(tag));
      const metricMatch = !pattern.metric || metric.metric === pattern.metric;

      if (hasMatchingTag && metricMatch) {
        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          tenantId: metric.tenantId,
          metric: metric.metric,
          amount: metric.value,
          currency: metric.currency,
          reason: `Eliminated by ${rule.name}: matched tags ${pattern.tags.join(', ')}`,
        });
      }
    }

    return matches;
  }

  /**
   * Manual elimination pattern
   */
  private applyManualRule(
    rule: EliminationRule,
    metrics: TenantMetricData[]
  ): EliminationMatch[] {
    const pattern = rule.patternJson as {
      tenantId?: string;
      metric?: string;
      amount?: number;
      percentage?: number;
    };
    const matches: EliminationMatch[] = [];

    for (const metric of metrics) {
      const tenantMatch = !pattern.tenantId || metric.tenantId === pattern.tenantId;
      const metricMatch = !pattern.metric || metric.metric === pattern.metric;

      if (tenantMatch && metricMatch) {
        let eliminationAmount = 0;

        if (pattern.amount !== undefined) {
          eliminationAmount = pattern.amount;
        } else if (pattern.percentage !== undefined) {
          eliminationAmount = metric.value * (pattern.percentage / 100);
        }

        if (eliminationAmount > 0) {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            tenantId: metric.tenantId,
            metric: metric.metric,
            amount: eliminationAmount,
            currency: metric.currency,
            reason: `Eliminated by ${rule.name}: manual rule`,
          });
        }
      }
    }

    return matches;
  }
}
