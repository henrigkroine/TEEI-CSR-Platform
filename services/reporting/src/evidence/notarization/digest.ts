/**
 * Report Section Digest Generator
 *
 * Generates SHA-256 cryptographic hashes of report sections for tamper detection
 *
 * @module evidence/notarization/digest
 * @author Worker 8 - Team 1 (crypto-signing-engineer)
 */

import { createHash } from 'crypto';
import { ReportSection, SectionDigest } from './types.js';

/**
 * Normalize content for consistent hashing
 * - Trim whitespace
 * - Normalize line endings to LF
 * - Remove zero-width characters
 */
function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n') // Normalize CRLF to LF
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width chars
}

/**
 * Generate SHA-256 digest of a report section
 *
 * @param section - Report section to hash
 * @returns Hex-encoded SHA-256 digest
 */
export function generateDigest(section: ReportSection): SectionDigest {
  const normalized = normalizeContent(section.content);
  const hash = createHash('sha256');

  // Hash section metadata for tamper detection
  const payload = JSON.stringify({
    sectionId: section.sectionId,
    sectionType: section.sectionType,
    content: normalized,
  });

  hash.update(payload, 'utf8');
  const digest = hash.digest('hex');

  return {
    sectionId: section.sectionId,
    sectionType: section.sectionType,
    digest,
    algorithm: 'sha256',
    timestamp: new Date(),
  };
}

/**
 * Generate digests for multiple sections
 *
 * @param sections - Array of report sections
 * @returns Array of section digests
 */
export function generateDigests(sections: ReportSection[]): SectionDigest[] {
  return sections.map(generateDigest);
}

/**
 * Verify if content matches a given digest
 *
 * @param section - Current section content
 * @param expectedDigest - Expected digest to compare against
 * @returns True if content matches digest
 */
export function verifyDigest(section: ReportSection, expectedDigest: string): boolean {
  const computed = generateDigest(section);
  return computed.digest === expectedDigest;
}

/**
 * Create a canonical digest payload for signing
 *
 * @param reportId - Report identifier
 * @param companyId - Company identifier
 * @param digests - Array of section digests
 * @returns Canonical JSON string for signing
 */
export function createSigningPayload(
  reportId: string,
  companyId: string,
  digests: SectionDigest[]
): string {
  // Sort digests by sectionId for deterministic output
  const sortedDigests = [...digests].sort((a, b) =>
    a.sectionId.localeCompare(b.sectionId)
  );

  const payload = {
    reportId,
    companyId,
    sections: sortedDigests.map(d => ({
      sectionId: d.sectionId,
      sectionType: d.sectionType,
      digest: d.digest,
      algorithm: d.algorithm,
    })),
  };

  // Return deterministic JSON (sorted keys, no whitespace)
  return JSON.stringify(payload);
}

/**
 * Compute aggregate digest of all sections (for full report hash)
 *
 * @param digests - Array of section digests
 * @returns Hex-encoded SHA-256 of all section digests combined
 */
export function computeAggregateDigest(digests: SectionDigest[]): string {
  const sortedDigests = [...digests]
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId))
    .map(d => d.digest)
    .join('');

  const hash = createHash('sha256');
  hash.update(sortedDigests, 'utf8');
  return hash.digest('hex');
}
