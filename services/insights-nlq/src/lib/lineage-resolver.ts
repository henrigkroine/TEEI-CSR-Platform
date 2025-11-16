/**
 * Lineage Resolver - Data Provenance Tracking for NLQ Answers
 *
 * This module provides complete audit trail and lineage tracking for NLQ queries,
 * linking answers back to source data, evidence snippets, and transformations.
 *
 * Key Capabilities:
 * - Tracks all data sources (tables, views, materialized views)
 * - Links to Q2Q evidence snippets for outcome scores
 * - Records query execution metadata and transformations
 * - Creates compliance-ready audit trail
 * - Integrates with existing metricLineage system
 *
 * Usage:
 * ```typescript
 * const resolver = new LineageResolver(db);
 * const lineage = await resolver.resolveLineage({
 *   queryId: '...',
 *   generatedSql: 'SELECT ...',
 *   templateId: 'sroi_ratio',
 *   queryParams: {...},
 *   resultData: [...],
 * });
 * ```
 */

import type { QueryParameters } from '../types/intent.js';

/**
 * Represents a pointer to a specific data source
 */
export interface LineagePointer {
  type: 'table' | 'view' | 'materialized_view' | 'evidence_snippet';
  source: string; // Table/view name
  recordIds?: string[]; // Specific record UUIDs (if available)
  dateRange?: { start: Date; end: Date };
  sampleSize?: number; // Number of records from this source
  evidenceSnippetIds?: string[]; // For Q2Q-linked outcome data
  aggregationType?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'stddev' | 'none';
  metadata?: Record<string, unknown>;
}

/**
 * Complete lineage metadata for a single NLQ query answer
 */
export interface AnswerLineage {
  queryId: string;
  executedAt: Date;
  sources: LineagePointer[];
  transformations: string[]; // SQL operations applied (GROUP BY, JOIN, etc.)
  aggregations: string[]; // Aggregation functions used (AVG, SUM, COUNT, etc.)
  filters: Record<string, unknown>; // Applied filters (companyId, dateRange, etc.)
  joins: string[]; // Tables joined
  rowCount: number; // Number of rows returned
  executionTimeMs: number;

  // Template context
  templateId?: string;
  templateName?: string;

  // Compliance metadata
  tenantIsolationEnforced: boolean;
  piiColumnsAccessed: string[]; // Should always be empty
  safetyChecksPassed: boolean;

  // Downstream lineage
  exportedToReports?: string[]; // Report IDs if answer was exported
  linkedToMetrics?: string[]; // Metric lineage IDs if used in calculations
}

/**
 * Input for lineage resolution
 */
export interface LineageResolutionInput {
  queryId: string;
  generatedSql: string;
  templateId?: string;
  templateName?: string;
  queryParams: QueryParameters;
  resultData: unknown[];
  executionTimeMs: number;
  safetyChecksPassed: boolean;

  // Optional: explicit source tracking
  explicitSources?: LineagePointer[];
}

/**
 * Lineage Resolver Service
 */
export class LineageResolver {
  /**
   * Resolve complete lineage for an NLQ query
   */
  static async resolveLineage(input: LineageResolutionInput): Promise<AnswerLineage> {
    const {
      queryId,
      generatedSql,
      templateId,
      templateName,
      queryParams,
      resultData,
      executionTimeMs,
      safetyChecksPassed,
      explicitSources,
    } = input;

    // Parse SQL to extract lineage components
    const sources = explicitSources || this.extractSources(generatedSql, queryParams);
    const transformations = this.extractTransformations(generatedSql);
    const aggregations = this.extractAggregations(generatedSql);
    const joins = this.extractJoins(generatedSql);
    const filters = this.extractFilters(generatedSql, queryParams);
    const piiColumns = this.detectPiiColumns(generatedSql);

    // Check tenant isolation
    const tenantIsolationEnforced = this.verifyTenantIsolation(generatedSql, queryParams.companyId);

    return {
      queryId,
      executedAt: new Date(),
      sources,
      transformations,
      aggregations,
      joins,
      filters,
      rowCount: resultData.length,
      executionTimeMs,
      templateId,
      templateName,
      tenantIsolationEnforced,
      piiColumnsAccessed: piiColumns,
      safetyChecksPassed,
    };
  }

  /**
   * Extract data sources from SQL query
   */
  private static extractSources(sql: string, params: QueryParameters): LineagePointer[] {
    const sources: LineagePointer[] = [];
    const sqlLower = sql.toLowerCase();

    // Extract FROM clause tables
    const fromPattern = /\bfrom\s+(\w+)/gi;
    let match;
    while ((match = fromPattern.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      sources.push(this.createSourcePointer(tableName, params));
    }

    // Extract JOIN clause tables
    const joinPattern = /\bjoin\s+(\w+)/gi;
    while ((match = joinPattern.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      // Only add if not already in sources
      if (!sources.some(s => s.source === tableName)) {
        sources.push(this.createSourcePointer(tableName, params));
      }
    }

    // Check for evidence snippet references (Q2Q data)
    if (sqlLower.includes('outcome_scores')) {
      // This query uses Q2Q-derived data, add evidence snippet lineage
      sources.push({
        type: 'evidence_snippet',
        source: 'outcome_scores',
        dateRange: params.startDate && params.endDate
          ? { start: new Date(params.startDate), end: new Date(params.endDate) }
          : undefined,
        metadata: {
          q2qDerived: true,
          textType: 'feedback',
        },
      });
    }

    return sources;
  }

  /**
   * Create a lineage pointer for a table/view
   */
  private static createSourcePointer(tableName: string, params: QueryParameters): LineagePointer {
    // Determine source type
    let type: LineagePointer['type'] = 'table';
    if (tableName.endsWith('_mv')) {
      type = 'materialized_view';
    } else if (tableName.includes('view') || tableName.startsWith('v_')) {
      type = 'view';
    }

    const pointer: LineagePointer = {
      type,
      source: tableName,
    };

    // Add date range if available
    if (params.startDate && params.endDate) {
      pointer.dateRange = {
        start: new Date(params.startDate),
        end: new Date(params.endDate),
      };
    }

    return pointer;
  }

  /**
   * Extract SQL transformations (GROUP BY, DISTINCT, etc.)
   */
  private static extractTransformations(sql: string): string[] {
    const transformations: string[] = [];
    const sqlLower = sql.toLowerCase();

    if (sqlLower.includes('group by')) {
      const groupByMatch = sql.match(/group\s+by\s+([\w\s,()]+)/i);
      if (groupByMatch) {
        transformations.push(`GROUP BY ${groupByMatch[1].trim()}`);
      }
    }

    if (sqlLower.includes('order by')) {
      const orderByMatch = sql.match(/order\s+by\s+([\w\s,()]+(?:asc|desc)?)/i);
      if (orderByMatch) {
        transformations.push(`ORDER BY ${orderByMatch[1].trim()}`);
      }
    }

    if (sqlLower.includes('distinct')) {
      transformations.push('DISTINCT');
    }

    if (sqlLower.includes('having')) {
      transformations.push('HAVING clause applied');
    }

    // Date truncation
    const dateTruncMatch = sql.match(/date_trunc\s*\(\s*'(\w+)'/i);
    if (dateTruncMatch) {
      transformations.push(`DATE_TRUNC('${dateTruncMatch[1]}')`);
    }

    return transformations;
  }

  /**
   * Extract aggregation functions used
   */
  private static extractAggregations(sql: string): string[] {
    const aggregations: string[] = [];
    const sqlLower = sql.toLowerCase();

    const aggFunctions = ['avg', 'sum', 'count', 'min', 'max', 'stddev', 'variance'];

    for (const func of aggFunctions) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`, 'gi');
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        // Extract the full aggregation (e.g., "AVG(score)")
        const startPos = match.index;
        const funcName = match[0].replace(/\s*\($/, '');

        // Find closing parenthesis
        let depth = 1;
        let endPos = match.index + match[0].length;
        while (depth > 0 && endPos < sql.length) {
          if (sql[endPos] === '(') depth++;
          if (sql[endPos] === ')') depth--;
          endPos++;
        }

        const aggExpression = sql.substring(startPos, endPos);
        if (!aggregations.includes(aggExpression)) {
          aggregations.push(aggExpression);
        }
      }
    }

    return aggregations;
  }

  /**
   * Extract JOIN operations
   */
  private static extractJoins(sql: string): string[] {
    const joins: string[] = [];
    // More flexible JOIN pattern that handles multi-line conditions
    const joinPattern = /((?:inner|left|right|full|cross)?\s*join)\s+(\w+)(?:\s+(?:as\s+)?(\w+))?\s+on\s+([\w\s.=()]+?)(?=\s+(?:where|group|order|limit|join|$))/gis;

    let match;
    while ((match = joinPattern.exec(sql)) !== null) {
      const joinType = match[1].trim();
      const tableName = match[2];
      const alias = match[3];
      const condition = match[4].trim().replace(/\s+/g, ' ');
      const tableRef = alias ? `${tableName} ${alias}` : tableName;
      joins.push(`${joinType.toUpperCase()} ${tableRef} ON ${condition}`);
    }

    return joins;
  }

  /**
   * Extract applied filters
   */
  private static extractFilters(sql: string, params: QueryParameters): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    // Add query parameters as filters
    if (params.companyId) {
      filters.companyId = params.companyId;
    }

    if (params.startDate && params.endDate) {
      filters.dateRange = {
        start: params.startDate,
        end: params.endDate,
      };
    }

    if (params.groupBy) {
      filters.groupBy = params.groupBy;
    }

    if (params.filters) {
      Object.assign(filters, params.filters);
    }

    if (params.cohortType) {
      filters.cohortType = params.cohortType;
    }

    // Extract WHERE clause conditions
    const whereMatch = sql.match(/where\s+(.*?)(?:group by|order by|limit|$)/is);
    if (whereMatch) {
      filters.whereClause = whereMatch[1].trim().replace(/\s+/g, ' ');
    }

    return filters;
  }

  /**
   * Verify tenant isolation enforcement
   */
  private static verifyTenantIsolation(sql: string, companyId: string): boolean {
    const tenantFilterPattern = new RegExp(`company_id\\s*=\\s*['"]?${companyId}['"]?`, 'i');
    return tenantFilterPattern.test(sql);
  }

  /**
   * Detect any PII columns accessed (should always be empty for safe queries)
   */
  private static detectPiiColumns(sql: string): string[] {
    const piiColumns = [
      'email', 'phone', 'phone_number', 'address', 'street', 'city',
      'postal_code', 'zip_code', 'ssn', 'social_security', 'passport',
      'driver_license', 'date_of_birth', 'dob', 'birth_date',
      'full_name', 'first_name', 'last_name', 'ip_address',
      'credit_card', 'bank_account',
    ];

    const detected: string[] = [];
    const sqlLower = sql.toLowerCase();

    for (const col of piiColumns) {
      const pattern = new RegExp(`\\b${col}\\b`, 'i');
      if (pattern.test(sqlLower)) {
        detected.push(col);
      }
    }

    return detected;
  }

  /**
   * Link NLQ answer to report lineage (for when answers are exported to reports)
   */
  static linkToReport(answerLineage: AnswerLineage, reportId: string): AnswerLineage {
    return {
      ...answerLineage,
      exportedToReports: [
        ...(answerLineage.exportedToReports || []),
        reportId,
      ],
    };
  }

  /**
   * Link NLQ answer to metric lineage (for when answers contribute to metric calculations)
   */
  static linkToMetric(answerLineage: AnswerLineage, metricLineageId: string): AnswerLineage {
    return {
      ...answerLineage,
      linkedToMetrics: [
        ...(answerLineage.linkedToMetrics || []),
        metricLineageId,
      ],
    };
  }

  /**
   * Enrich lineage with evidence snippet IDs for Q2Q-derived data
   * This is called after query execution when we know which evidence snippets contributed
   */
  static enrichWithEvidenceSnippets(
    lineage: AnswerLineage,
    evidenceSnippetIds: string[]
  ): AnswerLineage {
    const enrichedSources = lineage.sources.map(source => {
      if (source.type === 'evidence_snippet') {
        return {
          ...source,
          evidenceSnippetIds,
          sampleSize: evidenceSnippetIds.length,
        };
      }
      return source;
    });

    return {
      ...lineage,
      sources: enrichedSources,
    };
  }

  /**
   * Generate lineage summary for display/logging
   */
  static summarizeLineage(lineage: AnswerLineage): string {
    const parts: string[] = [];

    parts.push(`Query ${lineage.queryId}`);
    parts.push(`Sources: ${lineage.sources.map(s => s.source).join(', ')}`);

    if (lineage.aggregations.length > 0) {
      parts.push(`Aggregations: ${lineage.aggregations.length}`);
    }

    if (lineage.joins.length > 0) {
      parts.push(`Joins: ${lineage.joins.length}`);
    }

    parts.push(`Rows: ${lineage.rowCount}`);
    parts.push(`Execution: ${lineage.executionTimeMs}ms`);

    if (lineage.piiColumnsAccessed.length > 0) {
      parts.push(`⚠️ PII ACCESSED: ${lineage.piiColumnsAccessed.join(', ')}`);
    }

    if (!lineage.tenantIsolationEnforced) {
      parts.push(`⚠️ TENANT ISOLATION NOT ENFORCED`);
    }

    return parts.join(' | ');
  }

  /**
   * Validate lineage for compliance requirements
   */
  static validateLineage(lineage: AnswerLineage): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // MUST have tenant isolation
    if (!lineage.tenantIsolationEnforced) {
      errors.push('Tenant isolation not enforced - critical security violation');
    }

    // MUST NOT access PII
    if (lineage.piiColumnsAccessed.length > 0) {
      errors.push(`PII columns accessed: ${lineage.piiColumnsAccessed.join(', ')}`);
    }

    // MUST have passed safety checks
    if (!lineage.safetyChecksPassed) {
      errors.push('Safety checks did not pass');
    }

    // MUST have at least one source
    if (lineage.sources.length === 0) {
      errors.push('No data sources identified');
    }

    // SHOULD have reasonable execution time
    if (lineage.executionTimeMs > 5000) {
      warnings.push(`Slow query execution: ${lineage.executionTimeMs}ms`);
    }

    // SHOULD have row count limit
    if (lineage.rowCount > 10000) {
      warnings.push(`Large result set: ${lineage.rowCount} rows`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
