import { describe, it, expect } from 'vitest';
import {
  redactPII,
  redactEmails,
  redactPhoneNumbers,
  redactCreditCards,
  redactSSNs,
  redactNames,
  containsPII,
} from '../utils/redaction';

describe('redaction utility', () => {
  describe('redactEmails', () => {
    it('should redact email addresses', () => {
      const text = 'Contact me at john.doe@example.com for details.';
      const redacted = redactEmails(text);
      expect(redacted).toBe('Contact me at ***@***.com for details.');
    });

    it('should redact multiple email addresses', () => {
      const text = 'Emails: user@test.com and admin@company.org';
      const redacted = redactEmails(text);
      expect(redacted).toBe('Emails: ***@***.com and ***@***.org');
    });

    it('should preserve TLD for context', () => {
      const text = 'Send to support@example.co.uk';
      const redacted = redactEmails(text);
      expect(redacted).toBe('Send to ***@***.uk');
    });

    it('should handle text without emails', () => {
      const text = 'No emails here';
      const redacted = redactEmails(text);
      expect(redacted).toBe('No emails here');
    });
  });

  describe('redactPhoneNumbers', () => {
    it('should redact phone numbers with parentheses', () => {
      const text = 'Call me at (555) 123-4567';
      const redacted = redactPhoneNumbers(text);
      expect(redacted).toBe('Call me at ***-***-****');
    });

    it('should redact phone numbers with dashes', () => {
      const text = 'My number: 555-123-4567';
      const redacted = redactPhoneNumbers(text);
      expect(redacted).toBe('My number: ***-***-****');
    });

    it('should redact phone numbers with dots', () => {
      const text = 'Contact: 555.123.4567';
      const redacted = redactPhoneNumbers(text);
      expect(redacted).toBe('Contact: ***-***-****');
    });

    it('should redact international phone numbers', () => {
      const text = 'International: +1 555 123 4567';
      const redacted = redactPhoneNumbers(text);
      expect(redacted).toBe('International: +* ***-***-****');
    });

    it('should handle text without phone numbers', () => {
      const text = 'No phone numbers';
      const redacted = redactPhoneNumbers(text);
      expect(redacted).toBe('No phone numbers');
    });
  });

  describe('redactCreditCards', () => {
    it('should redact credit card numbers with dashes', () => {
      const text = 'Card: 4532-1234-5678-9010';
      const redacted = redactCreditCards(text);
      expect(redacted).toBe('Card: ****-****-****-9010');
    });

    it('should redact credit card numbers with spaces', () => {
      const text = 'Card: 4532 1234 5678 9010';
      const redacted = redactCreditCards(text);
      expect(redacted).toBe('Card: ****-****-****-9010');
    });

    it('should redact credit card numbers without separators', () => {
      const text = 'Card: 4532123456789010';
      const redacted = redactCreditCards(text);
      expect(redacted).toBe('Card: ****-****-****-9010');
    });

    it('should preserve last 4 digits', () => {
      const text = 'Payment with 1234-5678-9012-3456';
      const redacted = redactCreditCards(text);
      expect(redacted).toBe('Payment with ****-****-****-3456');
    });

    it('should handle text without credit cards', () => {
      const text = 'No credit cards here';
      const redacted = redactCreditCards(text);
      expect(redacted).toBe('No credit cards here');
    });
  });

  describe('redactSSNs', () => {
    it('should redact SSNs with dashes', () => {
      const text = 'SSN: 123-45-6789';
      const redacted = redactSSNs(text);
      expect(redacted).toBe('SSN: ***-**-****');
    });

    it('should redact SSNs with spaces', () => {
      const text = 'SSN: 123 45 6789';
      const redacted = redactSSNs(text);
      expect(redacted).toBe('SSN: ***-**-****');
    });

    it('should redact SSNs without separators', () => {
      const text = 'SSN: 123456789';
      const redacted = redactSSNs(text);
      expect(redacted).toBe('SSN: ***-**-****');
    });

    it('should handle text without SSNs', () => {
      const text = 'No SSN here';
      const redacted = redactSSNs(text);
      expect(redacted).toBe('No SSN here');
    });
  });

  describe('redactNames', () => {
    it('should redact names after "My name is"', () => {
      const text = 'My name is John Smith and I live here.';
      const redacted = redactNames(text);
      expect(redacted).toBe('My name is [NAME] and I live here.');
    });

    it('should redact names after "I am"', () => {
      const text = 'Hello, I am Jane Doe.';
      const redacted = redactNames(text);
      expect(redacted).toBe('Hello, I am [NAME].');
    });

    it('should redact names with titles', () => {
      const text = 'Contact Dr. Sarah Johnson for help.';
      const redacted = redactNames(text);
      expect(redacted).toBe('Contact Dr. [NAME] for help.');
    });

    it('should redact names with Mr./Mrs./Ms.', () => {
      const text = 'Meeting with Mr. Robert Brown tomorrow.';
      const redacted = redactNames(text);
      expect(redacted).toBe('Meeting with Mr. [NAME] tomorrow.');
    });

    it('should handle text without names', () => {
      const text = 'No names mentioned';
      const redacted = redactNames(text);
      expect(redacted).toBe('No names mentioned');
    });
  });

  describe('redactPII', () => {
    it('should redact all types of PII', () => {
      const text = 'My name is John Doe, email: john@example.com, phone: 555-123-4567, SSN: 123-45-6789';
      const redacted = redactPII(text);

      expect(redacted).toContain('[NAME]');
      expect(redacted).toContain('***@***.com');
      expect(redacted).toContain('***-***-****');
      expect(redacted).not.toContain('john@example.com');
      expect(redacted).not.toContain('555-123-4567');
      expect(redacted).not.toContain('123-45-6789');
    });

    it('should redact credit cards and emails together', () => {
      const text = 'Payment from user@test.com using card 4532-1234-5678-9010';
      const redacted = redactPII(text);

      expect(redacted).toContain('***@***.com');
      expect(redacted).toContain('****-****-****-9010');
      expect(redacted).not.toContain('user@test.com');
      expect(redacted).not.toContain('4532-1234-5678-9010');
    });

    it('should handle empty text', () => {
      const redacted = redactPII('');
      expect(redacted).toBe('');
    });

    it('should handle text with no PII', () => {
      const text = 'This is a normal sentence with no sensitive data.';
      const redacted = redactPII(text);
      expect(redacted).toBe(text);
    });

    it('should handle complex feedback with multiple PII types', () => {
      const text = 'Hi, I am Sarah Miller (sarah.miller@company.com). You can reach me at 555-987-6543. My SSN is 987-65-4321 and I paid with card 5555-4444-3333-2222.';
      const redacted = redactPII(text);

      // Check that all PII is redacted
      expect(redacted).not.toContain('sarah.miller@company.com');
      expect(redacted).not.toContain('555-987-6543');
      expect(redacted).not.toContain('987-65-4321');
      expect(redacted).not.toContain('5555-4444-3333-2222');

      // Check that redaction patterns are present
      expect(redacted).toContain('***@***.com');
      expect(redacted).toContain('***-***-****');
      expect(redacted).toContain('****-****-****-2222');
    });
  });

  describe('containsPII', () => {
    it('should detect emails', () => {
      expect(containsPII('Contact: user@example.com')).toBe(true);
    });

    it('should detect phone numbers', () => {
      expect(containsPII('Call: 555-123-4567')).toBe(true);
    });

    it('should detect credit cards', () => {
      expect(containsPII('Card: 4532-1234-5678-9010')).toBe(true);
    });

    it('should detect SSNs', () => {
      expect(containsPII('SSN: 123-45-6789')).toBe(true);
    });

    it('should return false for text without PII', () => {
      expect(containsPII('This is clean text')).toBe(false);
    });

    it('should handle empty text', () => {
      expect(containsPII('')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined gracefully', () => {
      expect(redactPII(null as any)).toBe(null);
      expect(redactPII(undefined as any)).toBe(undefined);
    });

    it('should not break on partial patterns', () => {
      const text = '123 is not an SSN, and user@ is not an email';
      const redacted = redactPII(text);
      expect(redacted).toBe(text);
    });

    it('should preserve formatting', () => {
      const text = 'Line 1\nLine 2 with email@test.com\nLine 3';
      const redacted = redactPII(text);
      expect(redacted).toContain('Line 1\nLine 2');
      expect(redacted).toContain('***@***.com');
    });

    it('should handle multiple spaces and tabs', () => {
      const text = 'Email:    user@test.com    Phone:    555-123-4567';
      const redacted = redactPII(text);
      expect(redacted).toContain('***@***.com');
      expect(redacted).toContain('***-***-****');
    });
  });
});
