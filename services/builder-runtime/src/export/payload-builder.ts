/**
 * Export Payload Builder - export-payload-author
 * Builds export payloads for PDF/PPTX with slide-note citations
 */

import type { BuilderDashboard, Block } from '../schema/builder.js';
import type { QueryGraph } from '../compiler/query-graph.js';
import { createServiceLogger } from '@teei/shared-utils';
import { z } from 'zod';

const logger = createServiceLogger('export-payload-builder');

/**
 * PDF Export Payload
 */
export const PdfExportPayloadSchema = z.object({
  dashboardId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  author: z.string(),
  generatedAt: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      blocks: z.array(
        z.object({
          blockId: z.string(),
          type: z.string(),
          title: z.string(),
          data: z.any(),
          visualizationType: z.string().optional(), // chart, table, kpi
          citations: z.array(
            z.object({
              id: z.string(),
              text: z.string(),
              sourceSystem: z.string(),
              confidence: z.number(),
            })
          ),
        })
      ),
    })
  ),
  metadata: z.object({
    tenantId: z.string(),
    exportedBy: z.string(),
    watermark: z.string().optional(),
    evidenceHash: z.string(), // Hash of all citations
  }),
});

export type PdfExportPayload = z.infer<typeof PdfExportPayloadSchema>;

/**
 * PPTX Export Payload
 */
export const PptxExportPayloadSchema = z.object({
  dashboardId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  author: z.string(),
  generatedAt: z.string(),
  slides: z.array(
    z.object({
      slideNumber: z.number(),
      layout: z.enum(['title', 'content', 'two-column', 'chart', 'table']),
      title: z.string(),
      content: z.object({
        blocks: z.array(
          z.object({
            blockId: z.string(),
            type: z.string(),
            title: z.string(),
            data: z.any(),
          })
        ),
        notes: z.string(), // Speaker notes with citations
      }),
    })
  ),
  metadata: z.object({
    tenantId: z.string(),
    exportedBy: z.string(),
    template: z.string().default('corporate'),
    brandColors: z.array(z.string()).optional(),
    evidenceHash: z.string(),
  }),
});

export type PptxExportPayload = z.infer<typeof PptxExportPayloadSchema>;

export class ExportPayloadBuilder {
  /**
   * Build PDF export payload
   */
  async buildPdfPayload(
    dashboard: BuilderDashboard,
    results: Map<string, any>,
    options: {
      author: string;
      watermark?: string;
      includeCitations?: boolean;
    }
  ): Promise<PdfExportPayload> {
    logger.info({ dashboardId: dashboard.id }, 'Building PDF export payload');

    const sections = this.groupBlocksIntoSections(dashboard.blocks);
    const citations = options.includeCitations !== false ? this.extractCitations(results) : [];
    const evidenceHash = this.computeEvidenceHash(citations);

    const payload: PdfExportPayload = {
      dashboardId: dashboard.id,
      title: dashboard.name,
      subtitle: dashboard.description,
      author: options.author,
      generatedAt: new Date().toISOString(),
      sections: sections.map((section) => ({
        title: section.title,
        blocks: section.blocks.map((block) => ({
          blockId: block.id,
          type: block.type,
          title: block.title,
          data: results.get(block.id) || {},
          visualizationType: this.getVisualizationType(block),
          citations: this.getCitationsForBlock(block.id, citations),
        })),
      })),
      metadata: {
        tenantId: dashboard.tenantId,
        exportedBy: options.author,
        watermark: options.watermark,
        evidenceHash,
      },
    };

    return payload;
  }

  /**
   * Build PPTX export payload
   */
  async buildPptxPayload(
    dashboard: BuilderDashboard,
    results: Map<string, any>,
    options: {
      author: string;
      template?: string;
      brandColors?: string[];
      includeCitations?: boolean;
    }
  ): Promise<PptxExportPayload> {
    logger.info({ dashboardId: dashboard.id }, 'Building PPTX export payload');

    const citations = options.includeCitations !== false ? this.extractCitations(results) : [];
    const evidenceHash = this.computeEvidenceHash(citations);

    // Create slides
    const slides: PptxExportPayload['slides'] = [];

    // Title slide
    slides.push({
      slideNumber: 1,
      layout: 'title',
      title: dashboard.name,
      content: {
        blocks: [],
        notes: `Generated on ${new Date().toISOString()}`,
      },
    });

    // Content slides - one per block (or grouped)
    let slideNum = 2;
    const sections = this.groupBlocksIntoSections(dashboard.blocks);

    for (const section of sections) {
      for (const block of section.blocks) {
        const blockCitations = this.getCitationsForBlock(block.id, citations);
        const notesText = this.buildSlideNotes(block, blockCitations);

        slides.push({
          slideNumber: slideNum++,
          layout: this.getSlideLayout(block),
          title: block.title,
          content: {
            blocks: [
              {
                blockId: block.id,
                type: block.type,
                title: block.title,
                data: results.get(block.id) || {},
              },
            ],
            notes: notesText,
          },
        });
      }
    }

    const payload: PptxExportPayload = {
      dashboardId: dashboard.id,
      title: dashboard.name,
      subtitle: dashboard.description,
      author: options.author,
      generatedAt: new Date().toISOString(),
      slides,
      metadata: {
        tenantId: dashboard.tenantId,
        exportedBy: options.author,
        template: options.template || 'corporate',
        brandColors: options.brandColors,
        evidenceHash,
      },
    };

    return payload;
  }

  /**
   * Group blocks into logical sections
   */
  private groupBlocksIntoSections(blocks: Block[]): { title: string; blocks: Block[] }[] {
    // Simple grouping by block type
    const sections: { title: string; blocks: Block[] }[] = [];

    const kpis = blocks.filter((b) => b.type === 'kpi');
    const charts = blocks.filter((b) => b.type === 'chart');
    const insights = blocks.filter((b) => b.type === 'q2q_insight');
    const narratives = blocks.filter((b) => b.type === 'narrative');
    const tables = blocks.filter((b) => b.type === 'table');

    if (kpis.length > 0) {
      sections.push({ title: 'Key Metrics', blocks: kpis });
    }

    if (charts.length > 0) {
      sections.push({ title: 'Trends & Analysis', blocks: charts });
    }

    if (insights.length > 0) {
      sections.push({ title: 'Insights', blocks: insights });
    }

    if (narratives.length > 0) {
      sections.push({ title: 'Executive Summary', blocks: narratives });
    }

    if (tables.length > 0) {
      sections.push({ title: 'Detailed Data', blocks: tables });
    }

    return sections;
  }

  /**
   * Extract citations from results
   */
  private extractCitations(results: Map<string, any>): any[] {
    const citations: any[] = [];

    for (const [blockId, result] of results.entries()) {
      if (result.citations && Array.isArray(result.citations)) {
        for (const citation of result.citations) {
          citations.push({
            blockId,
            ...citation,
          });
        }
      }
    }

    return citations;
  }

  /**
   * Get citations for specific block
   */
  private getCitationsForBlock(blockId: string, citations: any[]): any[] {
    return citations.filter((c) => c.blockId === blockId);
  }

  /**
   * Build slide notes with citations
   */
  private buildSlideNotes(block: Block, citations: any[]): string {
    let notes = `${block.title}\n\n`;

    if (citations.length > 0) {
      notes += 'Evidence & Citations:\n';
      for (const citation of citations) {
        notes += `- [${citation.id}] ${citation.text} (Source: ${citation.sourceSystem}, Confidence: ${(citation.confidence * 100).toFixed(0)}%)\n`;
      }
    } else {
      notes += 'No citations available for this block.\n';
    }

    return notes;
  }

  /**
   * Get visualization type for block
   */
  private getVisualizationType(block: Block): string {
    switch (block.type) {
      case 'kpi':
        return 'kpi_card';
      case 'chart':
        return block.chartType;
      case 'table':
        return 'data_table';
      case 'narrative':
        return 'text';
      case 'q2q_insight':
        return 'insight_card';
      case 'impact_tile':
        return 'tile';
      default:
        return 'unknown';
    }
  }

  /**
   * Get slide layout for block
   */
  private getSlideLayout(block: Block): PptxExportPayload['slides'][number]['layout'] {
    switch (block.type) {
      case 'chart':
        return 'chart';
      case 'table':
        return 'table';
      case 'narrative':
        return 'content';
      default:
        return 'content';
    }
  }

  /**
   * Compute evidence hash
   */
  private computeEvidenceHash(citations: any[]): string {
    // Simple hash of citation IDs
    const citationIds = citations.map((c) => c.id).sort().join(',');
    return Buffer.from(citationIds).toString('base64').slice(0, 16);
  }
}
