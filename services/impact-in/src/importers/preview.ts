/**
 * Preview Generator
 * Generates sample preview with validation for import session
 */

import {
  ImportSession,
  PreviewResult,
  PreviewRow,
  ValidationResult,
} from '@teei/shared-types';
import { readAllRows } from './parser.js';
import { applyMapping } from './mapper.js';
import { validateRow, generateValidationResult } from './validator.js';

interface GeneratePreviewOptions {
  session: ImportSession;
  sampleSize: number;
}

/**
 * Generate preview with validation
 */
export async function generatePreview(
  options: GeneratePreviewOptions
): Promise<PreviewResult> {
  const { session, sampleSize } = options;

  if (!session.inferredSchema || !session.mappingConfig) {
    throw new Error('Session must have inferred schema and mapping config');
  }

  // Read file (would use stored file path in production)
  // For now, assume we have the buffer cached or re-read from storage
  const buffer = await getSessionFileBuffer(session);
  const allRows = await readAllRows(buffer, session.fileFormat);

  // Take sample
  const sampleRows = allRows.slice(0, Math.min(sampleSize, allRows.length));

  // Apply mapping and validate
  const previewRows: PreviewRow[] = [];
  const mappedRows: Record<string, unknown>[] = [];

  for (let i = 0; i < sampleRows.length; i++) {
    const originalRow = sampleRows[i];
    const mappedRow = applyMapping(originalRow, session.mappingConfig);
    mappedRows.push(mappedRow);

    // Validate
    const errors = validateRow(
      mappedRow,
      i,
      session.mappingConfig.targetContract
    );

    const valid = errors.filter((e) => e.severity === 'error').length === 0;
    const errorList = errors.filter((e) => e.severity === 'error');
    const warningList = errors.filter((e) => e.severity === 'warning');

    previewRows.push({
      rowIndex: i,
      originalData: originalRow,
      mappedData: mappedRow,
      valid,
      errors: errorList,
      warnings: warningList,
    });
  }

  // Generate validation summary for full dataset
  const allMappedRows = allRows.map((row) =>
    applyMapping(row, session.mappingConfig!)
  );
  const validationSummary = generateValidationResult(
    allMappedRows,
    session.mappingConfig.targetContract
  );

  return {
    rows: previewRows,
    totalRows: allRows.length,
    validationSummary,
    previewedAt: new Date().toISOString(),
  };
}

/**
 * Get file buffer for session (stub - would fetch from S3/storage in production)
 */
async function getSessionFileBuffer(session: ImportSession): Promise<Buffer> {
  // In production, this would:
  // 1. Fetch from S3 using session.filePath
  // 2. Or retrieve from cache
  // For now, return empty buffer (caller would need to provide)
  throw new Error('File buffer retrieval not implemented - would fetch from storage');
}
