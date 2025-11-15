/**
 * Enhanced PII Detection and Redaction
 * Multi-layered approach: regex + NER + context-based detection
 */

export interface PIIEntity {
  type: 'EMAIL' | 'PHONE' | 'SSN' | 'CREDIT_CARD' | 'NAME' | 'ADDRESS' | 'DATE_OF_BIRTH' | 'IP_ADDRESS';
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface RedactionResult {
  redactedText: string;
  entitiesFound: PIIEntity[];
  redactionCount: number;
  safe: boolean; // true if no PII detected
}

/**
 * Enhanced PII Detector with multiple detection strategies
 */
export class EnhancedPIIDetector {
  /**
   * Detect and redact PII from text
   */
  detect(text: string, options: { strictMode?: boolean } = {}): RedactionResult {
    const entities: PIIEntity[] = [];

    // Layer 1: Regex-based detection (fast, high precision)
    entities.push(...this.detectByRegex(text));

    // Layer 2: Pattern-based detection (names, addresses)
    entities.push(...this.detectByPattern(text));

    // Layer 3: Context-based detection (dates, IDs)
    if (options.strictMode) {
      entities.push(...this.detectByContext(text));
    }

    // Sort by start position (reverse for replacement)
    entities.sort((a, b) => b.start - a.start);

    // Redact text
    let redactedText = text;
    for (const entity of entities) {
      const replacement = this.getRedactionString(entity.type);
      redactedText =
        redactedText.slice(0, entity.start) +
        replacement +
        redactedText.slice(entity.end);
    }

    return {
      redactedText,
      entitiesFound: entities,
      redactionCount: entities.length,
      safe: entities.length === 0
    };
  }

  /**
   * Regex-based detection (emails, phones, SSNs, credit cards, IPs)
   */
  private detectByRegex(text: string): PIIEntity[] {
    const entities: PIIEntity[] = [];

    // Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        type: 'EMAIL',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95
      });
    }

    // Phone numbers (various formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: 'PHONE',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.85
      });
    }

    // SSN (US Social Security Numbers)
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    while ((match = ssnRegex.exec(text)) !== null) {
      entities.push({
        type: 'SSN',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.98
      });
    }

    // Credit Card numbers (13-19 digits, with optional spaces/dashes)
    const ccRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g;
    while ((match = ccRegex.exec(text)) !== null) {
      // Validate with Luhn algorithm
      if (this.luhnCheck(match[0].replace(/[\s-]/g, ''))) {
        entities.push({
          type: 'CREDIT_CARD',
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.90
        });
      }
    }

    // IP addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    while ((match = ipRegex.exec(text)) !== null) {
      entities.push({
        type: 'IP_ADDRESS',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.80
      });
    }

    return entities;
  }

  /**
   * Pattern-based detection (names, addresses)
   */
  private detectByPattern(text: string): PIIEntity[] {
    const entities: PIIEntity[] = [];

    // Capitalized words that look like names (simplified NER)
    // Format: "First Last" or "First Middle Last"
    const nameRegex = /\b([A-Z][a-z]+\s+){1,2}[A-Z][a-z]+\b/g;
    let match;

    while ((match = nameRegex.exec(text)) !== null) {
      // Filter common false positives
      const name = match[0];
      if (!this.isCommonPhrase(name)) {
        entities.push({
          type: 'NAME',
          value: name,
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.60 // Lower confidence for pattern-based
        });
      }
    }

    // Street addresses (simplified pattern)
    const addressRegex = /\b\d+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/g;
    while ((match = addressRegex.exec(text)) !== null) {
      entities.push({
        type: 'ADDRESS',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.70
      });
    }

    return entities;
  }

  /**
   * Context-based detection (dates of birth, IDs)
   */
  private detectByContext(text: string): PIIEntity[] {
    const entities: PIIEntity[] = [];

    // Dates that might be DOB (with context keywords)
    const dobContextRegex = /(born|birth|dob|birthday)[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi;
    let match;

    while ((match = dobContextRegex.exec(text)) !== null) {
      entities.push({
        type: 'DATE_OF_BIRTH',
        value: match[2],
        start: match.index + match[1].length,
        end: match.index + match[0].length,
        confidence: 0.85
      });
    }

    return entities;
  }

  /**
   * Check if phrase is a common non-name phrase
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'United States',
      'New York',
      'Los Angeles',
      'San Francisco',
      'Thank You',
      'Best Regards',
      'Dear Sir'
    ];

    return commonPhrases.some(common => phrase.includes(common));
  }

  /**
   * Luhn algorithm for credit card validation
   */
  private luhnCheck(cardNumber: string): boolean {
    const digits = cardNumber.split('').map(d => parseInt(d, 10));
    let sum = 0;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];

      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
    }

    return sum % 10 === 0;
  }

  /**
   * Get redaction string for entity type
   */
  private getRedactionString(type: PIIEntity['type']): string {
    const redactions: Record<PIIEntity['type'], string> = {
      EMAIL: '[EMAIL_REDACTED]',
      PHONE: '[PHONE_REDACTED]',
      SSN: '[SSN_REDACTED]',
      CREDIT_CARD: '[CC_REDACTED]',
      NAME: '[NAME_REDACTED]',
      ADDRESS: '[ADDRESS_REDACTED]',
      DATE_OF_BIRTH: '[DOB_REDACTED]',
      IP_ADDRESS: '[IP_REDACTED]'
    };

    return redactions[type];
  }
}

/**
 * Differential Privacy Noise Addition
 * Add Laplace noise to sensitive aggregates
 */
export class DifferentialPrivacyEngine {
  /**
   * Add Laplace noise to a numeric value
   * epsilon: privacy budget (smaller = more privacy, more noise)
   * sensitivity: maximum change one person can cause (e.g., 1 for counts)
   */
  addLaplaceNoise(value: number, epsilon: number, sensitivity: number = 1): number {
    const scale = sensitivity / epsilon;
    const u = Math.random() - 0.5; // Uniform random in [-0.5, 0.5]
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    return value + noise;
  }

  /**
   * Add DP noise to aggregate statistics
   */
  noisyAggregate(
    values: number[],
    aggregation: 'sum' | 'mean' | 'count',
    epsilon: number
  ): number {
    let result: number;

    switch (aggregation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        return this.addLaplaceNoise(result, epsilon, Math.max(...values));

      case 'mean':
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        // Sensitivity of mean = range / n
        const range = Math.max(...values) - Math.min(...values);
        return this.addLaplaceNoise(mean, epsilon, range / values.length);

      case 'count':
        return Math.max(0, Math.round(this.addLaplaceNoise(values.length, epsilon, 1)));

      default:
        return 0;
    }
  }

  /**
   * Check if enough privacy budget remains
   */
  checkPrivacyBudget(spent: number, total: number): boolean {
    return spent < total;
  }
}

/**
 * Singleton instances
 */
let detectorInstance: EnhancedPIIDetector | null = null;
let dpInstance: DifferentialPrivacyEngine | null = null;

export function getPIIDetector(): EnhancedPIIDetector {
  if (!detectorInstance) {
    detectorInstance = new EnhancedPIIDetector();
  }
  return detectorInstance;
}

export function getDPEngine(): DifferentialPrivacyEngine {
  if (!dpInstance) {
    dpInstance = new DifferentialPrivacyEngine();
  }
  return dpInstance;
}
