/**
 * Query Guards - plan-safety-verifier
 * Allow/deny lists, cost caps, time limits, and PII protection
 */

import { z } from 'zod';

/**
 * SQL/CHQL Allow Lists
 */
export const ALLOWED_FUNCTIONS = new Set([
  // Aggregations
  'sum',
  'avg',
  'count',
  'min',
  'max',
  'median',
  'quantile',
  'stddevPop',
  'stddevSamp',
  'varPop',
  'varSamp',

  // Date/Time
  'toStartOfDay',
  'toStartOfWeek',
  'toStartOfMonth',
  'toStartOfQuarter',
  'toStartOfYear',
  'toDate',
  'toDateTime',
  'formatDateTime',
  'dateDiff',
  'dateAdd',

  // String
  'lower',
  'upper',
  'substring',
  'concat',
  'length',
  'trim',
  'replace',

  // Math
  'round',
  'floor',
  'ceil',
  'abs',
  'pow',
  'sqrt',

  // Conditional
  'if',
  'multiIf',
  'case',
  'coalesce',

  // Array (limited)
  'arrayJoin',
  'arrayElement',
  'has',
  'length',
]);

export const ALLOWED_OPERATORS = new Set([
  '=',
  '!=',
  '<>',
  '>',
  '<',
  '>=',
  '<=',
  'IN',
  'NOT IN',
  'LIKE',
  'NOT LIKE',
  'BETWEEN',
  'AND',
  'OR',
  'NOT',
  'IS NULL',
  'IS NOT NULL',
]);

export const ALLOWED_CLAUSES = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'JOIN',
  'LEFT JOIN',
  'INNER JOIN',
]);

/**
 * Deny Lists - Blocked operations
 */
export const DENIED_FUNCTIONS = new Set([
  // System functions
  'system',
  'file',
  'url',
  'remote',
  'mysql',
  'postgresql',
  'odbc',
  'jdbc',

  // Dangerous functions
  'exec',
  'shell',
  'python',
  'runScript',

  // Network functions
  'http',
  'https',
  'ftp',
  'addressToLine',
  'addressToSymbol',

  // File I/O
  'readFile',
  'writeFile',
  'input',
  'output',
]);

export const DENIED_KEYWORDS = new Set([
  'DROP',
  'DELETE',
  'TRUNCATE',
  'INSERT',
  'UPDATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXECUTE',
  'CALL',
  'EXEC',
  'SCRIPT',
  'INTO OUTFILE',
  'LOAD DATA',
  'UNION', // Prevent union-based injection
  'WAITFOR', // SQL injection
  'SLEEP',
  'BENCHMARK',
]);

/**
 * Cost and Time Budgets
 */
export const QueryBudgetsSchema = z.object({
  maxExecutionTimeMs: z.number().default(5000), // 5s default
  maxMemoryBytes: z.number().default(1024 * 1024 * 100), // 100MB
  maxRowsScanned: z.number().default(1_000_000),
  maxRowsReturned: z.number().default(10_000),
  maxJoins: z.number().default(3),
  maxSubqueries: z.number().default(2),
  maxGroupByDimensions: z.number().default(5),
  maxCostPoints: z.number().default(100), // Weighted cost
  maxConcurrentQueries: z.number().default(5), // Per tenant
});

export type QueryBudgets = z.infer<typeof QueryBudgetsSchema>;

export const DEFAULT_BUDGETS: QueryBudgets = {
  maxExecutionTimeMs: 5000,
  maxMemoryBytes: 1024 * 1024 * 100,
  maxRowsScanned: 1_000_000,
  maxRowsReturned: 10_000,
  maxJoins: 3,
  maxSubqueries: 2,
  maxGroupByDimensions: 5,
  maxCostPoints: 100,
  maxConcurrentQueries: 5,
};

// Enterprise tier gets higher limits
export const ENTERPRISE_BUDGETS: QueryBudgets = {
  maxExecutionTimeMs: 15000,
  maxMemoryBytes: 1024 * 1024 * 500,
  maxRowsScanned: 10_000_000,
  maxRowsReturned: 50_000,
  maxJoins: 5,
  maxSubqueries: 3,
  maxGroupByDimensions: 10,
  maxCostPoints: 500,
  maxConcurrentQueries: 20,
};

/**
 * PII Protection Rules
 */
export const PII_FIELDS = new Set([
  'email',
  'employee_email',
  'donor_email',
  'participant_email',
  'phone',
  'phone_number',
  'ssn',
  'social_security',
  'tax_id',
  'passport',
  'drivers_license',
  'address',
  'street_address',
  'ip_address',
  'employee_name',
  'donor_name',
  'participant_name',
  'first_name',
  'last_name',
  'full_name',
  'employee_id', // Can be PII in some contexts
  'donor_id',
  'participant_id',
]);

export const PII_REDACTION_RULES = {
  email: (val: string) => val.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
  phone: (val: string) => val.replace(/\d(?=\d{4})/g, '*'),
  name: (val: string) => val.split(' ').map((n, i) => i === 0 ? n : n[0] + '***').join(' '),
  id: (val: string) => val.slice(0, 4) + '***',
  default: () => '[REDACTED]',
};

/**
 * Validate query against deny list
 */
export function validateNoDeniedKeywords(sql: string): { valid: boolean; violations: string[] } {
  const upperSql = sql.toUpperCase();
  const violations: string[] = [];

  for (const keyword of DENIED_KEYWORDS) {
    if (upperSql.includes(keyword)) {
      violations.push(keyword);
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate function calls
 */
export function validateFunctions(sql: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Extract function calls (simplified regex)
  const functionPattern = /(\w+)\s*\(/g;
  let match;

  while ((match = functionPattern.exec(sql)) !== null) {
    const funcName = match[1].toLowerCase();

    if (DENIED_FUNCTIONS.has(funcName)) {
      violations.push(`Denied function: ${funcName}`);
    } else if (!ALLOWED_FUNCTIONS.has(funcName)) {
      violations.push(`Unknown function: ${funcName}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Check if field contains PII
 */
export function isPiiField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  return PII_FIELDS.has(normalized);
}

/**
 * Redact PII value
 */
export function redactPiiValue(fieldName: string, value: any): any {
  if (value === null || value === undefined) return value;

  const normalized = fieldName.toLowerCase();

  if (normalized.includes('email') && PII_REDACTION_RULES.email) {
    return PII_REDACTION_RULES.email(String(value));
  }
  if (normalized.includes('phone') && PII_REDACTION_RULES.phone) {
    return PII_REDACTION_RULES.phone(String(value));
  }
  if (normalized.includes('name') && PII_REDACTION_RULES.name) {
    return PII_REDACTION_RULES.name(String(value));
  }
  if (normalized.includes('_id') && PII_REDACTION_RULES.id) {
    return PII_REDACTION_RULES.id(String(value));
  }

  return PII_REDACTION_RULES.default();
}

/**
 * Rate limiting - per tenant query budget
 */
export interface TenantQueryBudget {
  tenantId: string;
  currentQueries: number;
  totalQueriesLastHour: number;
  totalCostPointsLastHour: number;
  maxQueriesPerHour: number;
  maxCostPointsPerHour: number;
}

export function checkTenantBudget(budget: TenantQueryBudget): { allowed: boolean; reason?: string } {
  if (budget.currentQueries >= DEFAULT_BUDGETS.maxConcurrentQueries) {
    return { allowed: false, reason: 'Max concurrent queries exceeded' };
  }

  if (budget.totalQueriesLastHour >= budget.maxQueriesPerHour) {
    return { allowed: false, reason: 'Hourly query limit exceeded' };
  }

  if (budget.totalCostPointsLastHour >= budget.maxCostPointsPerHour) {
    return { allowed: false, reason: 'Hourly cost budget exceeded' };
  }

  return { allowed: true };
}
