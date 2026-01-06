/**
 * Consolidation Engine
 *
 * Orchestrates the consolidation process:
 * 1. Collect metrics from tenants
 * 2. Convert currencies using FX rates
 * 3. Apply elimination rules
 * 4. Apply manual adjustments
 * 5. Roll up metrics by org unit hierarchy
 */

import type {
  ConsolidationConfig,
  ConsolidationOutput,
  ConsolidationStepResult,
  TenantMetricData,
  EliminationMatch,
  AdjustmentApplication,
  ConsolFact,
  FxRate,
  ConsolidationMetric,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import {
  orgs,
  orgUnits,
  orgUnitMembers,
  consolFacts,
  consolRuns,
  eliminationRules,
  consolAdjustments,
  fxRates,
} from '@teei/shared-schema';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { MetricCollector } from './collectors/metric-collector.js';
import { FxConverter } from './fx-converter.js';
import { EliminationEngine } from './elimination-engine.js';
import { AdjustmentEngine } from './adjustment-engine.js';
import { RollupEngine } from './rollup-engine.js';
import { v4 as uuidv4 } from 'uuid';

export class ConsolidationEngine {
  private metricCollector: MetricCollector;
  private fxConverter: FxConverter;
  private eliminationEngine: EliminationEngine;
  private adjustmentEngine: AdjustmentEngine;
  private rollupEngine: RollupEngine;

  constructor() {
    this.metricCollector = new MetricCollector();
    this.fxConverter = new FxConverter();
    this.eliminationEngine = new EliminationEngine();
    this.adjustmentEngine = new AdjustmentEngine();
    this.rollupEngine = new RollupEngine();
  }

  /**
   * Run consolidation for a given org and period
   */
  async run(config: ConsolidationConfig, triggeredBy: string): Promise<ConsolidationOutput> {
    const runId = uuidv4();
    const startTime = Date.now();
    const steps: ConsolidationStepResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create run record
      const [run] = await db.insert(consolRuns).values({
        id: runId,
        orgId: config.orgId,
        period: config.period,
        scope: config.scope || {},
        status: 'running',
        startedAt: new Date().toISOString(),
        triggeredBy,
      }).returning();

      // Step 1: Validate config and get org
      const stepStart1 = Date.now();
      const org = await this.validateAndGetOrg(config);
      steps.push({
        step: 'collect',
        status: 'success',
        message: `Validated org: ${org.name} (${org.currency})`,
        duration: Date.now() - stepStart1,
      });

      // Step 2: Collect metrics from all tenants in scope
      const stepStart2 = Date.now();
      const tenantMetrics = await this.metricCollector.collect(config);
      steps.push({
        step: 'collect',
        status: 'success',
        message: `Collected ${tenantMetrics.length} tenant metrics`,
        data: { count: tenantMetrics.length },
        duration: Date.now() - stepStart2,
      });

      // Step 3: Convert currencies to base currency
      const stepStart3 = Date.now();
      const fxRateDate = config.fxRateDate || this.getEndOfPeriod(config.period);
      const conversions = await this.fxConverter.convertToBase(
        tenantMetrics,
        org.currency,
        fxRateDate
      );
      const usedFxRates = await this.fxConverter.getUsedRates();
      steps.push({
        step: 'convert',
        status: 'success',
        message: `Converted currencies using ${usedFxRates.length} FX rates`,
        data: { ratesUsed: usedFxRates.length },
        duration: Date.now() - stepStart3,
      });

      // Step 4: Apply elimination rules
      const stepStart4 = Date.now();
      let eliminations: EliminationMatch[] = [];
      if (config.runEliminations !== false) {
        eliminations = await this.eliminationEngine.apply(
          config.orgId,
          conversions,
          config.period
        );
        steps.push({
          step: 'eliminate',
          status: 'success',
          message: `Applied ${eliminations.length} eliminations`,
          data: { count: eliminations.length },
          duration: Date.now() - stepStart4,
        });
      } else {
        steps.push({
          step: 'eliminate',
          status: 'success',
          message: 'Eliminations skipped (config.runEliminations=false)',
          duration: Date.now() - stepStart4,
        });
      }

      // Step 5: Apply manual adjustments
      const stepStart5 = Date.now();
      let adjustments: AdjustmentApplication[] = [];
      if (config.runAdjustments !== false) {
        adjustments = await this.adjustmentEngine.apply(
          config.orgId,
          config.period,
          conversions
        );
        steps.push({
          step: 'adjust',
          status: 'success',
          message: `Applied ${adjustments.length} adjustments`,
          data: { count: adjustments.length },
          duration: Date.now() - stepStart5,
        });
      } else {
        steps.push({
          step: 'adjust',
          status: 'success',
          message: 'Adjustments skipped (config.runAdjustments=false)',
          duration: Date.now() - stepStart5,
        });
      }

      // Step 6: Roll up metrics by org unit hierarchy
      const stepStart6 = Date.now();
      const facts = await this.rollupEngine.rollup(
        config,
        conversions,
        eliminations,
        adjustments,
        runId
      );
      steps.push({
        step: 'rollup',
        status: 'success',
        message: `Generated ${facts.length} consolidation facts`,
        data: { count: facts.length },
        duration: Date.now() - stepStart6,
      });

      // Step 7: Persist facts to database
      if (facts.length > 0) {
        // Delete existing facts for this org/period first
        await db.delete(consolFacts)
          .where(
            and(
              eq(consolFacts.orgId, config.orgId),
              eq(consolFacts.period, config.period)
            )
          );

        // Insert new facts
        await db.insert(consolFacts).values(
          facts.map(fact => ({
            ...fact,
            calculatedAt: new Date().toISOString(),
          }))
        );
      }

      // Update run record
      const totalDuration = Date.now() - startTime;
      await db.update(consolRuns)
        .set({
          status: 'completed',
          completedAt: new Date().toISOString(),
          stats: {
            unitsProcessed: new Set(facts.map(f => f.orgUnitId)).size,
            metricsCalculated: facts.length,
            eliminationsApplied: eliminations.length,
            adjustmentsApplied: adjustments.length,
          },
        })
        .where(eq(consolRuns.id, runId));

      return {
        runId,
        orgId: config.orgId,
        period: config.period,
        facts,
        eliminations,
        adjustments,
        fxRates: usedFxRates,
        steps,
        stats: {
          orgUnitsProcessed: new Set(facts.map(f => f.orgUnitId)).size,
          tenantsProcessed: new Set(tenantMetrics.map(m => m.tenantId)).size,
          metricsCalculated: facts.length,
          eliminationsApplied: eliminations.length,
          adjustmentsApplied: adjustments.length,
          totalDuration,
        },
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      // Update run record with error
      await db.update(consolRuns)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorMessage,
        })
        .where(eq(consolRuns.id, runId));

      throw error;
    }
  }

  /**
   * Validate config and get org
   */
  private async validateAndGetOrg(config: ConsolidationConfig) {
    const [org] = await db.select()
      .from(orgs)
      .where(eq(orgs.id, config.orgId))
      .limit(1);

    if (!org) {
      throw new Error(`Org not found: ${config.orgId}`);
    }

    if (!org.active) {
      throw new Error(`Org is inactive: ${config.orgId}`);
    }

    return org;
  }

  /**
   * Get end of period date
   */
  private getEndOfPeriod(periodStart: string): string {
    const date = new Date(periodStart);
    // Assume quarterly periods (3 months)
    date.setMonth(date.getMonth() + 3);
    date.setDate(date.getDate() - 1); // Last day of period
    return date.toISOString().split('T')[0];
  }

  /**
   * Get consolidation run by ID
   */
  async getRun(runId: string) {
    const [run] = await db.select()
      .from(consolRuns)
      .where(eq(consolRuns.id, runId))
      .limit(1);

    return run;
  }

  /**
   * Get consolidation facts
   */
  async getFacts(query: {
    orgId?: string;
    orgUnitId?: string;
    period?: string;
    metric?: string;
  }) {
    const conditions = [];

    if (query.orgId) {
      conditions.push(eq(consolFacts.orgId, query.orgId));
    }
    if (query.orgUnitId) {
      conditions.push(eq(consolFacts.orgUnitId, query.orgUnitId));
    }
    if (query.period) {
      conditions.push(eq(consolFacts.period, query.period));
    }
    if (query.metric) {
      conditions.push(eq(consolFacts.metric, query.metric));
    }

    const facts = await db.select()
      .from(consolFacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(consolFacts.period, consolFacts.orgUnitId, consolFacts.metric);

    return facts;
  }
}
