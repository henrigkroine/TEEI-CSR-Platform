/**
 * Regulatory Packs API Routes
 *
 * Endpoints:
 * - POST /v1/regulatory/packs - Generate new pack
 * - GET  /v1/regulatory/packs - List packs for company
 * - GET  /v1/regulatory/packs/:id - Get pack details (JSON)
 * - GET  /v1/regulatory/packs/:id/pdf - Export pack as PDF
 * - DELETE /v1/regulatory/packs/:id - Delete pack
 *
 * @module routes/regulatory
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  GeneratePackRequestSchema,
  type GeneratePackRequest,
  type GeneratePackResponse,
  type RegulatoryPack,
  type PackListItem,
} from '@teei/shared-types';
import { generatePack, getPack, listPacks, deletePack } from '../srs/generator.js';
import { validatePackRequestAsync } from '../srs/validator.js';
import { renderPackToPDF } from '../srs/pdf-renderer.js';

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /v1/regulatory/packs
 * Generate a new regulatory pack
 */
async function generatePackHandler(
  request: FastifyRequest<{ Body: GeneratePackRequest }>,
  reply: FastifyReply
) {
  try {
    // Parse and validate request
    const payload = GeneratePackRequestSchema.parse(request.body);

    // Run async validation
    const validation = await validatePackRequestAsync(payload);

    if (!validation.valid) {
      return reply.status(400).send({
        error: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // Generate pack
    const result = await generatePack(payload);

    const response: GeneratePackResponse = {
      packId: result.packId,
      status: result.status,
      message: 'Pack generation started',
      estimatedCompletionTime: 30, // 30 seconds estimate
    };

    // Return warnings if any
    if (validation.warnings.length > 0) {
      return reply.status(202).send({
        ...response,
        warnings: validation.warnings,
      });
    }

    return reply.status(202).send(response);
  } catch (error: any) {
    request.log.error(error, 'Error generating regulatory pack');

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Invalid request payload',
        details: error.errors,
      });
    }

    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/regulatory/packs
 * List all packs for a company
 */
async function listPacksHandler(
  request: FastifyRequest<{ Querystring: { companyId: string } }>,
  reply: FastifyReply
) {
  try {
    const { companyId } = request.query;

    if (!companyId) {
      return reply.status(400).send({
        error: 'Missing required query parameter: companyId',
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      return reply.status(400).send({
        error: 'Invalid companyId format (must be UUID)',
      });
    }

    const packs = listPacks(companyId);

    // Map to list items (exclude heavy sections data)
    const packListItems: PackListItem[] = packs.map(pack => ({
      id: pack.id,
      companyId: pack.companyId,
      frameworks: pack.frameworks,
      period: pack.period,
      status: pack.status,
      completeness: pack.summary.overallCompleteness,
      generatedAt: pack.metadata.generatedAt,
    }));

    return reply.send({
      packs: packListItems,
      total: packListItems.length,
    });
  } catch (error: any) {
    request.log.error(error, 'Error listing regulatory packs');
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/regulatory/packs/:id
 * Get pack details (JSON)
 */
async function getPackHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const pack = getPack(id);

    if (!pack) {
      return reply.status(404).send({
        error: 'Pack not found',
        packId: id,
      });
    }

    return reply.send(pack);
  } catch (error: any) {
    request.log.error(error, 'Error fetching regulatory pack');
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * GET /v1/regulatory/packs/:id/pdf
 * Export pack as PDF
 */
async function getPackPDFHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const pack = getPack(id);

    if (!pack) {
      return reply.status(404).send({
        error: 'Pack not found',
        packId: id,
      });
    }

    if (pack.status !== 'ready') {
      return reply.status(400).send({
        error: 'Pack is not ready for export',
        status: pack.status,
        packId: id,
      });
    }

    // Render pack to PDF
    const pdfBuffer = await renderPackToPDF(pack);

    // Set headers for PDF download
    const filename = `regulatory-pack-${pack.companyId}-${pack.period.start}_${pack.period.end}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', pdfBuffer.length);

    return reply.send(pdfBuffer);
  } catch (error: any) {
    request.log.error(error, 'Error exporting regulatory pack to PDF');
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * DELETE /v1/regulatory/packs/:id
 * Delete a pack
 */
async function deletePackHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const deleted = deletePack(id);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Pack not found',
        packId: id,
      });
    }

    return reply.status(204).send();
  } catch (error: any) {
    request.log.error(error, 'Error deleting regulatory pack');
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export async function regulatoryRoutes(fastify: FastifyInstance) {
  // Generate pack
  fastify.post('/regulatory/packs', {
    schema: {
      description: 'Generate a new regulatory pack (CSRD/GRI/SDG)',
      tags: ['regulatory'],
      body: {
        type: 'object',
        required: ['companyId', 'period', 'frameworks'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
          period: {
            type: 'object',
            required: ['start', 'end'],
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' },
            },
          },
          frameworks: {
            type: 'array',
            items: { type: 'string', enum: ['CSRD', 'GRI', 'SDG'] },
            minItems: 1,
          },
        },
      },
      response: {
        202: {
          description: 'Pack generation started',
          type: 'object',
          properties: {
            packId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['generating'] },
            message: { type: 'string' },
            estimatedCompletionTime: { type: 'number' },
          },
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            errors: { type: 'array' },
            warnings: { type: 'array' },
          },
        },
      },
    },
    handler: generatePackHandler,
  });

  // List packs
  fastify.get('/regulatory/packs', {
    schema: {
      description: 'List all regulatory packs for a company',
      tags: ['regulatory'],
      querystring: {
        type: 'object',
        required: ['companyId'],
        properties: {
          companyId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'List of packs',
          type: 'object',
          properties: {
            packs: { type: 'array' },
            total: { type: 'number' },
          },
        },
      },
    },
    handler: listPacksHandler,
  });

  // Get pack details
  fastify.get('/regulatory/packs/:id', {
    schema: {
      description: 'Get regulatory pack details (JSON)',
      tags: ['regulatory'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'Pack details',
          type: 'object',
        },
        404: {
          description: 'Pack not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            packId: { type: 'string' },
          },
        },
      },
    },
    handler: getPackHandler,
  });

  // Export pack as PDF
  fastify.get('/regulatory/packs/:id/pdf', {
    schema: {
      description: 'Export regulatory pack as PDF',
      tags: ['regulatory'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          description: 'PDF file',
          type: 'string',
          format: 'binary',
        },
        400: {
          description: 'Pack not ready for export',
          type: 'object',
        },
        404: {
          description: 'Pack not found',
          type: 'object',
        },
      },
    },
    handler: getPackPDFHandler,
  });

  // Delete pack
  fastify.delete('/regulatory/packs/:id', {
    schema: {
      description: 'Delete a regulatory pack',
      tags: ['regulatory'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: {
          description: 'Pack deleted successfully',
          type: 'null',
        },
        404: {
          description: 'Pack not found',
          type: 'object',
        },
      },
    },
    handler: deletePackHandler,
  });
}
