/**
 * Canvas Routes - Builder runtime API
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Canvas, CanvasSchema, BlockSchema, validateDependencies, topologicalSort } from '../canvas/blocks.js';
import {
  createVersionSnapshot,
  diffVersions,
  restoreFromVersion,
  VersionNode
} from '../versioning/version-graph.js';
import { PPTXExporter } from '../export/pptx-exporter.js';
import { Pool } from 'pg';

const CreateCanvasSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  blocks: z.array(BlockSchema).default([])
});

const UpdateCanvasSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  blocks: z.array(BlockSchema).optional(),
  commitMessage: z.string().max(1000).optional()
});

export function registerCanvasRoutes(fastify: FastifyInstance, db: Pool) {
  /**
   * POST /canvas - Create new canvas
   */
  fastify.post('/canvas', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CreateCanvasSchema.parse(request.body);
      const tenant = (request as any).tenant;

      // Validate dependencies
      const depValidation = validateDependencies(body.blocks);
      if (!depValidation.valid) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid Dependencies',
          errors: depValidation.errors
        });
      }

      const canvas: Canvas = {
        id: crypto.randomUUID(),
        companyId: tenant.companyId,
        name: body.name,
        description: body.description,
        blocks: body.blocks,
        gridConfig: {
          columns: 12,
          rowHeight: 50,
          gap: 16
        },
        version: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: tenant.userId,
        tags: []
      };

      // Create initial version
      const version = createVersionSnapshot(canvas, null, 1, tenant.userId, 'Initial version');

      // TODO: Save to database
      request.log.info({ canvasId: canvas.id, version: 1 }, 'Canvas created');

      return reply.send({
        success: true,
        data: {
          canvas,
          version
        }
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to create canvas');
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /canvas/:id - Get canvas by ID
   */
  fastify.get<{ Params: { id: string } }>(
    '/canvas/:id',
    async (request, reply) => {
      const { id } = request.params;
      // TODO: Fetch from database
      return reply.send({
        success: true,
        data: { id, message: 'Canvas retrieval not yet implemented' }
      });
    }
  );

  /**
   * PUT /canvas/:id - Update canvas (creates new version)
   */
  fastify.put<{ Params: { id: string } }>(
    '/canvas/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as any);
        const body = UpdateCanvasSchema.parse(request.body);
        const tenant = (request as any).tenant;

        // TODO: Fetch existing canvas from database
        // For now, return placeholder
        return reply.send({
          success: true,
          message: 'Canvas update creates new version',
          versionNumber: 2
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /canvas/:id/versions - Get version history
   */
  fastify.get<{ Params: { id: string } }>(
    '/canvas/:id/versions',
    async (request, reply) => {
      const { id } = request.params;
      return reply.send({
        success: true,
        data: { versions: [] }
      });
    }
  );

  /**
   * GET /canvas/:id/versions/:versionId/diff - Compare versions
   */
  fastify.get<{ Params: { id: string; versionId: string }; Querystring: { compareWith: string } }>(
    '/canvas/:id/versions/:versionId/diff',
    async (request, reply) => {
      const { id, versionId } = request.params;
      const { compareWith } = request.query;

      return reply.send({
        success: true,
        data: { diff: { changes: [] } }
      });
    }
  );

  /**
   * POST /canvas/:id/export/pptx - Export to PowerPoint
   */
  fastify.post<{ Params: { id: string } }>(
    '/canvas/:id/export/pptx',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as any);

        // TODO: Fetch canvas and version from database
        // Placeholder canvas
        const canvas: Canvas = {
          id,
          companyId: (request as any).tenant.companyId,
          name: 'Sample Canvas',
          description: 'Export test',
          blocks: [],
          gridConfig: { columns: 12, rowHeight: 50, gap: 16 },
          version: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: (request as any).tenant.userId,
          tags: []
        };

        const exporter = new PPTXExporter();
        const result = await exporter.export(canvas, null);

        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);

        return reply.send(result.buffer);
      } catch (error: any) {
        request.log.error({ error }, 'PPTX export failed');
        return reply.status(500).send({
          success: false,
          error: error.message
        });
      }
    }
  );

  /**
   * GET /health
   */
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      success: true,
      service: 'builder-runtime',
      version: '2.0.0',
      status: 'healthy'
    });
  });
}
