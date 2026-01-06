/**
 * Upskilling Connector Payload Validation
 *
 * Versioned Zod schemas for validating upskilling provider API payloads.
 * Supports multiple providers: eCornell, itslearning, and generic LMS integrations.
 *
 * @module validation/payload-schema
 */

import { z } from 'zod';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value: unknown;
  }>;
}

// ============================================================================
// Common Validators
// ============================================================================

const uuidValidator = z.string().uuid();
const timestampValidator = z.string().datetime();
const progressValidator = z.number().int().min(0).max(100);
const statusValidator = z.enum(['enrolled', 'in_progress', 'completed', 'dropped']);
const providerValidator = z.enum(['ecornell', 'itslearning', 'generic']);

// ============================================================================
// Learning Progress Payloads (Version 1.0)
// ============================================================================

export const LearningProgressPayloadV1 = z.object({
  user_id: uuidValidator,
  provider: providerValidator,
  course_id: z.string().min(1).max(255),
  course_name: z.string().min(1).max(255),
  status: statusValidator,
  progress_percent: progressValidator.optional(),
  started_at: timestampValidator.optional(),
  completed_at: timestampValidator.optional(),
  credential_ref: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type LearningProgressPayloadV1Type = z.infer<typeof LearningProgressPayloadV1>;

// ============================================================================
// eCornell Webhook Payloads (Version 1.0)
// ============================================================================

export const ECornellWebhookPayloadV1 = z.object({
  event_type: z.enum(['enrollment.created', 'course.started', 'course.completed', 'certificate.issued']),
  event_id: z.string().min(1).max(255),
  timestamp: timestampValidator,
  user: z.object({
    external_id: z.string().min(1).max(255),
    email: z.string().email(),
    first_name: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
  }),
  course: z.object({
    course_id: z.string().min(1).max(255),
    course_name: z.string().min(1).max(255),
    course_url: z.string().url().optional(),
  }),
  progress: z.object({
    status: statusValidator,
    percent_complete: progressValidator.optional(),
    started_at: timestampValidator.optional(),
    completed_at: timestampValidator.optional(),
  }),
  certificate: z.object({
    certificate_id: z.string().max(255).optional(),
    certificate_url: z.string().url().optional(),
    issued_at: timestampValidator.optional(),
  }).optional(),
});

export type ECornellWebhookPayloadV1Type = z.infer<typeof ECornellWebhookPayloadV1>;

// ============================================================================
// itslearning Webhook Payloads (Version 1.0)
// ============================================================================

export const ItsLearningWebhookPayloadV1 = z.object({
  eventType: z.enum(['CourseEnrollment', 'CourseProgress', 'CourseCompletion']),
  eventId: z.string().min(1).max(255),
  timestamp: timestampValidator,
  userId: z.string().min(1).max(255),
  userEmail: z.string().email(),
  courseId: z.string().min(1).max(255),
  courseName: z.string().min(1).max(255),
  status: statusValidator,
  progressPercentage: progressValidator.optional(),
  startDate: timestampValidator.optional(),
  completionDate: timestampValidator.optional(),
  certificateUrl: z.string().url().optional(),
});

export type ItsLearningWebhookPayloadV1Type = z.infer<typeof ItsLearningWebhookPayloadV1>;

// ============================================================================
// Generic LMS Webhook Payloads (Version 1.0)
// ============================================================================

export const GenericLMSWebhookPayloadV1 = z.object({
  event_type: z.string().min(1).max(100),
  event_id: z.string().min(1).max(255),
  timestamp: timestampValidator,
  provider: z.string().min(1).max(100),
  user_identifier: z.string().min(1).max(255), // Email or external ID
  course_id: z.string().min(1).max(255),
  course_name: z.string().min(1).max(255),
  status: statusValidator,
  progress_percent: progressValidator.optional(),
  started_at: timestampValidator.optional(),
  completed_at: timestampValidator.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GenericLMSWebhookPayloadV1Type = z.infer<typeof GenericLMSWebhookPayloadV1>;

// ============================================================================
// Schema Registry
// ============================================================================

export type UpskillingPayloadType = 'learning_progress' | 'ecornell_webhook' | 'itslearning_webhook' | 'generic_webhook';

export interface SchemaRegistryEntry<T = unknown> {
  schema: z.ZodSchema<T>;
  version: string;
  parser: (payload: unknown) => ValidationResult<T>;
}

export const UPSKILLING_SCHEMA_REGISTRY: Record<UpskillingPayloadType, Record<string, SchemaRegistryEntry>> = {
  learning_progress: {
    '1.0': {
      schema: LearningProgressPayloadV1,
      version: '1.0',
      parser: createPayloadParser(LearningProgressPayloadV1),
    },
  },
  ecornell_webhook: {
    '1.0': {
      schema: ECornellWebhookPayloadV1,
      version: '1.0',
      parser: createPayloadParser(ECornellWebhookPayloadV1),
    },
  },
  itslearning_webhook: {
    '1.0': {
      schema: ItsLearningWebhookPayloadV1,
      version: '1.0',
      parser: createPayloadParser(ItsLearningWebhookPayloadV1),
    },
  },
  generic_webhook: {
    '1.0': {
      schema: GenericLMSWebhookPayloadV1,
      version: '1.0',
      parser: createPayloadParser(GenericLMSWebhookPayloadV1),
    },
  },
};

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Create a payload parser for a given Zod schema
 */
function createPayloadParser<T>(schema: z.ZodSchema<T>) {
  return (payload: unknown): ValidationResult<T> => {
    const result = schema.safeParse(payload);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.path.reduce((obj: any, key) => obj?.[key], payload),
    }));

    return {
      success: false,
      errors,
    };
  };
}

/**
 * Validate a payload against a specific schema version
 *
 * @param payloadType - Type of payload
 * @param version - Schema version (e.g., '1.0')
 * @param payload - Raw payload data
 * @returns Validation result
 */
export function validatePayload<T>(
  payloadType: UpskillingPayloadType,
  version: string,
  payload: unknown
): ValidationResult<T> {
  const registryEntry = UPSKILLING_SCHEMA_REGISTRY[payloadType]?.[version];

  if (!registryEntry) {
    return {
      success: false,
      errors: [
        {
          field: '_schema',
          message: `Unknown payload type '${payloadType}' or version '${version}'`,
          value: { payloadType, version },
        },
      ],
    };
  }

  return registryEntry.parser(payload) as ValidationResult<T>;
}

/**
 * Get the latest schema version for a payload type
 *
 * @param payloadType - Type of payload
 * @returns Latest schema version
 */
export function getLatestVersion(payloadType: UpskillingPayloadType): string {
  const versions = Object.keys(UPSKILLING_SCHEMA_REGISTRY[payloadType] || {});
  if (versions.length === 0) {
    throw new Error(`No schemas registered for payload type: ${payloadType}`);
  }
  return versions[versions.length - 1];
}

/**
 * Validate with latest schema version
 *
 * @param payloadType - Type of payload
 * @param payload - Raw payload data
 * @returns Validation result
 */
export function validateWithLatest<T>(
  payloadType: UpskillingPayloadType,
  payload: unknown
): ValidationResult<T> {
  const version = getLatestVersion(payloadType);
  return validatePayload<T>(payloadType, version, payload);
}

/**
 * Detect provider from webhook payload
 *
 * @param payload - Raw webhook payload
 * @returns Detected payload type or null
 */
export function detectProvider(payload: unknown): UpskillingPayloadType | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  // Check for eCornell-specific fields
  if (obj.event_type && obj.user && obj.course) {
    return 'ecornell_webhook';
  }

  // Check for itslearning-specific fields (camelCase convention)
  if (obj.eventType && obj.userId && obj.userEmail) {
    return 'itslearning_webhook';
  }

  // Default to generic webhook
  if (obj.event_type && obj.provider) {
    return 'generic_webhook';
  }

  return null;
}

/**
 * Example usage
 */
if (require.main === module) {
  // Example: Validate an eCornell webhook
  const sampleECornell = {
    event_type: 'course.completed',
    event_id: 'ec-evt-12345',
    timestamp: '2025-11-13T10:00:00Z',
    user: {
      external_id: 'user-789',
      email: 'learner@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
    },
    course: {
      course_id: 'CRS-101',
      course_name: 'Introduction to Leadership',
      course_url: 'https://ecornell.cornell.edu/courses/crs-101',
    },
    progress: {
      status: 'completed',
      percent_complete: 100,
      started_at: '2025-10-01T10:00:00Z',
      completed_at: '2025-11-13T10:00:00Z',
    },
    certificate: {
      certificate_id: 'CERT-12345',
      certificate_url: 'https://ecornell.cornell.edu/certificates/cert-12345',
      issued_at: '2025-11-13T10:00:00Z',
    },
  };

  const result = validateWithLatest<ECornellWebhookPayloadV1Type>('ecornell_webhook', sampleECornell);
  console.log('eCornell validation result:', JSON.stringify(result, null, 2));

  // Example: Detect provider
  const detectedProvider = detectProvider(sampleECornell);
  console.log(`\nDetected provider: ${detectedProvider}`);
}
