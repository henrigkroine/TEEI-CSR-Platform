/**
 * Idempotency Schema
 *
 * Tracks processed events and webhook deliveries to prevent duplicate processing.
 * Ensures exactly-once semantics for event-driven systems and webhook handlers.
 */
/**
 * Event Deduplication Table
 *
 * Tracks processed NATS events by eventId to prevent duplicate processing.
 * Used by event subscribers to ensure idempotent event handling.
 */
export declare const eventDeduplication: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "event_deduplication";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "event_deduplication";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventId: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_id";
            tableName: "event_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "event_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        consumerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "consumer_id";
            tableName: "event_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        processedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "processed_at";
            tableName: "event_deduplication";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        success: import("drizzle-orm/pg-core").PgColumn<{
            name: "success";
            tableName: "event_deduplication";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "event_deduplication";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "event_deduplication";
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
            tableName: "event_deduplication";
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
 * Webhook Delivery Deduplication Table
 *
 * Tracks webhook deliveries by deliveryId to handle retries and prevent duplicate processing.
 * External systems may retry webhook deliveries on timeout or failure.
 */
export declare const webhookDeduplication: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "webhook_deduplication";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        deliveryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "delivery_id";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        webhookSource: import("drizzle-orm/pg-core").PgColumn<{
            name: "webhook_source";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        webhookType: import("drizzle-orm/pg-core").PgColumn<{
            name: "webhook_type";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        receivedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "received_at";
            tableName: "webhook_deduplication";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        processedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "processed_at";
            tableName: "webhook_deduplication";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        success: import("drizzle-orm/pg-core").PgColumn<{
            name: "success";
            tableName: "webhook_deduplication";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        statusCode: import("drizzle-orm/pg-core").PgColumn<{
            name: "status_code";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        retryCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "retry_count";
            tableName: "webhook_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        payload: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload";
            tableName: "webhook_deduplication";
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
            tableName: "webhook_deduplication";
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
 * API Request Deduplication Table
 *
 * Tracks idempotency keys for API requests to prevent duplicate operations.
 * Clients can provide an Idempotency-Key header to ensure safe retries.
 */
export declare const apiRequestDeduplication: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "api_request_deduplication";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        idempotencyKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "idempotency_key";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        endpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "endpoint";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        method: import("drizzle-orm/pg-core").PgColumn<{
            name: "method";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        requestedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "requested_at";
            tableName: "api_request_deduplication";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        completedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "completed_at";
            tableName: "api_request_deduplication";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        statusCode: import("drizzle-orm/pg-core").PgColumn<{
            name: "status_code";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        responseBody: import("drizzle-orm/pg-core").PgColumn<{
            name: "response_body";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "api_request_deduplication";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "api_request_deduplication";
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
            tableName: "api_request_deduplication";
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
 * Type exports for TypeScript
 */
export type EventDeduplication = typeof eventDeduplication.$inferSelect;
export type NewEventDeduplication = typeof eventDeduplication.$inferInsert;
export type WebhookDeduplication = typeof webhookDeduplication.$inferSelect;
export type NewWebhookDeduplication = typeof webhookDeduplication.$inferInsert;
export type ApiRequestDeduplication = typeof apiRequestDeduplication.$inferSelect;
export type NewApiRequestDeduplication = typeof apiRequestDeduplication.$inferInsert;
//# sourceMappingURL=idempotency.d.ts.map