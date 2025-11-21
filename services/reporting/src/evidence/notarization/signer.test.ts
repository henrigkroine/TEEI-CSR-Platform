/**
 * Notarization Signer Tests
 * Tests for cryptographic signing with performance checks
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  signReportSection,
  signReportSections,
  computeContentHash,
} from './signer.js';
import { ReportSection } from './types.js';

describe('Notarization Signer', () => {
  let testSection: ReportSection;

  beforeAll(async () => {
    // Generate test key pair
    await generateKeyPair('test-key');

    testSection = {
      sectionId: 'section-1',
      reportId: 'report-123',
      sectionType: 'summary',
      content: 'This is a test report summary with important data.',
      metadata: {
        reportVersion: '1.0',
        evidenceCount: 5,
        citationCount: 10,
      },
      timestamp: new Date().toISOString(),
    };
  });

  describe('computeContentHash', () => {
    it('should generate consistent SHA-256 hash', () => {
      const content = 'test content';
      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different hashes for different content', () => {
      const hash1 = computeContentHash('content 1');
      const hash2 = computeContentHash('content 2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('signReportSection', () => {
    it('should sign a report section', async () => {
      const signature = await signReportSection(
        testSection,
        'test-user',
        'test-key'
      );

      expect(signature.signatureId).toBeDefined();
      expect(signature.sectionId).toBe(testSection.sectionId);
      expect(signature.reportId).toBe(testSection.reportId);
      expect(signature.contentHash).toHaveLength(64);
      expect(signature.signature).toBeDefined();
      expect(signature.algorithm).toBe('ed25519');
      expect(signature.publicKeyId).toBe('test-key');
      expect(signature.signedBy).toBe('test-user');
    });

    it('should meet p95 latency requirement (≤20ms)', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await signReportSection(testSection, 'test-user', 'test-key');
        const duration = performance.now() - start;
        latencies.push(duration);
      }

      // Calculate p95
      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Latency = latencies[p95Index];

      console.log(`Signing performance: p95=${p95Latency.toFixed(2)}ms, avg=${(latencies.reduce((a, b) => a + b) / iterations).toFixed(2)}ms`);

      expect(p95Latency).toBeLessThanOrEqual(20);
    });

    it('should generate different signatures for different sections', async () => {
      const section1 = { ...testSection, sectionId: 'section-1' };
      const section2 = { ...testSection, sectionId: 'section-2' };

      const sig1 = await signReportSection(section1, 'test-user', 'test-key');
      const sig2 = await signReportSection(section2, 'test-user', 'test-key');

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it('should include metadata in signature', async () => {
      const signature = await signReportSection(
        testSection,
        'test-user',
        'test-key'
      );

      expect(signature.metadata.version).toBe('1.0');
      expect(signature.metadata.reportVersion).toBe('1.0');
      expect(signature.metadata.evidenceCount).toBe(5);
      expect(signature.metadata.citationCount).toBe(10);
    });
  });

  describe('signReportSections (batch)', () => {
    it('should sign multiple sections efficiently', async () => {
      const sections: ReportSection[] = Array.from({ length: 10 }, (_, i) => ({
        ...testSection,
        sectionId: `section-${i}`,
      }));

      const start = performance.now();
      const signatures = await signReportSections(sections, 'test-user', 'test-key');
      const duration = performance.now() - start;

      expect(signatures).toHaveLength(10);
      expect(signatures.every((s) => s.signature)).toBe(true);

      const avgDuration = duration / sections.length;
      console.log(`Batch signing: total=${duration.toFixed(2)}ms, avg=${avgDuration.toFixed(2)}ms per section`);

      expect(avgDuration).toBeLessThanOrEqual(20);
    });

    it('should preserve section order in signatures', async () => {
      const sections: ReportSection[] = Array.from({ length: 5 }, (_, i) => ({
        ...testSection,
        sectionId: `section-${i}`,
      }));

      const signatures = await signReportSections(sections, 'test-user', 'test-key');

      signatures.forEach((sig, idx) => {
        expect(sig.sectionId).toBe(`section-${idx}`);
      });
    });
  });
});
