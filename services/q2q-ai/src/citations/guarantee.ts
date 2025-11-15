/**
 * Citation Guarantee System
 * Ensures every paragraph in generated reports has at least one valid citation
 * Zero-tolerance for uncited claims
 */

import { db } from '@teei/shared-schema/db';
import { evidenceSnippets } from '@teei/shared-schema/schema/q2q';
import { eq, inArray } from 'drizzle-orm';

export interface CitationReference {
  id: string; // Citation ID (e.g., "[1]", "[A]", "[Smith2024]")
  snippetId: string; // Reference to evidence snippet
  position: {
    paragraph: number;
    sentence?: number;
    charStart?: number;
    charEnd?: number;
  };
  text: string; // The cited text snippet
  confidence: number; // Confidence in citation relevance (0-1)
}

export interface Paragraph {
  index: number;
  text: string;
  citations: CitationReference[];
  hasCitation: boolean;
  wordCount: number;
}

export interface CitationValidationResult {
  isValid: boolean;
  totalParagraphs: number;
  citedParagraphs: number;
  uncitedParagraphs: number;
  uncitedIndices: number[];
  averageCitationsPerParagraph: number;
  violations: CitationViolation[];
  summary: string;
}

export interface CitationViolation {
  type: 'uncited_paragraph' | 'invalid_citation' | 'missing_evidence' | 'orphaned_citation';
  severity: 'critical' | 'warning';
  paragraph?: number;
  citationId?: string;
  message: string;
}

/**
 * Citation Guarantee Validator
 */
export class CitationValidator {
  private minCitationsPerParagraph: number;
  private minParagraphLength: number; // Words - very short paras may not need citations

  constructor(minCitationsPerParagraph = 1, minParagraphLength = 10) {
    this.minCitationsPerParagraph = minCitationsPerParagraph;
    this.minParagraphLength = minParagraphLength;
  }

  /**
   * Extract paragraphs and citations from text
   */
  extractParagraphs(text: string): Paragraph[] {
    // Split text into paragraphs (separated by \n\n or single \n for short texts)
    const paragraphTexts = text.split(/\n\s*\n/).filter(p => p.trim());

    return paragraphTexts.map((paraText, index) => {
      const trimmed = paraText.trim();
      const citations = this.extractCitations(trimmed);
      const wordCount = trimmed.split(/\s+/).length;

      return {
        index,
        text: trimmed,
        citations,
        hasCitation: citations.length >= this.minCitationsPerParagraph,
        wordCount
      };
    });
  }

  /**
   * Extract citation references from text
   * Supports formats: [1], [A], [Smith2024], (1), (A)
   */
  private extractCitations(text: string): CitationReference[] {
    const citations: CitationReference[] = [];

    // Pattern: [1], [A], [Smith2024], etc.
    const bracketPattern = /\[([^\]]+)\]/g;
    let match;

    while ((match = bracketPattern.exec(text)) !== null) {
      citations.push({
        id: match[1],
        snippetId: '', // Will be populated during validation
        position: {
          paragraph: 0, // Set by caller
          charStart: match.index,
          charEnd: match.index + match[0].length
        },
        text: '',
        confidence: 1.0
      });
    }

    return citations;
  }

  /**
   * Validate citations in generated text against evidence snippets
   */
  async validate(
    text: string,
    evidenceSnippetIds: string[]
  ): Promise<CitationValidationResult> {
    const paragraphs = this.extractParagraphs(text);
    const violations: CitationViolation[] = [];

    // Fetch evidence snippets from database
    const snippets = await db
      .select()
      .from(evidenceSnippets)
      .where(inArray(evidenceSnippets.id, evidenceSnippetIds));

    const snippetMap = new Map(snippets.map(s => [s.id, s]));

    // Track all citation IDs used
    const usedCitationIds = new Set<string>();
    const allCitations = paragraphs.flatMap(p => p.citations);

    for (const citation of allCitations) {
      usedCitationIds.add(citation.id);
    }

    // 1. Check for uncited paragraphs
    for (const para of paragraphs) {
      // Skip very short paragraphs (e.g., headings, single-sentence intros)
      if (para.wordCount < this.minParagraphLength) {
        continue;
      }

      if (!para.hasCitation) {
        violations.push({
          type: 'uncited_paragraph',
          severity: 'critical',
          paragraph: para.index,
          message: `Paragraph ${para.index} has no citations (${para.wordCount} words)`
        });
      }
    }

    // 2. Validate citation IDs reference valid evidence
    for (const citation of allCitations) {
      // Check if citation ID maps to a valid snippet
      // In production, maintain a mapping from citation IDs to snippet IDs
      // For now, we check if the ID exists in the provided snippet list

      const snippetId = this.mapCitationIdToSnippet(citation.id, evidenceSnippetIds);

      if (!snippetId || !snippetMap.has(snippetId)) {
        violations.push({
          type: 'invalid_citation',
          severity: 'critical',
          citationId: citation.id,
          message: `Citation [${citation.id}] does not reference a valid evidence snippet`
        });
      } else {
        citation.snippetId = snippetId;
        citation.text = snippetMap.get(snippetId)!.snippetText || '';
      }
    }

    // 3. Check for orphaned citations (evidence not used)
    const usedSnippetIds = new Set(allCitations.map(c => c.snippetId).filter(Boolean));
    for (const snippetId of evidenceSnippetIds) {
      if (!usedSnippetIds.has(snippetId)) {
        violations.push({
          type: 'orphaned_citation',
          severity: 'warning',
          message: `Evidence snippet ${snippetId} was provided but not cited in the text`
        });
      }
    }

    const uncitedParagraphs = paragraphs.filter(
      p => !p.hasCitation && p.wordCount >= this.minParagraphLength
    );

    const totalParagraphs = paragraphs.filter(p => p.wordCount >= this.minParagraphLength).length;
    const citedParagraphs = totalParagraphs - uncitedParagraphs.length;

    const isValid = violations.filter(v => v.severity === 'critical').length === 0;

    const avgCitations =
      paragraphs.reduce((sum, p) => sum + p.citations.length, 0) / paragraphs.length;

    return {
      isValid,
      totalParagraphs,
      citedParagraphs,
      uncitedParagraphs: uncitedParagraphs.length,
      uncitedIndices: uncitedParagraphs.map(p => p.index),
      averageCitationsPerParagraph: avgCitations,
      violations,
      summary: this.generateSummary(
        isValid,
        totalParagraphs,
        citedParagraphs,
        violations
      )
    };
  }

  /**
   * Map citation ID to snippet ID
   * In production, this would use a citation registry maintained during generation
   */
  private mapCitationIdToSnippet(citationId: string, snippetIds: string[]): string | null {
    // If citation ID is numeric, treat as 1-indexed into snippetIds array
    const numericId = parseInt(citationId, 10);
    if (!isNaN(numericId) && numericId > 0 && numericId <= snippetIds.length) {
      return snippetIds[numericId - 1];
    }

    // If citation ID is alphabetic, treat as A=0, B=1, etc.
    if (/^[A-Z]$/.test(citationId)) {
      const index = citationId.charCodeAt(0) - 'A'.charCodeAt(0);
      if (index >= 0 && index < snippetIds.length) {
        return snippetIds[index];
      }
    }

    // Otherwise, try to match citation ID as snippet ID directly
    if (snippetIds.includes(citationId)) {
      return citationId;
    }

    return null;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    isValid: boolean,
    total: number,
    cited: number,
    violations: CitationViolation[]
  ): string {
    if (isValid) {
      return `✅ All ${total} paragraphs properly cited. Citation guarantee: PASS`;
    }

    const critical = violations.filter(v => v.severity === 'critical').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;

    return `❌ Citation guarantee: FAIL. ${cited}/${total} paragraphs cited. ${critical} critical violations, ${warnings} warnings.`;
  }
}

/**
 * Citation Enforcer - automatically add citations during generation
 */
export class CitationEnforcer {
  /**
   * Post-process generated text to ensure citations
   * Attempts to automatically add missing citations
   */
  async enforceCitations(
    text: string,
    availableSnippets: Array<{ id: string; text: string; relevance: number }>
  ): Promise<{
    text: string;
    addedCitations: number;
    remainingViolations: CitationViolation[];
  }> {
    const validator = new CitationValidator();
    const paragraphs = validator.extractParagraphs(text);

    let modifiedText = text;
    let addedCitations = 0;

    // Sort snippets by relevance
    const sortedSnippets = [...availableSnippets].sort((a, b) => b.relevance - a.relevance);

    for (const para of paragraphs) {
      if (para.hasCitation || para.wordCount < 10) {
        continue; // Already cited or too short
      }

      // Find most relevant snippet for this paragraph
      const bestMatch = this.findBestMatch(para.text, sortedSnippets);

      if (bestMatch) {
        // Add citation at end of paragraph
        const citationId = `[${sortedSnippets.indexOf(bestMatch) + 1}]`;
        const paraIndex = modifiedText.indexOf(para.text);

        if (paraIndex !== -1) {
          const insertPos = paraIndex + para.text.length;
          modifiedText =
            modifiedText.slice(0, insertPos) + ` ${citationId}` + modifiedText.slice(insertPos);
          addedCitations++;
        }
      }
    }

    // Re-validate
    const validation = await validator.validate(
      modifiedText,
      sortedSnippets.map(s => s.id)
    );

    return {
      text: modifiedText,
      addedCitations,
      remainingViolations: validation.violations
    };
  }

  /**
   * Find best matching snippet for a paragraph using simple text similarity
   */
  private findBestMatch(
    paragraphText: string,
    snippets: Array<{ id: string; text: string; relevance: number }>
  ): { id: string; text: string; relevance: number } | null {
    let bestScore = 0;
    let bestSnippet = null;

    const paraWords = new Set(paragraphText.toLowerCase().split(/\s+/));

    for (const snippet of snippets) {
      const snippetWords = new Set(snippet.text.toLowerCase().split(/\s+/));

      // Jaccard similarity
      const intersection = new Set([...paraWords].filter(w => snippetWords.has(w)));
      const union = new Set([...paraWords, ...snippetWords]);
      const jaccard = intersection.size / union.size;

      // Combine with pre-computed relevance
      const score = jaccard * 0.6 + snippet.relevance * 0.4;

      if (score > bestScore) {
        bestScore = score;
        bestSnippet = snippet;
      }
    }

    // Only return if similarity is above threshold
    return bestScore > 0.3 ? bestSnippet : null;
  }
}

/**
 * Generate citation section (bibliography/references)
 */
export async function generateCitationSection(
  snippetIds: string[]
): Promise<string> {
  const snippets = await db
    .select()
    .from(evidenceSnippets)
    .where(inArray(evidenceSnippets.id, snippetIds));

  const lines: string[] = ['## Evidence Citations\n'];

  snippets.forEach((snippet, index) => {
    lines.push(`[${index + 1}] ${snippet.snippetText}`);
    if (snippet.sourceRef) {
      lines.push(`    Source: ${snippet.sourceRef}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}
