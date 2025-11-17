/**
 * Rollup Engine
 *
 * Rolls up metrics by org unit hierarchy
 */

import type {
  ConsolidationConfig,
  TenantMetricData,
  EliminationMatch,
  AdjustmentApplication,
  ConsolFact,
  OrgUnit,
  OrgUnitMember,
  ConsolidationMetric,
  RollupResult,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import {
  orgUnits,
  orgUnitMembers,
} from '@teei/shared-schema';
import { eq, and, inArray, lte } from 'drizzle-orm';
import { METRIC_DEFINITIONS } from '@teei/shared-types';

export class RollupEngine {
  /**
   * Roll up metrics by org unit hierarchy
   */
  async rollup(
    config: ConsolidationConfig,
    metrics: TenantMetricData[],
    eliminations: EliminationMatch[],
    adjustments: AdjustmentApplication[],
    runId: string
  ): Promise<ConsolFact[]> {
    // Get org unit hierarchy
    const units = await this.getOrgUnits(config.orgId);
    const memberships = await this.getMemberships(units.map(u => u.id), config.period);

    // Build rollup results per org unit
    const rollupResults: Map<string, RollupResult[]> = new Map();

    // Step 1: Calculate leaf node metrics (units with tenants)
    for (const unit of units) {
      const unitMemberships = memberships.filter(m => m.orgUnitId === unit.id);

      if (unitMemberships.length === 0) {
        // Non-leaf node, will be calculated from children
        continue;
      }

      const unitMetrics = this.calculateUnitMetrics(
        unit,
        unitMemberships,
        metrics,
        eliminations,
        adjustments,
        config
      );

      rollupResults.set(unit.id, unitMetrics);
    }

    // Step 2: Roll up to parent nodes (bottom-up)
    const rootUnits = units.filter(u => !u.parentId);
    for (const root of rootUnits) {
      this.rollupToParent(root, units, rollupResults, config);
    }

    // Step 3: Convert to ConsolFact records
    const facts: ConsolFact[] = [];

    for (const [unitId, results] of rollupResults.entries()) {
      const unit = units.find(u => u.id === unitId);
      if (!unit) continue;

      for (const result of results) {
        facts.push({
          id: crypto.randomUUID(),
          orgId: config.orgId,
          orgUnitId: unitId,
          period: config.period,
          metric: result.metric,
          valueLocal: result.valueLocal,
          valueBase: result.valueBase,
          currency: result.currency,
          fxRate: result.fxRate,
          eliminated: result.eliminated,
          adjusted: result.adjusted,
          runId,
          calculatedAt: new Date().toISOString(),
          metadata: {
            breakdown: result.breakdown,
          },
        });
      }
    }

    return facts;
  }

  /**
   * Calculate metrics for a single org unit (leaf node)
   */
  private calculateUnitMetrics(
    unit: OrgUnit,
    memberships: OrgUnitMember[],
    metrics: TenantMetricData[],
    eliminations: EliminationMatch[],
    adjustments: AdjustmentApplication[],
    config: ConsolidationConfig
  ): RollupResult[] {
    const results: RollupResult[] = [];

    // Get unique metrics
    const uniqueMetrics = [...new Set(metrics.map(m => m.metric))];

    for (const metricName of uniqueMetrics) {
      const metricDef = METRIC_DEFINITIONS[metricName];
      if (!metricDef) continue;

      // Get all metric values for tenants in this unit
      const unitTenantIds = memberships.map(m => m.tenantId);
      const metricValues = metrics.filter(
        m => m.metric === metricName && unitTenantIds.includes(m.tenantId)
      );

      if (metricValues.length === 0) continue;

      // Calculate eliminations for this unit/metric
      const metricEliminations = eliminations.filter(
        e => e.metric === metricName && unitTenantIds.includes(e.tenantId || '')
      );
      const totalEliminated = metricEliminations.reduce((sum, e) => sum + e.amount, 0);

      // Calculate adjustments for this unit/metric
      const metricAdjustments = adjustments.filter(
        a => a.metric === metricName && (!a.orgUnitId || a.orgUnitId === unit.id)
      );
      const totalAdjusted = metricAdjustments.reduce((sum, a) => sum + a.amount, 0);

      // Aggregate based on metric definition
      let aggregatedValue = 0;
      switch (metricDef.aggregation) {
        case 'sum':
          aggregatedValue = metricValues.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'avg':
          aggregatedValue = metricValues.reduce((sum, m) => sum + m.value, 0) / metricValues.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...metricValues.map(m => m.value));
          break;
        case 'max':
          aggregatedValue = Math.max(...metricValues.map(m => m.value));
          break;
        case 'count':
          aggregatedValue = metricValues.length;
          break;
      }

      // Apply eliminations and adjustments
      const finalValue = aggregatedValue - totalEliminated + totalAdjusted;

      results.push({
        orgUnitId: unit.id,
        metric: metricName,
        valueLocal: finalValue,
        valueBase: finalValue, // Already in base currency
        currency: config.baseCurrency,
        eliminated: totalEliminated,
        adjusted: totalAdjusted,
        breakdown: metricValues.map(m => ({
          tenantId: m.tenantId,
          value: m.value,
          currency: m.currency,
          eliminated: metricEliminations.some(e => e.tenantId === m.tenantId),
        })),
      });
    }

    return results;
  }

  /**
   * Roll up child metrics to parent (recursive)
   */
  private rollupToParent(
    parent: OrgUnit,
    allUnits: OrgUnit[],
    rollupResults: Map<string, RollupResult[]>,
    config: ConsolidationConfig
  ): void {
    // Get children
    const children = allUnits.filter(u => u.parentId === parent.id);

    if (children.length === 0) {
      // Leaf node, already calculated
      return;
    }

    // Recursively rollup children first
    for (const child of children) {
      this.rollupToParent(child, allUnits, rollupResults, config);
    }

    // Aggregate child metrics
    const parentMetrics: RollupResult[] = [];
    const uniqueMetrics = new Set<ConsolidationMetric>();

    // Collect all unique metrics from children
    for (const child of children) {
      const childResults = rollupResults.get(child.id) || [];
      childResults.forEach(r => uniqueMetrics.add(r.metric));
    }

    // Aggregate each metric
    for (const metricName of uniqueMetrics) {
      const metricDef = METRIC_DEFINITIONS[metricName];
      if (!metricDef) continue;

      const childValues: number[] = [];
      let totalEliminated = 0;
      let totalAdjusted = 0;

      for (const child of children) {
        const childResults = rollupResults.get(child.id) || [];
        const childMetric = childResults.find(r => r.metric === metricName);

        if (childMetric) {
          childValues.push(childMetric.valueBase);
          totalEliminated += childMetric.eliminated;
          totalAdjusted += childMetric.adjusted;
        }
      }

      if (childValues.length === 0) continue;

      // Aggregate based on metric definition
      let aggregatedValue = 0;
      switch (metricDef.aggregation) {
        case 'sum':
          aggregatedValue = childValues.reduce((sum, v) => sum + v, 0);
          break;
        case 'avg':
          aggregatedValue = childValues.reduce((sum, v) => sum + v, 0) / childValues.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...childValues);
          break;
        case 'max':
          aggregatedValue = Math.max(...childValues);
          break;
        case 'count':
          aggregatedValue = childValues.length;
          break;
      }

      parentMetrics.push({
        orgUnitId: parent.id,
        metric: metricName,
        valueLocal: aggregatedValue,
        valueBase: aggregatedValue,
        currency: config.baseCurrency,
        eliminated: totalEliminated,
        adjusted: totalAdjusted,
      });
    }

    rollupResults.set(parent.id, parentMetrics);
  }

  /**
   * Get all org units for an org
   */
  private async getOrgUnits(orgId: string): Promise<OrgUnit[]> {
    const units = await db.select()
      .from(orgUnits)
      .where(
        and(
          eq(orgUnits.orgId, orgId),
          eq(orgUnits.active, true)
        )
      );

    return units;
  }

  /**
   * Get memberships for org units
   */
  private async getMemberships(
    orgUnitIds: string[],
    period: string
  ): Promise<OrgUnitMember[]> {
    if (orgUnitIds.length === 0) return [];

    const memberships = await db.select()
      .from(orgUnitMembers)
      .where(
        and(
          inArray(orgUnitMembers.orgUnitId, orgUnitIds),
          lte(orgUnitMembers.startDate, period)
        )
      );

    // Filter by endDate
    return memberships.filter(m => !m.endDate || m.endDate >= period);
  }
}
