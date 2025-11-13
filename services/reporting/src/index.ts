import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { setupSwagger } from './swagger.js';
import { healthRoutes } from './routes/health.js';
import { closePool } from './db/connection.js';

const fastify = Fastify({
  logger: {
    level: config.logging.level,
  },
});

// Register plugins
await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(cors, {
  origin: config.cors.origin,
  credentials: true,
});

await fastify.register(rateLimiter);
await fastify.register(setupSwagger);

// Register routes
await fastify.register(healthRoutes);
const { companyRoutes } = await import('./routes/companies.js');
await fastify.register(companyRoutes);
const { impactInRoutes } = await import('./routes/impact-in.js');
await fastify.register(impactInRoutes);
const { sseRoutes } = await import('./routes/sse.js');
await fastify.register(sseRoutes);
const { evidenceRoutes } = await import('./routes/evidence.js');
await fastify.register(evidenceRoutes);
const { reportRoutes } = await import('./routes/reports.js');
await fastify.register(reportRoutes);

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Received shutdown signal, closing server...');
  try {
    await fastify.close();
    await closePool();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    fastify.log.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
try {
  await fastify.listen({
    port: config.server.port,
    host: config.server.host,
  });
  fastify.log.info(`Server listening on http://${config.server.host}:${config.server.port}`);
  fastify.log.info(`API docs available at http://${config.server.host}:${config.server.port}/docs`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
