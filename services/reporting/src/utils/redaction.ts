/**
 * PII Redaction Utilities
 *
 * Automatically detect and redact personally identifiable information (PII)
 * from evidence data to ensure GDPR/privacy compliance.
 *
 * @module utils/redaction
 */

export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  category: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'custom';
}

/**
 * Predefined redaction rules for common PII
 */
export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
    category: 'email',
  },
  {
    name: 'phone_us',
    pattern: /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
    category: 'phone',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
    category: 'ssn',
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[CC_REDACTED]',
    category: 'credit_card',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
    category: 'custom',
  },
];

/**
 * Redact PII from text
 */
export function redactText(
  text: string,
  rules: RedactionRule[] = DEFAULT_REDACTION_RULES
): { redacted: string; matches: RedactionMatch[] } {
  let redacted = text;
  const matches: RedactionMatch[] = [];

  rules.forEach((rule) => {
    const ruleMatches = Array.from(text.matchAll(rule.pattern));

    ruleMatches.forEach((match) => {
      matches.push({
        original: match[0],
        replacement: rule.replacement,
        category: rule.category,
        position: match.index || 0,
      });
    });

    redacted = redacted.replace(rule.pattern, rule.replacement);
  });

  return { redacted, matches };
}

export interface RedactionMatch {
  original: string;
  replacement: string;
  category: string;
  position: number;
}

/**
 * Redact PII from evidence object
 */
export function redactEvidence(evidence: any): {
  redacted: any;
  redactions: RedactionLog[];
} {
  const redacted = { ...evidence };
  const redactions: RedactionLog[] = [];

  // Redact string fields
  ['metric_name', 'source_identifier'].forEach((field) => {
    if (typeof redacted[field] === 'string') {
      const result = redactText(redacted[field]);
      if (result.matches.length > 0) {
        redacted[field] = result.redacted;
        redactions.push({
          field,
          original_length: (evidence[field] as string).length,
          redacted_length: result.redacted.length,
          matches: result.matches.length,
          categories: result.matches.map((m) => m.category),
        });
      }
    }
  });

  // Redact metadata
  if (redacted.metadata && typeof redacted.metadata === 'object') {
    Object.keys(redacted.metadata).forEach((key) => {
      const value = redacted.metadata[key];
      if (typeof value === 'string') {
        const result = redactText(value);
        if (result.matches.length > 0) {
          redacted.metadata[key] = result.redacted;
          redactions.push({
            field: `metadata.${key}`,
            original_length: value.length,
            redacted_length: result.redacted.length,
            matches: result.matches.length,
            categories: result.matches.map((m) => m.category),
          });
        }
      }
    });
  }

  // Mark as redacted
  redacted.redacted = redactions.length > 0;

  return { redacted, redactions };
}

export interface RedactionLog {
  field: string;
  original_length: number;
  redacted_length: number;
  matches: number;
  categories: string[];
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  // Strip all HTML tags except safe ones
  const safeTags = ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'p'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  return html.replace(tagPattern, (match, tag) => {
    if (safeTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    Object.keys(obj).forEach((key) => {
      sanitized[key] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }

  return obj;
}

/**
 * Check if string contains potential PII
 */
export function containsPII(text: string): boolean {
  const result = redactText(text);
  return result.matches.length > 0;
}

/**
 * Get PII categories detected in text
 */
export function detectPIICategories(text: string): string[] {
  const result = redactText(text);
  const categories = new Set(result.matches.map((m) => m.category));
  return Array.from(categories);
}
