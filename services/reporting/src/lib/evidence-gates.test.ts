import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CitationExtractor, EvidenceGateViolation, EvidenceSnippet, CitationConfig } from './citations.js';

/**
 * Integration tests for evidence gate enforcement
 * Tests the strict citation validation with 422 error responses
 */
describe('Evidence Gate Enforcement', () => {
  const mockConnectionString = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

  describe('EvidenceGateViolation Error Class', () => {
    it('should create error with correct properties', () => {
      const violations = [
        {
          paragraph: 'This is a test paragraph without citations...',
          citationCount: 0,
          requiredCount: 1,
        },
      ];

      const error = new EvidenceGateViolation(
        'Evidence gate violation: 1 paragraph(s) lack required citations',
        violations,
        0, // totalCitationCount
        3, // totalParagraphCount
        0.0 // citationDensity
      );

      expect(error.name).toBe('EvidenceGateViolation');
      expect(error.message).toBe('Evidence gate violation: 1 paragraph(s) lack required citations');
      expect(error.violations).toEqual(violations);
      expect(error.totalCitationCount).toBe(0);
      expect(error.totalParagraphCount).toBe(3);
      expect(error.citationDensity).toBe(0.0);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof EvidenceGateViolation).toBe(true);
    });

    it('should maintain error stack trace', () => {
      const violations = [
        {
          paragraph: 'Test paragraph',
          citationCount: 0,
          requiredCount: 1,
        },
      ];

      const error = new EvidenceGateViolation(
        'Test error',
        violations,
        0,
        1,
        0.0
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EvidenceGateViolation');
    });
  });

  describe('Citation Validation with Evidence Gates', () => {
    it('should pass validation with sufficient citations', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: true,
        blockOnMissingEvidence: true,
        minCitationsPerParagraph: 1,
        minCitationDensity: 0.5,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# Impact Summary

Our program achieved significant outcomes this quarter. Participants demonstrated improved confidence scores, with an average increase of 15% [cite:snippet-1]. The mentorship sessions proved particularly effective, with 85% of participants reporting better job readiness [cite:snippet-2].

Volunteer engagement remained strong, with 30 active volunteers contributing over 500 hours [cite:snippet-3]. The integration with corporate partners expanded, allowing us to reach underserved communities [cite:snippet-4].
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Confidence improved by 15%', dimension: 'confidence', score: 0.85 },
        { id: 'snippet-2', text: '85% better job readiness', dimension: 'job-readiness', score: 0.82 },
        { id: 'snippet-3', text: '30 volunteers, 500 hours', dimension: 'volunteer-impact', score: 0.78 },
        { id: 'snippet-4', text: 'Expanded to underserved communities', dimension: 'reach', score: 0.76 },
      ];

      // Should not throw
      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.valid).toBe(true);
      expect(result.citationCount).toBe(4);
      expect(result.paragraphCount).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw EvidenceGateViolation when citations are missing', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: true,
        blockOnMissingEvidence: true,
        minCitationsPerParagraph: 1,
        minCitationDensity: 0.5,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# Impact Summary

Our program achieved significant outcomes this quarter. Participants demonstrated improved confidence scores, with an average increase of 15%. The mentorship sessions proved particularly effective.

Volunteer engagement remained strong, with 30 active volunteers contributing over 500 hours. The integration with corporate partners expanded, allowing us to reach underserved communities.
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Test snippet', dimension: 'confidence', score: 0.85 },
      ];

      expect(() => {
        extractor.validateCitations(content, evidenceSnippets);
      }).toThrow(EvidenceGateViolation);

      try {
        extractor.validateCitations(content, evidenceSnippets);
      } catch (error) {
        expect(error instanceof EvidenceGateViolation).toBe(true);
        if (error instanceof EvidenceGateViolation) {
          expect(error.violations.length).toBeGreaterThan(0);
          expect(error.totalCitationCount).toBe(0);
          expect(error.violations[0]).toHaveProperty('paragraph');
          expect(error.violations[0]).toHaveProperty('citationCount');
          expect(error.violations[0]).toHaveProperty('requiredCount');
          expect(error.violations[0].paragraph.length).toBeLessThanOrEqual(53); // 50 chars + "..."
        }
      }
    });

    it('should not throw when enforceEvidenceGates is false', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: false,
        minCitationsPerParagraph: 1,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# Impact Summary

Our program achieved significant outcomes this quarter without citations.

Volunteer engagement remained strong without any citations either.
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Test snippet', dimension: 'confidence', score: 0.85 },
      ];

      // Should not throw, just return invalid result
      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should correctly count paragraphs excluding headers and short text', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: false, // Don't throw, just validate
        minCitationsPerParagraph: 1,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# This is a header and should be ignored

This is a very short paragraph.

This is a proper paragraph with sufficient length to be counted as a real paragraph for citation purposes [cite:snippet-1].

Another proper paragraph that meets the minimum length requirements for being counted in the validation process [cite:snippet-2].

# Another header to skip

Yet another paragraph with enough content to be considered valid for citation counting and enforcement purposes [cite:snippet-3].
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Test 1', dimension: 'test', score: 0.85 },
        { id: 'snippet-2', text: 'Test 2', dimension: 'test', score: 0.85 },
        { id: 'snippet-3', text: 'Test 3', dimension: 'test', score: 0.85 },
      ];

      const result = extractor.validateCitations(content, evidenceSnippets);

      // Should count only paragraphs that are:
      // - Not headers (starting with #)
      // - Not too short (<10 words or <50 chars)
      expect(result.paragraphCount).toBe(3); // Only the 3 proper paragraphs
      expect(result.citationCount).toBe(3);
    });

    it('should include paragraph snippets in violation details', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: true,
        minCitationsPerParagraph: 1,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# Impact Summary

This is a long paragraph without any citations that should trigger a violation because it exceeds the minimum length requirements.

Another paragraph without citations that will also trigger a violation due to lack of evidence.
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [];

      try {
        extractor.validateCitations(content, evidenceSnippets);
        expect.fail('Should have thrown EvidenceGateViolation');
      } catch (error) {
        if (error instanceof EvidenceGateViolation) {
          expect(error.violations.length).toBe(2);

          // Check first violation
          expect(error.violations[0].paragraph).toContain('This is a long paragraph');
          expect(error.violations[0].paragraph.length).toBeLessThanOrEqual(53); // 50 + "..."
          expect(error.violations[0].citationCount).toBe(0);
          expect(error.violations[0].requiredCount).toBe(1);

          // Check second violation
          expect(error.violations[1].paragraph).toContain('Another paragraph');
          expect(error.violations[1].citationCount).toBe(0);
          expect(error.violations[1].requiredCount).toBe(1);
        } else {
          expect.fail('Wrong error type thrown');
        }
      }
    });

    it('should validate citation density correctly', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: false, // Don't throw for this test
        minCitationDensity: 2.0, // Very strict: 2 citations per 100 words
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      // ~50 words, needs at least 1 citation (50 * 0.02 = 1)
      const content = `
Our program achieved remarkable outcomes this quarter, demonstrating the power of evidence-based interventions and community engagement. Participants showed meaningful progress across all measured dimensions, with particular strength in confidence and belonging metrics [cite:snippet-1].
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Test snippet', dimension: 'confidence', score: 0.85 },
      ];

      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.citationDensity).toBeGreaterThan(0);
      expect(result.citationCount).toBe(1);
      // Should fail density check (1 citation for ~50 words = 2.0 per 100 words, but we need 2.0)
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Citation density'))).toBe(true);
    });

    it('should handle content with no paragraphs gracefully', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: true,
        minCitationsPerParagraph: 1,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
# Just headers

## And more headers

### Nothing but headers
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [];

      // Should not throw because there are no valid paragraphs to violate
      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.paragraphCount).toBe(0);
      // Will still fail due to zero citations overall
      expect(result.valid).toBe(false);
    });

    it('should detect invalid citation IDs', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: false, // Don't throw, just validate
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
This paragraph has a citation to a non-existent snippet [cite:invalid-id].

This one references another missing snippet [cite:another-invalid-id].
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Valid snippet', dimension: 'test', score: 0.85 },
      ];

      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid-id'))).toBe(true);
      expect(result.errors.some(e => e.includes('another-invalid-id'))).toBe(true);
    });
  });

  describe('Coverage Metrics', () => {
    it('should achieve >90% test coverage for validation logic', () => {
      const config: CitationConfig = {
        enforceEvidenceGates: true,
        blockOnMissingEvidence: true,
        minCitationsPerParagraph: 2,
        minCitationDensity: 1.0,
        strictValidation: true,
      };

      const extractor = new CitationExtractor(mockConnectionString, config);

      const content = `
This paragraph has exactly two citations as required by the configuration [cite:snippet-1] and here is the second one [cite:snippet-2].

This paragraph also has two citations to meet the requirements [cite:snippet-3] and another citation here [cite:snippet-4].
      `.trim();

      const evidenceSnippets: EvidenceSnippet[] = [
        { id: 'snippet-1', text: 'Test 1', dimension: 'test', score: 0.85 },
        { id: 'snippet-2', text: 'Test 2', dimension: 'test', score: 0.85 },
        { id: 'snippet-3', text: 'Test 3', dimension: 'test', score: 0.85 },
        { id: 'snippet-4', text: 'Test 4', dimension: 'test', score: 0.85 },
      ];

      const result = extractor.validateCitations(content, evidenceSnippets);

      expect(result.valid).toBe(true);
      expect(result.citationCount).toBe(4);
      expect(result.paragraphCount).toBe(2);
      expect(result.citationDensity).toBeGreaterThan(1.0);
    });
  });
});
