import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { forecastRoutes } from './routes/forecast.js';
import { scenarioRoutes } from './routes/scenarios.js';
import { closeRedis } from './lib/cache.js';

const PORT = parseInt(process.env.PORT_FORECAST || '3007');

async function start() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register forecast API routes
  app.register(async (instance) => {
    await instance.register(forecastRoutes, { prefix: '/forecast' });
    await instance.register(scenarioRoutes, { prefix: '/scenarios' });
  }, { prefix: '/v1/analytics' });

  // Register scenario planner API routes
  app.register(async (instance) => {
    await instance.register(scenarioRoutes, { prefix: '/v1' });
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);

    app.log.info(`Forecast Service running on port ${PORT}`);
    app.log.info('');
    app.log.info('Available endpoints:');
    app.log.info('  Health:');
    app.log.info('    GET  /health - Health check');
    app.log.info('    GET  /health/live - Liveness probe');
    app.log.info('    GET  /health/ready - Readiness probe');
    app.log.info('    GET  /health/dependencies - Dependencies health');
    app.log.info('');
    app.log.info('  Forecast APIs:');
    app.log.info('    POST /v1/analytics/forecast/v2 - Generate forecast');
    app.log.info('    POST /v1/analytics/forecast/compare - Compare models');
    app.log.info('');
    app.log.info('  Scenario Planner APIs:');
    app.log.info('    POST   /v1/analytics/scenarios - Create scenario');
    app.log.info('    GET    /v1/analytics/scenarios - List scenarios');
    app.log.info('    GET    /v1/analytics/scenarios/:id - Get scenario');
    app.log.info('    POST   /v1/analytics/scenarios/:id/run - Run scenario');
    app.log.info('    GET    /v1/analytics/scenarios/:id/results - Get results');
    app.log.info('    PATCH  /v1/analytics/scenarios/:id - Update scenario');
    app.log.info('    DELETE /v1/analytics/scenarios/:id - Delete scenario');
    app.log.info('');
    app.log.info('Supported models:');
    app.log.info('  - ETS (Simple, Holt, Holt-Winters)');
    app.log.info('  - Prophet (Trend + Seasonality decomposition)');
    app.log.info('  - Ensemble (Combined ETS + Prophet)');
    app.log.info('  - Auto (Automatic model selection)');
    app.log.info('');
    app.log.info('Environment:');
    app.log.info(`  Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
    app.log.info(`  Node ENV: ${process.env.NODE_ENV || 'development'}`);
    app.log.info('');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info('Shutting down...');
    healthManager.setShuttingDown(true);

    // Close connections
    await Promise.all([app.close(), closeRedis()]);

    app.log.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
