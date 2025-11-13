import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  getAllFeatureFlags,
  updateCompanyFeatureFlags,
  type ImpactInFeatureFlags
} from '../feature-flags.js';

interface FeaturesParams {
  companyId: string;
}

const UpdateFeaturesSchema = z.object({
  benevity: z.boolean().optional(),
  goodera: z.boolean().optional(),
  workday: z.boolean().optional(),
}).refine((data) => {
  // At least one field must be present
  return data.benevity !== undefined || data.goodera !== undefined || data.workday !== undefined;
}, {
  message: 'At least one platform flag must be provided'
});

export async function featuresRoutes(fastify: FastifyInstance) {
  /**
   * GET /features/:companyId
   * Get company feature flags
   */
  fastify.get<{
    Params: FeaturesParams;
  }>('/features/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as FeaturesParams;

    try {
      const flags = await getAllFeatureFlags(companyId);

      return reply.code(200).send({
        companyId,
        flags,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch feature flags' });
    }
  });

  /**
   * POST /features/:companyId
   * Update company feature flags
   */
  fastify.post<{
    Params: FeaturesParams;
    Body: ImpactInFeatureFlags;
  }>('/features/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as FeaturesParams;
    const body = request.body as ImpactInFeatureFlags;

    try {
      // Validate request body
      UpdateFeaturesSchema.parse(body);

      // Update flags
      await updateCompanyFeatureFlags(companyId, body);

      // Return updated flags
      const flags = await getAllFeatureFlags(companyId);

      return reply.code(200).send({
        success: true,
        companyId,
        updated: body,
        flags,
      });
    } catch (error) {
      if ((error as any).name === 'ZodError') {
        return reply.code(400).send({
          error: 'Invalid request body',
          details: error
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to update feature flags',
        message: (error as Error).message
      });
    }
  });

  /**
   * DELETE /features/:companyId
   * Reset company feature flags (remove company-level overrides)
   */
  fastify.delete<{
    Params: FeaturesParams;
  }>('/features/:companyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as FeaturesParams;

    try {
      // Set all flags to undefined to remove overrides
      await updateCompanyFeatureFlags(companyId, {
        benevity: undefined,
        goodera: undefined,
        workday: undefined,
      });

      const flags = await getAllFeatureFlags(companyId);

      return reply.code(200).send({
        success: true,
        companyId,
        message: 'Company-level feature flags reset to environment defaults',
        flags,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Failed to reset feature flags',
        message: (error as Error).message
      });
    }
  });
}
