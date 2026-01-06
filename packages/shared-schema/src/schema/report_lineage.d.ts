/**
 * Report lineage table for audit trail and provenance tracking
 * Stores metadata about generated reports including model, prompts, and citations
 */
export declare const reportLineage: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "report_lineage";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reportId: import("drizzle-orm/pg-core").PgColumn<{
            name: "report_id";
            tableName: "report_lineage";
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
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_start";
            tableName: "report_lineage";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_end";
            tableName: "report_lineage";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        modelName: import("drizzle-orm/pg-core").PgColumn<{
            name: "model_name";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        modelVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "model_version";
            tableName: "report_lineage";
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
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        promptVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt_version";
            tableName: "report_lineage";
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
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        locale: import("drizzle-orm/pg-core").PgColumn<{
            name: "locale";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tokensInput: import("drizzle-orm/pg-core").PgColumn<{
            name: "tokens_input";
            tableName: "report_lineage";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tokensOutput: import("drizzle-orm/pg-core").PgColumn<{
            name: "tokens_output";
            tableName: "report_lineage";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tokensTotal: import("drizzle-orm/pg-core").PgColumn<{
            name: "tokens_total";
            tableName: "report_lineage";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        estimatedCostUsd: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_cost_usd";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        deterministic: import("drizzle-orm/pg-core").PgColumn<{
            name: "deterministic";
            tableName: "report_lineage";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        temperature: import("drizzle-orm/pg-core").PgColumn<{
            name: "temperature";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sections: import("drizzle-orm/pg-core").PgColumn<{
            name: "sections";
            tableName: "report_lineage";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        citationCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "citation_count";
            tableName: "report_lineage";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evidenceSnippetIds: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence_snippet_ids";
            tableName: "report_lineage";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestId: import("drizzle-orm/pg-core").PgColumn<{
            name: "request_id";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        durationMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "duration_ms";
            tableName: "report_lineage";
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
            tableName: "report_lineage";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "report_lineage";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Report sections table - stores individual sections of generated reports
 * Allows granular tracking of which sections were generated and their citations
 */
export declare const reportSections: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "report_sections";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "report_sections";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lineageId: import("drizzle-orm/pg-core").PgColumn<{
            name: "lineage_id";
            tableName: "report_sections";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sectionType: import("drizzle-orm/pg-core").PgColumn<{
            name: "section_type";
            tableName: "report_sections";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        content: import("drizzle-orm/pg-core").PgColumn<{
            name: "content";
            tableName: "report_sections";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        citationIds: import("drizzle-orm/pg-core").PgColumn<{
            name: "citation_ids";
            tableName: "report_sections";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        wordCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "word_count";
            tableName: "report_sections";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        characterCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "character_count";
            tableName: "report_sections";
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
            tableName: "report_sections";
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
 * Report citations table - stores individual citations used in reports
 * Links generated content back to evidence snippets for auditability
 */
export declare const reportCitations: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "report_citations";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lineageId: import("drizzle-orm/pg-core").PgColumn<{
            name: "lineage_id";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sectionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "section_id";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        citationNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "citation_number";
            tableName: "report_citations";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        snippetId: import("drizzle-orm/pg-core").PgColumn<{
            name: "snippet_id";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        snippetText: import("drizzle-orm/pg-core").PgColumn<{
            name: "snippet_text";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        relevanceScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "relevance_score";
            tableName: "report_citations";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        positionInText: import("drizzle-orm/pg-core").PgColumn<{
            name: "position_in_text";
            tableName: "report_citations";
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
            tableName: "report_citations";
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
//# sourceMappingURL=report_lineage.d.ts.map