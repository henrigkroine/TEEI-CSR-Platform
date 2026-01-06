/**
 * SQL Generator - sql-generator
 * Converts verified query plan to parameterized SQL/CHQL
 */

import type { QueryPlan } from './semantic.js';
import { getMetric, getJoinRule } from '../ontology/index.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('sql-generator');

export interface GeneratedQuery {
  sql: string;
  parameters: Record<string, any>;
  dialect: 'clickhouse' | 'postgres';
  estimatedRows: number;
}

export class SqlGenerator {
  /**
   * Generate parameterized ClickHouse SQL from plan
   */
  generateClickHouse(plan: QueryPlan): GeneratedQuery {
    const params: Record<string, any> = {};
    let paramCounter = 1;

    // Build SELECT clause
    const selectParts: string[] = [];

    // Add metrics
    for (const metric of plan.metrics) {
      const metricDef = getMetric(metric.id);
      if (!metricDef) continue;

      const alias = metric.alias || metric.id;
      const agg = metric.aggregation;
      const col = metricDef.sourceColumn;

      selectParts.push(`${agg}(${col}) AS ${alias}`);
    }

    // Add dimensions
    for (const dim of plan.dimensions) {
      const alias = dim.alias || dim.column;
      selectParts.push(`${dim.table}.${dim.column} AS ${alias}`);
    }

    // Add time dimension based on granularity
    if (plan.timeRange.granularity) {
      const timeFunc = this.getTimeFunction(plan.timeRange.granularity);
      selectParts.push(`${timeFunc}(timestamp) AS time_bucket`);
    }

    const selectClause = `SELECT ${selectParts.join(', ')}`;

    // Build FROM clause (use first metric's table as base)
    const baseMetric = plan.metrics[0];
    const baseTable = getMetric(baseMetric.id)?.sourceTable;
    if (!baseTable) {
      throw new Error('No base table found');
    }

    let fromClause = `FROM ${baseTable}`;

    // Build JOIN clauses
    for (const join of plan.joins) {
      const joinRule = getJoinRule(join.fromTable, join.toTable);
      if (!joinRule) continue;

      const joinType = joinRule.joinType.toUpperCase();
      const conditions = joinRule.onConditions
        .map((cond) => `${join.fromTable}.${cond.fromColumn} ${cond.operator} ${join.toTable}.${cond.toColumn}`)
        .join(' AND ');

      fromClause += ` ${joinType} JOIN ${join.toTable} ON ${conditions}`;
    }

    // Build WHERE clause (CRITICAL: must include tenant_id for row-level security)
    const whereParts: string[] = [];

    // Add tenant filter (REQUIRED)
    const tenantParam = `param${paramCounter++}`;
    params[tenantParam] = plan.tenantId;
    whereParts.push(`${baseTable}.tenant_id = {${tenantParam}:String}`);

    // Add time range filter (REQUIRED)
    const startParam = `param${paramCounter++}`;
    const endParam = `param${paramCounter++}`;
    params[startParam] = plan.timeRange.start;
    params[endParam] = plan.timeRange.end;
    whereParts.push(`timestamp >= {${startParam}:DateTime}`);
    whereParts.push(`timestamp < {${endParam}:DateTime}`);

    // Add custom filters
    for (const filter of plan.filters) {
      const filterParam = `param${paramCounter++}`;
      params[filterParam] = filter.value;

      const valueType = this.inferClickHouseType(filter.value);
      whereParts.push(`${filter.table}.${filter.column} ${filter.operator} {${filterParam}:${valueType}}`);
    }

    const whereClause = `WHERE ${whereParts.join(' AND ')}`;

    // Build GROUP BY clause
    let groupByClause = '';
    if (plan.dimensions.length > 0 || plan.timeRange.granularity) {
      const groupParts: string[] = [];

      for (const dim of plan.dimensions) {
        groupParts.push(`${dim.table}.${dim.column}`);
      }

      if (plan.timeRange.granularity) {
        groupParts.push('time_bucket');
      }

      groupByClause = `GROUP BY ${groupParts.join(', ')}`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (plan.orderBy && plan.orderBy.length > 0) {
      const orderParts = plan.orderBy.map((o) => `${o.column} ${o.direction}`);
      orderByClause = `ORDER BY ${orderParts.join(', ')}`;
    } else if (plan.timeRange.granularity) {
      orderByClause = 'ORDER BY time_bucket ASC';
    }

    // Build LIMIT clause
    const limit = plan.limit || 1000;
    const limitClause = `LIMIT ${limit}`;

    // Combine all parts
    const sql = [selectClause, fromClause, whereClause, groupByClause, orderByClause, limitClause]
      .filter(Boolean)
      .join('\n');

    logger.info({ sql, parameters: params }, 'Generated ClickHouse SQL');

    return {
      sql,
      parameters: params,
      dialect: 'clickhouse',
      estimatedRows: this.estimateRows(plan),
    };
  }

  /**
   * Generate parameterized PostgreSQL from plan
   */
  generatePostgres(plan: QueryPlan): GeneratedQuery {
    const params: Record<string, any> = {};
    let paramCounter = 1;

    // Build SELECT clause
    const selectParts: string[] = [];

    for (const metric of plan.metrics) {
      const metricDef = getMetric(metric.id);
      if (!metricDef) continue;

      const alias = metric.alias || metric.id;
      const agg = metric.aggregation;
      const col = metricDef.sourceColumn;

      selectParts.push(`${agg}(${col}) AS ${alias}`);
    }

    for (const dim of plan.dimensions) {
      const alias = dim.alias || dim.column;
      selectParts.push(`${dim.table}.${dim.column} AS ${alias}`);
    }

    if (plan.timeRange.granularity) {
      const timeFunc = this.getPostgresTimeFunction(plan.timeRange.granularity);
      selectParts.push(`${timeFunc} AS time_bucket`);
    }

    const selectClause = `SELECT ${selectParts.join(', ')}`;

    // Build FROM clause
    const baseMetric = plan.metrics[0];
    const baseTable = getMetric(baseMetric.id)?.sourceTable;
    if (!baseTable) {
      throw new Error('No base table found');
    }

    let fromClause = `FROM ${baseTable}`;

    // Build JOIN clauses
    for (const join of plan.joins) {
      const joinRule = getJoinRule(join.fromTable, join.toTable);
      if (!joinRule) continue;

      const joinType = joinRule.joinType.toUpperCase();
      const conditions = joinRule.onConditions
        .map((cond) => `${join.fromTable}.${cond.fromColumn} ${cond.operator} ${join.toTable}.${cond.toColumn}`)
        .join(' AND ');

      fromClause += ` ${joinType} JOIN ${join.toTable} ON ${conditions}`;
    }

    // Build WHERE clause
    const whereParts: string[] = [];

    // Tenant filter (REQUIRED)
    whereParts.push(`${baseTable}.tenant_id = $${paramCounter}`);
    params[`$${paramCounter}`] = plan.tenantId;
    paramCounter++;

    // Time range filter
    whereParts.push(`timestamp >= $${paramCounter}`);
    params[`$${paramCounter}`] = plan.timeRange.start;
    paramCounter++;

    whereParts.push(`timestamp < $${paramCounter}`);
    params[`$${paramCounter}`] = plan.timeRange.end;
    paramCounter++;

    // Custom filters
    for (const filter of plan.filters) {
      whereParts.push(`${filter.table}.${filter.column} ${filter.operator} $${paramCounter}`);
      params[`$${paramCounter}`] = filter.value;
      paramCounter++;
    }

    const whereClause = `WHERE ${whereParts.join(' AND ')}`;

    // Build GROUP BY clause
    let groupByClause = '';
    if (plan.dimensions.length > 0 || plan.timeRange.granularity) {
      const groupParts: string[] = [];

      for (const dim of plan.dimensions) {
        groupParts.push(`${dim.table}.${dim.column}`);
      }

      if (plan.timeRange.granularity) {
        groupParts.push('time_bucket');
      }

      groupByClause = `GROUP BY ${groupParts.join(', ')}`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (plan.orderBy && plan.orderBy.length > 0) {
      const orderParts = plan.orderBy.map((o) => `${o.column} ${o.direction}`);
      orderByClause = `ORDER BY ${orderParts.join(', ')}`;
    }

    // Build LIMIT clause
    const limit = plan.limit || 1000;
    const limitClause = `LIMIT ${limit}`;

    // Combine all parts
    const sql = [selectClause, fromClause, whereClause, groupByClause, orderByClause, limitClause]
      .filter(Boolean)
      .join('\n');

    logger.info({ sql, parameters: params }, 'Generated PostgreSQL');

    return {
      sql,
      parameters: params,
      dialect: 'postgres',
      estimatedRows: this.estimateRows(plan),
    };
  }

  /**
   * Get ClickHouse time function for granularity
   */
  private getTimeFunction(granularity: string): string {
    const funcs: Record<string, string> = {
      hour: 'toStartOfHour',
      day: 'toStartOfDay',
      week: 'toStartOfWeek',
      month: 'toStartOfMonth',
      quarter: 'toStartOfQuarter',
      year: 'toStartOfYear',
    };
    return funcs[granularity] || 'toStartOfDay';
  }

  /**
   * Get PostgreSQL time function for granularity
   */
  private getPostgresTimeFunction(granularity: string): string {
    const funcs: Record<string, string> = {
      hour: "date_trunc('hour', timestamp)",
      day: "date_trunc('day', timestamp)",
      week: "date_trunc('week', timestamp)",
      month: "date_trunc('month', timestamp)",
      quarter: "date_trunc('quarter', timestamp)",
      year: "date_trunc('year', timestamp)",
    };
    return funcs[granularity] || "date_trunc('day', timestamp)";
  }

  /**
   * Infer ClickHouse type from value
   */
  private inferClickHouseType(value: any): string {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'Int64' : 'Float64';
    }
    if (typeof value === 'boolean') {
      return 'Bool';
    }
    if (value instanceof Date) {
      return 'DateTime';
    }
    return 'String';
  }

  /**
   * Estimate number of rows
   */
  private estimateRows(plan: QueryPlan): number {
    // Simple heuristic based on time range and granularity
    const start = new Date(plan.timeRange.start);
    const end = new Date(plan.timeRange.end);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const granularityMultiplier: Record<string, number> = {
      hour: 24,
      day: 1,
      week: 1 / 7,
      month: 1 / 30,
      quarter: 1 / 90,
      year: 1 / 365,
    };

    const multiplier = granularityMultiplier[plan.timeRange.granularity] || 1;
    let estimatedRows = daysDiff * multiplier;

    // Multiply by number of dimensions
    if (plan.dimensions.length > 0) {
      estimatedRows *= Math.pow(10, plan.dimensions.length);
    }

    // Cap at limit
    const limit = plan.limit || 1000;
    return Math.min(Math.round(estimatedRows), limit);
  }
}
