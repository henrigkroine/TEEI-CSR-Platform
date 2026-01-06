/**
 * Evidence Ledger - Append-only tamper-proof audit log for evidence citations
 *
 * Purpose: Cryptographically secure tracking of all evidence usage in generated reports
 * Compliance: SOC2, ISO 27001, AI Act Article 13 (record keeping), CSRD assurance
 *
 * Features:
 * - SHA-256 content digests for tamper detection
 * - Append-only: no updates or deletes allowed
 * - Version tracking for evidence edits
 * - Editor/signer attribution
 * - No PII: only references and digests
 *
 * Security: Digests enable independent verification of evidence integrity
 */
export declare const evidenceLedger: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "evidence_ledger";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evidenceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence_id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evidenceType: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence_type";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        contentDigest: import("drizzle-orm/pg-core").PgColumn<{
            name: "content_digest";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        previousDigest: import("drizzle-orm/pg-core").PgColumn<{
            name: "previous_digest";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        version: import("drizzle-orm/pg-core").PgColumn<{
            name: "version";
            tableName: "evidence_ledger";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        editorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "editor_id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        editorRole: import("drizzle-orm/pg-core").PgColumn<{
            name: "editor_role";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        signerIdentity: import("drizzle-orm/pg-core").PgColumn<{
            name: "signer_identity";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        reportId: import("drizzle-orm/pg-core").PgColumn<{
            name: "report_id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lineageId: import("drizzle-orm/pg-core").PgColumn<{
            name: "lineage_id";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        operationContext: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation_context";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tamperDetected: import("drizzle-orm/pg-core").PgColumn<{
            name: "tamper_detected";
            tableName: "evidence_ledger";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tamperDetails: import("drizzle-orm/pg-core").PgColumn<{
            name: "tamper_details";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        recordedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "recorded_at";
            tableName: "evidence_ledger";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        effectiveAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "effective_at";
            tableName: "evidence_ledger";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        retentionUntil: import("drizzle-orm/pg-core").PgColumn<{
            name: "retention_until";
            tableName: "evidence_ledger";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        ipAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "ip_address";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userAgent: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_agent";
            tableName: "evidence_ledger";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Evidence Ledger Events - Audit trail for ledger operations
 * Tracks all read/write operations to the evidence ledger itself
 * For security monitoring and compliance audits
 */
export declare const evidenceLedgerAudit: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "evidence_ledger_audit";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        operationType: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation_type";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ledgerEntryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "ledger_entry_id";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        actorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_id";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        actorType: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_type";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        success: import("drizzle-orm/pg-core").PgColumn<{
            name: "success";
            tableName: "evidence_ledger_audit";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorCode: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_code";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        performedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "performed_at";
            tableName: "evidence_ledger_audit";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestId: import("drizzle-orm/pg-core").PgColumn<{
            name: "request_id";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ipAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "ip_address";
            tableName: "evidence_ledger_audit";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=evidence_ledger.d.ts.map