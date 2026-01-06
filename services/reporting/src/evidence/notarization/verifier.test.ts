/**
 * Notarization Verifier Tests
 * Tests for cryptographic signature verification
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  signReportSection,
  signReportSections,
} from './signer.js';
import {
  verifySignature,
  verifySections,
  verifyReport,
} from './verifier.js';
import { ReportSection, NotarizationSignature } from './types.js';

describe('Notarization Verifier', () => {
  let testSection: ReportSection;
  let testSignature: NotarizationSignature;

  beforeAll(async () => {
    // Generate test key pair
    await generateKeyPair('verify-test-key');

    testSection = {
      sectionId: 'verify-section-1',
      reportId: 'verify-report-123',
      sectionType: 'summary',
      content: 'This is a test report summary for verification.',
      metadata: {
        reportVersion: '1.0',
        evidenceCount: 3,
        citationCount: 7,
      },
      timestamp: new Date().toISOString(),
    };

    // Sign the test section
    testSignature = await signReportSection(
      testSection,
      'verify-test-user',
      'verify-test-key'
    );
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', async () => {
      const result = await verifySignature(testSection, testSignature);

      expect(result.valid).toBe(true);
      expect(result.checks.signatureValid).toBe(true);
      expect(result.checks.contentHashMatch).toBe(true);
      expect(result.checks.timestampValid).toBe(true);
      expect(result.checks.publicKeyValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject tampered content', async () => {
      const tamperedSection = {
        ...testSection,
        content: 'TAMPERED CONTENT',
      };

      const result = await verifySignature(tamperedSection, testSignature);

      expect(result.valid).toBe(false);
      expect(result.checks.contentHashMatch).toBe(false);
      expect(result.error?.code).toBe('CONTENT_MISMATCH');
    });

    it('should reject invalid signature', async () => {
      const invalidSignature = {
        ...testSignature,
        signature: 'invalid-signature-base64',
      };

      const result = await verifySignature(testSection, invalidSignature);

      expect(result.valid).toBe(false);
      expect(result.checks.signatureValid).toBe(false);
    });

    it('should reject unknown public key', async () => {
      const unknownKeySignature = {
        ...testSignature,
        publicKeyId: 'non-existent-key',
      };

      const result = await verifySignature(testSection, unknownKeySignature);

      expect(result.valid).toBe(false);
      expect(result.checks.publicKeyValid).toBe(false);
      expect(result.error?.code).toBe('PUBLIC_KEY_NOT_FOUND');
    });
  });

  describe('verifySections (batch)', () => {
    it('should verify multiple sections', async () => {
      const sections: ReportSection[] = Array.from({ length: 5 }, (_, i) => ({
        ...testSection,
        sectionId: `batch-section-${i}`,
      }));

      const signatures = await signReportSections(sections, 'test-user', 'verify-test-key');
      const results = await verifySections(sections, signatures);

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should detect missing signatures', async () => {
      const sections: ReportSection[] = [
        { ...testSection, sectionId: 'section-1' },
        { ...testSection, sectionId: 'section-2' },
      ];

      const signatures = await signReportSections([sections[0]], 'test-user', 'verify-test-key');
      const results = await verifySections(sections, signatures);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].error?.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('verifyReport', () => {
    it('should verify full report integrity', async () => {
      const sections: ReportSection[] = Array.from({ length: 4 }, (_, i) => ({
        ...testSection,
        sectionId: `report-section-${i}`,
        sectionType: ['summary', 'metrics', 'outcomes', 'recommendations'][i] as any,
      }));

      const signatures = await signReportSections(sections, 'test-user', 'verify-test-key');
      const result = await verifyReport('full-report-123', sections, signatures);

      expect(result.valid).toBe(true);
      expect(result.summary.total).toBe(4);
      expect(result.summary.valid).toBe(4);
      expect(result.summary.invalid).toBe(0);
    });

    it('should report partial verification failure', async () => {
      const sections: ReportSection[] = Array.from({ length: 3 }, (_, i) => ({
        ...testSection,
        sectionId: `partial-section-${i}`,
      }));

      const signatures = await signReportSections(sections, 'test-user', 'verify-test-key');

      // Tamper with one section
      sections[1].content = 'TAMPERED';

      const result = await verifyReport('partial-report-123', sections, signatures);

      expect(result.valid).toBe(false);
      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(1);
    });
  });
});
