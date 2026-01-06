/**
 * Template Renderer - Mustache-style template rendering with security
 *
 * Features:
 * - {{placeholder}} replacement with sanitized values
 * - Date math (e.g., last_30d → actual dates)
 * - SQL injection prevention through parameterization
 * - Type-safe value conversion (strings, numbers, dates)
 */

import { QueryParameters } from '../types/intent.js';

export interface TemplateContext {
  companyId: string;
  startDate: string;
  endDate: string;
  limit: number;
  [key: string]: string | number | string[] | undefined;
}

export interface RenderResult {
  sql: string;
  parameters: Record<string, any>;
  sanitized: boolean;
}

/**
 * Calculate date ranges from shorthand notation
 */
export function calculateDateRange(
  timeRange: 'last_7d' | 'last_30d' | 'last_90d' | 'last_quarter' | 'ytd' | 'last_year' | 'custom',
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = formatDate(now);

  let startDate: string;

  switch (timeRange) {
    case 'last_7d':
      startDate = formatDate(subtractDays(now, 7));
      break;

    case 'last_30d':
      startDate = formatDate(subtractDays(now, 30));
      break;

    case 'last_90d':
      startDate = formatDate(subtractDays(now, 90));
      break;

    case 'last_quarter':
      startDate = formatDate(getQuarterStart(now, -1));
      break;

    case 'ytd':
      startDate = formatDate(getYearStart(now));
      break;

    case 'last_year':
      startDate = formatDate(getYearStart(subtractYears(now, 1)));
      break;

    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires startDate and endDate');
      }
      return { startDate: customStart, endDate: customEnd };

    default:
      throw new Error(`Unknown time range: ${timeRange}`);
  }

  return { startDate, endDate };
}

/**
 * Render a SQL template with parameters
 */
export function renderTemplate(template: string, context: TemplateContext): RenderResult {
  const parameters: Record<string, any> = {};
  let sanitized = true;

  // Extract all {{placeholders}}
  const placeholderPattern = /\{\{(\w+)\}\}/g;
  let rendered = template;

  const matches = template.matchAll(placeholderPattern);
  for (const match of matches) {
    const placeholder = match[1];
    const value = context[placeholder];

    if (value === undefined) {
      throw new Error(`Missing required parameter: ${placeholder}`);
    }

    // Sanitize and convert value
    const sanitizedValue = sanitizeValue(value, placeholder);
    parameters[placeholder] = value; // Store original value

    // Replace placeholder with sanitized value
    rendered = rendered.replace(`{{${placeholder}}}`, sanitizedValue);
  }

  // Strip template comments (lines starting with --)
  rendered = rendered
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  // Normalize whitespace
  rendered = rendered.replace(/\s+/g, ' ').trim();

  return {
    sql: rendered,
    parameters,
    sanitized,
  };
}

/**
 * Sanitize a value for SQL injection prevention
 */
function sanitizeValue(value: string | number | string[] | undefined, paramName: string): string {
  if (value === undefined || value === null) {
    throw new Error(`Cannot sanitize undefined/null value for parameter: ${paramName}`);
  }

  // Handle arrays (for IN clauses)
  if (Array.isArray(value)) {
    return value.map(v => sanitizeSingleValue(v, paramName)).join(', ');
  }

  return sanitizeSingleValue(value, paramName);
}

/**
 * Sanitize a single value
 */
function sanitizeSingleValue(value: string | number, paramName: string): string {
  // Numbers: validate and return as-is
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid number for parameter ${paramName}: ${value}`);
    }
    return String(value);
  }

  // Strings: validate format based on parameter type
  const strValue = String(value);

  // UUID validation for companyId
  if (paramName === 'companyId' || paramName.endsWith('Id')) {
    if (!isValidUuid(strValue)) {
      throw new Error(`Invalid UUID for parameter ${paramName}: ${strValue}`);
    }
    return `'${strValue}'`;
  }

  // Date validation for date parameters
  if (paramName.includes('Date') || paramName.includes('date')) {
    if (!isValidDate(strValue)) {
      throw new Error(`Invalid date for parameter ${paramName}: ${strValue}`);
    }
    return `'${strValue}'`;
  }

  // Enum validation for specific parameters
  if (paramName === 'cohortType') {
    const validCohorts = ['industry', 'region', 'company_size'];
    if (!validCohorts.includes(strValue)) {
      throw new Error(`Invalid cohort type: ${strValue}. Must be one of: ${validCohorts.join(', ')}`);
    }
    return `'${strValue}'`;
  }

  // General string: escape single quotes and wrap
  const escaped = strValue.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Validate UUID format
 */
function isValidUuid(value: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value);
}

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
function isValidDate(value: string): boolean {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Subtract days from a date
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Subtract years from a date
 */
function subtractYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

/**
 * Get the start of a quarter (offset by quarters)
 */
function getQuarterStart(date: Date, quarterOffset: number = 0): Date {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3);
  const targetQuarter = quarter + quarterOffset;

  const year = date.getFullYear() + Math.floor(targetQuarter / 4);
  const quarterMonth = ((targetQuarter % 4) + 4) % 4;

  return new Date(year, quarterMonth * 3, 1);
}

/**
 * Get the start of a year
 */
function getYearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Validate rendered SQL against template schema
 */
export function validateRenderedSql(sql: string, expectedTables: string[]): boolean {
  const sqlLower = sql.toLowerCase();

  // Ensure no double-substitution ({{}} should be gone)
  if (/\{\{.*\}\}/.test(sql)) {
    throw new Error('Template rendering incomplete: placeholders remain');
  }

  // Ensure expected tables are present
  for (const table of expectedTables) {
    const tablePattern = new RegExp(`\\bfrom\\s+${table}\\b|\\bjoin\\s+${table}\\b`, 'i');
    if (!tablePattern.test(sql)) {
      throw new Error(`Expected table ${table} not found in rendered SQL`);
    }
  }

  // Ensure no obvious injection patterns
  const injectionPatterns = [
    /;\s*drop\s+/i,
    /;\s*delete\s+/i,
    /;\s*update\s+/i,
    /union\s+select/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sql)) {
      throw new Error(`Potential SQL injection detected: ${pattern.source}`);
    }
  }

  return true;
}
