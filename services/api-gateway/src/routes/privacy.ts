/**
 * GDPR Privacy Routes
 *
 * Implements GDPR data subject rights endpoints:
 * - Article 15: Right to Access (Data Export)
 * - Article 16: Right to Rectification
 * - Article 17: Right to Erasure ("Right to be Forgotten")
 * - Article 20: Right to Data Portability
 *
 * All endpoints require authentication and log actions for compliance.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { createDsrOrchestrator, DsrRequestType } from '@teei/compliance';

/**
 * Request schemas
 */
const DeletionRequestSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
  confirmEmail: z.string().email().optional(),
});

const ExportRequestSchema = z.object({
  userId: z.string().uuid(),
  format: z.enum(['json', 'csv']).default('json'),
});

const CancelDeletionSchema = z.object({
  deletionId: z.string().uuid(),
});

/**
 * Register GDPR privacy routes
 */
export async function registerPrivacyRoutes(fastify: FastifyInstance, dbPool: Pool) {
  // Create DSR orchestrator instance
  const dsr = createDsrOrchestrator(dbPool as any);
  /**
   * GET /v1/privacy/export
   *
   * Export all user data (GDPR Article 15 - Right to Access)
   *
   * Returns a complete export of all user data in JSON format.
   */
  fastify.get('/v1/privacy/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const userId = user.userId;

      // Log the export request
      request.log.info({ userId }, 'GDPR data export requested');

      // Export all user data using DSR orchestrator
      const exportData = await dsr.exportUserData(userId, userId);

      // Add GDPR article reference
      (exportData.metadata as any).gdprArticle = 'Article 15 - Right to Access';

      return reply.status(200).send({
        success: true,
        message: 'Data export completed',
        data: exportData,
      });
    } catch (error) {
      request.log.error({ error }, 'Data export failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to export data',
      });
    }
  });

  /**
   * POST /v1/privacy/delete
   *
   * Request account deletion (GDPR Article 17 - Right to Erasure)
   *
   * Schedules user data for deletion with a grace period.
   * User can cancel within the grace period.
   */
  fastify.post('/v1/privacy/delete', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Parse request body
      const body = DeletionRequestSchema.parse(request.body);

      // Verify user is deleting their own account (or is admin)
      if (body.userId !== user.userId && user.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You can only delete your own account',
        });
      }

      request.log.warn({ userId: body.userId, reason: body.reason }, 'GDPR deletion requested');

      // Schedule deletion using DSR orchestrator
      const deletionId = await dsr.requestDeletion({
        requestType: DsrRequestType.ERASURE,
        userId: body.userId,
        requestedBy: user.userId,
        reason: body.reason || 'User requested account deletion',
      });

      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30); // 30-day grace period

      return reply.status(202).send({
        success: true,
        message: 'Deletion request accepted',
        data: {
          deletionId,
          userId: body.userId,
          status: 'PENDING',
          scheduledFor: scheduledFor.toISOString(),
          gracePeriodDays: 30,
          cancellationEndpoint: `/v1/privacy/delete/${deletionId}/cancel`,
          note: 'Your data will be permanently deleted after the grace period. You can cancel this request before that time.',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'ValidationError',
          message: 'Invalid request body',
          details: error.errors,
        });
      }

      request.log.error({ error }, 'Deletion request failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to process deletion request',
      });
    }
  });

  /**
   * POST /v1/privacy/delete/:deletionId/cancel
   *
   * Cancel a pending deletion request
   *
   * Allows users to cancel their deletion request within the grace period.
   */
  fastify.post(
    '/v1/privacy/delete/:deletionId/cancel',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get authenticated user
        const user = (request as any).user;
        if (!user || !user.userId) {
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        const { deletionId } = request.params as { deletionId: string };

        request.log.info({ deletionId, userId: user.userId }, 'Deletion cancellation requested');

        // Cancel deletion using DSR orchestrator
        await dsr.cancelDeletion(deletionId, user.userId);

        return reply.status(200).send({
          success: true,
          message: 'Deletion request cancelled',
          data: {
            deletionId,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        request.log.error({ error }, 'Deletion cancellation failed');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: 'Failed to cancel deletion request',
        });
      }
    }
  );

  /**
   * GET /v1/privacy/delete/:deletionId
   *
   * Check deletion request status
   */
  fastify.get(
    '/v1/privacy/delete/:deletionId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get authenticated user
        const user = (request as any).user;
        if (!user || !user.userId) {
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        const { deletionId } = request.params as { deletionId: string };

        request.log.info({ deletionId, userId: user.userId }, 'Deletion status requested');

        // Get deletion status from DSR orchestrator
        const status = await dsr.getDeletionStatus(deletionId);

        if (!status) {
          return reply.status(404).send({
            success: false,
            error: 'NotFound',
            message: 'Deletion request not found',
          });
        }

        return reply.status(200).send({
          success: true,
          data: {
            deletionId,
            status: status.status,
            scheduledFor: status.scheduledFor,
            requestedAt: status.createdAt,
            completedAt: status.completedAt,
          },
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get deletion status');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: 'Failed to get deletion status',
        });
      }
    }
  );

  /**
   * GET /v1/privacy/consent
   *
   * Get user's consent status
   */
  fastify.get('/v1/privacy/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Stub response
      return reply.status(200).send({
        success: true,
        data: {
          userId: user.userId,
          consentGiven: true,
          consentDate: '2024-01-01T00:00:00Z',
          processingPurpose: 'Providing CSR program services',
          dataCategories: ['profile', 'program_participation', 'activity_tracking'],
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to get consent status');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to get consent status',
      });
    }
  });

  /**
   * POST /v1/privacy/consent
   *
   * Update user's consent
   */
  fastify.post('/v1/privacy/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const body = request.body as { consentGiven: boolean };

      request.log.info(
        { userId: user.userId, consentGiven: body.consentGiven },
        'Consent update requested'
      );

      // TODO: Update consent in database
      // If consent is withdrawn, may need to trigger deletion

      return reply.status(200).send({
        success: true,
        message: 'Consent updated',
        data: {
          userId: user.userId,
          consentGiven: body.consentGiven,
          consentDate: new Date().toISOString(),
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to update consent');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to update consent',
      });
    }
  });

  fastify.log.info('Privacy routes registered');
}
