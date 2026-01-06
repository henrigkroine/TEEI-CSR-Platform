/**
 * Excel (XLSX) Parser - Buddy Program Export Files
 *
 * Parses XLSX workbooks per the canonical export specification.
 * Supports multi-sheet workbooks with one entity type per sheet.
 *
 * @module ingestion-buddy/parsers/excel-parser
 * @agent Agent 8 (buddy-parser-engineer)
 */

import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { createServiceLogger } from '@teei/shared-utils';
import type { BuddyEntityType } from './csv-parser';

const logger = createServiceLogger('ingestion-buddy:excel-parser');

/**
 * XLSX parsing options
 */
export interface ExcelParseOptions {
  filePath: string;
  sheetNames?: string[];       // Parse specific sheets (default: all sheets)
  skipEmptyRows?: boolean;     // Skip empty rows (default: true)
  dateNF?: string;             // Date number format (default: "yyyy-mm-dd")
}

/**
 * Parsed sheet result
 */
export interface ExcelSheetResult<T = Record<string, any>> {
  sheetName: string;
  entityType: BuddyEntityType;
  records: T[];
  metadata: {
    rowCount: number;
    columnCount: number;
    headers: string[];
  };
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * XLSX parsing result (multi-sheet)
 */
export interface ExcelParseResult {
  sheets: Record<BuddyEntityType, ExcelSheetResult>;
  workbookMetadata: {
    sheetCount: number;
    totalRows: number;
    sheetNames: string[];
  };
  errors: Array<{
    sheet: string;
    message: string;
  }>;
}

/**
 * Detect entity type from sheet name or headers
 */
function detectEntityType(sheetName: string, headers: string[]): BuddyEntityType {
  // Try sheet name first (case-insensitive)
  const normalizedSheetName = sheetName.toLowerCase().trim();

  if (normalizedSheetName.includes('user')) return 'users';
  if (normalizedSheetName.includes('match')) return 'matches';
  if (normalizedSheetName.includes('attendance')) return 'event_attendance';
  if (normalizedSheetName.includes('event')) return 'events';
  if (normalizedSheetName.includes('skill')) return 'skill_sessions';
  if (normalizedSheetName.includes('checkin') || normalizedSheetName.includes('check-in')) {
    return 'checkins';
  }
  if (normalizedSheetName.includes('feedback')) return 'feedback';
  if (normalizedSheetName.includes('milestone')) return 'milestones';

  // Fallback: detect from headers
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  if (headerSet.has('id') && headerSet.has('email') && headerSet.has('role')) {
    return 'users';
  }

  if (headerSet.has('match_id') && headerSet.has('participant_id') && headerSet.has('buddy_id')) {
    return 'matches';
  }

  if (headerSet.has('event_id') && headerSet.has('event_name') && headerSet.has('event_type')) {
    return 'events';
  }

  if (headerSet.has('attendance_id') && headerSet.has('event_id') && headerSet.has('attended_at')) {
    return 'event_attendance';
  }

  if (headerSet.has('session_id') && headerSet.has('teacher_id') && headerSet.has('learner_id')) {
    return 'skill_sessions';
  }

  if (headerSet.has('checkin_id') && headerSet.has('mood')) {
    return 'checkins';
  }

  if (headerSet.has('feedback_id') && headerSet.has('from_user_id') && headerSet.has('to_user_id')) {
    return 'feedback';
  }

  if (headerSet.has('milestone_id') && headerSet.has('milestone_type')) {
    return 'milestones';
  }

  throw new Error(`Unable to detect entity type from sheet "${sheetName}" (headers: ${headers.join(', ')})`);
}

/**
 * Convert Excel serial date number to ISO 8601 string
 */
function excelSerialToISO(serial: number): string {
  // Excel serial date: days since 1900-01-01 (with 1900 leap year bug)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date = new Date(utc_value * 1000);

  return date.toISOString();
}

/**
 * Transform XLSX cell value to typed value
 */
function transformCellValue(
  value: any,
  header: string,
  cellAddress: string
): any {
  // Null/undefined
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Arrays (JSON strings in cells)
  if (header === 'interests' || header === 'participants' || header === 'categories') {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback: split by comma
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return value;
  }

  // Objects (JSON strings in cells)
  if (
    header === 'metadata' ||
    header === 'location_details' ||
    header === 'feedback_categories' ||
    header === 'skill_details' ||
    header === 'call_metadata'
  ) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {
        // Invalid JSON
      }
    }
    return value;
  }

  // Booleans
  if (
    header === 'is_organizer' ||
    header === 'is_virtual' ||
    header === 'is_recurring' ||
    header === 'is_mandatory' ||
    header === 'allow_anonymous'
  ) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return false;
  }

  // Dates (Excel serial dates)
  if (
    header.endsWith('_at') ||
    header.endsWith('_date') ||
    header === 'date' ||
    header === 'timestamp'
  ) {
    if (typeof value === 'number') {
      return excelSerialToISO(value);
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      // Already ISO format
      return value;
    }
  }

  // Numbers
  if (
    header === 'duration_minutes' ||
    header === 'max_participants' ||
    header === 'duration_days' ||
    header === 'sessions_completed' ||
    header === 'events_attended' ||
    header === 'session_number' ||
    header === 'skill_level' ||
    header === 'rating'
  ) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
  }

  // Default: return as-is
  return value;
}

/**
 * Parse a single XLSX sheet into records
 */
function parseSheet<T = Record<string, any>>(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  options: ExcelParseOptions
): ExcelSheetResult<T> {
  const { skipEmptyRows = true } = options;

  const errors: Array<{ row: number; message: string }> = [];

  // Convert sheet to JSON with headers
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // First, get all rows as arrays
    defval: null, // Default value for empty cells
    blankrows: !skipEmptyRows,
  });

  if (rawData.length === 0) {
    return {
      sheetName,
      entityType: 'users', // Placeholder
      records: [],
      metadata: {
        rowCount: 0,
        columnCount: 0,
        headers: [],
      },
      errors: [{ row: 0, message: 'Empty sheet (no data rows)' }],
    };
  }

  // Extract headers (first row)
  const headers: string[] = rawData[0] as string[];
  const dataRows = rawData.slice(1);

  // Detect entity type
  let entityType: BuddyEntityType;
  try {
    entityType = detectEntityType(sheetName, headers);
  } catch (err: any) {
    return {
      sheetName,
      entityType: 'users', // Placeholder
      records: [],
      metadata: {
        rowCount: 0,
        columnCount: headers.length,
        headers,
      },
      errors: [{ row: 0, message: err.message }],
    };
  }

  // Transform rows to records
  const records: T[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // Excel row number (1-indexed, +1 for header)

    try {
      const record: Record<string, any> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const cellValue = row[j];
        const cellAddress = XLSX.utils.encode_cell({ r: rowNum - 1, c: j });

        record[header] = transformCellValue(cellValue, header, cellAddress);
      }

      records.push(record as T);
    } catch (err: any) {
      errors.push({ row: rowNum, message: `Row transformation error: ${err.message}` });
    }
  }

  return {
    sheetName,
    entityType,
    records,
    metadata: {
      rowCount: records.length,
      columnCount: headers.length,
      headers,
    },
    errors,
  };
}

/**
 * Parse XLSX workbook into multiple entity types
 *
 * @param options - Excel parsing options
 * @returns Parsed sheets with metadata
 */
export async function parseExcelFile(
  options: ExcelParseOptions
): Promise<ExcelParseResult> {
  const { filePath, sheetNames } = options;

  logger.info({ filePath }, 'Parsing Buddy XLSX export file');

  try {
    // Read file
    const fileBuffer = await readFile(filePath);

    // Parse workbook
    const workbook = XLSX.read(fileBuffer, {
      type: 'buffer',
      cellDates: true, // Parse dates as Date objects
      dateNF: options.dateNF || 'yyyy-mm-dd',
    });

    // Get sheet names to parse
    const targetSheets = sheetNames || workbook.SheetNames;
    const sheets: Record<BuddyEntityType, ExcelSheetResult> = {} as any;
    const workbookErrors: Array<{ sheet: string; message: string }> = [];
    let totalRows = 0;

    // Parse each sheet
    for (const sheetName of targetSheets) {
      if (!workbook.Sheets[sheetName]) {
        workbookErrors.push({ sheet: sheetName, message: 'Sheet not found in workbook' });
        continue;
      }

      try {
        const sheetResult = parseSheet(workbook.Sheets[sheetName], sheetName, options);

        sheets[sheetResult.entityType] = sheetResult;
        totalRows += sheetResult.metadata.rowCount;

        if (sheetResult.errors.length > 0) {
          logger.warn(
            { sheetName, errorCount: sheetResult.errors.length },
            'Sheet parsing completed with errors'
          );
        }
      } catch (err: any) {
        workbookErrors.push({ sheet: sheetName, message: `Sheet parsing failed: ${err.message}` });
      }
    }

    logger.info(
      { sheetCount: Object.keys(sheets).length, totalRows },
      'XLSX parsing complete'
    );

    return {
      sheets,
      workbookMetadata: {
        sheetCount: targetSheets.length,
        totalRows,
        sheetNames: targetSheets,
      },
      errors: workbookErrors,
    };
  } catch (err: any) {
    throw new Error(`XLSX parsing failed: ${err.message}`);
  }
}

/**
 * Parse a single sheet from an XLSX workbook
 *
 * Useful when you know the exact sheet name and entity type
 */
export async function parseExcelSheet<T = Record<string, any>>(
  options: ExcelParseOptions & { sheetName: string }
): Promise<ExcelSheetResult<T>> {
  const result = await parseExcelFile({ ...options, sheetNames: [options.sheetName] });

  const entityTypes = Object.keys(result.sheets) as BuddyEntityType[];
  if (entityTypes.length === 0) {
    throw new Error(`Sheet "${options.sheetName}" not found or parsing failed`);
  }

  return result.sheets[entityTypes[0]] as ExcelSheetResult<T>;
}
