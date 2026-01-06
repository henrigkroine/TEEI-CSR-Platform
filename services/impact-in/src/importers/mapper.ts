/**
 * Mapping Engine
 * Applies field mappings and transform rules to convert raw rows to event contracts
 */

import {
  MappingConfig,
  FieldMapping,
  TransformRule,
  TransformRuleType,
} from '@teei/shared-types';

/**
 * Apply mapping configuration to a row
 */
export function applyMapping(
  row: Record<string, unknown>,
  config: MappingConfig
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  // Apply field mappings
  for (const fieldMapping of config.fieldMappings) {
    const value = applyFieldMapping(row, fieldMapping);
    if (value !== undefined) {
      mapped[fieldMapping.targetField] = value;
    }
  }

  // Apply default values for unmapped fields
  if (config.defaultValues) {
    for (const [key, value] of Object.entries(config.defaultValues)) {
      if (mapped[key] === undefined) {
        mapped[key] = value;
      }
    }
  }

  // Apply filter conditions
  if (config.filterConditions) {
    const passes = config.filterConditions.every((condition) =>
      evaluateFilterCondition(row, condition)
    );
    if (!passes) {
      return {}; // Row filtered out
    }
  }

  return mapped;
}

/**
 * Apply a single field mapping
 */
function applyFieldMapping(
  row: Record<string, unknown>,
  mapping: FieldMapping
): unknown {
  const sourceValue = row[mapping.sourceColumn];

  // If no transform, return source value directly
  if (!mapping.transform) {
    return sourceValue;
  }

  // Apply transform rule
  return applyTransform(row, mapping.transform);
}

/**
 * Apply a transform rule
 */
function applyTransform(row: Record<string, unknown>, rule: TransformRule): unknown {
  const { type, sourceColumns, config } = rule;

  switch (type) {
    case 'direct':
      return sourceColumns.length > 0 ? row[sourceColumns[0]] : undefined;

    case 'constant':
      return config?.value;

    case 'concat': {
      const separator = (config?.separator as string) || ' ';
      const values = sourceColumns.map((col) => row[col]).filter((v) => v != null);
      return values.join(separator);
    }

    case 'split': {
      const delimiter = (config?.delimiter as string) || ',';
      const index = (config?.index as number) || 0;
      const value = sourceColumns.length > 0 ? row[sourceColumns[0]] : undefined;
      if (typeof value === 'string') {
        const parts = value.split(delimiter);
        return parts[index] || '';
      }
      return value;
    }

    case 'lookup': {
      // Simplified lookup - in production would query a lookup table
      const key = sourceColumns.length > 0 ? row[sourceColumns[0]] : undefined;
      const lookupTable = config?.table as Record<string, unknown>;
      return lookupTable?.[String(key)] || key;
    }

    case 'formula': {
      // Safe formula evaluation - limited subset only
      const expression = config?.expression as string;
      return evaluateSafeFormula(expression, row, sourceColumns);
    }

    case 'dateFormat': {
      const inputFormat = config?.inputFormat as string;
      const outputFormat = config?.outputFormat as string;
      const value = sourceColumns.length > 0 ? row[sourceColumns[0]] : undefined;
      return convertDateFormat(String(value), inputFormat, outputFormat);
    }

    case 'currencyConvert': {
      const value = sourceColumns.length > 0 ? row[sourceColumns[0]] : undefined;
      const rate = (config?.rate as number) || 1;
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(numValue) ? value : numValue * rate;
    }

    case 'coalesce': {
      for (const col of sourceColumns) {
        const value = row[col];
        if (value != null && value !== '') {
          return value;
        }
      }
      return undefined;
    }

    default:
      throw new Error(`Unsupported transform type: ${type}`);
  }
}

/**
 * Evaluate filter condition
 */
function evaluateFilterCondition(
  row: Record<string, unknown>,
  condition: { column: string; operator: string; value: unknown }
): boolean {
  const { column, operator, value } = condition;
  const cellValue = row[column];

  switch (operator) {
    case 'eq':
      return cellValue === value;
    case 'neq':
      return cellValue !== value;
    case 'gt':
      return Number(cellValue) > Number(value);
    case 'gte':
      return Number(cellValue) >= Number(value);
    case 'lt':
      return Number(cellValue) < Number(value);
    case 'lte':
      return Number(cellValue) <= Number(value);
    case 'contains':
      return String(cellValue).includes(String(value));
    case 'regex':
      return new RegExp(String(value)).test(String(cellValue));
    default:
      return true;
  }
}

/**
 * Evaluate safe formula (limited subset)
 */
function evaluateSafeFormula(
  expression: string,
  row: Record<string, unknown>,
  sourceColumns: string[]
): unknown {
  // Only allow basic arithmetic operations
  const safeExpression = expression.replace(/[^0-9+\-*/(). ]/g, '');

  // Replace column references (col1, col2, etc.)
  let evalExpression = safeExpression;
  sourceColumns.forEach((col, idx) => {
    const colRef = `col${idx + 1}`;
    const value = row[col];
    evalExpression = evalExpression.replace(new RegExp(colRef, 'g'), String(value));
  });

  try {
    // Use Function constructor for safer eval
    const func = new Function('return ' + evalExpression);
    return func();
  } catch (error) {
    return undefined;
  }
}

/**
 * Convert date format (simplified)
 */
function convertDateFormat(
  value: string,
  inputFormat: string,
  outputFormat: string
): string {
  // Simplified date conversion - in production would use date-fns or similar
  try {
    const date = parseDate(value, inputFormat);
    return formatDate(date, outputFormat);
  } catch (error) {
    return value;
  }
}

/**
 * Parse date from string (simplified)
 */
function parseDate(value: string, format: string): Date {
  // Handle ISO format
  if (format === 'YYYY-MM-DDTHH:mm:ss' || format === 'YYYY-MM-DD') {
    return new Date(value);
  }

  // Handle MM/DD/YYYY
  if (format === 'MM/DD/YYYY') {
    const [month, day, year] = value.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  // Handle DD-MM-YYYY
  if (format === 'DD-MM-YYYY') {
    const [day, month, year] = value.split('-');
    return new Date(`${year}-${month}-${day}`);
  }

  return new Date(value);
}

/**
 * Format date to string (simplified)
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }

  if (format === 'YYYY-MM-DDTHH:mm:ss') {
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }

  if (format === 'DD-MM-YYYY') {
    return `${day}-${month}-${year}`;
  }

  return date.toISOString();
}
