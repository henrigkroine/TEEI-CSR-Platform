import type { PIIDetection } from './types.js';

/**
 * Regular expressions for common PII patterns
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

/**
 * Detect potential PII in a string
 * Returns detected patterns and their positions
 */
export function detectPII(text: string): PIIDetection {
  const detected: PIIDetection['detected'] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        detected.push({
          type: type as PIIDetection['detected'][0]['type'],
          position: match.index,
          value: match[0],
        });
      }
    }
  }

  return {
    hasPII: detected.length > 0,
    detected,
  };
}

/**
 * Validate that text does not contain PII
 * Throws error if PII is detected
 */
export function assertNoPII(text: string, context: string = 'data'): void {
  const detection = detectPII(text);

  if (detection.hasPII) {
    const types = [...new Set(detection.detected.map(d => d.type))];
    throw new Error(
      `PII detected in ${context}: found ${types.join(', ')}. ` +
        `All PII must be masked before processing.`
    );
  }
}

/**
 * Redact PII from text (simple replacement with [REDACTED])
 * Use masking functions for deterministic replacement instead
 */
export function redactPII(text: string): string {
  let redacted = text;

  for (const pattern of Object.values(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  return redacted;
}

/**
 * Check if a string looks like a demo tenant ID
 */
export function isDemoTenantId(tenantId: string): boolean {
  return tenantId.startsWith('demo-') || tenantId.startsWith('test-');
}

/**
 * Validate demo tenant ID format
 * Throws if not a valid demo tenant ID
 */
export function assertDemoTenant(tenantId: string): void {
  if (!isDemoTenantId(tenantId)) {
    throw new Error(
      `Invalid demo tenant ID: "${tenantId}". ` +
        `Demo tenant IDs must start with "demo-" or "test-"`
    );
  }
}
