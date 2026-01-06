/**
 * Tracks data lineage from raw events to calculated metrics
 * Provides audit trail for compliance (GRI, CSRD) and debugging
 *
 * Every calculated metric must record:
 * - Source event IDs that contributed to the calculation
 * - Calculation timestamp and formula version
 * - User who triggered calculation (if manual)
 * - Additional metadata for audit purposes
 */
export declare const metricLineage: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "metric_lineage";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "metric_lineage";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metricType: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric_type";
            tableName: "metric_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metricId: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric_id";
            tableName: "metric_lineage";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceEventIds: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_event_ids";
            tableName: "metric_lineage";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        calculationFormula: import("drizzle-orm/pg-core").PgColumn<{
            name: "calculation_formula";
            tableName: "metric_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        calculatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "calculated_at";
            tableName: "metric_lineage";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        calculatedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "calculated_by";
            tableName: "metric_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "metric_lineage";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                [key: string]: any;
                event_count?: number;
                period?: {
                    start: string;
                    end: string;
                };
                data_quality_score?: number;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "metric_lineage";
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
/**
 * Extended type for buddy_system_events.derived_metrics JSONB column
 * This will be added to buddy_system_events table to track which metrics
 * have been derived from each event
 */
export interface DerivedMetric {
    type: 'sroi' | 'vis' | 'sdg_distribution';
    metric_id: string;
    calculation_date: string;
    contribution?: number;
}
//# sourceMappingURL=lineage.d.ts.map