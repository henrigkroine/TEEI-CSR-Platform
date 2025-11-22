/**
 * Templates Routes
 * CRUD operations for program templates
 * Agent: template-registry-implementer (Agent 13)
 */

import type { FastifyPluginAsync } from 'fastify';
import { templateRegistry } from '../lib/template-registry.js';

export const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // Create template
  fastify.post('/', async (request, reply) => {
    const input = request.body as any;
    const createdBy = (request as any).user?.id || 'system'; // In real impl, from auth

    try {
      const template = await templateRegistry.createTemplate(input, createdBy);
      return reply.code(201).send(template);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // List templates
  fastify.get('/', async (request, reply) => {
    const { category, status, tenantId } = request.query as any;

    try {
      const templates = await templateRegistry.listTemplates({
        category,
        status,
        tenantId,
      });
      return reply.send(templates);
    } catch (error: any) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Get template by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const template = await templateRegistry.getTemplate(id);
      return reply.send(template);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  // Update template
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;

    try {
      const updated = await templateRegistry.updateTemplate(id, updates);
      return reply.send(updated);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Publish template
  fastify.post('/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { deprecatePrevious } = request.body as any;

    try {
      const published = await templateRegistry.publishTemplate(id, deprecatePrevious);
      return reply.send(published);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Create new version
  fastify.post('/:id/versions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const createdBy = (request as any).user?.id || 'system';

    try {
      const newVersion = await templateRegistry.createNewVersion(id, createdBy);
      return reply.code(201).send(newVersion);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Deprecate template
  fastify.post('/:id/deprecate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { newTemplateId } = request.body as any;

    try {
      const deprecated = await templateRegistry.deprecateTemplate(id, newTemplateId);
      return reply.send(deprecated);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });
};
