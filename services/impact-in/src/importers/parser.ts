/**
 * File Parser & Schema Inference
 * Supports CSV, XLSX, JSON with automatic schema detection
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  FileFormat,
  InferredSchema,
  InferredColumn,
  ColumnType,
} from '@teei/shared-types';

interface ParseOptions {
  buffer: Buffer;
  format: FileFormat;
  fileName: string;
  maxSampleRows?: number;
}

/**
 * Parse file and infer schema
 */
export async function parseAndInferSchema(options: ParseOptions): Promise<InferredSchema> {
  const { buffer, format, maxSampleRows = 1000 } = options;

  switch (format) {
    case 'csv':
      return parseCSV(buffer, maxSampleRows);
    case 'xlsx':
      return parseXLSX(buffer, maxSampleRows);
    case 'json':
      return parseJSON(buffer, maxSampleRows);
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

/**
 * Parse CSV file
 */
function parseCSV(buffer: Buffer, maxSampleRows: number): InferredSchema {
  const csvString = buffer.toString('utf-8');

  // Detect delimiter
  const delimiter = detectCSVDelimiter(csvString);

  // Parse CSV
  const parseResult = Papa.parse(csvString, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Keep as strings for type inference
  });

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0];
    throw new Error(`CSV parsing error: ${firstError.message} at row ${firstError.row}`);
  }

  const rows = parseResult.data as Record<string, unknown>[];
  const columnNames = parseResult.meta.fields || [];

  if (rows.length === 0 || columnNames.length === 0) {
    throw new Error('CSV file is empty or has no columns');
  }

  // Sanitize column names (prevent formula injection)
  const sanitizedColumnNames = columnNames.map(sanitizeColumnName);

  // Infer column types
  const sampleRows = rows.slice(0, Math.min(maxSampleRows, rows.length));
  const columns = sanitizedColumnNames.map((colName, idx) =>
    inferColumnType(colName, sampleRows, columnNames[idx])
  );

  return {
    columns,
    rowCount: rows.length,
    delimiter,
    encoding: 'utf-8',
    hasHeader: true,
    inferredAt: new Date().toISOString(),
  };
}

/**
 * Parse XLSX file
 */
function parseXLSX(buffer: Buffer, maxSampleRows: number): InferredSchema {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('XLSX file has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  if (rows.length < 2) {
    throw new Error('XLSX file must have at least a header row and one data row');
  }

  // First row is header
  const headerRow = rows[0] as string[];
  const dataRows = rows.slice(1);

  // Sanitize column names
  const sanitizedColumnNames = headerRow.map(sanitizeColumnName);

  // Convert to objects
  const objRows = dataRows.map((row) => {
    const obj: Record<string, unknown> = {};
    row.forEach((val, idx) => {
      obj[sanitizedColumnNames[idx]] = val;
    });
    return obj;
  });

  // Infer column types
  const sampleRows = objRows.slice(0, Math.min(maxSampleRows, objRows.length));
  const columns = sanitizedColumnNames.map((colName) =>
    inferColumnType(colName, sampleRows, colName)
  );

  return {
    columns,
    rowCount: dataRows.length,
    encoding: 'utf-8',
    hasHeader: true,
    inferredAt: new Date().toISOString(),
  };
}

/**
 * Parse JSON file (array of objects)
 */
function parseJSON(buffer: Buffer, maxSampleRows: number): InferredSchema {
  const jsonString = buffer.toString('utf-8');
  let data: unknown;

  try {
    data = JSON.parse(jsonString);
  } catch (error: any) {
    throw new Error(`JSON parsing error: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON file must be an array of objects');
  }

  if (data.length === 0) {
    throw new Error('JSON file is empty');
  }

  const rows = data as Record<string, unknown>[];

  // Get all unique column names from all objects
  const columnNamesSet = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columnNamesSet.add(key));
  });

  const columnNames = Array.from(columnNamesSet);

  // Sanitize column names
  const sanitizedColumnNames = columnNames.map(sanitizeColumnName);

  // Infer column types
  const sampleRows = rows.slice(0, Math.min(maxSampleRows, rows.length));
  const columns = sanitizedColumnNames.map((colName, idx) =>
    inferColumnType(colName, sampleRows, columnNames[idx])
  );

  return {
    columns,
    rowCount: rows.length,
    encoding: 'utf-8',
    hasHeader: true,
    inferredAt: new Date().toISOString(),
  };
}

/**
 * Detect CSV delimiter (comma, semicolon, tab)
 */
function detectCSVDelimiter(csvString: string): string {
  const sample = csvString.split('\n').slice(0, 10).join('\n'); // First 10 lines

  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map((delim) => {
    const lines = sample.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { delimiter: delim, consistency: 0 };

    const lineCounts = lines.map((line) => (line.match(new RegExp(delim, 'g')) || []).length);
    const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
    const variance =
      lineCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / lineCounts.length;

    return {
      delimiter: delim,
      avgCount: avg,
      consistency: avg > 0 ? 1 / (1 + variance) : 0, // Higher is better
    };
  });

  // Pick delimiter with highest consistency and count
  counts.sort((a, b) => b.consistency - a.consistency);

  return counts[0].delimiter;
}

/**
 * Sanitize column name (prevent formula injection, XSS)
 */
function sanitizeColumnName(name: string): string {
  let sanitized = String(name).trim();

  // Remove leading special characters that could be formula injection
  sanitized = sanitized.replace(/^[=+\-@]/g, '');

  // Replace spaces and special chars with underscores
  sanitized = sanitized.replace(/[^\w\s.-]/g, '');
  sanitized = sanitized.replace(/\s+/g, '_');

  // Ensure not empty
  if (!sanitized) {
    sanitized = 'column';
  }

  return sanitized;
}

/**
 * Infer column type from sample values
 */
function inferColumnType(
  columnName: string,
  rows: Record<string, unknown>[],
  originalColumnName: string
): InferredColumn {
  const values = rows.map((row) => row[originalColumnName]).filter((v) => v != null);

  const sampleValues = values.slice(0, 10);
  const nullCount = rows.length - values.length;
  const uniqueCount = new Set(values).size;

  // Attempt type detection
  let type: ColumnType = 'string';
  let dateFormat: string | undefined;
  let currencyCode: string | undefined;

  if (values.length === 0) {
    return {
      name: columnName,
      type: 'string',
      nullable: true,
      sampleValues: [],
      nullCount,
    };
  }

  // Check if all values are numbers
  if (values.every((v) => !isNaN(Number(v)))) {
    type = 'number';
  }

  // Check if boolean
  if (
    values.every(
      (v) =>
        typeof v === 'boolean' ||
        String(v).toLowerCase() === 'true' ||
        String(v).toLowerCase() === 'false'
    )
  ) {
    type = 'boolean';
  }

  // Check if date/datetime
  const dateInfo = detectDateFormat(values);
  if (dateInfo.isDate) {
    type = dateInfo.hasTime ? 'datetime' : 'date';
    dateFormat = dateInfo.format;
  }

  // Check if currency
  const currencyInfo = detectCurrency(values);
  if (currencyInfo.isCurrency) {
    type = 'currency';
    currencyCode = currencyInfo.code;
  }

  // Check if email
  if (values.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) {
    type = 'email';
  }

  // Check if phone
  if (values.every((v) => /^[\d\s\-+()]+$/.test(String(v)) && String(v).length >= 7)) {
    type = 'phone';
  }

  // Check if URL
  if (values.every((v) => /^https?:\/\//.test(String(v)))) {
    type = 'url';
  }

  return {
    name: columnName,
    type,
    nullable: nullCount > 0,
    sampleValues,
    uniqueCount,
    nullCount,
    dateFormat,
    currencyCode,
  };
}

/**
 * Detect date format
 */
function detectDateFormat(values: unknown[]): {
  isDate: boolean;
  hasTime: boolean;
  format?: string;
} {
  const datePatterns = [
    { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD', hasTime: false },
    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY', hasTime: false },
    { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY', hasTime: false },
    {
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      format: 'YYYY-MM-DDTHH:mm:ss',
      hasTime: true,
    },
    { regex: /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, format: 'MM/DD/YYYY HH:mm', hasTime: true },
  ];

  for (const pattern of datePatterns) {
    const matchCount = values.filter((v) => pattern.regex.test(String(v))).length;
    if (matchCount / values.length > 0.8) {
      // 80% match threshold
      return {
        isDate: true,
        hasTime: pattern.hasTime,
        format: pattern.format,
      };
    }
  }

  return { isDate: false, hasTime: false };
}

/**
 * Detect currency
 */
function detectCurrency(values: unknown[]): { isCurrency: boolean; code?: string } {
  const currencyRegex = /^([A-Z]{3})?\s?[\$€£¥]?\s?-?\d{1,3}(,\d{3})*(\.\d{2})?$/;

  const matches = values.filter((v) => currencyRegex.test(String(v)));
  if (matches.length / values.length < 0.8) {
    return { isCurrency: false };
  }

  // Try to extract currency code
  const codes = values
    .map((v) => {
      const match = String(v).match(/^([A-Z]{3})\s/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const code = codes.length > 0 ? codes[0] : 'USD'; // Default to USD

  return { isCurrency: true, code: code as string };
}

/**
 * Read all rows from file (for processing)
 */
export async function readAllRows(
  buffer: Buffer,
  format: FileFormat
): Promise<Record<string, unknown>[]> {
  switch (format) {
    case 'csv': {
      const csvString = buffer.toString('utf-8');
      const delimiter = detectCSVDelimiter(csvString);
      const parseResult = Papa.parse(csvString, {
        delimiter,
        header: true,
        skipEmptyLines: true,
      });
      return parseResult.data as Record<string, unknown>[];
    }
    case 'xlsx': {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    }
    case 'json': {
      const jsonString = buffer.toString('utf-8');
      return JSON.parse(jsonString) as Record<string, unknown>[];
    }
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}
