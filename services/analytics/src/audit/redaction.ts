/**
 * Audit Event PII Redaction
 *
 * Redacts sensitive information from audit events before display or export.
 * Ensures no PII leakage in audit logs while maintaining investigative value.
 */

import type { AuditEvent } from '@teei/shared-types';
import { redactPII } from '../utils/redaction.js';

/**
 * Fields to always redact from audit events
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'apiKey',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'ssn',
  'creditCard',
  'bankAccount',
];

/**
 * Fields to redact in PII-masked exports
 */
const PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'address',
  'streetAddress',
  'postalCode',
  'zipCode',
  'dateOfBirth',
  'dob',
  'nationalId',
  'passport',
];

/**
 * Redact secrets and API keys from any object
 */
function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item));
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a sensitive field
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      redacted[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      redacted[key] = redactSecrets(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redact PII from any object (for masked exports)
 */
function redactPIIFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPIIFields(item));
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a PII field
    const isPII = PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isPII) {
      redacted[key] = '***PII_MASKED***';
    } else if (typeof value === 'object') {
      redacted[key] = redactPIIFields(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redact sensitive information from audit event
 */
export function redactAuditEvent(event: AuditEvent, maskPII = false): AuditEvent {
  const redacted: AuditEvent = {
    ...event,
    // Always redact secrets from before/after states
    before: event.before ? redactSecrets(event.before) : undefined,
    after: event.after ? redactSecrets(event.after) : undefined,
    metadata: event.metadata ? redactSecrets(event.metadata) : undefined,
  };

  // Additionally redact PII if requested
  if (maskPII) {
    redacted.actor = {
      ...redacted.actor,
      email: '***PII_MASKED***',
      name: redacted.actor.name ? '***PII_MASKED***' : undefined,
    };

    redacted.origin = {
      ...redacted.origin,
      ip: redacted.origin.ip ? '***PII_MASKED***' : undefined,
    };

    if (redacted.before) {
      redacted.before = redactPIIFields(redacted.before);
    }

    if (redacted.after) {
      redacted.after = redactPIIFields(redacted.after);
    }

    if (redacted.metadata) {
      redacted.metadata = redactPIIFields(redacted.metadata);
    }
  }

  return redacted;
}

/**
 * Redact array of audit events
 */
export function redactAuditEvents(events: AuditEvent[], maskPII = false): AuditEvent[] {
  return events.map((event) => redactAuditEvent(event, maskPII));
}

/**
 * Validate that no secrets leaked after redaction
 */
export function validateNoSecretsLeaked(event: AuditEvent): boolean {
  const eventStr = JSON.stringify(event).toLowerCase();

  for (const field of SENSITIVE_FIELDS) {
    // Check if the field name appears with a non-redacted value
    const regex = new RegExp(`"${field.toLowerCase()}"\\s*:\\s*"(?!\\*\\*\\*REDACTED\\*\\*\\*)`, 'i');
    if (regex.test(eventStr)) {
      return false;
    }
  }

  return true;
}

/**
 * Get redaction summary for logging
 */
export function getRedactionSummary(
  originalEvent: AuditEvent,
  redactedEvent: AuditEvent
): {
  secretsRedacted: number;
  piiRedacted: number;
  fieldsModified: string[];
} {
  const originalStr = JSON.stringify(originalEvent);
  const redactedStr = JSON.stringify(redactedEvent);

  const secretsRedacted = (redactedStr.match(/\*\*\*REDACTED\*\*\*/g) || []).length;
  const piiRedacted = (redactedStr.match(/\*\*\*PII_MASKED\*\*\*/g) || []).length;

  const fieldsModified: string[] = [];

  function findModifiedFields(path: string, original: any, redacted: any) {
    if (original === redacted) return;

    if (typeof original === 'object' && typeof redacted === 'object' && original && redacted) {
      const keys = new Set([...Object.keys(original), ...Object.keys(redacted)]);
      for (const key of keys) {
        findModifiedFields(`${path}.${key}`, original[key], redacted[key]);
      }
    } else if (original !== redacted) {
      fieldsModified.push(path);
    }
  }

  findModifiedFields('', originalEvent, redactedEvent);

  return {
    secretsRedacted,
    piiRedacted,
    fieldsModified,
  };
}
