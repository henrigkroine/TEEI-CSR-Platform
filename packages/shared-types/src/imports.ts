import { z } from 'zod';

/**
 * Import Session Types
 * For Data Importer & Mapping Studio (Worker 22)
 */

// Import session status
export const ImportSessionStatusSchema = z.enum([
  'created',
  'uploading',
  'uploaded',
  'inferring',
  'mapped',
  'validating',
  'previewing',
  'committing',
  'completed',
  'failed',
]);

export type ImportSessionStatus = z.infer<typeof ImportSessionStatusSchema>;

// Supported file formats
export const FileFormatSchema = z.enum(['csv', 'xlsx', 'json']);
export type FileFormat = z.infer<typeof FileFormatSchema>;

// Detected column types
export const ColumnTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'currency',
  'email',
  'phone',
  'url',
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

// Inferred column metadata
export const InferredColumnSchema = z.object({
  name: z.string(),
  type: ColumnTypeSchema,
  nullable: z.boolean(),
  sampleValues: z.array(z.unknown()).max(10),
  uniqueCount: z.number().optional(),
  nullCount: z.number(),
  dateFormat: z.string().optional(), // e.g., "YYYY-MM-DD", "MM/DD/YYYY"
  currencyCode: z.string().optional(), // e.g., "USD", "EUR"
});

export type InferredColumn = z.infer<typeof InferredColumnSchema>;

// Inferred schema from file
export const InferredSchemaSchema = z.object({
  columns: z.array(InferredColumnSchema),
  rowCount: z.number(),
  delimiter: z.string().optional(), // For CSV: ",", ";", "\t"
  encoding: z.string().default('utf-8'),
  hasHeader: z.boolean().default(true),
  inferredAt: z.string().datetime(),
});

export type InferredSchema = z.infer<typeof InferredSchemaSchema>;

// Event contract targets (domains and event types available for mapping)
export const EventContractTargetSchema = z.enum([
  'buddy.match.created',
  'buddy.event.logged',
  'buddy.event.attended',
  'buddy.checkin.completed',
  'buddy.feedback.submitted',
  'buddy.milestone.reached',
  'buddy.match.ended',
  'buddy.skill-share.completed',
  'kintell.session.scheduled',
  'kintell.session.completed',
  'kintell.rating.created',
  'upskilling.course.completed',
  'upskilling.credential.issued',
  'upskilling.progress.updated',
  // Generic events for historical data
  'volunteer.event',
  'donation.event',
  'program.enrollment',
  'program.completion',
  'placement.created',
]);

export type EventContractTarget = z.infer<typeof EventContractTargetSchema>;

// Transform rule types
export const TransformRuleTypeSchema = z.enum([
  'direct', // Direct mapping
  'constant', // Use a constant value
  'concat', // Concatenate multiple columns
  'split', // Split a column
  'lookup', // Lookup from a table
  'formula', // Custom formula (safe subset)
  'dateFormat', // Convert date format
  'currencyConvert', // Convert currency
  'coalesce', // Use first non-null value
]);

export type TransformRuleType = z.infer<typeof TransformRuleTypeSchema>;

// Transform rule definition
export const TransformRuleSchema = z.object({
  type: TransformRuleTypeSchema,
  sourceColumns: z.array(z.string()), // Source column names
  targetField: z.string(), // Target field in event contract
  config: z.record(z.unknown()).optional(), // Rule-specific configuration
  /**
   * Examples of config per type:
   * - constant: { value: "some_value" }
   * - concat: { separator: " ", columns: ["col1", "col2"] }
   * - split: { delimiter: ",", index: 0 }
   * - lookup: { table: "country_codes", key: "country_name", value: "iso_code" }
   * - formula: { expression: "col1 + col2" }
   * - dateFormat: { inputFormat: "MM/DD/YYYY", outputFormat: "YYYY-MM-DD" }
   * - currencyConvert: { fromCode: "USD", toCode: "EUR", rate: 0.85 }
   * - coalesce: { columns: ["col1", "col2", "col3"] }
   */
});

export type TransformRule = z.infer<typeof TransformRuleSchema>;

// Field mapping (source column → target field + transform)
export const FieldMappingSchema = z.object({
  sourceColumn: z.string(),
  targetField: z.string(),
  transform: TransformRuleSchema.optional(),
  required: z.boolean().default(false),
});

export type FieldMapping = z.infer<typeof FieldMappingSchema>;

// Complete mapping configuration
export const MappingConfigSchema = z.object({
  targetContract: EventContractTargetSchema,
  fieldMappings: z.array(FieldMappingSchema),
  defaultValues: z.record(z.unknown()).optional(), // Default values for unmapped required fields
  filterConditions: z
    .array(
      z.object({
        column: z.string(),
        operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'regex']),
        value: z.unknown(),
      })
    )
    .optional(), // Row-level filters
});

export type MappingConfig = z.infer<typeof MappingConfigSchema>;

// Mapping template (saved configuration for reuse)
export const MappingTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  targetContract: EventContractTargetSchema,
  config: MappingConfigSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  usageCount: z.number().default(0),
});

export type MappingTemplate = z.infer<typeof MappingTemplateSchema>;

// Validation error types
export const ValidationErrorTypeSchema = z.enum([
  'missing_required_field',
  'invalid_type',
  'invalid_format',
  'out_of_range',
  'invalid_enum_value',
  'pii_detected',
  'duplicate_key',
  'reference_not_found',
  'business_rule_violation',
]);

export type ValidationErrorType = z.infer<typeof ValidationErrorTypeSchema>;

// Validation error (row-level)
export const ValidationErrorSchema = z.object({
  rowIndex: z.number(),
  field: z.string().optional(),
  errorType: ValidationErrorTypeSchema,
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  value: z.unknown().optional(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// Validation result summary
export const ValidationResultSchema = z.object({
  totalRows: z.number(),
  validRows: z.number(),
  errorRows: z.number(),
  warningRows: z.number(),
  errors: z.array(ValidationErrorSchema),
  piiDetected: z.boolean(),
  duplicateKeys: z.number(),
  validatedAt: z.string().datetime(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Preview row (mapped and validated)
export const PreviewRowSchema = z.object({
  rowIndex: z.number(),
  originalData: z.record(z.unknown()),
  mappedData: z.record(z.unknown()),
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
});

export type PreviewRow = z.infer<typeof PreviewRowSchema>;

// Preview result
export const PreviewResultSchema = z.object({
  rows: z.array(PreviewRowSchema).max(100),
  totalRows: z.number(),
  validationSummary: ValidationResultSchema,
  previewedAt: z.string().datetime(),
});

export type PreviewResult = z.infer<typeof PreviewResultSchema>;

// Ingestion stats
export const IngestionStatsSchema = z.object({
  totalRows: z.number(),
  insertedRows: z.number(),
  updatedRows: z.number(),
  rejectedRows: z.number(),
  duplicatesSkipped: z.number(),
  processingTimeMs: z.number(),
  throughputRowsPerSec: z.number(),
});

export type IngestionStats = z.infer<typeof IngestionStatsSchema>;

// Import session (main entity)
export const ImportSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  status: ImportSessionStatusSchema,

  // File metadata
  fileName: z.string(),
  fileFormat: FileFormatSchema,
  fileSize: z.number(), // bytes
  fileHash: z.string(), // SHA-256 for idempotency
  filePath: z.string().optional(), // Object storage path

  // Schema & mapping
  inferredSchema: InferredSchemaSchema.optional(),
  mappingConfig: MappingConfigSchema.optional(),
  templateId: z.string().uuid().optional(), // If using a saved template

  // Validation & preview
  validationResult: ValidationResultSchema.optional(),
  previewGenerated: z.boolean().default(false),

  // Ingestion
  ingestionStartedAt: z.string().datetime().optional(),
  ingestionCompletedAt: z.string().datetime().optional(),
  ingestionStats: IngestionStatsSchema.optional(),

  // Error handling
  errorMessage: z.string().optional(),
  errorDetails: z.record(z.unknown()).optional(),
  rejectedRowsPath: z.string().optional(), // Path to CSV of rejected rows

  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(), // Session TTL (e.g., 7 days)
});

export type ImportSession = z.infer<typeof ImportSessionSchema>;

// API request/response types

// POST /imports/sessions
export const CreateImportSessionRequestSchema = z.object({
  fileName: z.string(),
  fileFormat: FileFormatSchema,
  fileSize: z.number(),
  templateId: z.string().uuid().optional(),
});

export type CreateImportSessionRequest = z.infer<typeof CreateImportSessionRequestSchema>;

export const CreateImportSessionResponseSchema = z.object({
  session: ImportSessionSchema,
  uploadUrl: z.string().optional(), // Pre-signed URL for direct upload (if using S3)
});

export type CreateImportSessionResponse = z.infer<typeof CreateImportSessionResponseSchema>;

// POST /imports/sessions/:id/upload (multipart form data)
export const UploadFileResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: ImportSessionStatusSchema,
  inferredSchema: InferredSchemaSchema,
  message: z.string(),
});

export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;

// POST /imports/sessions/:id/mapping
export const SaveMappingRequestSchema = z.object({
  mappingConfig: MappingConfigSchema,
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
  templateDescription: z.string().optional(),
});

export type SaveMappingRequest = z.infer<typeof SaveMappingRequestSchema>;

export const SaveMappingResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: ImportSessionStatusSchema,
  templateId: z.string().uuid().optional(),
  message: z.string(),
});

export type SaveMappingResponse = z.infer<typeof SaveMappingResponseSchema>;

// POST /imports/sessions/:id/preview
export const GeneratePreviewRequestSchema = z.object({
  sampleSize: z.number().min(10).max(100).default(100),
});

export type GeneratePreviewRequest = z.infer<typeof GeneratePreviewRequestSchema>;

export const GeneratePreviewResponseSchema = z.object({
  sessionId: z.string().uuid(),
  preview: PreviewResultSchema,
});

export type GeneratePreviewResponse = z.infer<typeof GeneratePreviewResponseSchema>;

// POST /imports/sessions/:id/commit
export const CommitImportRequestSchema = z.object({
  skipRowsWithErrors: z.boolean().default(false),
});

export type CommitImportRequest = z.infer<typeof CommitImportRequestSchema>;

export const CommitImportResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: ImportSessionStatusSchema,
  jobId: z.string().uuid(), // Background job ID for tracking
  message: z.string(),
});

export type CommitImportResponse = z.infer<typeof CommitImportResponseSchema>;

// GET /imports/sessions/:id/errors
export const GetErrorsResponseSchema = z.object({
  sessionId: z.string().uuid(),
  errors: z.array(ValidationErrorSchema),
  downloadUrl: z.string().optional(), // Pre-signed URL for CSV download
});

export type GetErrorsResponse = z.infer<typeof GetErrorsResponseSchema>;

// POST /imports/sessions/:id/retry
export const RetryImportRequestSchema = z.object({
  correctedFile: z.string().optional(), // Upload new corrected file
  rowIndices: z.array(z.number()).optional(), // Retry specific rows
});

export type RetryImportRequest = z.infer<typeof RetryImportRequestSchema>;

export const RetryImportResponseSchema = z.object({
  sessionId: z.string().uuid(),
  status: ImportSessionStatusSchema,
  message: z.string(),
});

export type RetryImportResponse = z.infer<typeof RetryImportResponseSchema>;

// GET /imports/templates
export const ListTemplatesResponseSchema = z.object({
  templates: z.array(MappingTemplateSchema),
  total: z.number(),
});

export type ListTemplatesResponse = z.infer<typeof ListTemplatesResponseSchema>;

// GET /imports/sessions
export const ListImportSessionsResponseSchema = z.object({
  sessions: z.array(ImportSessionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListImportSessionsResponse = z.infer<typeof ListImportSessionsResponseSchema>;
