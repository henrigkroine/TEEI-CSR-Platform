/**
 * Regulatory Pack PDF Renderer
 *
 * Renders regulatory packs to PDF with:
 * - Table of contents
 * - Page numbers
 * - Footnotes with evidence IDs
 * - Framework-specific formatting
 *
 * @module srs/pdf-renderer
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import type { RegulatoryPack } from '@teei/shared-types';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Load and compile Handlebars template
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  const templatePath = join(
    process.cwd(),
    'src',
    'templates',
    'annex',
    `${templateName}.hbs`
  );
  const templateContent = await readFile(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
}

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // Helper: Format date
  Handlebars.registerHelper('formatDate', (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Helper: Format completeness percentage
  Handlebars.registerHelper('formatPercentage', (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  });

  // Helper: Status badge class
  Handlebars.registerHelper('statusBadge', (status: string) => {
    const classes = {
      complete: 'badge-success',
      partial: 'badge-warning',
      missing: 'badge-danger',
      not_applicable: 'badge-secondary',
    };
    return classes[status as keyof typeof classes] || 'badge-secondary';
  });

  // Helper: Framework color
  Handlebars.registerHelper('frameworkColor', (framework: string) => {
    const colors = {
      CSRD: '#1e40af', // Blue
      GRI: '#059669', // Green
      SDG: '#dc2626', // Red
    };
    return colors[framework as keyof typeof colors] || '#6b7280';
  });

  // Helper: Truncate text
  Handlebars.registerHelper('truncate', (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
  });

  // Helper: Join array
  Handlebars.registerHelper('join', (array: string[], separator: string) => {
    return array.join(separator);
  });
}

// ============================================================================
// TABLE OF CONTENTS GENERATION
// ============================================================================

interface TOCEntry {
  title: string;
  pageNumber: number;
  level: number;
  framework?: string;
}

/**
 * Generate table of contents from pack sections
 */
function generateTOC(pack: RegulatoryPack): TOCEntry[] {
  const toc: TOCEntry[] = [];

  // Add cover page
  toc.push({
    title: 'Cover Page',
    pageNumber: 1,
    level: 0,
  });

  // Add summary
  toc.push({
    title: 'Executive Summary',
    pageNumber: 2,
    level: 0,
  });

  // Add TOC itself
  toc.push({
    title: 'Table of Contents',
    pageNumber: 3,
    level: 0,
  });

  // Add framework sections
  let currentPage = 4;
  for (const framework of pack.frameworks) {
    toc.push({
      title: `${framework} Disclosures`,
      pageNumber: currentPage,
      level: 0,
      framework,
    });

    const frameworkSections = pack.sections.filter(s => s.framework === framework);
    for (const section of frameworkSections) {
      toc.push({
        title: section.title,
        pageNumber: section.pageNumber || currentPage,
        level: 1,
        framework,
      });
      currentPage++;
    }
  }

  // Add gaps section if gaps exist
  if (pack.gaps.length > 0) {
    toc.push({
      title: 'Data Gaps & Recommendations',
      pageNumber: currentPage,
      level: 0,
    });
  }

  return toc;
}

// ============================================================================
// FOOTNOTES GENERATION
// ============================================================================

interface Footnote {
  id: number;
  evidenceId: string;
  source: string;
  relevance: number;
}

/**
 * Extract footnotes from pack citations
 */
function extractFootnotes(pack: RegulatoryPack): Footnote[] {
  const footnotes: Footnote[] = [];
  const seenEvidence = new Set<string>();
  let id = 1;

  for (const section of pack.sections) {
    for (const citation of section.citations) {
      if (!seenEvidence.has(citation.evidenceId)) {
        footnotes.push({
          id: id++,
          evidenceId: citation.evidenceId,
          source: citation.source,
          relevance: citation.relevanceScore,
        });
        seenEvidence.add(citation.evidenceId);
      }
    }
  }

  return footnotes;
}

// ============================================================================
// HTML RENDERING
// ============================================================================

/**
 * Render pack to HTML
 */
async function renderPackToHTML(pack: RegulatoryPack): Promise<string> {
  // Register helpers
  registerHelpers();

  // Load main template
  const mainTemplate = await loadTemplate('pack-main');

  // Generate TOC and footnotes
  const toc = generateTOC(pack);
  const footnotes = extractFootnotes(pack);

  // Prepare data for template
  const templateData = {
    pack,
    toc,
    footnotes,
    generatedDate: new Date().toISOString(),
  };

  // Render HTML
  const html = mainTemplate(templateData);

  return html;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Render HTML to PDF using Playwright
 */
async function htmlToPDF(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #6b7280;">
          <span style="margin-left: 15mm;">Regulatory Compliance Pack</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #6b7280;">
          <span style="margin-left: 15mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Add metadata to PDF
 */
async function addPDFMetadata(
  pdfBuffer: Buffer,
  pack: RegulatoryPack
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Set metadata
  pdfDoc.setTitle(`Regulatory Pack - ${pack.companyId}`);
  pdfDoc.setSubject(`${pack.frameworks.join(', ')} Compliance Pack`);
  pdfDoc.setKeywords([
    ...pack.frameworks,
    'compliance',
    'regulatory',
    'ESG',
    'sustainability',
  ]);
  pdfDoc.setAuthor('TEEI CSR Platform');
  pdfDoc.setCreationDate(new Date(pack.metadata.generatedAt));
  pdfDoc.setModificationDate(new Date());

  // Save and return
  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render regulatory pack to PDF
 * Complete pipeline: template → HTML → PDF → metadata
 */
export async function renderPackToPDF(pack: RegulatoryPack): Promise<Buffer> {
  try {
    // 1. Render pack to HTML
    const html = await renderPackToHTML(pack);

    // 2. Convert HTML to PDF
    const pdfBuffer = await htmlToPDF(html);

    // 3. Add PDF metadata
    const finalPdfBuffer = await addPDFMetadata(pdfBuffer, pack);

    return finalPdfBuffer;
  } catch (error) {
    console.error('Error rendering pack to PDF:', error);
    throw new Error(`Failed to render PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
