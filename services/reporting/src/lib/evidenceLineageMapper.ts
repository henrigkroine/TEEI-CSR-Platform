/**
 * Evidence Lineage Mapper
 *
 * Maps evidence IDs to readable citations for slide notes.
 * Ensures PII is redacted before adding to PPTX notes.
 *
 * @module lib/evidenceLineageMapper
 */

import type { Evidence } from '../types/evidence.js';
import { enforceRedaction } from './redaction.js';

/**
 * Evidence snippet for notes
 */
export interface EvidenceSnippet {
  id: string;
  metric_name: string;
  value: string | number;
  source: string;
  collected_at: Date;
  snippet?: string;
}

/**
 * Map evidence IDs to readable notes for PPTX slides
 *
 * @param evidenceIds - Array of evidence IDs to include
 * @param companyId - Company ID for fetching evidence
 * @returns Formatted notes string with redacted evidence citations
 */
export async function mapEvidenceToNotes(
  evidenceIds: string[],
  companyId: string
): Promise<string> {
  if (!evidenceIds || evidenceIds.length === 0) {
    return 'No evidence citations available.';
  }

  try {
    // Fetch evidence snippets from database
    const snippets = await fetchEvidenceSnippets(evidenceIds, companyId);

    if (snippets.length === 0) {
      return 'Evidence citations not found.';
    }

    // Format as slide notes
    const notes = formatEvidenceNotes(snippets);

    // Redact PII before returning
    const redacted = enforceRedaction(notes);

    // Validate no PII leaked
    if (redacted.redactionCount === 0 && containsPotentialPII(notes)) {
      console.warn('[EvidenceMapper] Potential PII detected but not redacted');
    }

    return redacted.redactedText;
  } catch (error) {
    console.error('[EvidenceMapper] Failed to map evidence to notes:', error);
    return 'Error loading evidence citations.';
  }
}

/**
 * Fetch evidence snippets from database
 *
 * @param evidenceIds - Evidence IDs to fetch
 * @param companyId - Company ID
 * @returns Evidence snippets
 */
async function fetchEvidenceSnippets(
  evidenceIds: string[],
  companyId: string
): Promise<EvidenceSnippet[]> {
  // TODO: Replace with real database query
  // In production: Query evidence table by IDs and company

  // Mock implementation - return sample evidence
  const mockEvidence: EvidenceSnippet[] = evidenceIds.map((id, index) => ({
    id,
    metric_name: `Metric ${index + 1}`,
    value: Math.floor(Math.random() * 1000),
    source: ['benevity', 'goodera', 'manual_entry', 'api_integration'][index % 4],
    collected_at: new Date(),
    snippet: `Evidence from ${['volunteer program', 'beneficiary survey', 'program data', 'financial records'][index % 4]}`,
  }));

  return mockEvidence;
}

/**
 * Format evidence snippets as readable notes
 *
 * @param snippets - Evidence snippets
 * @returns Formatted notes string
 */
function formatEvidenceNotes(snippets: EvidenceSnippet[]): string {
  const header = 'Evidence Citations:\n\n';

  const citations = snippets
    .map((snippet, index) => {
      const parts = [
        `[${snippet.id}]`,
        snippet.metric_name,
        `Value: ${typeof snippet.value === 'number' ? snippet.value.toLocaleString() : snippet.value}`,
        `Source: ${formatSource(snippet.source)}`,
        `Collected: ${formatDate(snippet.collected_at)}`,
      ];

      if (snippet.snippet) {
        parts.push(`Note: ${snippet.snippet}`);
      }

      return `${index + 1}. ${parts.join(' | ')}`;
    })
    .join('\n');

  return header + citations;
}

/**
 * Format source name for readability
 */
function formatSource(source: string): string {
  const sourceNames: Record<string, string> = {
    benevity: 'Benevity Integration',
    goodera: 'Goodera Integration',
    workday: 'Workday Integration',
    manual_entry: 'Manual Entry',
    csv_import: 'CSV Import',
    api_integration: 'API Integration',
    calculated: 'Calculated Metric',
  };

  return sourceNames[source] || source;
}

/**
 * Format date for readability
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Simple PII detection heuristic
 * This is a basic check - real PII detection happens in redaction.ts
 */
function containsPotentialPII(text: string): boolean {
  // Check for common PII patterns
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b\d{16}\b/, // Credit card
  ];

  return piiPatterns.some((pattern) => pattern.test(text));
}

/**
 * Map evidence IDs to short citation format (for inline use)
 *
 * @param evidenceIds - Evidence IDs
 * @returns Short citation string like "[EV-001, EV-002, EV-003]"
 */
export function formatEvidenceCitation(evidenceIds: string[]): string {
  if (!evidenceIds || evidenceIds.length === 0) {
    return '';
  }

  return `[${evidenceIds.join(', ')}]`;
}

/**
 * Extract evidence IDs from content
 * Useful for finding evidence references in narrative text
 *
 * @param content - Text content that may contain evidence IDs
 * @returns Array of evidence IDs found
 */
export function extractEvidenceIds(content: string): string[] {
  const pattern = /\[(EV-\d+)\]/g;
  const matches = content.matchAll(pattern);
  return Array.from(matches).map((m) => m[1]);
}

/**
 * Build evidence lineage graph for a metric
 * Shows how evidence was transformed and calculated
 *
 * @param evidenceId - Root evidence ID
 * @param companyId - Company ID
 * @returns Lineage tree structure for notes
 */
export async function buildEvidenceLineageTree(
  evidenceId: string,
  companyId: string
): Promise<string> {
  // TODO: Implement lineage tree traversal
  // In production: Query lineage graph from database

  // Mock implementation
  const tree = `
Evidence Lineage for ${evidenceId}:

├── Input: Volunteer Hours (1,250 hrs)
│   └── Source: Benevity Integration
│
├── Input: Beneficiary Count (450)
│   └── Source: CRM Sync
│
├── Calculation: Social Value = Hours × Rate
│   └── Result: $37,437.50
│
└── Calculation: SROI = Social Value / Investment
    └── Result: 2.45:1
`;

  return tree.trim();
}

/**
 * Validate evidence IDs exist and are accessible
 *
 * @param evidenceIds - Evidence IDs to validate
 * @param companyId - Company ID
 * @returns Validation result with missing/invalid IDs
 */
export async function validateEvidenceIds(
  evidenceIds: string[],
  companyId: string
): Promise<{
  valid: string[];
  missing: string[];
  unauthorized: string[];
}> {
  // TODO: Implement real validation against database
  // In production: Check if evidence exists and belongs to company

  // Mock implementation - assume all are valid
  return {
    valid: evidenceIds,
    missing: [],
    unauthorized: [],
  };
}

/**
 * Get evidence summary for a slide
 * Returns high-level stats about evidence used
 *
 * @param evidenceIds - Evidence IDs
 * @param companyId - Company ID
 * @returns Evidence summary string
 */
export async function getEvidenceSummary(
  evidenceIds: string[],
  companyId: string
): Promise<string> {
  if (!evidenceIds || evidenceIds.length === 0) {
    return 'No evidence sources';
  }

  const snippets = await fetchEvidenceSnippets(evidenceIds, companyId);

  // Group by source
  const bySource: Record<string, number> = {};
  snippets.forEach((s) => {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
  });

  const sourceSummary = Object.entries(bySource)
    .map(([source, count]) => `${count} from ${formatSource(source)}`)
    .join(', ');

  return `Evidence: ${snippets.length} citation${snippets.length === 1 ? '' : 's'} (${sourceSummary})`;
}
