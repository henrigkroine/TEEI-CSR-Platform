/**
 * NLQ Query Log - Complete audit trail for natural language queries
 * Tracks intent classification, query generation, safety checks, and lineage
 */
export declare const nlqQueries: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_queries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rawQuestion: import("drizzle-orm/pg-core").PgColumn<{
            name: "raw_question";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        normalizedQuestion: import("drizzle-orm/pg-core").PgColumn<{
            name: "normalized_question";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        language: import("drizzle-orm/pg-core").PgColumn<{
            name: "language";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        detectedIntent: import("drizzle-orm/pg-core").PgColumn<{
            name: "detected_intent";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        extractedSlots: import("drizzle-orm/pg-core").PgColumn<{
            name: "extracted_slots";
            tableName: "nlq_queries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        intentConfidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "intent_confidence";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        templateId: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        templateName: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_name";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        generatedSql: import("drizzle-orm/pg-core").PgColumn<{
            name: "generated_sql";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        generatedChql: import("drizzle-orm/pg-core").PgColumn<{
            name: "generated_chql";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        queryPreview: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_preview";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        safetyCheckId: import("drizzle-orm/pg-core").PgColumn<{
            name: "safety_check_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        safetyPassed: import("drizzle-orm/pg-core").PgColumn<{
            name: "safety_passed";
            tableName: "nlq_queries";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        safetyViolations: import("drizzle-orm/pg-core").PgColumn<{
            name: "safety_violations";
            tableName: "nlq_queries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        executionStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "execution_status";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        resultRowCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "result_row_count";
            tableName: "nlq_queries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        executionTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "execution_time_ms";
            tableName: "nlq_queries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        answerConfidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "answer_confidence";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        answerSummary: import("drizzle-orm/pg-core").PgColumn<{
            name: "answer_summary";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        lineagePointers: import("drizzle-orm/pg-core").PgColumn<{
            name: "lineage_pointers";
            tableName: "nlq_queries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        modelName: import("drizzle-orm/pg-core").PgColumn<{
            name: "model_name";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        providerName: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider_name";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tokensUsed: import("drizzle-orm/pg-core").PgColumn<{
            name: "tokens_used";
            tableName: "nlq_queries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        estimatedCostUsd: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_cost_usd";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        cached: import("drizzle-orm/pg-core").PgColumn<{
            name: "cached";
            tableName: "nlq_queries";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_key";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        requestId: import("drizzle-orm/pg-core").PgColumn<{
            name: "request_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sessionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "session_id";
            tableName: "nlq_queries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "nlq_queries";
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
 * NLQ Metric Templates - Allow-listed metric templates for safe query generation
 * Only metrics in this catalog can be queried via NLQ
 */
export declare const nlqTemplates: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_templates";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        templateName: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_name";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        displayName: import("drizzle-orm/pg-core").PgColumn<{
            name: "display_name";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        category: import("drizzle-orm/pg-core").PgColumn<{
            name: "category";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sqlTemplate: import("drizzle-orm/pg-core").PgColumn<{
            name: "sql_template";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        chqlTemplate: import("drizzle-orm/pg-core").PgColumn<{
            name: "chql_template";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        allowedTimeRanges: import("drizzle-orm/pg-core").PgColumn<{
            name: "allowed_time_ranges";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        allowedGroupBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "allowed_group_by";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        allowedFilters: import("drizzle-orm/pg-core").PgColumn<{
            name: "allowed_filters";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxTimeWindowDays: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_time_window_days";
            tableName: "nlq_templates";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requiresTenantFilter: import("drizzle-orm/pg-core").PgColumn<{
            name: "requires_tenant_filter";
            tableName: "nlq_templates";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        allowedJoins: import("drizzle-orm/pg-core").PgColumn<{
            name: "allowed_joins";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        deniedColumns: import("drizzle-orm/pg-core").PgColumn<{
            name: "denied_columns";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        estimatedComplexity: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_complexity";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        maxResultRows: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_result_rows";
            tableName: "nlq_templates";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheTtlSeconds: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_ttl_seconds";
            tableName: "nlq_templates";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        exampleQuestions: import("drizzle-orm/pg-core").PgColumn<{
            name: "example_questions";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        relatedTemplates: import("drizzle-orm/pg-core").PgColumn<{
            name: "related_templates";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tags: import("drizzle-orm/pg-core").PgColumn<{
            name: "tags";
            tableName: "nlq_templates";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        active: import("drizzle-orm/pg-core").PgColumn<{
            name: "active";
            tableName: "nlq_templates";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        version: import("drizzle-orm/pg-core").PgColumn<{
            name: "version";
            tableName: "nlq_templates";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        approvedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "approved_by";
            tableName: "nlq_templates";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        approvedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "approved_at";
            tableName: "nlq_templates";
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
            tableName: "nlq_templates";
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
            tableName: "nlq_templates";
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
 * NLQ Safety Checks - 12-point validation audit trail
 * Records all safety checks performed on queries before execution
 */
export declare const nlqSafetyChecks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_safety_checks";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_id";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        checkResults: import("drizzle-orm/pg-core").PgColumn<{
            name: "check_results";
            tableName: "nlq_safety_checks";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        overallPassed: import("drizzle-orm/pg-core").PgColumn<{
            name: "overall_passed";
            tableName: "nlq_safety_checks";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        violationCodes: import("drizzle-orm/pg-core").PgColumn<{
            name: "violation_codes";
            tableName: "nlq_safety_checks";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        violationSeverity: import("drizzle-orm/pg-core").PgColumn<{
            name: "violation_severity";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        detectionMethod: import("drizzle-orm/pg-core").PgColumn<{
            name: "detection_method";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        falsePositiveScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "false_positive_score";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        checkedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "checked_at";
            tableName: "nlq_safety_checks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        checkedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "checked_by";
            tableName: "nlq_safety_checks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        alertTriggered: import("drizzle-orm/pg-core").PgColumn<{
            name: "alert_triggered";
            tableName: "nlq_safety_checks";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * NLQ Cache Entries - Redis-backed cache for performance
 * Tracks cache hits, TTLs, and invalidation for p95 ≤2.5s performance
 */
export declare const nlqCacheEntries: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_cache_entries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_cache_entries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_key";
            tableName: "nlq_cache_entries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        normalizedQuery: import("drizzle-orm/pg-core").PgColumn<{
            name: "normalized_query";
            tableName: "nlq_cache_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        queryParams: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_params";
            tableName: "nlq_cache_entries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        resultData: import("drizzle-orm/pg-core").PgColumn<{
            name: "result_data";
            tableName: "nlq_cache_entries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        resultHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "result_hash";
            tableName: "nlq_cache_entries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        hitCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "hit_count";
            tableName: "nlq_cache_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastHitAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_hit_at";
            tableName: "nlq_cache_entries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        ttlSeconds: import("drizzle-orm/pg-core").PgColumn<{
            name: "ttl_seconds";
            tableName: "nlq_cache_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "nlq_cache_entries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        invalidated: import("drizzle-orm/pg-core").PgColumn<{
            name: "invalidated";
            tableName: "nlq_cache_entries";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        invalidatedReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "invalidated_reason";
            tableName: "nlq_cache_entries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        avgExecutionTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_execution_time_ms";
            tableName: "nlq_cache_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheGenerationTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_generation_time_ms";
            tableName: "nlq_cache_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "nlq_cache_entries";
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
            tableName: "nlq_cache_entries";
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
 * NLQ Rate Limits - Per-tenant query rate limiting
 * Prevents abuse and ensures fair resource allocation
 */
export declare const nlqRateLimits: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_rate_limits";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_rate_limits";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "nlq_rate_limits";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dailyQueryLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "daily_query_limit";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hourlyQueryLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "hourly_query_limit";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        concurrentQueryLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "concurrent_query_limit";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queriesUsedToday: import("drizzle-orm/pg-core").PgColumn<{
            name: "queries_used_today";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queriesUsedThisHour: import("drizzle-orm/pg-core").PgColumn<{
            name: "queries_used_this_hour";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currentConcurrent: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_concurrent";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dailyResetAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "daily_reset_at";
            tableName: "nlq_rate_limits";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hourlyResetAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "hourly_reset_at";
            tableName: "nlq_rate_limits";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        limitExceededCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "limit_exceeded_count";
            tableName: "nlq_rate_limits";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastLimitExceededAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_limit_exceeded_at";
            tableName: "nlq_rate_limits";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "nlq_rate_limits";
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
 * NLQ Adjudication Reviews - Human-in-the-Loop (HIL) review and approval workflow
 * Tracks manual review of NLQ outputs for quality assurance and model improvement
 */
export declare const adjudicationReviews: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "adjudication_reviews";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_id";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        decision: import("drizzle-orm/pg-core").PgColumn<{
            name: "decision";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        reviewedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_by";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_at";
            tableName: "adjudication_reviews";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        originalAnswer: import("drizzle-orm/pg-core").PgColumn<{
            name: "original_answer";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        revisedAnswer: import("drizzle-orm/pg-core").PgColumn<{
            name: "revised_answer";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        revisionReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "revision_reason";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        revisionType: import("drizzle-orm/pg-core").PgColumn<{
            name: "revision_type";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        confidenceRating: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence_rating";
            tableName: "adjudication_reviews";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        accuracyRating: import("drizzle-orm/pg-core").PgColumn<{
            name: "accuracy_rating";
            tableName: "adjudication_reviews";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        clarityRating: import("drizzle-orm/pg-core").PgColumn<{
            name: "clarity_rating";
            tableName: "adjudication_reviews";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        feedbackComments: import("drizzle-orm/pg-core").PgColumn<{
            name: "feedback_comments";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        routedToInsights: import("drizzle-orm/pg-core").PgColumn<{
            name: "routed_to_insights";
            tableName: "adjudication_reviews";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        insightId: import("drizzle-orm/pg-core").PgColumn<{
            name: "insight_id";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        promptVersionBefore: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_version_before";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        promptVersionAfter: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_version_after";
            tableName: "adjudication_reviews";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        reviewTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_time_ms";
            tableName: "adjudication_reviews";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "adjudication_reviews";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "adjudication_reviews";
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
 * Fairness Metrics - Track demographic parity and equality metrics for NLQ outputs
 * Monitors for bias and disparate impact across protected attributes
 */
export declare const fairnessMetrics: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "fairness_metrics";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metricDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric_date";
            tableName: "fairness_metrics";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodType: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_type";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metricType: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric_type";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        protectedAttribute: import("drizzle-orm/pg-core").PgColumn<{
            name: "protected_attribute";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        groupA: import("drizzle-orm/pg-core").PgColumn<{
            name: "group_a";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        groupB: import("drizzle-orm/pg-core").PgColumn<{
            name: "group_b";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        groupAValue: import("drizzle-orm/pg-core").PgColumn<{
            name: "group_a_value";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        groupBValue: import("drizzle-orm/pg-core").PgColumn<{
            name: "group_b_value";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        disparityRatio: import("drizzle-orm/pg-core").PgColumn<{
            name: "disparity_ratio";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        absoluteDifference: import("drizzle-orm/pg-core").PgColumn<{
            name: "absolute_difference";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sampleSizeA: import("drizzle-orm/pg-core").PgColumn<{
            name: "sample_size_a";
            tableName: "fairness_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sampleSizeB: import("drizzle-orm/pg-core").PgColumn<{
            name: "sample_size_b";
            tableName: "fairness_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        pValue: import("drizzle-orm/pg-core").PgColumn<{
            name: "p_value";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        confidenceInterval: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence_interval";
            tableName: "fairness_metrics";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        thresholdExceeded: import("drizzle-orm/pg-core").PgColumn<{
            name: "threshold_exceeded";
            tableName: "fairness_metrics";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        alertSeverity: import("drizzle-orm/pg-core").PgColumn<{
            name: "alert_severity";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        alertTriggered: import("drizzle-orm/pg-core").PgColumn<{
            name: "alert_triggered";
            tableName: "fairness_metrics";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        alertedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "alerted_at";
            tableName: "fairness_metrics";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queryCategory: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_category";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sampleQueries: import("drizzle-orm/pg-core").PgColumn<{
            name: "sample_queries";
            tableName: "fairness_metrics";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mitigationRequired: import("drizzle-orm/pg-core").PgColumn<{
            name: "mitigation_required";
            tableName: "fairness_metrics";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mitigationStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "mitigation_status";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        mitigationNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "mitigation_notes";
            tableName: "fairness_metrics";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "fairness_metrics";
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
            tableName: "fairness_metrics";
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
 * NLQ Prompt Versions - Version control for NLQ prompts with canary rollout support
 * Enables A/B testing and gradual rollout of prompt improvements
 */
export declare const nlqPromptVersions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "nlq_prompt_versions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        versionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "version_id";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        versionName: import("drizzle-orm/pg-core").PgColumn<{
            name: "version_name";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        promptType: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_type";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        promptTemplate: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_template";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        promptHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_hash";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        modelProvider: import("drizzle-orm/pg-core").PgColumn<{
            name: "model_provider";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        modelName: import("drizzle-orm/pg-core").PgColumn<{
            name: "model_name";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        temperature: import("drizzle-orm/pg-core").PgColumn<{
            name: "temperature";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxTokens: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_tokens";
            tableName: "nlq_prompt_versions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rolloutStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "rollout_status";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        canaryPercentage: import("drizzle-orm/pg-core").PgColumn<{
            name: "canary_percentage";
            tableName: "nlq_prompt_versions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgF1Score: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_f1_score";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgLatencyMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_latency_ms";
            tableName: "nlq_prompt_versions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgCostUsd: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_cost_usd";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        acceptanceRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "acceptance_rate";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evalRunId: import("drizzle-orm/pg-core").PgColumn<{
            name: "eval_run_id";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evalResults: import("drizzle-orm/pg-core").PgColumn<{
            name: "eval_results";
            tableName: "nlq_prompt_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        promotionCriteria: import("drizzle-orm/pg-core").PgColumn<{
            name: "promotion_criteria";
            tableName: "nlq_prompt_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rollbackCriteria: import("drizzle-orm/pg-core").PgColumn<{
            name: "rollback_criteria";
            tableName: "nlq_prompt_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        activatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "activated_at";
            tableName: "nlq_prompt_versions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        deprecatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "deprecated_at";
            tableName: "nlq_prompt_versions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tags: import("drizzle-orm/pg-core").PgColumn<{
            name: "tags";
            tableName: "nlq_prompt_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        changeLog: import("drizzle-orm/pg-core").PgColumn<{
            name: "change_log";
            tableName: "nlq_prompt_versions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "nlq_prompt_versions";
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
            tableName: "nlq_prompt_versions";
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
 * Query Performance Metrics - Track cost and latency by query signature
 * Enables performance monitoring and optimization at query pattern level
 */
export declare const queryPerformanceMetrics: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "query_performance_metrics";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        querySignature: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_signature";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        templateId: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_id";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        intentType: import("drizzle-orm/pg-core").PgColumn<{
            name: "intent_type";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metricDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "metric_date";
            tableName: "query_performance_metrics";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        windowType: import("drizzle-orm/pg-core").PgColumn<{
            name: "window_type";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        queryCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_count";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        uniqueCompanies: import("drizzle-orm/pg-core").PgColumn<{
            name: "unique_companies";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        uniqueUsers: import("drizzle-orm/pg-core").PgColumn<{
            name: "unique_users";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyP50: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_p50";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyP95: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_p95";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyP99: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_p99";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyMin: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_min";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyMax: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_max";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        latencyAvg: import("drizzle-orm/pg-core").PgColumn<{
            name: "latency_avg";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        totalCostUsd: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_cost_usd";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgCostUsd: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_cost_usd";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        totalTokens: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_tokens";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgTokens: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_tokens";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheHits: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_hits";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheMisses: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_misses";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cacheHitRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "cache_hit_rate";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        avgConfidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "avg_confidence";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        safetyViolations: import("drizzle-orm/pg-core").PgColumn<{
            name: "safety_violations";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_count";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_rate";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        successCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "success_count";
            tableName: "query_performance_metrics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        successRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "success_rate";
            tableName: "query_performance_metrics";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "query_performance_metrics";
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
//# sourceMappingURL=nlq.d.ts.map