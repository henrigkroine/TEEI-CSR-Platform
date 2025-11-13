/**
 * Buddy Service Payload Validation
 *
 * Versioned Zod schemas for validating Buddy service API payloads and event data.
 * Supports webhook payloads, API requests, and internal event contracts.
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

const emailValidator = z.string().email().max(255);
const uuidValidator = z.string().uuid();
const timestampValidator = z.string().datetime();
const ratingValidator = z.number().min(0).max(1);
const moodValidator = z.enum(['great', 'good', 'okay', 'struggling', 'difficult']);
const matchStatusValidator = z.enum(['active', 'inactive', 'ended']);
const roleValidator = z.enum(['participant', 'buddy']);

// ============================================================================
// Buddy Match Payloads (Version 1.0)
// ============================================================================

export const BuddyMatchPayloadV1 = z.object({
  participant_id: uuidValidator,
  buddy_id: uuidValidator,
  matched_at: timestampValidator.optional(),
  status: matchStatusValidator.optional(),
});

export type BuddyMatchPayloadV1Type = z.infer<typeof BuddyMatchPayloadV1>;

// ============================================================================
// Buddy Event Payloads (Version 1.0)
// ============================================================================

export const BuddyEventPayloadV1 = z.object({
  match_id: uuidValidator,
  event_type: z.string().min(1).max(100),
  event_date: timestampValidator,
  description: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
});

export type BuddyEventPayloadV1Type = z.infer<typeof BuddyEventPayloadV1>;

// ============================================================================
// Buddy Check-in Payloads (Version 1.0)
// ============================================================================

export const BuddyCheckinPayloadV1 = z.object({
  match_id: uuidValidator,
  checkin_date: timestampValidator.optional(),
  mood: moodValidator,
  notes: z.string().max(5000).optional(),
});

export type BuddyCheckinPayloadV1Type = z.infer<typeof BuddyCheckinPayloadV1>;

// ============================================================================
// Buddy Feedback Payloads (Version 1.0)
// ============================================================================

export const BuddyFeedbackPayloadV1 = z.object({
  match_id: uuidValidator,
  from_role: roleValidator,
  rating: ratingValidator,
  feedback_text: z.string().max(5000).optional(),
  submitted_at: timestampValidator.optional(),
});

export type BuddyFeedbackPayloadV1Type = z.infer<typeof BuddyFeedbackPayloadV1>;

// ============================================================================
// Webhook Payloads (Version 1.0)
// ============================================================================

export const BuddyWebhookPayloadV1 = z.object({
  event_type: z.enum(['match.created', 'event.created', 'checkin.submitted', 'feedback.submitted']),
  event_id: z.string().min(1).max(255),
  timestamp: timestampValidator,
  data: z.union([
    BuddyMatchPayloadV1,
    BuddyEventPayloadV1,
    BuddyCheckinPayloadV1,
    BuddyFeedbackPayloadV1,
  ]),
});

export type BuddyWebhookPayloadV1Type = z.infer<typeof BuddyWebhookPayloadV1>;

// ============================================================================
// Schema Registry
// ============================================================================

export type BuddyPayloadType = 'match' | 'event' | 'checkin' | 'feedback' | 'webhook';

export interface SchemaRegistryEntry<T = unknown> {
  schema: z.ZodSchema<T>;
  version: string;
  parser: (payload: unknown) => ValidationResult<T>;
}

export const BUDDY_SCHEMA_REGISTRY: Record<BuddyPayloadType, Record<string, SchemaRegistryEntry>> = {
  match: {
    '1.0': {
      schema: BuddyMatchPayloadV1,
      version: '1.0',
      parser: createPayloadParser(BuddyMatchPayloadV1),
    },
  },
  event: {
    '1.0': {
      schema: BuddyEventPayloadV1,
      version: '1.0',
      parser: createPayloadParser(BuddyEventPayloadV1),
    },
  },
  checkin: {
    '1.0': {
      schema: BuddyCheckinPayloadV1,
      version: '1.0',
      parser: createPayloadParser(BuddyCheckinPayloadV1),
    },
  },
  feedback: {
    '1.0': {
      schema: BuddyFeedbackPayloadV1,
      version: '1.0',
      parser: createPayloadParser(BuddyFeedbackPayloadV1),
    },
  },
  webhook: {
    '1.0': {
      schema: BuddyWebhookPayloadV1,
      version: '1.0',
      parser: createPayloadParser(BuddyWebhookPayloadV1),
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
  payloadType: BuddyPayloadType,
  version: string,
  payload: unknown
): ValidationResult<T> {
  const registryEntry = BUDDY_SCHEMA_REGISTRY[payloadType]?.[version];

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
export function getLatestVersion(payloadType: BuddyPayloadType): string {
  const versions = Object.keys(BUDDY_SCHEMA_REGISTRY[payloadType] || {});
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
  payloadType: BuddyPayloadType,
  payload: unknown
): ValidationResult<T> {
  const version = getLatestVersion(payloadType);
  return validatePayload<T>(payloadType, version, payload);
}

/**
 * Example usage
 */
if (require.main === module) {
  // Example: Validate a buddy match payload
  const sampleMatch = {
    participant_id: '123e4567-e89b-12d3-a456-426614174000',
    buddy_id: '123e4567-e89b-12d3-a456-426614174001',
    status: 'active',
  };

  const matchResult = validateWithLatest<BuddyMatchPayloadV1Type>('match', sampleMatch);
  console.log('Match validation result:', JSON.stringify(matchResult, null, 2));

  // Example: Validate a buddy checkin payload
  const sampleCheckin = {
    match_id: '123e4567-e89b-12d3-a456-426614174002',
    mood: 'great',
    notes: 'Had a wonderful time today!',
  };

  const checkinResult = validateWithLatest<BuddyCheckinPayloadV1Type>('checkin', sampleCheckin);
  console.log('\nCheckin validation result:', JSON.stringify(checkinResult, null, 2));
}
