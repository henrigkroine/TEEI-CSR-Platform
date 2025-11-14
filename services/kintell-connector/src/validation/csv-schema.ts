/**
 * Kintell CSV Schema Validation
 *
 * Versioned Zod schemas for validating Kintell CSV imports.
 * Supports multiple CSV formats and schema versioning for backwards compatibility.
 *
 * @module validation/csv-schema
 */

import { z } from 'zod';

/**
 * Schema version metadata
 */
export interface SchemaVersion {
  version: string;
  description: string;
  effectiveDate: string;
  deprecated?: boolean;
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
    value: unknown;
  }>;
}

// ============================================================================
// Common Validators
// ============================================================================

const emailValidator = z.string().email().max(255);
const uuidValidator = z.string().uuid();
const dateValidator = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
const ratingValidator = z.coerce.number().min(0).max(1);
const cefr Level = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

// ============================================================================
// Language Session CSV Schema (Version 1.0)
// ============================================================================

export const LanguageSessionSchemaV1 = z.object({
  session_id: z.string().min(1).max(255),
  participant_email: emailValidator,
  volunteer_email: emailValidator,
  scheduled_at: dateValidator,
  completed_at: dateValidator.optional(),
  duration_minutes: z.coerce.number().int().min(1).max(480).optional(),
  rating: ratingValidator.optional(),
  feedback_text: z.string().max(5000).optional(),
  language_level: cefrLevel.optional(),
  topics: z.string().max(1000).optional(), // Comma-separated list
});

export type LanguageSessionRowV1 = z.infer<typeof LanguageSessionSchemaV1>;

export const LanguageSessionMetadataV1: SchemaVersion = {
  version: '1.0',
  description: 'Initial language session CSV format',
  effectiveDate: '2025-01-01',
};

// ============================================================================
// Language Session CSV Schema (Version 1.1) - Added metadata field
// ============================================================================

export const LanguageSessionSchemaV1_1 = LanguageSessionSchemaV1.extend({
  metadata: z.string().max(2000).optional(), // JSON string
});

export type LanguageSessionRowV1_1 = z.infer<typeof LanguageSessionSchemaV1_1>;

export const LanguageSessionMetadataV1_1: SchemaVersion = {
  version: '1.1',
  description: 'Added metadata field for additional context',
  effectiveDate: '2025-06-01',
};

// ============================================================================
// Mentorship Session CSV Schema (Version 1.0)
// ============================================================================

export const MentorshipSessionSchemaV1 = z.object({
  session_id: z.string().min(1).max(255),
  participant_email: emailValidator,
  mentor_email: emailValidator,
  scheduled_at: dateValidator,
  completed_at: dateValidator.optional(),
  duration_minutes: z.coerce.number().int().min(1).max(480).optional(),
  rating: ratingValidator.optional(),
  feedback_text: z.string().max(5000).optional(),
  focus_area: z.string().max(255).optional(), // e.g., career, education, integration
  goals_discussed: z.string().max(1000).optional(), // Comma-separated list
});

export type MentorshipSessionRowV1 = z.infer<typeof MentorshipSessionSchemaV1>;

export const MentorshipSessionMetadataV1: SchemaVersion = {
  version: '1.0',
  description: 'Initial mentorship session CSV format',
  effectiveDate: '2025-01-01',
};

// ============================================================================
// Schema Registry
// ============================================================================

export type KintellCSVType = 'language_session' | 'mentorship_session';

export interface SchemaRegistryEntry {
  schema: z.ZodSchema;
  metadata: SchemaVersion;
  parser: (row: unknown) => ValidationResult<unknown>;
}

export const SCHEMA_REGISTRY: Record<KintellCSVType, Record<string, SchemaRegistryEntry>> = {
  language_session: {
    '1.0': {
      schema: LanguageSessionSchemaV1,
      metadata: LanguageSessionMetadataV1,
      parser: createRowParser(LanguageSessionSchemaV1),
    },
    '1.1': {
      schema: LanguageSessionSchemaV1_1,
      metadata: LanguageSessionMetadataV1_1,
      parser: createRowParser(LanguageSessionSchemaV1_1),
    },
  },
  mentorship_session: {
    '1.0': {
      schema: MentorshipSessionSchemaV1,
      metadata: MentorshipSessionMetadataV1,
      parser: createRowParser(MentorshipSessionSchemaV1),
    },
  },
};

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Create a row parser for a given Zod schema
 */
function createRowParser<T>(schema: z.ZodSchema<T>) {
  return (row: unknown): ValidationResult<T> => {
    const result = schema.safeParse(row);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = result.error.errors.map((err) => ({
      row: 0, // Row number will be set by caller
      field: err.path.join('.'),
      message: err.message,
      value: err.path.reduce((obj: any, key) => obj?.[key], row),
    }));

    return {
      success: false,
      errors,
    };
  };
}

/**
 * Validate a CSV row against a specific schema version
 *
 * @param csvType - Type of CSV (language_session, mentorship_session)
 * @param version - Schema version (e.g., '1.0', '1.1')
 * @param row - Raw CSV row data
 * @param rowNumber - Row number for error reporting
 * @returns Validation result
 */
export function validateRow<T>(
  csvType: KintellCSVType,
  version: string,
  row: unknown,
  rowNumber: number
): ValidationResult<T> {
  const registryEntry = SCHEMA_REGISTRY[csvType]?.[version];

  if (!registryEntry) {
    return {
      success: false,
      errors: [
        {
          row: rowNumber,
          field: '_schema',
          message: `Unknown schema type '${csvType}' or version '${version}'`,
          value: { csvType, version },
        },
      ],
    };
  }

  const result = registryEntry.parser(row) as ValidationResult<T>;

  // Update row numbers in errors
  if (!result.success && result.errors) {
    result.errors = result.errors.map((err) => ({ ...err, row: rowNumber }));
  }

  return result;
}

/**
 * Detect schema version from CSV headers
 *
 * @param headers - CSV column headers
 * @param csvType - Type of CSV
 * @returns Detected version or latest version as fallback
 */
export function detectSchemaVersion(headers: string[], csvType: KintellCSVType): string {
  const versions = Object.keys(SCHEMA_REGISTRY[csvType] || {});

  if (versions.length === 0) {
    throw new Error(`No schemas registered for CSV type: ${csvType}`);
  }

  // Check for version-specific fields
  if (csvType === 'language_session') {
    if (headers.includes('metadata')) {
      return '1.1';
    }
    return '1.0';
  }

  if (csvType === 'mentorship_session') {
    return '1.0';
  }

  // Default to latest version
  return versions[versions.length - 1];
}

/**
 * Get all supported schema versions for a CSV type
 *
 * @param csvType - Type of CSV
 * @returns Array of schema versions with metadata
 */
export function getSupportedVersions(csvType: KintellCSVType): SchemaVersion[] {
  const schemas = SCHEMA_REGISTRY[csvType] || {};
  return Object.values(schemas).map((entry) => entry.metadata);
}

/**
 * Get the latest schema version for a CSV type
 *
 * @param csvType - Type of CSV
 * @returns Latest schema version
 */
export function getLatestVersion(csvType: KintellCSVType): string {
  const versions = Object.keys(SCHEMA_REGISTRY[csvType] || {});
  if (versions.length === 0) {
    throw new Error(`No schemas registered for CSV type: ${csvType}`);
  }
  return versions[versions.length - 1];
}

/**
 * Example usage
 */
if (require.main === module) {
  // Example: Validate a language session row
  const sampleRow = {
    session_id: 'LS-001',
    participant_email: 'participant@example.com',
    volunteer_email: 'volunteer@example.com',
    scheduled_at: '2025-11-13T10:00:00Z',
    completed_at: '2025-11-13T11:00:00Z',
    duration_minutes: '60',
    rating: '0.95',
    feedback_text: 'Great session!',
    language_level: 'B2',
    topics: 'grammar,conversation',
  };

  const result = validateRow('language_session', '1.0', sampleRow, 1);
  console.log('Validation result:', JSON.stringify(result, null, 2));

  // List supported versions
  console.log('\nSupported versions for language_session:');
  getSupportedVersions('language_session').forEach((v) => {
    console.log(`  v${v.version}: ${v.description} (${v.effectiveDate})`);
  });
}
