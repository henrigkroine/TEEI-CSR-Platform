/**
 * Buddy Program Export Parsers - Unified Entry Point
 *
 * Auto-detects file format (CSV/JSON/XLSX) and parses accordingly.
 * Provides a unified interface for all parser types.
 *
 * @module ingestion-buddy/parsers
 * @agent Agent 8 (buddy-parser-engineer)
 */

import { extname } from 'path';
import { createServiceLogger } from '@teei/shared-utils';

// Export all parser modules
export * from './csv-parser';
export * from './json-parser';
export * from './excel-parser';

// Import parsers
import { parseCsvFile, type CsvParseResult, type BuddyEntityType } from './csv-parser';
import {
  parseJsonFileAuto,
  isSingleEntityResult,
  isMultiEntityResult,
  type JsonParseResult,
  type JsonParseResultMulti,
} from './json-parser';
import { parseExcelFile, type ExcelParseResult } from './excel-parser';

const logger = createServiceLogger('ingestion-buddy:parsers');

/**
 * Unified parsing options
 */
export interface ParseOptions {
  filePath: string;
  format?: 'csv' | 'json' | 'xlsx' | 'auto'; // Auto-detect if not specified
  validateMetadata?: boolean; // For JSON exports (default: true)
  skipEmptyLines?: boolean; // For CSV/XLSX (default: true)
  strict?: boolean; // Strict parsing (default: true)
}

/**
 * Unified parse result (discriminated union)
 */
export type ParseResult = CsvParseResult | JsonParseResult | JsonParseResultMulti | ExcelParseResult;

/**
 * Parse result with format metadata
 */
export interface UnifiedParseResult {
  format: 'csv' | 'json' | 'xlsx';
  result: ParseResult;
  filePath: string;
  parsedAt: string; // ISO 8601 timestamp
}

/**
 * Auto-detect file format from extension
 */
function detectFileFormat(filePath: string): 'csv' | 'json' | 'xlsx' {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.csv') return 'csv';
  if (ext === '.json') return 'json';
  if (ext === '.xlsx' || ext === '.xls') return 'xlsx';

  throw new Error(`Unsupported file extension: ${ext} (supported: .csv, .json, .xlsx)`);
}

/**
 * Parse Buddy Program export file (auto-detect format)
 *
 * @param options - Parsing options
 * @returns Unified parse result
 */
export async function parseBuddyExport(
  options: ParseOptions
): Promise<UnifiedParseResult> {
  const { filePath, format = 'auto' } = options;

  // Detect format
  const detectedFormat = format === 'auto' ? detectFileFormat(filePath) : format;

  logger.info({ filePath, format: detectedFormat }, 'Parsing Buddy export file');

  let result: ParseResult;

  try {
    switch (detectedFormat) {
      case 'csv':
        result = await parseCsvFile({
          filePath,
          skipEmptyLines: options.skipEmptyLines,
        });
        break;

      case 'json':
        result = await parseJsonFileAuto({
          filePath,
          validateMetadata: options.validateMetadata,
          strict: options.strict,
        });
        break;

      case 'xlsx':
        result = await parseExcelFile({
          filePath,
          skipEmptyRows: options.skipEmptyLines,
        });
        break;

      default:
        throw new Error(`Unsupported format: ${detectedFormat}`);
    }

    logger.info(
      { filePath, format: detectedFormat },
      'Buddy export parsing complete'
    );

    return {
      format: detectedFormat,
      result,
      filePath,
      parsedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    logger.error(
      { filePath, format: detectedFormat, error: err.message },
      'Buddy export parsing failed'
    );
    throw err;
  }
}

/**
 * Type guards for discriminating parse results
 */

export function isCsvResult(result: ParseResult): result is CsvParseResult {
  return 'entityType' in result && 'records' in result && 'metadata' in result && 'delimiter' in result.metadata;
}

export function isJsonSingleResult(result: ParseResult): result is JsonParseResult {
  return isSingleEntityResult(result as any);
}

export function isJsonMultiResult(result: ParseResult): result is JsonParseResultMulti {
  return isMultiEntityResult(result as any);
}

export function isExcelResult(result: ParseResult): result is ExcelParseResult {
  return 'sheets' in result && 'workbookMetadata' in result;
}

/**
 * Extract all records from any parse result format
 *
 * Normalizes different result structures into a unified format:
 * Record<BuddyEntityType, Array<Record<string, any>>>
 */
export function extractAllRecords(
  result: ParseResult
): Record<BuddyEntityType, Array<Record<string, any>>> {
  const entities: Record<BuddyEntityType, Array<Record<string, any>>> = {
    users: [],
    matches: [],
    events: [],
    event_attendance: [],
    skill_sessions: [],
    checkins: [],
    feedback: [],
    milestones: [],
  };

  if (isCsvResult(result)) {
    // CSV: single entity type
    entities[result.entityType] = result.records;
  } else if (isJsonSingleResult(result)) {
    // JSON single-entity
    entities[result.entityType] = result.records;
  } else if (isJsonMultiResult(result)) {
    // JSON multi-entity
    Object.assign(entities, result.entities);
  } else if (isExcelResult(result)) {
    // Excel: multiple sheets
    for (const [entityType, sheetResult] of Object.entries(result.sheets)) {
      entities[entityType as BuddyEntityType] = sheetResult.records;
    }
  }

  return entities;
}

/**
 * Get total record count from any parse result
 */
export function getTotalRecordCount(result: ParseResult): number {
  if (isCsvResult(result)) {
    return result.records.length;
  } else if (isJsonSingleResult(result)) {
    return result.records.length;
  } else if (isJsonMultiResult(result)) {
    return Object.values(result.entities).reduce((sum, records) => sum + records.length, 0);
  } else if (isExcelResult(result)) {
    return result.workbookMetadata.totalRows;
  }

  return 0;
}

/**
 * Get all errors from any parse result
 */
export function getAllErrors(result: ParseResult): Array<{ context: string; message: string }> {
  const errors: Array<{ context: string; message: string }> = [];

  if (isCsvResult(result)) {
    for (const err of result.errors) {
      errors.push({ context: `Row ${err.row}`, message: err.message });
    }
  } else if (isJsonSingleResult(result)) {
    for (const err of result.errors) {
      errors.push({ context: err.path, message: err.message });
    }
  } else if (isJsonMultiResult(result)) {
    for (const err of result.errors) {
      errors.push({ context: err.path, message: err.message });
    }
  } else if (isExcelResult(result)) {
    for (const err of result.errors) {
      errors.push({ context: `Sheet: ${err.sheet}`, message: err.message });
    }

    // Include sheet-level errors
    for (const [entityType, sheetResult] of Object.entries(result.sheets)) {
      for (const err of sheetResult.errors) {
        errors.push({
          context: `Sheet: ${sheetResult.sheetName}, Row: ${err.row}`,
          message: err.message,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate parse result quality
 *
 * Returns warnings for common issues:
 * - High error rate (>5% of rows)
 * - Empty result (0 records)
 * - Missing expected entity types
 */
export function validateParseQuality(result: ParseResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const totalRecords = getTotalRecordCount(result);
  const allErrors = getAllErrors(result);

  // Check: Empty result
  if (totalRecords === 0) {
    warnings.push('Parse result contains 0 records (empty export file)');
  }

  // Check: High error rate
  if (totalRecords > 0) {
    const errorRate = allErrors.length / totalRecords;
    if (errorRate > 0.05) {
      warnings.push(
        `High error rate: ${(errorRate * 100).toFixed(1)}% of rows failed to parse (${allErrors.length}/${totalRecords})`
      );
    }
  }

  // Check: Missing critical entity types (for multi-entity exports)
  if (isJsonMultiResult(result) || isExcelResult(result)) {
    const entities = extractAllRecords(result);
    if (entities.users.length === 0) {
      warnings.push('Missing users data (users are required for identity resolution)');
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
