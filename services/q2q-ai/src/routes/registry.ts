import { FastifyPluginAsync } from 'fastify';
import {
  getAllModels,
  getModelById,
  activateModel,
  deactivateModel,
  getActiveModel,
  syncModelsToDatabase
} from '../registry/persist.js';

/**
 * Model registry routes for Q2Q governance
 */
export const registryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /q2q/registry/models
   * List all models (active and inactive)
   */
  fastify.get('/q2q/registry/models', async (request, reply) => {
    try {
      const models = await getAllModels();
      return {
        success: true,
        count: models.length,
        models
      };
    } catch (error: any) {
      request.log.error('Failed to list models:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * GET /q2q/registry/models/:id
   * Get a specific model by ID
   */
  fastify.get('/q2q/registry/models/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const model = await getModelById(id);
      return {
        success: true,
        model
      };
    } catch (error: any) {
      request.log.error(`Failed to get model ${id}:`, error);
      reply.code(404);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * POST /q2q/registry/models/:id/activate
   * Activate a specific model (deactivates others in same provider)
   */
  fastify.post('/q2q/registry/models/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await activateModel(id);
      const model = await getModelById(id);
      return {
        success: true,
        message: `Model ${id} activated successfully`,
        model
      };
    } catch (error: any) {
      request.log.error(`Failed to activate model ${id}:`, error);
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * POST /q2q/registry/models/:id/deactivate
   * Deactivate a specific model
   */
  fastify.post('/q2q/registry/models/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await deactivateModel(id);
      const model = await getModelById(id);
      return {
        success: true,
        message: `Model ${id} deactivated successfully`,
        model
      };
    } catch (error: any) {
      request.log.error(`Failed to deactivate model ${id}:`, error);
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * GET /q2q/registry/models/active/:provider
   * Get the active model for a specific provider
   */
  fastify.get('/q2q/registry/models/active/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string };

    try {
      const model = await getActiveModel(provider);
      return {
        success: true,
        provider,
        model
      };
    } catch (error: any) {
      request.log.error(`Failed to get active model for ${provider}:`, error);
      reply.code(404);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * POST /q2q/registry/sync
   * Sync models from YAML to database
   */
  fastify.post('/q2q/registry/sync', async (request, reply) => {
    try {
      await syncModelsToDatabase();
      const models = await getAllModels();
      return {
        success: true,
        message: 'Models synced successfully',
        count: models.length,
        models
      };
    } catch (error: any) {
      request.log.error('Failed to sync models:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message
      };
    }
  });
};
