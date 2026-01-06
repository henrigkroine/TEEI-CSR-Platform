/**
 * PPTX Exporter
 *
 * Export canvas to PowerPoint with evidence hashes and speaker notes
 */

import PptxGenJS from 'pptxgenjs';
import { Canvas, Block, BlockType } from '../canvas/blocks.js';
import { VersionNode } from '../versioning/version-graph.js';
import { createHash } from 'crypto';

export interface PPTXExportOptions {
  includeCoverSlide: boolean;
  includeMetadata: boolean;
  includeEvidenceHashes: boolean;
  includeSpeakerNotes: boolean;
  template?: string;
  watermark?: string;
}

export interface PPTXExportResult {
  buffer: Buffer;
  filename: string;
  metadata: {
    slideCount: number;
    evidenceHashes: string[];
    exportedAt: string;
    version: number;
  };
}

/**
 * PPTX Exporter class
 */
export class PPTXExporter {
  private pptx: PptxGenJS;

  constructor() {
    this.pptx = new PptxGenJS();
  }

  /**
   * Export canvas to PPTX
   */
  async export(
    canvas: Canvas,
    version: VersionNode | null,
    options: Partial<PPTXExportOptions> = {}
  ): Promise<PPTXExportResult> {
    const opts: PPTXExportOptions = {
      includeCoverSlide: true,
      includeMetadata: true,
      includeEvidenceHashes: true,
      includeSpeakerNotes: true,
      ...options
    };

    // Set presentation properties
    this.pptx.author = 'TEEI CSR Platform';
    this.pptx.company = 'TEEI';
    this.pptx.subject = canvas.name;
    this.pptx.title = canvas.name;

    const evidenceHashes: string[] = [];

    // Add cover slide
    if (opts.includeCoverSlide) {
      this.addCoverSlide(canvas, version);
    }

    // Add slides for each block
    for (const block of canvas.blocks) {
      const evidenceHash = this.addBlockSlide(block, canvas, opts);
      if (evidenceHash) {
        evidenceHashes.push(evidenceHash);
      }
    }

    // Add metadata slide
    if (opts.includeMetadata && version) {
      this.addMetadataSlide(canvas, version, evidenceHashes);
    }

    // Generate buffer
    const buffer = await this.pptx.write({ outputType: 'nodebuffer' }) as Buffer;

    return {
      buffer,
      filename: `${canvas.name.replace(/\s+/g, '_')}_v${version?.versionNumber || 1}.pptx`,
      metadata: {
        slideCount: canvas.blocks.length + (opts.includeCoverSlide ? 1 : 0) + (opts.includeMetadata ? 1 : 0),
        evidenceHashes,
        exportedAt: new Date().toISOString(),
        version: version?.versionNumber || 1
      }
    };
  }

  /**
   * Add cover slide
   */
  private addCoverSlide(canvas: Canvas, version: VersionNode | null) {
    const slide = this.pptx.addSlide();

    slide.addText(canvas.name, {
      x: 0.5,
      y: 1.0,
      w: 9,
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: '363636',
      align: 'center'
    });

    if (canvas.description) {
      slide.addText(canvas.description, {
        x: 1,
        y: 3.0,
        w: 8,
        h: 1.0,
        fontSize: 18,
        color: '666666',
        align: 'center'
      });
    }

    slide.addText(
      `Version ${version?.versionNumber || 1} | ${new Date().toLocaleDateString()}`,
      {
        x: 1,
        y: 5.0,
        w: 8,
        h: 0.5,
        fontSize: 14,
        color: '999999',
        align: 'center'
      }
    );

    // Add watermark if provided
    if (this.pptx.company) {
      slide.addText('TEEI CSR Platform', {
        x: 0.5,
        y: 6.5,
        w: 9,
        h: 0.3,
        fontSize: 10,
        color: 'CCCCCC',
        align: 'center'
      });
    }
  }

  /**
   * Add slide for a block
   */
  private addBlockSlide(
    block: Block,
    canvas: Canvas,
    options: PPTXExportOptions
  ): string | null {
    const slide = this.pptx.addSlide();
    const evidenceHash = this.computeEvidenceHash(block);

    // Add block title
    slide.addText(block.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: '363636'
    });

    // Add block type badge
    slide.addText(block.type.toUpperCase(), {
      x: 8.0,
      y: 0.5,
      w: 1.5,
      h: 0.4,
      fontSize: 12,
      color: 'FFFFFF',
      fill: { color: this.getBlockTypeColor(block.type) },
      align: 'center'
    });

    // Add block-specific content
    switch (block.type) {
      case BlockType.METRIC:
        this.addMetricContent(slide, block as any);
        break;
      case BlockType.CHART:
        this.addChartContent(slide, block as any);
        break;
      case BlockType.TABLE:
        this.addTableContent(slide, block as any);
        break;
      case BlockType.TEXT:
        this.addTextContent(slide, block as any);
        break;
      case BlockType.NLQ:
        this.addNLQContent(slide, block as any);
        break;
      case BlockType.BENCHMARK:
        this.addBenchmarkContent(slide, block as any);
        break;
      case BlockType.FORECAST:
        this.addForecastContent(slide, block as any);
        break;
    }

    // Add evidence hash footer
    if (options.includeEvidenceHashes) {
      slide.addText(`Evidence: ${evidenceHash.substring(0, 16)}...`, {
        x: 0.5,
        y: 6.8,
        w: 9,
        h: 0.3,
        fontSize: 9,
        color: '999999',
        fontFace: 'Courier New'
      });
    }

    // Add speaker notes
    if (options.includeSpeakerNotes) {
      const notes = this.generateSpeakerNotes(block);
      slide.addNotes(notes);
    }

    return evidenceHash;
  }

  /**
   * Add metric content to slide
   */
  private addMetricContent(slide: any, block: any) {
    const config = block.config;

    slide.addText('Value Placeholder', {
      x: 2,
      y: 2.5,
      w: 6,
      h: 1.5,
      fontSize: 60,
      bold: true,
      color: '0066CC',
      align: 'center'
    });

    slide.addText(
      `${config.metric.toUpperCase()} (${config.aggregation})`,
      {
        x: 2,
        y: 4.0,
        w: 6,
        h: 0.5,
        fontSize: 16,
        color: '666666',
        align: 'center'
      }
    );

    slide.addText(
      `${new Date(config.dateRange.start).toLocaleDateString()} - ${new Date(config.dateRange.end).toLocaleDateString()}`,
      {
        x: 2,
        y: 4.5,
        w: 6,
        h: 0.4,
        fontSize: 12,
        color: '999999',
        align: 'center'
      }
    );
  }

  /**
   * Add chart content to slide
   */
  private addChartContent(slide: any, block: any) {
    const config = block.config;

    slide.addText(`[${config.chartType.toUpperCase()} CHART]`, {
      x: 1,
      y: 2.0,
      w: 8,
      h: 3.0,
      fontSize: 24,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'F5F5F5' }
    });

    slide.addText(
      `Data: ${config.dataSource.table} | X: ${config.dataSource.xAxis} | Y: ${config.dataSource.yAxis}`,
      {
        x: 1,
        y: 5.5,
        w: 8,
        h: 0.4,
        fontSize: 11,
        color: '666666',
        align: 'center'
      }
    );
  }

  /**
   * Add table content to slide
   */
  private addTableContent(slide: any, block: any) {
    const config = block.config;

    slide.addText('[TABLE DATA]', {
      x: 1,
      y: 2.0,
      w: 8,
      h: 3.0,
      fontSize: 24,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'F5F5F5' }
    });

    slide.addText(
      `Table: ${config.dataSource.table} | Columns: ${config.dataSource.columns.join(', ')}`,
      {
        x: 1,
        y: 5.5,
        w: 8,
        h: 0.4,
        fontSize: 11,
        color: '666666',
        align: 'center'
      }
    );
  }

  /**
   * Add text content to slide
   */
  private addTextContent(slide: any, block: any) {
    const config = block.config;

    slide.addText(config.content, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 4.5,
      fontSize: 16,
      color: '363636',
      valign: 'top'
    });
  }

  /**
   * Add NLQ content to slide
   */
  private addNLQContent(slide: any, block: any) {
    const config = block.config;

    slide.addText(`Query: "${config.query}"`, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 1.0,
      fontSize: 14,
      color: '0066CC',
      italic: true
    });

    slide.addText('[QUERY RESULTS]', {
      x: 1,
      y: 3.0,
      w: 8,
      h: 2.5,
      fontSize: 20,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'F5F5F5' }
    });
  }

  /**
   * Add benchmark content to slide
   */
  private addBenchmarkContent(slide: any, block: any) {
    const config = block.config;

    slide.addText(`Benchmark: ${config.metric} by ${config.cohortType}`, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 0.6,
      fontSize: 16,
      color: '363636'
    });

    slide.addText('[BENCHMARK VISUALIZATION]', {
      x: 1,
      y: 2.5,
      w: 8,
      h: 3.0,
      fontSize: 20,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'F5F5F5' }
    });
  }

  /**
   * Add forecast content to slide
   */
  private addForecastContent(slide: any, block: any) {
    const config = block.config;

    slide.addText(`Forecast: ${config.metric} (${config.forecastPeriod})`, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 0.6,
      fontSize: 16,
      color: '363636'
    });

    slide.addText('[FORECAST VISUALIZATION]', {
      x: 1,
      y: 2.5,
      w: 8,
      h: 3.0,
      fontSize: 20,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'F5F5F5' }
    });

    slide.addText(`Method: ${config.method} | Confidence: ${config.confidence}`, {
      x: 1,
      y: 5.7,
      w: 8,
      h: 0.4,
      fontSize: 11,
      color: '666666',
      align: 'center'
    });
  }

  /**
   * Add metadata slide
   */
  private addMetadataSlide(
    canvas: Canvas,
    version: VersionNode,
    evidenceHashes: string[]
  ) {
    const slide = this.pptx.addSlide();

    slide.addText('Export Metadata', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: '363636'
    });

    const metadata = [
      `Canvas: ${canvas.name}`,
      `Version: ${version.versionNumber}`,
      `Created: ${new Date(version.metadata.createdAt).toLocaleString()}`,
      `Exported: ${new Date().toLocaleString()}`,
      `Blocks: ${canvas.blocks.length}`,
      `Evidence Hashes: ${evidenceHashes.length}`,
      `Snapshot Hash: ${version.snapshotHash.substring(0, 32)}...`
    ];

    slide.addText(metadata.join('\n'), {
      x: 1,
      y: 1.5,
      w: 8,
      h: 4.0,
      fontSize: 14,
      color: '666666',
      fontFace: 'Courier New'
    });
  }

  /**
   * Compute evidence hash for a block
   */
  private computeEvidenceHash(block: Block): string {
    const data = JSON.stringify(block, Object.keys(block).sort());
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate speaker notes for a block
   */
  private generateSpeakerNotes(block: Block): string {
    const notes: string[] = [];

    notes.push(`Block ID: ${block.id}`);
    notes.push(`Type: ${block.type}`);
    notes.push(`Created: ${new Date(block.createdAt).toLocaleString()}`);
    notes.push(`Updated: ${new Date(block.updatedAt).toLocaleString()}`);

    if (block.dependencies.length > 0) {
      notes.push(`Dependencies: ${block.dependencies.length} block(s)`);
    }

    notes.push(`\nConfiguration:`);
    notes.push(JSON.stringify(block.config, null, 2));

    return notes.join('\n');
  }

  /**
   * Get color for block type
   */
  private getBlockTypeColor(type: BlockType): string {
    const colors: Record<BlockType, string> = {
      [BlockType.METRIC]: '0066CC',
      [BlockType.CHART]: '00AA55',
      [BlockType.TABLE]: '9933CC',
      [BlockType.TEXT]: '666666',
      [BlockType.FILTER]: 'FF6600',
      [BlockType.NLQ]: 'CC0066',
      [BlockType.BENCHMARK]: '00AACC',
      [BlockType.FORECAST]: 'FFAA00'
    };

    return colors[type] || '999999';
  }
}
