/**
 * Billing & Subscription Schema
 * Handles subscriptions, usage metering, invoices for commercial platform
 */
export declare const subscriptionPlanEnum: import("drizzle-orm/pg-core").PgEnum<["starter", "pro", "enterprise", "custom", "essentials", "professional"]>;
export declare const l2iSkuEnum: import("drizzle-orm/pg-core").PgEnum<["L2I-250", "L2I-500", "L2I-EXPAND", "L2I-LAUNCH"]>;
export declare const l2iProgramEnum: import("drizzle-orm/pg-core").PgEnum<["language", "mentorship", "upskilling", "weei"]>;
export declare const recognitionBadgeEnum: import("drizzle-orm/pg-core").PgEnum<["bronze", "silver", "gold", "platinum"]>;
export declare const subscriptionStatusEnum: import("drizzle-orm/pg-core").PgEnum<["active", "trialing", "past_due", "canceled", "unpaid"]>;
export declare const invoiceStatusEnum: import("drizzle-orm/pg-core").PgEnum<["draft", "open", "paid", "void", "uncollectible"]>;
export declare const usageEventTypeEnum: import("drizzle-orm/pg-core").PgEnum<["q2q_tokens", "reports_generated", "active_seats", "nlq_queries", "ai_tokens_input", "ai_tokens_output", "storage_gb", "compute_hours"]>;
export declare const l2iBundleTierEnum: import("drizzle-orm/pg-core").PgEnum<["foundation", "growth", "expand", "launch"]>;
export declare const l2iProgramTagEnum: import("drizzle-orm/pg-core").PgEnum<["language", "mentorship", "upskilling", "weei"]>;
export declare const l2iBundleStatusEnum: import("drizzle-orm/pg-core").PgEnum<["active", "expired", "consumed", "revoked"]>;
/**
 * Billing Customers - Links companies to Stripe customers
 */
export declare const billingCustomers: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_customers";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_customers";
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
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeCustomerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_customer_id";
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        email: import("drizzle-orm/pg-core").PgColumn<{
            name: "email";
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        taxId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tax_id";
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        billingEmail: import("drizzle-orm/pg-core").PgColumn<{
            name: "billing_email";
            tableName: "billing_customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        billingAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "billing_address";
            tableName: "billing_customers";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                line1?: string;
                line2?: string;
                city?: string;
                state?: string;
                postalCode?: string;
                country?: string;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        customerPortalUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_portal_url";
            tableName: "billing_customers";
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
            tableName: "billing_customers";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "billing_customers";
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
            tableName: "billing_customers";
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
 * Subscriptions - Company subscription plans
 */
export declare const billingSubscriptions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_subscriptions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_subscriptions";
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
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        customerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_id";
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeSubscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_subscription_id";
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        stripePriceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_price_id";
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        plan: import("drizzle-orm/pg-core").PgColumn<{
            name: "plan";
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "custom" | "professional" | "starter" | "pro" | "enterprise" | "essentials";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["starter", "pro", "enterprise", "custom", "essentials", "professional"];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "billing_subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["active", "trialing", "past_due", "canceled", "unpaid"];
            baseColumn: never;
        }, {}, {}>;
        seatCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "seat_count";
            tableName: "billing_subscriptions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currentPeriodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_period_start";
            tableName: "billing_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currentPeriodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_period_end";
            tableName: "billing_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        trialStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "trial_start";
            tableName: "billing_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        trialEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "trial_end";
            tableName: "billing_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cancelAtPeriodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "cancel_at_period_end";
            tableName: "billing_subscriptions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        canceledAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "canceled_at";
            tableName: "billing_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "billing_subscriptions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "billing_subscriptions";
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
            tableName: "billing_subscriptions";
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
 * Usage Records - Metered events for billing
 */
export declare const billingUsageRecords: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_usage_records";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_usage_records";
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
            tableName: "billing_usage_records";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        subscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subscription_id";
            tableName: "billing_usage_records";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "billing_usage_records";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "nlq_queries" | "q2q_tokens" | "reports_generated" | "active_seats" | "ai_tokens_input" | "ai_tokens_output" | "storage_gb" | "compute_hours";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["q2q_tokens", "reports_generated", "active_seats", "nlq_queries", "ai_tokens_input", "ai_tokens_output", "storage_gb", "compute_hours"];
            baseColumn: never;
        }, {}, {}>;
        quantity: import("drizzle-orm/pg-core").PgColumn<{
            name: "quantity";
            tableName: "billing_usage_records";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        deduplicationKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "deduplication_key";
            tableName: "billing_usage_records";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        eventTimestamp: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_timestamp";
            tableName: "billing_usage_records";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reportedToStripe: import("drizzle-orm/pg-core").PgColumn<{
            name: "reported_to_stripe";
            tableName: "billing_usage_records";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reportedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reported_at";
            tableName: "billing_usage_records";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeUsageRecordId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_usage_record_id";
            tableName: "billing_usage_records";
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
            tableName: "billing_usage_records";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                userId?: string;
                resourceId?: string;
                modelName?: string;
                sessionId?: string;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "billing_usage_records";
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
 * Invoices - Generated invoices
 */
export declare const billingInvoices: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_invoices";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_invoices";
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
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        customerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_id";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        subscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subscription_id";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeInvoiceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_invoice_id";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        stripePaymentIntentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_payment_intent_id";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        invoiceNumber: import("drizzle-orm/pg-core").PgColumn<{
            name: "invoice_number";
            tableName: "billing_invoices";
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
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "void" | "draft" | "open" | "paid" | "uncollectible";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["draft", "open", "paid", "void", "uncollectible"];
            baseColumn: never;
        }, {}, {}>;
        subtotal: import("drizzle-orm/pg-core").PgColumn<{
            name: "subtotal";
            tableName: "billing_invoices";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tax: import("drizzle-orm/pg-core").PgColumn<{
            name: "tax";
            tableName: "billing_invoices";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        total: import("drizzle-orm/pg-core").PgColumn<{
            name: "total";
            tableName: "billing_invoices";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        amountDue: import("drizzle-orm/pg-core").PgColumn<{
            name: "amount_due";
            tableName: "billing_invoices";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        amountPaid: import("drizzle-orm/pg-core").PgColumn<{
            name: "amount_paid";
            tableName: "billing_invoices";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currency: import("drizzle-orm/pg-core").PgColumn<{
            name: "currency";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        periodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_start";
            tableName: "billing_invoices";
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
            tableName: "billing_invoices";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dueDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "due_date";
            tableName: "billing_invoices";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        paidAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "paid_at";
            tableName: "billing_invoices";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        invoicePdfUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "invoice_pdf_url";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        hostedInvoiceUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "hosted_invoice_url";
            tableName: "billing_invoices";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        lineItems: import("drizzle-orm/pg-core").PgColumn<{
            name: "line_items";
            tableName: "billing_invoices";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                description: string;
                quantity: number;
                unitPrice: number;
                amount: number;
                period?: {
                    start: string;
                    end: string;
                };
            }[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "billing_invoices";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "billing_invoices";
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
            tableName: "billing_invoices";
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
 * Billing Events - Audit trail for billing operations
 */
export declare const billingEvents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_events";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_events";
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
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        eventSource: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_source";
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        stripeEventId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_event_id";
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        subscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subscription_id";
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        invoiceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "invoice_id";
            tableName: "billing_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        payload: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload";
            tableName: "billing_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        processed: import("drizzle-orm/pg-core").PgColumn<{
            name: "processed";
            tableName: "billing_events";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        processedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "processed_at";
            tableName: "billing_events";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        error: import("drizzle-orm/pg-core").PgColumn<{
            name: "error";
            tableName: "billing_events";
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
            tableName: "billing_events";
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
 * Plan Features - Feature limits per plan
 */
export declare const billingPlanFeatures: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "billing_plan_features";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "billing_plan_features";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        plan: import("drizzle-orm/pg-core").PgColumn<{
            name: "plan";
            tableName: "billing_plan_features";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "custom" | "professional" | "starter" | "pro" | "enterprise" | "essentials";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["starter", "pro", "enterprise", "custom", "essentials", "professional"];
            baseColumn: never;
        }, {}, {}>;
        maxSeats: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_seats";
            tableName: "billing_plan_features";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxReportsPerMonth: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_reports_per_month";
            tableName: "billing_plan_features";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxAiTokensPerMonth: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_ai_tokens_per_month";
            tableName: "billing_plan_features";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxStorageGB: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_storage_gb";
            tableName: "billing_plan_features";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        features: import("drizzle-orm/pg-core").PgColumn<{
            name: "features";
            tableName: "billing_plan_features";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                reportBuilder: boolean;
                boardroomLive: boolean;
                forecast: boolean;
                benchmarking: boolean;
                nlq: boolean;
                aiCopilot: boolean;
                genAiReports: boolean;
                copilot: boolean;
                multiRegion: boolean;
                connectors: boolean;
                apiAccess: boolean;
                externalConnectors: boolean;
                sso: boolean;
                customBranding: boolean;
                prioritySupport: boolean;
                scimProvisioning: boolean;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        basePrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "base_price";
            tableName: "billing_plan_features";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        seatPrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "seat_price";
            tableName: "billing_plan_features";
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
            tableName: "billing_plan_features";
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
            tableName: "billing_plan_features";
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
 * L2I Bundles - License-to-Impact bundle SKU definitions
 */
export declare const l2iBundles: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "l2i_bundles";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sku: import("drizzle-orm/pg-core").PgColumn<{
            name: "sku";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "L2I-250" | "L2I-500" | "L2I-EXPAND" | "L2I-LAUNCH";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["L2I-250", "L2I-500", "L2I-EXPAND", "L2I-LAUNCH"];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "l2i_bundles";
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
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        annualPrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "annual_price";
            tableName: "l2i_bundles";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currency: import("drizzle-orm/pg-core").PgColumn<{
            name: "currency";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        impactTier: import("drizzle-orm/pg-core").PgColumn<{
            name: "impact_tier";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        learnersSupported: import("drizzle-orm/pg-core").PgColumn<{
            name: "learners_supported";
            tableName: "l2i_bundles";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        recognitionBadge: import("drizzle-orm/pg-core").PgColumn<{
            name: "recognition_badge";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "bronze" | "silver" | "gold" | "platinum";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["bronze", "silver", "gold", "platinum"];
            baseColumn: never;
        }, {}, {}>;
        foundingMember: import("drizzle-orm/pg-core").PgColumn<{
            name: "founding_member";
            tableName: "l2i_bundles";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        defaultAllocation: import("drizzle-orm/pg-core").PgColumn<{
            name: "default_allocation";
            tableName: "l2i_bundles";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                language: number;
                mentorship: number;
                upskilling: number;
                weei: number;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripePriceId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_price_id";
            tableName: "l2i_bundles";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        active: import("drizzle-orm/pg-core").PgColumn<{
            name: "active";
            tableName: "l2i_bundles";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "l2i_bundles";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "l2i_bundles";
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
            tableName: "l2i_bundles";
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
 * L2I Subscriptions - Company purchases of L2I bundles
 */
export declare const l2iSubscriptions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "l2i_subscriptions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "l2i_subscriptions";
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
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        bundleId: import("drizzle-orm/pg-core").PgColumn<{
            name: "bundle_id";
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        subscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "subscription_id";
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sku: import("drizzle-orm/pg-core").PgColumn<{
            name: "sku";
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "L2I-250" | "L2I-500" | "L2I-EXPAND" | "L2I-LAUNCH";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["L2I-250", "L2I-500", "L2I-EXPAND", "L2I-LAUNCH"];
            baseColumn: never;
        }, {}, {}>;
        quantity: import("drizzle-orm/pg-core").PgColumn<{
            name: "quantity";
            tableName: "l2i_subscriptions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        stripeSubscriptionItemId: import("drizzle-orm/pg-core").PgColumn<{
            name: "stripe_subscription_item_id";
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        currentPeriodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_period_start";
            tableName: "l2i_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        currentPeriodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "current_period_end";
            tableName: "l2i_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "l2i_subscriptions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["active", "trialing", "past_due", "canceled", "unpaid"];
            baseColumn: never;
        }, {}, {}>;
        cancelAtPeriodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "cancel_at_period_end";
            tableName: "l2i_subscriptions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        canceledAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "canceled_at";
            tableName: "l2i_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        programAllocation: import("drizzle-orm/pg-core").PgColumn<{
            name: "program_allocation";
            tableName: "l2i_subscriptions";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                language: number;
                mentorship: number;
                upskilling: number;
                weei: number;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        learnersServedToDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "learners_served_to_date";
            tableName: "l2i_subscriptions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastImpactUpdateAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_impact_update_at";
            tableName: "l2i_subscriptions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "l2i_subscriptions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "l2i_subscriptions";
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
            tableName: "l2i_subscriptions";
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
 * L2I Allocations - Track program-level impact allocations
 */
export declare const l2iAllocations: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "l2i_allocations";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        l2iSubscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "l2i_subscription_id";
            tableName: "l2i_allocations";
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
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        program: import("drizzle-orm/pg-core").PgColumn<{
            name: "program";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "language" | "mentorship" | "upskilling" | "weei";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["language", "mentorship", "upskilling", "weei"];
            baseColumn: never;
        }, {}, {}>;
        allocationPercentage: import("drizzle-orm/pg-core").PgColumn<{
            name: "allocation_percentage";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        allocationAmountUSD: import("drizzle-orm/pg-core").PgColumn<{
            name: "allocation_amount_usd";
            tableName: "l2i_allocations";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        learnersServed: import("drizzle-orm/pg-core").PgColumn<{
            name: "learners_served";
            tableName: "l2i_allocations";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        averageSROI: import("drizzle-orm/pg-core").PgColumn<{
            name: "average_sroi";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        averageVIS: import("drizzle-orm/pg-core").PgColumn<{
            name: "average_vis";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        engagementRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "engagement_rate";
            tableName: "l2i_allocations";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evidenceSnippets: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence_snippets";
            tableName: "l2i_allocations";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                evidenceId: string;
                learnerName: string;
                outcome: string;
                sroi: number;
            }[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_start";
            tableName: "l2i_allocations";
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
            tableName: "l2i_allocations";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastCalculatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_calculated_at";
            tableName: "l2i_allocations";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "l2i_allocations";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "l2i_allocations";
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
            tableName: "l2i_allocations";
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
 * L2I Impact Events - Audit trail for impact updates
 */
export declare const l2iImpactEvents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "l2i_impact_events";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        l2iSubscriptionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "l2i_subscription_id";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        allocationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "allocation_id";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        companyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "company_id";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        eventType: import("drizzle-orm/pg-core").PgColumn<{
            name: "event_type";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        program: import("drizzle-orm/pg-core").PgColumn<{
            name: "program";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "language" | "mentorship" | "upskilling" | "weei";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["language", "mentorship", "upskilling", "weei"];
            baseColumn: never;
        }, {}, {}>;
        learnerIds: import("drizzle-orm/pg-core").PgColumn<{
            name: "learner_ids";
            tableName: "l2i_impact_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        outcomeMetrics: import("drizzle-orm/pg-core").PgColumn<{
            name: "outcome_metrics";
            tableName: "l2i_impact_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                sroi?: number;
                vis?: number;
                engagement?: number;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceSystem: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_system";
            tableName: "l2i_impact_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sourceEventId: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_event_id";
            tableName: "l2i_impact_events";
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
            tableName: "l2i_impact_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "l2i_impact_events";
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
//# sourceMappingURL=billing.d.ts.map