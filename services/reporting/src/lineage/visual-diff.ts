/**
 * Visual Diff System for Report Audits
 * Compare two reports to show changes in content, citations, and scores
 */

import { db } from '@teei/shared-schema/db';
import { reportLineage, reportSections, reportCitations } from '@teei/shared-schema/schema/report_lineage';
import { eq } from 'drizzle-orm';
import { diffWords, diffLines, Change } from 'diff';

export interface ReportDiff {
  reportA: {
    id: string;
    date: string;
    model: string;
  };
  reportB: {
    id: string;
    date: string;
    model: string;
  };
  sections: SectionDiff[];
  citations: CitationDiff;
  metadata: MetadataDiff;
  summary: DiffSummary;
}

export interface SectionDiff {
  sectionName: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  contentDiff?: Change[];
  wordCountChange?: number;
  citationCountChange?: number;
}

export interface CitationDiff {
  added: string[]; // Citation IDs added in B
  removed: string[]; // Citation IDs removed from A
  common: string[]; // Citation IDs in both
  totalA: number;
  totalB: number;
}

export interface MetadataDiff {
  modelChanged: boolean;
  providerChanged: boolean;
  promptVersionChanged: boolean;
  costChange: number; // Absolute difference
  costChangePercent: number; // Percentage
  durationChange: number; // ms
}

export interface DiffSummary {
  totalChanges: number;
  addedSections: number;
  removedSections: number;
  modifiedSections: number;
  citationChanges: number;
  significance: 'minor' | 'moderate' | 'major';
}

/**
 * Visual Diff Generator
 */
export class ReportDiffGenerator {
  /**
   * Generate diff between two reports
   */
  async generateDiff(reportIdA: string, reportIdB: string): Promise<ReportDiff> {
    // Fetch both reports
    const [reportA] = await db
      .select()
      .from(reportLineage)
      .where(eq(reportLineage.reportId, reportIdA))
      .limit(1);

    const [reportB] = await db
      .select()
      .from(reportLineage)
      .where(eq(reportLineage.reportId, reportIdB))
      .limit(1);

    if (!reportA || !reportB) {
      throw new Error('One or both reports not found');
    }

    // Fetch sections for both reports
    const sectionsA = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportLineageId, reportA.id));

    const sectionsB = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportLineageId, reportB.id));

    // Fetch citations for both reports
    const citationsA = await db
      .select()
      .from(reportCitations)
      .where(eq(reportCitations.reportLineageId, reportA.id));

    const citationsB = await db
      .select()
      .from(reportCitations)
      .where(eq(reportCitations.reportLineageId, reportB.id));

    // Generate section diffs
    const sectionDiffs = this.diffSections(sectionsA, sectionsB);

    // Generate citation diff
    const citationDiff = this.diffCitations(citationsA, citationsB);

    // Generate metadata diff
    const metadataDiff = this.diffMetadata(reportA, reportB);

    // Calculate summary
    const summary = this.calculateSummary(sectionDiffs, citationDiff);

    return {
      reportA: {
        id: reportIdA,
        date: reportA.createdAt?.toISOString() || '',
        model: reportA.modelUsed || ''
      },
      reportB: {
        id: reportIdB,
        date: reportB.createdAt?.toISOString() || '',
        model: reportB.modelUsed || ''
      },
      sections: sectionDiffs,
      citations: citationDiff,
      metadata: metadataDiff,
      summary
    };
  }

  /**
   * Diff sections between two reports
   */
  private diffSections(
    sectionsA: any[],
    sectionsB: any[]
  ): SectionDiff[] {
    const diffs: SectionDiff[] = [];

    // Create maps by section name
    const mapA = new Map(sectionsA.map(s => [s.sectionName, s]));
    const mapB = new Map(sectionsB.map(s => [s.sectionName, s]));

    // Get all unique section names
    const allNames = new Set([...mapA.keys(), ...mapB.keys()]);

    for (const name of allNames) {
      const sectionA = mapA.get(name);
      const sectionB = mapB.get(name);

      if (!sectionA && sectionB) {
        // Added in B
        diffs.push({
          sectionName: name,
          status: 'added',
          wordCountChange: sectionB.wordCount || 0
        });
      } else if (sectionA && !sectionB) {
        // Removed from A
        diffs.push({
          sectionName: name,
          status: 'removed',
          wordCountChange: -(sectionA.wordCount || 0)
        });
      } else if (sectionA && sectionB) {
        // Exists in both - check for changes
        const contentA = sectionA.content || '';
        const contentB = sectionB.content || '';

        if (contentA === contentB) {
          diffs.push({
            sectionName: name,
            status: 'unchanged'
          });
        } else {
          // Generate word-level diff
          const wordDiff = diffWords(contentA, contentB);

          diffs.push({
            sectionName: name,
            status: 'modified',
            contentDiff: wordDiff,
            wordCountChange: (sectionB.wordCount || 0) - (sectionA.wordCount || 0)
          });
        }
      }
    }

    return diffs;
  }

  /**
   * Diff citations between two reports
   */
  private diffCitations(citationsA: any[], citationsB: any[]): CitationDiff {
    const idsA = new Set(citationsA.map(c => c.citationId).filter(Boolean));
    const idsB = new Set(citationsB.map(c => c.citationId).filter(Boolean));

    const added = Array.from(idsB).filter(id => !idsA.has(id));
    const removed = Array.from(idsA).filter(id => !idsB.has(id));
    const common = Array.from(idsA).filter(id => idsB.has(id));

    return {
      added,
      removed,
      common,
      totalA: citationsA.length,
      totalB: citationsB.length
    };
  }

  /**
   * Diff metadata between two reports
   */
  private diffMetadata(reportA: any, reportB: any): MetadataDiff {
    const costA = parseFloat(reportA.cost || '0');
    const costB = parseFloat(reportB.cost || '0');
    const costChange = costB - costA;
    const costChangePercent = costA > 0 ? (costChange / costA) * 100 : 0;

    const durationA = reportA.durationMs || 0;
    const durationB = reportB.durationMs || 0;
    const durationChange = durationB - durationA;

    return {
      modelChanged: reportA.modelUsed !== reportB.modelUsed,
      providerChanged: reportA.providerUsed !== reportB.providerUsed,
      promptVersionChanged: reportA.promptVersion !== reportB.promptVersion,
      costChange,
      costChangePercent,
      durationChange
    };
  }

  /**
   * Calculate diff summary
   */
  private calculateSummary(
    sectionDiffs: SectionDiff[],
    citationDiff: CitationDiff
  ): DiffSummary {
    const addedSections = sectionDiffs.filter(s => s.status === 'added').length;
    const removedSections = sectionDiffs.filter(s => s.status === 'removed').length;
    const modifiedSections = sectionDiffs.filter(s => s.status === 'modified').length;
    const citationChanges = citationDiff.added.length + citationDiff.removed.length;

    const totalChanges = addedSections + removedSections + modifiedSections + citationChanges;

    // Determine significance
    let significance: 'minor' | 'moderate' | 'major';
    if (totalChanges === 0) {
      significance = 'minor';
    } else if (totalChanges <= 3) {
      significance = 'minor';
    } else if (totalChanges <= 10) {
      significance = 'moderate';
    } else {
      significance = 'major';
    }

    // Upgrade to major if sections were added/removed
    if (addedSections > 0 || removedSections > 0) {
      significance = 'major';
    }

    return {
      totalChanges,
      addedSections,
      removedSections,
      modifiedSections,
      citationChanges,
      significance
    };
  }

  /**
   * Export diff to HTML format with color coding
   */
  exportToHTML(diff: ReportDiff): string {
    const lines: string[] = [];

    lines.push('<!DOCTYPE html>');
    lines.push('<html>');
    lines.push('<head>');
    lines.push('<title>Report Diff</title>');
    lines.push('<style>');
    lines.push(`
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1, h2, h3 { color: #333; }
      .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; }
      .added { background-color: #d4edda; color: #155724; }
      .removed { background-color: #f8d7da; color: #721c24; }
      .modified { background-color: #fff3cd; color: #856404; }
      .diff-word-added { background-color: #acf2bd; }
      .diff-word-removed { background-color: #fdb8c0; text-decoration: line-through; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #4CAF50; color: white; }
    `);
    lines.push('</style>');
    lines.push('</head>');
    lines.push('<body>');

    // Header
    lines.push('<h1>Report Diff</h1>');

    // Summary
    lines.push('<div class="summary">');
    lines.push(`<h2>Summary</h2>`);
    lines.push(`<p><strong>Significance:</strong> ${diff.summary.significance.toUpperCase()}</p>`);
    lines.push(`<p><strong>Total Changes:</strong> ${diff.summary.totalChanges}</p>`);
    lines.push(`<p><strong>Sections Added:</strong> ${diff.summary.addedSections}</p>`);
    lines.push(`<p><strong>Sections Removed:</strong> ${diff.summary.removedSections}</p>`);
    lines.push(`<p><strong>Sections Modified:</strong> ${diff.summary.modifiedSections}</p>`);
    lines.push(`<p><strong>Citation Changes:</strong> ${diff.summary.citationChanges}</p>`);
    lines.push('</div>');

    // Report Info
    lines.push('<h2>Report Comparison</h2>');
    lines.push('<table>');
    lines.push('<tr><th>Property</th><th>Report A</th><th>Report B</th></tr>');
    lines.push(`<tr><td>ID</td><td>${diff.reportA.id}</td><td>${diff.reportB.id}</td></tr>`);
    lines.push(`<tr><td>Date</td><td>${diff.reportA.date}</td><td>${diff.reportB.date}</td></tr>`);
    lines.push(`<tr><td>Model</td><td>${diff.reportA.model}</td><td>${diff.reportB.model}</td></tr>`);
    lines.push('</table>');

    // Metadata Changes
    if (diff.metadata.modelChanged || diff.metadata.providerChanged) {
      lines.push('<h2>Metadata Changes</h2>');
      lines.push('<ul>');
      if (diff.metadata.modelChanged) lines.push('<li>Model changed</li>');
      if (diff.metadata.providerChanged) lines.push('<li>Provider changed</li>');
      if (diff.metadata.promptVersionChanged) lines.push('<li>Prompt version changed</li>');
      lines.push(`<li>Cost change: $${diff.metadata.costChange.toFixed(4)} (${diff.metadata.costChangePercent.toFixed(1)}%)</li>`);
      lines.push(`<li>Duration change: ${diff.metadata.durationChange}ms</li>`);
      lines.push('</ul>');
    }

    // Section Diffs
    lines.push('<h2>Section Changes</h2>');
    for (const section of diff.sections) {
      const statusClass = section.status;
      lines.push(`<h3 class="${statusClass}">${section.sectionName} [${section.status}]</h3>`);

      if (section.status === 'modified' && section.contentDiff) {
        lines.push('<div>');
        for (const change of section.contentDiff) {
          if (change.added) {
            lines.push(`<span class="diff-word-added">${this.escapeHTML(change.value)}</span>`);
          } else if (change.removed) {
            lines.push(`<span class="diff-word-removed">${this.escapeHTML(change.value)}</span>`);
          } else {
            lines.push(this.escapeHTML(change.value));
          }
        }
        lines.push('</div>');

        if (section.wordCountChange) {
          lines.push(`<p><em>Word count change: ${section.wordCountChange > 0 ? '+' : ''}${section.wordCountChange}</em></p>`);
        }
      }
    }

    // Citation Changes
    if (diff.citations.added.length > 0 || diff.citations.removed.length > 0) {
      lines.push('<h2>Citation Changes</h2>');

      if (diff.citations.added.length > 0) {
        lines.push('<h3 class="added">Added Citations</h3>');
        lines.push('<ul>');
        for (const cit of diff.citations.added) {
          lines.push(`<li>[${cit}]</li>`);
        }
        lines.push('</ul>');
      }

      if (diff.citations.removed.length > 0) {
        lines.push('<h3 class="removed">Removed Citations</h3>');
        lines.push('<ul>');
        for (const cit of diff.citations.removed) {
          lines.push(`<li>[${cit}]</li>`);
        }
        lines.push('</ul>');
      }
    }

    lines.push('</body>');
    lines.push('</html>');

    return lines.join('\n');
  }

  /**
   * Export diff to Markdown format
   */
  exportToMarkdown(diff: ReportDiff): string {
    const lines: string[] = [];

    lines.push('# Report Diff');
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Significance**: ${diff.summary.significance.toUpperCase()}`);
    lines.push(`- **Total Changes**: ${diff.summary.totalChanges}`);
    lines.push(`- **Sections Added**: ${diff.summary.addedSections}`);
    lines.push(`- **Sections Removed**: ${diff.summary.removedSections}`);
    lines.push(`- **Sections Modified**: ${diff.summary.modifiedSections}`);
    lines.push(`- **Citation Changes**: ${diff.summary.citationChanges}`);
    lines.push('');

    // Report Info
    lines.push('## Report Comparison');
    lines.push('');
    lines.push('| Property | Report A | Report B |');
    lines.push('|----------|----------|----------|');
    lines.push(`| ID | ${diff.reportA.id} | ${diff.reportB.id} |`);
    lines.push(`| Date | ${diff.reportA.date} | ${diff.reportB.date} |`);
    lines.push(`| Model | ${diff.reportA.model} | ${diff.reportB.model} |`);
    lines.push('');

    // Metadata
    if (diff.metadata.modelChanged || diff.metadata.providerChanged) {
      lines.push('## Metadata Changes');
      lines.push('');
      if (diff.metadata.modelChanged) lines.push('- ⚠️ Model changed');
      if (diff.metadata.providerChanged) lines.push('- ⚠️ Provider changed');
      if (diff.metadata.promptVersionChanged) lines.push('- ⚠️ Prompt version changed');
      lines.push(`- Cost change: $${diff.metadata.costChange.toFixed(4)} (${diff.metadata.costChangePercent.toFixed(1)}%)`);
      lines.push(`- Duration change: ${diff.metadata.durationChange}ms`);
      lines.push('');
    }

    // Sections
    lines.push('## Section Changes');
    lines.push('');

    for (const section of diff.sections) {
      let icon = '';
      if (section.status === 'added') icon = '✅';
      else if (section.status === 'removed') icon = '❌';
      else if (section.status === 'modified') icon = '📝';

      lines.push(`### ${icon} ${section.sectionName} [${section.status}]`);
      lines.push('');

      if (section.status === 'modified' && section.wordCountChange) {
        lines.push(`*Word count change: ${section.wordCountChange > 0 ? '+' : ''}${section.wordCountChange}*`);
        lines.push('');
      }
    }

    // Citations
    if (diff.citations.added.length > 0 || diff.citations.removed.length > 0) {
      lines.push('## Citation Changes');
      lines.push('');

      if (diff.citations.added.length > 0) {
        lines.push('**Added Citations:**');
        for (const cit of diff.citations.added) {
          lines.push(`- [${cit}]`);
        }
        lines.push('');
      }

      if (diff.citations.removed.length > 0) {
        lines.push('**Removed Citations:**');
        for (const cit of diff.citations.removed) {
          lines.push(`- [${cit}]`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push(`*Generated on ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  /**
   * Escape HTML entities
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Singleton instance
 */
let diffGeneratorInstance: ReportDiffGenerator | null = null;

export function getReportDiffGenerator(): ReportDiffGenerator {
  if (!diffGeneratorInstance) {
    diffGeneratorInstance = new ReportDiffGenerator();
  }
  return diffGeneratorInstance;
}
