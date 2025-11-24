/**
 * Buddy Export Validator
 *
 * Validates parsed export data using Zod schemas.
 * Provides batch validation with detailed error reporting.
 *
 * @module ingestion-buddy/validators/validator
 * @agent Agent 9 (buddy-validator)
 */

import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import type { BuddyEntityType } from '../parsers/csv-parser';
import {
  BuddyUserSchema,
  BuddyMatchSchema,
  BuddyEventSchema,
  EventAttendanceSchema,
  SkillSessionSchema,
  CheckinSchema,
  FeedbackSchema,
  MilestoneSchema,
  ExportMetadataSchema,
  type ValidationResult,
  type BuddyUser,
  type BuddyMatch,
  type BuddyEvent,
  type EventAttendance,
  type SkillSession,
  type Checkin,
  type Feedback,
  type Milestone,
  type ExportMetadata,
} from './schemas';

const logger = createServiceLogger('ingestion-buddy:validator');

/**
 * Entity type → Zod schema mapping
 */
const ENTITY_SCHEMAS: Record<BuddyEntityType, z.ZodSchema> = {
  users: BuddyUserSchema,
  matches: BuddyMatchSchema,
  events: BuddyEventSchema,
  event_attendance: EventAttendanceSchema,
  skill_sessions: SkillSessionSchema,
  checkins: CheckinSchema,
  feedback: FeedbackSchema,
  milestones: MilestoneSchema,
};

/**
 * Validate a single record
 *
 * @param record - Raw parsed record
 * @param schema - Zod schema to validate against
 * @returns Validation result (success or error)
 */
export function validateRecord<T>(
  record: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(record);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Validate batch of records
 *
 * @param records - Array of raw parsed records
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 * @returns Validation result with valid/invalid records separated
 */
export function validateBatch<T>(
  records: unknown[],
  schema: z.ZodSchema<T>,
  options: {
    logErrors?: boolean;      // Log validation errors (default: true)
    throwOnFailure?: boolean; // Throw if any records fail (default: false)
  } = {}
): ValidationResult<T> {
  const { logErrors = true, throwOnFailure = false } = options;

  const valid: T[] = [];
  const invalid: Array<{ index: number; record: any; errors: z.ZodError }> = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const result = validateRecord(record, schema);

    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        index: i,
        record,
        errors: result.error,
      });

      if (logErrors) {
        logger.warn(
          {
            recordIndex: i,
            errors: result.error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          'Record validation failed'
        );
      }
    }
  }

  const total = records.length;
  const successRate = total > 0 ? valid.length / total : 0;

  const validationResult: ValidationResult<T> = {
    valid,
    invalid,
    stats: {
      total,
      valid: valid.length,
      invalid: invalid.length,
      successRate,
    },
  };

  logger.info(
    {
      total,
      valid: valid.length,
      invalid: invalid.length,
      successRate: `${(successRate * 100).toFixed(1)}%`,
    },
    'Batch validation complete'
  );

  if (throwOnFailure && invalid.length > 0) {
    throw new Error(
      `Validation failed for ${invalid.length}/${total} records (${((invalid.length / total) * 100).toFixed(1)}%)`
    );
  }

  return validationResult;
}

/**
 * Validate records by entity type
 *
 * @param records - Array of raw parsed records
 * @param entityType - Entity type (determines which schema to use)
 * @param options - Validation options
 * @returns Validation result
 */
export function validateByEntityType(
  records: unknown[],
  entityType: BuddyEntityType,
  options?: {
    logErrors?: boolean;
    throwOnFailure?: boolean;
  }
): ValidationResult<any> {
  const schema = ENTITY_SCHEMAS[entityType];

  if (!schema) {
    throw new Error(`No schema found for entity type: ${entityType}`);
  }

  logger.info({ entityType, recordCount: records.length }, 'Validating records by entity type');

  return validateBatch(records, schema, options);
}

/**
 * Validate export metadata
 *
 * @param metadata - Raw export metadata
 * @returns Validated metadata
 * @throws If metadata is invalid
 */
export function validateExportMetadata(metadata: unknown): ExportMetadata {
  const result = ExportMetadataSchema.safeParse(metadata);

  if (!result.success) {
    logger.error(
      { errors: result.error.errors },
      'Export metadata validation failed'
    );
    throw new Error(
      `Invalid export metadata:\n${result.error.errors.map((e) => `- ${e.path.join('.')}: ${e.message}`).join('\n')}`
    );
  }

  return result.data;
}

/**
 * Validate all entities in a multi-entity export
 *
 * @param entities - Record of entity type → records
 * @param options - Validation options
 * @returns Record of entity type → validation results
 */
export function validateAllEntities(
  entities: Record<BuddyEntityType, unknown[]>,
  options?: {
    logErrors?: boolean;
    throwOnFailure?: boolean;
  }
): Record<BuddyEntityType, ValidationResult<any>> {
  const results: Record<BuddyEntityType, ValidationResult<any>> = {} as any;

  for (const [entityType, records] of Object.entries(entities) as [BuddyEntityType, unknown[]][]) {
    if (records.length === 0) {
      logger.debug({ entityType }, 'Skipping validation (0 records)');
      continue;
    }

    results[entityType] = validateByEntityType(records, entityType, options);
  }

  return results;
}

/**
 * Get aggregate validation stats across all entity types
 *
 * @param results - Validation results per entity type
 * @returns Aggregate statistics
 */
export function getAggregateStats(
  results: Record<BuddyEntityType, ValidationResult<any>>
): {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  successRate: number;
  byEntityType: Record<
    BuddyEntityType,
    { total: number; valid: number; invalid: number; successRate: number }
  >;
} {
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;

  const byEntityType: Record<
    BuddyEntityType,
    { total: number; valid: number; invalid: number; successRate: number }
  > = {} as any;

  for (const [entityType, result] of Object.entries(results) as [
    BuddyEntityType,
    ValidationResult<any>
  ][]) {
    totalRecords += result.stats.total;
    validRecords += result.stats.valid;
    invalidRecords += result.stats.invalid;

    byEntityType[entityType] = result.stats;
  }

  const successRate = totalRecords > 0 ? validRecords / totalRecords : 0;

  return {
    totalRecords,
    validRecords,
    invalidRecords,
    successRate,
    byEntityType,
  };
}

/**
 * Format validation errors for human-readable output
 *
 * @param validationResult - Validation result with errors
 * @returns Formatted error report
 */
export function formatValidationErrors(
  validationResult: ValidationResult<any>
): string {
  if (validationResult.invalid.length === 0) {
    return 'No validation errors';
  }

  const lines: string[] = [
    `Validation Errors (${validationResult.invalid.length}/${validationResult.stats.total} records):`,
    '',
  ];

  for (const { index, errors } of validationResult.invalid) {
    lines.push(`Record #${index + 1}:`);

    for (const error of errors.errors) {
      const path = error.path.length > 0 ? error.path.join('.') : 'record';
      lines.push(`  - ${path}: ${error.message}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export typed validators for each entity type
 * (for better TypeScript inference)
 */

export const validateUsers = (records: unknown[], options?: any) =>
  validateBatch(records, BuddyUserSchema, options);

export const validateMatches = (records: unknown[], options?: any) =>
  validateBatch(records, BuddyMatchSchema, options);

export const validateEvents = (records: unknown[], options?: any) =>
  validateBatch(records, BuddyEventSchema, options);

export const validateEventAttendance = (records: unknown[], options?: any) =>
  validateBatch(records, EventAttendanceSchema, options);

export const validateSkillSessions = (records: unknown[], options?: any) =>
  validateBatch(records, SkillSessionSchema, options);

export const validateCheckins = (records: unknown[], options?: any) =>
  validateBatch(records, CheckinSchema, options);

export const validateFeedback = (records: unknown[], options?: any) =>
  validateBatch(records, FeedbackSchema, options);

export const validateMilestones = (records: unknown[], options?: any) =>
  validateBatch(records, MilestoneSchema, options);
