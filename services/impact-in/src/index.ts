import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createServiceLogger } from '@teei/shared-utils';
import { deliverRoutes } from './routes/deliver.js';
import { deliveriesRoutes } from './routes/deliveries.js';
import { featuresRoutes } from './routes/features.js';
import { schedulesRoutes } from './routes/schedules.js';
import { startScheduler } from './scheduler/cron.js';

const logger = createServiceLogger('impact-in');
const PORT = parseInt(process.env.PORT_IMPACT_IN || '3008');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });

  // Register rate limiting
  // Global rate limit: 100 requests per minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Retry after ${context.after}`,
        retryAfter: context.after,
      };
    },
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'impact-in',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  // Register routes with prefix
  await app.register(deliverRoutes, { prefix: '/impact-in' });
  await app.register(deliveriesRoutes, { prefix: '/impact-in' });
  await app.register(featuresRoutes, { prefix: '/impact-in' });
  await app.register(schedulesRoutes, { prefix: '/impact-in' });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Impact-In Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info('  POST /impact-in/deliver/:platform/:companyId - Trigger delivery');
    logger.info('  GET  /impact-in/deliveries/:companyId - Get delivery history');
    logger.info('  POST /impact-in/replay/:deliveryId - Replay failed delivery');
    logger.info('  GET  /impact-in/features/:companyId - Get feature flags');
    logger.info('  POST /impact-in/features/:companyId - Update feature flags');
    logger.info('  POST /impact-in/schedules - Create scheduled delivery');
    logger.info('  GET  /impact-in/schedules - List all schedules');
    logger.info('  GET  /impact-in/schedules/:id - Get specific schedule');
    logger.info('  PUT  /impact-in/schedules/:id - Update schedule');
    logger.info('  DELETE /impact-in/schedules/:id - Delete schedule');
    logger.info('  POST /impact-in/schedules/:id/run-now - Trigger immediate run');
    logger.info('  GET  /impact-in/schedules/:id/preview - Preview payload');
    logger.info('  GET  /impact-in/schedules/stats - Delivery statistics');
    logger.info('  GET  /health - Service health check');

    // Start the scheduler daemon
    startScheduler();
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
