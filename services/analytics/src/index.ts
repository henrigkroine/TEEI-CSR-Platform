import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { trendsRoutes } from './routes/trends.js';
import { cohortsRoutes } from './routes/cohorts.js';
import { funnelsRoutes } from './routes/funnels.js';
import { benchmarksRoutes } from './routes/benchmarks.js';
import { metricsRoutes } from './routes/metrics.js';
import { catalogRoutes } from './catalog/routes/catalog.js';
import { startSyncScheduler, stopSyncScheduler } from './loaders/ingestion.js';
import { closeClient as closeClickHouse } from './lib/clickhouse-client.js';
import { closeRedis } from './lib/cache.js';

const logger = createServiceLogger('analytics');
const PORT = parseInt(process.env.PORT_ANALYTICS || '3008');

let syncTimer: NodeJS.Timeout | null = null;

async function start() {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register API routes with versioning
  app.register(async (instance) => {
    await instance.register(trendsRoutes);
    await instance.register(cohortsRoutes);
    await instance.register(funnelsRoutes);
    await instance.register(benchmarksRoutes);
    await instance.register(metricsRoutes, { prefix: '/metrics' });
    await instance.register(catalogRoutes, { prefix: '/catalog' });
  }, { prefix: '/v1/analytics' });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);

    logger.info(`Analytics Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('    GET  /health/dependencies - Dependencies health');
    logger.info('    GET  /health/cache - Cache statistics');
    logger.info('');
    logger.info('  Analytics APIs:');
    logger.info('    GET  /v1/analytics/trends - Time-series trends');
    logger.info('    GET  /v1/analytics/cohorts - Cohort comparisons');
    logger.info('    GET  /v1/analytics/funnels - Conversion funnels');
    logger.info('    GET  /v1/analytics/benchmarks - Industry/region/size benchmarks');
    logger.info('    GET  /v1/analytics/metrics/company/:companyId/history - Historical metrics for forecasting');
    logger.info('');
    logger.info('Environment:');
    logger.info(`  ClickHouse: ${process.env.CLICKHOUSE_URL || 'http://localhost:8123'}`);
    logger.info(`  Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
    logger.info(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
    logger.info(`  NATS: ${process.env.NATS_URL || 'nats://localhost:4222'}`);
    logger.info('');

    // Start ingestion sync scheduler
    syncTimer = startSyncScheduler();
    logger.info('Ingestion sync scheduler started');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);

    // Stop sync scheduler
    if (syncTimer) {
      stopSyncScheduler(syncTimer);
    }

    // Close connections
    await Promise.all([
      app.close(),
      closeClickHouse(),
      closeRedis(),
    ]);

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
