/**
 * L2I Bundle Routes
 * API endpoints for License-to-Impact bundle management
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateL2ISubscriptionSchema,
  UpdateL2IAllocationSchema,
} from '../types/index.js';
import { l2iBundleService } from '../lib/l2i-bundle-service.js';

export async function l2iBundleRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/billing/l2i-bundles
   * Get all available L2I bundle SKUs
   */
  fastify.get('/api/billing/l2i-bundles', async (request, reply) => {
    try {
      const bundles = await l2iBundleService.getBundles();

      return {
        success: true,
        bundles,
      };
    } catch (error: any) {
      request.log.error('Failed to get L2I bundles:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get L2I bundles',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/billing/l2i-bundles
   * Create an L2I subscription for a company
   */
  fastify.post<{ Body: z.infer<typeof CreateL2ISubscriptionSchema> }>(
    '/api/billing/l2i-bundles',
    {
      schema: {
        body: CreateL2ISubscriptionSchema,
      },
    },
    async (request, reply) => {
      try {
        const l2iSubscription = await l2iBundleService.createL2ISubscription(request.body);

        return {
          success: true,
          l2iSubscription,
        };
      } catch (error: any) {
        request.log.error('Failed to create L2I subscription:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create L2I subscription',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/l2i-bundles/:companyId
   * Get L2I subscriptions for a company
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/billing/l2i-bundles/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const subscriptions = await l2iBundleService.getCompanyL2ISubscriptions(companyId);

        return {
          success: true,
          subscriptions,
        };
      } catch (error: any) {
        request.log.error('Failed to get L2I subscriptions:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get L2I subscriptions',
          message: error.message,
        });
      }
    }
  );

  /**
   * PATCH /api/billing/l2i-bundles/:l2iSubscriptionId/allocate
   * Update program allocation for an L2I subscription
   */
  fastify.patch<{
    Params: { l2iSubscriptionId: string };
    Body: z.infer<typeof UpdateL2IAllocationSchema>;
  }>(
    '/api/billing/l2i-bundles/:l2iSubscriptionId/allocate',
    {
      schema: {
        body: UpdateL2IAllocationSchema,
      },
    },
    async (request, reply) => {
      const { l2iSubscriptionId } = request.params;

      try {
        const updated = await l2iBundleService.updateAllocation(
          l2iSubscriptionId,
          request.body
        );

        return {
          success: true,
          l2iSubscription: updated,
        };
      } catch (error: any) {
        request.log.error('Failed to update L2I allocation:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update L2I allocation',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/l2i-bundles/:l2iSubscriptionId/allocations
   * Get allocations for an L2I subscription
   */
  fastify.get<{ Params: { l2iSubscriptionId: string } }>(
    '/api/billing/l2i-bundles/:l2iSubscriptionId/allocations',
    async (request, reply) => {
      const { l2iSubscriptionId } = request.params;

      try {
        const allocations = await l2iBundleService.getAllocations(l2iSubscriptionId);

        return {
          success: true,
          allocations,
        };
      } catch (error: any) {
        request.log.error('Failed to get allocations:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get allocations',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/l2i-bundles/:companyId/impact-summary
   * Get impact summary for a company's L2I investments
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/billing/l2i-bundles/:companyId/impact-summary',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const summary = await l2iBundleService.getImpactSummary(companyId);

        return {
          success: true,
          impactSummary: summary,
        };
      } catch (error: any) {
        request.log.error('Failed to get impact summary:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get impact summary',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/billing/l2i-bundles/:l2iSubscriptionId/cancel
   * Cancel an L2I subscription
   */
  fastify.post<{ Params: { l2iSubscriptionId: string } }>(
    '/api/billing/l2i-bundles/:l2iSubscriptionId/cancel',
    async (request, reply) => {
      const { l2iSubscriptionId } = request.params;

      try {
        const canceled = await l2iBundleService.cancelL2ISubscription(l2iSubscriptionId);

        return {
          success: true,
          l2iSubscription: canceled,
        };
      } catch (error: any) {
        request.log.error('Failed to cancel L2I subscription:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to cancel L2I subscription',
          message: error.message,
        });
      }
    }
  );
}
