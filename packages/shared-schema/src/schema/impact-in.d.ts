export declare const platformEnum: import("drizzle-orm/pg-core").PgEnum<["benevity", "goodera", "workday"]>;
export declare const deliveryStatusEnum: import("drizzle-orm/pg-core").PgEnum<["pending", "delivered", "failed", "retrying"]>;
export declare const scheduleStatusEnum: import("drizzle-orm/pg-core").PgEnum<["pending", "success", "failed"]>;
export declare const impactDeliveries: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "impact_deliveries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "impact_deliveries";
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
            tableName: "impact_deliveries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        platform: import("drizzle-orm/pg-core").PgColumn<{
            name: "platform";
            tableName: "impact_deliveries";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "benevity" | "goodera" | "workday";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["benevity", "goodera", "workday"];
            baseColumn: never;
        }, {}, {}>;
        payloadHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload_hash";
            tableName: "impact_deliveries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        payloadSample: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload_sample";
            tableName: "impact_deliveries";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "impact_deliveries";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "failed" | "pending" | "delivered" | "retrying";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["pending", "delivered", "failed", "retrying"];
            baseColumn: never;
        }, {}, {}>;
        retries: import("drizzle-orm/pg-core").PgColumn<{
            name: "retries";
            tableName: "impact_deliveries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorMsg: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_msg";
            tableName: "impact_deliveries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        deliveredAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "delivered_at";
            tableName: "impact_deliveries";
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
            tableName: "impact_deliveries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        scheduleId: import("drizzle-orm/pg-core").PgColumn<{
            name: "schedule_id";
            tableName: "impact_deliveries";
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
export declare const scheduledDeliveries: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "scheduled_deliveries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "scheduled_deliveries";
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
            tableName: "scheduled_deliveries";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        platform: import("drizzle-orm/pg-core").PgColumn<{
            name: "platform";
            tableName: "scheduled_deliveries";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "benevity" | "goodera" | "workday";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["benevity", "goodera", "workday"];
            baseColumn: never;
        }, {}, {}>;
        schedule: import("drizzle-orm/pg-core").PgColumn<{
            name: "schedule";
            tableName: "scheduled_deliveries";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        nextRun: import("drizzle-orm/pg-core").PgColumn<{
            name: "next_run";
            tableName: "scheduled_deliveries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastRun: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_run";
            tableName: "scheduled_deliveries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_status";
            tableName: "scheduled_deliveries";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "success" | "failed" | "pending";
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: ["pending", "success", "failed"];
            baseColumn: never;
        }, {}, {}>;
        lastError: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_error";
            tableName: "scheduled_deliveries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        active: import("drizzle-orm/pg-core").PgColumn<{
            name: "active";
            tableName: "scheduled_deliveries";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "scheduled_deliveries";
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
            tableName: "scheduled_deliveries";
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
 * OAuth tokens for external platforms (Workday, Goodera if OAuth enabled)
 * Stores access tokens with expiry for secure, persistent authentication
 */
export declare const impactProviderTokens: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "impact_provider_tokens";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "impact_provider_tokens";
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
            tableName: "impact_provider_tokens";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        provider: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider";
            tableName: "impact_provider_tokens";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "benevity" | "goodera" | "workday";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["benevity", "goodera", "workday"];
            baseColumn: never;
        }, {}, {}>;
        accessToken: import("drizzle-orm/pg-core").PgColumn<{
            name: "access_token";
            tableName: "impact_provider_tokens";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tokenType: import("drizzle-orm/pg-core").PgColumn<{
            name: "token_type";
            tableName: "impact_provider_tokens";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "impact_provider_tokens";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "impact_provider_tokens";
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
            tableName: "impact_provider_tokens";
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
//# sourceMappingURL=impact-in.d.ts.map