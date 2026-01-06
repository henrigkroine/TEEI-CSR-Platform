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
export declare const ingestionBatches: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "ingestion_batches";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        fileName: import("drizzle-orm/pg-core").PgColumn<{
            name: "file_name";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        fileHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "file_hash";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        fileSizeBytes: import("drizzle-orm/pg-core").PgColumn<{
            name: "file_size_bytes";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        programType: import("drizzle-orm/pg-core").PgColumn<{
            name: "program_type";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        programInstanceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "program_instance_id";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceSystem: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_system";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        importMethod: import("drizzle-orm/pg-core").PgColumn<{
            name: "import_method";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        totalRows: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_rows";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        successRows: import("drizzle-orm/pg-core").PgColumn<{
            name: "success_rows";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorRows: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_rows";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        skippedRows: import("drizzle-orm/pg-core").PgColumn<{
            name: "skipped_rows";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastProcessedRow: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_processed_row";
            tableName: "ingestion_batches";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorFilePath: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_file_path";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        csvMetadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "csv_metadata";
            tableName: "ingestion_batches";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                [key: string]: any;
                delimiter?: string;
                encoding?: string;
                headers?: string[];
                detectedSchemaVersion?: string;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        importedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "imported_by";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        importedByService: import("drizzle-orm/pg-core").PgColumn<{
            name: "imported_by_service";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "ingestion_batches";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        errorSummary: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_summary";
            tableName: "ingestion_batches";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                [key: string]: any;
                topErrors?: Array<{
                    error: string;
                    count: number;
                }>;
                errorCategories?: Record<string, number>;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        startedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "started_at";
            tableName: "ingestion_batches";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        completedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "completed_at";
            tableName: "ingestion_batches";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "ingestion_batches";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "ingestion_batches";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=ingestion-batches.d.ts.map