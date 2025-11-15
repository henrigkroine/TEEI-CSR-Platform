/**
 * Impact-In Service
 * Delivers impact data to external CSR platforms (Benevity, Goodera, Workday)
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead
 */

import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { deliveryRoutes } from './routes/deliveries.js';
import { replayRoutes } from './routes/replay.js';
import { registerWebhookRoutes } from './routes/webhooks.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('impact-in');
const PORT = parseInt(process.env.PORT_IMPACT_IN || '3007');

async function start() {
  const app = Fastify({
    logger: logger as any,
    // Enable raw body for webhook signature verification
    disableRequestLogging: false,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register routes with API versioning
  app.register(deliveryRoutes, { prefix: '/v1/impact-in' });
  app.register(replayRoutes, { prefix: '/v1/impact-in' });
  await registerWebhookRoutes(app);

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      service: 'impact-in',
      version: '1.0.0',
      description: 'Impact data delivery service for external CSR platforms',
      platforms: ['benevity', 'goodera', 'workday'],
      endpoints: {
        deliveries: '/v1/impact-in/deliveries',
        stats: '/v1/impact-in/stats',
        replay: '/v1/impact-in/deliveries/:id/replay',
        bulkReplay: '/v1/impact-in/deliveries/bulk-replay',
        retryAllFailed: '/v1/impact-in/deliveries/retry-all-failed',
        webhooks: {
          benevity: 'POST /webhooks/benevity',
          goodera: 'POST /webhooks/goodera',
          workday: 'POST /webhooks/workday',
          health: 'GET /webhooks/health',
        },
        health: '/health',
      },
    };
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Impact-In Service running on port ${PORT}`);
    logger.info('Supported providers: Benevity, Goodera, Workday');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
