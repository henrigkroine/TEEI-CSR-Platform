import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { publicationService } from '../../../../reporting/src/publications/publicationService.js';
import type {
  CreatePublicationRequest,
  UpdatePublicationRequest,
  AddBlockRequest,
  UpdateBlockRequest,
  PublishPublicationRequest,
  RotateTokenRequest,
} from '@teei/shared-types';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

/**
 * Require authentication middleware
 */
async function requireAuth(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
}

/**
 * Register publication routes
 */
export async function registerPublicationRoutes(fastify: FastifyInstance): Promise<void> {
  // List publications for authenticated tenant
  fastify.get(
    '/v1/publications',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const publications = await publicationService.listPublications(tenantId);

        return reply.send({
          success: true,
          data: publications,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to list publications');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to list publications',
        });
      }
    }
  );

  // Create publication
  fastify.post<{ Body: CreatePublicationRequest }>(
    '/v1/publications',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const publication = await publicationService.createPublication(tenantId, request.body);

        return reply.status(201).send({
          success: true,
          data: publication,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to create publication');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to create publication',
        });
      }
    }
  );

  // Get publication by ID
  fastify.get<{ Params: { id: string } }>(
    '/v1/publications/:id',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const publication = await publicationService.getPublicationById(
          request.params.id,
          tenantId
        );

        if (!publication) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: 'Publication not found',
          });
        }

        return reply.send({
          success: true,
          data: publication,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get publication');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get publication',
        });
      }
    }
  );

  // Update publication
  fastify.patch<{ Params: { id: string }; Body: UpdatePublicationRequest }>(
    '/v1/publications/:id',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const publication = await publicationService.updatePublication(
          request.params.id,
          tenantId,
          request.body
        );

        return reply.send({
          success: true,
          data: publication,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to update publication');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to update publication',
        });
      }
    }
  );

  // Delete publication
  fastify.delete<{ Params: { id: string } }>(
    '/v1/publications/:id',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        await publicationService.deletePublication(request.params.id, tenantId);

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to delete publication');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to delete publication',
        });
      }
    }
  );

  // Publish publication
  fastify.post<{ Params: { id: string }; Body: PublishPublicationRequest }>(
    '/v1/publications/:id/publish',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const publication = await publicationService.publishPublication(
          request.params.id,
          tenantId,
          request.body
        );

        return reply.send({
          success: true,
          data: publication,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to publish publication');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to publish publication',
        });
      }
    }
  );

  // Rotate access token
  fastify.post<{ Params: { id: string }; Body: RotateTokenRequest }>(
    '/v1/publications/:id/token',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const result = await publicationService.rotateToken(
          request.params.id,
          tenantId,
          request.body
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to rotate token');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to rotate token',
        });
      }
    }
  );

  // Add block to publication
  fastify.post<{ Params: { id: string }; Body: AddBlockRequest }>(
    '/v1/publications/:id/blocks',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const block = await publicationService.addBlock(
          request.params.id,
          tenantId,
          request.body
        );

        return reply.status(201).send({
          success: true,
          data: block,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to add block');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to add block',
        });
      }
    }
  );

  // Update block
  fastify.patch<{ Params: { id: string; blockId: string }; Body: UpdateBlockRequest }>(
    '/v1/publications/:id/blocks/:blockId',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const block = await publicationService.updateBlock(
          request.params.blockId,
          request.params.id,
          tenantId,
          request.body
        );

        return reply.send({
          success: true,
          data: block,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to update block');
        return reply.status(400).send({
          success: false,
          error: 'BadRequest',
          message: error instanceof Error ? error.message : 'Failed to update block',
        });
      }
    }
  );

  // Delete block
  fastify.delete<{ Params: { id: string; blockId: string } }>(
    '/v1/publications/:id/blocks/:blockId',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        await publicationService.deleteBlock(
          request.params.blockId,
          request.params.id,
          tenantId
        );

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to delete block');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to delete block',
        });
      }
    }
  );

  // Get publication statistics
  fastify.get<{ Params: { id: string } }>(
    '/v1/publications/:id/stats',
    { preHandler: requireAuth },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const tenantId = request.user!.tenantId;
        const stats = await publicationService.getStats(request.params.id, tenantId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get publication stats');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: error instanceof Error ? error.message : 'Failed to get publication stats',
        });
      }
    }
  );

  // Public endpoint: Get publication by slug
  fastify.get<{ Params: { slug: string }; Querystring: { token?: string } }>(
    '/public/publications/:slug',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { slug } = request.params as { slug: string };
        const { token } = request.query as { token?: string };

        const publication = await publicationService.getPublicationBySlug(slug, token);

        if (!publication) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: 'Publication not found',
          });
        }

        // Track view
        const ip = request.ip;
        const userAgent = request.headers['user-agent'] || 'unknown';
        const referrer = request.headers.referer || request.headers.referrer;

        await publicationService.trackView(publication.id, {
          ip,
          userAgent,
          referrer: referrer as string | undefined,
        });

        // Set caching headers
        const etag = publication.etag;
        if (etag) {
          reply.header('ETag', `"${etag}"`);
          reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

          // Check If-None-Match header
          const ifNoneMatch = request.headers['if-none-match'];
          if (ifNoneMatch === `"${etag}"`) {
            return reply.status(304).send();
          }
        }

        return reply.send({
          success: true,
          data: publication,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get public publication');

        // Don't expose internal errors for public endpoint
        if (error instanceof Error && error.message.includes('token')) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: error.message,
          });
        }

        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: 'Failed to get publication',
        });
      }
    }
  );

  fastify.log.info('Publication routes registered successfully');
}
