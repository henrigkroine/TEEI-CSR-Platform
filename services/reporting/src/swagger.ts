import type { FastifyPluginAsync } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export const setupSwagger: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'TEEI Reporting Service API',
        description: 'API for corporate impact reporting, SROI/VIS calculations, and metrics',
        version: '0.1.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'companies', description: 'Company metrics and reporting' },
        { name: 'export', description: 'Data export endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
};
