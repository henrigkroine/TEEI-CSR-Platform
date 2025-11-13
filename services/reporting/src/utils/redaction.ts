/**
 * PII Redaction Utility
 * Removes or masks personally identifiable information from text
 */

export interface RedactionPattern {
  name: string;
  regex: RegExp;
  replacement: string;
}

/**
 * Redaction patterns for common PII types
 */
export const REDACTION_PATTERNS: RedactionPattern[] = [
  // Email addresses
  {
    name: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    replacement: '[REDACTED_EMAIL]',
  },

  // Phone numbers (various formats)
  {
    name: 'phone',
    regex: /\b(?:\+?(\d{1,3}))?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },

  // Social Security Numbers (US format)
  {
    name: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },

  // Credit card numbers (basic pattern)
  {
    name: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CARD]',
  },

  // Street addresses (basic pattern)
  {
    name: 'address',
    regex: /\b\d{1,5}\s[\w\s]{1,50}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)\b/gi,
    replacement: '[REDACTED_ADDRESS]',
  },

  // Postal codes (US ZIP codes)
  {
    name: 'zip_code',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[REDACTED_ZIP]',
  },

  // Norwegian postal codes
  {
    name: 'norwegian_postal',
    regex: /\b\d{4}\s[A-ZÆØÅ]{1}[a-zæøå]+\b/g,
    replacement: '[REDACTED_POSTAL]',
  },

  // IP addresses
  {
    name: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
  },

  // URLs (basic pattern)
  {
    name: 'url',
    regex: /https?:\/\/[^\s]+/gi,
    replacement: '[REDACTED_URL]',
  },
];

export interface RedactionResult {
  original: string;
  redacted: string;
  redactionCount: number;
  patterns: string[]; // Patterns that matched
}

/**
 * Redact PII from text using predefined patterns
 *
 * @param text - Text to redact
 * @param customPatterns - Additional patterns to apply (optional)
 * @returns Redaction result with original, redacted text, and metadata
 */
export function redactPII(text: string, customPatterns: RedactionPattern[] = []): RedactionResult {
  let redacted = text;
  let redactionCount = 0;
  const matchedPatterns: Set<string> = new Set();

  const allPatterns = [...REDACTION_PATTERNS, ...customPatterns];

  for (const pattern of allPatterns) {
    const matches = text.match(pattern.regex);
    if (matches) {
      redactionCount += matches.length;
      matchedPatterns.add(pattern.name);
      redacted = redacted.replace(pattern.regex, pattern.replacement);
    }
  }

  return {
    original: text,
    redacted,
    redactionCount,
    patterns: Array.from(matchedPatterns),
  };
}

/**
 * Check if text contains potential PII
 * Useful for validation before sending to LLM
 *
 * @param text - Text to check
 * @returns true if PII detected, false otherwise
 */
export function containsPII(text: string): boolean {
  return REDACTION_PATTERNS.some((pattern) => pattern.regex.test(text));
}

/**
 * Redact names from text (basic pattern matching)
 * This is more conservative and may have false positives
 *
 * @param text - Text to redact
 * @returns Redacted text with names replaced
 */
export function redactNames(text: string): string {
  // Replace capitalized words that look like names (2-20 characters)
  // This is a simple heuristic and may need refinement
  return text.replace(/\b[A-Z][a-z]{1,19}\s[A-Z][a-z]{1,19}\b/g, '[REDACTED_NAME]');
}

/**
 * Apply multiple redaction passes with logging
 * Useful for debugging redaction issues
 *
 * @param text - Text to redact
 * @returns Redaction result with detailed logging
 */
export function redactWithLogging(text: string): RedactionResult {
  console.log('[Redaction] Starting PII redaction...');
  console.log(`[Redaction] Original text length: ${text.length} characters`);

  const result = redactPII(text);

  console.log(`[Redaction] Redaction complete`);
  console.log(`[Redaction] Redactions made: ${result.redactionCount}`);
  console.log(`[Redaction] Patterns matched: ${result.patterns.join(', ')}`);
  console.log(`[Redaction] Redacted text length: ${result.redacted.length} characters`);

  if (result.redactionCount > 0) {
    console.warn(
      `[Redaction] WARNING: ${result.redactionCount} PII instances found and redacted`
    );
  }

  return result;
}

/**
 * Validate that redacted text doesn't contain obvious PII
 * This is a secondary check to catch edge cases
 *
 * @param text - Text to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateRedaction(text: string): string[] {
  const errors: string[] = [];

  // Check for @ symbol (email)
  if (text.includes('@') && !text.includes('[REDACTED_EMAIL]')) {
    errors.push('Possible unredacted email detected');
  }

  // Check for phone number patterns
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    errors.push('Possible unredacted phone number detected');
  }

  // Check for credit card patterns
  if (/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(text)) {
    errors.push('Possible unredacted credit card number detected');
  }

  return errors;
}
