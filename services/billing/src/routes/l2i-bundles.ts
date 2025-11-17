/**
 * L2I Bundle Routes
 * API endpoints for License-to-Impact bundle management
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { l2iBundleService } from '../lib/l2i-bundle-service.js';
import {
  PurchaseL2IBundleSchema,
  AllocateLearnerSchema,
  L2IBundleTier,
  L2IProgramTag,
} from '../types/l2i.js';

export async function l2iBundleRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/billing/l2i/tiers
   * Get available L2I bundle tiers and pricing
   */
  fastify.get('/api/billing/l2i/tiers', async (request, reply) => {
    const { L2I_BUNDLE_TIERS } = await import('../types/l2i.js');

    return {
      success: true,
      tiers: Object.values(L2I_BUNDLE_TIERS),
    };
  });

  /**
   * POST /api/billing/l2i/bundles
   * Purchase an L2I bundle
   */
  fastify.post<{ Body: z.infer<typeof PurchaseL2IBundleSchema> }>(
    '/api/billing/l2i/bundles',
    {
      schema: {
        body: PurchaseL2IBundleSchema,
      },
    },
    async (request, reply) => {
      try {
        const bundle = await l2iBundleService.purchaseBundle(request.body);

        return {
          success: true,
          bundle,
        };
      } catch (error: any) {
        request.log.error('Failed to purchase L2I bundle:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to purchase L2I bundle',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/l2i/bundles/:companyId
   * Get L2I bundles for a company
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/billing/l2i/bundles/:companyId',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const bundles = await l2iBundleService.getBundlesByCompany(companyId);

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
    }
  );

  /**
   * GET /api/billing/l2i/bundles/:companyId/summary
   * Get L2I bundle summary and impact metrics
   */
  fastify.get<{ Params: { companyId: string } }>(
    '/api/billing/l2i/bundles/:companyId/summary',
    async (request, reply) => {
      const { companyId } = request.params;

      try {
        const summary = await l2iBundleService.getBundleSummary(companyId);

        return {
          success: true,
          summary,
        };
      } catch (error: any) {
        request.log.error('Failed to get L2I bundle summary:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get bundle summary',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/billing/l2i/allocations
   * Allocate a learner to an L2I bundle
   */
  fastify.post<{ Body: z.infer<typeof AllocateLearnerSchema> }>(
    '/api/billing/l2i/allocations',
    {
      schema: {
        body: AllocateLearnerSchema,
      },
    },
    async (request, reply) => {
      try {
        const allocation = await l2iBundleService.allocateLearner(request.body);

        return {
          success: true,
          allocation,
        };
      } catch (error: any) {
        request.log.error('Failed to allocate learner:', error);
        return reply.status(400).send({
          success: false,
          error: 'Failed to allocate learner',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /api/billing/l2i/bundles/:bundleId/allocations
   * Get allocations for a bundle
   */
  fastify.get<{ Params: { bundleId: string } }>(
    '/api/billing/l2i/bundles/:bundleId/allocations',
    async (request, reply) => {
      const { bundleId } = request.params;

      try {
        const allocations = await l2iBundleService.getAllocationsByBundle(bundleId);

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
   * PATCH /api/billing/l2i/allocations/:allocationId/metrics
   * Update impact metrics for an allocation
   */
  fastify.patch<{
    Params: { allocationId: string };
    Body: {
      hoursCompleted?: number;
      skillsAcquired?: string[];
      certificationsEarned?: string[];
      engagementScore?: number;
    };
  }>(
    '/api/billing/l2i/allocations/:allocationId/metrics',
    async (request, reply) => {
      const { allocationId } = request.params;

      try {
        const allocation = await l2iBundleService.updateAllocationMetrics(
          allocationId,
          request.body
        );

        return {
          success: true,
          allocation,
        };
      } catch (error: any) {
        request.log.error('Failed to update allocation metrics:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update metrics',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /api/billing/l2i/allocations/:allocationId/complete
   * Mark an allocation as completed
   */
  fastify.post<{ Params: { allocationId: string } }>(
    '/api/billing/l2i/allocations/:allocationId/complete',
    async (request, reply) => {
      const { allocationId } = request.params;

      try {
        const allocation = await l2iBundleService.completeAllocation(allocationId);

        return {
          success: true,
          allocation,
        };
      } catch (error: any) {
        request.log.error('Failed to complete allocation:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to complete allocation',
          message: error.message,
        });
      }
    }
  );
}
