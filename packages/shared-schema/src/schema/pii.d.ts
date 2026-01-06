/**
 * PII (Personally Identifiable Information) Schema
 *
 * Stores encrypted sensitive personal data in a separate schema for:
 * - Enhanced security (field-level encryption)
 * - GDPR compliance (easier data export/deletion)
 * - Data sovereignty (can be geographically partitioned)
 * - Access control (separate permissions from business data)
 *
 * All sensitive fields are stored encrypted at rest using AES-256-GCM.
 * Encryption keys are derived from a master key with user/field-specific context.
 */
/**
 * Encrypted User PII
 *
 * Contains sensitive personal information that requires encryption.
 * Each field is individually encrypted to support granular access control.
 */
export declare const encryptedUserPii: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "encrypted_user_pii";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "encrypted_user_pii";
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
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        encryptedEmail: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_email";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedPhone: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_phone";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_address";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedDateOfBirth: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_date_of_birth";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedNationalId: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_national_id";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedEmergencyContact: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_emergency_contact";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptionKeyVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "encryption_key_version";
            tableName: "encrypted_user_pii";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        encryptedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "encrypted_at";
            tableName: "encrypted_user_pii";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastRotated: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_rotated";
            tableName: "encrypted_user_pii";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        consentGiven: import("drizzle-orm/pg-core").PgColumn<{
            name: "consent_given";
            tableName: "encrypted_user_pii";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        consentDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "consent_date";
            tableName: "encrypted_user_pii";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        processingPurpose: import("drizzle-orm/pg-core").PgColumn<{
            name: "processing_purpose";
            tableName: "encrypted_user_pii";
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
            tableName: "encrypted_user_pii";
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
            tableName: "encrypted_user_pii";
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
 * PII Access Log
 *
 * Records every access to encrypted PII for compliance and security monitoring.
 * Required for GDPR Article 30 (record of processing activities).
 */
export declare const piiAccessLog: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "pii_access_log";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "pii_access_log";
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
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        accessorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "accessor_id";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        accessorRole: import("drizzle-orm/pg-core").PgColumn<{
            name: "accessor_role";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accessorIp: import("drizzle-orm/pg-core").PgColumn<{
            name: "accessor_ip";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accessType: import("drizzle-orm/pg-core").PgColumn<{
            name: "access_type";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        fieldsAccessed: import("drizzle-orm/pg-core").PgColumn<{
            name: "fields_accessed";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accessReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "access_reason";
            tableName: "pii_access_log";
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
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        endpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "endpoint";
            tableName: "pii_access_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accessedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "accessed_at";
            tableName: "pii_access_log";
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
 * PII Deletion Queue
 *
 * Tracks PII scheduled for deletion (e.g., GDPR right to be forgotten).
 * Supports graceful deletion across all systems with verification.
 */
export declare const piiDeletionQueue: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "pii_deletion_queue";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "pii_deletion_queue";
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
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "requested_by";
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "requested_at";
            tableName: "pii_deletion_queue";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "request_reason";
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        scheduledFor: import("drizzle-orm/pg-core").PgColumn<{
            name: "scheduled_for";
            tableName: "pii_deletion_queue";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        completedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "completed_at";
            tableName: "pii_deletion_queue";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        systemsDeleted: import("drizzle-orm/pg-core").PgColumn<{
            name: "systems_deleted";
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        verificationHash: import("drizzle-orm/pg-core").PgColumn<{
            name: "verification_hash";
            tableName: "pii_deletion_queue";
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
            tableName: "pii_deletion_queue";
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
            tableName: "pii_deletion_queue";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "pii_deletion_queue";
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
 * Encryption Key Rotation Log
 *
 * Tracks key rotation events for audit and recovery purposes.
 */
export declare const encryptionKeyRotationLog: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "encryption_key_rotation_log";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        oldKeyVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "old_key_version";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        newKeyVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "new_key_version";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        rotatedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "rotated_by";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rotationReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "rotation_reason";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        recordsToRotate: import("drizzle-orm/pg-core").PgColumn<{
            name: "records_to_rotate";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        recordsRotated: import("drizzle-orm/pg-core").PgColumn<{
            name: "records_rotated";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "encryption_key_rotation_log";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        startedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "started_at";
            tableName: "encryption_key_rotation_log";
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
            tableName: "encryption_key_rotation_log";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
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
 * Index suggestions (to be created in migration):
 *
 * CREATE INDEX idx_encrypted_user_pii_user_id ON encrypted_user_pii(user_id);
 * CREATE INDEX idx_encrypted_user_pii_company_id ON encrypted_user_pii(company_id);
 * CREATE INDEX idx_pii_access_log_user_id ON pii_access_log(user_id);
 * CREATE INDEX idx_pii_access_log_accessor_id ON pii_access_log(accessor_id);
 * CREATE INDEX idx_pii_access_log_accessed_at ON pii_access_log(accessed_at DESC);
 * CREATE INDEX idx_pii_deletion_queue_status ON pii_deletion_queue(status);
 * CREATE INDEX idx_pii_deletion_queue_scheduled_for ON pii_deletion_queue(scheduled_for);
 */
//# sourceMappingURL=pii.d.ts.map