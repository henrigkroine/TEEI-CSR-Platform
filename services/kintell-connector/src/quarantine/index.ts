/**
 * Data Quarantine System
 *
 * Handles invalid CSV rows by isolating them for review and correction.
 * Features:
 * - Row-level error files with detailed validation messages
 * - Structured error reporting for data quality monitoring
 * - Retry mechanisms for corrected data
 * - Audit trail for quarantined records
 *
 * @module quarantine
 */

import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { ValidationResult } from '../validation/csv-schema.js';

export interface QuarantineConfig {
  /** Directory to store quarantined records */
  quarantineDir: string;
  /** Directory to store error reports */
  errorReportDir: string;
  /** Maximum age of quarantine files before archiving (days) */
  maxAgeDays?: number;
}

export interface QuarantinedRecord {
  /** Original row number from CSV */
  rowNumber: number;
  /** Raw CSV row data */
  rawData: Record<string, unknown>;
  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
    value: unknown;
  }>;
  /** Timestamp when quarantined */
  quarantinedAt: string;
  /** Source file name */
  sourceFile: string;
  /** CSV type (e.g., language_session) */
  csvType: string;
  /** Schema version used for validation */
  schemaVersion: string;
}

export interface QuarantineReport {
  /** Batch ID for this import */
  batchId: string;
  /** Source file name */
  sourceFile: string;
  /** Total rows processed */
  totalRows: number;
  /** Number of valid rows */
  validRows: number;
  /** Number of quarantined rows */
  quarantinedRows: number;
  /** Quarantined records */
  records: QuarantinedRecord[];
  /** Timestamp of report generation */
  generatedAt: string;
}

/**
 * Initialize quarantine directories
 *
 * @param config - Quarantine configuration
 */
export async function initQuarantine(config: QuarantineConfig): Promise<void> {
  await mkdir(config.quarantineDir, { recursive: true });
  await mkdir(config.errorReportDir, { recursive: true });
  console.log('[Quarantine] Initialized directories:', config);
}

/**
 * Quarantine an invalid CSV row
 *
 * @param config - Quarantine configuration
 * @param record - Quarantined record with validation errors
 * @returns Path to quarantined file
 */
export async function quarantineRow(
  config: QuarantineConfig,
  record: QuarantinedRecord
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${record.csvType}_row${record.rowNumber}_${timestamp}.json`;
  const filePath = join(config.quarantineDir, filename);

  await writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');

  console.log(`[Quarantine] Row ${record.rowNumber} quarantined to ${filePath}`);
  return filePath;
}

/**
 * Generate a quarantine report for a batch import
 *
 * @param config - Quarantine configuration
 * @param report - Quarantine report data
 * @returns Path to report file
 */
export async function generateQuarantineReport(
  config: QuarantineConfig,
  report: QuarantineReport
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${report.batchId}_report_${timestamp}.json`;
  const filePath = join(config.errorReportDir, filename);

  await writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');

  // Also generate human-readable CSV for easy review
  const csvPath = join(config.errorReportDir, `${report.batchId}_errors_${timestamp}.csv`);
  await generateErrorCSV(report, csvPath);

  console.log(`[Quarantine] Report generated: ${filePath}`);
  console.log(`[Quarantine] Error CSV generated: ${csvPath}`);

  return filePath;
}

/**
 * Generate a CSV file with error details for easy review
 *
 * @param report - Quarantine report
 * @param outputPath - Path to output CSV file
 */
async function generateErrorCSV(report: QuarantineReport, outputPath: string): Promise<void> {
  const headers = ['Row Number', 'Field', 'Error Message', 'Invalid Value', 'Quarantined At'];
  const rows = report.records.flatMap((record) =>
    record.errors.map((error) => [
      record.rowNumber.toString(),
      error.field,
      error.message,
      JSON.stringify(error.value),
      record.quarantinedAt,
    ])
  );

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  await writeFile(outputPath, csvContent, 'utf-8');
}

/**
 * Process validation results and quarantine invalid rows
 *
 * @param config - Quarantine configuration
 * @param batchId - Unique batch identifier
 * @param sourceFile - Source CSV filename
 * @param csvType - Type of CSV being processed
 * @param schemaVersion - Schema version used
 * @param validationResults - Array of validation results for each row
 * @returns Quarantine report
 */
export async function processValidationResults<T>(
  config: QuarantineConfig,
  batchId: string,
  sourceFile: string,
  csvType: string,
  schemaVersion: string,
  validationResults: Array<{ rowNumber: number; rawData: Record<string, unknown>; result: ValidationResult<T> }>
): Promise<QuarantineReport> {
  const quarantinedRecords: QuarantinedRecord[] = [];
  let validRows = 0;

  for (const { rowNumber, rawData, result } of validationResults) {
    if (result.success) {
      validRows++;
    } else {
      const record: QuarantinedRecord = {
        rowNumber,
        rawData,
        errors: result.errors || [],
        quarantinedAt: new Date().toISOString(),
        sourceFile,
        csvType,
        schemaVersion,
      };

      await quarantineRow(config, record);
      quarantinedRecords.push(record);
    }
  }

  const report: QuarantineReport = {
    batchId,
    sourceFile,
    totalRows: validationResults.length,
    validRows,
    quarantinedRows: quarantinedRecords.length,
    records: quarantinedRecords,
    generatedAt: new Date().toISOString(),
  };

  if (quarantinedRecords.length > 0) {
    await generateQuarantineReport(config, report);
  }

  return report;
}

/**
 * List all quarantined records
 *
 * @param config - Quarantine configuration
 * @returns Array of quarantined record filenames
 */
export async function listQuarantinedRecords(config: QuarantineConfig): Promise<string[]> {
  try {
    const files = await readdir(config.quarantineDir);
    return files.filter((f) => f.endsWith('.json'));
  } catch (error) {
    console.error('[Quarantine] Failed to list quarantined records:', error);
    return [];
  }
}

/**
 * Load a quarantined record from file
 *
 * @param config - Quarantine configuration
 * @param filename - Quarantined record filename
 * @returns Quarantined record or null if not found
 */
export async function loadQuarantinedRecord(
  config: QuarantineConfig,
  filename: string
): Promise<QuarantinedRecord | null> {
  try {
    const filePath = join(config.quarantineDir, filename);
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as QuarantinedRecord;
  } catch (error) {
    console.error('[Quarantine] Failed to load quarantined record:', error);
    return null;
  }
}

/**
 * Retry processing a corrected quarantined record
 *
 * @param config - Quarantine configuration
 * @param filename - Quarantined record filename
 * @param correctedData - Corrected row data
 * @param validator - Validation function
 * @returns Validation result for corrected data
 */
export async function retryQuarantinedRecord<T>(
  config: QuarantineConfig,
  filename: string,
  correctedData: Record<string, unknown>,
  validator: (data: Record<string, unknown>) => ValidationResult<T>
): Promise<ValidationResult<T>> {
  const record = await loadQuarantinedRecord(config, filename);

  if (!record) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          field: '_quarantine',
          message: 'Quarantined record not found',
          value: filename,
        },
      ],
    };
  }

  const result = validator(correctedData);

  if (result.success) {
    console.log(`[Quarantine] Record ${filename} successfully reprocessed`);
    // Optionally: archive or delete the quarantined file
  } else {
    console.log(`[Quarantine] Record ${filename} still invalid after correction`);
  }

  return result;
}

/**
 * Generate summary statistics for quarantined data
 *
 * @param config - Quarantine configuration
 * @returns Summary statistics
 */
export async function getQuarantineStats(config: QuarantineConfig): Promise<{
  totalRecords: number;
  errorsByField: Record<string, number>;
  errorsByType: Record<string, number>;
}> {
  const files = await listQuarantinedRecords(config);
  const records = await Promise.all(
    files.map((f) => loadQuarantinedRecord(config, f))
  );

  const validRecords = records.filter((r): r is QuarantinedRecord => r !== null);

  const errorsByField: Record<string, number> = {};
  const errorsByType: Record<string, number> = {};

  for (const record of validRecords) {
    for (const error of record.errors) {
      errorsByField[error.field] = (errorsByField[error.field] || 0) + 1;
      errorsByType[record.csvType] = (errorsByType[record.csvType] || 0) + 1;
    }
  }

  return {
    totalRecords: validRecords.length,
    errorsByField,
    errorsByType,
  };
}

/**
 * Example usage
 */
if (require.main === module) {
  (async () => {
    const config: QuarantineConfig = {
      quarantineDir: './data/quarantine',
      errorReportDir: './data/reports',
    };

    await initQuarantine(config);

    // Example: Get quarantine statistics
    const stats = await getQuarantineStats(config);
    console.log('Quarantine Statistics:', JSON.stringify(stats, null, 2));

    // List quarantined records
    const records = await listQuarantinedRecords(config);
    console.log(`\nQuarantined Records (${records.length}):`);
    records.forEach((r) => console.log(`  - ${r}`));
  })();
}
