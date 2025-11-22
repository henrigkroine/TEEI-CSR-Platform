import { pgTable, uuid, varchar, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { programInstances } from './program-instances.js';
import { users } from './users.js';

/**
 * Ingestion Batches - Audit trail for CSV imports and API ingestion runs
 *
 * Tracks:
 * - Which file was imported when
 * - Success/error statistics
 * - Data lineage (which sessions came from which batch)
 * - Re-import detection (via file hash)
 *
 * Enables:
 * - "Show me all sessions from batch X"
 * - "When was file Y last imported?"
 * - "How many errors occurred in recent imports?"
 * - Re-import prevention (same file hash)
 */
export const ingestionBatches = pgTable(
  'ingestion_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Source identification
    fileName: varchar('file_name', { length: 500 }).notNull(), // "mentors-for-ukraine-2024-Q4.csv"
    fileHash: varchar('file_hash', { length: 64 }).notNull(), // SHA-256 hash for deduplication
    fileSizeBytes: integer('file_size_bytes'), // Original file size

    // Program context
    programType: varchar('program_type', { length: 50 }).notNull(), // mentors_ukraine, language_ukraine
    programInstanceId: uuid('program_instance_id').references(() => programInstances.id), // NULL if auto-created

    // Source system
    sourceSystem: varchar('source_system', { length: 50 }).notNull().default('kintell'), // kintell, buddy, upskilling, manual
    importMethod: varchar('import_method', { length: 50 }).notNull().default('csv_upload'), // csv_upload, api_webhook, manual_entry

    // Statistics
    totalRows: integer('total_rows').notNull().default(0),
    successRows: integer('success_rows').notNull().default(0),
    errorRows: integer('error_rows').notNull().default(0),
    skippedRows: integer('skipped_rows').notNull().default(0), // Duplicates skipped

    // Processing metadata
    lastProcessedRow: integer('last_processed_row').notNull().default(0), // For checkpoint/resume
    errorFilePath: varchar('error_file_path', { length: 500 }), // Path to error CSV

    // CSV format metadata
    csvMetadata: jsonb('csv_metadata').$type<{
      delimiter?: string;
      encoding?: string;
      headers?: string[];
      detectedSchemaVersion?: string; // "1.0", "1.1", etc.
      [key: string]: any;
    }>(),

    // Audit
    importedBy: uuid('imported_by').references(() => users.id), // NULL for automated imports
    importedByService: varchar('imported_by_service', { length: 100 }), // "kintell-connector", "cli"

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, running, completed, failed, paused

    // Error summary
    errorSummary: jsonb('error_summary').$type<{
      topErrors?: Array<{ error: string; count: number }>;
      errorCategories?: Record<string, number>; // { validation: 10, user_not_found: 5 }
      [key: string]: any;
    }>(),

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Primary indexes
    fileHashIdx: index('ingestion_batches_file_hash_idx').on(table.fileHash),
    programTypeIdx: index('ingestion_batches_program_type_idx').on(table.programType),
    programInstanceIdIdx: index('ingestion_batches_program_instance_id_idx').on(table.programInstanceId),
    statusIdx: index('ingestion_batches_status_idx').on(table.status),

    // Time-based queries
    startedAtIdx: index('ingestion_batches_started_at_idx').on(table.startedAt),
    createdAtIdx: index('ingestion_batches_created_at_idx').on(table.createdAt),

    // Audit queries
    importedByIdx: index('ingestion_batches_imported_by_idx').on(table.importedBy),
    sourceSystemIdx: index('ingestion_batches_source_system_idx').on(table.sourceSystem),
  })
);
