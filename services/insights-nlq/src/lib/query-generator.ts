/**
 * Query Generator - Converts intent + slots to safe SQL/CHQL
 *
 * This is the core NLQ→SQL conversion engine with safety guarantees:
 * - Template-based generation (no arbitrary SQL)
 * - Tenant isolation enforcement (companyId filter)
 * - Parameter sanitization (injection prevention)
 * - 12-point safety validation (before execution)
 */

import { IntentClassification, QueryParameters } from '../types/intent.js';
import { MetricTemplate, getTemplate } from '../templates/metric-catalog.js';
import {
  renderTemplate,
  calculateDateRange,
  validateRenderedSql,
  TemplateContext,
} from './template-renderer.js';
import { generateQueryPreview, QueryPreview } from './query-preview.js';
import { SafetyGuardrails } from '../validators/safety-guardrails.js';

export interface QueryGenerationResult {
  sql: string;
  chql?: string;
  preview: string;
  detailedPreview: QueryPreview;
  templateId: string;
  parameters: QueryParameters;
  estimatedComplexity: 'low' | 'medium' | 'high';
  cacheTtl: number;
  safetyValidation: {
    passed: boolean;
    violations: string[];
  };
}

export interface QueryGenerationOptions {
  companyId: string;
  defaultLimit?: number;
  validateSafety?: boolean;
}

/**
 * Generate a safe SQL/CHQL query from intent classification
 *
 * @param intent - Classified intent with slots and parameters
 * @param options - Company ID and generation options
 * @returns Complete query generation result with safety validation
 */
export async function generateQuery(
  intent: IntentClassification,
  options: QueryGenerationOptions
): Promise<QueryGenerationResult> {
  const { companyId, defaultLimit = 100, validateSafety = true } = options;

  // Step 1: Match template
  const template = getTemplate(intent.templateId);
  if (!template) {
    throw new Error(`Unknown template ID: ${intent.templateId}`);
  }

  // Step 2: Build query parameters
  const parameters = buildQueryParameters(intent, companyId, defaultLimit);

  // Step 3: Validate parameters against template constraints
  validateParameters(parameters, template);

  // Step 4: Render SQL template
  const sqlContext = buildTemplateContext(parameters);
  const sqlResult = renderTemplate(template.sqlTemplate, sqlContext);

  // Step 5: Render CHQL template (if available)
  let chql: string | undefined;
  if (template.chqlTemplate) {
    const chqlResult = renderTemplate(template.chqlTemplate, sqlContext);
    chql = chqlResult.sql;
  }

  // Step 6: Validate rendered SQL against template schema
  const expectedTables = extractExpectedTables(template);
  validateRenderedSql(sqlResult.sql, expectedTables);

  // Step 7: Run 12-point safety validation
  let safetyValidation = { passed: true, violations: [] as string[] };
  if (validateSafety) {
    const safetyResult = await SafetyGuardrails.validate(sqlResult.sql, {
      companyId,
      templateId: template.id,
      allowedTables: expectedTables,
      allowedJoins: template.allowedJoins,
    });

    safetyValidation = {
      passed: safetyResult.passed,
      violations: safetyResult.violations,
    };

    if (!safetyResult.passed) {
      throw new Error(
        `Safety validation failed: ${safetyResult.violations.join(', ')}\n` +
        `Violations:\n${safetyResult.checks.filter(c => !c.passed).map(c => `- ${c.details}`).join('\n')}`
      );
    }
  }

  // Step 8: Generate query preview
  const detailedPreview = generateQueryPreview(template, parameters);
  const preview = detailedPreview.description;

  return {
    sql: sqlResult.sql,
    chql,
    preview,
    detailedPreview,
    templateId: template.id,
    parameters,
    estimatedComplexity: template.estimatedComplexity,
    cacheTtl: template.cacheTtlSeconds,
    safetyValidation,
  };
}

/**
 * Build query parameters from intent classification
 */
function buildQueryParameters(
  intent: IntentClassification,
  companyId: string,
  defaultLimit: number
): QueryParameters {
  // Calculate date range
  let startDate: string;
  let endDate: string;

  if (intent.timeRange) {
    if (intent.timeRange.type === 'custom') {
      if (!intent.timeRange.startDate || !intent.timeRange.endDate) {
        throw new Error('Custom time range requires startDate and endDate');
      }
      startDate = intent.timeRange.startDate;
      endDate = intent.timeRange.endDate;
    } else {
      const range = calculateDateRange(intent.timeRange.type);
      startDate = range.startDate;
      endDate = range.endDate;
    }
  } else {
    // Default to last 30 days
    const range = calculateDateRange('last_30d');
    startDate = range.startDate;
    endDate = range.endDate;
  }

  // Build parameters object
  const parameters: QueryParameters = {
    companyId,
    startDate,
    endDate,
    limit: intent.limit || defaultLimit,
  };

  // Add group by
  if (intent.groupBy) {
    parameters.groupBy = intent.groupBy;
  }

  // Add filters
  if (intent.filters) {
    parameters.filters = intent.filters;
  }

  // Add any additional slots as parameters
  for (const slot of intent.slots) {
    if (!parameters[slot.name]) {
      parameters[slot.name] = slot.value;
    }
  }

  return parameters;
}

/**
 * Validate parameters against template constraints
 */
function validateParameters(parameters: QueryParameters, template: MetricTemplate): void {
  // Validate time window
  const startDate = new Date(parameters.startDate);
  const endDate = new Date(parameters.endDate);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > template.maxTimeWindowDays) {
    throw new Error(
      `Time window exceeds template limit: ${daysDiff} days (max: ${template.maxTimeWindowDays})`
    );
  }

  // Validate row limit
  if (parameters.limit > template.maxResultRows) {
    throw new Error(
      `Result limit exceeds template limit: ${parameters.limit} (max: ${template.maxResultRows})`
    );
  }

  // Validate group by fields
  if (parameters.groupBy && template.allowedGroupBy) {
    for (const field of parameters.groupBy) {
      if (!template.allowedGroupBy.includes(field as any)) {
        throw new Error(
          `Invalid group by field: ${field}. Allowed: ${template.allowedGroupBy.join(', ')}`
        );
      }
    }
  }

  // Validate filters
  if (parameters.filters && template.allowedFilters) {
    for (const [key, value] of Object.entries(parameters.filters)) {
      const allowedValues = template.allowedFilters[key];
      if (!allowedValues) {
        throw new Error(`Invalid filter field: ${key}`);
      }
      if (!allowedValues.includes(value)) {
        throw new Error(
          `Invalid filter value for ${key}: ${value}. Allowed: ${allowedValues.join(', ')}`
        );
      }
    }
  }

  // Ensure tenant filter is required
  if (template.requiresTenantFilter && !parameters.companyId) {
    throw new Error('Template requires tenant filter (companyId) but none provided');
  }
}

/**
 * Build template context for rendering
 */
function buildTemplateContext(parameters: QueryParameters): TemplateContext {
  const context: TemplateContext = {
    companyId: parameters.companyId,
    startDate: parameters.startDate,
    endDate: parameters.endDate,
    limit: parameters.limit,
  };

  // Add all other parameters
  for (const [key, value] of Object.entries(parameters)) {
    if (!context[key] && value !== undefined) {
      context[key] = value;
    }
  }

  return context;
}

/**
 * Extract expected tables from template
 */
function extractExpectedTables(template: MetricTemplate): string[] {
  const tables = new Set<string>();

  // Extract FROM and JOIN tables from SQL template
  const fromPattern = /\bfrom\s+(\w+)/gi;
  const joinPattern = /\bjoin\s+(\w+)/gi;

  let match;
  while ((match = fromPattern.exec(template.sqlTemplate)) !== null) {
    tables.add(match[1].toLowerCase());
  }

  while ((match = joinPattern.exec(template.sqlTemplate)) !== null) {
    tables.add(match[1].toLowerCase());
  }

  return Array.from(tables);
}

/**
 * Validate a query without executing it (dry-run mode)
 */
export async function validateQuery(
  intent: IntentClassification,
  options: QueryGenerationOptions
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    await generateQuery(intent, { ...options, validateSafety: true });
    return { valid: true, errors: [] };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { valid: false, errors };
  }
}

/**
 * Get query cost estimate
 */
export function estimateQueryCost(
  template: MetricTemplate,
  parameters: QueryParameters
): {
  estimatedRows: number;
  estimatedBytes: number;
  estimatedTimeMs: number;
} {
  // Simple heuristic-based estimation
  const daysDiff = Math.ceil(
    (new Date(parameters.endDate).getTime() - new Date(parameters.startDate).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  const complexityMultiplier = {
    low: 1,
    medium: 3,
    high: 10,
  }[template.estimatedComplexity];

  const estimatedRows = Math.min(
    daysDiff * complexityMultiplier * 10,
    parameters.limit
  );

  const estimatedBytes = estimatedRows * 500; // ~500 bytes per row
  const estimatedTimeMs = complexityMultiplier * 50; // Base estimate

  return {
    estimatedRows,
    estimatedBytes,
    estimatedTimeMs,
  };
}
