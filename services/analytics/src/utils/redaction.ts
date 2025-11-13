/**
 * Redaction utility for removing PII from text
 *
 * This module provides functions to mask sensitive data including:
 * - Email addresses
 * - Phone numbers
 * - Credit card numbers
 * - Social security numbers
 * - Names (basic pattern matching)
 */

/**
 * Redact all PII from text
 *
 * @param text - The text to redact
 * @returns The redacted text with PII masked
 */
export function redactPII(text: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact email addresses
  redacted = redactEmails(redacted);

  // Redact phone numbers
  redacted = redactPhoneNumbers(redacted);

  // Redact credit card numbers
  redacted = redactCreditCards(redacted);

  // Redact social security numbers
  redacted = redactSSNs(redacted);

  // Redact potential names (basic patterns)
  redacted = redactNames(redacted);

  return redacted;
}

/**
 * Redact email addresses
 *
 * Patterns matched:
 * - user@example.com → ***@***.com
 * - first.last@company.co.uk → ***@***.co.uk
 */
export function redactEmails(text: string): string {
  // Match email pattern: local-part@domain.tld
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return text.replace(emailPattern, (match) => {
    // Keep the TLD visible for context
    const tld = match.split('.').pop();
    return `***@***.${tld}`;
  });
}

/**
 * Redact phone numbers
 *
 * Patterns matched:
 * - (555) 123-4567 → ***-***-****
 * - 555-123-4567 → ***-***-****
 * - 555.123.4567 → ***-***-****
 * - +1 555 123 4567 → +* ***-***-****
 * - International: +49 30 12345678 → +** ***-***-****
 */
export function redactPhoneNumbers(text: string): string {
  // Match various phone number formats
  const patterns = [
    // US format with parentheses: (555) 123-4567
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
    // US format with dashes: 555-123-4567
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    // International format: +1 555 123 4567 or +49 30 12345678
    /\+\d{1,3}\s?\d{1,4}\s?\d{3,4}\s?\d{4,}/g,
  ];

  let redacted = text;
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, (match) => {
      // Preserve international prefix if present
      if (match.startsWith('+')) {
        return '+* ***-***-****';
      }
      return '***-***-****';
    });
  }

  return redacted;
}

/**
 * Redact credit card numbers
 *
 * Patterns matched:
 * - 4532-1234-5678-9010 → ****-****-****-9010
 * - 4532 1234 5678 9010 → ****-****-****-9010
 * - 4532123456789010 → ****-****-****-9010
 *
 * Preserves last 4 digits for reference
 */
export function redactCreditCards(text: string): string {
  // Match credit card patterns (13-19 digits with optional separators)
  const ccPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b/g;
  return text.replace(ccPattern, (match) => {
    // Extract last 4 digits
    const digits = match.replace(/[-\s]/g, '');
    const last4 = digits.slice(-4);
    return `****-****-****-${last4}`;
  });
}

/**
 * Redact Social Security Numbers
 *
 * Patterns matched:
 * - 123-45-6789 → ***-**-****
 * - 123 45 6789 → ***-**-****
 * - 123456789 → ***-**-****
 */
export function redactSSNs(text: string): string {
  // Match SSN patterns (9 digits with optional separators)
  const ssnPattern = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;
  return text.replace(ssnPattern, '***-**-****');
}

/**
 * Redact potential names
 *
 * This uses basic heuristics to detect names:
 * - Capitalized words that appear in specific contexts
 * - Common name prefixes (Mr., Mrs., Dr., etc.)
 * - "My name is X" patterns
 *
 * Note: This is not perfect and may have false positives/negatives
 */
export function redactNames(text: string): string {
  let redacted = text;

  // Pattern 1: "My name is [Name]" or "I am [Name]"
  const nameIntroPattern = /(my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  redacted = redacted.replace(nameIntroPattern, (match, intro) => {
    return `${intro} [NAME]`;
  });

  // Pattern 2: Titles followed by names (Mr. John Smith, Dr. Jane Doe)
  const titlePattern = /\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  redacted = redacted.replace(titlePattern, '$1 [NAME]');

  return redacted;
}

/**
 * Check if text contains any PII
 *
 * @param text - The text to check
 * @returns True if PII is detected
 */
export function containsPII(text: string): boolean {
  if (!text) return false;

  // Check for emails
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    return true;
  }

  // Check for phone numbers
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    return true;
  }

  // Check for credit cards
  if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b/.test(text)) {
    return true;
  }

  // Check for SSNs
  if (/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/.test(text)) {
    return true;
  }

  return false;
}
