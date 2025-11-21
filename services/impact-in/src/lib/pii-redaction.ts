/**
 * PII Redaction Middleware
 * Redacts personally identifiable information before persistence
 * Applies to directory entries and other sensitive data
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:pii-redaction');

/**
 * PII field patterns to redact
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};

/**
 * Fields that should be redacted
 */
const PII_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'displayName',
  'phoneNumber',
  'mobilePhone',
  'homeAddress',
  'personalEmail',
  'ssn',
  'taxId',
  'dateOfBirth',
  'birthDate',
];

/**
 * Redaction mode
 */
export enum RedactionMode {
  HASH = 'hash', // Replace with SHA-256 hash
  MASK = 'mask', // Replace with asterisks
  REMOVE = 'remove', // Remove field entirely
  TOKENIZE = 'tokenize', // Replace with deterministic token
}

/**
 * Redaction options
 */
export interface RedactionOptions {
  mode: RedactionMode;
  preserveLength?: boolean; // For MASK mode
  salt?: string; // For HASH/TOKENIZE mode
  allowedFields?: string[]; // Fields to NOT redact
}

/**
 * Redact PII from an object
 */
export function redactPII<T extends Record<string, any>>(
  data: T,
  options: RedactionOptions = { mode: RedactionMode.HASH }
): T {
  const redacted = { ...data };

  for (const key in redacted) {
    if (shouldRedactField(key, options.allowedFields)) {
      redacted[key] = redactValue(redacted[key], options);
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      // Recursively redact nested objects
      redacted[key] = redactPII(redacted[key], options);
    }
  }

  return redacted;
}

/**
 * Redact PII from an array of objects
 */
export function redactPIIBatch<T extends Record<string, any>>(
  data: T[],
  options: RedactionOptions = { mode: RedactionMode.HASH }
): T[] {
  return data.map(item => redactPII(item, options));
}

/**
 * Check if a field should be redacted
 */
function shouldRedactField(fieldName: string, allowedFields?: string[]): boolean {
  if (allowedFields && allowedFields.includes(fieldName)) {
    return false;
  }

  return PII_FIELDS.some(piiField =>
    fieldName.toLowerCase().includes(piiField.toLowerCase())
  );
}

/**
 * Redact a single value based on mode
 */
function redactValue(value: any, options: RedactionOptions): any {
  if (value === null || value === undefined) {
    return value;
  }

  const stringValue = String(value);

  switch (options.mode) {
    case RedactionMode.HASH:
      return hashValue(stringValue, options.salt);
    case RedactionMode.MASK:
      return maskValue(stringValue, options.preserveLength);
    case RedactionMode.REMOVE:
      return undefined;
    case RedactionMode.TOKENIZE:
      return tokenizeValue(stringValue, options.salt);
    default:
      return value;
  }
}

/**
 * Hash a value using SHA-256
 */
function hashValue(value: string, salt?: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(salt ? `${salt}${value}` : value);
  return `[HASHED:${hash.digest('hex').substring(0, 16)}]`;
}

/**
 * Mask a value with asterisks
 */
function maskValue(value: string, preserveLength?: boolean): string {
  if (preserveLength) {
    return '*'.repeat(value.length);
  } else {
    return '[REDACTED]';
  }
}

/**
 * Tokenize a value (deterministic)
 */
function tokenizeValue(value: string, salt?: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(salt ? `${salt}${value}` : value);
  return `TOKEN_${hash.digest('hex').substring(0, 12)}`;
}

/**
 * Scan text for PII patterns and redact them
 */
export function scanAndRedactPII(text: string): {
  redacted: string;
  piiFound: string[];
} {
  const piiFound: string[] = [];
  let redacted = text;

  for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      piiFound.push(...matches.map(m => `${piiType}: ${m.substring(0, 4)}...`));
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
  }

  return { redacted, piiFound };
}

/**
 * Validate that no PII leaked through redaction
 */
export function validateNoPII(data: any): {
  valid: boolean;
  leakedFields: string[];
} {
  const leakedFields: string[] = [];

  function checkObject(obj: any, path: string = ''): void {
    if (typeof obj !== 'object' || obj === null) {
      const stringValue = String(obj);
      for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
        if (pattern.test(stringValue)) {
          leakedFields.push(`${path}: ${piiType}`);
        }
      }
      return;
    }

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      if (shouldRedactField(key, [])) {
        if (obj[key] && !String(obj[key]).startsWith('[')) {
          leakedFields.push(currentPath);
        }
      }
      checkObject(obj[key], currentPath);
    }
  }

  checkObject(data);

  return {
    valid: leakedFields.length === 0,
    leakedFields,
  };
}

/**
 * Middleware for automatic PII redaction
 */
export function createPIIRedactionMiddleware(options: RedactionOptions) {
  return async (data: any) => {
    logger.info('Applying PII redaction', { mode: options.mode });

    const redacted = Array.isArray(data)
      ? redactPIIBatch(data, options)
      : redactPII(data, options);

    // Validate no PII leaked
    const validation = validateNoPII(redacted);
    if (!validation.valid) {
      logger.error('PII validation failed - data leaked', {
        leakedFields: validation.leakedFields,
      });
      throw new Error(`PII redaction failed: ${validation.leakedFields.join(', ')}`);
    }

    logger.info('PII redaction successful');
    return redacted;
  };
}
