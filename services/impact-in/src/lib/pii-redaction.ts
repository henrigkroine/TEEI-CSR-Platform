/**
 * PII Redaction Utility
 * Redacts personally identifiable information from events before persistence
 * Implements field-level redaction with audit logging
 */

import { createServiceLogger } from '@teei/shared-utils';
import crypto from 'crypto';

const logger = createServiceLogger('impact-in:pii-redaction');

// PII patterns for detection
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

// Fields that should never be logged or persisted as-is
const SENSITIVE_FIELDS = new Set([
  'password',
  'ssn',
  'social_security_number',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  'secret',
  'privateKey',
  'api_key',
  'token',
]);

// Fields that should be hashed for analytics while preserving uniqueness
const HASHABLE_FIELDS = new Set([
  'email',
  'phone',
  'userId',
  'externalUserId',
  'employeeNumber',
]);

/**
 * Redact PII from an event object
 * Returns a new object with PII redacted
 */
export function redactPII(event: any): any {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const redacted = JSON.parse(JSON.stringify(event)); // Deep clone

  let redactionCount = 0;

  // Recursive function to redact PII from nested objects
  function redactObject(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      // Check if this is a sensitive field
      if (SENSITIVE_FIELDS.has(key)) {
        obj[key] = '[REDACTED]';
        redactionCount++;
        logger.debug('Redacted sensitive field', { field: fullPath });
        continue;
      }

      // Check if this should be hashed
      if (HASHABLE_FIELDS.has(key) && typeof value === 'string') {
        obj[key] = hashValue(value);
        redactionCount++;
        logger.debug('Hashed field', { field: fullPath });
        continue;
      }

      // Redact patterns in string values
      if (typeof value === 'string') {
        let redactedValue = value;
        let hasRedaction = false;

        // Email
        if (EMAIL_PATTERN.test(value)) {
          redactedValue = redactedValue.replace(EMAIL_PATTERN, '[EMAIL_REDACTED]');
          hasRedaction = true;
        }

        // Phone
        if (PHONE_PATTERN.test(value)) {
          redactedValue = redactedValue.replace(PHONE_PATTERN, '[PHONE_REDACTED]');
          hasRedaction = true;
        }

        // SSN
        if (SSN_PATTERN.test(value)) {
          redactedValue = redactedValue.replace(SSN_PATTERN, '[SSN_REDACTED]');
          hasRedaction = true;
        }

        // Credit Card
        if (CREDIT_CARD_PATTERN.test(value)) {
          redactedValue = redactedValue.replace(CREDIT_CARD_PATTERN, '[CC_REDACTED]');
          hasRedaction = true;
        }

        if (hasRedaction) {
          obj[key] = redactedValue;
          redactionCount++;
          logger.debug('Redacted pattern in field', { field: fullPath });
        }
      }

      // Recursively process nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              redactObject(item, `${fullPath}[${index}]`);
            }
          });
        } else {
          redactObject(value, fullPath);
        }
      }
    }
  }

  redactObject(redacted);

  if (redactionCount > 0) {
    logger.info('PII redaction completed', {
      eventId: event.id,
      eventType: event.type,
      redactionCount,
    });

    // Add redaction metadata
    if (!redacted.metadata) {
      redacted.metadata = {};
    }
    redacted.metadata.piiRedacted = true;
    redacted.metadata.redactionCount = redactionCount;
  }

  return redacted;
}

/**
 * Hash a value for analytics while preserving uniqueness
 * Uses SHA-256 with a salt
 */
function hashValue(value: string): string {
  const salt = process.env.PII_HASH_SALT || 'default-salt-change-me';
  const hash = crypto.createHash('sha256').update(value + salt).digest('hex');

  // Return first 16 chars of hash for readability
  return `hash:${hash.substring(0, 16)}`;
}

/**
 * Validate that an object has no PII after redaction
 * Throws an error if PII is detected (fail-safe check)
 */
export function validateNoPII(obj: any): void {
  const objStr = JSON.stringify(obj);

  const violations: string[] = [];

  if (EMAIL_PATTERN.test(objStr)) {
    violations.push('Email pattern detected');
  }

  if (SSN_PATTERN.test(objStr)) {
    violations.push('SSN pattern detected');
  }

  if (CREDIT_CARD_PATTERN.test(objStr)) {
    violations.push('Credit card pattern detected');
  }

  // Check for sensitive field names
  function checkFields(o: any, path: string = ''): void {
    if (!o || typeof o !== 'object') return;

    for (const [key, value] of Object.entries(o)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (SENSITIVE_FIELDS.has(key) && value !== '[REDACTED]') {
        violations.push(`Sensitive field not redacted: ${fullPath}`);
      }

      if (typeof value === 'object' && value !== null) {
        checkFields(value, fullPath);
      }
    }
  }

  checkFields(obj);

  if (violations.length > 0) {
    logger.error('PII validation failed', { violations });
    throw new Error(`PII detected after redaction: ${violations.join(', ')}`);
  }
}

/**
 * Redact PII from logs before writing
 * Can be used as a log transformer
 */
export function redactLogMessage(message: string): string {
  let redacted = message;

  redacted = redacted.replace(EMAIL_PATTERN, '[EMAIL]');
  redacted = redacted.replace(PHONE_PATTERN, '[PHONE]');
  redacted = redacted.replace(SSN_PATTERN, '[SSN]');
  redacted = redacted.replace(CREDIT_CARD_PATTERN, '[CC]');

  return redacted;
}
