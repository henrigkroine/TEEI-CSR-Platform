import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import { createExportRequest, getExportStatus } from './export.js';
import { createDeleteRequest, getDeleteStatus, getUserPrivacyRequests, getAuditTrail } from './delete.js';

const logger = createServiceLogger('privacy-routes');

// Validation schemas
const exportRequestSchema = z.object({
  userId: z.string().uuid(),
});

const deleteRequestSchema = z.object({
  userId: z.string().uuid(),
  adminApproved: z.boolean().optional(),
});

export const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /privacy/export - Create data export request
  fastify.post('/privacy/export', async (request, reply) => {
    try {
      const body = exportRequestSchema.parse(request.body);

      // In production: Get authenticated user ID from JWT
      // const authenticatedUserId = request.user.id;

      const result = await createExportRequest(body.userId);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(201).send(result);
    } catch (error: any) {
      logger.error('Error creating export request:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // POST /privacy/delete - Create data deletion request
  fastify.post('/privacy/delete', async (request, reply) => {
    try {
      const body = deleteRequestSchema.parse(request.body);

      // In production: Get authenticated user ID from JWT and verify admin
      // const requestedBy = request.user.id;
      // const isAdmin = request.user.role === 'admin';

      const requestedBy = body.userId; // Placeholder
      const adminApproved = body.adminApproved || false;

      const result = await createDeleteRequest(body.userId, requestedBy, adminApproved);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.status(201).send(result);
    } catch (error: any) {
      logger.error('Error creating delete request:', error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /privacy/export/:requestId - Get export request status
  fastify.get('/privacy/export/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };

      const result = await getExportStatus(requestId);

      if (!result.success) {
        return reply.status(404).send(result);
      }

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error getting export status:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /privacy/delete/:requestId - Get delete request status
  fastify.get('/privacy/delete/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };

      const result = await getDeleteStatus(requestId);

      if (!result.success) {
        return reply.status(404).send(result);
      }

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error getting delete status:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /privacy/requests/:userId - Get all privacy requests for a user
  fastify.get('/privacy/requests/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      const result = await getUserPrivacyRequests(userId);

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error getting user privacy requests:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /privacy/audit/:requestId - Get audit trail for a request
  fastify.get('/privacy/audit/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };

      const result = await getAuditTrail(requestId);

      return reply.send(result);
    } catch (error: any) {
      logger.error('Error getting audit trail:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });
};
