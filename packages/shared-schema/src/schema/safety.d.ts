export declare const reviewQueueStatusEnum: import("drizzle-orm/pg-core").PgEnum<["pending", "reviewed", "escalated", "dismissed"]>;
export declare const safetyFlags: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "safety_flags";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        contentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "content_id";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        contentType: import("drizzle-orm/pg-core").PgColumn<{
            name: "content_type";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        flagReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "flag_reason";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        confidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requiresHumanReview: import("drizzle-orm/pg-core").PgColumn<{
            name: "requires_human_review";
            tableName: "safety_flags";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_status";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        reviewedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_by";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_notes";
            tableName: "safety_flags";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        reviewedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_at";
            tableName: "safety_flags";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        raisedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "raised_at";
            tableName: "safety_flags";
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
export declare const safetyReviewQueue: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "safety_review_queue";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "safety_review_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        flagId: import("drizzle-orm/pg-core").PgColumn<{
            name: "flag_id";
            tableName: "safety_review_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "safety_review_queue";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "escalated" | "pending" | "reviewed" | "dismissed";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["pending", "reviewed", "escalated", "dismissed"];
            baseColumn: never;
        }, {}, {}>;
        assignedTo: import("drizzle-orm/pg-core").PgColumn<{
            name: "assigned_to";
            tableName: "safety_review_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_at";
            tableName: "safety_review_queue";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reviewerNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewer_notes";
            tableName: "safety_review_queue";
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
            tableName: "safety_review_queue";
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
//# sourceMappingURL=safety.d.ts.map