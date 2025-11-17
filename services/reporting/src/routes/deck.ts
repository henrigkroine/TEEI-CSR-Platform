/**
 * Deck Management & Export Routes
 *
 * API endpoints for Boardroom Mode v2:
 * - GET /deck/templates - List available templates
 * - POST /deck/create - Create new deck from template
 * - GET /deck/:deckId - Get deck definition
 * - PUT /deck/:deckId - Update deck
 * - DELETE /deck/:deckId - Delete deck
 * - POST /deck/:deckId/export - Export to PPTX/PDF
 * - GET /deck/export/:exportId/status - Check export status
 *
 * @module routes/deck
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  type DeckDefinition,
  type DeckExportRequest,
  type DeckExportResponse,
  type DeckTemplate,
  DeckTemplateSchema,
} from '@teei/shared-types';
import {
  getTemplateGenerator,
  getTemplateMetadata,
  type TemplateData,
} from '../export/pptx/deckTemplates.js';
import { generatePPTX, type PPTXSlide, type PPTXOptions } from '../utils/pptxGenerator.js';

/**
 * In-memory deck storage
 * In production, use PostgreSQL or similar
 */
const deckStore = new Map<string, DeckDefinition>();

/**
 * In-memory export job storage
 * In production, use Redis or similar
 */
const exportJobs = new Map<string, DeckExportResponse>();

/**
 * Register deck routes
 */
export default async function deckRoutes(fastify: FastifyInstance) {
  /**
   * GET /deck/templates
   * List available deck templates
   */
  fastify.get('/deck/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const templates = ['quarterly', 'annual', 'investor', 'impact'].map((template) =>
        getTemplateMetadata(template as DeckTemplate)
      );

      reply.send({ templates });
    } catch (error) {
      console.error('[Deck] Error listing templates:', error);
      reply.code(500).send({
        error: 'Failed to list templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /deck/create
   * Create a new deck from template
   */
  fastify.post('/deck/create', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      companyId: string;
      template: DeckTemplate;
      period: { start: string; end: string };
      locale?: string;
      customSlides?: string[];
    };

    try {
      // Validate template
      const templateResult = DeckTemplateSchema.safeParse(body.template);
      if (!templateResult.success) {
        reply.code(400).send({
          error: 'Invalid template',
          details: templateResult.error.message,
        });
        return;
      }

      // Fetch company data (mock for now)
      const templateData: TemplateData = {
        companyId: body.companyId,
        companyName: `Company ${body.companyId.slice(0, 8)}`,
        period: body.period,
        locale: body.locale || 'en',
        metrics: {
          sroi: 3.45,
          vis: 72.3,
          beneficiaries: 1250,
          volunteer_hours: 4800,
          social_value: 165000,
          engagement_rate: 0.82,
          outcome_improvement: 78,
        },
        key_achievements: [
          'Increased volunteer participation by 34%',
          'Expanded program reach to 3 new communities',
          'Improved outcome scores across all dimensions',
          'Achieved 98% beneficiary satisfaction rating',
        ],
        evidenceIds: [
          'EV-001',
          'EV-002',
          'EV-003',
          'EV-004',
          'EV-005',
          'EV-006',
          'EV-007',
          'EV-008',
        ].map(() => uuidv4()),
        charts: [
          {
            type: 'bar',
            title: 'Outcome Improvements',
            labels: ['Belonging', 'Confidence', 'Skills', 'Connection'],
            datasets: [
              {
                label: 'Improvement %',
                data: [82, 78, 85, 76],
                backgroundColor: '#3b82f6',
              },
            ],
          },
          {
            type: 'line',
            title: 'Volunteer Hours Trend',
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
              {
                label: 'Hours',
                data: [720, 850, 920, 1100, 980, 1230],
                borderColor: '#10b981',
                backgroundColor: '#10b98120',
              },
            ],
          },
          {
            type: 'doughnut',
            title: 'Program Distribution',
            labels: ['Buddy', 'Kintell', 'Mentorship', 'Upskilling'],
            datasets: [
              {
                label: 'Hours',
                data: [1800, 1200, 900, 900],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
              },
            ],
          },
        ],
      };

      // Generate deck from template
      const generator = getTemplateGenerator(body.template);
      const deck = generator(templateData);

      // Store deck
      deckStore.set(deck.id, deck);

      console.log(`[Deck] Created deck: ${deck.id} (template: ${body.template})`);

      reply.code(201).send(deck);
    } catch (error) {
      console.error('[Deck] Error creating deck:', error);
      reply.code(500).send({
        error: 'Failed to create deck',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /deck/:deckId
   * Get deck definition
   */
  fastify.get(
    '/deck/:deckId',
    async (request: FastifyRequest<{ Params: { deckId: string } }>, reply: FastifyReply) => {
      const { deckId } = request.params;

      const deck = deckStore.get(deckId);

      if (!deck) {
        reply.code(404).send({ error: 'Deck not found' });
        return;
      }

      reply.send(deck);
    }
  );

  /**
   * PUT /deck/:deckId
   * Update deck definition
   */
  fastify.put(
    '/deck/:deckId',
    async (request: FastifyRequest<{ Params: { deckId: string } }>, reply: FastifyReply) => {
      const { deckId } = request.params;
      const updates = request.body as Partial<DeckDefinition>;

      const deck = deckStore.get(deckId);

      if (!deck) {
        reply.code(404).send({ error: 'Deck not found' });
        return;
      }

      // Merge updates
      const updatedDeck: DeckDefinition = {
        ...deck,
        ...updates,
        id: deck.id, // Preserve ID
        metadata: {
          ...deck.metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      deckStore.set(deckId, updatedDeck);

      console.log(`[Deck] Updated deck: ${deckId}`);

      reply.send(updatedDeck);
    }
  );

  /**
   * DELETE /deck/:deckId
   * Delete deck
   */
  fastify.delete(
    '/deck/:deckId',
    async (request: FastifyRequest<{ Params: { deckId: string } }>, reply: FastifyReply) => {
      const { deckId } = request.params;

      const deleted = deckStore.delete(deckId);

      if (!deleted) {
        reply.code(404).send({ error: 'Deck not found' });
        return;
      }

      console.log(`[Deck] Deleted deck: ${deckId}`);

      reply.code(204).send();
    }
  );

  /**
   * POST /deck/:deckId/export
   * Export deck to PPTX/PDF
   */
  fastify.post(
    '/deck/:deckId/export',
    async (request: FastifyRequest<{ Params: { deckId: string } }>, reply: FastifyReply) => {
      const { deckId } = request.params;
      const exportRequest = request.body as DeckExportRequest;

      const deck = deckStore.get(deckId);

      if (!deck) {
        reply.code(404).send({ error: 'Deck not found' });
        return;
      }

      try {
        // Create export job
        const exportId = uuidv4();

        const exportJob: DeckExportResponse = {
          exportId,
          status: 'queued',
          progress: 0,
          message: 'Export queued',
        };

        exportJobs.set(exportId, exportJob);

        // Start async export
        exportDeckAsync(exportId, deck, exportRequest).catch((error) => {
          console.error(`[Deck Export] Failed for ${exportId}:`, error);
          const job = exportJobs.get(exportId);
          if (job) {
            job.status = 'failed';
            job.error = error.message;
            exportJobs.set(exportId, job);
          }
        });

        console.log(`[Deck Export] Started export job: ${exportId} for deck ${deckId}`);

        reply.code(202).send({
          exportId,
          statusUrl: `/deck/export/${exportId}/status`,
        });
      } catch (error) {
        console.error('[Deck Export] Error starting export:', error);
        reply.code(500).send({
          error: 'Failed to start export',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /deck/export/:exportId/status
   * Get export job status
   */
  fastify.get(
    '/deck/export/:exportId/status',
    async (
      request: FastifyRequest<{ Params: { exportId: string } }>,
      reply: FastifyReply
    ) => {
      const { exportId } = request.params;

      const job = exportJobs.get(exportId);

      if (!job) {
        reply.code(404).send({ error: 'Export job not found' });
        return;
      }

      reply.send(job);
    }
  );
}

/**
 * Export deck asynchronously
 */
async function exportDeckAsync(
  exportId: string,
  deck: DeckDefinition,
  request: DeckExportRequest
): Promise<void> {
  const updateProgress = (progress: number, message: string) => {
    const job = exportJobs.get(exportId);
    if (job) {
      job.status = 'generating';
      job.progress = progress;
      job.message = message;
      exportJobs.set(exportId, job);
    }
  };

  try {
    updateProgress(10, 'Preparing deck data...');
    await sleep(500);

    updateProgress(30, 'Converting slides to PPTX format...');

    // Convert deck slides to PPTX slides
    const pptxSlides: PPTXSlide[] = deck.slides.map((slide) => convertSlideDefinitionToPPTX(slide));

    updateProgress(50, 'Rendering PPTX...');

    // Generate PPTX options
    const pptxOptions: PPTXOptions = {
      title: deck.title,
      author: deck.metadata?.author || 'TEEI CSR Platform',
      company: deck.title.split('-')[0].trim(),
      companyId: deck.companyId,
      subject: deck.subtitle || 'Executive Report',
      layout: 'LAYOUT_16x9',
      theme: 'corporate',
      includeWatermark: request.options?.includeWatermark || false,
      watermarkText: request.options?.watermarkText,
      approvalStatus: deck.metadata?.approvalStatus === 'approved' ? 'APPROVED' : 'DRAFT',
    };

    updateProgress(70, 'Generating PPTX file...');

    // Generate PPTX
    const pptxBuffer = await generatePPTX(pptxSlides, pptxOptions);

    updateProgress(90, 'Uploading to storage...');
    await sleep(500);

    // In production: Upload to S3 and get signed URL
    const pptxUrl = `https://cdn.teei.io/exports/${exportId}.pptx`;

    updateProgress(100, 'Export complete');

    // Mark as complete
    const job = exportJobs.get(exportId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.message = 'Export ready for download';
      job.pptxUrl = pptxUrl;
      job.downloadUrl = pptxUrl;
      job.completedAt = new Date().toISOString();
      exportJobs.set(exportId, job);
    }

    console.log(`[Deck Export] Completed: ${exportId} (${pptxBuffer.length} bytes)`);
  } catch (error) {
    throw new Error(`Export generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert SlideDefinition to PPTXSlide
 */
function convertSlideDefinitionToPPTX(slide: any): PPTXSlide {
  const firstBlock = slide.blocks[0];

  if (!firstBlock) {
    return {
      type: 'content',
      title: 'Empty Slide',
      content: '',
      notes: slide.notes,
      evidenceIds: slide.evidenceIds,
    };
  }

  // Map block type to PPTX slide type
  const typeMap: Record<string, PPTXSlide['type']> = {
    title: 'title',
    chart: 'chart',
    'data-table': 'data-table',
    table: 'data-table',
    'two-column': 'two-column',
    image: 'image',
  };

  const pptxType = typeMap[firstBlock.type] || 'content';

  const pptxSlide: PPTXSlide = {
    type: pptxType,
    title: firstBlock.title || slide.template,
    content: firstBlock.content,
    bullets: firstBlock.bullets,
    notes: slide.notes,
    evidenceIds: slide.evidenceIds,
  };

  // Add chart data if present
  if (firstBlock.chartConfig) {
    pptxSlide.chart = {
      type: firstBlock.chartConfig.type,
      title: firstBlock.title || 'Chart',
      labels: firstBlock.chartConfig.labels,
      datasets: firstBlock.chartConfig.datasets,
    };
  }

  // Add table data if present
  if (firstBlock.tableConfig) {
    pptxSlide.table = {
      headers: firstBlock.tableConfig.headers,
      rows: firstBlock.tableConfig.rows,
      columnWidths: firstBlock.tableConfig.columnWidths,
    };
  }

  // Add metrics as table if present
  if (firstBlock.metricsConfig) {
    const metrics = firstBlock.metricsConfig.metrics;
    pptxSlide.table = {
      headers: ['Metric', 'Value'],
      rows: metrics.map((m: any) => [m.label, String(m.value)]),
    };
  }

  return pptxSlide;
}

/**
 * Helper: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
