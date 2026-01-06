/**
 * Demo Factory API Routes
 * Lifecycle management for demo tenants
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateDemoTenantRequestSchema,
  RefreshDemoTenantRequestSchema,
  ExportDemoTenantRequestSchema,
  WarmTilesRequestSchema,
  type CreateDemoTenantRequest,
  type RefreshDemoTenantRequest,
  type ExportDemoTenantRequest,
  type WarmTilesRequest,
  type DemoTenant,
  type DeleteDemoTenantResult,
  type SeedResult,
  type WarmTilesResult,
} from '@teei/shared-types/demo';
import { DemoTenantService } from './service';
import { demoTenantGuard } from './guards';

/**
 * Register demo routes
 */
export async function demoRoutes(fastify: FastifyInstance) {
  const service = new DemoTenantService();

  // Create demo tenant
  fastify.post<{ Body: CreateDemoTenantRequest }>(
    '/demo/tenants',
    {
      schema: {
        description: 'Create a new demo tenant with seeded data',
        tags: ['demo'],
        body: CreateDemoTenantRequestSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              tenant: { type: 'object' },
              seedResult: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateDemoTenantRequest }>, reply: FastifyReply) => {
      try {
        // Validate request
        const validated = CreateDemoTenantRequestSchema.parse(request.body);

        // Create and seed tenant
        const result = await service.createDemoTenant(validated);

        return reply.code(201).send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to create demo tenant');
        return reply.code(500).send({
          error: 'Failed to create demo tenant',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Get demo tenant status
  fastify.get<{ Params: { tenantId: string } }>(
    '/demo/:tenantId',
    {
      schema: {
        description: 'Get demo tenant status and metadata',
        tags: ['demo'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
      },
      preHandler: demoTenantGuard,
    },
    async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
      try {
        const tenant = await service.getDemoTenant(request.params.tenantId);

        if (!tenant) {
          return reply.code(404).send({
            error: 'Demo tenant not found',
          });
        }

        return reply.send(tenant);
      } catch (error) {
        fastify.log.error(error, 'Failed to get demo tenant');
        return reply.code(500).send({
          error: 'Failed to get demo tenant',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Refresh demo tenant data
  fastify.post<{
    Params: { tenantId: string };
    Body: RefreshDemoTenantRequest;
  }>(
    '/demo/:tenantId/refresh',
    {
      schema: {
        description: 'Refresh demo tenant data',
        tags: ['demo'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        body: RefreshDemoTenantRequestSchema,
      },
      preHandler: demoTenantGuard,
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: RefreshDemoTenantRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const validated = RefreshDemoTenantRequestSchema.parse(request.body);
        const result = await service.refreshDemoTenant(
          request.params.tenantId,
          validated
        );

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to refresh demo tenant');
        return reply.code(500).send({
          error: 'Failed to refresh demo tenant',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Warm analytics tiles
  fastify.post<{ Params: { tenantId: string }; Body: WarmTilesRequest }>(
    '/demo/:tenantId/warm',
    {
      schema: {
        description: 'Warm analytics tiles for demo tenant',
        tags: ['demo'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        body: WarmTilesRequestSchema,
      },
      preHandler: demoTenantGuard,
    },
    async (
      request: FastifyRequest<{ Params: { tenantId: string }; Body: WarmTilesRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const validated = WarmTilesRequestSchema.parse(request.body);
        const result = await service.warmTiles(request.params.tenantId, validated);

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to warm tiles');
        return reply.code(500).send({
          error: 'Failed to warm tiles',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Export demo tenant data
  fastify.post<{
    Params: { tenantId: string };
    Body: ExportDemoTenantRequest;
  }>(
    '/demo/:tenantId/export',
    {
      schema: {
        description: 'Export demo tenant data bundle',
        tags: ['demo'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
        body: ExportDemoTenantRequestSchema,
      },
      preHandler: demoTenantGuard,
    },
    async (
      request: FastifyRequest<{
        Params: { tenantId: string };
        Body: ExportDemoTenantRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const validated = ExportDemoTenantRequestSchema.parse(request.body);
        const stream = await service.exportDemoTenant(
          request.params.tenantId,
          validated
        );

        // Set appropriate headers for download
        reply.header('Content-Type', this.getContentType(validated.format));
        reply.header(
          'Content-Disposition',
          `attachment; filename="demo-${request.params.tenantId}.${validated.format}"`
        );

        return reply.send(stream);
      } catch (error) {
        fastify.log.error(error, 'Failed to export demo tenant');
        return reply.code(500).send({
          error: 'Failed to export demo tenant',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Delete demo tenant
  fastify.delete<{ Params: { tenantId: string } }>(
    '/demo/:tenantId',
    {
      schema: {
        description: 'Delete demo tenant and all associated data',
        tags: ['demo'],
        params: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
          required: ['tenantId'],
        },
      },
      preHandler: demoTenantGuard,
    },
    async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
      try {
        const result = await service.deleteDemoTenant(request.params.tenantId);

        return reply.send(result);
      } catch (error) {
        fastify.log.error(error, 'Failed to delete demo tenant');
        return reply.code(500).send({
          error: 'Failed to delete demo tenant',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // List all demo tenants (admin only)
  fastify.get(
    '/demo/tenants',
    {
      schema: {
        description: 'List all demo tenants',
        tags: ['demo'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenants = await service.listDemoTenants();

        return reply.send({ tenants });
      } catch (error) {
        fastify.log.error(error, 'Failed to list demo tenants');
        return reply.code(500).send({
          error: 'Failed to list demo tenants',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
}

/**
 * Get content type for export format
 */
function getContentType(format: string): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'jsonl':
      return 'application/jsonlines';
    case 'sql':
      return 'application/sql';
    default:
      return 'application/octet-stream';
  }
}
