import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:redaction');

/**
 * PII patterns to detect and redact
 */
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers (US format)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // Full names (simple pattern - may need enhancement)
  // This is a basic pattern and may need tuning for specific use cases
  possibleName: /\b([A-Z][a-z]+ ){1,2}[A-Z][a-z]+\b/g,
};

/**
 * Redaction placeholder templates
 */
const REDACTION_TEMPLATES = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  ssn: '[SSN_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  ipAddress: '[IP_REDACTED]',
  possibleName: '[NAME_REDACTED]',
};

export interface RedactionResult {
  redactedText: string;
  originalText: string;
  redactionMap: Map<string, string>;
  redactionCount: number;
  piiDetected: string[];
}

/**
 * Redaction enforcer - scrubs PII before sending to LLM
 * Maintains a mapping to restore redacted content if needed
 */
export class RedactionEnforcer {
  private aggressiveMode: boolean;

  constructor(aggressiveMode: boolean = false) {
    this.aggressiveMode = aggressiveMode;
    logger.info(`Redaction enforcer initialized (aggressive: ${aggressiveMode})`);
  }

  /**
   * Redact PII from text
   */
  redact(text: string): RedactionResult {
    let redactedText = text;
    const redactionMap = new Map<string, string>();
    const piiDetected: string[] = [];
    let redactionCount = 0;

    // Process each PII pattern
    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = text.match(pattern);

      if (matches && matches.length > 0) {
        piiDetected.push(piiType);

        for (const match of matches) {
          // Skip if already redacted
          if (redactionMap.has(match)) {
            continue;
          }

          // Special handling for possibleName - only redact in aggressive mode
          if (piiType === 'possibleName' && !this.aggressiveMode) {
            continue;
          }

          const placeholder = this.generatePlaceholder(
            piiType as keyof typeof REDACTION_TEMPLATES,
            redactionCount
          );

          // Store mapping for potential restoration
          redactionMap.set(placeholder, match);

          // Replace in text
          redactedText = redactedText.replace(match, placeholder);
          redactionCount++;
        }
      }
    }

    if (redactionCount > 0) {
      logger.info(`Redacted ${redactionCount} PII instances of types: ${piiDetected.join(', ')}`);
    }

    return {
      redactedText,
      originalText: text,
      redactionMap,
      redactionCount,
      piiDetected,
    };
  }

  /**
   * Restore redacted content (use with caution)
   */
  restore(redactedText: string, redactionMap: Map<string, string>): string {
    let restoredText = redactedText;

    for (const [placeholder, original] of redactionMap) {
      restoredText = restoredText.replace(placeholder, original);
    }

    logger.warn('PII content restored - ensure proper access controls');
    return restoredText;
  }

  /**
   * Redact array of evidence snippets
   */
  redactSnippets(snippets: Array<{ id: string; text: string; [key: string]: any }>): {
    redactedSnippets: Array<{ id: string; text: string; [key: string]: any }>;
    redactionMaps: Map<string, Map<string, string>>;
  } {
    const redactedSnippets = [];
    const redactionMaps = new Map<string, Map<string, string>>();

    for (const snippet of snippets) {
      const result = this.redact(snippet.text);
      redactedSnippets.push({
        ...snippet,
        text: result.redactedText,
      });
      redactionMaps.set(snippet.id, result.redactionMap);
    }

    return { redactedSnippets, redactionMaps };
  }

  /**
   * Check if text contains PII
   */
  containsPII(text: string): boolean {
    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      // Skip possibleName check unless in aggressive mode
      if (piiType === 'possibleName' && !this.aggressiveMode) {
        continue;
      }

      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate unique placeholder for redacted content
   */
  private generatePlaceholder(
    piiType: keyof typeof REDACTION_TEMPLATES,
    index: number
  ): string {
    const template = REDACTION_TEMPLATES[piiType];
    // Add index to make each placeholder unique
    return template.replace(']', `_${index}]`);
  }

  /**
   * Validate that content has been properly redacted
   */
  validate(text: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      // Skip possibleName in non-aggressive mode
      if (piiType === 'possibleName' && !this.aggressiveMode) {
        continue;
      }

      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        violations.push(`${piiType}: ${matches.length} instance(s) found`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}

/**
 * Create redaction enforcer from environment variables
 */
export function createRedactionEnforcer(): RedactionEnforcer {
  const aggressiveMode = process.env.REDACTION_AGGRESSIVE === 'true';
  return new RedactionEnforcer(aggressiveMode);
}

/**
 * Middleware to enforce redaction before LLM calls
 */
export function enforceRedaction(text: string, enforcer?: RedactionEnforcer): RedactionResult {
  const redactionEnforcer = enforcer || createRedactionEnforcer();
  const result = redactionEnforcer.redact(text);

  // Validate that redaction was successful
  const validation = redactionEnforcer.validate(result.redactedText);
  if (!validation.isValid) {
    logger.error('Redaction validation failed', { violations: validation.violations });
    throw new Error(`PII detected after redaction: ${validation.violations.join(', ')}`);
  }

  return result;
}
