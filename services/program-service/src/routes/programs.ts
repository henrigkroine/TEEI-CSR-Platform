/**
 * Programs Routes
 * CRUD operations for programs
 * Agent: template-instantiator (Agent 14)
 */

import type { FastifyPluginAsync } from 'fastify';
import { programInstantiator } from '../lib/instantiator.js';

export const programsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create program from template
  fastify.post('/', async (request, reply) => {
    const input = request.body as any;
    const createdBy = (request as any).user?.id || 'system';

    try {
      const program = await programInstantiator.instantiateProgram(input, createdBy);
      return reply.code(201).send(program);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Get program by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const program = await programInstantiator.getProgram(id);
      return reply.send(program);
    } catch (error: any) {
      return reply.code(404).send({ error: error.message });
    }
  });

  // Update program config
  fastify.put('/:id/config', async (request, reply) => {
    const { id } = request.params as { id: string };
    const configOverrides = request.body as object;

    try {
      const updated = await programInstantiator.updateProgramConfig(id, configOverrides);
      return reply.send(updated);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Update program status
  fastify.put('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as any;

    try {
      const updated = await programInstantiator.updateProgramStatus(id, status);
      return reply.send(updated);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });
};
