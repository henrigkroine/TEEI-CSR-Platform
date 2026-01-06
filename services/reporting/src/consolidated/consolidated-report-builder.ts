/**
 * Consolidated Report Builder
 *
 * Generates consolidated reports and decks for enterprise hierarchies
 */

import type {
  ConsolFact,
  Org,
  OrgUnit,
  ConsolidationMetric,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import { orgs, orgUnits, consolFacts } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

export interface ConsolidatedReportOptions {
  orgId: string;
  period: string;
  includeEliminations?: boolean;
  includeAdjustments?: boolean;
  format?: 'annual' | 'quarterly' | 'investor';
}

export interface ConsolidatedReport {
  org: Org;
  period: string;
  reportType: string;
  summary: {
    totalUnits: number;
    metrics: {
      metric: ConsolidationMetric;
      value: number;
      currency: string;
      eliminated?: number;
      adjusted?: number;
    }[];
  };
  unitBreakdown: {
    unit: OrgUnit;
    metrics: {
      metric: ConsolidationMetric;
      value: number;
      currency: string;
    }[];
  }[];
  eliminations?: {
    total: number;
    byMetric: Record<string, number>;
  };
  adjustments?: {
    total: number;
    byMetric: Record<string, number>;
  };
  generatedAt: string;
}

export class ConsolidatedReportBuilder {
  /**
   * Generate consolidated report
   */
  async generate(options: ConsolidatedReportOptions): Promise<ConsolidatedReport> {
    // Get org
    const [org] = await db.select()
      .from(orgs)
      .where(eq(orgs.id, options.orgId))
      .limit(1);

    if (!org) {
      throw new Error(`Org not found: ${options.orgId}`);
    }

    // Get all facts for period
    const facts = await db.select()
      .from(consolFacts)
      .where(
        and(
          eq(consolFacts.orgId, options.orgId),
          eq(consolFacts.period, options.period)
        )
      );

    if (facts.length === 0) {
      throw new Error(`No consolidation facts found for org ${options.orgId} in period ${options.period}`);
    }

    // Get org units
    const unitIds = [...new Set(facts.map(f => f.orgUnitId))];
    const units = await db.select()
      .from(orgUnits)
      .where(eq(orgUnits.orgId, options.orgId));

    const unitsById = new Map(units.map(u => [u.id, u]));

    // Calculate summary metrics (root level or sum)
    const metricTotals = new Map<ConsolidationMetric, {
      value: number;
      eliminated: number;
      adjusted: number;
    }>();

    for (const fact of facts) {
      const current = metricTotals.get(fact.metric as ConsolidationMetric) || {
        value: 0,
        eliminated: 0,
        adjusted: 0,
      };

      current.value += parseFloat(fact.valueBase);
      current.eliminated += parseFloat(fact.eliminated);
      current.adjusted += parseFloat(fact.adjusted);

      metricTotals.set(fact.metric as ConsolidationMetric, current);
    }

    // Build summary
    const summary = {
      totalUnits: unitIds.length,
      metrics: Array.from(metricTotals.entries()).map(([metric, totals]) => ({
        metric,
        value: totals.value,
        currency: org.currency,
        eliminated: options.includeEliminations ? totals.eliminated : undefined,
        adjusted: options.includeAdjustments ? totals.adjusted : undefined,
      })),
    };

    // Build unit breakdown
    const unitBreakdown = unitIds.map(unitId => {
      const unit = unitsById.get(unitId);
      if (!unit) return null;

      const unitFacts = facts.filter(f => f.orgUnitId === unitId);
      const metrics = unitFacts.map(f => ({
        metric: f.metric as ConsolidationMetric,
        value: parseFloat(f.valueBase),
        currency: org.currency,
      }));

      return { unit, metrics };
    }).filter(Boolean) as any;

    // Calculate eliminations summary
    const eliminations = options.includeEliminations ? {
      total: Array.from(metricTotals.values()).reduce((sum, t) => sum + t.eliminated, 0),
      byMetric: Object.fromEntries(
        Array.from(metricTotals.entries()).map(([metric, totals]) => [metric, totals.eliminated])
      ),
    } : undefined;

    // Calculate adjustments summary
    const adjustments = options.includeAdjustments ? {
      total: Array.from(metricTotals.values()).reduce((sum, t) => sum + t.adjusted, 0),
      byMetric: Object.fromEntries(
        Array.from(metricTotals.entries()).map(([metric, totals]) => [metric, totals.adjusted])
      ),
    } : undefined;

    return {
      org,
      period: options.period,
      reportType: options.format || 'quarterly',
      summary,
      unitBreakdown,
      eliminations,
      adjustments,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate PDF watermark data
   */
  generateWatermark(org: Org, reportId: string): {
    text: string;
    opacity: number;
    position: string;
  } {
    return {
      text: `${org.name} - Consolidated Report - ID: ${reportId}`,
      opacity: 0.1,
      position: 'diagonal',
    };
  }

  /**
   * Generate PPTX deck outline
   */
  async generateDeckOutline(report: ConsolidatedReport): Promise<any> {
    return {
      title: `${report.org.name} - Consolidated Impact Report`,
      subtitle: `Period: ${report.period}`,
      slides: [
        {
          type: 'cover',
          title: report.org.name,
          subtitle: 'Consolidated Impact Report',
          period: report.period,
          logo: report.org.logoUrl,
        },
        {
          type: 'summary',
          title: 'Executive Summary',
          metrics: report.summary.metrics,
          charts: ['sroi_trend', 'vis_trend'],
        },
        {
          type: 'breakdown',
          title: 'Organizational Breakdown',
          units: report.unitBreakdown,
        },
        {
          type: 'appendix',
          title: 'Eliminations & Adjustments',
          eliminations: report.eliminations,
          adjustments: report.adjustments,
        },
      ],
    };
  }
}
