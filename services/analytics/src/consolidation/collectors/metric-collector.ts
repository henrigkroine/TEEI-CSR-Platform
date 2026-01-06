/**
 * Metric Collector
 *
 * Collects metrics from all tenants in scope for a given period
 */

import type {
  ConsolidationConfig,
  TenantMetricData,
  ConsolidationMetric,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import {
  orgUnits,
  orgUnitMembers,
  companies,
  metricsCompanyPeriod,
} from '@teei/shared-schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

export class MetricCollector {
  /**
   * Collect all metrics for tenants in scope
   */
  async collect(config: ConsolidationConfig): Promise<TenantMetricData[]> {
    // Get all org units in scope
    const units = await this.getOrgUnitsInScope(config);

    // Get all tenant memberships
    const memberships = await this.getTenantMemberships(units.map(u => u.id), config.period);

    // Get unique tenant IDs
    const tenantIds = [...new Set(memberships.map(m => m.tenantId))];

    if (tenantIds.length === 0) {
      return [];
    }

    // Collect metrics for each tenant
    const metrics: TenantMetricData[] = [];

    for (const tenantId of tenantIds) {
      const tenantMetrics = await this.collectTenantMetrics(tenantId, config.period);
      metrics.push(...tenantMetrics);
    }

    return metrics;
  }

  /**
   * Get org units in scope
   */
  private async getOrgUnitsInScope(config: ConsolidationConfig) {
    let units;

    if (config.scope?.orgUnitIds && config.scope.orgUnitIds.length > 0) {
      // Specific units requested
      units = await db.select()
        .from(orgUnits)
        .where(
          and(
            eq(orgUnits.orgId, config.orgId),
            inArray(orgUnits.id, config.scope.orgUnitIds),
            eq(orgUnits.active, true)
          )
        );

      // If includeDescendants is true, get all descendants
      if (config.scope.includeDescendants) {
        const descendants = await this.getDescendants(units.map(u => u.id));
        units = [...units, ...descendants];
      }
    } else {
      // All units in org
      units = await db.select()
        .from(orgUnits)
        .where(
          and(
            eq(orgUnits.orgId, config.orgId),
            eq(orgUnits.active, true)
          )
        );
    }

    return units;
  }

  /**
   * Get all descendants of given org units (recursive)
   */
  private async getDescendants(parentIds: string[]) {
    if (parentIds.length === 0) return [];

    const children = await db.select()
      .from(orgUnits)
      .where(
        and(
          inArray(orgUnits.parentId, parentIds),
          eq(orgUnits.active, true)
        )
      );

    if (children.length === 0) return [];

    // Recursively get grandchildren
    const grandchildren = await this.getDescendants(children.map(c => c.id));

    return [...children, ...grandchildren];
  }

  /**
   * Get tenant memberships for org units in given period
   */
  private async getTenantMemberships(orgUnitIds: string[], period: string) {
    if (orgUnitIds.length === 0) return [];

    const memberships = await db.select()
      .from(orgUnitMembers)
      .where(
        and(
          inArray(orgUnitMembers.orgUnitId, orgUnitIds),
          lte(orgUnitMembers.startDate, period),
          // endDate is null OR endDate >= period
        )
      );

    // Filter by endDate (can't do this in SQL easily with nullable fields)
    return memberships.filter(m => !m.endDate || m.endDate >= period);
  }

  /**
   * Collect metrics for a single tenant
   */
  private async collectTenantMetrics(
    tenantId: string,
    period: string
  ): Promise<TenantMetricData[]> {
    // Get company info for currency
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, tenantId))
      .limit(1);

    if (!company) {
      throw new Error(`Company not found: ${tenantId}`);
    }

    const currency = this.getCompanyCurrency(company);

    // Get metrics from metrics_company_period table
    const [metricRow] = await db.select()
      .from(metricsCompanyPeriod)
      .where(
        and(
          eq(metricsCompanyPeriod.companyId, tenantId),
          eq(metricsCompanyPeriod.periodStart, period)
        )
      )
      .limit(1);

    if (!metricRow) {
      // No metrics for this period, return empty
      return [];
    }

    const metrics: TenantMetricData[] = [];

    // SROI
    if (metricRow.sroiRatio) {
      metrics.push({
        tenantId,
        metric: 'sroi',
        value: parseFloat(metricRow.sroiRatio),
        currency,
        period,
      });
    }

    // VIS
    if (metricRow.visScore) {
      metrics.push({
        tenantId,
        metric: 'vis',
        value: parseFloat(metricRow.visScore),
        currency,
        period,
      });
    }

    // Volunteer hours (derived from sessionsCount * average duration)
    // TODO: Get actual volunteer hours from a dedicated table
    if (metricRow.sessionsCount) {
      const avgHoursPerSession = 2; // Assumption: 2 hours per session
      metrics.push({
        tenantId,
        metric: 'volunteer_hours',
        value: metricRow.sessionsCount * avgHoursPerSession,
        currency,
        period,
      });
    }

    // TODO: Add more metrics (donations, costs, SDGs)
    // These would come from other tables (billing, impact events, etc.)

    return metrics;
  }

  /**
   * Get company currency (fallback to USD)
   */
  private getCompanyCurrency(company: any): string {
    // TODO: Add currency field to companies table
    // For now, assume USD for US companies, EUR for EU, etc.
    const countryToCurrency: Record<string, string> = {
      USA: 'USD',
      UK: 'GBP',
      GB: 'GBP',
      France: 'EUR',
      Germany: 'EUR',
      Spain: 'EUR',
      Italy: 'EUR',
    };

    return company.country ? countryToCurrency[company.country] || 'USD' : 'USD';
  }
}
