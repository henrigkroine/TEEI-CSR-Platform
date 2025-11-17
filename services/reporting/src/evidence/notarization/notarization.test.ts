/**
 * Impact Notarization Tests
 *
 * Comprehensive test suite for crypto signing, verification, and tampering detection
 *
 * @module evidence/notarization/notarization.test
 * @author Worker 8 - Team 1 (notarization-test-engineer)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDigest,
  generateDigests,
  verifyDigest,
  computeAggregateDigest,
  generateKeyPair,
  signReport,
  verifySignature,
  verifySignatureStrict,
  quickVerify,
  verifySectionIntegrity,
  batchVerify,
  type ReportSection,
  type NotarizationSignature,
  TamperDetectedError,
  VerificationError,
} from './index.js';

describe('Notarization - Digest Generation', () => {
  const mockSection: ReportSection = {
    sectionId: 'summary-001',
    sectionType: 'summary',
    content: 'This is a test report summary with impact metrics.',
  };

  it('should generate SHA-256 digest for a section', () => {
    const digest = generateDigest(mockSection);

    expect(digest.sectionId).toBe('summary-001');
    expect(digest.sectionType).toBe('summary');
    expect(digest.algorithm).toBe('sha256');
    expect(digest.digest).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(digest.timestamp).toBeInstanceOf(Date);
  });

  it('should generate consistent digests for identical content', () => {
    const digest1 = generateDigest(mockSection);
    const digest2 = generateDigest(mockSection);

    expect(digest1.digest).toBe(digest2.digest);
  });

  it('should generate different digests for different content', () => {
    const section2: ReportSection = {
      ...mockSection,
      content: 'Different content',
    };

    const digest1 = generateDigest(mockSection);
    const digest2 = generateDigest(section2);

    expect(digest1.digest).not.toBe(digest2.digest);
  });

  it('should normalize whitespace for consistent hashing', () => {
    const section1: ReportSection = {
      ...mockSection,
      content: '  Content with   extra  spaces  \n\n',
    };

    const section2: ReportSection = {
      ...mockSection,
      content: 'Content with   extra  spaces',
    };

    const digest1 = generateDigest(section1);
    const digest2 = generateDigest(section2);

    expect(digest1.digest).toBe(digest2.digest);
  });

  it('should generate digests for multiple sections', () => {
    const sections: ReportSection[] = [
      mockSection,
      {
        sectionId: 'metrics-001',
        sectionType: 'metrics',
        content: 'SROI: 3.5, VIS: 72',
      },
    ];

    const digests = generateDigests(sections);

    expect(digests).toHaveLength(2);
    expect(digests[0].sectionId).toBe('summary-001');
    expect(digests[1].sectionId).toBe('metrics-001');
  });

  it('should verify digest matches content', () => {
    const digest = generateDigest(mockSection);
    const isValid = verifyDigest(mockSection, digest.digest);

    expect(isValid).toBe(true);
  });

  it('should detect tampered content', () => {
    const digest = generateDigest(mockSection);
    const tamperedSection: ReportSection = {
      ...mockSection,
      content: 'TAMPERED CONTENT',
    };

    const isValid = verifyDigest(tamperedSection, digest.digest);

    expect(isValid).toBe(false);
  });

  it('should compute aggregate digest deterministically', () => {
    const sections: ReportSection[] = [
      { sectionId: 'b', sectionType: 'metrics', content: 'B' },
      { sectionId: 'a', sectionType: 'summary', content: 'A' },
      { sectionId: 'c', sectionType: 'outcomes', content: 'C' },
    ];

    const digests = generateDigests(sections);
    const aggregate1 = computeAggregateDigest(digests);
    const aggregate2 = computeAggregateDigest([...digests].reverse());

    expect(aggregate1).toBe(aggregate2); // Sorted internally
    expect(aggregate1).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Notarization - Signing', () => {
  let keyPair: ReturnType<typeof generateKeyPair>;
  const reportId = 'report-123';
  const companyId = 'company-456';
  const sections: ReportSection[] = [
    {
      sectionId: 'summary-001',
      sectionType: 'summary',
      content: 'Summary content',
    },
    {
      sectionId: 'metrics-001',
      sectionType: 'metrics',
      content: 'SROI: 4.2',
    },
  ];

  beforeEach(() => {
    keyPair = generateKeyPair();
  });

  it('should generate Ed25519 key pair', () => {
    expect(keyPair.publicKey).toBeInstanceOf(Buffer);
    expect(keyPair.privateKey).toBeInstanceOf(Buffer);
    expect(keyPair.publicKey.length).toBeGreaterThan(0);
    expect(keyPair.privateKey.length).toBeGreaterThan(0);
  });

  it('should sign report with Ed25519', () => {
    const signature = signReport(
      reportId,
      companyId,
      sections,
      keyPair.privateKey,
      keyPair.publicKey
    );

    expect(signature.reportId).toBe(reportId);
    expect(signature.companyId).toBe(companyId);
    expect(signature.sections).toHaveLength(2);
    expect(signature.signature).toMatch(/^[a-f0-9]+$/);
    expect(signature.publicKey).toMatch(/^[a-f0-9]+$/);
    expect(signature.algorithm).toBe('ed25519');
    expect(signature.signedAt).toBeInstanceOf(Date);
    expect(signature.signerIdentity).toBe('TEEI-CSR-Platform/v1.0');
  });

  it('should include section digests in signature', () => {
    const signature = signReport(
      reportId,
      companyId,
      sections,
      keyPair.privateKey,
      keyPair.publicKey
    );

    expect(signature.sections[0].sectionId).toBe('summary-001');
    expect(signature.sections[0].digest).toMatch(/^[a-f0-9]{64}$/);
    expect(signature.sections[1].sectionId).toBe('metrics-001');
    expect(signature.sections[1].digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should support custom signer identity', () => {
    const signature = signReport(
      reportId,
      companyId,
      sections,
      keyPair.privateKey,
      keyPair.publicKey,
      { signerIdentity: 'TestRunner/v0.1' }
    );

    expect(signature.signerIdentity).toBe('TestRunner/v0.1');
  });

  it('should sign report in <5ms (p95 latency requirement)', () => {
    const iterations = 100;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      signReport(
        reportId,
        companyId,
        sections,
        keyPair.privateKey,
        keyPair.publicKey
      );
      const end = performance.now();
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(iterations * 0.95)];

    console.log(`Signing latency p95: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(5); // <5ms p95 requirement
  });
});

describe('Notarization - Verification', () => {
  let keyPair: ReturnType<typeof generateKeyPair>;
  let signature: NotarizationSignature;
  const reportId = 'report-789';
  const companyId = 'company-012';
  const sections: ReportSection[] = [
    {
      sectionId: 'summary-001',
      sectionType: 'summary',
      content: 'Original summary',
    },
  ];

  beforeEach(() => {
    keyPair = generateKeyPair();
    signature = signReport(
      reportId,
      companyId,
      sections,
      keyPair.privateKey,
      keyPair.publicKey
    );
  });

  it('should verify valid signature', () => {
    const result = verifySignature(signature);

    expect(result.valid).toBe(true);
    expect(result.reportId).toBe(reportId);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].verified).toBe(true);
    expect(result.sections[0].tampered).toBe(false);
  });

  it('should detect invalid signature', () => {
    const tamperedSignature: NotarizationSignature = {
      ...signature,
      signature: 'deadbeef'.repeat(16), // Invalid signature
    };

    expect(() => verifySignature(tamperedSignature)).toThrow(VerificationError);
  });

  it('should detect tampered content', () => {
    const tamperedSections: ReportSection[] = [
      {
        sectionId: 'summary-001',
        sectionType: 'summary',
        content: 'TAMPERED SUMMARY',
      },
    ];

    expect(() =>
      verifySignature(signature, {
        currentSections: tamperedSections,
        checkTampering: true,
      })
    ).toThrow(TamperDetectedError);
  });

  it('should verify unchanged content', () => {
    const result = verifySignature(signature, {
      currentSections: sections,
      checkTampering: true,
    });

    expect(result.valid).toBe(true);
    expect(result.sections[0].tampered).toBe(false);
  });

  it('should support strict verification', () => {
    expect(() => verifySignatureStrict(signature)).not.toThrow();

    const invalidSignature: NotarizationSignature = {
      ...signature,
      signature: 'invalid',
    };

    expect(() => verifySignatureStrict(invalidSignature)).toThrow(
      VerificationError
    );
  });

  it('should support quick verification (boolean)', () => {
    expect(quickVerify(signature)).toBe(true);

    const invalidSignature: NotarizationSignature = {
      ...signature,
      signature: 'invalid',
    };

    expect(quickVerify(invalidSignature)).toBe(false);
  });

  it('should verify section integrity independently', () => {
    const section = sections[0];
    const signedDigest = signature.sections[0].digest;

    expect(verifySectionIntegrity(section, signedDigest)).toBe(true);

    const tamperedSection: ReportSection = {
      ...section,
      content: 'TAMPERED',
    };

    expect(verifySectionIntegrity(tamperedSection, signedDigest)).toBe(false);
  });

  it('should batch verify multiple signatures', () => {
    const signature2 = signReport(
      'report-2',
      companyId,
      sections,
      keyPair.privateKey,
      keyPair.publicKey
    );

    const results = batchVerify([signature, signature2]);

    expect(results).toHaveLength(2);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(true);
  });

  it('should verify in <1ms (p95 latency requirement)', () => {
    const iterations = 100;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      verifySignature(signature);
      const end = performance.now();
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(iterations * 0.95)];

    console.log(`Verification latency p95: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(1); // <1ms p95 requirement
  });
});

describe('Notarization - End-to-End', () => {
  it('should complete full sign-verify cycle', () => {
    const keyPair = generateKeyPair();
    const sections: ReportSection[] = [
      { sectionId: 's1', sectionType: 'summary', content: 'Summary' },
      { sectionId: 's2', sectionType: 'metrics', content: 'SROI: 5.0' },
      { sectionId: 's3', sectionType: 'outcomes', content: 'Outcomes' },
    ];

    // Sign
    const signature = signReport(
      'report-e2e',
      'company-e2e',
      sections,
      keyPair.privateKey,
      keyPair.publicKey
    );

    expect(signature).toBeDefined();
    expect(signature.sections).toHaveLength(3);

    // Verify
    const result = verifySignature(signature, {
      currentSections: sections,
      checkTampering: true,
    });

    expect(result.valid).toBe(true);
    expect(result.sections.every(s => s.verified && !s.tampered)).toBe(true);
  });

  it('should detect tampering in end-to-end scenario', () => {
    const keyPair = generateKeyPair();
    const originalSections: ReportSection[] = [
      { sectionId: 's1', sectionType: 'summary', content: 'Original' },
    ];

    const signature = signReport(
      'report-tamper',
      'company-tamper',
      originalSections,
      keyPair.privateKey,
      keyPair.publicKey
    );

    const tamperedSections: ReportSection[] = [
      { sectionId: 's1', sectionType: 'summary', content: 'TAMPERED' },
    ];

    expect(() =>
      verifySignature(signature, {
        currentSections: tamperedSections,
        checkTampering: true,
      })
    ).toThrow(TamperDetectedError);
  });
});
